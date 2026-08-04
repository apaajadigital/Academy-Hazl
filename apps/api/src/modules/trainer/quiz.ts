/**
 * Trainer Quiz Management — Google Forms-style quiz builder.
 *
 * Supports 7 question types:
 * - multiple_choice: single answer from options (radio)
 * - checkboxes: multiple answers from options
 * - dropdown: single answer from dropdown list
 * - short_answer: text input, exact match grading
 * - paragraph: long text, manual grading
 * - true_false: true or false
 * - linear_scale: numeric scale (e.g. 1-5)
 *
 * Ownership chain: question → quiz → lesson → section → course → trainerId.
 */
import { Router, type Request, type Response, type NextFunction } from "express";
import { z } from "zod";
import { prisma } from "../../db/prisma.js";
import { AppError, successResponse, type Role } from "../../types/index.js";

const router = Router();

const TRAINER_ROLES: readonly Role[] = ["trainer", "super_admin"];

function hasAnyRole(req: Request, allowed: readonly Role[]): boolean {
  const roles: readonly Role[] = req.user?.roles ?? [];
  return allowed.some((role) => roles.includes(role));
}

function requireTrainer(req: Request, _res: Response, next: NextFunction) {
  if (!hasAnyRole(req, TRAINER_ROLES)) {
    return next(new AppError(403, "Akses ditolak. Hanya trainer."));
  }
  next();
}

async function requireLessonOwnership(lessonId: string, trainerId: string) {
  const lesson = await prisma.courseLesson.findUnique({
    where: { id: lessonId },
    include: { section: { select: { courseId: true, course: { select: { trainerId: true } } } } },
  });
  if (!lesson) throw new AppError(404, "Lesson tidak ditemukan.");
  if (lesson.section.course.trainerId !== trainerId) {
    throw new AppError(404, "Lesson tidak ditemukan.");
  }
  return lesson;
}

// ── Question types ───────────────────────────────────────────────────────────

const QUESTION_TYPES = [
  "multiple_choice",
  "checkboxes",
  "dropdown",
  "short_answer",
  "paragraph",
  "true_false",
  "linear_scale",
] as const;

type QuestionType = (typeof QUESTION_TYPES)[number];

// Validate answer based on question type
function validateAnswer(type: QuestionType, answer: unknown, options: unknown): boolean {
  switch (type) {
    case "multiple_choice":
    case "dropdown":
      return typeof answer === "number" && Number.isInteger(answer) && answer >= 0;
    case "true_false":
      return typeof answer === "number" && (answer === 0 || answer === 1);
    case "checkboxes":
      return Array.isArray(answer) && answer.every((a) => typeof a === "number" && Number.isInteger(a) && a >= 0);
    case "short_answer":
      return typeof answer === "string" || (Array.isArray(answer) && answer.every((a) => typeof a === "string"));
    case "paragraph":
      return answer === null || answer === undefined;
    case "linear_scale":
      return answer === null || (typeof answer === "number" && Number.isInteger(answer));
    default:
      return false;
  }
}

// ── Schemas ──────────────────────────────────────────────────────────────────

const questionSchema = z.object({
  question: z.string().min(1),
  type: z.enum(QUESTION_TYPES).default("multiple_choice"),
  options: z.any().default([]),   // Validated per-type below
  answer: z.any().default(0),     // Validated per-type below
  required: z.boolean().default(true),
  settings: z.any().optional().nullable(),
});

const linearScaleSettingsSchema = z.object({
  min: z.number().int().min(0).max(1).default(1),
  max: z.number().int().min(2).max(10).default(5),
  minLabel: z.string().max(100).optional(),
  maxLabel: z.string().max(100).optional(),
});

// ── GET quiz for a lesson ────────────────────────────────────────────────────

router.get(
  "/lessons/:lessonId/quiz",
  requireTrainer,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { lessonId } = req.params;
      if (!lessonId) throw new AppError(400, "Lesson ID tidak valid.");
      await requireLessonOwnership(lessonId, req.user!.id);

      const quiz = await prisma.quiz.findUnique({
        where: { lessonId },
        include: {
          questions: { orderBy: { sortOrder: "asc" } },
        },
      });

      res.json(successResponse(quiz));
    } catch (err) {
      next(err);
    }
  },
);

