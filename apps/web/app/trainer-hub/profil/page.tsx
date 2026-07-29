"use client";

import { useState, useEffect, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { CheckCircle2, AlertCircle } from "lucide-react";
import { Button, Card, Input, Textarea, PageHeader, DashboardLoading } from "@/components/ui";
import { getValidToken } from "@/lib/auth/token";
import { getApiBase } from "@/lib/api/base";

type UserProfile = {
  id: string;
  name: string;
  email: string;
  avatarUrl: string | null;
  profile: {
    bio: string | null;
    headline: string | null;
    linkedin: string | null;
    location: string | null;
  } | null;
};

// getApiBase() resolves to "" in the browser, keeping these calls relative so
// they go through the Next.js /api/* rewrite — same as the other trainer-hub
// pages. Hardcoding an absolute base broke whenever NEXT_PUBLIC_API_URL was
// absent at build time.
export default function TrainerProfilPage() {
  const router = useRouter();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    name: "",
    avatarUrl: "",
    bio: "",
    headline: "",
    linkedin: "",
    location: "",
  });

  useEffect(() => {
    (async () => {
      const token = await getValidToken();
      if (!token) { router.replace("/masuk"); return; }
      try {
        const r = await fetch(`${getApiBase()}/api/auth/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const d = await r.json();
        if (d.success) {
          setUser(d.data);
          setForm({
            name: d.data.name ?? "",
            avatarUrl: d.data.avatarUrl ?? "",
            bio: d.data.profile?.bio ?? "",
            headline: d.data.profile?.headline ?? "",
            linkedin: d.data.profile?.linkedin ?? "",
            location: d.data.profile?.location ?? "",
          });
        }
      } finally {
        setLoading(false);
      }
    })();
  }, [router]);

  async function handleSave(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSaved(false);
    const token = await getValidToken();
    if (!token) { router.replace("/masuk"); return; }
    const res = await fetch(`${getApiBase()}/api/users/me`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        name: form.name,
        avatarUrl: form.avatarUrl || undefined,
        bio: form.bio || undefined,
        headline: form.headline || undefined,
        linkedin: form.linkedin || undefined,
        location: form.location || undefined,
      }),
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok || !data.success) {
      // The API error envelope is { success:false, error:{ code, message } } —
      // reading data.message always yielded undefined, hiding the server reason.
      setError(data.error?.message ?? "Gagal menyimpan profil.");
      return;
    }
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  }

  if (loading) {
    return (
      <div className="dash-container flex flex-col gap-8">
        <DashboardLoading />
      </div>
    );
  }

  const initials = (user?.name ?? "T").charAt(0).toUpperCase();

  return (
    <div className="dash-container flex flex-col gap-8">
      <PageHeader
        breadcrumb={
          <span className="flex flex-wrap items-center gap-2">
            <Link href="/trainer-hub" className="text-accent-cyan-strong hover:underline">Trainer Hub</Link>
            <span>/</span>
            <span className="font-medium text-text-primary">Profil Saya</span>
          </span>
        }
        title="Profil Saya"
      />

      <form onSubmit={handleSave} className="flex flex-col gap-6">
        {/* Avatar preview */}
        <Card className="rounded-[var(--radius-card)] p-6">
            <div className="mb-6 flex items-center gap-4">
              <div className="h-16 w-16 flex-shrink-0 overflow-hidden rounded-full">
                {form.avatarUrl ? (
                  // Kept as a plain <img>: this is a live preview of a URL the user is
                  // typing into the form. The host is arbitrary/unvalidated and the
                  // onError handler hides broken/partial URLs mid-type — behavior that
                  // next/image (which errors on unconfigured hosts) cannot replicate.
                  <img
                    src={form.avatarUrl}
                    alt="Avatar"
                    className="h-full w-full object-cover"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-accent-cyan-strong text-xl font-bold text-white">
                    {initials}
                  </div>
                )}
              </div>
              <div>
                <p className="font-semibold text-text-primary">{user?.name}</p>
                <p className="text-sm text-text-secondary">{user?.email}</p>
              </div>
            </div>

            <h2 className="mb-4 font-display text-sm font-semibold text-text-primary">Informasi Dasar</h2>
            <div className="space-y-4">
              <Input
                label="Nama Tampilan"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
                placeholder="Nama Anda"
              />
              <Input
                label="URL Foto Profil"
                type="url"
                value={form.avatarUrl}
                onChange={(e) => setForm({ ...form, avatarUrl: e.target.value })}
                placeholder="https://cdn.contoh.com/foto.jpg"
                hint="URL ke foto profil publik Anda"
              />
              <Input
                label="Headline Profesional"
                value={form.headline}
                onChange={(e) => setForm({ ...form, headline: e.target.value })}
                placeholder="Contoh: Digital Marketing Expert | 10+ tahun pengalaman"
                maxLength={120}
              />
              <Input
                label="Lokasi"
                value={form.location}
                onChange={(e) => setForm({ ...form, location: e.target.value })}
                placeholder="Jakarta, Indonesia"
              />
            </div>
          </Card>

          <Card className="space-y-4 rounded-[var(--radius-card)] p-6">
            <h2 className="font-display text-sm font-semibold text-text-primary">Bio &amp; Media Sosial</h2>
            <div>
              <Textarea
                label="Bio"
                value={form.bio}
                onChange={(e) => setForm({ ...form, bio: e.target.value })}
                rows={5}
                placeholder="Ceritakan tentang keahlian, pengalaman, dan passion Anda sebagai trainer..."
                maxLength={1000}
              />
              <p className="mt-1 text-right text-xs text-text-muted">{form.bio.length}/1000</p>
            </div>
            <Input
              label="LinkedIn"
              value={form.linkedin.replace(/^.*linkedin\.com\/in\//i, "")}
              onChange={(e) => setForm({ ...form, linkedin: `https://linkedin.com/in/${e.target.value}` })}
              placeholder="username-anda"
              hint="linkedin.com/in/username-anda"
            />
          </Card>

          {error && (
            <div className="flex items-center gap-2 rounded-[var(--radius-md)] border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              <AlertCircle size={16} className="flex-shrink-0" aria-hidden="true" />
              {error}
            </div>
          )}
          {saved && (
            <div className="flex items-center gap-2 rounded-[var(--radius-md)] border border-green-200 bg-green-50 p-3 text-sm text-green-700">
              <CheckCircle2 size={16} className="flex-shrink-0" aria-hidden="true" />
              Profil berhasil disimpan.
            </div>
          )}

          <Button type="submit" variant="cyan" disabled={saving} loading={saving} className="w-full">
            {saving ? "Menyimpan..." : "Simpan Profil"}
          </Button>
      </form>
    </div>
  );
}
