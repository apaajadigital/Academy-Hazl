import { env } from "../../config/env.js";
import { reconcilePendingOrders } from "../../services/payment/reconciliation.js";
import type { ReconcileJob } from "../types.js";

/**
 * Worker entry point for the payment reconciliation sweep (BL-144).
 *
 * Deliberately thin: the schedule belongs to the queue layer and the decisions
 * belong to the service, so this only supplies the batch cap. A throw here marks
 * the repeatable run failed and BullMQ fires the next one on schedule — the
 * sweep is idempotent, so a missed run costs latency, not correctness.
 */
export async function processReconcile(_job: ReconcileJob): Promise<void> {
  await reconcilePendingOrders({ batchSize: env.RECONCILE_BATCH_SIZE });
}
