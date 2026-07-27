"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Plus, Building2, Layers, Users, ChevronRight } from "lucide-react";
import { getToken } from "@/lib/auth/token";
import {
  Button,
  Input,
  Select,
  Badge,
  type BadgeProps,
  Card,
  Modal,
  ModalContent,
  TableContainer,
  Table,
  THead,
  TBody,
  TR,
  TH,
  TD,
  StatCard,
  Tabs,
  TabsList,
  TabsTrigger,
  DashboardLoading,
} from "@/components/ui";
import { EmptyState } from "@/components/ui/EmptyState";

// ─── Types ────────────────────────────────────────────────────────────────────

type Tenant = {
  id: string;
  name: string;
  slug: string;
  planType: string;
  isActive: boolean;
  trialEndsAt: string | null;
  seatLimit: number;
  createdAt: string;
  _count?: { batches: number; courses: number; enrollments: number };
};

type Batch = { id: string; name: string; isActive: boolean; _count?: { members: number; assignments: number } };
type LmsCourse = { id: string; title: string; status: string; _count?: { lessons: number; enrollments: number } };

type AssignForm = {
  tenantId: string;
  courseId: string;
  batchId: string;
  dueDate: string;
  isMandatory: boolean;
};

// ─── Helpers ─────────────────────────────────────────────────────────────────


function authHeaders() {
  const token = getToken();
  return { Authorization: `Bearer ${token ?? ""}`, "Content-Type": "application/json" };
}

// Plan chips mapped to semantic Badge variants (tokens-only, no inline styles).
const PLAN_STYLE: Record<string, { variant: BadgeProps["variant"]; label: string }> = {
  trial:      { variant: "warning", label: "Trial" },
  starter:    { variant: "info",    label: "Starter" },
  pro:        { variant: "brand",   label: "Pro" },
  enterprise: { variant: "success", label: "Enterprise" },
};

// ─── Create Tenant Modal ──────────────────────────────────────────────────────

function CreateTenantModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [slug, setSlug] = useState("");
  const [name, setName] = useState("");
  const [plan, setPlan] = useState<"trial" | "starter" | "pro" | "enterprise">("trial");
  const [seatLimit, setSeatLimit] = useState(50);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/lms/tenants", {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({ slug, name, planType: plan, seatLimit }),
      });
      const body = await res.json();
      if (!body.success) { setError(body.error?.message ?? "Gagal membuat tenant."); return; }
      onCreated();
      onClose();
    } catch {
      setError("Tidak dapat terhubung ke server.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal open onOpenChange={(o) => { if (!o) onClose(); }}>
      <ModalContent title="Buat Tenant Baru" className="max-w-md">
        {error && (
          <div className="mb-4 rounded-[var(--radius-md)] bg-red-600/10 px-4 py-2 text-sm text-red-700">{error}</div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Input id="tenant-name-input" label="Nama Perusahaan / Institusi *" required value={name} onChange={(e) => setName(e.target.value)} placeholder="Contoh: PT Maju Bersama" />
          <Input
            id="tenant-slug-input"
            label="Slug (URL-friendly) *"
            required
            value={slug}
            onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-"))}
            placeholder="maju-bersama"
            hint="Hanya huruf kecil, angka, dan tanda hubung"
          />
          <div className="grid grid-cols-2 gap-3">
            <Select id="tenant-plan-select" label="Paket" value={plan} onChange={(e) => setPlan(e.target.value as typeof plan)}>
              <option value="trial">Trial (14 hari)</option>
              <option value="starter">Starter</option>
              <option value="pro">Pro</option>
              <option value="enterprise">Enterprise</option>
            </Select>
            <Input id="tenant-seats-input" label="Maks. Kursi" type="number" min={1} max={10000} value={seatLimit} onChange={(e) => setSeatLimit(Number(e.target.value))} />
          </div>
          <Button id="tenant-create-submit-btn" type="submit" disabled={loading} variant="cyan" className="mt-1 w-full">
            {loading ? "Membuat…" : "Buat Tenant"}
          </Button>
        </form>
      </ModalContent>
    </Modal>
  );
}

// ─── Workshop Assignment Panel ────────────────────────────────────────────────

function WorkshopAssignPanel() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [courses, setCourses] = useState<LmsCourse[]>([]);
  const [form, setForm] = useState<AssignForm>({ tenantId: "", courseId: "", batchId: "", dueDate: "", isMandatory: true });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/lms/tenants", { headers: authHeaders() })
      .then((r) => r.json())
      .then((b) => { if (b.success) setTenants(Array.isArray(b.data) ? b.data : []); });
  }, []);

  function handleTenantChange(tenantId: string) {
    setForm((f) => ({ ...f, tenantId, batchId: "", courseId: "" }));
    setBatches([]); setCourses([]);
    if (!tenantId) return;
    fetch(`/api/lms/tenants/${tenantId}/batches`, { headers: authHeaders() })
      .then((r) => r.json()).then((b) => { if (b.success) setBatches(b.data ?? []); });
    fetch(`/api/lms/tenants/${tenantId}/courses`, { headers: authHeaders() })
      .then((r) => r.json()).then((b) => { if (b.success) setCourses(b.data ?? []); });
  }

  async function handleAssign(e: React.FormEvent) {
    e.preventDefault();
    setError(null); setSuccess(null); setLoading(true);
    try {
      const res = await fetch(
        `/api/lms/tenants/${form.tenantId}/courses/${form.courseId}/assign`,
        {
          method: "POST",
          headers: authHeaders(),
          body: JSON.stringify({
            batchId: form.batchId,
            ...(form.dueDate ? { dueDate: new Date(form.dueDate).toISOString() } : {}),
            isMandatory: form.isMandatory,
          }),
        }
      );
      const body = await res.json();
      if (!body.success) { setError(body.error?.message ?? "Gagal assign."); return; }
      setSuccess("✅ Kursus berhasil di-assign! Peserta batch otomatis terdaftar.");
      setForm((f) => ({ ...f, courseId: "", batchId: "", dueDate: "" }));
    } catch {
      setError("Tidak dapat terhubung ke server.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid grid-cols-1 items-start gap-5 md:grid-cols-2">
      {/* Left: form */}
      <Card className="p-6">
        <h3 className="mb-4 text-base font-bold text-text-primary">Assign Kursus ke Batch</h3>

        {error && <div className="mb-4 rounded-[var(--radius-md)] bg-red-600/10 px-4 py-2 text-sm text-red-700">{error}</div>}
        {success && <div className="mb-4 rounded-[var(--radius-md)] bg-green-600/10 px-4 py-2 text-sm text-green-700">{success}</div>}

        <form onSubmit={handleAssign} className="flex flex-col gap-4">
          <Select id="assign-tenant-select" label="1. Pilih Tenant" value={form.tenantId} onChange={(e) => handleTenantChange(e.target.value)} required>
            <option value="">— Pilih perusahaan —</option>
            {tenants.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </Select>
          <div>
            <Select id="assign-batch-select" label="2. Pilih Batch" value={form.batchId} onChange={(e) => setForm((f) => ({ ...f, batchId: e.target.value }))} required disabled={!form.tenantId}>
              <option value="">— Pilih batch —</option>
              {batches.map((b) => <option key={b.id} value={b.id}>{b.name} ({b._count?.members ?? 0} peserta)</option>)}
            </Select>
            {form.tenantId && batches.length === 0 && <p className="mt-1 text-xs text-text-muted">Belum ada batch. Buat di halaman detail tenant.</p>}
          </div>
          <div>
            <Select id="assign-course-select" label="3. Pilih Kursus LMS" value={form.courseId} onChange={(e) => setForm((f) => ({ ...f, courseId: e.target.value }))} required disabled={!form.tenantId}>
              <option value="">— Pilih kursus —</option>
              {courses.filter((c) => c.status === "published").map((c) => (
                <option key={c.id} value={c.id}>{c.title} ({c._count?.lessons ?? 0} pelajaran)</option>
              ))}
            </Select>
            {form.tenantId && courses.filter((c) => c.status === "published").length === 0 && (
              <p className="mt-1 text-xs text-text-muted">Belum ada kursus published di tenant ini.</p>
            )}
          </div>
          <div className="grid grid-cols-[1fr_auto] items-end gap-3">
            <Input id="assign-due-date-input" label="Deadline (opsional)" type="date" value={form.dueDate} onChange={(e) => setForm((f) => ({ ...f, dueDate: e.target.value }))} />
            <label className="flex cursor-pointer items-center gap-2 pb-3 text-sm font-semibold text-text-primary">
              <input id="assign-mandatory-checkbox" type="checkbox" checked={form.isMandatory} onChange={(e) => setForm((f) => ({ ...f, isMandatory: e.target.checked }))} className="size-4 accent-[var(--brand-cyan-strong)]" />
              Wajib
            </label>
          </div>
          <Button id="assign-submit-btn" type="submit" disabled={loading || !form.tenantId || !form.batchId || !form.courseId} variant="cyan" className="w-full">
            {loading ? "Menyimpan…" : "Assign & Auto-Enroll Peserta"}
          </Button>
        </form>
      </Card>

      {/* Right: info */}
      <div className="flex flex-col gap-4">
        <div className="rounded-[var(--radius-card)] border border-solid border-[rgba(0,119,168,0.15)] bg-surface-accent-soft p-5">
          <h4 className="mb-2 text-sm font-bold text-accent-cyan-strong">ℹ️ Cara Kerja Assignment</h4>
          <ol className="flex list-decimal flex-col gap-2 pl-4 text-sm leading-relaxed text-text-primary">
            <li>Pilih tenant (perusahaan/institusi klien)</li>
            <li>Pilih batch peserta yang akan menerima kursus</li>
            <li>Pilih kursus LMS yang sudah di-publish</li>
            <li>Set deadline dan toggle wajib/opsional</li>
            <li>Klik Assign — <strong>semua anggota batch otomatis di-enroll</strong></li>
          </ol>
        </div>
        <Card className="p-5">
          <h4 className="mb-2 text-sm font-bold text-text-primary">📊 Ringkasan Tenant Aktif</h4>
          {tenants.filter((t) => t.isActive).length === 0
            ? <p className="text-sm text-text-muted">Belum ada tenant aktif.</p>
            : tenants.filter((t) => t.isActive).slice(0, 5).map((t) => (
              <div key={t.id} className="flex items-center justify-between border-b border-solid border-border-default py-2 text-sm last:border-0">
                <span className="font-semibold text-text-primary">{t.name}</span>
                <span className="text-xs text-text-muted">{t._count?.courses ?? 0} kursus · {t._count?.enrollments ?? 0} enrolled</span>
              </div>
            ))
          }
        </Card>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function AdminLMSPage() {
  const [activeTab, setActiveTab] = useState<"tenants" | "workshop">("tenants");
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [showCreate, setShowCreate] = useState(false);
  const limit = 10;

  const loadTenants = useCallback((p: number) => {
    const token = getToken();
    if (!token) return;
    setLoading(true);
    fetch(`/api/lms/tenants?page=${p}&limit=${limit}`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((body) => {
        if (body.success) {
          setTenants(Array.isArray(body.data) ? body.data : body.data?.tenants ?? []);
          setTotal(body.meta?.total ?? body.data?.total ?? 0);
        }
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { loadTenants(page); }, [page, loadTenants]);

  async function toggleActive(id: string, current: boolean) {
    const token = getToken();
    if (!token) return;
    await fetch(`/api/lms/tenants/${id}`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !current }),
    });
    loadTenants(page);
  }

  const totalPages = Math.ceil(total / limit);
  const activeTenants = tenants.filter((t) => t.isActive).length;
  const totalSeats = tenants.reduce((s, t) => s + t.seatLimit, 0);
  const totalEnrolled = tenants.reduce((s, t) => s + (t._count?.enrollments ?? 0), 0);

  const metrics: { label: string; value: number; color: string; icon: typeof Building2 }[] = [
    { label: "Total Tenant", value: total, color: "#0077A8", icon: Building2 },
    { label: "Tenant Aktif", value: activeTenants, color: "#16A34A", icon: Users },
    { label: "Total Kursi", value: totalSeats, color: "#7C3AED", icon: Layers },
    { label: "Total Enrolled", value: totalEnrolled, color: "#B45309", icon: Users },
  ];

  return (
    <div className="dash-container flex flex-col gap-6">

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-extrabold text-text-primary">LMS B2B</h1>
          <p className="mt-1 text-sm text-text-secondary">{total.toLocaleString("id-ID")} perusahaan / institusi</p>
        </div>
        {activeTab === "tenants" && (
          <Button id="lms-create-tenant-btn" onClick={() => setShowCreate(true)} variant="cyan" size="sm" leftIcon={<Plus size={15} />}>
            Buat Tenant Baru
          </Button>
        )}
      </div>

      {/* Metrics — StatCard KPI row in the 12-col dash grid */}
      <div className="dash-grid">
        {metrics.map(({ label, value, color, icon: Icon }) => (
          <StatCard
            key={label}
            className="col-span-12 sm:col-span-6 xl:col-span-3"
            label={label}
            value={value.toLocaleString("id-ID")}
            icon={Icon}
            iconColor={color}
            iconBg={`${color}18`}
          />
        ))}
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "tenants" | "workshop")}>
        <TabsList>
          <TabsTrigger value="tenants">🏢 Tenants</TabsTrigger>
          <TabsTrigger value="workshop">⚙️ Workshop Assignment</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Tab: Tenants */}
      {activeTab === "tenants" && (
        <>
          {loading ? (
            <DashboardLoading />
          ) : tenants.length === 0 ? (
            <EmptyState
              icon={Building2}
              title="Belum ada tenant"
              description={`Klik "Buat Tenant Baru" untuk menambahkan perusahaan pertama.`}
            />
          ) : (
            <TableContainer>
              <Table className="min-w-[820px]">
                <THead>
                  <TR className="hover:bg-transparent">
                    <TH>Perusahaan</TH><TH>Statistik</TH><TH>Paket</TH><TH>Status</TH><TH>Trial</TH><TH>Aksi</TH>
                  </TR>
                </THead>
                <TBody>
                  {tenants.map((t) => {
                    const plan = PLAN_STYLE[t.planType] ?? PLAN_STYLE["trial"]!;
                    const expired = t.trialEndsAt && new Date(t.trialEndsAt) < new Date();
                    const statusVariant: BadgeProps["variant"] = expired ? "danger" : t.isActive ? "success" : "neutral";
                    return (
                      <TR key={t.id} className={t.isActive ? "" : "opacity-60"}>
                        <TD className="py-3">
                          <div className="flex items-center gap-3">
                            <div className="bg-brand-gradient flex size-10 shrink-0 items-center justify-center rounded-xl text-sm font-extrabold text-white">
                              {t.name.slice(0, 2).toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <p className="truncate text-sm font-bold text-text-primary">{t.name}</p>
                              <p className="font-mono text-xs text-text-muted">/{t.slug}</p>
                            </div>
                          </div>
                        </TD>
                        <TD className="py-3 text-xs text-text-secondary">
                          {t._count?.batches ?? 0} batch · {t._count?.courses ?? 0} kursus · {t._count?.enrollments ?? 0} enrolled
                        </TD>
                        <TD className="py-3">
                          <Badge variant={plan.variant}>{plan.label}</Badge>
                        </TD>
                        <TD className="py-3">
                          <Badge variant={statusVariant} dot>{expired ? "Kadaluarsa" : t.isActive ? "Aktif" : "Non-aktif"}</Badge>
                        </TD>
                        <TD className="py-3 text-xs" style={{ color: expired ? "#DC2626" : undefined }}>
                          {t.trialEndsAt
                            ? `${expired ? "Berakhir" : "s/d"} ${new Date(t.trialEndsAt).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}`
                            : "—"}
                        </TD>
                        <TD className="py-3">
                          <div className="flex items-center gap-2">
                            <Link
                              href={`/admin/lms/${t.id}`}
                              className="inline-flex items-center gap-1 rounded-lg bg-surface-sunken px-3 py-2 text-xs font-semibold text-text-primary transition-colors hover:bg-border-default"
                            >
                              Detail <ChevronRight size={12} aria-hidden="true" />
                            </Link>
                            <button
                              id={`lms-toggle-tenant-${t.id}-btn`}
                              onClick={() => toggleActive(t.id, t.isActive)}
                              className={`rounded-lg px-3 py-2 text-xs font-bold transition-colors ${t.isActive ? "bg-red-600/10 text-red-700 hover:bg-red-600 hover:text-white" : "bg-green-600/10 text-green-700 hover:bg-green-600 hover:text-white"}`}
                            >
                              {t.isActive ? "Nonaktifkan" : "Aktifkan"}
                            </button>
                          </div>
                        </TD>
                      </TR>
                    );
                  })}
                </TBody>
              </Table>
            </TableContainer>
          )}

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-3">
              <button id="lms-prev-page-btn" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1} className="rounded-lg border border-solid border-border-default bg-surface-card px-4 py-2 text-sm font-semibold text-text-primary transition-colors hover:bg-surface-sunken disabled:opacity-40">← Prev</button>
              <span className="text-sm text-text-secondary">{page} / {totalPages}</span>
              <button id="lms-next-page-btn" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages} className="rounded-lg border border-solid border-border-default bg-surface-card px-4 py-2 text-sm font-semibold text-text-primary transition-colors hover:bg-surface-sunken disabled:opacity-40">Next →</button>
            </div>
          )}
        </>
      )}

      {/* Tab: Workshop Assignment */}
      {activeTab === "workshop" && <WorkshopAssignPanel />}

      {/* Create Tenant Modal */}
      {showCreate && (
        <CreateTenantModal onClose={() => setShowCreate(false)} onCreated={() => { loadTenants(1); setPage(1); }} />
      )}
    </div>
  );
}
