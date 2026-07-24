"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Users,
  BookOpen,
  GraduationCap,
  Wallet,
  ShoppingBag,
  IdCard,
  Undo2,
  Star,
  TrendingUp,
  TrendingDown,
  Mail,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  ClipboardList,
  BarChart3,
  Tag,
  CalendarDays,
  Newspaper,
  Building2,
  type LucideIcon,
} from "lucide-react";
import { Card, Table, TableContainer, THead, TBody, TR, TH, TD, Badge } from "@/components/ui";
import { cn } from "@/lib/utils";
import { getValidToken } from "@/lib/auth/token";

type Stats = {
  totalUsers: number;
  totalCourses: number;
  totalEnrollments: number;
  totalRevenue: number;
  pendingCourses: number;
  activeSubscriptions: number;
  refundRate: number;
  avgRating: number;
  retailRevenue: number;
};

type RecentOrder = {
  id: string;
  finalAmount: number;
  status: string;
  createdAt: string;
  user: { name: string; email: string };
  items: { itemTitle: string | null; itemType: string }[];
};

type PopularCourse = {
  id: string;
  title: string;
  totalEnrolled: number;
  avgRating: string;
  price: string;
  trainer: { name: string };
};

// Maps an order status to a Badge variant. The raw status string is still the
// displayed label; only the pill styling is derived here.
const STATUS_VARIANT: Record<string, "success" | "warning" | "danger" | "neutral"> = {
  paid: "success",
  pending: "warning",
  failed: "danger",
  expired: "neutral",
};

