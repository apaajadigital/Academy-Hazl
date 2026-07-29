import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import { app } from "../../../src/app.js";

// BL-65 regression suite: EBook.totalSold was declared in the schema but never
// written by anything in apps/api/src — every ebook reported 0 sales forever.
//
// The counter is GROSS and increment-only. Exactly two paths write it (free /
// 100%-off checkout and paid webhook fulfillment) and NOTHING releases it: a
// refund revokes access but must leave the number alone, because there is no
// per-line evidence that a given order's sale was ever counted (contrast events,
// where the eventRegistration deleteMany count is that evidence). These tests pin
// both halves — that the sale is counted exactly once, and that a refund does not
// take it back.

vi.mock("../../../src/db/prisma.js", () => ({
  prisma: {
    eBook: { findUnique: vi.fn(), updateMany: vi.fn() },
    course: { findUnique: vi.fn(), findMany: vi.fn() },
    courseEnrollment: { findUnique: vi.fn(), upsert: vi.fn(), deleteMany: vi.fn() },
    event: { findUnique: vi.fn(), update: vi.fn(), updateMany: vi.fn() },
    eventRegistration: { findUnique: vi.fn(), create: vi.fn(), upsert: vi.fn(), deleteMany: vi.fn() },
    coupon: { findUnique: vi.fn(), update: vi.fn() },
    order: { create: vi.fn(), findUnique: vi.fn(), update: vi.fn(), updateMany: vi.fn() },
    paymentTransaction: { create: vi.fn(), findFirst: vi.fn(), update: vi.fn() },
    refund: { create: vi.fn(), findUnique: vi.fn(), update: vi.fn() },
    affiliate: { findFirst: vi.fn(), findUnique: vi.fn(), update: vi.fn() },
    affiliateCommission: { create: vi.fn(), update: vi.fn() },
    $transaction: vi.fn(),
  },
}));

vi.mock("../../../src/middleware/authenticate.js", () => ({
  authenticate: vi.fn((req, _res, next) => {
    req.user = { id: "user-1", email: "user@test.com", name: "Test User", roles: ["student"] };
    next();
  }),
}));

vi.mock("../../../src/services/payment/dokuService.js", () => ({
  createDokuOrder: vi.fn().mockResolvedValue({
    invoiceNumber: "JA-TEST123",
    paymentUrl: "http://localhost:3000/payment/success?order=JA-TEST123&mock=1",
  }),
  verifyDokuWebhook: vi.fn().mockReturnValue(true),
}));

