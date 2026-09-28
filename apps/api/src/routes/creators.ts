import { Router, type Request, type Response, type NextFunction } from "express";
import { prisma } from "../db/prisma.js";
import { AppError, successResponse } from "../types/index.js";
import { parsePageParams, buildPaginationMeta } from "../lib/pagination.js";

/**
 * Public creator (trainer) directory + profile (mirrors the reference
 * hazl-skill.vercel.app "Kreator" surface).
 *
 * Read-only. A user only appears here when they hold the "trainer" role AND
 * have at least one published course — an inactive/pending trainer account
 * is not a public profile. Portfolio items come from `MemberPortfolio` rows
 * linked via `userId`; a trainer with none simply has an empty list (never
 * fabricated placeholder work).
 */
const router = Router();

const TRAINER_SELECT = {
  id: true,
  name: true,
  avatarUrl: true,
  profile: {
    select: { headline: true, bio: true, location: true, expertise: true, linkedin: true },
  },
} as const;

// GET /api/creators — trainers with at least one published course.
router.get("/", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const params = parsePageParams(req.query);
    const q = typeof req.query.q === "string" ? req.query.q.trim() : "";

    const where = {
      roles: { some: { role: "trainer" } },
      courses: { some: { status: "published" } },
      ...(q
        ? {
            OR: [
              { name: { contains: q, mode: "insensitive" as const } },
              { profile: { headline: { contains: q, mode: "insensitive" as const } } },
            ],
          }
        : {}),
    };

    const [trainers, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: TRAINER_SELECT,
        orderBy: { name: "asc" },
        skip: params.skip,
        take: params.limit,
      }),
      prisma.user.count({ where }),
    ]);

    res.json(successResponse(trainers, buildPaginationMeta(total, params)));
  } catch (err) {
    next(err);
  }
});

// GET /api/creators/:id — profile + their published courses + portfolio items.
router.get("/:id", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const trainer = await prisma.user.findFirst({
      where: {
        id: req.params.id,
        roles: { some: { role: "trainer" } },
        courses: { some: { status: "published" } },
      },
      select: {
        ...TRAINER_SELECT,
        courses: {
          where: { status: "published" },
          orderBy: { publishedAt: "desc" },
          select: {
            id: true,
            slug: true,
            title: true,
            shortDesc: true,
            price: true,
            salePrice: true,
            level: true,
            thumbnailUrl: true,
            totalDuration: true,
            totalEnrolled: true,
            avgRating: true,
          },
        },
      },
    });

    // 404, not 403 — a non-public trainer's existence is not leaked.
    if (!trainer) throw new AppError(404, "Kreator tidak ditemukan.");

    const portfolio = await prisma.memberPortfolio.findMany({
      where: { userId: trainer.id, status: "published" },
      orderBy: [{ featured: "desc" }, { createdAt: "desc" }],
      select: { id: true, name: true, headline: true, photoUrl: true, portfolioItems: true },
    });

    res.json(successResponse({ ...trainer, portfolio }));
  } catch (err) {
    next(err);
  }
});

export default router;
