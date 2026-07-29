import { prisma } from "../../db/prisma.js";
import { logger } from "../../lib/logger.js";
import { processEmail } from "./email.js";
import { notifyPrivateClassWelcome } from "../../services/notification/whatsappService.js";
import type { WebhookJob } from "../types.js";

/** Best-effort notification: a failed email/WA must not fail payment fulfillment. */
async function safeNotify(fn: () => Promise<void>): Promise<void> {
  try {
    await fn();
  } catch (err) {
    logger.warn("webhook notification failed", { err: String(err) });
  }
}

/**
 * DOKU payment fulfillment (TASK-022). Extracted from the webhook route so it can
 * run on the worker. Idempotent: a SUCCESS for an already-paid order returns early,
 * which prevents duplicate enrollments, affiliate commissions, and notifications
 * when DOKU retries the same webhook (fixes a prior double-counting bug).
 */
export async function processWebhookPayment(job: WebhookJob): Promise<void> {
  const { invoiceNumber, txStatus, channelId } = job;

  const transaction = await prisma.paymentTransaction.findFirst({
    where: { gatewayTxId: invoiceNumber },
  });
  if (!transaction) return;

  const order = await prisma.order.findUnique({
    where: { id: transaction.orderId },
    include: {
      user: { select: { name: true, email: true, profile: { select: { phone: true } } } },
      items: true,
    },
  });
  if (!order) return;

  if (txStatus === "SUCCESS") {
    // Idempotency guard — already fulfilled, nothing more to do. "refund_pending"
    // is a terminal fulfillment outcome too (event was full → auto-refund, Batch8
    // D2); re-processing it would try to create a second unique Refund and loop.
    if (order.status === "paid" || order.status === "refund_pending") return;

    // A cancelled order must never be flipped to paid: the user already released
    // the coupon slot and abandoned the purchase, so granting fulfillment here
    // would leave coupon/commission accounting inconsistent. The money DID move
    // though, so flag it for a human instead of throwing (a throw would just
    // retry-loop the job without fixing anything).
    if (order.status === "cancelled") {
      logger.warn("payment received for a cancelled order — needs manual review/refund", {
        orderId: order.id,
        invoiceNumber,
      });
      return;
    }

    // Batch8 D2: tracks whether an event line item was full and got auto-refunded,
    // so we send the buyer a refund notice instead of a payment-success email.
    let eventFull = false;

    // BL-63: e-tickets for the seats actually confirmed in this transaction.
    // Collected inside the transaction but SENT after it commits — an email must
    // never be sent for a seat whose transaction later rolls back.
    const confirmedTickets: Array<{
      eventTitle: string;
      ticketCode: string;
      startDate: Date | null;
      location: string | null;
      venue: string | null;
      eventType: string | null;
    }> = [];

    // M-webhook: flip the order to paid and run every fulfillment side-effect in
    // one atomic transaction. If any step fails the whole payment fulfillment
    // rolls back instead of leaving an order half-fulfilled (e.g. marked paid but
    // without enrollment/commission). Combined with the guard above this stays
    // idempotent across DOKU webhook retries.
    await prisma.$transaction(async (tx) => {
      await tx.order.update({
        where: { id: order.id },
        data: { status: "paid", paidAt: new Date(), paymentMethod: channelId ?? "doku" },
      });
      await tx.paymentTransaction.update({
        where: { id: transaction.id },
        data: { status: "success" },
      });

      // Grant access to purchased items.
      for (const item of order.items) {
        if (item.itemType === "course") {
          await tx.courseEnrollment.upsert({
            where: { courseId_userId: { courseId: item.itemId, userId: order.userId } },
            create: { courseId: item.itemId, userId: order.userId },
            update: {},
          });
        } else if (item.itemType === "event") {
          // Batch8 D2 (event overselling / TOCTOU): reserve the seat ATOMICALLY at
          // fulfillment. The updateMany only increments when totalSold is still
          // below quota (quota=null → unlimited), so concurrent paid webhooks can
          // never push totalSold past quota.
          const ev = await tx.event.findUnique({
            where: { id: item.itemId },
            // BL-63: schedule/venue selected here too so the e-ticket email needs
            // no extra query after the transaction commits.
            select: { quota: true, title: true, startDate: true, location: true, venue: true, type: true },
          });
          const reserved = await tx.event.updateMany({
            where: { id: item.itemId, OR: [{ quota: null }, { totalSold: { lt: ev?.quota ?? 0 } }] },
            data: { totalSold: { increment: 1 } },
          });
          if (reserved.count === 0) {
            // Event full — auto-refund + notify (D2) instead of overselling.
            // BL-58: reserved.count === 0 means the quota-guarded updateMany matched
            // no row, so totalSold was NOT incremented and no eventRegistration is
            // written below. This branch therefore owes no seat back — the refund
            // release in routes/orders.ts is driven by the eventRegistration
            // deleteMany count (0 here), so approving this auto-refund cannot
            // double-decrement a seat that was never taken. Do NOT add a decrement.
            await tx.refund.create({
              data: {
                orderId: order.id,
                userId: order.userId,
                reason: "event_full",
                amount: order.finalAmount,
                status: "pending",
              },
            });
            await tx.order.update({ where: { id: order.id }, data: { status: "refund_pending" } });
            eventFull = true;
          } else {
            const registration = await tx.eventRegistration.upsert({
              where: { eventId_userId: { eventId: item.itemId, userId: order.userId } },
              create: { eventId: item.itemId, userId: order.userId, orderId: order.id, status: "confirmed" },
              update: { status: "confirmed", orderId: order.id },
            });
            confirmedTickets.push({
              eventTitle: ev?.title ?? item.itemTitle ?? "Event",
              ticketCode: registration.ticketCode,
              startDate: ev?.startDate ?? null,
              location: ev?.location ?? null,
              venue: ev?.venue ?? null,
              eventType: ev?.type ?? null,
            });
          }
        }
      }

      // M-coupon: consume coupon usage only on payment success, not at pending
      // order creation, so abandoned/failed checkouts never burn a coupon slot.
      if (order.couponId) {
        await tx.coupon.update({
          where: { id: order.couponId },
          data: { usageCount: { increment: 1 } },
        });
      }

      // Affiliate commission (now safe from double-count thanks to the guard above).
      if (order.referralCode) {
        const affiliate = await tx.affiliate.findFirst({
          where: { code: order.referralCode, status: "active" },
        });
        if (affiliate) {
          const commissionPct = Number(affiliate.commissionRate);
          const commissionAmt = (Number(order.finalAmount) * commissionPct) / 100;
          await tx.affiliateCommission.create({
            data: {
              affiliateId: affiliate.id,
              orderId: order.id,
              referredUserId: order.userId,
              commissionPct: affiliate.commissionRate,
              grossAmount: order.finalAmount,
              commissionAmt,
              status: "pending",
            },
          });
          await tx.affiliate.update({
            where: { id: affiliate.id },
            data: {
              totalConversions: { increment: 1 },
              totalEarnings: { increment: commissionAmt },
              balance: { increment: commissionAmt },
            },
          });
        }
      }
    });

    // Notifications — best-effort so they never fail fulfillment.
    const courseName = order.items[0]?.itemTitle ?? "produk";

    // Batch8 D2: if the event was full and we auto-refunded, tell the buyer about
    // the refund rather than sending a (misleading) payment-success email.
    if (eventFull) {
      await safeNotify(() =>
        processEmail({
          type: "event-full-refund",
          to: order.user.email,
          name: order.user.name,
          orderId: order.id,
          eventName: courseName,
        }),
      );
      return;
    }

    await safeNotify(() =>
      processEmail({
        type: "payment-success",
        to: order.user.email,
        name: order.user.name,
        orderId: order.id,
        courseName,
        amount: Number(order.finalAmount),
      }),
    );
    await safeNotify(() =>
      processEmail({ type: "order-invoice", to: order.user.email, name: order.user.name, orderId: order.id }),
    );
    const phone = order.user.profile?.phone;
    if (phone) {
      await safeNotify(() =>
        processEmail({ type: "wa-payment-success", phone, name: order.user.name, courseName }),
      );
    }

    // BL-63: e-ticket per confirmed event seat. Best-effort like every other
    // notification here — fulfillment is already committed, so a send failure must
    // not fail (and thus retry) the webhook. The `eventFull` branch returned above,
    // so a refunded buyer can never receive a confirmation.
    for (const ticket of confirmedTickets) {
      await safeNotify(() =>
        processEmail({
          type: "event-registration-confirmed",
          to: order.user.email,
          name: order.user.name,
          orderId: order.id,
          ...ticket,
        }),
      );
    }

    // Private Class onboarding: every paid private_class course item gets a
    // welcome email (+ WA when a phone is known). One findMany covers all course
    // items of the order (no per-item queries), and the whole block sits inside
    // safeNotify — the fulfillment transaction is already committed, so a lookup
    // or send failure must never fail (and thus retry) the webhook. Regular
    // courses are filtered out by the `format` predicate and keep the existing
    // notifications above unchanged.
    const courseItemIds = order.items.filter((i) => i.itemType === "course").map((i) => i.itemId);
    if (courseItemIds.length > 0) {
      await safeNotify(async () => {
        const privateClassCourses = await prisma.course.findMany({
          where: { id: { in: courseItemIds }, format: "private_class" },
          select: { title: true, waGroupLink: true, onboardingContact: true, liveSchedule: true },
        });
        for (const course of privateClassCourses) {
          await safeNotify(() =>
            processEmail({
              type: "private-class-welcome",
              to: order.user.email,
              name: order.user.name,
              orderId: order.id,
              courseTitle: course.title,
              waGroupLink: course.waGroupLink,
              onboardingContact: course.onboardingContact,
              liveSchedule: course.liveSchedule,
            }),
          );
          if (phone) {
            await safeNotify(() =>
              notifyPrivateClassWelcome(phone, order.user.name, course.title, course.waGroupLink),
            );
          }
        }
      });
    }
  } else if (txStatus === "FAILED" || txStatus === "EXPIRED") {
    // M-webhook: never overwrite an already-paid order. A late FAILED/EXPIRED
    // webhook (or one racing a SUCCESS) must not revoke a completed purchase.
    if (order.status === "paid") return;

    await prisma.order.update({
      where: { id: order.id },
      data: { status: txStatus === "FAILED" ? "failed" : "expired" },
    });
    await prisma.paymentTransaction.update({
      where: { id: transaction.id },
      data: { status: "failed" },
    });
  }
}