vi.mock("../../../src/services/notification/emailService.js", () => ({
  sendPaymentPending: vi.fn().mockResolvedValue(undefined),
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

vi.mock("../../../src/services/coupon/couponService.js", () => ({
  validateCoupon: vi.fn(),
  incrementCouponUsage: vi.fn().mockResolvedValue(undefined),
}));

const { prisma } = await import("../../../src/db/prisma.js");
const { authenticate } = await import("../../../src/middleware/authenticate.js");
const { validateCoupon } = await import("../../../src/services/coupon/couponService.js");

const mockEbook = {
  id: "ebook-1",
  slug: "panduan-produktivitas",
  title: "Panduan Produktivitas",
  status: "published",
  price: "99000.00",
  salePrice: null,
  totalSold: 5,
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(prisma.eBook.findUnique).mockResolvedValue(mockEbook as never);
  vi.mocked(prisma.eBook.updateMany).mockResolvedValue({ count: 1 } as never);
  vi.mocked(prisma.course.findMany).mockResolvedValue([] as never);
  vi.mocked(prisma.order.create).mockResolvedValue({
    id: "order-1",
    status: "paid",
    finalAmount: 0,
    user: { name: "Test User", email: "user@test.com" },
  } as never);
  vi.mocked(prisma.paymentTransaction.create).mockResolvedValue({} as never);
  // Webhook fulfillment claims the order with an atomic updateMany; by default
  // this delivery wins the claim.
  vi.mocked(prisma.order.updateMany).mockResolvedValue({ count: 1 } as never);
  vi.mocked(prisma.$transaction).mockImplementation((cb: unknown) =>
    (cb as (tx: typeof prisma) => Promise<unknown>)(prisma),
  );
});

// ─── Free / 100%-off checkout path (routes/checkout.ts) ───────────────────────

describe("BL-65 — free ebook checkout counts the sale", () => {
  it("increments totalSold when a 100%-off coupon fulfills an ebook inline", async () => {
    vi.mocked(validateCoupon).mockResolvedValue({
      couponId: "coupon-free",
      code: "GRATIS100",
      discountAmount: 99000,
      finalAmount: 0,
    });

    const res = await request(app)
      .post("/api/checkout")
      .send({ itemType: "ebook", itemId: "ebook-1", couponCode: "GRATIS100" });

    expect(res.status).toBe(200);
    expect(res.body.data.free).toBe(true);
    expect(prisma.eBook.updateMany).toHaveBeenCalledWith({
      where: { id: "ebook-1" },
      data: { totalSold: { increment: 1 } },
    });
  });

  it("does not count the sale on the PAID path (the webhook owns that)", async () => {
    // No coupon → finalAmount > 0 → a pending order + DOKU redirect. Counting
    // here would credit a sale for money that has not arrived yet.
    vi.mocked(prisma.order.create).mockResolvedValue({
      id: "order-2",
      status: "pending",
      finalAmount: 99000,
      user: { name: "Test User", email: "user@test.com" },
    } as never);

    const res = await request(app)
      .post("/api/checkout")
      .send({ itemType: "ebook", itemId: "ebook-1" });

    expect(res.status).toBe(200);
    expect(res.body.data.paymentUrl).toBeDefined();
    expect(prisma.eBook.updateMany).not.toHaveBeenCalled();
  });

  it("still completes the checkout when the ebook row is gone (updateMany matches 0)", async () => {
    // updateMany, not update: a P2025 from `update` would 500 a checkout whose
    // order + payment transaction are already committed.
    vi.mocked(prisma.eBook.updateMany).mockResolvedValue({ count: 0 } as never);
    vi.mocked(validateCoupon).mockResolvedValue({
      couponId: "coupon-free",
      code: "GRATIS100",
      discountAmount: 99000,
      finalAmount: 0,
    });

    const res = await request(app)
      .post("/api/checkout")
      .send({ itemType: "ebook", itemId: "ebook-1", couponCode: "GRATIS100" });

    expect(res.status).toBe(200);
    expect(res.body.data.free).toBe(true);
  });
});

// ─── Paid fulfillment path (jobs/processors/webhook.ts) ───────────────────────

describe("BL-65 — paid webhook fulfillment counts the sale", () => {
  const webhookHeaders = {
    "client-id": "CLIENT-123",
    "request-id": "req-123",
    "request-timestamp": new Date().toISOString(),
    signature: "mock-signature",
  };

  const ebookOrder = {
    id: "order-1",
    userId: "user-1",
    finalAmount: 99000,
    items: [{ itemType: "ebook", itemId: "ebook-1", itemTitle: "Panduan Produktivitas", quantity: 1 }],
    user: { name: "Test User", email: "user@test.com", profile: null },
  };

  beforeEach(() => {
    vi.mocked(prisma.paymentTransaction.findFirst).mockResolvedValue({
      id: "tx-1",
      orderId: "order-1",
      gatewayTxId: "JA-ORDER1",
    } as never);
    vi.mocked(prisma.order.findUnique).mockResolvedValue(ebookOrder as never);
    vi.mocked(prisma.order.update).mockResolvedValue({} as never);
    vi.mocked(prisma.paymentTransaction.update).mockResolvedValue({} as never);
  });

  const postWebhook = (status: string) =>
    request(app)
      .post("/api/webhooks/doku")
      .set(webhookHeaders)
      .send({ order: { invoice_number: "JA-ORDER1" }, transaction: { status } });

  it("increments totalSold when the payment succeeds", async () => {
    const res = await postWebhook("SUCCESS");

    expect(res.status).toBe(200);
    expect(prisma.order.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: "paid" }) }),
    );
    expect(prisma.eBook.updateMany).toHaveBeenCalledWith({
      where: { id: "ebook-1" },
      data: { totalSold: { increment: 1 } },
    });
  });

  it("counts the order line's quantity, not a hardcoded 1", async () => {
    // Checkout writes quantity 1 today, so this is latent — but the increment
    // must read the column, otherwise a multi-copy line would under-count.
    vi.mocked(prisma.order.findUnique).mockResolvedValue({
      ...ebookOrder,
      items: [{ itemType: "ebook", itemId: "ebook-1", itemTitle: "Panduan", quantity: 3 }],
    } as never);

    const res = await postWebhook("SUCCESS");

    expect(res.status).toBe(200);
    expect(prisma.eBook.updateMany).toHaveBeenCalledWith({
      where: { id: "ebook-1" },
      data: { totalSold: { increment: 3 } },
    });
  });

  it("does NOT double-count when DOKU replays the same webhook", async () => {
    // First delivery fulfills and flips the order to "paid".
    await postWebhook("SUCCESS");
    expect(prisma.eBook.updateMany).toHaveBeenCalledTimes(1);

    // Replay: the order now reads back as paid, so the fast-path guard in
    // processWebhookPayment returns before the fulfillment loop is reached.
    vi.mocked(prisma.order.findUnique).mockResolvedValue({ ...ebookOrder, status: "paid" } as never);

    const res = await postWebhook("SUCCESS");

    expect(res.status).toBe(200);
    // Still exactly one increment across BOTH deliveries.
    expect(prisma.eBook.updateMany).toHaveBeenCalledTimes(1);
  });

  it("does NOT double-count two concurrent deliveries that both read 'pending'", async () => {
    // The status read is outside the transaction, and queues.ts runs the
    // processor inline (no dedup) when Redis is down — so both deliveries reach
    // the transaction. The atomic claim is what stops the second one: its
    // updateMany matches 0 rows and the fulfillment loop is never entered.
    vi.mocked(prisma.order.updateMany).mockResolvedValue({ count: 0 } as never);

    const res = await postWebhook("SUCCESS");

    expect(res.status).toBe(200);
    expect(prisma.eBook.updateMany).not.toHaveBeenCalled();
  });

  it("does not count the sale on a FAILED payment", async () => {
    const res = await postWebhook("FAILED");

    expect(res.status).toBe(200);
    expect(prisma.eBook.updateMany).not.toHaveBeenCalled();
  });

  it("does not count the sale for a cancelled order", async () => {
    vi.mocked(prisma.order.findUnique).mockResolvedValue({ ...ebookOrder, status: "cancelled" } as never);

    const res = await postWebhook("SUCCESS");

    expect(res.status).toBe(200);
    expect(prisma.eBook.updateMany).not.toHaveBeenCalled();
  });
});

