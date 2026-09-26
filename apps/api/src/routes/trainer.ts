import { Router, type Request, type Response, type NextFunction } from "express";
import type { Prisma } from "@prisma/client";
import { z } from "zod";
import { authenticate } from "../middleware/authenticate.js";
import { validateBody } from "../middleware/validateBody.js";
import { prisma } from "../db/prisma.js";
import { AppError, successResponse, type Role } from "../types/index.js";
import { parsePageParams, buildPaginationMeta } from "../lib/pagination.js";
import {
  MAX_PAYOUT_AMOUNT,
  MIN_PAYOUT_AMOUNT,
  computeCourseNetRevenue,
  computeTrainerAvailableBalance,
  processTrainerPayout,
  requestTrainerPayout,
} from "../services/payout/trainerPayoutService.js";
import curriculumRouter from "../modules/trainer/curriculum.js";
import quizRouter from "../modules/trainer/quiz.js";
import studentsRouter from "../modules/trainer/students.js";
import certificatesRouter from "../modules/trainer/certificates.js";

const router = Router();
router.use(authenticate);

/**
 * Role check against the authenticated user.
 *
 * Typed against `Role` on purpose: the previous `roles.includes("x" as never)`
 * casts silenced the compiler entirely, so a typo or a renamed role would have
 * compiled into a guard that can never match (i.e. an endpoint nobody can
 * reach, or worse, a guard that is trivially satisfied). With `allowed: Role[]`
 * an unknown role name is a build error.
 */
function hasAnyRole(req: Request, allowed: readonly Role[]): boolean {
  const roles: readonly Role[] = req.user?.roles ?? [];
  return allowed.some((role) => roles.includes(role));
}

const TRAINER_ROLES: readonly Role[] = ["trainer", "super_admin"];
const ADMIN_ROLES: readonly Role[] = ["super_admin"];

function requireTrainer(req: Request, _res: Response, next: NextFunction) {
  if (!hasAnyRole(req, TRAINER_ROLES)) {
    return next(new AppError(403, "Akses ditolak. Hanya trainer."));
  }
  next();
}

/** Keep a rate that is displayed as a percentage inside 0-100 (F5). */
function clampPercent(value: number): number {
  return Math.min(100, Math.max(0, value));
}

function requireSuperAdmin(req: Request, _res: Response, next: NextFunction) {
  if (!hasAnyRole(req, ADMIN_ROLES)) {
    return next(new AppError(403, "Akses ditolak."));
  }
  next();
}

/**
 * Shape of one item in the trainer's course list.
 *
 * Declared once and used by BOTH `GET /dashboard` (its `courses` field) and
 * `GET /courses` so the two can never drift: apps/web trainer-hub reads the same
 * item from either endpoint, and a field added to one but not the other would
 * only surface as an undefined at runtime.
 */
type TrainerCourseListItem = {
  id: string;
  title: string;
  status: string;
  price: number;
  enrollments: number;
};

/** Exactly the columns the list item needs — no relations, no full row payload. */
const TRAINER_COURSE_LIST_SELECT = {
  id: true,
  title: true,
  status: true,
  price: true,
  // `_count` is a COUNT(*) in SQL; loading the enrollment rows to read `.length`
  // would pull every learner of every course into memory for a list view.
  _count: { select: { enrollments: true } },
} as const;

function toTrainerCourseListItem(course: {
  id: string;
  title: string;
  status: string;
  price: Prisma.Decimal;
  _count: { enrollments: number };
}): TrainerCourseListItem {
  return {
    id: course.id,
    title: course.title,
    status: course.status,
    // `price` is Decimal(12,2); Prisma returns a Decimal object that would
    // serialise as a string, so it is narrowed to a JSON number as everywhere else.
    price: Number(course.price),
    enrollments: course._count.enrollments,
  };
}

