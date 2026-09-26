import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import { app } from "../../../src/app.js";

vi.mock("../../../src/db/prisma.js", () => ({
  prisma: {
    course: { findFirst: vi.fn(), findMany: vi.fn(), update: vi.fn(), updateMany: vi.fn() },
    trainerPayout: { findUnique: vi.fn(), updateMany: vi.fn() },
    review: { findMany: vi.fn(), count: vi.fn() },
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

const baseCourse = {
  id: "course-1",
  trainerId: "trainer-1",
  title: "Kursus Test",
  status: "draft",
  publishedAt: null as Date | null,
  adminFeedback: null,
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(authenticate).mockImplementation(async (req, _res, next) => {
    (req as never as { user: unknown }).user = { id: "trainer-1", email: "trainer@test.com", roles: ["trainer"] };
    next();
  });
  vi.mocked(prisma.course.findFirst).mockResolvedValue(baseCourse as never);
  vi.mocked(prisma.course.updateMany).mockResolvedValue({ count: 1 } as never);
});

// C3 regression (trainer self-publish bypass): server-side transition guard.
describe("PATCH /api/trainer/courses/:courseId/status (C3)", () => {
  it("forbids draft → published (self-publish bypass)", async () => {
    vi.mocked(prisma.course.findFirst).mockResolvedValue({ ...baseCourse, status: "draft" } as never);

    const res = await request(app)
      .patch("/api/trainer/courses/course-1/status")
      .send({ status: "published" });

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
    expect(prisma.course.updateMany).not.toHaveBeenCalled();
  });

  it("forbids pending → published", async () => {
    vi.mocked(prisma.course.findFirst).mockResolvedValue({ ...baseCourse, status: "pending" } as never);

    const res = await request(app)
      .patch("/api/trainer/courses/course-1/status")
      .send({ status: "published" });

    expect(res.status).toBe(403);
    expect(prisma.course.updateMany).not.toHaveBeenCalled();
  });

  it("rejects status 'rejected' at the schema boundary", async () => {
    const res = await request(app)
      .patch("/api/trainer/courses/course-1/status")
      .send({ status: "rejected" });

    expect(res.status).toBe(400);
    expect(prisma.course.updateMany).not.toHaveBeenCalled();
  });

  it("allows draft → pending (submit for review)", async () => {
    vi.mocked(prisma.course.findFirst).mockResolvedValue({ ...baseCourse, status: "draft" } as never);

    const res = await request(app)
      .patch("/api/trainer/courses/course-1/status")
      .send({ status: "pending" });

    expect(res.status).toBe(200);
    expect(prisma.course.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "course-1", trainerId: "trainer-1", status: "draft" },
        data: { status: "pending", adminFeedback: null },
      }),
    );
  });

  it("allows rejected → pending (resubmit)", async () => {
    vi.mocked(prisma.course.findFirst).mockResolvedValue({ ...baseCourse, status: "rejected" } as never);

    const res = await request(app)
      .patch("/api/trainer/courses/course-1/status")
      .send({ status: "pending" });

    expect(res.status).toBe(200);
  });

  it("allows published → archived (take down)", async () => {
    vi.mocked(prisma.course.findFirst).mockResolvedValue({
      ...baseCourse, status: "published", publishedAt: new Date("2026-01-01"),
    } as never);

    const res = await request(app)
      .patch("/api/trainer/courses/course-1/status")
      .send({ status: "archived" });

    expect(res.status).toBe(200);
  });

  it("allows archived → published only when previously approved (publishedAt set)", async () => {
    vi.mocked(prisma.course.findFirst).mockResolvedValue({
      ...baseCourse, status: "archived", publishedAt: new Date("2026-01-01"),
    } as never);

    const res = await request(app)
      .patch("/api/trainer/courses/course-1/status")
      .send({ status: "published" });

    expect(res.status).toBe(200);
  });

  it("forbids archived → published when the course was never approved", async () => {
    vi.mocked(prisma.course.findFirst).mockResolvedValue({
      ...baseCourse, status: "archived", publishedAt: null,
    } as never);

    const res = await request(app)
      .patch("/api/trainer/courses/course-1/status")
      .send({ status: "published" });

    expect(res.status).toBe(403);
    expect(prisma.course.updateMany).not.toHaveBeenCalled();
  });

  it("returns 409 when the status changed concurrently (updateMany count 0)", async () => {
    vi.mocked(prisma.course.findFirst).mockResolvedValue({ ...baseCourse, status: "draft" } as never);
    vi.mocked(prisma.course.updateMany).mockResolvedValue({ count: 0 } as never);

    const res = await request(app)
      .patch("/api/trainer/courses/course-1/status")
      .send({ status: "pending" });

    expect(res.status).toBe(409);
  });

  it("returns 404 for a course the trainer does not own", async () => {
    vi.mocked(prisma.course.findFirst).mockResolvedValue(null);

    const res = await request(app)
      .patch("/api/trainer/courses/other-course/status")
      .send({ status: "pending" });

    expect(res.status).toBe(404);
  });
});

