import { BookOpen, Video } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Breadcrumb } from "@/components/e-course/shared/Breadcrumb";
import type { Lesson, Topic, Category } from "@/lib/e-course/types";

type LessonHeroProps = {
  lesson: Lesson;
  topic: Topic;
  category: Category;
};

export function LessonHero({ lesson, topic, category }: LessonHeroProps) {
  return (
    <section className="border-b border-border-default bg-gradient-to-b from-[rgba(0,119,168,0.05)] to-[var(--surface-page)]">
      <div className="mx-auto max-w-[1152px] px-8 py-10">

        <Breadcrumb
          items={[
            { label: "E-Course", href: "/e-course" },
            { label: category.title, href: `/e-course/${category.slug}` },
            { label: topic.title, href: `/e-course/${category.slug}/${topic.slug}` },
            { label: lesson.title },
          ]}
        />

        <div className="mt-6 flex max-w-2xl flex-col gap-4">
          <div className="flex flex-wrap gap-2">
            <Badge variant="info" className="border border-[var(--border-brand)]">
              <BookOpen size={11} aria-hidden="true" />
              {lesson.chapterCount} Bab
            </Badge>
            <Badge variant="info" className="border border-[var(--border-brand)]">
              <Video size={11} aria-hidden="true" />
              {lesson.chapters.length} Video
            </Badge>
            {lesson.isPortfolioProject && (
              <Badge variant="brand" className="border border-[rgba(204,0,82,0.2)]">
                Portfolio Project
              </Badge>
            )}
          </div>

          <h1 className="font-display text-2xl font-bold leading-tight text-text-primary">
            {lesson.title}
          </h1>

          <p className="text-sm text-text-muted">
            Materi {lesson.number} dari{" "}
            <span className="text-text-secondary">{topic.title}</span>
          </p>
        </div>
      </div>
    </section>
  );
}
