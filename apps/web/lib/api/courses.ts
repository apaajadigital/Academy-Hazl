import { getApiBase } from "./base";

// On browser use relative path (goes through Next.js proxy); on server use absolute URL
const API = getApiBase();

export type CourseCard = {
  id: string;
  slug: string;
  title: string;
  shortDesc: string | null;
  price: string;
  salePrice: string | null;
  status: string;
  level: string | null;
  thumbnailUrl: string | null;
  totalDuration: number;
  totalLessons: number;
  totalEnrolled: number;
  avgRating: string;
  totalReviews: number;
  isFeatured: boolean;
  publishedAt: string | null;
  createdAt: string;
  category: { id: string; name: string; slug: string } | null;
  trainer: { id: string; name: string; avatarUrl: string | null };
};

export type CourseFull = CourseCard & {
  description: string | null;
  previewVideo: string | null;
  metaTitle: string | null;
  metaDesc: string | null;
  language: string;
  sections: {
    id: string;
    title: string;
    sortOrder: number;
    lessons: {
      id: string;
      title: string;
      type: string;
      duration: number;
      isPreview: boolean;
      sortOrder: number;
    }[];
  }[];
};

export type CourseListResult = {
  data: CourseCard[];
  total: number;
  page: number;
  limit: number;
};

export type CourseListFilter = {
  category?: string;
  level?: string;
  q?: string;
  featured?: boolean;
  page?: number;
  limit?: number;
};

export type CategoryItem = {
  id: string;
  name: string;
  slug: string;
  iconUrl: string | null;
  sortOrder: number;
  _count: { courses: number };
};

async function apiFetch<T>(path: string): Promise<{ success: true; data: T } | { success: false; error: string }> {
  try {
    // Hard timeout so build-time prerendering never hangs when the API is slow
    // or unreachable — the fetch rejects fast and we fall through to the graceful
    // empty result below instead of stalling `next build` for 60s (QA/CD build hang).
    const res = await fetch(`${API}${path}`, {
      next: { revalidate: 60 },
      signal: AbortSignal.timeout(8000),
    });
    return res.json();
  } catch {
    return { success: false, error: "Tidak dapat terhubung ke server." };
  }
}

export async function getCourses(filter: CourseListFilter = {}): Promise<CourseListResult> {
  const params = new URLSearchParams();
  if (filter.category) params.set("category", filter.category);
  if (filter.level) params.set("level", filter.level);
  if (filter.q) params.set("q", filter.q);
  if (filter.featured !== undefined) params.set("featured", String(filter.featured));
  if (filter.page) params.set("page", String(filter.page));
  if (filter.limit) params.set("limit", String(filter.limit));

  const result = await apiFetch<CourseListResult>(`/api/courses?${params.toString()}`);
  if (!result.success) return { data: [], total: 0, page: 1, limit: 20 };
  return result.data;
}

export async function getCourseBySlug(slug: string): Promise<CourseFull | null> {
  const result = await apiFetch<CourseFull>(`/api/courses/${slug}`);
  if (!result.success) return null;
  return result.data;
}

export async function getCategories(): Promise<CategoryItem[]> {
  const result = await apiFetch<CategoryItem[]>("/api/categories");
  if (!result.success) return [];
  return result.data;
}

export async function searchCourses(q: string, page = 1, limit = 20): Promise<CourseListResult> {
  const params = new URLSearchParams({ q, page: String(page), limit: String(limit) });
  const result = await apiFetch<CourseListResult & { q: string }>(`/api/search?${params.toString()}`);
  if (!result.success) return { data: [], total: 0, page, limit };
  return { data: result.data.data ?? [], total: result.data.total, page: result.data.page, limit: result.data.limit };
}