// GET /api/trainer/dashboard — trainer stats
router.get("/dashboard", requireTrainer, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const trainerId = req.user!.id;

    const courses = await prisma.course.findMany({
      where: { trainerId },
      select: TRAINER_COURSE_LIST_SELECT,
    });

    const courseIds = courses.map((c) => c.id);

    // F4 (formula drift): the dashboard used to compute `netRevenue` as
    // `gross * share` on its own, ignoring refunds and payouts already
    // committed. A trainer therefore saw Rp X, asked for Rp X, and got a 400 —
    // indistinguishable from a payment bug. Both numbers now come from the one
    // service that also guards the payout, so what is displayed and what can be
    // withdrawn can never diverge again. `totalRevenue` reuses the service's
    // gross figure (identical query) instead of aggregating it a second time.
    const [totalEnrollments, pendingPayouts, balance] = await Promise.all([
      prisma.courseEnrollment.count({ where: { courseId: { in: courseIds } } }),
      prisma.trainerPayout.count({ where: { trainerId, status: "pending" } }),
      computeTrainerAvailableBalance(trainerId),
    ]);

    return res.json(successResponse({
      totalCourses: courses.length,
      publishedCourses: courses.filter((c) => c.status === "published").length,
      totalEnrollments,
      totalRevenue: balance.grossRevenue,
      netRevenue: balance.netRevenue,
      // New fields (additive — apps/web still reads totalRevenue/netRevenue).
      refundedRevenue: balance.refundedRevenue,
      committedPayouts: balance.committedPayouts,
      availableBalance: balance.availableBalance,
      pendingPayouts,
      // Same mapper as GET /courses — the two item shapes are one definition.
      courses: courses.map(toTrainerCourseListItem),
    }));
  } catch (err) {
    next(err);
  }
});

// GET /api/trainer/courses — trainer's own courses, paginated
router.get("/courses", requireTrainer, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const trainerId = req.user!.id;

    // BL-78c: apps/web trainer-hub/kursus only needs this list, but the only way
    // to get it was GET /dashboard — which additionally aggregates revenue,
    // refunds, committed payouts and the withdrawable balance (a raw refund join
    // plus three aggregates) and returned every course unbounded. Same item
    // shape, none of the money work, and bounded like /payouts and /reviews.
    const params = parsePageParams(req.query);
    const where = { trainerId };

    const [courses, total] = await Promise.all([
      prisma.course.findMany({
        where,
        select: TRAINER_COURSE_LIST_SELECT,
        // Stable ordering is required for pagination: without it Postgres may
        // return the same row on two different pages.
        orderBy: { createdAt: "desc" },
        skip: params.skip,
        take: params.limit,
      }),
      prisma.course.count({ where }),
    ]);

    return res.json(
      successResponse(courses.map(toTrainerCourseListItem), buildPaginationMeta(total, params)),
    );
  } catch (err) {
    next(err);
  }
});

