import Link from "next/link";
import { Star, Users, BookOpen } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import type { Lesson } from "@/lib/e-course/types";

type LessonCardProps = {
  lesson: Lesson;
  categorySlug: string;
  topicSlug: string;
};

export function LessonCard({ lesson, categorySlug, topicSlug }: LessonCardProps) {
  return (
    <Link
      href={`/e-course/${categorySlug}/${topicSlug}/${lesson.slug}`}
      className="group relative w-52 flex-none overflow-hidden rounded-xl border border-border-default bg-surface-card shadow-e1 transition-all duration-200 hover:-translate-y-0.5 hover:border-[var(--border-brand)] hover:shadow-e2"
    >
      {/* Number badge */}
      <div className="absolute right-2 top-2 z-10 flex h-6 w-6 items-center justify-center rounded-full border border-border-default bg-surface-card shadow-e1">
        <span className="text-[10px] font-bold text-accent">{lesson.number}</span>
      </div>

      {/* Portfolio badge */}
      {lesson.isPortfolioProject && (
        <div className="absolute left-2 top-2 z-10">
          <Badge variant="brand" className="px-1.5 py-0 text-[9px]">
            Portfolio
          </Badge>
        </div>
      )}

      {/* Thumbnail */}
      <div className="flex aspect-video items-center justify-center border-b border-border-default bg-gradient-to-br from-[rgba(0,119,168,0.06)] to-[rgba(0,119,168,0.02)]">
        <BookOpen size={24} className="text-accent opacity-25" aria-hidden="true" />
      </div>

      {/* Content */}
      <div className="flex flex-col gap-2 p-3">
        <h4 className="line-clamp-2 text-xs font-semibold leading-snug text-text-primary transition-colors group-hover:text-accent">
          {lesson.title}
        </h4>
        <div className="flex items-center gap-2 text-[10px] text-text-muted">
          <span className="flex items-center gap-1">
            <BookOpen size={9} aria-hidden="true" />
            {lesson.chapterCount} Bab
          </span>
          <span className="flex items-center gap-1">
            <Users size={9} aria-hidden="true" />
            {lesson.studentCount}
          </span>
          <span className="ml-auto flex items-center gap-1">
            <Star size={9} className="fill-amber-400 text-amber-400" aria-hidden="true" />
            {lesson.rating.toFixed(2)}
          </span>
        </div>
      </div>
    </Link>
  );
}
