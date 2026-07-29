import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import { app } from "../../../src/app.js";

vi.mock("../../../src/db/prisma.js", () => ({
  prisma: {
    course: { findFirst: vi.fn() },
    orderItem: { aggregate: vi.fn() },
    review: { aggregate: vi.fn() },
    courseEnrollment: { count: vi.fn() },
    courseLessonProgress: { groupBy: vi.fn(), aggregate: vi.fn(), count: vi.fn() },
    $queryRaw: vi.fn(),
  },
}));

vi.mock("../../../src/middleware/authenticate.js", () => ({
  authenticate: vi.fn((req, _res, next) => {
    req.user = { id: "trainer-1", email: "trainer@test.com", roles: ["trainer"] };
    next();
  }),
}));

const { prisma } = await import("../../../src/db/prisma.js");
const { authenticate } = await import("../../../src/middleware/authenticate.js");

const asTrainer = () => {
  vi.mocked(authenticate).mockImplementation(async (req, _res, next) => {
    (req as never as { user: unknown }).user = {
      id: "trainer-1", email: "trainer@test.com", roles: ["trainer"],
    };
    next();
  });
};

const courseWithLessons = {
  id: "course-1",
  trainerId: "trainer-1",
  title: "Kursus Test",
  status: "published",
  adminFeedback: null,
  liveZoomLink: null,
  liveSchedule: null,
  sections: [
    {
      id: "sec-1",
      title: "Bagian 1",
      lessons: [
        { id: "lesson-1", title: "Pelajaran 1" },
        { id: "lesson-2", title: "Pelajaran 2" },
      ],
    },
    {
      id: "sec-2",
      title: "Bagian 2",
      lessons: [{ id: "lesson-3", title: "Pelajaran 3" }],
    },
  ],
};

/**
 * F5: every statistic is derived from real enrollment counts, never from a
 * `take`-limited array. `completedAt: { not: null }` distinguishes the two calls.
 */
function mockEnrollmentCounts(total: number, completed: number) {
  vi.mocked(prisma.courseEnrollment.count).mockImplementation((async (args?: {
    where?: { completedAt?: unknown };
  }) => (args?.where?.completedAt ? completed : total)) as never);
}

beforeEach(() => {
  vi.clearAllMocks();
  asTrainer();
  vi.mocked(prisma.course.findFirst).mockResolvedValue(courseWithLessons as never);
  mockEnrollmentCounts(2, 1);
  vi.mocked(prisma.orderItem.aggregate).mockResolvedValue({
    _sum: { totalPrice: 1_000_000 },
  } as never);
  // Refund slice for this course (F2/F3): one scoped aggregate, decimal string.
  vi.mocked(prisma.$queryRaw).mockResolvedValue([{ refunded: "0" }] as never);
  vi.mocked(prisma.review.aggregate).mockResolvedValue({
    _avg: { rating: 4.5 }, _count: { id: 2 },
  } as never);
  // Lesson-3 deliberately has no progress rows at all (nobody opened it).
  vi.mocked(prisma.courseLessonProgress.groupBy)
    .mockResolvedValueOnce([
      { lessonId: "lesson-1", _avg: { watchedPct: 80 } },
      { lessonId: "lesson-2", _avg: { watchedPct: 40 } },
    ] as never)
    .mockResolvedValueOnce([
      { lessonId: "lesson-1", _count: { _all: 2 } },
      { lessonId: "lesson-2", _count: { _all: 1 } },
    ] as never);
});

