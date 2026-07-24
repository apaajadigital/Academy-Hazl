import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Star } from "lucide-react";
import {
  getCategoryBySlug,
  getTopicBySlug,
  getLessonBySlug,
  getAllLessonParams,
} from "@/lib/e-course/utils";
import { features } from "@/lib/features";
import { Badge } from "@/components/ui/Badge";
import { LessonHero } from "@/components/e-course/lesson/LessonHero";
import { VideoChapterList } from "@/components/e-course/lesson/VideoChapterList";
import { SubscriptionLock } from "@/components/e-course/shared/SubscriptionLock";
import { ProgressBar } from "@/components/e-course/shared/ProgressBar";

type Props = {
  params: Promise<{ kategori: string; topik: string; materi: string }>;
};

// Gated behind the Learning Path feature (TASK-090, not yet built).
export const dynamicParams = false;

export function generateStaticParams() {
  return features.learningPath ? getAllLessonParams() : [];
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { kategori, topik, materi } = await params;
  const category = getCategoryBySlug(kategori);
  const topic = getTopicBySlug(kategori, topik);
  const lesson = getLessonBySlug(kategori, topik, materi);
  if (!category || !topic || !lesson) return { title: "Not Found" };
  return {
    title: `${lesson.title} | ${topic.title} — Jago Akademi`,
    description: `Pelajari ${lesson.title} dalam topik ${topic.title}. ${lesson.chapterCount} bab video pembelajaran.`,
  };
}

// Replace with auth session check when available
const IS_LOCKED = true;

export default async function MateriPage({ params }: Props) {
  const { kategori, topik, materi } = await params;
  const category = getCategoryBySlug(kategori);
  const topic = getTopicBySlug(kategori, topik);
  const lesson = getLessonBySlug(kategori, topik, materi);
  if (!category || !topic || !lesson) notFound();

  return (
    <>
      <LessonHero lesson={lesson} topic={topic} category={category} />

      <section className="py-10">
        <div className="max-w-[1152px] mx-auto px-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

            {/* Main: chapter list */}
            <div className="lg:col-span-2">
              <SubscriptionLock isLocked={IS_LOCKED}>
                <VideoChapterList
                  chapters={lesson.chapters}
                  lessonTitle={lesson.title}
                />
              </SubscriptionLock>
            </div>

            {/* Sidebar: progress */}
            <div className="flex flex-col gap-4 lg:sticky lg:top-24 lg:self-start">
              <div className="flex flex-col gap-4 rounded-xl border border-border-default bg-surface-card p-5 shadow-e1">
                <h3 className="text-sm font-semibold text-text-primary">Progress Belajar</h3>
                <ProgressBar percent={0} />
                <div className="flex flex-col gap-1 text-xs text-text-muted">
                  <span>0 dari {lesson.chapters.length} video selesai</span>
                  <span className="text-[#AEAEB2]">Berlangganan untuk mulai belajar</span>
                </div>
              </div>

              {/* Lesson stats */}
              <div className="rounded-xl border border-border-default bg-surface-card p-5 shadow-e1">
                <h3 className="mb-3 text-sm font-semibold text-text-primary">Statistik Materi</h3>
                <div className="flex flex-col gap-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-text-muted">Total Bab</span>
                    <span className="text-text-secondary">{lesson.chapterCount}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-text-muted">Total Pelajar</span>
                    <span className="text-text-secondary">{lesson.studentCount}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-text-muted">Rating</span>
                    <span className="flex items-center gap-1 text-text-secondary">
                      <Star size={11} className="fill-amber-400 text-amber-400" aria-hidden="true" />
                      {lesson.rating.toFixed(2)}
                    </span>
                  </div>
                  {lesson.isPortfolioProject && (
                    <div className="mt-2 border-t border-border-subtle pt-2">
                      <Badge variant="brand" className="border border-[rgba(204,0,82,0.2)] rounded px-2 py-1 text-[10px]">
                        Portfolio Project
                      </Badge>
                    </div>
                  )}
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>
    </>
  );
}
