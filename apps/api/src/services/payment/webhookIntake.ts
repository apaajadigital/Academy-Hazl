import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { prisma } from "../../db/prisma.js";
import { logger } from "../../lib/logger.js";
import type { WebhookJob } from "../../jobs/types.js";

/**
 * Synchronous intake for DOKU notifications (BL-139, BL-142).
 *
 * Why this runs in the request path instead of on the worker: with Redis
 * enabled, `enqueueWebhook` returns the moment the job is queued, so the route
 * has already answered 200 long before the processor sees the payload. Any
 * check whose verdict must reach DOKU as a non-2xx — so DOKU retries and the
 * notification is not silently consumed — therefore has to happen here.
 *
 * The processor re-checks the amount as well; that is deliberate defence in
 * depth, not duplication. A job can outlive a deploy, and only the processor
 * runs inside the fulfillment transaction.
 */

/** Statuses this integration knows how to act on. Anything else is refused. */
export const HANDLED_DOKU_STATUSES = [
  "SUCCESS",
  "FAILED",
  "EXPIRED",
  "REFUND",
  "CHARGEBACK",
] as const;

export type HandledDokuStatus = (typeof HANDLED_DOKU_STATUSES)[number];

/**
 * Statuses where money actually moved. For these the notification MUST carry an
 * amount: fulfilling (or reversing) a payment whose value we cannot see is the
 * exact hole BL-139 describes. FAILED/EXPIRED move no money, so an absent
 * amount there is not a reason to refuse a legitimate status update.
 */
const MONEY_MOVING_STATUSES: readonly string[] = ["SUCCESS", "REFUND", "CHARGEBACK"];

/**
 * DOKU serialises amounts inconsistently across channels — `299000`,
 * `"299000"`, and `"299000.00"` all occur. Accept each, reject anything that is
 * not a finite number.
 */
const amountLike = z
  .union([z.number(), z.string()])
  .transform((value) => (typeof value === "number" ? value : Number(value.trim())))
  .refine((value) => Number.isFinite(value), { message: "amount is not a number" });

/**
 * Boundary validation (SSOT §9.5). `passthrough` is intentional: unknown fields
 * are kept so the payload stored in `gatewayRaw` is the full notification and
 * not a lossy projection of the fields we happen to read today.
 */
const dokuNotificationSchema = z
  .object({
    order: z
      .object({
        invoice_number: z.string().trim().min(1),
        amount: amountLike.optional(),
      })
      .passthrough(),
    transaction: z
      .object({
        status: z.string().trim().min(1),
        amount: amountLike.optional(),
        date: z.string().optional(),
      })
      .passthrough(),
    channel: z.object({ id: z.string().optional() }).passthrough().optional(),
  })
  .passthrough();

export type WebhookIntakeResult =
  | { outcome: "accepted"; job: WebhookJob }
  | { outcome: "rejected"; httpStatus: number; reason: string };

function reject(httpStatus: number, reason: string): WebhookIntakeResult {
  return { outcome: "rejected", httpStatus, reason };
}

/**
 * Validate a DOKU notification, record it for forensics, and decide whether it
 * may proceed to fulfillment.
 *
 * Returns `accepted` only when the payload parses, names a transaction we
 * created, names a status we handle, and — when money moved — settles exactly
 * the amount the order asks for. Every other path returns a non-2xx status so
 * DOKU redelivers instead of marking the notification as consumed (BL-142).
 */
export async function intakeDokuNotification(rawPayload: unknown): Promise<WebhookIntakeResult> {
  const parsed = dokuNotificationSchema.safeParse(rawPayload);
  if (!parsed.success) {
    // Previously this fell through the `if (invoiceNumber && txStatus)` guard in
    // the route and answered 200, so a malformed notification was dropped
    // without a trace.
    logger.error("doku notification failed validation", {
      issues: parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`),
    });
    return reject(400, "invalid_payload");
  }

  const payload = parsed.data;
  const invoiceNumber = payload.order.invoice_number;
  // Normalised once, here, so every downstream comparison sees the same string.
  const txStatus = payload.transaction.status.trim().toUpperCase();

  if (!(HANDLED_DOKU_STATUSES as readonly string[]).includes(txStatus)) {
    logger.error("doku notification carried an unhandled status", { invoiceNumber, txStatus });
    return reject(422, "unhandled_status");
  }

  const transaction = await prisma.paymentTransaction.findFirst({
    where: { gatewayTxId: invoiceNumber },
    select: { id: true, orderId: true },
  });
  if (!transaction) {
    logger.error("doku notification for an unknown invoice", { invoiceNumber, txStatus });
    return reject(404, "unknown_invoice");
  }

  // Persist the raw notification BEFORE any verdict: `gatewayRaw` has existed on
  // the model since the first migration and was never written anywhere, so a
  // disputed payment had no evidence at all. It is most valuable precisely for
  // the notifications we go on to refuse.
  await prisma.paymentTransaction.update({
    where: { id: transaction.id },
    data: { gatewayRaw: payload as unknown as Prisma.InputJsonValue },
  });

  const order = await prisma.order.findUnique({
    where: { id: transaction.orderId },
    select: { id: true, finalAmount: true },
  });
  if (!order) {
    logger.error("doku notification for a transaction whose order is gone", {
      invoiceNumber,
      txStatus,
      orderId: transaction.orderId,
    });
    return reject(500, "order_missing");
  }

  // DOKU populates the settled value under `transaction` for Checkout
  // notifications; some channels echo it under `order` instead. Both are
  // compared against the same expected value, so accepting either cannot weaken
  // the check.
  const receivedAmount = payload.transaction.amount ?? payload.order.amount ?? null;

  if (receivedAmount === null) {
    if (MONEY_MOVING_STATUSES.includes(txStatus)) {
      logger.error("doku notification moved money without stating an amount", {
        invoiceNumber,
        txStatus,
      });
      return reject(400, "amount_missing");
    }
    return { outcome: "accepted", job: buildJob(payload, invoiceNumber, txStatus, null) };
  }

  // Compare rounded rupiah on both sides. checkout.ts sends
  // `Math.round(finalAmount)` to DOKU while the order keeps the unrounded
  // Decimal, so the two legitimately differ by up to 0.5 — comparing the raw
  // Decimal would reject correct payments.
  const expectedAmount = Math.round(Number(order.finalAmount));
  if (Math.round(receivedAmount) !== expectedAmount) {
    logger.error("doku notification amount does not match the order", {
      invoiceNumber,
      txStatus,
      orderId: order.id,
      expectedAmount,
      receivedAmount,
    });
    return reject(409, "amount_mismatch");
  }

  return { outcome: "accepted", job: buildJob(payload, invoiceNumber, txStatus, receivedAmount) };
}

function buildJob(
  payload: z.infer<typeof dokuNotificationSchema>,
  invoiceNumber: string,
  txStatus: string,
  amount: number | null,
): WebhookJob {
  return {
    invoiceNumber,
    txStatus,
    channelId: payload.channel?.id,
    amount,
  };
}
