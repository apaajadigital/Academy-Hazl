"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { XCircle, RefreshCw, MessageSquare } from "lucide-react";
import { WA_NUMBER, buildWaLink } from "@/lib/config";

// ─── Gateway Reason Dictionary ────────────────────────────────────────────────

const REASON_MAP: Record<string, string> = {
  EXPIRED: "Waktu pembayaran telah habis sebelum transaksi diselesaikan.",
  CANCELLED: "Transaksi dibatalkan oleh pengguna atau penyedia pembayaran.",
  DECLINED: "Transaksi ditolak oleh bank penerbit kartu. Periksa batas limit Anda.",
  INSUFFICIENT_FUNDS: "Saldo tidak mencukupi untuk menyelesaikan transaksi.",
  SUSPECTED_FRAUD: "Transaksi tidak dapat diproses oleh sistem keamanan bank.",
  GATEWAY_ERROR: "Terjadi gangguan sementara pada sistem perbankan. Silakan coba sesaat lagi.",
};

// ─── Main Failed Content ──────────────────────────────────────────────────────

function FailedContent() {
  const params = useSearchParams();
  const returnUrl = params.get("returnUrl") ?? "/e-course";
  const orderId = params.get("orderId");
  const rawReason = params.get("reason");
  const reason = rawReason
    ? (REASON_MAP[rawReason.toUpperCase()] ?? decodeURIComponent(rawReason))
    : "Pembayaran tidak dapat diselesaikan atau telah dibatalkan.";

  const supportWaHref = buildWaLink(
    WA_NUMBER,
    `Halo Admin Hazl, saya mengalami kendala pembayaran${
      orderId ? ` untuk pesanan ${orderId.slice(0, 8).toUpperCase()}` : ""
    }. Mohon bantuan verifikasinya.`
  );

  return (
    <div className="min-h-screen bg-[#fcfcfd] flex flex-col justify-center items-center px-4 py-16 text-[#202124] antialiased">
      <div className="w-full max-w-lg">
        {/* Main Card */}
        <div className="rounded-[22px] border border-[#e8e8e9] bg-white p-7 sm:p-9 shadow-none text-center">
          {/* Animated / Prominent X Icon */}
          <div className="mb-6 flex justify-center">
            <div className="flex h-18 w-18 items-center justify-center rounded-full bg-rose-50 border-2 border-rose-200">
              <XCircle size={38} className="text-rose-600" />
            </div>
          </div>

          <h1 className="text-2xl font-bold tracking-tight text-[#202124] mb-2">
            Pembayaran Belum Berhasil
          </h1>
          <p className="text-xs text-[#77787d] leading-relaxed mb-6">
            Kami tidak dapat memproses transaksi Anda saat ini. Jangan khawatir, saldo Anda tidak akan terpotong untuk transaksi yang gagal.
          </p>

          {/* Reason Alert Box */}
          <div className="mb-6 rounded-xl border border-rose-200 bg-rose-50/70 p-4 text-left">
            <div className="flex items-start gap-2.5">
              <span className="text-sm">⚠️</span>
              <div>
                <h4 className="text-xs font-bold text-rose-900 mb-0.5">Penyebab Kegagalan:</h4>
                <p className="text-xs text-rose-800 leading-relaxed">{reason}</p>
              </div>
            </div>
          </div>

          {/* Transaction Metadata if present */}
          {orderId && (
            <div className="mb-6 rounded-xl border border-[#e8e8e9] bg-[#fbfbfc] p-3.5 text-left flex justify-between items-center text-xs">
              <span className="text-[#77787d]">Referensi Transaksi</span>
              <span className="font-mono font-bold text-[#202124]">
                {orderId.slice(0, 12).toUpperCase()}
              </span>
            </div>
          )}

          {/* Solution Checklist */}
          <div className="mb-6 rounded-xl border border-[#e8e8e9] p-4 text-left text-xs text-[#77787d] space-y-2">
            <p className="font-bold text-[#202124] mb-1">Solusi yang dapat Anda coba:</p>
            <p className="flex items-start gap-2">
              <span>•</span> Gunakan metode pembayaran lain seperti QRIS atau Virtual Account bank berbeda.
            </p>
            <p className="flex items-start gap-2">
              <span>•</span> Pastikan saldo rekening atau limit kartu Anda mencukupi nominal tagihan.
            </p>
            <p className="flex items-start gap-2">
              <span>•</span> Periksa kembali koneksi internet saat proses otorisasi PIN / OTP.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="space-y-2.5">
            <Link
              id="payment-failed-retry-btn"
              href={returnUrl}
              className="w-full h-11 rounded-full bg-[#252527] hover:bg-[#1a1b1d] text-white text-xs font-semibold flex items-center justify-center gap-2 transition"
            >
              <RefreshCw size={14} />
              <span>Coba Bayar Lagi</span>
            </Link>

            <a
              href={supportWaHref ?? "https://wa.me/6281234567890"}
              target="_blank"
              rel="noreferrer"
              className="w-full h-11 rounded-full border border-[#e8e8e9] hover:bg-[#f2f2f4] text-[#202124] text-xs font-semibold flex items-center justify-center gap-2 transition"
            >
              <MessageSquare size={14} className="text-[#77787d]" />
              <span>Hubungi Bantuan CS (WhatsApp)</span>
            </a>
          </div>
        </div>

        {/* Back Link */}
        <p className="mt-6 text-center text-xs text-[#77787d]">
          Ingin memilih program lain?{" "}
          <Link href="/e-course" className="font-semibold text-[#0077A8] hover:underline">
            Lihat Katalog Kursus
          </Link>
        </p>
      </div>
    </div>
  );
}

// ─── Export with Suspense ─────────────────────────────────────────────────────

export default function PaymentFailedPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-[#fcfcfd]">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#0077A8] border-t-transparent" />
        </div>
      }
    >
      <FailedContent />
    </Suspense>
  );
}