// GET /api/trainer/courses/:courseId/analytics — per-course analytics
router.get("/courses/:courseId/analytics", requireTrainer, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const trainerId = req.user!.id;
    const { courseId } = req.params;
    // Express types route params as possibly-undefined; narrow instead of
    // casting — an undefined id would silently drop the `id` filter from the
    // ownership lookup below and match an arbitrary course of this trainer.
    if (!courseId) throw new AppError(400, "Course ID tidak valid.");

    // F5 (capped denominator): the enrollment rows used to be loaded here with
    // `take: 50` and every statistic was derived from that array's length, while
    // `completedByLesson` below counts ALL learners. A 200-learner course with
    // 120 completions on a lesson produced `round((50 - 120) / 50 * 100) = -140`
    // — rendered by apps/web as a green "-140%" drop-off badge — and capped
    // `totalEnrollments` / `completionRate` at 50. The array was never part of
    // the response, so it is replaced outright by real counts.
    const course = await prisma.course.findFirst({
      where: { id: courseId, trainerId },
      include: {
        sections: { include: { lessons: true } },
      },
    });
    if (!course) throw new AppError(404, "Kursus tidak ditemukan.");

    const totalLessons = course.sections.reduce((sum, sec) => sum + sec.lessons.length, 0);

    const [revenueAgg, reviewAgg, totalEnrolled, completedCount] = await Promise.all([
      prisma.orderItem.aggregate({
        _sum: { totalPrice: true },
        where: { itemType: "course", itemId: courseId, order: { status: "paid" } },
      }),
      prisma.review.aggregate({
        _avg: { rating: true },
        _count: { id: true },
        where: { itemType: "course", itemId: courseId, status: "published" },
      }),
      prisma.courseEnrollment.count({ where: { courseId } }),
      prisma.courseEnrollment.count({ where: { courseId, completedAt: { not: null } } }),
    ]);

    // F3/F4: exact-decimal revenue share, net of approved refunds on this course.
    const revenue = await computeCourseNetRevenue(courseId, revenueAgg._sum.totalPrice ?? 0);

    // Calculate lesson watch stats and drop-off rate.
    //
    // N+1 fix: this used to run an `aggregate` + a `count` per lesson, i.e.
    // 2 x (number of lessons) round trips — a 60-lesson course meant 120 queries
    // for one page load. Two `groupBy` calls now cover every lesson at once and
    // are resolved in parallel. Two calls rather than one because `_count` on a
    // non-nullable Boolean counts rows, not `true` values, so "completed per
    // lesson" needs its own `isCompleted: true` filter.
    const lessons = course.sections.flatMap((sec) =>
      sec.lessons.map((les) => ({ lesson: les, sectionTitle: sec.title })),
    );
    const lessonIds = lessons.map((l) => l.lesson.id);

    const [watchStats, completedStats] = lessonIds.length
      ? await Promise.all([
          prisma.courseLessonProgress.groupBy({
            by: ["lessonId"],
            where: { lessonId: { in: lessonIds } },
            _avg: { watchedPct: true },
          }),
          prisma.courseLessonProgress.groupBy({
            by: ["lessonId"],
            where: { lessonId: { in: lessonIds }, isCompleted: true },
            _count: { _all: true },
          }),
        ])
      : [[], []];

    const avgByLesson = new Map(
      watchStats.map((row) => [row.lessonId, Number(row._avg.watchedPct ?? 0)]),
    );
    const completedByLesson = new Map(
      completedStats.map((row) => [row.lessonId, row._count._all]),
    );

    const lessonStats = lessons.map(({ lesson, sectionTitle }) => {
      // A lesson nobody has touched has no progress row at all, so a missing
      // map entry means zero — same output the per-lesson aggregate produced.
      const completedLessonsCount = completedByLesson.get(lesson.id) ?? 0;
      // Clamped to 0-100 (F5): both operands are now full counts, but a learner
      // can still hold lesson progress after being unenrolled, which would make
      // completions exceed enrollments and the rate go negative. A drop-off is a
      // percentage of learners — it has no meaning outside that range.
      const dropOffRate = totalEnrolled > 0
        ? clampPercent(Math.round(((totalEnrolled - completedLessonsCount) / totalEnrolled) * 100))
        : 0;

      return {
        lessonId: lesson.id,
        title: lesson.title,
        sectionTitle,
        avgWatchPct: avgByLesson.get(lesson.id) ?? 0,
        completedCount: completedLessonsCount,
        dropOffRate,
      };
    });

    return res.json(successResponse({
      courseId,
      title: course.title,
      totalLessons,
      totalEnrollments: totalEnrolled,
      completedCount,
      completionRate: totalEnrolled > 0
        ? clampPercent(Math.round((completedCount / totalEnrolled) * 100))
        : 0,
      grossRevenue: revenue.grossRevenue,
      netRevenue: revenue.netRevenue,
      // New field (additive): the slice of grossRevenue sitting on approved
      // refunds, i.e. what netRevenue no longer includes.
      refundedRevenue: revenue.refundedRevenue,
      avgRating: Number(reviewAgg._avg.rating ?? 0),
      reviewCount: reviewAgg._count.id,
      adminFeedback: course.adminFeedback,
      liveZoomLink: course.liveZoomLink,
      liveSchedule: course.liveSchedule ? course.liveSchedule.toISOString() : null,
      status: course.status,
      lessons: lessonStats,
    }));
  } catch (err) {
    next(err);
  }
});

// GET /api/trainer/payouts — payout history
router.get("/payouts", requireTrainer, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const trainerId = req.user!.id;

    // Bounded pagination (same helper + cap as /reviews) — the unbounded
    // findMany returned a trainer's entire payout history in one response.
    // `data` stays a flat array and the page info goes into `meta`, so existing
    // clients (apps/web trainer-hub payout page) keep working unchanged.
    const params = parsePageParams(req.query);
    const where = { trainerId };

    const [payouts, total] = await Promise.all([
      prisma.trainerPayout.findMany({
        where,
        orderBy: { requestedAt: "desc" },
        skip: params.skip,
        take: params.limit,
      }),
      prisma.trainerPayout.count({ where }),
    ]);
    return res.json(successResponse(payouts, buildPaginationMeta(total, params)));
  } catch (err) {
    next(err);
  }
});

