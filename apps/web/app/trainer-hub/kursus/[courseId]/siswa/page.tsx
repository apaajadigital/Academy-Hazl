"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Users, Search } from "lucide-react";
import {
  Badge,
  Avatar,
  Input,
  Table,
  TableContainer,
  THead,
  TBody,
  TR,
  TH,
  TD,
  EmptyState,
  PageHeader,
  Pagination,
  ProgressBar,
  DashboardLoading,
  DashboardError,
} from "@/components/ui";
import { getValidToken } from "@/lib/auth/token";

type StudentRow = {
  id: string;
  user: { id: string; name: string; email: string; avatarUrl: string | null };
  enrolledAt: string;
  completedAt: string | null;
  completedLessons: number;
  totalLessons: number;
  progressPct: number;
};

const PAGE_SIZE = 20;

export default function StudentRosterPage() {
  const { courseId } = useParams<{ courseId: string }>();
  const router = useRouter();
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [reloadKey, setReloadKey] = useState(0);

  const loadStudents = useCallback(async () => {
    const token = await getValidToken();
    if (!token) { router.replace("/masuk"); return; }
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(PAGE_SIZE),
      });
      if (search) params.set("search", search);

      const r = await fetch(`/api/trainer/courses/${courseId}/students?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const d = await r.json();
      if (d.success) {
        setStudents(d.data);
        setTotal(d.meta?.total ?? d.data.length);
      } else {
        setError(d.error?.message ?? "Gagal memuat daftar siswa.");
      }
    } catch {
      setError("Gagal memuat daftar siswa.");
    } finally {
      setLoading(false);
    }
  }, [courseId, page, search, router]);

  useEffect(() => {
    loadStudents();
  }, [loadStudents, reloadKey]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setSearch(searchInput);
    setPage(1);
  }

  return (
    <div className="dash-container flex flex-col gap-8">
      <PageHeader
        breadcrumb={
          <span className="flex flex-wrap items-center gap-2">
            <Link href="/trainer-hub" className="text-accent-cyan-strong hover:underline">Trainer Hub</Link>
            <span>/</span>
            <Link href="/trainer-hub/kursus" className="text-accent-cyan-strong hover:underline">Kursus</Link>
            <span>/</span>
            <Link href={`/trainer-hub/kursus/${courseId}`} className="text-accent-cyan-strong hover:underline">Analitik</Link>
            <span>/</span>
            <span className="font-medium text-text-primary">Daftar Siswa</span>
          </span>
        }
        title="Daftar Siswa"
      />

      {/* Search bar */}
      <form onSubmit={handleSearch} className="flex gap-2">
        <div className="relative flex-1 max-w-md">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Cari nama atau email siswa..."
            className="w-full rounded-xl border border-border-default bg-white pl-9 pr-3 py-2.5 text-sm"
          />
        </div>
        <button
          type="submit"
          className="btn btn-sm bg-brand-gradient text-white shadow-e1 hover:opacity-90"
        >
          Cari
        </button>
      </form>

      {/* Summary */}
      {!loading && !error && (
        <p className="text-sm text-text-secondary">
          {total} siswa terdaftar{search ? ` (filter: "${search}")` : ""}
        </p>
      )}

      {/* Table */}
      {loading ? (
        <DashboardLoading />
      ) : error ? (
        <DashboardError message={error} onRetry={() => setReloadKey((k) => k + 1)} />
      ) : students.length === 0 ? (
        <EmptyState
          icon={Users}
          title="Belum ada siswa"
          description={search ? "Tidak ada siswa yang cocok dengan pencarian." : "Belum ada siswa yang mendaftar di kursus ini."}
        />
      ) : (
        <TableContainer>
          <Table>
            <THead>
              <TR>
                <TH>Siswa</TH>
                <TH>Email</TH>
                <TH className="text-center">Progress</TH>
                <TH className="text-center">Status</TH>
                <TH>Tgl Daftar</TH>
              </TR>
            </THead>
            <TBody>
              {students.map((s) => (
                <TR key={s.id}>
                  <TD>
                    <div className="flex items-center gap-3">
                      <Avatar src={s.user.avatarUrl ?? undefined} name={s.user.name} size="sm" />
                      <span className="font-medium text-text-primary">{s.user.name}</span>
                    </div>
                  </TD>
                  <TD className="text-text-secondary text-sm">{s.user.email}</TD>
                  <TD>
                    <div className="flex flex-col items-center gap-1">
                      <ProgressBar value={s.progressPct} className="h-2 w-24" />
                      <span className="text-xs text-text-muted">
                        {s.completedLessons}/{s.totalLessons} ({s.progressPct}%)
                      </span>
                    </div>
                  </TD>
                  <TD className="text-center">
                    {s.completedAt ? (
                      <Badge variant="success" dot>Selesai</Badge>
                    ) : (
                      <Badge variant="info" dot>Aktif</Badge>
                    )}
                  </TD>
                  <TD className="text-xs text-text-secondary">
                    {new Date(s.enrolledAt).toLocaleDateString("id-ID", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>

          {totalPages > 1 && (
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-solid border-border-default bg-surface-sunken px-6 py-4">
              <span className="text-sm text-text-secondary">Halaman {page} dari {totalPages}</span>
              <Pagination page={page} pageCount={totalPages} onPageChange={setPage} />
            </div>
          )}
        </TableContainer>
      )}
    </div>
  );
}
