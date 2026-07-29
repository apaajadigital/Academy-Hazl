import { Router } from "express";
import { authenticate } from "../middleware/authenticate.js";
import { prisma } from "../db/prisma.js";
import { validateCoupon } from "../services/coupon/couponService.js";
import { successResponse, errorResponse } from "../types/index.js";
import { z } from "zod";

const router = Router();

// Public: validate coupon
router.post("/validate", authenticate, async (req, res, next) => {
  try {
    const { code, subtotal } = req.body as { code: string; subtotal: number };
    if (!code || typeof subtotal !== "number") {
      return res.status(400).json(errorResponse("BAD_REQUEST", "code dan subtotal diperlukan."));
    }
    const result = await validateCoupon(code, subtotal);
    return res.json(successResponse(result));
  } catch (err) {
    next(err);
  }
});

// --- Admin-only below ---

function requireAdmin(req: Parameters<typeof authenticate>[0], res: Parameters<typeof authenticate>[1], next: Parameters<typeof authenticate>[2]) {
  if (!req.user?.roles.includes("super_admin")) {
    return res.status(403).json(errorResponse("FORBIDDEN", "Akses ditolak."));
  }
  next();
}

const couponSchema = z.object({
  code: z.string().min(3).max(50).transform((v) => v.toUpperCase()),
  type: z.enum(["percentage", "fixed"]),
  value: z.number().positive(),
  maxDiscount: z.number().positive().optional(),
  minPurchase: z.number().min(0).default(0),
  usageLimit: z.number().int().positive().optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  description: z.string().optional(),
  isActive: z.boolean().default(true),
});

router.get("/", authenticate, requireAdmin, async (req, res, next) => {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(50, Number(req.query.limit) || 20);
    const skip = (page - 1) * limit;

    const [coupons, total] = await Promise.all([
      prisma.coupon.findMany({ orderBy: { createdAt: "desc" }, skip, take: limit }),
      prisma.coupon.count(),
    ]);
    return res.json(successResponse(coupons, { total, page, limit }));
  } catch (err) {
    next(err);
  }
});

router.post("/", authenticate, requireAdmin, async (req, res, next) => {
  try {
    const body = couponSchema.safeParse(req.body);
    if (!body.success) return res.status(400).json(errorResponse("VALIDATION_ERROR", body.error.issues[0]?.message ?? "Validasi gagal."));

    const coupon = await prisma.coupon.create({ data: body.data });
    return res.status(201).json(successResponse(coupon));
  } catch (err: unknown) {
    if ((err as { code?: string }).code === "P2002") {
      return res.status(409).json(errorResponse("CONFLICT", "Kode kupon sudah digunakan."));
    }
    next(err);
  }
});

router.patch("/:id", authenticate, requireAdmin, async (req, res, next) => {
  try {
    const body = couponSchema.partial().safeParse(req.body);
    if (!body.success) return res.status(400).json(errorResponse("VALIDATION_ERROR", body.error.issues[0]?.message ?? "Validasi gagal."));

    const coupon = await prisma.coupon.update({ where: { id: req.params.id }, data: body.data });
    return res.json(successResponse(coupon));
  } catch (err) {
    next(err);
  }
});

router.delete("/:id", authenticate, requireAdmin, async (req, res, next) => {
  try {
    await prisma.coupon.update({ where: { id: req.params.id }, data: { isActive: false } });
    return res.json(successResponse({ message: "Kupon dinonaktifkan." }));
  } catch (err) {
    next(err);
  }
});

export default router;
