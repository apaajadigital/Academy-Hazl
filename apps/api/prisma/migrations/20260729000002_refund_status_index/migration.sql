-- Refund status index (F2 — unbounded refund query in the trainer balance).
-- services/payout/trainerPayoutService.ts used to load EVERY approved refund on
-- the platform and inline their order ids as `orderId IN (...)`, which blows past
-- Postgres' bind parameter limit once refunds reach the tens of thousands (every
-- payout request then 500s). The replacement is a single joined aggregate that
-- filters `refunds.status = 'approved'`; "refunds" had no index besides the
-- primary key and the orderId unique key, so that filter meant a sequential scan.
-- NOTE: not yet applied (no DB available in this environment). Apply with
-- `prisma migrate deploy` only after a human reviewer approves (SSOT §9.6).

-- CreateIndex
CREATE INDEX "refunds_status_idx" ON "refunds"("status");
