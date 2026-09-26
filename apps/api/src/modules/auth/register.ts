import { Router, type Request, type Response, type NextFunction } from "express";
import { z } from "zod";
import { randomUUID } from "crypto";
import { prisma } from "../../db/prisma.js";
import { hashPassword } from "../../services/auth/hash.js";
import { sendVerificationEmail } from "../../services/notification/emailService.js";
import { writeAudit } from "../../services/audit/log.js";
import { logger } from "../../lib/logger.js";
import { validateBody } from "../../middleware/validateBody.js";
import { loginLimiter } from "../../middleware/rateLimiter.js";
import { AppError, successResponse } from "../../types/index.js";
import { env } from "../../config/env.js";
import { getIp, passwordSchema } from "./shared.js";

const router = Router();

// POST /api/auth/register
const registerSchema = z.object({
  name: z.string().min(2).max(100),
  email: z.string().email(),
  password: passwordSchema,
  consent: z.literal(true, { errorMap: () => ({ message: "Persetujuan privasi wajib diberikan." }) }),
});

router.post(
  "/register",
  loginLimiter,
  validateBody(registerSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { name, email, password } = req.body as z.infer<typeof registerSchema>;

      const existing = await prisma.user.findUnique({ where: { email } });
      if (existing) {
        return next(new AppError(409, "Email sudah terdaftar."));
      }

      const passwordHash = await hashPassword(password);
      const emailVerifyToken = randomUUID();
      const emailVerifyExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000);

      const user = await prisma.user.create({
        data: {
          name,
          email,
          passwordHash,
          consentGivenAt: new Date(),
          emailVerifyToken,
          emailVerifyExpiry,
          roles: { create: { role: "student" } },
        },
        select: { id: true, email: true, name: true },
      });

      await writeAudit({
        actorId: user.id,
        actorEmail: user.email,
        action: "USER_REGISTER",
        resource: "User",
        resourceId: user.id,
        ip: getIp(req),
        userAgent: req.headers["user-agent"],
      });

      // Best-effort: a failed/unconfigured mailer must not fail registration.
      // sendVerificationEmail degrades to a console log until RESEND_API_KEY is set.
      sendVerificationEmail(user.email, user.name, emailVerifyToken).catch((err: unknown) => {
        logger.warn("verification email send failed", { err: String(err), userId: user.id });
      });

      // In dev: return token for testing. In prod the link goes out by email above.
      const devToken = env.NODE_ENV !== "production" ? emailVerifyToken : undefined;

      res.status(201).json(
        successResponse({
          message: "Registrasi berhasil. Silakan verifikasi email Anda.",
          userId: user.id,
          ...(devToken && { devEmailVerifyToken: devToken }),
        }),
      );
    } catch (err) {
      next(err);
    }
  },
);

// POST /api/auth/verify-email
const verifyEmailSchema = z.object({ token: z.string().uuid() });

router.post(
  "/verify-email",
  validateBody(verifyEmailSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { token } = req.body as z.infer<typeof verifyEmailSchema>;

      const user = await prisma.user.findFirst({
        where: {
          emailVerifyToken: token,
          emailVerifyExpiry: { gt: new Date() },
          deletedAt: null,
        },
      });

      if (!user) {
        return next(new AppError(400, "Token verifikasi tidak valid atau sudah kedaluwarsa."));
      }

      await prisma.user.update({
        where: { id: user.id },
        data: {
          isVerified: true,
          emailVerifyToken: null,
          emailVerifyExpiry: null,
        },
      });

      await writeAudit({
        actorId: user.id,
        actorEmail: user.email,
        action: "USER_EMAIL_VERIFIED",
        resource: "User",
        resourceId: user.id,
        ip: getIp(req),
        userAgent: req.headers["user-agent"],
      });

      res.json(successResponse({ message: "Email berhasil diverifikasi." }));
    } catch (err) {
      next(err);
    }
  },
);

export default router;
