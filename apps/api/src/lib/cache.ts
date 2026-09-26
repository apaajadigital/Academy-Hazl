import { getRedisConnection } from "../jobs/connection.js";
import { logger } from "./logger.js";

/**
 * Cache-aside helpers backed by Redis (TASK-022). No-op passthrough when Redis
 * is disabled (dev/test): `cached` simply runs the loader every time. All ops are
 * best-effort — a cache failure never breaks the request.
 */

export async function cacheGet<T>(key: string): Promise<T | null> {
  const conn = await getRedisConnection();
  if (!conn) return null;
  try {
    const raw = await conn.get(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch (err) {
    logger.warn("cacheGet failed", { key, err: String(err) });
    return null;
  }
}

export async function cacheSet(key: string, value: unknown, ttlSeconds: number): Promise<void> {
  const conn = await getRedisConnection();
  if (!conn) return;
  try {
    await conn.set(key, JSON.stringify(value), "EX", ttlSeconds);
  } catch (err) {
    logger.warn("cacheSet failed", { key, err: String(err) });
  }
}

/** Invalidate keys by glob pattern (e.g. "catalog:*"). Best-effort. */
export async function cacheInvalidate(pattern: string): Promise<void> {
  const conn = await getRedisConnection();
  if (!conn) return;
  try {
    // SCAN (cursor-based, non-blocking) instead of KEYS, which is O(N) and
    // blocks the Redis event loop under load.
    const keys: string[] = [];
    let cursor = "0";
    do {
      const [next, batch] = await conn.scan(cursor, "MATCH", pattern, "COUNT", 100);
      cursor = next;
      keys.push(...batch);
    } while (cursor !== "0");
    if (keys.length > 0) await conn.del(...keys);
  } catch (err) {
    logger.warn("cacheInvalidate failed", { pattern, err: String(err) });
  }
}

/**
 * Cache-aside: return the cached value or run `loader`, cache it, and return it.
 * With Redis disabled the loader always runs (correct, just uncached).
 */
export async function cached<T>(key: string, ttlSeconds: number, loader: () => Promise<T>): Promise<T> {
  const hit = await cacheGet<T>(key);
  if (hit !== null) return hit;
  const value = await loader();
  await cacheSet(key, value, ttlSeconds);
  return value;
}
