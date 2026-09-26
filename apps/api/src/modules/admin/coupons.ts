import { Router, type Request, type Response, type NextFunction } from "express";
import { z } from "zod";
import { prisma } from "../../db/prisma.js";
import { AppError, successResponse } from "../../types/index.js";

const router = Router();

// ─── Admin: Coupons ───────────────────────────────────────────────────────────

const AdminCouponSchema = z.object({
  code: z.string().min(3).max(50).transform((v) => v.toUpperCase()),
  type: z.enum(["percentage", "fixed"]),
  value: z.number().positive(),
  maxDiscount: z.number().positive().optional(),
  minPurchase: z.number().min(0).default(0),
  // Frontend sends maxUses/expiresAt — map to usageLimit/endDate
  maxUses: z.number().int().positive().optional(),
  usageLimit: z.number().int().positive().optional(),
  expiresAt: z.string().datetime().optional().nullable(),
  endDate: z.string().datetime().optional(),
  description: z.string().optional(),
  isActive: z.boolean().default(true),
});

// GET /api/admin/coupons
router.get("/coupons", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(50, Number(req.query.limit) || 20);
    const skip = (page - 1) * limit;

    const [coupons, total] = await Promise.all([
      prisma.coupon.findMany({ orderBy: { createdAt: "desc" }, skip, take: limit }),
      prisma.coupon.count(),
    ]);
    res.json(successResponse(coupons, { total, page, limit }));
  } catch (err) {
    next(err);
  }
});

// POST /api/admin/coupons
router.post("/coupons", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = AdminCouponSchema.safeParse(req.body);
    if (!parsed.success) return next(new AppError(400, parsed.error.issues[0]?.message ?? "Validasi gagal."));

    const { maxUses, expiresAt, usageLimit, endDate, ...rest } = parsed.data;
    const coupon = await prisma.coupon.create({
      data: {
        ...rest,
        usageLimit: usageLimit ?? maxUses ?? undefined,
        endDate: endDate ?? (expiresAt ? new Date(expiresAt) : undefined),
      },
    });
    res.status(201).json(successResponse(coupon));
  } catch (err: unknown) {
    if ((err as { code?: string }).code === "P2002") {
      return next(new AppError(409, "Kode kupon sudah digunakan."));
    }
    next(err);
  }
});

// PATCH /api/admin/coupons/:id
router.patch("/coupons/:id", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = AdminCouponSchema.partial().safeParse(req.body);
    if (!parsed.success) return next(new AppError(400, parsed.error.issues[0]?.message ?? "Validasi gagal."));

    const { maxUses, expiresAt, usageLimit, endDate, ...rest } = parsed.data;
    const coupon = await prisma.coupon.update({
      where: { id: req.params.id },
      data: {
        ...rest,
        ...(usageLimit !== undefined || maxUses !== undefined ? { usageLimit: usageLimit ?? maxUses } : {}),
        ...(endDate !== undefined || expiresAt !== undefined ? { endDate: endDate ?? (expiresAt ? new Date(expiresAt) : null) } : {}),
      },
    });
    res.json(successResponse(coupon));
  } catch (err) {
    next(err);
  }
});

export default router;
