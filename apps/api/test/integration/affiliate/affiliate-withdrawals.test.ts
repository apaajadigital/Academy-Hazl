import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import { app } from "../../../src/app.js";

/**
 * B1 regression: the affiliate withdrawal path runs alongside the trainer payout
 * path over an identical `Decimal(12,2)` column, but shipped with none of the
 * money validation the trainer path got (min / max / whole cents). These tests
 * pin the floor and the bounds so the two paths cannot drift apart again.
 *
 * Two client doubles, same reasoning as trainer-payouts.test.ts: `tx` is what
 * `$transaction` hands the callback, `prisma` is the global client. The debit
 * and the create must both happen on `tx`.
 */
const { txClient } = vi.hoisted(() => ({
  txClient: {
    affiliate: { updateMany: vi.fn() },
    affiliateWithdrawal: { create: vi.fn() },
  },
}));

vi.mock("../../../src/db/prisma.js", () => ({
  prisma: {
    affiliate: { findUnique: vi.fn(), updateMany: vi.fn(), update: vi.fn() },
    affiliateWithdrawal: { create: vi.fn(), findMany: vi.fn(), findUnique: vi.fn(), update: vi.fn() },
    affiliateCommission: { findMany: vi.fn(), count: vi.fn() },
    $transaction: vi.fn(),
  },
}));

vi.mock("../../../src/middleware/authenticate.js", () => ({
  authenticate: vi.fn((req, _res, next) => {
    req.user = { id: "user-1", email: "affiliate@test.com", roles: ["affiliate"] };
    next();
  }),
}));

const { prisma } = await import("../../../src/db/prisma.js");

const validBody = {
  amount: 1_000_000,
  bankName: "BCA",
  accountNo: "1234567890",
  accountName: "Afiliasi Satu",
};

const post = (body: Record<string, unknown>) =>
  request(app).post("/api/affiliate/withdrawals").send(body);

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(prisma.affiliate.findUnique).mockResolvedValue({
    id: "aff-1",
    userId: "user-1",
    balance: 5_000_000,
  } as never);
  txClient.affiliate.updateMany.mockResolvedValue({ count: 1 });
  txClient.affiliateWithdrawal.create.mockImplementation(async (args: { data: object }) => ({
    id: "wd-new",
    status: "pending",
    ...args.data,
  }));
  // Run the callback against the transaction client, like Prisma does.
  vi.mocked(prisma.$transaction).mockImplementation((async (fn: (tx: unknown) => unknown) =>
    fn(txClient)) as never);
});

describe("POST /api/affiliate/withdrawals (B1 — money validation)", () => {
  it("creates the withdrawal for a valid amount", async () => {
    const res = await post(validBody);

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(txClient.affiliateWithdrawal.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ affiliateId: "aff-1", amount: 1_000_000 }),
      }),
    );
  });

  // Owner decision (29 Jul 2026): Rp 10.000 floor — deliberately the same number
  // the trainer path enforces. Before this the API accepted Rp 0,01 while the
  // dashboard form advertised Rp 50.000, so neither number was the actual rule.
  it("rejects an amount below the Rp 10.000 minimum", async () => {
    const res = await post({ ...validBody, amount: 9_999 });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    // Rejected at the schema boundary — no balance debit, no transaction.
    expect(prisma.$transaction).not.toHaveBeenCalled();
    expect(txClient.affiliateWithdrawal.create).not.toHaveBeenCalled();
  });

  it("rejects the one-cent withdrawal the old schema accepted", async () => {
    const res = await post({ ...validBody, amount: 0.01 });

    expect(res.status).toBe(400);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it("accepts an amount exactly at the Rp 10.000 minimum", async () => {
    const res = await post({ ...validBody, amount: 10_000 });

    expect(res.status).toBe(201);
    expect(txClient.affiliateWithdrawal.create).toHaveBeenCalled();
  });

  it("rejects a sub-cent amount the Decimal(12,2) column would round silently", async () => {
    const res = await post({ ...validBody, amount: 1_000_000.005 });

    expect(res.status).toBe(400);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it("accepts a two-decimal amount", async () => {
    const res = await post({ ...validBody, amount: 1_000_000.05 });

    expect(res.status).toBe(201);
  });

  it("rejects an amount larger than the Decimal(12,2) column", async () => {
    const res = await post({ ...validBody, amount: 10_000_000_000 });

    expect(res.status).toBe(400);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it("rejects a non-positive amount", async () => {
    for (const amount of [0, -1]) {
      const res = await post({ ...validBody, amount });
      expect(res.status).toBe(400);
    }
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  // The validation must not weaken the guard that was already there.
  it("still rejects an amount above the affiliate's balance with 400", async () => {
    txClient.affiliate.updateMany.mockResolvedValue({ count: 0 });

    const res = await post({ ...validBody, amount: 4_000_000 });

    expect(res.status).toBe(400);
    expect(txClient.affiliateWithdrawal.create).not.toHaveBeenCalled();
  });

  it("debits the balance and creates the row inside one transaction", async () => {
    const res = await post(validBody);

    expect(res.status).toBe(201);
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(txClient.affiliate.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "aff-1", balance: { gte: 1_000_000 } },
      }),
    );
    // Nothing ran on the global client, which is what a read-then-write would do.
    expect(prisma.affiliate.updateMany).not.toHaveBeenCalled();
    expect(prisma.affiliateWithdrawal.create).not.toHaveBeenCalled();
  });
});
