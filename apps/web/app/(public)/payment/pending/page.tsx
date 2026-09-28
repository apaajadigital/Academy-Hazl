"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import {
  Clock,
  RefreshCw,
  Copy,
  Check,
  HelpCircle,
  ExternalLink,
  MessageSquare,
  Lock,
  AlertTriangle,
} from "lucide-react";
import { getValidToken } from "@/lib/auth/token";
import { WA_NUMBER, buildWaLink } from "@/lib/config";

function formatRp(amount: number) {
  return `Rp ${amount.toLocaleString("id-ID")}`;
}

// ─── Main Pending Content ─────────────────────────────────────────────────────

/**
 * Duitku's hosted payment page is where the buyer actually pays (VA number,
 * QRIS, etc. all live there — see duitkuService.ts, which only ever returns a
 * `paymentUrl` redirect target, never a raw VA number or countdown). This page
 * is only reached (a) as Duitku's `returnUrl` after the buyer leaves that
 * hosted page, or (b) as a fallback when `paymentUrl` was missing entirely.
 * It must never invent payment instructions of its own — every past version
 * that did (VA number, QRIS code, countdown) was fabricating data no backend
 * field actually provides (verified against /api/orders response + duitkuService.ts,
 * 28 Sep 2026 audit).
 */
function PendingContent() {
  const router = useRouter();
  const params = useSearchParams();
  const orderId = params.get("orderId");

  const [checking, setChecking] = useState(false);
  const [copiedId, setCopiedId] = useState(false);
  const [loadStatus, setLoadStatus] = useState<"loading" | "ready" | "error">(
    orderId ? "loading" : "error",
  );
  const [orderData, setOrderData] = useState<{
    finalAmount?: number;
    status?: string;
    itemTitle?: string;
  } | null>(null);

  // Poll order status every 4 seconds to detect payment completion.
  useEffect(() => {
    if (!orderId) return;

    let active = true;

    async function checkStatus() {
      try {
        const token = await getValidToken();
        if (!token) {
          if (active) setLoadStatus("error");
          return;
        }

        const res = await fetch(`/api/orders/${orderId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const body = await res.json();
        if (!active) return;

        if (body.success && body.data) {
          setOrderData({
            finalAmount: Number(body.data.finalAmount ?? 0),
            status: body.data.status,
            itemTitle: body.data.items?.[0]?.itemTitle ?? undefined,
          });
          setLoadStatus("ready");

          if (body.data.status === "paid") {
            router.push(`/payment/success?orderId=${orderId}`);
          }
        } else {
          setLoadStatus("error");
        }
      } catch {
        if (active) setLoadStatus("error");
      }
    }

    checkStatus();
    const interval = setInterval(checkStatus, 4000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [orderId, router]);

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
      // Ignore — the 4s poll above will retry regardless.
    } finally {
      setTimeout(() => setChecking(false), 500);
    }
  }

  function handleCopyOrderId() {
    if (!orderId) return;
    navigator.clipboard.writeText(orderId);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  }

  const supportWaHref = buildWaLink(
    WA_NUMBER,
    orderId
      ? `Halo Admin Hazl, saya butuh bantuan untuk pesanan ${orderId.slice(0, 8).toUpperCase()} yang masih menunggu pembayaran.`
      : "Halo Admin Hazl, saya butuh bantuan terkait status pesanan saya.",
  );

  // ── No order id at all: nothing to poll, nothing honest to show as "pending" ──
  if (!orderId) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-[#FAFAFA] px-4 py-16 text-center">
        <div className="mx-auto mb-2 flex h-14 w-14 items-center justify-center rounded-full bg-amber-50 text-amber-600 border border-amber-200">
          <AlertTriangle size={26} />
        </div>
        <h1 className="text-xl font-bold text-[#16181D]">Nomor Pesanan Tidak Ditemukan</h1>
        <p className="max-w-sm text-sm text-[#5B616E]">
          Tautan ini tidak menyertakan nomor pesanan yang valid. Cek riwayat pesanan Anda atau hubungi
          dukungan jika Anda baru saja melakukan pembayaran.
        </p>
        <div className="flex gap-3 pt-2">
          <Link href="/dashboard/pesanan" className="rounded-full bg-[#0077A8] px-5 py-2.5 text-sm font-bold text-white hover:bg-[#0D5B8A]">
            Lihat Pesanan Saya
          </Link>
          <Link href="/e-course" className="rounded-full border border-[#E7E9EC] bg-white px-5 py-2.5 text-sm font-bold text-[#16181D] hover:bg-[#F6F7F9]">
            Kembali ke Katalog
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAFAFA] text-[#16181D] antialiased">
      {/* 1. Header */}
      <header className="sticky top-0 z-50 border-b border-[#E7E9EC] bg-white/95 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-3xl items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-2 group">
              <span className="font-extrabold text-xl tracking-tight text-[#16181D]">
                Hazl<span className="text-[#FF2F86]">.</span>
              </span>
            </Link>
            <span className="hidden sm:inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-[11px] font-semibold text-amber-800">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-ping" />
              Menunggu Pembayaran
            </span>
          </div>
          <div className="flex items-center gap-3 text-xs font-semibold text-[#5B616E]">
            <span className="hidden md:inline-flex items-center gap-1 text-[11px] text-[#5B616E]">
              <Lock size={12} className="text-[#0077A8]" />
              Diproses via Duitku
            </span>
            <Link href="/faq" className="hover:text-[#16181D] transition-colors flex items-center gap-1">
              <HelpCircle size={14} />
              <span>Bantuan</span>
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-8 sm:py-12 space-y-6">
        {/* Order reference — always the real order id, never a placeholder. */}
        <div className="rounded-[26px] border border-[#E7E9EC] bg-white p-6 sm:p-8 shadow-sm space-y-5">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl bg-amber-50 text-amber-600 border border-amber-200">
              <Clock size={24} />
            </div>
            <div className="space-y-1">
              <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-[#16181D]">
                Menunggu Konfirmasi Pembayaran
              </h1>
              <p className="text-xs sm:text-sm text-[#5B616E] leading-relaxed">
                {loadStatus === "loading" &&
                  "Sedang memuat status pesanan Anda..."}
                {loadStatus === "error" &&
                  "Gagal memuat status pesanan. Coba muat ulang halaman, atau periksa status di halaman Pesanan Saya."}
                {loadStatus === "ready" &&
                  "Kami memeriksa status pembayaran Anda secara otomatis setiap beberapa detik. Halaman ini akan berpindah otomatis begitu pembayaran terkonfirmasi."}
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between rounded-xl border border-[#E7E9EC] bg-[#FAFAFA] p-3.5 text-xs">
            <div>
              <span className="text-[10px] font-semibold text-[#5B616E]">Nomor Pesanan</span>
              <p className="font-mono font-bold text-[#16181D]">{orderId.slice(0, 8).toUpperCase()}</p>
            </div>
            <button
              type="button"
              onClick={handleCopyOrderId}
              className="inline-flex items-center gap-1 rounded-lg border border-[#E7E9EC] bg-white px-2.5 py-1 text-xs font-semibold text-[#16181D] hover:bg-[#F6F7F9]"
            >
              {copiedId ? <Check size={12} className="text-emerald-600" /> : <Copy size={12} />}
              <span>{copiedId ? "Tersalin" : "Salin"}</span>
            </button>
          </div>

          {loadStatus === "ready" && orderData?.itemTitle && (
            <div className="border-t border-[#E7E9EC] pt-4 space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#5B616E]">Item Kursus</span>
              <h4 className="font-bold text-sm text-[#16181D]">{orderData.itemTitle}</h4>
            </div>
          )}

          {loadStatus === "ready" && typeof orderData?.finalAmount === "number" && (
            <div className="border-t border-[#E7E9EC] pt-4 flex justify-between items-baseline">
              <span className="font-bold text-sm text-[#16181D]">Total Tagihan</span>
              <span className="font-extrabold text-xl text-[#0077A8]">{formatRp(orderData.finalAmount)}</span>
            </div>
          )}
        </div>

        {/* Belum sempat bayar — halaman pembayaran Duitku (VA/QRIS) adalah link
            sekali-pakai yang tidak kita simpan, jadi kita tidak bisa "buka
            kembali"-kannya secara jujur. Arahkan ke checkout ulang saja. */}
        {loadStatus === "ready" && orderData?.status !== "paid" && (
          <div className="rounded-[22px] border border-[#E7E9EC] bg-white p-5 sm:p-6 shadow-sm space-y-3">
            <h3 className="font-bold text-sm text-[#16181D]">Belum Menyelesaikan Pembayaran?</h3>
            <p className="text-xs text-[#5B616E] leading-relaxed">
              Tautan pembayaran Duitku bersifat sekali pakai. Jika sudah tertutup atau kedaluwarsa,
              silakan buat pesanan baru dari katalog untuk mendapatkan tautan pembayaran yang baru.
            </p>
            <Link
              href="/e-course"
              className="inline-flex items-center gap-2 rounded-full bg-[#0077A8] px-5 py-2.5 text-xs font-bold text-white hover:bg-[#0D5B8A] transition-colors"
            >
              <ExternalLink size={14} />
              Buat Pesanan Baru
            </Link>
          </div>
        )}

        {/* Manual refresh + support */}
        <section className="flex flex-col sm:flex-row items-center justify-between gap-4 rounded-[22px] border border-[#E7E9EC] bg-white p-5 shadow-sm">
          <div>
            <h4 className="font-bold text-sm text-[#16181D]">Sudah melakukan transfer?</h4>
            <p className="text-xs text-[#5B616E]">Sistem memeriksa status pembayaran secara berkala.</p>
          </div>
          <button
            type="button"
            onClick={handleManualCheck}
            disabled={checking}
            className="inline-flex items-center gap-2 rounded-full bg-[#0077A8] px-6 py-2.5 text-xs font-bold text-white hover:bg-[#0D5B8A] transition-colors disabled:opacity-50"
          >
            <RefreshCw size={14} className={checking ? "animate-spin" : ""} />
            <span>{checking ? "Memeriksa..." : "Cek Status Pembayaran"}</span>
          </button>
        </section>

        <section className="flex flex-col sm:flex-row items-center justify-between gap-4 rounded-[20px] border border-[#E7E9EC] bg-[#F6F7F9] p-4 sm:p-5 text-xs text-[#5B616E]">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-[#E8F6FF] text-[#0077A8] border border-[#BDE5F8]">
              <MessageSquare size={18} />
            </div>
            <div>
              <p className="font-bold text-[#16181D]">Butuh bantuan?</p>
              <p className="text-[11px] text-[#5B616E]">Tim Customer Care Hazl siap membantu via WhatsApp.</p>
            </div>
          </div>
          <a
            href={supportWaHref ?? "https://wa.me/6281234567890"}
            target="_blank"
            rel="noreferrer"
            className="rounded-full border border-[#E7E9EC] bg-white px-4 py-2 font-bold text-[#16181D] hover:bg-[#E8F6FF] hover:text-[#0077A8] transition-colors shadow-sm whitespace-nowrap"
          >
            Hubungi CS via WhatsApp
          </a>
        </section>
      </main>

      <footer className="mt-12 border-t border-[#E7E9EC] bg-white py-8 text-center text-xs text-[#5B616E]">
        <div className="mx-auto max-w-4xl px-4 space-y-3">
          <div className="flex flex-wrap justify-center gap-6">
            <Link href="/terms" className="hover:text-[#16181D] transition-colors">Syarat & Ketentuan</Link>
            <span>•</span>
            <Link href="/privacy" className="hover:text-[#16181D] transition-colors">Kebijakan Privasi</Link>
            <span>•</span>
            <Link href="/faq" className="hover:text-[#16181D] transition-colors">Bantuan Pelanggan</Link>
          </div>
          <p className="text-[11px] text-[#8A909A]">© 2026 Hazl Academy. Seluruh hak cipta dilindungi.</p>
        </div>
      </footer>
    </div>
  );
}

// ─── Export with Suspense ─────────────────────────────────────────────────────

export default function PaymentPendingPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-[#FAFAFA]">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#0077A8] border-t-transparent" />
        </div>
      }
    >
      <PendingContent />
    </Suspense>
  );
}
