"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Award, ExternalLink } from "lucide-react";
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

type CertRow = {
  id: string;
  code: string;
  userName: string;
  userEmail: string;
  issuedAt: string;
  isValid: boolean;
  verifyUrl: string;
};

const PAGE_SIZE = 20;

export default function CertificatesPage() {
  const { courseId } = useParams<{ courseId: string }>();
  const router = useRouter();
  const [certs, setCerts] = useState<CertRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [reloadKey, setReloadKey] = useState(0);

  const loadCerts = useCallback(async () => {
    const token = await getValidToken();
    if (!token) { router.replace("/masuk"); return; }
    setLoading(true);
    setError("");
    try {
      const r = await fetch(
        `/api/trainer/courses/${courseId}/certificates?page=${page}&limit=${PAGE_SIZE}`,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      const d = await r.json();
      if (d.success) {
        setCerts(d.data);
        setTotal(d.meta?.total ?? d.data.length);
      } else {
        setError(d.error?.message ?? "Gagal memuat daftar sertifikat.");
      }
    } catch {
      setError("Gagal memuat daftar sertifikat.");
    } finally {
      setLoading(false);
    }
  }, [courseId, page, router]);

  useEffect(() => {
    loadCerts();
  }, [loadCerts, reloadKey]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

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
            <span className="font-medium text-text-primary">Sertifikat</span>
          </span>
        }
        title="Sertifikat Terbit"
      />

      {!loading && !error && (
        <p className="text-sm text-text-secondary">{total} sertifikat telah diterbitkan</p>
      )}

      {loading ? (
        <DashboardLoading />
      ) : error ? (
        <DashboardError message={error} onRetry={() => setReloadKey((k) => k + 1)} />
      ) : certs.length === 0 ? (
        <EmptyState
          icon={Award}
          title="Belum ada sertifikat"
          description="Sertifikat akan diterbitkan otomatis saat siswa menyelesaikan kursus ini."
        />
      ) : (
        <TableContainer>
          <Table>
            <THead>
              <TR>
                <TH>Kode Sertifikat</TH>
                <TH>Nama Siswa</TH>
                <TH>Email</TH>
                <TH className="text-center">Status</TH>
                <TH>Tanggal Terbit</TH>
                <TH className="text-center">Verifikasi</TH>
              </TR>
            </THead>
            <TBody>
              {certs.map((cert) => (
                <TR key={cert.id}>
                  <TD className="font-mono text-sm font-medium text-text-primary">{cert.code}</TD>
                  <TD className="font-medium text-text-primary">{cert.userName}</TD>
                  <TD className="text-sm text-text-secondary">{cert.userEmail}</TD>
                  <TD className="text-center">
                    {cert.isValid ? (
                      <Badge variant="success" dot>Valid</Badge>
                    ) : (
                      <Badge variant="danger" dot>Revoked</Badge>
                    )}
                  </TD>
                  <TD className="text-xs text-text-secondary">
                    {new Date(cert.issuedAt).toLocaleDateString("id-ID", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </TD>
                  <TD className="text-center">
                    <Link
                      href={cert.verifyUrl}
                      target="_blank"
                      className="inline-flex items-center gap-1 text-xs text-accent-cyan-strong hover:underline"
                    >
                      Lihat <ExternalLink size={12} />
                    </Link>
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
