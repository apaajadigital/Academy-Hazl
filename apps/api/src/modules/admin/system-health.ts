import { Router, type Request, type Response, type NextFunction } from "express";
import { prisma } from "../../db/prisma.js";
import { successResponse } from "../../types/index.js";

const router = Router();

// ─── Helper: generate last N month labels ("YYYY-MM") ────────────────────────
function getLastMonths(n: number): { label: string; start: Date }[] {
  const months: { label: string; start: Date }[] = [];
  const now = new Date();
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    months.push({ label: `${yyyy}-${mm}`, start: d });
  }
  return months;
}

// Row shape returned by the monthly-bucket aggregation queries below.
type MonthlyCountRow = { month: string; count: number };
type MonthlyAmountRow = { month: string; amount: number };

// Known order statuses in display order. Colors match the admin UI donut.
// Any status not listed here (future additions) still shows up with a
// fallback color so the chart always sums to the order total.
const ORDER_STATUS_COLORS: Record<string, string> = {
  paid: "#10B981",
  pending: "#F59E0B",
  failed: "#EF4444",
  expired: "#6B7280",
  refunded: "#8B5CF6",
  cancelled: "#F97316",
};
const ORDER_STATUS_FALLBACK_COLOR = "#94A3B8";

// GET /api/admin/system-health — comprehensive system health data
router.get("/system-health", async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const months = getLastMonths(12);
    const since = months[0]!.start;

    // ── Parallel queries ────────────────────────────────────────────────────
    // Monthly buckets are aggregated in SQL via date_trunc (DB timezone)
    // instead of loading 12 months of full rows into memory (perf fix).
    const [
      // Monthly aggregations
      revenueByMonth,
      usersByMonth,
      enrollmentsByMonth,
      // Order distribution — one groupBy covers ALL statuses (incl. cancelled)
      // so the donut always sums to the order total.
      orderStatusGroups,
      // Top courses
      topCourses,
      // Database counts
      dbUsers,
      dbCourses,
      dbOrders,
      dbReviews,
      dbBlogs,
      dbEvents,
      dbEbooks,
      dbEnrollments,
      dbLeads,
      dbPayouts,
      // Active users (logged in within 24h)
      activeToday,
      // Total revenue
      totalRevenueAgg,
    ] = await Promise.all([
      // Revenue per month — paid orders since 12 months ago
      prisma.$queryRaw<MonthlyAmountRow[]>`
        SELECT to_char(date_trunc('month', "paidAt"), 'YYYY-MM') AS month,
               COALESCE(SUM("finalAmount"), 0)::float AS amount
        FROM "orders"
        WHERE "status" = 'paid' AND "paidAt" >= ${since}
        GROUP BY 1
      `,
      // New users per month — created since 12 months ago
      prisma.$queryRaw<MonthlyCountRow[]>`
        SELECT to_char(date_trunc('month', "createdAt"), 'YYYY-MM') AS month,
               COUNT(*)::int AS count
        FROM "users"
        WHERE "createdAt" >= ${since} AND "deletedAt" IS NULL
        GROUP BY 1
      `,
      // Enrollments per month — enrolled since 12 months ago
      prisma.$queryRaw<MonthlyCountRow[]>`
        SELECT to_char(date_trunc('month', "enrolledAt"), 'YYYY-MM') AS month,
               COUNT(*)::int AS count
        FROM "course_enrollments"
        WHERE "enrolledAt" >= ${since}
        GROUP BY 1
      `,
      // Order distribution across every status present in the table
      prisma.order.groupBy({ by: ["status"], _count: { _all: true } }),
      // Top 5 courses by enrollment
      prisma.course.findMany({
        orderBy: { totalEnrolled: "desc" },
        take: 5,
        select: {
          id: true,
          title: true,
          totalEnrolled: true,
          avgRating: true,
          trainer: { select: { name: true } },
        },
      }),
      // DB overview counts
      prisma.user.count({ where: { deletedAt: null } }),
      prisma.course.count(),
      prisma.order.count(),
      prisma.review.count(),
      prisma.blogPost.count(),
      prisma.event.count(),
      prisma.eBook.count(),
      prisma.courseEnrollment.count(),
      prisma.lead.count(),
      prisma.trainerPayout.count(),
      // Active users today
      prisma.user.count({
        where: {
          lastLoginAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
          deletedAt: null,
        },
      }),
      // Total revenue
      prisma.order.aggregate({
        _sum: { finalAmount: true },
        where: { status: "paid" },
      }),
    ]);

    // ── Monthly charts — fill every month label so charts always have 12 points
    const revenueMap = new Map(revenueByMonth.map((r) => [r.month, r.amount]));
    const revenueChart = months.map((m) => ({
      date: m.label,
      amount: Math.round(revenueMap.get(m.label) ?? 0),
    }));

    const userMap = new Map(usersByMonth.map((r) => [r.month, r.count]));
    const userChart = months.map((m) => ({
      date: m.label,
      count: userMap.get(m.label) ?? 0,
    }));

    const enrollmentMap = new Map(enrollmentsByMonth.map((r) => [r.month, r.count]));
    const enrollmentChart = months.map((m) => ({
      date: m.label,
      count: enrollmentMap.get(m.label) ?? 0,
    }));

    // ── Order distribution ────────────────────────────────────────────────
    const statusCounts = new Map(orderStatusGroups.map((g) => [g.status, g._count._all]));
    // Known statuses first (stable order, zero-filled), then any extras found.
    const orderDistribution = [
      ...Object.entries(ORDER_STATUS_COLORS).map(([status, color]) => ({
        status,
        count: statusCounts.get(status) ?? 0,
        color,
      })),
      ...orderStatusGroups
        .filter((g) => !(g.status in ORDER_STATUS_COLORS))
        .map((g) => ({
          status: g.status,
          count: g._count._all,
          color: ORDER_STATUS_FALLBACK_COLOR,
        })),
    ];

    // ── Top courses ───────────────────────────────────────────────────────
    const topCoursesData = topCourses.map((c) => ({
      title: c.title,
      enrolled: c.totalEnrolled,
      rating: Number(c.avgRating),
      trainer: c.trainer.name,
    }));

    // ── Response ──────────────────────────────────────────────────────────
    res.json(
      successResponse({
        revenue: {
          chart: revenueChart,
          total: Number(totalRevenueAgg._sum.finalAmount ?? 0),
        },
        users: {
          chart: userChart,
          total: dbUsers,
          activeToday,
        },
        enrollments: {
          chart: enrollmentChart,
          total: dbEnrollments,
        },
        orders: {
          distribution: orderDistribution,
          total: dbOrders,
        },
        topCourses: topCoursesData,
        dbOverview: {
          users: dbUsers,
          courses: dbCourses,
          orders: dbOrders,
          reviews: dbReviews,
          blogs: dbBlogs,
          events: dbEvents,
          ebooks: dbEbooks,
          enrollments: dbEnrollments,
          leads: dbLeads,
          payouts: dbPayouts,
        },
      })
    );
  } catch (err) {
    next(err);
  }
});

export default router;
