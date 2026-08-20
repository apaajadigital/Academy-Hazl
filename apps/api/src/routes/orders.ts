import { Router, type Request } from "express";
import { authenticate } from "../middleware/authenticate.js";
import { prisma } from "../db/prisma.js";
import { generateInvoicePDF } from "../services/invoice/invoiceService.js";
import { logger } from "../lib/logger.js";
import { successResponse, errorResponse, AppError, type Role } from "../types/index.js";
import { z } from "zod";

const router = Router();

/**
 * Role check against the authenticated user.
 *
 * Typed against `Role` on purpose: the previous `roles.includes("x" as never)`
 * casts silenced the compiler entirely, so a typo or a renamed role would have
 * compiled into a guard that can never match (an endpoint nobody can reach —
 * or, under negation, one that lets everybody through). With
 * `allowed: readonly Role[]` an unknown role name is a build error.
 */
function hasAnyRole(req: Request, allowed: readonly Role[]): boolean {
  const roles: readonly Role[] = req.user?.roles ?? [];
  return allowed.some((role) => roles.includes(role));
}

const ADMIN_ROLES: readonly Role[] = ["super_admin"];

router.use(authenticate);

router.get("/", async (req, res, next) => {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 10));
    const skip = (page - 1) * limit;

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where: { userId: req.user!.id },
        include: { items: true, coupon: { select: { code: true } } },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.order.count({ where: { userId: req.user!.id } }),
    ]);

    return res.json(successResponse(orders, { total, page, limit }));
  } catch (err) {
    next(err);
  }
});

router.get("/:orderId", async (req, res, next) => {
  try {
    const order = await prisma.order.findUnique({
      where: { id: req.params.orderId },
      include: {
        items: true,
        coupon: { select: { code: true } },
        transactions: { orderBy: { createdAt: "desc" }, take: 1 },
      },
    });

    if (!order) throw new AppError(404, "Order tidak ditemukan.");
    if (order.userId !== req.user!.id && !hasAnyRole(req, ADMIN_ROLES)) {
      throw new AppError(403, "Akses ditolak.");
    }

    // BL-47 (private-class onboarding): waGroupLink/onboardingContact are never
    // exposed on public course endpoints — a PAID order is the gate. Only then
    // does the item carry the onboarding block; otherwise privateClass stays
    // null so the response shape is additive and backward-compatible.
    const privateClassByCourseId = new Map<
      string,
      { waGroupLink: string | null; onboardingContact: string | null; liveSchedule: Date | null }
    >();
    if (order.status === "paid") {
      const courseIds = order.items.filter((item) => item.itemType === "course").map((item) => item.itemId);
      if (courseIds.length > 0) {
        const privateCourses = await prisma.course.findMany({
          where: { id: { in: courseIds }, format: "private_class" },
          select: { id: true, waGroupLink: true, onboardingContact: true, liveSchedule: true },
        });
        for (const course of privateCourses) {
          privateClassByCourseId.set(course.id, {
            waGroupLink: course.waGroupLink,
            onboardingContact: course.onboardingContact,
            liveSchedule: course.liveSchedule,
          });
        }
      }
    }
    const items = order.items.map((item) => ({
      ...item,
      privateClass: item.itemType === "course" ? (privateClassByCourseId.get(item.itemId) ?? null) : null,
    }));

    return res.json(successResponse({ ...order, items }));
  } catch (err) {
    next(err);
  }
});

router.get("/:orderId/invoice", async (req, res, next) => {
  try {
    const order = await prisma.order.findUnique({
      where: { id: req.params.orderId },
      include: {
        user: { select: { name: true, email: true } },
        items: true,
        coupon: { select: { code: true } },
      },
    });

    if (!order) throw new AppError(404, "Order tidak ditemukan.");
    if (order.userId !== req.user!.id && !hasAnyRole(req, ADMIN_ROLES)) {
      throw new AppError(403, "Akses ditolak.");
    }
    if (order.status !== "paid") throw new AppError(400, "Invoice hanya tersedia untuk order yang sudah dibayar.");

    const pdf = await generateInvoicePDF(order as Parameters<typeof generateInvoicePDF>[0]);
    const filename = `invoice-${order.id.slice(0, 8).toUpperCase()}.pdf`;

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    return res.send(pdf);
  } catch (err) {
    next(err);
  }
});

