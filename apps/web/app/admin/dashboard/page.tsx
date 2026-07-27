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
  trends?: {
    totalUsers: string | null;
    totalEnrollments: string | null;
    totalRevenue: string | null;
    retailRevenue: string | null;
    activeSubscriptions: string | null;
  };
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

const STATUS_VARIANT: Record<string, "success" | "warning" | "danger" | "neutral"> = {
  paid: "success",
  pending: "warning",
  failed: "danger",
  expired: "neutral",
};

const QUICK_ACTIONS: { href: string; label: string; icon: LucideIcon; desc: string }[] = [
  { href: "/admin/pengguna",  label: "Pengguna",     icon: Users,        desc: "Kelola akun & role" },
  { href: "/admin/kursus",    label: "Approval",     icon: CheckCircle2,  desc: "Review kursus baru" },
  { href: "/admin/leads",     label: "Leads CRM",    icon: ClipboardList, desc: "Follow-up prospek" },
  { href: "/admin/transaksi", label: "Keuangan",     icon: BarChart3,     desc: "Export & analisis" },
  { href: "/admin/kupon",     label: "Buat Kupon",   icon: Tag,           desc: "Diskon & promo" },
  { href: "/admin/event",     label: "Kelola Event", icon: CalendarDays,  desc: "Seminar & workshop" },
  { href: "/admin/blog",      label: "Konten Blog",  icon: Newspaper,     desc: "Artikel & SEO" },
  { href: "/admin/review",    label: "Moderasi",     icon: Star,          desc: "Approve ulasan" },
  { href: "/admin/lms",       label: "LMS B2B",      icon: Building2,     desc: "Tenant & lisensi" },
];

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [orders, setOrders] = useState<RecentOrder[]>([]);
  const [courses, setCourses] = useState<PopularCourse[]>([]);
  const [loading, setLoading] = useState(true);
  const [newLeadsCount, setNewLeadsCount] = useState<number | null>(null);
  const [now] = useState(new Date());

  const greeting = now.getHours() < 11 ? "Selamat Pagi" : now.getHours() < 15 ? "Selamat Siang" : now.getHours() < 18 ? "Selamat Sore" : "Selamat Malam";

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
          if (c.success) setCourses(c.data?.courses ?? (Array.isArray(c.data) ? c.data : []));
          if (l.success) setNewLeadsCount(l.meta?.total ?? 0);
        })
        .finally(() => setLoading(false));
    })();
  }, []);

  const KPI_CARDS = stats
    ? [
        { label: "Total Pengguna",    value: stats.totalUsers.toLocaleString("id-ID"),        icon: Users,        accent: "#0077A8", tint: "rgba(0,119,168,0.10)", trend: stats.trends?.totalUsers ?? null },
        { label: "Kursus Aktif",      value: stats.totalCourses.toLocaleString("id-ID"),      icon: BookOpen,     accent: "#7C3AED", tint: "rgba(124,58,237,0.10)", trend: null },
        { label: "Total Pendaftaran", value: stats.totalEnrollments.toLocaleString("id-ID"),  icon: GraduationCap, accent: "#16A34A", tint: "rgba(22,163,74,0.10)", trend: stats.trends?.totalEnrollments ?? null },
        { label: "Total Pendapatan",  value: `Rp ${stats.totalRevenue.toLocaleString("id-ID")}`, icon: Wallet, accent: "#DC2626", tint: "rgba(220,38,38,0.10)", trend: stats.trends?.totalRevenue ?? null },
        { label: "Omset Retail",      value: `Rp ${stats.retailRevenue.toLocaleString("id-ID")}`, icon: ShoppingBag, accent: "#0077A8", tint: "rgba(0,119,168,0.10)", trend: stats.trends?.retailRevenue ?? null },
        { label: "Langganan Aktif",   value: stats.activeSubscriptions.toLocaleString("id-ID"), icon: IdCard, accent: "#D97706", tint: "rgba(217,119,6,0.10)", trend: stats.trends?.activeSubscriptions ?? null },
        { label: "Tingkat Refund",    value: `${stats.refundRate}%`, icon: Undo2, accent: "#DC2626", tint: "rgba(220,38,38,0.10)", trend: null },
        { label: "Rata-rata Rating",  value: `${Number.isFinite(stats.avgRating) ? stats.avgRating.toFixed(1) : "0.0"} / 5.0`, icon: Star, accent: "#D97706", tint: "rgba(217,119,6,0.10)", trend: null },
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
    <div className="mx-auto flex w-full max-w-[1200px] flex-col gap-8">
      {/* ── Greeting & Top Header ── */}
      <section className="flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-green-600/10 px-2.5 py-0.5 text-[11px] font-semibold text-green-700">
              <span className="h-1.5 w-1.5 rounded-full bg-green-600" aria-hidden="true" /> Sistem Online
            </span>
          </div>
          <h1 className="font-display text-3xl font-bold text-text-primary md:text-4xl">{greeting}, Admin! 👋</h1>
          <div className="flex items-center gap-2 text-text-secondary">
            <CalendarDays size={18} aria-hidden="true" />
            <span className="text-base">
              {now.toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/admin/kursus"
            className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-solid border-border-default bg-surface-card px-4 py-2.5 text-sm font-semibold text-text-primary shadow-e1 transition-all hover:border-accent-cyan-strong hover:shadow-e2"
          >
            + Tambah Kursus
          </Link>
          <Link
            href="/admin/pengguna"
            className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-brand-gradient px-4 py-2.5 text-sm font-semibold text-white shadow-e1 transition-opacity hover:opacity-90"
          >
            Kelola Pengguna
          </Link>
        </div>
      </section>

      {/* ── 8 KPI Cards (Matching Member Dashboard styling) ── */}
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {KPI_CARDS.map(({ label, value, icon: Icon, accent, tint, trend }) => {
          const negative = typeof trend === "string" && trend.trim().startsWith("-");
          const Trend = negative ? TrendingDown : TrendingUp;
          return (
            <div
              key={label}
              className="relative flex items-center gap-4 rounded-[var(--radius-lg)] border border-solid border-border-default bg-surface-card p-5 shadow-e1 transition-all hover:-translate-y-0.5 hover:shadow-e2"
              style={{ borderLeftWidth: 4, borderLeftColor: accent }}
            >
              <div
                className="flex size-12 shrink-0 items-center justify-center rounded-full"
                style={{ backgroundColor: tint, color: accent }}
              >
                <Icon size={22} aria-hidden="true" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-text-secondary">{label}</p>
                <p className="font-display text-2xl lg:text-3xl font-bold leading-tight text-text-primary truncate">{value}</p>
              </div>
              {trend ? (
                <span
                  className={`absolute right-3 top-3 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${
                    negative ? "bg-red-50 text-red-600" : "bg-green-50 text-green-700"
                  }`}
                >
                  <Trend size={12} aria-hidden="true" />
                  {trend}
                </span>
              ) : null}
            </div>
          );
        })}
      </section>

      {/* ── Quick Access / Akses Cepat Section (Identical format to Member Dashboard) ── */}
      <section className="space-y-4">
        <h2 className="font-display text-xl font-bold text-text-primary">Akses Cepat</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {QUICK_ACTIONS.map(({ href, label, icon: Icon, desc }) => (
            <Link
              key={href}
              href={href}
              className="group flex flex-col items-center gap-2 rounded-[var(--radius-lg)] border border-solid border-border-default bg-surface-card p-4 text-center shadow-e1 transition-all hover:-translate-y-0.5 hover:border-accent-cyan-strong hover:shadow-e2"
            >
              <span className="flex size-11 items-center justify-center rounded-full bg-surface-accent-soft text-accent-cyan-strong transition-colors group-hover:bg-accent-cyan-strong group-hover:text-white">
                <Icon size={20} aria-hidden="true" />
              </span>
              <span className="text-xs font-semibold text-text-primary">{label}</span>
              <span className="text-[10px] text-text-muted">{desc}</span>
            </Link>
          ))}
        </div>
      </section>

      {/* ── Bento Grid: Leads & Popular Courses (Left) | Recent Orders Table (Right) ── */}
      <section className="grid gap-6 lg:grid-cols-3">
        {/* Left Column */}
        <div className="flex flex-col gap-6 lg:col-span-1">
          {/* Leads Gradient Card */}
          <div className="relative overflow-hidden rounded-[var(--radius-lg)] bg-brand-gradient p-6 text-white shadow-e3">
            <div className="mb-4 flex items-center justify-between">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm">
                <Mail size={20} aria-hidden="true" />
              </span>
              <span className="rounded-full bg-white/20 px-3 py-1 text-[11px] font-semibold backdrop-blur-sm">Real-time</span>
            </div>
            <h2 className="font-display text-lg font-bold text-white">Leads Baru</h2>
            <p className="mt-1 text-xs text-white/80">
              {newLeadsCount === null
                ? "Memuat…"
                : newLeadsCount === 0
                ? "Tidak ada leads baru saat ini"
                : "Leads baru menunggu follow-up"}
            </p>
            <p className="my-4 font-display text-4xl font-extrabold leading-none">{newLeadsCount ?? "—"}</p>
            <div className="flex flex-col gap-2">
              {newLeadsCount !== null && newLeadsCount > 0 ? (
                <>
                  <Link
                    href="/admin/leads?status=new"
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-bold text-accent-cyan-strong shadow-e1 transition hover:bg-white/95"
                  >
                    Tindak Lanjuti <ArrowRight size={16} aria-hidden="true" />
                  </Link>
                  <Link
                    href="/admin/leads"
                    className="flex items-center justify-center gap-1 text-xs font-semibold text-white/90 transition hover:text-white"
                  >
                    Kelola Leads <ArrowRight size={14} aria-hidden="true" />
                  </Link>
                </>
              ) : (
                <Link
                  href="/admin/leads"
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-bold text-accent-cyan-strong shadow-e1 transition hover:bg-white/95"
                >
                  Kelola Leads <ArrowRight size={16} aria-hidden="true" />
                </Link>
              )}
            </div>
          </div>

          {/* Popular Courses */}
          <Card className="p-6">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="flex items-center gap-2 font-display text-base font-bold text-text-primary">
                <TrendingUp size={18} className="text-accent-purple" aria-hidden="true" /> Kursus Terpopuler
              </h2>
              <Link href="/admin/kursus" className="inline-flex items-center gap-1 text-xs font-semibold text-accent-cyan-strong hover:underline">
                Kelola <ChevronRight size={14} aria-hidden="true" />
              </Link>
            </div>
            {courses.length === 0 ? (
              <p className="py-6 text-center text-sm text-text-muted">Belum ada kursus.</p>
            ) : (
              <div className="flex flex-col gap-4">
                {courses.map((course, i) => {
                  const pct = Math.max((course.totalEnrolled / maxEnrolled) * 100, 4);
                  return (
                    <div key={course.id} className="flex items-start gap-3">
                      <span className="mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-lg bg-surface-sunken text-xs font-bold text-text-secondary">
                        #{i + 1}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-text-primary">{course.title}</p>
                        <p className="mt-0.5 truncate text-xs text-text-secondary">{course.trainer?.name ?? "Trainer Jago"}</p>
                        <div className="mt-2 flex items-center gap-2">
                          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-sunken">
                            <div className="h-full rounded-full bg-brand-gradient" style={{ width: `${pct}%` }} />
                          </div>
                          <span className="flex flex-shrink-0 items-center gap-1 text-[11px] font-medium text-text-secondary">
                            <GraduationCap size={12} aria-hidden="true" /> {course.totalEnrolled}
                          </span>
                        </div>
                      </div>
                      <span className="mt-0.5 flex flex-shrink-0 items-center gap-1 text-xs font-semibold text-amber-600">
                        <Star size={12} className="fill-amber-400 text-amber-400" aria-hidden="true" />
                        {Number.isFinite(parseFloat(course.avgRating)) ? parseFloat(course.avgRating).toFixed(1) : "0.0"}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        </div>

        {/* Right Column — Recent Orders Table */}
        <div className="lg:col-span-2">
          <div className="rounded-[var(--radius-lg)] border border-solid border-border-default bg-surface-card shadow-e1 overflow-hidden">
            <div className="flex items-center justify-between border-b border-solid border-border-default px-6 py-4 bg-surface-card">
              <div>
                <h2 className="font-display text-base font-bold text-text-primary">Transaksi Terbaru</h2>
                <p className="mt-0.5 text-xs text-text-secondary">Memantau transaksi yang masuk secara berkala.</p>
              </div>
              <Link href="/admin/transaksi" className="inline-flex items-center gap-1 text-xs font-semibold text-accent-cyan-strong hover:underline">
                Semua Pesanan <ChevronRight size={14} aria-hidden="true" />
              </Link>
            </div>

            {orders.length === 0 ? (
              <p className="py-10 text-center text-sm text-text-muted">Belum ada transaksi.</p>
            ) : (
              <TableContainer className="rounded-none border-0 shadow-none">
                <Table>
                  <THead>
                    <TR className="bg-surface-sunken hover:bg-surface-sunken">
                      <TH className="text-xs font-bold text-text-secondary uppercase tracking-wider">Pembeli</TH>
                      <TH className="text-xs font-bold text-text-secondary uppercase tracking-wider">Kursus</TH>
                      <TH className="text-xs font-bold text-text-secondary uppercase tracking-wider">Tanggal</TH>
                      <TH className="text-xs font-bold text-text-secondary uppercase tracking-wider">Status</TH>
                      <TH className="text-right text-xs font-bold text-text-secondary uppercase tracking-wider">Total</TH>
                    </TR>
                  </THead>
                  <TBody>
                    {orders.map((order) => {
                      const title = order.items[0]?.itemTitle ?? "—";
                      const variant = STATUS_VARIANT[order.status] ?? "neutral";
                      return (
                        <TR key={order.id} className="transition-colors hover:bg-surface-sunken/60">
                          <TD>
                            <div className="flex items-center gap-3">
                              <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-brand-gradient text-xs font-extrabold text-white shadow-sm">
                                {order.user.name.slice(0, 2).toUpperCase()}
                              </span>
                              <div className="min-w-0">
                                <p className="truncate text-sm font-semibold text-text-primary">{order.user.name}</p>
                                <p className="mt-0.5 truncate text-xs text-text-secondary">{order.user.email}</p>
                              </div>
                            </div>
                          </TD>
                          <TD className="text-sm text-text-primary">
                            <p className="max-w-[200px] truncate">{title}</p>
                          </TD>
                          <TD className="whitespace-nowrap text-sm text-text-secondary">
                            {new Date(order.createdAt).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}
                          </TD>
                          <TD>
                            <Badge variant={variant}>{order.status}</Badge>
                          </TD>
                          <TD className="whitespace-nowrap text-right text-sm font-bold text-text-primary">
                            Rp {Number(order.finalAmount).toLocaleString("id-ID")}
                          </TD>
                        </TR>
                      );
                    })}
                  </TBody>
                </Table>
              </TableContainer>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}

