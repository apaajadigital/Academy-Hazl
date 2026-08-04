/**
 * Trainer Curriculum Management — CRUD for course sections & lessons.
 *
 * All endpoints verify the trainer owns the course (trainerId === req.user.id)
 * before any read or write. The ownership guard is centralised in
 * `requireCourseOwnership` to prevent TOCTOU bugs.
 */
import { Router, type Request, type Response, type NextFunction } from "express";
import { z } from "zod";
import { prisma } from "../../db/prisma.js";
import { AppError, successResponse, type Role } from "../../types/index.js";

const router = Router();

// ── helpers ──────────────────────────────────────────────────────────────────

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

/** Verify the trainer owns the course; returns the course row for chaining. */
async function requireCourseOwnership(courseId: string, trainerId: string) {
  const course = await prisma.course.findFirst({
    where: { id: courseId, trainerId },
    select: { id: true },
  });
  if (!course) throw new AppError(404, "Kursus tidak ditemukan.");
  return course;
}

// ── GET /curriculum — full tree ──────────────────────────────────────────────

router.get(
  "/courses/:courseId/curriculum",
  requireTrainer,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { courseId } = req.params;
      if (!courseId) throw new AppError(400, "Course ID tidak valid.");
      await requireCourseOwnership(courseId, req.user!.id);

      const sections = await prisma.courseSection.findMany({
        where: { courseId },
        orderBy: { sortOrder: "asc" },
        include: {
          lessons: {
            orderBy: { sortOrder: "asc" },
            select: {
              id: true,
              title: true,
              type: true,
              contentUrl: true,
              contentText: true,
              duration: true,
              isPreview: true,
              sortOrder: true,
              quiz: { select: { id: true, passMark: true, _count: { select: { questions: true } } } },
            },
          },
        },
      });

      res.json(successResponse(sections));
    } catch (err) {
      next(err);
    }
  },
);

// ── Section CRUD ─────────────────────────────────────────────────────────────

const createSectionSchema = z.object({
  title: z.string().min(1).max(200),
});

router.post(
  "/courses/:courseId/sections",
  requireTrainer,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { courseId } = req.params;
      if (!courseId) throw new AppError(400, "Course ID tidak valid.");
      await requireCourseOwnership(courseId, req.user!.id);

      const { title } = createSectionSchema.parse(req.body);

      // Put new section at the end
      const maxOrder = await prisma.courseSection.aggregate({
        where: { courseId },
        _max: { sortOrder: true },
      });
      const nextOrder = (maxOrder._max.sortOrder ?? -1) + 1;

      const section = await prisma.courseSection.create({
        data: { courseId, title, sortOrder: nextOrder },
      });

      res.status(201).json(successResponse(section));
    } catch (err) {
      next(err);
    }
  },
);

const updateSectionSchema = z.object({
  title: z.string().min(1).max(200),
});

router.patch(
  "/sections/:sectionId",
  requireTrainer,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { sectionId } = req.params;
      if (!sectionId) throw new AppError(400, "Section ID tidak valid.");

      const section = await prisma.courseSection.findUnique({
        where: { id: sectionId },
        select: { id: true, courseId: true },
      });
      if (!section) throw new AppError(404, "Section tidak ditemukan.");
      await requireCourseOwnership(section.courseId, req.user!.id);

      const { title } = updateSectionSchema.parse(req.body);
      const updated = await prisma.courseSection.update({
        where: { id: sectionId },
        data: { title },
      });

      res.json(successResponse(updated));
    } catch (err) {
      next(err);
    }
  },
);

router.delete(
  "/sections/:sectionId",
  requireTrainer,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { sectionId } = req.params;
      if (!sectionId) throw new AppError(400, "Section ID tidak valid.");

      const section = await prisma.courseSection.findUnique({
        where: { id: sectionId },
        select: { id: true, courseId: true },
      });
      if (!section) throw new AppError(404, "Section tidak ditemukan.");
      await requireCourseOwnership(section.courseId, req.user!.id);

      // Cascade delete is handled by Prisma schema (onDelete: Cascade)
      await prisma.courseSection.delete({ where: { id: sectionId } });

      res.json(successResponse({ deleted: true }));
    } catch (err) {
      next(err);
    }
  },
);

// ── Lesson CRUD ──────────────────────────────────────────────────────────────

const createLessonSchema = z.object({
  title: z.string().min(1).max(300),
  type: z.enum(["video", "text", "quiz"]),
  contentUrl: z.string().url().optional().nullable(),
  contentText: z.string().optional().nullable(),
  duration: z.number().int().min(0).default(0),
  isPreview: z.boolean().default(false),
});

