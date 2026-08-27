import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import { app } from "../../../src/app.js";

/**
 * BL-139 + BL-142 regression suite (Wave 1.1).
 *
 * Every case here drives the REAL route (`POST /api/webhooks/doku`) rather than
 * calling the processor directly — §0.2 of the master plan: BL-137 survived for
 * months because the integration test stubbed the verifier and never proved the
 * route handed it the right input. Only `verifyDokuWebhook` is stubbed here,
 * because signature correctness is covered by webhook-signature.test.ts.
 *
 * BL-139: the notification amount was never compared with the order, so a
 * SUCCESS for Rp 1.000 fulfilled a Rp 299.000 order.
 * BL-142: every unhandled condition answered HTTP 200, so DOKU treated a
 * dropped notification as delivered and never retried.
 */

vi.mock("../../../src/db/prisma.js", () => ({
  prisma: {
    paymentTransaction: { findFirst: vi.fn(), update: vi.fn() },
    order: { findUnique: vi.fn(), update: vi.fn(), updateMany: vi.fn() },
    course: { findMany: vi.fn() },
    courseEnrollment: { upsert: vi.fn() },
    eventRegistration: { upsert: vi.fn() },
    event: { update: vi.fn(), updateMany: vi.fn(), findUnique: vi.fn() },
    eBook: { updateMany: vi.fn() },
    refund: { create: vi.fn(), upsert: vi.fn() },
    affiliate: { findFirst: vi.fn(), update: vi.fn() },
    affiliateCommission: { create: vi.fn() },
    coupon: { update: vi.fn() },
    $transaction: vi.fn(),
  },
}));

vi.mock("../../../src/services/payment/dokuService.js", () => ({
  verifyDokuWebhook: vi.fn().mockReturnValue(true),
}));