const payoutSchema = z.object({
  // F3 (money precision): `positive()` alone accepted 1e300 and sub-rupiah
  // fractions such as 0.005, which the `Decimal(12,2)` column would silently
  // round (or reject at the driver) after the balance check had already passed.
  // Bound the value to what the column can hold and to whole cents.
  // Owner decision (29 Jul 2026): minimum withdrawal is Rp 10.000. It has to be
  // enforced here, not only in the form — the web input carried min="100000"
  // while the API accepted Rp 0,01, so the stated floor was decorative and a
  // direct API call could file a one-cent payout for staff to process by hand.
  amount: z
    .number()
    .positive()
    .min(MIN_PAYOUT_AMOUNT, "Minimal penarikan Rp 10.000.")
    .max(MAX_PAYOUT_AMOUNT, "Jumlah melebihi batas maksimum.")
    .multipleOf(0.01, "Jumlah maksimal 2 angka desimal."),
  bankName: z.string().min(1),
  accountNo: z.string().min(1),
  accountName: z.string().min(1),
});

// POST /api/trainer/payouts — request payout
router.post("/payouts", requireTrainer, validateBody(payoutSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const trainerId = req.user!.id;
    const { amount, bankName, accountNo, accountName } = req.body as z.infer<typeof payoutSchema>;

    // M-trainer: reject payouts that exceed the trainer's available balance.
    // The balance is the trainer's revenue share of paid course items MINUS
    // approved refunds MINUS payouts already requested/paid, so a trainer can
    // neither withdraw refunded money nor double-withdraw the same revenue.
    //
    // F1 (double-spend): the balance check and the create MUST stay in one
    // serializable transaction — see requestTrainerPayout. Read-then-write in
    // the route let ten parallel requests all pass the same stale check.
    const payout = await requestTrainerPayout({ trainerId, amount, bankName, accountNo, accountName });
    return res.status(201).json(successResponse(payout));
  } catch (err) {
    next(err);
  }
});

const payoutProcessSchema = z.object({
  status: z.enum(["approved", "rejected", "paid"]),
  note: z.string().max(1000).optional(),
});

// PATCH /api/trainer/payouts/:payoutId — admin approve/reject
router.patch("/payouts/:payoutId", requireSuperAdmin, validateBody(payoutProcessSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { payoutId } = req.params;
    // Express types route params as possibly-undefined; narrow instead of
    // casting so the service keeps a non-optional id in its contract.
    if (!payoutId) throw new AppError(400, "Payout ID tidak valid.");
    const { status, note } = req.body as z.infer<typeof payoutProcessSchema>;

    // The atomic pending-guard, 404 and 409 semantics live in the service, which
    // modules/admin/payouts.ts PATCH /payouts/trainer/:id now shares (BL-78d).
    // That copy only differed by including the `trainer` relation in its
    // response, which is the service's `includeTrainer` option — omitted here so
    // this endpoint keeps returning the bare payout it always has.
    const payout = await processTrainerPayout({
      payoutId,
      status,
      note,
      processedBy: req.user!.id,
    });
    return res.json(successResponse(payout));
  } catch (err) {
    next(err);
  }
});

// GET /api/trainer/reviews — reviews of trainer's courses
router.get("/reviews", requireTrainer, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const trainerId = req.user!.id;
    const courses = await prisma.course.findMany({
      where: { trainerId },
      select: { id: true },
    });
    const courseIds = courses.map((c) => c.id);

    // Bounded pagination (same helper as other list endpoints) — an unbounded
    // findMany here could return every review of every course at once.
    const params = parsePageParams(req.query);
    const where = { itemType: "course", itemId: { in: courseIds } };

    const [reviews, total] = await Promise.all([
      prisma.review.findMany({
        where,
        orderBy: { createdAt: "desc" },
        include: {
          user: { select: { id: true, name: true, avatarUrl: true } },
        },
        skip: params.skip,
        take: params.limit,
      }),
      prisma.review.count({ where }),
    ]);
    return res.json(successResponse(reviews, buildPaginationMeta(total, params)));
  } catch (err) {
    next(err);
  }
});

