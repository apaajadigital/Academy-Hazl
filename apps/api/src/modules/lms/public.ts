import { Router } from "express";
import { prisma } from "../../db/prisma.js";
import { successResponse, AppError } from "../../types/index.js";

const router = Router();

// ─── Public Branding (no auth) ───────────────────────────────────────────────

router.get("/public/:tenantSlug", async (req, res, next) => {
  try {
    const tenant = await prisma.lmsTenant.findUnique({
      where: { slug: req.params.tenantSlug },
      select: { name: true, slug: true, logoUrl: true, primaryColor: true, isActive: true, trialEndsAt: true, planType: true },
    });
    if (!tenant) throw new AppError(404, "Tenant tidak ditemukan.");
    return res.json(successResponse(tenant));
  } catch (err) {
    next(err);
  }
});


export default router;
