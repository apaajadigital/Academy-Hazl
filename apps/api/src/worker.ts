import { Worker, type Job, type ConnectionOptions } from "bullmq";
import { createRedisConnection } from "./jobs/connection.js";
import { logger } from "./lib/logger.js";
import { QUEUE } from "./jobs/types.js";
import type { EmailJob, CertificateJob, SearchIndexJob, WebhookJob, ReconcileJob } from "./jobs/types.js";
import { processEmail } from "./jobs/processors/email.js";
import { processCertificate } from "./jobs/processors/certificate.js";
import { processSearchIndex } from "./jobs/processors/searchIndex.js";
import { processWebhookPayment } from "./jobs/processors/webhook.js";
import { processReconcile } from "./jobs/processors/reconcile.js";
import { scheduleReconciliation } from "./jobs/queues.js";
import { env } from "./config/env.js";

/**
 * BullMQ worker process (TASK-022). Run separately from the API:
 *   node dist/worker.js   (compose service "worker" uses the same image)
 * Each Worker gets its own Redis connection (BullMQ uses blocking commands).
 */

/** Mirrors defaultJobOptions.attempts in jobs/queues.ts. */
const defaultAttempts = 5;

async function makeWorker<T>(name: string, handler: (data: T) => Promise<void>, concurrency: number): Promise<Worker> {
  const connection = await createRedisConnection();
  if (!connection) throw new Error("REDIS_URL is required to run the worker");
  const worker = new Worker(name, async (job: Job) => handler(job.data as T), {
    // BullMQ bundles its own ioredis types; the runtime instance is compatible.
    connection: connection as unknown as ConnectionOptions,
    concurrency,
  });
  worker.on("completed", (job) => logger.info("job completed", { queue: name, jobId: job.id }));
  worker.on("failed", (job, err) => {
    // BL-141: distinguish a retry that will happen again from one that has run
    // out of attempts. Only the latter is a dead letter — work that will never
    // be retried unless a human intervenes — and only that deserves to page.
    // Logging both at the same level made the signal unreadable, which is why
    // the failed set could grow unnoticed in the first place.
    const attempts = job?.attemptsMade ?? 0;
    const maxAttempts = job?.opts?.attempts ?? defaultAttempts;
    const exhausted = attempts >= maxAttempts;
    const ctx = { queue: name, jobId: job?.id, attempts, maxAttempts, err: err.message };
    if (exhausted) {
      logger.error("job dead-lettered: attempts exhausted, no further retry", ctx);
    } else {
      logger.warn("job failed, will retry", ctx);
    }
  });
  worker.on("error", (err) => logger.error("worker error", { queue: name, err: err.message }));
  return worker;
}

async function main(): Promise<void> {
  const workers = await Promise.all([
    makeWorker<EmailJob>(QUEUE.EMAIL, processEmail, 5),
    makeWorker<CertificateJob>(QUEUE.CERTIFICATE, processCertificate, 3),
    makeWorker<SearchIndexJob>(QUEUE.SEARCH_INDEX, processSearchIndex, 5),
    makeWorker<WebhookJob>(QUEUE.WEBHOOK, processWebhookPayment, 5),
    // Concurrency 1: the sweep is a batch, not a stream. Two overlapping sweeps
    // would inquire about the same orders twice and race each other's claims.
    makeWorker<ReconcileJob>(QUEUE.RECONCILE, processReconcile, 1),
  ]);

  // BL-144: register the repeatable sweep AFTER the workers exist, so the first
  // firing has something to consume it.
  await scheduleReconciliation(env.RECONCILE_INTERVAL_MINUTES);

  logger.info("worker started", { queues: workers.map((w) => w.name) });

  const shutdown = async (signal: string): Promise<void> => {
    logger.info("worker shutting down", { signal });
    await Promise.all(workers.map((w) => w.close()));
    process.exit(0);
  };
  process.on("SIGTERM", () => void shutdown("SIGTERM"));
  process.on("SIGINT", () => void shutdown("SIGINT"));
}

main().catch((err) => {
  logger.error("worker failed to start", { err: err instanceof Error ? err.message : String(err) });
  process.exit(1);
});
