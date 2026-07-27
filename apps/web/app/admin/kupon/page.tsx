"use client";

import { useEffect, useState } from "react";
import { Plus, X, Check, Tag, BarChart3, Clock, Loader2 } from "lucide-react";
import { Badge, Button, Card, Input, Select } from "@/components/ui";
import { EmptyState } from "@/components/ui/EmptyState";
import { cn } from "@/lib/utils";
import { getToken } from "@/lib/auth/token";

type Coupon = {
  id: string;
  code: string;
  type: string;
  value: number;
  minPurchase: number;
  maxUses: number | null;
  usedCount: number;
  isActive: boolean;
  expiresAt: string | null;
  createdAt: string;
};


const EMPTY_FORM = { code: "", type: "percentage", value: 0, minPurchase: 0, maxUses: "", expiresAt: "" };

export default function AdminKuponPage() {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function loadCoupons() {
    const token = getToken();
    if (!token) return;
    setLoading(true);
    fetch("/api/admin/coupons?limit=50", { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((body) => {
        if (body.success) {
          const list: Coupon[] = body.data?.coupons ?? body.data ?? [];
          setCoupons(list);
          setTotal(body.meta?.total ?? list.length);
        }
      })
      .finally(() => setLoading(false));
  }

  useEffect(() => { loadCoupons(); }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    const token = getToken();
    if (!token) return;
    setSaving(true);
    setError(null);
    const body = {
      code: form.code.toUpperCase(),
      type: form.type,
      value: Number(form.value),
      minPurchase: Number(form.minPurchase),
      maxUses: form.maxUses ? Number(form.maxUses) : null,
      expiresAt: form.expiresAt || null,
    };
    const res = await fetch("/api/admin/coupons", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }).then((r) => r.json());
    setSaving(false);
    if (res.success) { setShowForm(false); setForm(EMPTY_FORM); loadCoupons(); }
    else setError(res.error?.message ?? "Gagal membuat kupon.");
  }

  async function toggleActive(id: string, current: boolean) {
    const token = getToken();
    if (!token) return;
    await fetch(`/api/admin/coupons/${id}`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !current }),
    });
    loadCoupons();
  }

  return (
    <div className="flex max-w-[1200px] flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-extrabold text-text-primary">Manajemen Kupon</h1>
          <p className="mt-1 text-sm text-text-secondary">{total.toLocaleString("id-ID")} kupon terdaftar</p>
        </div>
        <Button
          variant={showForm ? "ghost" : "primary"}
          size="sm"
          onClick={() => setShowForm(!showForm)}
          leftIcon={showForm ? <X size={16} aria-hidden="true" /> : <Plus size={16} aria-hidden="true" />}
        >
          {showForm ? "Batal" : "Buat Kupon"}
        </Button>
      </div>

      {/* Create Form */}
      {showForm && (
        <Card className="p-6">
          <h2 className="mb-4 font-display text-base font-bold text-text-primary">Buat Kupon Baru</h2>
          {error && (
            <div className="mb-3 rounded-[var(--radius-md)] bg-red-600/10 px-3.5 py-2.5 text-sm text-red-700">{error}</div>
          )}
          <form onSubmit={handleCreate} className="flex flex-col gap-3.5">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              <Input
                label="Kode Kupon *"
                required
                placeholder="PROMO50"
                value={form.code}
                onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
              />
              <Select
                label="Tipe *"
                value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value })}
              >
                <option value="percentage">Persen (%)</option>
                <option value="fixed">Nominal (Rp)</option>
              </Select>
              <Input
                label="Nilai *"
                required
                type="number"
                min={0}
                placeholder={form.type === "percentage" ? "50" : "50000"}
                value={form.value}
                onChange={(e) => setForm({ ...form, value: Number(e.target.value) })}
              />
            </div>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              <Input
                label="Minimal Pembelian (Rp)"
                type="number"
                min={0}
                placeholder="0"
                value={form.minPurchase}
                onChange={(e) => setForm({ ...form, minPurchase: Number(e.target.value) })}
              />
              <Input
                label="Maks. Penggunaan"
                type="number"
                min={1}
                placeholder="Tanpa batas"
                value={form.maxUses}
                onChange={(e) => setForm({ ...form, maxUses: e.target.value })}
              />
              <Input
                label="Kadaluarsa"
                type="datetime-local"
                value={form.expiresAt}
                onChange={(e) => setForm({ ...form, expiresAt: e.target.value })}
              />
            </div>
            <Button type="submit" variant="cyan" size="sm" disabled={saving} className="self-start bg-accent-cyan-strong text-white hover:bg-accent-cyan-strong" leftIcon={<Check size={16} aria-hidden="true" />}>
              {saving ? "Menyimpan…" : "Buat Kupon"}
            </Button>
          </form>
        </Card>
      )}

      {/* Coupon Cards */}
      {loading ? (
        <div className="flex justify-center rounded-[var(--radius-lg)] border border-border-default bg-surface-card py-16 shadow-e1">
          <Loader2 className="animate-spin text-accent-cyan-strong" size={32} aria-hidden="true" />
        </div>
      ) : coupons.length === 0 ? (
        <EmptyState icon={Tag} title="Belum ada kupon" description="Buat kupon pertama Anda untuk memberikan diskon." />
      ) : (
        <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
          {coupons.map((c) => {
            const expired = c.expiresAt && new Date(c.expiresAt) < new Date();
            const usageRate = c.maxUses ? Math.round((c.usedCount / c.maxUses) * 100) : null;
            const inactive = !c.isActive || expired;
            return (
              <Card key={c.id} hoverable className={cn("flex flex-col gap-3 p-5", inactive && "opacity-65")}>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-mono text-lg font-black tracking-wider text-text-primary">{c.code}</p>
                    <p className="mt-0.5 text-xs text-text-secondary">
                      {c.type === "percentage" ? `${c.value}% off` : `Rp ${Number(c.value).toLocaleString("id-ID")} off`}
                      {c.minPurchase > 0 && ` · min. Rp ${Number(c.minPurchase).toLocaleString("id-ID")}`}
                    </p>
                  </div>
                  <Badge variant={c.isActive && !expired ? "success" : "neutral"}>
                    {expired ? "Kadaluarsa" : c.isActive ? "Aktif" : "Non-aktif"}
                  </Badge>
                </div>
                <div className="flex flex-wrap gap-2.5 text-xs text-text-secondary">
                  <span className="inline-flex items-center gap-1">
                    <BarChart3 size={13} aria-hidden="true" /> {c.usedCount}{c.maxUses ? `/${c.maxUses}` : ""} digunakan
                  </span>
                  {c.expiresAt && (
                    <span className="inline-flex items-center gap-1">
                      <Clock size={13} aria-hidden="true" /> {new Date(c.expiresAt).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}
                    </span>
                  )}
                </div>
                {usageRate !== null && (
                  <div className="h-1 overflow-hidden rounded-full bg-surface-sunken">
                    <div className="bg-brand-gradient h-full rounded-full transition-[width]" style={{ width: `${Math.min(100, usageRate)}%` }} />
                  </div>
                )}
                <button
                  onClick={() => toggleActive(c.id, c.isActive)}
                  className={cn(
                    "w-full rounded-[var(--radius-md)] px-3 py-2 text-xs font-bold transition-colors",
                    c.isActive
                      ? "bg-red-600/10 text-red-700 hover:bg-red-600 hover:text-white"
                      : "bg-green-600/10 text-green-700 hover:bg-green-600 hover:text-white",
                  )}
                >
                  {c.isActive ? "Non-aktifkan" : "Aktifkan"}
                </button>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
