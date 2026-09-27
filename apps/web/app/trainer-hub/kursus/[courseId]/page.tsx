"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  AlertTriangle,
  Rocket,
  BookOpen,
  Users,
  CheckCircle2,
  Star,
  Wallet,
  Coins,
  BarChart3,
  Pencil,
} from "lucide-react";
import {
  Badge,
  Button,
  Card,
  Input,
  Table,
  TableContainer,
  THead,
  TBody,
  TR,
  TH,
  TD,
  StatCard,
  ProgressBar,
  EmptyState,
  PageHeader,
  DashboardLoading,
  DashboardError,
} from "@/components/ui";
import { getValidToken } from "@/lib/auth/token";

type LessonStat = {
  lessonId: string;
  title: string;
  sectionTitle: string;
  avgWatchPct: number;
  completedCount: number;
  dropOffRate: number;
};

type Analytics = {
  courseId: string;
  title: string;
  totalLessons: number;
  totalEnrollments: number;
  completedCount: number;
  completionRate: number;
  grossRevenue: number;
  netRevenue: number;
  avgRating: number;
  reviewCount: number;
  adminFeedback: string | null;
  liveZoomLink: string | null;
  liveSchedule: string | null;
  status: string;
  lessons: LessonStat[];
};

export default function CourseAnalyticsPage() {
  const { courseId } = useParams<{ courseId: string }>();
  const router = useRouter();
  const [data, setData] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Live session states
  const [zoomLink, setZoomLink] = useState("");
  const [schedule, setSchedule] = useState("");
  const [savingLive, setSavingLive] = useState(false);

  // Status archiving states
  const [status, setStatus] = useState("draft");
  const [savingStatus, setSavingStatus] = useState(false);

  const loadData = useCallback(async () => {
    const token = await getValidToken();
    if (!token) { router.replace("/masuk"); return; }
    try {
      const r = await fetch(`/api/trainer/courses/${courseId}/analytics`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const d = await r.json();
      if (d.success) {
        setData(d.data);
        setZoomLink(d.data.liveZoomLink ?? "");
        setSchedule(d.data.liveSchedule ? d.data.liveSchedule.slice(0, 16) : "");
        setStatus(d.data.status);
      } else {
        setError(d.error?.message ?? "Gagal memuat data.");
      }
    } catch {
      setError("Gagal memuat data.");
    } finally {
      setLoading(false);
    }
  }, [courseId, router]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  async function handleSaveLive() {
    const token = await getValidToken();
    if (!token) return;
    setSavingLive(true);
    try {
      const res = await fetch(`/api/trainer/courses/${courseId}/live`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          liveZoomLink: zoomLink || null,
          liveSchedule: schedule || null,
        }),
      });
      const body = await res.json();
      if (body.success) {
        alert("Jadwal sesi live berhasil diperbarui.");
        loadData();
      } else {
        alert(body.error?.message ?? "Gagal menyimpan.");
      }
    } catch {
      alert("Gagal menghubungi server.");
    } finally {
      setSavingLive(false);
    }
  }

  async function handleToggleArchive() {
    const token = await getValidToken();
    if (!token) return;
    const nextStatus = status === "archived" ? "published" : "archived";
    if (!confirm(`Apakah Anda yakin ingin mengubah status kursus ini menjadi ${nextStatus === "archived" ? "Archived (Nonaktif Penjualan)" : "Aktif Penjualan"}?`)) return;

    setSavingStatus(true);
    try {
      const res = await fetch(`/api/trainer/courses/${courseId}/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status: nextStatus }),
      });
      const body = await res.json();
      if (body.success) {
        setStatus(nextStatus);
        alert(`Kursus berhasil ${nextStatus === "archived" ? "dinonaktifkan (diarsipkan)" : "diaktifkan kembali"}.`);
        loadData();
      } else {
        alert(body.error?.message ?? "Gagal mengubah status.");
      }
    } catch {
      alert("Gagal menghubungi server.");
    } finally {
      setSavingStatus(false);
    }
  }

  if (loading) {
    return (
      <div className="dash-container flex flex-col gap-8">
        <DashboardLoading />
      </div>
    );
  }
  if (error || !data) {
    return (
      <div className="dash-container flex flex-col gap-8">
        <DashboardError message={error || "Data tidak ditemukan."} onRetry={loadData} />
      </div>
    );
  }

  const metrics = [
    { label: "Total Pelajaran", value: data.totalLessons, icon: BookOpen, accent: "#0077A8", tint: "rgba(0,119,168,0.10)" },
    { label: "Total Peserta", value: data.totalEnrollments.toLocaleString("id-ID"), icon: Users, accent: "#FF2F86", tint: "rgba(255,47,134,0.10)" },
    { label: "Completion Rate", value: `${data.completionRate}%`, icon: CheckCircle2, accent: "#16A34A", tint: "rgba(22,163,74,0.10)" },
    { label: "Rating Rata-rata", value: data.avgRating > 0 ? `⭐ ${data.avgRating.toFixed(1)} (${data.reviewCount})` : "Belum ada", icon: Star, accent: "#D97706", tint: "rgba(217,119,6,0.10)" },
    { label: "Pendapatan Kotor", value: `Rp ${data.grossRevenue.toLocaleString("id-ID")}`, icon: Wallet, accent: "#0891B2", tint: "rgba(8,145,178,0.10)" },
    { label: "Pendapatan Bersih (70%)", value: `Rp ${data.netRevenue.toLocaleString("id-ID")}`, icon: Coins, accent: "#0077A8", tint: "rgba(0,119,168,0.10)" },
  ];

  const statusVariant: "success" | "danger" | "warning" | "neutral" =
    status === "published" ? "success" :
    status === "archived" ? "danger" :
    status === "pending" ? "warning" :
    status === "rejected" ? "danger" :
    "neutral";
  const statusLabel =
    status === "published" ? "Aktif Penjualan" :
    status === "archived" ? "Archived (Off)" :
    status === "pending" ? "Menunggu Peninjauan" :
    status === "rejected" ? "Ditolak (Butuh Revisi)" :
    "Draft";

  return (
    <div className="dash-container flex flex-col gap-8">
      <PageHeader
        breadcrumb={
          <span className="flex flex-wrap items-center gap-2">
            <Link href="/trainer-hub" className="text-accent-cyan-strong hover:underline">Trainer Hub</Link>
            <span>/</span>
            <Link href="/trainer-hub/kursus" className="text-accent-cyan-strong hover:underline">Kursus</Link>
            <span>/</span>
            <span className="font-medium text-text-primary">Analitik</span>
          </span>
        }
        title={data.title}
        actions={
          <>
            <Link
              href={`/trainer-hub/kursus/${courseId}/edit`}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border-default bg-surface-card px-3 py-1.5 text-xs font-medium text-text-primary shadow-e1 transition-all hover:border-accent-cyan-strong hover:shadow-e2"
            >
              <Pencil size={12} /> Edit Info Kursus
            </Link>
            <Badge variant={statusVariant} dot>{statusLabel}</Badge>
            {(status === "draft" || status === "rejected") && (
              <Button
                variant="cyan"
                size="sm"
                onClick={async () => {
                  if (!confirm("Apakah Anda yakin ingin mengajukan kelas ini ke admin untuk direview? Setelah diajukan, status akan berubah menjadi Menunggu Peninjauan.")) return;
                  setSavingStatus(true);
                  try {
                    const token = await getValidToken();
                    const res = await fetch(`/api/trainer/courses/${courseId}/status`, {
                      method: "PATCH",
                      headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${token}`,
                      },
                      body: JSON.stringify({ status: "pending" }),
                    });
                    const body = await res.json();
                    if (body.success) {
                      setStatus("pending");
                      alert("Kelas berhasil diajukan untuk ditinjau oleh Admin.");
                      loadData();
                    } else {
                      alert(body.error?.message ?? "Gagal mengajukan review.");
                    }
                  } catch {
                    alert("Gagal menghubungi server.");
                  } finally {
                    setSavingStatus(false);
                  }
                }}
                disabled={savingStatus}
                loading={savingStatus}
                leftIcon={<Rocket size={16} aria-hidden="true" />}
              >
                {savingStatus ? "Mengajukan..." : "Ajukan Review"}
              </Button>
            )}
            <Button
              variant="secondary"
              size="sm"
              onClick={handleToggleArchive}
              disabled={savingStatus || status === "draft" || status === "pending" || status === "rejected"}
            >
              {savingStatus ? "Memproses..." : status === "archived" ? "Aktifkan Penjualan" : "Nonaktifkan (Archive)"}
            </Button>
          </>
        }
      />

      {/* Rejection Alert Warning */}
      {(data.status === "draft" || data.status === "rejected") && data.adminFeedback && (
        <div className="rounded-[var(--radius-card)] border border-amber-200 bg-amber-50 p-5">
          <div className="flex items-start gap-3">
            <AlertTriangle size={20} className="mt-0.5 flex-shrink-0 text-amber-600" aria-hidden="true" />
            <div>
              <p className="text-sm font-semibold text-amber-800">Umpan Balik Penolakan Kelas dari Admin:</p>
              <p className="mt-1 whitespace-pre-wrap text-sm text-amber-700">{data.adminFeedback}</p>
            </div>
          </div>
        </div>
      )}

      {/* Metrics Grid */}
      <section className="dash-grid">
        {metrics.map(({ label, value, icon, accent, tint }) => (
          <StatCard
            key={label}
            className="col-span-12 sm:col-span-6 xl:col-span-3"
            label={label}
            value={value}
            icon={icon}
            iconColor={accent}
            iconBg={tint}
          />
        ))}
      </section>

      {/* Quick links to new features (BL-50) */}
      <section className="flex flex-wrap gap-3">
        <Link
          href={`/trainer-hub/kursus/${courseId}/kurikulum`}
          className="flex items-center gap-2 rounded-[var(--radius-card)] border border-border-default bg-surface-card px-4 py-3 text-sm font-medium text-text-primary shadow-e1 transition-all hover:border-accent-cyan-strong hover:shadow-e2"
        >
          <BookOpen size={16} className="text-accent-cyan-strong" />
          Kelola Kurikulum →
        </Link>
        <Link
          href={`/trainer-hub/kursus/${courseId}/siswa`}
          className="flex items-center gap-2 rounded-[var(--radius-card)] border border-border-default bg-surface-card px-4 py-3 text-sm font-medium text-text-primary shadow-e1 transition-all hover:border-accent-cyan-strong hover:shadow-e2"
        >
          <Users size={16} className="text-accent-pink" />
          Daftar Siswa →
        </Link>
        <Link
          href={`/trainer-hub/kursus/${courseId}/sertifikat`}
          className="flex items-center gap-2 rounded-[var(--radius-card)] border border-border-default bg-surface-card px-4 py-3 text-sm font-medium text-text-primary shadow-e1 transition-all hover:border-accent-cyan-strong hover:shadow-e2"
        >
          <CheckCircle2 size={16} className="text-[#16A34A]" />
          Sertifikat Terbit →
        </Link>
      </section>

      {/* Completion + Zoom Live Session */}
      <section className="dash-grid">
        {/* Progress Completion */}
        <Card className="col-span-12 flex flex-col justify-between rounded-[var(--radius-card)] p-6 md:col-span-6">
          <div>
            <h2 className="mb-4 font-display text-base font-bold text-text-primary">Progress Completion</h2>
            <div className="mb-2 flex items-center justify-between text-sm">
              <span className="text-text-secondary">{data.completedCount} dari {data.totalEnrollments} peserta menyelesaikan kursus</span>
              <span className="font-semibold text-text-primary">{data.completionRate}%</span>
            </div>
          </div>
          <ProgressBar value={data.completionRate} label="Progress completion kursus" className="mt-4 h-3" />
        </Card>

        {/* Zoom Schedule Module */}
        <Card className="col-span-12 rounded-[var(--radius-card)] p-6 md:col-span-6">
          <h2 className="mb-4 font-display text-base font-bold text-text-primary">Sesi Live (Zoom)</h2>
          <div className="space-y-4">
            <Input
              label="Link URL Zoom Sesi Live"
              type="text"
              placeholder="https://zoom.us/j/..."
              value={zoomLink}
              onChange={(e) => setZoomLink(e.target.value)}
            />
            <Input
              label="Jadwal Sesi Live"
              type="datetime-local"
              value={schedule}
              onChange={(e) => setSchedule(e.target.value)}
            />
            <Button
              variant="cyan"
              onClick={handleSaveLive}
              disabled={savingLive}
              loading={savingLive}
              className="w-full"
            >
              {savingLive ? "Menyimpan..." : "Simpan Sesi Live"}
            </Button>
          </div>
        </Card>
      </section>

      {/* Watch Time & Drop-off Stats per Lesson */}
      <section className="flex flex-col gap-4">
        <h2 className="font-display text-lg font-bold text-text-primary">Analitik Drop-Off &amp; Durasi Tontonan Pelajaran</h2>

        {data.lessons.length === 0 ? (
          <EmptyState
            icon={BarChart3}
            title="Belum ada data materi"
            description="Data analitik akan muncul setelah ada aktivitas peserta pada kursus ini."
          />
        ) : (
          <TableContainer>
            <Table>
              <THead>
                <TR>
                  <TH>Materi Pelajaran</TH>
                  <TH>Modul / Seksi</TH>
                  <TH className="text-center">Avg Watch Time</TH>
                  <TH className="text-center">Selesai (User)</TH>
                  <TH className="text-center">Tingkat Drop-off</TH>
                </TR>
              </THead>
              <TBody>
                {data.lessons.map((les) => (
                  <TR key={les.lessonId}>
                    <TD className="font-medium text-text-primary">{les.title}</TD>
                    <TD className="text-text-secondary">{les.sectionTitle}</TD>
                    <TD className="text-center font-semibold text-accent-cyan-strong">{Math.round(les.avgWatchPct)}%</TD>
                    <TD className="text-center text-text-primary">{les.completedCount}</TD>
                    <TD className="text-center">
                      <Badge variant={les.dropOffRate > 50 ? "danger" : les.dropOffRate > 25 ? "warning" : "success"}>
                        {les.dropOffRate}%
                      </Badge>
                    </TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          </TableContainer>
        )}
      </section>
    </div>
  );
}
