"use client";

import { useEffect, useState } from "react";
import { Plus, X, Check, Tag, Clock, Percent, Wallet } from "lucide-react";
import {
  Badge,
  Button,
  Card,
  Input,
  Select,
  TableContainer,
  Table,
  THead,
  TBody,
  TR,
  TH,
  TD,
  TableActionButton,
  DashboardLoading,
  PageHeader,
} from "@/components/ui";
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
    <div className="dash-container flex flex-col gap-6">
      <PageHeader
        breadcrumb={<span className="flex items-center gap-2"><span className="text-text-secondary">Admin</span> <span>/</span> <span className="font-medium text-text-primary">Kupon</span></span>}
        title="Manajemen Kupon"
        actions={
          <Button
            variant={showForm ? "ghost" : "primary"}
            size="sm"
            onClick={() => setShowForm(!showForm)}
            leftIcon={showForm ? <X size={16} aria-hidden="true" /> : <Plus size={16} aria-hidden="true" />}
          >
            {showForm ? "Batal" : "+ Buat Kupon"}
          </Button>
        }
      />

      {/* Create Form */}
      {showForm && (
        <Card className="p-6">
          <h2 className="mb-4 font-display text-base font-bold text-text-primary">Buat Kupon Baru</h2>
          {error && (
            <div className="mb-3 rounded-[var(--radius-md)] bg-red-600/10 px-4 py-2 text-sm text-red-700">{error}</div>
          )}
          <form onSubmit={handleCreate} className="flex flex-col gap-4">
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

      {/* Coupon Table */}
      {loading ? (
        <DashboardLoading />
      ) : coupons.length === 0 ? (
        <EmptyState icon={Tag} title="Belum ada kupon" description="Buat kupon pertama Anda untuk memberikan diskon." />
      ) : (
        <TableContainer>
          <Table>
            <THead>
              <TR className="hover:bg-transparent">
                <TH>Kode Kupon</TH>
                <TH>Tipe Diskon</TH>
                <TH>Masa Berlaku</TH>
                <TH>Limit</TH>
                <TH>Status</TH>
                <TH className="text-right">Aksi</TH>
              </TR>
            </THead>
            <TBody>
              {coupons.map((c) => {
                const expired = c.expiresAt && new Date(c.expiresAt) < new Date();
                const usageRate = c.maxUses ? Math.round((c.usedCount / c.maxUses) * 100) : null;
                const inactive = !c.isActive || expired;
                const isPct = c.type === "percentage";
                return (
                  <TR key={c.id} className={cn(inactive && "opacity-60")}>
                    <TD className="py-4">
                      <p className={cn("font-mono text-sm font-black tracking-wider text-text-primary", inactive && "line-through")}>{c.code}</p>
                      {c.minPurchase > 0 && (
                        <p className="mt-0.5 text-xs text-text-muted">min. Rp {Number(c.minPurchase).toLocaleString("id-ID")}</p>
                      )}
                    </TD>
                    <TD className="py-4">
                      <div className="flex items-center gap-3">
                        <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-surface-accent-soft text-accent-cyan-strong">
                          {isPct ? <Percent size={15} aria-hidden="true" /> : <Wallet size={15} aria-hidden="true" />}
                        </span>
                        <span className="whitespace-nowrap text-sm font-semibold text-text-primary">
                          {isPct ? `${c.value}% Off` : `Rp ${Number(c.value).toLocaleString("id-ID")}`}
                        </span>
                      </div>
                    </TD>
                    <TD className="py-4">
                      {c.expiresAt ? (
                        <div className="flex flex-col">
                          <span className="inline-flex items-center gap-1 whitespace-nowrap text-sm text-text-primary">
                            <Clock size={13} aria-hidden="true" /> {new Date(c.expiresAt).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}
                          </span>
                          {expired && <span className="mt-0.5 text-xs font-medium text-red-600">Sudah berakhir</span>}
                        </div>
                      ) : (
                        <span className="text-sm text-text-muted">Tanpa batas</span>
                      )}
                    </TD>
                    <TD className="py-4">
                      <div className="flex w-28 flex-col gap-2">
                        <span className="text-xs font-bold text-text-secondary">
                          {c.usedCount}
                          {c.maxUses ? `/${c.maxUses}` : " / ∞"}
                        </span>
                        {usageRate !== null && (
                          <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-sunken">
                            <div className="bg-brand-gradient h-full rounded-full transition-[width]" style={{ width: `${Math.min(100, usageRate)}%` }} />
                          </div>
                        )}
                      </div>
                    </TD>
                    <TD className="py-4">
                      <Badge variant={c.isActive && !expired ? "success" : "neutral"}>
                        {expired ? "Kadaluarsa" : c.isActive ? "Aktif" : "Non-aktif"}
                      </Badge>
                    </TD>
                    <TD className="py-4 text-right">
                      <TableActionButton
                        variant={c.isActive ? "danger" : "ok"}
                        onClick={() => toggleActive(c.id, c.isActive)}
                        className="whitespace-nowrap"
                      >
                        {c.isActive ? "Non-aktifkan" : "Aktifkan"}
                      </TableActionButton>
                    </TD>
                  </TR>
                );
              })}
            </TBody>
          </Table>
        </TableContainer>
      )}
    </div>
  );
}