describe("GET /api/trainer/courses/:courseId/analytics", () => {
  it("returns the analytics payload for the course owner", async () => {
    const res = await request(app).get("/api/trainer/courses/course-1/analytics");

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toMatchObject({
      courseId: "course-1",
      title: "Kursus Test",
      totalLessons: 3,
      totalEnrollments: 2,
      completedCount: 1,
      completionRate: 50,
      grossRevenue: 1_000_000,
      netRevenue: 700_000, // TRAINER_REVENUE_SHARE = 0.7
      refundedRevenue: 0,
      avgRating: 4.5,
      reviewCount: 2,
      status: "published",
    });
  });

  // F4: the course card must not advertise revenue that approved refunds took
  // back — that figure used to be gross * 0.7 while the payout guard subtracted
  // refunds, so the trainer was shown money they could never withdraw.
  it("subtracts approved refunds from the course net revenue (F4)", async () => {
    vi.mocked(prisma.$queryRaw).mockResolvedValue([{ refunded: "400000" }] as never);

    const res = await request(app).get("/api/trainer/courses/course-1/analytics");

    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({
      grossRevenue: 1_000_000,
      refundedRevenue: 400_000,
      netRevenue: 420_000, // (1jt - 400rb) * 0.7
    });
  });

  // F3: `Number(8_150_000) * 0.7` is 5_704_999.999999999 on a double.
  it("computes the revenue share with exact decimal arithmetic (F3)", async () => {
    vi.mocked(prisma.orderItem.aggregate).mockResolvedValue({
      _sum: { totalPrice: 8_150_000 },
    } as never);

    const res = await request(app).get("/api/trainer/courses/course-1/analytics");

    expect(res.status).toBe(200);
    expect(res.body.data.netRevenue).toBe(5_705_000);
  });

  it("maps grouped lesson stats in section/lesson order (N+1 fix, T4)", async () => {
    const res = await request(app).get("/api/trainer/courses/course-1/analytics");

    expect(res.status).toBe(200);
    expect(res.body.data.lessons).toEqual([
      {
        lessonId: "lesson-1", title: "Pelajaran 1", sectionTitle: "Bagian 1",
        avgWatchPct: 80, completedCount: 2, dropOffRate: 0,
      },
      {
        lessonId: "lesson-2", title: "Pelajaran 2", sectionTitle: "Bagian 1",
        avgWatchPct: 40, completedCount: 1, dropOffRate: 50,
      },
      // No progress row → zeros, and a 100% drop-off (2 enrolled, 0 finished).
      {
        lessonId: "lesson-3", title: "Pelajaran 3", sectionTitle: "Bagian 2",
        avgWatchPct: 0, completedCount: 0, dropOffRate: 100,
      },
    ]);
  });

  it("uses two grouped queries instead of per-lesson aggregates (no N+1)", async () => {
    const res = await request(app).get("/api/trainer/courses/course-1/analytics");

    expect(res.status).toBe(200);
    expect(prisma.courseLessonProgress.groupBy).toHaveBeenCalledTimes(2);
    expect(prisma.courseLessonProgress.aggregate).not.toHaveBeenCalled();
    expect(prisma.courseLessonProgress.count).not.toHaveBeenCalled();
    expect(prisma.courseLessonProgress.groupBy).toHaveBeenCalledWith(
      expect.objectContaining({
        by: ["lessonId"],
        where: { lessonId: { in: ["lesson-1", "lesson-2", "lesson-3"] } },
      }),
    );
    expect(prisma.courseLessonProgress.groupBy).toHaveBeenLastCalledWith(
      expect.objectContaining({
        where: { lessonId: { in: ["lesson-1", "lesson-2", "lesson-3"] }, isCompleted: true },
      }),
    );
  });

  it("issues no progress query for a course without lessons", async () => {
    vi.mocked(prisma.course.findFirst).mockResolvedValue({
      ...courseWithLessons, sections: [],
    } as never);
    mockEnrollmentCounts(0, 0);

    const res = await request(app).get("/api/trainer/courses/course-1/analytics");

    expect(res.status).toBe(200);
    expect(res.body.data.lessons).toEqual([]);
    expect(res.body.data.totalLessons).toBe(0);
    expect(res.body.data.completionRate).toBe(0);
    expect(prisma.courseLessonProgress.groupBy).not.toHaveBeenCalled();
  });

  it("returns 404 for a course the trainer does not own", async () => {
    vi.mocked(prisma.course.findFirst).mockResolvedValue(null);

    const res = await request(app).get("/api/trainer/courses/other-course/analytics");

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
    expect(prisma.courseLessonProgress.groupBy).not.toHaveBeenCalled();
  });

  // F5 regression: enrollment stats used to come from an array loaded with
  // `take: 50` while completions counted every learner.
  it("uses the full enrollment count for a course with more than 50 learners", async () => {
    // 200 enrolled, 150 finished the course, 120 finished lesson-1.
    mockEnrollmentCounts(200, 150);
    vi.mocked(prisma.courseLessonProgress.groupBy)
      .mockReset()
      .mockResolvedValueOnce([{ lessonId: "lesson-1", _avg: { watchedPct: 80 } }] as never)
      .mockResolvedValueOnce([{ lessonId: "lesson-1", _count: { _all: 120 } }] as never);

    const res = await request(app).get("/api/trainer/courses/course-1/analytics");

    expect(res.status).toBe(200);
    // Not capped at 50 any more.
    expect(res.body.data.totalEnrollments).toBe(200);
    expect(res.body.data.completedCount).toBe(150);
    expect(res.body.data.completionRate).toBe(75);
    // Was round((50 - 120) / 50 * 100) = -140, rendered as a green badge.
    expect(res.body.data.lessons[0].dropOffRate).toBe(40);
    // The enrollment rows are never loaded just to be counted.
    expect(vi.mocked(prisma.course.findFirst).mock.calls[0]?.[0]).toEqual(
      expect.objectContaining({ include: { sections: { include: { lessons: true } } } }),
    );
  });

  it("clamps dropOffRate to 0-100 when completions exceed enrollments", async () => {
    // Data anomaly: progress rows survive an unenrolment, so completions can
    // outnumber current enrollments. A negative percentage is still nonsense.
    mockEnrollmentCounts(10, 10);
    vi.mocked(prisma.courseLessonProgress.groupBy)
      .mockReset()
      .mockResolvedValueOnce([{ lessonId: "lesson-1", _avg: { watchedPct: 80 } }] as never)
      .mockResolvedValueOnce([{ lessonId: "lesson-1", _count: { _all: 25 } }] as never);

    const res = await request(app).get("/api/trainer/courses/course-1/analytics");

    expect(res.status).toBe(200);
    for (const lesson of res.body.data.lessons) {
      expect(lesson.dropOffRate).toBeGreaterThanOrEqual(0);
      expect(lesson.dropOffRate).toBeLessThanOrEqual(100);
    }
    expect(res.body.data.lessons[0].dropOffRate).toBe(0);
  });

  it("returns 403 for a student (requireTrainer)", async () => {
    vi.mocked(authenticate).mockImplementation(async (req, _res, next) => {
      (req as never as { user: unknown }).user = {
        id: "student-1", email: "student@test.com", roles: ["student"],
      };
      next();
    });

    const res = await request(app).get("/api/trainer/courses/course-1/analytics");

    expect(res.status).toBe(403);
    expect(prisma.course.findFirst).not.toHaveBeenCalled();
  });
});
