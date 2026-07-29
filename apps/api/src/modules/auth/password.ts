import { Router, type Request, type Response, type NextFunction } from "express";
import { z } from "zod";
import { randomUUID } from "crypto";
import { prisma } from "../../db/prisma.js";
import { hashPassword } from "../../services/auth/hash.js";
import { writeAudit } from "../../services/audit/log.js";
import { validateBody } from "../../middleware/validateBody.js";
import { loginLimiter } from "../../middleware/rateLimiter.js";
import { AppError, successResponse } from "../../types/index.js";
import { env } from "../../config/env.js";
import { logger } from "../../lib/logger.js";
import { sendPasswordResetEmail } from "../../services/notification/emailService.js";
import { getIp, passwordSchema } from "./shared.js";

const router = Router();

// POST /api/auth/forgot-password
const forgotSchema = z.object({ email: z.string().email() });

router.post(
  "/forgot-password",
  loginLimiter,
  validateBody(forgotSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { email } = req.body as z.infer<typeof forgotSchema>;

      const user = await prisma.user.findUnique({ where: { email } });
      // Always respond 200 to prevent email enumeration
      if (user && !user.deletedAt) {
        const token = randomUUID();
        const expiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

        await prisma.user.update({
          where: { id: user.id },
          data: { resetPasswordToken: token, resetPasswordExpiry: expiry },
        });

        // Email delivery is best-effort and MUST NOT change the response: a send
        // failure that surfaced as a 500 would leak which addresses are registered,
        // defeating the generic-200 anti-enumeration guarantee below.
        try {
          await sendPasswordResetEmail(user.email, user.name ?? "Pengguna", token);
        } catch (mailErr) {
          logger.error("password reset email failed", { userId: user.id, err: mailErr });
        }

        if (env.NODE_ENV !== "production") {
          logger.info(`[dev] Password reset token for ${email}: ${token}`);
        }
      }

      res.json(
        successResponse({
          message: "Jika email terdaftar, instruksi reset kata sandi telah dikirim.",
        }),
      );
    } catch (err) {
      next(err);
    }
  },
);

// POST /api/auth/reset-password
const resetSchema = z.object({
  token: z.string().uuid(),
  password: passwordSchema,
});

router.post(
  "/reset-password",
  validateBody(resetSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { token, password } = req.body as z.infer<typeof resetSchema>;

      const user = await prisma.user.findFirst({
        where: {
          resetPasswordToken: token,
          resetPasswordExpiry: { gt: new Date() },
          deletedAt: null,
        },
      });

      if (!user) {
        return next(new AppError(400, "Token reset kata sandi tidak valid atau sudah kedaluwarsa."));
      }

      const passwordHash = await hashPassword(password);

      await prisma.$transaction([
        prisma.user.update({
          where: { id: user.id },
          data: {
            passwordHash,
            resetPasswordToken: null,
            resetPasswordExpiry: null,
          },
        }),
        // Revoke all refresh tokens on password change
        prisma.refreshToken.updateMany({
          where: { userId: user.id, revokedAt: null },
          data: { revokedAt: new Date() },
        }),
      ]);

      await writeAudit({
        actorId: user.id,
        actorEmail: user.email,
        action: "USER_PASSWORD_RESET",
        resource: "User",
        resourceId: user.id,
        ip: getIp(req),
        userAgent: req.headers["user-agent"],
      });

      res.json(successResponse({ message: "Kata sandi berhasil diperbarui. Silakan login kembali." }));
    } catch (err) {
      next(err);
    }
  },
);

export default router;
