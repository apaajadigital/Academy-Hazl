import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { prisma } from "../../db/prisma.js";
import { logger } from "../../lib/logger.js";
import type { WebhookJob } from "../../jobs/types.js";

/**
 * Synchronous intake for Duitku callbacks (ported from the DOKU-era intake,
 * BL-139/BL-142 reasoning unchanged: any check whose verdict must reach Duitku
 * happens here, in the request path, as a non-2xx so Duitku redelivers instead
 * of silently consuming an unhandled notification).
 */

/** Duitku's callback resultCode is binary — no REFUND/CHARGEBACK vocabulary exists
 *  anywhere in Duitku's docs (callback or status-inquiry). Refunds are a manual
 *  ops process for now — see docs/BACKLOG.md. */
export const HANDLED_DUITKU_RESULT_CODES = ["00", "01"] as const;

/** Only a successful ("00") callback carries money that must match the order. */
const MONEY_MOVING_RESULT_CODES: readonly string[] = ["00"];

/** Duitku serialises amounts as a plain string in the callback form body; accept
 *  numeric strings, reject anything else (same tolerance the DOKU intake had). */
const amountLike = z
  .union([z.number(), z.string()])
  .transform((value) => (typeof value === "number" ? value : Number(value.trim())))
  .refine((value) => Number.isFinite(value), { message: "amount is not a finite number" });

const duitkuCallbackSchema = z
  .object({
    merchantCode: z.string().trim().min(1),
    amount: amountLike,
    merchantOrderId: z.string().trim().min(1),
    resultCode: z.enum(HANDLED_DUITKU_RESULT_CODES),
    signature: z.string().trim().min(1),
    reference: z.string().optional(),
    paymentCode: z.string().optional(),
  })
  .passthrough();

export type CallbackIntakeResult =
  | { outcome: "accepted"; job: WebhookJob }
  | { outcome: "rejected"; httpStatus: number; reason: string };

function reject(httpStatus: number, reason: string): CallbackIntakeResult {
  return { outcome: "rejected", httpStatus, reason };
}

/**
 * Validate a Duitku callback, record it for forensics, and decide whether it
 * may proceed to fulfillment. Signature verification happens BEFORE this is
 * called (in the route), so by the time intake runs the notification is
 * already trusted to be from Duitku.
 */
export async function intakeDuitkuCallback(rawPayload: unknown): Promise<CallbackIntakeResult> {
  const parsed = duitkuCallbackSchema.safeParse(rawPayload);
  if (!parsed.success) {
    logger.error("duitku callback failed validation", {
      issues: parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`),
    });
    return reject(400, "invalid_payload");
  }

  const payload = parsed.data;
  const invoiceNumber = payload.merchantOrderId;
  // Normalize to the same internal vocabulary jobs/processors/webhook.ts already
  // speaks (SUCCESS/FAILED), so that file needs zero changes for this migration.
  const txStatus = payload.resultCode === "00" ? "SUCCESS" : "FAILED";

  const transaction = await prisma.paymentTransaction.findUnique({
    where: { gatewayTxId: invoiceNumber },
    select: { id: true, orderId: true },
  });
  if (!transaction) {
    logger.error("duitku callback for an unknown invoice", { invoiceNumber, txStatus });
    return reject(404, "unknown_invoice");
  }

  // Persist the raw notification BEFORE any verdict, same reasoning as the DOKU
  // era: gatewayRaw is most valuable precisely for the notifications refused.
  await prisma.paymentTransaction.update({
    where: { id: transaction.id },
    data: { gatewayRaw: payload as unknown as Prisma.InputJsonValue },
  });

  const order = await prisma.order.findUnique({
    where: { id: transaction.orderId },
    select: { id: true, finalAmount: true },
  });
  if (!order) {
    logger.error("duitku callback for a transaction whose order is gone", {
      invoiceNumber,
      txStatus,
      orderId: transaction.orderId,
    });
    return reject(500, "order_missing");
  }

  const receivedAmount = payload.amount;
  if (MONEY_MOVING_RESULT_CODES.includes(payload.resultCode)) {
    const expectedAmount = Math.round(Number(order.finalAmount));
    if (Math.round(receivedAmount) !== expectedAmount) {
      logger.error("duitku callback amount does not match the order", {
        invoiceNumber,
        txStatus,
        orderId: order.id,
        expectedAmount,
        receivedAmount,
      });
      return reject(409, "amount_mismatch");
    }
  }

  return { outcome: "accepted", job: buildJob(payload, invoiceNumber, txStatus, receivedAmount) };
}

function buildJob(
  payload: z.infer<typeof duitkuCallbackSchema>,
  invoiceNumber: string,
  txStatus: string,
  amount: number | null
): WebhookJob {
  return {
    invoiceNumber,
    txStatus,
    channelId: payload.paymentCode,
    amount,
  };
}
