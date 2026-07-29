import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { features } from "@/lib/features";
import { getCategoryBySlug, getTopicBySlug, getAllTopicParams } from "@/lib/e-course/utils";
import { TopicHero } from "@/components/e-course/topic/TopicHero";
import { TopicSearch } from "@/components/e-course/topic/TopicSearch";
import { SubscriptionLock } from "@/components/e-course/shared/SubscriptionLock";

type Props = {
  params: Promise<{ kategori: string; topik: string }>;
};

// Gated behind the Learning Path feature (TASK-090, not yet built).
export const dynamicParams = false;

export function generateStaticParams() {
  return features.learningPath ? getAllTopicParams() : [];
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { kategori, topik } = await params;
  const category = getCategoryBySlug(kategori);
  const topic = getTopicBySlug(kategori, topik);
  if (!category || !topic) return { title: "Not Found" };
  return {
    title: `${topic.title} | ${category.title} — Jago Akademi`,
    description: `Pelajari ${topic.title} dalam Learning Path ${category.title}. ${topic.lessonCount} materi video, ${topic.videoCount} video pembelajaran.`,
  };
}

export default async function TopikPage({ params }: Props) {
  const { kategori, topik } = await params;
  const category = getCategoryBySlug(kategori);
  const topic = getTopicBySlug(kategori, topik);
  if (!category || !topic) notFound();

  return (
    <>
      <TopicHero topic={topic} category={category} />

      <section className="py-10">
        <div className="max-w-[1152px] mx-auto px-8">
          <SubscriptionLock>
            <TopicSearch
              lessons={topic.lessons}
              categorySlug={category.slug}
              topicSlug={topic.slug}
            />
          </SubscriptionLock>
        </div>
      </section>
    </>
  );
}
