import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import { app } from "../../../src/app.js";
import jwt from "jsonwebtoken";

vi.mock("../../../src/db/prisma.js", () => ({
  prisma: {
    user: { findUnique: vi.fn() },
    trainerPayout: { findUnique: vi.fn(), updateMany: vi.fn() },
    affiliateWithdrawal: { findUnique: vi.fn(), updateMany: vi.fn() },
    affiliate: { update: vi.fn() },
    $transaction: vi.fn(),
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

const VALID_USER = {
  id: "user-1",
  email: "user@jago.id",
  isActive: true,
  deletedAt: null,
  roles: [{ role: "student" }],
};

const ADMIN_TOKEN = jwt.sign(
  { sub: "admin-1", email: "admin@jago.id", roles: ["super_admin"] },
  process.env.JWT_SECRET!,
  { expiresIn: "15m" }
);

const USER_TOKEN = jwt.sign(
  { sub: "user-1", email: "user@jago.id", roles: ["student"] },
  process.env.JWT_SECRET!,
  { expiresIn: "15m" }
);

const ADMIN_AUTH = { Authorization: `Bearer ${ADMIN_TOKEN}` };
const USER_AUTH = { Authorization: `Bearer ${USER_TOKEN}` };

const PENDING_WITHDRAWAL = {
  id: "wd-1",
  affiliateId: "aff-1",
  amount: 500000,
  status: "pending",
};

const PENDING_PAYOUT = {
  id: "po-1",
  trainerId: "trainer-1",
  amount: 750000,
  status: "pending",
};

beforeEach(() => {
  vi.clearAllMocks();
  // Run the transaction callback against the mocked prisma client (same
  // pattern as test/integration/orders/refund.test.ts).
  vi.mocked(prisma.$transaction).mockImplementation((cb: unknown) =>
    (cb as (tx: typeof prisma) => Promise<unknown>)(prisma),
  );
});

// ─── Affiliate withdrawals ────────────────────────────────────────────────────

describe("PATCH /api/admin/payouts/affiliate/:id", () => {
  it("rejecting a pending withdrawal refunds the affiliate balance (C1)", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(VALID_ADMIN as never);
    vi.mocked(prisma.affiliateWithdrawal.findUnique)
      .mockResolvedValueOnce(PENDING_WITHDRAWAL as never) // existence check
      .mockResolvedValueOnce({ ...PENDING_WITHDRAWAL, status: "rejected" } as never); // response fetch
    vi.mocked(prisma.affiliateWithdrawal.updateMany).mockResolvedValue({ count: 1 } as never);
    vi.mocked(prisma.affiliate.update).mockResolvedValue({} as never);

    const res = await request(app)
      .patch("/api/admin/payouts/affiliate/wd-1")
      .set(ADMIN_AUTH)
      .send({ status: "rejected", note: "invalid bank account" });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe("rejected");
    // The debited amount must be credited back exactly once.
    expect(prisma.affiliate.update).toHaveBeenCalledTimes(1);
    expect(prisma.affiliate.update).toHaveBeenCalledWith({
      where: { id: "aff-1" },
      data: { balance: { increment: 500000 } },
    });
    // Status transition must be guarded by the pending predicate.
    expect(prisma.affiliateWithdrawal.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "wd-1", status: "pending" },
        data: expect.objectContaining({
          status: "rejected",
          note: "invalid bank account",
          processedBy: "admin-1",
        }),
      }),
    );
  });

  it("approving a pending withdrawal sets status and does NOT refund", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(VALID_ADMIN as never);
    vi.mocked(prisma.affiliateWithdrawal.findUnique)
      .mockResolvedValueOnce(PENDING_WITHDRAWAL as never)
      .mockResolvedValueOnce({ ...PENDING_WITHDRAWAL, status: "approved" } as never);
    vi.mocked(prisma.affiliateWithdrawal.updateMany).mockResolvedValue({ count: 1 } as never);

    const res = await request(app)
      .patch("/api/admin/payouts/affiliate/wd-1")
      .set(ADMIN_AUTH)
      .send({ status: "approved" });

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe("approved");
    expect(prisma.affiliate.update).not.toHaveBeenCalled();
  });

  it("returns 409 and changes nothing when the withdrawal was already processed (C2)", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(VALID_ADMIN as never);
    vi.mocked(prisma.affiliateWithdrawal.findUnique).mockResolvedValue({
      ...PENDING_WITHDRAWAL,
      status: "rejected",
    } as never);
    // Guarded update matches no row because status !== "pending".
    vi.mocked(prisma.affiliateWithdrawal.updateMany).mockResolvedValue({ count: 0 } as never);

    const res = await request(app)
      .patch("/api/admin/payouts/affiliate/wd-1")
      .set(ADMIN_AUTH)
      .send({ status: "rejected" });

    expect(res.status).toBe(409);
    expect(res.body.success).toBe(false);
    // No double refund.
    expect(prisma.affiliate.update).not.toHaveBeenCalled();
  });

  it("returns 404 when the withdrawal does not exist", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(VALID_ADMIN as never);
    vi.mocked(prisma.affiliateWithdrawal.findUnique).mockResolvedValue(null);

    const res = await request(app)
      .patch("/api/admin/payouts/affiliate/missing")
      .set(ADMIN_AUTH)
      .send({ status: "approved" });

    expect(res.status).toBe(404);
    expect(prisma.affiliateWithdrawal.updateMany).not.toHaveBeenCalled();
  });

  it("returns 403 for non-admin users", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(VALID_USER as never);

    const res = await request(app)
      .patch("/api/admin/payouts/affiliate/wd-1")
      .set(USER_AUTH)
      .send({ status: "rejected" });

    expect(res.status).toBe(403);
    expect(prisma.affiliateWithdrawal.updateMany).not.toHaveBeenCalled();
    expect(prisma.affiliate.update).not.toHaveBeenCalled();
  });

  it("returns 401 without auth", async () => {
    const res = await request(app)
      .patch("/api/admin/payouts/affiliate/wd-1")
      .send({ status: "rejected" });

    expect(res.status).toBe(401);
  });
});

