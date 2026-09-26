import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import { app } from "../../../src/app.js";
import jwt from "jsonwebtoken";

vi.mock("../../../src/db/prisma.js", () => ({
  prisma: {
    user: { findUnique: vi.fn() },
    trainerPayout: { findMany: vi.fn(), count: vi.fn(), aggregate: vi.fn() },
    affiliateWithdrawal: { findMany: vi.fn(), count: vi.fn(), aggregate: vi.fn() },
  },
}));

const { prisma } = await import("../../../src/db/prisma.js");

const VALID_ADMIN = {
  id: "admin-1",
  email: "admin@jago.id",
  isActive: true,
  deletedAt: null,
  roles: [{ role: "super_admin" }],
};

const ADMIN_TOKEN = jwt.sign(
  { sub: "admin-1", email: "admin@jago.id", roles: ["super_admin"] },
  process.env.JWT_SECRET!,
  { expiresIn: "15m" }
);

const ADMIN_AUTH = { Authorization: `Bearer ${ADMIN_TOKEN}` };

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(prisma.user.findUnique).mockResolvedValue(VALID_ADMIN as never);
});

describe("GET /api/admin/payouts/stats", () => {
  it("aggregates trainer and affiliate KPI counters", async () => {
    // trainerPayout.count: pending, approved, paid (source order in Promise.all)
    vi.mocked(prisma.trainerPayout.count)
      .mockResolvedValueOnce(3)
      .mockResolvedValueOnce(2)
      .mockResolvedValueOnce(1);
    vi.mocked(prisma.trainerPayout.aggregate).mockResolvedValue({
      _sum: { amount: 750000 },
    } as never);
    vi.mocked(prisma.affiliateWithdrawal.count)
      .mockResolvedValueOnce(5)
      .mockResolvedValueOnce(4)
      .mockResolvedValueOnce(3);
    vi.mocked(prisma.affiliateWithdrawal.aggregate).mockResolvedValue({
      _sum: { amount: 500000 },
    } as never);

    const res = await request(app).get("/api/admin/payouts/stats").set(ADMIN_AUTH);

    expect(res.status).toBe(200);
    expect(res.body.data).toEqual({
      trainer: { pending: 3, approved: 2, paid: 1, pendingAmount: 750000 },
      affiliate: { pending: 5, approved: 4, paid: 3, pendingAmount: 500000 },
    });
  });

  it("reports 0 pendingAmount when the sum is null (no pending rows)", async () => {
    vi.mocked(prisma.trainerPayout.count).mockResolvedValue(0);
    vi.mocked(prisma.trainerPayout.aggregate).mockResolvedValue({
      _sum: { amount: null },
    } as never);
    vi.mocked(prisma.affiliateWithdrawal.count).mockResolvedValue(0);
    vi.mocked(prisma.affiliateWithdrawal.aggregate).mockResolvedValue({
      _sum: { amount: null },
    } as never);

    const res = await request(app).get("/api/admin/payouts/stats").set(ADMIN_AUTH);

    expect(res.status).toBe(200);
    expect(res.body.data.trainer.pendingAmount).toBe(0);
    expect(res.body.data.affiliate.pendingAmount).toBe(0);
  });
});

describe("GET /api/admin/payouts/trainer", () => {
  it("returns a paginated payout list with trainer info", async () => {
    vi.mocked(prisma.trainerPayout.findMany).mockResolvedValue([
      { id: "po-1", amount: 750000, status: "pending", trainer: { id: "t-1", name: "Pak T", email: "t@jago.id" } },
    ] as never);
    vi.mocked(prisma.trainerPayout.count).mockResolvedValue(1);

    const res = await request(app).get("/api/admin/payouts/trainer").set(ADMIN_AUTH);

    expect(res.status).toBe(200);
    expect(res.body.data.payouts).toHaveLength(1);
    expect(res.body.data).toEqual(expect.objectContaining({ total: 1, page: 1, limit: 20 }));
    expect(vi.mocked(prisma.trainerPayout.findMany).mock.calls[0]![0]).toEqual(
      expect.objectContaining({ skip: 0, take: 20, where: {} })
    );
  });

  it("filters by status and searches trainer name/email", async () => {
    vi.mocked(prisma.trainerPayout.findMany).mockResolvedValue([] as never);
    vi.mocked(prisma.trainerPayout.count).mockResolvedValue(0);

    const res = await request(app)
      .get("/api/admin/payouts/trainer")
      .query({ status: "pending", search: "budi", page: 2, limit: 10 })
      .set(ADMIN_AUTH);

    expect(res.status).toBe(200);
    const args = vi.mocked(prisma.trainerPayout.findMany).mock.calls[0]![0]!;
    expect(args.skip).toBe(10);
    expect(args.where).toEqual({
      status: "pending",
      trainer: {
        OR: [
          { name: { contains: "budi", mode: "insensitive" } },
          { email: { contains: "budi", mode: "insensitive" } },
        ],
      },
    });
  });

  it("rejects an unknown status (400)", async () => {
    const res = await request(app)
      .get("/api/admin/payouts/trainer")
      .query({ status: "vanished" })
      .set(ADMIN_AUTH);

    expect(res.status).toBe(400);
    expect(prisma.trainerPayout.findMany).not.toHaveBeenCalled();
  });
});

describe("GET /api/admin/payouts/affiliate", () => {
  it("returns a paginated withdrawal list with affiliate user info", async () => {
    vi.mocked(prisma.affiliateWithdrawal.findMany).mockResolvedValue([
      {
        id: "wd-1",
        amount: 500000,
        status: "pending",
        affiliate: { id: "aff-1", code: "AFF01", user: { id: "u-1", name: "Rina", email: "r@jago.id" } },
      },
    ] as never);
    vi.mocked(prisma.affiliateWithdrawal.count).mockResolvedValue(1);

    const res = await request(app).get("/api/admin/payouts/affiliate").set(ADMIN_AUTH);

    expect(res.status).toBe(200);
    expect(res.body.data.withdrawals).toHaveLength(1);
    expect(res.body.data.total).toBe(1);
  });

  it("searches through the affiliate's user relation", async () => {
    vi.mocked(prisma.affiliateWithdrawal.findMany).mockResolvedValue([] as never);
    vi.mocked(prisma.affiliateWithdrawal.count).mockResolvedValue(0);

    const res = await request(app)
      .get("/api/admin/payouts/affiliate")
      .query({ search: "rina", status: "paid" })
      .set(ADMIN_AUTH);

    expect(res.status).toBe(200);
    const args = vi.mocked(prisma.affiliateWithdrawal.findMany).mock.calls[0]![0]!;
    expect(args.where).toEqual({
      status: "paid",
      affiliate: {
        user: {
          OR: [
            { name: { contains: "rina", mode: "insensitive" } },
            { email: { contains: "rina", mode: "insensitive" } },
          ],
        },
      },
    });
  });
});
