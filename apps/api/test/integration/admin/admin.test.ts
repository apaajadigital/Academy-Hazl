import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import { app } from "../../../src/app.js";
import jwt from "jsonwebtoken";

vi.mock("../../../src/db/prisma.js", () => ({
  prisma: {
    user: { findUnique: vi.fn(), count: vi.fn(), findMany: vi.fn(), update: vi.fn() },
    course: { count: vi.fn(), findMany: vi.fn(), findUnique: vi.fn(), update: vi.fn() },
    courseEnrollment: { count: vi.fn() },
    order: { aggregate: vi.fn(), count: vi.fn(), findMany: vi.fn() },
    subscription: { count: vi.fn() },
    review: { aggregate: vi.fn() },
  },
}));

const { prisma } = await import("../../../src/db/prisma.js");

const VALID_ADMIN = {
  id: "admin-1",
  email: "admin@jago.id",
  isActive: true,
  deletedAt: null,
  roles: [{ role: "super_admin" }],
};

const VALID_USER = {
  id: "user-1",
  email: "user@jago.id",
  isActive: true,
  deletedAt: null,
  roles: [{ role: "student" }],
};

const ADMIN_TOKEN = jwt.sign(
  { sub: "admin-1", email: "admin@jago.id", roles: ["super_admin"] },
  process.env.JWT_SECRET!,
  { expiresIn: "15m" }
);

const USER_TOKEN = jwt.sign(
  { sub: "user-1", email: "user@jago.id", roles: ["student"] },
  process.env.JWT_SECRET!,
  { expiresIn: "15m" }
);

const ADMIN_AUTH = { Authorization: `Bearer ${ADMIN_TOKEN}` };
const USER_AUTH = { Authorization: `Bearer ${USER_TOKEN}` };

beforeEach(() => {
  vi.clearAllMocks();
});

