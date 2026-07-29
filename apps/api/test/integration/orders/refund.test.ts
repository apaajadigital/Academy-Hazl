import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import { app } from "../../../src/app.js";

vi.mock("../../../src/db/prisma.js", () => ({
  prisma: {
    order: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    refund: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      count: vi.fn(),
    },
    courseEnrollment: { deleteMany: vi.fn() },
    eventRegistration: { deleteMany: vi.fn() },
    event: { updateMany: vi.fn(), findUnique: vi.fn() },
    affiliateCommission: { update: vi.fn() },
    affiliate: { findUnique: vi.fn(), update: vi.fn() },
    coupon: { findUnique: vi.fn(), update: vi.fn() },
    $transaction: vi.fn(),
  },
}));

vi.mock("../../../src/middleware/authenticate.js", () => ({
  authenticate: vi.fn((req, _res, next) => {
    req.user = { id: "user-1", email: "user@test.com", name: "Test", roles: ["student"] };
    next();
  }),
}));

vi.mock("../../../src/services/invoice/invoiceService.js", () => ({
  generateInvoicePDF: vi.fn().mockResolvedValue(Buffer.from("fake pdf")),
}));

const { prisma } = await import("../../../src/db/prisma.js");
const { authenticate } = await import("../../../src/middleware/authenticate.js");

const mockPaidOrder = {
  id: "order-1",
  userId: "user-1",
  status: "paid",
  finalAmount: "299000",
  createdAt: new Date(),
  items: [],
  commissions: [],
  couponId: null,
  coupon: null,
};

const mockRefund = {
  id: "refund-1",
  orderId: "order-1",
  userId: "user-1",
  reason: "Tidak bisa hadir karena sakit mendadak",
  status: "pending",
  amount: "299000",
  adminNote: null,
  requestedAt: new Date(),
  processedAt: null,
  processedBy: null,
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(prisma.order.findUnique).mockResolvedValue(mockPaidOrder as never);
  vi.mocked(prisma.refund.findUnique).mockResolvedValue(null);
  vi.mocked(prisma.refund.create).mockResolvedValue(mockRefund as never);
  // Run the revocation transaction callback against the mocked prisma.
  vi.mocked(prisma.$transaction).mockImplementation((cb: unknown) =>
    (cb as (tx: typeof prisma) => Promise<unknown>)(prisma),
  );
  vi.mocked(prisma.courseEnrollment.deleteMany).mockResolvedValue({ count: 1 } as never);
  vi.mocked(prisma.eventRegistration.deleteMany).mockResolvedValue({ count: 1 } as never);
  // BL-58: seat release succeeds by default (event row matches the `gte` guard).
  vi.mocked(prisma.event.updateMany).mockResolvedValue({ count: 1 } as never);
  vi.mocked(prisma.affiliateCommission.update).mockResolvedValue({} as never);
  vi.mocked(prisma.affiliate.findUnique).mockResolvedValue({ id: "aff-1", balance: "29900", totalEarnings: "29900" } as never);
  vi.mocked(prisma.affiliate.update).mockResolvedValue({} as never);
  vi.mocked(prisma.coupon.findUnique).mockResolvedValue({ id: "coupon-1", usageCount: 3 } as never);
  vi.mocked(prisma.coupon.update).mockResolvedValue({} as never);
});

describe("POST /api/orders/:orderId/refund", () => {
  it("creates refund request for paid order", async () => {
    const res = await request(app)
      .post("/api/orders/order-1/refund")
      .send({ reason: "Tidak bisa hadir karena sakit mendadak" });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe("pending");
  });

  it("returns 404 when order not found", async () => {
    vi.mocked(prisma.order.findUnique).mockResolvedValue(null);

    const res = await request(app)
      .post("/api/orders/nonexistent/refund")
      .send({ reason: "Tidak bisa hadir karena sakit mendadak" });

    expect(res.status).toBe(404);
  });

  it("returns 400 when order is not paid", async () => {
    vi.mocked(prisma.order.findUnique).mockResolvedValue({ ...mockPaidOrder, status: "pending" } as never);

    const res = await request(app)
      .post("/api/orders/order-1/refund")
      .send({ reason: "Tidak bisa hadir karena sakit mendadak" });

    expect(res.status).toBe(400);
    expect(res.body.error.message).toContain("paid");
  });

  it("returns 400 when refund already exists", async () => {
    vi.mocked(prisma.refund.findUnique).mockResolvedValue(mockRefund as never);

    const res = await request(app)
      .post("/api/orders/order-1/refund")
      .send({ reason: "Tidak bisa hadir karena sakit mendadak" });

    expect(res.status).toBe(400);
    expect(res.body.error.message).toContain("sudah ada");
  });

  it("returns 400 when reason is too short", async () => {
    const res = await request(app)
      .post("/api/orders/order-1/refund")
      .send({ reason: "singkat" });

    expect(res.status).toBe(400);
    expect(res.body.error.message).toContain("10 karakter");
  });

  it("returns 403 when order belongs to another user", async () => {
    vi.mocked(prisma.order.findUnique).mockResolvedValue({ ...mockPaidOrder, userId: "other-user" } as never);

    const res = await request(app)
      .post("/api/orders/order-1/refund")
      .send({ reason: "Tidak bisa hadir karena sakit mendadak" });

    expect(res.status).toBe(403);
  });
});

