import type { Redis } from "ioredis";
import { env } from "../config/env.js";

/**
 * Redis connection management for BullMQ (TASK-022).
 *
 * ioredis is imported LAZILY (dynamic import) and only when REDIS_URL is set, so
 * the native-ish redis/bullmq stack never loads in dev/test where the queue is
 * disabled — jobs run inline (see jobs/queues.ts) and the test forks stay clean.
 * Each Worker needs its own connection (BullMQ uses blocking commands).
 */

// BullMQ requires maxRetriesPerRequest = null on its connections.
const REDIS_OPTS = { maxRetriesPerRequest: null as null } as const;

export function isQueueEnabled(): boolean {
  return Boolean(env.REDIS_URL);
}

export async function createRedisConnection(): Promise<Redis | null> {
  if (!env.REDIS_URL) return null;
  const { Redis } = await import("ioredis");
  return new Redis(env.REDIS_URL, REDIS_OPTS);
}

let sharedConnection: Redis | null | undefined;

/** Shared connection for Queue producers and the cache layer (lazy). */
export async function getRedisConnection(): Promise<Redis | null> {
  if (sharedConnection === undefined) sharedConnection = await createRedisConnection();
  return sharedConnection ?? null;
}
