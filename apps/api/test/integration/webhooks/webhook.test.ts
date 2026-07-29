import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import { app } from "../../../src/app.js";

vi.mock("../../../src/db/prisma.js", () => ({
  prisma: {
    paymentTransaction: { findFirst: vi.fn(), update: vi.fn() },
    order: { findUnique: vi.fn(), update: vi.fn() },
    course: { findMany: vi.fn() },
    courseEnrollment: { upsert: vi.fn() },
    eventRegistration: { upsert: vi.fn() },
    event: { update: vi.fn(), updateMany: vi.fn(), findUnique: vi.fn() },
    refund: { create: vi.fn() },
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
  // BL-63: e-ticket confirmation for a successfully fulfilled event seat.
  sendEventRegistrationConfirmed: vi.fn().mockResolvedValue(undefined),
  sendPrivateClassWelcome: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("../../../src/services/notification/whatsappService.js", () => ({
  notifyPaymentSuccess: vi.fn().mockResolvedValue(undefined),
  notifyPrivateClassWelcome: vi.fn().mockResolvedValue(undefined),
}));

const { prisma } = await import("../../../src/db/prisma.js");

const mockTransaction = {
  id: "tx-1",
  orderId: "order-1",
  gatewayTxId: "JA-ORDER1",
};

const mockOrder = {
  id: "order-1",
  userId: "user-1",
  finalAmount: 299000,
  items: [{ itemType: "course", itemId: "course-1", itemTitle: "Kursus Test" }],
  user: { name: "Test User", email: "test@test.com", profile: null },
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(prisma.paymentTransaction.findFirst).mockResolvedValue(mockTransaction as never);
  vi.mocked(prisma.order.findUnique).mockResolvedValue(mockOrder as never);
  vi.mocked(prisma.order.update).mockResolvedValue({} as never);
  // Private Class onboarding: default order has no private_class course.
  vi.mocked(prisma.course.findMany).mockResolvedValue([] as never);
  vi.mocked(prisma.paymentTransaction.update).mockResolvedValue({} as never);
  vi.mocked(prisma.courseEnrollment.upsert).mockResolvedValue({} as never);
  vi.mocked(prisma.eventRegistration.upsert).mockResolvedValue({} as never);
  vi.mocked(prisma.event.update).mockResolvedValue({} as never);
  // Batch8 D2: default event has capacity → reservation succeeds.
  vi.mocked(prisma.event.findUnique).mockResolvedValue({ quota: 100, title: "Webinar" } as never);
  vi.mocked(prisma.event.updateMany).mockResolvedValue({ count: 1 } as never);
  vi.mocked(prisma.refund.create).mockResolvedValue({} as never);
  vi.mocked(prisma.affiliate.findFirst).mockResolvedValue(null as never);
  vi.mocked(prisma.affiliate.update).mockResolvedValue({} as never);
  vi.mocked(prisma.affiliateCommission.create).mockResolvedValue({} as never);
  vi.mocked(prisma.coupon.update).mockResolvedValue({} as never);
  // Fulfillment now runs inside prisma.$transaction(cb); execute the callback
  // with the mocked prisma as the transaction client so tx.* calls are asserted.
  vi.mocked(prisma.$transaction).mockImplementation((cb: unknown) =>
    (cb as (tx: typeof prisma) => Promise<unknown>)(prisma),
  );
});

const webhookHeaders = {
  "client-id": "CLIENT-123",
  "request-id": "req-123",
  "request-timestamp": new Date().toISOString(),
  signature: "mock-signature",
};

describe("POST /api/webhooks/doku", () => {
  it("handles SUCCESS payment and grants enrollment", async () => {
    const res = await request(app)
      .post("/api/webhooks/doku")
      .set(webhookHeaders)
      .send({
        order: { invoice_number: "JA-ORDER1" },
        transaction: { status: "SUCCESS" },
        channel: { id: "VIRTUAL_ACCOUNT_BCA" },
      });

    expect(res.status).toBe(200);
    expect(res.body.received).toBe(true);
    expect(prisma.order.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: "paid" }) })
    );
    expect(prisma.courseEnrollment.upsert).toHaveBeenCalled();
  });

  it("is idempotent: skips fulfillment when the order is already paid", async () => {
    vi.mocked(prisma.order.findUnique).mockResolvedValue({ ...mockOrder, status: "paid" } as never);

    const res = await request(app)
      .post("/api/webhooks/doku")
      .set(webhookHeaders)
      .send({
        order: { invoice_number: "JA-ORDER1" },
        transaction: { status: "SUCCESS" },
        channel: { id: "VIRTUAL_ACCOUNT_BCA" },
      });

    expect(res.status).toBe(200);
    // No re-processing → no duplicate enrollment/commission/notification.
    expect(prisma.order.update).not.toHaveBeenCalled();
    expect(prisma.courseEnrollment.upsert).not.toHaveBeenCalled();
  });

  // Regression: a SUCCESS webhook for an order the user already cancelled must
  // NOT grant fulfillment (coupon accounting is inconsistent) — it is flagged
  // for manual review via logger.warn and exits gracefully (no retry loop).
  it("does not fulfill a cancelled order and flags it for manual review", async () => {
    const { logger } = await import("../../../src/lib/logger.js");
    const warnSpy = vi.spyOn(logger, "warn");
    vi.mocked(prisma.order.findUnique).mockResolvedValue({ ...mockOrder, status: "cancelled" } as never);

    const res = await request(app)
      .post("/api/webhooks/doku")
      .set(webhookHeaders)
      .send({
        order: { invoice_number: "JA-ORDER1" },
        transaction: { status: "SUCCESS" },
        channel: { id: "VIRTUAL_ACCOUNT_BCA" },
      });

    expect(res.status).toBe(200);
    // No fulfillment side-effects on a cancelled order.
    expect(prisma.order.update).not.toHaveBeenCalled();
    expect(prisma.courseEnrollment.upsert).not.toHaveBeenCalled();
    expect(prisma.coupon.update).not.toHaveBeenCalled();
    // A human is alerted: payment arrived for a cancelled order → manual refund.
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining("cancelled"),
      expect.objectContaining({ orderId: "order-1" }),
    );
  });

  it("grants event registration and increments sold for event items", async () => {
    vi.mocked(prisma.order.findUnique).mockResolvedValue({
      ...mockOrder,
      items: [{ itemType: "event", itemId: "event-1", itemTitle: "Webinar" }],
      user: { name: "T", email: "t@t.com", profile: { phone: "628123" } },
    } as never);

    const res = await request(app)
      .post("/api/webhooks/doku")
      .set(webhookHeaders)
      .send({ order: { invoice_number: "JA-ORDER1" }, transaction: { status: "SUCCESS" } });

    expect(res.status).toBe(200);
    expect(prisma.eventRegistration.upsert).toHaveBeenCalled();
    // Batch8 D2: seat is reserved atomically via updateMany (quota-guarded).
    expect(prisma.event.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ totalSold: { increment: 1 } }) }),
    );
    expect(prisma.refund.create).not.toHaveBeenCalled();
  });

  // Batch8 D2 regression (event overselling): when the event is full at
  // fulfillment, no registration is created — instead a pending Refund is created
  // and the order is flagged for refund.
  it("auto-refunds instead of overselling when the event is full", async () => {
    vi.mocked(prisma.order.findUnique).mockResolvedValue({
      ...mockOrder,
      items: [{ itemType: "event", itemId: "event-1", itemTitle: "Webinar" }],
      user: { name: "T", email: "t@t.com", profile: null },
    } as never);
    // No seats left → atomic reservation matches 0 rows.
    vi.mocked(prisma.event.updateMany).mockResolvedValue({ count: 0 } as never);

    const res = await request(app)
      .post("/api/webhooks/doku")
      .set(webhookHeaders)
      .send({ order: { invoice_number: "JA-ORDER1" }, transaction: { status: "SUCCESS" } });

    expect(res.status).toBe(200);
    expect(prisma.refund.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ reason: "event_full", status: "pending" }) }),
    );
    expect(prisma.eventRegistration.upsert).not.toHaveBeenCalled();
    expect(prisma.order.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: "refund_pending" }) }),
    );
  });

  // BL-58 regression (event seat accounting): when the atomic reservation matches
  // no row the seat was never taken, so the event_full branch must leave totalSold
  // completely untouched. A decrement here would double-release the seat once the
  // auto-refund is approved (routes/orders.ts already releases per deleted
  // registration), silently inflating the event's sellable stock.
  it("does not touch totalSold when the event is full (no leftover increment/decrement)", async () => {
    vi.mocked(prisma.order.findUnique).mockResolvedValue({
      ...mockOrder,
      items: [{ itemType: "event", itemId: "event-1", itemTitle: "Webinar" }],
      user: { name: "T", email: "t@t.com", profile: null },
    } as never);
    vi.mocked(prisma.event.updateMany).mockResolvedValue({ count: 0 } as never);

    const res = await request(app)
      .post("/api/webhooks/doku")
      .set(webhookHeaders)
      .send({ order: { invoice_number: "JA-ORDER1" }, transaction: { status: "SUCCESS" } });

    expect(res.status).toBe(200);
    // Exactly one quota-guarded reservation attempt, and it changed nothing.
    expect(prisma.event.updateMany).toHaveBeenCalledTimes(1);
    for (const call of vi.mocked(prisma.event.updateMany).mock.calls) {
      expect(JSON.stringify(call[0])).not.toContain("decrement");
    }
    expect(prisma.event.update).not.toHaveBeenCalled();
  });

  // ── BL-63: registration confirmation + e-ticket on paid fulfillment ─────────

  it("sends the e-ticket confirmation after a paid event fulfillment (BL-63)", async () => {
    const { sendEventRegistrationConfirmed } = await import(
      "../../../src/services/notification/emailService.js"
    );
    vi.mocked(prisma.order.findUnique).mockResolvedValue({
      ...mockOrder,
      items: [{ itemType: "event", itemId: "event-1", itemTitle: "Webinar" }],
      user: { name: "T", email: "t@t.com", profile: null },
    } as never);
    vi.mocked(prisma.event.findUnique).mockResolvedValue({
      quota: 100,
      title: "Webinar Produktivitas",
      startDate: new Date("2026-09-10T09:00:00+07:00"),
      location: null,
      venue: null,
      type: "online",
    } as never);
    vi.mocked(prisma.eventRegistration.upsert).mockResolvedValue({
      id: "reg-9",
      ticketCode: "TKT-PAID-009",
    } as never);

    const res = await request(app)
      .post("/api/webhooks/doku")
      .set(webhookHeaders)
      .send({ order: { invoice_number: "JA-ORDER1" }, transaction: { status: "SUCCESS" } });

    expect(res.status).toBe(200);
    expect(sendEventRegistrationConfirmed).toHaveBeenCalledWith(
      "t@t.com",
      expect.objectContaining({
        eventTitle: "Webinar Produktivitas",
        ticketCode: "TKT-PAID-009",
        eventType: "online",
        orderId: "order-1",
      }),
    );
  });

  // The buyer of a full event gets a refund notice, NOT a ticket: sending both
  // would hand out a seat that was never reserved.
  it("does NOT send the e-ticket confirmation when the event is full (BL-63)", async () => {
    const { sendEventRegistrationConfirmed, sendEventFullRefund } = await import(
      "../../../src/services/notification/emailService.js"
    );
    vi.mocked(prisma.order.findUnique).mockResolvedValue({
      ...mockOrder,
      items: [{ itemType: "event", itemId: "event-1", itemTitle: "Webinar" }],
      user: { name: "T", email: "t@t.com", profile: null },
    } as never);
    vi.mocked(prisma.event.updateMany).mockResolvedValue({ count: 0 } as never);

    const res = await request(app)
      .post("/api/webhooks/doku")
      .set(webhookHeaders)
      .send({ order: { invoice_number: "JA-ORDER1" }, transaction: { status: "SUCCESS" } });

    expect(res.status).toBe(200);
    expect(sendEventFullRefund).toHaveBeenCalled();
    expect(sendEventRegistrationConfirmed).not.toHaveBeenCalled();
  });

  it("does NOT send an e-ticket for a non-event (course) order (BL-63)", async () => {
    const { sendEventRegistrationConfirmed } = await import(
      "../../../src/services/notification/emailService.js"
    );

    const res = await request(app)
      .post("/api/webhooks/doku")
      .set(webhookHeaders)
      .send({ order: { invoice_number: "JA-ORDER1" }, transaction: { status: "SUCCESS" } });

    expect(res.status).toBe(200);
    expect(sendEventRegistrationConfirmed).not.toHaveBeenCalled();
  });

  it("still fulfills when the e-ticket email throws (BL-63, best-effort)", async () => {
    const { sendEventRegistrationConfirmed } = await import(
      "../../../src/services/notification/emailService.js"
    );
    vi.mocked(prisma.order.findUnique).mockResolvedValue({
      ...mockOrder,
      items: [{ itemType: "event", itemId: "event-1", itemTitle: "Webinar" }],
      user: { name: "T", email: "t@t.com", profile: null },
    } as never);
    vi.mocked(prisma.eventRegistration.upsert).mockResolvedValue({
      id: "reg-10",
      ticketCode: "TKT-PAID-010",
    } as never);
    vi.mocked(sendEventRegistrationConfirmed).mockRejectedValueOnce(new Error("resend down"));

    const res = await request(app)
      .post("/api/webhooks/doku")
      .set(webhookHeaders)
      .send({ order: { invoice_number: "JA-ORDER1" }, transaction: { status: "SUCCESS" } });

    expect(res.status).toBe(200);
    expect(prisma.eventRegistration.upsert).toHaveBeenCalled();
    expect(prisma.order.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: "paid" }) }),
    );
  });

  it("records an affiliate commission when the order has a referral code", async () => {
    vi.mocked(prisma.order.findUnique).mockResolvedValue({
      ...mockOrder,
      referralCode: "REF10",
    } as never);
    vi.mocked(prisma.affiliate.findFirst).mockResolvedValue({
      id: "aff-1",
      code: "REF10",
      status: "active",
      commissionRate: 10,
    } as never);

    const res = await request(app)
      .post("/api/webhooks/doku")
      .set(webhookHeaders)
      .send({ order: { invoice_number: "JA-ORDER1" }, transaction: { status: "SUCCESS" } });

    expect(res.status).toBe(200);
    expect(prisma.affiliateCommission.create).toHaveBeenCalled();
    expect(prisma.affiliate.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ totalConversions: { increment: 1 } }) }),
    );
  });

  // ── Private Class post-purchase onboarding ──────────────────────────────────

  it("sends private-class welcome email + WA for a paid private_class course", async () => {
    const { sendPrivateClassWelcome } = await import("../../../src/services/notification/emailService.js");
    const { notifyPrivateClassWelcome } = await import("../../../src/services/notification/whatsappService.js");
    vi.mocked(prisma.order.findUnique).mockResolvedValue({
      ...mockOrder,
      items: [{ itemType: "course", itemId: "course-pc", itemTitle: "Private Class Digital Marketing" }],
      user: { name: "Test User", email: "test@test.com", profile: { phone: "628123456789" } },
    } as never);
    vi.mocked(prisma.course.findMany).mockResolvedValue([
      {
        title: "Private Class Digital Marketing",
        waGroupLink: "https://chat.whatsapp.com/ABC123",
        onboardingContact: "6281111111111",
        liveSchedule: new Date("2026-08-01T19:00:00+07:00"),
      },
    ] as never);

    const res = await request(app)
      .post("/api/webhooks/doku")
      .set(webhookHeaders)
      .send({ order: { invoice_number: "JA-ORDER1" }, transaction: { status: "SUCCESS" } });

    expect(res.status).toBe(200);
    // Course fields are fetched once, filtered to private_class only (no N+1).
    expect(prisma.course.findMany).toHaveBeenCalledTimes(1);
    expect(prisma.course.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ id: { in: ["course-pc"] }, format: "private_class" }),
      }),
    );
    expect(sendPrivateClassWelcome).toHaveBeenCalledWith(
      "test@test.com",
      expect.objectContaining({
        courseTitle: "Private Class Digital Marketing",
        waGroupLink: "https://chat.whatsapp.com/ABC123",
        onboardingContact: "6281111111111",
        orderId: "order-1",
      }),
    );
    expect(notifyPrivateClassWelcome).toHaveBeenCalledWith(
      "628123456789",
      "Test User",
      "Private Class Digital Marketing",
      "https://chat.whatsapp.com/ABC123",
    );
  });

  it("skips the WA welcome (email only) when the buyer has no phone", async () => {
    const { sendPrivateClassWelcome } = await import("../../../src/services/notification/emailService.js");
    const { notifyPrivateClassWelcome } = await import("../../../src/services/notification/whatsappService.js");
    // Default mockOrder has profile: null.
    vi.mocked(prisma.course.findMany).mockResolvedValue([
      { title: "Kursus Test", waGroupLink: null, onboardingContact: null, liveSchedule: null },
    ] as never);

    const res = await request(app)
      .post("/api/webhooks/doku")
      .set(webhookHeaders)
      .send({ order: { invoice_number: "JA-ORDER1" }, transaction: { status: "SUCCESS" } });

    expect(res.status).toBe(200);
    expect(sendPrivateClassWelcome).toHaveBeenCalled();
    expect(notifyPrivateClassWelcome).not.toHaveBeenCalled();
  });

  it("does NOT send private-class onboarding for a regular course", async () => {
    const { sendPaymentSuccess, sendPrivateClassWelcome } = await import(
      "../../../src/services/notification/emailService.js"
    );
    const { notifyPrivateClassWelcome } = await import("../../../src/services/notification/whatsappService.js");
    // findMany filters on format=private_class → a regular course matches nothing.
    vi.mocked(prisma.course.findMany).mockResolvedValue([] as never);

    const res = await request(app)
      .post("/api/webhooks/doku")
      .set(webhookHeaders)
      .send({ order: { invoice_number: "JA-ORDER1" }, transaction: { status: "SUCCESS" } });

    expect(res.status).toBe(200);
    // Regular behavior unchanged: payment-success sent, onboarding untouched.
    expect(sendPaymentSuccess).toHaveBeenCalled();
    expect(sendPrivateClassWelcome).not.toHaveBeenCalled();
    expect(notifyPrivateClassWelcome).not.toHaveBeenCalled();
  });

  it("still fulfills and returns 200 when private-class email/WA notifications throw", async () => {
    const { sendPrivateClassWelcome } = await import("../../../src/services/notification/emailService.js");
    const { notifyPrivateClassWelcome } = await import("../../../src/services/notification/whatsappService.js");
    vi.mocked(prisma.order.findUnique).mockResolvedValue({
      ...mockOrder,
      user: { name: "Test User", email: "test@test.com", profile: { phone: "628123456789" } },
    } as never);
    vi.mocked(prisma.course.findMany).mockResolvedValue([
      { title: "Kursus Test", waGroupLink: null, onboardingContact: null, liveSchedule: null },
    ] as never);
    vi.mocked(sendPrivateClassWelcome).mockRejectedValueOnce(new Error("resend down"));
    vi.mocked(notifyPrivateClassWelcome).mockRejectedValueOnce(new Error("fonnte down"));

    const res = await request(app)
      .post("/api/webhooks/doku")
      .set(webhookHeaders)
      .send({ order: { invoice_number: "JA-ORDER1" }, transaction: { status: "SUCCESS" } });

    // Notification failures are best-effort: webhook still 200 (no DOKU retry
    // loop) and fulfillment side-effects are intact.
    expect(res.status).toBe(200);
    expect(res.body.received).toBe(true);
    expect(prisma.order.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: "paid" }) }),
    );
    expect(prisma.courseEnrollment.upsert).toHaveBeenCalled();
    expect(sendPrivateClassWelcome).toHaveBeenCalled();
    expect(notifyPrivateClassWelcome).toHaveBeenCalled();
  });

  it("handles FAILED payment", async () => {
    const res = await request(app)
      .post("/api/webhooks/doku")
      .set(webhookHeaders)
      .send({
        order: { invoice_number: "JA-ORDER1" },
        transaction: { status: "FAILED" },
      });

    expect(res.status).toBe(200);
    expect(res.body.received).toBe(true);
    expect(prisma.order.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: "failed" }) })
    );
    expect(prisma.courseEnrollment.upsert).not.toHaveBeenCalled();
  });

  it("handles EXPIRED payment", async () => {
    const res = await request(app)
      .post("/api/webhooks/doku")
      .set(webhookHeaders)
      .send({
        order: { invoice_number: "JA-ORDER1" },
        transaction: { status: "EXPIRED" },
      });

    expect(res.status).toBe(200);
    expect(prisma.order.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: "expired" }) })
    );
  });

  it("returns 401 when signature is invalid", async () => {
    const { verifyDokuWebhook } = await import("../../../src/services/payment/dokuService.js");
    vi.mocked(verifyDokuWebhook).mockReturnValueOnce(false);

    const res = await request(app)
      .post("/api/webhooks/doku")
      .set(webhookHeaders)
      .send({
        order: { invoice_number: "JA-FAKE" },
        transaction: { status: "SUCCESS" },
      });

    expect(res.status).toBe(401);
    expect(prisma.order.update).not.toHaveBeenCalled();
  });

  it("gracefully handles unknown invoice number", async () => {
    vi.mocked(prisma.paymentTransaction.findFirst).mockResolvedValue(null);
    vi.mocked(prisma.order.findUnique).mockResolvedValue(null);

    const res = await request(app)
      .post("/api/webhooks/doku")
      .set(webhookHeaders)
      .send({
        order: { invoice_number: "JA-UNKNOWN" },
        transaction: { status: "SUCCESS" },
      });

    expect(res.status).toBe(200);
    expect(res.body.received).toBe(true);
    expect(prisma.order.update).not.toHaveBeenCalled();
  });
});
