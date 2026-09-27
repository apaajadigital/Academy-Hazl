"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  RefreshCw,
  HelpCircle,
  MessageSquare,
  ShieldCheck,
  CreditCard,
  QrCode,
  Copy,
  Check,
  Lock,
  Clock,
  Sparkles,
  ArrowLeft,
} from "lucide-react";
import { WA_NUMBER, buildWaLink } from "@/lib/config";

// ─── Gateway Reason Dictionary ────────────────────────────────────────────────

const REASON_MAP: Record<string, string> = {
  EXPIRED: "Batas waktu sesi transfer telah habis sebelum pembayaran diselesaikan.",
  CANCELLED: "Transaksi dibatalkan oleh pengguna atau penyedia gerbang pembayaran.",
  DECLINED: "Otorisasi transaksi ditolak oleh bank penerbit. Pastikan limit kartu atau saldo Anda mencukupi.",
  INSUFFICIENT_FUNDS: "Saldo tidak mencukupi untuk menyelesaikan transaksi.",
  SUSPECTED_FRAUD: "Transaksi tidak dapat diproses oleh sistem keamanan bank.",
  GATEWAY_ERROR: "Terjadi gangguan sementara pada sistem koneksi perbankan. Silakan coba kembali sesaat lagi.",
};

function formatRp(amount: number) {
  return `Rp ${amount.toLocaleString("id-ID")}`;
}

// ─── Main Failed Content ──────────────────────────────────────────────────────

