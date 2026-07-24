"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Star, Award, CircleCheck, BadgeCheck } from "lucide-react";
import VideoPlayer from "../../../../components/player/VideoPlayer";
import CourseSidebar, { type SidebarSection } from "../../../../components/player/CourseSidebar";
import QuizInterface from "../../../../components/player/QuizInterface";
import { getVideoUrl, getQuiz, updateProgress } from "../../../../lib/api/enrollment";
import { getValidToken } from "@/lib/auth/token";
import { Badge, Button } from "@/components/ui";

type Lesson = {
  id: string;
  title: string;
  type: string;
  duration: number;
  contentUrl: string | null;
  contentText: string | null;
  sortOrder: number;
  isPreview: boolean;
};

type CourseDetail = {
  id: string;
  title: string;
  slug: string;
  sections: (SidebarSection & { lessons: Lesson[] })[];
};

type QuizData = {
  id: string;
  passMark: number;
  questions: { id: string; question: string; options: string[]; sortOrder: number }[];
} | null;

export default function LessonPlayerPage() {
  const router = useRouter();
  const { slug, lessonId } = useParams<{ slug: string; lessonId: string }>();

  const [token, setToken] = useState<string | null>(null);
  const [course, setCourse] = useState<CourseDetail | null>(null);
  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [enrollmentId, setEnrollmentId] = useState<string | null>(null);
  const [completedIds, setCompletedIds] = useState<Set<string>>(new Set());
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [quiz, setQuiz] = useState<QuizData>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewContent, setReviewContent] = useState("");
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [reviewDone, setReviewDone] = useState(false);
  const [reviewError, setReviewError] = useState<string | null>(null);

  const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

  useEffect(() => {
    // Finding #2: reset lesson-specific state on every lessonId change so the
    // previous lesson's video/quiz never lingers, and use an `ignore` flag to
    // drop stale responses when navigation outpaces an in-flight fetch.
    let ignore = false;
    setLoading(true);
    setVideoUrl(null);
    setQuiz(null);
    setLesson(null);
    setError(null);

    async function load() {
      // Finding #2: refresh-aware token read (avoids Bearer null / expired token).
      const t = await getValidToken();
      if (ignore) return;
      if (!t) { router.replace("/masuk"); return; }
      setToken(t);

      try {
        // Load course + enrollment in parallel
        const [courseRes, enrollRes] = await Promise.all([
          fetch(`${API}/api/courses/${slug}`, {
            headers: { Authorization: `Bearer ${t}` },
            credentials: "include",
          }).then((r) => r.json()),
          fetch(`${API}/api/enrollments/${encodeURIComponent(slug)}`, {
            headers: { Authorization: `Bearer ${t}` },
            credentials: "include",
          }).then((r) => r.json()),
        ]);
        if (ignore) return;

        if (!courseRes.success) throw new Error("Kursus tidak ditemukan.");
        const courseData: CourseDetail = courseRes.data;
        setCourse(courseData);

        if (enrollRes.success) {
          setEnrollmentId(enrollRes.data.id);
          const done = new Set<string>(
            enrollRes.data.progress.filter((p: { isCompleted: boolean; lessonId: string }) => p.isCompleted).map((p: { lessonId: string }) => p.lessonId)
          );
          setCompletedIds(done);
        }

        // Find current lesson
        const allLessons: Lesson[] = courseData.sections.flatMap((s) => s.lessons);
        const currentLesson = allLessons.find((l) => l.id === lessonId);
        if (!currentLesson) throw new Error("Materi tidak ditemukan.");
        setLesson(currentLesson);

        // Load video URL for video lessons
        if (currentLesson.type === "video" && t) {
          try {
            const urlData = await getVideoUrl(lessonId, t);
            if (!ignore) setVideoUrl(urlData.url);
          } catch {
            if (!ignore) setVideoUrl(currentLesson.contentUrl);
          }
        }

        // Load quiz for quiz lessons
        if (currentLesson.type === "quiz" && t) {
          try {
            const quizData = await getQuiz(lessonId, t);
            if (!ignore) setQuiz(quizData);
          } catch {
            // No quiz found
          }
        }
      } catch (e) {
        if (!ignore) setError(e instanceof Error ? e.message : "Terjadi kesalahan.");
      } finally {
        if (!ignore) setLoading(false);
      }
    }

    load();
    return () => { ignore = true; };
  }, [slug, lessonId, router, API]);

  const handleVideoProgress = useCallback(
    async (pct: number) => {
      if (!token || !enrollmentId) return;
      try {
        await updateProgress(enrollmentId, lessonId, pct, token);
        if (pct >= 90) {
          setCompletedIds((prev) => new Set([...prev, lessonId]));
        }
      } catch {
        // Silently ignore progress sync errors
      }
    },
    [token, enrollmentId, lessonId]
  );

  function handleQuizPassed() {
    setCompletedIds((prev) => new Set([...prev, lessonId]));
  }

  async function submitReview(e: React.FormEvent) {
    e.preventDefault();
    if (!course || !token) return;
    setReviewSubmitting(true);
    setReviewError(null);
    // Finding #3: only mark the review done when the request actually succeeds;
    // previously the unchecked fetch reported success even on failure.
    try {
      const res = await fetch(`${API}/api/reviews`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ itemType: "course", itemId: course.id, rating: reviewRating, content: reviewContent }),
      });
      const body = await res.json().catch(() => ({ success: false }));
      if (!res.ok || !body.success) {
        throw new Error(body.error?.message ?? "Gagal mengirim ulasan. Coba lagi.");
      }
      setReviewDone(true);
    } catch (err) {
      setReviewError(err instanceof Error ? err.message : "Gagal mengirim ulasan. Coba lagi.");
    } finally {
      setReviewSubmitting(false);
    }
  }

  // Navigate to next lesson
  function goToNext() {
    if (!course) return;
    const allLessons = course.sections.flatMap((s) => s.lessons);
    const idx = allLessons.findIndex((l) => l.id === lessonId);
    const nextLesson = idx >= 0 ? allLessons[idx + 1] : undefined;
    if (nextLesson) {
      router.push(`/belajar/${slug}/${nextLesson.id}`);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-surface-page flex items-center justify-center">
        <span className="h-8 w-8 rounded-full border-2 border-accent-cyan-strong border-t-transparent animate-spin" aria-label="Memuat materi…" />
      </div>
    );
  }

  if (error || !course || !lesson) {
    return (
      <div className="min-h-screen bg-surface-page flex flex-col items-center justify-center gap-4 p-6">
        <p className="text-text-primary font-semibold">{error ?? "Materi tidak ditemukan."}</p>
        <Link href="/dashboard" className="btn-primary px-4 py-2 text-sm">
          Kembali ke Dashboard
        </Link>
      </div>
    );
  }

  const allLessons = course.sections.flatMap((s) => s.lessons);
  const currentIdx = allLessons.findIndex((l) => l.id === lessonId);
  const hasNext = currentIdx >= 0 && currentIdx < allLessons.length - 1;
  const courseCompleted = allLessons.length > 0 && completedIds.size === allLessons.length;

  // Presentation-only progress readout, derived from the existing ratchet state
  // (completedIds / lesson list). No new tracking logic is introduced.
  const totalLessons = allLessons.length;
  const completedCount = completedIds.size;
  const progressPct = totalLessons > 0 ? Math.round((completedCount / totalLessons) * 100) : 0;

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-surface-page">
      {/* Focus-shell top bar — back-to-dashboard, course title, progress */}
      <header className="flex items-center gap-3 border-b border-border-default bg-surface-card px-4 py-3 shrink-0">
        <Link
          href="/dashboard"
          aria-label="Kembali ke Dashboard"
          className="flex items-center gap-2 text-text-secondary transition-colors hover:text-text-primary"
        >
          <ArrowLeft aria-hidden="true" className="h-5 w-5 shrink-0" />
          <span className="hidden text-sm font-medium sm:inline">Dashboard</span>
        </Link>
        <span aria-hidden="true" className="hidden h-6 w-px bg-border-default sm:block" />
        <h1 className="min-w-0 flex-1 truncate text-sm font-semibold text-text-primary">{course.title}</h1>
        <Badge variant="info" className="hidden shrink-0 sm:inline-flex">
          <BadgeCheck aria-hidden="true" className="h-4 w-4" />
          {progressPct}% Selesai
        </Badge>
      </header>

      <main className="flex flex-1 flex-col overflow-hidden lg:flex-row">
        {/* Content area */}
        <section className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-4xl space-y-6 px-4 py-6">
            {/* Lesson title */}
            <div>
              <p className="eyebrow">
                {lesson.type === "quiz" ? "Kuis" : lesson.type === "text" ? "Materi" : "Video"}
              </p>
              <h2 className="mt-2 text-2xl font-bold text-text-primary">{lesson.title}</h2>
            </div>

            {/* Video player */}
            {lesson.type === "video" && videoUrl && (
              <VideoPlayer
                src={videoUrl}
                title={lesson.title}
                onProgress={handleVideoProgress}
              />
            )}

            {/* Text lesson */}
            {lesson.type === "text" && lesson.contentText && (
              <div className="bg-surface-card rounded-2xl border border-border-default p-6">
                <div className="prose prose-sm max-w-none text-text-secondary whitespace-pre-wrap">
                  {lesson.contentText}
                </div>
              </div>
            )}

            {/* Quiz */}
            {lesson.type === "quiz" && quiz && token && (
              <div className="bg-surface-card rounded-2xl border border-border-default p-6">
                <QuizInterface
                  lessonId={lessonId}
                  passMark={quiz.passMark}
                  questions={quiz.questions}
                  token={token}
                  onPassed={handleQuizPassed}
                />
              </div>
            )}

            {/* Course completion review prompt */}
            {courseCompleted && !reviewDone && (
              <div className="rounded-2xl border border-border-brand bg-surface-accent-soft p-6">
                <div className="flex items-start gap-4">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-gradient text-white">
                    <Award aria-hidden="true" className="h-6 w-6" />
                  </span>
                  <div className="flex-1">
                    <h3 className="font-semibold text-text-primary mb-1">Selamat! Anda telah menyelesaikan kursus ini</h3>
                    <p className="text-sm text-text-secondary mb-4">Bagikan pengalaman belajar Anda untuk membantu peserta lain.</p>
                    <form onSubmit={submitReview} className="space-y-3">
                      <div className="flex gap-2">
                        {[1, 2, 3, 4, 5].map((r) => (
                          <button
                            key={r}
                            type="button"
                            onClick={() => setReviewRating(r)}
                            aria-label={`Beri ${r} bintang`}
                            className="transition-transform hover:scale-110"
                          >
                            <Star
                              aria-hidden="true"
                              className={`h-6 w-6 ${r <= reviewRating ? "fill-amber-400 text-amber-400" : "fill-transparent text-border-strong"}`}
                            />
                          </button>
                        ))}
                      </div>
                      <textarea
                        value={reviewContent}
                        onChange={(e) => setReviewContent(e.target.value)}
                        placeholder="Ceritakan pengalaman belajar Anda di kursus ini..."
                        rows={3}
                        className="w-full border border-border-default rounded-xl px-3 py-2 text-sm bg-surface-card focus:outline-none focus:ring-2 focus:ring-accent-cyan-strong"
                      />
                      {reviewError && (
                        <p role="alert" className="text-sm text-red-600">{reviewError}</p>
                      )}
                      <div className="flex items-center gap-3">
                        <Button type="submit" variant="cyan" size="sm" loading={reviewSubmitting}>
                          {reviewSubmitting ? "Mengirim..." : "Kirim Ulasan"}
                        </Button>
                        <button type="button" onClick={() => setReviewDone(true)} className="text-sm text-text-secondary hover:text-text-primary">
                          Lewati
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              </div>
            )}
            {courseCompleted && reviewDone && (
              <div className="bg-green-50 border border-green-200 rounded-2xl p-5 flex items-center gap-3">
                <CircleCheck aria-hidden="true" className="h-6 w-6 shrink-0 text-green-600" />
                <div>
                  <p className="font-medium text-green-800">Terima kasih atas ulasan Anda!</p>
                  <p className="text-sm text-green-700 mt-0.5">Ulasan Anda membantu peserta lain memilih kursus terbaik.</p>
                </div>
              </div>
            )}

            {/* Navigation */}
            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={() => router.back()}
                className="text-sm text-text-secondary hover:text-text-primary flex items-center gap-1 transition-colors"
              >
                <ArrowLeft aria-hidden="true" className="w-4 h-4" />
                Sebelumnya
              </button>

              {hasNext && (
                <Button
                  type="button"
                  variant="cyan"
                  size="sm"
                  onClick={goToNext}
                  rightIcon={<ArrowRight aria-hidden="true" className="w-4 h-4" />}
                >
                  Materi Berikutnya
                </Button>
              )}
            </div>
          </div>
        </section>

        {/* Right curriculum rail */}
        <aside className="hidden w-full shrink-0 flex-col border-l border-border-default bg-surface-card lg:flex lg:w-80 xl:w-96">
          <div className="space-y-3 border-b border-border-default px-4 py-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-text-primary">Konten Kursus</h3>
              <span className="text-xs font-bold text-accent-cyan-strong">
                {completedCount}/{totalLessons} Selesai
              </span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-surface-sunken">
              <div
                className="h-full rounded-full bg-brand-gradient transition-all"
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </div>
          <CourseSidebar
            courseSlug={slug}
            sections={course.sections}
            currentLessonId={lessonId}
            completedLessonIds={completedIds}
          />
        </aside>
      </main>
    </div>
  );
}
