"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { AlertTriangle, Rocket, Loader2 } from "lucide-react";
import { Badge, Button, Card, Input, Table, THead, TBody, TR, TH, TD } from "@/components/ui";
import { cn } from "@/lib/utils";
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
      <div className="flex min-h-screen items-center justify-center bg-surface-page">
        <Loader2 className="animate-spin text-accent-cyan-strong" size={32} aria-hidden="true" />
      </div>
    );
  }
  if (error || !data) return <div className="flex min-h-screen items-center justify-center bg-surface-page text-red-600">{error || "Data tidak ditemukan."}</div>;

  const metrics = [
    { label: "Total Pelajaran", value: data.totalLessons },
    { label: "Total Peserta", value: data.totalEnrollments.toLocaleString("id-ID") },
    { label: "Completion Rate", value: `${data.completionRate}%` },
    { label: "Rating Rata-rata", value: data.avgRating > 0 ? `⭐ ${data.avgRating.toFixed(1)} (${data.reviewCount})` : "Belum ada" },
    { label: "Pendapatan Kotor", value: `Rp ${data.grossRevenue.toLocaleString("id-ID")}` },
    { label: "Pendapatan Bersih (70%)", value: `Rp ${data.netRevenue.toLocaleString("id-ID")}`, highlight: true },
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
    <div className="min-h-screen bg-surface-page pb-12">
      <div className="border-b border-border-default bg-surface-card px-6 py-4">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-4">
          <div>
            <div className="mb-1 flex items-center gap-2 text-sm">
              <Link href="/trainer-hub" className="text-accent-cyan-strong hover:underline">Trainer Hub</Link>
              <span className="text-text-secondary">/</span>
              <Link href="/trainer-hub/kursus" className="text-accent-cyan-strong hover:underline">Kursus</Link>
              <span className="text-text-secondary">/</span>
              <span className="font-medium text-text-primary">Analitik</span>
            </div>
            <h1 className="mt-1 font-display text-xl font-bold text-text-primary">{data.title}</h1>
          </div>

          <div className="flex items-center gap-3">
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
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-5xl p-6">
        {/* Rejection Alert Warning */}
        {(data.status === "draft" || data.status === "rejected") && data.adminFeedback && (
          <div className="mb-6 rounded-[var(--radius-lg)] border border-amber-200 bg-amber-50 p-5">
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
        <div className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-3">
          {metrics.map(({ label, value, highlight }) => (
            <div
              key={label}
              className={cn(
                "rounded-[var(--radius-lg)] border p-5 shadow-e1",
                highlight ? "border-transparent bg-brand-gradient" : "border-border-default bg-surface-card",
              )}
            >
              <div className={cn("text-xs font-medium", highlight ? "text-white/80" : "text-text-secondary")}>{label}</div>
              <div className={cn("mt-2 font-display text-xl font-bold", highlight ? "text-white" : "text-text-primary")}>{value}</div>
            </div>
          ))}
        </div>

        {/* 2-col Grid: Completion Info + Zoom Live Session Setup */}
        <div className="mb-8 grid grid-cols-1 gap-6 md:grid-cols-2">
          {/* Progress Completion */}
          <Card className="flex flex-col justify-between p-6">
            <div>
              <h2 className="mb-4 font-display font-semibold text-text-primary">Progress Completion</h2>
              <div className="mb-2 flex items-center justify-between text-sm">
                <span className="text-text-secondary">{data.completedCount} dari {data.totalEnrollments} peserta menyelesaikan kursus</span>
                <span className="font-semibold text-text-primary">{data.completionRate}%</span>
              </div>
            </div>
            <div className="mt-4 h-3 overflow-hidden rounded-full bg-surface-sunken">
              <div className="h-3 rounded-full bg-accent-cyan-strong transition-all" style={{ width: `${data.completionRate}%` }} />
            </div>
          </Card>

          {/* Zoom Schedule Module */}
          <Card className="p-6">
            <h2 className="mb-4 font-display font-semibold text-text-primary">Sesi Live (Zoom)</h2>
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
        </div>

        {/* Watch Time & Drop-off Stats per Lesson */}
        <Card className="p-6">
          <h2 className="mb-4 font-display font-semibold text-text-primary">Analitik Drop-Off & Durasi Tontonan Pelajaran</h2>

          {data.lessons.length === 0 ? (
            <p className="py-4 text-center text-sm text-text-secondary">Belum ada data materi untuk kursus ini.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <THead>
                  <tr>
                    <TH>Materi Pelajaran</TH>
                    <TH>Modul / Seksi</TH>
                    <TH className="text-center">Avg Watch Time</TH>
                    <TH className="text-center">Selesai (User)</TH>
                    <TH className="text-center">Tingkat Drop-off</TH>
                  </tr>
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
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
