/**
 * Trainer Certificates — list certificates issued for trainer's courses.
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

// GET /api/trainer/courses/:courseId/certificates
router.get(
  "/courses/:courseId/certificates",
  requireTrainer,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const trainerId = req.user!.id;
      const { courseId } = req.params;
      if (!courseId) throw new AppError(400, "Course ID tidak valid.");

      // Ownership check
      const course = await prisma.course.findFirst({
        where: { id: courseId, trainerId },
        select: { id: true, title: true },
      });
      if (!course) throw new AppError(404, "Kursus tidak ditemukan.");

      const params = parsePageParams(req.query);

      const where = { courseId };
      const [certificates, total] = await Promise.all([
        prisma.certificate.findMany({
          where,
          orderBy: { issuedAt: "desc" },
          skip: params.skip,
          take: params.limit,
          include: {
            user: { select: { id: true, name: true, email: true } },
          },
        }),
        prisma.certificate.count({ where }),
      ]);

      const data = certificates.map((cert) => ({
        id: cert.id,
        code: cert.code,
        userName: cert.user.name,
        userEmail: cert.user.email,
        issuedAt: cert.issuedAt,
        isValid: cert.isValid,
        verifyUrl: `/verify/${cert.code}`,
      }));

      res.json(successResponse(data, buildPaginationMeta(total, params)));
    } catch (err) {
      next(err);
    }
  },
);

export default router;
