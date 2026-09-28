"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Download, Users, CheckCircle2, TrendingUp } from "lucide-react";
import { getValidToken } from "@/lib/auth/token";
import { downloadProtected } from "@/lib/download";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Select } from "@/components/ui/Select";
import { TableContainer, Table, THead, TBody, TR, TH, TD } from "@/components/ui/Table";

type ReportRow = {
  userId: string;
  userName: string;
  userEmail: string;
  courseId: string;
  courseTitle: string;
  totalLessons: number;
  completedLessons: number;
  completionPct: number;
  isCompleted: boolean;
  completedAt: string | null;
  enrolledAt: string;
};

type Batch = { id: string; name: string };

export default function LmsAdminReportsPage() {
  const { tenantSlug } = useParams<{ tenantSlug: string }>();
  const router = useRouter();
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [rows, setRows] = useState<ReportRow[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [selectedBatch, setSelectedBatch] = useState("");
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    const token = await getValidToken();
    if (!token) { router.replace("/masuk"); return; }
    const authHeaders = { Authorization: `Bearer ${token}` };
    const meRes = await fetch("/api/lms/portal/me", { headers: authHeaders });
    const meData = await meRes.json();
    const myTenant = meData.data?.find((t: { slug: string; id: string }) => t.slug === tenantSlug);
    if (!myTenant) return;
    setTenantId(myTenant.id);

    const [reportRes, batchRes] = await Promise.all([
      fetch(`/api/lms/tenants/${myTenant.id}/reports/completion${selectedBatch ? `?batchId=${selectedBatch}` : ""}`, { headers: authHeaders }),
      fetch(`/api/lms/tenants/${myTenant.id}/batches`, { headers: authHeaders }),
    ]);
    const reportData = await reportRes.json();
    const batchData = await batchRes.json();
    setRows(reportData.data ?? []);
    setBatches(batchData.data ?? []);
    setLoading(false);
  }, [tenantSlug, selectedBatch, router]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const totalEnrollments = rows.length;
  const completedCount = rows.filter((r) => r.isCompleted).length;
  const avgPct = rows.length > 0 ? Math.round(rows.reduce((sum, r) => sum + r.completionPct, 0) / rows.length) : 0;

  return (
    <div className="mx-auto max-w-6xl p-6">
      <div className="mb-4 flex items-center gap-2 text-sm text-text-secondary">
        <Link href={`/lms/${tenantSlug}/admin`} className="transition-colors hover:text-accent-cyan-strong">Admin</Link>
        <span>/</span>
        <span className="text-text-primary">Laporan</span>
      </div>

      <div className="mb-6 flex items-center justify-between">
        <h1 className="font-display text-xl font-bold text-text-primary">Laporan Completion</h1>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            leftIcon={<Download size={16} />}
            disabled={!tenantId}
            onClick={() =>
              downloadProtected(
                `/api/lms/tenants/${tenantId}/reports/completion/csv`,
                `laporan-${tenantSlug}.csv`,
              ).catch(() => {})
            }
          >
            Unduh CSV
          </Button>
          <Button
            type="button"
            variant="cyan"
            size="sm"
            leftIcon={<Download size={16} />}
            disabled={!tenantId}
            onClick={() =>
              downloadProtected(
                `/api/lms/tenants/${tenantId}/reports/completion/pdf`,
                `laporan-${tenantSlug}.pdf`,
              ).catch(() => {})
            }
          >
            Unduh PDF
          </Button>
        </div>
      </div>

      <div className="mb-6 grid grid-cols-3 gap-4">
        {[
          { label: "Total Enrollment", value: totalEnrollments, Icon: Users, tint: "bg-surface-accent-soft text-accent-cyan-strong" },
          { label: "Selesai", value: completedCount, Icon: CheckCircle2, tint: "bg-green-600/10 text-green-700" },
          { label: "Rata-rata Progress", value: `${avgPct}%`, Icon: TrendingUp, tint: "bg-[rgba(255,47,134,0.10)] text-accent-pink" },
        ].map(({ label, value, Icon, tint }) => (
          <Card key={label} className="p-4 text-center">
            <span className={`mx-auto mb-2 flex h-9 w-9 items-center justify-center rounded-xl ${tint}`}>
              <Icon size={18} />
            </span>
            <div className="text-2xl font-bold text-text-primary">{value}</div>
            <div className="mt-1 text-xs text-text-secondary">{label}</div>
          </Card>
        ))}
      </div>

      <div className="mb-4 flex gap-3">
        <Select
          value={selectedBatch}
          onChange={(e) => { setSelectedBatch(e.target.value); setLoading(true); }}
          className="text-sm"
        >
          <option value="">Semua Batch</option>
          {batches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
        </Select>
      </div>

      {loading ? (
        <div className="py-8 text-center text-text-secondary">Memuat...</div>
      ) : rows.length === 0 ? (
        <div className="py-12 text-center text-text-secondary">Tidak ada data.</div>
      ) : (
        <TableContainer>
          <Table>
            <THead>
              <TR className="hover:bg-transparent">
                <TH>Peserta</TH>
                <TH>Kursus</TH>
                <TH className="text-center">Progress</TH>
                <TH className="text-center">Selesai</TH>
                <TH>Terdaftar</TH>
              </TR>
            </THead>
            <TBody>
              {rows.map((r, i) => (
                <TR key={i}>
                  <TD>
                    <p className="text-sm font-medium text-text-primary">{r.userName}</p>
                    <p className="text-xs text-text-secondary">{r.userEmail}</p>
                  </TD>
                  <TD className="text-text-primary">{r.courseTitle}</TD>
                  <TD>
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 flex-1 rounded-full bg-border-default">
                        <div className="h-1.5 rounded-full bg-accent-cyan-strong" style={{ width: `${r.completionPct}%` }} />
                      </div>
                      <span className="w-10 text-right text-xs text-text-secondary">{r.completionPct}%</span>
                    </div>
                  </TD>
                  <TD className="text-center">
                    <Badge variant={r.isCompleted ? "success" : "neutral"}>
                      {r.isCompleted ? "Ya" : "Belum"}
                    </Badge>
                  </TD>
                  <TD className="text-xs text-text-secondary">
                    {new Date(r.enrolledAt).toLocaleDateString("id-ID")}
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>
        </TableContainer>
      )}
    </div>
  );
}
