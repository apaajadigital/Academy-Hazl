import { describe, it, expect, vi } from "vitest";
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

const { verifyDokuWebhook } = await import("../../src/services/payment/dokuService.js");

/**
 * Transcribed from DOKU's published spec (developers.doku.com → "Signature
 * Component from Request Header"), NOT copied from dokuService: the components
 * are Client-Id, Request-Id, Request-Timestamp, Request-Target, Digest, and the
 * header value is prefixed with `HMACSHA256=`. Written independently so a
 * regression in the service's own sign() cannot silently satisfy this test.
 */
function referenceSign(
  clientId: string,
  requestId: string,
  timestamp: string,
  requestTarget: string,
  body: string,
  secretKey: string
) {
  const digest = createHash("sha256").update(body, "utf8").digest("base64");
  const components =
    `Client-Id:${clientId}\n` +
    `Request-Id:${requestId}\n` +
    `Request-Timestamp:${timestamp}\n` +
    `Request-Target:${requestTarget}\n` +
    `Digest:${digest}`;
  return `HMACSHA256=${createHmac("sha256", secretKey).update(components).digest("base64")}`;
}

describe("verifyDokuWebhook (TASK-030 — non-payment technical verification)", () => {
  const clientId = "CLIENT-TEST";
  const requestId = "req-abc-123";
  const timestamp = "2026-07-02T10:00:00Z";
  const target = "/api/webhooks/doku";
  const body = JSON.stringify({ order: { invoice_number: "JA-1" }, transaction: { status: "SUCCESS" } });
  const secret = "shh-test-secret-key";

  it("accepts a correctly-signed webhook (matches DOKU's HMAC-SHA256 scheme)", () => {
    const signature = referenceSign(clientId, requestId, timestamp, target, body, secret);
    expect(verifyDokuWebhook(clientId, requestId, timestamp, target, body, signature)).toBe(true);
  });

  it("accepts the same signature sent without the HMACSHA256= prefix", () => {
    const signature = referenceSign(clientId, requestId, timestamp, target, body, secret);
    const bare = signature.replace("HMACSHA256=", "");
    expect(verifyDokuWebhook(clientId, requestId, timestamp, target, body, bare)).toBe(true);
  });

  it("rejects a tampered body (signature no longer matches)", () => {
    const signature = referenceSign(clientId, requestId, timestamp, target, body, secret);
    const tamperedBody = JSON.stringify({ order: { invoice_number: "JA-1" }, transaction: { status: "FAILED" } });
    expect(verifyDokuWebhook(clientId, requestId, timestamp, target, tamperedBody, signature)).toBe(false);
  });

  it("rejects a signature signed with the wrong secret", () => {
    const forged = referenceSign(clientId, requestId, timestamp, target, body, "attacker-guessed-secret");
    expect(verifyDokuWebhook(clientId, requestId, timestamp, target, body, forged)).toBe(false);
  });

  it("rejects a replayed signature with a different request-id (defeats naive replay)", () => {
    const signature = referenceSign(clientId, requestId, timestamp, target, body, secret);
    expect(verifyDokuWebhook(clientId, "req-different", timestamp, target, body, signature)).toBe(false);
  });

  it("rejects a signature replayed against a different request target", () => {
    const signature = referenceSign(clientId, requestId, timestamp, target, body, secret);
    expect(verifyDokuWebhook(clientId, requestId, timestamp, "/api/webhooks/other", body, signature)).toBe(false);
  });

  it("rejects an empty/missing signature", () => {
    expect(verifyDokuWebhook(clientId, requestId, timestamp, target, body, "")).toBe(false);
  });
});
