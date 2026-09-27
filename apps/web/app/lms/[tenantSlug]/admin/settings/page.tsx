"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { Save } from "lucide-react";
import { getValidToken } from "@/lib/auth/token";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

type TenantSettings = {
  id: string;
  name: string;
  slug: string;
  logoUrl: string | null;
  primaryColor: string;
  customDomain: string | null;
  seatLimit: number;
  planType: string;
  isActive: boolean;
  trialEndsAt: string | null;
};

const PLAN_LABELS: Record<string, string> = {
  trial: "Trial (14 hari)",
  starter: "Starter",
  pro: "Pro",
  enterprise: "Enterprise",
};

export default function LmsAdminSettingsPage() {
  const { tenantSlug } = useParams<{ tenantSlug: string }>();
  const router = useRouter();
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [settings, setSettings] = useState<TenantSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    name: "",
    primaryColor: "#0077A8",
    logoUrl: "",
    customDomain: "",
  });

  const fetchData = useCallback(async () => {
    const token = await getValidToken();
    if (!token) { router.replace("/masuk"); return; }
    const authHeaders = { Authorization: `Bearer ${token}` };
    const meRes = await fetch("/api/lms/portal/me", { headers: authHeaders });
    const meData = await meRes.json();
    const myTenant = meData.data?.find((t: { slug: string; id: string }) => t.slug === tenantSlug);
    if (!myTenant) { setLoading(false); return; }
    setTenantId(myTenant.id);

    const res = await fetch(`/api/lms/tenants/${myTenant.id}`, { headers: authHeaders });
    const data = await res.json();
    if (data.success) {
      const t: TenantSettings = data.data;
      setSettings(t);
      setForm({
        name: t.name,
        primaryColor: t.primaryColor ?? "#0077A8",
        logoUrl: t.logoUrl ?? "",
        customDomain: t.customDomain ?? "",
      });
    }
    setLoading(false);
  }, [tenantSlug, router]);

  useEffect(() => { fetchData(); }, [fetchData]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!tenantId) return;
    setSaving(true);
    setError(null);
    setSaved(false);

    const body: Record<string, string | undefined> = {
      name: form.name,
      primaryColor: form.primaryColor,
      logoUrl: form.logoUrl || undefined,
      customDomain: form.customDomain || undefined,
    };

    const token = await getValidToken();
    if (!token) { router.replace("/masuk"); return; }
    const res = await fetch(`/api/lms/tenants/${tenantId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    setSaving(false);

    if (!res.ok || !data.success) {
      setError(data.message ?? "Gagal menyimpan pengaturan.");
      return;
    }
    setSaved(true);
    await fetchData();
    setTimeout(() => setSaved(false), 3000);
  }

  if (loading) return <div className="p-6 text-center text-text-secondary">Memuat...</div>;
  if (!settings) return <div className="p-6 text-center text-red-600">Tidak ada akses atau tenant tidak ditemukan.</div>;

  const trialExpired = settings.planType === "trial" && settings.trialEndsAt
    ? new Date(settings.trialEndsAt) < new Date()
    : false;

  return (
    <div className="mx-auto max-w-2xl p-6">
      <h1 className="mb-1 font-display text-xl font-bold text-text-primary">Pengaturan Workspace</h1>
      <p className="mb-8 text-sm text-text-secondary">Kelola identitas visual dan konfigurasi LMS Anda.</p>

      {/* Plan info */}
      <div className={`mb-6 rounded-[var(--radius-lg)] border border-solid p-4 ${trialExpired ? "border-amber-300 bg-amber-50" : "border-border-default bg-surface-sunken"}`}>
        <div className="flex items-center justify-between">
          <div>
            <div className="mb-1 text-xs font-semibold uppercase tracking-wider text-text-secondary">Paket Aktif</div>
            <div className="text-sm font-semibold text-text-primary">{PLAN_LABELS[settings.planType] ?? settings.planType}</div>
          </div>
          <div className="text-right">
            <div className="text-xs text-text-secondary">Batas pengguna</div>
            <div className="text-sm font-semibold text-text-primary">{settings.seatLimit} karyawan</div>
          </div>
        </div>
        {settings.planType === "trial" && settings.trialEndsAt && (
          <div className={`mt-2 text-xs ${trialExpired ? "font-semibold text-amber-700" : "text-text-secondary"}`}>
            {trialExpired
              ? "⚠️ Masa trial telah berakhir. Hubungi admin Hazl Academy untuk upgrade."
              : `Trial berakhir: ${new Date(settings.trialEndsAt).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}`}
          </div>
        )}
        {!settings.isActive && (
          <div className="mt-2 text-xs font-semibold text-red-600">⚠️ Workspace sedang tidak aktif.</div>
        )}
      </div>

      {/* Branding form */}
      <form onSubmit={handleSave} className="space-y-5">
        <Card className="space-y-4 p-5">
          <h2 className="text-sm font-semibold text-text-primary">Identitas &amp; Branding</h2>

          <Input
            label="Nama Organisasi"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            required
            placeholder="Nama perusahaan atau institusi"
          />

          <div>
            <Input
              label="URL Logo"
              value={form.logoUrl}
              onChange={(e) => setForm({ ...form, logoUrl: e.target.value })}
              placeholder="https://cdn.perusahaan.com/logo.png"
              type="url"
            />
            {form.logoUrl && (
              <div className="mt-2 flex items-center gap-2">
                {/* Kept as a plain <img>: live preview of a user-typed logo URL on an
                    arbitrary host. The onError handler hides broken/partial URLs while
                    typing — next/image errors on unconfigured hosts and cannot do this. */}
                <img
                  src={form.logoUrl}
                  alt="Preview logo"
                  className="h-8 w-auto rounded border border-solid border-border-default object-contain"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                />
                <span className="text-xs text-text-secondary">Preview logo</span>
              </div>
            )}
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-text-primary">Warna Utama</label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={form.primaryColor}
                onChange={(e) => setForm({ ...form, primaryColor: e.target.value })}
                className="h-10 w-10 cursor-pointer rounded-lg border border-solid border-border-strong p-0.5"
              />
              <Input
                containerClassName="flex-1"
                value={form.primaryColor}
                onChange={(e) => setForm({ ...form, primaryColor: e.target.value })}
                className="font-mono uppercase"
                placeholder="#0077A8"
                pattern="^#[0-9A-Fa-f]{6}$"
              />
            </div>
            <div className="mt-2 rounded-[var(--radius-md)] p-3 text-xs font-medium text-white" style={{ backgroundColor: form.primaryColor }}>
              Preview warna: tombol, link, dan progress bar akan menggunakan warna ini
            </div>
          </div>
        </Card>

        <Card className="p-5">
          <h2 className="mb-4 text-sm font-semibold text-text-primary">Domain Kustom</h2>
          <Input
            label="Domain"
            value={form.customDomain}
            onChange={(e) => setForm({ ...form, customDomain: e.target.value })}
            placeholder="lms.perusahaan.com (opsional)"
            hint="Hubungi tim Hazl Academy untuk mengaktifkan domain kustom setelah diisi."
          />
          <div className="mt-3 rounded-[var(--radius-md)] bg-surface-sunken p-3 text-xs text-text-secondary">
            <strong className="text-text-primary">URL default portal Anda:</strong><br />
            {`${typeof window !== "undefined" ? window.location.origin : "https://hazl.id"}/lms/${settings.slug}`}
          </div>
        </Card>

        {error && (
          <div className="rounded-[var(--radius-md)] border border-solid border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {saved && (
          <div className="rounded-[var(--radius-md)] border border-solid border-green-200 bg-green-50 p-3 text-sm text-green-700">
            ✅ Pengaturan berhasil disimpan.
          </div>
        )}

        <Button
          type="submit"
          variant="cyan"
          className="w-full"
          disabled={saving}
          leftIcon={<Save size={16} />}
        >
          {saving ? "Menyimpan..." : "Simpan Pengaturan"}
        </Button>
      </form>
    </div>
  );
}
