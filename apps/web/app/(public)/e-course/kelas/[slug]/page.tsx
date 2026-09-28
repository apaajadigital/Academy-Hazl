"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import {
  ArrowLeft,
  ChevronDown,
  Clock,
  PlayCircle,
  FileText,
  HelpCircle,
  Users,
  Star,
  ExternalLink,
} from "lucide-react";
import { getApiBase } from "@/lib/api/base";
import { MediaPlaceholder } from "@/components/shared/MediaPlaceholder";

// ─── Types (mirrors the `getCourseBySlug` select in courseService.ts) ─────────

type Lesson = {
  id: string;
  title: string;
  type: string;
  duration: number;
  isPreview: boolean;
  sortOrder: number;
};

type Section = {
  id: string;
  title: string;
  sortOrder: number;
  lessons: Lesson[];
};

type CourseDetail = {
  id: string;
  slug: string;
  title: string;
  shortDesc?: string | null;
  description?: string | null;
  level?: string | null;
  thumbnailUrl?: string | null;
  totalDuration: number;
  totalEnrolled: number;
  avgRating?: number | string;
  totalReviews: number;
  /** Prisma Decimal serializes to a numeric string over JSON, not a number. */
  price: number | string;
  salePrice?: number | string | null;
  category?: { name?: string } | null;
  trainer?: { id?: string; name?: string; avatarUrl?: string | null } | null;
  sections: Section[];
};

function formatRp(amount: number) {
  return amount === 0 ? "Gratis" : `Rp${amount.toLocaleString("id-ID")}`;
}

const LESSON_ICON: Record<string, typeof PlayCircle> = {
  video: PlayCircle,
  text: FileText,
  quiz: HelpCircle,
};

