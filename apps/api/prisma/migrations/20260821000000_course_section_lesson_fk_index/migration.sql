-- CourseSection.courseId / CourseLesson.sectionId FK indexes (BL-123).
-- Postgres does NOT auto-create an index for the referencing side of a foreign
-- key, and neither column had one since 00000000000000_init. Every curriculum
-- read walks these FKs: Prisma resolves the nested
-- `course -> sections -> lessons` include with `WHERE "courseId" IN (...)` /
-- `WHERE "sectionId" IN (...)`, so course-detail and player endpoints were
-- sequential-scanning both tables. The same scan also runs on every
-- `ON DELETE CASCADE` from courses/sections.
-- Cost grows with total rows platform-wide, not per course — so this lands
-- before Learning Path Wave 1 seeds sections/lessons in bulk.
-- Index-only DDL: no data is read, written, or migrated.
-- NOTE: not yet applied (no DB available in this environment). Apply with
-- `prisma migrate deploy` only after a human reviewer approves (SSOT §9.6).

-- CreateIndex
CREATE INDEX "course_sections_courseId_idx" ON "course_sections"("courseId");

-- CreateIndex
CREATE INDEX "course_lessons_sectionId_idx" ON "course_lessons"("sectionId");