function FailedContent() {
  const params = useSearchParams();
  const returnUrl = params.get("returnUrl") ?? "/e-course";
  const orderId = params.get("orderId");
  const rawReason = params.get("reason");
  const reason = rawReason
    ? (REASON_MAP[rawReason.toUpperCase()] ?? decodeURIComponent(rawReason))
    : "Batas waktu sesi transfer telah habis atau terjadi kendala sementara pada jaringan perbankan.";

  const [copiedId, setCopiedId] = useState(false);

  const displayTx = orderId ? orderId.slice(0, 14).toUpperCase() : "HZL-TX-8829103";
  const supportWaHref = buildWaLink(
    WA_NUMBER,
    `Halo Admin Hazl, saya mengalami kendala pembayaran untuk pesanan ${displayTx}. Mohon bantuan verifikasinya.`
  );

  function handleCopyOrderId() {
    navigator.clipboard.writeText(displayTx);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  }

  return (
    <div className="min-h-screen bg-[#FAFAFA] text-[#16181D] antialiased">
      {/* 1. Header */}
      <header className="sticky top-0 z-50 border-b border-[#E7E9EC] bg-white/95 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-2 group">
              <span className="font-extrabold text-xl tracking-tight text-[#16181D]">
                Hazl<span className="text-[#FF2F86]">.</span>
              </span>
            </Link>
            <span className="hidden sm:inline-flex items-center gap-1.5 rounded-full border border-[#E7E9EC] bg-[#F6F7F9] px-2.5 py-0.5 text-[11px] font-semibold text-[#5B616E]">
              <Lock size={12} className="text-[#0077A8]" />
              Checkout Terenkripsi
            </span>
          </div>

          <div className="flex items-center gap-3 text-xs font-semibold text-[#5B616E]">
            <Link
              href="/e-course"
              className="hidden sm:inline-flex items-center gap-1.5 rounded-full border border-[#E7E9EC] bg-white px-3 py-1 hover:bg-[#F6F7F9] transition-colors"
            >
              <ArrowLeft size={13} />
              <span>Kembali ke Katalog</span>
            </Link>
            <Link href="/faq" className="hover:text-[#16181D] transition-colors flex items-center gap-1">
              <HelpCircle size={14} />
              <span>Bantuan</span>
            </Link>
          </div>
        </div>
      </header>

      {/* 2. Step Breadcrumbs */}
      <div className="border-b border-[#E7E9EC] bg-white py-3.5">
        <div className="mx-auto flex max-w-5xl items-center justify-center gap-6 px-4 text-xs font-medium text-[#5B616E]">
          <div className="flex items-center gap-2 text-[#8A909A]">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#E7E9EC] text-[10px] font-bold text-[#5B616E]">
              1
            </span>
            <span>Pesanan</span>
          </div>
          <span className="h-0.5 w-6 bg-[#E7E9EC]" />
          <div className="flex items-center gap-2 text-[#8A909A]">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#E7E9EC] text-[10px] font-bold text-[#5B616E]">
              2
            </span>
            <span>Pembayaran</span>
          </div>
          <span className="h-0.5 w-6 bg-[#E7E9EC]" />
          <div className="flex items-center gap-2 text-rose-700 font-bold">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-rose-100 text-[10px] font-bold text-rose-700">
              !
            </span>
            <span>Verifikasi Status</span>
          </div>
        </div>
      </div>

      {/* 3. Main Two-Column Layout */}
      <main className="mx-auto max-w-5xl px-4 py-8 sm:py-12">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Column: Failure Alert & Solutions (7 Cols) */}
          <div className="lg:col-span-7 space-y-6">
            {/* Alert Card */}
            <div className="rounded-[26px] border border-[#E7E9EC] bg-white p-6 sm:p-8 shadow-sm">
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl bg-rose-50 text-rose-600 border border-rose-200">
                  <AlertTriangle size={24} />
                </div>
                <div className="space-y-2">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-50 border border-rose-200 px-3 py-0.5 text-xs font-bold text-rose-700">
                    <span className="h-1.5 w-1.5 rounded-full bg-rose-600" />
                    Transaksi Belum Berhasil
                  </span>
                  <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-[#16181D]">
                    Pembayaran Tidak Berhasil Diproses
                  </h1>
                  <p className="text-xs sm:text-sm text-[#5B616E] leading-relaxed">
                    Transaksi tidak dapat diselesaikan karena batas waktu sesi habis (session timeout) atau kendala jaringan perbankan. Saldo rekening Anda tidak terpotong.
                  </p>
                </div>
              </div>

              {/* Data Safe Notice */}
              <div className="mt-6 rounded-2xl border border-[#E7E9EC] bg-[#FAFAFA] p-4 flex items-start gap-3">
                <ShieldCheck size={18} className="text-[#0077A8] flex-shrink-0 mt-0.5" />
                <p className="text-xs text-[#5B616E] leading-relaxed">
                  <strong className="text-[#16181D]">Data pendaftaran dan diskon Anda aman.</strong> Sistem secara otomatis menyimpan progres checkout, Anda tidak perlu mengulang pengisian formulir.
                </p>
              </div>

              {/* Next Steps Box */}
              <div className="mt-6 pt-6 border-t border-[#E7E9EC] space-y-4">
                <div className="flex items-center gap-2">
                  <Sparkles size={16} className="text-[#0077A8]" />
                  <h3 className="font-bold text-sm text-[#16181D]">Solusi Cepat & Tindakan Selanjutnya</h3>
                </div>
                <p className="text-xs text-[#5B616E] leading-relaxed">
                  Coba gunakan metode pembayaran alternatif seperti QRIS Nasional atau Virtual Account bank lain yang memiliki konfirmasi instan otomatis.
                </p>

                <div className="flex flex-col sm:flex-row gap-3 pt-2">
                  <Link
                    id="payment-failed-retry-btn"
                    href={returnUrl}
                    className="flex-1 inline-flex h-11 items-center justify-center gap-2 rounded-full bg-[#0077A8] px-6 text-sm font-bold text-white hover:bg-[#0D5B8A] transition-colors shadow-sm"
                  >
                    <RefreshCw size={15} />
                    <span>Coba Bayar Lagi Sekarang</span>
                  </Link>
                  <Link
                    href={returnUrl}
                    className="inline-flex h-11 items-center justify-center gap-2 rounded-full border border-[#E7E9EC] bg-white px-5 text-sm font-semibold text-[#16181D] hover:bg-[#F6F7F9] transition-colors"
                  >
                    <span>Pilih Metode Lain</span>
                  </Link>
                </div>

                <div className="pt-2">
                  <a
                    href={supportWaHref ?? "https://wa.me/6281234567890"}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-[#0077A8] hover:underline"
                  >
                    <MessageSquare size={14} />
                    <span>Masih mengalami kendala berulang? Hubungi Tim Dukungan Transaksi →</span>
                  </a>
                </div>
              </div>
            </div>

            {/* Transaction FAQ Accordion/Cards */}
            <div className="rounded-[26px] border border-[#E7E9EC] bg-white p-6 shadow-sm space-y-4">
              <h3 className="font-bold text-sm text-[#16181D] flex items-center gap-2">
                <HelpCircle size={16} className="text-[#0077A8]" />
                <span>Pertanyaan Seputar Transaksi</span>
              </h3>

              <div className="space-y-3">
                <div className="rounded-xl border border-[#E7E9EC] bg-[#FAFAFA] p-3.5 space-y-1">
                  <h4 className="font-bold text-xs text-[#16181D]">Apakah saldo saya terpotong?</h4>
                  <p className="text-xs text-[#5B616E] leading-relaxed">
                    Tidak perlu khawatir. Jika transaksi gagal namun saldo bank Anda berkurang karena keterlambatan jaringan, sistem switching perbankan akan melakukan auto-reversal kembali ke rekening asal dalam 1×24 jam kerja secara otomatis.
                  </p>
                </div>

                <div className="rounded-xl border border-[#E7E9EC] bg-[#FAFAFA] p-3.5 space-y-1">
                  <h4 className="font-bold text-xs text-[#16181D]">Bagaimana jika limit pembayaran tercapai?</h4>
                  <p className="text-xs text-[#5B616E] leading-relaxed">
                    Anda dapat memilih metode pembayaran alternatif seperti Virtual Account BCA, Mandiri, BRI, BNI atau menggunakan opsi split bill / pembayaran bertahap dengan menghubungi tim CS kami sebelum kuota kelas habis.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Sticky Order Summary (5 Cols) */}
          <div className="lg:col-span-5 space-y-4">
            <div className="sticky top-24 rounded-[26px] border border-[#E7E9EC] bg-white p-6 shadow-sm space-y-5">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-[#5B616E]">
                  STATUS PEMESANAN
                </p>
                <div className="flex items-center justify-between mt-1">
                  <h3 className="font-bold text-base text-[#16181D]">Tersimpan (Menunggu Pembayaran)</h3>
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-amber-50 text-amber-700 text-xs">
                    ⏳
                  </span>
                </div>
              </div>

              {/* Promo Freeze Notice */}
              <div className="rounded-xl border border-[#BDE5F8] bg-[#E8F6FF] p-3 flex items-center gap-2 text-xs text-[#0077A8] font-semibold">
                <Clock size={15} className="flex-shrink-0" />
                <span>Harga promo tetap diamankan selama 23:59:42</span>
              </div>

              {/* Order Ref Tile */}
              <div className="rounded-xl border border-[#E7E9EC] bg-[#FAFAFA] p-3 flex items-center justify-between text-xs">
                <div>
                  <span className="text-[10px] text-[#5B616E]">Nomor Pesanan</span>
                  <p className="font-mono font-bold text-[#16181D]">#{displayTx}</p>
                </div>
                <button
                  type="button"
                  onClick={handleCopyOrderId}
                  className="inline-flex items-center gap-1 rounded-lg border border-[#E7E9EC] bg-white px-2 py-1 text-xs font-semibold text-[#16181D] hover:bg-[#F6F7F9]"
                >
                  {copiedId ? <Check size={12} className="text-emerald-600" /> : <Copy size={12} />}
                  <span>{copiedId ? "Tersalin" : "Salin"}</span>
                </button>
              </div>

              {/* Course Item Title */}
              <div className="border-t border-[#E7E9EC] pt-4 space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#5B616E]">
                  Item Kursus
                </span>
                <h4 className="font-bold text-sm text-[#16181D]">
                  Mastering Video AI & Commercial UGC
                </h4>
                <p className="text-xs text-emerald-600 font-semibold flex items-center gap-1">
                  <Check size={13} />
                  Akses Seumur Hidup + Komunitas VIP
                </p>
              </div>

              {/* Price Breakdown */}
              <div className="border-t border-[#E7E9EC] pt-4 space-y-2.5 text-xs">
                <div className="flex justify-between text-[#5B616E]">
                  <span>Harga Normal</span>
                  <span className="line-through">Rp 1.250.000</span>
                </div>
                <div className="flex justify-between text-rose-600 font-semibold">
                  <span>Potongan Promo Early-Bird</span>
                  <span>- Rp 951.000</span>
                </div>
                <div className="flex justify-between text-[#5B616E]">
                  <span>Biaya Layanan Gerbang Pembayaran</span>
                  <span className="text-emerald-600 font-semibold">Rp 0 (Gratis)</span>
                </div>
                <div className="flex justify-between items-baseline border-t border-[#E7E9EC] pt-3">
                  <span className="font-bold text-sm text-[#16181D]">Total Tagihan</span>
                  <span className="font-extrabold text-xl text-[#0077A8]">Rp 299.000</span>
                </div>
              </div>

              {/* Recommended Methods */}
              <div className="border-t border-[#E7E9EC] pt-4">
                <p className="text-[10px] font-bold uppercase tracking-wider text-[#5B616E] mb-2">
                  Metode Disarankan:
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <div className="flex items-center gap-2 rounded-xl border border-[#E7E9EC] bg-[#FAFAFA] p-2.5 text-xs font-semibold text-[#16181D]">
                    <QrCode size={16} className="text-[#0077A8]" />
                    <span>QRIS Instan</span>
                  </div>
                  <div className="flex items-center gap-2 rounded-xl border border-[#E7E9EC] bg-[#FAFAFA] p-2.5 text-xs font-semibold text-[#16181D]">
                    <CreditCard size={16} className="text-[#0077A8]" />
                    <span>BCA VA</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick CS Box */}
            <div className="rounded-2xl border border-[#E7E9EC] bg-[#F6F7F9] p-4 text-xs text-[#5B616E] flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <MessageSquare size={16} className="text-[#0077A8] flex-shrink-0" />
                <div>
                  <p className="font-bold text-[#16181D]">Butuh panduan transfer?</p>
                  <p className="text-[11px] text-[#5B616E]">Customer Support aktif 24/7 di WhatsApp</p>
                </div>
              </div>
              <a
                href={supportWaHref ?? "https://wa.me/6281234567890"}
                target="_blank"
                rel="noreferrer"
                className="rounded-full bg-white border border-[#E7E9EC] px-3 py-1 font-bold text-[#16181D] hover:bg-[#E8F6FF] hover:text-[#0077A8] transition-colors whitespace-nowrap"
              >
                Chat CS
              </a>
            </div>
          </div>
        </div>
      </main>

      {/* 4. Footer */}
      <footer className="mt-12 border-t border-[#E7E9EC] bg-white py-8 text-center text-xs text-[#5B616E]">
        <div className="mx-auto max-w-4xl px-4 space-y-3">
          <div className="flex flex-wrap justify-center gap-6">
            <Link href="/terms" className="hover:text-[#16181D] transition-colors">
              Garansi 7 Hari Uang Kembali
            </Link>
            <span>•</span>
            <Link href="/privacy" className="hover:text-[#16181D] transition-colors">
              Kebijakan Privasi
            </Link>
            <span>•</span>
            <Link href="/terms" className="hover:text-[#16181D] transition-colors">
              Syarat & Ketentuan
            </Link>
            <span>•</span>
            <Link href="/faq" className="hover:text-[#16181D] transition-colors">
              Bantuan Pelanggan
            </Link>
          </div>
          <p className="text-[11px] text-[#8A909A]">
            © 2026 Hazl Academy. Seluruh hak cipta dilindungi. Sistem Keamanan ISO/IEC 27001 Terverifikasi.
          </p>
        </div>
      </footer>
    </div>
  );
}

// ─── Export with Suspense ─────────────────────────────────────────────────────

export default function PaymentFailedPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-[#FAFAFA]">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#0077A8] border-t-transparent" />
        </div>
      }
    >
      <FailedContent />
    </Suspense>
  );
}
