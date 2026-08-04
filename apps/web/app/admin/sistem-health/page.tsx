"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Users,
  Activity,
  Wallet,
  ShoppingBag,
  GraduationCap,
  Trophy,
  TrendingUp,
  PieChart,
  Database,
  RefreshCw,
  BookOpen,
  CreditCard,
  Star,
  Newspaper,
  CalendarDays,
  BookMarked,
  ClipboardList,
  type LucideIcon,
} from "lucide-react";
import dynamic from "next/dynamic";
import { Card, StatCard, DashboardLoading, DashboardError, PageHeader, Button } from "@/components/ui";
import { getValidToken } from "@/lib/auth/token";
import type { ChartPoint, OrderDist, TopCourse } from "./Charts";

/* ─────────────────────────── Types ────────────────────────────────────────── */
type DbOverview = Record<string, number>;

type HealthData = {
  revenue: { chart: ChartPoint[]; total: number };
  users: { chart: ChartPoint[]; total: number; activeToday: number };
  enrollments: { chart: ChartPoint[]; total: number };
  orders: { distribution: OrderDist[]; total: number };
  topCourses: TopCourse[];
  dbOverview: DbOverview;
};

/* --- Lazy-loaded SVG charts (code-split into ./Charts) --- */

// Skeleton shown while the chart chunk loads (ssr:false, client-only).
const chartLoader = (h: number) => function ChartSkeleton() {
  return <div className="animate-pulse rounded-[var(--radius-md)] bg-surface-sunken" style={{ height: h }} aria-hidden="true" />;
};

const LineChart = dynamic(() => import("./Charts").then((m) => m.LineChart), { ssr: false, loading: chartLoader(220) });
const BarChart = dynamic(() => import("./Charts").then((m) => m.BarChart), { ssr: false, loading: chartLoader(220) });
const DonutChart = dynamic(() => import("./Charts").then((m) => m.DonutChart), { ssr: false, loading: chartLoader(180) });
const HorizontalBarChart = dynamic(() => import("./Charts").then((m) => m.HorizontalBarChart), { ssr: false, loading: chartLoader(200) });

/* ─────────────────────────── Page Component ──────────────────────────────── */

const DB_LABELS: Record<string, { label: string; icon: LucideIcon; color: string }> = {
  users: { label: "Users", icon: Users, color: "#0077A8" },
  courses: { label: "Kursus", icon: BookOpen, color: "#7C3AED" },
  orders: { label: "Orders", icon: CreditCard, color: "#059669" },
  enrollments: { label: "Enrollment", icon: GraduationCap, color: "#DC2626" },
  reviews: { label: "Review", icon: Star, color: "#F59E0B" },
  blogs: { label: "Blog", icon: Newspaper, color: "#EC4899" },
  events: { label: "Event", icon: CalendarDays, color: "#8B5CF6" },
  ebooks: { label: "E-Book", icon: BookMarked, color: "#0891B2" },
  leads: { label: "Leads", icon: ClipboardList, color: "#64748B" },
  payouts: { label: "Payouts", icon: Wallet, color: "#059669" },
};

