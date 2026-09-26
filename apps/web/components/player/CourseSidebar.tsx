"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronDown, CircleCheck, CirclePlay, Circle, HelpCircle } from "lucide-react";

export type SidebarSection = {
  id: string;
  title: string;
  sortOrder: number;
  lessons: SidebarLesson[];
};

export type SidebarLesson = {
  id: string;
  title: string;
  type: string;
  duration: number;
  sortOrder: number;
  isCompleted?: boolean;
};

type Props = {
  courseSlug: string;
  sections: SidebarSection[];
  currentLessonId: string;
  completedLessonIds: Set<string>;
};

export default function CourseSidebar({
  courseSlug,
  sections,
  currentLessonId,
  completedLessonIds,
}: Props) {
  const [openSections, setOpenSections] = useState<Set<string>>(
    () => new Set(sections.map((s) => s.id))
  );

  function toggleSection(id: string) {
    setOpenSections((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function formatDuration(seconds: number) {
    if (!seconds) return "";
    const m = Math.floor(seconds / 60);
    return `${m} mnt`;
  }

  // Lesson-status glyph (completed → playing → quiz → not-started). Status is
  // derived from the same completed/current inputs as the styling below; the
  // Material Symbols are swapped for lucide per the redesign icon map.
  function getLessonIcon(type: string, isCompleted: boolean, isCurrent: boolean) {
    if (isCompleted) {
      return <CircleCheck aria-hidden="true" className="w-5 h-5 shrink-0 text-green-600" />;
    }
    if (isCurrent) {
      return <CirclePlay aria-hidden="true" className="w-5 h-5 shrink-0 text-accent-cyan-strong" />;
    }
    if (type === "quiz") {
      return <HelpCircle aria-hidden="true" className="w-5 h-5 shrink-0 text-text-secondary" />;
    }
    return <Circle aria-hidden="true" className="w-5 h-5 shrink-0 text-text-secondary" />;
  }

  return (
    <nav aria-label="Daftar materi kursus" className="h-full overflow-y-auto">
      <div className="py-2">
        {sections.map((section, sIdx) => {
          const isOpen = openSections.has(section.id);
          const doneInSection = section.lessons.filter((l) => completedLessonIds.has(l.id)).length;
          const sectionActive = section.lessons.some((l) => l.id === currentLessonId);

          return (
            <div key={section.id} className="border-b border-border-default last:border-0">
              <button
                type="button"
                onClick={() => toggleSection(section.id)}
                aria-expanded={isOpen}
                className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left hover:bg-surface-sunken transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-xs font-bold ${
                      sectionActive
                        ? "bg-accent-cyan-strong text-white"
                        : "bg-surface-accent-soft text-accent-cyan-strong"
                    }`}
                  >
                    {String(sIdx + 1).padStart(2, "0")}
                  </span>
                  <div className="min-w-0">
                    <p className="font-semibold text-sm text-text-primary truncate">{section.title}</p>
                    <p className="text-xs text-text-secondary">
                      {doneInSection}/{section.lessons.length} selesai
                    </p>
                  </div>
                </div>
                <ChevronDown
                  aria-hidden="true"
                  className={`w-4 h-4 text-text-secondary shrink-0 transition-transform ${isOpen ? "rotate-180" : ""}`}
                />
              </button>

              {isOpen && (
                <ul className="pb-2">
                  {section.lessons.map((lesson) => {
                    const isCurrent = lesson.id === currentLessonId;
                    const isDone = completedLessonIds.has(lesson.id);

                    return (
                      <li key={lesson.id}>
                        <Link
                          href={`/belajar/${courseSlug}/${lesson.id}`}
                          className={`flex items-start gap-3 border-l-[3px] px-4 py-2.5 text-sm transition-colors ${
                            isCurrent
                              ? "border-accent-cyan-strong bg-surface-accent-soft font-medium text-accent-cyan-strong"
                              : "border-transparent text-text-primary hover:bg-surface-sunken"
                          }`}
                          aria-current={isCurrent ? "page" : undefined}
                        >
                          {getLessonIcon(lesson.type, isDone, isCurrent)}
                          <div className="flex-1 min-w-0">
                            <p className="leading-tight truncate">{lesson.title}</p>
                            {isCurrent ? (
                              <p className="text-xs text-accent-cyan-strong/80 mt-0.5">
                                Sedang Dipelajari
                                {lesson.duration > 0 ? ` • ${formatDuration(lesson.duration)}` : ""}
                              </p>
                            ) : (
                              lesson.duration > 0 && (
                                <p className="text-xs text-text-secondary mt-0.5">{formatDuration(lesson.duration)}</p>
                              )
                            )}
                          </div>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          );
        })}
      </div>
    </nav>
  );
}
