"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import {
  BookOpen,
  Users,
  CreditCard,
  Wallet,
  Clock,
  CalendarDays,
  Banknote,
  Undo2,
  ArrowUpRight,
} from "lucide-react";
import {
  Badge,
  StatCard,
  EmptyState,
  DashboardLoading,
  DashboardError,
} from "@/components/ui";
import { getValidToken } from "@/lib/auth/token";

type DashboardData = {
  totalCourses: number;
  publishedCourses: number;
  totalEnrollments: number;
  totalRevenue: number;
  netRevenue: number;
  /**
   * Balance breakdown (BL-78e). Optional on purpose: this page can be served by
   * an older API build during a rollout, and these three fields would then be
   * absent. Treating "absent" as 0 would advertise a wrong balance, so the UI
   * falls back to the previous layout instead (see `hasBalanceBreakdown`).
   */
  refundedRevenue?: number;
  committedPayouts?: number;
  availableBalance?: number;
  pendingPayouts: number;
  courses: { id: string; title: string; status: string; price: number; enrollments: number }[];
};

/**
 * Rupiah in the exact format the cards below already rendered inline
 * (`Rp ` + `toLocaleString("id-ID")`). Extracted so the non-finite guard lives
 * in one place: a missing field on an older API build would otherwise reach
 * `toLocaleString` as `undefined` and print "Rp NaN" — a bug this dashboard
 * family has actually shipped before.
 */
function rupiah(amount: number | undefined): string {
  return `Rp ${typeof amount === "number" && Number.isFinite(amount) ? amount.toLocaleString("id-ID") : "0"}`;
}

