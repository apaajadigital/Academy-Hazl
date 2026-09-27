"use client";

import { useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Suspense, useEffect, useState } from "react";
import {
  CheckCircle2,
  ArrowRight,
  FileText,
  Copy,
  Check,
  ShieldCheck,
  HelpCircle,
  Lock,
  Sparkles,
  Users,
  FolderGit2,
  PlayCircle,
  ExternalLink,
  MessageSquare,
} from "lucide-react";
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

// ─── Main Success Content ─────────────────────────────────────────────────────

function SuccessContent() {
  const params = useSearchParams();
  const orderId = params.get("orderId");
  const isMock = params.get("mock") === "1";

  const [verified, setVerified] = useState<"checking" | "paid" | "unpaid" | "error">(
    isMock ? "paid" : "checking"
  );
  const [orderDetails, setOrderDetails] = useState<{
    id?: string;
    finalAmount?: number;
    paymentMethod?: string | null;
    createdAt?: string;
    customerEmail?: string | null;
    customerName?: string | null;
    items?: OrderItemLike[];
  } | null>(null);

  const [pcItems, setPcItems] = useState<OrderItemLike[]>([]);
  const [copiedId, setCopiedId] = useState(false);

  useEffect(() => {
    if (isMock) {
      setVerified("paid");
      setOrderDetails({
        id: orderId ?? "HZL-TX-8829103",
        finalAmount: 299000,
        paymentMethod: "QRIS (GoPay / BCA)",
        createdAt: new Date().toISOString(),
        customerEmail: "pembeli@hazl.academy",
        customerName: "Kreator Hazl",
        items: [
          {
            itemTitle: "Mastering Video AI & Commercial UGC",
            itemType: "course",
            totalPrice: 299000,
          },
        ],
      });
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
            id: body.data.id,
            finalAmount: Number(body.data.finalAmount ?? 0),
            paymentMethod: body.data.paymentMethod ?? "QRIS Standar",
            createdAt: body.data.createdAt,
            customerEmail: body.data.user?.email ?? null,
            customerName: body.data.user?.name ?? null,
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

  function handleCopyOrderId() {
    if (!orderId) return;
    navigator.clipboard.writeText(orderId);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  }

  // Loading State
  if (verified === "checking") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-[#FAFAFA] px-4">
        <div className="h-9 w-9 animate-spin rounded-full border-3 border-[#0077A8] border-t-transparent mb-4" />
        <p className="text-sm font-semibold text-[#5B616E]">Mengonfirmasi status pembayaran...</p>
      </div>
    );
  }

  // Pending / Unpaid Guard
  if (verified !== "paid") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-[#FAFAFA] px-4 py-16 text-center">
        <div className="w-full max-w-md rounded-[26px] border border-[#E7E9EC] bg-white p-8 shadow-sm">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-amber-50 text-2xl border border-amber-200">
            ⏳
          </div>
          <h1 className="text-xl font-bold text-[#16181D] mb-2">Pembayaran Belum Terkonfirmasi</h1>
          <p className="text-sm text-[#5B616E] leading-relaxed mb-6">
            Sistem kami sedang menunggu konfirmasi resmi dari gateway pembayaran. Jika Anda baru saja mentransfer, status
            akan terverifikasi otomatis dalam 1–2 menit.
          </p>
          <div className="flex flex-col gap-3 sm:flex-row">
            {orderId && (
              <Link
                href={`/payment/pending?orderId=${orderId}`}
                className="flex-1 inline-flex items-center justify-center rounded-full bg-[#0077A8] px-5 py-2.5 text-xs font-bold text-white transition hover:bg-[#0D5B8A]"
              >
                Cek Instruksi Bayar
              </Link>
            )}
            <Link
              href="/dashboard/pesanan"
              className="flex-1 inline-flex items-center justify-center rounded-full border border-[#E7E9EC] bg-white px-5 py-2.5 text-xs font-bold text-[#16181D] transition hover:bg-[#F6F7F9]"
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
    `Halo Admin Hazl, saya baru saja menyelesaikan pembayaran Private Class${
      orderId ? ` (Order ${orderId.slice(0, 8).toUpperCase()})` : ""
    }. Mohon konfirmasi jadwal & info grup. Terima kasih!`
  );
  const pcGroupLink = pc?.waGroupLink && pc.waGroupLink.startsWith("http") ? pc.waGroupLink : null;

  const displayItemTitle = orderDetails?.items?.[0]?.itemTitle ?? "Mastering Video AI & Commercial UGC";
  const displayAmount = orderDetails?.finalAmount ?? 299000;
  const displayTxId = orderId ? orderId.slice(0, 14).toUpperCase() : "HZL-TX-8829103";
  const formattedDate = orderDetails?.createdAt
    ? new Intl.DateTimeFormat("id-ID", {
        day: "numeric",
        month: "long",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }).format(new Date(orderDetails.createdAt)) + " WIB"
    : "27 September 2026, 21:10 WIB";

  return (
    <div className="min-h-screen bg-[#FAFAFA] text-[#16181D] antialiased">
      {/* 1. Dedicated Header */}
      <header className="sticky top-0 z-50 border-b border-[#E7E9EC] bg-white/95 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-2 group">
              <span className="font-extrabold text-xl tracking-tight text-[#16181D]">
                Hazl<span className="text-[#FF2F86]">.</span>
              </span>
            </Link>
            <span className="hidden sm:inline-flex items-center gap-1.5 rounded-full border border-[#E7E9EC] bg-[#F6F7F9] px-2.5 py-0.5 text-[11px] font-semibold text-[#5B616E]">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              Checkout Terverifikasi
            </span>
          </div>

          <div className="flex items-center gap-3 text-xs font-semibold text-[#5B616E]">
            {orderDetails?.customerEmail && (
              <span className="hidden md:inline-flex items-center gap-1.5 rounded-full bg-[#E8F6FF] px-3 py-1 text-[11px] text-[#0077A8]">
                <span className="h-1.5 w-1.5 rounded-full bg-[#0077A8]" />
                {orderDetails.customerEmail}
              </span>
            )}
            <Link href="/faq" className="hover:text-[#16181D] transition-colors flex items-center gap-1">
              <HelpCircle size={14} />
              <span>Bantuan</span>
            </Link>
            <div className="flex items-center gap-1 text-emerald-600 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full text-[11px]">
              <Lock size={12} />
              <span>Aman 256-bit</span>
            </div>
          </div>
        </div>
      </header>

      {/* 2. Main Body Content */}
      <main className="mx-auto max-w-4xl px-4 py-8 sm:py-12 space-y-6">
        {/* Hero Card */}
        <section className="relative overflow-hidden rounded-[26px] border border-[#E7E9EC] bg-white p-6 sm:p-10 shadow-sm text-center">
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-[#0077A8] via-[#36BDF2] to-[#FF2F86]" />

          {/* Centered Icon & Status Pill */}
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-[#E8F6FF] text-[#0077A8] border border-[#BDE5F8]">
            <CheckCircle2 size={36} className="text-[#0077A8]" />
          </div>

          <div className="inline-flex items-center gap-1.5 rounded-full bg-[#E8F6FF] border border-[#BDE5F8] px-3.5 py-1 text-xs font-bold text-[#0077A8] mb-3">
            <span className="h-2 w-2 rounded-full bg-[#0077A8] animate-pulse" />
            Pembayaran Berhasil Terverifikasi
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#16181D] max-w-xl mx-auto">
            Pembayaran Dikonfirmasi! Selamat Bergabung di Hazl Academy
          </h1>
          <p className="mt-2.5 text-sm text-[#5B616E] max-w-lg mx-auto leading-relaxed">
            Akses materi kelas, formula prompt, dan workspace belajar telah diaktifkan secara otomatis untuk akun Anda.
          </p>

          {/* 3 Action Buttons */}
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/dashboard/kursus"
              className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-[#0077A8] px-6 text-sm font-bold text-white transition-all hover:bg-[#0D5B8A] shadow-sm active:scale-[0.98]"
            >
              <span>Buka Workspace & Mulai Belajar</span>
              <ArrowRight size={16} />
            </Link>

            {orderId && (
              <Link
                href={`/dashboard/pesanan/${orderId}`}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-full border border-[#E7E9EC] bg-white px-5 text-sm font-semibold text-[#16181D] transition-colors hover:bg-[#F6F7F9] hover:border-[#CCD0D5]"
              >
                <FileText size={16} className="text-[#5B616E]" />
                <span>Unduh Invoice Resmi (PDF)</span>
              </Link>
            )}

            <Link
              href="/komunitas"
              className="inline-flex h-11 items-center justify-center gap-2 rounded-full border border-[#E7E9EC] bg-white px-5 text-sm font-semibold text-[#16181D] transition-colors hover:bg-[#F6F7F9] hover:border-[#CCD0D5]"
            >
              <Users size={16} className="text-[#5B616E]" />
              <span>Gabung Komunitas Kreator</span>
            </Link>
          </div>
        </section>

        {/* Private Class Onboarding Notification if applicable */}
        {pc && (
          <section className="rounded-[22px] border border-emerald-200 bg-emerald-50/70 p-6 text-left">
            <div className="flex items-center gap-2.5 mb-2">
              <MessageSquare size={18} className="text-emerald-700" />
              <h3 className="text-sm font-bold text-emerald-900">Onboarding Kelas Privat Anda</h3>
            </div>
            <p className="text-xs text-emerald-800 mb-4 leading-relaxed max-w-xl">
              Selamat datang di Private Class! Silakan langsung bergabung ke grup WhatsApp mentoring privat Anda atau hubungi admin mentor untuk pemetaan jadwal 1-on-1.
            </p>
            <div className="flex flex-wrap gap-2.5">
              {pcGroupLink && (
                <a
                  href={pcGroupLink}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center justify-center gap-1.5 rounded-full bg-emerald-700 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-800 transition"
                >
                  <span>Masuk Grup WhatsApp Mentoring</span>
                  <ExternalLink size={13} />
                </a>
              )}
              {pcAdminHref && (
                <a
                  href={pcAdminHref}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center justify-center gap-1.5 rounded-full border border-emerald-300 bg-white px-4 py-2 text-xs font-bold text-emerald-800 hover:bg-emerald-50 transition"
                >
                  <span>Hubungi Mentor via WhatsApp</span>
                </a>
              )}
            </div>
          </section>
        )}

        {/* Electronic Receipt Card ("STRUK PEMBAYARAN ELEKTRONIK") */}
        <section className="rounded-[26px] border border-[#E7E9EC] bg-white p-6 sm:p-8 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-[#E7E9EC] pb-5">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-[#5B616E]">
                STRUK PEMBAYARAN ELEKTRONIK
              </p>
              <h2 className="text-lg font-bold text-[#16181D]">Rincian Transaksi Resmi</h2>
            </div>
            <div className="self-start sm:self-auto rounded-lg border border-[#E7E9EC] bg-[#F6F7F9] px-3 py-1 font-mono text-[11px] font-bold text-[#5B616E]">
              HASH : {orderId ? orderId.slice(0, 12).toUpperCase() : "0EED-103E-A001"}
            </div>
          </div>

          {/* 4-Item Grid Metadata */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
            <div className="space-y-1">
              <span className="text-[#5B616E]">ID Transaksi</span>
              <div className="flex items-center gap-1.5">
                <span className="font-mono font-bold text-[#16181D]">{displayTxId}</span>
                <button
                  type="button"
                  onClick={handleCopyOrderId}
                  className="text-[#5B616E] hover:text-[#0077A8] transition-colors p-1"
                  title="Salin ID Transaksi"
                >
                  {copiedId ? <Check size={13} className="text-emerald-600" /> : <Copy size={13} />}
                </button>
              </div>
            </div>

            <div className="space-y-1">
              <span className="text-[#5B616E]">Metode Pembayaran</span>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-[#16181D]">
                  {orderDetails?.paymentMethod ?? "QRIS (GoPay / BCA)"}
                </span>
                <span className="rounded-full bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                  Terbayar Lunas
                </span>
              </div>
            </div>

            <div className="space-y-1">
              <span className="text-[#5B616E]">Waktu Transaksi</span>
              <p className="font-medium text-[#16181D]">{formattedDate}</p>
            </div>

            <div className="space-y-1">
              <span className="text-[#5B616E]">Akun Pembeli</span>
              <p className="font-medium text-[#16181D] truncate">
                {orderDetails?.customerName ?? orderDetails?.customerEmail ?? "Kreator Hazl"}
              </p>
            </div>
          </div>

          {/* Purchased Item Box */}
          <div className="rounded-2xl border border-[#E7E9EC] bg-[#FAFAFA] p-4 sm:p-5">
            <p className="text-[11px] font-bold uppercase tracking-wider text-[#5B616E] mb-3">
              ITEM PEMBELIAN
            </p>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-[#E8F6FF] text-[#0077A8] border border-[#BDE5F8]">
                  <Sparkles size={22} />
                </div>
                <div>
                  <h3 className="font-bold text-sm sm:text-base text-[#16181D]">
                    {displayItemTitle}
                  </h3>
                  <p className="text-xs text-[#5B616E]">
                    Kurikulum Praktikal • Akses Seumur Hidup & Formula Prompt
                  </p>
                </div>
              </div>

              <div className="text-left sm:text-right">
                <p className="text-xs text-[#8A909A] line-through">
                  {formatRp(Math.round(displayAmount * 1.5))}
                </p>
                <p className="text-lg sm:text-xl font-extrabold text-[#16181D]">
                  {formatRp(displayAmount)}
                </p>
              </div>
            </div>
          </div>

          {/* Struk Footer */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-2 border-t border-[#E7E9EC] pt-4 text-[11px] text-[#5B616E]">
            <div className="flex items-center gap-1.5">
              <ShieldCheck size={14} className="text-[#0077A8]" />
              <span>Tanda bukti sah diterbitkan Hazl Education Platform Engine.</span>
            </div>
            <span className="font-mono font-semibold text-emerald-600">STATUS : HTTP 200 OK</span>
          </div>
        </section>

        {/* Onboarding Section ("ONBOARDING CEPAT") */}
        <section className="space-y-4">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-[#5B616E]">
              ONBOARDING CEPAT
            </p>
            <h2 className="text-lg font-bold text-[#16181D]">Panduan Langkah Pertama</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Step 1 */}
            <div className="rounded-[22px] border border-[#E7E9EC] bg-white p-5 hover:border-[#0077A8] transition-all flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#E8F6FF] text-xs font-extrabold text-[#0077A8]">
                    1
                  </span>
                  <Users size={16} className="text-[#0077A8]" />
                </div>
                <h3 className="font-bold text-sm text-[#16181D] mb-1">Gabung Komunitas Kreator</h3>
                <p className="text-xs text-[#5B616E] leading-relaxed">
                  Terhubung dengan 4.200+ kreator Video AI Hazl dan ruang diskusi showcase prompt harian.
                </p>
              </div>
              <Link
                href="/komunitas"
                className="mt-4 inline-flex items-center gap-1 text-xs font-bold text-[#0077A8] hover:underline"
              >
                <span>Buka Komunitas</span>
                <ArrowRight size={13} />
              </Link>
            </div>

            {/* Step 2 */}
            <div className="rounded-[22px] border border-[#E7E9EC] bg-white p-5 hover:border-[#0077A8] transition-all flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#E8F6FF] text-xs font-extrabold text-[#0077A8]">
                    2
                  </span>
                  <FolderGit2 size={16} className="text-[#0077A8]" />
                </div>
                <h3 className="font-bold text-sm text-[#16181D] mb-1">Akses Preset & Prompt Pack</h3>
                <p className="text-xs text-[#5B616E] leading-relaxed">
                  Unduh formula prompt Midjourney, preset ComfyUI, dan asset video komersial siap pakai.
                </p>
              </div>
              <Link
                href="/ebook"
                className="mt-4 inline-flex items-center gap-1 text-xs font-bold text-[#0077A8] hover:underline"
              >
                <span>Buka Resource</span>
                <ArrowRight size={13} />
              </Link>
            </div>

            {/* Step 3 */}
            <div className="rounded-[22px] border border-[#E7E9EC] bg-white p-5 hover:border-[#0077A8] transition-all flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#E8F6FF] text-xs font-extrabold text-[#0077A8]">
                    3
                  </span>
                  <PlayCircle size={16} className="text-[#0077A8]" />
                </div>
                <h3 className="font-bold text-sm text-[#16181D] mb-1">Mulai Modul Pertama</h3>
                <p className="text-xs text-[#5B616E] leading-relaxed">
                  Tonton video overview tools dan workflow praktikal langsung dari workspace belajarmu.
                </p>
              </div>
              <Link
                href="/dashboard/kursus"
                className="mt-4 inline-flex items-center gap-1 text-xs font-bold text-[#0077A8] hover:underline"
              >
                <span>Mulai Belajar</span>
                <ArrowRight size={13} />
              </Link>
            </div>
          </div>
        </section>

        {/* Money Back Guarantee Banner */}
        <section className="flex flex-col sm:flex-row items-center justify-between gap-4 rounded-[20px] border border-[#E7E9EC] bg-white p-4 sm:p-5 text-xs text-[#5B616E]">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-200">
              <ShieldCheck size={20} />
            </div>
            <div>
              <p className="font-bold text-[#16181D]">Garansi 7 Hari Uang Kembali Tanpa Syarat</p>
              <p className="text-[11px] text-[#5B616E]">
                Jika kurikulum tidak sesuai ekspektasimu, ajukan refund 100% langsung dari dashboard pengguna.
              </p>
            </div>
          </div>
          <Link href="/terms" className="whitespace-nowrap font-bold text-[#0077A8] hover:underline">
            Baca Kebijakan
          </Link>
        </section>
      </main>

      {/* 3. Footer */}
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

export default function PaymentSuccessPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-[#FAFAFA]">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#0077A8] border-t-transparent" />
        </div>
      }
    >
      <SuccessContent />
    </Suspense>
  );
}
