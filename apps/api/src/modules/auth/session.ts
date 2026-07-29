import { Router, type Request, type Response, type NextFunction } from "express";
import { prisma } from "../../db/prisma.js";
import {
  verifyRefreshToken,
  hashToken,
  REFRESH_COOKIE,
} from "../../services/auth/token.js";
import { AppError, successResponse } from "../../types/index.js";
import { issueTokens, COOKIE_OPTIONS } from "./shared.js";

const router = Router();

// POST /api/auth/logout
router.post(
  "/logout",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const raw = req.cookies?.[REFRESH_COOKIE] as string | undefined;
      if (raw) {
        const hash = hashToken(raw);
        await prisma.refreshToken.updateMany({
          where: { tokenHash: hash },
          data: { revokedAt: new Date() },
        });
      }
      res.clearCookie(REFRESH_COOKIE, COOKIE_OPTIONS);
      res.json(successResponse({ message: "Berhasil keluar." }));
    } catch (err) {
      next(err);
    }
  },
);

// POST /api/auth/refresh
router.post(
  "/refresh",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const raw = req.cookies?.[REFRESH_COOKIE] as string | undefined;
      if (!raw) {
        return next(new AppError(401, "Refresh token tidak ditemukan."));
      }

      let payload: ReturnType<typeof verifyRefreshToken>;
      try {
        payload = verifyRefreshToken(raw);
      } catch {
        return next(new AppError(401, "Refresh token tidak valid atau kedaluwarsa."));
      }

      const hash = hashToken(raw);
      const stored = await prisma.refreshToken.findUnique({ where: { tokenHash: hash } });

      if (!stored || stored.revokedAt !== null || stored.expiresAt < new Date()) {
        return next(new AppError(401, "Refresh token sudah dicabut atau kedaluwarsa."));
      }

      const user = await prisma.user.findUnique({
        where: { id: payload.sub },
        include: { roles: true },
      });

      if (!user || !user.isActive || user.deletedAt !== null) {
        return next(new AppError(401, "Akun tidak aktif."));
      }

      // Rotate: revoke old, issue new
      await prisma.refreshToken.update({
        where: { id: stored.id },
        data: { revokedAt: new Date() },
      });

      const { accessToken } = await issueTokens(
        res,
        user,
        user.roles,
        stored.ip ?? "",
        stored.userAgent ?? "",
      );

      res.json(successResponse({ accessToken }));
    } catch (err) {
      next(err);
    }
  },
);

export default router;