export default function TrainerHubPage() {
  const router = useRouter();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      const token = await getValidToken();
      if (!token) { router.replace("/masuk"); return; }
      try {
        const r = await fetch("/api/trainer/dashboard", {
          headers: { Authorization: `Bearer ${token}` },
        });
        const d = await r.json();
        if (d.success) setData(d.data);
        else setError(d.error?.message ?? "Gagal memuat data.");
      } catch {
        setError("Gagal memuat data.");
      } finally {
        setLoading(false);
      }
    })();
  }, [router]);

  if (loading) {
    return (
      <div className="dash-container">
        <DashboardLoading />
      </div>
    );
  }
  if (error) {
    return (
      <div className="dash-container">
        <DashboardError message={error} onRetry={() => router.refresh()} />
      </div>
    );
  }
  if (!data) return null;

  const now = new Date();
  const hour = now.getHours();
  const greeting =
    hour < 11 ? "Selamat Pagi" : hour < 15 ? "Selamat Siang" : hour < 18 ? "Selamat Sore" : "Selamat Malam";
  const todayLabel = now.toLocaleDateString("id-ID", {
    weekday: "long", year: "numeric", month: "long", day: "numeric",
  });

  // BL-78e: `netRevenue` is what the trainer EARNED; `availableBalance` is what
  // they may actually request. Headlining the former made trainers ask for more
  // than they had and get a 400 back, which reads like a payment bug. When the
  // API is new enough the headline KPI becomes the withdrawable figure and the
  // earnings breakdown moves to its own section below.
  const hasBalanceBreakdown = typeof data.availableBalance === "number";

  const stats: { label: string; value: string | number; icon: LucideIcon; color: string; bg: string }[] = [
    { label: "Total Kursus", value: data.totalCourses, icon: BookOpen, color: "#0077A8", bg: "rgba(0,119,168,0.10)" },
    { label: "Total Peserta", value: data.totalEnrollments.toLocaleString("id-ID"), icon: Users, color: "#7C3AED", bg: "rgba(124,58,237,0.10)" },
    { label: "Pendapatan Kotor", value: rupiah(data.totalRevenue), icon: CreditCard, color: "#16A34A", bg: "rgba(22,163,74,0.10)" },
    hasBalanceBreakdown
      ? { label: "Saldo Bisa Ditarik", value: rupiah(data.availableBalance), icon: Wallet, color: "#D97706", bg: "rgba(217,119,6,0.10)" }
      : { label: "Pendapatan Bersih (70%)", value: rupiah(data.netRevenue), icon: Wallet, color: "#D97706", bg: "rgba(217,119,6,0.10)" },
  ];

  return (
    <div className="dash-container flex flex-col gap-8">
      {/* ── Greeting Header ── */}
      <section className="space-y-2">
        <h1 className="font-display text-2xl font-extrabold text-text-primary md:text-3xl">
          {greeting}!
        </h1>
        <div className="flex items-center gap-2 text-text-secondary">
          <CalendarDays size={18} aria-hidden="true" />
          <span className="text-sm">{todayLabel}</span>
        </div>
      </section>

      {/* ── KPI Cards (12-col grid) ── */}
      <section className="dash-grid">
        {stats.map(({ label, value, icon, color, bg }) => (
          <StatCard
            key={label}
            className="col-span-12 sm:col-span-6 xl:col-span-3"
            label={label}
            value={value}
            icon={icon}
            iconColor={color}
            iconBg={bg}
          />
        ))}
      </section>

      {/* ── Rincian Saldo (BL-78e) ── */}
      {hasBalanceBreakdown && (
        <section className="flex flex-col gap-4">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="font-display text-lg font-bold text-text-primary">Rincian Saldo</h2>
            <Link href="/trainer-hub/payout" className="text-sm font-semibold text-accent-cyan-strong hover:underline">Ajukan penarikan →</Link>
          </div>
          <p className="text-sm text-text-secondary">
            Pendapatan bersih (70% dari penjualan setelah refund) dikurangi penarikan yang sudah
            diajukan atau dibayar. Jumlah yang bisa Anda ajukan adalah <strong className="font-semibold text-text-primary">Saldo Bisa Ditarik</strong>.
          </p>
          <div className="dash-grid">
            <StatCard
              className="col-span-12 sm:col-span-6 xl:col-span-4"
              label="Pendapatan Bersih (70%)"
              value={rupiah(data.netRevenue)}
              icon={Banknote}
              iconColor="#0077A8"
              iconBg="rgba(0,119,168,0.10)"
            />
            <StatCard
              className="col-span-12 sm:col-span-6 xl:col-span-4"
              label="Sudah Direfund"
              value={rupiah(data.refundedRevenue)}
              icon={Undo2}
              iconColor="#DC2626"
              iconBg="rgba(220,38,38,0.10)"
            />
            <StatCard
              className="col-span-12 sm:col-span-6 xl:col-span-4"
              label="Penarikan Terkomit"
              value={rupiah(data.committedPayouts)}
              icon={ArrowUpRight}
              iconColor="#D97706"
              iconBg="rgba(217,119,6,0.10)"
            />
          </div>
          {/* Owner decision (29 Jul 2026): the refund figure only needs a plain
              caption saying what it covers and that it is already settled — no
              per-refund list, no status filter. Stated for the other two figures
              as well so a trainer can reconstruct the arithmetic themselves
              instead of guessing why the withdrawable amount is lower. */}
          <dl className="flex flex-col gap-2 text-sm text-text-secondary">
            <div className="flex flex-col gap-0.5 sm:flex-row sm:gap-2">
              <dt className="font-semibold text-text-primary sm:min-w-[190px]">Pendapatan Bersih (70%)</dt>
              <dd>Bagian Anda dari penjualan yang sudah dibayar, setelah dikurangi refund.</dd>
            </div>
            <div className="flex flex-col gap-0.5 sm:flex-row sm:gap-2">
              <dt className="font-semibold text-text-primary sm:min-w-[190px]">Sudah Direfund</dt>
              <dd>Pengembalian dana yang <strong className="font-semibold text-text-primary">sudah selesai diproses</strong> dan sudah dipotong dari pendapatan bersih di atas. Tidak perlu tindakan dari Anda.</dd>
            </div>
            <div className="flex flex-col gap-0.5 sm:flex-row sm:gap-2">
              <dt className="font-semibold text-text-primary sm:min-w-[190px]">Penarikan Terkomit</dt>
              <dd>Penarikan yang sudah Anda ajukan — termasuk yang masih menunggu persetujuan — sehingga tidak bisa diajukan dua kali.</dd>
            </div>
          </dl>
        </section>
      )}

      {/* ── Pending payouts alert ── */}
      {data.pendingPayouts > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-[var(--radius-card)] border border-solid border-amber-200 bg-amber-50 p-4">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-amber-500/15 text-amber-600">
              <Clock size={18} aria-hidden="true" />
            </span>
            <div>
              <p className="text-sm font-medium text-amber-800">{data.pendingPayouts} permintaan penarikan menunggu konfirmasi</p>
              <p className="text-xs text-amber-600">Biasanya diproses dalam 1–3 hari kerja</p>
            </div>
          </div>
          <Link href="/trainer-hub/payout" className="text-xs font-medium text-amber-700 hover:underline">Lihat →</Link>
        </div>
      )}

      {/* ── Kursus Saya ── */}
      <section className="overflow-hidden rounded-[var(--radius-card)] border border-solid border-border-default bg-surface-card shadow-e1">
        <div className="flex items-center justify-between border-b border-solid border-border-default px-6 py-4">
          <h2 className="font-display text-lg font-bold text-text-primary">Kursus Saya</h2>
          <Link href="/trainer-hub/kursus" className="text-sm font-semibold text-accent-cyan-strong hover:underline">Lihat semua →</Link>
        </div>
        {data.courses.length === 0 ? (
          <div className="p-6">
            <EmptyState
              icon={BookOpen}
              title="Belum ada kursus"
              description="Mulai buat kursus pertama Anda!"
            />
          </div>
        ) : (
          <div className="divide-y divide-border-default">
            {data.courses.slice(0, 5).map((c) => (
              <div key={c.id} className="flex items-center justify-between px-6 py-4 transition-colors hover:bg-surface-page">
                <div>
                  <p className="text-sm font-medium text-text-primary">{c.title}</p>
                  <p className="mt-1 text-xs text-text-secondary">{c.enrollments} peserta · {rupiah(c.price)}</p>
                </div>
                <div className="flex items-center gap-3">
                  <Badge variant={c.status === "published" ? "success" : "neutral"} dot>
                    {c.status === "published" ? "Aktif" : "Draft"}
                  </Badge>
                  <Link href={`/trainer-hub/kursus/${c.id}`} className="text-xs text-accent-cyan-strong hover:underline">Analitik →</Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
