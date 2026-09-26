import { Router } from "express";
import { authenticate } from "../../middleware/authenticate.js";
import { prisma } from "../../db/prisma.js";
import { successResponse, errorResponse } from "../../types/index.js";
import { z } from "zod";
import { requireLmsAdmin, assertCourseInTenant, assertLessonInTenant, assertBatchInTenant } from "./guards.js";

const router = Router();

// ─── Tenant: Course Builder ───────────────────────────────────────────────────

const courseSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().optional(),
  status: z.enum(["draft", "published"]).default("draft"),
});

const lessonSchema = z.object({
  title: z.string().min(1).max(200),
  content: z.string().optional(),
  videoUrl: z.string().url().optional().or(z.string().startsWith("/")).optional(),
  durationMins: z.number().int().positive().optional(),
  sortOrder: z.number().int().default(0),
});

router.get("/tenants/:tenantId/courses", authenticate, async (req, res, next) => {
  try {
    await requireLmsAdmin(req, res, async () => {
      const courses = await prisma.lmsCourse.findMany({
        where: { tenantId: req.params.tenantId },
        orderBy: { createdAt: "desc" },
        include: { _count: { select: { lessons: true, enrollments: true } } },
      });
      return res.json(successResponse(courses));
    });
  } catch (err) {
    next(err);
  }
});

router.post("/tenants/:tenantId/courses", authenticate, async (req, res, next) => {
  try {
    await requireLmsAdmin(req, res, async () => {
      const body = courseSchema.safeParse(req.body);
      if (!body.success) return res.status(400).json(errorResponse("VALIDATION_ERROR", body.error.issues[0]?.message ?? "Validasi gagal."));
      const course = await prisma.lmsCourse.create({
        data: { ...body.data, tenantId: req.params.tenantId as string },
      });
      return res.status(201).json(successResponse(course));
    });
  } catch (err) {
    next(err);
  }
});

router.patch("/tenants/:tenantId/courses/:courseId", authenticate, async (req, res, next) => {
  try {
    await requireLmsAdmin(req, res, async () => {
      const body = courseSchema.partial().safeParse(req.body);
      if (!body.success) return res.status(400).json(errorResponse("VALIDATION_ERROR", body.error.issues[0]?.message ?? "Validasi gagal."));
      const course = await prisma.lmsCourse.update({
        where: { id: req.params.courseId, tenantId: req.params.tenantId },
        data: body.data,
      });
      return res.json(successResponse(course));
    });
  } catch (err) {
    next(err);
  }
});

// Lessons
router.get("/tenants/:tenantId/courses/:courseId/lessons", authenticate, async (req, res, next) => {
  try {
    await requireLmsAdmin(req, res, async () => {
      await assertCourseInTenant(req.params.courseId as string, req.params.tenantId as string);
      const lessons = await prisma.lmsLesson.findMany({
        where: { courseId: req.params.courseId },
        orderBy: { sortOrder: "asc" },
        include: { _count: { select: { quizzes: true } } },
      });
      return res.json(successResponse(lessons));
    });
  } catch (err) {
    next(err);
  }
});

router.post("/tenants/:tenantId/courses/:courseId/lessons", authenticate, async (req, res, next) => {
  try {
    await requireLmsAdmin(req, res, async () => {
      await assertCourseInTenant(req.params.courseId as string, req.params.tenantId as string);
      const body = lessonSchema.safeParse(req.body);
      if (!body.success) return res.status(400).json(errorResponse("VALIDATION_ERROR", body.error.issues[0]?.message ?? "Validasi gagal."));
      const lesson = await prisma.lmsLesson.create({
        // Denormalize tenantId for row-level isolation (defense-in-depth); source of truth is the URL tenant, already asserted to own the course.
        data: { ...body.data, courseId: req.params.courseId as string, tenantId: req.params.tenantId as string },
      });
      return res.status(201).json(successResponse(lesson));
    });
  } catch (err) {
    next(err);
  }
});

