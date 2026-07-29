import { Router, type Request, type Response, type NextFunction } from "express";
import { authenticate } from "../middleware/authenticate.js";
import { prisma } from "../db/prisma.js";
import { AppError, successResponse } from "../types/index.js";

const router = Router();

// GET /api/videos/:lessonId/url — get video URL (checks enrollment)
router.get(
  "/:lessonId/url",
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { lessonId } = req.params;

      const lesson = await prisma.courseLesson.findUnique({
        where: { id: lessonId },
        include: {
          section: {
            include: { course: { select: { id: true, status: true } } },
          },
        },
      });
      if (!lesson) return next(new AppError(404, "Lesson tidak ditemukan."));

      const course = lesson.section.course;

      // Preview lessons are always accessible
      if (!lesson.isPreview) {
        const enrollment = await prisma.courseEnrollment.findUnique({
          where: { courseId_userId: { courseId: course.id, userId: req.user!.id } },
        });
        if (!enrollment) {
          const isAdmin = req.user!.roles?.includes("super_admin");
          if (!isAdmin) return next(new AppError(403, "Anda belum terdaftar di kursus ini."));
        }
      }

      if (!lesson.contentUrl) {
        return next(new AppError(404, "Video tidak tersedia."));
      }

      // In production: generate a signed Cloudflare Stream URL here.
      // For dev: return contentUrl directly.
      const expiresAt = new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString();

      res.json(successResponse({ url: lesson.contentUrl, expiresAt }));
    } catch (err) {
      next(err);
    }
  }
);

export default router;
