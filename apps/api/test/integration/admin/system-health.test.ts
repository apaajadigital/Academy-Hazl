import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import { app } from "../../../src/app.js";
import jwt from "jsonwebtoken";

vi.mock("../../../src/db/prisma.js", () => ({
  prisma: {
    user: { findUnique: vi.fn(), count: vi.fn() },
    order: { groupBy: vi.fn(), count: vi.fn(), aggregate: vi.fn() },
    course: { findMany: vi.fn(), count: vi.fn() },
    review: { count: vi.fn() },
    blogPost: { count: vi.fn() },
    event: { count: vi.fn() },
    eBook: { count: vi.fn() },
    courseEnrollment: { count: vi.fn() },
    lead: { count: vi.fn() },
    trainerPayout: { count: vi.fn() },
    $queryRaw: vi.fn(),
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

// Same "YYYY-MM" label logic as the module, so assertions are date-stable.
function monthLabel(offset: number): string {
  const now = new Date();
  const d = new Date(now.getFullYear(), now.getMonth() - offset, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

const CURRENT_MONTH = monthLabel(0);
const OLDEST_MONTH = monthLabel(11);

function mockHappyPath() {
  vi.mocked(prisma.user.findUnique).mockResolvedValue(VALID_ADMIN as never);

  // $queryRaw is called three times, in Promise.all source order:
  // revenueByMonth, usersByMonth, enrollmentsByMonth.
  vi.mocked(prisma.$queryRaw)
    .mockResolvedValueOnce([{ month: CURRENT_MONTH, amount: 1234.6 }] as never)
    .mockResolvedValueOnce([{ month: CURRENT_MONTH, count: 3 }] as never)
    .mockResolvedValueOnce([] as never);

  vi.mocked(prisma.order.groupBy).mockResolvedValue([
    { status: "paid", _count: { _all: 5 } },
    { status: "cancelled", _count: { _all: 2 } },
    { status: "mystery", _count: { _all: 1 } },
  ] as never);

  vi.mocked(prisma.course.findMany).mockResolvedValue([
    {
      id: "c-1",
      title: "Belajar Node",
      totalEnrolled: 42,
      avgRating: "4.5",
      trainer: { name: "Pak Trainer" },
    },
  ] as never);

  // user.count is invoked twice: dbUsers first, activeToday second.
  vi.mocked(prisma.user.count)
    .mockResolvedValueOnce(120)
    .mockResolvedValueOnce(7);
  vi.mocked(prisma.course.count).mockResolvedValue(10);
  vi.mocked(prisma.order.count).mockResolvedValue(8);
  vi.mocked(prisma.review.count).mockResolvedValue(6);
  vi.mocked(prisma.blogPost.count).mockResolvedValue(5);
  vi.mocked(prisma.event.count).mockResolvedValue(4);
  vi.mocked(prisma.eBook.count).mockResolvedValue(3);
  vi.mocked(prisma.courseEnrollment.count).mockResolvedValue(50);
  vi.mocked(prisma.lead.count).mockResolvedValue(2);
  vi.mocked(prisma.trainerPayout.count).mockResolvedValue(1);

  vi.mocked(prisma.order.aggregate).mockResolvedValue({
    _sum: { finalAmount: 999000 },
  } as never);
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("GET /api/admin/system-health", () => {
  it("returns the full health payload shape", async () => {
    mockHappyPath();

    const res = await request(app).get("/api/admin/system-health").set(ADMIN_AUTH);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Object.keys(res.body.data).sort()).toEqual(
      ["dbOverview", "enrollments", "orders", "revenue", "topCourses", "users"].sort()
    );
    expect(res.body.data.revenue.total).toBe(999000);
    expect(res.body.data.users.total).toBe(120);
    expect(res.body.data.users.activeToday).toBe(7);
    expect(res.body.data.enrollments.total).toBe(50);
    expect(res.body.data.orders.total).toBe(8);
    expect(res.body.data.dbOverview).toEqual({
      users: 120,
      courses: 10,
      orders: 8,
      reviews: 6,
      blogs: 5,
      events: 4,
      ebooks: 3,
      enrollments: 50,
      leads: 2,
      payouts: 1,
    });
  });

  it("zero-fills all 12 months and rounds the revenue amounts", async () => {
    mockHappyPath();

    const res = await request(app).get("/api/admin/system-health").set(ADMIN_AUTH);
    expect(res.status).toBe(200);

    const revenueChart = res.body.data.revenue.chart as { date: string; amount: number }[];
    expect(revenueChart).toHaveLength(12);
    expect(revenueChart[0]).toEqual({ date: OLDEST_MONTH, amount: 0 });
    // 1234.6 must be rounded, and land on the current-month bucket.
    expect(revenueChart[11]).toEqual({ date: CURRENT_MONTH, amount: 1235 });

    const userChart = res.body.data.users.chart as { date: string; count: number }[];
    expect(userChart).toHaveLength(12);
    expect(userChart[11]).toEqual({ date: CURRENT_MONTH, count: 3 });
    expect(userChart[0]).toEqual({ date: OLDEST_MONTH, count: 0 });

    // Enrollment query returned no rows at all — chart must still have 12 zeros.
    const enrollmentChart = res.body.data.enrollments.chart as { date: string; count: number }[];
    expect(enrollmentChart).toHaveLength(12);
    expect(enrollmentChart.every((p) => p.count === 0)).toBe(true);
  });

  it("includes cancelled, zero-fills known statuses, and appends unknown status with fallback color", async () => {
    mockHappyPath();

    const res = await request(app).get("/api/admin/system-health").set(ADMIN_AUTH);
    expect(res.status).toBe(200);

    const distribution = res.body.data.orders.distribution as {
      status: string;
      count: number;
      color: string;
    }[];

    // 6 known statuses + 1 unknown appended.
    expect(distribution).toHaveLength(7);

    const byStatus = Object.fromEntries(distribution.map((d) => [d.status, d]));
    expect(byStatus.cancelled).toEqual({ status: "cancelled", count: 2, color: "#F97316" });
    expect(byStatus.paid).toEqual(expect.objectContaining({ count: 5 }));
    // Statuses missing from groupBy are zero-filled, keeping the donut stable.
    expect(byStatus.pending).toEqual(expect.objectContaining({ count: 0 }));
    expect(byStatus.refunded).toEqual(expect.objectContaining({ count: 0 }));
    // Unknown status is appended last with the fallback color.
    expect(distribution[6]).toEqual({ status: "mystery", count: 1, color: "#94A3B8" });
  });

  it("maps top courses to title/enrolled/rating/trainer", async () => {
    mockHappyPath();

    const res = await request(app).get("/api/admin/system-health").set(ADMIN_AUTH);
    expect(res.status).toBe(200);
    expect(res.body.data.topCourses).toEqual([
      { title: "Belajar Node", enrolled: 42, rating: 4.5, trainer: "Pak Trainer" },
    ]);
  });

  it("returns 403 for non-admin users", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(VALID_USER as never);

    const res = await request(app).get("/api/admin/system-health").set(USER_AUTH);
    expect(res.status).toBe(403);
    expect(prisma.$queryRaw).not.toHaveBeenCalled();
  });

  it("returns 401 without auth", async () => {
    const res = await request(app).get("/api/admin/system-health");
    expect(res.status).toBe(401);
  });
});