export default function SystemHealthPage() {
  const [data, setData] = useState<HealthData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  const fetchData = useCallback(async () => {
    const token = await getValidToken();
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/system-health", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (json.success) {
        setData(json.data);
        setLastRefresh(new Date());
      } else {
        setError(json.error?.message ?? "Gagal memuat data.");
      }
    } catch {
      setError("Koneksi gagal. Coba lagi.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading) {
    return (
      <div className="dash-container">
        <DashboardLoading label="Memuat data sistem…" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="dash-container py-16">
        <DashboardError message={error ?? "Data tidak tersedia"} onRetry={fetchData} />
      </div>
    );
  }

  const kpiCards: { label: string; value: string; icon: LucideIcon; color: string; bg: string }[] = [
    { label: "Total Users", value: data.users.total.toLocaleString("id-ID"), icon: Users, color: "#0077A8", bg: "#E8F4F9" },
    { label: "Active (24h)", value: data.users.activeToday.toLocaleString("id-ID"), icon: Activity, color: "#059669", bg: "#D1FAE5" },
    { label: "Total Revenue", value: `Rp ${data.revenue.total.toLocaleString("id-ID")}`, icon: Wallet, color: "#DC2626", bg: "#FEE2E2" },
    { label: "Total Orders", value: data.orders.total.toLocaleString("id-ID"), icon: ShoppingBag, color: "#7C3AED", bg: "#EDE9FE" },
    { label: "Enrollments", value: data.enrollments.total.toLocaleString("id-ID"), icon: GraduationCap, color: "#059669", bg: "#D1FAE5" },
    { label: "Top Rating", value: data.topCourses[0] ? data.topCourses[0].rating.toFixed(1) : "-", icon: Trophy, color: "#F59E0B", bg: "#FEF3C7" },
  ];

  return (
    <div className="dash-container flex flex-col gap-6">
      {/* Header */}
      <PageHeader
        breadcrumb={<span className="flex items-center gap-2"><span className="text-text-secondary">Admin</span> <span>/</span> <span className="font-medium text-text-primary">Kesehatan Sistem</span></span>}
        title="Kesehatan Sistem"
        actions={
          <Button
            variant="secondary"
            size="sm"
            onClick={fetchData}
            leftIcon={<RefreshCw size={15} aria-hidden="true" />}
          >
            Refresh Data
          </Button>
        }
      />

      {/* KPI Summary — unified StatCard on the 12-col dash grid */}
      <div className="dash-grid">
        {kpiCards.map((k) => (
          <StatCard
            key={k.label}
            className="col-span-12 sm:col-span-6 xl:col-span-3"
            label={k.label}
            value={k.value}
            icon={k.icon}
            iconColor={k.color}
            iconBg={k.bg}
          />
        ))}
      </div>

      {/* Charts Row 1: Revenue + User Growth — framed layered-white cards with header rule */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="overflow-hidden">
          <div className="flex items-center gap-2 border-b border-solid border-border-default px-6 py-4">
            <TrendingUp size={18} className="text-accent-cyan-strong" aria-hidden="true" />
            <h2 className="text-[15px] font-bold text-text-primary">Tren Revenue (12 Bulan)</h2>
          </div>
          <div className="p-6">
            <LineChart data={data.revenue.chart} valueKey="amount" color="#0077A8" gradientId="revGrad" prefix="Rp " />
          </div>
        </Card>
        <Card className="overflow-hidden">
          <div className="flex items-center gap-2 border-b border-solid border-border-default px-6 py-4">
            <Users size={18} className="text-accent-purple" aria-hidden="true" />
            <h2 className="text-[15px] font-bold text-text-primary">Pertumbuhan User (12 Bulan)</h2>
          </div>
          <div className="p-6">
            <BarChart data={data.users.chart} valueKey="count" color="#7C3AED" />
          </div>
        </Card>
      </div>

      {/* Charts Row 2: Enrollment + Order Distribution */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="overflow-hidden">
          <div className="flex items-center gap-2 border-b border-solid border-border-default px-6 py-4">
            <GraduationCap size={18} className="text-green-600" aria-hidden="true" />
            <h2 className="text-[15px] font-bold text-text-primary">Tren Enrollment (12 Bulan)</h2>
          </div>
          <div className="p-6">
            <LineChart data={data.enrollments.chart} valueKey="count" color="#059669" gradientId="enrGrad" />
          </div>
        </Card>
        <Card className="overflow-hidden">
          <div className="flex items-center gap-2 border-b border-solid border-border-default px-6 py-4">
            <PieChart size={18} className="text-accent-cyan-strong" aria-hidden="true" />
            <h2 className="text-[15px] font-bold text-text-primary">Distribusi Status Order</h2>
          </div>
          <div className="p-6">
            <DonutChart data={data.orders.distribution} />
          </div>
        </Card>
      </div>

      {/* Top Courses */}
      <Card className="overflow-hidden">
        <div className="flex items-center gap-2 border-b border-solid border-border-default px-6 py-4">
          <Trophy size={18} className="text-amber-500" aria-hidden="true" />
          <h2 className="text-[15px] font-bold text-text-primary">Top 5 Kursus Terpopuler</h2>
        </div>
        <div className="p-6">
          <HorizontalBarChart data={data.topCourses} />
        </div>
      </Card>

      {/* Database Overview */}
      <Card className="overflow-hidden">
        <div className="flex items-center gap-2 border-b border-solid border-border-default px-6 py-4">
          <Database size={18} className="text-accent-cyan-strong" aria-hidden="true" />
          <h2 className="text-[15px] font-bold text-text-primary">Database Overview</h2>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-[repeat(auto-fill,minmax(120px,1fr))] gap-3">
            {Object.entries(data.dbOverview).map(([key, count]) => {
              const meta = DB_LABELS[key] ?? { label: key, icon: Database, color: "#6B7280" };
              const Icon = meta.icon;
              return (
                <div key={key} className="rounded-xl border border-solid border-border-default bg-surface-card p-4 text-center transition-all hover:-translate-y-0.5 hover:border-border-strong hover:shadow-e1">
                  <Icon size={22} className="mx-auto mb-2" style={{ color: meta.color }} aria-hidden="true" />
                  <div className="text-xl font-extrabold" style={{ color: meta.color }}>{count.toLocaleString("id-ID")}</div>
                  <div className="mt-0.5 text-[10px] font-semibold uppercase tracking-wide text-text-muted">{meta.label}</div>
                </div>
              );
            })}
          </div>
        </div>
      </Card>

      {/* ─── Chart-internal styles (SVG/CSS primitives used by the chart
             components above — page shell now uses the UI kit + tokens) ──── */}
      <style jsx global>{`
        /* SVG Charts */
        .sh-svg { width: 100%; height: auto; }
        .sh-tick { font-size: 9px; fill: #6E6E73; font-family: 'Inter', sans-serif; }
        .sh-empty { text-align: center; color: #9CA3AF; padding: 40px 0; font-size: 13px; }

        /* Donut */
        .sh-donut-wrap { display: flex; align-items: center; gap: 24px; justify-content: center; flex-wrap: wrap; }
        .sh-donut-total { font-size: 22px; font-weight: 800; fill: #1D1D1F; font-family: 'Inter', sans-serif; }
        .sh-donut-label { font-size: 10px; fill: #9CA3AF; font-family: 'Inter', sans-serif; }
        .sh-legend { display: flex; flex-direction: column; gap: 8px; }
        .sh-legend-item { display: flex; align-items: center; gap: 8px; font-size: 13px; }
        .sh-legend-dot { width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0; }
        .sh-legend-text { color: #374151; min-width: 80px; }
        .sh-legend-count { font-weight: 700; color: #1D1D1F; }

        /* Horizontal bar chart */
        .sh-hbar-list { display: flex; flex-direction: column; gap: 12px; }
        .sh-hbar-row { display: flex; align-items: center; gap: 12px; }
        .sh-hbar-rank { width: 28px; height: 28px; border-radius: 8px; background: #F0F2F5; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 700; color: #6E6E73; flex-shrink: 0; }
        .sh-hbar-info { flex: 1; min-width: 0; }
        .sh-hbar-title { font-size: 13px; font-weight: 600; color: #1D1D1F; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .sh-hbar-trainer { font-size: 11px; color: #9CA3AF; }
        .sh-hbar-bar-wrap { width: 200px; flex-shrink: 0; position: relative; }
        .sh-hbar-bar { height: 22px; border-radius: 6px; background: linear-gradient(100deg, #0077A8 0%, #7C3AED 55%, #CC0052 100%); min-width: 8px; transition: width 0.5s ease; }
        .sh-hbar-val { position: absolute; right: 0; top: 3px; font-size: 11px; font-weight: 600; color: #6E6E73; padding-left: 8px; }
        .sh-hbar-rating { font-size: 12px; color: #F59E0B; font-weight: 600; flex-shrink: 0; width: 60px; text-align: right; }

        /* DB Overview */
        .sh-db-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(120px, 1fr)); gap: 12px; }
        .sh-db-item { text-align: center; padding: 16px 8px; border-radius: 12px; background: #F8FAFC; transition: transform 0.18s; }
        .sh-db-item:hover { transform: translateY(-2px); background: #F0F2F5; }
        .sh-db-icon { font-size: 24px; margin-bottom: 6px; }
        .sh-db-count { font-size: 20px; font-weight: 800; letter-spacing: -0.01em; }
        .sh-db-label { font-size: 10px; color: #9CA3AF; text-transform: uppercase; font-weight: 600; margin-top: 2px; letter-spacing: 0.04em; }
      `}</style>
    </div>
  );
}
