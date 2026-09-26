import type { Prisma } from "@prisma/client";
import { prisma } from "../../db/prisma.js";
import { logger } from "../../lib/logger.js";
import { processEmail } from "./email.js";
import { notifyPrivateClassWelcome } from "../../services/notification/whatsappService.js";
import { claimCouponUsage } from "../../services/coupon/couponService.js";
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
 * Park money we owe back in the pending-refund queue (BL-142).
 *
 * `upsert` rather than `create`: Refund.orderId is unique, so a redelivered DOKU
 * notification would otherwise crash on the unique constraint and retry forever.
 * `update: {}` means the FIRST reason recorded for an order wins — a later
 * notification must not silently rewrite the history of why we owe the money.
 */
async function recordPendingRefund(input: {
  orderId: string;
  userId: string;
  amount: Prisma.Decimal | number;
  reason: string;
}): Promise<void> {
  await prisma.refund.upsert({
    where: { orderId: input.orderId },
    create: {
      orderId: input.orderId,
      userId: input.userId,
      amount: input.amount,
      reason: input.reason,
      status: "pending",
    },
    update: {},
  });
}

/**
 * DOKU payment fulfillment (TASK-022). Extracted from the webhook route so it can
 * run on the worker. Idempotent: a SUCCESS for an already-fulfilled order returns
 * early, and — for deliveries that race past that read — the order is claimed
 * atomically inside the transaction, so enrollments, sales counters, seats,
 * affiliate commissions and notifications happen at most once per order.
 */
