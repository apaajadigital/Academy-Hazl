"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Award, Calendar, ShieldCheck, Download } from "lucide-react";
import { Badge, EmptyState, DashboardLoading } from "@/components/ui";
import { getToken } from "@/lib/auth/token";
import { downloadProtected } from "@/lib/download";
import { API_BASE as apiBase } from "@/lib/api/base";

type Certificate = {
  id: string;
  code: string;
  issuedAt: string;
  course: { title: string; slug: string };
};

export default function SertifikatPage() {
  const router = useRouter();
  const [certs, setCerts] = useState<Certificate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = getToken();
    if (!token) { router.replace("/masuk"); return; }

    fetch(`/api/certificates`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((body) => {
        if (body.success && Array.isArray(body.data)) {
          setCerts(body.data);
        } else {
          setError(body.error?.message ?? "Gagal memuat sertifikat.");
        }
      })
      .catch(() => {
        setError("Gagal memuat sertifikat.");
      })
      .finally(() => setLoading(false));
  }, [router]);

  if (loading) {
    return <DashboardLoading />;
  }

  return (
    <div className="dash-container flex flex-col gap-8">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-extrabold text-text-primary">Sertifikat Saya</h1>
          <p className="mt-1 text-sm text-text-secondary">{certs.length} sertifikat diperoleh</p>
        </div>
        <Link href="/e-course" className="btn btn-primary btn-sm">Dapatkan Lebih Banyak</Link>
      </div>

      {error && (
        <div className="rounded-[var(--radius-md)] border border-red-200 bg-red-50 px-4 py-4 text-sm text-red-600">
          {error}
        </div>
      )}

      {!loading && certs.length === 0 && (
        <EmptyState
          icon={Award}
          title="Belum Ada Sertifikat"
          description="Selesaikan kursus untuk mendapatkan sertifikat kelulusan Anda."
          action={<Link href="/dashboard/kursus" className="btn btn-primary btn-sm">Lihat Kursus Saya</Link>}
        />
      )}

      {certs.length > 0 && (
        <>
          {/* Achievement banner */}
          <section className="dash-grid">
            <div className="bg-brand-gradient relative col-span-12 flex flex-col justify-center overflow-hidden rounded-[var(--radius-card)] p-6 text-white shadow-e2 lg:col-span-8">
              <div className="relative z-10">
                <h2 className="font-display text-xl font-bold">Pencapaian Luar Biasa!</h2>
                <p className="mt-2 max-w-md text-sm text-white/90">
                  Kamu telah memperoleh {certs.length} sertifikat keahlian. Terus tingkatkan skill dan kumpulkan lebih banyak.
                </p>
              </div>
              <Award className="pointer-events-none absolute -bottom-6 -right-4 text-white/20" size={160} aria-hidden="true" />
            </div>
            <div className="col-span-12 flex flex-col justify-center rounded-[var(--radius-card)] border border-border-default bg-surface-card p-6 shadow-e1 lg:col-span-4">
              <span className="text-sm text-text-secondary">Total Sertifikat</span>
              <span className="mt-1 font-display text-4xl font-extrabold text-accent-cyan-strong">
                {String(certs.length).padStart(2, "0")}
              </span>
              <p className="mt-2 text-xs text-text-muted">Sertifikat aktif yang telah diverifikasi.</p>
            </div>
          </section>

          {/* Certificates grid */}
          <div className="dash-grid">
            {certs.map((cert) => (
              <div
                key={cert.id}
                className="group col-span-12 flex flex-col overflow-hidden rounded-[var(--radius-card)] border border-border-default bg-surface-card shadow-e1 transition-all hover:-translate-y-1 hover:shadow-e3 md:col-span-6 xl:col-span-4"
              >
                {/* Certificate visual */}
                <div className="relative flex aspect-[1.414/1] items-center justify-center overflow-hidden bg-surface-accent-soft">
                  <div className="absolute inset-3 rounded-[var(--radius-md)] border border-dashed border-[rgba(0,119,168,0.3)]" />
                  <Award className="relative text-accent-cyan-strong transition-transform duration-500 group-hover:scale-105" size={48} aria-hidden="true" />
                  <Badge variant="success" className="absolute right-3 top-3 backdrop-blur">Terverifikasi</Badge>
                </div>

                {/* Info */}
                <div className="flex flex-1 flex-col gap-2 p-6">
                  <h3 className="line-clamp-2 font-display text-base font-bold leading-snug text-text-primary">{cert.course.title}</h3>
                  <p className="inline-flex items-center gap-2 text-sm text-text-secondary">
                    <Calendar size={16} aria-hidden="true" />
                    Diterbitkan: {new Date(cert.issuedAt).toLocaleDateString("id-ID", {
                      day: "numeric", month: "long", year: "numeric",
                    })}
                  </p>
                  <div className="flex flex-col gap-0.5 rounded-[var(--radius-md)] bg-surface-sunken px-4 py-2">
                    <span className="text-[10px] font-medium uppercase tracking-wider text-text-muted">Kode Verifikasi</span>
                    <code className="font-mono text-[13px] font-bold tracking-wider text-text-primary">{cert.code.toUpperCase()}</code>
                  </div>

                  {/* Actions */}
                  <div className="mt-auto flex items-center justify-between gap-2 border-t border-border-subtle pt-4">
                    <Link
                      href={`/verify/${cert.code}`}
                      target="_blank"
                      className="inline-flex items-center gap-2 text-sm font-semibold text-accent-cyan-strong hover:underline"
                    >
                      <ShieldCheck size={18} aria-hidden="true" />
                      Verifikasi
                    </Link>
                    <button
                      type="button"
                      onClick={() =>
                        downloadProtected(
                          `${apiBase}/api/certificates/${cert.code}/download`,
                          `sertifikat-${cert.code}.pdf`,
                        ).catch(() => setError("Gagal mengunduh sertifikat."))
                      }
                      className="inline-flex items-center gap-2 rounded-full bg-surface-accent-soft px-4 py-2 text-sm font-semibold text-accent-cyan-strong transition-colors hover:bg-accent-cyan-strong hover:text-white"
                    >
                      <Download size={16} aria-hidden="true" />
                      Unduh PDF
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
