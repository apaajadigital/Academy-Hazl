"use client";

import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Suspense, useEffect, useState } from "react";
import { CheckCircle2, ArrowRight, FileText, MessageSquare, ExternalLink } from "lucide-react";
import { getValidToken } from "@/lib/auth/token";
import { WA_NUMBER, buildWaLink } from "@/lib/config";

// ─── Types ────────────────────────────────────────────────────────────────────

type PrivateClassInfo = {
  waGroupLink?: string | null;
  onboardingContact?: string | null;
  liveSchedule?: string | null;
};

type OrderItemLike = {
  id?: string;
  itemTitle?: string | null;
  itemType?: string | null;
  totalPrice?: number | null;
  privateClass?: PrivateClassInfo | null;
};

function toWaDigits(contact: string | null | undefined): string | null {
  if (!contact) return null;
  const digits = contact.replace(/\D/g, "");
  if (digits.length < 8) return null;
  return digits.startsWith("0") ? `62${digits.slice(1)}` : digits;
}

function formatRp(amount: number) {
  return `Rp ${amount.toLocaleString("id-ID")}`;
}

// ─── Animated Checkmark Component ─────────────────────────────────────────────

function AnimatedCheckmark() {
  return (
    <div className="relative flex items-center justify-center">
      <div className="flex h-18 w-18 items-center justify-center rounded-full bg-emerald-50 border-2 border-emerald-200">
        <CheckCircle2 size={40} className="text-emerald-600 animate-in zoom-in-75 duration-300" />
      </div>
    </div>
  );
}

// ─── Main Success Content ─────────────────────────────────────────────────────

