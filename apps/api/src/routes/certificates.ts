import { createReadStream, existsSync } from "node:fs";
import { join } from "node:path";
import { Router, type Request, type Response, type NextFunction } from "express";
import { prisma } from "../db/prisma.js";
import { authenticate } from "../middleware/authenticate.js";
import { issueCertificate } from "../services/certificate/certificateService.js";
import { AppError, successResponse } from "../types/index.js";

const router = Router();

// GET /api/certificates — list certificates for authenticated user
router.get("/", authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const certs = await prisma.certificate.findMany({
      where: { userId: req.user!.id, isValid: true, revokedAt: null },
      select: {
        id: true,
        code: true,
        type: true,
        issuedAt: true,
        fileUrl: true,
        course: { select: { id: true, title: true, slug: true, thumbnailUrl: true } },
      },
      orderBy: { issuedAt: "desc" },
    });

    return res.json(successResponse(certs));
  } catch (err) {
    next(err);
  }
});

// GET /api/certificates/:code — public verification endpoint
router.get("/:code", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { code } = req.params;

    const cert = await prisma.certificate.findUnique({
      where: { code },
      select: {
        code: true,
        type: true,
        issuedAt: true,
        revokedAt: true,
        isValid: true,
        user: { select: { name: true } },
        course: { select: { title: true } },
      },
    });

    if (!cert) {
      return next(new AppError(404, "Sertifikat tidak ditemukan."));
    }

    const isRevoked = cert.revokedAt !== null || !cert.isValid;

    res.json(
      successResponse({
        code: cert.code,
        type: cert.type,
        holderName: cert.user.name,
        courseName: cert.course?.title ?? null,
        issuedAt: cert.issuedAt,
        revokedAt: cert.revokedAt,
        status: isRevoked ? "revoked" : "valid",
      }),
    );
  } catch (err) {
    next(err);
  }
});

// GET /api/certificates/:code/download — stream PDF to authenticated user
router.get("/:code/download", authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { code } = req.params;

    const cert = await prisma.certificate.findUnique({
      where: { code },
      select: { userId: true, fileUrl: true, isValid: true, revokedAt: true },
    });

    if (!cert || !cert.isValid || cert.revokedAt) {
      return next(new AppError(404, "Sertifikat tidak ditemukan atau telah dicabut."));
    }

    // Only the owner or super_admin can download
    const isOwner = cert.userId === req.user!.id;
    const isAdmin = req.user!.roles.includes("super_admin");
    if (!isOwner && !isAdmin) return next(new AppError(403, "Akses ditolak."));

    if (cert.fileUrl) {
      const filePath = join(process.cwd(), cert.fileUrl.replace(/^\//, ""));
      if (existsSync(filePath)) {
        res.setHeader("Content-Type", "application/pdf");
        res.setHeader("Content-Disposition", `attachment; filename="sertifikat-${code}.pdf"`);
        return createReadStream(filePath).pipe(res);
      }
    }

    return next(new AppError(404, "File sertifikat belum tersedia."));
  } catch (err) {
    next(err);
  }
});

// POST /api/certificates/issue/:courseId — manually trigger certificate issuance
router.post("/issue/:courseId", authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { courseId } = req.params;
    if (!courseId) return next(new AppError(400, "courseId wajib."));
    const userId = req.user!.id;

    const enrollment = await prisma.courseEnrollment.findUnique({
      where: { courseId_userId: { courseId, userId } },
    });

    if (!enrollment?.isCompleted) {
      return next(new AppError(400, "Kursus belum selesai. Selesaikan minimal 80% materi terlebih dahulu."));
    }

    const result = await issueCertificate(userId, courseId);
    res.json(successResponse(result));
  } catch (err) {
    next(err);
  }
});

export default router;