// ── Create quiz + initial questions ──────────────────────────────────────────

const createQuizSchema = z.object({
  passMark: z.number().int().min(0).max(100).default(70),
  questions: z.array(questionSchema).min(1).max(50),
});

router.post(
  "/lessons/:lessonId/quiz",
  requireTrainer,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { lessonId } = req.params;
      if (!lessonId) throw new AppError(400, "Lesson ID tidak valid.");
      await requireLessonOwnership(lessonId, req.user!.id);

      const existing = await prisma.quiz.findUnique({ where: { lessonId } });
      if (existing) throw new AppError(409, "Quiz sudah ada untuk lesson ini.");

      const { passMark, questions } = createQuizSchema.parse(req.body);

      // Validate each question's answer against its type
      for (const q of questions) {
        if (!validateAnswer(q.type as QuestionType, q.answer, q.options)) {
          throw new AppError(400, `Format jawaban tidak valid untuk tipe "${q.type}".`);
        }
        if (q.type === "linear_scale" && q.settings) {
          linearScaleSettingsSchema.parse(q.settings);
        }
      }

      const quiz = await prisma.quiz.create({
        data: {
          lessonId,
          passMark,
          questions: {
            create: questions.map((q, idx) => ({
              question: q.question,
              type: q.type,
              options: q.options,
              answer: q.answer,
              required: q.required,
              settings: q.settings ?? undefined,
              sortOrder: idx,
            })),
          },
        },
        include: { questions: { orderBy: { sortOrder: "asc" } } },
      });

      res.status(201).json(successResponse(quiz));
    } catch (err) {
      next(err);
    }
  },
);

// ── Update quiz settings ─────────────────────────────────────────────────────

const updateQuizSchema = z.object({
  passMark: z.number().int().min(0).max(100),
});

router.patch(
  "/quizzes/:quizId",
  requireTrainer,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { quizId } = req.params;
      if (!quizId) throw new AppError(400, "Quiz ID tidak valid.");

      const quiz = await prisma.quiz.findUnique({
        where: { id: quizId },
        select: { lessonId: true },
      });
      if (!quiz) throw new AppError(404, "Quiz tidak ditemukan.");
      await requireLessonOwnership(quiz.lessonId, req.user!.id);

      const { passMark } = updateQuizSchema.parse(req.body);
      const updated = await prisma.quiz.update({
        where: { id: quizId },
        data: { passMark },
      });

      res.json(successResponse(updated));
    } catch (err) {
      next(err);
    }
  },
);

// ── Delete quiz ──────────────────────────────────────────────────────────────

router.delete(
  "/quizzes/:quizId",
  requireTrainer,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { quizId } = req.params;
      if (!quizId) throw new AppError(400, "Quiz ID tidak valid.");

      const quiz = await prisma.quiz.findUnique({
        where: { id: quizId },
        select: { lessonId: true },
      });
      if (!quiz) throw new AppError(404, "Quiz tidak ditemukan.");
      await requireLessonOwnership(quiz.lessonId, req.user!.id);

      await prisma.quiz.delete({ where: { id: quizId } });

      res.json(successResponse({ deleted: true }));
    } catch (err) {
      next(err);
    }
  },
);

// ── Add question ─────────────────────────────────────────────────────────────

router.post(
  "/quizzes/:quizId/questions",
  requireTrainer,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { quizId } = req.params;
      if (!quizId) throw new AppError(400, "Quiz ID tidak valid.");

      const quiz = await prisma.quiz.findUnique({
        where: { id: quizId },
        select: { lessonId: true },
      });
      if (!quiz) throw new AppError(404, "Quiz tidak ditemukan.");
      await requireLessonOwnership(quiz.lessonId, req.user!.id);

      const data = questionSchema.parse(req.body);
      if (!validateAnswer(data.type as QuestionType, data.answer, data.options)) {
        throw new AppError(400, `Format jawaban tidak valid untuk tipe "${data.type}".`);
      }
      if (data.type === "linear_scale" && data.settings) {
        linearScaleSettingsSchema.parse(data.settings);
      }

      const maxOrder = await prisma.quizQuestion.aggregate({
        where: { quizId },
        _max: { sortOrder: true },
      });

      const question = await prisma.quizQuestion.create({
        data: {
          quizId,
          question: data.question,
          type: data.type,
          options: data.options,
          answer: data.answer,
          required: data.required,
          settings: data.settings ?? undefined,
          sortOrder: (maxOrder._max.sortOrder ?? -1) + 1,
        },
      });

      res.status(201).json(successResponse(question));
    } catch (err) {
      next(err);
    }
  },
);

