import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import { app } from "../../../src/app.js";

/**
 * `routes/trainer.ts` measures 94.4% — and that number is misleading. The
 * sub-routers it mounts (modules/trainer/*) sat near 11% statements and 0%
 * branches, so the roster and certificate endpoints a trainer actually uses were
 * effectively untested. These are the ownership-scoped read paths: every one of
 * them must refuse a course the caller does not own, because the alternative is
 * one trainer reading another's student roster.
 */

vi.mock("../../../src/db/prisma.js", () => ({
  prisma: {
    course: { findFirst: vi.fn() },
    courseEnrollment: { findMany: vi.fn(), count: vi.fn() },
    courseLessonProgress: { count: vi.fn() },
    certificate: { findMany: vi.fn(), count: vi.fn() },
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

function asRole(roles: string[], id = "trainer-1") {
  vi.mocked(authenticate).mockImplementation(async (req, _res, next) => {
    (req as never as { user: unknown }).user = { id, email: "u@test.com", roles };
    next();
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  asRole(["trainer"]);
  vi.mocked(prisma.course.findFirst).mockResolvedValue({
    id: "course-1",
    title: "Kursus Test",
    totalLessons: 10,
  } as never);
  vi.mocked(prisma.courseEnrollment.findMany).mockResolvedValue([] as never);
  vi.mocked(prisma.courseEnrollment.count).mockResolvedValue(0 as never);
  vi.mocked(prisma.courseLessonProgress.count).mockResolvedValue(0 as never);
  vi.mocked(prisma.certificate.findMany).mockResolvedValue([] as never);
  vi.mocked(prisma.certificate.count).mockResolvedValue(0 as never);
});

describe("GET /api/trainer/courses/:courseId/students", () => {
  it("refuses a caller who is not a trainer", async () => {
    asRole(["student"]);

    const res = await request(app).get("/api/trainer/courses/course-1/students");

    expect(res.status).toBe(403);
    expect(prisma.course.findFirst).not.toHaveBeenCalled();
  });

  it("lets a super_admin through", async () => {
    asRole(["super_admin"], "admin-1");

    const res = await request(app).get("/api/trainer/courses/course-1/students");

    expect(res.status).toBe(200);
  });

  it("scopes the ownership check to the calling trainer", async () => {
    await request(app).get("/api/trainer/courses/course-1/students");

    // Without trainerId in the where clause, any trainer could read any roster.
    expect(prisma.course.findFirst).toHaveBeenCalledWith({
      where: { id: "course-1", trainerId: "trainer-1" },
      select: { id: true, totalLessons: true },
    });
  });

  it("404s for a course the trainer does not own", async () => {
    vi.mocked(prisma.course.findFirst).mockResolvedValue(null as never);

    const res = await request(app).get("/api/trainer/courses/course-1/students");

    expect(res.status).toBe(404);
    expect(prisma.courseEnrollment.findMany).not.toHaveBeenCalled();
  });

  it("computes progress per student against the course lesson count", async () => {
    vi.mocked(prisma.courseEnrollment.findMany).mockResolvedValue([
      {
        id: "enr-1",
        enrolledAt: new Date("2026-08-01"),
        completedAt: null,
        user: { id: "u1", name: "Budi", email: "budi@test.com", avatarUrl: null },
      },
    ] as never);
    vi.mocked(prisma.courseEnrollment.count).mockResolvedValue(1 as never);
    vi.mocked(prisma.courseLessonProgress.count).mockResolvedValue(3 as never);

    const res = await request(app).get("/api/trainer/courses/course-1/students");

    expect(res.status).toBe(200);
    expect(res.body.data[0]).toMatchObject({
      completedLessons: 3,
      totalLessons: 10,
      progressPct: 30,
    });
  });

  it("counts progress by enrollmentId, which is already scoped to this course", async () => {
    vi.mocked(prisma.courseEnrollment.findMany).mockResolvedValue([
      {
        id: "enr-1",
        enrolledAt: new Date(),
        completedAt: null,
        user: { id: "u1", name: "Budi", email: "b@test.com", avatarUrl: null },
      },
    ] as never);

    await request(app).get("/api/trainer/courses/course-1/students");

    expect(prisma.courseLessonProgress.count).toHaveBeenCalledWith({
      where: { enrollmentId: "enr-1", isCompleted: true },
    });
  });

  it("reports 0% rather than dividing by zero when the course has no lessons", async () => {
    vi.mocked(prisma.course.findFirst).mockResolvedValue({
      id: "course-1",
      totalLessons: 0,
    } as never);
    vi.mocked(prisma.courseEnrollment.findMany).mockResolvedValue([
      {
        id: "enr-1",
        enrolledAt: new Date(),
        completedAt: null,
        user: { id: "u1", name: "Budi", email: "b@test.com", avatarUrl: null },
      },
    ] as never);

    const res = await request(app).get("/api/trainer/courses/course-1/students");

    expect(res.body.data[0].progressPct).toBe(0);
  });

  it("filters by name or email when ?search= is given", async () => {
    await request(app).get("/api/trainer/courses/course-1/students?search=budi");

    expect(prisma.courseEnrollment.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          courseId: "course-1",
          user: {
            OR: [
              { name: { contains: "budi", mode: "insensitive" } },
              { email: { contains: "budi", mode: "insensitive" } },
            ],
          },
        },
      }),
    );
  });

  it("omits the user filter entirely when no search is given", async () => {
    await request(app).get("/api/trainer/courses/course-1/students");

    expect(prisma.courseEnrollment.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { courseId: "course-1" } }),
    );
  });

  it("paginates, and returns the meta the client pages on", async () => {
    vi.mocked(prisma.courseEnrollment.count).mockResolvedValue(42 as never);

    const res = await request(app).get("/api/trainer/courses/course-1/students?page=2&limit=10");

    expect(prisma.courseEnrollment.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ skip: 10, take: 10 }),
    );
    expect(res.body.meta).toMatchObject({ total: 42, page: 2, limit: 10 });
  });
});

