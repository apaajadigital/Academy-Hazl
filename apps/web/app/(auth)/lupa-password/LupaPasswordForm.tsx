"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Mail, KeyRound, ShieldCheck, CheckCircle2 } from "lucide-react";
import { forgotPassword } from "@/lib/auth/api";

export function LupaPasswordForm() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const result = await forgotPassword(email);
    setLoading(false);
    if (!result.success) {
      setError(result.error?.message ?? "Terjadi kesalahan saat memproses permintaan.");
      return;
    }
    setSubmitted(true);
  }

  if (submitted) {
    return (
      <div className="space-y-4 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#E8F6FF] text-[#0077A8] border border-[#BDE5F8]">
          <CheckCircle2 size={32} />
        </div>
        <h2 className="text-xl font-extrabold text-[#16181D]">Tautan Terkirim!</h2>
        <p className="text-xs text-[#5B616E] leading-relaxed">
          Jika alamat email <strong className="text-[#16181D]">{email}</strong> terdaftar di sistem kami, tautan pemulihan kata sandi telah dikirimkan ke kotak masuk Anda.
        </p>
        <div className="rounded-xl border border-[#E7E9EC] bg-[#FAFAFA] p-3 text-[11px] text-[#5B616E]">
          Tautan berlaku selama 15 menit dan hanya dapat digunakan 1 kali demi keamanan akun.
        </div>
        <div className="pt-2">
          <Link
            href="/masuk"
            className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-full border border-[#E7E9EC] bg-white px-5 text-xs font-bold text-[#16181D] hover:bg-[#F6F7F9] transition-colors"
          >
            <ArrowLeft size={14} />
            <span>Kembali ke Halaman Masuk</span>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Top Eyebrow */}
      <div className="flex items-center justify-between text-[11px] font-bold text-[#5B616E]">
        <span className="rounded-full bg-[#E8F6FF] px-2.5 py-0.5 text-[#0077A8]">
          Langkah 1 dari 2: Verifikasi Akun
        </span>
        <span className="text-[#8A909A]">Halaman 3 dari 5</span>
      </div>

      {/* Icon Squircle */}
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#E8F6FF] text-[#0077A8] border border-[#BDE5F8]">
        <KeyRound size={20} />
      </div>

      {/* Title & Subtitle */}
      <div>
        <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-[#16181D]">
          Lupa Kata Sandi?
        </h1>
        <p className="mt-1 text-xs text-[#5B616E] leading-relaxed">
          Masukkan alamat email yang terdaftar pada akun Hazl Academy Anda. Kami akan mengirimkan tautan pemulihan sandi terenkripsi yang berlaku selama 15 menit.
        </p>
      </div>

      {error && (
        <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs text-rose-700">
          {error}
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        <div className="space-y-1">
          <label htmlFor="email" className="block text-xs font-bold text-[#16181D]">
            Email Akun Anda
          </label>
          <div className="relative">
            <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#8A909A]" />
            <input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="nama@email.com"
              className="h-11 w-full rounded-xl border border-[#E7E9EC] bg-[#FAFAFA] pl-10 pr-3 text-xs text-[#16181D] placeholder:text-[#8A909A] focus:border-[#0077A8] focus:bg-white focus:outline-none transition-colors"
            />
          </div>
          <p className="text-[11px] text-[#8A909A]">
            Gunakan email aktif yang Anda daftarkan di Hazl Academy.
          </p>
        </div>

        {/* Security Notice Callout */}
        <div className="rounded-xl border border-[#E7E9EC] bg-[#FAFAFA] p-3 flex items-start gap-2.5 text-[11px] text-[#5B616E]">
          <ShieldCheck size={16} className="text-[#0077A8] flex-shrink-0 mt-0.5" />
          <span>
            Demi keamanan data Anda, tautan hanya dapat digunakan 1 kali.
          </span>
        </div>

        {/* Submit Button */}
        <div className="pt-1">
          <button
            type="submit"
            disabled={loading}
            className="flex h-11 w-full items-center justify-center gap-2 rounded-full bg-[#0077A8] px-6 text-xs font-bold text-white hover:bg-[#0D5B8A] transition-colors shadow-sm disabled:opacity-50"
          >
            <span>{loading ? "Mengirim Tautan..." : "Kirim Tautan Pemulihan"}</span>
            <ArrowRight size={14} />
          </button>
        </div>
      </form>

      {/* Back Link */}
      <div className="border-t border-[#E7E9EC] pt-4 text-center">
        <Link
          href="/masuk"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-[#5B616E] hover:text-[#16181D]"
        >
          <ArrowLeft size={13} />
          <span>Kembali ke Halaman Masuk</span>
        </Link>
      </div>

      {/* Bottom Protocol Info */}
      <div className="text-center text-[10px] text-[#8A909A]">
        • Protokol Enkripsi TLS 1.3 Aktif • Token Masa Berlaku 15 Menit
      </div>
    </div>
  );
}
