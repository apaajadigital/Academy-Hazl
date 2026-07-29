import { Router, type Request, type Response, type NextFunction } from "express";
import { z } from "zod";
import { prisma } from "../../db/prisma.js";
import { verifyPassword } from "../../services/auth/hash.js";
import { writeAudit } from "../../services/audit/log.js";
import { validateBody } from "../../middleware/validateBody.js";
import { loginLimiter } from "../../middleware/rateLimiter.js";
import { AppError, successResponse } from "../../types/index.js";
import { env } from "../../config/env.js";
import { getIp, issueTokens } from "./shared.js";

const router = Router();

// POST /api/auth/login
const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

router.post(
  "/login",
  loginLimiter,
  validateBody(loginSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { email, password } = req.body as z.infer<typeof loginSchema>;
      const ip = getIp(req);
      const ua = req.headers["user-agent"] ?? "";

      const user = await prisma.user.findUnique({
        where: { email },
        include: { roles: true },
      });

      const isValid = user?.passwordHash
        ? await verifyPassword(password, user.passwordHash)
        : false;

      if (!user || !isValid || user.deletedAt !== null || !user.isActive) {
        return next(new AppError(401, "Email atau kata sandi salah."));
      }

      // Email-verification gate (feature-flagged, default OFF). Enabling this
      // blocks unverified accounts from logging in — turn it on only after
      // existing users' verification status is backfilled, or it locks them out.
      if (env.ENFORCE_EMAIL_VERIFICATION && !user.isVerified) {
        return next(new AppError(403, "Email belum diverifikasi. Silakan cek email Anda untuk menyelesaikan verifikasi."));
      }

      const { accessToken } = await issueTokens(
        res,
        user,
        user.roles,
        ip,
        ua,
      );

      await prisma.user.update({
        where: { id: user.id },
        data: { lastLoginAt: new Date() },
      });

      await writeAudit({
        actorId: user.id,
        actorEmail: user.email,
        action: "USER_LOGIN",
        resource: "User",
        resourceId: user.id,
        ip,
        userAgent: ua,
      });

      res.json(
        successResponse({
          accessToken,
          user: { id: user.id, email: user.email, name: user.name },
        }),
      );
    } catch (err) {
      next(err);
    }
  },
);

export default router;
