"use client";

import { useState } from "react";
import { Search } from "lucide-react";
import { LessonCardLarge } from "./LessonCardLarge";
import type { Lesson } from "@/lib/e-course/types";

type TopicSearchProps = {
  lessons: Lesson[];
  categorySlug: string;
  topicSlug: string;
};

export function TopicSearch({ lessons, categorySlug, topicSlug }: TopicSearchProps) {
  const [query, setQuery] = useState("");

  const filtered = query.trim()
    ? lessons.filter((l) =>
        l.title.toLowerCase().includes(query.toLowerCase())
      )
    : lessons;

  return (
    <div className="flex flex-col gap-6">
      <div className="relative max-w-md">
        <Search
          size={14}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-[#AEAEB2]"
          aria-hidden="true"
        />
        <input
          type="search"
          placeholder="Cari materi..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="input-dark w-full pl-9 text-sm"
          aria-label="Cari materi"
        />
      </div>

      {query && (
        <p className="text-xs text-text-muted">
          {filtered.length} hasil untuk &ldquo;{query}&rdquo;
        </p>
      )}

      {filtered.length > 0 ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {filtered.map((lesson) => (
            <LessonCardLarge
              key={lesson.id}
              lesson={lesson}
              categorySlug={categorySlug}
              topicSlug={topicSlug}
            />
          ))}
        </div>
      ) : (
        <div className="py-16 text-center">
          <p className="text-sm text-text-muted">Tidak ada materi yang cocok.</p>
        </div>
      )}
    </div>
  );
}