// ─── Refund ───────────────────────────────────────────────────────────────────

const refundSchema = z.object({
  reason: z.string().min(10, "Alasan refund minimal 10 karakter."),
});

router.post("/:orderId/refund", async (req, res, next) => {
  try {
    const orderId = req.params.orderId as string;
    const userId = req.user!.id;

    const order = await prisma.order.findUnique({ where: { id: orderId } });
    if (!order) throw new AppError(404, "Order tidak ditemukan.");
    if (order.userId !== userId) throw new AppError(403, "Akses ditolak.");
    if (order.status !== "paid") throw new AppError(400, "Hanya order dengan status paid yang dapat direfund.");

    const existing = await prisma.refund.findUnique({ where: { orderId } });
    if (existing) throw new AppError(400, "Permintaan refund sudah ada untuk order ini.");

    const body = refundSchema.safeParse(req.body);
    if (!body.success) {
      return res.status(400).json(errorResponse("VALIDATION_ERROR", body.error.issues[0]?.message ?? "Validasi gagal."));
    }

    const refund = await prisma.refund.create({
      data: {
        orderId,
        userId,
        reason: body.data.reason,
        amount: order.finalAmount,
        status: "pending",
      },
    });

    return res.status(201).json(successResponse(refund));
  } catch (err) {
    next(err);
  }
});

router.get("/:orderId/refund", async (req, res, next) => {
  try {
    const orderId = req.params.orderId as string;
    const refund = await prisma.refund.findUnique({ where: { orderId } });
    if (!refund) throw new AppError(404, "Refund tidak ditemukan.");
    if (refund.userId !== req.user!.id && !hasAnyRole(req, ADMIN_ROLES)) {
      throw new AppError(403, "Akses ditolak.");
    }
    return res.json(successResponse(refund));
  } catch (err) {
    next(err);
  }
});

// POST /api/orders/:orderId/cancel — cancel pending order
router.post("/:orderId/cancel", async (req, res, next) => {
  try {
    const orderId = req.params.orderId as string;
    const userId = req.user!.id;

    const order = await prisma.order.findUnique({ where: { id: orderId } });
    if (!order) throw new AppError(404, "Order tidak ditemukan.");
    if (order.userId !== userId) throw new AppError(403, "Akses ditolak.");
    if (order.status !== "pending") {
      throw new AppError(400, "Hanya pesanan pending yang dapat dibatalkan.");
    }

    await prisma.$transaction(async (tx) => {
      // H5 (cancel/webhook race): the pending check above is only advisory — a
      // DOKU webhook can mark the order paid between that read and this write.
      // updateMany with the status predicate makes cancel atomic: it only wins
      // if the order is STILL pending, so a paid order can never be flipped to
      // cancelled, and two concurrent cancels can't double-decrement the coupon.
      const cancelled = await tx.order.updateMany({
        where: { id: orderId, userId, status: "pending" },
        data: { status: "cancelled" },
      });
      if (cancelled.count !== 1) {
        throw new AppError(409, "Pesanan sudah diproses dan tidak dapat dibatalkan.");
      }

      // Only after the cancel is confirmed do we release the coupon slot, inside
      // the same transaction so a failure rolls both back together.
      if (order.couponId) {
        const coupon = await tx.coupon.findUnique({ where: { id: order.couponId } });
        if (coupon && coupon.usageCount > 0) {
          await tx.coupon.update({
            where: { id: order.couponId },
            data: { usageCount: { decrement: 1 } },
          });
        }
      }
    });

    return res.json(successResponse({ id: orderId, status: "cancelled" }));
  } catch (err) {
    next(err);
  }
});

// ─── Admin refund processing ──────────────────────────────────────────────────

