import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import { app } from "../../../src/app.js";

vi.mock("../../../src/db/prisma.js", () => ({
  prisma: {
    order: { findUnique: vi.fn(), updateMany: vi.fn() },
    coupon: { findUnique: vi.fn(), update: vi.fn(), updateMany: vi.fn() },
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

const pendingOrder = {
  id: "order-1",
  userId: "user-1",
  status: "pending",
  finalAmount: "299000",
  couponId: null as string | null,
  createdAt: new Date(),
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(prisma.order.findUnique).mockResolvedValue(pendingOrder as never);
  vi.mocked(prisma.order.updateMany).mockResolvedValue({ count: 1 } as never);
  vi.mocked(prisma.coupon.findUnique).mockResolvedValue({ id: "coupon-1", usageCount: 3 } as never);
  vi.mocked(prisma.coupon.update).mockResolvedValue({} as never);
  // Run the transaction callback against the mocked prisma client.
  vi.mocked(prisma.$transaction).mockImplementation((cb: unknown) =>
    (cb as (tx: typeof prisma) => Promise<unknown>)(prisma),
  );
});

describe("POST /api/orders/:orderId/cancel", () => {
  it("cancels a pending order via an atomic status-guarded update", async () => {
    const res = await request(app).post("/api/orders/order-1/cancel");

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe("cancelled");
    // H5: the update must carry the status predicate so a concurrent paid
    // webhook can never be overwritten to cancelled.
    expect(prisma.order.updateMany).toHaveBeenCalledWith({
      where: { id: "order-1", userId: "user-1", status: "pending" },
      data: { status: "cancelled" },
    });
  });

  // BL-143(a): this test used to assert the OPPOSITE — that cancelling a pending
  // order decrements usageCount. That assertion locked in the bug. A pending
  // order never consumed a slot (the increment moved to payment success with the
  // M-coupon change), so the decrement handed out a free credit every time, and
  // a create-then-cancel loop drove the counter to 0 and pinned it there —
  // after which validateCoupon's limit check could never fire again.
  it("does NOT touch the coupon when a pending order is cancelled", async () => {
    vi.mocked(prisma.order.findUnique).mockResolvedValue({ ...pendingOrder, couponId: "coupon-1" } as never);

    const res = await request(app).post("/api/orders/order-1/cancel");

    expect(res.status).toBe(200);
    expect(prisma.coupon.update).not.toHaveBeenCalled();
    expect(prisma.coupon.updateMany).not.toHaveBeenCalled();
    // Not even a read: there is nothing to decide about a slot never taken.
    expect(prisma.coupon.findUnique).not.toHaveBeenCalled();
  });

  it("cancelling repeatedly can never walk usageCount down", async () => {
    vi.mocked(prisma.order.findUnique).mockResolvedValue({ ...pendingOrder, couponId: "coupon-1" } as never);

    for (let i = 0; i < 5; i++) {
      const res = await request(app).post("/api/orders/order-1/cancel");
      expect(res.status).toBe(200);
    }

    // The create-then-cancel loop that made a limited coupon unlimited.
    expect(prisma.coupon.update).not.toHaveBeenCalled();
    expect(prisma.coupon.updateMany).not.toHaveBeenCalled();
  });

  it("returns 400 when the order is not pending", async () => {
    vi.mocked(prisma.order.findUnique).mockResolvedValue({ ...pendingOrder, status: "paid" } as never);

    const res = await request(app).post("/api/orders/order-1/cancel");

    expect(res.status).toBe(400);
    expect(prisma.order.updateMany).not.toHaveBeenCalled();
  });

  // H5 regression (cancel/webhook race): order was read as pending, but a DOKU
  // webhook marked it paid before the transaction ran → the guarded updateMany
  // matches 0 rows and the cancel must abort without touching the coupon.
  it("returns 409 and leaves the coupon intact when the order was paid concurrently", async () => {
    vi.mocked(prisma.order.findUnique).mockResolvedValue({ ...pendingOrder, couponId: "coupon-1" } as never);
    vi.mocked(prisma.order.updateMany).mockResolvedValue({ count: 0 } as never);

    const res = await request(app).post("/api/orders/order-1/cancel");

    expect(res.status).toBe(409);
    expect(res.body.success).toBe(false);
    expect(prisma.coupon.update).not.toHaveBeenCalled();
  });

  it("returns 403 for another user's order", async () => {
    vi.mocked(prisma.order.findUnique).mockResolvedValue({ ...pendingOrder, userId: "other" } as never);

    const res = await request(app).post("/api/orders/order-1/cancel");

    expect(res.status).toBe(403);
  });

  it("returns 404 when the order does not exist", async () => {
    vi.mocked(prisma.order.findUnique).mockResolvedValue(null);

    const res = await request(app).post("/api/orders/nonexistent/cancel");

    expect(res.status).toBe(404);
  });
});