describe("PATCH /api/orders/admin/refunds/:refundId", () => {
  beforeEach(() => {
    vi.mocked(authenticate).mockImplementation(async (req, _res, next) => {
      (req as never as { user: unknown }).user = { id: "admin-1", email: "admin@test.com", name: "Admin", roles: ["super_admin"] };
      next();
    });
    vi.mocked(prisma.refund.findUnique).mockResolvedValue(mockRefund as never);
    vi.mocked(prisma.refund.update).mockResolvedValue({ ...mockRefund, status: "approved", processedAt: new Date() } as never);
    vi.mocked(prisma.order.update).mockResolvedValue({ ...mockPaidOrder, status: "refunded" } as never);
  });

  it("approves refund and updates order status", async () => {
    const res = await request(app)
      .patch("/api/orders/admin/refunds/refund-1")
      .send({ status: "approved", adminNote: "Disetujui" });

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe("approved");
  });

  it("rejects refund with note", async () => {
    vi.mocked(prisma.refund.update).mockResolvedValue({ ...mockRefund, status: "rejected" } as never);

    const res = await request(app)
      .patch("/api/orders/admin/refunds/refund-1")
      .send({ status: "rejected", adminNote: "Tidak memenuhi syarat" });

    expect(res.status).toBe(200);
  });

  it("returns 400 for invalid status", async () => {
    const res = await request(app)
      .patch("/api/orders/admin/refunds/refund-1")
      .send({ status: "invalid" });

    expect(res.status).toBe(400);
  });

  it("returns 404 when refund not found", async () => {
    vi.mocked(prisma.refund.findUnique).mockResolvedValue(null);

    const res = await request(app)
      .patch("/api/orders/admin/refunds/nonexistent")
      .send({ status: "approved" });

    expect(res.status).toBe(404);
  });

  it("returns 400 when refund already processed", async () => {
    vi.mocked(prisma.refund.findUnique).mockResolvedValue({ ...mockRefund, status: "approved" } as never);

    const res = await request(app)
      .patch("/api/orders/admin/refunds/refund-1")
      .send({ status: "rejected" });

    expect(res.status).toBe(400);
  });

  // Batch8 D1 regression (refund revokes access + reverses commission/coupon).
  it("revokes access, reverses commission, and restores coupon on approval", async () => {
    vi.mocked(prisma.order.findUnique).mockResolvedValue({
      ...mockPaidOrder,
      status: "paid",
      couponId: "coupon-1",
      items: [
        { itemType: "course", itemId: "course-1" },
        { itemType: "event", itemId: "event-1" },
      ],
      commissions: [
        { id: "comm-1", affiliateId: "aff-1", commissionAmt: "29900", status: "pending" },
      ],
    } as never);

    const res = await request(app)
      .patch("/api/orders/admin/refunds/refund-1")
      .send({ status: "approved" });

    expect(res.status).toBe(200);
    // Access revoked.
    expect(prisma.courseEnrollment.deleteMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { courseId: "course-1", userId: "user-1" } }),
    );
    expect(prisma.eventRegistration.deleteMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { eventId: "event-1", userId: "user-1" } }),
    );
    // Commission reversed + affiliate balance decremented (not yet paid out).
    expect(prisma.affiliateCommission.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "comm-1" }, data: { status: "reversed" } }),
    );
    expect(prisma.affiliate.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ balance: 0, totalEarnings: 0 }) }),
    );
    // Coupon usage restored.
    expect(prisma.coupon.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { usageCount: { decrement: 1 } } }),
    );
    // Order finalized as refunded.
    expect(prisma.order.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { status: "refunded" } }),
    );
  });

  it("is idempotent: skips revocation when the order is already refunded", async () => {
    vi.mocked(prisma.order.findUnique).mockResolvedValue({
      ...mockPaidOrder,
      status: "refunded",
      items: [{ itemType: "course", itemId: "course-1" }],
      commissions: [],
    } as never);

    const res = await request(app)
      .patch("/api/orders/admin/refunds/refund-1")
      .send({ status: "approved" });

    expect(res.status).toBe(200);
    expect(prisma.courseEnrollment.deleteMany).not.toHaveBeenCalled();
    expect(prisma.order.update).not.toHaveBeenCalled();
  });
});

