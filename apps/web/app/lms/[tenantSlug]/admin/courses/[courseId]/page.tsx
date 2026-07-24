"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Trash2 } from "lucide-react";
import { getValidToken } from "@/lib/auth/token";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Select } from "@/components/ui/Select";

type Lesson = {
  id: string;
  title: string;
  content: string | null;
  videoUrl: string | null;
  durationMins: number | null;
  sortOrder: number;
  _count: { quizzes: number };
};

type Batch = { id: string; name: string };

export default function LmsAdminCourseBuilderPage() {
  const { tenantSlug, courseId } = useParams<{ tenantSlug: string; courseId: string }>();
  const router = useRouter();
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [loading, setLoading] = useState(true);
  const [lessonForm, setLessonForm] = useState({ title: "", content: "", videoUrl: "", durationMins: "" });
  const [assignBatchId, setAssignBatchId] = useState("");
  const [assigning, setAssigning] = useState(false);

  const fetchData = useCallback(async () => {
    const token = await getValidToken();
    if (!token) { router.replace("/masuk"); return; }
    const authHeaders = { Authorization: `Bearer ${token}` };
    const meRes = await fetch("/api/lms/portal/me", { headers: authHeaders });
    const meData = await meRes.json();
    const myTenant = meData.data?.find((t: { slug: string; id: string }) => t.slug === tenantSlug);
    if (!myTenant) return;
    setTenantId(myTenant.id);
    const [lessonRes, batchRes] = await Promise.all([
      fetch(`/api/lms/tenants/${myTenant.id}/courses/${courseId}/lessons`, { headers: authHeaders }),
      fetch(`/api/lms/tenants/${myTenant.id}/batches`, { headers: authHeaders }),
    ]);
    const lessonData = await lessonRes.json();
    const batchData = await batchRes.json();
    setLessons(lessonData.data ?? []);
    setBatches(batchData.data ?? []);
    setLoading(false);
  }, [tenantSlug, courseId, router]);

  useEffect(() => { fetchData(); }, [fetchData]);

  async function addLesson(e: React.FormEvent) {
    e.preventDefault();
    if (!tenantId) return;
    const body = {
      title: lessonForm.title,
      content: lessonForm.content || undefined,
      videoUrl: lessonForm.videoUrl || undefined,
      durationMins: lessonForm.durationMins ? Number(lessonForm.durationMins) : undefined,
      sortOrder: lessons.length,
    };
    const token = await getValidToken();
    if (!token) { router.replace("/masuk"); return; }
    const res = await fetch(`/api/lms/tenants/${tenantId}/courses/${courseId}/lessons`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify(body),
    });
    if (res.ok) { setLessonForm({ title: "", content: "", videoUrl: "", durationMins: "" }); fetchData(); }
  }

  async function deleteLesson(lessonId: string) {
    if (!tenantId || !confirm("Hapus pelajaran ini?")) return;
    const token = await getValidToken();
    if (!token) { router.replace("/masuk"); return; }
    await fetch(`/api/lms/tenants/${tenantId}/courses/${courseId}/lessons/${lessonId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    fetchData();
  }

  async function assignToBatch(e: React.FormEvent) {
    e.preventDefault();
    if (!tenantId || !assignBatchId) return;
    setAssigning(true);
    const token = await getValidToken();
    if (!token) { router.replace("/masuk"); return; }
    await fetch(`/api/lms/tenants/${tenantId}/courses/${courseId}/assign`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ batchId: assignBatchId, isMandatory: true }),
    });
    setAssigning(false);
    alert("Kursus berhasil ditugaskan ke batch.");
  }

  return (
    <div className="mx-auto max-w-4xl p-6">
      <div className="mb-4 flex items-center gap-2 text-sm text-text-secondary">
        <Link href={`/lms/${tenantSlug}/admin/courses`} className="transition-colors hover:text-accent-cyan-strong">Kursus</Link>
        <span>/</span>
        <span className="text-text-primary">Edit Materi</span>
      </div>

      <h1 className="mb-6 font-display text-xl font-bold text-text-primary">Course Builder</h1>

      {loading ? (
        <div className="py-8 text-center text-text-secondary">Memuat...</div>
      ) : (
        <div className="space-y-6">
          <Card className="p-5">
            <h2 className="mb-4 text-base font-semibold text-text-primary">Daftar Pelajaran ({lessons.length})</h2>
            {lessons.length === 0 ? (
              <p className="text-sm text-text-secondary">Belum ada pelajaran. Tambah pelajaran di bawah.</p>
            ) : (
              <div className="space-y-2">
                {lessons.map((l, i) => (
                  <div key={l.id} className="flex items-center gap-3 rounded-[var(--radius-md)] bg-surface-sunken p-3">
                    <span className="w-6 text-center text-xs font-bold text-text-secondary">{i + 1}</span>
                    <div className="flex-1">
                      <div className="text-sm font-medium text-text-primary">{l.title}</div>
                      <div className="text-xs text-text-secondary">
                        {l.durationMins ? `${l.durationMins} menit · ` : ""}
                        {l._count.quizzes} kuis
                        {l.videoUrl && " · ada video"}
                      </div>
                    </div>
                    <button onClick={() => deleteLesson(l.id)} className="inline-flex items-center gap-1 text-xs font-semibold text-red-600 hover:underline">
                      <Trash2 size={14} />
                      Hapus
                    </button>
                  </div>
                ))}
              </div>
            )}
          </Card>

          <Card className="p-5">
            <h2 className="mb-4 text-base font-semibold text-text-primary">Tambah Pelajaran</h2>
            <form onSubmit={addLesson} className="space-y-3">
              <Input value={lessonForm.title} onChange={(e) => setLessonForm({ ...lessonForm, title: e.target.value })} placeholder="Judul pelajaran" required />
              <Textarea value={lessonForm.content} onChange={(e) => setLessonForm({ ...lessonForm, content: e.target.value })} placeholder="Konten teks (markdown/HTML)" rows={3} />
              <div className="grid grid-cols-2 gap-3">
                <Input value={lessonForm.videoUrl} onChange={(e) => setLessonForm({ ...lessonForm, videoUrl: e.target.value })} placeholder="URL video (opsional)" />
                <Input type="number" value={lessonForm.durationMins} onChange={(e) => setLessonForm({ ...lessonForm, durationMins: e.target.value })} placeholder="Durasi (menit)" />
              </div>
              <Button type="submit" variant="cyan" size="sm">
                + Tambah Pelajaran
              </Button>
            </form>
          </Card>

          {batches.length > 0 && (
            <Card className="p-5">
              <h2 className="mb-4 text-base font-semibold text-text-primary">Tugaskan ke Batch</h2>
              <form onSubmit={assignToBatch} className="flex gap-3">
                <Select value={assignBatchId} onChange={(e) => setAssignBatchId(e.target.value)} containerClassName="flex-1" required>
                  <option value="">Pilih batch</option>
                  {batches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
                </Select>
                <Button type="submit" variant="cyan" size="sm" disabled={assigning}>
                  {assigning ? "Menugaskan..." : "Tugaskan"}
                </Button>
              </form>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
