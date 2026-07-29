import { Router, type Request, type Response, type NextFunction } from "express";
import { z } from "zod";
import { authenticate } from "../middleware/authenticate.js";
import { validateBody } from "../middleware/validateBody.js";
import { prisma } from "../db/prisma.js";
import { AppError, successResponse, type Role } from "../types/index.js";

const router = Router();

/**
 * Role check against the authenticated user.
 *
 * Typed against `Role` on purpose: the previous `roles.includes("x" as never)`
 * casts silenced the compiler entirely, so a typo or a renamed role would have
 * compiled into a guard that can never match. With `allowed: readonly Role[]`
 * an unknown role name is a build error.
 */
function hasAnyRole(req: Request, allowed: readonly Role[]): boolean {
  const roles: readonly Role[] = req.user?.roles ?? [];
  return allowed.some((role) => roles.includes(role));
}

const ADMIN_ROLES: readonly Role[] = ["super_admin"];

// GET /api/reviews?itemType=course&itemId=xxx — public listing
router.get("/", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { itemType, itemId, page = "1", limit = "10" } = req.query as Record<string, string>;
    if (!itemType || !itemId) throw new AppError(400, "itemType dan itemId wajib diisi.");

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [reviews, total, agg] = await Promise.all([
      prisma.review.findMany({
        where: { itemType, itemId, status: "published" },
        include: { user: { select: { id: true, name: true, avatarUrl: true } } },
        orderBy: { createdAt: "desc" },
        skip,
        take: parseInt(limit),
      }),
      prisma.review.count({ where: { itemType, itemId, status: "published" } }),
      prisma.review.aggregate({
        _avg: { rating: true },
        _count: { id: true },
        where: { itemType, itemId, status: "published" },
      }),
    ]);

    return res.json(successResponse(reviews, {
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      avgRating: Number(agg._avg.rating ?? 0),
      totalReviews: agg._count.id,
    }));
  } catch (err) {
    next(err);
  }
});

const reviewSchema = z.object({
  itemType: z.enum(["course", "event", "ebook"]),
  itemId: z.string().min(1),
  rating: z.number().int().min(1).max(5),
  content: z.string().max(2000).optional(),
});

// POST /api/reviews — submit review (auth required)
router.post("/", authenticate, validateBody(reviewSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const { itemType, itemId, rating, content } = req.body as z.infer<typeof reviewSchema>;

    const existing = await prisma.review.findUnique({
      where: { userId_itemType_itemId: { userId, itemType, itemId } },
    });
    if (existing) throw new AppError(409, "Anda sudah memberikan ulasan untuk item ini.");

    // M-review: only buyers/enrolled users may review. For a course, enrollment
    // (which also covers free enrollment) or a paid order item qualifies; for
    // ebook/event a paid order item is required.
    let hasPurchased = false;
    if (itemType === "course") {
      const enrollment = await prisma.courseEnrollment.findUnique({
        where: { courseId_userId: { courseId: itemId, userId } },
      });
      hasPurchased = enrollment !== null;
    }
    if (!hasPurchased) {
      const paidItem = await prisma.orderItem.findFirst({
        where: { itemType, itemId, order: { userId, status: "paid" } },
        select: { id: true },
      });
      hasPurchased = paidItem !== null;
    }
    if (!hasPurchased) {
      throw new AppError(403, "Hanya pembeli yang dapat memberi ulasan.");
    }

    const review = await prisma.review.create({
      data: { userId, itemType, itemId, rating, content },
      include: { user: { select: { id: true, name: true, avatarUrl: true } } },
    });
    return res.status(201).json(successResponse(review));
  } catch (err) {
    next(err);
  }
});

// PUT /api/reviews/:reviewId — edit own review
router.put("/:reviewId", authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const { reviewId } = req.params;
    const { rating, content } = req.body as { rating?: number; content?: string };

    const review = await prisma.review.findUnique({ where: { id: reviewId } });
    if (!review) throw new AppError(404, "Ulasan tidak ditemukan.");
    if (review.userId !== userId) throw new AppError(403, "Bukan ulasan Anda.");

    const updated = await prisma.review.update({
      where: { id: reviewId },
      data: {
        ...(rating !== undefined && { rating }),
        ...(content !== undefined && { content }),
      },
      include: { user: { select: { id: true, name: true, avatarUrl: true } } },
    });
    return res.json(successResponse(updated));
  } catch (err) {
    next(err);
  }
});

// PATCH /api/reviews/:reviewId/moderate — admin hide/unhide
router.patch("/:reviewId/moderate", authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const isAdmin = hasAnyRole(req, ADMIN_ROLES);
    if (!isAdmin) throw new AppError(403, "Akses ditolak.");

    const { reviewId } = req.params;
    const { status } = req.body as { status: string };
    if (!["published", "hidden"].includes(status)) throw new AppError(400, "Status tidak valid.");

    const review = await prisma.review.update({ where: { id: reviewId }, data: { status } });
    return res.json(successResponse(review));
  } catch (err) {
    next(err);
  }
});

// GET /api/reviews/admin — admin list all (auth + admin)
router.get("/admin", authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const isAdmin = hasAnyRole(req, ADMIN_ROLES);
    if (!isAdmin) throw new AppError(403, "Akses ditolak.");

    const { itemType, status, page = "1", limit = "20" } = req.query as Record<string, string>;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const where = {
      ...(itemType && { itemType }),
      ...(status && { status }),
    };

    const [reviews, total] = await Promise.all([
      prisma.review.findMany({
        where,
        include: { user: { select: { id: true, name: true, email: true } } },
        orderBy: { createdAt: "desc" },
        skip,
        take: parseInt(limit),
      }),
      prisma.review.count({ where }),
    ]);

    return res.json(successResponse(reviews, { total, page: parseInt(page), limit: parseInt(limit) }));
  } catch (err) {
    next(err);
  }
});

export default router;