// ─── BL-58 regression: Event.totalSold must be released on refund ──────────────
// Before the fix totalSold was increment-only, so every refunded seat was leaked
// permanently and the quota guard (totalSold < quota) eventually locked the event.
describe("BL-58 — approved refund releases event seats", () => {
  const eventOrder = {
    ...mockPaidOrder,
    status: "paid",
    couponId: null,
    items: [{ itemType: "event", itemId: "event-1" }],
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
    vi.mocked(prisma.order.update).mockResolvedValue({ ...eventOrder, status: "refunded" } as never);
    vi.mocked(prisma.order.findUnique).mockResolvedValue(eventOrder as never);
  });

  const approve = () =>
    request(app).patch("/api/orders/admin/refunds/refund-1").send({ status: "approved" });

  it("decrements totalSold by the number of registrations actually deleted", async () => {
    // Two seats were held under this order/event (e.g. a re-registration row).
    vi.mocked(prisma.eventRegistration.deleteMany).mockResolvedValue({ count: 2 } as never);

    const res = await approve();

    expect(res.status).toBe(200);
    expect(prisma.event.updateMany).toHaveBeenCalledWith({
      // The `gte` predicate is the underflow floor — asserted explicitly because
      // dropping it is exactly how totalSold would be able to go negative.
      where: { id: "event-1", totalSold: { gte: 2 } },
      data: { totalSold: { decrement: 2 } },
    });
  });

  it("releases nothing when no registration was deleted (event_full auto-refund)", async () => {
    // webhook.ts "event_full" never reserved a seat and never wrote a registration,
    // so approving that auto-refund must not decrement a seat it never took.
    vi.mocked(prisma.eventRegistration.deleteMany).mockResolvedValue({ count: 0 } as never);

    const res = await approve();

    expect(res.status).toBe(200);
    expect(prisma.event.updateMany).not.toHaveBeenCalled();
  });

  it("never drives totalSold negative when the counter is already too low", async () => {
    const { logger } = await import("../../../src/lib/logger.js");
    const warnSpy = vi.spyOn(logger, "warn");
    vi.mocked(prisma.eventRegistration.deleteMany).mockResolvedValue({ count: 3 } as never);
    // Inconsistent data: totalSold < 3 → the guarded updateMany matches no row.
    vi.mocked(prisma.event.updateMany).mockResolvedValue({ count: 0 } as never);

    const res = await approve();

    // Refund still succeeds (access already revoked); the skip is logged for a human.
    expect(res.status).toBe(200);
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining("BL-58"),
      expect.objectContaining({ eventId: "event-1", deletedRegistrations: 3 }),
    );
    expect(prisma.order.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { status: "refunded" } }),
    );
  });

  it("does not release a second time when the refund is re-approved (already refunded)", async () => {
    vi.mocked(prisma.order.findUnique).mockResolvedValue({ ...eventOrder, status: "refunded" } as never);

    const res = await approve();

    expect(res.status).toBe(200);
    expect(prisma.eventRegistration.deleteMany).not.toHaveBeenCalled();
    expect(prisma.event.updateMany).not.toHaveBeenCalled();
  });

  it("frees the seat for reuse: a sold-out event becomes bookable again", async () => {
    // Model the real counter so we assert the OUTCOME (quota opens up), not just
    // that a query was issued. Event is sold out: quota 10, totalSold 10.
    const event = { id: "event-1", quota: 10, totalSold: 10 };
    vi.mocked(prisma.eventRegistration.deleteMany).mockResolvedValue({ count: 1 } as never);
    vi.mocked(prisma.event.updateMany).mockImplementation((async (args: {
      where: { id: string; totalSold?: { gte: number } };
      data: { totalSold: { decrement: number } };
    }) => {
      const floor = args.where.totalSold?.gte ?? 0;
      if (args.where.id !== event.id || event.totalSold < floor) return { count: 0 };
      event.totalSold -= args.data.totalSold.decrement;
      return { count: 1 };
    }) as never);

    // Sold out before the refund.
    expect(event.totalSold < event.quota).toBe(false);

    const res = await approve();

    expect(res.status).toBe(200);
    expect(event.totalSold).toBe(9);
    // checkout.ts / webhook.ts quota guard now admits a new buyer again.
    expect(event.totalSold < event.quota).toBe(true);
  });
});