describe("GET /api/admin/stats", () => {
  it("returns stats for super_admin", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(VALID_ADMIN as never);
    vi.mocked(prisma.user.count).mockResolvedValue(42);
    vi.mocked(prisma.course.count).mockResolvedValue(10);
    vi.mocked(prisma.courseEnrollment.count).mockResolvedValue(200);
    vi.mocked(prisma.order.aggregate).mockResolvedValue({ _sum: { finalAmount: 5000000 } } as never);
    vi.mocked(prisma.subscription.count).mockResolvedValue(15);
    vi.mocked(prisma.order.count).mockResolvedValue(3);
    vi.mocked(prisma.review.aggregate).mockResolvedValue({ _avg: { rating: 4.8 } } as never);
    vi.mocked(prisma.order.findMany).mockResolvedValue([]);

    const res = await request(app).get("/api/admin/stats").set(ADMIN_AUTH);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.totalUsers).toBe(42);
  });

  it("returns real period-over-period trends when the previous period has data", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(VALID_ADMIN as never);
    vi.mocked(prisma.course.count).mockResolvedValue(10);
    vi.mocked(prisma.order.count).mockResolvedValue(3);
    vi.mocked(prisma.review.aggregate).mockResolvedValue({ _avg: { rating: 4.8 } } as never);

    // Distinguish base totals vs the two trend windows by the date filter:
    // trend queries add a createdAt/enrolledAt/paidAt/startedAt range; the base
    // totals do not. Within trend queries, the current window's lower bound is
    // ~30d ago, the previous window's is ~60d ago.
    const daysAgo = (d: Date) => (Date.now() - d.getTime()) / 86_400_000;
    const isCurr = (range: { gte: Date } | undefined) => range != null && daysAgo(range.gte) < 45;

    vi.mocked(prisma.user.count).mockImplementation((args) => {
      const range = (args as { where?: { createdAt?: { gte: Date } } } | undefined)?.where?.createdAt;
      if (!range) return Promise.resolve(42) as never; // base totalUsers
      return Promise.resolve(isCurr(range) ? 12 : 10) as never; // +20%
    });
    vi.mocked(prisma.courseEnrollment.count).mockImplementation((args) => {
      const range = (args as { where?: { enrolledAt?: { gte: Date } } } | undefined)?.where?.enrolledAt;
      if (!range) return Promise.resolve(200) as never; // base totalEnrollments
      return Promise.resolve(isCurr(range) ? 15 : 10) as never; // +50%
    });
    vi.mocked(prisma.subscription.count).mockImplementation((args) => {
      const range = (args as { where?: { startedAt?: { gte: Date } } } | undefined)?.where?.startedAt;
      if (!range) return Promise.resolve(15) as never; // base activeSubscriptions
      return Promise.resolve(isCurr(range) ? 8 : 10) as never; // -20%
    });
    vi.mocked(prisma.order.aggregate).mockImplementation((args) => {
      const range = (args as { where?: { paidAt?: { gte: Date } } } | undefined)?.where?.paidAt;
      if (!range) return Promise.resolve({ _sum: { finalAmount: 5_000_000 } }) as never; // base totalRevenue
      return Promise.resolve({ _sum: { finalAmount: isCurr(range) ? 2_000_000 : 1_000_000 } }) as never; // +100%
    });
    vi.mocked(prisma.order.findMany).mockImplementation((args) => {
      const range = (args as { where?: { paidAt?: { gte: Date } } } | undefined)?.where?.paidAt;
      if (!range) return Promise.resolve([]) as never; // base retail
      return Promise.resolve(isCurr(range) ? [{ finalAmount: 300 }, { finalAmount: 300 }] : [{ finalAmount: 500 }]) as never; // 600 vs 500 → +20%
    });

    const res = await request(app).get("/api/admin/stats").set(ADMIN_AUTH);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    // Base totals stay backward-compatible.
    expect(res.body.data.totalUsers).toBe(42);
    // Additive trends object with real deltas.
    expect(res.body.data.trends).toEqual({
      totalUsers: "+20%",
      totalEnrollments: "+50%",
      totalRevenue: "+100%",
      retailRevenue: "+20%",
      activeSubscriptions: "-20%",
    });
  });

  it("returns null trends when the previous period has no data", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(VALID_ADMIN as never);
    vi.mocked(prisma.course.count).mockResolvedValue(10);
    vi.mocked(prisma.order.count).mockResolvedValue(3);
    vi.mocked(prisma.review.aggregate).mockResolvedValue({ _avg: { rating: 4.8 } } as never);

    const daysAgo = (d: Date) => (Date.now() - d.getTime()) / 86_400_000;
    const isCurr = (range: { gte: Date } | undefined) => range != null && daysAgo(range.gte) < 45;

    // Current window has activity, previous window is empty → no baseline → null.
    vi.mocked(prisma.user.count).mockImplementation((args) => {
      const range = (args as { where?: { createdAt?: { gte: Date } } } | undefined)?.where?.createdAt;
      if (!range) return Promise.resolve(42) as never;
      return Promise.resolve(isCurr(range) ? 5 : 0) as never;
    });
    vi.mocked(prisma.courseEnrollment.count).mockImplementation((args) => {
      const range = (args as { where?: { enrolledAt?: { gte: Date } } } | undefined)?.where?.enrolledAt;
      if (!range) return Promise.resolve(200) as never;
      return Promise.resolve(isCurr(range) ? 5 : 0) as never;
    });
    vi.mocked(prisma.subscription.count).mockImplementation((args) => {
      const range = (args as { where?: { startedAt?: { gte: Date } } } | undefined)?.where?.startedAt;
      if (!range) return Promise.resolve(15) as never;
      return Promise.resolve(isCurr(range) ? 5 : 0) as never;
    });
    vi.mocked(prisma.order.aggregate).mockImplementation((args) => {
      const range = (args as { where?: { paidAt?: { gte: Date } } } | undefined)?.where?.paidAt;
      if (!range) return Promise.resolve({ _sum: { finalAmount: 5_000_000 } }) as never;
      return Promise.resolve({ _sum: { finalAmount: isCurr(range) ? 1_000_000 : 0 } }) as never;
    });
    vi.mocked(prisma.order.findMany).mockImplementation((args) => {
      const range = (args as { where?: { paidAt?: { gte: Date } } } | undefined)?.where?.paidAt;
      if (!range) return Promise.resolve([]) as never;
      return Promise.resolve(isCurr(range) ? [{ finalAmount: 100 }] : []) as never;
    });

    const res = await request(app).get("/api/admin/stats").set(ADMIN_AUTH);
    expect(res.status).toBe(200);
    expect(res.body.data.trends).toEqual({
      totalUsers: null,
      totalEnrollments: null,
      totalRevenue: null,
      retailRevenue: null,
      activeSubscriptions: null,
    });
  });

  it("returns 403 for non-admin users", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(VALID_USER as never);

    const res = await request(app).get("/api/admin/stats").set(USER_AUTH);
    expect(res.status).toBe(403);
  });

  it("returns 401 without auth", async () => {
    const res = await request(app).get("/api/admin/stats");
    expect(res.status).toBe(401);
  });
});

describe("GET /api/admin/users", () => {
  it("returns paginated users", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(VALID_ADMIN as never);
    vi.mocked(prisma.user.findMany).mockResolvedValue([VALID_ADMIN] as never);
    vi.mocked(prisma.user.count).mockResolvedValue(1);

    const res = await request(app).get("/api/admin/users").set(ADMIN_AUTH);
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.meta.total).toBe(1);
  });
});

