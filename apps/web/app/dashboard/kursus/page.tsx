"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Search, X, Plus, ArrowRight, User, CheckCircle2, BookOpen, Loader2 } from "lucide-react";
import { getMyEnrollments, type Enrollment } from "../../../lib/api/enrollment";
import { MediaPlaceholder } from "@/components/shared/MediaPlaceholder";
import { EmptyState } from "@/components/ui/EmptyState";
import { cn } from "@/lib/utils";
import { getValidToken } from "@/lib/auth/token";

type SortOption = "terbaru" | "terlama" | "progres-tinggi" | "progres-rendah" | "a-z";
type FilterStatus = "semua" | "belajar" | "selesai" | "belum-mulai";

export default function KursusSayaPage() {
  const router = useRouter();
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<SortOption>("terbaru");
  const [filter, setFilter] = useState<FilterStatus>("semua");

  useEffect(() => {
    // Finding #1: read token via getValidToken so a session persisted only in
    // localStorage (new tab / restore) is honored instead of bouncing to /masuk.
    (async () => {
      const token = await getValidToken();
      if (!token) { router.replace("/masuk"); return; }

      getMyEnrollments(token)
        .then(setEnrollments)
        .catch((e) => setError(e.message))
        .finally(() => setLoading(false));
    })();
  }, [router]);

  const filtered = useMemo(() => {
    let list = [...enrollments];

    // Filter by status
    if (filter === "selesai") list = list.filter((e) => e.isCompleted);
    else if (filter === "belajar") list = list.filter((e) => !e.isCompleted && Number(e.progressPct) > 0);
    else if (filter === "belum-mulai") list = list.filter((e) => Number(e.progressPct) === 0);

    // Search
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (e) =>
          e.course.title.toLowerCase().includes(q) ||
          (e.course.trainer?.name ?? "").toLowerCase().includes(q)
      );
    }

    // Sort
    switch (sort) {
      case "terbaru":
        list.sort((a, b) => new Date(b.enrolledAt).getTime() - new Date(a.enrolledAt).getTime());
        break;
      case "terlama":
        list.sort((a, b) => new Date(a.enrolledAt).getTime() - new Date(b.enrolledAt).getTime());
        break;
      case "progres-tinggi":
        list.sort((a, b) => Number(b.progressPct) - Number(a.progressPct));
        break;
      case "progres-rendah":
        list.sort((a, b) => Number(a.progressPct) - Number(b.progressPct));
        break;
      case "a-z":
        list.sort((a, b) => a.course.title.localeCompare(b.course.title, "id"));
        break;
    }

    return list;
  }, [enrollments, filter, search, sort]);

  const stats = useMemo(() => ({
    total: enrollments.length,
    selesai: enrollments.filter((e) => e.isCompleted).length,
    belajar: enrollments.filter((e) => !e.isCompleted && Number(e.progressPct) > 0).length,
    belumMulai: enrollments.filter((e) => Number(e.progressPct) === 0).length,
  }), [enrollments]);

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="animate-spin text-accent-cyan-strong" size={32} aria-hidden="true" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-extrabold text-text-primary">Kursus Saya</h1>
          <p className="mt-1 text-sm text-text-secondary">{enrollments.length} kursus terdaftar</p>
        </div>
        <Link href="/e-course" className="btn btn-primary btn-sm">
          <Plus size={16} aria-hidden="true" /> Tambah Kursus
        </Link>
      </div>

      {/* Mini stats */}
      <div className="flex flex-wrap gap-2">
        {[
          { label: "Total", value: stats.total, color: "#0077A8" },
          { label: "Selesai", value: stats.selesai, color: "#22C55E" },
          { label: "Berlangsung", value: stats.belajar, color: "#F59E0B" },
          { label: "Belum Mulai", value: stats.belumMulai, color: "#9CA3AF" },
        ].map((s) => (
          <div
            key={s.label}
            className="flex min-w-[80px] flex-col items-center rounded-[var(--radius-md)] border border-border-default bg-surface-card px-5 py-3 shadow-e1"
          >
            <span className="text-xl font-extrabold" style={{ color: s.color }}>{s.value}</span>
            <span className="mt-0.5 text-[11px] font-medium text-text-secondary">{s.label}</span>
          </div>
        ))}
      </div>

      {/* Filter & Search bar */}
      <div className="flex flex-wrap items-center gap-2.5">
        {/* Search */}
        <div className="relative min-w-[200px] flex-1">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted" size={16} aria-hidden="true" />
          <input
            type="text"
            placeholder="Cari kursus atau mentor..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-[var(--radius-md)] border border-border-strong bg-surface-card py-2.5 pl-10 pr-9 text-sm text-text-primary outline-none transition-[border-color,box-shadow] focus:border-accent-cyan-strong focus:ring-2 focus:ring-accent-cyan-strong/20"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary"
              aria-label="Bersihkan pencarian"
            >
              <X size={15} aria-hidden="true" />
            </button>
          )}
        </div>

        {/* Sort */}
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as SortOption)}
          className="rounded-[var(--radius-md)] border border-border-strong bg-surface-card px-3.5 py-2.5 text-sm text-text-primary outline-none focus:border-accent-cyan-strong"
          aria-label="Urutkan"
        >
          <option value="terbaru">Terbaru Didaftar</option>
          <option value="terlama">Terlama Didaftar</option>
          <option value="progres-tinggi">Progres Tertinggi</option>
          <option value="progres-rendah">Progres Terendah</option>
          <option value="a-z">A → Z</option>
        </select>
      </div>

      {/* Filter tabs */}
      <div className="flex flex-wrap items-center gap-6 border-b border-border-default">
        {(["semua", "belajar", "selesai", "belum-mulai"] as FilterStatus[]).map((f) => {
          const labels = { semua: "Semua", belajar: "Berlangsung", selesai: "Selesai", "belum-mulai": "Belum Mulai" };
          const active = filter === f;
          return (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                "-mb-px border-b-2 pb-3 text-sm font-semibold transition-colors",
                active
                  ? "border-accent-cyan-strong text-accent-cyan-strong"
                  : "border-transparent text-text-secondary hover:text-text-primary"
              )}
            >
              {labels[f]}
            </button>
          );
        })}
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-[var(--radius-md)] border border-red-200 bg-red-50 px-4 py-3.5 text-sm text-red-600">
          {error}
        </div>
      )}

      {/* Empty */}
      {!loading && filtered.length === 0 && (
        <EmptyState
          icon={enrollments.length === 0 ? BookOpen : Search}
          title={enrollments.length === 0 ? "Belum ada kursus" : "Tidak ada hasil"}
          description={
            enrollments.length === 0
              ? "Mulai belajar dengan mendaftar kursus pertama Anda."
              : "Coba ubah kata kunci pencarian atau filter."
          }
          action={
            enrollments.length === 0 ? (
              <Link href="/e-course" className="btn btn-primary btn-sm">Jelajahi Kursus</Link>
            ) : undefined
          }
        />
      )}

      {/* Course grid */}
      {filtered.length > 0 && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((e) => {
            const pct = Number(e.progressPct);
            const levelColor = {
              pemula: "#22C55E",
              menengah: "#F59E0B",
              mahir: "#EF4444",
            }[e.course.level?.toLowerCase() ?? ""] ?? "#9CA3AF";

            return (
              <Link
                key={e.id}
                href={`/belajar/${e.course.slug}`}
                className="group flex flex-col overflow-hidden rounded-2xl border border-border-default bg-surface-card shadow-e1 transition-all hover:-translate-y-1 hover:shadow-e3"
              >
                {/* Thumbnail */}
                <div className="relative aspect-video overflow-hidden bg-surface-sunken">
                  {e.course.thumbnailUrl ? (
                    <Image src={e.course.thumbnailUrl} alt={e.course.title} fill sizes="(min-width: 768px) 33vw, 100vw" className="object-cover" />
                  ) : (
                    <MediaPlaceholder type="foto" ratio="16:9" showRatio={false} className="!absolute !inset-0 !h-full !rounded-none !border-0" />
                  )}
                  {/* Level badge */}
                  {e.course.level && (
                    <span className="absolute left-2.5 top-2.5 rounded-full px-2 py-0.5 text-[10px] font-bold capitalize text-white" style={{ background: levelColor }}>
                      {e.course.level}
                    </span>
                  )}
                  {/* Status overlay */}
                  {e.isCompleted && (
                    <div className="absolute inset-0 flex items-center justify-center bg-green-500/15">
                      <span className="inline-flex items-center gap-1 rounded-full bg-green-500 px-3 py-1.5 text-[13px] font-bold text-white">
                        <CheckCircle2 size={14} aria-hidden="true" /> Selesai
                      </span>
                    </div>
                  )}
                </div>

                <div className="flex flex-1 flex-col gap-1.5 p-4">
                  <p className="line-clamp-2 text-[13px] font-bold leading-snug text-text-primary transition-colors group-hover:text-accent-cyan-strong">
                    {e.course.title}
                  </p>
                  {e.course.trainer && (
                    <p className="inline-flex items-center gap-1 text-[11px] text-text-secondary">
                      <User size={12} aria-hidden="true" /> {e.course.trainer.name}
                    </p>
                  )}

                  {/* Progress */}
                  <div className="mt-1">
                    <div className="mb-1 flex items-center justify-between">
                      <span className="text-[11px] text-text-muted">Progres Belajar</span>
                      <span className="text-[11px] font-bold" style={{ color: pct === 100 ? "#22C55E" : "#0077A8" }}>
                        {pct}%
                      </span>
                    </div>
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-[#E5E5EA]">
                      <div
                        className="h-full rounded-full transition-[width] duration-500"
                        style={{
                          width: `${pct}%`,
                          background: pct === 100
                            ? "linear-gradient(90deg, #22C55E, #16a34a)"
                            : "linear-gradient(90deg, #0077A8, #00a8d9)",
                        }}
                      />
                    </div>
                  </div>

                  {/* Enrolled date */}
                  <p className="mt-auto text-[10px] text-[#C0C0C7]">
                    Terdaftar {new Date(e.enrolledAt).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}
                  </p>

                  <div className="mt-2.5 inline-flex items-center gap-1 border-t border-border-subtle pt-2.5 text-xs font-semibold text-accent-cyan-strong">
                    {e.isCompleted ? "Lihat Kembali" : pct > 0 ? "Lanjut Belajar" : "Mulai Belajar"}
                    <ArrowRight size={14} aria-hidden="true" />
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