function CurriculumSection({ section, defaultOpen }: { section: Section; defaultOpen: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border-b border-[#E7E9EC] last:border-b-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-4 py-4 text-left"
      >
        <span className="text-sm font-bold text-[#16181D]">{section.title}</span>
        <span className="flex shrink-0 items-center gap-3 text-xs text-[#707880]">
          {section.lessons.length} video
          <ChevronDown
            size={16}
            aria-hidden="true"
            className={`transition-transform ${open ? "rotate-180 text-[#0077A8]" : ""}`}
          />
        </span>
      </button>
      {open && (
        <ul className="pb-4 pl-1">
          {section.lessons.map((lesson) => {
            const Icon = LESSON_ICON[lesson.type] ?? PlayCircle;
            return (
              <li
                key={lesson.id}
                className="flex items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-sm text-[#5B616E] hover:bg-[#FAFAFC]"
              >
                <span className="flex items-center gap-2.5 min-w-0">
                  <Icon size={15} className="shrink-0 text-[#9CA3AF]" aria-hidden="true" />
                  <span className="truncate">{lesson.title}</span>
                  {lesson.isPreview && (
                    <span className="shrink-0 rounded-full bg-[#E8F6FF] px-2 py-0.5 text-[10px] font-bold text-[#0077A8]">
                      Preview
                    </span>
                  )}
                </span>
                {lesson.duration > 0 && (
                  <span className="shrink-0 text-xs text-[#9CA3AF]">
                    {Math.round(lesson.duration / 60)} mnt
                  </span>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

export default function CourseDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const [course, setCourse] = useState<CourseDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let ignore = false;
    setLoading(true);
    setError(null);
    fetch(`${getApiBase()}/api/courses/${slug}`)
      .then((r) => r.json())
      .then((body) => {
        if (ignore) return;
        if (!body.success || !body.data) {
          setError("Kelas tidak ditemukan.");
          return;
        }
        setCourse(body.data);
      })
      .catch(() => {
        if (!ignore) setError("Gagal memuat data kelas. Coba lagi.");
      })
      .finally(() => {
        if (!ignore) setLoading(false);
      });
    return () => {
      ignore = true;
    };
  }, [slug]);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <span
          className="h-8 w-8 rounded-full border-2 border-[#0077A8] border-t-transparent animate-spin"
          aria-label="Memuat kelas…"
        />
      </div>
    );
  }

  if (error || !course) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 p-6 text-center">
        <p className="font-semibold text-[#16181D]">{error ?? "Kelas tidak ditemukan."}</p>
        <Link href="/e-course" className="text-sm font-bold text-[#0077A8] hover:underline">
          ← Kembali ke katalog
        </Link>
      </div>
    );
  }

  const totalVideos = course.sections.reduce((n, s) => n + s.lessons.length, 0);
  const hours = course.totalDuration > 0 ? Math.round(course.totalDuration / 60) : 0;
  const basePrice = Number(course.price);
  const salePrice = course.salePrice != null ? Number(course.salePrice) : null;
  const price = salePrice ?? basePrice;
  const rating = Number(course.avgRating ?? 0);

  return (
    <div className="w-full bg-white py-8 sm:py-12 border-b border-[#E7E9EC]">
      <div className="max-w-[1200px] mx-auto px-6 lg:px-8">
        <Link
          href="/e-course"
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#5B616E] hover:text-[#16181D] transition-colors mb-6"
        >
          <ArrowLeft size={15} aria-hidden="true" />
          Kembali ke katalog
        </Link>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-10 lg:gap-12">
          {/* ── Left: content ─────────────────────────────────────────────── */}
          <div className="min-w-0">
            {course.category?.name && (
              <span className="inline-block rounded-full bg-[#F3F3FA] px-3 py-1 text-xs font-bold uppercase tracking-wide text-[#5B616E] mb-4">
                {course.category.name}
              </span>
            )}
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-[#16181D] leading-[1.1]">
              {course.title}
            </h1>
            {course.shortDesc && (
              <p className="mt-4 text-base leading-relaxed text-[#5B616E]">{course.shortDesc}</p>
            )}

            <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-[#5B616E]">
              {totalVideos > 0 && (
                <span className="inline-flex items-center gap-1.5">
                  <PlayCircle size={15} className="text-[#9CA3AF]" aria-hidden="true" />
                  {totalVideos} video
                </span>
              )}
              {hours > 0 && (
                <span className="inline-flex items-center gap-1.5">
                  <Clock size={15} className="text-[#9CA3AF]" aria-hidden="true" />
                  {hours} jam
                </span>
              )}
              {course.totalEnrolled > 0 && (
                <span className="inline-flex items-center gap-1.5">
                  <Users size={15} className="text-[#9CA3AF]" aria-hidden="true" />
                  {course.totalEnrolled} peserta
                </span>
              )}
              {rating > 0 && (
                <span className="inline-flex items-center gap-1 font-bold text-amber-500">
                  <Star size={15} className="fill-amber-400 text-amber-400" aria-hidden="true" />
                  {rating.toFixed(1)}
                  {course.totalReviews > 0 && (
                    <span className="font-normal text-[#9CA3AF]"> ({course.totalReviews})</span>
                  )}
                </span>
              )}
              {course.level && (
                <span className="rounded-full bg-[#EDEDF4] px-2.5 py-1 text-xs font-semibold text-[#5B616E]">
                  {course.level}
                </span>
              )}
            </div>

            {course.description && (
              <div className="mt-8">
                <h2 className="text-lg font-bold text-[#16181D] mb-2">Tentang kelas ini</h2>
                <p className="text-sm leading-relaxed text-[#5B616E] whitespace-pre-wrap">
                  {course.description}
                </p>
              </div>
            )}

            {/* Curriculum */}
            {course.sections.length > 0 && (
              <div className="mt-10">
                <h2 className="text-lg font-bold text-[#16181D] mb-1">Kurikulum kelas</h2>
                <p className="text-xs text-[#9CA3AF] mb-4">
                  {course.sections.length} bagian · {totalVideos} video
                </p>
                <div className="rounded-2xl border border-[#E7E9EC] bg-white px-5">
                  {course.sections.map((section, i) => (
                    <CurriculumSection key={section.id} section={section} defaultOpen={i === 0} />
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* ── Right: sticky purchase card ──────────────────────────────── */}
          <aside className="lg:sticky lg:top-24 h-fit">
            <div className="rounded-2xl border border-[#E7E9EC] bg-white shadow-sm overflow-hidden">
              <div className="relative aspect-video w-full bg-[#E8F6FF]">
                {course.thumbnailUrl ? (
                  <Image
                    src={course.thumbnailUrl}
                    alt={course.title}
                    fill
                    sizes="360px"
                    className="object-cover"
                  />
                ) : (
                  <MediaPlaceholder type="foto" ratio="16:9" showRatio={false} />
                )}
              </div>
              <div className="p-5 sm:p-6">
                <div className="flex items-end gap-2">
                  <p className="text-2xl font-black text-[#16181D]">{formatRp(price)}</p>
                  {salePrice != null && salePrice < basePrice && (
                    <p className="text-sm text-[#9CA3AF] line-through mb-0.5">
                      {formatRp(basePrice)}
                    </p>
                  )}
                </div>
                <p className="text-xs text-[#9CA3AF] mt-0.5">Sekali bayar · Akses selamanya</p>

                <Link
                  href={`/checkout/${course.slug}`}
                  className="mt-5 flex h-12 w-full items-center justify-center gap-2 rounded-full bg-[#CC0052] text-sm font-bold text-white hover:bg-[#FF2F86] transition-colors shadow-sm"
                >
                  Beli kelas
                  <ArrowLeft size={15} className="rotate-180" aria-hidden="true" />
                </Link>

                {course.trainer?.name && (
                  <div className="mt-6 flex items-center gap-3 border-t border-[#F0F2F5] pt-5">
                    <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-full bg-[#E8F6FF]">
                      {course.trainer.avatarUrl ? (
                        <Image
                          src={course.trainer.avatarUrl}
                          alt={course.trainer.name}
                          fill
                          sizes="44px"
                          className="object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-sm font-bold text-[#0077A8]">
                          {course.trainer.name.charAt(0).toUpperCase()}
                        </div>
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-[#16181D] truncate">{course.trainer.name}</p>
                      <Link
                        href={course.trainer.id ? `/kreator/${course.trainer.id}` : "/e-course"}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-[#0077A8] hover:underline"
                      >
                        Lihat portofolio
                        <ExternalLink size={11} aria-hidden="true" />
                      </Link>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
