import { Router, type Request, type Response, type NextFunction } from "express";
import { prisma } from "../../db/prisma.js";
import { successResponse } from "../../types/index.js";

const router = Router();

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

/**
 * Period-over-period delta formatted as "+N%" / "-N%" (integer percent).
 * Returns null when there is no baseline (prev <= 0) so the UI renders no trend
 * pill instead of a misleading/fabricated number (no-data-fiktif rule).
 */
function pctTrend(curr: number, prev: number): string | null {
  if (prev <= 0) return null;
  const pct = Math.round(((curr - prev) / prev) * 100);
  return `${pct >= 0 ? "+" : ""}${pct}%`;
}

router.get("/stats", async (_req: Request, res: Response, next: NextFunction) => {
  try {
    // Trend windows: current = last 30 days, previous = the 30 days before that.
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - THIRTY_DAYS_MS);
    const sixtyDaysAgo = new Date(now.getTime() - 2 * THIRTY_DAYS_MS);
    const currWindow = { gte: thirtyDaysAgo, lt: now };
    const prevWindow = { gte: sixtyDaysAgo, lt: thirtyDaysAgo };

    const [
      totalUsers,
      totalCourses,
      totalEnrollments,
      totalRevenueAgg,
      pendingCourses,
      activeSubscriptions,
      totalRefundedOrders,
      totalPaidOrders,
      avgRatingAgg,
      retailOrders,
      // Period-over-period inputs (createdAt/enrolledAt/paidAt/startedAt).
      usersCurr,
      usersPrev,
      enrollCurr,
      enrollPrev,
      revenueCurrAgg,
      revenuePrevAgg,
      retailCurrOrders,
      retailPrevOrders,
      subsCurr,
      subsPrev,
    ] = await Promise.all([
      prisma.user.count({ where: { deletedAt: null } }),
      prisma.course.count(),
      prisma.courseEnrollment.count(),
      prisma.order.aggregate({
        _sum: { finalAmount: true },
        where: { status: "paid" },
      }),
      prisma.course.count({ where: { status: "draft" } }),
      prisma.subscription.count({ where: { status: "active" } }),
      prisma.order.count({ where: { status: "refunded" } }),
      prisma.order.count({ where: { status: { in: ["paid", "refunded"] } } }),
      prisma.review.aggregate({
        _avg: { rating: true },
      }),
      prisma.order.findMany({
        where: {
          status: "paid",
          items: {
            none: { itemType: "subscription" }
          }
        },
        select: { finalAmount: true }
      }),
      // New-user growth (User.createdAt).
      prisma.user.count({ where: { deletedAt: null, createdAt: currWindow } }),
      prisma.user.count({ where: { deletedAt: null, createdAt: prevWindow } }),
      // Enrollment growth (CourseEnrollment.enrolledAt).
      prisma.courseEnrollment.count({ where: { enrolledAt: currWindow } }),
      prisma.courseEnrollment.count({ where: { enrolledAt: prevWindow } }),
      // Total revenue (paid orders, by paidAt).
      prisma.order.aggregate({ _sum: { finalAmount: true }, where: { status: "paid", paidAt: currWindow } }),
      prisma.order.aggregate({ _sum: { finalAmount: true }, where: { status: "paid", paidAt: prevWindow } }),
      // Retail revenue (paid orders excluding subscription items, by paidAt).
      prisma.order.findMany({
        where: { status: "paid", paidAt: currWindow, items: { none: { itemType: "subscription" } } },
        select: { finalAmount: true },
      }),
      prisma.order.findMany({
        where: { status: "paid", paidAt: prevWindow, items: { none: { itemType: "subscription" } } },
        select: { finalAmount: true },
      }),
      // Subscription growth (Subscription.startedAt).
      prisma.subscription.count({ where: { startedAt: currWindow } }),
      prisma.subscription.count({ where: { startedAt: prevWindow } }),
    ]);

    const totalRevenue = Number(totalRevenueAgg._sum.finalAmount ?? 0);
    const refundRate = totalPaidOrders > 0 ? Number(((totalRefundedOrders / totalPaidOrders) * 100).toFixed(2)) : 0;
    const avgRating = Number(avgRatingAgg._avg.rating ?? 0).toFixed(1);
    const retailRevenue = retailOrders.reduce((sum, o) => sum + Number(o.finalAmount), 0);

    const revenueCurr = Number(revenueCurrAgg._sum.finalAmount ?? 0);
    const revenuePrev = Number(revenuePrevAgg._sum.finalAmount ?? 0);
    const retailCurr = retailCurrOrders.reduce((sum, o) => sum + Number(o.finalAmount), 0);
    const retailPrev = retailPrevOrders.reduce((sum, o) => sum + Number(o.finalAmount), 0);

    // Additive, backward-compatible: real deltas where meaningful, null when no
    // baseline. Metrics without a meaningful period comparison are omitted.
    const trends = {
      totalUsers: pctTrend(usersCurr, usersPrev),
      totalEnrollments: pctTrend(enrollCurr, enrollPrev),
      totalRevenue: pctTrend(revenueCurr, revenuePrev),
      retailRevenue: pctTrend(retailCurr, retailPrev),
      activeSubscriptions: pctTrend(subsCurr, subsPrev),
    };

    res.json(
      successResponse({
        totalUsers,
        totalCourses,
        totalEnrollments,
        totalRevenue,
        pendingCourses,
        activeSubscriptions,
        refundRate,
        avgRating: Number(avgRating),
        retailRevenue,
        trends,
      })
    );
  } catch (err) {
    next(err);
  }
});

// GET /api/admin/revenue — revenue summary by period
router.get("/revenue", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const period = (req.query.period as string) || "monthly";

    // Last 12 months or 30 days depending on period
    const since = new Date();
    if (period === "monthly") since.setMonth(since.getMonth() - 11);
    else since.setDate(since.getDate() - 29);

    const [totalRevenue, totalOrders, paidOrders, revenueByDay] = await Promise.all([
      prisma.order.aggregate({
        _sum: { finalAmount: true },
        where: { status: "paid" },
      }),
      prisma.order.count(),
      prisma.order.count({ where: { status: "paid" } }),
      prisma.order.findMany({
        where: { status: "paid", paidAt: { gte: since } },
        select: { paidAt: true, finalAmount: true },
        orderBy: { paidAt: "asc" },
      }),
    ]);

    // Group by date
    const grouped: Record<string, number> = {};
    for (const o of revenueByDay) {
      if (!o.paidAt) continue;
      const key = o.paidAt.toISOString().slice(0, period === "monthly" ? 7 : 10);
      grouped[key] = (grouped[key] ?? 0) + Number(o.finalAmount);
    }

    const chart = Object.entries(grouped).map(([date, amount]) => ({ date, amount }));

    res.json(
      successResponse({
        totalRevenue: Number(totalRevenue._sum.finalAmount ?? 0),
        totalOrders,
        paidOrders,
        conversionRate: totalOrders > 0 ? Math.round((paidOrders / totalOrders) * 100) : 0,
        chart,
      })
    );
  } catch (err) {
    next(err);
  }
});

export default router;
