import type { Request, Response, NextFunction } from "express";
import { AppError } from "../types/index.js";
import { verifyAccessToken } from "../services/auth/token.js";
import { prisma } from "../db/prisma.js";
import { toGlobalRoles, type RoleGrant } from "../lib/roles.js";

// Re-exported so existing importers (and the unit tests that pin this behaviour)
// keep their entry point while the reducer itself lives in lib/ — see lib/roles.ts
// for why the token-issuing path needs it too.
export { toGlobalRoles, type RoleGrant };

export async function authenticate(
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
      return next(new AppError(401, "Token akses diperlukan."));
    }

    const token = authHeader.slice(7);
    const payload = verifyAccessToken(token);

    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      select: {
        id: true,
        email: true,
        isActive: true,
        deletedAt: true,
        // `tenantId` is required to tell platform-wide grants from tenant-scoped
        // ones; without it the session cannot distinguish them (see toGlobalRoles).
        roles: { select: { role: true, tenantId: true } },
      },
    });

    if (!user || !user.isActive || user.deletedAt !== null) {
      return next(new AppError(401, "Akun tidak ditemukan atau telah dinonaktifkan."));
    }

    req.user = {
      id: user.id,
      email: user.email,
      roles: toGlobalRoles(user.roles),
    };

    next();
  } catch {
    next(new AppError(401, "Token tidak valid atau sudah kedaluwarsa."));
  }
}
