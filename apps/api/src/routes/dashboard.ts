import { Router, type Request, type Response, type NextFunction } from "express";
import { authenticate } from "../middleware/authenticate.js";
import { prisma } from "../db/prisma.js";
import { successResponse } from "../types/index.js";

const router = Router();

// GET /api/dashboard — student dashboard summary
router.get("/", authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;

    const [enrollments, certificates, recentProgress] = await Promise.all([
      prisma.courseEnrollment.findMany({
        where: { userId },
        include: {
          course: {
            select: {
              id: true,
              title: true,
              slug: true,
              thumbnailUrl: true,
              level: true,
              trainer: { select: { name: true } },
            },
          },
          progress: { select: { isCompleted: true } },
        },
        orderBy: { enrolledAt: "desc" },
      }),
      prisma.certificate.findMany({
        where: { userId },
        orderBy: { issuedAt: "desc" },
        take: 5,
        select: {
          id: true,
          code: true,
          issuedAt: true,
          course: { select: { title: true } },
        },
      }),
      prisma.courseLessonProgress.findMany({
        where: { enrollment: { userId } },
        orderBy: { completedAt: "desc" },
        take: 5,
        select: {
          lessonId: true,
          isCompleted: true,
          completedAt: true,
          lesson: { select: { title: true } },
          enrollment: { select: { courseId: true } },
        },
      }),
    ]);

    const totalEnrolled = enrollments.length;
    const totalCompleted = enrollments.filter((e) => e.isCompleted).length;
    const totalInProgress = enrollments.filter((e) => !e.isCompleted && Number(e.progressPct) > 0).length;

    res.json(
      successResponse({
        stats: {
          totalEnrolled,
          totalCompleted,
          totalInProgress,
          totalCertificates: certificates.length,
        },
        enrollments,
        recentCertificates: certificates,
        recentActivity: recentProgress,
      })
    );
  } catch (err) {
    next(err);
  }
});

export default router;
