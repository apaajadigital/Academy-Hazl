import { describe, it, expect, vi } from "vitest";
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

const { verifyDuitkuCallback } = await import("../../src/services/payment/duitkuService.js");

/**
 * Transcribed independently from Duitku's published callback spec
 * (docs.duitku.com/api/en, "Callback URL / Notification") — NOT copied from
 * duitkuService.ts's own signCallback(): stringToSign = merchantCode + amount
 * + merchantOrderId (amount BEFORE merchantOrderId — the opposite order from
 * the create-invoice signature). Lowercase hex. Written independently so a
 * regression in the service's own signing function cannot silently satisfy
 * this test (BL-137's lesson, carried over from the DOKU era).
 */
function referenceSign(merchantCode: string, amount: string, merchantOrderId: string, apiKey: string): string {
  return createHmac("sha256", apiKey).update(`${merchantCode}${amount}${merchantOrderId}`).digest("hex");
}

describe("verifyDuitkuCallback", () => {
  const merchantCode = "MERCHANT-TEST";
  const amount = "10000";
  const merchantOrderId = "JA-1";
  const apiKey = "shh-test-api-key";

  it("accepts a correctly-signed Duitku callback", () => {
    const signature = referenceSign(merchantCode, amount, merchantOrderId, apiKey);
    expect(verifyDuitkuCallback(merchantCode, amount, merchantOrderId, signature)).toBe(true);
  });

  it("accepts a signature in uppercase hex (case-insensitive comparison)", () => {
    const signature = referenceSign(merchantCode, amount, merchantOrderId, apiKey).toUpperCase();
    expect(verifyDuitkuCallback(merchantCode, amount, merchantOrderId, signature)).toBe(true);
  });

  it("rejects a signature computed with the field order swapped (amount vs merchantOrderId)", () => {
    // Regression lock for the one real gotcha in this migration: the
    // create-invoice signature and the callback signature are NOT
    // interchangeable — this asserts the callback verifier does not accept
    // the create-invoice field order (merchantCode + merchantOrderId + amount).
    const wrongOrderSignature = createHmac("sha256", apiKey)
      .update(`${merchantCode}${merchantOrderId}${amount}`)
      .digest("hex");
    expect(verifyDuitkuCallback(merchantCode, amount, merchantOrderId, wrongOrderSignature)).toBe(false);
  });

  it("rejects a signature signed with the wrong API key", () => {
    const forged = referenceSign(merchantCode, amount, merchantOrderId, "attacker-guessed-key");
    expect(verifyDuitkuCallback(merchantCode, amount, merchantOrderId, forged)).toBe(false);
  });

  it("rejects a signature computed for a different merchantOrderId", () => {
    const signature = referenceSign(merchantCode, amount, merchantOrderId, apiKey);
    expect(verifyDuitkuCallback(merchantCode, amount, "JA-different", signature)).toBe(false);
  });

  it("rejects a signature computed for a different amount", () => {
    const signature = referenceSign(merchantCode, amount, merchantOrderId, apiKey);
    expect(verifyDuitkuCallback(merchantCode, "99999", merchantOrderId, signature)).toBe(false);
  });

  it("rejects an empty/missing signature", () => {
    expect(verifyDuitkuCallback(merchantCode, amount, merchantOrderId, "")).toBe(false);
  });
});