const QUICK_ACTIONS: { href: string; label: string; icon: LucideIcon; desc: string }[] = [
  { href: "/admin/pengguna",  label: "Manajemen Pengguna", icon: Users,        desc: "Kelola akun & role" },
  { href: "/admin/kursus",    label: "Approval Kursus",    icon: CheckCircle2,  desc: "Review kursus baru" },
  { href: "/admin/leads",     label: "Leads CRM",          icon: ClipboardList, desc: "Follow-up prospek" },
  { href: "/admin/transaksi", label: "Laporan Keuangan",   icon: BarChart3,     desc: "Export & analisis" },
  { href: "/admin/kupon",     label: "Buat Kupon",         icon: Tag,           desc: "Diskon & promo" },
  { href: "/admin/event",     label: "Kelola Event",       icon: CalendarDays,  desc: "Seminar & workshop" },
  { href: "/admin/blog",      label: "Konten Blog",        icon: Newspaper,     desc: "Artikel & SEO" },
  { href: "/admin/review",    label: "Moderasi Review",    icon: Star,          desc: "Approve ulasan" },
  { href: "/admin/lms",       label: "LMS B2B",            icon: Building2,      desc: "Tenant & lisensi" },
];

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [orders, setOrders] = useState<RecentOrder[]>([]);
  const [courses, setCourses] = useState<PopularCourse[]>([]);
  const [loading, setLoading] = useState(true);
  const [newLeadsCount, setNewLeadsCount] = useState<number | null>(null);
  const [now] = useState(new Date());

  const greeting = now.getHours() < 12 ? "Selamat Pagi" : now.getHours() < 17 ? "Selamat Siang" : "Selamat Malam";

  useEffect(() => {
    (async () => {
      const token = await getValidToken();
      if (!token) {
        setLoading(false);
        return;
      }
      const h = { Authorization: `Bearer ${token}` };

      Promise.all([
        fetch("/api/admin/stats", { headers: h }).then((r) => r.json()),
        fetch("/api/admin/orders?limit=6&sort=createdAt:desc", { headers: h }).then((r) => r.json()),
        fetch("/api/admin/courses?limit=5&sort=totalEnrolled:desc", { headers: h }).then((r) => r.json()),
        fetch("/api/admin/leads?status=new&limit=1", { headers: h }).then((r) => r.json()),
      ])
        .then(([s, o, c, l]) => {
          if (s.success) setStats(s.data);
          if (o.success) setOrders(Array.isArray(o.data) ? o.data : []);
          // GET /api/admin/courses returns a paginated object ({ courses, total,
          // page, limit }) since the trainer-approval change — not a bare array.
          if (c.success) setCourses(c.data?.courses ?? (Array.isArray(c.data) ? c.data : []));
          if (l.success) setNewLeadsCount(l.meta?.total ?? 0);
        })
        .finally(() => setLoading(false));
    })();
  }, []);

  const KPI_CARDS = stats
    ? [
        { label: "Total Pengguna",     value: stats.totalUsers,          icon: Users,        color: "#0077A8", bg: "#E8F4F9", change: "+12%" },
        { label: "Kursus Aktif",       value: stats.totalCourses,        icon: BookOpen,     color: "#7C3AED", bg: "#EDE9FE", change: "+3%" },
        { label: "Total Pendaftaran",  value: stats.totalEnrollments,    icon: GraduationCap, color: "#059669", bg: "#D1FAE5", change: "+8%" },
        { label: "Total Pendapatan",   value: null, revenue: stats.totalRevenue, icon: Wallet, color: "#DC2626", bg: "#FEE2E2", change: "+22%" },
        { label: "Omset Retail",       value: null, revenue: stats.retailRevenue, icon: ShoppingBag, color: "#059669", bg: "#D1FAE5", change: "+15%" },
        { label: "Langganan Aktif",    value: stats.activeSubscriptions, icon: IdCard, color: "#F59E0B", bg: "#FEF3C7", change: "+5%" },
        { label: "Tingkat Refund",     value: null, numValue: stats.refundRate, labelSuffix: "%", icon: Undo2, color: "#DC2626", bg: "#FEE2E2", change: "-1%" },
        { label: "Rata-rata Rating",   value: null, numValue: stats.avgRating, labelSuffix: " / 5.0", icon: Star, color: "#F59E0B", bg: "#FEF3C7", change: "+0.1" },
      ]
    : [];

  const maxEnrolled = Math.max(...courses.map((c) => c.totalEnrolled), 1);

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <span className="h-9 w-9 animate-spin rounded-full border-[3px] border-accent-cyan-strong border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="flex max-w-[1200px] flex-col gap-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <span className="mb-1.5 inline-flex items-center gap-1.5 rounded-full bg-green-600/10 px-2.5 py-0.5 text-[11px] font-semibold text-green-700">
            <span className="h-1.5 w-1.5 rounded-full bg-green-600" aria-hidden="true" /> Sistem Online
          </span>
          <h1 className="text-[22px] font-extrabold text-text-primary">{greeting}, Admin 👋</h1>
          <p className="mt-1 text-[13px] text-text-secondary">
            {now.toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
          </p>
        </div>
        <div className="flex gap-2.5">
          <Link href="/admin/kursus" className="btn btn-outline btn-sm">+ Tambah Kursus</Link>
          <Link href="/admin/pengguna" className="btn btn-primary btn-sm">Kelola Pengguna</Link>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-3.5 lg:grid-cols-4">
        {KPI_CARDS.map(({ label, value, revenue, numValue, labelSuffix, icon: Icon, color, bg, change }) => {
          const isNeg = change.startsWith("-");
          const Trend = isNeg ? TrendingDown : TrendingUp;
          return (
            <Card key={label} hoverable className="p-5">
              <div className="mb-3 flex items-start justify-between">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl" style={{ background: bg }}>
                  <Icon size={18} style={{ color }} aria-hidden="true" />
                </span>
                <span
                  className={cn(
                    "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold",
                    isNeg ? "bg-red-600/10 text-red-700" : "bg-green-600/10 text-green-700",
                  )}
                >
                  <Trend size={13} aria-hidden="true" /> {change}
                </span>
              </div>
              <p className="text-[22px] font-extrabold leading-none" style={{ color }}>
                {revenue !== undefined && revenue !== null
                  ? `Rp ${revenue.toLocaleString("id-ID")}`
                  : numValue !== undefined && numValue !== null
                  ? `${numValue}${labelSuffix ?? ""}`
                  : (value ?? 0).toLocaleString("id-ID")}
              </p>
              <p className="mt-1.5 text-[11px] font-semibold uppercase tracking-wide text-text-secondary">{label}</p>
            </Card>
          );
        })}
      </div>

      {/* Bento: leads + popular courses (left) · recent orders table (right) */}
      <div className="grid gap-5 lg:grid-cols-3">
        {/* Left column */}
        <div className="flex flex-col gap-5 lg:col-span-1">
          {/* Leads gradient card */}
          <div className="relative overflow-hidden rounded-[var(--radius-lg)] bg-brand-gradient p-5 text-white shadow-e3">
            <div className="mb-4 flex items-center justify-between">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20">
                <Mail size={20} aria-hidden="true" />
              </span>
              <span className="rounded-full bg-white/20 px-3 py-1 text-[11px] font-semibold backdrop-blur-sm">Real-time</span>
            </div>
            <h2 className="text-lg font-extrabold text-white">Leads Baru</h2>
            <p className="mt-1 text-[13px] text-white/80">
              {newLeadsCount === null
                ? "Memuat…"
                : newLeadsCount === 0
                ? "Tidak ada leads baru saat ini"
                : "Leads baru menunggu follow-up"}
            </p>
            <p className="my-3 text-4xl font-extrabold leading-none">{newLeadsCount ?? "—"}</p>
            <div className="flex flex-col gap-2">
              {newLeadsCount !== null && newLeadsCount > 0 ? (
                <>
                  <Link
                    href="/admin/leads?status=new"
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-white px-4 py-3 text-sm font-bold text-accent-cyan-strong transition hover:bg-white/90"
                  >
                    Tindak Lanjuti <ArrowRight size={16} aria-hidden="true" />
                  </Link>
                  <Link
                    href="/admin/leads"
                    className="flex items-center justify-center gap-1 text-[13px] font-semibold text-white/90 transition hover:text-white"
                  >
                    Kelola Leads <ArrowRight size={14} aria-hidden="true" />
                  </Link>
                </>
              ) : (
                <Link
                  href="/admin/leads"
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-white px-4 py-3 text-sm font-bold text-accent-cyan-strong transition hover:bg-white/90"
                >
                  Kelola Leads <ArrowRight size={16} aria-hidden="true" />
                </Link>
              )}
            </div>
          </div>

          {/* Popular courses */}
          <Card className="p-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="flex items-center gap-2 text-sm font-bold text-text-primary">
                <TrendingUp size={18} className="text-accent-purple" aria-hidden="true" /> Kursus Terpopuler
              </h2>
              <Link href="/admin/kursus" className="text-xs font-semibold text-accent-cyan-strong hover:underline">
                Kelola →
              </Link>
            </div>
            {courses.length === 0 ? (
              <p className="py-6 text-center text-sm text-text-muted">Belum ada kursus.</p>
            ) : (
              <div className="flex flex-col gap-4">
                {courses.map((course, i) => {
                  const pct = Math.max((course.totalEnrolled / maxEnrolled) * 100, 4);
                  return (
                    <div key={course.id} className="flex items-center gap-3">
                      <span className="w-5 flex-shrink-0 text-center text-sm font-extrabold text-border-strong">#{i + 1}</span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[13px] font-semibold text-text-primary">{course.title}</p>
                        <p className="text-[11px] text-text-secondary">{course.trainer.name}</p>
                        <div className="mt-1.5 flex items-center gap-2">
                          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-sunken">
                            <div className="h-full rounded-full bg-brand-gradient" style={{ width: `${pct}%` }} />
                          </div>
                          <span className="flex flex-shrink-0 items-center gap-1 text-[11px] text-text-secondary">
                            <GraduationCap size={12} aria-hidden="true" /> {course.totalEnrolled}
                          </span>
                        </div>
                      </div>
                      <span className="flex flex-shrink-0 items-center gap-1 text-[11px] font-semibold text-amber-600">
                        <Star size={12} className="fill-amber-500 text-amber-500" aria-hidden="true" />
                        {parseFloat(course.avgRating).toFixed(1)}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        </div>

        {/* Right column — recent orders table */}
        <div className="lg:col-span-2">
          <TableContainer>
            <div className="flex items-center justify-between border-b border-solid border-border-default px-6 py-5">
              <div>
                <h2 className="text-base font-bold text-text-primary">Transaksi Terbaru</h2>
                <p className="mt-0.5 text-xs text-text-secondary">Memantau transaksi yang masuk secara berkala.</p>
              </div>
              <Link href="/admin/transaksi" className="whitespace-nowrap text-xs font-semibold text-accent-cyan-strong hover:underline">
                Semua Pesanan →
              </Link>
            </div>

            {orders.length === 0 ? (
              <p className="py-10 text-center text-sm text-text-muted">Belum ada transaksi.</p>
            ) : (
              <>
                <Table>
                  <THead>
                    <TR className="hover:bg-transparent">
                      <TH>Pembeli</TH>
                      <TH>Kursus</TH>
                      <TH>Tanggal</TH>
                      <TH>Status</TH>
                      <TH className="text-right">Total</TH>
                    </TR>
                  </THead>
                  <TBody>
                    {orders.map((order) => {
                      const title = order.items[0]?.itemTitle ?? "—";
                      const variant = STATUS_VARIANT[order.status] ?? "neutral";
                      return (
                        <TR key={order.id}>
                          <TD>
                            <div className="flex items-center gap-2.5">
                              <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-brand-gradient text-[11px] font-extrabold text-white">
                                {order.user.name.slice(0, 2).toUpperCase()}
                              </span>
                              <div className="min-w-0">
                                <p className="truncate text-[13px] font-semibold text-text-primary">{order.user.name}</p>
                                <p className="truncate text-[11px] text-text-secondary">{order.user.email}</p>
                              </div>
                            </div>
                          </TD>
                          <TD className="text-[13px] text-text-primary">{title}</TD>
                          <TD className="whitespace-nowrap text-[13px] text-text-secondary">
                            {new Date(order.createdAt).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}
                          </TD>
                          <TD>
                            <Badge variant={variant}>{order.status}</Badge>
                          </TD>
                          <TD className="whitespace-nowrap text-right text-[13px] font-bold text-text-primary">
                            Rp {Number(order.finalAmount).toLocaleString("id-ID")}
                          </TD>
                        </TR>
                      );
                    })}
                  </TBody>
                </Table>

                {/* Pagination (recent orders are a single page) */}
                <div className="flex justify-center border-t border-solid border-border-default px-6 py-4">
                  <nav aria-label="Paginasi" className="flex items-center gap-1">
                    <span className="flex h-9 w-9 items-center justify-center rounded-lg border border-solid border-border-default text-border-strong opacity-50">
                      <ChevronLeft size={18} aria-hidden="true" />
                    </span>
                    <span className="flex h-9 min-w-9 items-center justify-center rounded-lg bg-accent-cyan-strong px-2 text-sm font-semibold text-white">1</span>
                    <span className="flex h-9 w-9 items-center justify-center rounded-lg border border-solid border-border-default text-border-strong opacity-50">
                      <ChevronRight size={18} aria-hidden="true" />
                    </span>
                  </nav>
                </div>
              </>
            )}
          </TableContainer>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {QUICK_ACTIONS.map(({ href, label, icon: Icon, desc }) => (
          <Link
            key={href}
            href={href}
            className="group flex items-center gap-3 rounded-2xl border border-solid border-border-default bg-surface-card p-3.5 shadow-e1 transition hover:-translate-y-0.5 hover:border-accent-cyan-strong hover:shadow-e2"
          >
            <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-surface-accent-soft text-accent-cyan-strong">
              <Icon size={18} aria-hidden="true" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold text-text-primary">{label}</p>
              <p className="truncate text-[10px] text-text-muted">{desc}</p>
            </div>
            <ChevronRight size={14} className="flex-shrink-0 text-border-strong" aria-hidden="true" />
          </Link>
        ))}
      </div>
    </div>
  );
}
