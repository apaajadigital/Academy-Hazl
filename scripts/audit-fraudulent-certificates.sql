-- Batch8 / Decision D3 — audit & revoke certificates earned via progress-inflation.
--
-- Background: before the fix in enrollmentService.ts, POST /api/progress accepted
-- progress for ANY lessonId (even lessons from OTHER courses) and course completion
-- counted ALL completed progress rows. A user could inflate an enrollment to 100%
-- with foreign lessons and receive a certificate without finishing the course.
--
-- This script (Postgres) recomputes each enrollment's TRUE completion using only
-- lessons that actually belong to the course, and flags certificates whose true
-- completion is below the 80% threshold. STEP 1 is read-only. STEP 2 (revoke +
-- data cleanup) is destructive and commented out — review STEP 1 output first,
-- take a DB backup, then uncomment and run STEP 2 inside the transaction.
--
-- Run: psql "$DATABASE_URL" -f scripts/audit-fraudulent-certificates.sql

-- Lessons that genuinely belong to each course (lesson -> section -> course).
CREATE TEMP VIEW course_lesson_v AS
  SELECT cl.id AS lesson_id, cs."courseId" AS course_id
  FROM course_lessons cl
  JOIN course_sections cs ON cl."sectionId" = cs.id;

-- True completion per enrollment, counting ONLY in-course completed lessons.
CREATE TEMP VIEW enrollment_true_v AS
  SELECT
    e.id                              AS enrollment_id,
    e."userId"                        AS user_id,
    e."courseId"                      AS course_id,
    e."isCompleted"                   AS marked_completed,
    (SELECT COUNT(*) FROM course_lesson_v cl WHERE cl.course_id = e."courseId")            AS total_lessons,
    (SELECT COUNT(*) FROM course_lesson_progress p
       JOIN course_lesson_v cl ON cl.lesson_id = p."lessonId"
       WHERE p."enrollmentId" = e.id AND p."isCompleted" = true
         AND cl.course_id = e."courseId")                                                  AS true_completed
  FROM course_enrollments e;

-- ───────────────────────────────────────────────────────────────────────────
-- STEP 1 — READ ONLY: list suspect certificates (true completion < 80%).
-- ───────────────────────────────────────────────────────────────────────────
SELECT
  c.id            AS certificate_id,
  c.code,
  c."userId"      AS user_id,
  c."courseId"    AS course_id,
  et.true_completed,
  et.total_lessons,
  CASE WHEN et.total_lessons = 0 THEN 0
       ELSE ROUND(et.true_completed::numeric * 100 / et.total_lessons) END AS true_pct
FROM certificates c
JOIN enrollment_true_v et
  ON et.user_id = c."userId" AND et.course_id = c."courseId"
WHERE c.type = 'course'
  AND c."isValid" = true
  AND et.total_lessons > 0
  AND (et.true_completed::numeric * 100 / et.total_lessons) < 80
ORDER BY true_pct ASC;

-- ───────────────────────────────────────────────────────────────────────────
-- STEP 2 — DESTRUCTIVE (review STEP 1 first, take a backup, then uncomment):
--   (a) revoke suspect certificates, (b) reset the inflated enrollment to its
--   true progress, (c) delete the injected foreign progress rows.
-- ───────────────────────────────────────────────────────────────────────────
-- BEGIN;
--
-- -- (a) Revoke suspect certificates.
-- UPDATE certificates c
--    SET "isValid" = false, "revokedAt" = now()
--   FROM enrollment_true_v et
--  WHERE et.user_id = c."userId" AND et.course_id = c."courseId"
--    AND c.type = 'course' AND c."isValid" = true
--    AND et.total_lessons > 0
--    AND (et.true_completed::numeric * 100 / et.total_lessons) < 80;
--
-- -- (b) Reset those enrollments to their true completion.
-- UPDATE course_enrollments e
--    SET "isCompleted" = false,
--        "progressPct" = ROUND(et.true_completed::numeric * 100 / NULLIF(et.total_lessons, 0), 2),
--        "completedAt" = NULL
--   FROM enrollment_true_v et
--  WHERE et.enrollment_id = e.id
--    AND et.total_lessons > 0
--    AND (et.true_completed::numeric * 100 / et.total_lessons) < 80;
--
-- -- (c) Delete progress rows that reference lessons not in the enrollment's course.
-- DELETE FROM course_lesson_progress p
--  WHERE NOT EXISTS (
--    SELECT 1 FROM course_lesson_v cl
--      JOIN course_enrollments e ON e.id = p."enrollmentId"
--     WHERE cl.lesson_id = p."lessonId" AND cl.course_id = e."courseId"
--  );
--
-- COMMIT;
