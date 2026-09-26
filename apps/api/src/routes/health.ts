import { Router } from "express";
import { prisma } from "../db/prisma.js";
import { getRedisConnection, isQueueEnabled } from "../jobs/connection.js";
import { getMeiliClient } from "../services/search/meilisearch.js";
import { env } from "../config/env.js";

const router = Router();

/** Liveness — the process is up. No dependency checks (container healthcheck). */
router.get("/health", (_req, res) => {
  res.json({
    status: "healthy",
    timestamp: new Date().toISOString(),
    service: "Jago Akademi Core API",
    // `||` not `??`: .env.example ships APP_VERSION="" ("leave empty" is the
    // documented default), and `??` only falls back on null/undefined, so an
    // explicit empty string survived as the reported version instead of "1.0.0".
    version: env.APP_VERSION || "1.0.0",
  });
});

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    p,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error("timeout")), ms)),
  ]);
}

async function check(fn: () => Promise<unknown>): Promise<"ok" | "error"> {
  try {
    await withTimeout(fn(), 2000);
    return "ok";
  } catch {
    return "error";
  }
}

/**
 * Readiness — dependencies reachable (TASK-023). Used by load balancers and
 * deploy smoke tests. Returns 503 if a required dependency (DB, search) is down;
 * Redis is only required when the queue is enabled.
 */
router.get("/ready", async (_req, res) => {
  const [db, search, redis] = await Promise.all([
    check(() => prisma.$queryRaw`SELECT 1`),
    check(() => getMeiliClient().health()),
    isQueueEnabled()
      ? check(async () => {
          const conn = await getRedisConnection();
          if (conn) await conn.ping();
        })
      : Promise.resolve("skipped" as const),
  ]);

  const deps = { db, search, redis };
  const ready = db === "ok" && search === "ok" && redis !== "error";
  res.status(ready ? 200 : 503).json({
    status: ready ? "ready" : "not-ready",
    deps,
    timestamp: new Date().toISOString(),
  });
});

export default router;
