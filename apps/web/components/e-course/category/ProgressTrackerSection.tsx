import Link from "next/link";
import { BookOpen, Clock, Flame, ChevronRight, Lock } from "lucide-react";
import type { Category } from "@/lib/e-course/types";
import { ProgressBar } from "@/components/e-course/shared/ProgressBar";

type ProgressTrackerSectionProps = {
  category: Category;
  totalLessons?: number;
};

type Stat = {
  icon: typeof BookOpen;
  value: string;
  label: string;
};

export function ProgressTrackerSection({ category, totalLessons }: ProgressTrackerSectionProps) {
  const lessonTotal =
    totalLessons ?? category.topics.reduce((sum, topic) => sum + topic.lessonCount, 0);

  const stats: Stat[] = [
    { icon: BookOpen, value: "0", label: `Materi Selesai dari ${lessonTotal}` },
    { icon: Clock, value: "0 jam", label: "Waktu Belajar" },
    { icon: Flame, value: "0 hari", label: "Streak Belajar" },
  ];

  return (
    <section className="border-b border-border-default bg-surface-sunken py-10">
      <div className="mx-auto flex max-w-[1152px] flex-col gap-8 px-8">
        <header className="flex flex-col gap-1.5">
          <h2 className="font-display text-xl font-bold text-text-primary">
            Progres Belajarmu
          </h2>
          <p className="text-sm text-text-muted">
            Mulai belajar dan pantau perkembanganmu di sini
          </p>
        </header>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {stats.map((stat) => {
            const Icon = stat.icon;
            return (
              <div
                key={stat.label}
                className="flex items-center gap-4 rounded-2xl border border-border-default bg-surface-card p-5 shadow-e1"
              >
                <div className="flex h-11 w-11 flex-none items-center justify-center rounded-xl border border-[var(--border-brand)] bg-surface-accent-soft">
                  <Icon size={18} className="text-accent" aria-hidden="true" />
                </div>
                <div className="flex flex-col">
                  <span className="text-xl font-bold leading-tight text-accent">
                    {stat.value}
                  </span>
                  <span className="text-xs leading-snug text-text-muted">{stat.label}</span>
                </div>
              </div>
            );
          })}
        </div>

        <div className="overflow-hidden rounded-2xl border border-border-default bg-surface-card shadow-e1">
          {category.topics.map((topic, index) => (
            <div
              key={topic.id}
              className={`flex items-center gap-4 px-5 py-4 ${
                index > 0 ? "border-t border-border-subtle" : ""
              }`}
            >
              <div className="flex h-9 w-9 flex-none items-center justify-center rounded-lg border border-border-default bg-surface-page">
                <Lock size={14} className="text-[#AEAEB2]" aria-hidden="true" />
              </div>

              <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                <div className="flex items-baseline justify-between gap-3">
                  <h3 className="truncate text-sm font-semibold text-text-primary">
                    {topic.title}
                  </h3>
                  <span className="flex-none text-xs text-text-muted">
                    {topic.lessonCount} materi
                  </span>
                </div>
                <ProgressBar percent={0} label="Belum dimulai" />
              </div>

              <Link
                href={`/e-course/${category.slug}/${topic.slug}`}
                className="inline-flex flex-none items-center gap-0.5 text-sm font-semibold text-accent transition-all duration-200 hover:gap-1.5"
              >
                Mulai
                <ChevronRight size={15} aria-hidden="true" />
              </Link>
            </div>
          ))}
        </div>

        <div>
          <Link href={`/e-course/${category.slug}`} className="btn btn-primary">
            Mulai Belajar Sekarang
          </Link>
        </div>
      </div>
    </section>
  );
}
