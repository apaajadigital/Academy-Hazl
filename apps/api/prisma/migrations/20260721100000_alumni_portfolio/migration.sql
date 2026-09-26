-- Alumni & Community backend (Phase B, BL-48): testimonials gain a "category"
-- (general | alumni) plus a career "outcome" line for the alumni showcase, and
-- "member_portfolios" stores curated community member portfolios.
-- NOTE: not yet applied (no DB available in this environment). Apply with
-- `prisma migrate deploy` only after a human reviewer approves (SSOT §9.6).

-- AlterTable: testimonial alumni category + career outcome
ALTER TABLE "testimonials" ADD COLUMN "category" TEXT NOT NULL DEFAULT 'general';
ALTER TABLE "testimonials" ADD COLUMN "outcome" TEXT;

-- CreateIndex: public alumni listing filters on (category, status)
CREATE INDEX "testimonials_category_status_idx" ON "testimonials"("category", "status");

-- CreateTable: member portfolios (portfolioItems = JSON array of
-- {title, url?, imageUrl?, description?}, validated by Zod at the admin boundary)
CREATE TABLE "member_portfolios" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "headline" TEXT,
    "photoUrl" TEXT,
    "portfolioItems" JSONB NOT NULL DEFAULT '[]',
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "userId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "member_portfolios_pkey" PRIMARY KEY ("id")
);

-- CreateIndex: public listing filters on (status, featured)
CREATE INDEX "member_portfolios_status_featured_idx" ON "member_portfolios"("status", "featured");

-- AddForeignKey: optional owner link — portfolio survives account deletion
ALTER TABLE "member_portfolios" ADD CONSTRAINT "member_portfolios_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
