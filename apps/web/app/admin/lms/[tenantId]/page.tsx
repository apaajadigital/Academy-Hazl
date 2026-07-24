"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft, Building2, Users, Layers, BarChart3,
  ChevronRight, ToggleLeft, ToggleRight, Mail,
} from "lucide-react";
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
} from "@/components/ui";

// ─── Types ────────────────────────────────────────────────────────────────────

type TenantDetail = {
  id: string;
  name: string;
  slug: string;
  planType: string;
  isActive: boolean;
  trialEndsAt: string | null;
  seatLimit: number;
  primaryColor: string;
  logoUrl: string | null;
  createdAt: string;
  _count?: { batches: number; courses: number; enrollments: number; invites: number };
};

type Batch = {
  id: string;
  name: string;
  description: string | null;
  isActive: boolean;
  startDate: string | null;
  endDate: string | null;
  _count?: { members: number; assignments: number };
};

type LmsCourse = {
  id: string;
  title: string;
  description: string | null;
  status: string;
  _count?: { lessons: number; enrollments: number };
};

type Member = { id: string; name: string; email: string; role: string };

// ─── Helpers ─────────────────────────────────────────────────────────────────


function authHeaders() {
  return { Authorization: `Bearer ${getToken() ?? ""}`, "Content-Type": "application/json" };
}

const PLAN_STYLE: Record<string, { bg: string; text: string }> = {
  trial:      { bg: "rgba(180,83,9,0.12)",   text: "#B45309" },
  starter:    { bg: "rgba(0,119,168,0.1)",   text: "#0077A8" },
  pro:        { bg: "rgba(124,58,237,0.1)",  text: "#7C3AED" },
  enterprise: { bg: "rgba(22,163,74,0.1)",   text: "#15803D" },
};

function fmtDate(d: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
}

// ─── Invite Modal ─────────────────────────────────────────────────────────────

