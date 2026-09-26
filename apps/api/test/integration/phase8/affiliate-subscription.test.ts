import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import { app } from "../../../src/app.js";

vi.mock("../../../src/db/prisma.js", () => ({
  prisma: {
    affiliate: { findUnique: vi.fn(), create: vi.fn(), update: vi.fn() },
    affiliateCommission: { findMany: vi.fn(), count: vi.fn() },
    affiliateWithdrawal: { create: vi.fn(), findMany: vi.fn(), update: vi.fn() },
    subscription: { findUnique: vi.fn(), upsert: vi.fn(), update: vi.fn() },
    order: { findFirst: vi.fn(), update: vi.fn() },
    $transaction: vi.fn(),
  },
}));

vi.mock("../../../src/middleware/authenticate.js", () => ({
  authenticate: vi.fn((req, _res, next) => {
    req.user = { id: "user-1", email: "user@test.com", roles: [] };
    next();
  }),
}));

const { prisma } = await import("../../../src/db/prisma.js");
const mockPrisma = prisma as unknown as Record<string, Record<string, ReturnType<typeof vi.fn>>>;

describe("GET /api/affiliate/me", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns null when not registered", async () => {
    mockPrisma.affiliate.findUnique.mockResolvedValue(null);
    const res = await request(app).get("/api/affiliate/me");
    expect(res.status).toBe(200);
    expect(res.body.data).toBeNull();
  });

  it("returns affiliate profile when registered", async () => {
    mockPrisma.affiliate.findUnique.mockResolvedValue({
      id: "aff-1", userId: "user-1", code: "JAUSER1",
      totalClicks: 10, totalConversions: 2,
      totalEarnings: "50000", balance: "50000", commissionRate: "10",
      status: "active", commissions: [],
    });
    const res = await request(app).get("/api/affiliate/me");
    expect(res.status).toBe(200);
    expect(res.body.data.code).toBe("JAUSER1");
  });
});

describe("POST /api/affiliate/register", () => {
  beforeEach(() => vi.clearAllMocks());

  it("registers a new affiliate", async () => {
    mockPrisma.affiliate.findUnique.mockResolvedValue(null);
    mockPrisma.affiliate.create.mockResolvedValue({
      id: "aff-1", userId: "user-1", code: "JAUSER1",
      totalClicks: 0, totalConversions: 0, totalEarnings: "0", balance: "0",
    });
    const res = await request(app).post("/api/affiliate/register");
    expect(res.status).toBe(201);
    expect(res.body.data.code).toBe("JAUSER1");
  });

  it("returns 409 when already registered", async () => {
    mockPrisma.affiliate.findUnique.mockResolvedValue({ id: "aff-1" });
    const res = await request(app).post("/api/affiliate/register");
    expect(res.status).toBe(409);
  });
});

describe("GET /api/subscription/plans", () => {
  it("returns subscription plans", async () => {
    const res = await request(app).get("/api/subscription/plans");
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(2);
    expect(res.body.data[0].id).toBe("monthly");
    expect(res.body.data[1].id).toBe("annual");
    expect(res.body.data[1].badge).toBe("Terpopuler");
  });
});

describe("GET /api/subscription/me", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns null when no subscription", async () => {
    mockPrisma.subscription.findUnique.mockResolvedValue(null);
    const res = await request(app).get("/api/subscription/me");
    expect(res.status).toBe(200);
    expect(res.body.data).toBeNull();
  });

  it("returns active subscription with isActive flag", async () => {
    const future = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    mockPrisma.subscription.findUnique.mockResolvedValue({
      id: "sub-1", userId: "user-1", planType: "monthly",
      status: "active", startedAt: new Date(), expiresAt: future,
    });
    const res = await request(app).get("/api/subscription/me");
    expect(res.status).toBe(200);
    expect(res.body.data.isActive).toBe(true);
    expect(res.body.data.isExpired).toBe(false);
  });

  it("flags expired subscription", async () => {
    const past = new Date(Date.now() - 1000);
    mockPrisma.subscription.findUnique.mockResolvedValue({
      id: "sub-1", userId: "user-1", planType: "monthly",
      status: "active", startedAt: new Date(Date.now() - 40 * 86400000), expiresAt: past,
    });
    const res = await request(app).get("/api/subscription/me");
    expect(res.status).toBe(200);
    expect(res.body.data.isExpired).toBe(true);
    expect(res.body.data.isActive).toBe(false);
  });
});

describe("POST /api/subscription", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Run the activation transaction callback against the mocked prisma.
    // vi.mocked() keeps the Mock type callable under vitest 4's typings; the
    // Record<...> cast on mockPrisma erases the call signature (TS2348).
    vi.mocked(prisma.$transaction).mockImplementation((cb: unknown) =>
      (cb as (tx: typeof mockPrisma) => Promise<unknown>)(mockPrisma),
    );
    mockPrisma.order.update.mockResolvedValue({});
  });

  it("activates a subscription from a paid order (plan derived from order item)", async () => {
    const future = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    // C1: activation requires a paid order the caller owns containing a
    // subscription item; the plan is derived from that item, not the body.
    mockPrisma.order.findFirst.mockResolvedValue({
      id: "order-1", userId: "user-1", status: "paid",
      subscriptionConsumedAt: null,
      items: [{ itemType: "subscription", itemId: "monthly" }],
    });
    mockPrisma.subscription.upsert.mockResolvedValue({
      id: "sub-1", userId: "user-1", planType: "monthly",
      status: "active", startedAt: new Date(), expiresAt: future,
    });
    const res = await request(app).post("/api/subscription").send({ orderId: "order-1" });
    expect(res.status).toBe(201);
    expect(res.body.data.planType).toBe("monthly");
    // D7: the order is marked consumed so it cannot be replayed.
    expect(mockPrisma.order.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ subscriptionConsumedAt: expect.any(Date) }) }),
    );
  });

  it("rejects activation without a verified paid order (C1 paywall bypass)", async () => {
    mockPrisma.order.findFirst.mockResolvedValue(null);
    const res = await request(app).post("/api/subscription").send({ orderId: "nope" });
    expect(res.status).toBe(402);
    expect(mockPrisma.subscription.upsert).not.toHaveBeenCalled();
  });

  // Batch8 D7 regression (order anti-reuse): an order already consumed for a
  // subscription cannot be replayed — even after the subscription lapsed.
  it("rejects reusing an order that was already consumed (409)", async () => {
    mockPrisma.order.findFirst.mockResolvedValue({
      id: "order-1", userId: "user-1", status: "paid",
      subscriptionConsumedAt: new Date(),
      items: [{ itemType: "subscription", itemId: "monthly" }],
    });
    const res = await request(app).post("/api/subscription").send({ orderId: "order-1" });
    expect(res.status).toBe(409);
    expect(mockPrisma.subscription.upsert).not.toHaveBeenCalled();
  });
});
