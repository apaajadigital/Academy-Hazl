"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Check, Trophy, Clock, CheckCircle2 } from "lucide-react";
import { Badge, Button } from "@/components/ui";
import { getValidToken } from "@/lib/auth/token";

type Lesson = {
  id: string;
  title: string;
  content: string | null;
  videoUrl: string | null;
  durationMins: number | null;
  sortOrder: number;
  isCompleted: boolean;
  quizzes: { id: string; question: string; options: string[] }[];
};

export default function LmsCoursePlayerPage() {
  const { tenantSlug, courseId } = useParams<{ tenantSlug: string; courseId: string }>();
  const router = useRouter();
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [activeLesson, setActiveLesson] = useState<Lesson | null>(null);
  const [loading, setLoading] = useState(true);
  const [completing, setCompleting] = useState(false);

  const fetchLessons = useCallback(async () => {
    const token = await getValidToken();
    if (!token) { router.replace("/masuk"); return; }
    const res = await fetch(`/api/lms/portal/${tenantSlug}/courses/${courseId}/lessons`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    if (data.success) {
      setLessons(data.data);
      if (!activeLesson && data.data.length > 0) {
        setActiveLesson(data.data.find((l: Lesson) => !l.isCompleted) ?? data.data[0]);
      }
    }
    setLoading(false);
  }, [tenantSlug, courseId, activeLesson, router]);

  useEffect(() => { fetchLessons(); }, [fetchLessons]);

  async function markComplete(lessonId: string) {
    setCompleting(true);
    const token = await getValidToken();
    if (!token) { router.replace("/masuk"); return; }
    await fetch(`/api/lms/portal/${tenantSlug}/courses/${courseId}/lessons/${lessonId}/complete`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    });
    await fetchLessons();
    setCompleting(false);
    // Move to next lesson
    const idx = lessons.findIndex((l) => l.id === lessonId);
    const next = lessons[idx + 1];
    if (idx < lessons.length - 1 && next) setActiveLesson(next);
  }

  const completedCount = lessons.filter((l) => l.isCompleted).length;
  const pct = lessons.length > 0 ? Math.round((completedCount / lessons.length) * 100) : 0;

  return (
    <div className="flex min-h-screen flex-col bg-surface-page">
      <div className="flex items-center gap-4 border-b border-border-default bg-surface-card px-6 py-3">
        <Link
          href={`/lms/${tenantSlug}`}
          className="flex items-center gap-1 text-sm font-semibold text-accent-cyan-strong hover:underline"
        >
          <ArrowLeft size={15} aria-hidden="true" />
          Portal
        </Link>
        <div className="flex-1">
          <div className="mb-1 text-xs text-text-secondary">{completedCount}/{lessons.length} pelajaran selesai</div>
          <div className="h-1.5 w-48 rounded-full bg-surface-sunken">
            <div className="h-1.5 rounded-full bg-accent-cyan-strong transition-all duration-500" style={{ width: `${pct}%` }} />
          </div>
        </div>
        {pct === 100 && (
          <Link href={`/lms/${tenantSlug}/certificates`}>
            <Badge variant="warning">
              <Trophy size={13} aria-hidden="true" />
              Lihat Sertifikat
            </Badge>
          </Link>
        )}
      </div>

      <div className="flex flex-1">
        <aside className="hidden w-64 overflow-y-auto border-r border-border-default bg-surface-card md:block">
          <div className="space-y-1 p-3">
            {loading ? (
              <p className="p-2 text-xs text-text-secondary">Memuat...</p>
            ) : (
              lessons.map((l, i) => (
                <button
                  key={l.id}
                  onClick={() => setActiveLesson(l)}
                  className={`flex w-full items-start gap-2 rounded-xl px-3 py-2.5 text-left text-sm transition-colors ${
                    activeLesson?.id === l.id
                      ? "bg-surface-accent-soft text-accent-cyan-strong"
                      : "text-text-primary hover:bg-surface-sunken"
                  }`}
                >
                  <span className={`mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                    l.isCompleted ? "bg-green-600/10 text-green-700" : "bg-surface-sunken text-text-muted"
                  }`}>
                    {l.isCompleted ? <Check size={12} aria-hidden="true" /> : i + 1}
                  </span>
                  <span className="leading-snug">{l.title}</span>
                </button>
              ))
            )}
          </div>
        </aside>

        <main className="max-w-3xl flex-1 p-6">
          {!activeLesson ? (
            <div className="py-12 text-center text-text-secondary">Pilih pelajaran dari sidebar.</div>
          ) : (
            <div>
              <h2 className="mb-4 font-display text-xl font-bold text-text-primary">{activeLesson.title}</h2>

              {activeLesson.videoUrl && (
                <div className="mb-6 aspect-video overflow-hidden rounded-2xl bg-black">
                  <iframe
                    src={activeLesson.videoUrl}
                    className="h-full w-full"
                    allowFullScreen
                    title={activeLesson.title}
                  />
                </div>
              )}

              {activeLesson.content && (
                <div className="prose prose-sm mb-6 max-w-none whitespace-pre-wrap rounded-2xl border border-border-default bg-surface-card p-5 text-text-primary">
                  {activeLesson.content}
                </div>
              )}

              {activeLesson.durationMins && (
                <p className="mb-4 flex items-center gap-1 text-xs text-text-secondary">
                  <Clock size={13} aria-hidden="true" />
                  Estimasi waktu: {activeLesson.durationMins} menit
                </p>
              )}

              {!activeLesson.isCompleted ? (
                <Button
                  variant="cyan"
                  size="sm"
                  onClick={() => markComplete(activeLesson.id)}
                  loading={completing}
                  leftIcon={<Check size={16} aria-hidden="true" />}
                >
                  {completing ? "Menyimpan..." : "Tandai Selesai"}
                </Button>
              ) : (
                <div className="flex items-center gap-2 text-sm text-green-700">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-green-600/10">
                    <CheckCircle2 size={14} aria-hidden="true" />
                  </span>
                  Pelajaran ini sudah selesai
                </div>
              )}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
