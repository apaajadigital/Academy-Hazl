"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import {
  AlertTriangle,
  RefreshCw,
  HelpCircle,
  MessageSquare,
  Lock,
} from "lucide-react";
import { getValidToken } from "@/lib/auth/token";
import { WA_NUMBER, buildWaLink } from "@/lib/config";

// ─── Gateway Reason Dictionary ────────────────────────────────────────────────
// Duitku's callback carries no structured failure-reason field (verified
// against PaymentTransaction schema, 28 Sep 2026) — `reason` only ever arrives
// as a query param on the return URL, when the checkout flow bothers to set
// one. REASON_MAP translates known machine codes; anything else falls back to
// the raw (decoded) text rather than inventing wording.

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
    : null;

  const [orderData, setOrderData] = useState<{ itemTitle?: string; finalAmount?: number } | null>(null);
  const [loadStatus, setLoadStatus] = useState<"loading" | "ready" | "error" | "none">(
    orderId ? "loading" : "none",
  );

  useEffect(() => {
    if (!orderId) return;
    let active = true;

    (async () => {
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
            itemTitle: body.data.items?.[0]?.itemTitle ?? undefined,
            finalAmount: Number(body.data.finalAmount ?? 0),
          });
          setLoadStatus("ready");
        } else {
          setLoadStatus("error");
        }
      } catch {
        if (active) setLoadStatus("error");
      }
    })();

    return () => {
      active = false;
    };
  }, [orderId]);

  const supportWaHref = buildWaLink(
    WA_NUMBER,
    orderId
      ? `Halo Admin Hazl, saya mengalami kendala pembayaran untuk pesanan ${orderId.slice(0, 8).toUpperCase()}. Mohon bantuan verifikasinya.`
      : "Halo Admin Hazl, saya mengalami kendala pembayaran. Mohon bantuannya.",
  );

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
            <span className="hidden sm:inline-flex items-center gap-1.5 rounded-full border border-[#E7E9EC] bg-[#F6F7F9] px-2.5 py-0.5 text-[11px] font-semibold text-[#5B616E]">
              <Lock size={12} className="text-[#0077A8]" />
              Diproses via Duitku
            </span>
          </div>
          <Link href="/faq" className="hover:text-[#16181D] transition-colors flex items-center gap-1 text-xs font-semibold text-[#5B616E]">
            <HelpCircle size={14} />
            <span>Bantuan</span>
          </Link>
        </div>
      </header>

      {/* 2. Main */}
      <main className="mx-auto max-w-3xl px-4 py-8 sm:py-12 space-y-6">
        <div className="rounded-[26px] border border-[#E7E9EC] bg-white p-6 sm:p-8 shadow-sm space-y-5">
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
                {reason ??
                  "Transaksi tidak dapat diselesaikan. Saldo rekening Anda tidak terpotong bila pembayaran memang belum sempat dikirim."}
              </p>
            </div>
          </div>

          {orderId && (
            <div className="rounded-xl border border-[#E7E9EC] bg-[#FAFAFA] p-3.5 text-xs">
              <span className="text-[10px] font-semibold text-[#5B616E]">Nomor Pesanan</span>
              <p className="font-mono font-bold text-[#16181D]">{orderId.slice(0, 8).toUpperCase()}</p>
            </div>
          )}

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

          <div className="pt-2 flex flex-col sm:flex-row gap-3">
            <Link
              id="payment-failed-retry-btn"
              href={returnUrl}
              className="flex-1 inline-flex h-11 items-center justify-center gap-2 rounded-full bg-[#0077A8] px-6 text-sm font-bold text-white hover:bg-[#0D5B8A] transition-colors shadow-sm"
            >
              <RefreshCw size={15} />
              <span>Coba Bayar Lagi</span>
            </Link>
            <Link
              href="/dashboard/pesanan"
              className="inline-flex h-11 items-center justify-center gap-2 rounded-full border border-[#E7E9EC] bg-white px-5 text-sm font-semibold text-[#16181D] hover:bg-[#F6F7F9] transition-colors"
            >
              <span>Lihat Pesanan Saya</span>
            </Link>
          </div>
        </div>

        {/* Support */}
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

      {/* 3. Footer */}
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
