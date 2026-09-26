"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Trophy, BadgeCheck, Download, ChevronRight, ArrowRight } from "lucide-react";
import { Badge, Card } from "@/components/ui";
import { getValidToken } from "@/lib/auth/token";
import { API_BASE } from "@/lib/api/base";

type LmsCert = {
  id: string;
  courseTitle: string;
  issuedAt: string;
  tenantId: string;
  userId: string;
};

export default function LmsCertificatesPage() {
  const { tenantSlug } = useParams<{ tenantSlug: string }>();
  const router = useRouter();
  const [certs, setCerts] = useState<LmsCert[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const token = await getValidToken();
      if (!token) { router.replace("/masuk"); return; }
      try {
        const r = await fetch(`/api/lms/portal/${tenantSlug}/certificates`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const d = await r.json();
        if (d.success) setCerts(d.data);
      } finally {
        setLoading(false);
      }
    })();
  }, [tenantSlug, router]);

  return (
    <div className="min-h-screen bg-surface-page">
      <div className="border-b border-border-default bg-surface-card px-6 py-4">
        <div className="flex items-center gap-1.5 text-sm">
          <Link href={`/lms/${tenantSlug}`} className="text-accent-cyan-strong hover:underline">Portal</Link>
          <ChevronRight size={14} className="text-text-muted" aria-hidden="true" />
          <span className="font-medium text-text-primary">Sertifikat Saya</span>
        </div>
      </div>

      <div className="mx-auto max-w-3xl p-6">
        <h1 className="mb-6 font-display text-xl font-bold text-text-primary">Sertifikat Penyelesaian</h1>

        {loading ? (
          <div className="py-12 text-center text-text-secondary">Memuat...</div>
        ) : certs.length === 0 ? (
          <Card className="py-12 text-center">
            <Trophy size={40} className="mx-auto mb-3 text-amber-500" aria-hidden="true" />
            <p className="text-text-secondary">Belum ada sertifikat.</p>
            <p className="mt-1 text-xs text-text-muted">Selesaikan semua pelajaran dalam sebuah kursus untuk mendapatkan sertifikat.</p>
            <Link
              href={`/lms/${tenantSlug}`}
              className="mt-4 inline-flex items-center gap-1 text-sm text-accent-cyan-strong hover:underline"
            >
              Kembali ke daftar kursus
              <ArrowRight size={14} aria-hidden="true" />
            </Link>
          </Card>
        ) : (
          <div className="grid gap-4">
            {certs.map((cert) => (
              <Card key={cert.id} className="flex items-center justify-between p-6">
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600">
                    <Trophy size={22} aria-hidden="true" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-text-primary">{cert.courseTitle}</h3>
                    <p className="mt-0.5 text-xs text-text-secondary">
                      Diterbitkan {new Date(cert.issuedAt).toLocaleDateString("id-ID", {
                        day: "numeric", month: "long", year: "numeric",
                      })}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="success">
                    <BadgeCheck size={13} aria-hidden="true" />
                    Terverifikasi
                  </Badge>
                  <a
                    href={`${API_BASE}/api/lms/portal/${tenantSlug}/certificates/${cert.id}/download`}
                    target="_blank"
                    rel="noopener noreferrer"
                    download
                    className="inline-flex items-center gap-1.5 rounded-lg bg-accent-cyan-strong px-3 py-1.5 text-xs font-semibold text-white transition-opacity hover:opacity-90"
                  >
                    <Download size={13} aria-hidden="true" />
                    Unduh PDF
                  </a>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