vi.mock("../../../src/services/notification/emailService.js", () => ({
  sendPaymentSuccess: vi.fn().mockResolvedValue(undefined),
  sendOrderInvoice: vi.fn().mockResolvedValue(undefined),
  sendEventFullRefund: vi.fn().mockResolvedValue(undefined),
  sendEventRegistrationConfirmed: vi.fn().mockResolvedValue(undefined),
  sendPrivateClassWelcome: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("../../../src/services/notification/whatsappService.js", () => ({
  notifyPaymentSuccess: vi.fn().mockResolvedValue(undefined),
  notifyPrivateClassWelcome: vi.fn().mockResolvedValue(undefined),
}));

const { prisma } = await import("../../../src/db/prisma.js");
const { logger } = await import("../../../src/lib/logger.js");

const ORDER_AMOUNT = 299000;

const mockTransaction = { id: "tx-1", orderId: "order-1", gatewayTxId: "JA-ORDER1" };

const mockOrder = {
  id: "order-1",
  userId: "user-1",
  status: "pending",
  finalAmount: ORDER_AMOUNT,
  items: [{ itemType: "course", itemId: "course-1", itemTitle: "Kursus Test", quantity: 1 }],
  user: { name: "Test User", email: "test@test.com", profile: null },
};

const headers = {
  "client-id": "CLIENT-123",
  "request-id": "req-123",
  "request-timestamp": new Date().toISOString(),
  signature: "mock-signature",
};

/** A well-formed DOKU Checkout notification, overridable per case. */
function notification(overrides: Record<string, unknown> = {}) {
  return {
    order: { invoice_number: "JA-ORDER1" },
    transaction: { status: "SUCCESS", amount: ORDER_AMOUNT, date: "2026-08-27T10:00:00Z" },
    channel: { id: "VIRTUAL_ACCOUNT_BCA" },
    ...overrides,
  };
}

const post = (body: unknown) =>
  request(app).post("/api/webhooks/doku").set(headers).send(body as object);

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(prisma.paymentTransaction.findFirst).mockResolvedValue(mockTransaction as never);
  vi.mocked(prisma.paymentTransaction.update).mockResolvedValue({} as never);
  vi.mocked(prisma.order.findUnique).mockResolvedValue(mockOrder as never);
  vi.mocked(prisma.order.update).mockResolvedValue({} as never);
  vi.mocked(prisma.order.updateMany).mockResolvedValue({ count: 1 } as never);
  vi.mocked(prisma.course.findMany).mockResolvedValue([] as never);
  vi.mocked(prisma.courseEnrollment.upsert).mockResolvedValue({} as never);
  vi.mocked(prisma.eBook.updateMany).mockResolvedValue({ count: 1 } as never);
  vi.mocked(prisma.refund.create).mockResolvedValue({} as never);
  vi.mocked(prisma.refund.upsert).mockResolvedValue({} as never);
  vi.mocked(prisma.affiliate.findFirst).mockResolvedValue(null as never);
  vi.mocked(prisma.coupon.update).mockResolvedValue({} as never);
  vi.mocked(prisma.$transaction).mockImplementation((cb: unknown) =>
    (cb as (tx: typeof prisma) => Promise<unknown>)(prisma),
  );
});

// ── BL-139: the amount actually settled must match the order ──────────────────

describe("BL-139 — amount verification", () => {
  it("refuses to fulfill when the settled amount is lower than the order", async () => {
    const errSpy = vi.spyOn(logger, "error");

    const res = await post(notification({ transaction: { status: "SUCCESS", amount: 1000 } }));

    // Non-2xx so DOKU keeps retrying and the anomaly stays visible.
    expect(res.status).toBeGreaterThanOrEqual(400);
    expect(prisma.order.updateMany).not.toHaveBeenCalled();
    expect(prisma.courseEnrollment.upsert).not.toHaveBeenCalled();
    // Both numbers are logged — an operator must not have to guess which side drifted.
    expect(errSpy).toHaveBeenCalledWith(
      expect.stringContaining("amount"),
      expect.objectContaining({ expectedAmount: ORDER_AMOUNT, receivedAmount: 1000 }),
    );
  });

  it("refuses to fulfill when the settled amount is higher than the order", async () => {
    const res = await post(
      notification({ transaction: { status: "SUCCESS", amount: ORDER_AMOUNT * 2 } }),
    );

    expect(res.status).toBeGreaterThanOrEqual(400);
    expect(prisma.order.updateMany).not.toHaveBeenCalled();
  });

  it("accepts the half-rupiah gap checkout itself creates", async () => {
    // checkout.ts sends Math.round(finalAmount) to DOKU while the order keeps the
    // unrounded Decimal, so the two legitimately differ by up to 0.5.
    vi.mocked(prisma.order.findUnique).mockResolvedValue({
      ...mockOrder,
      finalAmount: ORDER_AMOUNT + 0.4,
    } as never);

    const res = await post(notification());

    expect(res.status).toBe(200);
    expect(prisma.order.updateMany).toHaveBeenCalled();
  });

  it("accepts an amount sent as a string, the way DOKU serialises it", async () => {
    const res = await post(
      notification({ transaction: { status: "SUCCESS", amount: "299000.00" } }),
    );

    expect(res.status).toBe(200);
    expect(prisma.courseEnrollment.upsert).toHaveBeenCalled();
  });

  it("refuses a SUCCESS that carries no amount at all", async () => {
    const res = await post(notification({ transaction: { status: "SUCCESS" } }));

    expect(res.status).toBeGreaterThanOrEqual(400);
    expect(prisma.order.updateMany).not.toHaveBeenCalled();
  });

  it("stores the raw payload in PaymentTransaction.gatewayRaw", async () => {
    await post(notification());

    expect(prisma.paymentTransaction.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "tx-1" },
        data: expect.objectContaining({
          gatewayRaw: expect.objectContaining({
            order: expect.objectContaining({ invoice_number: "JA-ORDER1" }),
          }),
        }),
      }),
    );
  });

  it("stores gatewayRaw even for a notification it then rejects", async () => {
    // Forensics are most valuable exactly when the notification is wrong.
    await post(notification({ transaction: { status: "SUCCESS", amount: 1000 } }));

    expect(prisma.paymentTransaction.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ gatewayRaw: expect.anything() }) }),
    );
  });
});

