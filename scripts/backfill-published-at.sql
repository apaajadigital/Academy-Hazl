-- BL-116 — backfill NULL "publishedAt" on courses that are already published.
--
-- Background: prisma/seed.ts created the 6 demo courses with status='published'
-- but never set "publishedAt" — the seed writes straight to Postgres, bypassing
-- the admin publish flow that normally sets it. Production therefore has rows
-- with status='published' AND "publishedAt" IS NULL, and the admin sort option
-- `publishedAt:desc` (apps/api/src/modules/admin/courses.ts) is undefined over
-- NULLs. The write path is already fixed (admin publish sets publishedAt —
-- 3a40107 — and seed.ts now sets it too); this script repairs the rows created
-- before the fix by copying "createdAt" (the best available approximation of
-- the real publish moment for seeded rows).
--
-- Scope audit (verified against schema.prisma @@map/columns): only Course and
-- BlogPost have a publishedAt column. events/ebooks have NO such column, and
-- the blog seed already sets publishedAt at creation — so only the `courses`
-- table needs backfilling.
--
-- STEP 1 is read-only. STEP 2 (the UPDATE) is commented out — review STEP 1
-- output first, take a DB backup (scripts/backup.sh), then uncomment and run
-- STEP 2 inside the transaction.
--
-- Run (VPS, compose postgres container):
--   docker compose -f docker-compose.vps.yml exec -T postgres \
--     psql -U jagouser -d jago_akademi -f - < scripts/backfill-published-at.sql
-- Or: psql "$DATABASE_URL" -f scripts/backfill-published-at.sql

-- ───────────────────────────────────────────────────────────────────────────
-- STEP 1 — READ ONLY: list published courses missing publishedAt.
-- ───────────────────────────────────────────────────────────────────────────
SELECT id, slug, status, "publishedAt", "createdAt"
FROM courses
WHERE status = 'published' AND "publishedAt" IS NULL
ORDER BY "createdAt" ASC;

-- ───────────────────────────────────────────────────────────────────────────
-- STEP 2 — WRITE (review STEP 1 first, take a backup, then uncomment):
--   backfill publishedAt from createdAt for exactly the rows STEP 1 listed.
-- ───────────────────────────────────────────────────────────────────────────
-- BEGIN;
--
-- UPDATE courses
--    SET "publishedAt" = "createdAt"
--  WHERE status = 'published' AND "publishedAt" IS NULL;
--
-- COMMIT;