router.patch("/tenants/:tenantId/courses/:courseId/lessons/:lessonId", authenticate, async (req, res, next) => {
  try {
    await requireLmsAdmin(req, res, async () => {
      await assertLessonInTenant(req.params.lessonId as string, req.params.tenantId as string);
      const body = lessonSchema.partial().safeParse(req.body);
      if (!body.success) return res.status(400).json(errorResponse("VALIDATION_ERROR", body.error.issues[0]?.message ?? "Validasi gagal."));
      const lesson = await prisma.lmsLesson.update({
        where: { id: req.params.lessonId },
        data: body.data,
      });
      return res.json(successResponse(lesson));
    });
  } catch (err) {
    next(err);
  }
});

router.delete("/tenants/:tenantId/courses/:courseId/lessons/:lessonId", authenticate, async (req, res, next) => {
  try {
    await requireLmsAdmin(req, res, async () => {
      await assertLessonInTenant(req.params.lessonId as string, req.params.tenantId as string);
      await prisma.lmsLesson.delete({ where: { id: req.params.lessonId } });
      return res.json(successResponse({ message: "Lesson dihapus." }));
    });
  } catch (err) {
    next(err);
  }
});

// Quiz builder
router.post("/tenants/:tenantId/courses/:courseId/lessons/:lessonId/quizzes", authenticate, async (req, res, next) => {
  try {
    await requireLmsAdmin(req, res, async () => {
      await assertLessonInTenant(req.params.lessonId as string, req.params.tenantId as string);
      const { question, options, answer } = req.body as {
        question: string;
        options: string[];
        answer: number;
      };
      if (!question || !Array.isArray(options) || options.length < 2 || typeof answer !== "number") {
        return res.status(400).json(errorResponse("BAD_REQUEST", "question, options (min 2), dan answer diperlukan."));
      }
      const quiz = await prisma.lmsQuiz.create({
        // Denormalize tenantId for row-level isolation (defense-in-depth); the lesson was asserted to belong to this tenant above.
        data: { lessonId: req.params.lessonId as string, question, options, answer, tenantId: req.params.tenantId as string },
      });
      return res.status(201).json(successResponse(quiz));
    });
  } catch (err) {
    next(err);
  }
});

// Assign course to batch
router.post("/tenants/:tenantId/courses/:courseId/assign", authenticate, async (req, res, next) => {
  try {
    await requireLmsAdmin(req, res, async () => {
      const { batchId, dueDate, isMandatory } = req.body as {
        batchId: string;
        dueDate?: string;
        isMandatory?: boolean;
      };
      if (!batchId) return res.status(400).json(errorResponse("BAD_REQUEST", "batchId diperlukan."));

      const courseId = req.params.courseId as string;
      const tenantId = req.params.tenantId as string;
      // Both the course (URL) and the batch (body) must belong to this tenant,
      // otherwise an admin could assign across tenants or auto-enroll foreign members.
      await assertCourseInTenant(courseId, tenantId);
      await assertBatchInTenant(batchId, tenantId);
      const assignment = await prisma.lmsCourseAssignment.upsert({
        where: { batchId_courseId: { batchId, courseId } },
        create: {
          batchId,
          courseId,
          // Denormalize tenantId for row-level isolation (defense-in-depth); both batch and course were asserted in this tenant above.
          tenantId,
          dueDate: dueDate ? new Date(dueDate) : null,
          isMandatory: isMandatory ?? true,
        },
        update: { dueDate: dueDate ? new Date(dueDate) : null, isMandatory: isMandatory ?? true },
      });

      // Auto-enroll existing batch members
      const members = await prisma.lmsBatchMember.findMany({ where: { batchId } });
      for (const member of members) {
        await prisma.lmsEnrollment.upsert({
          where: { courseId_userId: { courseId, userId: member.userId } },
          create: { tenantId, courseId, userId: member.userId },
          update: {},
        });
      }
      return res.json(successResponse(assignment));
    });
  } catch (err) {
    next(err);
  }
});


export default router;
