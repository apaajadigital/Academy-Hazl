"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { SquarePen } from "lucide-react";
import { getValidToken } from "@/lib/auth/token";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Select } from "@/components/ui/Select";
import { Modal, ModalContent } from "@/components/ui/Modal";

type Course = {
  id: string;
  title: string;
  description: string | null;
  status: string;
  createdAt: string;
  _count: { lessons: number; enrollments: number };
};

export default function LmsAdminCoursesPage() {
  const { tenantSlug } = useParams<{ tenantSlug: string }>();
  const router = useRouter();
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: "", description: "", status: "draft" });

  const fetchData = useCallback(async () => {
    setLoading(true);
    const token = await getValidToken();
    if (!token) { router.replace("/masuk"); return; }
    const authHeaders = { Authorization: `Bearer ${token}` };
    const meRes = await fetch("/api/lms/portal/me", { headers: authHeaders });
    const meData = await meRes.json();
    const myTenant = meData.data?.find((t: { slug: string; id: string }) => t.slug === tenantSlug);
    if (!myTenant) { setLoading(false); return; }
    setTenantId(myTenant.id);
    const res = await fetch(`/api/lms/tenants/${myTenant.id}/courses`, { headers: authHeaders });
    const data = await res.json();
    setCourses(data.data ?? []);
    setLoading(false);
  }, [tenantSlug, router]);

  useEffect(() => { fetchData(); }, [fetchData]);

  async function createCourse(e: React.FormEvent) {
    e.preventDefault();
    if (!tenantId) return;
    const token = await getValidToken();
    if (!token) { router.replace("/masuk"); return; }
    const res = await fetch(`/api/lms/tenants/${tenantId}/courses`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify(form),
    });
    if (res.ok) { setShowForm(false); setForm({ title: "", description: "", status: "draft" }); fetchData(); }
  }

  return (
    <div className="mx-auto max-w-4xl p-6">
      <div className="mb-4 flex items-center gap-2 text-sm text-text-secondary">
        <Link href={`/lms/${tenantSlug}/admin`} className="transition-colors hover:text-accent-cyan-strong">Admin</Link>
        <span>/</span>
        <span className="text-text-primary">Kursus LMS</span>
      </div>

      <div className="mb-6 flex items-center justify-between">
        <h1 className="font-display text-xl font-bold text-text-primary">Course Builder</h1>
        <Button variant="cyan" size="sm" onClick={() => setShowForm(true)}>
          + Kursus Baru
        </Button>
      </div>

      <Modal open={showForm} onOpenChange={setShowForm}>
        <ModalContent title="Buat Kursus LMS">
          <form onSubmit={createCourse} className="space-y-4">
            <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Judul kursus" required />
            <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Deskripsi (opsional)" rows={3} />
            <Select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
              <option value="draft">Draft</option>
              <option value="published">Publikasikan</option>
            </Select>
            <div className="flex gap-3">
              <Button type="button" variant="secondary" className="flex-1" onClick={() => setShowForm(false)}>Batal</Button>
              <Button type="submit" variant="cyan" className="flex-1">Buat</Button>
            </div>
          </form>
        </ModalContent>
      </Modal>

      {loading ? (
        <div className="py-8 text-center text-text-secondary">Memuat...</div>
      ) : courses.length === 0 ? (
        <div className="py-12 text-center text-text-secondary">Belum ada kursus. Buat kursus pertama!</div>
      ) : (
        <div className="grid gap-4">
          {courses.map((c) => (
            <Card key={c.id} className="p-5">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-text-primary">{c.title}</h3>
                    <Badge variant={c.status === "published" ? "success" : "warning"}>
                      {c.status === "published" ? "Dipublikasikan" : "Draft"}
                    </Badge>
                  </div>
                  {c.description && <p className="mt-1 line-clamp-2 text-sm text-text-secondary">{c.description}</p>}
                  <div className="mt-2 text-xs text-text-secondary">
                    {c._count.lessons} pelajaran · {c._count.enrollments} peserta
                  </div>
                </div>
                <Link
                  href={`/lms/${tenantSlug}/admin/courses/${c.id}`}
                  className="ml-4 inline-flex items-center gap-1.5 rounded-full border border-solid border-border-strong px-3 py-1.5 text-xs font-semibold text-accent-cyan-strong transition-colors hover:border-accent-cyan-strong hover:bg-surface-accent-soft"
                >
                  <SquarePen size={14} />
                  Edit Materi
                </Link>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
