import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * BL-143(b) — the coupon limit must be enforced by the database, not by a read.
 *
 * `validateCoupon` checks `usageCount >= usageLimit` when a PENDING order is
 * created. That check cannot bind under concurrency: 200 buyers can validate the
 * same `usageLimit: 10` coupon in the same minute and all 200 pass, because none
 * of them has consumed a slot yet. Only a comparison evaluated INSIDE the UPDATE
 * can serialise them, which is what these tests pin down.
 *
 * The Prisma client is mocked, so `coupon.fields.usageLimit` is a stand-in
 * sentinel — what matters here is the SHAPE of the where clause that reaches the
 * database, not the generated reference object itself.
 */

const USAGE_LIMIT_REF = { __ref: "usageLimit" };

vi.mock("../../src/db/prisma.js", () => ({
  prisma: {
    coupon: {
      findUnique: vi.fn(),
      updateMany: vi.fn(),
      fields: { usageLimit: USAGE_LIMIT_REF },
    },
  },
}));

const { prisma } = await import("../../src/db/prisma.js");
const { claimCouponUsage, incrementCouponUsage } = await import(
  "../../src/services/coupon/couponService.js"
);

beforeEach(() => {
  vi.clearAllMocks();
});

describe("claimCouponUsage — the limit is enforced inside the UPDATE (BL-143b)", () => {
  it("guards the increment with usageCount < usageLimit, unlimited coupons exempt", async () => {
    vi.mocked(prisma.coupon.updateMany).mockResolvedValue({ count: 1 } as never);

    await claimCouponUsage(prisma as never, "coupon-1");

    expect(prisma.coupon.updateMany).toHaveBeenCalledWith({
      where: {
        id: "coupon-1",
        OR: [{ usageLimit: null }, { usageCount: { lt: USAGE_LIMIT_REF } }],
      },
      data: { usageCount: { increment: 1 } },
    });
  });

  it("reports true when a slot was claimed", async () => {
    vi.mocked(prisma.coupon.updateMany).mockResolvedValue({ count: 1 } as never);
    await expect(claimCouponUsage(prisma as never, "coupon-1")).resolves.toBe(true);
  });

  it("reports false — and does NOT throw — when the coupon is exhausted", async () => {
    // count 0 is exactly what the guard losing looks like: the row exists, but
    // usageCount is no longer below usageLimit, so no row matched.
    vi.mocked(prisma.coupon.updateMany).mockResolvedValue({ count: 0 } as never);

    await expect(claimCouponUsage(prisma as never, "coupon-1")).resolves.toBe(false);
  });

  it("never reads before writing — a read-then-write cannot be made safe here", async () => {
    vi.mocked(prisma.coupon.updateMany).mockResolvedValue({ count: 1 } as never);

    await claimCouponUsage(prisma as never, "coupon-1");

    expect(prisma.coupon.findUnique).not.toHaveBeenCalled();
  });

  it("claims through whichever client it is handed, so it works inside a transaction", async () => {
    const tx = { coupon: { updateMany: vi.fn().mockResolvedValue({ count: 1 }) } };

    await claimCouponUsage(tx as never, "coupon-1");

    expect(tx.coupon.updateMany).toHaveBeenCalledOnce();
    expect(prisma.coupon.updateMany).not.toHaveBeenCalled();
  });

  it("incrementCouponUsage is the same claim against the shared client", async () => {
    vi.mocked(prisma.coupon.updateMany).mockResolvedValue({ count: 0 } as never);

    await expect(incrementCouponUsage("coupon-1")).resolves.toBe(false);
    expect(prisma.coupon.updateMany).toHaveBeenCalledOnce();
  });

  it("a burst of claims cannot exceed the budget the database enforces", async () => {
    // Ten slots, twenty concurrent fulfilments. The DB answers count=1 for the
    // first ten and count=0 after that; the service must report that faithfully
    // rather than smoothing it over.
    let remaining = 10;
    // Cast the whole implementation, not its return value: an async function
    // returning `as never` is a Promise<never>, which is not a PrismaPromise —
    // the shape tsconfig.test.json checks and `tsc --noEmit` alone does not.
    vi.mocked(prisma.coupon.updateMany).mockImplementation((async () => {
      const won = remaining > 0;
      if (won) remaining -= 1;
      return { count: won ? 1 : 0 };
    }) as never);

    const results = await Promise.all(
      Array.from({ length: 20 }, () => claimCouponUsage(prisma as never, "coupon-1")),
    );

    expect(results.filter(Boolean)).toHaveLength(10);
    expect(results.filter((r) => !r)).toHaveLength(10);
  });
});
