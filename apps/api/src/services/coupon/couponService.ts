import type { Prisma } from "@prisma/client";
import { prisma } from "../../db/prisma.js";
import { AppError } from "../../types/index.js";

export type CouponValidationResult = {
  couponId: string;
  code: string;
  discountAmount: number;
  finalAmount: number;
};

export async function validateCoupon(
  code: string,
  subtotal: number
): Promise<CouponValidationResult> {
  const coupon = await prisma.coupon.findUnique({ where: { code: code.toUpperCase() } });

  if (!coupon || !coupon.isActive) throw new AppError(404, "Kode kupon tidak valid.");

  const now = new Date();
  if (coupon.startDate && coupon.startDate > now) throw new AppError(400, "Kupon belum aktif.");
  if (coupon.endDate && coupon.endDate < now) throw new AppError(400, "Kupon sudah kadaluarsa.");
  if (coupon.usageLimit && coupon.usageCount >= coupon.usageLimit) {
    throw new AppError(400, "Kupon sudah mencapai batas penggunaan.");
  }

  const minPurchase = Number(coupon.minPurchase);
  if (subtotal < minPurchase) {
    throw new AppError(400, `Minimum pembelian Rp ${minPurchase.toLocaleString("id-ID")} untuk kupon ini.`);
  }

  let discountAmount: number;
  if (coupon.type === "percentage") {
    discountAmount = Math.floor((subtotal * Number(coupon.value)) / 100);
    if (coupon.maxDiscount) {
      discountAmount = Math.min(discountAmount, Number(coupon.maxDiscount));
    }
  } else {
    discountAmount = Math.min(Number(coupon.value), subtotal);
  }

  return {
    couponId: coupon.id,
    code: coupon.code,
    discountAmount,
    finalAmount: subtotal - discountAmount,
  };
}

/**
 * A client that can write coupons — either the shared `prisma` instance or an
 * interactive-transaction client. Both expose the same `coupon` delegate, and
 * the fulfillment path must be able to claim inside its own transaction.
 */
type CouponWriter = Pick<Prisma.TransactionClient, "coupon">;

/**
 * BL-143(b): the guard that makes `usageLimit` mean something under concurrency.
 *
 * `validateCoupon` above checks the limit when a PENDING order is created, but
 * that check is a read: 200 buyers can validate the same `usageLimit: 10` coupon
 * in the same minute and all 200 pass, because none of them has consumed a slot
 * yet. The limit was therefore only ever advisory.
 *
 * The comparison is column-to-column (a Prisma field reference), so it is
 * evaluated INSIDE the UPDATE. A read-then-write cannot be made safe here no
 * matter how the two statements are ordered — only the database can compare and
 * increment atomically. `usageLimit: null` means unlimited and always has room.
 */
// Built per call, not once at module load: `prisma.coupon.fields` is resolved
// from the generated client, and reading it at import time makes this module
// impossible to load anywhere the client is substituted (every test that mocks
// db/prisma.js, which is most of them).
function couponHasRoom() {
  return {
    OR: [{ usageLimit: null }, { usageCount: { lt: prisma.coupon.fields.usageLimit } }],
  };
}

/**
 * Consume one coupon slot. Returns whether a slot was actually claimed.
 *
 * Callers MUST NOT fail a completed order when this returns false — see the
 * call sites in `routes/checkout.ts` and `jobs/processors/webhook.ts`. By the
 * time a slot is claimed the buyer has already paid (or the free order is
 * already fulfilled), and refusing them over a counter would be the BL-138
 * mistake in a new costume: money taken, access withheld.
 */
export async function claimCouponUsage(client: CouponWriter, couponId: string): Promise<boolean> {
  const claimed = await client.coupon.updateMany({
    where: { id: couponId, ...couponHasRoom() },
    data: { usageCount: { increment: 1 } },
  });
  return claimed.count === 1;
}

export async function incrementCouponUsage(couponId: string): Promise<boolean> {
  return claimCouponUsage(prisma, couponId);
}
