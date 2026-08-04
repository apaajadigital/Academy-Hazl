"use client";

import { useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { getToken } from "@/lib/auth/token";
import { API_BASE as API } from "@/lib/api/base";

export default function CoursePlayerEntryPage() {
  const router = useRouter();
  const { slug } = useParams<{ slug: string }>();

  useEffect(() => {
    const token = getToken();
    if (!token) { router.replace("/masuk"); return; }

    // Find the course by slug then get enrollment, redirect to first lesson
    fetch(`${API}/api/courses/${slug}`, {
      headers: { Authorization: `Bearer ${token}` },
      credentials: "include",
    })
      .then((r) => r.json())
      .then(async (body) => {
        if (!body.success) throw new Error(body.error?.message ?? "Terjadi kesalahan.");
        const course = body.data;
        const firstSection = course.sections?.[0];
        const firstLesson = firstSection?.lessons?.[0];
        if (firstLesson) {
          router.replace(`/belajar/${slug}/${firstLesson.id}`);
        } else {
          router.replace("/dashboard");
        }
      })
      .catch(() => router.replace("/dashboard"));
  }, [slug, router]);

  return (
    <div className="min-h-screen bg-surface-page flex items-center justify-center">
      <span className="h-8 w-8 rounded-full border-2 border-accent-cyan-strong border-t-transparent animate-spin" aria-label="Memuat kursus…" />
    </div>
  );
}
