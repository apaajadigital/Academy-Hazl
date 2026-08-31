import { prisma } from "../../db/prisma.js";
import { logger } from "../../lib/logger.js";
import { getDokuOrderStatus } from "./dokuService.js";
import { processWebhookPayment } from "../../jobs/processors/webhook.js";

/**
 * Payment reconciliation sweep (BL-144).
 *
 * `Order.expiredAt` was written at checkout and read by nothing — `grep
 * expiredAt apps/api/src` returned exactly one line. With no sweeper and no
 * status inquiry, every failure mode in Wave 1.1–1.4 was terminal: an order
 * whose notification never arrived sat "pending" forever, the buyer stared at
 * "menunggu pembayaran" indefinitely, and nothing in the system would ever
 * discover that DOKU was holding a settled payment. Confirmed in the wild:
 * invoice JA-FEF61033, paid 26 Aug 2026, still pending on 27 Aug while DOKU's
 * own status endpoint reported SUCCESS.
 *
 * The design rule here is that this file decides NOTHING about fulfillment. It
 * finds stale orders, asks DOKU what happened, and hands the answer to
 * `processWebhookPayment` — the same processor, the same atomic claim, the same
 * amount check a webhook delivery goes through. A reconciler with its own copy
 * of the fulfillment logic is a second implementation that will drift from the
 * first, and it would drift exactly where money is.
 */

/** DOKU statuses that mean the money moved and the order must be fulfilled. */
const SETTLED = new Set(["SUCCESS"]);

/** DOKU statuses that mean this order will never be paid. */
const DEAD = new Set(["EXPIRED", "FAILED", "TIMEOUT"]);

/** DOKU statuses that mean the money came back. */
const REVERSED = new Set(["REFUNDED"]);

export type ReconcileSummary = {
  scanned: number;
  /** DOKU said SUCCESS and fulfillment ran. */
  fulfilled: number;
  /** DOKU said EXPIRED/TIMEOUT — order marked expired. */
  expired: number;
  /** DOKU said FAILED — order marked failed. */
  failed_at_gateway: number;
  /** DOKU said REFUNDED — routed to the pending-refund queue. */
  reversed: number;
  /** DOKU still considers the order payable; deliberately left alone. */
  stillPending: number;
  /** DOKU has no usable answer (404, outage, malformed reply). */
  unknown: number;
  /** No PaymentTransaction to ask about — nothing to inquire with. */
  skipped: number;
  /** The inquiry or the fulfillment threw. */
  failed: number;
};

export type ReconcileOptions = {
  /** Injectable clock so the sweep window is testable without faking timers. */
  now?: Date;
  /** Cap per run so one sweep cannot hammer DOKU with thousands of inquiries. */
  batchSize?: number;
};

const DEFAULT_BATCH_SIZE = 100;

/**
 * Sweep pending orders whose expiry has passed, ask DOKU what really happened,
 * and drive each one to its true state through the webhook processor.
 *
 * Every order is handled inside its own try/catch: one unreachable inquiry or
 * one throwing fulfillment must not abandon the rest of the batch.
 */
export async function reconcilePendingOrders(
  options: ReconcileOptions = {}
): Promise<ReconcileSummary> {
  const now = options.now ?? new Date();
  const batchSize = options.batchSize ?? DEFAULT_BATCH_SIZE;

  const summary: ReconcileSummary = {
    scanned: 0,
    fulfilled: 0,
    expired: 0,
    failed_at_gateway: 0,
    reversed: 0,
    stillPending: 0,
    unknown: 0,
    skipped: 0,
    failed: 0,
  };

  const candidates = await prisma.order.findMany({
    where: { status: "pending", expiredAt: { lt: now } },
    // Oldest first: the orders that have been stuck longest are the ones a
    // buyer has been staring at, and a capped batch must not starve them.
    orderBy: { expiredAt: "asc" },
    take: batchSize,
    select: {
      id: true,
      expiredAt: true,
      transactions: { select: { id: true, gatewayTxId: true }, orderBy: { createdAt: "desc" } },
    },
  });

  summary.scanned = candidates.length;
  if (candidates.length === 0) return summary;

  for (const order of candidates) {
    // The invoice is what DOKU knows this order by; without a transaction row
    // there is nothing to ask about. Left pending rather than expired — the
    // missing row is our data problem, not evidence the buyer did not pay.
    const invoiceNumber = order.transactions.find((t) => t.gatewayTxId)?.gatewayTxId;
    if (!invoiceNumber) {
      summary.skipped += 1;
      logger.warn("reconcile: pending order has no gateway transaction", { orderId: order.id });
      continue;
    }

    try {
      const status = await getDokuOrderStatus(invoiceNumber);
      if (!status) {
        // No answer is not an answer. Never downgrade an order on silence.
        summary.unknown += 1;
        logger.warn("reconcile: no usable status from DOKU", { orderId: order.id, invoiceNumber });
        continue;
      }

      const txStatus = status.transactionStatus;

      if (SETTLED.has(txStatus)) {
        logger.error("reconcile: DOKU had a settled payment we never fulfilled", {
          orderId: order.id,
          invoiceNumber,
          amount: status.amount,
          transactionDate: status.transactionDate,
        });
        // Straight down the webhook path: the atomic claim decides, and the
        // amount DOKU states is re-checked against the order there (BL-139),
        // so this route into fulfillment is not a route around the check.
        await processWebhookPayment({
          invoiceNumber,
          txStatus: "SUCCESS",
          channelId: status.channelId ?? undefined,
          amount: status.amount,
        });
        summary.fulfilled += 1;
        continue;
      }

      if (DEAD.has(txStatus)) {
        // FAILED and EXPIRED/TIMEOUT are distinct outcomes for the buyer, so
        // they are not collapsed. Both land on the Wave 1.2 predicate claim, so
        // an order that got paid in the meantime cannot be downgraded here.
        await processWebhookPayment({
          invoiceNumber,
          txStatus: txStatus === "FAILED" ? "FAILED" : "EXPIRED",
          channelId: status.channelId ?? undefined,
          amount: null,
        });
        if (txStatus === "FAILED") summary.failed_at_gateway += 1;
        else summary.expired += 1;
        continue;
      }

      if (REVERSED.has(txStatus)) {
        await processWebhookPayment({
          invoiceNumber,
          txStatus: "REFUND",
          channelId: status.channelId ?? undefined,
          amount: status.amount,
        });
        summary.reversed += 1;
        continue;
      }

      // PENDING and REDIRECT: past OUR expiredAt, but DOKU still considers the
      // order live. The gateway is the authority on whether the VA can still be
      // paid, and expiring it here would contradict the gateway and strand a
      // buyer who is mid-transfer. Left alone deliberately — see BL-151 for the
      // orders that stay in this state indefinitely.
      summary.stillPending += 1;
      logger.info("reconcile: DOKU still considers the order payable", {
        orderId: order.id,
        invoiceNumber,
        txStatus,
      });
    } catch (err) {
      summary.failed += 1;
      logger.error("reconcile: order could not be reconciled", {
        orderId: order.id,
        invoiceNumber,
        err: err instanceof Error ? err.message : String(err),
      });
    }
  }

  logger.info("reconcile: sweep finished", { ...summary });
  return summary;
}