// ── Update question ──────────────────────────────────────────────────────────

const updateQuestionSchema = z.object({
  question: z.string().min(1).optional(),
  type: z.enum(QUESTION_TYPES).optional(),
  options: z.any().optional(),
  answer: z.any().optional(),
  required: z.boolean().optional(),
  settings: z.any().optional().nullable(),
});

router.patch(
  "/questions/:questionId",
  requireTrainer,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { questionId } = req.params;
      if (!questionId) throw new AppError(400, "Question ID tidak valid.");

      const question = await prisma.quizQuestion.findUnique({
        where: { id: questionId },
        include: { quiz: { select: { lessonId: true } } },
      });
      if (!question) throw new AppError(404, "Pertanyaan tidak ditemukan.");
      await requireLessonOwnership(question.quiz.lessonId, req.user!.id);

      const data = updateQuestionSchema.parse(req.body);

      // If type or answer is being changed, validate the combination
      const finalType = (data.type ?? question.type) as QuestionType;
      const finalAnswer = data.answer !== undefined ? data.answer : question.answer;
      const finalOptions = data.options !== undefined ? data.options : question.options;

      if (data.answer !== undefined || data.type !== undefined) {
        if (!validateAnswer(finalType, finalAnswer, finalOptions)) {
          throw new AppError(400, `Format jawaban tidak valid untuk tipe "${finalType}".`);
        }
      }

      const updated = await prisma.quizQuestion.update({
        where: { id: questionId },
        data: {
          ...(data.question !== undefined ? { question: data.question } : {}),
          ...(data.type !== undefined ? { type: data.type } : {}),
          ...(data.options !== undefined ? { options: data.options } : {}),
          ...(data.answer !== undefined ? { answer: data.answer } : {}),
          ...(data.required !== undefined ? { required: data.required } : {}),
          ...(data.settings !== undefined ? { settings: data.settings } : {}),
        },
      });

      res.json(successResponse(updated));
    } catch (err) {
      next(err);
    }
  },
);

// ── Delete question ──────────────────────────────────────────────────────────

router.delete(
  "/questions/:questionId",
  requireTrainer,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { questionId } = req.params;
      if (!questionId) throw new AppError(400, "Question ID tidak valid.");

      const question = await prisma.quizQuestion.findUnique({
        where: { id: questionId },
        include: { quiz: { select: { lessonId: true } } },
      });
      if (!question) throw new AppError(404, "Pertanyaan tidak ditemukan.");
      await requireLessonOwnership(question.quiz.lessonId, req.user!.id);

      await prisma.quizQuestion.delete({ where: { id: questionId } });

      res.json(successResponse({ deleted: true }));
    } catch (err) {
      next(err);
    }
  },
);

// ── Reorder questions ────────────────────────────────────────────────────────

const reorderSchema = z.object({
  questionIds: z.array(z.string()).min(1),
});

router.patch(
  "/quizzes/:quizId/reorder",
  requireTrainer,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { quizId } = req.params;
      if (!quizId) throw new AppError(400, "Quiz ID tidak valid.");

      const quiz = await prisma.quiz.findUnique({
        where: { id: quizId },
        select: { lessonId: true },
      });
      if (!quiz) throw new AppError(404, "Quiz tidak ditemukan.");
      await requireLessonOwnership(quiz.lessonId, req.user!.id);

      const { questionIds } = reorderSchema.parse(req.body);

      await prisma.$transaction(
        questionIds.map((id, index) =>
          prisma.quizQuestion.updateMany({
            where: { id, quizId },
            data: { sortOrder: index },
          }),
        ),
      );

      res.json(successResponse({ reordered: true }));
    } catch (err) {
      next(err);
    }
  },
);

export default router;
