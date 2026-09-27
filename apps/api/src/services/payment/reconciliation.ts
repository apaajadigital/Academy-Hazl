import { prisma } from "../../db/prisma.js";
import { logger } from "../../lib/logger.js";
import { getDuitkuOrderStatus } from "./duitkuService.js";
import { processWebhookPayment } from "../../jobs/processors/webhook.js";

/**
 * Payment reconciliation sweep (BL-144, carried over from the DOKU era).
 *
 * `Order.expiredAt` is written at checkout but read by nothing else. Without a
 * sweeper and a status inquiry, an order whose callback never arrived would sit
 * "pending" forever, with nothing in the system ever discovering the gateway
 * actually holding a settled payment.
 *
 * The design rule here: this file decides NOTHING about fulfillment. It finds
 * stale orders, asks Duitku what happened, and hands the answer to
 * `processWebhookPayment` — the SAME processor, same atomic claim, same amount
 * check the callback delivery goes through. A reconciler with its own copy of
 * fulfillment logic is a second implementation that will drift from the first,
 * and it would drift exactly where money is.
 */

/** Duitku statusCode meaning money moved and the order must be fulfilled. */
const SETTLED = new Set(["00"]);

/**
 * Duitku statusCode "02" means failed OR expired — Duitku's status-inquiry
 * endpoint collapses what DOKU distinguished as FAILED vs EXPIRED into one
 * code. Every reconciled Duitku order therefore lands as order.status =
 * "failed", never "expired" — a labeling narrowing, not a fulfillment bug:
 * both already mean "did not pay, no access granted" downstream.
 */
const DEAD = new Set(["02"]);

// No REVERSED set: Duitku's status-inquiry endpoint has no refund/chargeback
// code anywhere in its documented vocabulary. Refunds are a manual ops process
// for now (see docs/BACKLOG.md) — the reconciler cannot learn of one this way.

export type ReconcileSummary = {
  scanned: number;
  /** Duitku said "00" (settled) and fulfillment ran. */
  fulfilled: number;
  /** Duitku said "02" (failed or expired). */
  failed_at_gateway: number;
  /** Duitku still considers the order payable ("01"); deliberately left alone. */
  stillPending: number;
  /** Duitku has no usable answer (404, outage, malformed reply). */
  unknown: number;
  /** No PaymentTransaction to ask about — nothing to inquire with. */
  skipped: number;
  /** The inquiry or the fulfillment threw. */
  failed: number;
};

export type ReconcileOptions = {
  /** Injectable clock so the sweep window is testable without faking timers. */
  now?: Date;
  /** Cap per run so one sweep cannot hammer Duitku with thousands of inquiries. */
  batchSize?: number;
};

const DEFAULT_BATCH_SIZE = 100;

/**
 * Sweep pending orders whose expiry has passed, ask Duitku what really
 * happened, and drive each one to its true state through the callback
 * processor.
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
    failed_at_gateway: 0,
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
    // The invoice is what Duitku knows this order by; without a transaction row
    // there is nothing to ask about. Left pending rather than failed — the
    // missing row is our data problem, not evidence the buyer did not pay.
    const invoiceNumber = order.transactions.find((t) => t.gatewayTxId)?.gatewayTxId;
    if (!invoiceNumber) {
      summary.skipped += 1;
      logger.warn("reconcile: pending order has no gateway transaction", { orderId: order.id });
      continue;
    }

    try {
      const status = await getDuitkuOrderStatus(invoiceNumber);
      if (!status) {
        // No answer is not an answer. Never downgrade an order on silence.
        summary.unknown += 1;
        logger.warn("reconcile: no usable status from Duitku", { orderId: order.id, invoiceNumber });
        continue;
      }

      const txStatus = status.statusCode;

      if (SETTLED.has(txStatus)) {
        logger.error("reconcile: Duitku had a settled payment we never fulfilled", {
          orderId: order.id,
          invoiceNumber,
          amount: status.amount,
        });
        // Straight down the same fulfillment path the callback uses: the
        // atomic claim decides, and the amount Duitku states is re-checked
        // against the order there, so this is not a route around the check.
        await processWebhookPayment({
          invoiceNumber,
          txStatus: "SUCCESS",
          channelId: undefined,
          amount: status.amount,
        });
        summary.fulfilled += 1;
        continue;
      }

      if (DEAD.has(txStatus)) {
        await processWebhookPayment({
          invoiceNumber,
          txStatus: "FAILED",
          channelId: undefined,
          amount: null,
        });
        summary.failed_at_gateway += 1;
        continue;
      }

      // "01" (still processing): past OUR expiredAt, but Duitku still considers
      // the order live. The gateway is the authority on whether the VA can
      // still be paid, and expiring it here would contradict the gateway and
      // strand a buyer who is mid-transfer. Left alone deliberately.
      summary.stillPending += 1;
      logger.info("reconcile: Duitku still considers the order payable", {
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
