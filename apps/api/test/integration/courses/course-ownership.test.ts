import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import { app } from "../../../src/app.js";
import { AppError } from "../../../src/types/index.js";

vi.mock("../../../src/db/prisma.js", () => ({
  prisma: {
    course: { updateMany: vi.fn(), findUniqueOrThrow: vi.fn() },
    auditLog: { create: vi.fn().mockResolvedValue({}) },
  },
}));

// The search index is a side-effect of a successful update; stub the whole
// producer layer so these tests assert authorization only.
vi.mock("../../../src/jobs/queues.js", () => ({
  enqueueEmail: vi.fn().mockResolvedValue(undefined),
  enqueueCertificate: vi.fn().mockResolvedValue(undefined),
  enqueueSearchIndex: vi.fn().mockResolvedValue(undefined),
  enqueueWebhook: vi.fn().mockResolvedValue(undefined),
  closeQueues: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("../../../src/middleware/authenticate.js", () => ({
  authenticate: vi.fn((req, _res, next) => {
    req.user = { id: "trainer-a", email: "a@test.com", roles: ["trainer"] };
    next();
  }),
}));

const { prisma } = await import("../../../src/db/prisma.js");
const { authenticate } = await import("../../../src/middleware/authenticate.js");

const asUser = (id: string, roles: string[]) => {
  vi.mocked(authenticate).mockImplementation(async (req, _res, next) => {
    (req as never as { user: unknown }).user = { id, email: `${id}@test.com`, roles };
    next();
  });
};

const updatedCourse = {
  id: "course-a",
  slug: "kursus-a",
  title: "Judul Baru",
  trainerId: "trainer-a",
  price: { toString: () => "199000" },
  avgRating: { toString: () => "4.5" },
  category: { name: "Digital Marketing", slug: "digital-marketing" },
};

/** The where clause updateMany was called with, for the single call made. */
const whereOfUpdate = () => vi.mocked(prisma.course.updateMany).mock.calls[0]![0].where;

beforeEach(() => {
  vi.clearAllMocks();
  asUser("trainer-a", ["trainer"]);
  vi.mocked(prisma.course.updateMany).mockResolvedValue({ count: 1 } as never);
  vi.mocked(prisma.course.findUniqueOrThrow).mockResolvedValue(updatedCourse as never);
});

// IDOR regression: PUT /api/courses/:id used to write with prisma.course.update
// keyed on the id alone, so trainer A could rewrite trainer B's course.
describe("PUT /api/courses/:id (ownership scoping)", () => {
  it("returns 404 when a trainer updates a course owned by another trainer", async () => {
    // Scoped updateMany matches no row: the course exists but is not theirs.
    vi.mocked(prisma.course.updateMany).mockResolvedValue({ count: 0 } as never);

    const res = await request(app)
      .put("/api/courses/course-b")
      .send({ title: "Dibajak", price: 1 });

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
    // The ownership predicate must be part of the write itself, not a separate
    // probe — otherwise the check and the write can disagree.
    expect(whereOfUpdate()).toEqual({ id: "course-b", trainerId: "trainer-a" });
    expect(prisma.course.findUniqueOrThrow).not.toHaveBeenCalled();
  });

  it("allows a trainer to update their own course", async () => {
    const res = await request(app)
      .put("/api/courses/course-a")
      .send({ title: "Judul Baru" });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(whereOfUpdate()).toEqual({ id: "course-a", trainerId: "trainer-a" });
    expect(vi.mocked(prisma.course.updateMany).mock.calls[0]![0].data).toEqual({ title: "Judul Baru" });
  });

  it("lets super_admin update any trainer's course, unscoped", async () => {
    asUser("admin-1", ["super_admin"]);

    const res = await request(app)
      .put("/api/courses/course-b")
      .send({ title: "Judul Baru" });

    expect(res.status).toBe(200);
    expect(whereOfUpdate()).toEqual({ id: "course-b" });
  });

  it("treats a user holding BOTH trainer and super_admin as super_admin", async () => {
    // The realistic config for an owner who also teaches. Without this test a
    // later "tightening" of the ternary could scope an admin to their own
    // courses and silently break admin edits.
    asUser("owner-1", ["trainer", "super_admin"]);

    const res = await request(app)
      .put("/api/courses/course-b")
      .send({ title: "Judul Baru" });

    expect(res.status).toBe(200);
    expect(whereOfUpdate()).toEqual({ id: "course-b" });
  });

  it("returns 404 — not 500 — when super_admin targets a course that does not exist", async () => {
    asUser("admin-1", ["super_admin"]);
    vi.mocked(prisma.course.updateMany).mockResolvedValue({ count: 0 } as never);

    const res = await request(app)
      .put("/api/courses/tidak-ada")
      .send({ title: "Judul Baru" });

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });

  it("returns an identical error body for a foreign course and a nonexistent one", async () => {
    // Anti-enumeration: the two cases must be indistinguishable, or a trainer
    // can use the response to discover which draft course ids exist.
    vi.mocked(prisma.course.updateMany).mockResolvedValue({ count: 0 } as never);

    const foreign = await request(app).put("/api/courses/course-b").send({ title: "x" });
    const missing = await request(app).put("/api/courses/tidak-ada").send({ title: "x" });

    expect(foreign.status).toBe(missing.status);
    expect(foreign.body).toEqual(missing.body);
  });

  it("writes no audit entry when the update is denied", async () => {
    vi.mocked(prisma.course.updateMany).mockResolvedValue({ count: 0 } as never);

    await request(app).put("/api/courses/course-b").send({ title: "Dibajak" });

    // Guards the current behaviour explicitly: COURSE_UPDATE is only recorded
    // for updates that actually happened, so an audit trail can never show a
    // course edit that was rejected.
    expect(prisma.auditLog.create).not.toHaveBeenCalled();
  });

  it("returns 401 without authentication", async () => {
    vi.mocked(authenticate).mockImplementation(async (_req, _res, next) => {
      next(new AppError(401, "Token akses diperlukan."));
    });

    const res = await request(app)
      .put("/api/courses/course-b")
      .send({ title: "Dibajak" });

    expect(res.status).toBe(401);
    expect(prisma.course.updateMany).not.toHaveBeenCalled();
  });

  it("returns 403 for a role that is neither trainer nor super_admin", async () => {
    asUser("student-1", ["student"]);

    const res = await request(app)
      .put("/api/courses/course-b")
      .send({ title: "Dibajak" });

    expect(res.status).toBe(403);
    expect(prisma.course.updateMany).not.toHaveBeenCalled();
  });
});
