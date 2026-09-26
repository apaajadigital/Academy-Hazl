import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { LessonCard } from "./LessonCard";
import type { Topic } from "@/lib/e-course/types";

type CategorySectionRowProps = {
  topic: Topic;
  categorySlug: string;
};

export function CategorySectionRow({ topic, categorySlug }: CategorySectionRowProps) {
  return (
    <div className="flex flex-col gap-4">
      {/* Section header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h3 className="text-base font-semibold text-text-primary">{topic.title}</h3>
          <p className="mt-0.5 text-xs text-text-muted">
            {topic.lessonCount} Materi · {topic.videoCount} Video
          </p>
        </div>
        <Link
          href={`/e-course/${categorySlug}/${topic.slug}`}
          className="link-arrow flex-none text-xs"
        >
          Selengkapnya
          <ArrowRight size={12} aria-hidden="true" />
        </Link>
      </div>

      {/* Horizontal scroll of lesson cards */}
      <div className="scrollbar-hide flex gap-3 overflow-x-auto pb-1">
        {topic.lessons.map((lesson) => (
          <LessonCard
            key={lesson.id}
            lesson={lesson}
            categorySlug={categorySlug}
            topicSlug={topic.slug}
          />
        ))}
      </div>
    </div>
  );
}
