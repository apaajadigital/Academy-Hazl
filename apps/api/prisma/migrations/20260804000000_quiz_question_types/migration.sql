-- Quiz question types (Google Forms-style): add type, required, settings columns
-- and change answer from Int to JSONB for polymorphic answer storage.

ALTER TABLE "quiz_questions" ADD COLUMN IF NOT EXISTS "type" TEXT NOT NULL DEFAULT 'multiple_choice';
ALTER TABLE "quiz_questions" ADD COLUMN IF NOT EXISTS "required" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "quiz_questions" ADD COLUMN IF NOT EXISTS "settings" JSONB;

-- Convert existing Int answers to JSONB (backward compatible: old value 0 becomes JSON 0)
ALTER TABLE "quiz_questions" ALTER COLUMN "answer" TYPE JSONB USING to_jsonb(answer);