// ─── Refund path (routes/orders.ts) ───────────────────────────────────────────

describe("BL-65 — approved refund does NOT touch the ebook sales counter", () => {
  const mockRefund = {
    id: "refund-1",
    orderId: "order-1",
    userId: "user-1",
    reason: "Salah beli, konten tidak sesuai kebutuhan",
    status: "pending",
    amount: "99000",
  };

  const paidEbookOrder = {
    id: "order-1",
    userId: "user-1",
    status: "paid",
    finalAmount: "99000",
    couponId: null,
    items: [{ itemType: "ebook", itemId: "ebook-1", quantity: 1 }],
    commissions: [],
  };

  beforeEach(() => {
    vi.mocked(authenticate).mockImplementation(async (req, _res, next) => {
      (req as never as { user: unknown }).user = {
        id: "admin-1",
        email: "admin@test.com",
        name: "Admin",
        roles: ["super_admin"],
      };
      next();
    });
    vi.mocked(prisma.refund.findUnique).mockResolvedValue(mockRefund as never);
    vi.mocked(prisma.refund.update).mockResolvedValue({ ...mockRefund, status: "approved" } as never);
    vi.mocked(prisma.order.findUnique).mockResolvedValue(paidEbookOrder as never);
    vi.mocked(prisma.order.update).mockResolvedValue({ ...paidEbookOrder, status: "refunded" } as never);
  });

  const approve = () =>
    request(app).patch("/api/orders/admin/refunds/refund-1").send({ status: "approved" });

  it("revokes access via the status flip and leaves totalSold untouched", async () => {
    const res = await approve();

    expect(res.status).toBe(200);
    // Access is revoked purely by the "refunded" flip — routes/ebooks.ts gates
    // downloads on an order with status "paid".
    expect(prisma.order.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { status: "refunded" } }),
    );
    // No write to the counter AT ALL. A decrement here would subtract from a
    // shared gross total with no evidence that this order was ever counted: an
    // order paid before the counter existed was never incremented, so releasing
    // it would destroy other buyers' sales. A `totalSold >= n` guard cannot fix
    // that — it only stops the number going negative.
    expect(prisma.eBook.updateMany).not.toHaveBeenCalled();
  });

  it("leaves totalSold untouched for a multi-copy order line too", async () => {
    vi.mocked(prisma.order.findUnique).mockResolvedValue({
      ...paidEbookOrder,
      items: [{ itemType: "ebook", itemId: "ebook-1", quantity: 3 }],
    } as never);

    const res = await approve();

    expect(res.status).toBe(200);
    expect(prisma.eBook.updateMany).not.toHaveBeenCalled();
  });

  it("counter keeps the sale after purchase → refund (gross, not net)", async () => {
    // Model the real counter so the OUTCOME is asserted, not just the queries.
    const ebook = { id: "ebook-1", totalSold: 5 };
    vi.mocked(prisma.eBook.updateMany).mockImplementation((async (args: {
      where: { id: string };
      data: { totalSold: { increment?: number; decrement?: number } };
    }) => {
      if (args.where.id !== ebook.id) return { count: 0 };
      ebook.totalSold += args.data.totalSold.increment ?? 0;
      ebook.totalSold -= args.data.totalSold.decrement ?? 0;
      return { count: 1 };
    }) as never);

    // Purchase (paid webhook fulfillment).
    vi.mocked(prisma.paymentTransaction.findFirst).mockResolvedValue({
      id: "tx-1",
      orderId: "order-1",
      gatewayTxId: "JA-ORDER1",
    } as never);
    vi.mocked(prisma.paymentTransaction.update).mockResolvedValue({} as never);
    vi.mocked(prisma.order.findUnique).mockResolvedValue({
      ...paidEbookOrder,
      status: "pending",
      items: [{ itemType: "ebook", itemId: "ebook-1", itemTitle: "Panduan", quantity: 1 }],
      user: { name: "Test User", email: "user@test.com", profile: null },
    } as never);

    await request(app)
      .post("/api/webhooks/doku")
      .set({
        "client-id": "CLIENT-123",
        "request-id": "req-123",
        "request-timestamp": new Date().toISOString(),
        signature: "mock-signature",
      })
      .send({ order: { invoice_number: "JA-ORDER1" }, transaction: { status: "SUCCESS" } });

    expect(ebook.totalSold).toBe(6);

    // Refund the same order: lifetime sales stay at 6.
    vi.mocked(prisma.order.findUnique).mockResolvedValue(paidEbookOrder as never);
    const res = await approve();

    expect(res.status).toBe(200);
    expect(ebook.totalSold).toBe(6);
  });
});
