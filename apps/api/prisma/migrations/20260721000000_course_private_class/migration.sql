-- Private Class as a Course variant (BL-47): "format" splits the catalog
-- (regular vs private_class), "waGroupLink"/"onboardingContact" power the
-- post-purchase WhatsApp onboarding block (never exposed on public endpoints).
-- NOTE: not yet applied (no DB available in this environment). Apply with
-- `prisma migrate deploy` only after a human reviewer approves (SSOT §9.6).

-- AlterTable: course format + private-class onboarding fields
ALTER TABLE "courses" ADD COLUMN "format" TEXT NOT NULL DEFAULT 'regular';
ALTER TABLE "courses" ADD COLUMN "waGroupLink" TEXT;
ALTER TABLE "courses" ADD COLUMN "onboardingContact" TEXT;

-- CreateIndex: catalog listing filters on (format, status)
CREATE INDEX "courses_format_status_idx" ON "courses"("format", "status");
