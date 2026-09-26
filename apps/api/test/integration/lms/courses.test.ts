import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import { app } from "../../../src/app.js";

vi.mock("../../../src/db/prisma.js", () => ({
  prisma: {
    lmsCourse: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    lmsLesson: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    lmsBatch: {
      findFirst: vi.fn(),
    },
    lmsQuiz: {
      create: vi.fn(),
    },
    lmsCourseAssignment: {
      upsert: vi.fn(),
    },
    lmsBatchMember: {
      findMany: vi.fn(),
    },
    lmsEnrollment: {
      upsert: vi.fn(),
    },
    userRole: {
      findFirst: vi.fn(),
    },
  },
}));

vi.mock("../../../src/middleware/authenticate.js", () => ({
  authenticate: vi.fn((req, _res, next) => {
    req.user = { id: "admin-1", email: "admin@test.com", name: "Admin", roles: ["super_admin"] };
    next();
  }),
}));

const { prisma } = await import("../../../src/db/prisma.js");

const mockCourse = {
  id: "course-lms-1",
  tenantId: "tenant-1",
  title: "Onboarding Karyawan",
  description: "Kursus onboarding untuk karyawan baru",
  status: "published",
  createdAt: new Date(),
  updatedAt: new Date(),
  _count: { lessons: 5, enrollments: 20 },
};

const mockLesson = {
  id: "lesson-lms-1",
  courseId: "course-lms-1",
  title: "Pengenalan Perusahaan",
  content: "Selamat datang di PT ABC",
  videoUrl: null,
  durationMins: 15,
  sortOrder: 0,
  createdAt: new Date(),
  _count: { quizzes: 1 },
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(prisma.lmsCourse.findMany).mockResolvedValue([mockCourse] as never);
  vi.mocked(prisma.lmsCourse.create).mockResolvedValue(mockCourse as never);
  vi.mocked(prisma.lmsCourse.update).mockResolvedValue(mockCourse as never);
  // H1 tenant-scope guards resolve the child through the tenant before acting.
  vi.mocked(prisma.lmsCourse.findFirst).mockResolvedValue(mockCourse as never);
  vi.mocked(prisma.lmsLesson.findFirst).mockResolvedValue(mockLesson as never);
  vi.mocked(prisma.lmsBatch.findFirst).mockResolvedValue({ id: "batch-1", tenantId: "tenant-1" } as never);
  vi.mocked(prisma.lmsLesson.findMany).mockResolvedValue([mockLesson] as never);
  vi.mocked(prisma.lmsLesson.create).mockResolvedValue(mockLesson as never);
  vi.mocked(prisma.lmsLesson.update).mockResolvedValue(mockLesson as never);
  vi.mocked(prisma.lmsLesson.delete).mockResolvedValue({} as never);
  vi.mocked(prisma.lmsQuiz.create).mockResolvedValue({} as never);
  vi.mocked(prisma.lmsCourseAssignment.upsert).mockResolvedValue({} as never);
  vi.mocked(prisma.lmsBatchMember.findMany).mockResolvedValue([]);
  vi.mocked(prisma.lmsEnrollment.upsert).mockResolvedValue({} as never);
  vi.mocked(prisma.userRole.findFirst).mockResolvedValue(null);
});

describe("GET /api/lms/tenants/:tenantId/courses", () => {
  it("returns course list", async () => {
    const res = await request(app).get("/api/lms/tenants/tenant-1/courses");
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveLength(1);
  });
});

describe("POST /api/lms/tenants/:tenantId/courses", () => {
  it("creates a new LMS course", async () => {
    const res = await request(app)
      .post("/api/lms/tenants/tenant-1/courses")
      .send({ title: "Onboarding Karyawan", status: "published" });
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
  });

  it("returns 400 when title is missing", async () => {
    const res = await request(app).post("/api/lms/tenants/tenant-1/courses").send({});
    expect(res.status).toBe(400);
  });
});

describe("POST /api/lms/tenants/:tenantId/courses/:courseId/lessons", () => {
  it("adds a lesson to a course", async () => {
    const res = await request(app)
      .post("/api/lms/tenants/tenant-1/courses/course-lms-1/lessons")
      .send({ title: "Pengenalan Perusahaan", durationMins: 15, sortOrder: 0 });
    expect(res.status).toBe(201);
    expect(res.body.data.title).toBe("Pengenalan Perusahaan");
  });
});

describe("DELETE /api/lms/tenants/:tenantId/courses/:courseId/lessons/:lessonId", () => {
  it("deletes a lesson", async () => {
    const res = await request(app)
      .delete("/api/lms/tenants/tenant-1/courses/course-lms-1/lessons/lesson-lms-1");
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});

describe("POST /api/lms/tenants/:tenantId/courses/:courseId/lessons/:lessonId/quizzes", () => {
  it("creates a quiz question", async () => {
    const res = await request(app)
      .post("/api/lms/tenants/tenant-1/courses/course-lms-1/lessons/lesson-lms-1/quizzes")
      .send({ question: "Apa itu onboarding?", options: ["Opsi A", "Opsi B", "Opsi C"], answer: 0 });
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
  });

  it("returns 400 when options are insufficient", async () => {
    const res = await request(app)
      .post("/api/lms/tenants/tenant-1/courses/course-lms-1/lessons/lesson-lms-1/quizzes")
      .send({ question: "Apa?", options: ["Satu"], answer: 0 });
    expect(res.status).toBe(400);
  });
});

describe("POST /api/lms/tenants/:tenantId/courses/:courseId/assign", () => {
  it("assigns course to batch and auto-enrolls members", async () => {
    vi.mocked(prisma.lmsBatchMember.findMany).mockResolvedValue([
      { id: "m1", batchId: "batch-1", userId: "user-1", joinedAt: new Date() },
    ] as never);

    const res = await request(app)
      .post("/api/lms/tenants/tenant-1/courses/course-lms-1/assign")
      .send({ batchId: "batch-1", isMandatory: true });
    expect(res.status).toBe(200);
    expect(prisma.lmsEnrollment.upsert).toHaveBeenCalled();
  });
});
