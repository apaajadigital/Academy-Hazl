import { Router, type Request, type Response, type NextFunction } from "express";
import { prisma } from "../db/prisma.js";
import { AppError, successResponse } from "../types/index.js";
import { parsePageParams, buildPaginationMeta } from "../lib/pagination.js";

/**
 * Public member-portfolio showcase (Phase B — Alumni & Community, BL-48).
 * Read-only: content is curated exclusively through the admin CRUD
 * (`modules/admin/portfolios.ts`), so only `published` rows ever leave here.
 */
const router = Router();

// GET /api/portfolios — published portfolios, featured first then newest.
router.get("/", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const params = parsePageParams(req.query);
    const where = { status: "published" };
    const [items, total] = await Promise.all([
      prisma.memberPortfolio.findMany({
        where,
        orderBy: [{ featured: "desc" }, { createdAt: "desc" }],
        skip: params.skip,
        take: params.limit,
        // portfolioItems is intentionally omitted: the JSON payload can be
        // large and the list view only needs card-level fields.
        select: { id: true, name: true, role: true, headline: true, photoUrl: true, featured: true },
      }),
      prisma.memberPortfolio.count({ where }),
    ]);
    res.json(successResponse(items, buildPaginationMeta(total, params)));
  } catch (err) {
    next(err);
  }
});

// GET /api/portfolios/:id — full detail (incl. portfolioItems), published only.
router.get("/:id", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const item = await prisma.memberPortfolio.findUnique({ where: { id: req.params.id } });
    // Drafts 404 (not 403) so their existence is not leaked publicly.
    if (!item || item.status !== "published") {
      throw new AppError(404, "Portofolio tidak ditemukan.");
    }
    res.json(successResponse(item));
  } catch (err) {
    next(err);
  }
});

export default router;
