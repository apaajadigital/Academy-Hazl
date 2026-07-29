"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { BookOpen } from "lucide-react";
import {
  Badge,
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
  DashboardLoading,
  DashboardError,
} from "@/components/ui";
import { getValidToken } from "@/lib/auth/token";

type Course = {
  id: string;
  title: string;
  status: string;
  price: number;
  enrollments: number;
};

/** Envelope of GET /api/trainer/courses — `meta` is `PaginationMeta` (api/src/lib/pagination.ts). */
type CourseListResponse =
  | { success: true; data: Course[]; meta?: { total: number; page: number; limit: number } }
  | { success: false; error?: { message?: string } };

// Mirrors the backend default page size; sent explicitly so the client never
// depends on the server default staying at 20.
const PAGE_SIZE = 20;

const STATUS_META: Record<string, { label: string; variant: "success" | "warning" | "danger" | "neutral" }> = {
  published: { label: "Aktif", variant: "success" },
  pending: { label: "Review", variant: "warning" },
  rejected: { label: "Ditolak", variant: "danger" },
  archived: { label: "Arsip", variant: "neutral" },
};

export default function TrainerCoursesPage() {
  const router = useRouter();
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  // Bumped by the retry button to re-run the effect without changing `page`.
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    // `cancelled` makes the LAST requested page win: clicking next/prev quickly
    // fires overlapping requests, and without this an older, slower response
    // could overwrite the newer page's rows.
    let cancelled = false;
    (async () => {
      const token = await getValidToken();
      if (!token) { router.replace("/masuk"); return; }
      setLoading(true);
      setError("");
      try {
        // Dedicated list endpoint (BL-78c): this page only needs the course
        // rows, and reading them off /dashboard also computed the revenue,
        // refund and payout aggregates on every visit.
        const r = await fetch(`/api/trainer/courses?page=${page}&limit=${PAGE_SIZE}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const d = (await r.json()) as CourseListResponse;
        if (cancelled) return;
        if (d.success) {
          setCourses(d.data);
          // Older API builds sent no `meta`; fall back to the row count so the
          // header never shows a total smaller than what is on screen.
          setTotal(d.meta?.total ?? d.data.length);
        } else {
          setError(d.error?.message ?? "Gagal memuat daftar kursus.");
        }
      } catch {
        if (!cancelled) setError("Gagal memuat daftar kursus.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [page, reloadKey, router]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="dash-container flex flex-col gap-8">
      <PageHeader
        title="Kursus Saya"
        breadcrumb={
          <span className="flex items-center gap-2">
            <Link href="/trainer-hub" className="text-accent-cyan-strong hover:underline">Trainer Hub</Link>
            <span className="text-text-secondary">/</span>
            <span className="font-medium text-text-primary">Kursus Saya</span>
          </span>
        }
      />

      <section className="flex flex-col gap-4">
        {!loading && !error && total > 0 && (
          <p className="text-sm text-text-secondary">
            Menampilkan {courses.length} dari {total} kursus
          </p>
        )}

        {loading ? (
          <DashboardLoading />
        ) : error ? (
          <DashboardError message={error} onRetry={() => setReloadKey((k) => k + 1)} />
        ) : courses.length === 0 ? (
          <EmptyState
            icon={BookOpen}
            title="Belum ada kursus"
            description="Hubungi admin untuk menambahkan kursus Anda."
          />
        ) : (
          <TableContainer>
            <Table>
              <THead>
                <TR>
                  <TH>Judul Kursus</TH>
                  <TH className="text-center">Peserta</TH>
                  <TH className="text-right">Harga</TH>
                  <TH className="text-center">Status</TH>
                  <TH className="text-center">Aksi</TH>
                </TR>
              </THead>
              <TBody>
                {courses.map((c) => {
                  const meta = STATUS_META[c.status] ?? { label: "Draft", variant: "neutral" as const };
                  return (
                    <TR key={c.id}>
                      <TD className="font-medium text-text-primary">{c.title}</TD>
                      <TD className="text-center text-text-secondary">{c.enrollments.toLocaleString("id-ID")}</TD>
                      <TD className="text-right text-text-primary">
                        Rp {Number.isFinite(c.price) ? c.price.toLocaleString("id-ID") : "0"}
                      </TD>
                      <TD className="text-center">
                        <Badge variant={meta.variant} dot>{meta.label}</Badge>
                      </TD>
                      <TD className="text-center">
                        <Link href={`/trainer-hub/kursus/${c.id}`} className="text-xs font-medium text-accent-cyan-strong hover:underline">
                          Lihat Analitik →
                        </Link>
                      </TD>
                    </TR>
                  );
                })}
              </TBody>
            </Table>

            {/* Pagination footer — same shape as payout. */}
            {totalPages > 1 && (
              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-solid border-border-default bg-surface-sunken px-6 py-4">
                <span className="text-sm text-text-secondary">Halaman {page} dari {totalPages}</span>
                <Pagination page={page} pageCount={totalPages} onPageChange={setPage} />
              </div>
            )}
          </TableContainer>
        )}
      </section>
    </div>
  );
}
