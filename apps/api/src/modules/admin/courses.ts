import { Router, type Request, type Response, type NextFunction } from "express";
import type { Prisma } from "@prisma/client";
import { z } from "zod";
import { validateBody } from "../../middleware/validateBody.js";
import { prisma } from "../../db/prisma.js";
import { enqueueSearchIndex } from "../../jobs/queues.js";
import { logger } from "../../lib/logger.js";
import { AppError, successResponse } from "../../types/index.js";

const router = Router();

/**
 * Whitelisted `field:direction` sort keys. An unknown value must 400 — the same
 * enum-boundary rule as BL-47/BL-52 in routes/courses.ts — instead of being
 * dropped by non-strict Zod. A silently ignored `sort` is exactly how the admin
 * dashboard's "Kursus Terpopuler" widget ended up rendering the five NEWEST
 * courses under a headline promising the most-enrolled ones.
 */
const COURSE_SORT = {
  "createdAt:desc": { createdAt: "desc" },
  "createdAt:asc": { createdAt: "asc" },
  "totalEnrolled:desc": { totalEnrolled: "desc" },
  "totalEnrolled:asc": { totalEnrolled: "asc" },
  "avgRating:desc": { avgRating: "desc" },
  "publishedAt:desc": { publishedAt: "desc" },
} satisfies Record<string, Prisma.CourseOrderByWithRelationInput>;

type CourseSort = keyof typeof COURSE_SORT;
const COURSE_SORT_KEYS = Object.keys(COURSE_SORT) as [CourseSort, ...CourseSort[]];

const CourseListSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  status: z.enum(["draft", "pending", "published", "rejected", "archived"]).optional(),
  search: z.string().optional(),
  sort: z.enum(COURSE_SORT_KEYS).default("createdAt:desc"),
});

/**
 * Push one course into the search index after an admin write.
 *
 * Mirrors services/course/courseService.ts (same re-fetch shape, same
 * `enqueueSearchIndex` producer) so the two publish paths cannot drift: the
 * admin UI only ever calls `PATCH /api/admin/courses/:id`, and that path never
 * touched the index — so a course published from the panel stayed invisible to
 * search forever while the index drifted permanently from the DB.
 *
 * Degrade-safe by design: the DB write has already committed when this runs, so
 * an indexing failure is logged and swallowed rather than turned into a 500 that
 * would tell the admin their publish failed when it did not.
 */
async function syncCourseSearchIndex(courseId: string): Promise<void> {
  try {
    const course = await prisma.course.findUniqueOrThrow({
      where: { id: courseId },
      include: { category: { select: { name: true, slug: true } } },
    });
    await enqueueSearchIndex({
      type: "index-course",
      course: {
        ...course,
        price: course.price.toString(),
        avgRating: course.avgRating.toString(),
        categoryName: course.category?.name,
      },
    });
  } catch (err) {
    logger.warn("admin course search index sync failed (best-effort)", {
      courseId,
      err: String(err),
    });
  }
}

// GET /api/admin/courses — course list for admin
router.get("/courses", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { page, limit, status, search, sort } = CourseListSchema.parse(req.query);
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};
    if (status) where.status = status;
    if (search) {
      where.OR = [
        { title: { contains: search, mode: "insensitive" as const } },
        { trainer: { name: { contains: search, mode: "insensitive" as const } } },
      ];
    }

    const [courses, total] = await Promise.all([
      prisma.course.findMany({
        where,
        skip,
        take: limit,
        orderBy: COURSE_SORT[sort],
        select: {
          id: true,
          title: true,
          slug: true,
          status: true,
          level: true,
          price: true,
          salePrice: true,
          totalEnrolled: true,
          avgRating: true,
          isFeatured: true,
          adminFeedback: true,
          // BL-47: admin list needs to distinguish private classes at a glance.
          format: true,
          publishedAt: true,
          createdAt: true,
          trainer: { select: { id: true, name: true, email: true } },
          category: { select: { name: true } },
          _count: { select: { sections: true } },
        },
      }),
      prisma.course.count({ where }),
    ]);

    res.json(successResponse({ courses, total, page, limit }));
  } catch (err) {
    next(err);
  }
});

// GET /api/admin/courses/:id — get course detail for admin
router.get("/courses/:id", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const course = await prisma.course.findUnique({
      where: { id: req.params.id },
      include: {
        trainer: { select: { id: true, name: true, email: true } },
        category: { select: { id: true, name: true } },
        sections: {
          include: {
            lessons: true,
          },
        },
      },
    });
    if (!course) throw new AppError(404, "Kursus tidak ditemukan.");
    res.json(successResponse(course));
  } catch (err) {
    next(err);
  }
});

// PATCH /api/admin/courses/:id — generic course update (status, isFeatured,
// adminFeedback, private-class fields)
const AdminCourseUpdateSchema = z.object({
  status: z.enum(["draft", "pending", "published", "rejected", "archived"]).optional(),
  isFeatured: z.boolean().optional(),
  adminFeedback: z.string().nullable().optional(),
  // BL-47 private-class fields. waGroupLink must be an https invite link and
  // onboardingContact a bare WA number (digits only, e.g. 6285283423737) so the
  // frontend can build a wa.me link without re-normalizing.
  format: z.enum(["regular", "private_class"]).optional(),
  waGroupLink: z
    .string()
    .url()
    .startsWith("https://", "waGroupLink harus URL https.")
    .nullable()
    .optional(),
  onboardingContact: z
    .string()
    .regex(/^\d{8,15}$/, "onboardingContact harus 8-15 digit angka.")
    .nullable()
    .optional(),
});

router.patch("/courses/:id", validateBody(AdminCourseUpdateSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const course = await prisma.course.findUnique({ where: { id: req.params.id } });
    if (!course) return next(new AppError(404, "Kursus tidak ditemukan."));

    const { status, isFeatured, adminFeedback, format, waGroupLink, onboardingContact } = req.body as z.infer<
      typeof AdminCourseUpdateSchema
    >;
    const data: Record<string, unknown> = {};
    if (status === "published") {
      data.status = "published";
      data.publishedAt = new Date();
      data.adminFeedback = null;
    } else if (status === "draft") {
      data.status = "draft";
      data.publishedAt = null;
      if (adminFeedback !== undefined) data.adminFeedback = adminFeedback;
    } else if (status === "rejected") {
      data.status = "rejected";
      data.publishedAt = null;
      if (adminFeedback !== undefined) data.adminFeedback = adminFeedback;
    } else if (status === "pending") {
      data.status = "pending";
    } else if (status === "archived") {
      data.status = "archived";
    }
    if (typeof isFeatured === "boolean") data.isFeatured = isFeatured;
    // BL-47: undefined means "leave untouched"; explicit null clears the field.
    if (format !== undefined) data.format = format;
    if (waGroupLink !== undefined) data.waGroupLink = waGroupLink;
    if (onboardingContact !== undefined) data.onboardingContact = onboardingContact;

    const updated = await prisma.course.update({
      where: { id: req.params.id },
      data,
      select: {
        id: true,
        title: true,
        status: true,
        isFeatured: true,
        publishedAt: true,
        adminFeedback: true,
        format: true,
        waGroupLink: true,
        onboardingContact: true,
      },
    });

    // Keep Meilisearch in step with the write that just committed — see
    // syncCourseSearchIndex. Awaited so a same-process inline index (no Redis)
    // has run before the admin's UI refetches the list.
    await syncCourseSearchIndex(req.params.id as string);

    res.json(successResponse(updated));
  } catch (err) {
    next(err);
  }
});

export default router;
