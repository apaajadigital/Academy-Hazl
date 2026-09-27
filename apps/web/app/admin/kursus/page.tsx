"use client";

import { useEffect, useState } from "react";
import {
  Search,
  Eye,
  Check,
  X,
  Archive,
  Star,
  GraduationCap,
  PlayCircle,
  Video,
  FileText,
  Save,
  Lock,
  BookOpen,
  Loader2,
} from "lucide-react";
import {
  Avatar,
  Badge,
  Button,
  Input,
  Select,
  Textarea,
  Modal,
  ModalContent,
  Pagination,
  TableContainer,
  Table,
  THead,
  TBody,
  TR,
  TH,
  TD,
  Tabs,
  TabsList,
  TabsTrigger,
  FilterBar,
  TableActionButton,
  DashboardLoading,
  PageHeader,
} from "@/components/ui";
import { EmptyState } from "@/components/ui/EmptyState";
import { cn } from "@/lib/utils";
import { getValidToken } from "@/lib/auth/token";

type Course = {
  id: string;
  title: string;
  slug: string;
  status: string;
  level: string | null;
  price: string;
  salePrice: string | null;
  totalEnrolled: number;
  avgRating: string;
  isFeatured: boolean;
  format?: "regular" | "private_class";
  publishedAt: string | null;
  createdAt: string;
  trainer: { id: string; name: string; email: string };
  category: { name: string } | null;
  _count?: { sections: number };
};

// Shape returned by GET /api/admin/courses/:id (Prisma include: sections → lessons).
type DetailLesson = {
  id: string;
  title: string;
  type: string;
  contentUrl: string | null;
  duration: number;
};

type DetailSection = {
  id: string;
  title: string;
  lessons?: DetailLesson[];
};

type CourseDetail = {
  id: string;
  title: string;
  level: string | null;
  price: string;
  previewVideo: string | null;
  adminFeedback: string | null;
  format?: "regular" | "private_class";
  waGroupLink?: string | null;
  onboardingContact?: string | null;
  trainer: { id: string; name: string; email: string };
  category: { id: string; name: string } | null;
  sections?: DetailSection[];
};

type StatusVariant = "neutral" | "warning" | "success" | "danger";

const STATUS_MAP: Record<string, { label: string; variant: StatusVariant }> = {
  draft:     { label: "Draft",   variant: "neutral" },
  pending:   { label: "Review",  variant: "warning" },
  published: { label: "Aktif",   variant: "success" },
  rejected:  { label: "Ditolak", variant: "danger" },
  archived:  { label: "Arsip",   variant: "neutral" },
};

const LEVEL_LABEL: Record<string, string> = {
  beginner:     "🟢 Pemula",
  intermediate: "🟡 Menengah",
  advanced:     "🔴 Mahir",
};


