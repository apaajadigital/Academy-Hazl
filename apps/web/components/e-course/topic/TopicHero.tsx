import { BookOpen, Video } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Breadcrumb } from "@/components/e-course/shared/Breadcrumb";
import { ProgressBar } from "@/components/e-course/shared/ProgressBar";
import { ActionButtons } from "@/components/e-course/shared/ActionButtons";
import type { Topic, Category } from "@/lib/e-course/types";

type TopicHeroProps = {
  topic: Topic;
  category: Category;
};

export function TopicHero({ topic, category }: TopicHeroProps) {
  return (
    <section className="border-b border-border-default bg-gradient-to-b from-[rgba(0,119,168,0.05)] to-[var(--surface-page)]">
      <div className="mx-auto max-w-[1152px] px-8 py-10">

        <Breadcrumb
          items={[
            { label: "E-Course", href: "/e-course" },
            { label: category.title, href: `/e-course/${category.slug}` },
            { label: topic.title },
          ]}
        />

        <div className="mt-6 grid grid-cols-1 items-start gap-8 lg:grid-cols-2">
          {/* Left */}
          <div className="flex flex-col gap-4">
            <div className="flex flex-wrap gap-2">
              <Badge variant="info" className="border border-[var(--border-brand)]">
                <BookOpen size={11} aria-hidden="true" />
                {topic.lessonCount} Materi
              </Badge>
              <Badge variant="info" className="border border-[var(--border-brand)]">
                <Video size={11} aria-hidden="true" />
                {topic.videoCount} Video
              </Badge>
            </div>

            <h1 className="font-display text-2xl font-bold leading-tight text-text-primary">
              {topic.title}
            </h1>

            <p className="text-sm text-text-muted">
              Bagian dari Learning Path{" "}
              <span className="text-accent">{category.title}</span>
            </p>
          </div>

          {/* Right: progress + actions */}
          <div className="flex flex-col gap-4">
            <div className="rounded-xl border border-border-default bg-surface-card p-4 shadow-e1">
              <ProgressBar percent={0} />
            </div>
            <ActionButtons isLocked />
          </div>
        </div>
      </div>
    </section>
  );
}