router.patch("/admin/refunds/:refundId", async (req, res, next) => {
  try {
    if (!hasAnyRole(req, ADMIN_ROLES)) throw new AppError(403, "Akses ditolak.");

    const refundId = req.params.refundId as string;
    const { status, adminNote } = req.body as { status: string; adminNote?: string };

    if (!["approved", "rejected"].includes(status)) {
      throw new AppError(400, "Status harus approved atau rejected.");
    }

    const refund = await prisma.refund.findUnique({ where: { id: refundId } });
    if (!refund) throw new AppError(404, "Refund tidak ditemukan.");
    if (refund.status !== "pending") throw new AppError(400, "Refund sudah diproses.");

    const updated = await prisma.refund.update({
      where: { id: refundId },
      data: {
        status,
        adminNote: adminNote ?? null,
        processedAt: new Date(),
        processedBy: req.user!.id,
      },
    });

    if (status === "approved") {
      // Batch8 D1 (refund revokes access + reverses commission/coupon): approving a
      // refund must undo everything the paid order granted, atomically.
      const order = await prisma.order.findUnique({
        where: { id: refund.orderId },
        include: { items: true, commissions: true },
      });

      // Idempotency: only revoke once. If the order is already refunded, skip all
      // side-effects (a repeated approve must not double-decrement balances).
      if (order && order.status !== "refunded") {
        await prisma.$transaction(async (tx) => {
          // Revoke granted access per item. deleteMany is a no-op when the row is
          // absent, so this stays safe even if access was never granted.
          for (const item of order.items) {
            if (item.itemType === "course") {
              await tx.courseEnrollment.deleteMany({
                where: { courseId: item.itemId, userId: order.userId },
              });
            } else if (item.itemType === "event") {
              // BL-66 (refund revoked a ticket another order paid for): matching
              // on (eventId, userId) alone found whatever seat the buyer holds
              // NOW — the row is unique per (event, buyer), so it need not be the
              // one this order granted. Reachable via the "event_full" auto-refund
              // (jobs/processors/webhook.ts): that order writes no registration and
              // parks in `refund_pending`, so if the buyer re-purchases the event
              // under a NEW order, approving the stale refund deleted the second
              // order's PAID ticket. Scoping to orderId undoes only what THIS order
              // granted; both paid write paths stamp it, and free registrations
              // (null orderId, no order at all) are correctly never matched.
              const removed = await tx.eventRegistration.deleteMany({
                where: { eventId: item.itemId, userId: order.userId, orderId: order.id },
              });

              if (removed.count === 0) {
                // A no-op delete is normal (event_full never held a seat), but if
                // a registration exists under a DIFFERENT order the refund revoked
                // nothing — surface it so "nothing to revoke" is distinguishable
                // from "the seat belongs to another order".
                const foreign = await tx.eventRegistration.findFirst({
                  where: { eventId: item.itemId, userId: order.userId },
                  select: { id: true, orderId: true },
                });
                if (foreign) {
                  logger.warn("BL-66: refund revoked no registration — seat belongs to another order", {
                    eventId: item.itemId,
                    orderId: order.id,
                    registrationId: foreign.id,
                    registrationOrderId: foreign.orderId,
                  });
                }
              }

              // BL-58 (event seats leak permanently): Event.totalSold is only ever
              // incremented (checkout free/100%-coupon paths + webhook fulfillment)
              // and was never given back on refund. Since the quota guard compares
              // `totalSold < quota`, every refunded seat shrank the sellable stock
              // for good and eventually locked the event as "full" while real seats
              // sat empty. Releasing the seat here — inside the SAME transaction as
              // the registration delete — keeps stock and registrations consistent:
              // either both are rolled back or both take effect.
              //
              // The release size is the ACTUAL deleteMany count, never a hardcoded 1.
              // That is what makes this safe for the auto-refund path in
              // jobs/processors/webhook.ts ("event_full"): there the atomic
              // reservation matched 0 rows, so totalSold was never incremented and no
              // registration was written under this order — count is 0 and we release
              // nothing instead of double-decrementing a seat this order never held.
              // The orderId scope above is what actually guarantees that: without it
              // a registration the buyer later bought under a DIFFERENT order was
              // counted here and released a seat that order still holds (BL-66).
              if (removed.count > 0) {
                // updateMany with a `totalSold >= n` predicate does the decrement
                // atomically AND floors it at zero: if the counter is somehow lower
                // than what we are about to subtract (inconsistent data, a manual DB
                // fix, a legacy refund processed before this fix), the row simply
                // does not match and totalSold is left untouched rather than driven
                // negative — a negative counter would silently grant infinite seats.
                const released = await tx.event.updateMany({
                  where: { id: item.itemId, totalSold: { gte: removed.count } },
                  data: { totalSold: { decrement: removed.count } },
                });
                if (released.count === 0) {
                  // Not fatal for the refund (access is already revoked), but a human
                  // must reconcile the counter, so surface it instead of failing.
                  logger.warn("BL-58: event seat release skipped — totalSold below deleted registrations", {
                    eventId: item.itemId,
                    orderId: order.id,
                    deletedRegistrations: removed.count,
                  });
                }
              }
            } else if (item.itemType === "ebook") {
              // ebook ACCESS is gated on the order being status:"paid" (see
              // routes/ebooks.ts GET /:slug/file), so flipping to "refunded"
              // below revokes downloads without any extra deletion. Nothing else
              // is undone here on purpose.
              //
              // EBook.totalSold is a GROSS lifetime sales counter: increment-only,
              // never released on refund. Releasing it would require per-line
              // evidence that THIS order's sale was ever counted, and no such
              // evidence exists — an ebook has no per-item join table like
              // eventRegistration, whose deleteMany count is exactly what makes
              // the Event branch above safe. Without that evidence a decrement is
              // not "undoing our own increment", it is subtracting from a shared
              // total: orders paid before the counter existed were never counted,
              // so refunding one of them silently destroys sales belonging to
              // other buyers. A `totalSold >= n` guard does not help — it only
              // stops the number going negative, it cannot tell whose sale it is
              // taking away.
            }
          }

          // Reverse any affiliate commission tied to this order.
          for (const commission of order.commissions ?? []) {
            if (commission.status === "reversed") continue;
            // If already paid out/withdrawn, mark reversed but do NOT touch balances
            // (the money already left) — never drive a balance negative.
            const alreadyPaidOut = commission.status === "paid" || commission.status === "withdrawn";
            await tx.affiliateCommission.update({
              where: { id: commission.id },
              data: { status: "reversed" },
            });
            if (!alreadyPaidOut) {
              const affiliate = await tx.affiliate.findUnique({ where: { id: commission.affiliateId } });
              if (affiliate) {
                const amt = Number(commission.commissionAmt);
                await tx.affiliate.update({
                  where: { id: affiliate.id },
                  data: {
                    balance: Math.max(0, Number(affiliate.balance) - amt),
                    totalEarnings: Math.max(0, Number(affiliate.totalEarnings) - amt),
                  },
                });
              }
            }
          }

          // Restore coupon usage (floor at 0 — never underflow).
          if (order.couponId) {
            const coupon = await tx.coupon.findUnique({ where: { id: order.couponId } });
            if (coupon && coupon.usageCount > 0) {
              await tx.coupon.update({
                where: { id: order.couponId },
                data: { usageCount: { decrement: 1 } },
              });
            }
          }

          await tx.order.update({ where: { id: order.id }, data: { status: "refunded" } });
        });
      }
    }

    return res.json(successResponse(updated));
  } catch (err) {
    next(err);
  }
});

router.get("/admin/refunds", async (req, res, next) => {
  try {
    if (!hasAnyRole(req, ADMIN_ROLES)) throw new AppError(403, "Akses ditolak.");

    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(50, Number(req.query.limit) || 20);
    const skip = (page - 1) * limit;
    const status = req.query.status as string | undefined;

    const where = status ? { status } : {};

    const [refunds, total] = await Promise.all([
      prisma.refund.findMany({
        where,
        include: { user: { select: { name: true, email: true } } },
        orderBy: { requestedAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.refund.count({ where }),
    ]);

    return res.json(successResponse(refunds, { total, page, limit }));
  } catch (err) {
    next(err);
  }
});

export default router;
