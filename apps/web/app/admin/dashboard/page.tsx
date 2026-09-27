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
  type LucideIcon,
} from "lucide-react";
import {
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
} from "@/components/ui";
import {
  AdminPageContainer,
  AdminMetricGrid,
  AdminMetricGridSkeleton,
  AdminPanel,
  AdminPanelError,
  AdminPanelSkeleton,
} from "@/components/admin";
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

const rupiah = (n: number) => `Rp ${n.toLocaleString("id-ID")}`;

/**
 * A secondary metric: same card anatomy as StatCard, one step quieter.
 *
 * These four used to live inside ONE card as `grid-cols-2 sm:grid-cols-4`. At
 * 640px that put four icon-plus-two-lines groups into a single p-5 card —
 * roughly 130px each — so labels collided with values. Giving each its own card
 * lets the grid reflow instead of compressing, and keeps them visibly
 * subordinate to the four headline KPIs above.
 */
function SecondaryMetric({
  label,
  value,
  icon: Icon,
  accent,
  trend,
}: {
  label: string;
  value: string;
  icon: LucideIcon;
  accent: string;
  trend: string | null;
}) {
  return (
    <div className="flex min-w-0 items-center gap-3 rounded-[var(--radius-card)] border border-solid border-border-default bg-surface-card p-4 shadow-e1">
      <span
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--radius-md)]"
        style={{ background: `${accent}18`, color: accent }}
      >
        <Icon size={18} aria-hidden="true" />
      </span>
      <div className="min-w-0">
        <p className="truncate text-xs font-medium text-text-secondary">{label}</p>
        <p className="mt-0.5 truncate font-display text-base font-bold tabular-nums text-text-primary">
          {value}
        </p>
      </div>
      {trend ? (
        <span className="ml-auto shrink-0 text-xs font-semibold text-green-600">{trend}</span>
      ) : null}
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
        { label: "Total Pendapatan",  value: rupiah(stats.totalRevenue), icon: Wallet, accent: "#DC2626", tint: "rgba(220,38,38,0.10)", trend: stats.trends?.totalRevenue ?? null },
      ]
    : [];

  // ── Secondary KPIs: smaller inline metrics ──
  const SECONDARY_KPIS = stats
    ? [
        { label: "Omset Retail",    value: rupiah(stats.retailRevenue), icon: ShoppingBag, accent: "#0077A8", trend: stats.trends?.retailRevenue ?? null },
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
    <AdminPageContainer>
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <header className="flex flex-col gap-2">
        <p className="flex items-center gap-2 text-green-700">
          <span className="h-2 w-2 animate-pulse rounded-full bg-green-600" aria-hidden="true" />
          <span className="text-[11px] font-semibold uppercase tracking-wider">Sistem Online</span>
        </p>
        <h1 className="font-display text-2xl font-extrabold text-text-primary md:text-3xl">
          {greeting}, Admin 👋
        </h1>
        <p className="flex items-center gap-2 text-sm text-text-secondary">
          <CalendarDays size={18} className="shrink-0" aria-hidden="true" />
          <span className="min-w-0">
            {now.toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
            {" • Overview performa akademi hari ini."}
          </span>
        </p>
      </header>

      {/* ── Primary KPIs ───────────────────────────────────────────────── */}
      <section aria-labelledby="kpi-utama" className="flex flex-col gap-4">
        <h2 id="kpi-utama" className="sr-only">Ringkasan utama</h2>
        {statsPanel.kind === "loading" ? (
          /* Both rows, because the ready state renders both. A skeleton that
             shows only the headline four makes the secondary row appear from
             nowhere and shoves the rest of the page down. */
          <>
            <AdminMetricGridSkeleton />
            <AdminMetricGridSkeleton compact />
          </>
        ) : statsPanel.kind === "error" ? (
          /* Rendering "Rp 0" here would be a claim about the business. We do not
             have one to make — the request failed. */
          <div className="rounded-[var(--radius-card)] border border-dashed border-border-strong bg-surface-card">
            <AdminPanelError label="statistik" onRetry={loadStats} />
          </div>
        ) : (
          <>
            <AdminMetricGrid>
              {PRIMARY_KPIS.map(({ label, value, icon: Icon, accent, tint, trend }) => (
                <StatCard
                  key={label}
                  label={label}
                  value={value}
                  icon={Icon}
                  iconColor={accent}
                  iconBg={tint}
                  trend={trend}
                />
              ))}
            </AdminMetricGrid>
            <AdminMetricGrid>
              {SECONDARY_KPIS.map((m) => (
                <SecondaryMetric key={m.label} {...m} />
              ))}
            </AdminMetricGrid>
          </>
        )}
      </section>

      {/* ── Leads ──────────────────────────────────────────────────────────
          The badge used to be `absolute right-4 top-4` over content that
          reflows, and the icon, title, a 5xl number and its caption all sat in
          one non-wrapping flex row. Between roughly 700px and 900px the CTA
          group ran into the badge. Three explicit tracks cannot overlap: they
          stack below md and sit side by side above it. */}
      <section
        aria-labelledby="leads-heading"
        className="rounded-[var(--radius-card)] p-6 text-white shadow-e2"
        style={{ background: "linear-gradient(145deg, #16283e 0%, #0c4a5a 55%, #045b66 100%)" }}
      >
        <div className="grid gap-4 md:grid-cols-[auto_minmax(0,1fr)_auto] md:items-center">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[var(--radius-md)] bg-white/15">
            <Mail size={22} aria-hidden="true" />
          </span>

          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 id="leads-heading" className="font-display text-lg font-bold text-white">
                Leads Baru
              </h2>
              <span className="rounded-full bg-white/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-white/80">
                Real-time
              </span>
            </div>
            <div className="mt-1 flex flex-wrap items-baseline gap-x-3 gap-y-1">
              {/* "—" for both loading and error, never "0": a zero here would
                  read as "no one enquired today", which we cannot vouch for. */}
              <span className="font-display text-4xl font-extrabold leading-none tabular-nums">
                {leadsPanel.kind === "ready" ? leadsPanel.data.toLocaleString("id-ID") : "—"}
              </span>
              <span className="text-xs text-white/75">
                {leadsPanel.kind === "loading"
                  ? "Memuat…"
                  : leadsPanel.kind === "error"
                  ? "Gagal memuat jumlah leads"
                  : leadsPanel.data === 0
                  ? "Tidak ada leads baru saat ini"
                  : "orang menunggu follow-up"}
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 md:justify-end">
            {leadsPanel.kind === "error" && (
              <button
                type="button"
                onClick={loadLeads}
                className="inline-flex min-h-[44px] items-center justify-center rounded-[var(--radius-md)] bg-white/15 px-4 text-sm font-bold text-white transition hover:bg-white/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
              >
                Coba Lagi
              </button>
            )}
            {leadsPanel.kind === "ready" && leadsPanel.data > 0 && (
              <Link
                href="/admin/leads?status=new"
                className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-[var(--radius-md)] bg-white px-5 text-sm font-bold text-accent-cyan-strong shadow-e1 transition hover:bg-white/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
              >
                Tindak Lanjuti <ArrowRight size={16} aria-hidden="true" />
              </Link>
            )}
            <Link
              href="/admin/leads"
              className="inline-flex min-h-[44px] items-center justify-center gap-1 rounded-[var(--radius-md)] px-3 text-sm font-semibold text-white/85 transition hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
            >
              Kelola Leads <ArrowRight size={14} aria-hidden="true" />
            </Link>
          </div>
        </div>
      </section>

      {/* ── Transaksi + Kursus Terpopuler ───────────────────────────────────
          The old split was `lg:col-span-8` / `lg:col-span-4`. At a 1024px
          viewport, minus the 240px sidebar and padding, that left ~480px for a
          four-column table and ~240px for the course list — both unusable.

          The threshold is 1440px, chosen by measurement rather than by taking a
          stock breakpoint. Content width after the sidebar and padding, then
          the two tracks once the 24px gap is removed:

            1280px → 976px  → 635 / 317   rail under its 320px floor: unsafe
            1360px → 1056px → 688 / 344   table under the ~700px it wants
            1440px → 1136px → 741 / 371   both comfortable
            1536px → 1232px → 805 / 403   (Tailwind's 2xl)

          Waiting for 2xl left 1136px of width carrying a single table that
          needs about 740, and made the page 2243px tall instead of 1603 — 640px
          of extra scrolling that bought nothing. At 1280 the rail genuinely
          cannot fit, so it stacks; that is the right answer there, not a
          compromise. */}
      <div className="grid grid-cols-1 gap-6 min-[1440px]:grid-cols-[minmax(0,2fr)_minmax(320px,1fr)]">
        <AdminPanel
          title="Transaksi Terbaru"
          description="Memantau transaksi yang masuk secara berkala."
          action={
            <Link
              href="/admin/transaksi"
              className="-my-2 inline-flex items-center gap-1 rounded-[var(--radius-md)] py-2 text-sm font-semibold text-accent-cyan-strong hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-cyan-strong/40"
            >
              Semua Pesanan <ArrowRight size={14} aria-hidden="true" />
            </Link>
          }
        >
          {ordersPanel.kind === "loading" ? (
            <AdminPanelSkeleton rows={6} />
          ) : ordersPanel.kind === "error" ? (
            <AdminPanelError label="transaksi" onRetry={loadOrders} />
          ) : orders.length === 0 ? (
            <div className="p-6">
              <EmptyState
                icon={ShoppingBag}
                title="Belum ada transaksi"
                description="Transaksi yang masuk akan muncul di sini."
              />
            </div>
          ) : (
            <>
              {/* Below md the four columns cannot coexist without a horizontal
                  scrollbar inside the card, so the same rows become a list. */}
              <ul className="divide-y divide-border-default md:hidden">
                {orders.map((order) => (
                  <li key={order.id} className="flex flex-col gap-2 px-5 py-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-text-primary" title={order.user.name}>
                          {order.user.name}
                        </p>
                        <p className="mt-0.5 truncate text-xs text-text-secondary" title={order.user.email}>
                          {order.user.email}
                        </p>
                      </div>
                      <Badge variant={STATUS_VARIANT[order.status] ?? "neutral"} className="shrink-0 uppercase tracking-wide">
                        {order.status}
                      </Badge>
                    </div>
                    <p className="truncate text-sm text-text-primary" title={order.items[0]?.itemTitle ?? undefined}>
                      {order.items[0]?.itemTitle ?? "—"}
                    </p>
                    <div className="flex items-baseline justify-between gap-3">
                      <span className="text-xs text-text-muted">
                        {new Date(order.createdAt).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}
                      </span>
                      <span className="whitespace-nowrap text-sm font-bold tabular-nums text-text-primary">
                        {rupiah(Number(order.finalAmount))}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>

              <div className="hidden md:block">
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
                              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-gradient text-xs font-extrabold text-white" aria-hidden="true">
                                {order.user.name.slice(0, 2).toUpperCase()}
                              </span>
                              <div className="min-w-0">
                                <p className="truncate text-sm font-semibold text-text-primary" title={order.user.name}>
                                  {order.user.name}
                                </p>
                                <p className="mt-0.5 truncate text-xs text-text-secondary" title={order.user.email}>
                                  {order.user.email}
                                </p>
                              </div>
                            </div>
                          </TD>
                          <TD className="min-w-0">
                            {/* `title` so a truncated course name is still
                                reachable — the old cell clipped at 220px with
                                no way to read the rest. */}
                            <p className="truncate text-sm text-text-primary" title={title}>{title}</p>
                            <p className="mt-0.5 text-xs text-text-muted">
                              {new Date(order.createdAt).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}
                            </p>
                          </TD>
                          <TD className="text-center">
                            <Badge variant={variant} className="uppercase tracking-wide">{order.status}</Badge>
                          </TD>
                          <TD className="whitespace-nowrap text-right text-sm font-bold tabular-nums text-text-primary">
                            {rupiah(Number(order.finalAmount))}
                          </TD>
                        </TR>
                      );
                    })}
                  </TBody>
                </Table>
              </div>
            </>
          )}
        </AdminPanel>

        <AdminPanel
          title="Kursus Terpopuler"
          icon={TrendingUp}
          action={
            <Link
              href="/admin/kursus"
              className="-my-2 inline-flex items-center gap-1 rounded-[var(--radius-md)] py-2 text-sm font-semibold text-accent-cyan-strong hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-cyan-strong/40"
            >
              Kelola <ChevronRight size={14} aria-hidden="true" />
            </Link>
          }
        >
          {coursesPanel.kind === "loading" ? (
            <AdminPanelSkeleton rows={5} />
          ) : coursesPanel.kind === "error" ? (
            <AdminPanelError label="kursus terpopuler" onRetry={loadCourses} />
          ) : courses.length === 0 ? (
            <div className="p-6">
              <EmptyState icon={BookOpen} title="Belum ada kursus" />
            </div>
          ) : (
            <ol className="flex flex-col gap-4 p-6">
              {courses.map((course, i) => {
                const pct = Math.max((course.totalEnrolled / maxEnrolled) * 100, 4);
                const rating = parseFloat(course.avgRating);
                return (
                  <li key={course.id} className="flex items-start gap-3">
                    <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-surface-sunken text-xs font-bold text-text-secondary">
                      {i + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <p className="truncate text-sm font-semibold text-text-primary" title={course.title}>
                          {course.title}
                        </p>
                        <span className="flex shrink-0 items-center gap-1 text-xs font-semibold text-amber-600">
                          <Star size={12} className="fill-amber-400 text-amber-400" aria-hidden="true" />
                          <span className="tabular-nums">
                            {Number.isFinite(rating) ? rating.toFixed(1) : "0.0"}
                          </span>
                        </span>
                      </div>
                      <p className="mt-0.5 truncate text-xs text-text-secondary" title={course.trainer?.name ?? undefined}>
                        {course.trainer?.name ?? "Trainer Hazl"}
                      </p>
                      <div className="mt-2 flex items-center gap-2">
                        {/* Relative bar only — the API gives no target, so this
                            compares the five against each other and nothing
                            more. `aria-hidden` because the count beside it is
                            the accessible value. */}
                        <div className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-surface-sunken" aria-hidden="true">
                          <div className="h-full rounded-full bg-brand-gradient" style={{ width: `${pct}%` }} />
                        </div>
                        <span className="flex shrink-0 items-center gap-1 text-[11px] font-medium tabular-nums text-text-secondary">
                          <GraduationCap size={12} aria-hidden="true" />
                          {course.totalEnrolled.toLocaleString("id-ID")}
                          <span className="sr-only"> peserta</span>
                        </span>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ol>
          )}
        </AdminPanel>
      </div>

      {/* ── Akses Cepat ────────────────────────────────────────────────── */}
      <section aria-labelledby="akses-cepat" className="flex flex-col gap-4">
        <h2 id="akses-cepat" className="font-display text-lg font-bold text-text-primary">
          Akses Cepat
        </h2>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 lg:gap-6">
          {QUICK_ACTIONS.map(({ href, label, icon: Icon, desc }) => (
            <QuickActionCard key={href} href={href} label={label} icon={Icon} description={desc} />
          ))}
        </div>
      </section>
    </AdminPageContainer>
  );
}
