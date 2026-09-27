import { Router, type Request, type Response, type NextFunction } from "express";
import { z } from "zod";
import { validateBody } from "../../middleware/validateBody.js";
import { prisma } from "../../db/prisma.js";
import { AppError, successResponse } from "../../types/index.js";

/**
 * Admin CRUD for member portfolios (Phase B — Alumni & Community, BL-48).
 * Mounted under /api/admin (authenticate + super_admin applied in routes/admin.ts).
 * Hard delete is allowed: portfolios are curated showcase content with no
 * purchase/ownership concerns (unlike e-books, see modules/admin/ebooks.ts M1).
 */
const router = Router();

const PortfolioListSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  status: z.enum(["draft", "published"]).optional(),
});

// GET /api/admin/portfolios — list all portfolios (any status) for admin
router.get("/portfolios", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { page, limit, status } = PortfolioListSchema.parse(req.query);
    const skip = (page - 1) * limit;
    const where = status ? { status } : {};

    const [items, total] = await Promise.all([
      prisma.memberPortfolio.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ featured: "desc" }, { createdAt: "desc" }],
      }),
      prisma.memberPortfolio.count({ where }),
    ]);

    res.json(successResponse(items, { total, page, limit }));
  } catch (err) {
    next(err);
  }
});

// GET /api/admin/portfolios/:id — single portfolio detail
router.get("/portfolios/:id", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const item = await prisma.memberPortfolio.findUnique({ where: { id: req.params.id } });
    if (!item) throw new AppError(404, "Portofolio tidak ditemukan.");
    res.json(successResponse(item));
  } catch (err) {
    next(err);
  }
});

// A single showcased work — shape stored as JSON on the row, so Zod here is the
// only guard keeping the array well-formed.
const portfolioItemSchema = z.object({
  title: z.string().min(1).max(160),
  url: z.string().url().startsWith("https://").optional(),
  imageUrl: z.string().url().startsWith("https://").optional(),
  description: z.string().max(300).optional(),
});

const portfolioSchema = z.object({
  name: z.string().min(2).max(120),
  role: z.string().min(2).max(120),
  headline: z.string().max(200).nullable().optional(),
  photoUrl: z.string().url().startsWith("https://").nullable().optional(),
  portfolioItems: z.array(portfolioItemSchema).max(30).default([]),
  featured: z.boolean().default(false),
  status: z.enum(["draft", "published"]).default("draft"),
});

// POST /api/admin/portfolios — create portfolio
router.post("/portfolios", validateBody(portfolioSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = req.body as z.infer<typeof portfolioSchema>;
    const created = await prisma.memberPortfolio.create({
      data: {
        name: data.name,
        role: data.role,
        headline: data.headline ?? null,
        photoUrl: data.photoUrl ?? null,
        portfolioItems: data.portfolioItems,
        featured: data.featured,
        status: data.status,
      },
    });
    res.status(201).json(successResponse(created));
  } catch (err) {
    next(err);
  }
});

// PATCH /api/admin/portfolios/:id — partial update
router.patch("/portfolios/:id", validateBody(portfolioSchema.partial()), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const existing = await prisma.memberPortfolio.findUnique({ where: { id } });
    if (!existing) throw new AppError(404, "Portofolio tidak ditemukan.");

    const data = req.body as Partial<z.infer<typeof portfolioSchema>>;
    const updated = await prisma.memberPortfolio.update({
      where: { id },
      data: {
        ...(data.name !== undefined ? { name: data.name } : {}),
        ...(data.role !== undefined ? { role: data.role } : {}),
        ...(data.headline !== undefined ? { headline: data.headline } : {}),
        ...(data.photoUrl !== undefined ? { photoUrl: data.photoUrl } : {}),
        ...(data.portfolioItems !== undefined ? { portfolioItems: data.portfolioItems } : {}),
        ...(data.featured !== undefined ? { featured: data.featured } : {}),
        ...(data.status !== undefined ? { status: data.status } : {}),
      },
    });
    res.json(successResponse(updated));
  } catch (err) {
    next(err);
  }
});

// DELETE /api/admin/portfolios/:id — hard delete (no purchase concerns)
router.delete("/portfolios/:id", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const existing = await prisma.memberPortfolio.findUnique({ where: { id } });
    if (!existing) throw new AppError(404, "Portofolio tidak ditemukan.");

    await prisma.memberPortfolio.delete({ where: { id } });
    res.json(successResponse({ message: "Portofolio berhasil dihapus." }));
  } catch (err) {
    next(err);
  }
});

export default router;