export async function processWebhookPayment(job: WebhookJob): Promise<void> {
  const { invoiceNumber, channelId } = job;

  // BL-142: normalise here as well as in the intake service. The worker can pick
  // up a job enqueued by an older deploy, and this function is the last place
  // that decides what a status means.
  const txStatus = String(job.txStatus).trim().toUpperCase();

  // BL-140: findUnique, not findFirst. The column is unique now, and findFirst
  // is what turned a colliding invoice number into "some row, who knows which"
  // instead of an error — a payment silently fulfilling the wrong order.
  const transaction = await prisma.paymentTransaction.findUnique({
    where: { gatewayTxId: invoiceNumber },
  });
  if (!transaction) {
    // BL-142: this used to `return`, which the route reported as success — a
    // notification for an invoice we have no record of vanished without a trace.
    // Throwing lets BullMQ retry and, once retries are exhausted, keeps the job
    // in the dead-letter set where it can be inspected.
    logger.error("webhook job for an unknown invoice", { invoiceNumber, txStatus });
    throw new Error(`webhook: no payment transaction for invoice ${invoiceNumber}`);
  }

  const order = await prisma.order.findUnique({
    where: { id: transaction.orderId },
    include: {
      user: { select: { name: true, email: true, profile: { select: { phone: true } } } },
      items: true,
    },
  });
  if (!order) {
    logger.error("webhook job for a transaction whose order is gone", {
      invoiceNumber,
      txStatus,
      orderId: transaction.orderId,
    });
    throw new Error(`webhook: order ${transaction.orderId} not found`);
  }

  // BL-139: the intake service already compared the settled amount before this
  // job was queued. Re-checking here is deliberate defence in depth — the intake
  // read and this one are separate transactions, and a job can outlive the
  // deploy that created it. Rounded on both sides because checkout.ts sends
  // `Math.round(finalAmount)` to DOKU while the order keeps the raw Decimal.
  if (job.amount != null) {
    const expectedAmount = Math.round(Number(order.finalAmount));
    if (Math.round(job.amount) !== expectedAmount) {
      logger.error("webhook job amount does not match the order", {
        invoiceNumber,
        txStatus,
        orderId: order.id,
        expectedAmount,
        receivedAmount: job.amount,
      });
      throw new Error(`webhook: amount mismatch on order ${order.id}`);
    }
  }

  if (txStatus === "SUCCESS") {
    // Fast-path idempotency check — already fulfilled, nothing more to do.
    // "refund_pending" is a terminal fulfillment outcome too (event was full →
    // auto-refund, Batch8 D2); re-processing it would try to create a second
    // unique Refund and loop. This read is outside any transaction, so it is an
    // optimisation, not the guarantee: the atomic claim below is what actually
    // serialises concurrent deliveries.
    if (order.status === "paid" || order.status === "refund_pending") return;

    // A cancelled order must never be flipped to paid: the user already released
    // the coupon slot and abandoned the purchase, so granting fulfillment here
    // would leave coupon/commission accounting inconsistent. The money DID move
    // though, so it must land somewhere a human actually looks.
    //
    // BL-142: this used to be a `logger.warn` and nothing else. A warning in a
    // log stream is not an obligation to refund anybody — the buyer's money sat
    // with us with no record that we owed it back. It now writes a pending
    // Refund, which is the row the admin approval flow in routes/orders.ts is
    // driven by, so the money enters the same queue as every other refund.
    if (order.status === "cancelled") {
      await recordPendingRefund({
        orderId: order.id,
        userId: order.userId,
        amount: order.finalAmount,
        reason: "paid_after_cancel",
      });
      logger.error("payment received for a cancelled order — pending refund created", {
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

    // Set to false when the atomic claim below loses to a concurrent delivery,
    // so the post-transaction notifications are skipped too.
    let fulfillmentClaimed = true;

    // M-webhook: flip the order to paid and run every fulfillment side-effect in
    // one atomic transaction. If any step fails the whole payment fulfillment
    // rolls back instead of leaving an order half-fulfilled (e.g. marked paid but
    // without enrollment/commission).
    await prisma.$transaction(async (tx) => {
      // The status read above is only advisory: it happens OUTSIDE this
      // transaction, so two concurrent deliveries of the same DOKU webhook can
      // both observe "pending" and both get here. BullMQ's jobId dedup does not
      // close that window either — jobs/queues.ts `dispatch()` runs the processor
      // INLINE, with no dedup at all, whenever Redis is unavailable.
      //
      // updateMany with a status predicate turns the flip into an atomic CLAIM:
      // the database picks exactly one winner, and every side-effect below
      // (counters, seats, commissions) therefore runs at most once per order.
      // The excluded statuses are the ones where fulfillment already happened or
      // must never happen; "failed"/"expired" are deliberately NOT excluded, so a
      // late payment on an expired order still fulfills rather than taking the
      // buyer's money without granting access.
      const claimed = await tx.order.updateMany({
        where: { id: order.id, status: { notIn: ["paid", "refund_pending", "refunded", "cancelled"] } },
        data: { status: "paid", paidAt: new Date(), paymentMethod: channelId ?? "duitku" },
      });
      if (claimed.count === 0) {
        // Another delivery already fulfilled (or terminated) this order.
        fulfillmentClaimed = false;
        return;
      }
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
        } else if (item.itemType === "ebook") {
          // BL-97: EBook.totalSold was declared but never written — every ebook
          // read as 0 sales forever. Count the sale here, inside the SAME
          // transaction that flips the order to "paid" (which is what grants
          // download access in routes/ebooks.ts), so the counter and the access
          // grant can only ever commit or roll back together.
          //
          // A replayed DOKU delivery cannot double-count: this loop is only
          // reached by the delivery that WON the atomic claim above, and the
          // claim excludes an order that is already "paid".
          //
          // The counter is gross and increment-only — refunds deliberately do not
          // release it (see the ebook branch of the refund handler in
          // routes/orders.ts for why no correct release exists).
          //
          // Increment by the line quantity, not a hardcoded 1: checkout writes
          // quantity 1 today, but reading the column keeps the counter honest if
          // a multi-copy purchase ever lands.
          //
          // No quota guard (an ebook has unlimited stock) and updateMany rather
          // than update: a since-deleted ebook must not abort — and thereby roll
          // back — a payment fulfillment that already took the buyer's money.
          await tx.eBook.updateMany({
            where: { id: item.itemId },
            data: { totalSold: { increment: item.quantity } },
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
      //
      // BL-143(b): the claim is guarded (usageCount < usageLimit, evaluated
      // inside the UPDATE) because validateCoupon's limit check happens when the
      // pending order is created and cannot bind under concurrency — every buyer
      // in a burst passes it before any of them has consumed a slot.
      //
      // Losing the guard does NOT stop fulfillment. The buyer has already paid,
      // at a price that already had the discount applied; withholding access now
      // would repeat BL-138 with a different trigger. So we fulfil, leave the
      // counter truthful (never above the limit), and make the overrun loud —
      // it is a business decision to make about a discount already granted, not
      // a condition this processor may resolve on its own.
      if (order.couponId) {
        const claimed = await claimCouponUsage(tx, order.couponId);
        if (!claimed) {
          logger.error("coupon usage limit exceeded — order fulfilled anyway, discount already granted", {
            couponId: order.couponId,
            orderId: order.id,
            invoiceNumber,
          });
        }
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

    // Lost the claim → another delivery owns this order's fulfillment and has
    // already sent (or will send) the buyer's emails. Nothing was written by this
    // run, so there is nothing to notify about.
    if (!fulfillmentClaimed) return;

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
    // BL-138: this branch used to guard with the status read at the top of the
    // function — taken OUTSIDE any transaction — and then write unconditionally.
    // The SUCCESS branch was hardened with an atomic claim precisely because
    // that read goes stale; this one never was, and it is the branch that can
    // take access away.
    //
    // The killing interleaving is ordinary, not exotic: queues.ts puts txStatus
    // into the jobId, so SUCCESS and EXPIRED are two DIFFERENT jobs that run
    // concurrently (worker concurrency 5). EXPIRED reads "pending", SUCCESS
    // claims and fulfills, EXPIRED then writes "expired" over it. The buyer has
    // paid, the coupon is burnt and the commission booked, but ebook downloads
    // (routes/ebooks.ts) and the right to review (routes/reviews.ts) gate on
    // `status === "paid"` — so the purchase silently loses its access.
    //
    // Mirroring the SUCCESS claim closes it: the database decides, not a stale
    // read. `refund_pending` is in the excluded set for a separate reason — the
    // event-full auto-refund above parks the order there and leaves a Refund row
    // that drives admin approval (routes/orders.ts). Overwriting that status
    // orphans the Refund row and strands the approval flow.
    const claimed = await prisma.order.updateMany({
      where: {
        id: order.id,
        status: { notIn: ["paid", "refund_pending", "refunded", "cancelled"] },
      },
      data: { status: txStatus === "FAILED" ? "failed" : "expired" },
    });
    if (claimed.count === 0) {
      // The order reached a state this notification must not disturb. Nothing
      // was written — including the transaction row below, which must follow the
      // same verdict: flagging the payment "failed" while the order is paid
      // would hand reconciliation (Wave 1.5) a contradiction that looks exactly
      // like a real anomaly.
      logger.info("terminal webhook status refused — order already settled", {
        invoiceNumber,
        txStatus,
        orderId: order.id,
      });
      return;
    }
    await prisma.paymentTransaction.update({
      where: { id: transaction.id },
      data: { status: "failed" },
    });
  } else if (txStatus === "REFUND" || txStatus === "CHARGEBACK") {
    // BL-142: a gateway-initiated reversal used to fall off the end of this
    // function in complete silence — the money went back to the buyer while the
    // order stayed "paid" and access stayed granted.
    //
    // Scope note (BL-149): this records the reversal as a pending Refund so it
    // enters the existing admin approval flow, which is what actually revokes
    // enrollments and reverses the affiliate commission (routes/orders.ts).
    // Doing that automatically, without a human, is a larger change than this PR
    // — see BL-149 in docs/BACKLOG.md. Until then a reversal is visible and
    // actionable, but access is revoked only once an admin approves.
    await recordPendingRefund({
      orderId: order.id,
      userId: order.userId,
      amount: order.finalAmount,
      reason: txStatus === "REFUND" ? "gateway_refund" : "gateway_chargeback",
    });
    logger.error("gateway-initiated reversal received — pending refund created", {
      orderId: order.id,
      invoiceNumber,
      txStatus,
    });
  } else {
    // BL-142: the explicit default. Anything that reaches here is a status the
    // intake service accepted but this function has no branch for, which is a
    // bug in one of the two — so it must be loud and it must be retried, never
    // acknowledged as processed.
    logger.error("webhook job carried an unhandled status", {
      orderId: order.id,
      invoiceNumber,
      txStatus,
    });
    throw new Error(`webhook: unhandled status ${txStatus} for order ${order.id}`);
  }
}
