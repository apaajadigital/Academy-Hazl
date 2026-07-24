"use client";

import { useState, useEffect, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { Button, Card, Input, Textarea } from "@/components/ui";
import { getValidToken } from "@/lib/auth/token";

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

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";


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
        const r = await fetch(`${API}/api/auth/me`, {
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
    const res = await fetch(`${API}/api/users/me`, {
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
      setError(data.message ?? "Gagal menyimpan profil.");
      return;
    }
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface-page">
        <Loader2 className="animate-spin text-accent-cyan-strong" size={32} aria-hidden="true" />
      </div>
    );
  }

  const initials = (user?.name ?? "T").charAt(0).toUpperCase();

  return (
    <div className="min-h-screen bg-surface-page">
      <div className="border-b border-border-default bg-surface-card px-6 py-4">
        <div className="mx-auto flex max-w-2xl items-center gap-2 text-sm">
          <Link href="/trainer-hub" className="text-accent-cyan-strong hover:underline">Trainer Hub</Link>
          <span className="text-text-secondary">/</span>
          <span className="font-medium text-text-primary">Profil Saya</span>
        </div>
      </div>

      <div className="mx-auto max-w-2xl p-6">
        <form onSubmit={handleSave} className="space-y-6">
          {/* Avatar preview */}
          <Card className="p-6">
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

          <Card className="space-y-4 p-6">
            <h2 className="font-display text-sm font-semibold text-text-primary">Bio & Media Sosial</h2>
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
            <div>
              <label className="mb-1.5 block text-sm font-medium text-text-primary">LinkedIn</label>
              <div className="flex items-center">
                <span className="whitespace-nowrap rounded-l-[var(--radius-md)] border border-r-0 border-border-strong bg-surface-sunken px-3 py-2.5 text-sm text-text-secondary">linkedin.com/in/</span>
                <input
                  value={form.linkedin.replace(/^.*linkedin\.com\/in\//i, "")}
                  onChange={(e) => setForm({ ...form, linkedin: `https://linkedin.com/in/${e.target.value}` })}
                  className="w-full rounded-r-[var(--radius-md)] border border-border-strong bg-surface-card px-4 py-2.5 text-[0.9375rem] text-text-primary outline-none transition-[border-color,box-shadow] placeholder:text-text-muted focus:border-accent-cyan-strong focus:ring-2 focus:ring-accent-cyan-strong/20"
                  placeholder="username-anda"
                />
              </div>
            </div>
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
    </div>
  );
}
