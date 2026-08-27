import { describe, it, expect, vi } from "vitest";
import request from "supertest";
import { createHmac, createHash } from "node:crypto";

// Real signature verification: dokuService is deliberately NOT mocked here.
// webhook.test.ts stubs verifyDokuWebhook to always pass, so it can prove
// fulfillment but never proves the route feeds the verifier the right inputs.
// BL-137 lived exactly in that gap.
vi.mock("../../../src/db/prisma.js", () => ({
  prisma: {
    // Unknown invoice: fulfillment short-circuits, so this suite asserts the
    // signature gate alone without touching any other collaborator.
    paymentTransaction: { findFirst: vi.fn().mockResolvedValue(null), update: vi.fn() },
    order: { findUnique: vi.fn().mockResolvedValue(null), update: vi.fn(), updateMany: vi.fn() },
    course: { findMany: vi.fn() },
    courseEnrollment: { upsert: vi.fn() },
    eventRegistration: { upsert: vi.fn() },
    event: { update: vi.fn(), updateMany: vi.fn(), findUnique: vi.fn() },
    refund: { create: vi.fn(), upsert: vi.fn() },
    affiliate: { findFirst: vi.fn() },
    affiliateCommission: { create: vi.fn() },
    coupon: { update: vi.fn() },
    $transaction: vi.fn(),
  },
}));

const { app } = await import("../../../src/app.js");

const CLIENT_ID = "CLIENT-TEST";
const SECRET = "shh-test-secret-key";
const TARGET = "/api/webhooks/doku";

/** DOKU's published scheme, transcribed from the spec — not from our code. */
function dokuSign(requestId: string, timestamp: string, target: string, body: string) {
  const digest = createHash("sha256").update(body, "utf8").digest("base64");
  const components =
    `Client-Id:${CLIENT_ID}\n` +
    `Request-Id:${requestId}\n` +
    `Request-Timestamp:${timestamp}\n` +
    `Request-Target:${target}\n` +
    `Digest:${digest}`;
  return `HMACSHA256=${createHmac("sha256", SECRET).update(components).digest("base64")}`;
}

/**
 * BL-145: the route now checks that the SIGNED timestamp is recent, so this
 * suite can no longer pin a fixed date — a hardcoded stamp would start failing
 * the moment it aged past the window. Second resolution, matching what DOKU
 * sends and what dokuService produces for outbound requests.
 */
function freshTimestamp(): string {
  return new Date().toISOString().replace(/\.\d{3}Z$/, "Z");
}

function post(target: string, body: string, requestId = "req-1", timestamp = freshTimestamp()) {
  return request(app)
    .post("/api/webhooks/doku")
    .set("Content-Type", "application/json")
    .set("Client-Id", CLIENT_ID)
    .set("Request-Id", requestId)
    .set("Request-Timestamp", timestamp)
    .set("Signature", dokuSign(requestId, timestamp, target, body))
    .send(body);
}

const payload = JSON.stringify({
  order: { invoice_number: "JA-UNKNOWN" },
  transaction: { status: "SUCCESS", amount: 299000 },
  channel: { id: "VIRTUAL_ACCOUNT_BCA" },
});

describe("POST /api/webhooks/doku — signature gate over the real route (BL-137)", () => {
  it("accepts a notification signed exactly the way DOKU signs it", async () => {
    // Signed with the path DOKU is registered to call, which is what the route
    // must reconstruct from req.originalUrl.
    //
    // 404, not 200: the signature is accepted (a rejected one answers 401 and
    // never reaches intake), and the request then dies on the deliberately
    // unknown invoice this suite mocks. Before BL-142 that unknown invoice
    // answered 200 — which is exactly why the assertion had to change here.
    const res = await post(TARGET, payload);
    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: "unknown_invoice" });
  });

  it("rejects a notification signed for a different request target", async () => {
    const res = await post("/api/webhooks/somewhere-else", payload);
    expect(res.status).toBe(401);
  });

  it("rejects a body tampered with after signing", async () => {
    const requestId = "req-2";
    const timestamp = freshTimestamp();
    const res = await request(app)
      .post("/api/webhooks/doku")
      .set("Content-Type", "application/json")
      .set("Client-Id", CLIENT_ID)
      .set("Request-Id", requestId)
      .set("Request-Timestamp", timestamp)
      .set("Signature", dokuSign(requestId, timestamp, TARGET, payload))
      .send(JSON.stringify({ ...JSON.parse(payload), transaction: { status: "FAILED" } }));
    expect(res.status).toBe(401);
  });

  it("rejects a notification with no signature at all", async () => {
    const res = await request(app)
      .post("/api/webhooks/doku")
      .set("Content-Type", "application/json")
      .set("Client-Id", CLIENT_ID)
      .set("Request-Id", "req-3")
      .set("Request-Timestamp", freshTimestamp())
      .send(payload);
    expect(res.status).toBe(401);
  });

  // BL-145 over the real route: a genuinely signed notification whose timestamp
  // is old must be refused. Without this the same captured request could be
  // replayed forever — and a replayed FAILED/EXPIRED is the direct trigger for
  // BL-138, no race required.
  it("rejects a correctly signed notification that is being replayed later", async () => {
    const stale = new Date(Date.now() - 72 * 3_600_000).toISOString().replace(/\.\d{3}Z$/, "Z");
    const res = await post(TARGET, payload, "req-replay", stale);
    expect(res.status).toBe(401);
    expect(res.body).toEqual({ error: "stale_timestamp" });
  });

  // The window has to stay wide enough for DOKU's own redeliveries, which carry
  // the ORIGINAL timestamp. A notification a few hours old is a retry, not an
  // attack — rejecting it would drop a real payment.
  it("still accepts a redelivery from hours ago", async () => {
    const earlier = new Date(Date.now() - 6 * 3_600_000).toISOString().replace(/\.\d{3}Z$/, "Z");
    const res = await post(TARGET, payload, "req-retry", earlier);
    // Past the signature and freshness gates; dies on the unknown invoice.
    expect(res.status).toBe(404);
  });

  it("rejects the pre-BL-137 signature scheme (Request-Body, no HMACSHA256= prefix)", async () => {
    // Guards the regression directly: if anyone reintroduces the old scheme,
    // this flips to 200 and the suite fails.
    const requestId = "req-4";
    const timestamp = freshTimestamp();
    const digest = createHash("sha256").update(payload, "utf8").digest("base64");
    const legacy = createHmac("sha256", SECRET)
      .update(
        `Client-Id:${CLIENT_ID}\nRequest-Id:${requestId}\nRequest-Timestamp:${timestamp}\nRequest-Body:${digest}`
      )
      .digest("base64");
    const res = await request(app)
      .post("/api/webhooks/doku")
      .set("Content-Type", "application/json")
      .set("Client-Id", CLIENT_ID)
      .set("Request-Id", requestId)
      .set("Request-Timestamp", timestamp)
      .set("Signature", legacy)
      .send(payload);
    expect(res.status).toBe(401);
  });
});
