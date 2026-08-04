"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft, Building2, Users, Layers, BarChart3,
  ToggleLeft, ToggleRight, Mail, BookOpen,
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
  StatCard,
  DashboardLoading,
  TableContainer,
  Table,
  THead,
  TBody,
  TR,
  TH,
  TD,
  PageHeader,
} from "@/components/ui";
import { EmptyState } from "@/components/ui/EmptyState";

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

/** Response envelope shared by every LMS endpoint (`packages/types`). Fields are
 * optional here because this is a network boundary — never trust the shape. */
type ApiEnvelope<T> = {
  success?: boolean;
  data?: T;
  error?: { code?: string; message?: string };
};

/** `POST /api/lms/tenants/:id/invites` — bulk employee invites. `emailed` /
 *  `emailFailed` report actual delivery and are absent on older API builds. */
type InvitesResult = {
  created?: string[];
  skipped?: string[];
  emailed?: string[];
  emailFailed?: string[];
};

/** `POST /api/lms/tenants/:id/admins` — promote an existing user to LMS admin. */
type AddAdminResult = { message?: string };

/** Outcome of a completed invite request, rendered honestly instead of a blanket
 * "sent" confirmation. `success` = invite created AND email delivered;
 * `partial` = invite created but delivery failed or was not reported by the API;
 * `notice` = request succeeded but nothing changed (e.g. already invited). */
type InviteOutcome = { tone: "success" | "partial" | "notice"; message: string };

// ─── Helpers ─────────────────────────────────────────────────────────────────


function authHeaders() {
  return { Authorization: `Bearer ${getToken() ?? ""}`, "Content-Type": "application/json" };
}

const PLAN_VARIANT: Record<string, BadgeProps["variant"]> = {
  trial: "warning",
  starter: "info",
  pro: "brand",
  enterprise: "success",
};

function fmtDate(d: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
}

// ─── Invite Modal ─────────────────────────────────────────────────────────────

