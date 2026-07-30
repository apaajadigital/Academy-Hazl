# RUNBOOK — Queue & Worker (TASK-022)

> BullMQ + Redis async job system. Resolves ghost-feature INC-04 (Redis/BullMQ in env but not implemented).

## Architecture

```
Producer (api routes/services)  →  enqueue*()  →  Redis (BullMQ)  →  Worker (dist/worker.js)
                                        │ no REDIS_URL → run inline (dev/test)
Queues: email · certificate · search-index · webhook
```

- **Lazy + degrade-safe:** bullmq/ioredis load only when `REDIS_URL` is set. Without it (dev/test) every `enqueue*` runs its processor **inline**, so behavior is identical and no Redis is required to run or test.
- **Producers** call `enqueueEmail / enqueueCertificate / enqueueSearchIndex / enqueueWebhook` (`src/jobs/queues.ts`).
- **Processors** (`src/jobs/processors/*`) are pure leaves shared by the inline path and the worker.
- **Worker** (`src/worker.ts`, compose service `worker`) consumes all four queues.

## Job semantics

| Queue | Trigger | Reliability | Idempotency |
|-------|---------|-------------|-------------|
| `email` | payment emails + WA | best-effort (never fails caller) | — |
| `certificate` | auto-issue on course completion | best-effort | jobId `cert:<user>:<course>` |
| `search-index` | course create/update/publish/delete | best-effort | jobId `index:<id>` / `delete:<id>` |
| `webhook` | DOKU payment fulfillment | **reliable** (failure → 500 → DOKU retries) | DB guard (skip already-paid) + jobId `webhook:<inv>:<status>` |

Retry: 5 attempts, exponential backoff (2 s). Failed jobs kept (up to 5000) for inspection/replay (dead-letter pattern).

## Operations

```bash
# Local dev: start backing services, then the worker in watch mode
docker compose -f docker-compose.dev.yml up -d
cd apps/api && npm run worker:dev

# Production: the compose "worker" service runs automatically (same image as api)
docker compose -f docker-compose.prod.yml ps worker
docker compose -f docker-compose.prod.yml logs -f worker

# Inspect queue depth / failures (redis-cli)
docker compose -f docker-compose.prod.yml exec redis redis-cli
> KEYS bull:*:failed
> LLEN bull:email:wait
```

## Scaling & failure modes

- Scale throughput: `docker compose up -d --scale worker=N` (each worker connects independently).
- Redis down at enqueue time → producer degrades to inline (side-effect not lost) and logs a warning.
- Webhook idempotency: a duplicate DOKU callback for an already-paid order is skipped — no duplicate enrollment/commission/email.
- Graceful shutdown: SIGTERM drains in-flight jobs (`worker.close()`), API closes queues on shutdown.

## Validation Checklist (TASK-022)

- [x] Redis service in compose (AOF persistence) + REDIS_URL wired to api & worker
- [x] 4 queues (email, certificate, search-index, webhook) + processors
- [x] Retry + backoff + failed-job retention (dead-letter)
- [x] Webhook idempotency (DB guard + jobId) — with regression test
- [x] Cache-aside helper (`src/lib/cache.ts`)
- [x] Inline fallback keeps the whole suite green without Redis (jumlah test: `docs/RUNBOOK_CI.md` — sengaja tidak disalin ke sini, angka lamanya "279" sudah basi)
- [ ] 🖐️ Live: worker consumes a real job end-to-end (verified during TASK-030 with Redis up)
