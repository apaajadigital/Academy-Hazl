import { categories } from "./data";
import type { Category, Topic, Lesson, KategoriParams, TopikParams, MateriParams } from "./types";

export function getCategoryBySlug(slug: string): Category | undefined {
  return categories.find((c) => c.slug === slug);
}

export function getTopicBySlug(categorySlug: string, topicSlug: string): Topic | undefined {
  const category = getCategoryBySlug(categorySlug);
  return category?.topics.find((t) => t.slug === topicSlug);
}

export function getLessonBySlug(
  categorySlug: string,
  topicSlug: string,
  lessonSlug: string
): Lesson | undefined {
  const topic = getTopicBySlug(categorySlug, topicSlug);
  return topic?.lessons.find((l) => l.slug === lessonSlug);
}

export function getAllCategoryParams(): KategoriParams[] {
  return categories.map((c) => ({ kategori: c.slug }));
}

export function getAllTopicParams(): TopikParams[] {
  return categories.flatMap((c) =>
    c.topics.map((t) => ({ kategori: c.slug, topik: t.slug }))
  );
}

export function getAllLessonParams(): MateriParams[] {
  return categories.flatMap((c) =>
    c.topics.flatMap((t) =>
      t.lessons.map((l) => ({ kategori: c.slug, topik: t.slug, materi: l.slug }))
    )
  );
}

export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} menit`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h} jam ${m} menit` : `${h} jam`;
}

export function formatDurationShort(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m.toString().padStart(2, "0")}:00`;
  return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`;
}

export { categories };
