import Link from "next/link";
import { ArrowRight, BookOpen, Video } from "lucide-react";
import type { Mentor, Topic, Category } from "@/lib/e-course/types";
import { features } from "@/lib/features";

type MentorCourseGridProps = {
  mentor: Mentor;
  topics: Array<{ topic: Topic; category: Category }>;
};

export function MentorCourseGrid({ mentor, topics }: MentorCourseGridProps) {
  if (topics.length === 0) return null;

  return (
    <section className="py-10">
      <div className="max-w-[1152px] mx-auto px-8">
        <h2 className="text-lg font-bold font-display mb-6">
          Topik yang Diajarkan{" "}
          <span className="text-gradient-brand">{mentor.name}</span>
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {topics.map(({ topic, category }) => (
            <Link
              key={topic.id}
              // Flag-aware: the /e-course/[kategori]/[topik] learning-path pages
              // are gated behind features.learningPath (dynamicParams=false → 404
              // when OFF). Until the path ships, send users to the live catalog
              // landing instead of a dead 404. Auto-links to the real topic page
              // once the flag is turned on.
              href={features.learningPath ? `/e-course/${category.slug}/${topic.slug}` : "/e-course"}
              className="group bg-white border border-[#E5E5E5] rounded-xl p-5 flex flex-col gap-3 shadow-e1 hover:border-[rgba(0,119,168,0.25)] hover:shadow-e2 transition-all duration-200"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="w-10 h-10 rounded-lg bg-[rgba(0,212,255,0.08)] border border-[rgba(0,119,168,0.2)] flex items-center justify-center flex-none">
                  <BookOpen size={16} className="text-[#0077A8]" />
                </div>
                <ArrowRight size={14} className="text-[#AEAEB2] group-hover:text-[#0077A8] transition-colors mt-1" />
              </div>

              <div>
                <p className="text-[10px] text-[#6E6E73] uppercase tracking-wider mb-1">
                  {category.title}
                </p>
                <h3 className="text-[#1D1D1F] font-semibold text-sm leading-snug group-hover:text-[#0077A8] transition-colors">
                  {topic.title}
                </h3>
              </div>

              <div className="flex gap-3 text-[#6E6E73] text-xs mt-auto">
                <span className="flex items-center gap-1">
                  <BookOpen size={10} />
                  {topic.lessonCount} Materi
                </span>
                <span className="flex items-center gap-1">
                  <Video size={10} />
                  {topic.videoCount} Video
                </span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
