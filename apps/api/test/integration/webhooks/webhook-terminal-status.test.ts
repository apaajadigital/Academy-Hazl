import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import { app } from "../../../src/app.js";

/**
 * BL-138 regression suite (Wave 1.2) — a late or replayed FAILED/EXPIRED must
 * never revoke a purchase that has already been paid for.
 *
 * The point of this file is the ORDER STORE below. A mock that simply records
 * the arguments passed to `order.update`/`order.updateMany` would pass whether
 * or not the status predicate is present, which is exactly the class of
 * self-consistent test §0.2 of the master plan warns about. So the store here
 * actually evaluates `where.status.notIn` against the row's current value, and
 * `findUnique` deliberately serves a STALE snapshot — that is the real race:
 * `processWebhookPayment` reads the status outside any transaction, so the read
 * can be obsolete by the time the write lands. Only an atomic claim survives it.
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

/**
 * The one row every case in this file operates on. `status` is the live value;
 * `snapshotStatus` is what `findUnique` hands the processor, so a test can model
 * "the read happened before a concurrent delivery moved the row".
 */
const store = {
  status: "pending",
  snapshotStatus: null as string | null,
};

/** Statuses fulfillment must never be able to overwrite. */
function currentStatus(): string {
  return store.status;
}

const headers = {
  "client-id": "CLIENT-123",
  "request-id": "req-123",
  "request-timestamp": new Date().toISOString(),
  signature: "mock-signature",
};

function notification(status: string) {
  return {
    order: { invoice_number: "JA-ORDER1" },
    transaction: { status, amount: ORDER_AMOUNT },
    channel: { id: "VIRTUAL_ACCOUNT_BCA" },
  };
}

const deliver = (status: string) =>
  request(app).post("/api/webhooks/doku").set(headers).send(notification(status));

beforeEach(() => {
  vi.clearAllMocks();
  store.status = "pending";
  store.snapshotStatus = null;

  vi.mocked(prisma.paymentTransaction.findFirst).mockResolvedValue({
    id: "tx-1",
    orderId: "order-1",
    gatewayTxId: "JA-ORDER1",
  } as never);
  vi.mocked(prisma.paymentTransaction.update).mockResolvedValue({} as never);

  vi.mocked(prisma.order.findUnique).mockImplementation((async () => ({
    id: "order-1",
    userId: "user-1",
    // A stale read when the test asks for one — this is the whole race.
    status: store.snapshotStatus ?? store.status,
    finalAmount: ORDER_AMOUNT,
    items: [{ itemType: "course", itemId: "course-1", itemTitle: "Kursus Test", quantity: 1 }],
    user: { name: "Test User", email: "test@test.com", profile: null },
  })) as never);

  // A real conditional write: the predicate decides, not the caller.
  vi.mocked(prisma.order.updateMany).mockImplementation((async (args: {
    where: { status?: { notIn?: string[] } };
    data: { status?: string };
  }) => {
    const blocked = args.where.status?.notIn ?? [];
    if (blocked.includes(currentStatus())) return { count: 0 };
    if (args.data.status) store.status = args.data.status;
    return { count: 1 };
  }) as never);

  // An UNCONDITIONAL write, exactly like the real one. Any code path that still
  // reaches for `update` to set a terminal status will clobber the row and the
  // assertions below will catch it.
  vi.mocked(prisma.order.update).mockImplementation((async (args: {
    data: { status?: string };
  }) => {
    if (args.data.status) store.status = args.data.status;
    return {};
  }) as never);

  vi.mocked(prisma.course.findMany).mockResolvedValue([] as never);
  vi.mocked(prisma.courseEnrollment.upsert).mockResolvedValue({} as never);
  vi.mocked(prisma.eBook.updateMany).mockResolvedValue({ count: 1 } as never);
  vi.mocked(prisma.event.findUnique).mockResolvedValue({ quota: 100, title: "Webinar" } as never);
  vi.mocked(prisma.event.updateMany).mockResolvedValue({ count: 1 } as never);
  vi.mocked(prisma.eventRegistration.upsert).mockResolvedValue({ ticketCode: "TKT-1" } as never);
  vi.mocked(prisma.refund.create).mockResolvedValue({} as never);
  vi.mocked(prisma.refund.upsert).mockResolvedValue({} as never);
  vi.mocked(prisma.affiliate.findFirst).mockResolvedValue(null as never);
  vi.mocked(prisma.coupon.update).mockResolvedValue({} as never);
  vi.mocked(prisma.$transaction).mockImplementation((cb: unknown) =>
    (cb as (tx: typeof prisma) => Promise<unknown>)(prisma),
  );
});

describe("BL-138 — a terminal status must not overwrite a paid order", () => {
  // Direction 1: the payment lands first, the expiry notification trails it.
  it("SUCCESS then EXPIRED leaves the order paid", async () => {
    await deliver("SUCCESS");
    expect(currentStatus()).toBe("paid");

    // The EXPIRED delivery read the order BEFORE the payment landed — the exact
    // interleaving jobs/queues.ts allows, since txStatus is part of the jobId so
    // SUCCESS and EXPIRED are two different jobs running concurrently.
    store.snapshotStatus = "pending";
    await deliver("EXPIRED");

    expect(currentStatus()).toBe("paid");
  });

  // Direction 2: the expiry lands first and a late payment still has to be
  // honoured — refusing it would take the buyer's money without granting access.
  it("EXPIRED then SUCCESS leaves the order paid", async () => {
    await deliver("EXPIRED");
    expect(currentStatus()).toBe("expired");

    await deliver("SUCCESS");

    expect(currentStatus()).toBe("paid");
    expect(prisma.courseEnrollment.upsert).toHaveBeenCalled();
  });

  it("FAILED cannot revoke a paid order either", async () => {
    await deliver("SUCCESS");
    store.snapshotStatus = "pending";

    await deliver("FAILED");

    expect(currentStatus()).toBe("paid");
  });

  // The auto-refund path (event full) parks the order in refund_pending and
  // leaves a Refund row that drives admin approval. A late EXPIRED used to
  // rewrite that status, orphaning the Refund row.
  it("EXPIRED cannot rewrite refund_pending and orphan the Refund row", async () => {
    store.status = "refund_pending";
    store.snapshotStatus = "pending";

    await deliver("EXPIRED");

    expect(currentStatus()).toBe("refund_pending");
  });

  it("EXPIRED cannot rewrite a refunded order", async () => {
    store.status = "refunded";
    store.snapshotStatus = "pending";

    await deliver("EXPIRED");

    expect(currentStatus()).toBe("refunded");
  });

  it("EXPIRED cannot resurrect a cancelled order into expired", async () => {
    store.status = "cancelled";
    store.snapshotStatus = "pending";

    await deliver("EXPIRED");

    expect(currentStatus()).toBe("cancelled");
  });

  // The transaction row must follow the same verdict as the order. Marking the
  // payment "failed" while the order is paid would poison reconciliation
  // (Wave 1.5) with a contradiction that looks like a real anomaly.
  it("does not mark the payment failed when the claim was refused", async () => {
    await deliver("SUCCESS");
    vi.mocked(prisma.paymentTransaction.update).mockClear();
    store.snapshotStatus = "pending";

    await deliver("EXPIRED");

    expect(prisma.paymentTransaction.update).not.toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: "failed" }) }),
    );
  });

  // A plain expiry on an untouched order still has to work.
  it("still expires an order nobody paid for", async () => {
    await deliver("EXPIRED");

    expect(currentStatus()).toBe("expired");
    expect(prisma.paymentTransaction.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: "failed" }) }),
    );
  });
});
