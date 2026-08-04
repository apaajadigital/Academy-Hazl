import { getApiBase } from "./base";

// On browser use relative path (goes through Next.js proxy); on server use absolute URL
const BASE = getApiBase();

export type Enrollment = {
  id: string;
  courseId: string;
  userId: string;
  progressPct: number;
  isCompleted: boolean;
  enrolledAt: string;
  completedAt: string | null;
  course: {
    id: string;
    title: string;
    slug: string;
    thumbnailUrl: string | null;
    level: string;
    trainer: { name: string } | null;
  };
  progress: { isCompleted: boolean }[];
};

export type DashboardData = {
  stats: {
    totalEnrolled: number;
    totalCompleted: number;
    totalInProgress: number;
    totalCertificates: number;
  };
  enrollments: Enrollment[];
  recentCertificates: {
    id: string;
    code: string;
    issuedAt: string;
    course: { title: string };
  }[];
  recentActivity: {
    lessonId: string;
    isCompleted: boolean;
    completedAt: string | null;
    lesson: { title: string };
  }[];
};

async function apiFetch<T>(path: string, token: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...(options?.headers ?? {}),
    },
  });
  const body = await res.json();
  if (!body.success) throw new Error(body.error?.message ?? "Request failed");
  return body.data as T;
}

export async function enrollInCourse(courseId: string, token: string) {
  return apiFetch<Enrollment>("/api/enrollments", token, {
    method: "POST",
    body: JSON.stringify({ courseId }),
  });
}

export async function getMyEnrollments(token: string) {
  return apiFetch<Enrollment[]>("/api/enrollments", token);
}

export async function getEnrollment(courseId: string, token: string) {
  return apiFetch<Enrollment & { course: { sections: unknown[] } }>(
    `/api/enrollments/${courseId}`,
    token
  );
}

export async function getDashboard(token: string) {
  return apiFetch<DashboardData>("/api/dashboard", token);
}

export async function updateProgress(
  enrollmentId: string,
  lessonId: string,
  watchedPct: number,
  token: string
) {
  return apiFetch("/api/progress", token, {
    method: "POST",
    body: JSON.stringify({ enrollmentId, lessonId, watchedPct }),
  });
}

export async function getVideoUrl(lessonId: string, token: string) {
  return apiFetch<{ url: string; expiresAt: string }>(`/api/videos/${lessonId}/url`, token);
}

export async function getQuiz(lessonId: string, token: string) {
  return apiFetch<{
    id: string;
    passMark: number;
    questions: { id: string; question: string; options: string[]; sortOrder: number }[];
  }>(`/api/quiz/${lessonId}`, token);
}

export async function submitQuiz(
  lessonId: string,
  answers: Record<string, number>,
  token: string
) {
  return apiFetch<{
    submissionId: string;
    score: number;
    isPassed: boolean;
    passMark: number;
    correct: number;
    total: number;
  }>(`/api/quiz/${lessonId}/submit`, token, {
    method: "POST",
    body: JSON.stringify({ answers }),
  });
}
