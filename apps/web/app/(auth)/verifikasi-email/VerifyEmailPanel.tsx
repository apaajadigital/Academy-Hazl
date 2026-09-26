"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { AlertCircle, CheckCircle2 } from "lucide-react";
import { verifyEmail } from "@/lib/auth/api";

type Status = "verifying" | "success" | "error";

export default function VerifyEmailPanel() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";

  const [status, setStatus] = useState<Status>(token ? "verifying" : "error");
  const [error, setError] = useState<string | null>(
    token ? null : "Tautan verifikasi tidak valid. Pastikan Anda membuka tautan lengkap dari email.",
  );
  const ranRef = useRef(false);

  useEffect(() => {
    if (!token || ranRef.current) return;
    ranRef.current = true;

    verifyEmail(token).then((result) => {
      if (!result.success) {
        setError(result.error?.message ?? "Gagal memverifikasi email. Tautan mungkin sudah kedaluwarsa.");
        setStatus("error");
        return;
      }
      setStatus("success");
    });
  }, [token]);

  if (status === "verifying") {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-6 text-center">
        <span
          className="h-12 w-12 animate-spin rounded-full border-[3px] border-accent-cyan-strong border-t-transparent"
          aria-hidden="true"
        />
        <h2 className="text-lg font-semibold text-text-primary">Memverifikasi</h2>
        <p className="text-sm text-text-secondary">Memverifikasi email Anda…</p>
      </div>
    );
  }

  if (status === "success") {
    return (
      <div className="space-y-3 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-surface-accent-soft">
          <CheckCircle2 size={34} className="text-accent" aria-hidden="true" />
        </div>
        <h2 className="text-lg font-semibold text-text-primary">Email berhasil diverifikasi!</h2>
        <p className="text-sm text-text-secondary">Terima kasih, akun Anda kini terverifikasi.</p>
        {/*
          Bug fix (Stitch source): the design's success CTA used `bg-brand-gradient`
          without shipping the gradient rule, rendering white-on-white (invisible).
          Here the CTA explicitly uses the app's defined `.bg-brand-gradient` with
          white text so the primary action is always visible.
        */}
        <Link
          href="/masuk"
          className="mt-2 inline-flex items-center justify-center gap-2 rounded-full bg-brand-gradient px-7 py-3 text-[0.9375rem] font-semibold text-white shadow-e1 transition hover:opacity-90 hover:shadow-e2"
        >
          Masuk sekarang
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-3 text-center">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-50">
        <AlertCircle size={34} className="text-red-600" aria-hidden="true" />
      </div>
      <h2 className="text-lg font-semibold text-text-primary">Tautan tidak valid</h2>
      <p role="alert" className="text-sm font-medium text-red-600">
        {error}
      </p>
      <Link href="/masuk" className="inline-block text-sm text-accent hover:underline">
        Kembali ke halaman masuk
      </Link>
    </div>
  );
}
