import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getMentorBySlug, mentors, categories } from "@/lib/e-course/utils";
import { MentorHero } from "@/components/mentor/MentorHero";
import { MentorCourseGrid } from "@/components/mentor/MentorCourseGrid";
import { MentorConnect } from "@/components/mentor/MentorConnect";
import { features } from "@/lib/features";
import type { MentorParams } from "@/lib/e-course/types";

type Props = {
  params: Promise<{ slug: string }>;
};

export function generateStaticParams(): MentorParams[] {
  return mentors.map((m) => ({ slug: m.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const mentor = getMentorBySlug(slug);
  if (!mentor) return { title: "Not Found" };
  return {
    title: `${mentor.name} — Mentor Jago Akademi`,
    description: `${mentor.name}, ${mentor.role} di ${mentor.company}. ${mentor.totalStudents} pelajar, rating ${mentor.avgRating.toFixed(2)}.`,
  };
}

export default async function MentorPage({ params }: Props) {
  const { slug } = await params;
  const mentor = getMentorBySlug(slug);
  if (!mentor) notFound();

  // Gather all topics taught by this mentor
  const mentorTopics = categories.flatMap((category) =>
    category.topics
      .filter((topic) => mentor.topicIds.includes(topic.id))
      .map((topic) => ({ topic, category }))
  );

  return (
    <>
      <MentorHero mentor={mentor} />
      {/* The grid links to /e-course/[kategori]/[topik], which sets
          `dynamicParams = false` and generates zero params while
          `features.learningPath` is OFF — every card would be a promised 404.
          This page is in the sitemap, so those dead links reach crawlers too. */}
      {features.learningPath && (
        <MentorCourseGrid mentor={mentor} topics={mentorTopics} />
      )}
      <MentorConnect mentor={mentor} />
    </>
  );
}
