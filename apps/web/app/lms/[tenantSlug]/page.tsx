"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  BookOpen,
  Home,
  Trophy,
  GraduationCap,
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  Check,
} from "lucide-react";
import { Avatar, Badge, Card } from "@/components/ui";
import { getValidToken } from "@/lib/auth/token";

// ─── Types ────────────────────────────────────────────────────────────────────

type CourseProgress = {
  courseId: string;
  courseTitle: string;
  description: string | null;
  totalLessons: number;
  completedLessons: number;
  completionPct: number;
  isCompleted: boolean;
  enrolledAt: string;
  dueDate?: string | null;
  isMandatory?: boolean;
  certificate: { issuedAt: string } | null;
};

type TenantInfo = {
  name: string;
  slug: string;
  logoUrl: string | null;
  primaryColor: string;
};

// ─── Sidebar ─────────────────────────────────────────────────────────────────

function Sidebar({ slug, tenant }: { slug: string; tenant: TenantInfo | null }) {
  const primary = tenant?.primaryColor ?? "#0077A8";
  const navItems = [
    { href: `/lms/${slug}`,              icon: Home,     label: "Kursus Saya" },
    { href: `/lms/${slug}/certificates`, icon: Trophy,   label: "Sertifikat" },
  ];

  return (
    <aside className="sticky top-0 flex min-h-screen w-64 flex-shrink-0 flex-col border-r border-border-default bg-surface-card">
      {/* Company brand — tenant logo + name (white-label branding hook) */}
      <div className="border-b border-border-default px-4 py-5">
        <div className="flex items-center gap-3 rounded-xl bg-surface-sunken p-3">
          <Avatar
            src={tenant?.logoUrl ?? undefined}
            name={tenant?.name ?? slug}
            size="md"
            className="rounded-xl border-0"
            style={tenant?.logoUrl ? undefined : { background: primary, color: "#ffffff" }}
          />
          <div className="min-w-0">
            <p className="truncate text-sm font-bold text-text-primary">{tenant?.name ?? slug}</p>
            <p className="text-[11px] text-text-secondary">LMS Portal</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-3">
        {navItems.map(({ href, icon: Icon, label }) => {
          const isActive = typeof window !== "undefined" && window.location.pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className="mb-0.5 flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-semibold transition-all"
              style={{
                background: isActive ? `${primary}15` : "transparent",
                color: isActive ? primary : "var(--text-secondary)",
              }}
            >
              <Icon size={18} strokeWidth={1.75} aria-hidden="true" />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* Back links */}
      <div className="flex flex-col gap-2 border-t border-border-default px-4 py-4">
        <Link
          href="/dashboard"
          className="flex items-center gap-1.5 text-[11px] text-text-secondary transition-colors hover:text-accent-cyan-strong"
        >
          <ArrowLeft size={13} aria-hidden="true" />
          Kembali ke Dashboard
        </Link>
        <Link
          href="/"
          className="flex items-center gap-1.5 text-[11px] text-text-muted transition-colors hover:text-accent-cyan-strong"
        >
          <GraduationCap size={13} aria-hidden="true" />
          Jago Akademi
        </Link>
      </div>
    </aside>
  );
}

// ─── Welcome banner + progress summary ─────────────────────────────────────────

function WelcomeBanner({ courses, tenant }: { courses: CourseProgress[]; tenant: TenantInfo | null }) {
  const completed = courses.filter((c) => c.isCompleted).length;
  const active = courses.filter((c) => !c.isCompleted).length;
  const avgPct = courses.length > 0 ? Math.round(courses.reduce((s, c) => s + c.completionPct, 0) / courses.length) : 0;
  const certs = courses.filter((c) => c.certificate).length;

  const summary = [
    { label: "Kursus Aktif", value: active },
    { label: "Kursus Selesai", value: completed },
    { label: "Sertifikat", value: certs },
  ];

  return (
    <section className="relative mb-7 overflow-hidden rounded-[28px] bg-brand-gradient p-6 text-white md:p-8">
      <div className="pointer-events-none absolute -right-16 -top-24 h-72 w-72 rounded-full bg-white/10 blur-3xl" aria-hidden="true" />
      <div className="relative z-10 grid items-center gap-6 md:grid-cols-2">
        <div>
          <h1 className="font-display text-2xl font-bold leading-tight md:text-[28px]">
            Selamat belajar!
          </h1>
          <p className="mt-2 text-sm text-white/90">
            {tenant ? `Portal belajar ${tenant.name}` : "Memuat portal…"}
          </p>
        </div>

        {/* Glass progress panel */}
        <div className="glass-card flex flex-col gap-4 rounded-[20px] p-5 text-white">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-white/80">Rata-rata Progress</span>
            <span className="font-display text-2xl font-bold">{avgPct}%</span>
          </div>
          <div className="h-3 w-full overflow-hidden rounded-full bg-white/25">
            <div className="h-full rounded-full bg-white transition-all duration-700" style={{ width: `${avgPct}%` }} />
          </div>
          <div className="grid grid-cols-3 gap-3 text-center">
            {summary.map(({ label, value }) => (
              <div key={label}>
                <p className="font-display text-xl font-bold">{value}</p>
                <p className="text-[11px] text-white/75">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── Course Card ──────────────────────────────────────────────────────────────

function CourseCard({ c, slug, primary }: { c: CourseProgress; slug: string; primary: string }) {
  const now = new Date();
  const overdue = c.dueDate && !c.isCompleted && new Date(c.dueDate) < now;
  const dueSoon = c.dueDate && !c.isCompleted && !overdue && (new Date(c.dueDate).getTime() - now.getTime()) < 7 * 86400000;

  return (
    <Link href={`/lms/${slug}/courses/${c.courseId}`} className="block no-underline">
      <Card hoverable className="p-5">
        {/* Header */}
        <div className="mb-3 flex items-start justify-between gap-2.5">
          <div className="min-w-0 flex-1">
            <div className="mb-1 flex flex-wrap items-center gap-1.5">
              <h3 className="text-sm font-bold leading-snug text-text-primary">{c.courseTitle}</h3>
              {c.isCompleted && (
                <Badge variant="success">
                  <Check size={12} aria-hidden="true" />
                  Selesai
                </Badge>
              )}
              {c.isMandatory && !c.isCompleted && <Badge variant="info">Wajib</Badge>}
              {overdue && <Badge variant="danger">Terlambat</Badge>}
              {dueSoon && <Badge variant="warning">Deadline dekat</Badge>}
            </div>
            {c.description && (
              <p className="line-clamp-2 text-xs text-text-secondary">{c.description}</p>
            )}
          </div>
          {c.certificate && (
            <span
              className="flex-shrink-0 text-amber-500"
              title={`Sertifikat diterbitkan ${new Date(c.certificate.issuedAt).toLocaleDateString("id-ID")}`}
            >
              <Trophy size={20} aria-hidden="true" />
            </span>
          )}
        </div>

        {/* Progress */}
        <div className="flex items-center gap-2.5">
          <div className="h-1.5 flex-1 rounded-full bg-surface-sunken">
            <div
              className="h-1.5 rounded-full transition-all duration-500"
              style={{ width: `${c.completionPct}%`, background: c.isCompleted ? "#34D399" : primary }}
            />
          </div>
          <span className="min-w-[80px] whitespace-nowrap text-right text-xs text-text-muted">
            {c.completedLessons}/{c.totalLessons} pelajaran
          </span>
        </div>

        {c.dueDate && (
          <p className={`mt-2 flex items-center gap-1 text-[11px] ${overdue ? "text-red-600" : "text-text-muted"}`}>
            <CalendarDays size={12} aria-hidden="true" />
            Deadline: {new Date(c.dueDate).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}
          </p>
        )}
      </Card>
    </Link>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function LmsPortalHomePage() {
  const { tenantSlug } = useParams<{ tenantSlug: string }>();
  const router = useRouter();
  const [courses, setCourses] = useState<CourseProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const [tenant, setTenant] = useState<TenantInfo | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      const token = await getValidToken();
      if (!token) { router.replace("/masuk"); return; }
      const authHeaders = { Authorization: `Bearer ${token}` };
      const [meRes, coursesRes] = await Promise.all([
        fetch("/api/lms/portal/me", { headers: authHeaders }),
        fetch(`/api/lms/portal/${tenantSlug}/courses`, { headers: authHeaders }),
      ]);
      const [meData, coursesData] = await Promise.all([meRes.json(), coursesRes.json()]);

      const myTenant = meData.data?.find((t: { slug: string; name: string; logoUrl: string | null; primaryColor: string }) => t.slug === tenantSlug);
      if (myTenant) setTenant(myTenant);
      setCourses(coursesData.data ?? []);
      setLoading(false);
    };
    fetchData();
  }, [tenantSlug, router]);

  const primary = tenant?.primaryColor ?? "#0077A8";

  return (
    <div className="flex min-h-screen bg-surface-page">
      {/* Sidebar */}
      <Sidebar slug={tenantSlug} tenant={tenant} />

      {/* Main */}
      <main className="min-w-0 flex-1 px-6 py-7 md:px-8">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <span
              className="inline-block h-9 w-9 animate-spin rounded-full border-[3px] border-t-transparent"
              style={{ borderColor: primary, borderTopColor: "transparent" }}
            />
          </div>
        ) : (
          <>
            {/* Welcome banner + progress summary */}
            <WelcomeBanner courses={courses} tenant={tenant} />

            {/* Course grid */}
            <div className="mb-3.5 flex items-center justify-between">
              <h2 className="text-base font-bold text-text-primary">Kursus Saya</h2>
              <Link
                href={`/lms/${tenantSlug}/certificates`}
                className="flex items-center gap-1 text-sm font-semibold text-accent-cyan-strong no-underline hover:underline"
              >
                Sertifikat Saya
                <ArrowRight size={14} aria-hidden="true" />
              </Link>
            </div>

            {courses.length === 0 ? (
              <Card className="px-6 py-16 text-center">
                <BookOpen size={40} className="mx-auto mb-3.5 text-text-muted" aria-hidden="true" />
                <p className="mb-2 text-base font-bold text-text-primary">Belum ada kursus</p>
                <p className="text-[13px] text-text-secondary">Kamu belum terdaftar di kursus apapun.</p>
                <p className="mt-1 text-xs text-text-muted">Hubungi admin perusahaan untuk mendapatkan akses kursus.</p>
              </Card>
            ) : (
              <div className="grid grid-cols-[repeat(auto-fill,minmax(320px,1fr))] gap-3.5">
                {courses.map((c) => (
                  <CourseCard key={c.courseId} c={c} slug={tenantSlug} primary={primary} />
                ))}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
