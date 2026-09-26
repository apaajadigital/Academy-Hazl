import { Router, type Request, type Response, type NextFunction } from "express";
import { z } from "zod";
import { prisma } from "../../db/prisma.js";
import { successResponse } from "../../types/index.js";

const router = Router();

// ─── Admin: Reviews ───────────────────────────────────────────────────────────

const ReviewListSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  approved: z.string().optional(),
});

// GET /api/admin/reviews
router.get("/reviews", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { page, limit, approved } = ReviewListSchema.parse(req.query);
    const skip = (page - 1) * limit;

    const where = {
      ...(approved === "true" ? { status: "published" } : {}),
      ...(approved === "false" ? { status: "hidden" } : {}),
    };

    const [reviews, total] = await Promise.all([
      prisma.review.findMany({
        where,
        include: { user: { select: { id: true, name: true, email: true } } },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.review.count({ where }),
    ]);

    res.json(successResponse(reviews, { total, page, limit }));
  } catch (err) {
    next(err);
  }
});

// PATCH /api/admin/reviews/:id — moderate (isApproved → status)
router.patch("/reviews/:id", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { isApproved } = req.body as { isApproved?: boolean };
    const status = isApproved ? "published" : "hidden";

    const review = await prisma.review.update({
      where: { id: req.params.id },
      data: { status },
    });
    res.json(successResponse(review));
  } catch (err) {
    next(err);
  }
});

// DELETE /api/admin/reviews/:id
router.delete("/reviews/:id", async (req: Request, res: Response, next: NextFunction) => {
  try {
    await prisma.review.delete({ where: { id: req.params.id } });
    res.json(successResponse({ message: "Review dihapus." }));
  } catch (err) {
    next(err);
  }
});

export default router;
