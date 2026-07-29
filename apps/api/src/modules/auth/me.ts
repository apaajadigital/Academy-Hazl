import { Router, type Request, type Response, type NextFunction } from "express";
import { prisma } from "../../db/prisma.js";
import { authenticate } from "../../middleware/authenticate.js";
import { AppError, successResponse } from "../../types/index.js";
import { toGlobalRoles } from "../../lib/roles.js";

const router = Router();

// GET /api/auth/me
router.get(
  "/me",
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = await prisma.user.findUnique({
        where: { id: req.user!.id },
        select: {
          id: true,
          email: true,
          name: true,
          avatarUrl: true,
          isVerified: true,
          createdAt: true,
          roles: { select: { role: true, tenantId: true } },
          profile: { select: { phone: true, bio: true } },
          subscription: { select: { status: true, expiresAt: true } },
        },
      });
      if (!user) return next(new AppError(404, "Pengguna tidak ditemukan."));

      // Flatten profile fields into the top-level response
      const { profile, roles, ...rest } = user;
      res.json(successResponse({
        ...rest,
        // Same global-only reduction the session identity uses (BL-78b). /me is the
        // only role source the web shell trusts, so leaving it raw would render the
        // admin UI for a tenant-scoped grant that every /api/admin/* call then 403s.
        // Shape is preserved ({ role }[]) so existing clients keep parsing it.
        roles: toGlobalRoles(roles).map((role) => ({ role })),
        phone: profile?.phone ?? null,
        bio: profile?.bio ?? null,
      }));
    } catch (err) {
      next(err);
    }
  },
);

export default router;
