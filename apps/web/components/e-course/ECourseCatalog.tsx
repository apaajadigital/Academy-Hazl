"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowRight, BookOpen, Search, ChevronLeft, ChevronRight, X, AlertTriangle, Sparkles } from "lucide-react";
import { ProgramCard } from "@/components/ui/ProgramCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { MediaPlaceholder } from "@/components/shared/MediaPlaceholder";
import {
  fetchCourseCatalog,
  resolveCatalogState,
  type CatalogState,
} from "@/lib/e-course/catalog";

const PAGE_SIZE = 8;

// ─── Level filter options ──────────────────────────────────────────────────────

const LEVELS = [
  { value: "", label: "Semua Level" },
  { value: "beginner", label: "Pemula" },
  { value: "intermediate", label: "Menengah" },
  { value: "advanced", label: "Mahir" },
] as const;

// ─── Skeleton grid ─────────────────────────────────────────────────────────────

function SkeletonGrid() {
  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: PAGE_SIZE }).map((_, i) => (
        <div key={i} className="overflow-hidden rounded-[26px] border border-[#E7E9EC] bg-white p-0 shadow-sm animate-pulse">
          <div className="aspect-video w-full bg-[#EDEDF4]" />
          <div className="flex flex-col gap-3 p-5 sm:p-6">
            <div className="h-4 w-20 rounded-full bg-[#EDEDF4]" />
            <div className="h-5 w-full rounded bg-[#EDEDF4]" />
            <div className="h-4 w-2/3 rounded bg-[#EDEDF4]" />
            <div className="mt-4 flex items-center justify-between pt-4 border-t border-[#F0F2F5]">
              <div className="h-5 w-24 rounded bg-[#EDEDF4]" />
              <div className="h-8 w-16 rounded-full bg-[#EDEDF4]" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Pagination ────────────────────────────────────────────────────────────────

function Pagination({
  page,
  total,
  limit,
  onChange,
}: {
  page: number;
  total: number;
  limit: number;
  onChange: (p: number) => void;
}) {
  const totalPages = Math.ceil(total / limit);
  if (totalPages <= 1) return null;

  return (
    <div className="mt-12 flex items-center justify-center gap-2">
      <button
        id="ecourse-prev-page-btn"
        onClick={() => onChange(page - 1)}
        disabled={page <= 1}
        className="h-10 w-10 rounded-full border border-[#E7E9EC] bg-white text-[#5B616E] hover:border-[#0077A8] hover:text-[#0077A8] disabled:opacity-40 disabled:pointer-events-none transition-colors flex items-center justify-center shadow-xs"
        aria-label="Halaman sebelumnya"
      >
        <ChevronLeft size={16} aria-hidden="true" />
      </button>

      {Array.from({ length: totalPages }).map((_, i) => {
        const p = i + 1;
        const isActive = p === page;
        if (totalPages > 7 && Math.abs(p - page) > 2 && p !== 1 && p !== totalPages) {
          if (p === 2 || p === totalPages - 1) return <span key={p} className="px-2 text-sm text-[#9CA3AF]">…</span>;
          return null;
        }
        return (
          <button
            id={`ecourse-page-${p}-btn`}
            key={p}
            onClick={() => onChange(p)}
            className={`h-10 min-w-[2.5rem] px-3 rounded-full text-sm font-bold transition-all ${
              isActive
                ? "bg-[#0077A8] text-white shadow-sm"
                : "bg-white border border-[#E7E9EC] text-[#5B616E] hover:border-[#0077A8] hover:text-[#16181D]"
            }`}
            aria-current={isActive ? "page" : undefined}
          >
            {p}
          </button>
        );
      })}

      <button
        id="ecourse-next-page-btn"
        onClick={() => onChange(page + 1)}
        disabled={page >= totalPages}
        className="h-10 w-10 rounded-full border border-[#E7E9EC] bg-white text-[#5B616E] hover:border-[#0077A8] hover:text-[#0077A8] disabled:opacity-40 disabled:pointer-events-none transition-colors flex items-center justify-center shadow-xs"
        aria-label="Halaman berikutnya"
      >
        <ChevronRight size={16} aria-hidden="true" />
      </button>
    </div>
  );
}

// ─── Main catalog component ────────────────────────────────────────────────────

/**
 * Real catalog with search (debounced 350ms), level filter, and pagination.
 * Fetches from /api/courses with ?q=, ?level=, ?page=, ?limit= params.
 */
export function ECourseCatalog() {
  const [state, setState] = useState<CatalogState>({ kind: "loading" });
  const [page, setPage] = useState(1);
  const [query, setQuery] = useState("");
  const [level, setLevel] = useState("");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const requestIdRef = useRef(0);

  function fetchCourses(q: string, lvl: string, pg: number) {
    const id = ++requestIdRef.current;
    setState({ kind: "loading" });

    void fetchCourseCatalog({ q, level: lvl, page: pg, limit: PAGE_SIZE }).then((result) => {
      if (id !== requestIdRef.current) return; // superseded — drop it
      setState(resolveCatalogState(result));
    });
  }

  // Initial load
  useEffect(() => {
    fetchCourses(query, level, page);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Search debounce
  function handleSearch(q: string) {
    setQuery(q);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setPage(1);
      fetchCourses(q, level, 1);
    }, 350);
  }

  // Level filter
  function handleLevel(lvl: string) {
    setLevel(lvl);
    setPage(1);
    fetchCourses(query, lvl, 1);
  }

  // Pagination
  function handlePage(p: number) {
    setPage(p);
    fetchCourses(query, level, p);
    document.getElementById("ecourse-catalog")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <section id="ecourse-catalog" className="w-full bg-[#FAFAFC] py-16 sm:py-20 border-t border-[#F0F2F5]">
      <div className="max-w-[1440px] mx-auto px-6 lg:px-8">
        {/* Section Header */}
        <div className="mb-10 text-center max-w-3xl mx-auto">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-[#C8E6FF] bg-[#E8F6FF] px-3.5 py-1 text-xs font-bold uppercase tracking-[0.14em] text-[#0077A8]">
            <Sparkles size={13} className="text-[#0077A8]" />
            Jelajahi Katalog
          </span>
          <h2 className="mt-3 text-3xl sm:text-4xl font-extrabold tracking-tight text-[#16181D]">
            Koleksi Lengkap <span className="text-[#0077A8]">Kelas Video AI</span>
          </h2>
          <p className="mt-3 text-sm sm:text-base leading-relaxed text-[#5B616E]">
            Filter berdasarkan topik atau tingkat kemahiran untuk menemukan kurikulum yang pas untuk karyamu.
          </p>
        </div>

        {/* ── Search + filter bar ──────────────────────────────────────────────── */}
        <div className="mb-8 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 rounded-[24px] border border-[#E7E9EC] bg-white p-4 shadow-xs">
          {/* Search Input */}
          <div className="relative flex-1 max-w-md">
            <Search
              size={16}
              className="absolute left-4 top-1/2 -translate-y-1/2 text-[#707880]"
              aria-hidden="true"
            />
            <input
              id="ecourse-search-input"
              type="search"
              value={query}
              onChange={(e) => handleSearch(e.target.value)}
              placeholder="Cari kelas (e.g. Kling, Runway, Midjourney)..."
              className="w-full rounded-full border border-[#E7E9EC] bg-[#F9F9FB] pl-10 pr-9 py-2.5 text-sm text-[#16181D] placeholder-[#9CA3AF] focus:border-[#0077A8] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0077A8]/10 transition-all"
              aria-label="Cari kursus"
            />
            {query && (
              <button
                id="ecourse-search-clear-btn"
                onClick={() => handleSearch("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 text-[#9CA3AF] hover:text-[#16181D] transition-colors"
                aria-label="Hapus pencarian"
              >
                <X size={14} aria-hidden="true" />
              </button>
            )}
          </div>

          {/* Level Filter Pills */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold text-[#707880] uppercase tracking-wider hidden sm:inline mr-1">
              Level:
            </span>
            {LEVELS.map((l) => {
              const isActive = level === l.value;
              return (
                <button
                  id={`ecourse-level-${l.value || "all"}-btn`}
                  key={l.value}
                  onClick={() => handleLevel(l.value)}
                  className={`rounded-full px-4 py-2 text-xs font-bold transition-all ${
                    isActive
                      ? "bg-[#25252A] text-white shadow-sm"
                      : "bg-[#F3F3FA] text-[#5B616E] hover:bg-[#E8E7EF] hover:text-[#16181D]"
                  }`}
                  aria-pressed={isActive}
                >
                  {l.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Results count — only when we actually have a list to count. */}
        {state.kind === "list" && (
          <div className="mb-6 flex items-center justify-between text-xs sm:text-sm text-[#5B616E]">
            <p>
              Menampilkan <span className="font-bold text-[#16181D]">{state.total} kelas terverifikasi</span>
              {query && <span> untuk &ldquo;{query}&rdquo;</span>}
              {level && <span> • level {LEVELS.find((l) => l.value === level)?.label}</span>}
            </p>
          </div>
        )}

        {/* ── Grid ─────────────────────────────────────────────────────────────── */}
        {state.kind === "loading" ? (
          <SkeletonGrid />
        ) : state.kind === "error" ? (
          <EmptyState
            icon={AlertTriangle}
            title="Gagal memuat katalog kelas"
            description="Terjadi gangguan saat mengambil daftar kelas video AI. Silakan coba muat ulang halaman."
            action={
              <button
                id="ecourse-retry-btn"
                onClick={() => fetchCourses(query, level, page)}
                className="h-10 px-6 rounded-full bg-[#0077A8] text-white font-bold text-sm hover:bg-[#0D5B8A] transition-colors shadow-sm"
              >
                Muat Ulang
              </button>
            }
          />
        ) : state.kind === "empty" ? (
          <EmptyState
            icon={BookOpen}
            title={query ? `Tidak ada hasil untuk "${query}"` : "Belum ada kelas tersedia"}
            description={
              query
                ? "Coba kata kunci lain atau hapus filter level yang aktif."
                : "Katalog kelas sedang diperbarui. Kelas baru akan segera tampil di sini."
            }
            action={
              query ? (
                <button
                  onClick={() => handleSearch("")}
                  className="h-10 px-6 rounded-full border border-[#E7E9EC] bg-white text-[#16181D] font-bold text-sm hover:bg-[#F6F7F9] transition-colors"
                >
                  Hapus Pencarian
                </button>
              ) : (
                <Link
                  href="/early-access"
                  className="h-10 px-6 rounded-full bg-[#0077A8] text-white font-bold text-sm inline-flex items-center gap-2 hover:bg-[#0D5B8A] transition-colors shadow-sm"
                >
                  <span>Gabung Early Access</span>
                  <ArrowRight size={15} aria-hidden="true" />
                </Link>
              )
            }
          />
        ) : (
          <>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {state.courses.map((course) => {
                const rating = Number(course.avgRating ?? 0);
                const hours = course.totalDuration ? Math.round(course.totalDuration / 60) : 0;
                const displayPrice = course.price !== undefined && course.price !== null
                  ? course.price === 0
                    ? "Gratis"
                    : `Rp ${Number(course.salePrice ?? course.price).toLocaleString("id-ID")}`
                  : undefined;
                const displayOldPrice = course.salePrice && course.price && course.salePrice < course.price
                  ? `Rp ${Number(course.price).toLocaleString("id-ID")}`
                  : undefined;

                return (
                  <ProgramCard
                    key={course.id}
                    href={`/e-course/kelas/${course.slug}`}
                    title={course.title}
                    description={
                      course.trainer?.name
                        ? `Kreator: ${course.trainer.name}`
                        : (course.shortDesc ?? undefined)
                    }
                    unitLabel={course.category?.name ?? "Video AI"}
                    unitIcon={Sparkles}
                    price={displayPrice}
                    oldPrice={displayOldPrice}
                    media={
                      course.thumbnailUrl ? (
                        <div className="relative aspect-video w-full">
                          <Image
                            src={course.thumbnailUrl}
                            alt={course.title}
                            fill
                            sizes="(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw"
                            className="object-cover"
                          />
                        </div>
                      ) : (
                        <MediaPlaceholder type="foto" ratio="16:9" showRatio={false} />
                      )
                    }
                    meta={{
                      rating: rating > 0 ? rating : undefined,
                      level: course.level ?? undefined,
                      duration: hours > 0 ? `${hours} jam` : undefined,
                      count: (course.totalEnrolled ?? 0) > 0 ? `${course.totalEnrolled} peserta` : undefined,
                    }}
                  />
                );
              })}
            </div>

            <Pagination page={page} total={state.total} limit={PAGE_SIZE} onChange={handlePage} />
          </>
        )}
      </div>
    </section>
  );
}