const liveSessionSchema = z.object({
  // Must be a real http(s) URL — a bare string would let a trainer store a
  // javascript: (or other scheme) URI that executes when students click it.
  liveZoomLink: z
    .string()
    .url()
    .refine((v) => v.startsWith("https://") || v.startsWith("http://"), {
      message: "liveZoomLink harus URL http(s).",
    })
    .nullable()
    .optional(),
  liveSchedule: z.string().nullable().optional(),
});

// PATCH /api/trainer/courses/:courseId/live — set Zoom link and live schedule
router.patch("/courses/:courseId/live", requireTrainer, validateBody(liveSessionSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const trainerId = req.user!.id;
    const { courseId } = req.params;

    const { liveZoomLink, liveSchedule } = req.body as z.infer<typeof liveSessionSchema>;

    // BL-69 atomic ownership guard — same pattern as PATCH /courses/:courseId/status
    // and courseService.updateCourse. The previous findFirst-then-update-by-id split
    // re-opened the TOCTOU window BL-69 closed: the `update` was keyed on `id` only,
    // so a course reassigned to another trainer between the two queries would still
    // be written by the original trainer. Scoping the write itself makes that
    // impossible, and `count` doubles as the 404 check.
    const result = await prisma.course.updateMany({
      where: { id: courseId, trainerId },
      data: {
        liveZoomLink: liveZoomLink || null,
        liveSchedule: liveSchedule ? new Date(liveSchedule) : null,
      },
    });
    if (result.count !== 1) throw new AppError(404, "Kursus tidak ditemukan.");

    const updated = await prisma.course.findFirst({ where: { id: courseId, trainerId } });
    return res.json(successResponse(updated));
  } catch (err) {
    next(err);
  }
});

// C3: a trainer can never set "published"/"rejected" directly — publishing is an
// admin decision (modules/admin/courses.ts). The only trainer-settable targets are
// submit-for-review, take-down, and restore of a previously approved course.
const statusUpdateSchema = z.object({
  status: z.enum(["pending", "published", "archived"]),
});

/**
 * C3 (self-publish bypass): server-side transition guard. A trainer may only:
 *   draft     → pending    (submit for review)
 *   rejected  → pending    (resubmit after admin feedback)
 *   published → archived   (take down their own live course)
 *   archived  → published  (restore, ONLY if the course was approved before —
 *                           i.e. publishedAt was set by the admin approval flow)
 * Everything else (notably draft/pending/rejected → published) is forbidden,
 * otherwise a trainer could make an unreviewed course publicly visible.
 */
function isAllowedTrainerTransition(
  current: string,
  next: "pending" | "published" | "archived",
  publishedAt: Date | null,
): boolean {
  if (next === "pending") return current === "draft" || current === "rejected";
  if (next === "archived") return current === "published";
  // next === "published": restore is only legal from archived AND only for a
  // course that already went through admin approval (publishedAt set).
  return current === "archived" && publishedAt !== null;
}

// PATCH /api/trainer/courses/:courseId/status — trainer status transitions
router.patch("/courses/:courseId/status", requireTrainer, validateBody(statusUpdateSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const trainerId = req.user!.id;
    const { courseId } = req.params;

    const course = await prisma.course.findFirst({
      where: { id: courseId, trainerId },
    });
    if (!course) throw new AppError(404, "Kursus tidak ditemukan.");

    const { status } = req.body as z.infer<typeof statusUpdateSchema>;

    if (!isAllowedTrainerTransition(course.status, status, course.publishedAt)) {
      throw new AppError(403, `Transisi status ${course.status} → ${status} tidak diizinkan.`);
    }

    const data: { status: string; adminFeedback?: null } = { status };
    // Clear admin feedback if submitting for review again
    if (status === "pending") {
      data.adminFeedback = null;
    }

    // Guard against a concurrent admin decision: only apply the transition if
    // the course is still in the status we validated against.
    const result = await prisma.course.updateMany({
      where: { id: courseId, trainerId, status: course.status },
      data,
    });
    if (result.count !== 1) {
      throw new AppError(409, "Status kursus berubah, muat ulang lalu coba lagi.");
    }

    const updated = await prisma.course.findFirst({ where: { id: courseId, trainerId } });
    return res.json(successResponse(updated));
  } catch (err) {
    next(err);
  }
});

// ── Sub-routers for new trainer features (BL-50) ─────────────────────────────
router.use(curriculumRouter);
router.use(quizRouter);
router.use(studentsRouter);
router.use(certificatesRouter);

export default router;