describe("PATCH /api/trainer/payouts/:payoutId (admin processing guard)", () => {
  const asAdmin = () => {
    vi.mocked(authenticate).mockImplementation(async (req, _res, next) => {
      (req as never as { user: unknown }).user = { id: "admin-1", email: "admin@test.com", roles: ["super_admin"] };
      next();
    });
  };

  it("returns 403 for non-admin users", async () => {
    const res = await request(app)
      .patch("/api/trainer/payouts/payout-1")
      .send({ status: "approved" });

    expect(res.status).toBe(403);
    expect(prisma.trainerPayout.updateMany).not.toHaveBeenCalled();
  });

  it("returns 400 for an invalid status", async () => {
    asAdmin();
    const res = await request(app)
      .patch("/api/trainer/payouts/payout-1")
      .send({ status: "banana" });

    expect(res.status).toBe(400);
    expect(prisma.trainerPayout.updateMany).not.toHaveBeenCalled();
  });

  it("processes a pending payout atomically", async () => {
    asAdmin();
    vi.mocked(prisma.trainerPayout.updateMany).mockResolvedValue({ count: 1 } as never);
    vi.mocked(prisma.trainerPayout.findUnique).mockResolvedValue({
      id: "payout-1", status: "approved", note: "OK",
    } as never);

    const res = await request(app)
      .patch("/api/trainer/payouts/payout-1")
      .send({ status: "approved", note: "OK" });

    expect(res.status).toBe(200);
    expect(prisma.trainerPayout.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "payout-1", status: "pending" } }),
    );
  });

  it("returns 409 when the payout was already processed", async () => {
    asAdmin();
    vi.mocked(prisma.trainerPayout.updateMany).mockResolvedValue({ count: 0 } as never);
    vi.mocked(prisma.trainerPayout.findUnique).mockResolvedValue({ id: "payout-1", status: "paid" } as never);

    const res = await request(app)
      .patch("/api/trainer/payouts/payout-1")
      .send({ status: "approved" });

    expect(res.status).toBe(409);
  });

  it("returns 404 when the payout does not exist", async () => {
    asAdmin();
    vi.mocked(prisma.trainerPayout.updateMany).mockResolvedValue({ count: 0 } as never);
    vi.mocked(prisma.trainerPayout.findUnique).mockResolvedValue(null);

    const res = await request(app)
      .patch("/api/trainer/payouts/nonexistent")
      .send({ status: "approved" });

    expect(res.status).toBe(404);
  });
});

describe("PATCH /api/trainer/courses/:courseId/live (Zoom link validation)", () => {
  it("rejects javascript: URIs", async () => {
    const res = await request(app)
      .patch("/api/trainer/courses/course-1/live")
      .send({ liveZoomLink: "javascript:alert(1)" });

    expect(res.status).toBe(400);
    expect(prisma.course.update).not.toHaveBeenCalled();
  });

  it("rejects non-URL strings", async () => {
    const res = await request(app)
      .patch("/api/trainer/courses/course-1/live")
      .send({ liveZoomLink: "bukan-url" });

    expect(res.status).toBe(400);
  });

  it("accepts a valid https URL", async () => {
    vi.mocked(prisma.course.update).mockResolvedValue({ ...baseCourse, liveZoomLink: "https://zoom.us/j/123" } as never);

    const res = await request(app)
      .patch("/api/trainer/courses/course-1/live")
      .send({ liveZoomLink: "https://zoom.us/j/123" });

    expect(res.status).toBe(200);
  });
});

describe("GET /api/trainer/reviews (pagination)", () => {
  beforeEach(() => {
    vi.mocked(prisma.course.findMany).mockResolvedValue([{ id: "course-1" }] as never);
    vi.mocked(prisma.review.findMany).mockResolvedValue([]);
    vi.mocked(prisma.review.count).mockResolvedValue(0);
  });

  it("applies bounded page/limit params", async () => {
    const res = await request(app).get("/api/trainer/reviews?page=2&limit=5");

    expect(res.status).toBe(200);
    expect(prisma.review.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ skip: 5, take: 5 }),
    );
    expect(res.body.meta).toMatchObject({ total: 0, page: 2, limit: 5 });
  });

  it("caps an oversized limit", async () => {
    const res = await request(app).get("/api/trainer/reviews?limit=99999");

    expect(res.status).toBe(200);
    expect(prisma.review.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ take: 100 }), // MAX_LIMIT from lib/pagination
    );
  });
});