function InviteModal({ tenantId, onClose }: { tenantId: string; onClose: () => void }) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"lms_employee" | "lms_admin">("lms_employee");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null); setLoading(true);
    try {
      const res = await fetch(`/api/lms/tenants/${tenantId}/invite`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({ email, role }),
      });
      const body = await res.json();
      if (!body.success) { setError(body.error?.message ?? "Gagal mengirim undangan."); return; }
      setDone(true);
    } catch { setError("Tidak dapat terhubung ke server."); }
    finally { setLoading(false); }
  }

  return (
    <Modal open onOpenChange={(o) => { if (!o) onClose(); }}>
      <ModalContent title={done ? "Undangan Terkirim" : "Undang Pengguna"} className="max-w-md">
        {done ? (
          <>
            <p className="mb-[18px] text-sm text-text-secondary">Undangan sudah dikirim ke <strong>{email}</strong>.</p>
            <Button onClick={onClose} variant="cyan" className="w-full">Selesai</Button>
          </>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">
            {error && <div className="rounded-[var(--radius-md)] bg-red-600/10 px-3.5 py-2.5 text-sm text-red-700">{error}</div>}
            <Input id="invite-email-input" label="Email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="nama@perusahaan.com" />
            <Select id="invite-role-select" label="Role" value={role} onChange={(e) => setRole(e.target.value as typeof role)}>
              <option value="lms_employee">Karyawan (Employee)</option>
              <option value="lms_admin">Admin LMS</option>
            </Select>
            <div className="mt-1 flex gap-2.5">
              <Button type="button" onClick={onClose} variant="ghost" className="flex-1">Batal</Button>
              <Button id="invite-submit-btn" type="submit" disabled={loading} variant="cyan" className="flex-[2]">
                {loading ? "Mengirim…" : "Kirim Undangan"}
              </Button>
            </div>
          </form>
        )}
      </ModalContent>
    </Modal>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

const SECTION_TAB = "border-b-[3px] px-4 py-2.5 text-sm font-semibold transition-colors -mb-0.5";

export default function AdminTenantDetailPage() {
  const { tenantId } = useParams<{ tenantId: string }>();
  const router = useRouter();

  const [tenant, setTenant] = useState<TenantDetail | null>(null);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [courses, setCourses] = useState<LmsCourse[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [showInvite, setShowInvite] = useState(false);
  const [activeSection, setActiveSection] = useState<"overview" | "batches" | "courses" | "members">("overview");

  const fetchAll = useCallback(() => {
    const token = getToken();
    if (!token || !tenantId) return;
    setLoading(true);
    const headers = { Authorization: `Bearer ${token}` };
    Promise.all([
      fetch(`/api/lms/tenants/${tenantId}`, { headers }).then((r) => r.json()),
      fetch(`/api/lms/tenants/${tenantId}/batches`, { headers }).then((r) => r.json()),
      fetch(`/api/lms/tenants/${tenantId}/courses`, { headers }).then((r) => r.json()),
      fetch(`/api/lms/tenants/${tenantId}/members`, { headers }).then((r) => r.json()),
    ]).then(([t, b, c, m]) => {
      if (t.success) setTenant(t.data);
      if (b.success) setBatches(b.data ?? []);
      if (c.success) setCourses(c.data ?? []);
      if (m.success) setMembers(m.data ?? []);
    }).finally(() => setLoading(false));
  }, [tenantId]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  async function toggleActive() {
    if (!tenant) return;
    await fetch(`/api/lms/tenants/${tenantId}`, {
      method: "PATCH",
      headers: authHeaders(),
      body: JSON.stringify({ isActive: !tenant.isActive }),
    });
    fetchAll();
  }

  if (loading) {
    return (
      <div className="flex min-h-[300px] items-center justify-center">
        <span className="size-8 animate-spin rounded-full border-[3px] border-accent-cyan-strong border-t-transparent" />
      </div>
    );
  }

  if (!tenant) {
    return (
      <div className="flex flex-col items-center gap-3 p-12 text-center">
        <Building2 size={40} className="text-border-strong" />
        <p className="font-semibold text-text-primary">Tenant tidak ditemukan</p>
        <Button onClick={() => router.push("/admin/lms")} variant="cyan" size="sm" leftIcon={<ArrowLeft size={15} />}>Kembali ke LMS</Button>
      </div>
    );
  }

  const plan = PLAN_STYLE[tenant.planType] ?? PLAN_STYLE.trial!;
  const expired = tenant.trialEndsAt && new Date(tenant.trialEndsAt) < new Date();
  const seatUsed = tenant._count?.enrollments ?? 0;
  const seatPct = Math.min(100, Math.round((seatUsed / tenant.seatLimit) * 100));
  const statusVariant: BadgeProps["variant"] = expired ? "danger" : tenant.isActive ? "success" : "neutral";

  const stats: { label: string; value: number; icon: typeof Building2; color: string }[] = [
    { label: "Batch", value: tenant._count?.batches ?? 0, icon: Layers, color: "#0077A8" },
    { label: "Kursus", value: tenant._count?.courses ?? 0, icon: Building2, color: "#7C3AED" },
    { label: "Total Enrolled", value: tenant._count?.enrollments ?? 0, icon: BarChart3, color: "#16A34A" },
    { label: "Undangan", value: tenant._count?.invites ?? 0, icon: Users, color: "#B45309" },
  ];

  return (
    <div className="flex max-w-[1100px] flex-col gap-5">

      {/* Breadcrumb */}
      <div className="flex items-center gap-2">
        <Link href="/admin/lms" className="flex items-center gap-1.5 text-sm text-text-secondary transition-colors hover:text-text-primary">
          <ArrowLeft size={14} aria-hidden="true" /> LMS B2B
        </Link>
        <ChevronRight size={12} className="text-text-muted" aria-hidden="true" />
        <span className="text-sm font-semibold text-text-primary">{tenant.name}</span>
      </div>

      {/* Tenant header card (light) */}
      <Card className="p-7">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="bg-brand-gradient flex size-14 shrink-0 items-center justify-center rounded-2xl text-xl font-extrabold text-white">
              {tenant.name.slice(0, 2).toUpperCase()}
            </div>
            <div>
              <div className="mb-1 flex flex-wrap items-center gap-2.5">
                <h1 className="font-display text-xl font-extrabold text-text-primary">{tenant.name}</h1>
                <span className="rounded-full px-2.5 py-0.5 text-[10px] font-bold" style={{ background: plan.bg, color: plan.text }}>{tenant.planType.toUpperCase()}</span>
                <Badge variant={statusVariant} dot>{expired ? "KADALUARSA" : tenant.isActive ? "AKTIF" : "NON-AKTIF"}</Badge>
              </div>
              <p className="font-mono text-sm text-text-muted">/{tenant.slug}</p>
              <p className="mt-0.5 text-xs text-text-muted">
                Bergabung: {fmtDate(tenant.createdAt)}{tenant.trialEndsAt ? ` · Trial s/d: ${fmtDate(tenant.trialEndsAt)}` : ""}
              </p>
            </div>
          </div>
          <div className="flex gap-2.5">
            <Button id="tenant-detail-invite-btn" onClick={() => setShowInvite(true)} variant="secondary" size="sm" leftIcon={<Mail size={14} />}>
              Undang
            </Button>
            <button
              id="tenant-detail-toggle-btn"
              onClick={toggleActive}
              className={`inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold transition-colors ${tenant.isActive ? "bg-red-600/10 text-red-700 hover:bg-red-600 hover:text-white" : "bg-green-600/10 text-green-700 hover:bg-green-600 hover:text-white"}`}
            >
              {tenant.isActive ? <ToggleRight size={14} aria-hidden="true" /> : <ToggleLeft size={14} aria-hidden="true" />}
              {tenant.isActive ? "Nonaktifkan" : "Aktifkan"}
            </button>
          </div>
        </div>

        {/* Seat usage bar */}
        <div className="mt-5">
          <div className="mb-1.5 flex justify-between">
            <span className="text-xs text-text-secondary">Penggunaan Kursi</span>
            <span className="text-xs font-semibold text-text-primary">{seatUsed} / {tenant.seatLimit} ({seatPct}%)</span>
          </div>
          <div className="h-1.5 rounded-full bg-surface-sunken">
            <div className="h-1.5 rounded-full transition-[width] duration-500" style={{ width: `${seatPct}%`, background: seatPct > 80 ? "#DC2626" : "#16A34A" }} />
          </div>
        </div>
      </Card>

      {/* Stats row */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {stats.map(({ label, value, icon: Icon, color }) => (
          <Card key={label} className="flex items-center gap-3 p-4">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-[10px]" style={{ background: `${color}18` }}>
              <Icon size={16} strokeWidth={1.75} style={{ color }} aria-hidden="true" />
            </span>
            <div>
              <p className="text-xl font-extrabold" style={{ color }}>{value}</p>
              <p className="text-[10px] text-text-secondary">{label}</p>
            </div>
          </Card>
        ))}
      </div>

      {/* Section tabs */}
      <div className="flex gap-1 border-b-2 border-solid border-border-default">
        {([["overview", "📋 Overview"], ["batches", "👥 Batch"], ["courses", "📚 Kursus"], ["members", "🧑‍💼 Anggota"]] as const).map(([s, label]) => (
          <button key={s} id={`tenant-section-${s}-btn`} onClick={() => setActiveSection(s)}
            className={`${SECTION_TAB} ${activeSection === s ? "border-accent-cyan-strong text-accent-cyan-strong" : "border-transparent text-text-secondary hover:text-text-primary"}`}>
            {label}
          </button>
        ))}
      </div>

      {/* Section: Overview */}
      {activeSection === "overview" && (
        <div className="grid grid-cols-1 gap-3.5 md:grid-cols-2">
          <Card className="p-5">
            <h3 className="mb-3.5 text-sm font-bold text-text-primary">Info Tenant</h3>
            {[
              ["Nama", tenant.name],
              ["Slug", `/${tenant.slug}`],
              ["Paket", tenant.planType.toUpperCase()],
              ["Batas Kursi", tenant.seatLimit.toString()],
              ["Warna Brand", tenant.primaryColor],
              ["Dibuat", fmtDate(tenant.createdAt)],
              ["Trial Berakhir", fmtDate(tenant.trialEndsAt)],
            ].map(([k, v]) => (
              <div key={k} className="flex justify-between border-b border-solid border-border-default py-2 text-sm last:border-0">
                <span className="text-text-muted">{k}</span>
                <span className={`font-semibold text-text-primary ${k === "Slug" || k === "Warna Brand" ? "font-mono" : ""}`}>{v}</span>
              </div>
            ))}
          </Card>
          <div className="flex flex-col gap-3.5">
            <Card className="flex-1 p-5">
              <h3 className="mb-3.5 text-sm font-bold text-text-primary">Batch Terbaru</h3>
              {batches.length === 0
                ? <p className="text-sm text-text-muted">Belum ada batch.</p>
                : batches.slice(0, 4).map((b) => (
                  <div key={b.id} className="flex justify-between border-b border-solid border-border-default py-2 text-sm last:border-0">
                    <span className="font-semibold text-text-primary">{b.name}</span>
                    <span className="text-text-muted">{b._count?.members ?? 0} peserta</span>
                  </div>
                ))
              }
            </Card>
            <Card className="flex-1 p-5">
              <h3 className="mb-3.5 text-sm font-bold text-text-primary">Kursus Aktif</h3>
              {courses.filter((c) => c.status === "published").length === 0
                ? <p className="text-sm text-text-muted">Belum ada kursus published.</p>
                : courses.filter((c) => c.status === "published").slice(0, 4).map((c) => (
                  <div key={c.id} className="flex justify-between border-b border-solid border-border-default py-2 text-sm last:border-0">
                    <span className="font-semibold text-text-primary">{c.title}</span>
                    <span className="text-text-muted">{c._count?.lessons ?? 0} pelajaran</span>
                  </div>
                ))
              }
            </Card>
          </div>
        </div>
      )}

      {/* Section: Batches */}
      {activeSection === "batches" && (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {batches.length === 0
            ? <div className="col-span-full rounded-[var(--radius-lg)] border border-solid border-border-default bg-surface-card px-6 py-12 text-center"><p className="text-text-secondary">Belum ada batch.</p></div>
            : batches.map((b) => (
              <Card key={b.id} className="p-[18px]">
                <div className="mb-2.5 flex items-center justify-between">
                  <p className="text-sm font-bold text-text-primary">{b.name}</p>
                  <Badge variant={b.isActive ? "success" : "neutral"}>{b.isActive ? "Aktif" : "Non-aktif"}</Badge>
                </div>
                {b.description && <p className="mb-2.5 text-xs text-text-muted">{b.description}</p>}
                <div className="flex gap-4 text-xs text-text-secondary">
                  <span>👥 {b._count?.members ?? 0} peserta</span>
                  <span>📚 {b._count?.assignments ?? 0} kursus assigned</span>
                  {b.startDate && <span>📅 {fmtDate(b.startDate)}</span>}
                </div>
              </Card>
            ))
          }
        </div>
      )}

      {/* Section: Courses */}
      {activeSection === "courses" && (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {courses.length === 0
            ? <div className="col-span-full rounded-[var(--radius-lg)] border border-solid border-border-default bg-surface-card px-6 py-12 text-center"><p className="text-text-secondary">Belum ada kursus.</p></div>
            : courses.map((c) => (
              <Card key={c.id} className="p-[18px]">
                <div className="mb-2.5 flex items-center justify-between">
                  <p className="text-sm font-bold text-text-primary">{c.title}</p>
                  <Badge variant={c.status === "published" ? "success" : "neutral"}>{c.status === "published" ? "Published" : "Draft"}</Badge>
                </div>
                {c.description && <p className="mb-2.5 text-xs text-text-muted">{c.description}</p>}
                <div className="flex gap-4 text-xs text-text-secondary">
                  <span>📖 {c._count?.lessons ?? 0} pelajaran</span>
                  <span>👥 {c._count?.enrollments ?? 0} enrolled</span>
                </div>
              </Card>
            ))
          }
        </div>
      )}

      {/* Section: Members */}
      {activeSection === "members" && (
        members.length === 0
          ? <div className="rounded-[var(--radius-lg)] border border-solid border-border-default bg-surface-card px-6 py-12 text-center"><p className="text-text-secondary">Belum ada anggota. Gunakan tombol &quot;Undang&quot; untuk mengundang pengguna.</p></div>
          : (
            <TableContainer>
              <Table>
                <THead>
                  <TR className="hover:bg-transparent">
                    <TH>Nama</TH><TH>Email</TH><TH>Role</TH>
                  </TR>
                </THead>
                <TBody>
                  {members.map((m) => (
                    <TR key={m.id}>
                      <TD className="py-3 font-semibold text-text-primary">{m.name}</TD>
                      <TD className="py-3 text-text-secondary">{m.email}</TD>
                      <TD className="py-3">
                        <span className="rounded-full px-2 py-0.5 text-[11px] font-bold" style={{ background: m.role === "lms_admin" ? "rgba(124,58,237,0.1)" : "rgba(0,119,168,0.1)", color: m.role === "lms_admin" ? "#7C3AED" : "#0077A8" }}>
                          {m.role === "lms_admin" ? "Admin LMS" : "Karyawan"}
                        </span>
                      </TD>
                    </TR>
                  ))}
                </TBody>
              </Table>
            </TableContainer>
          )
      )}

      {/* Invite modal */}
      {showInvite && <InviteModal tenantId={tenantId!} onClose={() => setShowInvite(false)} />}
    </div>
  );
}
