import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createHmac, createHash } from "node:crypto";

vi.mock("../../src/config/env.js", () => ({
  env: {
    NODE_ENV: "test",
    DATABASE_URL: "postgresql://test:test@localhost:5432/test",
    JWT_SECRET: "test-jwt-secret-must-be-at-least-32-chars!!",
    JWT_REFRESH_SECRET: "test-refresh-must-be-32-chars!!!!!!!!",
    WEB_URL: "http://localhost:3004",
    DOKU_CLIENT_ID: "CLIENT-TEST",
    DOKU_SECRET_KEY: "shh-test-secret-key",
    DOKU_IS_PRODUCTION: false,
  },
}));

const { createDokuOrder } = await import("../../src/services/payment/dokuService.js");

const CLIENT_ID = "CLIENT-TEST";
const SECRET = "shh-test-secret-key";
const SANDBOX = "https://api-sandbox.doku.com";
const CHECKOUT_TARGET = "/checkout/v1/payment";

/**
 * The POST signature scheme for DOKU Checkout, transcribed from the published
 * spec (developers.doku.com → "Signature Component from Request Header"), NOT
 * copied from dokuService.
 *
 * §0.2 of docs/MASTER_EXECUTION_PLAN.md exists because of BL-137: the old unit
 * test asked the implementation what the scheme was and then agreed with it. The
 * two were self-consistent and both wrong for months, and every checkout in
 * production returned 401.
 *
 * The spec says FIVE components for a request that has a body — Client-Id,
 * Request-Id, Request-Timestamp, Request-Target, Digest — joined by newlines,
 * where Digest is the base64 SHA-256 of the RAW body bytes and Request-Target is
 * the path alone. The header value is prefixed `HMACSHA256=`; DOKU rejects the
 * bare base64.
 */
function referenceSignPost(
  clientId: string,
  requestId: string,
  timestamp: string,
  requestTarget: string,
  rawBody: string,
  secretKey: string,
): string {
  const digest = createHash("sha256").update(rawBody, "utf8").digest("base64");
  const components =
    `Client-Id:${clientId}\n` +
    `Request-Id:${requestId}\n` +
    `Request-Timestamp:${timestamp}\n` +
    `Request-Target:${requestTarget}\n` +
    `Digest:${digest}`;
  return `HMACSHA256=${createHmac("sha256", secretKey).update(components).digest("base64")}`;
}

/**
 * The scheme BL-137 actually shipped: a `Request-Body` component instead of
 * Request-Target + Digest, and no prefix. Kept here so the regression is locked
 * out — if anyone reintroduces it, the "must not" assertion below turns red.
 */
function bl137BrokenSign(
  clientId: string,
  requestId: string,
  timestamp: string,
  rawBody: string,
  secretKey: string,
): string {
  const components =
    `Client-Id:${clientId}\n` +
    `Request-Id:${requestId}\n` +
    `Request-Timestamp:${timestamp}\n` +
    `Request-Body:${rawBody}`;
  return createHmac("sha256", secretKey).update(components).digest("base64");
}

const ITEMS = [
  { name: "Kursus React", price: 299000, quantity: 1 },
  { name: "E-Book Vue", price: 50000, quantity: 2 },
];

let fetchMock: ReturnType<typeof vi.fn>;

function mockReply(body: unknown, ok = true, status = 200, text = "") {
  fetchMock.mockResolvedValue({
    ok,
    status,
    json: async () => body,
    text: async () => text,
  });
}

/** A well-formed DOKU Checkout reply: the payload sits under `response`. */
const okReply = {
  response: {
    order: { invoice_number: "JA-ORDER1", amount: 399000 },
    payment: { url: "https://sandbox.doku.com/checkout/link/abc123" },
  },
};

/** The single request our code made, as (url, init). */
function lastCall(): [string, { headers: Record<string, string>; method: string; body: string }] {
  return fetchMock.mock.calls[0] as never;
}

function sentBody(): Record<string, never> {
  return JSON.parse(lastCall()[1].body);
}

function call(overrides: { failureUrl?: string } = {}) {
  return createDokuOrder(
    "JA-ORDER1",
    ITEMS,
    399000,
    "https://jagoakademi.com/payment/success",
    "Test User",
    "test@test.com",
    overrides.failureUrl,
    "https://jagoakademi.com/payment/pending",
  );
}

