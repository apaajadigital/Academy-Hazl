-- Missing migration for schema changes introduced by 7ecf762 (E-Book CRUD,
-- trainer course approval, manual payout, system health). Without these
-- columns every new admin/trainer endpoint fails with Prisma P2022 at runtime.
-- NOTE: not yet applied (no DB available in this environment). Apply with
-- `prisma migrate deploy` only after a human reviewer approves (SSOT §9.6).

-- AlterTable: trainer course approval feedback + live-class metadata
ALTER TABLE "courses" ADD COLUMN "adminFeedback" TEXT;
ALTER TABLE "courses" ADD COLUMN "liveZoomLink" TEXT;
ALTER TABLE "courses" ADD COLUMN "liveSchedule" TIMESTAMP(3);

-- AlterTable: manual payout processing audit fields
ALTER TABLE "affiliate_withdrawals" ADD COLUMN "note" TEXT;
ALTER TABLE "affiliate_withdrawals" ADD COLUMN "processedBy" TEXT;