function InviteModal({
  tenantId,
  onClose,
  onSuccess,
}: {
  tenantId: string;
  onClose: () => void;
  /** Called after the tenant actually changed, so the page can refetch members. */
  onSuccess: () => void;
}) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"lms_employee" | "lms_admin">("lms_employee");
  const [loading, setLoading] = useState(false);
  const [outcome, setOutcome] = useState<InviteOutcome | null>(null);
  const [error, setError] = useState<string | null>(null);

  /** Employees get a pending invite record; admins must already have an account
   * and are attached directly. Two distinct backend routes, two payload shapes. */
  async function inviteEmployee(): Promise<InviteOutcome | null> {
    const res = await fetch(`/api/lms/tenants/${tenantId}/invites`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({ emails: [email] }),
    });
    const body = (await res.json()) as ApiEnvelope<InvitesResult>;
    if (!res.ok || !body.success || !body.data) {
      setError(body.error?.message ?? "Gagal mengirim undangan.");
      return null;
    }
    const created = body.data.created ?? [];
    const skipped = body.data.skipped ?? [];
    const { emailed, emailFailed } = body.data;
    if (created.length > 0) {
      // Only claim delivery when the API says the mail went out. Older builds
      // omit emailed/emailFailed → neutral "dibuat" wording, never a false
      // "terkirim". The invite row exists either way, so the caller still refetches.
      if (emailFailed?.includes(email)) {
        return {
          tone: "partial",
          message: `Undangan untuk ${email} sudah dibuat, tetapi email undangan gagal dikirim. Minta pengguna mencoba lagi nanti atau hubungi mereka langsung.`,
        };
      }
      if (emailed?.includes(email)) {
        return { tone: "success", message: `Undangan sudah dikirim ke ${email}.` };
      }
      return {
        tone: "partial",
        message: `Undangan untuk ${email} sudah dibuat. Status pengiriman email tidak dilaporkan server, jadi belum tentu sudah sampai.`,
      };
    }
    if (skipped.length > 0) {
      // Honest reporting: the request succeeded but no invite was created.
      return {
        tone: "notice",
        message: `${email} sudah pernah diundang ke tenant ini, jadi tidak ada undangan baru yang dikirim.`,
      };
    }
    setError("Server tidak memproses undangan untuk email tersebut.");
    return null;
  }

  async function addAdmin(): Promise<InviteOutcome | null> {
    const res = await fetch(`/api/lms/tenants/${tenantId}/admins`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({ email }),
    });
    const body = (await res.json()) as ApiEnvelope<AddAdminResult>;
    if (!res.ok || !body.success) {
      // Backend already returns a user-facing Indonesian message (e.g. 404 when
      // the user has no account yet) — surface it verbatim.
      setError(body.error?.message ?? "Gagal menambahkan Admin LMS.");
      return null;
    }
    return { tone: "success", message: body.data?.message ?? `${email} kini menjadi Admin LMS.` };
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null); setLoading(true);
    try {
      const result = role === "lms_admin" ? await addAdmin() : await inviteEmployee();
      if (!result) return;
      setOutcome(result);
      // Only refetch when the tenant actually gained a member/invite — `partial`
      // still created the invite row, only the email delivery is uncertain.
      if (result.tone !== "notice") onSuccess();
    } catch { setError("Tidak dapat terhubung ke server."); }
    finally { setLoading(false); }
  }

  const doneTitle =
    outcome?.tone === "notice"
      ? "Sudah Pernah Diundang"
      : outcome?.tone === "partial"
        ? "Undangan Dibuat"
        : "Undangan Terkirim";

  return (
    <Modal open onOpenChange={(o) => { if (!o) onClose(); }}>
      <ModalContent title={outcome ? doneTitle : "Undang Pengguna"} className="max-w-md">
        {outcome ? (
          <>
            <p className="mb-4 text-sm text-text-secondary">{outcome.message}</p>
            <Button onClick={onClose} variant="cyan" className="w-full">Selesai</Button>
          </>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {error && <div className="rounded-[var(--radius-md)] bg-red-600/10 px-4 py-3 text-sm text-red-700">{error}</div>}
            <Input id="invite-email-input" label="Email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="nama@perusahaan.com" />
            <Select id="invite-role-select" label="Role" value={role} onChange={(e) => setRole(e.target.value as typeof role)}>
              <option value="lms_employee">Karyawan (Employee)</option>
              <option value="lms_admin">Admin LMS</option>
            </Select>
            <div className="mt-2 flex gap-3">
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

const SECTION_TAB = "border-b-[3px] px-4 py-2 text-sm font-semibold transition-colors -mb-0.5";

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
    return <DashboardLoading />;
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
    <div className="dash-container flex flex-col gap-6">
      <PageHeader
        breadcrumb={
          <span className="flex items-center gap-2">
            <Link href="/admin/lms" className="text-text-secondary hover:underline">LMS B2B</Link>
            <span>/</span>
            <span className="font-medium text-text-primary">{tenant.name}</span>
          </span>
        }
        title={`Tenant: ${tenant.name}`}
      />
      <Card className="p-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="bg-brand-gradient flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl text-xl font-extrabold text-white">
              {tenant.name.slice(0, 2).toUpperCase()}
            </div>
            <div>
              <div className="mb-2 flex flex-wrap items-center gap-3">
                <h1 className="font-display text-2xl font-extrabold text-text-primary">{tenant.name}</h1>
                <Badge variant={PLAN_VARIANT[tenant.planType] ?? "warning"}>{tenant.planType.toUpperCase()}</Badge>
                <Badge variant={statusVariant} dot>{expired ? "KADALUARSA" : tenant.isActive ? "AKTIF" : "NON-AKTIF"}</Badge>
              </div>
              <p className="font-mono text-sm text-text-muted">/{tenant.slug}</p>
              <p className="mt-0.5 text-xs text-text-muted">
                Bergabung: {fmtDate(tenant.createdAt)}{tenant.trialEndsAt ? ` · Trial s/d: ${fmtDate(tenant.trialEndsAt)}` : ""}
              </p>
            </div>
          </div>
          <div className="flex gap-3">
            <Button id="tenant-detail-invite-btn" onClick={() => setShowInvite(true)} variant="secondary" size="sm" leftIcon={<Mail size={14} />}>
              Undang
            </Button>
            <button
              id="tenant-detail-toggle-btn"
              onClick={toggleActive}
              className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition-colors ${tenant.isActive ? "bg-red-600/10 text-red-700 hover:bg-red-600 hover:text-white" : "bg-green-600/10 text-green-700 hover:bg-green-600 hover:text-white"}`}
            >
              {tenant.isActive ? <ToggleRight size={14} aria-hidden="true" /> : <ToggleLeft size={14} aria-hidden="true" />}
              {tenant.isActive ? "Nonaktifkan" : "Aktifkan"}
            </button>
          </div>
        </div>

        {/* Seat usage bar */}
        <div className="mt-5">
          <div className="mb-2 flex justify-between">
            <span className="text-xs text-text-secondary">Penggunaan Kursi</span>
            <span className="text-xs font-semibold text-text-primary">{seatUsed} / {tenant.seatLimit} ({seatPct}%)</span>
          </div>
          <div className="h-1.5 rounded-full bg-surface-sunken">
            <div className="h-1.5 rounded-full transition-[width] duration-500" style={{ width: `${seatPct}%`, background: seatPct > 80 ? "#DC2626" : "#16A34A" }} />
          </div>
        </div>
      </Card>

      {/* Stats row — KPI cards */}
      <div className="dash-grid">
        {stats.map(({ label, value, icon: Icon, color }) => (
          <StatCard
            key={label}
            className="col-span-12 sm:col-span-6 xl:col-span-3"
            label={label}
            value={value}
            icon={Icon}
            iconColor={color}
            iconBg={`${color}18`}
          />
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
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Card className="p-5">
            <h3 className="mb-4 text-sm font-bold text-text-primary">Info Tenant</h3>
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
          <div className="flex flex-col gap-4">
            <Card className="flex-1 p-5">
              <h3 className="mb-4 text-sm font-bold text-text-primary">Batch Terbaru</h3>
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
              <h3 className="mb-4 text-sm font-bold text-text-primary">Kursus Aktif</h3>
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
            ? <EmptyState icon={Layers} title="Belum ada batch." className="col-span-full" />
            : batches.map((b) => (
              <Card key={b.id} className="p-4">
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-sm font-bold text-text-primary">{b.name}</p>
                  <Badge variant={b.isActive ? "success" : "neutral"}>{b.isActive ? "Aktif" : "Non-aktif"}</Badge>
                </div>
                {b.description && <p className="mb-2 text-xs text-text-muted">{b.description}</p>}
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
            ? <EmptyState icon={BookOpen} title="Belum ada kursus." className="col-span-full" />
            : courses.map((c) => (
              <Card key={c.id} className="p-4">
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-sm font-bold text-text-primary">{c.title}</p>
                  <Badge variant={c.status === "published" ? "success" : "neutral"}>{c.status === "published" ? "Published" : "Draft"}</Badge>
                </div>
                {c.description && <p className="mb-2 text-xs text-text-muted">{c.description}</p>}
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
          ? <EmptyState icon={Users} title="Belum ada anggota" description={`Gunakan tombol "Undang" untuk mengundang pengguna.`} />
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
                        <Badge variant={m.role === "lms_admin" ? "brand" : "info"}>
                          {m.role === "lms_admin" ? "Admin LMS" : "Karyawan"}
                        </Badge>
                      </TD>
                    </TR>
                  ))}
                </TBody>
              </Table>
            </TableContainer>
          )
      )}

      {/* Invite modal */}
      {showInvite && (
        <InviteModal
          tenantId={tenantId!}
          onClose={() => setShowInvite(false)}
          onSuccess={fetchAll}
        />
      )}
    </div>
  );
}
