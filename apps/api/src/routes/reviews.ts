import { Router, type Request, type Response, type NextFunction } from "express";
import { z } from "zod";
import { authenticate } from "../middleware/authenticate.js";
import { validateBody } from "../middleware/validateBody.js";
import { prisma } from "../db/prisma.js";
import { parsePageParams, buildPaginationMeta } from "../lib/pagination.js";
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

/**
 * Page size of the public listing when the caller sends none.
 *
 * Kept at the 10 this endpoint has always returned (the shared helper defaults
 * to 20) so clamping the parameters does not silently change the payload size
 * for callers that never asked for a page — apps/web blog and lesson pages both
 * fetch without `?limit`.
 */
const PUBLIC_REVIEWS_DEFAULT_LIMIT = 10;

// GET /api/reviews?itemType=course&itemId=xxx — public listing
router.get("/", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { itemType, itemId } = req.query as Record<string, string | undefined>;
    if (!itemType || !itemId) throw new AppError(400, "itemType dan itemId wajib diisi.");

    // B3 (unbounded pagination): `parseInt(limit)` used to flow straight into
    // `take` and `(parseInt(page)-1)*parseInt(limit)` straight into `skip`, so
    // `?limit=999999` loaded every review of an item into memory in one query
    // and `?page=0` produced a negative skip that Prisma rejects with a 500.
    // This was the last list endpoint in the repo without the shared clamp.
    // Only forward a limit the client actually supplied as a usable number; a
    // missing or malformed one falls back to this endpoint's historical page
    // size rather than the helper's generic 20. The clamp to MAX_LIMIT still
    // comes from the helper.
    const rawLimit = Number(req.query.limit);
    const limit = Number.isInteger(rawLimit) && rawLimit > 0 ? rawLimit : PUBLIC_REVIEWS_DEFAULT_LIMIT;
    const params = parsePageParams({ page: req.query.page, limit });

    const where = { itemType, itemId, status: "published" };
    const [reviews, total, agg] = await Promise.all([
      prisma.review.findMany({
        where,
        include: { user: { select: { id: true, name: true, avatarUrl: true } } },
        orderBy: { createdAt: "desc" },
        skip: params.skip,
        take: params.limit,
      }),
      prisma.review.count({ where }),
      prisma.review.aggregate({
        _avg: { rating: true },
        _count: { id: true },
        where,
      }),
    ]);

    // `data` stays a FLAT array and the page info stays in `meta` — the blog
    // article client reads `d.data` as an array and `d.meta.avgRating`, so
    // wrapping the rows in an object here would break it.
    return res.json(successResponse(reviews, {
      ...buildPaginationMeta(total, params),
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

    const { itemType, status } = req.query as Record<string, string | undefined>;
    // Same clamp as the public listing above; the admin default page size of 20
    // is what the shared helper already uses, so no override is needed here.
    const params = parsePageParams(req.query);
    const where = {
      ...(itemType && { itemType }),
      ...(status && { status }),
    };

    const [reviews, total] = await Promise.all([
      prisma.review.findMany({
        where,
        include: { user: { select: { id: true, name: true, email: true } } },
        orderBy: { createdAt: "desc" },
        skip: params.skip,
        take: params.limit,
      }),
      prisma.review.count({ where }),
    ]);

    // Flat `data` array + page info in `meta`, unchanged from before the clamp.
    return res.json(successResponse(reviews, buildPaginationMeta(total, params)));
  } catch (err) {
    next(err);
  }
});

export default router;