beforeEach(() => {
  fetchMock = vi.fn();
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("createDokuOrder — request shape", () => {
  it("POSTs to the documented Checkout endpoint on the sandbox host", async () => {
    mockReply(okReply);

    await call();

    const [url, init] = lastCall();
    expect(url).toBe(`${SANDBOX}${CHECKOUT_TARGET}`);
    expect(init.method).toBe("POST");
  });

  it("sends every header DOKU authenticates on", async () => {
    mockReply(okReply);

    await call();

    const { headers } = lastCall()[1];
    expect(headers["Content-Type"]).toBe("application/json");
    expect(headers["Client-Id"]).toBe(CLIENT_ID);
    expect(headers["Request-Id"]).toBeTruthy();
    expect(headers["Request-Timestamp"]).toBeTruthy();
    expect(headers.Signature).toBeTruthy();
  });

  it("stamps a timestamp with NO milliseconds — DOKU rejects the ISO default", async () => {
    mockReply(okReply);

    await call();

    // new Date().toISOString() yields 2026-09-02T07:00:00.000Z; DOKU wants
    // second resolution. Getting this wrong is a 401 with no useful message.
    expect(lastCall()[1].headers["Request-Timestamp"]).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/);
  });

  it("gives every order its own Request-Id", async () => {
    mockReply(okReply);
    await call();
    const first = lastCall()[1].headers["Request-Id"];

    fetchMock.mockClear();
    mockReply(okReply);
    await call();
    const second = lastCall()[1].headers["Request-Id"];

    expect(first).not.toBe(second);
  });

  it("builds the order body DOKU documents, with line items mapped through", async () => {
    mockReply(okReply);

    await call();

    const body = sentBody() as unknown as {
      order: Record<string, unknown>;
      payment: Record<string, unknown>;
      customer: Record<string, unknown>;
    };
    expect(body.order.invoice_number).toBe("JA-ORDER1");
    expect(body.order.amount).toBe(399000);
    expect(body.order.currency).toBe("IDR");
    expect(body.order.callback_url).toBe("https://jagoakademi.com/payment/success");
    expect(body.order.auto_redirect).toBe(true);
    expect(body.order.line_items).toEqual([
      { name: "Kursus React", price: 299000, quantity: 1 },
      { name: "E-Book Vue", price: 50000, quantity: 2 },
    ]);
    expect(body.payment).toEqual({ payment_due_date: 60 });
    expect(body.customer).toEqual({ name: "Test User", email: "test@test.com" });
  });

  it("always sends pending_return_url — an async VA with nowhere to return strands the buyer (BL-56)", async () => {
    mockReply(okReply);

    await call();

    expect(sentBody().order).toHaveProperty(
      "pending_return_url",
      "https://jagoakademi.com/payment/pending",
    );
  });

  it("sends failure_return_url only when one was supplied", async () => {
    mockReply(okReply);
    await call();
    expect(sentBody().order).not.toHaveProperty("failure_return_url");

    fetchMock.mockClear();
    mockReply(okReply);
    await call({ failureUrl: "https://jagoakademi.com/payment/failed" });
    expect(sentBody().order).toHaveProperty(
      "failure_return_url",
      "https://jagoakademi.com/payment/failed",
    );
  });
});

describe("createDokuOrder — signature (BL-137 regression lock)", () => {
  it("matches a signature computed independently from DOKU's published spec", async () => {
    mockReply(okReply);

    await call();

    const [, init] = lastCall();
    const expected = referenceSignPost(
      CLIENT_ID,
      init.headers["Request-Id"] as string,
      init.headers["Request-Timestamp"] as string,
      CHECKOUT_TARGET,
      init.body,
      SECRET,
    );

    // Not "the implementation agrees with itself" — this reference was written
    // from the spec, so a scheme drift on either side turns this red.
    expect(init.headers.Signature).toBe(expected);
  });

  it("carries the HMACSHA256= prefix", async () => {
    mockReply(okReply);

    await call();

    expect(lastCall()[1].headers.Signature).toMatch(/^HMACSHA256=/);
  });

  it("digests the EXACT bytes it sends, not a re-serialised copy", async () => {
    mockReply(okReply);

    await call();

    const [, init] = lastCall();
    // Re-stringifying parsed JSON can reorder keys and change the digest, which
    // is a 401 that only ever reproduces in production.
    const digestOfSentBytes = createHash("sha256").update(init.body, "utf8").digest("base64");
    const expected = `HMACSHA256=${createHmac("sha256", SECRET)
      .update(
        `Client-Id:${CLIENT_ID}\n` +
          `Request-Id:${init.headers["Request-Id"]}\n` +
          `Request-Timestamp:${init.headers["Request-Timestamp"]}\n` +
          `Request-Target:${CHECKOUT_TARGET}\n` +
          `Digest:${digestOfSentBytes}`,
      )
      .digest("base64")}`;
    expect(init.headers.Signature).toBe(expected);
  });

  it("must NOT produce the BL-137 Request-Body scheme", async () => {
    mockReply(okReply);

    await call();

    const [, init] = lastCall();
    const broken = bl137BrokenSign(
      CLIENT_ID,
      init.headers["Request-Id"] as string,
      init.headers["Request-Timestamp"] as string,
      init.body,
      SECRET,
    );
    expect(init.headers.Signature).not.toBe(broken);
    expect(init.headers.Signature).not.toBe(`HMACSHA256=${broken}`);
  });
});

describe("createDokuOrder — response handling", () => {
  it("reads the URL from data.response.payment.url", async () => {
    mockReply(okReply);

    const result = await call();

    expect(result).toEqual({
      invoiceNumber: "JA-ORDER1",
      paymentUrl: "https://sandbox.doku.com/checkout/link/abc123",
    });
  });

  it("does NOT read the BL-137 path data.payment.url", async () => {
    // The shape the broken code expected. Under the fix this is a missing URL.
    mockReply({ payment: { url: "https://wrong.example/checkout" } });

    await expect(call()).rejects.toThrow(/no payment url/i);
  });

  it("throws with status and body when DOKU answers non-ok", async () => {
    mockReply({}, false, 401, '{"error":"Unauthorized signature"}');

    await expect(call()).rejects.toThrow(/DOKU API error 401.*Unauthorized signature/s);
  });

  it("surfaces a 500 the same way, so the caller never treats it as success", async () => {
    mockReply({}, false, 500, "upstream exploded");

    await expect(call()).rejects.toThrow(/DOKU API error 500.*upstream exploded/s);
  });

  it("throws when the payment url is missing entirely", async () => {
    mockReply({ response: { order: { invoice_number: "JA-ORDER1" } } });

    await expect(call()).rejects.toThrow(/no payment url/i);
  });

  it("throws when the payment url is an EMPTY string", async () => {
    // The nastiest of the three: `url` is present, so an existence check on the
    // key would pass and the buyer would be redirected to nowhere.
    mockReply({ response: { payment: { url: "" } } });

    await expect(call()).rejects.toThrow(/no payment url/i);
  });

  it("includes the offending payload in the error so it can be diagnosed", async () => {
    mockReply({ response: { payment: {} } });

    await expect(call()).rejects.toThrow(/\{.*response.*\}/s);
  });
});

describe("createDokuOrder — dev fallback without credentials", () => {
  it("returns a mock payment url and never touches the network", async () => {
    vi.resetModules();
    vi.doMock("../../src/config/env.js", () => ({
      env: {
        WEB_URL: "http://localhost:3004",
        DOKU_CLIENT_ID: "",
        DOKU_SECRET_KEY: "",
        DOKU_IS_PRODUCTION: false,
      },
    }));
    const { createDokuOrder: devCreate } = await import("../../src/services/payment/dokuService.js");

    const result = await devCreate(
      "JA-DEV1",
      ITEMS,
      399000,
      "https://jagoakademi.com/payment/success",
      "Test User",
      "test@test.com",
      undefined,
      "https://jagoakademi.com/payment/pending",
    );

    expect(result.invoiceNumber).toBe("JA-DEV1");
    expect(result.paymentUrl).toContain("mock=1");
    expect(fetchMock).not.toHaveBeenCalled();
    vi.doUnmock("../../src/config/env.js");
    vi.resetModules();
  });
});

describe("createDokuOrder — host selection", () => {
  it("uses the production host when DOKU_IS_PRODUCTION is set and no override exists", async () => {
    vi.resetModules();
    vi.doMock("../../src/config/env.js", () => ({
      env: {
        WEB_URL: "http://localhost:3004",
        DOKU_CLIENT_ID: CLIENT_ID,
        DOKU_SECRET_KEY: SECRET,
        DOKU_IS_PRODUCTION: true,
      },
    }));
    const { createDokuOrder: prodCreate } = await import("../../src/services/payment/dokuService.js");
    mockReply(okReply);

    await prodCreate(
      "JA-PROD1",
      ITEMS,
      399000,
      "https://jagoakademi.com/payment/success",
      "Test User",
      "test@test.com",
      undefined,
      "https://jagoakademi.com/payment/pending",
    );

    expect(lastCall()[0]).toBe(`https://api.doku.com${CHECKOUT_TARGET}`);
    vi.doUnmock("../../src/config/env.js");
    vi.resetModules();
  });

  it("an explicit DOKU_BASE_URL wins over the production flag", async () => {
    vi.resetModules();
    vi.doMock("../../src/config/env.js", () => ({
      env: {
        WEB_URL: "http://localhost:3004",
        DOKU_CLIENT_ID: CLIENT_ID,
        DOKU_SECRET_KEY: SECRET,
        DOKU_IS_PRODUCTION: true,
        DOKU_BASE_URL: "https://api-sandbox.doku.com",
      },
    }));
    const { createDokuOrder: overrideCreate } = await import(
      "../../src/services/payment/dokuService.js"
    );
    mockReply(okReply);

    await overrideCreate(
      "JA-OVR1",
      ITEMS,
      399000,
      "https://jagoakademi.com/payment/success",
      "Test User",
      "test@test.com",
      undefined,
      "https://jagoakademi.com/payment/pending",
    );

    expect(lastCall()[0]).toBe(`${SANDBOX}${CHECKOUT_TARGET}`);
    vi.doUnmock("../../src/config/env.js");
    vi.resetModules();
  });
});
