import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * BL-144 regression suite (Wave 1.5) — the sweeper that makes every failure mode
 * in Wave 1.1–1.4 recoverable instead of terminal.
 *
 * Before this, `expiredAt` was written at checkout and read by nothing: a
 * `grep expiredAt apps/api/src` returned exactly one line. An order whose DOKU
 * notification never arrived sat "pending" forever. That is not hypothetical —
 * invoice JA-FEF61033 was paid in the DOKU simulator on 26 Aug 2026 and DOKU's
 * own status endpoint still reports SUCCESS while our order stayed pending.
 *
 * Note what is NOT mocked here: `processWebhookPayment`. Fulfillment must run
 * through the same processor, and therefore the same atomic claim, as a webhook
 * delivery — a reconciler with its own copy of the fulfillment logic would drift
 * from the webhook path exactly where it matters most. The order store below
 * evaluates the status predicate for real, so a reconciler that wrote statuses
 * directly instead of going through the claim would be caught here.
 */

vi.mock("../../../src/db/prisma.js", () => ({
  prisma: {
    order: { findMany: vi.fn(), findUnique: vi.fn(), update: vi.fn(), updateMany: vi.fn() },
    paymentTransaction: { findUnique: vi.fn(), update: vi.fn() },
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
  getDokuOrderStatus: vi.fn(),
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
const { getDokuOrderStatus } = await import("../../../src/services/payment/dokuService.js");
const { reconcilePendingOrders } = await import(
  "../../../src/services/payment/reconciliation.js"
);

const ORDER_AMOUNT = 299000;

/** Live status of the single order under test; the predicate is evaluated against it. */
const store = { status: "pending" };

const sweepCandidate = {
  id: "order-1",
  userId: "user-1",
  finalAmount: ORDER_AMOUNT,
  expiredAt: new Date("2026-08-26T09:00:00Z"),
  transactions: [{ id: "tx-1", gatewayTxId: "JA-ORDER1" }],
};

beforeEach(() => {
  vi.clearAllMocks();
  store.status = "pending";

  vi.mocked(prisma.order.findMany).mockResolvedValue([sweepCandidate] as never);

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

  vi.mocked(prisma.order.update).mockImplementation((async (args: {
    data: { status?: string };
  }) => {
    if (args.data.status) store.status = args.data.status;
    return {};
  }) as never);

  vi.mocked(prisma.course.findMany).mockResolvedValue([] as never);
  vi.mocked(prisma.courseEnrollment.upsert).mockResolvedValue({} as never);
  vi.mocked(prisma.eBook.updateMany).mockResolvedValue({ count: 1 } as never);
  vi.mocked(prisma.event.findUnique).mockResolvedValue({ quota: 100, title: "W" } as never);
  vi.mocked(prisma.event.updateMany).mockResolvedValue({ count: 1 } as never);
  vi.mocked(prisma.refund.upsert).mockResolvedValue({} as never);
  vi.mocked(prisma.affiliate.findFirst).mockResolvedValue(null as never);
  vi.mocked(prisma.coupon.update).mockResolvedValue({} as never);
  vi.mocked(prisma.$transaction).mockImplementation((cb: unknown) =>
    (cb as (tx: typeof prisma) => Promise<unknown>)(prisma),
  );
});

/** Shape of a real DOKU `GET /orders/v1/status/{invoice}` reply, trimmed. */
function dokuSays(status: string, amount = ORDER_AMOUNT) {
  return {
    invoiceNumber: "JA-ORDER1",
    transactionStatus: status,
    amount,
    channelId: "VIRTUAL_ACCOUNT_BCA",
    transactionDate: "2026-08-26T09:34:54Z",
  };
}

describe("BL-144 — reconciliation sweep", () => {
  it("fulfills a pending order that DOKU reports as already paid", async () => {
    vi.mocked(getDokuOrderStatus).mockResolvedValue(dokuSays("SUCCESS") as never);

    const summary = await reconcilePendingOrders();

    expect(store.status).toBe("paid");
    expect(prisma.courseEnrollment.upsert).toHaveBeenCalled();
    expect(summary.fulfilled).toBe(1);
  });

  it("fulfills through the atomic claim, not a direct status write", async () => {
    // The claim predicate is what protects a concurrent webhook delivery from
    // being double-fulfilled by the sweeper. Asserting it here keeps the two
    // paths from drifting apart.
    vi.mocked(getDokuOrderStatus).mockResolvedValue(dokuSays("SUCCESS") as never);

    await reconcilePendingOrders();

    expect(prisma.order.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          status: { notIn: ["paid", "refund_pending", "refunded", "cancelled"] },
        }),
        data: expect.objectContaining({ status: "paid" }),
      }),
    );
  });

  it("refuses to fulfill when DOKU reports a different amount", async () => {
    // BL-139 must hold on this path too: the reconciler is another way into
    // fulfillment, so it cannot be a way around the amount check.
    vi.mocked(getDokuOrderStatus).mockResolvedValue(dokuSays("SUCCESS", 1000) as never);

    const summary = await reconcilePendingOrders();

    expect(store.status).toBe("pending");
    expect(prisma.courseEnrollment.upsert).not.toHaveBeenCalled();
    expect(summary.failed).toBe(1);
  });

  it("expires an order DOKU reports as expired", async () => {
    vi.mocked(getDokuOrderStatus).mockResolvedValue(dokuSays("EXPIRED") as never);

    const summary = await reconcilePendingOrders();

    expect(store.status).toBe("expired");
    expect(summary.expired).toBe(1);
  });

  it("marks a DOKU FAILED order failed", async () => {
    vi.mocked(getDokuOrderStatus).mockResolvedValue(dokuSays("FAILED") as never);

    await reconcilePendingOrders();

    expect(store.status).toBe("failed");
  });

  it("leaves an order DOKU still considers payable alone", async () => {
    // Past OUR expiredAt but DOKU says PENDING: the gateway is the authority on
    // whether the VA can still be paid. Expiring it here would contradict the
    // gateway and strand a buyer who is mid-transfer.
    vi.mocked(getDokuOrderStatus).mockResolvedValue(dokuSays("PENDING") as never);

    const summary = await reconcilePendingOrders();

    expect(store.status).toBe("pending");
    expect(summary.stillPending).toBe(1);
  });

  it("never touches an order that is already paid", async () => {
    store.status = "paid";
    vi.mocked(getDokuOrderStatus).mockResolvedValue(dokuSays("EXPIRED") as never);

    await reconcilePendingOrders();

    // The claim predicate refuses it — same guarantee as a late EXPIRED webhook.
    expect(store.status).toBe("paid");
  });

  it("only sweeps pending orders whose expiry has actually passed", async () => {
    await reconcilePendingOrders({ now: new Date("2026-08-27T00:00:00Z") });

    expect(prisma.order.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          status: "pending",
          expiredAt: { lt: new Date("2026-08-27T00:00:00Z") },
        }),
      }),
    );
  });

  it("keeps sweeping after one order throws", async () => {
    vi.mocked(prisma.order.findMany).mockResolvedValue([
      { ...sweepCandidate, id: "order-broken", transactions: [{ id: "tx-x", gatewayTxId: "JA-X" }] },
      sweepCandidate,
    ] as never);
    vi.mocked(getDokuOrderStatus)
      .mockRejectedValueOnce(new Error("doku timeout"))
      .mockResolvedValue(dokuSays("SUCCESS") as never);

    const summary = await reconcilePendingOrders();

    expect(summary.failed).toBe(1);
    expect(summary.fulfilled).toBe(1);
    expect(store.status).toBe("paid");
  });

  it("skips an order that has no payment transaction to ask DOKU about", async () => {
    vi.mocked(prisma.order.findMany).mockResolvedValue([
      { ...sweepCandidate, transactions: [] },
    ] as never);

    const summary = await reconcilePendingOrders();

    expect(getDokuOrderStatus).not.toHaveBeenCalled();
    expect(summary.skipped).toBe(1);
    expect(store.status).toBe("pending");
  });

  it("counts an order DOKU has never heard of without changing it", async () => {
    vi.mocked(getDokuOrderStatus).mockResolvedValue(null as never);

    const summary = await reconcilePendingOrders();

    expect(store.status).toBe("pending");
    expect(summary.unknown).toBe(1);
  });
});
