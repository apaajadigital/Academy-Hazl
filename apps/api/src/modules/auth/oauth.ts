import { Router, type Request, type Response, type NextFunction } from "express";
import { randomUUID } from "crypto";
import { prisma } from "../../db/prisma.js";
import { buildGoogleAuthUrl, exchangeGoogleCode } from "../../services/auth/google.js";
import { writeAudit } from "../../services/audit/log.js";
import { AppError } from "../../types/index.js";
import { env } from "../../config/env.js";
import { getIp, issueTokens } from "./shared.js";

const router = Router();

// GET /api/auth/google
router.get("/google", (req: Request, res: Response) => {
  const state = randomUUID();
  res.cookie("oauth_state", state, { httpOnly: true, secure: env.COOKIE_SECURE, sameSite: "lax", maxAge: 10 * 60 * 1000 });
  res.redirect(buildGoogleAuthUrl(state));
});

// GET /api/auth/google/callback
router.get(
  "/google/callback",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { code, state } = req.query as { code?: string; state?: string };
      const storedState = req.cookies?.["oauth_state"] as string | undefined;

      if (!code || !state || state !== storedState) {
        return next(new AppError(400, "Parameter OAuth tidak valid."));
      }

      res.clearCookie("oauth_state", { httpOnly: true, secure: env.COOKIE_SECURE, sameSite: "lax" });

      const profile = await exchangeGoogleCode(code);
      const ip = getIp(req);
      const ua = req.headers["user-agent"] ?? "";

      let user = await prisma.user.findUnique({
        where: { email: profile.email },
        include: { roles: true },
      });

      if (!user) {
        user = await prisma.user.create({
          data: {
            email: profile.email,
            name: profile.name,
            avatarUrl: profile.avatarUrl,
            authProvider: "google",
            isVerified: true,
            consentGivenAt: new Date(),
            roles: { create: { role: "student" } },
          },
          include: { roles: true },
        });

        await writeAudit({
          actorId: user.id,
          actorEmail: user.email,
          action: "USER_REGISTER_GOOGLE",
          resource: "User",
          resourceId: user.id,
          ip,
          userAgent: ua,
        });
      }

      if (!user.isActive || user.deletedAt !== null) {
        return res.redirect(`${env.WEB_URL}/masuk?error=account_disabled`);
      }

      const { accessToken } = await issueTokens(
        res,
        user,
        user.roles,
        ip,
        ua,
      );

      await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });

      res.redirect(`${env.WEB_URL}/auth/callback?token=${encodeURIComponent(accessToken)}`);
    } catch (err) {
      next(err);
    }
  },
);

export default router;
