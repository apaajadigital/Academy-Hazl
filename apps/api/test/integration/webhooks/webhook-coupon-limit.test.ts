import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import { app } from "../../../src/app.js";

/**
 * BL-143(b) — what happens at fulfillment when the coupon budget is already gone.
 *
 * The order was validated against the limit when it was still PENDING, which is
 * a read and cannot bind: a burst of buyers all pass it before any of them has
 * consumed a slot. So by the time a payment settles, the coupon may be
 * exhausted — and at that moment the buyer has ALREADY PAID, at a price that
 * already had the discount subtracted.
 *
 * The decision this file pins down: fulfil anyway, do not increment past the
 * limit, and make the overrun loud. Refusing access to someone who has paid is
 * the BL-138 failure in a new costume, and a discount already granted is a
 * business decision, not something this processor may reverse on its own.
 */

vi.mock("../../../src/db/prisma.js", () => ({
  prisma: {
    paymentTransaction: { findUnique: vi.fn(), update: vi.fn() },
    order: { findUnique: vi.fn(), update: vi.fn(), updateMany: vi.fn() },
    course: { findMany: vi.fn() },
    courseEnrollment: { upsert: vi.fn() },
    eventRegistration: { upsert: vi.fn() },
    event: { update: vi.fn(), updateMany: vi.fn(), findUnique: vi.fn() },
    eBook: { updateMany: vi.fn() },
    refund: { create: vi.fn(), upsert: vi.fn() },
    affiliate: { findFirst: vi.fn(), update: vi.fn() },
    affiliateCommission: { create: vi.fn() },
    coupon: { update: vi.fn(), updateMany: vi.fn(), fields: { usageLimit: { __ref: "usageLimit" } } },
    $transaction: vi.fn(),
  },
}));

vi.mock("../../../src/services/payment/dokuService.js", () => ({
  verifyDokuWebhook: vi.fn().mockReturnValue(true),
  isDokuTimestampFresh: vi.fn().mockReturnValue(true),
  dokuTimestampSkewSeconds: vi.fn().mockReturnValue(0),
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

const ORDER_AMOUNT = 299000;

const store = { status: "pending" };

const headers = {
  "client-id": "CLIENT-123",
  "request-id": "req-coupon-1",
  "request-timestamp": new Date().toISOString(),
  signature: "mock-signature",
};

const deliverSuccess = () =>
  request(app)
    .post("/api/webhooks/doku")
    .set(headers)
    .send({
      order: { invoice_number: "JA-ORDER1" },
      transaction: { status: "SUCCESS", amount: ORDER_AMOUNT },
      channel: { id: "VIRTUAL_ACCOUNT_BCA" },
    });

beforeEach(() => {
  vi.clearAllMocks();
  store.status = "pending";

  vi.mocked(prisma.paymentTransaction.findUnique).mockResolvedValue({
    id: "tx-1",
    orderId: "order-1",
    gatewayTxId: "JA-ORDER1",
  } as never);
  vi.mocked(prisma.paymentTransaction.update).mockResolvedValue({} as never);

  vi.mocked(prisma.order.findUnique).mockImplementation((async () => ({
    id: "order-1",
    userId: "user-1",
    status: store.status,
    finalAmount: ORDER_AMOUNT,
    couponId: "coupon-1",
    items: [{ itemType: "course", itemId: "course-1", itemTitle: "Kursus Test", quantity: 1 }],
    user: { name: "Test User", email: "test@test.com", profile: null },
  })) as never);

  vi.mocked(prisma.order.updateMany).mockImplementation((async (args: {
    where: { status?: { notIn?: string[] } };
    data: { status?: string };
  }) => {
    const blocked = args.where.status?.notIn ?? [];
    if (blocked.includes(store.status)) return { count: 0 };
    if (args.data.status) store.status = args.data.status;
    return { count: 1 };
  }) as never);
  vi.mocked(prisma.order.update).mockImplementation((async (args: { data: { status?: string } }) => {
    if (args.data.status) store.status = args.data.status;
    return {};
  }) as never);

  vi.mocked(prisma.course.findMany).mockResolvedValue([] as never);
  vi.mocked(prisma.courseEnrollment.upsert).mockResolvedValue({} as never);
  vi.mocked(prisma.eBook.updateMany).mockResolvedValue({ count: 1 } as never);
  vi.mocked(prisma.affiliate.findFirst).mockResolvedValue(null as never);
  vi.mocked(prisma.$transaction).mockImplementation((cb: unknown) =>
    (cb as (tx: typeof prisma) => Promise<unknown>)(prisma),
  );
});

describe("BL-143(b) — coupon budget at fulfillment", () => {
  it("claims the slot with a guarded update, never an unconditional increment", async () => {
    vi.mocked(prisma.coupon.updateMany).mockResolvedValue({ count: 1 } as never);

    await deliverSuccess();

    expect(prisma.coupon.updateMany).toHaveBeenCalledWith({
      where: {
        id: "coupon-1",
        OR: [{ usageLimit: null }, { usageCount: { lt: { __ref: "usageLimit" } } }],
      },
      data: { usageCount: { increment: 1 } },
    });
    // The unconditional write this replaced must be gone for good: it is what
    // let 200 fulfilments spend a budget of 10.
    expect(prisma.coupon.update).not.toHaveBeenCalled();
    expect(store.status).toBe("paid");
  });

  it("still fulfils the order when the coupon is exhausted — the buyer already paid", async () => {
    vi.mocked(prisma.coupon.updateMany).mockResolvedValue({ count: 0 } as never);

    const res = await deliverSuccess();

    // The whole point: a lost guard must not cost the buyer their access.
    expect(store.status).toBe("paid");
    expect(prisma.courseEnrollment.upsert).toHaveBeenCalled();
    expect(res.status).toBe(200);
  });

  it("does not fall back to an unguarded increment when the guard loses", async () => {
    vi.mocked(prisma.coupon.updateMany).mockResolvedValue({ count: 0 } as never);

    await deliverSuccess();

    // usageCount must stay truthful — never pushed past usageLimit by a retry
    // path that "just makes sure" the counter moved.
    expect(prisma.coupon.update).not.toHaveBeenCalled();
    expect(prisma.coupon.updateMany).toHaveBeenCalledOnce();
  });

  it("leaves the coupon alone entirely when the order carries none", async () => {
    vi.mocked(prisma.order.findUnique).mockImplementation((async () => ({
      id: "order-1",
      userId: "user-1",
      status: store.status,
      finalAmount: ORDER_AMOUNT,
      couponId: null,
      items: [{ itemType: "course", itemId: "course-1", itemTitle: "Kursus Test", quantity: 1 }],
      user: { name: "Test User", email: "test@test.com", profile: null },
    })) as never);

    await deliverSuccess();

    expect(prisma.coupon.updateMany).not.toHaveBeenCalled();
    expect(store.status).toBe("paid");
  });
});
