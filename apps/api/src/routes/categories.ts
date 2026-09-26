import { Router, type Request, type Response, type NextFunction } from "express";
import { z } from "zod";
import { prisma } from "../db/prisma.js";
import { authenticate } from "../middleware/authenticate.js";
import { authorize } from "../middleware/authorize.js";
import { validateBody } from "../middleware/validateBody.js";
import { AppError, successResponse } from "../types/index.js";

const router = Router();

// GET /api/categories
router.get("/", async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const categories = await prisma.courseCategory.findMany({
      orderBy: { sortOrder: "asc" },
      select: {
        id: true,
        name: true,
        slug: true,
        iconUrl: true,
        sortOrder: true,
        _count: { select: { courses: { where: { status: "published" } } } },
      },
    });
    res.json(successResponse(categories));
  } catch (err) {
    next(err);
  }
});

// GET /api/categories/:slug
router.get("/:slug", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const category = await prisma.courseCategory.findUnique({
      where: { slug: req.params.slug },
      select: {
        id: true,
        name: true,
        slug: true,
        iconUrl: true,
        _count: { select: { courses: { where: { status: "published" } } } },
      },
    });
    if (!category) return next(new AppError(404, "Kategori tidak ditemukan."));
    res.json(successResponse(category));
  } catch (err) {
    next(err);
  }
});

// POST /api/categories — super_admin only
const createCategorySchema = z.object({
  name: z.string().min(2).max(100),
  slug: z.string().min(2).max(100).regex(/^[a-z0-9-]+$/),
  iconUrl: z.string().url().optional(),
  sortOrder: z.number().int().min(0).optional(),
});

router.post(
  "/",
  authenticate,
  authorize("super_admin"),
  validateBody(createCategorySchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const category = await prisma.courseCategory.create({ data: req.body });
      res.status(201).json(successResponse(category));
    } catch (err) {
      next(err);
    }
  },
);

export default router;
