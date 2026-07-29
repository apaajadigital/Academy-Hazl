import { Router, type Request, type Response, type NextFunction } from "express";
import { z } from "zod";
import { validateBody } from "../middleware/validateBody.js";
import { authenticate } from "../middleware/authenticate.js";
import { authorize } from "../middleware/authorize.js";
import { writeAudit } from "../services/audit/log.js";
import {
  listCourses,
  getCourseBySlug,
  createCourse,
  updateCourse,
  publishCourse,
  deleteCourse,
} from "../services/course/courseService.js";
import { AppError, successResponse } from "../types/index.js";

const router = Router();

// BL-47: format is an enum boundary — an invalid value must 400, not silently
// fall through to the catalog default.
// BL-52: `free` is the same kind of boundary. Silently ignoring a typo here
// would serve the full catalog to a caller that asked for free courses only,
// which is exactly how a paid course ends up wearing a "GRATIS" badge.
const listQuerySchema = z.object({
  format: z.enum(["regular", "private_class"]).optional(),
  free: z.enum(["true", "false"]).optional(),
});

// GET /api/courses
router.get("/", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsedQuery = listQuerySchema.safeParse(req.query);
    if (!parsedQuery.success) {
      const invalidFree = parsedQuery.error.issues.some((issue) => issue.path[0] === "free");
      return next(
        new AppError(
          400,
          invalidFree
            ? "Parameter free harus 'true' atau 'false'."
            : "Parameter format harus 'regular' atau 'private_class'.",
          "VALIDATION_ERROR",
        ),
      );
    }
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string) || 20));
    const result = await listCourses({
      categorySlug: req.query.category as string | undefined,
      level: req.query.level as string | undefined,
      q: req.query.q as string | undefined,
      featured: req.query.featured === "true" ? true : req.query.featured === "false" ? false : undefined,
      format: parsedQuery.data.format,
      // free=false is treated as "no price constraint", same as omitting it —
      // the catalog has no "paid only" view to serve.
      free: parsedQuery.data.free === "true" ? true : undefined,
      page,
      limit,
    });
    res.json(successResponse(result));
  } catch (err) {
    next(err);
  }
});

// GET /api/courses/:slug
router.get("/:slug", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const course = await getCourseBySlug(req.params.slug!);
    if (!course) return next(new AppError(404, "Kursus tidak ditemukan."));
    if (course.status !== "published" && !req.user?.roles?.includes("super_admin" as never)) {
      return next(new AppError(404, "Kursus tidak ditemukan."));
    }
    res.json(successResponse(course));
  } catch (err) {
    next(err);
  }
});

// POST /api/courses — trainer or super_admin
const createSchema = z.object({
  slug: z.string().min(2).max(120).regex(/^[a-z0-9-]+$/),
  title: z.string().min(3).max(200),
  description: z.string().max(10000).optional(),
  shortDesc: z.string().max(500).optional(),
  price: z.number().min(0),
  salePrice: z.number().min(0).optional(),
  categoryId: z.string().uuid().optional(),
  level: z.enum(["beginner", "intermediate", "advanced"]).optional(),
  thumbnailUrl: z.string().url().optional(),
  previewVideo: z.string().url().optional(),
});

router.post(
  "/",
  authenticate,
  authorize("trainer", "super_admin"),
  validateBody(createSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const course = await createCourse(req.user!.id, req.body);

      await writeAudit({
        actorId: req.user!.id,
        actorEmail: req.user!.email,
        action: "COURSE_CREATE",
        resource: "Course",
        resourceId: course.id,
        newValue: { slug: course.slug, title: course.title },
        ip: req.ip,
        userAgent: req.headers["user-agent"],
      });

      res.status(201).json(successResponse(course));
    } catch (err) {
      next(err);
    }
  },
);

// PUT /api/courses/:id — trainer (own) or super_admin
const updateSchema = z.object({
  title: z.string().min(3).max(200).optional(),
  description: z.string().max(10000).optional(),
  shortDesc: z.string().max(500).optional(),
  price: z.number().min(0).optional(),
  salePrice: z.number().min(0).optional(),
  categoryId: z.string().uuid().optional(),
  level: z.enum(["beginner", "intermediate", "advanced"]).optional(),
  thumbnailUrl: z.string().url().optional(),
  previewVideo: z.string().url().optional(),
});

router.put(
  "/:id",
  authenticate,
  authorize("trainer", "super_admin"),
  validateBody(updateSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const course = await updateCourse(req.params.id!, req.body);

      await writeAudit({
        actorId: req.user!.id,
        actorEmail: req.user!.email,
        action: "COURSE_UPDATE",
        resource: "Course",
        resourceId: course.id,
        newValue: req.body,
        ip: req.ip,
        userAgent: req.headers["user-agent"],
      });

      res.json(successResponse(course));
    } catch (err) {
      next(err);
    }
  },
);

// PATCH /api/courses/:id/publish — super_admin only
router.patch(
  "/:id/publish",
  authenticate,
  authorize("super_admin"),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const course = await publishCourse(req.params.id!);

      await writeAudit({
        actorId: req.user!.id,
        actorEmail: req.user!.email,
        action: "COURSE_PUBLISH",
        resource: "Course",
        resourceId: course.id,
        ip: req.ip,
        userAgent: req.headers["user-agent"],
      });

      res.json(successResponse(course));
    } catch (err) {
      next(err);
    }
  },
);

// DELETE /api/courses/:id — super_admin only
router.delete(
  "/:id",
  authenticate,
  authorize("super_admin"),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      await deleteCourse(req.params.id!);

      await writeAudit({
        actorId: req.user!.id,
        actorEmail: req.user!.email,
        action: "COURSE_DELETE",
        resource: "Course",
        resourceId: req.params.id,
        ip: req.ip,
        userAgent: req.headers["user-agent"],
      });

      res.json(successResponse({ message: "Kursus berhasil dihapus." }));
    } catch (err) {
      next(err);
    }
  },
);

export default router;
