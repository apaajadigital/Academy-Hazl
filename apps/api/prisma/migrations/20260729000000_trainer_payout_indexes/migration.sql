-- Trainer payout hot-path indexes (M-trainer).
-- "trainer_payouts" had no index besides its primary key, yet every read path
-- filters it: routes/trainer.ts lists and aggregates by trainerId, and the admin
-- payout queue (modules/admin/payouts.ts) counts/aggregates by status alone.
-- Both were sequential scans that grow with total payout volume.
-- NOTE: not yet applied (no DB available in this environment). Apply with
-- `prisma migrate deploy` only after a human reviewer approves (SSOT §9.6).

-- CreateIndex
CREATE INDEX "trainer_payouts_trainerId_idx" ON "trainer_payouts"("trainerId");

-- CreateIndex
CREATE INDEX "trainer_payouts_status_idx" ON "trainer_payouts"("status");
