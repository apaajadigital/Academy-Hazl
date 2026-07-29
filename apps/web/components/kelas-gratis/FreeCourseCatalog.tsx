"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { BookOpen, ArrowRight } from "lucide-react";
import { Section, SectionHeader } from "@/components/ui/Section";
import { ProgramCard } from "@/components/ui/ProgramCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { MediaPlaceholder } from "@/components/shared/MediaPlaceholder";
import { Reveal } from "@/components/ui/Reveal";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

type Course = {
  id: string;
  slug: string;
  title: string;
  shortDesc?: string | null;
  price: string | number;
  salePrice?: string | number | null;
  level?: string | null;
  avgRating?: number | string;
  totalEnrolled?: number;
  totalDuration?: number;
  thumbnailUrl?: string | null;
  trainer?: { name?: string } | null;
};

const CATALOG_SIZE = 8;

/**
 * A course is only advertised as free when its list price AND any sale price
 * are zero — the same rule the API applies for `free=true`.
 *
 * This mirrors a server-side filter on purpose: it is a safety net for the
 * window in which a freshly deployed web build talks to an API that predates
 * the `free` param and therefore ignores it. Without it that API would answer
 * with the whole catalog and every paid course would render a "GRATIS" badge.
 */
function isFree(course: Course): boolean {
  const salePrice = course.salePrice != null ? Number(course.salePrice) : null;
  return Number(course.price) === 0 && (salePrice === null || salePrice === 0);
}

/**
 * Fetches free courses from the API (BL-52: filtered in SQL, not client-side)
 * and falls back gracefully with EmptyState when there are none.
 */
export function FreeCourseCatalog() {
  const [courses, setCourses] = useState<Course[] | null>(null);

  useEffect(() => {
    fetch(`${API}/api/courses?free=true&limit=${CATALOG_SIZE}`)
      .then((r) => r.json())
      .then((d) => {
        if (d?.success) {
          const raw: Course[] = Array.isArray(d.data?.data)
            ? d.data.data
            : Array.isArray(d.data)
            ? d.data
            : [];

          setCourses(raw.filter(isFree));
        } else {
          setCourses([]);
        }
      })
      .catch(() => setCourses([]));
  }, []);

  return (
    <Section tone="sunken" id="kelas-gratis-catalog">
      <SectionHeader
        eyebrow="Mulai Gratis"
        title={
          <>
            Kelas yang bisa kamu{" "}
            <span className="text-accent">akses sekarang</span>
          </>
        }
        lede="Tidak perlu bayar — pilih kelas di bawah dan langsung mulai belajar."
        action={
          <Link href="/e-course" className="btn btn-ghost btn-sm gap-1">
            Semua kursus <ArrowRight size={14} aria-hidden="true" />
          </Link>
        }
      />

      {courses === null ? (
        /* Skeleton */
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="card overflow-hidden !p-0">
              <div className="skeleton aspect-video !rounded-none" />
              <div className="flex flex-col gap-2.5 p-5">
                <div className="skeleton h-3 w-16" />
                <div className="skeleton h-4 w-full" />
                <div className="skeleton h-4 w-2/3" />
              </div>
            </div>
          ))}
        </div>
      ) : courses.length === 0 ? (
        <EmptyState
          icon={BookOpen}
          title="Kelas gratis segera hadir"
          description="Kami sedang menyiapkan materi gratis terbaik untukmu. Sementara itu, daftar lewat form di atas agar kami kabari saat kelas gratis tersedia."
          action={
            <Link href="/e-course" className="btn btn-outline">
              Lihat Semua Kursus
              <ArrowRight size={16} aria-hidden="true" />
            </Link>
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {courses.slice(0, CATALOG_SIZE).map((course, i) => {
            const rating = Number(course.avgRating ?? 0);
            const hours = course.totalDuration ? Math.round(course.totalDuration / 60) : 0;
            return (
              <Reveal key={course.id} delay={(i % 4) * 0.05}>
                <div className="relative h-full">
                  {/* Free badge overlay */}
                  <span
                    className="absolute right-3 top-3 z-10 rounded-full px-2.5 py-0.5 text-xs font-bold"
                    style={{
                      background: "#16A34A",
                      color: "#fff",
                      boxShadow: "0 2px 6px rgba(22,163,74,0.35)",
                    }}
                  >
                    GRATIS
                  </span>
                  <ProgramCard
                    /* BL-51: /kursus/<slug> is a legacy path that only resolves
                       through a 308 redirect in next.config.js. Courses have no
                       detail page — /checkout/<slug> is the canonical course
                       landing across the app (see ECourseCatalog, kelas-privat),
                       and it fulfils a Rp 0 course without touching DOKU. */
                    href={`/checkout/${course.slug}`}
                    title={course.title}
                    description={course.trainer?.name ? `Bersama ${course.trainer.name}` : (course.shortDesc ?? undefined)}
                    unitLabel="Kelas Gratis"
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
                      count:
                        (course.totalEnrolled ?? 0) > 0
                          ? `${course.totalEnrolled} peserta`
                          : undefined,
                    }}
                  />
                </div>
              </Reveal>
            );
          })}
        </div>
      )}
    </Section>
  );
}
