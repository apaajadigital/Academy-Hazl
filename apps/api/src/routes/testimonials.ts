import { Router, type Request, type Response, type NextFunction } from "express";
import { z } from "zod";
import { prisma } from "../db/prisma.js";
import { authenticate } from "../middleware/authenticate.js";
import { validateBody } from "../middleware/validateBody.js";
import { AppError, successResponse } from "../types/index.js";
import { writeAudit } from "../services/audit/log.js";

const router = Router();

function requireAdmin(req: Request): void {
  if (!req.user?.roles.includes("super_admin")) {
    throw new AppError(403, "Akses ditolak.");
  }
}

// GET /api/testimonials — PUBLIC. Only approved testimonials, newest/featured first.
// Optional `?category=alumni` narrows to alumni stories (BL-48); no param keeps
// the original behavior (all approved, any category).
const listQuerySchema = z.object({
  category: z.enum(["general", "alumni"]).optional(),
});
router.get("/", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { category } = listQuerySchema.parse({ category: req.query.category });
    const limit = Math.min(Number(req.query.limit ?? 12) || 12, 50);
    const items = await prisma.testimonial.findMany({
      where: { status: "approved", ...(category ? { category } : {}) },
      orderBy: [{ featured: "desc" }, { createdAt: "desc" }],
      take: limit,
      select: { id: true, name: true, role: true, company: true, quote: true, rating: true, photoUrl: true, featured: true, category: true, outcome: true },
    });
    res.json(successResponse(items));
  } catch (err) {
    next(err);
  }
});

// POST /api/testimonials — submit a testimonial (starts as `pending`; moderated before public).
const submitSchema = z.object({
  name: z.string().min(2).max(120),
  role: z.string().min(2).max(120),
  company: z.string().max(160).optional(),
  quote: z.string().min(10).max(1000),
  rating: z.number().int().min(1).max(5).optional(),
});
router.post(
  "/",
  authenticate,
  validateBody(submitSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = req.body as z.infer<typeof submitSchema>;
      const created = await prisma.testimonial.create({
        data: { ...data, userId: req.user!.id, status: "pending" },
        select: { id: true },
      });
      res.status(201).json(
        successResponse({ id: created.id, message: "Terima kasih! Testimoni Anda menunggu moderasi." }),
      );
    } catch (err) {
      next(err);
    }
  },
);

// GET /api/testimonials/admin — ADMIN. All testimonials, filterable by status.
router.get("/admin", authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    requireAdmin(req);
    const status = typeof req.query.status === "string" ? req.query.status : undefined;
    const items = await prisma.testimonial.findMany({
      where: status ? { status } : undefined,
      orderBy: { createdAt: "desc" },
      take: 200,
    });
    res.json(successResponse(items));
  } catch (err) {
    next(err);
  }
});

// PATCH /api/testimonials/:id/moderate — ADMIN. Approve/reject + optional feature
// flag. Only moderation may mark a testimonial `alumni` and attach a career
// outcome (users cannot self-mark on submission, BL-48).
const moderateSchema = z.object({
  status: z.enum(["approved", "rejected", "pending"]),
  featured: z.boolean().optional(),
  category: z.enum(["general", "alumni"]).optional(),
  outcome: z.string().max(300).nullable().optional(),
});
router.patch(
  "/:id/moderate",
  authenticate,
  validateBody(moderateSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      requireAdmin(req);
      const { id } = req.params;
      const { status, featured, category, outcome } = req.body as z.infer<typeof moderateSchema>;
      const updated = await prisma.testimonial.update({
        where: { id },
        data: {
          status,
          ...(featured !== undefined ? { featured } : {}),
          ...(category !== undefined ? { category } : {}),
          ...(outcome !== undefined ? { outcome } : {}),
        },
        select: { id: true, status: true, featured: true, category: true, outcome: true },
      });
      await writeAudit({
        actorId: req.user!.id,
        actorEmail: req.user!.email,
        action: "TESTIMONIAL_MODERATE",
        resource: "Testimonial",
        resourceId: id,
        ip: (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() ?? req.ip ?? "",
        userAgent: req.headers["user-agent"],
      });
      res.json(successResponse(updated));
    } catch (err) {
      next(err);
    }
  },
);

export default router;