describe("GET /api/trainer/courses/:courseId/certificates", () => {
  it("refuses a caller who is not a trainer", async () => {
    asRole(["student"]);

    const res = await request(app).get("/api/trainer/courses/course-1/certificates");

    expect(res.status).toBe(403);
  });

  it("scopes the ownership check to the calling trainer", async () => {
    await request(app).get("/api/trainer/courses/course-1/certificates");

    expect(prisma.course.findFirst).toHaveBeenCalledWith({
      where: { id: "course-1", trainerId: "trainer-1" },
      select: { id: true, title: true },
    });
  });

  it("404s for a course the trainer does not own", async () => {
    vi.mocked(prisma.course.findFirst).mockResolvedValue(null as never);

    const res = await request(app).get("/api/trainer/courses/course-1/certificates");

    expect(res.status).toBe(404);
    expect(prisma.certificate.findMany).not.toHaveBeenCalled();
  });

  it("projects each certificate onto a verifiable row", async () => {
    vi.mocked(prisma.certificate.findMany).mockResolvedValue([
      {
        id: "cert-1",
        code: "ABCD-EFGH-JKLM-NPQR",
        issuedAt: new Date("2026-08-20"),
        isValid: true,
        user: { id: "u1", name: "Budi", email: "budi@test.com" },
      },
    ] as never);
    vi.mocked(prisma.certificate.count).mockResolvedValue(1 as never);

    const res = await request(app).get("/api/trainer/courses/course-1/certificates");

    expect(res.status).toBe(200);
    expect(res.body.data[0]).toMatchObject({
      id: "cert-1",
      code: "ABCD-EFGH-JKLM-NPQR",
      userName: "Budi",
      userEmail: "budi@test.com",
      isValid: true,
      // The link that lets anyone check the certificate is genuine.
      verifyUrl: "/verify/ABCD-EFGH-JKLM-NPQR",
    });
  });

  it("paginates newest first", async () => {
    vi.mocked(prisma.certificate.count).mockResolvedValue(7 as never);

    const res = await request(app).get("/api/trainer/courses/course-1/certificates?page=2&limit=3");

    expect(prisma.certificate.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ orderBy: { issuedAt: "desc" }, skip: 3, take: 3 }),
    );
    expect(res.body.meta).toMatchObject({ total: 7, page: 2, limit: 3 });
  });
});
