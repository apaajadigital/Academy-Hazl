"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  AlertCircle,
  CheckCircle2,
  Mail,
  ExternalLink,
  RefreshCw,
  Clock,
  ArrowRight,
  ShieldCheck,
  MessageSquare,
} from "lucide-react";
import { verifyEmail } from "@/lib/auth/api";
import { WA_NUMBER, buildWaLink } from "@/lib/config";

type Status = "verifying" | "success" | "error";

export default function VerifyEmailPanel() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const emailParam = searchParams.get("email") ?? "";

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

  const supportWaHref = buildWaLink(
    WA_NUMBER,
    `Halo Admin Hazl, saya butuh bantuan aktivasi akun dan verifikasi email${
      emailParam ? ` untuk ${emailParam}` : ""
    }.`
  );

  // Verifying State
  if (status === "verifying") {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-6 text-center">
        <span
          className="h-10 w-10 animate-spin rounded-full border-3 border-[#0077A8] border-t-transparent"
          aria-hidden="true"
        />
        <h2 className="text-base font-extrabold text-[#16181D]">Memverifikasi Email...</h2>
        <p className="text-xs text-[#5B616E]">
          Sistem kami sedang memvalidasi token kriptografis Anda.
        </p>
      </div>
    );
  }

  // Success State
  if (status === "success") {
    return (
      <div className="space-y-4 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#E8F6FF] text-[#0077A8] border border-[#BDE5F8]">
          <CheckCircle2 size={32} />
        </div>
        <h2 className="text-xl font-extrabold text-[#16181D]">Email Berhasil Diverifikasi!</h2>
        <p className="text-xs text-[#5B616E] leading-relaxed">
          Terima kasih, akun Anda kini aktif secara penuh. Silakan masuk untuk mengakses workspace dan materi belajar Anda.
        </p>
        <div className="pt-2">
          <Link
            href="/masuk"
            className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-full bg-[#0077A8] px-6 text-xs font-bold text-white hover:bg-[#0D5B8A] transition-colors shadow-sm"
          >
            <span>Masuk ke Platform Sekarang</span>
            <ArrowRight size={14} />
          </Link>
        </div>
      </div>
    );
  }

  // Default / Waiting / Error State
  return (
    <div className="space-y-5">
      {/* Top Header Eyebrow */}
      <div className="flex items-center justify-between text-[11px] font-bold text-[#5B616E]">
        <span className="rounded-full bg-[#E8F6FF] px-2.5 py-0.5 text-[#0077A8]">
          Autentikasi Terverifikasi
        </span>
        <span className="text-[#8A909A]">Langkah 5 dari 5</span>
      </div>

      <div className="flex items-center justify-between">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-3 py-0.5 text-[10px] font-bold text-amber-800">
          <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
          Menunggu Konfirmasi Email
        </span>
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#E8F6FF] text-[#0077A8] border border-[#BDE5F8]">
          <Mail size={20} />
        </div>
      </div>

      <div>
        <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-[#16181D]">
          Satu Langkah Lagi Menuju Workspace Anda
        </h1>
        <p className="mt-1 text-xs text-[#5B616E] leading-relaxed">
          Kami telah mengirimkan tautan verifikasi ke email Anda{emailParam ? ` (${emailParam})` : ""}. Klik tautan pada email untuk mengaktifkan akun dan workspace belajar Anda.
        </p>
      </div>

      {error && (
        <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs text-rose-700">
          {error}
        </div>
      )}

      {/* Status Box */}
      <div className="rounded-2xl border border-[#E7E9EC] bg-[#FAFAFA] p-3.5 space-y-2 text-xs">
        <div className="flex justify-between items-center">
          <span className="text-[#5B616E]">Status Akun</span>
          <span className="rounded-md border border-[#E7E9EC] bg-white px-2 py-0.5 font-bold text-amber-700 text-[11px]">
            Belum Aktif
          </span>
        </div>
        <div className="flex justify-between items-center border-t border-[#E7E9EC] pt-2">
          <span className="text-[#5B616E]">Waktu Berlaku Tautan</span>
          <span className="font-mono font-semibold text-[#16181D]">23 Jam 59 Menit</span>
        </div>
      </div>

      {/* Primary Webmail Actions */}
      <div className="space-y-2.5 pt-1">
        <a
          href="https://mail.google.com"
          target="_blank"
          rel="noreferrer"
          className="flex h-11 w-full items-center justify-center gap-2 rounded-full bg-[#0077A8] px-6 text-xs font-bold text-white hover:bg-[#0D5B8A] transition-colors shadow-sm"
        >
          <ExternalLink size={14} />
          <span>Buka Webmail (Gmail / Outlook)</span>
        </a>

        <div className="flex gap-2">
          <Link
            href="/masuk"
            className="flex-1 inline-flex h-10 items-center justify-center gap-1.5 rounded-full border border-[#E7E9EC] bg-white px-3 text-xs font-semibold text-[#16181D] hover:bg-[#F6F7F9]"
          >
            <span>Halaman Masuk</span>
          </Link>
          <Link
            href="/daftar"
            className="flex-1 inline-flex h-10 items-center justify-center gap-1.5 rounded-full border border-[#E7E9EC] bg-white px-3 text-xs font-semibold text-[#16181D] hover:bg-[#F6F7F9]"
          >
            <span>Ganti Email</span>
          </Link>
        </div>
      </div>

      {/* Support Box */}
      <div className="rounded-2xl border border-[#E7E9EC] bg-[#FAFAFA] p-3.5 flex items-center justify-between text-[11px] text-[#5B616E]">
        <div className="flex items-center gap-2">
          <MessageSquare size={15} className="text-[#0077A8] flex-shrink-0" />
          <span>Mengalami kendala penerimaan email?</span>
        </div>
        <a
          href={supportWaHref ?? "https://wa.me/6281234567890"}
          target="_blank"
          rel="noreferrer"
          className="font-bold text-[#0077A8] hover:underline whitespace-nowrap"
        >
          Hubungi CS →
        </a>
      </div>
    </div>
  );
}