function SuccessContent() {
  const params = useSearchParams();
  const orderId = params.get("orderId");
  const isMock = params.get("mock") === "1";

  const [verified, setVerified] = useState<"checking" | "paid" | "unpaid" | "error">(
    isMock ? "paid" : "checking"
  );
  const [orderDetails, setOrderDetails] = useState<{
    finalAmount?: number;
    items?: OrderItemLike[];
  } | null>(null);

  const [pcItems, setPcItems] = useState<OrderItemLike[]>([]);

  useEffect(() => {
    if (isMock) {
      setVerified("paid");
      return;
    }

    async function checkOrderStatus() {
      const token = await getValidToken();
      if (!orderId || !token) {
        setVerified("error");
        return;
      }

      try {
        const res = await fetch(`/api/orders/${orderId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const body = await res.json();
        const isPaid = body.success && body.data?.status === "paid";

        if (body.success && body.data) {
          setOrderDetails({
            finalAmount: Number(body.data.finalAmount ?? 0),
            items: body.data.items ?? [],
          });

          if (Array.isArray(body.data.items)) {
            setPcItems(
              (body.data.items as OrderItemLike[]).filter(
                (it) => it && typeof it === "object" && it.privateClass
              )
            );
          }
        }

        setVerified(isPaid ? "paid" : "unpaid");
      } catch {
        setVerified("error");
      }
    }

    checkOrderStatus();
  }, [orderId, isMock]);

  // Loading State
  if (verified === "checking") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-[#fcfcfd] px-4">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#0077A8] border-t-transparent mb-3" />
        <p className="text-sm font-medium text-[#77787d]">Mengonfirmasi status pembayaran...</p>
      </div>
    );
  }

  // Pending / Unpaid Guard
  if (verified !== "paid") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-[#fcfcfd] px-4 py-16 text-center">
        <div className="w-full max-w-md rounded-[20px] border border-[#e8e8e9] bg-white p-8 shadow-none">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-amber-50 text-2xl">
            ⏳
          </div>
          <h1 className="text-xl font-bold text-[#202124] mb-2">Pembayaran Belum Terkonfirmasi</h1>
          <p className="text-xs text-[#77787d] leading-relaxed mb-6">
            Sistem kami sedang menunggu konfirmasi resmi dari gateway pembayaran. Jika Anda baru saja mentransfer, status
            akan terverifikasi otomatis dalam 1–2 menit.
          </p>
          <div className="flex flex-col gap-2.5 sm:flex-row">
            {orderId && (
              <Link
                href={`/payment/pending?orderId=${orderId}`}
                className="flex-1 inline-flex items-center justify-center rounded-full bg-[#252527] px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-[#1a1b1d]"
              >
                Cek Instruksi Pembayaran
              </Link>
            )}
            <Link
              href="/dashboard/pesanan"
              className="flex-1 inline-flex items-center justify-center rounded-full border border-[#e8e8e9] bg-white px-4 py-2.5 text-xs font-semibold text-[#202124] transition hover:bg-[#f2f2f4]"
            >
              Riwayat Pesanan
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Private class onboarding info
  const pc = pcItems[0]?.privateClass ?? null;
  const pcAdminNumber = toWaDigits(pc?.onboardingContact) ?? WA_NUMBER;
  const pcAdminHref = buildWaLink(
    pcAdminNumber,
    `Halo Admin, saya baru saja menyelesaikan pembayaran Private Class${
      orderId ? ` (Order ${orderId.slice(0, 8).toUpperCase()})` : ""
    }. Mohon konfirmasi jadwal & info grup. Terima kasih!`
  );
  const pcGroupLink = pc?.waGroupLink && pc.waGroupLink.startsWith("http") ? pc.waGroupLink : null;

  return (
    <div className="min-h-screen bg-[#fcfcfd] flex flex-col justify-center items-center px-4 py-16 text-[#202124] antialiased">
      <div className="w-full max-w-lg">
        {/* Main Success Card */}
        <div className="rounded-[22px] border border-[#e8e8e9] bg-white p-7 sm:p-9 shadow-none text-center">
          <div className="mb-6 flex justify-center">
            <AnimatedCheckmark />
          </div>

          <h1 className="text-2xl font-bold tracking-tight text-[#202124] mb-2">
            Pembayaran Berhasil!
          </h1>
          <p className="text-xs text-[#77787d] leading-relaxed mb-6">
            {isMock
              ? "Mode Pengujian: Transaksi telah disimulasikan dan hak akses berhasil dibuka."
              : "Terima kasih! Transaksi Anda telah diverifikasi dan hak akses belajar Anda sudah aktif seketika."}
          </p>

          {/* Transaction Metadata Tile */}
          <div className="mb-6 rounded-xl border border-[#e8e8e9] bg-[#fbfbfc] p-4 text-left space-y-2.5">
            {orderId && (
              <div className="flex justify-between items-center text-xs">
                <span className="text-[#77787d]">Nomor Referensi</span>
                <span className="font-mono font-bold text-[#202124]">
                  {orderId.slice(0, 12).toUpperCase()}
                </span>
              </div>
            )}
            {orderDetails?.items && orderDetails.items.length > 0 && (
              <div className="flex justify-between items-center text-xs">
                <span className="text-[#77787d]">Item Pembelian</span>
                <span className="font-semibold text-[#202124] truncate max-w-[220px]">
                  {orderDetails.items[0]?.itemTitle}
                </span>
              </div>
            )}
            {orderDetails?.finalAmount !== undefined && orderDetails.finalAmount > 0 && (
              <div className="flex justify-between items-center text-xs pt-2 border-t border-[#e8e8e9]">
                <span className="text-[#77787d]">Total Pembayaran</span>
                <span className="font-bold text-[#0077A8]">
                  {formatRp(orderDetails.finalAmount)}
                </span>
              </div>
            )}
          </div>

          {/* Private Class Onboarding Card if applicable */}
          {pc && (
            <div className="mb-6 rounded-xl border border-emerald-200 bg-emerald-50/60 p-4 text-left">
              <div className="flex items-center gap-2 mb-2">
                <MessageSquare size={16} className="text-emerald-700" />
                <h3 className="text-xs font-bold text-emerald-900">Onboarding Kelas Privat Anda</h3>
              </div>
              <p className="text-[11px] text-emerald-800 mb-3 leading-relaxed">
                Silakan bergabung ke grup WhatsApp privat atau hubungi mentor pendamping untuk konfirmasi jadwal 1-on-1.
              </p>
              <div className="flex flex-col gap-2 sm:flex-row">
                {pcGroupLink && (
                  <a
                    href={pcGroupLink}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-emerald-700 px-3.5 py-2 text-xs font-semibold text-white hover:bg-emerald-800 transition"
                  >
                    <span>Masuk Grup WhatsApp</span>
                    <ExternalLink size={12} />
                  </a>
                )}
                {pcAdminHref && (
                  <a
                    href={pcAdminHref}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-emerald-300 bg-white px-3.5 py-2 text-xs font-semibold text-emerald-800 hover:bg-emerald-50 transition"
                  >
                    <span>Hubungi Mentor</span>
                  </a>
                )}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="space-y-2.5">
            <Link
              href="/dashboard/kursus"
              className="w-full h-11 rounded-full bg-[#252527] hover:bg-[#1a1b1d] text-white text-xs font-semibold flex items-center justify-center gap-2 transition"
            >
              <span>Mulai Belajar Sekarang</span>
              <ArrowRight size={14} />
            </Link>

            {orderId && (
              <Link
                href={`/dashboard/pesanan/${orderId}`}
                className="w-full h-11 rounded-full border border-[#e8e8e9] hover:bg-[#f2f2f4] text-[#202124] text-xs font-semibold flex items-center justify-center gap-2 transition"
              >
                <FileText size={14} className="text-[#77787d]" />
                <span>Unduh Invoice Resmi & Rincian</span>
              </Link>
            )}
          </div>
        </div>

        {/* Support Help Link */}
        <p className="mt-6 text-center text-xs text-[#77787d]">
          Butuh bantuan mengenai aktivasi?{" "}
          <Link href="/faq" className="font-semibold text-[#0077A8] hover:underline">
            Kunjungi Pusat Bantuan
          </Link>
        </p>
      </div>
    </div>
  );
}

// ─── Export with Suspense ─────────────────────────────────────────────────────

export default function PaymentSuccessPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-[#fcfcfd]">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#0077A8] border-t-transparent" />
        </div>
      }
    >
      <SuccessContent />
    </Suspense>
  );
}
