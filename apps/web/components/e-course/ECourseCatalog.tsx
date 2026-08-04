"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowRight, BookOpen, Search, ChevronLeft, ChevronRight, X } from "lucide-react";
import { Section, SectionHeader } from "@/components/ui/Section";
import { ProgramCard } from "@/components/ui/ProgramCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { MediaPlaceholder } from "@/components/shared/MediaPlaceholder";
import { API_BASE as API } from "@/lib/api/base";

const PAGE_SIZE = 8;

type Course = {
  id: string;
  slug: string;
  title: string;
  shortDesc?: string | null;
  level?: string | null;
  avgRating?: number | string;
  totalReviews?: number;
  totalEnrolled?: number;
  totalDuration?: number;
  thumbnailUrl?: string | null;
  trainer?: { name?: string; avatarUrl?: string | null } | null;
  category?: { slug?: string; name?: string } | null;
};

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
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: PAGE_SIZE }).map((_, i) => (
        <div key={i} className="card overflow-hidden !p-0">
          <div className="skeleton aspect-video !rounded-none" />
          <div className="flex flex-col gap-2.5 p-5">
            <div className="skeleton h-3 w-16" />
            <div className="skeleton h-4 w-full" />
            <div className="skeleton h-4 w-2/3" />
            <div className="skeleton mt-2 h-3 w-1/2" />
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
    <div className="mt-10 flex items-center justify-center gap-2">
      <button
        id="ecourse-prev-page-btn"
        onClick={() => onChange(page - 1)}
        disabled={page <= 1}
        className="btn btn-ghost btn-sm"
        aria-label="Halaman sebelumnya"
      >
        <ChevronLeft size={16} aria-hidden="true" />
      </button>

      {Array.from({ length: totalPages }).map((_, i) => {
        const p = i + 1;
        const isActive = p === page;
        if (totalPages > 7 && Math.abs(p - page) > 2 && p !== 1 && p !== totalPages) {
          if (p === 2 || p === totalPages - 1) return <span key={p} className="text-sm" style={{ color: "var(--text-muted)" }}>…</span>;
          return null;
        }
        return (
          <button
            id={`ecourse-page-${p}-btn`}
            key={p}
            onClick={() => onChange(p)}
            className="btn btn-sm min-w-[2.25rem]"
            style={
              isActive
                ? { background: "var(--brand-cyan)", color: "var(--text-on-accent)", border: "none" }
                : { background: "var(--surface-card)", color: "var(--text-secondary)", border: "1px solid var(--border-default)" }
            }
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
        className="btn btn-ghost btn-sm"
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
  const [courses, setCourses] = useState<Course[] | null>(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [query, setQuery] = useState("");
  const [level, setLevel] = useState("");
  const [loading, setLoading] = useState(true);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function fetchCourses(q: string, lvl: string, pg: number) {
    setLoading(true);
    const qs = new URLSearchParams({ limit: String(PAGE_SIZE), page: String(pg) });
    if (q) qs.set("q", q);
    if (lvl) qs.set("level", lvl);

    fetch(`${API}/api/courses?${qs}`)
      .then((r) => r.json())
      .then((d) => {
        if (d?.success) {
          const result = d.data;
          // API returns { data: Course[], total, page, limit }
          if (Array.isArray(result?.data)) {
            setCourses(result.data);
            setTotal(result.total ?? 0);
          } else if (Array.isArray(result)) {
            setCourses(result);
            setTotal(result.length);
          } else {
            setCourses([]);
            setTotal(0);
          }
        } else {
          setCourses([]);
          setTotal(0);
        }
      })
      .catch(() => { setCourses([]); setTotal(0); })
      .finally(() => setLoading(false));
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
    // Scroll to top of section smoothly
    document.getElementById("ecourse-catalog")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <Section id="ecourse-catalog">
      <SectionHeader
        eyebrow="Katalog"
        title={
          <>
            Materi <span className="text-accent">terkurasi</span> untukmu
          </>
        }
        lede="Dirancang instruktur berpengalaman — pilih yang sesuai tujuan kariermu."
      />

      {/* ── Search + filter bar ──────────────────────────────────────────────── */}
      <div className="mb-7 flex flex-wrap gap-3">
        {/* Search */}
        <div className="relative flex-1" style={{ minWidth: "200px", maxWidth: "360px" }}>
          <Search
            size={15}
            className="absolute left-3 top-1/2 -translate-y-1/2"
            style={{ color: "var(--text-muted)" }}
            aria-hidden="true"
          />
          <input
            id="ecourse-search-input"
            type="search"
            value={query}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder="Cari kursus..."
            className="input-dark w-full pl-9 pr-8"
            aria-label="Cari kursus"
          />
          {query && (
            <button
              id="ecourse-search-clear-btn"
              onClick={() => handleSearch("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-full p-0.5 transition-colors hover:bg-[var(--border-subtle)]"
              aria-label="Hapus pencarian"
            >
              <X size={14} style={{ color: "var(--text-muted)" }} aria-hidden="true" />
            </button>
          )}
        </div>

        {/* Level filter */}
        <div className="flex flex-wrap gap-2">
          {LEVELS.map((l) => (
            <button
              id={`ecourse-level-${l.value || "all"}-btn`}
              key={l.value}
              onClick={() => handleLevel(l.value)}
              className="btn btn-sm"
              style={
                level === l.value
                  ? { background: "var(--brand-cyan)", color: "var(--text-on-accent)", border: "none" }
                  : { background: "var(--surface-card)", color: "var(--text-secondary)", border: "1px solid var(--border-default)" }
              }
              aria-pressed={level === l.value}
            >
              {l.label}
            </button>
          ))}
        </div>
      </div>

      {/* Results count */}
      {!loading && courses !== null && (
        <p className="mb-5 text-sm" style={{ color: "var(--text-muted)" }}>
          {total > 0 ? `${total} kursus ditemukan` : ""}
          {query && ` untuk "${query}"`}
          {level && ` — level ${LEVELS.find((l) => l.value === level)?.label}`}
        </p>
      )}

      {/* ── Grid ─────────────────────────────────────────────────────────────── */}
      {loading ? (
        <SkeletonGrid />
      ) : courses === null || courses.length === 0 ? (
        <EmptyState
          icon={BookOpen}
          title={query ? `Tidak ada hasil untuk "${query}"` : "Katalog kursus segera hadir"}
          description={
            query
              ? "Coba kata kunci lain atau hapus filter yang aktif."
              : "Kami sedang menyiapkan materi terbaik untukmu. Gabung early access agar jadi yang pertama tahu saat rilis."
          }
          action={
            query ? (
              <button onClick={() => handleSearch("")} className="btn btn-outline">
                Hapus Pencarian
              </button>
            ) : (
              <Link href="/early-access" className="btn btn-primary">
                Gabung Early Access
                <ArrowRight size={16} aria-hidden="true" />
              </Link>
            )
          }
        />
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {courses.map((course) => {
              const rating = Number(course.avgRating ?? 0);
              const hours = course.totalDuration ? Math.round(course.totalDuration / 60) : 0;
              return (
                <ProgramCard
                  key={course.id}
                  href={`/checkout/${course.slug}`}
                  title={course.title}
                  description={course.trainer?.name ? `Bersama ${course.trainer.name}` : (course.shortDesc ?? undefined)}
                  unitLabel="E-Course"
                  unitIcon={BookOpen}
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

          <Pagination page={page} total={total} limit={PAGE_SIZE} onChange={handlePage} />
        </>
      )}
    </Section>
  );
}
