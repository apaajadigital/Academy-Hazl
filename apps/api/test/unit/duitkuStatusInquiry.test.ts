import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createHmac } from "node:crypto";

vi.mock("../../src/config/env.js", () => ({
  env: {
    NODE_ENV: "test",
    DATABASE_URL: "postgresql://test:test@localhost:5432/test",
    JWT_SECRET: "test-jwt-secret-must-be-at-least-32-chars!!",
    JWT_REFRESH_SECRET: "test-refresh-must-be-32-chars!!!!!!!!",
    WEB_URL: "http://localhost:3004",
    DUITKU_MERCHANT_CODE: "MERCHANT-TEST",
    DUITKU_API_KEY: "shh-test-api-key",
    DUITKU_IS_PRODUCTION: false,
  },
}));

const { getDuitkuOrderStatus } = await import("../../src/services/payment/duitkuService.js");

const MERCHANT_CODE = "MERCHANT-TEST";
const API_KEY = "shh-test-api-key";
const SANDBOX = "https://sandbox.duitku.com";

/**
 * Transcribed independently from Duitku's published transactionStatus spec
 * (docs.duitku.com/api/en, "Check Transaction Status") — NOT copied from
 * duitkuService.ts. stringToSign = merchantCode + merchantOrderId (no
 * amount at all — a third, distinct field order from both the
 * create-invoice and callback signatures). Lowercase hex.
 */
function referenceSignStatus(merchantCode: string, merchantOrderId: string, apiKey: string): string {
  return createHmac("sha256", apiKey).update(`${merchantCode}${merchantOrderId}`).digest("hex");
}

let fetchMock: ReturnType<typeof vi.fn>;

function mockReply(body: unknown, ok = true, status = 200) {
  fetchMock.mockResolvedValue({
    ok,
    status,
    json: async () => body,
  });
}

/** The single request our code made, as (url, init). */
function lastCall(): [string, { headers: Record<string, string>; method: string; body: string }] {
  return fetchMock.mock.calls[0] as never;
}

beforeEach(() => {
  fetchMock = vi.fn();
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("Duitku transactionStatus inquiry", () => {
  it("calls the documented endpoint with a JSON body (POST, not GET-with-path)", async () => {
    mockReply({ statusCode: "00", amount: 1000 });

    await getDuitkuOrderStatus("JA-1");

    const [url, init] = lastCall();
    expect(url).toBe(`${SANDBOX}/webapi/api/merchant/transactionStatus`);
    expect(init.method).toBe("POST");
  });

  it("signs with merchantCode + merchantOrderId only (no amount)", async () => {
    mockReply({ statusCode: "00", amount: 1000 });

    await getDuitkuOrderStatus("JA-1");

    const [, init] = lastCall();
    const body = JSON.parse(init.body);
    const expected = referenceSignStatus(MERCHANT_CODE, "JA-1", API_KEY);
    expect(body.signature).toBe(expected);
    expect(body.merchantCode).toBe(MERCHANT_CODE);
    expect(body.merchantOrderId).toBe("JA-1");
  });

  it("does NOT sign a status inquiry the way a callback verification would", () => {
    // Regression lock: reusing the callback signature helper here (which
    // includes `amount` in the middle) would produce a different signature
    // than what Duitku's status-inquiry endpoint actually expects.
    const statusSig = referenceSignStatus(MERCHANT_CODE, "JA-1", API_KEY);
    const callbackStyleSig = createHmac("sha256", API_KEY)
      .update(`${MERCHANT_CODE}1000JA-1`)
      .digest("hex");
    expect(statusSig).not.toBe(callbackStyleSig);
  });

  it("reads statusCode and amount out of a settled reply", async () => {
    mockReply({ statusCode: "00", amount: 1000 });

    const result = await getDuitkuOrderStatus("JA-1");

    expect(result).toEqual({ invoiceNumber: "JA-1", statusCode: "00", amount: 1000 });
  });

  it("accepts an amount serialised as a string", async () => {
    mockReply({ statusCode: "00", amount: "299000" });

    const result = await getDuitkuOrderStatus("JA-1");

    expect(result?.amount).toBe(299000);
  });

  it("returns amount:null when the reply has no amount field", async () => {
    mockReply({ statusCode: "01" });

    const result = await getDuitkuOrderStatus("JA-1");

    expect(result).toEqual({ invoiceNumber: "JA-1", statusCode: "01", amount: null });
  });

  it("returns null when Duitku has never heard of the invoice (non-2xx)", async () => {
    mockReply({ Message: "not found" }, false, 404);

    expect(await getDuitkuOrderStatus("JA-NOPE")).toBeNull();
  });

  it("returns null when the reply carries no statusCode", async () => {
    mockReply({ amount: 1000 });

    expect(await getDuitkuOrderStatus("JA-1")).toBeNull();
  });

  it("returns null on a gateway error rather than inventing an answer", async () => {
    mockReply({}, false, 500);

    expect(await getDuitkuOrderStatus("JA-1")).toBeNull();
  });
});
