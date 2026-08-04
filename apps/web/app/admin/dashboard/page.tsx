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
import { PageHeader } from "@/components/ui";
import {
  Card,
  Table,
  THead,
  TBody,
  TR,
  TH,
  TD,
  Badge,
  StatCard,
  QuickActionCard,
  EmptyState,
  DashboardLoading,
} from "@/components/ui";
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
        // No `sort` param: GET /api/admin/orders takes none and already orders
        // by createdAt desc. Sending one that the API drops silently is how the
        // "Terpopuler" widget below shipped mis-sorted for so long.
        fetch("/api/admin/orders?limit=6", { headers: h }).then((r) => r.json()),
        // `sort` is a real, enum-validated parameter on GET /api/admin/courses
        // (api/src/modules/admin/courses.ts) — an unknown value now 400s.
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

  // ── Primary KPIs: 4 cards like Student/Trainer dashboard ──
  const PRIMARY_KPIS = stats
    ? [
        { label: "Total Pengguna",    value: stats.totalUsers.toLocaleString("id-ID"),        icon: Users,        accent: "#0077A8", tint: "rgba(0,119,168,0.10)", trend: stats.trends?.totalUsers ?? null },
        { label: "Kursus Aktif",      value: stats.totalCourses.toLocaleString("id-ID"),      icon: BookOpen,     accent: "#7C3AED", tint: "rgba(124,58,237,0.10)", trend: null },
        { label: "Total Pendaftaran", value: stats.totalEnrollments.toLocaleString("id-ID"),  icon: GraduationCap, accent: "#16A34A", tint: "rgba(22,163,74,0.10)", trend: stats.trends?.totalEnrollments ?? null },
        { label: "Total Pendapatan",  value: `Rp ${stats.totalRevenue.toLocaleString("id-ID")}`, icon: Wallet, accent: "#DC2626", tint: "rgba(220,38,38,0.10)", trend: stats.trends?.totalRevenue ?? null },
      ]
    : [];

  // ── Secondary KPIs: smaller inline metrics ──
  const SECONDARY_KPIS = stats
    ? [
        { label: "Omset Retail",    value: `Rp ${stats.retailRevenue.toLocaleString("id-ID")}`, icon: ShoppingBag, accent: "#0077A8", trend: stats.trends?.retailRevenue ?? null },
        { label: "Langganan Aktif", value: stats.activeSubscriptions.toLocaleString("id-ID"), icon: IdCard, accent: "#D97706", trend: stats.trends?.activeSubscriptions ?? null },
        { label: "Tingkat Refund",  value: `${stats.refundRate}%`, icon: Undo2, accent: "#DC2626", trend: null },
        { label: "Rata-rata Rating", value: `${Number.isFinite(stats.avgRating) ? stats.avgRating.toFixed(1) : "0.0"} / 5.0`, icon: Star, accent: "#D97706", trend: null },
      ]
    : [];

  const maxEnrolled = Math.max(...courses.map((c) => c.totalEnrolled), 1);

  if (loading) {
    return (
      <div className="dash-container">
        <DashboardLoading label="Memuat dashboard…" />
      </div>
    );
  }

  return (
    <div className="dash-container flex flex-col gap-8">
      {/* ── Greeting — clean, matching Student/Trainer pattern ── */}
      <section className="space-y-2">
        <div className="mb-2 flex items-center gap-2 text-green-700">
          <span className="h-2 w-2 animate-pulse rounded-full bg-green-600" aria-hidden="true" />
          <span className="text-[11px] font-semibold uppercase tracking-wider">Sistem Online</span>
        </div>
        <h1 className="font-display text-2xl font-extrabold text-text-primary md:text-3xl">{greeting}, Admin 👋</h1>
        <div className="flex items-center gap-2 text-text-secondary">
          <CalendarDays size={18} aria-hidden="true" />
          <span className="text-sm">
            {now.toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" })} • Overview performa akademi hari ini.
          </span>
        </div>
      </section>

      {/* ── 4 Primary KPI Cards — same as Student/Trainer ── */}
      <section className="dash-grid">
        {PRIMARY_KPIS.map(({ label, value, icon: Icon, accent, tint, trend }) => (
          <StatCard
            key={label}
            className="col-span-12 sm:col-span-6 xl:col-span-3"
            label={label}
            value={value}
            icon={Icon}
            iconColor={accent}
            iconBg={tint}
            trend={trend}
          />
        ))}
      </section>

      {/* ── 4 Secondary KPIs — compact inline panel ── */}
      {SECONDARY_KPIS.length > 0 && (
        <Card className="rounded-[var(--radius-card)] p-5">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {SECONDARY_KPIS.map(({ label, value, icon: Icon, accent, trend }) => (
              <div key={label} className="flex items-center gap-3">
                <span
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl"
                  style={{ background: accent + "18", color: accent }}
                >
                  <Icon size={16} />
                </span>
                <div className="min-w-0">
                  <p className="text-xs text-text-muted">{label}</p>
                  <p className="text-sm font-bold text-text-primary">{value}</p>
                  {trend && <p className="text-[10px] font-medium text-green-600">{trend}</p>}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* ── Leads Baru — full-width hero card (moved from cramped sidebar) ── */}
      <div
        className="relative overflow-hidden rounded-[var(--radius-card)] p-6 text-white shadow-e3"
        style={{ background: "linear-gradient(145deg, #16283e 0%, #0c4a5a 55%, #045b66 100%)" }}
      >
        <span className="absolute right-4 top-4 z-10 rounded-full bg-white/15 px-2 py-1 text-[10px] font-bold uppercase tracking-widest text-white/80 backdrop-blur-sm">
          Real-time
        </span>
        <div className="relative z-10 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-white/15 backdrop-blur-sm">
              <Mail size={22} aria-hidden="true" />
            </span>
            <div>
              <h2 className="font-display text-lg font-bold text-white">Leads Baru</h2>
              <p className="mt-0.5 text-xs text-white/75">
                {newLeadsCount === null
                  ? "Memuat…"
                  : newLeadsCount === 0
                  ? "Tidak ada leads baru saat ini"
                  : "Leads baru menunggu follow-up"}
              </p>
            </div>
            <span className="font-display text-4xl font-extrabold leading-none sm:text-5xl">{newLeadsCount ?? "—"}</span>
            <span className="hidden text-[11px] font-semibold uppercase tracking-wider text-white/70 sm:inline">Orang Terdeteksi</span>
          </div>
          <div className="flex items-center gap-3">
            {newLeadsCount !== null && newLeadsCount > 0 && (
              <Link
                href="/admin/leads?status=new"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-5 py-2.5 text-sm font-bold text-accent-cyan-strong shadow-e1 transition hover:bg-white/95"
              >
                Tindak Lanjuti <ArrowRight size={16} aria-hidden="true" />
              </Link>
            )}
            <Link
              href="/admin/leads"
              className={`inline-flex items-center justify-center gap-1 text-xs font-semibold transition hover:text-white ${
                newLeadsCount && newLeadsCount > 0 ? "text-white/80" : "rounded-xl bg-white px-5 py-2.5 text-sm font-bold text-accent-cyan-strong shadow-e1 hover:bg-white/95"
              }`}
            >
              Kelola Leads <ArrowRight size={14} aria-hidden="true" />
            </Link>
          </div>
        </div>
        <div className="pointer-events-none absolute -bottom-12 -right-10 h-36 w-36 rounded-full bg-white/10 blur-3xl" aria-hidden="true" />
      </div>

      {/* ── Transaksi Terbaru + Kursus Terpopuler — 2-col but now more spacious ── */}
      <section className="dash-grid">
        {/* Transaksi Terbaru */}
        <div className="col-span-12 lg:col-span-8">
          <div className="overflow-hidden rounded-[var(--radius-card)] border border-solid border-border-default bg-surface-card shadow-e1">
            <div className="flex items-center justify-between gap-3 border-b border-solid border-border-default px-6 py-5">
              <div>
                <h2 className="font-display text-lg font-bold text-text-primary">Transaksi Terbaru</h2>
                <p className="mt-0.5 text-sm text-text-secondary">Memantau transaksi yang masuk secara berkala.</p>
              </div>
              <Link href="/admin/transaksi" className="inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-accent-cyan-strong hover:underline">
                Semua Pesanan <ArrowRight size={14} aria-hidden="true" />
              </Link>
            </div>

            {orders.length === 0 ? (
              <div className="p-6">
                <EmptyState
                  icon={ShoppingBag}
                  title="Belum ada transaksi"
                  description="Transaksi yang masuk akan muncul di sini."
                />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <THead>
                    <TR className="hover:bg-surface-sunken">
                      <TH>Pembeli</TH>
                      <TH>Kursus</TH>
                      <TH className="text-center">Status</TH>
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
                            <div className="flex items-center gap-3">
                              <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-brand-gradient text-xs font-extrabold text-white">
                                {order.user.name.slice(0, 2).toUpperCase()}
                              </span>
                              <div className="min-w-0">
                                <p className="truncate text-sm font-semibold text-text-primary">{order.user.name}</p>
                                <p className="mt-0.5 truncate text-xs text-text-secondary">{order.user.email}</p>
                              </div>
                            </div>
                          </TD>
                          <TD>
                            <p className="max-w-[220px] truncate text-sm text-text-primary">{title}</p>
                            <p className="mt-0.5 text-xs text-text-muted">
                              {new Date(order.createdAt).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}
                            </p>
                          </TD>
                          <TD className="text-center">
                            <Badge variant={variant} className="uppercase tracking-wide">{order.status}</Badge>
                          </TD>
                          <TD className="whitespace-nowrap text-right text-sm font-bold text-text-primary">
                            Rp {Number(order.finalAmount).toLocaleString("id-ID")}
                          </TD>
                        </TR>
                      );
                    })}
                  </TBody>
                </Table>
              </div>
            )}
          </div>
        </div>

        {/* Kursus Terpopuler */}
        <div className="col-span-12 lg:col-span-4">
          <Card className="h-full p-6">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="flex items-center gap-2 font-display text-base font-bold text-text-primary">
                <TrendingUp size={18} className="text-accent-purple" aria-hidden="true" /> Kursus Terpopuler
              </h2>
              <Link href="/admin/kursus" className="inline-flex items-center gap-1 text-xs font-semibold text-accent-cyan-strong hover:underline">
                Kelola <ChevronRight size={14} aria-hidden="true" />
              </Link>
            </div>
            {courses.length === 0 ? (
              <EmptyState icon={BookOpen} title="Belum ada kursus" />
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
      </section>

      {/* ── Akses Cepat / Quick Actions — col-span-4 = 3 per row, even grid ── */}
      <section className="flex flex-col gap-4">
        <h2 className="font-display text-lg font-bold text-text-primary">Akses Cepat</h2>
        <div className="dash-grid">
          {QUICK_ACTIONS.map(({ href, label, icon: Icon, desc }) => (
            <QuickActionCard
              key={href}
              className="col-span-6 sm:col-span-4 xl:col-span-4"
              href={href}
              label={label}
              icon={Icon}
              description={desc}
            />
          ))}
        </div>
      </section>
    </div>
  );
}
