import { Router, type Request, type Response, type NextFunction } from "express";
import { z } from "zod";
import { validateBody } from "../../middleware/validateBody.js";
import { prisma } from "../../db/prisma.js";
import { AppError, successResponse } from "../../types/index.js";

const router = Router();

// ─── Admin: Blog ──────────────────────────────────────────────────────────────

const BlogListSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  status: z.string().optional(),
  search: z.string().optional(),
});

// GET /api/admin/blog
router.get("/blog", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { page, limit, status, search } = BlogListSchema.parse(req.query);
    const skip = (page - 1) * limit;

    const where = {
      ...(status ? { status } : {}),
      ...(search ? { title: { contains: search, mode: "insensitive" as const } } : {}),
    };

    const [posts, total] = await Promise.all([
      prisma.blogPost.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        select: {
          id: true, slug: true, title: true, excerpt: true,
          coverUrl: true, category: true, status: true,
          publishedAt: true, createdAt: true,
          author: { select: { id: true, name: true } },
        },
      }),
      prisma.blogPost.count({ where }),
    ]);

    res.json(successResponse(posts, { total, page, limit }));
  } catch (err) {
    next(err);
  }
});

// PATCH /api/admin/blog/:id — status transitions from the admin panel.
// The handler previously read `req.body` raw with no schema at all; the enum
// mirrors the buttons in apps/web/app/admin/blog/page.tsx.
const AdminBlogUpdateSchema = z.object({
  status: z.enum(["draft", "published", "archived"]),
});

router.patch(
  "/blog/:id",
  validateBody(AdminBlogUpdateSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { status } = req.body as z.infer<typeof AdminBlogUpdateSchema>;

      const existing = await prisma.blogPost.findUnique({
        where: { id: req.params.id },
        select: { id: true, publishedAt: true },
      });
      if (!existing) return next(new AppError(404, "Artikel tidak ditemukan."));

      // `publishedAt` is the article's real first-publication date, not a status
      // timestamp. Unpublishing used to null it and every re-publish stamped
      // `new Date()`, so an old article toggled off once jumped to the top of
      // the public listing (ordered `publishedAt desc`) with its original date
      // gone for good. Same rule as routes/blog.ts: keep what is already there,
      // set it only on the first publish.
      const data: Record<string, unknown> = { status };
      if (status === "published" && existing.publishedAt === null) {
        data.publishedAt = new Date();
      }

      const post = await prisma.blogPost.update({
        where: { id: req.params.id },
        data,
        select: { id: true, title: true, status: true, publishedAt: true },
      });
      return res.json(successResponse(post));
    } catch (err) {
      next(err);
    }
  },
);

export default router;
