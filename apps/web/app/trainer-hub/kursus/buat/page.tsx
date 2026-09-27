"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { PlusCircle, Sparkles } from "lucide-react";
import {
  Button,
  Card,
  Input,
  Textarea,
  PageHeader,
} from "@/components/ui";
import { getValidToken } from "@/lib/auth/token";

type Category = { id: string; name: string; slug: string };

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 120);
}

export default function CreateCoursePage() {
  const router = useRouter();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loadingCats, setLoadingCats] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    title: "",
    slug: "",
    description: "",
    shortDesc: "",
    price: "",
    salePrice: "",
    categoryId: "",
    level: "beginner" as "beginner" | "intermediate" | "advanced",
    thumbnailUrl: "",
    previewVideo: "",
  });

  // Auto-generate slug from title
  const [slugManual, setSlugManual] = useState(false);

  useEffect(() => {
    fetch("/api/categories")
      .then((r) => r.json())
      .then((d) => {
        if (d.success) setCategories(d.data);
      })
      .finally(() => setLoadingCats(false));
  }, []);

  function handleTitleChange(title: string) {
    setForm((f) => ({
      ...f,
      title,
      ...(slugManual ? {} : { slug: slugify(title) }),
    }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim() || !form.slug.trim()) {
      setError("Judul dan slug kursus wajib diisi.");
      return;
    }

    setSubmitting(true);
    setError("");
    const token = await getValidToken();
    if (!token) { router.replace("/masuk"); return; }

    try {
      const body: Record<string, unknown> = {
        title: form.title.trim(),
        slug: form.slug.trim(),
        price: parseFloat(form.price) || 0,
      };
      if (form.description) body.description = form.description;
      if (form.shortDesc) body.shortDesc = form.shortDesc;
      if (form.salePrice) body.salePrice = parseFloat(form.salePrice);
      if (form.categoryId) body.categoryId = form.categoryId;
      if (form.level) body.level = form.level;
      if (form.thumbnailUrl) body.thumbnailUrl = form.thumbnailUrl;
      if (form.previewVideo) body.previewVideo = form.previewVideo;

      const r = await fetch("/api/courses", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });
      const d = await r.json();
      if (d.success) {
        router.push(`/trainer-hub/kursus/${d.data.id}`);
      } else {
        setError(d.error?.message ?? "Gagal membuat kursus.");
      }
    } catch {
      setError("Gagal menghubungi server.");
    } finally {
      setSubmitting(false);
    }
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
            <span className="font-medium text-text-primary">Buat Kursus Baru</span>
          </span>
        }
        title="Buat Kursus Baru"
      />

      <form onSubmit={handleSubmit} className="flex flex-col gap-6">
        {/* Basic Info */}
        <Card className="rounded-[var(--radius-card)] p-6 space-y-4">
          <h2 className="font-display text-sm font-semibold text-text-primary flex items-center gap-2">
            <Sparkles size={16} className="text-accent-cyan-strong" />
            Informasi Dasar
          </h2>

          <Input
            label="Judul Kursus *"
            value={form.title}
            onChange={(e) => handleTitleChange(e.target.value)}
            placeholder="Contoh: Mastering Digital Marketing dari Nol"
            required
            maxLength={200}
          />

          <div>
            <Input
              label="Slug URL *"
              value={form.slug}
              onChange={(e) => {
                setSlugManual(true);
                setForm({ ...form, slug: slugify(e.target.value) });
              }}
              placeholder="mastering-digital-marketing-dari-nol"
              required
              hint={`URL: hazl.id/kursus/${form.slug || "..."}`}
            />
          </div>

          <Textarea
            label="Deskripsi Lengkap"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            placeholder="Jelaskan apa yang akan dipelajari siswa, untuk siapa kursus ini, dan apa manfaatnya..."
            rows={6}
            maxLength={10000}
          />
          <p className="text-right text-xs text-text-muted">{form.description.length}/10000</p>

          <Input
            label="Deskripsi Singkat"
            value={form.shortDesc}
            onChange={(e) => setForm({ ...form, shortDesc: e.target.value })}
            placeholder="Ringkasan 1-2 kalimat untuk ditampilkan di card"
            maxLength={500}
          />
        </Card>

        {/* Pricing & Category */}
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
              placeholder="0 untuk kursus gratis"
              hint="Isi 0 untuk kursus gratis"
            />
            <Input
              label="Harga Promo (Rp)"
              type="number"
              min={0}
              step={1000}
              value={form.salePrice}
              onChange={(e) => setForm({ ...form, salePrice: e.target.value })}
              placeholder="Opsional"
              hint="Harga diskon (opsional)"
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-semibold text-text-primary mb-1.5">Kategori</label>
              {loadingCats ? (
                <div className="h-10 rounded-xl bg-surface-sunken animate-pulse" />
              ) : (
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
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-text-primary mb-1.5">Level</label>
              <select
                value={form.level}
                onChange={(e) => setForm({ ...form, level: e.target.value as "beginner" | "intermediate" | "advanced" })}
                className="w-full rounded-xl border border-border-default bg-white px-3 py-2.5 text-sm"
              >
                <option value="beginner">Pemula (Beginner)</option>
                <option value="intermediate">Menengah (Intermediate)</option>
                <option value="advanced">Mahir (Advanced)</option>
              </select>
            </div>
          </div>
        </Card>

        {/* Media */}
        <Card className="rounded-[var(--radius-card)] p-6 space-y-4">
          <h2 className="font-display text-sm font-semibold text-text-primary">Media</h2>

          <Input
            label="URL Thumbnail (Cover)"
            type="url"
            value={form.thumbnailUrl}
            onChange={(e) => setForm({ ...form, thumbnailUrl: e.target.value })}
            placeholder="https://cdn.contoh.com/cover-kursus.jpg"
            hint="Gambar cover kursus (rasio 16:9 disarankan)"
          />

          {form.thumbnailUrl && (
            <div className="rounded-xl border border-border-default overflow-hidden max-w-xs">
              <img
                src={form.thumbnailUrl}
                alt="Preview thumbnail"
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
            placeholder="https://youtube.com/watch?v=..."
            hint="Video perkenalan kursus (YouTube/Vimeo)"
          />
        </Card>

        {/* Error & Submit */}
        {error && (
          <div className="rounded-[var(--radius-md)] border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="flex gap-3">
          <Button
            type="submit"
            variant="cyan"
            disabled={submitting}
            loading={submitting}
            leftIcon={<PlusCircle size={16} />}
            className="flex-1 sm:flex-none"
          >
            {submitting ? "Membuat Kursus..." : "Buat Kursus"}
          </Button>
          <Link href="/trainer-hub/kursus">
            <Button type="button" variant="secondary">Batal</Button>
          </Link>
        </div>

        <p className="text-xs text-text-muted">
          Kursus akan dibuat dengan status <strong>Draft</strong>. Anda bisa menambahkan kurikulum, lalu mengajukan review ke admin untuk dipublikasikan.
        </p>
      </form>
    </div>
  );
}
