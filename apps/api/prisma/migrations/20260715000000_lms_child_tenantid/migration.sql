-- Denormalize tenantId onto LMS child tables for row-level tenant isolation
-- (defense-in-depth). Columns are nullable so this migration cannot fail on
-- pre-existing rows; the application populates tenantId on every write going
-- forward and the UPDATE statements below backfill existing rows from parents.

-- ─── 1. ADD COLUMN (nullable) ─────────────────────────────────────────────────

-- AlterTable
ALTER TABLE "lms_batch_members" ADD COLUMN     "tenantId" TEXT;

-- AlterTable
ALTER TABLE "lms_lessons" ADD COLUMN     "tenantId" TEXT;

-- AlterTable
ALTER TABLE "lms_quizzes" ADD COLUMN     "tenantId" TEXT;

-- AlterTable
ALTER TABLE "lms_course_assignments" ADD COLUMN     "tenantId" TEXT;

-- AlterTable
ALTER TABLE "lms_progress" ADD COLUMN     "tenantId" TEXT;

-- ─── 2. BACKFILL existing rows from their parent chain ────────────────────────

-- lms_lessons.tenantId <- parent course (lesson.courseId -> lms_courses.id)
UPDATE "lms_lessons" AS l
SET "tenantId" = c."tenantId"
FROM "lms_courses" AS c
WHERE l."courseId" = c."id";

-- lms_quizzes.tenantId <- lesson -> course (quiz.lessonId -> lesson.id -> lesson.courseId -> course.id)
UPDATE "lms_quizzes" AS q
SET "tenantId" = c."tenantId"
FROM "lms_lessons" AS l
JOIN "lms_courses" AS c ON l."courseId" = c."id"
WHERE q."lessonId" = l."id";

-- lms_progress.tenantId <- parent enrollment (progress.enrollmentId -> lms_enrollments.id)
UPDATE "lms_progress" AS p
SET "tenantId" = e."tenantId"
FROM "lms_enrollments" AS e
WHERE p."enrollmentId" = e."id";

-- lms_batch_members.tenantId <- parent batch (member.batchId -> lms_batches.id)
UPDATE "lms_batch_members" AS m
SET "tenantId" = b."tenantId"
FROM "lms_batches" AS b
WHERE m."batchId" = b."id";

-- lms_course_assignments.tenantId <- parent course (assignment.courseId -> lms_courses.id)
UPDATE "lms_course_assignments" AS a
SET "tenantId" = c."tenantId"
FROM "lms_courses" AS c
WHERE a."courseId" = c."id";

-- ─── 3. CREATE INDEX ──────────────────────────────────────────────────────────

-- CreateIndex
CREATE INDEX "lms_batch_members_tenantId_idx" ON "lms_batch_members"("tenantId");

-- CreateIndex
CREATE INDEX "lms_lessons_tenantId_idx" ON "lms_lessons"("tenantId");

-- CreateIndex
CREATE INDEX "lms_quizzes_tenantId_idx" ON "lms_quizzes"("tenantId");

-- CreateIndex
CREATE INDEX "lms_course_assignments_tenantId_idx" ON "lms_course_assignments"("tenantId");

-- CreateIndex
CREATE INDEX "lms_progress_tenantId_idx" ON "lms_progress"("tenantId");
