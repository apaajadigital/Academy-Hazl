"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import {
  CalendarDays,
  BookOpen,
  ClipboardList,
  CheckCircle2,
  Award,
  ArrowRight,
  BookMarked,
  Ticket,
  ShoppingBag,
  Handshake,
  ShieldCheck,
  Download,
  GraduationCap,
} from "lucide-react";
import { getDashboard, type DashboardData } from "../../lib/api/enrollment";
import { MediaPlaceholder } from "@/components/shared/MediaPlaceholder";
import { getValidToken } from "@/lib/auth/token";
import {
  Card,
  Skeleton,
  Button,
  StatCard,
  QuickActionCard,
  ProgressBar,
  EmptyState,
} from "@/components/ui";

export default function DashboardPage() {
  const router = useRouter();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userName, setUserName] = useState("Pengguna");

  useEffect(() => {
    // Finding #1: read token via getValidToken so a session persisted only in
    // localStorage (new tab / restore) is honored instead of bouncing to /masuk.
    (async () => {
      const token = await getValidToken();
      if (!token) { router.replace("/masuk"); return; }

      // Fetch user name
      fetch(`/api/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then((r) => r.json())
        .then((b) => { if (b.success) setUserName(b.data.name.split(" ")[0]); })
        .catch(() => {});

      getDashboard(token)
        .then(setData)
        .catch((e) => setError(e.message))
        .finally(() => setLoading(false));
    })();
  }, [router]);

  if (loading) {
    return (
      <div className="dash-container flex flex-col gap-8" aria-busy="true">
        <span className="sr-only">Memuat…</span>
        {/* Greeting */}
        <div className="space-y-2">
          <Skeleton className="h-9 w-64" />
          <Skeleton className="h-5 w-48" />
        </div>
        {/* KPI cards */}
        <div className="dash-grid">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className="col-span-12 flex items-center gap-4 p-6 sm:col-span-6 xl:col-span-3">
              <Skeleton className="size-12 shrink-0 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-6 w-10" />
              </div>
            </Card>
          ))}
        </div>
        {/* Course cards */}
        <div className="dash-grid">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i} className="col-span-12 overflow-hidden md:col-span-6 xl:col-span-4">
              <Skeleton className="aspect-video w-full rounded-none" />
              <div className="space-y-2 p-4">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
                <Skeleton className="h-2 w-full" />
              </div>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="mx-auto flex min-h-[50vh] max-w-md flex-col items-center justify-center gap-4 text-center">
        <p className="font-display text-lg font-bold text-text-primary">Gagal memuat dashboard</p>
        <p className="text-sm text-text-secondary">{error}</p>
        <Button variant="cyan" size="sm" onClick={() => router.refresh()}>
          Coba Lagi
        </Button>
      </div>
    );
  }

  const { stats, enrollments, recentCertificates } = data;
  const now = new Date();
  const hour = now.getHours();
  const greeting =
    hour < 11 ? "Selamat Pagi" : hour < 15 ? "Selamat Siang" : hour < 18 ? "Selamat Sore" : "Selamat Malam";
  const todayLabel = now.toLocaleDateString("id-ID", {
    weekday: "long", year: "numeric", month: "long", day: "numeric",
  });

  const kpis = [
    { label: "Kursus Diikuti", value: stats.totalEnrolled, icon: BookOpen, accent: "#0077A8", tint: "rgba(0,119,168,0.10)" },
    { label: "Sedang Berjalan", value: stats.totalInProgress, icon: ClipboardList, accent: "#7C3AED", tint: "rgba(124,58,237,0.10)" },
    { label: "Selesai", value: stats.totalCompleted, icon: CheckCircle2, accent: "#16A34A", tint: "rgba(22,163,74,0.10)" },
    { label: "Sertifikat", value: stats.totalCertificates, icon: Award, accent: "#D97706", tint: "rgba(217,119,6,0.10)" },
  ];

  const quickAccess = [
    { label: "Kursus Saya", href: "/dashboard/kursus", icon: BookOpen, desc: "Lanjut belajar" },
    { label: "Sertifikat", href: "/dashboard/sertifikat", icon: Award, desc: "Lihat pencapaian" },
    { label: "E-Book", href: "/dashboard/ebook", icon: BookMarked, desc: "Unduh materi" },
    { label: "Tiket Event", href: "/dashboard/tiket", icon: Ticket, desc: "Event saya" },
    { label: "Pesanan", href: "/dashboard/pesanan", icon: ShoppingBag, desc: "Riwayat transaksi" },
    { label: "Afiliasi", href: "/dashboard/afiliasi", icon: Handshake, desc: "Dapatkan komisi" },
  ];

  return (
    <div className="dash-container flex flex-col gap-8">
      {/* ── Greeting Header ── */}
      <section className="space-y-2">
        <h1 className="font-display text-2xl font-extrabold text-text-primary md:text-3xl">
          {greeting}, {userName}!
        </h1>
        <div className="flex items-center gap-2 text-text-secondary">
          <CalendarDays size={18} aria-hidden="true" />
          <span className="text-sm">{todayLabel}</span>
        </div>
      </section>

      {/* ── KPI Cards (12-col grid) ── */}
      <section className="dash-grid">
        {kpis.map(({ label, value, icon: Icon, accent, tint }) => (
          <StatCard
            key={label}
            className="col-span-12 sm:col-span-6 xl:col-span-3"
            label={label}
            value={value}
            icon={Icon}
            iconColor={accent}
            iconBg={tint}
          />
        ))}
      </section>

      {/* ── Quick Access (12-col grid) ── */}
      <section className="flex flex-col gap-4">
        <h2 className="font-display text-lg font-bold text-text-primary">Akses Cepat</h2>
        <div className="dash-grid">
          {quickAccess.map(({ label, href, icon: Icon, desc }) => (
            <QuickActionCard
              key={href}
              className="col-span-6 sm:col-span-4 xl:col-span-2"
              href={href}
              label={label}
              icon={Icon}
              description={desc}
            />
          ))}
        </div>
      </section>

      {/* ── Lanjutkan Belajar (enrolled courses) ── */}
      <section className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg font-bold text-text-primary">Lanjutkan Belajar</h2>
          <Link
            href="/dashboard/kursus"
            className="inline-flex items-center gap-2 text-sm font-semibold text-accent-cyan-strong hover:underline"
          >
            Lihat Semua <ArrowRight size={16} aria-hidden="true" />
          </Link>
        </div>

        {enrollments.length === 0 ? (
          <EmptyState
            icon={GraduationCap}
            title="Belum ada kursus"
            description="Mulai belajar dengan mendaftar kursus pertama Anda."
            action={
              <Link
                href="/e-course"
                className="inline-flex items-center rounded-full bg-brand-gradient px-6 py-3 text-sm font-semibold text-white shadow-e1 transition-opacity hover:opacity-90"
              >
                Jelajahi Kursus
              </Link>
            }
          />
        ) : (
          <div className="dash-grid">
            {enrollments.slice(0, 3).map((e) => {
              const pct = Number(e.progressPct);
              return (
                <Link
                  key={e.id}
                  href={`/belajar/${e.course.slug}`}
                  className="group col-span-12 flex flex-col overflow-hidden rounded-[var(--radius-card)] border border-solid border-border-default bg-surface-card shadow-e1 transition-all hover:-translate-y-0.5 hover:shadow-e2 md:col-span-6 xl:col-span-4"
                >
                  <div className="relative aspect-video overflow-hidden bg-surface-sunken">
                    {e.course.thumbnailUrl ? (
                      <Image
                        src={e.course.thumbnailUrl}
                        alt={e.course.title}
                        fill
                        sizes="(min-width: 768px) 33vw, 100vw"
                        className="object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                    ) : (
                      <div className="h-full w-full [&>*]:h-full [&>*]:rounded-none [&>*]:border-0">
                        <MediaPlaceholder type="foto" ratio="16:9" showRatio={false} />
                      </div>
                    )}
                    {e.isCompleted && (
                      <span className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full bg-green-600 px-3 py-1 text-[10px] font-bold text-white">
                        <CheckCircle2 size={12} aria-hidden="true" /> Selesai
                      </span>
                    )}
                  </div>
                  <div className="flex flex-1 flex-col gap-2 p-4">
                    <h3 className="font-display text-sm font-bold leading-snug text-text-primary line-clamp-2 transition-colors group-hover:text-accent-cyan-strong">
                      {e.course.title}
                    </h3>
                    {e.course.trainer && (
                      <p className="text-xs text-text-secondary">{e.course.trainer.name}</p>
                    )}
                    <div className="mt-auto flex flex-col gap-2 pt-2">
                      <div className="flex items-center justify-between text-[11px] font-semibold">
                        <span className="text-text-secondary">Progress</span>
                        <span className="text-accent-cyan-strong">{pct}%</span>
                      </div>
                      <ProgressBar value={pct} label={`Progress ${e.course.title}`} />
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </section>

      {/* ── Recent Certificates ── */}
      {recentCertificates.length > 0 && (
        <section className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-lg font-bold text-text-primary">Sertifikat Terbaru</h2>
            <Link
              href="/dashboard/sertifikat"
              className="inline-flex items-center gap-2 text-sm font-semibold text-accent-cyan-strong hover:underline"
            >
              Lihat Semua <ArrowRight size={16} aria-hidden="true" />
            </Link>
          </div>
          <div className="flex flex-col gap-3">
            {recentCertificates.slice(0, 3).map((cert) => (
              <div
                key={cert.id}
                className="flex flex-wrap items-center gap-4 rounded-[var(--radius-card)] border border-solid border-border-default bg-surface-card p-4 shadow-e1 transition-shadow hover:shadow-e2"
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-surface-accent-soft text-accent-cyan-strong">
                  <Award size={20} aria-hidden="true" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-text-primary">{cert.course.title}</p>
                  <p className="mt-1 text-xs text-text-secondary">
                    {new Date(cert.issuedAt).toLocaleDateString("id-ID", {
                      day: "numeric", month: "long", year: "numeric",
                    })}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <Link
                    href={`/verify/${cert.code}`}
                    className="inline-flex items-center gap-2 rounded-[var(--radius-md)] border border-solid border-accent-cyan-strong px-3 py-2 text-xs font-semibold text-accent-cyan-strong transition-colors hover:bg-accent-cyan-strong hover:text-white"
                  >
                    <ShieldCheck size={14} aria-hidden="true" /> Verifikasi
                  </Link>
                  <a
                    href={`/api/certificates/${cert.code}/download`}
                    target="_blank"
                    rel="noopener noreferrer"
                    download
                    className="inline-flex items-center gap-2 rounded-[var(--radius-md)] bg-accent-cyan-strong px-3 py-2 text-xs font-semibold text-white transition-opacity hover:opacity-90"
                  >
                    <Download size={14} aria-hidden="true" /> Unduh PDF
                  </a>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
