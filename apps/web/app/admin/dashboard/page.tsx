"use client";

import { useCallback, useEffect, useRef, useState } from "react";
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
  AlertTriangle,
  type LucideIcon,
} from "lucide-react";
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
import {
  loadPanel,
  parseStats,
  parseOrders,
  parseCourses,
  parseNewLeads,
  type PanelState,
  type Stats,
  type RecentOrder,
  type PopularCourse,
} from "@/lib/admin/dashboardPanels";




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

/** One panel's worth of "we could not load this", with a way to try again. */
function PanelError({ label, onRetry }: { label: string; onRetry: () => void }) {
  return (
    <div
      role="alert"
      className="flex flex-col items-center gap-3 rounded-[var(--radius-card)] border border-dashed border-border-strong bg-surface-card px-6 py-10 text-center"
    >
      <span className="flex h-10 w-10 items-center justify-center rounded-full bg-surface-sunken text-text-secondary">
        <AlertTriangle size={20} aria-hidden="true" />
      </span>
      <div>
        <p className="text-sm font-bold text-text-primary">Gagal memuat {label}</p>
        <p className="mt-1 text-xs text-text-secondary">
          Panel lain di halaman ini tidak terpengaruh.
        </p>
      </div>
      <button type="button" onClick={onRetry} className="btn btn-outline btn-sm">
        Coba Lagi
      </button>
    </div>
  );
}

