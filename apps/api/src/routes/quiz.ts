import { Router, type Request, type Response, type NextFunction } from "express";
import { z } from "zod";
import { authenticate } from "../middleware/authenticate.js";
import { validateBody } from "../middleware/validateBody.js";
import { prisma } from "../db/prisma.js";
import { AppError, successResponse } from "../types/index.js";
import { recalculateCourseProgress } from "../services/enrollment/enrollmentService.js";

const router = Router();

// GET /api/quiz/:lessonId — get quiz for a lesson (enrolled users only)
router.get("/:lessonId", authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const quiz = await prisma.quiz.findUnique({
      where: { lessonId: req.params.lessonId },
      include: {
        questions: {
          orderBy: { sortOrder: "asc" },
          select: {
            id: true,
            question: true,
            options: true,
            sortOrder: true,
            answer: true,
          },
        },
      },
    });
    if (!quiz) return next(new AppError(404, "Quiz tidak ditemukan."));
    // Strip `answer` before returning so correct answers never reach the client,
    // regardless of how the questions were fetched.
    const safeQuiz = {
      ...quiz,
      questions: quiz.questions.map(({ answer: _answer, ...q }) => q),
    };
    res.json(successResponse(safeQuiz));
  } catch (err) {
    next(err);
  }
});

const SubmitSchema = z.object({
  answers: z.record(z.string(), z.number().int().min(0)),
});

// POST /api/quiz/:lessonId/submit — submit quiz answers
router.post(
  "/:lessonId/submit",
  authenticate,
  validateBody(SubmitSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { lessonId } = req.params;
      if (!lessonId) return next(new AppError(400, "lessonId wajib."));
      const { answers } = req.body as { answers: Record<string, number> };

      const quiz = await prisma.quiz.findUnique({
        where: { lessonId },
        include: { questions: { select: { id: true, answer: true } } },
      });
      if (!quiz) return next(new AppError(404, "Quiz tidak ditemukan."));

      const total = quiz.questions.length;
      if (total === 0) return next(new AppError(422, "Quiz tidak memiliki soal."));

      let correct = 0;
      for (const q of quiz.questions) {
        if (answers[q.id] === q.answer) correct++;
      }

      const score = total > 0 ? Number(((correct / total) * 100).toFixed(2)) : 0;
      const isPassed = score >= quiz.passMark;

      const submission = await prisma.quizSubmission.create({
        data: {
          userId: req.user!.id,
          lessonId,
          answers,
          score,
          isPassed,
        },
      });

      const lesson = await prisma.courseLesson.findUnique({
        where: { id: lessonId },
        select: { section: { select: { courseId: true } } },
      });
      if (lesson) {
        const enrollment = await prisma.courseEnrollment.findUnique({
          where: { courseId_userId: { courseId: lesson.section.courseId, userId: req.user!.id } },
        });
        if (enrollment) {
          // H4: progress is ratchet-only. A failed retake must never downgrade a
          // lesson that was already completed (the old code reset isCompleted/
          // watchedPct to false/0 unconditionally, erasing prior progress while
          // the new attempt is still recorded in QuizSubmission above).
          const existingProgress = await prisma.courseLessonProgress.findUnique({
            where: { enrollmentId_lessonId: { enrollmentId: enrollment.id, lessonId } },
          });

          if (isPassed) {
            await prisma.courseLessonProgress.upsert({
              where: { enrollmentId_lessonId: { enrollmentId: enrollment.id, lessonId } },
              update: {
                isCompleted: true,
                watchedPct: 100,
                // Keep the original completion timestamp on a passed retake.
                ...(existingProgress?.isCompleted ? {} : { completedAt: new Date() }),
              },
              create: {
                enrollmentId: enrollment.id,
                lessonId,
                isCompleted: true,
                watchedPct: 100,
                completedAt: new Date(),
              },
            });
          } else if (!existingProgress) {
            // First (failed) attempt: create the row so the attempt is visible,
            // but leave any existing row untouched on failed retakes.
            await prisma.courseLessonProgress.create({
              data: { enrollmentId: enrollment.id, lessonId, isCompleted: false, watchedPct: 0 },
            });
          }
          await recalculateCourseProgress(enrollment.id);
        }
      }

      res.json(
        successResponse({
          submissionId: submission.id,
          score,
          isPassed,
          passMark: quiz.passMark,
          correct,
          total,
        })
      );
    } catch (err) {
      next(err);
    }
  }
);

export default router;
