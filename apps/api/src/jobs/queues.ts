import type { Queue, ConnectionOptions } from "bullmq";
import { getRedisConnection, isQueueEnabled } from "./connection.js";
import { logger } from "../lib/logger.js";
import { QUEUE } from "./types.js";
import type { EmailJob, CertificateJob, SearchIndexJob, WebhookJob } from "./types.js";
import { processEmail } from "./processors/email.js";
import { processCertificate } from "./processors/certificate.js";
import { processSearchIndex } from "./processors/searchIndex.js";
import { processWebhookPayment } from "./processors/webhook.js";

/**
 * Producer layer (TASK-022). bullmq is imported LAZILY and queues are created on
 * first use, only when REDIS_URL is set. In dev/test the queue is disabled and
 * `dispatch` runs the processor INLINE — identical to the pre-queue behavior, and
 * the heavy redis/bullmq stack never loads. In production, jobs go to Redis and
 * are consumed by apps/api/src/worker.ts.
 */

const defaultJobOptions = {
  attempts: 5,
  backoff: { type: "exponential" as const, delay: 2000 },
  removeOnComplete: { count: 200 },
  // Keep failed jobs so they can be inspected/replayed (dead-letter pattern).
  removeOnFail: { count: 5000 },
};

type QueueSet = Record<string, Queue>;
let queueSetPromise: Promise<QueueSet> | null = null;

async function initQueues(): Promise<QueueSet> {
  const connection = await getRedisConnection();
  if (!connection) return {};
  const { Queue } = await import("bullmq");
  const make = (name: string): Queue =>
    new Queue(name, {
      // BullMQ bundles its own ioredis types; the runtime instance is compatible.
      connection: connection as unknown as ConnectionOptions,
      defaultJobOptions,
    });
  return {
    [QUEUE.EMAIL]: make(QUEUE.EMAIL),
    [QUEUE.CERTIFICATE]: make(QUEUE.CERTIFICATE),
    [QUEUE.SEARCH_INDEX]: make(QUEUE.SEARCH_INDEX),
    [QUEUE.WEBHOOK]: make(QUEUE.WEBHOOK),
    [QUEUE.RECONCILE]: make(QUEUE.RECONCILE),
  };
}

async function getQueue(name: string): Promise<Queue | null> {
  if (!isQueueEnabled()) return null;
  if (!queueSetPromise) queueSetPromise = initQueues();
  const set = await queueSetPromise;
  return set[name] ?? null;
}

type DispatchOpts<T> = {
  queueName: string;
  processor: (data: T) => Promise<void>;
  jobName: string;
  data: T;
  jobId?: string;
  /**
   * Remove a same-id job that is already in the failed set before enqueueing
   * (BL-141). `queue.add` is a no-op when a job with that id still exists in ANY
   * state, so without this a permanently-failed job blocks every later delivery.
   */
  reclaimFailedJobId?: boolean;
  /** Best-effort jobs swallow errors on the inline path (fire-and-forget). */
  bestEffort: boolean;
};

/**
 * Drop a job that is sitting in the failed set under `jobId` so a retry can be
 * enqueued under the same id (BL-141).
 *
 * Only `failed` is reclaimed. A job that is still waiting, active, or delayed is
 * a delivery already in flight and must be left alone — removing it would drop
 * work rather than unblock it.
 *
 * Never throws: this runs on the notification path, and failing to tidy up the
 * dead-letter must not cost us the enqueue that follows.
 */
async function reclaimFailedJob(queue: Queue, jobId: string, queueName: string): Promise<void> {
  try {
    const existing = await queue.getJob(jobId);
    if (!existing) return;
    if ((await existing.getState()) !== "failed") return;
    await existing.remove();
    logger.warn("reclaimed a failed job so the retry can be queued", { queue: queueName, jobId });
  } catch (err) {
    logger.warn("could not reclaim failed job", { queue: queueName, jobId, err: String(err) });
  }
}

