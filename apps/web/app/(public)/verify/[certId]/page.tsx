import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { BadgeCheck, CircleX, X } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { API_BASE as API } from "@/lib/api/base";

type CertData = {
  code: string;
  type: string;
  holderName: string;
  courseName: string | null;
  issuedAt: string;
  revokedAt: string | null;
  status: "valid" | "revoked";
};

async function getCertificate(code: string): Promise<CertData | null> {
  try {
    const res = await fetch(`${API}/api/certificates/${encodeURIComponent(code)}`, {
      next: { revalidate: 300 },
    });
    if (!res.ok) return null;
    const json = await res.json();
    return json.success ? (json.data as CertData) : null;
  } catch {
    return null;
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ certId: string }>;
}): Promise<Metadata> {
  const { certId } = await params;
  const cert = await getCertificate(certId);
  if (!cert) return { title: "Sertifikat Tidak Ditemukan" };
  return {
    title: `Sertifikat ${cert.holderName}`,
    description: `Verifikasi keaslian sertifikat ${cert.type} atas nama ${cert.holderName}`,
  };
}

export default async function VerifyCertPage({
  params,
}: {
  params: Promise<{ certId: string }>;
}) {
  const { certId } = await params;
  const cert = await getCertificate(certId);

  if (!cert) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-surface-page p-6">
        <div className="w-full max-w-md space-y-4 rounded-2xl border border-border-default bg-surface-card p-8 text-center shadow-e1">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-red-600/10">
            <X aria-hidden="true" size={28} className="text-red-600" />
          </div>
          <h1 className="text-xl font-bold text-text-primary">Sertifikat Tidak Ditemukan</h1>
          <p className="text-sm text-text-secondary">
            Kode sertifikat <strong>{certId}</strong> tidak valid atau belum diterbitkan.
          </p>
          <Link href="/" className="text-sm text-accent-cyan-strong hover:underline">
            Kembali ke beranda
          </Link>
        </div>
      </main>
    );
  }

  const isValid = cert.status === "valid";
  const issuedDate = new Date(cert.issuedAt).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <main className="flex min-h-screen items-center justify-center bg-surface-page p-6">
      <div className="w-full max-w-md">
        {/* Header — Stitch verification lockup */}
        <div className="mb-6 text-center">
          <span className="eyebrow eyebrow-center mb-3 justify-center">Verifikasi Keaslian</span>
          <h1 className="text-2xl font-extrabold tracking-tight text-text-primary">
            Verifikasi Sertifikat
          </h1>
        </div>

        <div className="space-y-6 rounded-2xl border border-border-default bg-surface-card p-8 shadow-e1">
          {/* Status badge */}
          <div className="flex justify-center">
            {isValid ? (
              <Badge variant="success" className="px-3 py-1 text-sm">
                <BadgeCheck aria-hidden="true" size={16} />
                Sertifikat Valid
              </Badge>
            ) : (
              <Badge variant="danger" className="px-3 py-1 text-sm">
                <CircleX aria-hidden="true" size={16} />
                Sertifikat Dicabut
              </Badge>
            )}
          </div>

          {/* Logo */}
          <div className="text-center">
            <Image
              src="/logo.png"
              alt="Hazl Academy"
              width={1037}
              height={190}
              className="mx-auto h-8 w-auto"
            />
          </div>

          {/* Detail */}
          <dl className="space-y-3 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="shrink-0 text-text-muted">Pemegang</dt>
              <dd className="text-right font-semibold text-text-primary">{cert.holderName}</dd>
            </div>
            {cert.courseName && (
              <div className="flex justify-between gap-4">
                <dt className="shrink-0 text-text-muted">Kursus</dt>
                <dd className="text-right font-medium text-text-primary">{cert.courseName}</dd>
              </div>
            )}
            <div className="flex justify-between gap-4">
              <dt className="shrink-0 text-text-muted">Jenis</dt>
              <dd className="capitalize text-text-primary">{cert.type}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="shrink-0 text-text-muted">Diterbitkan</dt>
              <dd className="text-text-primary">{issuedDate}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="shrink-0 text-text-muted">Kode</dt>
              <dd className="break-all font-mono text-xs text-text-primary">{cert.code}</dd>
            </div>
          </dl>

          <p className="border-t border-border-subtle pt-4 text-center text-xs text-text-muted">
            Verifikasi resmi oleh{" "}
            <Link href="/" className="text-accent-cyan-strong hover:underline">
              Hazl Academy
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
