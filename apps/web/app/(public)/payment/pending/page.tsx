"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { Clock, RefreshCw, Copy, Check } from "lucide-react";
import { getValidToken } from "@/lib/auth/token";

// ─── Countdown Hook ───────────────────────────────────────────────────────────

function useCountdown(expiresAt: string | null): number | null {
  const [remaining, setRemaining] = useState<number | null>(() => {
    if (!expiresAt) return null;
    const diff = Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000);
    return Math.max(0, diff);
  });

  useEffect(() => {
    if (!expiresAt || remaining === null) return;
    if (remaining <= 0) return;

    const interval = setInterval(() => {
      const diff = Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000);
      setRemaining(Math.max(0, diff));
    }, 1000);
    return () => clearInterval(interval);
  }, [expiresAt, remaining]);

  return remaining;
}

function formatCountdown(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function formatRp(amount: number) {
  return `Rp ${amount.toLocaleString("id-ID")}`;
}

// ─── Main Pending Content ─────────────────────────────────────────────────────

function PendingContent() {
  const router = useRouter();
  const params = useSearchParams();
  const orderId = params.get("orderId");
  const expiresAt = params.get("expiresAt");
  const countdown = useCountdown(expiresAt);

  const [checking, setChecking] = useState(false);
  const [copied, setCopied] = useState(false);
  const [orderData, setOrderData] = useState<{
    finalAmount?: number;
    status?: string;
  } | null>(null);

  const isExpired = countdown !== null && countdown <= 0;

  // Poll order status every 4 seconds to detect payment completion
  useEffect(() => {
    if (!orderId || isExpired) return;

    let active = true;

    async function checkStatus() {
      try {
        const token = await getValidToken();
        if (!token) return;

        const res = await fetch(`/api/orders/${orderId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const body = await res.json();
        if (active && body.success && body.data) {
          setOrderData({
            finalAmount: Number(body.data.finalAmount ?? 0),
            status: body.data.status,
          });

          if (body.data.status === "paid") {
            router.push(`/payment/success?orderId=${orderId}`);
          }
        }
      } catch {
        // silent retry
      }
    }

    checkStatus();
    const interval = setInterval(checkStatus, 4000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [orderId, isExpired, router]);

  // Manual Refresh Handler
  async function handleManualCheck() {
    if (!orderId || checking) return;
    setChecking(true);
    try {
      const token = await getValidToken();
      if (!token) return;
      const res = await fetch(`/api/orders/${orderId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const body = await res.json();
      if (body.success && body.data?.status === "paid") {
        router.push(`/payment/success?orderId=${orderId}`);
      }
    } catch {
      // Ignore
    } finally {
      setTimeout(() => setChecking(false), 500);
    }
  }

  function handleCopyRef() {
    if (!orderId) return;
    navigator.clipboard.writeText(orderId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="min-h-screen bg-[#fcfcfd] flex flex-col justify-center items-center px-4 py-16 text-[#202124] antialiased">
      <div className="w-full max-w-lg">
        {/* Main Card */}
        <div className="rounded-[22px] border border-[#e8e8e9] bg-white p-7 sm:p-9 shadow-none text-center">
          {/* Animated Clock / Status Header */}
          <div className="mb-6 flex justify-center">
            <div className="flex h-18 w-18 items-center justify-center rounded-full bg-amber-50 border-2 border-amber-200">
              <Clock size={36} className="text-amber-600 animate-pulse" />
            </div>
          </div>

          <h1 className="text-2xl font-bold tracking-tight text-[#202124] mb-2">
            {isExpired ? "Batas Waktu Pembayaran Berakhir" : "Menunggu Pembayaran"}
          </h1>
          <p className="text-xs text-[#77787d] leading-relaxed mb-6">
            {isExpired
              ? "Waktu transfer Anda telah habis. Silakan buat pesanan baru untuk melanjutkan."
              : "Selesaikan pembayaran melalui aplikasi m-Banking atau e-Wallet Anda. Halaman ini akan otomatis diperbarui setelah transaksi berhasil diverifikasi."}
          </p>

          {/* Countdown Clock Display if present */}
          {countdown !== null && !isExpired && (
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50/70 px-4 py-1.5 text-xs font-semibold text-amber-800">
              <Clock size={13} />
              <span>Selesaikan dalam {formatCountdown(countdown)}</span>
            </div>
          )}

          {/* Transaction Metadata Box */}
          <div className="mb-6 rounded-xl border border-[#e8e8e9] bg-[#fbfbfc] p-4 text-left space-y-2.5">
            {orderId && (
              <div className="flex justify-between items-center text-xs">
                <span className="text-[#77787d]">Kode Referensi Pesanan</span>
                <button
                  type="button"
                  onClick={handleCopyRef}
                  className="inline-flex items-center gap-1 font-mono font-bold text-[#202124] hover:text-[#0077A8] transition"
                  title="Klik untuk menyalin"
                >
                  <span>{orderId.slice(0, 12).toUpperCase()}</span>
                  {copied ? <Check size={12} className="text-emerald-600" /> : <Copy size={12} />}
                </button>
              </div>
            )}
            {orderData?.finalAmount !== undefined && orderData.finalAmount > 0 && (
              <div className="flex justify-between items-center text-xs pt-2 border-t border-[#e8e8e9]">
                <span className="text-[#77787d]">Jumlah Pembayaran</span>
                <span className="font-bold text-[#0077A8] text-sm">
                  {formatRp(orderData.finalAmount)}
                </span>
              </div>
            )}
            <div className="flex justify-between items-center text-xs pt-2 border-t border-[#e8e8e9]">
              <span className="text-[#77787d]">Status Saluran Gateway</span>
              <span className="inline-flex items-center gap-1 font-semibold text-amber-700">
                <span className="h-2 w-2 rounded-full bg-amber-500 animate-ping" />
                Sinkronisasi Real-time
              </span>
            </div>
          </div>

          {/* Transfer Instructions Step List */}
          <div className="mb-6 text-left rounded-xl border border-[#e8e8e9] p-4 text-xs text-[#77787d] space-y-2.5">
            <p className="font-bold text-[#202124] mb-2">Panduan Pembayaran Cepat:</p>
            <div className="flex items-start gap-2.5">
              <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-[#f2f2f4] text-[11px] font-bold text-[#202124]">
                1
              </span>
              <span>Buka aplikasi m-Banking atau e-Wallet yang Anda pilih saat checkout.</span>
            </div>
            <div className="flex items-start gap-2.5">
              <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-[#f2f2f4] text-[11px] font-bold text-[#202124]">
                2
              </span>
              <span>Pindai QRIS atau masukkan nomor Virtual Account sesuai tagihan Duitku.</span>
            </div>
            <div className="flex items-start gap-2.5">
              <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-[#f2f2f4] text-[11px] font-bold text-[#202124]">
                3
              </span>
              <span>Pastikan nominal pembayaran sesuai hingga digit terakhir agar otomatis terverifikasi.</span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="space-y-2.5">
            <button
              type="button"
              onClick={handleManualCheck}
              disabled={checking}
              className="w-full h-11 rounded-full bg-[#252527] hover:bg-[#1a1b1d] text-white text-xs font-semibold flex items-center justify-center gap-2 transition disabled:opacity-50"
            >
              <RefreshCw size={14} className={checking ? "animate-spin" : ""} />
              <span>{checking ? "Memeriksa Status..." : "Saya Sudah Membayar — Cek Sekarang"}</span>
            </button>

            <Link
              href="/dashboard/pesanan"
              className="w-full h-11 rounded-full border border-[#e8e8e9] hover:bg-[#f2f2f4] text-[#202124] text-xs font-semibold flex items-center justify-center gap-2 transition"
            >
              <span>Lihat Daftar Pesanan Saya</span>
            </Link>
          </div>
        </div>

        {/* Support Help Footer */}
        <p className="mt-6 text-center text-xs text-[#77787d]">
          Mengalami kendala saat mentransfer?{" "}
          <Link href="/faq" className="font-semibold text-[#0077A8] hover:underline">
            Hubungi Tim Bantuan
          </Link>
        </p>
      </div>
    </div>
  );
}

// ─── Export with Suspense ─────────────────────────────────────────────────────

export default function PaymentPendingPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-[#fcfcfd]">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#0077A8] border-t-transparent" />
        </div>
      }
    >
      <PendingContent />
    </Suspense>
  );
}