async function dispatch<T>(opts: DispatchOpts<T>): Promise<void> {
  const { queueName, processor, jobName, data, jobId, reclaimFailedJobId, bestEffort } = opts;

  const queue = await getQueue(queueName);
  if (queue) {
    try {
      if (jobId && reclaimFailedJobId) await reclaimFailedJob(queue, jobId, queueName);
      await queue.add(jobName, data, jobId ? { jobId } : undefined);
      return;
    } catch (err) {
      // Redis unreachable at enqueue time — degrade to inline so the side-effect
      // is not silently lost during a Redis hiccup.
      logger.warn("queue.add failed, running inline", { queue: queueName, err: String(err) });
    }
  }

  if (bestEffort) {
    try {
      await processor(data);
    } catch (err) {
      logger.warn("inline job failed (best-effort)", { queue: queueName, err: String(err) });
    }
  } else {
    await processor(data);
  }
}

// ─── Public enqueue API (used by routes/services) ─────────────────────────────

export function enqueueEmail(data: EmailJob): Promise<void> {
  return dispatch({ queueName: QUEUE.EMAIL, processor: processEmail, jobName: data.type, data, bestEffort: true });
}

export function enqueueCertificate(data: CertificateJob): Promise<void> {
  return dispatch({
    queueName: QUEUE.CERTIFICATE,
    processor: processCertificate,
    jobName: data.type,
    data,
    // Idempotent per (user, course) so retries/duplicates collapse to one job.
    jobId: `cert:${data.userId}:${data.courseId}`,
    bestEffort: true,
  });
}

export function enqueueSearchIndex(data: SearchIndexJob): Promise<void> {
  const jobId = data.type === "index-course" ? `index:${data.course.id}` : `delete:${data.courseId}`;
  return dispatch({
    queueName: QUEUE.SEARCH_INDEX,
    processor: processSearchIndex,
    jobName: data.type,
    data,
    jobId,
    bestEffort: true,
  });
}

export function enqueueWebhook(data: WebhookJob): Promise<void> {
  return dispatch({
    queueName: QUEUE.WEBHOOK,
    processor: processWebhookPayment,
    jobName: "doku-payment",
    data,
    // BL-141: the jobId used to be just invoice+status, which made every retry of
    // a given notification collapse onto one job. Combined with the dead-letter
    // retention below, a job that exhausted its attempts stayed in the failed set
    // forever and silently swallowed every subsequent DOKU delivery. DOKU's
    // Request-Id differs per delivery, so retries now get their own job.
    // Idempotency does NOT depend on this: the processor claims the order
    // atomically, so duplicate jobs are safe by construction.
    jobId: data.requestId
      ? `webhook:${data.invoiceNumber}:${data.txStatus}:${data.requestId}`
      : `webhook:${data.invoiceNumber}:${data.txStatus}`,
    // A failed job must never block a fresh delivery of the same notification.
    reclaimFailedJobId: true,
    // Reliable: an inline failure propagates so the route returns 500 and DOKU retries.
    bestEffort: false,
  });
}

/**
 * Register the reconciliation sweep as a BullMQ repeatable job (BL-144).
 *
 * Called once at worker startup. The jobId is fixed, so restarting the worker
 * re-registers the same schedule rather than stacking a second one — and a
 * deploy that changes the interval replaces the old pattern instead of running
 * both. No-op without Redis: there is nothing to schedule against, and pretending
 * otherwise would leave the sweep silently unscheduled in production if Redis
 * were ever dropped.
 */
export async function scheduleReconciliation(intervalMinutes: number): Promise<boolean> {
  const queue = await getQueue(QUEUE.RECONCILE);
  if (!queue) {
    logger.warn("reconciliation sweep NOT scheduled — no Redis connection");
    return false;
  }
  // Clear stale patterns first: BullMQ keys a repeatable by its pattern, so an
  // interval change would otherwise leave the previous cadence running forever.
  const existing = await queue.getRepeatableJobs();
  await Promise.all(
    existing
      .filter((job) => job.name === "sweep")
      .map((job) => queue.removeRepeatableByKey(job.key)),
  );
  await queue.add(
    "sweep",
    {},
    {
      repeat: { every: intervalMinutes * 60_000 },
      jobId: "reconcile:sweep",
      removeOnComplete: { count: 50 },
      removeOnFail: { count: 200 },
    },
  );
  logger.info("reconciliation sweep scheduled", { intervalMinutes });
  return true;
}

/** Close all queues for graceful shutdown (no-op if never initialized). */
export async function closeQueues(): Promise<void> {
  if (!queueSetPromise) return;
  const set = await queueSetPromise;
  await Promise.all(Object.values(set).map((q) => q.close()));
}
