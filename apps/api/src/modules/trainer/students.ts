/**
 * Trainer Student Roster — list enrolled students per course.
 */
import { Router, type Request, type Response, type NextFunction } from "express";
import { prisma } from "../../db/prisma.js";
import { AppError, successResponse, type Role } from "../../types/index.js";
import { parsePageParams, buildPaginationMeta } from "../../lib/pagination.js";

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

// GET /api/trainer/courses/:courseId/students
router.get(
  "/courses/:courseId/students",
  requireTrainer,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const trainerId = req.user!.id;
      const { courseId } = req.params;
      if (!courseId) throw new AppError(400, "Course ID tidak valid.");

      // Ownership check
      const course = await prisma.course.findFirst({
        where: { id: courseId, trainerId },
        select: { id: true, totalLessons: true },
      });
      if (!course) throw new AppError(404, "Kursus tidak ditemukan.");

      const params = parsePageParams(req.query);
      const search = typeof req.query.search === "string" ? req.query.search : undefined;

      const where: Record<string, unknown> = { courseId };
      if (search) {
        where.user = {
          OR: [
            { name: { contains: search, mode: "insensitive" } },
            { email: { contains: search, mode: "insensitive" } },
          ],
        };
      }

      const [enrollments, total] = await Promise.all([
        prisma.courseEnrollment.findMany({
          where,
          orderBy: { enrolledAt: "desc" },
          skip: params.skip,
          take: params.limit,
          include: {
            user: { select: { id: true, name: true, email: true, avatarUrl: true } },
          },
        }),
        prisma.courseEnrollment.count({ where }),
      ]);

      // Compute progress for each student
      const studentData = await Promise.all(
        enrollments.map(async (enrollment) => {
          const completedLessons = await prisma.courseLessonProgress.count({
            where: {
              userId: enrollment.userId,
              isCompleted: true,
              lesson: { section: { courseId } },
            },
          });

          const progressPct =
            course.totalLessons > 0
              ? Math.round((completedLessons / course.totalLessons) * 100)
              : 0;

          return {
            id: enrollment.id,
            user: enrollment.user,
            enrolledAt: enrollment.enrolledAt,
            completedAt: enrollment.completedAt,
            completedLessons,
            totalLessons: course.totalLessons,
            progressPct,
          };
        }),
      );

      res.json(successResponse(studentData, buildPaginationMeta(total, params)));
    } catch (err) {
      next(err);
    }
  },
);

export default router;
