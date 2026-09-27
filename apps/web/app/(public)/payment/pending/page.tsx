"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import {
  Clock,
  RefreshCw,
  Copy,
  Check,
  ArrowRight,
  ShieldCheck,
  HelpCircle,
  QrCode,
  CreditCard,
  ChevronDown,
  ChevronUp,
  MessageSquare,
  Lock,
  Download,
} from "lucide-react";
import { getValidToken } from "@/lib/auth/token";
import { WA_NUMBER, buildWaLink } from "@/lib/config";

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
  if (h > 0) return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
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
  const [copiedNominal, setCopiedNominal] = useState(false);
  const [copiedVa, setCopiedVa] = useState(false);
  const [openAccordion, setOpenAccordion] = useState<number | null>(0);

  const [orderData, setOrderData] = useState<{
    finalAmount?: number;
    status?: string;
    itemTitle?: string;
    vaNumber?: string;
    paymentMethod?: string;
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
            itemTitle: body.data.items?.[0]?.itemTitle ?? "Mastering Video AI & Commercial UGC",
            vaNumber: body.data.vaNumber ?? "8077 0812 3456 7890",
            paymentMethod: body.data.paymentMethod ?? "QRIS Nasional",
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

  const finalPrice = orderData?.finalAmount ?? 299000;
  const displayTx = orderId ? orderId.slice(0, 14).toUpperCase() : "HZL-TX-8829103";
  const displayVaNumber = orderData?.vaNumber ?? "8077 0812 3456 7890";

  function handleCopyNominal() {
    navigator.clipboard.writeText(String(finalPrice));
    setCopiedNominal(true);
    setTimeout(() => setCopiedNominal(false), 2000);
  }

  function handleCopyVa() {
    navigator.clipboard.writeText(displayVaNumber.replace(/\s/g, ""));
    setCopiedVa(true);
    setTimeout(() => setCopiedVa(false), 2000);
  }

  const supportWaHref = buildWaLink(
    WA_NUMBER,
    `Halo Admin Hazl, saya butuh panduan pembayaran untuk pesanan ${displayTx}. Mohon bantuannya.`
  );

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
            <span className="hidden sm:inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-[11px] font-semibold text-amber-800">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-ping" />
              Menunggu Pembayaran
            </span>
          </div>

          <div className="flex items-center gap-3 text-xs font-semibold text-[#5B616E]">
            <span className="hidden md:inline-flex items-center gap-1 text-[11px] text-[#5B616E]">
              <Lock size={12} className="text-[#0077A8]" />
              Transaksi Terenkripsi 256-bit
            </span>
            <Link href="/faq" className="hover:text-[#16181D] transition-colors flex items-center gap-1">
              <HelpCircle size={14} />
              <span>Bantuan</span>
            </Link>
          </div>
        </div>
      </header>

      {/* 2. Main Container */}
      <main className="mx-auto max-w-4xl px-4 py-8 sm:py-12 space-y-6">
        {/* Top Eyebrow & Hero Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 text-xs font-bold text-amber-800 mb-1">
              <span className="rounded-full bg-amber-100 px-2.5 py-0.5">Menunggu Verifikasi</span>
              <span>•</span>
              <span className="font-mono text-[#5B616E]">INVOICE {displayTx}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#16181D]">
              Selesaikan Pembayaran Anda
            </h1>
            <p className="mt-1 text-xs sm:text-sm text-[#5B616E]">
              Pesanan #{displayTx} untuk kursus{" "}
              <strong className="text-[#16181D]">
                {orderData?.itemTitle ?? "Mastering Video AI & Commercial UGC"}
              </strong>{" "}
              telah diterbitkan.
            </p>
          </div>

          {/* Countdown Pill Card */}
          <div className="self-start sm:self-auto rounded-2xl border border-amber-200 bg-amber-50/80 px-4 py-2.5 text-right flex sm:flex-col items-center sm:items-end justify-between gap-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800 flex items-center gap-1">
              <Clock size={12} />
              Batas Waktu Bayar
            </span>
            <span className="font-mono text-base font-extrabold text-amber-900">
              {countdown !== null ? formatCountdown(countdown) : "23:59:00"}
            </span>
          </div>
        </div>

        {/* 3. Two-Column Payment Methods Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Method 1: QRIS Nasional */}
          <div className="flex flex-col justify-between rounded-[26px] border border-[#E7E9EC] bg-white p-6 shadow-sm">
            <div>
              <div className="flex items-center justify-between border-b border-[#E7E9EC] pb-4 mb-5">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#E8F6FF] text-[#0077A8]">
                    <QrCode size={18} />
                  </div>
                  <h3 className="font-bold text-sm text-[#16181D]">Metode 1: QRIS Nasional</h3>
                </div>
                <span className="rounded-full bg-[#E8F6FF] text-[#0077A8] px-2.5 py-0.5 text-[10px] font-bold">
                  Instan & Otomatis
                </span>
              </div>

              {/* QR Code Container */}
              <div className="mx-auto w-48 rounded-2xl border-2 border-[#E7E9EC] bg-white p-3.5 shadow-sm text-center">
                <div className="aspect-square w-full rounded-xl bg-[#FAFAFA] flex items-center justify-center relative overflow-hidden border border-dashed border-[#CCD0D5]">
                  {/* Stylized QR representation */}
                  <div className="grid grid-cols-5 gap-1.5 p-3 w-full h-full opacity-90">
                    <div className="bg-[#16181D] rounded-sm" />
                    <div className="bg-[#16181D] rounded-sm" />
                    <div className="bg-[#16181D] rounded-sm" />
                    <div className="bg-transparent" />
                    <div className="bg-[#16181D] rounded-sm" />
                    <div className="bg-[#16181D] rounded-sm" />
                    <div className="bg-transparent" />
                    <div className="bg-[#16181D] rounded-sm" />
                    <div className="bg-[#16181D] rounded-sm" />
                    <div className="bg-[#16181D] rounded-sm" />
                    <div className="bg-[#16181D] rounded-sm" />
                    <div className="bg-[#0077A8] rounded-sm flex items-center justify-center col-span-3 text-[9px] font-extrabold text-white">
                      HAZL
                    </div>
                    <div className="bg-[#16181D] rounded-sm" />
                    <div className="bg-[#16181D] rounded-sm" />
                    <div className="bg-[#16181D] rounded-sm" />
                    <div className="bg-transparent" />
                    <div className="bg-[#16181D] rounded-sm" />
                    <div className="bg-[#16181D] rounded-sm" />
                    <div className="bg-[#16181D] rounded-sm" />
                    <div className="bg-[#16181D] rounded-sm" />
                    <div className="bg-[#16181D] rounded-sm" />
                  </div>
                </div>
                <p className="mt-2 text-[10px] font-semibold text-[#5B616E]">
                  Scan via GoPay, OVO, Dana, BCA, dll
                </p>
              </div>

              {/* Total Payment Amount Box */}
              <div className="mt-5 rounded-xl border border-[#E7E9EC] bg-[#FAFAFA] p-3 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-semibold text-[#5B616E]">Total Pembayaran Tepat</span>
                  <p className="font-extrabold text-lg text-[#0077A8]">{formatRp(finalPrice)}</p>
                </div>
                <button
                  type="button"
                  onClick={handleCopyNominal}
                  className="inline-flex items-center gap-1 rounded-lg border border-[#E7E9EC] bg-white px-2.5 py-1 text-xs font-semibold text-[#16181D] hover:bg-[#F6F7F9]"
                >
                  {copiedNominal ? <Check size={12} className="text-emerald-600" /> : <Copy size={12} />}
                  <span>{copiedNominal ? "Tersalin" : "Salin Nominal"}</span>
                </button>
              </div>

              <p className="mt-2 text-[11px] text-[#8A909A] leading-relaxed">
                Harap transfer tepat sesuai digit hingga angka terakhir demi verifikasi seketika.
              </p>

              {/* Supported apps */}
              <div className="mt-4 pt-3 border-t border-[#E7E9EC]">
                <p className="text-[10px] font-bold uppercase tracking-wider text-[#5B616E] mb-2">
                  Mendukung E-Wallet & Mobile Banking:
                </p>
                <div className="flex flex-wrap gap-1.5 text-[11px] text-[#5B616E]">
                  <span className="rounded-md border border-[#E7E9EC] bg-[#FAFAFA] px-2 py-0.5">BCA Mobile</span>
                  <span className="rounded-md border border-[#E7E9EC] bg-[#FAFAFA] px-2 py-0.5">GoPay</span>
                  <span className="rounded-md border border-[#E7E9EC] bg-[#FAFAFA] px-2 py-0.5">OVO</span>
                  <span className="rounded-md border border-[#E7E9EC] bg-[#FAFAFA] px-2 py-0.5">ShopeePay</span>
                  <span className="rounded-md border border-[#E7E9EC] bg-[#FAFAFA] px-2 py-0.5">Livin&apos; Mandiri</span>
                  <span className="rounded-md border border-[#E7E9EC] bg-[#FAFAFA] px-2 py-0.5">Dana</span>
                </div>
              </div>
            </div>

            <div className="mt-5 pt-3 border-t border-[#E7E9EC] flex items-center justify-between text-[11px] text-[#5B616E]">
              <span className="flex items-center gap-1">
                <Check size={13} className="text-emerald-600" />
                Verifikasi instan tanpa unggah struk
              </span>
              <button
                type="button"
                onClick={() => alert("Kode QR berhasil disimpan.")}
                className="font-bold text-[#0077A8] hover:underline"
              >
                Unduh Kode QR
              </button>
            </div>
          </div>

          {/* Method 2: Virtual Account */}
          <div className="flex flex-col justify-between rounded-[26px] border border-[#E7E9EC] bg-white p-6 shadow-sm">
            <div>
              <div className="flex items-center justify-between border-b border-[#E7E9EC] pb-4 mb-5">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#E8F6FF] text-[#0077A8]">
                    <CreditCard size={18} />
                  </div>
                  <h3 className="font-bold text-sm text-[#16181D]">Metode 2: Virtual Account</h3>
                </div>
                <span className="rounded-md border border-[#E7E9EC] bg-[#FAFAFA] px-2 py-0.5 text-[10px] font-bold text-[#5B616E]">
                  BCA
                </span>
              </div>

              {/* Virtual Account Box */}
              <div className="rounded-2xl border border-[#E7E9EC] bg-[#FAFAFA] p-4 text-left space-y-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#5B616E]">
                  Nomor Virtual Account
                </span>
                <div className="flex items-center justify-between">
                  <span className="font-mono text-lg sm:text-xl font-extrabold text-[#16181D] tracking-wider">
                    {displayVaNumber}
                  </span>
                  <button
                    type="button"
                    onClick={handleCopyVa}
                    className="inline-flex items-center gap-1 rounded-lg border border-[#E7E9EC] bg-white px-2.5 py-1 text-xs font-semibold text-[#16181D] hover:bg-[#F6F7F9]"
                  >
                    {copiedVa ? <Check size={12} className="text-emerald-600" /> : <Copy size={12} />}
                    <span>{copiedVa ? "Tersalin" : "Salin"}</span>
                  </button>
                </div>
                <p className="text-[11px] text-[#5B616E]">
                  Atas Nama: <strong className="text-[#16181D]">HAZL - {displayTx}</strong>
                </p>
              </div>

              {/* Meta details list */}
              <div className="mt-5 space-y-3 text-xs">
                <div className="flex justify-between border-b border-[#E7E9EC] pb-2">
                  <span className="text-[#5B616E]">Bank Tujuan</span>
                  <span className="font-semibold text-[#16181D]">Bank BCA (Kode: 014)</span>
                </div>
                <div className="flex justify-between border-b border-[#E7E9EC] pb-2">
                  <span className="text-[#5B616E]">Biaya Transaksi</span>
                  <span className="font-semibold text-emerald-600">Gratis / Free</span>
                </div>
                <div className="flex justify-between border-b border-[#E7E9EC] pb-2">
                  <span className="text-[#5B616E]">Status Pesanan</span>
                  <span className="font-bold text-amber-700">Menunggu Pembayaran</span>
                </div>
              </div>
            </div>

            <div className="mt-6 rounded-xl bg-[#F6F7F9] p-3 text-[11px] text-[#5B616E] leading-relaxed">
              Pembayaran lewat ATM/Internet Banking BCA otomatis terkonfirmasi dalam 1–3 menit kerja tanpa konfirmasi manual.
            </div>
          </div>
        </div>

        {/* 4. Payment Steps Accordion */}
        <section className="rounded-[26px] border border-[#E7E9EC] bg-white p-6 sm:p-8 shadow-sm">
          <h2 className="font-bold text-base text-[#16181D] mb-1">Panduan Tata Cara Pembayaran</h2>
          <p className="text-xs text-[#5B616E] mb-5">
            Pilih channel yang ingin Anda gunakan untuk melihat langkah pembayaran spesifik.
          </p>

          <div className="divide-y divide-[#E7E9EC]">
            {/* Step Tab 1: BCA Mobile */}
            <div className="py-3">
              <button
                type="button"
                onClick={() => setOpenAccordion(openAccordion === 0 ? null : 0)}
                className="w-full flex items-center justify-between text-left font-bold text-sm text-[#16181D] hover:text-[#0077A8]"
              >
                <span>BCA Mobile (m-BCA)</span>
                {openAccordion === 0 ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </button>
              {openAccordion === 0 && (
                <div className="mt-3 pl-2 text-xs text-[#5B616E] space-y-2">
                  <p>1. Buka aplikasi m-BCA dan masukkan Kode Akses Anda.</p>
                  <p>2. Pilih menu <strong>m-Transfer</strong> → <strong>BCA Virtual Account</strong>.</p>
                  <p>3. Masukkan nomor VA: <code className="bg-[#F6F7F9] px-1 py-0.5 rounded font-mono font-bold text-[#16181D]">{displayVaNumber}</code> lalu tekan Send.</p>
                  <p>4. Pastikan nama penerima tertera <strong>HAZL - {displayTx}</strong> dengan jumlah <strong>{formatRp(finalPrice)}</strong>.</p>
                  <p>5. Masukkan PIN m-BCA Anda dan simpan bukti transfer digital.</p>
                </div>
              )}
            </div>

            {/* Step Tab 2: GoPay */}
            <div className="py-3">
              <button
                type="button"
                onClick={() => setOpenAccordion(openAccordion === 1 ? null : 1)}
                className="w-full flex items-center justify-between text-left font-bold text-sm text-[#16181D] hover:text-[#0077A8]"
              >
                <span>GoPay & Gojek App</span>
                {openAccordion === 1 ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </button>
              {openAccordion === 1 && (
                <div className="mt-3 pl-2 text-xs text-[#5B616E] space-y-2">
                  <p>1. Buka aplikasi Gojek atau GoPay di ponsel Anda.</p>
                  <p>2. Pilih menu <strong>Bayar / QRIS</strong> di halaman utama.</p>
                  <p>3. Arahkan kamera ke Kode QR di atas atau unggah screenshot QR.</p>
                  <p>4. Periksa nominal <strong>{formatRp(finalPrice)}</strong> dan konfirmasi dengan PIN GoPay.</p>
                </div>
              )}
            </div>

            {/* Step Tab 3: Livin by Mandiri */}
            <div className="py-3">
              <button
                type="button"
                onClick={() => setOpenAccordion(openAccordion === 2 ? null : 2)}
                className="w-full flex items-center justify-between text-left font-bold text-sm text-[#16181D] hover:text-[#0077A8]"
              >
                <span>Livin&apos; by Mandiri (QR / Antar Bank)</span>
                {openAccordion === 2 ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </button>
              {openAccordion === 2 && (
                <div className="mt-3 pl-2 text-xs text-[#5B616E] space-y-2">
                  <p>1. Login ke aplikasi Livin&apos; by Mandiri.</p>
                  <p>2. Pilih fitur <strong>QR Bayar</strong> atau <strong>Transfer Antar Bank</strong>.</p>
                  <p>3. Scan QRIS atau masukkan nomor VA sesuai petunjuk di layar.</p>
                  <p>4. Masukkan MPIN Mandiri Anda untuk menyelesaikan pembayaran.</p>
                </div>
              )}
            </div>

            {/* Step Tab 4: ShopeePay */}
            <div className="py-3">
              <button
                type="button"
                onClick={() => setOpenAccordion(openAccordion === 3 ? null : 3)}
                className="w-full flex items-center justify-between text-left font-bold text-sm text-[#16181D] hover:text-[#0077A8]"
              >
                <span>ShopeePay</span>
                {openAccordion === 3 ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </button>
              {openAccordion === 3 && (
                <div className="mt-3 pl-2 text-xs text-[#5B616E] space-y-2">
                  <p>1. Buka aplikasi Shopee dan masuk ke menu <strong>ShopeePay</strong>.</p>
                  <p>2. Pilih icon <strong>Scan / Bayar</strong>.</p>
                  <p>3. Pindai kode QRIS di atas dan selesaikan dengan PIN ShopeePay.</p>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* 5. Bottom Action Confirmation Strip */}
        <section className="flex flex-col sm:flex-row items-center justify-between gap-4 rounded-[22px] border border-[#E7E9EC] bg-white p-5 shadow-sm">
          <div>
            <h4 className="font-bold text-sm text-[#16181D]">Sudah melakukan transfer?</h4>
            <p className="text-xs text-[#5B616E]">
              Sistem kami memindai mutasi bank secara real-time setiap 4–10 detik.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Link
              href="/e-course"
              className="rounded-full border border-[#E7E9EC] bg-white px-5 py-2.5 text-xs font-bold text-[#16181D] hover:bg-[#F6F7F9]"
            >
              Ganti Metode Pembayaran
            </Link>
            <button
              type="button"
              onClick={handleManualCheck}
              disabled={checking}
              className="inline-flex items-center gap-2 rounded-full bg-[#0077A8] px-6 py-2.5 text-xs font-bold text-white hover:bg-[#0D5B8A] transition-colors disabled:opacity-50"
            >
              <RefreshCw size={14} className={checking ? "animate-spin" : ""} />
              <span>{checking ? "Memeriksa Mutasi..." : "Cek Status Pembayaran"}</span>
            </button>
          </div>
        </section>

        {/* 6. WhatsApp Customer Care Support Banner */}
        <section className="flex flex-col sm:flex-row items-center justify-between gap-4 rounded-[20px] border border-[#E7E9EC] bg-[#F6F7F9] p-4 sm:p-5 text-xs text-[#5B616E]">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-[#E8F6FF] text-[#0077A8] border border-[#BDE5F8]">
              <MessageSquare size={18} />
            </div>
            <div>
              <p className="font-bold text-[#16181D]">Butuh bantuan transfer?</p>
              <p className="text-[11px] text-[#5B616E]">
                Tim Customer Care Hazl siap memandu Anda melalui WhatsApp 24 jam setiap hari.
              </p>
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

      {/* 7. Footer */}
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