describe("PATCH /api/admin/users/:id", () => {
  it("deactivates a user", async () => {
    vi.mocked(prisma.user.findUnique)
      .mockResolvedValueOnce(VALID_ADMIN as never)
      .mockResolvedValueOnce(VALID_USER as never);
    vi.mocked(prisma.user.update).mockResolvedValue({ ...VALID_USER, isActive: false } as never);

    const res = await request(app)
      .patch("/api/admin/users/user-1")
      .set(ADMIN_AUTH)
      .send({ isActive: false });

    expect(res.status).toBe(200);
    expect(res.body.data.isActive).toBe(false);
  });

  it("returns 400 with invalid payload", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(VALID_ADMIN as never);

    const res = await request(app)
      .patch("/api/admin/users/user-1")
      .set(ADMIN_AUTH)
      .send({ isActive: "yes" });

    expect(res.status).toBe(400);
  });
});

describe("GET /api/admin/courses", () => {
  it("returns paginated course list", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(VALID_ADMIN as never);
    vi.mocked(prisma.course.findMany).mockResolvedValue([
      { id: "c-1", title: "Test Course", status: "draft" },
    ] as never);
    vi.mocked(prisma.course.count).mockResolvedValue(1);

    const res = await request(app).get("/api/admin/courses").set(ADMIN_AUTH);
    expect(res.status).toBe(200);
    // Endpoint returns a paginated object (new admin UI), not a bare array.
    expect(res.body.data.courses).toHaveLength(1);
    expect(res.body.data.courses[0].id).toBe("c-1");
    expect(res.body.data.total).toBe(1);
    expect(res.body.data.page).toBe(1);
    expect(res.body.data.limit).toBe(20);
  });
});

describe("PATCH /api/admin/courses/:id", () => {
  it("publishes a draft course", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(VALID_ADMIN as never);
    vi.mocked(prisma.course.findUnique).mockResolvedValue({ id: "c-1", status: "draft" } as never);
    vi.mocked(prisma.course.update).mockResolvedValue({
      id: "c-1",
      title: "Test",
      status: "published",
      publishedAt: new Date(),
    } as never);

    const res = await request(app)
      .patch("/api/admin/courses/c-1")
      .set(ADMIN_AUTH)
      .send({ status: "published" });

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe("published");
  });

  it("reverts a course to draft", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(VALID_ADMIN as never);
    vi.mocked(prisma.course.findUnique).mockResolvedValue({ id: "c-1", status: "published" } as never);
    vi.mocked(prisma.course.update).mockResolvedValue({
      id: "c-1",
      title: "Test",
      status: "draft",
    } as never);

    const res = await request(app)
      .patch("/api/admin/courses/c-1")
      .set(ADMIN_AUTH)
      .send({ status: "draft" });

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe("draft");
  });

  it("rejects a course and saves feedback", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(VALID_ADMIN as never);
    vi.mocked(prisma.course.findUnique).mockResolvedValue({ id: "c-1", status: "pending" } as never);
    vi.mocked(prisma.course.update).mockResolvedValue({
      id: "c-1",
      title: "Test",
      status: "rejected",
      adminFeedback: "please fix video resolution",
    } as never);

    const res = await request(app)
      .patch("/api/admin/courses/c-1")
      .set(ADMIN_AUTH)
      .send({ status: "rejected", adminFeedback: "please fix video resolution" });

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe("rejected");
    expect(res.body.data.adminFeedback).toBe("please fix video resolution");
  });

  it("returns 400 with invalid status", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(VALID_ADMIN as never);

    const res = await request(app)
      .patch("/api/admin/courses/c-1")
      .set(ADMIN_AUTH)
      .send({ status: "bogus" });

    expect(res.status).toBe(400);
  });
});

describe("GET /api/admin/courses/:id", () => {
  it("returns course detail with trainer and sections", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(VALID_ADMIN as never);
    vi.mocked(prisma.course.findUnique).mockResolvedValue({
      id: "c-1",
      title: "Detailed Course",
      trainer: { id: "t-1", name: "Trainer X" },
      sections: [],
    } as never);

    const res = await request(app).get("/api/admin/courses/c-1").set(ADMIN_AUTH);
    expect(res.status).toBe(200);
    expect(res.body.data.title).toBe("Detailed Course");
    expect(res.body.data.trainer.name).toBe("Trainer X");
  });

  it("returns 404 if course not found", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(VALID_ADMIN as never);
    vi.mocked(prisma.course.findUnique).mockResolvedValue(null);

    const res = await request(app).get("/api/admin/courses/c-missing").set(ADMIN_AUTH);
    expect(res.status).toBe(404);
  });
});
