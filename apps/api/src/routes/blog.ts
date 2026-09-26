import { Router, type Request, type Response, type NextFunction } from "express";
import { z } from "zod";
import { authenticate } from "../middleware/authenticate.js";
import { validateBody } from "../middleware/validateBody.js";
import { prisma } from "../db/prisma.js";
import { AppError, successResponse, errorResponse } from "../types/index.js";

const router = Router();

// GET /api/blog — public listing
router.get("/", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { category, tag, search } = req.query as Record<string, string>;
    // Batch8 (unbounded pagination): clamp limit to [1,50] and page to >=1 so a
    // client cannot request an arbitrarily large page (DoS / memory blow-up) or a
    // negative skip.
    const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 12));
    const page = Math.max(1, Number(req.query.page) || 1);
    const skip = (page - 1) * limit;

    const where = {
      status: "published" as const,
      ...(category && { category }),
      ...(tag && { tags: { has: tag } }),
      ...(search && {
        OR: [
          { title: { contains: search, mode: "insensitive" as const } },
          { excerpt: { contains: search, mode: "insensitive" as const } },
        ],
      }),
    };

    const [posts, total] = await Promise.all([
      prisma.blogPost.findMany({
        where,
        select: {
          id: true, slug: true, title: true, excerpt: true,
          coverUrl: true, category: true, tags: true, publishedAt: true,
          author: { select: { id: true, name: true, avatarUrl: true } },
        },
        orderBy: { publishedAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.blogPost.count({ where }),
    ]);

    return res.json(successResponse(posts, { total, page, limit }));
  } catch (err) {
    next(err);
  }
});

// GET /api/blog/:slug — public detail
router.get("/:slug", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const post = await prisma.blogPost.findFirst({
      where: { slug: req.params.slug, status: "published" },
      include: { author: { select: { id: true, name: true, avatarUrl: true } } },
    });
    if (!post) throw new AppError(404, "Artikel tidak ditemukan.");
    return res.json(successResponse(post));
  } catch (err) {
    next(err);
  }
});

// ─── Admin-only below ─────────────────────────────────────────────────────────

function requireAdmin(req: Request, _res: Response, next: NextFunction) {
  if (!req.user?.roles.includes("super_admin")) {
    return next(new AppError(403, "Akses ditolak."));
  }
  next();
}

const postSchema = z.object({
  title: z.string().min(1).max(255),
  slug: z.string().min(1).max(255).regex(/^[a-z0-9-]+$/, "Slug hanya huruf kecil, angka, dan tanda hubung."),
  excerpt: z.string().max(500).optional(),
  content: z.string().min(1),
  coverUrl: z.string().url().optional(),
  category: z.string().optional(),
  tags: z.array(z.string()).optional(),
  status: z.enum(["draft", "published"]).default("draft"),
});

// GET /api/blog/admin/posts — admin list all posts
router.get("/admin/posts", authenticate, requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { status } = req.query as Record<string, string>;
    // Batch8 (unbounded pagination): clamp to a safe [1,50] page size.
    const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 20));
    const page = Math.max(1, Number(req.query.page) || 1);
    const skip = (page - 1) * limit;
    const where = { ...(status && { status }) };

    const [posts, total] = await Promise.all([
      prisma.blogPost.findMany({
        where,
        select: {
          id: true, slug: true, title: true, status: true,
          category: true, publishedAt: true, createdAt: true,
          author: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.blogPost.count({ where }),
    ]);

    return res.json(successResponse(posts, { total, page, limit }));
  } catch (err) {
    next(err);
  }
});

// POST /api/blog/admin/posts — create post
router.post("/admin/posts", authenticate, requireAdmin, validateBody(postSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authorId = req.user!.id;
    const body = req.body as z.infer<typeof postSchema>;

    const existing = await prisma.blogPost.findUnique({ where: { slug: body.slug } });
    if (existing) throw new AppError(409, "Slug sudah digunakan.");

    const post = await prisma.blogPost.create({
      data: {
        ...body,
        authorId,
        publishedAt: body.status === "published" ? new Date() : null,
        tags: body.tags ?? [],
      },
      include: { author: { select: { id: true, name: true } } },
    });
    return res.status(201).json(successResponse(post));
  } catch (err) {
    next(err);
  }
});

// PATCH /api/blog/admin/posts/:postId — update post
router.patch("/admin/posts/:postId", authenticate, requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { postId } = req.params;
    // Batch8 (PATCH had no Zod): validate the partial body instead of spreading
    // raw req.body straight into the update (which allowed unvalidated/injected
    // fields and malformed slugs).
    const parsed = postSchema.partial().safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json(errorResponse("VALIDATION_ERROR", parsed.error.issues[0]?.message ?? "Validasi gagal."));
    }
    const data = parsed.data;

    const existing = await prisma.blogPost.findUnique({ where: { id: postId } });
    if (!existing) throw new AppError(404, "Artikel tidak ditemukan.");

    // Re-check slug uniqueness when it changes (excluding this post).
    if (data.slug && data.slug !== existing.slug) {
      const clash = await prisma.blogPost.findFirst({ where: { slug: data.slug, id: { not: postId } } });
      if (clash) throw new AppError(409, "Slug sudah digunakan.");
    }

    const publishedAt = data.status === "published" && existing.status !== "published"
      ? new Date()
      : existing.publishedAt;

    const post = await prisma.blogPost.update({
      where: { id: postId },
      data: { ...data, publishedAt },
      include: { author: { select: { id: true, name: true } } },
    });
    return res.json(successResponse(post));
  } catch (err) {
    next(err);
  }
});

// DELETE /api/blog/admin/posts/:postId
router.delete("/admin/posts/:postId", authenticate, requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { postId } = req.params;
    const existing = await prisma.blogPost.findUnique({ where: { id: postId } });
    if (!existing) throw new AppError(404, "Artikel tidak ditemukan.");
    await prisma.blogPost.delete({ where: { id: postId } });
    return res.json(successResponse({ deleted: true }));
  } catch (err) {
    next(err);
  }
});

export default router;
