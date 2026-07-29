"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { PartyPopper, Mail, AlertCircle, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui";
import { getValidToken } from "@/lib/auth/token";

export default function LmsInviteAcceptPage() {
  const { token } = useParams<{ token: string }>();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [tenantSlug, setTenantSlug] = useState<string | null>(null);

  async function handleAccept() {
    setLoading(true);
    setError(null);
    try {
      // The accept endpoint is `authenticate`-guarded and reads req.user.id, so a
      // request without a bearer token is a guaranteed 401. Send the visitor to
      // log in and bounce straight back to this invite instead of failing here.
      const accessToken = await getValidToken();
      if (!accessToken) {
        router.push(`/masuk?redirect=${encodeURIComponent(`/lms/invite/${token}`)}`);
        return;
      }
      const res = await fetch(`/api/lms/invite/${token}/accept`, {
        method: "POST",
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const data = await res.json();
      if (!res.ok) {
        // Envelope shape is {success,error:{message}}; keep the legacy fallback.
        setError(data.error?.message ?? data.message ?? "Gagal menerima undangan.");
        return;
      }
      setSuccess(true);
      if (data.data?.tenantSlug) setTenantSlug(data.data.tenantSlug);
      setTimeout(() => {
        if (data.data?.tenantSlug) router.push(`/lms/${data.data.tenantSlug}`);
      }, 2500);
    } catch {
      setError("Terjadi kesalahan. Silakan coba lagi.");
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface-page p-6">
        <div className="w-full max-w-sm rounded-2xl border border-border-default bg-surface-card p-10 text-center shadow-e1">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-600/10 text-green-600">
            <PartyPopper size={30} aria-hidden="true" />
          </div>
          <h1 className="mb-2 font-display text-xl font-bold text-text-primary">Undangan diterima!</h1>
          <p className="text-sm text-text-secondary">Kamu berhasil bergabung. Mengalihkan ke portal...</p>
          {tenantSlug && (
            <Link
              href={`/lms/${tenantSlug}`}
              className="mt-4 inline-flex items-center gap-1 text-sm text-accent-cyan-strong hover:underline"
            >
              Buka portal sekarang
              <ArrowRight size={14} aria-hidden="true" />
            </Link>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface-page p-6">
      <div className="w-full max-w-sm rounded-2xl border border-border-default bg-surface-card p-10 text-center shadow-e1">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-brand-gradient text-white">
          <Mail size={28} aria-hidden="true" />
        </div>
        <h1 className="mb-2 font-display text-xl font-bold text-text-primary">Undangan LMS</h1>
        <p className="mb-6 text-sm text-text-secondary">
          Kamu telah diundang untuk bergabung ke program pembelajaran. Klik tombol di bawah untuk menerima undangan.
        </p>

        {error && (
          <div className="mb-4 flex items-center gap-2 rounded-xl border border-red-600/20 bg-red-600/10 p-3 text-left text-sm text-red-700">
            <AlertCircle size={16} className="flex-shrink-0" aria-hidden="true" />
            {error}
          </div>
        )}

        <Button
          variant="primary"
          onClick={handleAccept}
          loading={loading}
          className="w-full"
        >
          {loading ? "Memproses..." : "Terima Undangan"}
        </Button>

        <p className="mt-4 text-xs text-text-secondary">
          Pastikan kamu sudah masuk dengan akun yang menerima undangan ini.
        </p>
      </div>
    </div>
  );
}
