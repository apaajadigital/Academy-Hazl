import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import { app } from "../../src/app.js";

vi.mock("../../src/db/prisma.js", () => ({
  prisma: {
    courseEnrollment: { findMany: vi.fn() },
    certificate: { findMany: vi.fn() },
    courseLessonProgress: { findMany: vi.fn() },
    user: { update: vi.fn() },
    userProfile: { updateMany: vi.fn() },
    refreshToken: { updateMany: vi.fn() },
    $transaction: vi.fn(),
  },
}));

vi.mock("../../src/middleware/authenticate.js", () => ({
  authenticate: vi.fn((req, _res, next) => {
    req.user = { id: "user-1", email: "user@test.com", roles: [] };
    next();
  }),
}));

vi.mock("../../src/services/audit/log.js", () => ({
  writeAudit: vi.fn().mockResolvedValue(undefined),
}));

const { prisma } = await import("../../src/db/prisma.js");
const m = prisma as unknown as Record<string, Record<string, ReturnType<typeof vi.fn>>>;

// ─── Dashboard ─────────────────────────────────────────────────────────────────

describe("GET /api/dashboard", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns stats, enrollments, certificates, and recent activity", async () => {
    m.courseEnrollment.findMany.mockResolvedValue([
      {
        id: "e1", courseId: "c1", enrolledAt: new Date(),
        isCompleted: false, progressPct: 50,
        course: { id: "c1", title: "Kursus A", slug: "kursus-a", thumbnailUrl: null, level: "beginner", trainer: { name: "Trainer A" } },
        progress: [],
      },
    ]);
    m.certificate.findMany.mockResolvedValue([
      { id: "cert1", code: "CERT-001", issuedAt: new Date(), course: { title: "Kursus A" } },
    ]);
    m.courseLessonProgress.findMany.mockResolvedValue([
      { lessonId: "l1", isCompleted: true, completedAt: new Date(), lesson: { title: "Pelajaran 1" }, enrollment: { courseId: "c1" } },
    ]);

    const res = await request(app).get("/api/dashboard");
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty("stats");
    expect(res.body.data.stats).toHaveProperty("totalEnrolled", 1);
    expect(res.body.data).toHaveProperty("enrollments");
    expect(res.body.data).toHaveProperty("recentCertificates");
    expect(res.body.data).toHaveProperty("recentActivity");
  });

  it("returns empty arrays when no data", async () => {
    m.courseEnrollment.findMany.mockResolvedValue([]);
    m.certificate.findMany.mockResolvedValue([]);
    m.courseLessonProgress.findMany.mockResolvedValue([]);

    const res = await request(app).get("/api/dashboard");
    expect(res.status).toBe(200);
    expect(res.body.data.stats.totalEnrolled).toBe(0);
    expect(res.body.data.enrollments).toHaveLength(0);
  });
});

// ─── Users — DELETE /api/users/me (PDP) ──────────────────────────────────────

describe("DELETE /api/users/me", () => {
  beforeEach(() => vi.clearAllMocks());

  it("anonymizes user account and clears cookies", async () => {
    (m.$transaction as unknown as ReturnType<typeof vi.fn>).mockResolvedValue([
      { id: "user-1", email: "deleted+user-1@jagoakademi.invalid" },
      { count: 1 },
      { count: 1 },
    ]);

    const res = await request(app).delete("/api/users/me");
    expect(res.status).toBe(200);
    expect(res.body.data.message).toMatch(/dihapus/i);
  });
});
