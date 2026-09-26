import { BookOpen, Video, Award, Quote } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { ProgressBar } from "@/components/e-course/shared/ProgressBar";
import { ActionButtons } from "@/components/e-course/shared/ActionButtons";
import type { Category } from "@/lib/e-course/types";

type CategoryHeroProps = {
  category: Category;
};

export function CategoryHero({ category }: CategoryHeroProps) {
  return (
    <section className="border-b border-border-default bg-gradient-to-b from-[rgba(0,119,168,0.05)] to-[var(--surface-page)]">
      <div className="mx-auto max-w-[1152px] px-8 py-12">
        <div className="grid grid-cols-1 items-start gap-10 lg:grid-cols-2">

          {/* Left: Visual + tutor quote */}
          <div className="flex flex-col gap-6">
            {/* Course illustration */}
            <div className="relative aspect-video overflow-hidden rounded-2xl border border-[var(--border-brand)] bg-gradient-to-br from-[rgba(0,119,168,0.07)] to-[rgba(0,119,168,0.02)] shadow-e2">
              {/* Grid background */}
              <div
                className="absolute inset-0 opacity-[0.04]"
                style={{
                  backgroundImage: `linear-gradient(rgba(0,119,168,1) 1px, transparent 1px), linear-gradient(90deg, rgba(0,119,168,1) 1px, transparent 1px)`,
                  backgroundSize: "40px 40px",
                }}
              />
              <div className="absolute left-1/2 top-1/2 h-48 w-48 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[var(--brand-cyan)]/[0.08] blur-3xl" />

              <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 p-8">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-[var(--border-brand)] bg-surface-accent-soft shadow-e1">
                  <BookOpen size={32} className="text-accent" aria-hidden="true" />
                </div>
                <div className="text-center">
                  <p className="font-display text-xl font-bold text-text-primary">{category.title}</p>
                  <p className="mt-1 text-sm text-text-muted">Learning Path</p>
                </div>
                <div className="flex gap-4">
                  <div className="text-center">
                    <p className="text-lg font-bold text-accent">{category.topicCount}</p>
                    <p className="text-xs text-text-muted">Topik</p>
                  </div>
                  <div className="w-px bg-border-default" />
                  <div className="text-center">
                    <p className="text-lg font-bold text-accent">{category.materialCount}</p>
                    <p className="text-xs text-text-muted">Materi</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Tutor quote */}
            <div className="rounded-xl border border-border-default bg-surface-card p-4 shadow-e1">
              <Quote size={16} className="mb-2 text-accent" aria-hidden="true" />
              <p className="text-sm italic leading-relaxed text-text-secondary">
                &ldquo;{category.tutorQuote}&rdquo;
              </p>
              <div className="mt-3 flex items-center gap-3 border-t border-border-subtle pt-3">
                <div className="flex h-8 w-8 flex-none items-center justify-center rounded-full border border-[var(--border-brand)] bg-surface-accent-soft">
                  <span className="text-xs font-bold text-accent">
                    {category.tutorName.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                  </span>
                </div>
                <div>
                  <p className="text-xs font-semibold text-text-primary">{category.tutorName}</p>
                  <p className="text-[10px] text-text-muted">{category.tutorRole}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Right: Course info + progress */}
          <div className="flex flex-col gap-6">
            {/* Meta pills */}
            <div className="flex flex-wrap gap-2">
              <Badge variant="info" className="border border-[var(--border-brand)]">
                <BookOpen size={11} aria-hidden="true" />
                {category.topicCount} Topik
              </Badge>
              <Badge variant="info" className="border border-[var(--border-brand)]">
                <Video size={11} aria-hidden="true" />
                {category.materialCount} Materi
              </Badge>
              <Badge variant="brand" className="border border-[rgba(204,0,82,0.2)]">
                <Award size={11} aria-hidden="true" />
                Bersertifikat
              </Badge>
            </div>

            {/* Title */}
            <div>
              <p className="mb-1 text-xs uppercase tracking-widest text-text-muted">Learning Path</p>
              <h1 className="font-display text-3xl font-bold leading-tight text-text-primary">
                {category.title}
              </h1>
            </div>

            {/* Description */}
            <p className="text-sm leading-relaxed text-text-secondary">
              {category.description}
            </p>

            {/* Progress */}
            <div className="rounded-xl border border-border-default bg-surface-card p-4 shadow-e1">
              <ProgressBar percent={0} />
            </div>

            {/* Action buttons */}
            <ActionButtons isLocked />
          </div>
        </div>
      </div>
    </section>
  );
}
