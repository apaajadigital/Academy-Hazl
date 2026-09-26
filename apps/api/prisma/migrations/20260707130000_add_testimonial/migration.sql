-- CreateTable (TASK-095 testimonial engine)
CREATE TABLE "testimonials" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "company" TEXT,
    "quote" TEXT NOT NULL,
    "rating" INTEGER,
    "photoUrl" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "userId" TEXT,
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "testimonials_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "testimonials_status_featured_idx" ON "testimonials"("status", "featured");
