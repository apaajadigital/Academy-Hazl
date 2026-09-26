-- Batch8 findings migration.
-- NOTE: not yet applied (no DB available in this environment). Apply with
-- `prisma migrate deploy` only after a human reviewer approves (SSOT §9.6).

-- ─── D7: subscription order anti-reuse ────────────────────────────────────────
-- AlterTable
ALTER TABLE "orders" ADD COLUMN     "subscriptionConsumedAt" TIMESTAMP(3);

-- ─── D6: duplicate certificates — data dedup BEFORE the unique index ───────────
-- Delete newer duplicate certificates, keeping the OLDEST issuedAt per
-- (userId, courseId, type). A tie on issuedAt is broken deterministically by the
-- smaller id. Scoped to non-NULL courseId so it matches exactly what the unique
-- index enforces (Postgres treats NULLs as distinct, so NULL-course certificates
-- — e.g. event certs — are never affected). This MUST run before CREATE UNIQUE
-- INDEX, otherwise the index creation would fail on existing duplicates.
DELETE FROM "certificates" AS c
USING "certificates" AS older
WHERE c."courseId" IS NOT NULL
  AND c."userId" = older."userId"
  AND c."courseId" = older."courseId"
  AND c."type" = older."type"
  AND (
    older."issuedAt" < c."issuedAt"
    OR (older."issuedAt" = c."issuedAt" AND older."id" < c."id")
  );

-- CreateIndex
CREATE UNIQUE INDEX "certificates_userId_courseId_type_key" ON "certificates"("userId", "courseId", "type");