router.post(
  "/sections/:sectionId/lessons",
  requireTrainer,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { sectionId } = req.params;
      if (!sectionId) throw new AppError(400, "Section ID tidak valid.");

      const section = await prisma.courseSection.findUnique({
        where: { id: sectionId },
        select: { id: true, courseId: true },
      });
      if (!section) throw new AppError(404, "Section tidak ditemukan.");
      await requireCourseOwnership(section.courseId, req.user!.id);

      const data = createLessonSchema.parse(req.body);

      // Put new lesson at the end of this section
      const maxOrder = await prisma.courseLesson.aggregate({
        where: { sectionId },
        _max: { sortOrder: true },
      });
      const nextOrder = (maxOrder._max.sortOrder ?? -1) + 1;

      const lesson = await prisma.courseLesson.create({
        data: {
          sectionId,
          title: data.title,
          type: data.type,
          contentUrl: data.contentUrl ?? null,
          contentText: data.contentText ?? null,
          duration: data.duration,
          isPreview: data.isPreview,
          sortOrder: nextOrder,
        },
      });

      // Update course totalLessons and totalDuration
      const courseStats = await prisma.courseLesson.aggregate({
        where: { section: { courseId: section.courseId } },
        _count: { id: true },
        _sum: { duration: true },
      });
      await prisma.course.update({
        where: { id: section.courseId },
        data: {
          totalLessons: courseStats._count.id,
          totalDuration: courseStats._sum.duration ?? 0,
        },
      });

      res.status(201).json(successResponse(lesson));
    } catch (err) {
      next(err);
    }
  },
);

const updateLessonSchema = z.object({
  title: z.string().min(1).max(300).optional(),
  type: z.enum(["video", "text", "quiz"]).optional(),
  contentUrl: z.string().url().optional().nullable(),
  contentText: z.string().optional().nullable(),
  duration: z.number().int().min(0).optional(),
  isPreview: z.boolean().optional(),
});

router.patch(
  "/lessons/:lessonId",
  requireTrainer,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { lessonId } = req.params;
      if (!lessonId) throw new AppError(400, "Lesson ID tidak valid.");

      const lesson = await prisma.courseLesson.findUnique({
        where: { id: lessonId },
        include: { section: { select: { courseId: true } } },
      });
      if (!lesson) throw new AppError(404, "Lesson tidak ditemukan.");
      await requireCourseOwnership(lesson.section.courseId, req.user!.id);

      const data = updateLessonSchema.parse(req.body);
      const updated = await prisma.courseLesson.update({
        where: { id: lessonId },
        data,
      });

      // Re-aggregate if duration changed
      if (data.duration !== undefined) {
        const courseStats = await prisma.courseLesson.aggregate({
          where: { section: { courseId: lesson.section.courseId } },
          _sum: { duration: true },
        });
        await prisma.course.update({
          where: { id: lesson.section.courseId },
          data: { totalDuration: courseStats._sum.duration ?? 0 },
        });
      }

      res.json(successResponse(updated));
    } catch (err) {
      next(err);
    }
  },
);

router.delete(
  "/lessons/:lessonId",
  requireTrainer,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { lessonId } = req.params;
      if (!lessonId) throw new AppError(400, "Lesson ID tidak valid.");

      const lesson = await prisma.courseLesson.findUnique({
        where: { id: lessonId },
        include: { section: { select: { courseId: true } } },
      });
      if (!lesson) throw new AppError(404, "Lesson tidak ditemukan.");
      await requireCourseOwnership(lesson.section.courseId, req.user!.id);

      await prisma.courseLesson.delete({ where: { id: lessonId } });

      // Update course totalLessons and totalDuration
      const courseStats = await prisma.courseLesson.aggregate({
        where: { section: { courseId: lesson.section.courseId } },
        _count: { id: true },
        _sum: { duration: true },
      });
      await prisma.course.update({
        where: { id: lesson.section.courseId },
        data: {
          totalLessons: courseStats._count.id,
          totalDuration: courseStats._sum.duration ?? 0,
        },
      });

      res.json(successResponse({ deleted: true }));
    } catch (err) {
      next(err);
    }
  },
);

// ── Reorder ──────────────────────────────────────────────────────────────────

const reorderSectionsSchema = z.object({
  sectionIds: z.array(z.string().uuid()).min(1),
});

router.patch(
  "/courses/:courseId/reorder-sections",
  requireTrainer,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { courseId } = req.params;
      if (!courseId) throw new AppError(400, "Course ID tidak valid.");
      await requireCourseOwnership(courseId, req.user!.id);

      const { sectionIds } = reorderSectionsSchema.parse(req.body);

      await prisma.$transaction(
        sectionIds.map((id, index) =>
          prisma.courseSection.updateMany({
            where: { id, courseId },
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

const reorderLessonsSchema = z.object({
  lessonIds: z.array(z.string().uuid()).min(1),
});

router.patch(
  "/sections/:sectionId/reorder-lessons",
  requireTrainer,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { sectionId } = req.params;
      if (!sectionId) throw new AppError(400, "Section ID tidak valid.");

      const section = await prisma.courseSection.findUnique({
        where: { id: sectionId },
        select: { id: true, courseId: true },
      });
      if (!section) throw new AppError(404, "Section tidak ditemukan.");
      await requireCourseOwnership(section.courseId, req.user!.id);

      const { lessonIds } = reorderLessonsSchema.parse(req.body);

      await prisma.$transaction(
        lessonIds.map((id, index) =>
          prisma.courseLesson.updateMany({
            where: { id, sectionId },
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