export default function AdminKursusPage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const limit = 10;

  // Modal states
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null);
  const [detailCourse, setDetailCourse] = useState<CourseDetail | null>(null);
  const [modalLoading, setModalLoading] = useState(false);
  const [feedbackText, setFeedbackText] = useState("");
  const [savingApproval, setSavingApproval] = useState(false);

  // Private Class settings (format / WA group / onboarding contact)
  const [pcFormat, setPcFormat] = useState<"regular" | "private_class">("regular");
  const [pcWaLink, setPcWaLink] = useState("");
  const [pcContact, setPcContact] = useState("");
  const [savingPrivate, setSavingPrivate] = useState(false);

  async function openDetailModal(courseId: string) {
    setSelectedCourseId(courseId);
    setModalLoading(true);
    setDetailCourse(null);
    setFeedbackText("");
    const token = await getValidToken();
    if (!token) return;
    try {
      const r = await fetch(`/api/admin/courses/${courseId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const body = await r.json();
      if (body.success) {
        setDetailCourse(body.data);
        setFeedbackText(body.data.adminFeedback ?? "");
        setPcFormat(body.data.format === "private_class" ? "private_class" : "regular");
        setPcWaLink(body.data.waGroupLink ?? "");
        setPcContact(body.data.onboardingContact ?? "");
      } else {
        alert(body.error?.message ?? "Gagal memuat detail kursus.");
        setSelectedCourseId(null);
      }
    } catch {
      alert("Gagal memuat detail kursus.");
      setSelectedCourseId(null);
    } finally {
      setModalLoading(false);
    }
  }

  async function handleApproveDetail() {
    if (!selectedCourseId) return;
    setSavingApproval(true);
    const token = await getValidToken();
    if (!token) return;
    try {
      const res = await fetch(`/api/admin/courses/${selectedCourseId}`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ status: "published" }),
      });
      const body = await res.json();
      if (body.success) {
        alert("Kursus berhasil disetujui & dipublikasikan.");
        setSelectedCourseId(null);
        loadCourses();
      } else {
        alert(body.error?.message ?? "Gagal menyetujui.");
      }
    } catch {
      alert("Gagal menghubungi server.");
    } finally {
      setSavingApproval(false);
    }
  }

  async function handleRejectDetail() {
    if (!selectedCourseId) return;
    if (!feedbackText.trim()) {
      alert("Silakan masukkan alasan/umpan balik penolakan kelas.");
      return;
    }
    setSavingApproval(true);
    const token = await getValidToken();
    if (!token) return;
    try {
      const res = await fetch(`/api/admin/courses/${selectedCourseId}`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ status: "rejected", adminFeedback: feedbackText }),
      });
      const body = await res.json();
      if (body.success) {
        alert("Kursus ditolak & umpan balik berhasil dikirim ke trainer.");
        setSelectedCourseId(null);
        loadCourses();
      } else {
        alert(body.error?.message ?? "Gagal menolak.");
      }
    } catch {
      alert("Gagal menghubungi server.");
    } finally {
      setSavingApproval(false);
    }
  }

  async function handleSavePrivateClass() {
    if (!selectedCourseId) return;
    const waLink = pcWaLink.trim();
    const contact = pcContact.trim();
    // Mirror server-side Zod rules before sending.
    if (waLink && !waLink.startsWith("https://")) {
      alert("Link grup WhatsApp harus diawali https://");
      return;
    }
    if (contact && !/^\d{8,15}$/.test(contact)) {
      alert("Kontak onboarding harus berupa angka saja (8-15 digit), contoh: 6285283423737");
      return;
    }
    setSavingPrivate(true);
    const token = await getValidToken();
    if (!token) {
      setSavingPrivate(false);
      return;
    }
    try {
      const res = await fetch(`/api/admin/courses/${selectedCourseId}`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          format: pcFormat,
          waGroupLink: waLink || null,
          onboardingContact: contact || null,
        }),
      });
      const body = await res.json();
      if (body.success) {
        alert("Pengaturan Private Class berhasil disimpan.");
        loadCourses();
      } else {
        alert(body.error?.message ?? "Gagal menyimpan pengaturan Private Class.");
      }
    } catch {
      alert("Gagal menghubungi server.");
    } finally {
      setSavingPrivate(false);
    }
  }

  async function loadCourses() {
    const token = await getValidToken();
    if (!token) return;
    const params = new URLSearchParams({
      page: String(page), limit: String(limit),
      ...(search ? { search } : {}),
      ...(statusFilter !== "all" ? { status: statusFilter } : {}),
    });
    setLoading(true);
    fetch(`/api/admin/courses?${params}`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((body) => {
        if (body.success) {
          setCourses(body.data?.courses ?? body.data ?? []);
          setTotal(body.data?.total ?? body.data?.length ?? 0);
        }
      })
      .finally(() => setLoading(false));
  }

  // `loadCourses` is re-created every render and `search` refetches through the
  // form submit handler; only page/statusFilter should auto-trigger a reload.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { loadCourses(); }, [page, statusFilter]);

  function handleSearch(e: React.FormEvent) { e.preventDefault(); setPage(1); loadCourses(); }

  async function updateStatus(courseId: string, newStatus: string) {
    const token = await getValidToken();
    if (!token) return;
    setActionLoading(courseId + newStatus);
    await fetch(`/api/admin/courses/${courseId}`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
    setActionLoading(null);
    loadCourses();
  }

  async function toggleFeatured(courseId: string, current: boolean) {
    const token = await getValidToken();
    if (!token) return;
    setActionLoading(courseId + "feat");
    await fetch(`/api/admin/courses/${courseId}`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ isFeatured: !current }),
    });
    setActionLoading(null);
    loadCourses();
  }

  const totalPages = Math.ceil(total / limit);

  const actionPill =
    "inline-flex items-center gap-1 rounded-lg px-2 py-2 text-xs font-semibold transition-colors disabled:pointer-events-none disabled:opacity-50";

  return (
    <div className="dash-container flex flex-col gap-6">
      {/* Header */}
      <PageHeader
        breadcrumb={<span className="flex items-center gap-2"><span className="text-text-secondary">Admin</span> <span>/</span> <span className="font-medium text-text-primary">Kursus</span></span>}
        title="Manajemen Kursus"
      />

      {/* Filters */}
      <FilterBar>
        <form onSubmit={handleSearch} className="flex min-w-[240px] flex-1 items-end gap-2">
          <Input
            containerClassName="flex-1"
            leftIcon={<Search size={16} aria-hidden="true" />}
            placeholder="Cari judul kursus atau trainer..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Cari kursus"
          />
          <Button type="submit" variant="cyan" size="sm">Cari</Button>
        </form>
        <Tabs value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
          <TabsList className="flex-wrap">
            {["all", "pending", "published", "draft", "rejected", "archived"].map((s) => (
              <TabsTrigger key={s} value={s}>
                {s === "all" ? "Semua" : STATUS_MAP[s]?.label ?? s}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </FilterBar>

      {/* Table */}
      {loading ? (
        <DashboardLoading />
      ) : courses.length === 0 ? (
        <EmptyState icon={BookOpen} title="Tidak ada kursus ditemukan" description="Coba ubah kata kunci pencarian atau filter status." />
      ) : (
        <TableContainer>
            <Table className="min-w-[860px]">
              <THead>
                <TR className="hover:bg-transparent">
                  <TH>Kursus</TH>
                  <TH>Trainer</TH>
                  <TH>Status</TH>
                  <TH>Level</TH>
                  <TH>Harga</TH>
                  <TH>Pendaftar</TH>
                  <TH>Rating</TH>
                  <TH>Aksi</TH>
                </TR>
              </THead>
              <TBody>
                {courses.map((c) => {
                  const status = STATUS_MAP[c.status] ?? STATUS_MAP["draft"]!;
                  return (
                    <TR key={c.id}>
                      <TD>
                        <div className="flex max-w-[220px] flex-wrap items-center gap-2">
                          <span className="font-semibold text-text-primary">{c.title}</span>
                          {c.isFeatured && (
                            <Badge variant="warning">
                              <Star size={11} fill="currentColor" aria-hidden="true" /> Unggulan
                            </Badge>
                          )}
                          {c.format === "private_class" && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-surface-accent-soft px-2 py-0.5 text-xs font-semibold text-accent-cyan-strong">
                              <Lock size={11} aria-hidden="true" /> Private Class
                            </span>
                          )}
                          <p className="w-full text-xs text-text-muted">{c.category?.name ?? "Umum"} · {c._count?.sections ?? 0} bab</p>
                        </div>
                      </TD>
                      <TD>
                        <div className="flex items-center gap-2">
                          <Avatar name={c.trainer.name} size="sm" />
                          <div className="min-w-0">
                            <p className="font-medium text-text-primary">{c.trainer.name}</p>
                            <p className="text-xs text-text-muted">{c.trainer.email}</p>
                          </div>
                        </div>
                      </TD>
                      <TD>
                        <Badge variant={status.variant} dot>{status.label}</Badge>
                      </TD>
                      <TD className="whitespace-nowrap">
                        {LEVEL_LABEL[c.level ?? ""] ? (
                          <Badge variant="neutral">{LEVEL_LABEL[c.level ?? ""]}</Badge>
                        ) : (
                          <span className="text-text-muted">—</span>
                        )}
                      </TD>
                      <TD>
                        {c.salePrice && Number(c.salePrice) < Number(c.price) ? (
                          <>
                            <p className="font-bold text-accent-cyan-strong">Rp {Number(c.salePrice).toLocaleString("id-ID")}</p>
                            <p className="text-xs text-text-muted line-through">Rp {Number(c.price).toLocaleString("id-ID")}</p>
                          </>
                        ) : (
                          <p className="font-semibold text-text-primary">
                            {Number(c.price) === 0 ? "Gratis" : `Rp ${Number(c.price).toLocaleString("id-ID")}`}
                          </p>
                        )}
                      </TD>
                      <TD>
                        <span className="inline-flex items-center gap-1 font-semibold text-green-700">
                          <GraduationCap size={14} aria-hidden="true" /> {c.totalEnrolled}
                        </span>
                      </TD>
                      <TD>
                        <span className="inline-flex items-center gap-1 font-semibold text-amber-600">
                          <Star size={14} fill="currentColor" aria-hidden="true" /> {parseFloat(c.avgRating).toFixed(1)}
                        </span>
                      </TD>
                      <TD>
                        <div className="flex flex-wrap items-center gap-2">
                          <TableActionButton
                            variant="neutral"
                            onClick={() => openDetailModal(c.id)}
                            disabled={actionLoading !== null}
                            leftIcon={<Eye size={14} aria-hidden="true" />}
                          >
                            Detail &amp; Review
                          </TableActionButton>
                          {c.status === "pending" && (
                            <>
                              <TableActionButton
                                variant="ok"
                                onClick={() => updateStatus(c.id, "published")}
                                disabled={actionLoading !== null}
                                leftIcon={<Check size={14} aria-hidden="true" />}
                              >
                                Approve
                              </TableActionButton>
                              <TableActionButton
                                variant="danger"
                                onClick={() => openDetailModal(c.id)}
                                disabled={actionLoading !== null}
                                leftIcon={<X size={14} aria-hidden="true" />}
                              >
                                Tolak
                              </TableActionButton>
                            </>
                          )}
                          {c.status === "published" && (
                            <TableActionButton
                              variant="neutral"
                              onClick={() => updateStatus(c.id, "archived")}
                              disabled={actionLoading !== null}
                              leftIcon={<Archive size={14} aria-hidden="true" />}
                            >
                              Arsip
                            </TableActionButton>
                          )}
                          {(c.status === "rejected" || c.status === "archived") && (
                            <TableActionButton
                              variant="ok"
                              onClick={() => updateStatus(c.id, "published")}
                              disabled={actionLoading !== null}
                              leftIcon={<Check size={14} aria-hidden="true" />}
                            >
                              Aktifkan
                            </TableActionButton>
                          )}
                          <TableActionButton
                            variant={c.isFeatured ? "warn" : "neutral"}
                            onClick={() => toggleFeatured(c.id, c.isFeatured)}
                            disabled={actionLoading !== null}
                            title={c.isFeatured ? "Hapus dari unggulan" : "Jadikan unggulan"}
                            aria-label={c.isFeatured ? "Hapus dari unggulan" : "Jadikan unggulan"}
                          >
                            <Star size={14} fill={c.isFeatured ? "currentColor" : "none"} aria-hidden="true" />
                          </TableActionButton>
                        </div>
                      </TD>
                    </TR>
                  );
                })}
              </TBody>
            </Table>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-solid border-border-default bg-surface-sunken px-6 py-4">
              <span className="text-sm text-text-secondary">Halaman {page} dari {totalPages}</span>
              <Pagination page={page} pageCount={totalPages} onPageChange={setPage} />
            </div>
          )}
        </TableContainer>
      )}

      {/* Review Modal */}
      <Modal open={selectedCourseId !== null} onOpenChange={(o) => { if (!o) setSelectedCourseId(null); }}>
        <ModalContent
          title="Review & Approval Kursus"
          className="max-w-2xl"
          footer={
            detailCourse ? (
              <div className="flex w-full flex-wrap items-center justify-between gap-2">
                <Button variant="ghost" size="sm" onClick={() => setSelectedCourseId(null)} disabled={savingApproval}>
                  Batal
                </Button>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    className={cn(actionPill, "px-4 py-2 bg-red-600/10 text-red-700 hover:bg-red-600 hover:text-white")}
                    onClick={handleRejectDetail}
                    disabled={savingApproval}
                  >
                    <X size={15} aria-hidden="true" />
                    {savingApproval ? "Memproses..." : "Tolak & Kirim Feedback"}
                  </button>
                  <Button variant="cyan" size="sm" className="bg-accent-cyan-strong text-white hover:bg-accent-cyan-strong" onClick={handleApproveDetail} disabled={savingApproval} leftIcon={<Check size={15} aria-hidden="true" />}>
                    {savingApproval ? "Memproses..." : "Setujui & Publikasikan"}
                  </Button>
                </div>
              </div>
            ) : undefined
          }
        >
          {modalLoading ? (
            <div className="flex justify-center py-16">
              <Loader2 className="animate-spin text-accent-cyan-strong" size={32} aria-hidden="true" />
            </div>
          ) : !detailCourse ? (
            <div className="py-12 text-center text-text-muted">Gagal memuat detail kursus.</div>
          ) : (
            <div className="flex flex-col gap-5 text-left">
              {/* Course Metadata */}
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                {[
                  { label: "Judul Kursus", value: detailCourse.title },
                  { label: "Trainer", value: `${detailCourse.trainer.name} (${detailCourse.trainer.email})` },
                  { label: "Kategori / Level", value: `${detailCourse.category?.name ?? "Umum"} · ${LEVEL_LABEL[detailCourse.level ?? ""] ?? "—"}` },
                  { label: "Harga Kelas", value: Number(detailCourse.price) === 0 ? "Gratis" : `Rp ${Number(detailCourse.price).toLocaleString("id-ID")}` },
                ].map((d) => (
                  <div key={d.label} className="flex flex-col gap-1 rounded-[var(--radius-md)] border border-border-default bg-surface-sunken px-4 py-3">
                    <span className="text-[10px] font-bold uppercase tracking-wide text-text-muted">{d.label}</span>
                    <span className="text-sm font-semibold text-text-primary">{d.value}</span>
                  </div>
                ))}
              </div>

              {/* Course Video Preview */}
              {detailCourse.previewVideo && (
                <div className="rounded-[var(--radius-md)] border border-[rgba(0,119,168,0.2)] bg-surface-accent-soft p-4">
                  <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-text-primary">Video Pengantar / Preview</h3>
                  <a
                    href={detailCourse.previewVideo}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-sm font-semibold text-accent-cyan-strong hover:underline"
                  >
                    <PlayCircle size={16} aria-hidden="true" /> Putar Video Preview ({detailCourse.previewVideo})
                  </a>
                </div>
              )}

              {/* Course Structure */}
              <div>
                <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-text-primary">
                  Struktur Kurikulum ({detailCourse.sections?.length ?? 0} Bab)
                </h3>
                {(!detailCourse.sections || detailCourse.sections.length === 0) ? (
                  <p className="text-sm italic text-text-muted">Belum ada materi kurikulum yang ditambahkan.</p>
                ) : (
                  <div className="flex max-h-60 flex-col gap-2 overflow-y-auto pr-1">
                    {detailCourse.sections.map((sec, idx) => (
                      <div key={sec.id} className="overflow-hidden rounded-[var(--radius-md)] border border-border-default bg-surface-sunken">
                        <div className="border-b border-border-default bg-surface-page px-4 py-2 text-xs font-bold text-text-primary">
                          Bab {idx + 1}: {sec.title}
                        </div>
                        <ul className="m-0 list-none p-0">
                          {sec.lessons?.map((les) => (
                            <li key={les.id} className="flex items-center gap-2 border-b border-border-default px-4 py-2 text-xs text-text-secondary last:border-0">
                              {les.type === "video" ? <Video size={14} aria-hidden="true" /> : <FileText size={14} aria-hidden="true" />}
                              <span className="flex-1">{les.title}</span>
                              <span className="text-[11px] text-text-muted">{les.duration ? `${Math.round(les.duration / 60)} m` : ""}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Private Class Settings */}
              <div className="flex flex-col gap-3 rounded-[var(--radius-md)] border border-border-default bg-surface-card p-4">
                <h3 className="text-xs font-bold uppercase tracking-wide text-text-primary">Pengaturan Private Class</h3>
                <Select
                  label="Format Kursus"
                  value={pcFormat}
                  onChange={(e) => setPcFormat(e.target.value === "private_class" ? "private_class" : "regular")}
                >
                  <option value="regular">Reguler</option>
                  <option value="private_class">Private Class</option>
                </Select>
                <Input
                  label="Link Grup WhatsApp"
                  type="text"
                  placeholder="https://chat.whatsapp.com/..."
                  value={pcWaLink}
                  onChange={(e) => setPcWaLink(e.target.value)}
                />
                <Input
                  label="Kontak Onboarding (nomor WA, angka saja)"
                  type="text"
                  inputMode="numeric"
                  placeholder="6285283423737"
                  value={pcContact}
                  onChange={(e) => setPcContact(e.target.value)}
                />
                <button
                  className="inline-flex items-center gap-2 self-start rounded-full bg-brand-gradient px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
                  onClick={handleSavePrivateClass}
                  disabled={savingPrivate || savingApproval}
                >
                  <Save size={16} aria-hidden="true" />
                  {savingPrivate ? "Menyimpan..." : "Simpan Pengaturan"}
                </button>
              </div>

              {/* Feedback Input Form */}
              <Textarea
                label="Catatan & Umpan Balik Admin (Wajib jika menolak)"
                rows={4}
                placeholder="Tulis umpan balik kelas di sini... (contoh: Silakan lengkapi video pada Bab 2, resolusi audio kurang jernih, dll.)"
                value={feedbackText}
                onChange={(e) => setFeedbackText(e.target.value)}
              />
            </div>
          )}
        </ModalContent>
      </Modal>
    </div>
  );
}
