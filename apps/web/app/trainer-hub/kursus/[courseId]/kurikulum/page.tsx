"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  BookOpen,
  Plus,
  GripVertical,
  Pencil,
  Trash2,
  ChevronDown,
  ChevronRight,
  Video,
  FileText,
  HelpCircle,
  Eye,
  Save,
  X,
} from "lucide-react";
import {
  Button,
  Card,
  Input,
  Badge,
  PageHeader,
  EmptyState,
  DashboardLoading,
  DashboardError,
} from "@/components/ui";
import { getValidToken } from "@/lib/auth/token";

type Lesson = {
  id: string;
  title: string;
  type: string;
  contentUrl: string | null;
  contentText: string | null;
  duration: number;
  isPreview: boolean;
  sortOrder: number;
  quiz: { id: string; passMark: number; _count: { questions: number } } | null;
};

type Section = {
  id: string;
  title: string;
  sortOrder: number;
  lessons: Lesson[];
};

const LESSON_TYPE_ICON: Record<string, typeof Video> = {
  video: Video,
  text: FileText,
  quiz: HelpCircle,
};

const LESSON_TYPE_LABEL: Record<string, string> = {
  video: "Video",
  text: "Teks",
  quiz: "Kuis",
};

export default function CurriculumPage() {
  const { courseId } = useParams<{ courseId: string }>();
  const router = useRouter();
  const [sections, setSections] = useState<Section[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Add section form
  const [addingSec, setAddingSec] = useState(false);
  const [newSecTitle, setNewSecTitle] = useState("");

  // Expanded sections
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  // Inline editing
  const [editingSecId, setEditingSecId] = useState<string | null>(null);
  const [editSecTitle, setEditSecTitle] = useState("");

  // Add lesson form
  const [addingLessonToSec, setAddingLessonToSec] = useState<string | null>(null);
  const [newLesson, setNewLesson] = useState({
    title: "",
    type: "video" as "video" | "text" | "quiz",
    contentUrl: "",
    duration: 0,
    isPreview: false,
  });

  const loadCurriculum = useCallback(async () => {
    const token = await getValidToken();
    if (!token) { router.replace("/masuk"); return; }
    try {
      const r = await fetch(`/api/trainer/courses/${courseId}/curriculum`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const d = await r.json();
      if (d.success) {
        setSections(d.data);
        // Expand all sections by default
        setExpanded(new Set((d.data as Section[]).map((s) => s.id)));
      } else {
        setError(d.error?.message ?? "Gagal memuat kurikulum.");
      }
    } catch {
      setError("Gagal memuat kurikulum.");
    } finally {
      setLoading(false);
    }
  }, [courseId, router]);

  useEffect(() => {
    loadCurriculum();
  }, [loadCurriculum]);

  const toggleExpand = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  async function handleAddSection() {
    if (!newSecTitle.trim()) return;
    const token = await getValidToken();
    if (!token) return;
    try {
      const r = await fetch(`/api/trainer/courses/${courseId}/sections`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ title: newSecTitle.trim() }),
      });
      const d = await r.json();
      if (d.success) {
        setNewSecTitle("");
        setAddingSec(false);
        loadCurriculum();
      } else {
        alert(d.error?.message ?? "Gagal menambah modul.");
      }
    } catch {
      alert("Gagal menghubungi server.");
    }
  }

  async function handleEditSection(sectionId: string) {
    if (!editSecTitle.trim()) return;
    const token = await getValidToken();
    if (!token) return;
    try {
      const r = await fetch(`/api/trainer/sections/${sectionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ title: editSecTitle.trim() }),
      });
      const d = await r.json();
      if (d.success) {
        setEditingSecId(null);
        loadCurriculum();
      } else {
        alert(d.error?.message ?? "Gagal mengubah nama modul.");
      }
    } catch {
      alert("Gagal menghubungi server.");
    }
  }

  async function handleDeleteSection(sectionId: string) {
    if (!confirm("Hapus modul ini beserta semua materi di dalamnya?")) return;
    const token = await getValidToken();
    if (!token) return;
    try {
      const r = await fetch(`/api/trainer/sections/${sectionId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      const d = await r.json();
      if (d.success) loadCurriculum();
      else alert(d.error?.message ?? "Gagal menghapus modul.");
    } catch {
      alert("Gagal menghubungi server.");
    }
  }

  async function handleAddLesson(sectionId: string) {
    if (!newLesson.title.trim()) return;
    const token = await getValidToken();
    if (!token) return;
    try {
      const r = await fetch(`/api/trainer/sections/${sectionId}/lessons`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          title: newLesson.title.trim(),
          type: newLesson.type,
          contentUrl: newLesson.contentUrl || null,
          duration: newLesson.duration,
          isPreview: newLesson.isPreview,
        }),
      });
      const d = await r.json();
      if (d.success) {
        setNewLesson({ title: "", type: "video", contentUrl: "", duration: 0, isPreview: false });
        setAddingLessonToSec(null);
        loadCurriculum();
      } else {
        alert(d.error?.message ?? "Gagal menambah materi.");
      }
    } catch {
      alert("Gagal menghubungi server.");
    }
  }

  async function handleDeleteLesson(lessonId: string) {
    if (!confirm("Hapus materi ini?")) return;
    const token = await getValidToken();
    if (!token) return;
    try {
      const r = await fetch(`/api/trainer/lessons/${lessonId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      const d = await r.json();
      if (d.success) loadCurriculum();
      else alert(d.error?.message ?? "Gagal menghapus materi.");
    } catch {
      alert("Gagal menghubungi server.");
    }
  }

  if (loading) {
    return (
      <div className="dash-container">
        <DashboardLoading />
      </div>
    );
  }
  if (error) {
    return (
      <div className="dash-container">
        <DashboardError message={error} onRetry={loadCurriculum} />
      </div>
    );
  }

  const totalLessons = sections.reduce((sum, s) => sum + s.lessons.length, 0);

  return (
    <div className="dash-container flex flex-col gap-8">
      <PageHeader
        breadcrumb={
          <span className="flex flex-wrap items-center gap-2">
            <Link href="/trainer-hub" className="text-accent-cyan-strong hover:underline">Trainer Hub</Link>
            <span>/</span>
            <Link href="/trainer-hub/kursus" className="text-accent-cyan-strong hover:underline">Kursus</Link>
            <span>/</span>
            <Link href={`/trainer-hub/kursus/${courseId}`} className="text-accent-cyan-strong hover:underline">Analitik</Link>
            <span>/</span>
            <span className="font-medium text-text-primary">Kurikulum</span>
          </span>
        }
        title="Editor Kurikulum"
        actions={
          <p className="text-sm text-text-secondary">
            {sections.length} modul · {totalLessons} materi
          </p>
        }
      />

      {/* Section list */}
      <div className="flex flex-col gap-4">
        {sections.length === 0 && !addingSec && (
          <EmptyState
            icon={BookOpen}
            title="Belum ada modul"
            description="Tambahkan modul pertama untuk mulai menyusun kurikulum kursus Anda."
          />
        )}

        {sections.map((section, secIdx) => {
          const isExpanded = expanded.has(section.id);

          return (
            <Card key={section.id} className="overflow-hidden rounded-[var(--radius-card)]">
              {/* Section header */}
              <div className="flex items-center gap-3 border-b border-border-default bg-surface-sunken px-5 py-3.5">
                <GripVertical size={16} className="text-text-muted cursor-grab" />

                <button
                  type="button"
                  onClick={() => toggleExpand(section.id)}
                  className="flex items-center gap-1 text-text-secondary hover:text-text-primary transition-colors"
                >
                  {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                </button>

                {editingSecId === section.id ? (
                  <div className="flex flex-1 items-center gap-2">
                    <input
                      type="text"
                      value={editSecTitle}
                      onChange={(e) => setEditSecTitle(e.target.value)}
                      className="flex-1 rounded-lg border border-border-default bg-white px-3 py-1.5 text-sm"
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleEditSection(section.id);
                        if (e.key === "Escape") setEditingSecId(null);
                      }}
                    />
                    <Button size="sm" variant="cyan" onClick={() => handleEditSection(section.id)}>
                      <Save size={14} />
                    </Button>
                    <Button size="sm" variant="secondary" onClick={() => setEditingSecId(null)}>
                      <X size={14} />
                    </Button>
                  </div>
                ) : (
                  <div className="flex flex-1 items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-text-muted">Modul {secIdx + 1}</span>
                      <h3 className="text-sm font-semibold text-text-primary">{section.title}</h3>
                      <Badge variant="neutral">{section.lessons.length} materi</Badge>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => { setEditingSecId(section.id); setEditSecTitle(section.title); }}
                        className="p-1.5 rounded-lg text-text-muted hover:text-accent-cyan-strong hover:bg-surface-accent-soft transition-colors"
                        title="Edit nama modul"
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteSection(section.id)}
                        className="p-1.5 rounded-lg text-text-muted hover:text-red-500 hover:bg-red-50 transition-colors"
                        title="Hapus modul"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Lessons */}
              {isExpanded && (
                <div className="divide-y divide-border-default">
                  {section.lessons.map((lesson, lesIdx) => {
                    const LessonIcon = LESSON_TYPE_ICON[lesson.type] ?? FileText;
                    return (
                      <div key={lesson.id} className="flex items-center gap-3 px-5 py-3 hover:bg-surface-page transition-colors">
                        <GripVertical size={14} className="text-text-muted cursor-grab" />
                        <span className="text-xs text-text-muted font-mono w-6">{secIdx + 1}.{lesIdx + 1}</span>
                        <LessonIcon size={16} className="text-accent-cyan-strong flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-text-primary truncate">{lesson.title}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-xs text-text-muted">{LESSON_TYPE_LABEL[lesson.type] ?? lesson.type}</span>
                            {lesson.duration > 0 && (
                              <span className="text-xs text-text-muted">· {lesson.duration} menit</span>
                            )}
                            {lesson.isPreview && (
                              <Badge variant="info"><Eye size={10} className="mr-0.5" /> Preview</Badge>
                            )}
                            {lesson.quiz && (
                              <Link
                                href={`/trainer-hub/kursus/${courseId}/quiz/${lesson.id}`}
                                className="text-xs text-accent-cyan-strong hover:underline"
                              >
                                Quiz ({lesson.quiz._count.questions} soal)
                              </Link>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          {lesson.type === "quiz" && !lesson.quiz && (
                            <Link
                              href={`/trainer-hub/kursus/${courseId}/quiz/${lesson.id}`}
                              className="text-xs text-accent-cyan-strong hover:underline mr-2"
                            >
                              + Buat Quiz
                            </Link>
                          )}
                          <button
                            type="button"
                            onClick={() => handleDeleteLesson(lesson.id)}
                            className="p-1.5 rounded-lg text-text-muted hover:text-red-500 hover:bg-red-50 transition-colors"
                            title="Hapus materi"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    );
                  })}

                  {/* Add lesson form */}
                  {addingLessonToSec === section.id ? (
                    <div className="px-5 py-4 bg-surface-page space-y-3">
                      <p className="text-xs font-bold text-text-muted uppercase tracking-widest">Tambah Materi Baru</p>
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <Input
                          label="Judul Materi"
                          value={newLesson.title}
                          onChange={(e) => setNewLesson({ ...newLesson, title: e.target.value })}
                          placeholder="Contoh: Pengenalan HTML"
                          required
                        />
                        <div>
                          <label className="block text-xs font-semibold text-text-primary mb-1.5">Tipe</label>
                          <select
                            value={newLesson.type}
                            onChange={(e) => setNewLesson({ ...newLesson, type: e.target.value as "video" | "text" | "quiz" })}
                            className="w-full rounded-xl border border-border-default bg-white px-3 py-2.5 text-sm"
                          >
                            <option value="video">Video</option>
                            <option value="text">Teks / Artikel</option>
                            <option value="quiz">Kuis</option>
                          </select>
                        </div>
                        {newLesson.type === "video" && (
                          <Input
                            label="URL Video (YouTube/Vimeo)"
                            value={newLesson.contentUrl}
                            onChange={(e) => setNewLesson({ ...newLesson, contentUrl: e.target.value })}
                            placeholder="https://youtube.com/watch?v=..."
                          />
                        )}
                        <Input
                          label="Durasi (menit)"
                          type="number"
                          min={0}
                          value={String(newLesson.duration)}
                          onChange={(e) => setNewLesson({ ...newLesson, duration: parseInt(e.target.value) || 0 })}
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          id={`preview-${section.id}`}
                          checked={newLesson.isPreview}
                          onChange={(e) => setNewLesson({ ...newLesson, isPreview: e.target.checked })}
                          className="rounded"
                        />
                        <label htmlFor={`preview-${section.id}`} className="text-sm text-text-secondary">
                          Jadikan preview gratis (bisa dilihat tanpa bayar)
                        </label>
                      </div>

                      {/* Video preview */}
                      {newLesson.type === "video" && newLesson.contentUrl && (
                        <div className="rounded-xl border border-border-default overflow-hidden bg-black aspect-video max-w-md">
                          <iframe
                            src={newLesson.contentUrl.replace("watch?v=", "embed/")}
                            className="w-full h-full"
                            allowFullScreen
                            title="Video preview"
                          />
                        </div>
                      )}

                      <div className="flex gap-2">
                        <Button size="sm" variant="cyan" onClick={() => handleAddLesson(section.id)}>
                          Simpan Materi
                        </Button>
                        <Button size="sm" variant="secondary" onClick={() => setAddingLessonToSec(null)}>
                          Batal
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        setAddingLessonToSec(section.id);
                        setNewLesson({ title: "", type: "video", contentUrl: "", duration: 0, isPreview: false });
                      }}
                      className="flex items-center gap-2 px-5 py-3 text-sm text-accent-cyan-strong hover:bg-surface-accent-soft transition-colors w-full"
                    >
                      <Plus size={14} /> Tambah Materi
                    </button>
                  )}
                </div>
              )}
            </Card>
          );
        })}

        {/* Add section */}
        {addingSec ? (
          <Card className="p-5 rounded-[var(--radius-card)]">
            <p className="text-xs font-bold text-text-muted uppercase tracking-widest mb-3">Modul Baru</p>
            <div className="flex gap-2">
              <input
                type="text"
                value={newSecTitle}
                onChange={(e) => setNewSecTitle(e.target.value)}
                placeholder="Nama modul, contoh: Pengenalan"
                className="flex-1 rounded-xl border border-border-default bg-white px-3 py-2.5 text-sm"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleAddSection();
                  if (e.key === "Escape") { setAddingSec(false); setNewSecTitle(""); }
                }}
              />
              <Button size="sm" variant="cyan" onClick={handleAddSection}>Simpan</Button>
              <Button size="sm" variant="secondary" onClick={() => { setAddingSec(false); setNewSecTitle(""); }}>Batal</Button>
            </div>
          </Card>
        ) : (
          <Button
            variant="secondary"
            onClick={() => setAddingSec(true)}
            className="w-full justify-center"
            leftIcon={<Plus size={16} />}
          >
            Tambah Modul Baru
          </Button>
        )}
      </div>
    </div>
  );
}
