"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Save } from "lucide-react";
import {
  Button,
  Card,
  Input,
  Textarea,
  PageHeader,
  DashboardLoading,
  DashboardError,
} from "@/components/ui";
import { getValidToken } from "@/lib/auth/token";

type Category = { id: string; name: string; slug: string };

type CourseDetail = {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  shortDesc: string | null;
  price: number;
  salePrice: number | null;
  categoryId: string | null;
  level: string | null;
  thumbnailUrl: string | null;
  previewVideo: string | null;
};

export default function EditCoursePage() {
  const { courseId } = useParams<{ courseId: string }>();
  const router = useRouter();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [saved, setSaved] = useState(false);

  const [form, setForm] = useState({
    title: "",
    description: "",
    shortDesc: "",
    price: "",
    salePrice: "",
    categoryId: "",
    level: "beginner",
    thumbnailUrl: "",
    previewVideo: "",
  });

  useEffect(() => {
    async function load() {
      const token = await getValidToken();
      if (!token) { router.replace("/masuk"); return; }

      try {
        const [courseRes, catRes] = await Promise.all([
          fetch(`/api/trainer/courses/${courseId}/analytics`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          fetch("/api/categories"),
        ]);

        const courseData = await courseRes.json();
        const catData = await catRes.json();

        if (catData.success) setCategories(catData.data);

        if (courseData.success) {
          // We need more detail than analytics provides — fetch via admin-style detail
          // Actually, the analytics endpoint has limited fields. Let's fetch the full
          // course detail from the courses endpoint.
          const fullRes = await fetch(`/api/courses/${courseId}`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          const fullData = await fullRes.json();
          if (fullData.success) {
            const c = fullData.data as CourseDetail;
            setForm({
              title: c.title ?? "",
              description: c.description ?? "",
              shortDesc: c.shortDesc ?? "",
              price: String(Number(c.price) || 0),
              salePrice: c.salePrice ? String(Number(c.salePrice)) : "",
              categoryId: c.categoryId ?? "",
              level: c.level ?? "beginner",
              thumbnailUrl: c.thumbnailUrl ?? "",
              previewVideo: c.previewVideo ?? "",
            });
          }
        } else {
          setError(courseData.error?.message ?? "Gagal memuat data kursus.");
        }
      } catch {
        setError("Gagal memuat data kursus.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [courseId, router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim()) {
      setError("Judul kursus wajib diisi.");
      return;
    }

    setSubmitting(true);
    setError("");
    setSaved(false);
    const token = await getValidToken();
    if (!token) { router.replace("/masuk"); return; }

    try {
      const body: Record<string, unknown> = {
        title: form.title.trim(),
        price: parseFloat(form.price) || 0,
      };
      if (form.description) body.description = form.description;
      if (form.shortDesc) body.shortDesc = form.shortDesc;
      body.salePrice = form.salePrice ? parseFloat(form.salePrice) : null;
      if (form.categoryId) body.categoryId = form.categoryId;
      if (form.level) body.level = form.level;
      body.thumbnailUrl = form.thumbnailUrl || null;
      body.previewVideo = form.previewVideo || null;

      const r = await fetch(`/api/courses/${courseId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });
      const d = await r.json();
      if (d.success) {
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      } else {
        setError(d.error?.message ?? "Gagal menyimpan perubahan.");
      }
    } catch {
      setError("Gagal menghubungi server.");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="dash-container">
        <DashboardLoading />
      </div>
    );
  }

  if (error && !form.title) {
    return (
      <div className="dash-container">
        <DashboardError message={error} onRetry={() => window.location.reload()} />
      </div>
    );
  }

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
            <span className="font-medium text-text-primary">Edit Info Kursus</span>
          </span>
        }
        title="Edit Info Kursus"
      />

      <form onSubmit={handleSubmit} className="flex flex-col gap-6">
        <Card className="rounded-[var(--radius-card)] p-6 space-y-4">
          <h2 className="font-display text-sm font-semibold text-text-primary">Informasi Dasar</h2>

          <Input
            label="Judul Kursus *"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            required
            maxLength={200}
          />

          <Textarea
            label="Deskripsi Lengkap"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            rows={6}
            maxLength={10000}
          />

          <Input
            label="Deskripsi Singkat"
            value={form.shortDesc}
            onChange={(e) => setForm({ ...form, shortDesc: e.target.value })}
            maxLength={500}
          />
        </Card>

        <Card className="rounded-[var(--radius-card)] p-6 space-y-4">
          <h2 className="font-display text-sm font-semibold text-text-primary">Harga & Kategori</h2>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input
              label="Harga (Rp)"
              type="number"
              min={0}
              step={1000}
              value={form.price}
              onChange={(e) => setForm({ ...form, price: e.target.value })}
            />
            <Input
              label="Harga Promo (Rp)"
              type="number"
              min={0}
              step={1000}
              value={form.salePrice}
              onChange={(e) => setForm({ ...form, salePrice: e.target.value })}
              hint="Kosongkan jika tidak ada promo"
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-semibold text-text-primary mb-1.5">Kategori</label>
              <select
                value={form.categoryId}
                onChange={(e) => setForm({ ...form, categoryId: e.target.value })}
                className="w-full rounded-xl border border-border-default bg-white px-3 py-2.5 text-sm"
              >
                <option value="">— Pilih Kategori —</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-text-primary mb-1.5">Level</label>
              <select
                value={form.level}
                onChange={(e) => setForm({ ...form, level: e.target.value })}
                className="w-full rounded-xl border border-border-default bg-white px-3 py-2.5 text-sm"
              >
                <option value="beginner">Pemula (Beginner)</option>
                <option value="intermediate">Menengah (Intermediate)</option>
                <option value="advanced">Mahir (Advanced)</option>
              </select>
            </div>
          </div>
        </Card>

        <Card className="rounded-[var(--radius-card)] p-6 space-y-4">
          <h2 className="font-display text-sm font-semibold text-text-primary">Media</h2>

          <Input
            label="URL Thumbnail"
            type="url"
            value={form.thumbnailUrl}
            onChange={(e) => setForm({ ...form, thumbnailUrl: e.target.value })}
            hint="Gambar cover kursus (rasio 16:9)"
          />

          {form.thumbnailUrl && (
            <div className="rounded-xl border border-border-default overflow-hidden max-w-xs">
              <img
                src={form.thumbnailUrl}
                alt="Preview"
                className="w-full aspect-video object-cover"
                onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
              />
            </div>
          )}

          <Input
            label="URL Preview Video"
            type="url"
            value={form.previewVideo}
            onChange={(e) => setForm({ ...form, previewVideo: e.target.value })}
            hint="YouTube/Vimeo"
          />
        </Card>

        {error && (
          <div className="rounded-[var(--radius-md)] border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}
        {saved && (
          <div className="rounded-[var(--radius-md)] border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
            ✓ Perubahan berhasil disimpan.
          </div>
        )}

        <div className="flex gap-3">
          <Button
            type="submit"
            variant="cyan"
            disabled={submitting}
            loading={submitting}
            leftIcon={<Save size={16} />}
          >
            {submitting ? "Menyimpan..." : "Simpan Perubahan"}
          </Button>
          <Link href={`/trainer-hub/kursus/${courseId}`}>
            <Button type="button" variant="secondary">Kembali ke Analitik</Button>
          </Link>
        </div>
      </form>
    </div>
  );
}
