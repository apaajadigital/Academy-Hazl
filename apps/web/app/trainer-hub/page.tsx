"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { BookOpen, Users, CreditCard, Wallet, Clock, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui";
import { EmptyState } from "@/components/ui/EmptyState";
import { cn } from "@/lib/utils";
import { getValidToken } from "@/lib/auth/token";

type DashboardData = {
  totalCourses: number;
  publishedCourses: number;
  totalEnrollments: number;
  totalRevenue: number;
  netRevenue: number;
  pendingPayouts: number;
  courses: { id: string; title: string; status: string; price: number; enrollments: number }[];
};

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
      <div className="flex min-h-screen items-center justify-center bg-surface-page">
        <Loader2 className="animate-spin text-accent-cyan-strong" size={32} aria-hidden="true" />
      </div>
    );
  }
  if (error) return <div className="flex min-h-screen items-center justify-center bg-surface-page text-red-600">{error}</div>;
  if (!data) return null;

  const stats: { label: string; value: string | number; sub?: string; highlight?: boolean; Icon: LucideIcon; wrap: string }[] = [
    { label: "Total Kursus", value: data.totalCourses, sub: `${data.publishedCourses} dipublikasikan`, Icon: BookOpen, wrap: "bg-surface-accent-soft text-accent-cyan-strong" },
    { label: "Total Peserta", value: data.totalEnrollments.toLocaleString("id-ID"), Icon: Users, wrap: "bg-accent-purple/10 text-accent-purple" },
    { label: "Pendapatan Kotor", value: `Rp ${data.totalRevenue.toLocaleString("id-ID")}`, Icon: CreditCard, wrap: "bg-green-600/10 text-green-600" },
    { label: "Pendapatan Bersih (70%)", value: `Rp ${data.netRevenue.toLocaleString("id-ID")}`, highlight: true, Icon: Wallet, wrap: "" },
  ];

  return (
    <div className="min-h-screen bg-surface-page">
      <div className="border-b border-border-default bg-surface-card px-6 py-4">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="font-display text-xl font-bold text-text-primary">Trainer Hub</h1>
            <p className="mt-0.5 text-sm text-text-secondary">Kelola kursus, pantau penjualan, tarik saldo</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link href="/trainer-hub/profil" className="btn btn-ghost btn-sm">Edit Profil</Link>
            <Link href="/trainer-hub/ulasan" className="btn btn-ghost btn-sm">Ulasan Siswa</Link>
            <Link href="/trainer-hub/payout" className="btn btn-outline btn-sm">Tarik Saldo</Link>
            <Link href="/trainer-hub/kursus" className="btn btn-primary btn-sm">Kelola Kursus</Link>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-6xl p-6">
        <div className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
          {stats.map(({ label, value, sub, highlight, Icon, wrap }) => (
            <div
              key={label}
              className={cn(
                "flex flex-col gap-3 rounded-[var(--radius-lg)] border p-5 shadow-e1",
                highlight ? "border-transparent bg-brand-gradient text-white" : "border-border-default bg-surface-card",
              )}
            >
              <span className={cn("flex h-10 w-10 items-center justify-center rounded-lg", highlight ? "bg-white/20 text-white" : wrap)}>
                <Icon size={20} aria-hidden="true" />
              </span>
              <div>
                <p className={cn("text-xs font-medium", highlight ? "text-white/80" : "text-text-secondary")}>{label}</p>
                <p className={cn("mt-1 font-display text-2xl font-bold", highlight ? "text-white" : "text-text-primary")}>{value}</p>
                {sub && <p className={cn("mt-1 text-xs", highlight ? "text-white/80" : "text-text-secondary")}>{sub}</p>}
              </div>
            </div>
          ))}
        </div>

        {data.pendingPayouts > 0 && (
          <div className="mb-6 flex items-center justify-between rounded-[var(--radius-lg)] border border-amber-200 bg-amber-50 p-4">
            <div className="flex items-center gap-3">
              <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-amber-500/15 text-amber-600">
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

        <div className="overflow-hidden rounded-[var(--radius-lg)] border border-border-default bg-surface-card shadow-e1">
          <div className="flex items-center justify-between border-b border-border-default px-6 py-4">
            <h2 className="font-display font-semibold text-text-primary">Kursus Saya</h2>
            <Link href="/trainer-hub/kursus" className="text-sm text-accent-cyan-strong hover:underline">Lihat semua →</Link>
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
                    <p className="mt-0.5 text-xs text-text-secondary">{c.enrollments} peserta · Rp {c.price.toLocaleString("id-ID")}</p>
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
        </div>
      </div>
    </div>
  );
}