// ─── Trainer payouts ──────────────────────────────────────────────────────────

describe("PATCH /api/admin/payouts/trainer/:id", () => {
  it("processes a pending payout and records the acting admin", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(VALID_ADMIN as never);
    vi.mocked(prisma.trainerPayout.findUnique)
      .mockResolvedValueOnce(PENDING_PAYOUT as never)
      .mockResolvedValueOnce({ ...PENDING_PAYOUT, status: "paid" } as never);
    vi.mocked(prisma.trainerPayout.updateMany).mockResolvedValue({ count: 1 } as never);

    const res = await request(app)
      .patch("/api/admin/payouts/trainer/po-1")
      .set(ADMIN_AUTH)
      .send({ status: "paid", note: "transferred manually" });

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe("paid");
    expect(prisma.trainerPayout.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "po-1", status: "pending" },
        data: expect.objectContaining({
          status: "paid",
          note: "transferred manually",
          processedBy: "admin-1",
        }),
      }),
    );
  });

  it("returns 409 and changes nothing when the payout was already processed (C2)", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(VALID_ADMIN as never);
    vi.mocked(prisma.trainerPayout.findUnique).mockResolvedValue({
      ...PENDING_PAYOUT,
      status: "paid",
    } as never);
    vi.mocked(prisma.trainerPayout.updateMany).mockResolvedValue({ count: 0 } as never);

    const res = await request(app)
      .patch("/api/admin/payouts/trainer/po-1")
      .set(ADMIN_AUTH)
      .send({ status: "paid" });

    expect(res.status).toBe(409);
    expect(res.body.success).toBe(false);
  });

  it("returns 404 when the payout does not exist", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(VALID_ADMIN as never);
    vi.mocked(prisma.trainerPayout.findUnique).mockResolvedValue(null);

    const res = await request(app)
      .patch("/api/admin/payouts/trainer/missing")
      .set(ADMIN_AUTH)
      .send({ status: "approved" });

    expect(res.status).toBe(404);
    expect(prisma.trainerPayout.updateMany).not.toHaveBeenCalled();
  });

  it("returns 403 for non-admin users", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(VALID_USER as never);

    const res = await request(app)
      .patch("/api/admin/payouts/trainer/po-1")
      .set(USER_AUTH)
      .send({ status: "paid" });

    expect(res.status).toBe(403);
    expect(prisma.trainerPayout.updateMany).not.toHaveBeenCalled();
  });
});