export default function AdminDashboardPage() {
  /**
   * Four independent panels. They used to share one `Promise.all`, so the first
   * failure silently blanked all four — see lib/admin/dashboardPanels.ts for
   * what that looked like to an admin.
   */
  const [statsPanel, setStatsPanel] = useState<PanelState<Stats>>({ kind: "loading" });
  const [ordersPanel, setOrdersPanel] = useState<PanelState<RecentOrder[]>>({ kind: "loading" });
  const [coursesPanel, setCoursesPanel] = useState<PanelState<PopularCourse[]>>({ kind: "loading" });
  const [leadsPanel, setLeadsPanel] = useState<PanelState<number>>({ kind: "loading" });
  const [now] = useState(new Date());

  const greeting = now.getHours() < 11 ? "Selamat Pagi" : now.getHours() < 15 ? "Selamat Siang" : now.getHours() < 18 ? "Selamat Sore" : "Selamat Malam";

  /**
   * Per-panel request counters. A retry issued while an older request is still
   * in flight must win, or a slow first response can overwrite the fresh one.
   */
  const reqIds = useRef({ stats: 0, orders: 0, courses: 0, leads: 0 });

  const loadStats = useCallback(async () => {
    const id = ++reqIds.current.stats;
    setStatsPanel({ kind: "loading" });
    const token = await getValidToken();
    const next: PanelState<Stats> = token
      ? await loadPanel("/api/admin/stats", (d) => parseStats(d), token)
      : { kind: "error" };
    if (id === reqIds.current.stats) setStatsPanel(next);
  }, []);

  const loadOrders = useCallback(async () => {
    const id = ++reqIds.current.orders;
    setOrdersPanel({ kind: "loading" });
    const token = await getValidToken();
    // No `sort` param: GET /api/admin/orders takes none and already orders by
    // createdAt desc. Sending one that the API drops silently is how the
    // "Terpopuler" widget below shipped mis-sorted for so long.
    const next: PanelState<RecentOrder[]> = token
      ? await loadPanel("/api/admin/orders?limit=6", (d) => parseOrders(d), token)
      : { kind: "error" };
    if (id === reqIds.current.orders) setOrdersPanel(next);
  }, []);

  const loadCourses = useCallback(async () => {
    const id = ++reqIds.current.courses;
    setCoursesPanel({ kind: "loading" });
    const token = await getValidToken();
    // `sort` is a real, enum-validated parameter on GET /api/admin/courses
    // (api/src/modules/admin/courses.ts) — an unknown value now 400s.
    const next: PanelState<PopularCourse[]> = token
      ? await loadPanel("/api/admin/courses?limit=5&sort=totalEnrolled:desc", (d) => parseCourses(d), token)
      : { kind: "error" };
    if (id === reqIds.current.courses) setCoursesPanel(next);
  }, []);

  const loadLeads = useCallback(async () => {
    const id = ++reqIds.current.leads;
    setLeadsPanel({ kind: "loading" });
    const token = await getValidToken();
    const next: PanelState<number> = token
      ? await loadPanel("/api/admin/leads?status=new&limit=1", (d, m) => parseNewLeads(d, m), token)
      : { kind: "error" };
    if (id === reqIds.current.leads) setLeadsPanel(next);
  }, []);

  useEffect(() => {
    // Concurrent, but settled independently — one rejection cannot take the
    // others with it, and nothing here can reject unhandled.
    void Promise.allSettled([loadStats(), loadOrders(), loadCourses(), loadLeads()]);
  }, [loadStats, loadOrders, loadCourses, loadLeads]);

  const stats = statsPanel.kind === "ready" ? statsPanel.data : null;
  const orders = ordersPanel.kind === "ready" ? ordersPanel.data : [];
  const courses = coursesPanel.kind === "ready" ? coursesPanel.data : [];

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

  // No page-level loading gate any more. It used to hide the fact that the four
  // panels resolve independently: one slow endpoint held the whole console
  // back, and one failed endpoint emptied it. Each panel now reports itself.
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
      {statsPanel.kind === "loading" ? (
        <DashboardLoading label="Memuat statistik…" />
      ) : statsPanel.kind === "error" ? (
        /* Rendering "Rp 0" here would be a claim about the business. We do not
           have one to make — the request failed. */
        <PanelError label="statistik" onRetry={loadStats} />
      ) : (
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
      )}

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
                {leadsPanel.kind === "loading"
                  ? "Memuat…"
                  : leadsPanel.kind === "error"
                  ? "Gagal memuat jumlah leads"
                  : leadsPanel.data === 0
                  ? "Tidak ada leads baru saat ini"
                  : "Leads baru menunggu follow-up"}
              </p>
            </div>
            {/* "—" for both loading and error, never "0": a zero here would
                read as "no one enquired today", which we cannot vouch for. */}
            <span className="font-display text-4xl font-extrabold leading-none sm:text-5xl">
              {leadsPanel.kind === "ready" ? leadsPanel.data : "—"}
            </span>
            <span className="hidden text-[11px] font-semibold uppercase tracking-wider text-white/70 sm:inline">Orang Terdeteksi</span>
          </div>
          <div className="flex items-center gap-3">
            {leadsPanel.kind === "error" && (
              <button
                type="button"
                onClick={loadLeads}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-white/15 px-4 py-2 text-xs font-bold text-white backdrop-blur-sm transition hover:bg-white/25"
              >
                Coba Lagi
              </button>
            )}
            {leadsPanel.kind === "ready" && leadsPanel.data > 0 && (
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
                leadsPanel.kind === "ready" && leadsPanel.data > 0 ? "text-white/80" : "rounded-xl bg-white px-5 py-2.5 text-sm font-bold text-accent-cyan-strong shadow-e1 hover:bg-white/95"
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

            {ordersPanel.kind === "loading" ? (
              <div className="p-6">
                <DashboardLoading label="Memuat transaksi…" />
              </div>
            ) : ordersPanel.kind === "error" ? (
              <div className="p-6">
                <PanelError label="transaksi" onRetry={loadOrders} />
              </div>
            ) : orders.length === 0 ? (
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
            {coursesPanel.kind === "loading" ? (
              <DashboardLoading label="Memuat kursus…" />
            ) : coursesPanel.kind === "error" ? (
              <PanelError label="kursus terpopuler" onRetry={loadCourses} />
            ) : courses.length === 0 ? (
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