// ── BL-142: nothing unhandled may answer 200 ──────────────────────────────────

describe("BL-142 — status handling", () => {
  it("accepts a lowercase, padded status", async () => {
    const res = await post(
      notification({ transaction: { status: "  success  ", amount: ORDER_AMOUNT } }),
    );

    expect(res.status).toBe(200);
    expect(prisma.order.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: "paid" }) }),
    );
  });

  it("rejects an unknown status instead of dropping it", async () => {
    const errSpy = vi.spyOn(logger, "error");

    const res = await post(
      notification({ transaction: { status: "PARTIAL_SETTLEMENT", amount: ORDER_AMOUNT } }),
    );

    expect(res.status).toBeGreaterThanOrEqual(400);
    expect(errSpy).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ txStatus: "PARTIAL_SETTLEMENT" }),
    );
  });

  it("rejects a payload with no invoice number", async () => {
    const res = await post({ transaction: { status: "SUCCESS", amount: ORDER_AMOUNT } });

    expect(res.status).toBeGreaterThanOrEqual(400);
  });

  it("rejects a payload with no status", async () => {
    const res = await post({
      order: { invoice_number: "JA-ORDER1" },
      transaction: { amount: ORDER_AMOUNT },
    });

    expect(res.status).toBeGreaterThanOrEqual(400);
  });

  it("rejects an invoice number no transaction was ever created for", async () => {
    vi.mocked(prisma.paymentTransaction.findFirst).mockResolvedValue(null as never);

    const res = await post(notification());

    expect(res.status).toBeGreaterThanOrEqual(400);
  });

  it("rejects when the transaction exists but its order is gone", async () => {
    vi.mocked(prisma.order.findUnique).mockResolvedValue(null as never);

    const res = await post(notification());

    expect(res.status).toBeGreaterThanOrEqual(400);
  });

  it("turns a REFUND notification into a pending Refund row instead of silence", async () => {
    const errSpy = vi.spyOn(logger, "error");

    const res = await post(notification({ transaction: { status: "REFUND", amount: ORDER_AMOUNT } }));

    expect(res.status).toBe(200);
    expect(prisma.refund.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { orderId: "order-1" },
        create: expect.objectContaining({
          status: "pending",
          reason: expect.stringContaining("refund"),
        }),
      }),
    );
    expect(errSpy).toHaveBeenCalled();
  });

  it("turns a CHARGEBACK notification into a pending Refund row", async () => {
    const res = await post(
      notification({ transaction: { status: "CHARGEBACK", amount: ORDER_AMOUNT } }),
    );

    expect(res.status).toBe(200);
    expect(prisma.refund.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({ reason: expect.stringContaining("chargeback") }),
      }),
    );
  });

  it("creates a pending Refund when money lands on a cancelled order", async () => {
    const errSpy = vi.spyOn(logger, "error");
    vi.mocked(prisma.order.findUnique).mockResolvedValue({
      ...mockOrder,
      status: "cancelled",
    } as never);

    const res = await post(notification());

    // Still no fulfillment — but no longer a log line and nothing else.
    expect(prisma.order.updateMany).not.toHaveBeenCalled();
    expect(prisma.courseEnrollment.upsert).not.toHaveBeenCalled();
    expect(prisma.refund.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { orderId: "order-1" },
        create: expect.objectContaining({ status: "pending", amount: ORDER_AMOUNT }),
      }),
    );
    expect(errSpy).toHaveBeenCalled();
    expect(res.status).toBe(200);
  });

  it("still records EXPIRED without an amount (no money moved, nothing to verify)", async () => {
    const res = await post(notification({ transaction: { status: "EXPIRED" } }));

    expect(res.status).toBe(200);
    expect(prisma.order.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { status: "expired" } }),
    );
  });
});
