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

const { getDokuOrderStatus } = await import("../../src/services/payment/dokuService.js");

const CLIENT_ID = "CLIENT-TEST";
const SECRET = "shh-test-secret-key";
const SANDBOX = "https://api-sandbox.doku.com";

/**
 * BL-144 — the GET signature scheme, transcribed from DOKU's published spec
 * (developers.doku.com → "Signature from API Get Method"), NOT copied from
 * dokuService.
 *
 * This independence is the entire point. BL-137 happened because the unit test
 * asked the implementation what the scheme was and then agreed with it; the two
 * were self-consistent and both wrong for months. The spec says FOUR components
 * for GET — Client-Id, Request-Id, Request-Timestamp, Request-Target — and
 * explicitly no Digest, because there is no body to digest.
 */
function referenceSignGet(
  clientId: string,
  requestId: string,
  timestamp: string,
  requestTarget: string,
  secretKey: string,
): string {
  const components =
    `Client-Id:${clientId}\n` +
    `Request-Id:${requestId}\n` +
    `Request-Timestamp:${timestamp}\n` +
    `Request-Target:${requestTarget}`;
  return `HMACSHA256=${createHmac("sha256", secretKey).update(components).digest("base64")}`;
}

/** Trimmed copy of a REAL sandbox reply (invoice JA-FEF61033, 27 Aug 2026). */
const realSandboxReply = {
  order: { invoice_number: "JA-FEF61033", amount: 1000, status: "ORDER_GENERATED" },
  transaction: {
    status: "SUCCESS",
    type: "PAYMENT",
    date: "2026-08-26T09:34:54Z",
    original_request_id: "66455434-fd8d-43e4-8841-23404ac26cbf",
  },
  service: { id: "VIRTUAL_ACCOUNT" },
  acquirer: { id: "BCA", name: "BCA" },
  channel: { id: "VIRTUAL_ACCOUNT_BCA" },
};

let fetchMock: ReturnType<typeof vi.fn>;

function mockReply(body: unknown, ok = true, status = 200) {
  fetchMock.mockResolvedValue({
    ok,
    status,
    json: async () => body,
  });
}

/** The single request our code made, as (url, init). */
function lastCall(): [string, { headers: Record<string, string>; method: string }] {
  return fetchMock.mock.calls[0] as never;
}

beforeEach(() => {
  fetchMock = vi.fn();
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("BL-144 — DOKU check status inquiry", () => {
  it("calls the documented endpoint with the invoice as a path segment", async () => {
    mockReply(realSandboxReply);

    await getDokuOrderStatus("JA-FEF61033");

    const [url, init] = lastCall();
    expect(url).toBe(`${SANDBOX}/orders/v1/status/JA-FEF61033`);
    expect(init.method).toBe("GET");
  });

  it("signs with the four-component GET scheme and no Digest", async () => {
    mockReply(realSandboxReply);

    await getDokuOrderStatus("JA-FEF61033");

    const [, init] = lastCall();
    const expected = referenceSignGet(
      CLIENT_ID,
      init.headers["Request-Id"],
      init.headers["Request-Timestamp"],
      "/orders/v1/status/JA-FEF61033",
      SECRET,
    );
    expect(init.headers["Signature"]).toBe(expected);
    expect(init.headers["Client-Id"]).toBe(CLIENT_ID);
  });

  it("does NOT sign a GET the way a POST is signed", async () => {
    // Locks the failure mode directly: reusing the body-signing helper here
    // would append a Digest line and every inquiry would 401. If anyone
    // collapses the two helpers back together, this goes red.
    mockReply(realSandboxReply);

    await getDokuOrderStatus("JA-FEF61033");

    const [, init] = lastCall();
    const digest = createHash("sha256").update("", "utf8").digest("base64");
    const withDigest = `HMACSHA256=${createHmac("sha256", SECRET)
      .update(
        `Client-Id:${CLIENT_ID}\n` +
          `Request-Id:${init.headers["Request-Id"]}\n` +
          `Request-Timestamp:${init.headers["Request-Timestamp"]}\n` +
          `Request-Target:/orders/v1/status/JA-FEF61033\n` +
          `Digest:${digest}`,
      )
      .digest("base64")}`;
    expect(init.headers["Signature"]).not.toBe(withDigest);
  });

  it("sends a second-resolution UTC timestamp, as the spec requires", async () => {
    mockReply(realSandboxReply);

    await getDokuOrderStatus("JA-FEF61033");

    const [, init] = lastCall();
    expect(init.headers["Request-Timestamp"]).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/);
  });

  it("reads status, amount and channel out of a real sandbox reply", async () => {
    mockReply(realSandboxReply);

    const result = await getDokuOrderStatus("JA-FEF61033");

    expect(result).toEqual({
      invoiceNumber: "JA-FEF61033",
      transactionStatus: "SUCCESS",
      amount: 1000,
      channelId: "VIRTUAL_ACCOUNT_BCA",
      transactionDate: "2026-08-26T09:34:54Z",
    });
  });

  it("reads the transaction status, not the order lifecycle status", async () => {
    // The real reply above carries order.status "ORDER_GENERATED" alongside
    // transaction.status "SUCCESS". Reading the order field would conclude the
    // payment never happened for an invoice DOKU has already settled.
    mockReply(realSandboxReply);

    const result = await getDokuOrderStatus("JA-FEF61033");
    expect(result?.transactionStatus).not.toBe("ORDER_GENERATED");
  });

  it("normalises the status to upper case", async () => {
    mockReply({ ...realSandboxReply, transaction: { status: " success " } });

    const result = await getDokuOrderStatus("JA-1");

    expect(result?.transactionStatus).toBe("SUCCESS");
  });

  it("accepts an amount serialised as a string", async () => {
    mockReply({ ...realSandboxReply, order: { invoice_number: "JA-1", amount: "299000.00" } });

    const result = await getDokuOrderStatus("JA-1");

    expect(result?.amount).toBe(299000);
  });

  it("returns null when DOKU has never heard of the invoice", async () => {
    mockReply({ error: "not found" }, false, 404);

    expect(await getDokuOrderStatus("JA-NOPE")).toBeNull();
  });

  it("returns null when the reply carries no transaction status", async () => {
    mockReply({ order: { invoice_number: "JA-1", amount: 1000 } });

    expect(await getDokuOrderStatus("JA-1")).toBeNull();
  });

  it("returns null on a gateway error rather than inventing an answer", async () => {
    mockReply({}, false, 500);

    expect(await getDokuOrderStatus("JA-1")).toBeNull();
  });
});
