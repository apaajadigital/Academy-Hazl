"use client";

import { Suspense, useEffect, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  ChevronRight,
  CheckCircle2,
  Clock,
  CircleX,
  Download,
  Tag,
  GraduationCap,
  Printer,
  ShieldCheck,
  ExternalLink,
  MessageSquare,
  Sparkles,
  FileText,
  Lock,
} from "lucide-react";
import { getValidToken } from "@/lib/auth/token";
import { downloadProtected } from "@/lib/download";
import {
  Button,
  Textarea,
  DashboardLoading,
} from "@/components/ui";
import { cn } from "@/lib/utils";
import { WA_NUMBER, buildWaLink } from "@/lib/config";

type OrderDetail = {
  id: string;
  status: string;
  totalAmount: number;
  discountAmount: number;
  finalAmount: number;
  paymentMethod: string | null;
  createdAt: string;
  paidAt: string | null;
  coupon: { code: string } | null;
  user?: {
    id?: string;
    name?: string | null;
    email?: string | null;
    phone?: string | null;
  };
  items: {
    id: string;
    itemTitle: string | null;
    itemType: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
  }[];
  transactions: { gateway: string; status: string; createdAt: string }[];
};

const STATUS_LABEL: Record<string, { label: string; badgeClass: string }> = {
  paid: { label: "Pembayaran Berhasil", badgeClass: "bg-emerald-50 text-emerald-700 border border-emerald-200" },
  pending: { label: "Menunggu Pembayaran", badgeClass: "bg-amber-50 text-amber-700 border border-amber-200" },
  failed: { label: "Gagal", badgeClass: "bg-rose-50 text-rose-700 border border-rose-200" },
  expired: { label: "Kedaluwarsa", badgeClass: "bg-[#F6F7F9] text-[#5B616E] border border-[#E7E9EC]" },
  refunded: { label: "Direfund", badgeClass: "bg-[#E8F6FF] text-[#0077A8] border border-[#BDE5F8]" },
};

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value)) + " WIB";
}

function formatRp(amount: number) {
  return `Rp ${amount.toLocaleString("id-ID")}`;
}

function OrderDetailContent() {
  const { orderId } = useParams() as { orderId: string };
  const router = useRouter();
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refundOpen, setRefundOpen] = useState(false);
  const [refundReason, setRefundReason] = useState("");
  const [refundLoading, setRefundLoading] = useState(false);
  const [refundMessage, setRefundMessage] = useState("");
  const [downloadError, setDownloadError] = useState("");

  const searchParams = useSearchParams();
  const isMock = searchParams.get("mock") === "1";

  useEffect(() => {
    if (isMock) {
      setOrder({
        id: orderId || "HZL-TX-8829103",
        status: "paid",
        totalAmount: 1250000,
        discountAmount: 951000,
        finalAmount: 299000,
        paymentMethod: "QRIS Standar Nasional (ASPI)",
        createdAt: "2026-10-24T14:32:00Z",
        paidAt: "2026-10-24T14:32:15Z",
        coupon: { code: "HAZLEMBEDDED" },
        user: {
          id: "usr-01",
          name: "Dimas Pratama, S.Kom.",
          email: "dimas.pratama@telkom.co.id",
          phone: "+62 812-3456-7890",
        },
        items: [
          {
            id: "it-1",
            itemTitle: "Mastering Video AI & Commercial UGC",
            itemType: "course",
            quantity: 1,
            unitPrice: 1250000,
            totalPrice: 299000,
          },
        ],
        transactions: [
          {
            gateway: "duitku",
            status: "SUCCESS",
            createdAt: "2026-10-24T14:32:15Z",
          },
        ],
      });
      setLoading(false);
      return;
    }

    async function load() {
      const token = await getValidToken();
      if (!token) {
        router.push(`/masuk?redirect=/dashboard/pesanan/${orderId}`);
        return;
      }

      fetch(`/api/orders/${orderId}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then((r) => r.json())
        .then((data) => {
          if (data.success) setOrder(data.data);
          else setError(data.error?.message ?? "Pesanan tidak ditemukan.");
          setLoading(false);
        })
        .catch(() => {
          setError("Gagal memuat data pesanan.");
          setLoading(false);
        });
    }
    load();
  }, [orderId, router, isMock]);

  if (loading) {
    return <DashboardLoading label="Memuat detail faktur pesanan…" />;
  }

  if (error || !order) {
    return (
      <div className="flex min-h-[40vh] flex-col items-center justify-center gap-4 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-rose-50 text-rose-600">
          <CircleX size={24} />
        </div>
        <p className="text-sm font-semibold text-rose-600">{error}</p>
        <Link
          href="/dashboard/pesanan"
          className="rounded-full bg-[#0077A8] px-5 py-2 text-xs font-bold text-white hover:bg-[#0D5B8A]"
        >
          Kembali ke Riwayat Pesanan
        </Link>
      </div>
    );
  }

  const status = STATUS_LABEL[order.status] ?? {
    label: order.status,
    badgeClass: "bg-[#F6F7F9] text-[#5B616E] border border-[#E7E9EC]",
  };

  const isPaid = order.status === "paid";
  const displayTx = order.id.slice(0, 14).toUpperCase();

  async function submitRefund(e: React.FormEvent) {
    e.preventDefault();
    const token = await getValidToken();
    if (!token) return;
    setRefundLoading(true);
    try {
      const res = await fetch(`/api/orders/${orderId}/refund`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ reason: refundReason }),
      });
      const data = await res.json();
      if (data.success) {
        setRefundMessage("Permintaan refund berhasil dikirim. Tim verifikasi kami akan meninjau dalam 2–3 hari kerja.");
        setRefundOpen(false);
        setRefundReason("");
      } else {
        setRefundMessage(data.error?.message ?? "Gagal mengirim permintaan refund.");
      }
    } catch {
      setRefundMessage("Terjadi kesalahan teknis saat mengirim permohonan.");
    } finally {
      setRefundLoading(false);
    }
  }

  const supportWaHref = buildWaLink(
    WA_NUMBER,
    `Halo Customer Support Hazl, saya ingin bertanya tentang status faktur untuk pesanan #${displayTx}.`
  );

  return (
    <div className="flex flex-col gap-6 text-[#16181D]">
      {/* 1. Breadcrumbs */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs text-[#5B616E]">
        <nav className="flex items-center gap-1.5 flex-wrap">
          <Link href="/dashboard" className="hover:text-[#16181D] transition-colors">
            Workspace
          </Link>
          <ChevronRight size={13} className="text-[#CCD0D5]" />
          <Link href="/dashboard/pesanan" className="hover:text-[#16181D] transition-colors">
            Transaksi & Pesanan
          </Link>
          <ChevronRight size={13} className="text-[#CCD0D5]" />
          <span className="font-mono font-bold text-[#16181D]">Detail Pesanan #{displayTx}</span>
        </nav>

        <Link
          href="/dashboard/pesanan"
          className="inline-flex items-center gap-1 font-semibold text-[#0077A8] hover:underline"
        >
          <ArrowLeft size={13} />
          <span>Kembali ke Riwayat Pesanan</span>
        </Link>
      </div>

      {/* 2. Top Header & Action Cluster */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 rounded-[26px] border border-[#E7E9EC] bg-white p-6 shadow-sm">
        <div className="space-y-1.5">
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-[#16181D]">
              Pesanan #{displayTx}
            </h1>
            <span className={cn("rounded-full px-3 py-0.5 text-xs font-bold", status.badgeClass)}>
              {status.label}
            </span>
            <span className="rounded-full border border-[#E7E9EC] bg-[#F6F7F9] px-2.5 py-0.5 text-xs font-semibold text-[#5B616E]">
              Faktur Resmi
            </span>
          </div>
          <p className="text-xs text-[#5B616E]">
            Diterbitkan oleh <strong className="text-[#16181D]">PT Hazl Teknologi Solusi Edukasi</strong> pada {formatDateTime(order.createdAt)}.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex h-10 items-center justify-center gap-1.5 rounded-full border border-[#E7E9EC] bg-white px-4 text-xs font-bold text-[#16181D] hover:bg-[#F6F7F9] transition-colors shadow-sm"
          >
            <Printer size={14} className="text-[#5B616E]" />
            <span>Cetak Struk Resmi</span>
          </button>

          {isPaid && (
            <button
              type="button"
              onClick={() => {
                setDownloadError("");
                downloadProtected(
                  `/api/orders/${order.id}/invoice`,
                  `invoice-hazl-${order.id.slice(0, 8)}.pdf`,
                ).catch(() => setDownloadError("Gagal mengunduh file invoice. Silakan coba kembali."));
              }}
              className="inline-flex h-10 items-center justify-center gap-1.5 rounded-full border border-[#E7E9EC] bg-white px-4 text-xs font-bold text-[#16181D] hover:bg-[#F6F7F9] transition-colors shadow-sm"
            >
              <Download size={14} className="text-[#5B616E]" />
              <span>Unduh Faktur PDF</span>
            </button>
          )}

          {isPaid && (
            <Link
              href="/dashboard/kursus"
              className="inline-flex h-10 items-center justify-center gap-1.5 rounded-full bg-[#0077A8] px-5 text-xs font-bold text-white hover:bg-[#0D5B8A] transition-colors shadow-sm"
            >
              <GraduationCap size={15} />
              <span>Buka Materi Belajar</span>
            </Link>
          )}
        </div>
      </div>

      {downloadError && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-center text-xs font-semibold text-rose-700">
          {downloadError}
        </div>
      )}

      {refundMessage && (
        <div
          className={cn(
            "rounded-xl p-3 text-center text-xs font-semibold",
            refundMessage.includes("berhasil")
              ? "border border-emerald-200 bg-emerald-50 text-emerald-800"
              : "border border-rose-200 bg-rose-50 text-rose-700"
          )}
        >
          {refundMessage}
        </div>
      )}

      {/* 3. Lini Masa & Log Transaksi (3-Step Progress Grid) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Step 1 */}
        <div className="rounded-2xl border border-[#E7E9EC] bg-white p-4 shadow-sm flex items-start gap-3">
          <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-[#E8F6FF] text-[#0077A8]">
            <CheckCircle2 size={18} />
          </div>
          <div className="space-y-0.5 text-xs">
            <p className="font-bold text-[#16181D]">1. Pesanan Dibuat</p>
            <p className="text-[#5B616E]">{formatDateTime(order.createdAt)}</p>
            <span className="inline-block text-[10px] font-bold text-emerald-700">Selesai</span>
          </div>
        </div>

        {/* Step 2 */}
        <div
          className={cn(
            "rounded-2xl border p-4 shadow-sm flex items-start gap-3",
            isPaid ? "border-[#E7E9EC] bg-white" : "border-amber-200 bg-amber-50/50"
          )}
        >
          <div
            className={cn(
              "flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg",
              isPaid ? "bg-emerald-50 text-emerald-700" : "bg-amber-100 text-amber-800"
            )}
          >
            {isPaid ? <CheckCircle2 size={18} /> : <Clock size={18} />}
          </div>
          <div className="space-y-0.5 text-xs">
            <p className="font-bold text-[#16181D]">2. Pembayaran Terverifikasi</p>
            <p className="text-[#5B616E]">
              {order.paidAt ? formatDateTime(order.paidAt) : "Menunggu transfer gateway"}
            </p>
            <span
              className={cn(
                "inline-block text-[10px] font-bold",
                isPaid ? "text-emerald-700" : "text-amber-800"
              )}
            >
              {isPaid ? "via Gateway Otomatis" : "Status: Pending"}
            </span>
          </div>
        </div>

        {/* Step 3 */}
        <div
          className={cn(
            "rounded-2xl border p-4 shadow-sm flex items-start gap-3",
            isPaid ? "border-[#E7E9EC] bg-white" : "border-[#E7E9EC] bg-[#FAFAFA] opacity-70"
          )}
        >
          <div
            className={cn(
              "flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg",
              isPaid ? "bg-emerald-50 text-emerald-700" : "bg-[#E7E9EC] text-[#5B616E]"
            )}
          >
            <Sparkles size={18} />
          </div>
          <div className="space-y-0.5 text-xs">
            <p className="font-bold text-[#16181D]">3. Akses LMS & Resource Diaktifkan</p>
            <p className="text-[#5B616E]">
              {isPaid ? "Instan • Status: Sinkron Aktif" : "Menunggu verifikasi pembayaran"}
            </p>
            <span
              className={cn(
                "inline-block text-[10px] font-bold",
                isPaid ? "text-emerald-700" : "text-[#5B616E]"
              )}
            >
              {isPaid ? "Siap Diakses di Dashboard" : "Terkunci"}
            </span>
          </div>
        </div>
      </div>

      {/* 4. Two-Column Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column (Items & Student Info) - 7 Cols */}
        <div className="lg:col-span-7 space-y-6">
          {/* Purchased Items Card */}
          <div className="rounded-[26px] border border-[#E7E9EC] bg-white p-6 shadow-sm space-y-5">
            <div className="flex items-center justify-between border-b border-[#E7E9EC] pb-4">
              <div className="flex items-center gap-2">
                <Sparkles size={18} className="text-[#0077A8]" />
                <h3 className="font-bold text-base text-[#16181D]">Item yang Dibeli</h3>
              </div>
              <span className="rounded-full bg-[#F6F7F9] border border-[#E7E9EC] px-2.5 py-0.5 text-xs font-semibold text-[#5B616E]">
                {order.items.length} Item
              </span>
            </div>

            <div className="space-y-4">
              {order.items.map((item) => (
                <div
                  key={item.id}
                  className="rounded-2xl border border-[#E7E9EC] bg-[#FAFAFA] p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="flex items-center gap-3.5">
                    <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-[#E8F6FF] text-[#0077A8] border border-[#BDE5F8]">
                      <GraduationCap size={22} />
                    </div>
                    <div>
                      <h4 className="font-bold text-sm text-[#16181D]">
                        {item.itemTitle ?? "Kursus Hazl Academy"}
                      </h4>
                      <div className="flex flex-wrap items-center gap-2 mt-1">
                        <span className="rounded-full bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                          Akses Seumur Hidup
                        </span>
                        <span className="rounded-full bg-[#E8F6FF] border border-[#BDE5F8] px-2 py-0.5 text-[10px] font-bold text-[#0077A8]">
                          Formula Prompt & Presets
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="text-left sm:text-right">
                    <span className="font-extrabold text-base text-[#16181D]">
                      {formatRp(Number(item.totalPrice))}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Status Provisioning Box */}
            <div className="rounded-2xl border border-[#E7E9EC] p-4 space-y-3">
              <p className="text-[10px] font-bold uppercase tracking-wider text-[#5B616E]">
                Status Provisioning & Kredensial Siswa
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div className="rounded-xl bg-[#FAFAFA] border border-[#E7E9EC] p-2.5">
                  <span className="text-[#5B616E] text-[10px]">Akses LMS</span>
                  <p className="font-bold text-emerald-700 mt-0.5">
                    {isPaid ? "• Aktif Penuh" : "• Menunggu Bayar"}
                  </p>
                  <span className="font-mono text-[10px] text-[#8A909A]">UID: HZL-{order.id.slice(0, 5).toUpperCase()}</span>
                </div>
                <div className="rounded-xl bg-[#FAFAFA] border border-[#E7E9EC] p-2.5">
                  <span className="text-[#5B616E] text-[10px]">Ruang Komunitas</span>
                  <p className="font-bold text-emerald-700 mt-0.5">
                    {isPaid ? "• Tersinkron" : "• Belum Aktif"}
                  </p>
                  <span className="text-[10px] text-[#8A909A]">Role: Verified Creator</span>
                </div>
                <div className="rounded-xl bg-[#FAFAFA] border border-[#E7E9EC] p-2.5">
                  <span className="text-[#5B616E] text-[10px]">Resource Kit</span>
                  <p className="font-bold text-emerald-700 mt-0.5">
                    {isPaid ? "• Siap Diunduh" : "• Terkunci"}
                  </p>
                  <span className="text-[10px] text-[#8A909A]">Presets & Prompts</span>
                </div>
              </div>

              {isPaid && (
                <div className="flex flex-wrap gap-2.5 pt-2">
                  <Link
                    href="/dashboard/kursus"
                    className="inline-flex items-center gap-1.5 rounded-full border border-[#E7E9EC] bg-white px-4 py-2 text-xs font-bold text-[#16181D] hover:bg-[#F6F7F9]"
                  >
                    <span>Buka Silabus Kursus</span>
                    <ExternalLink size={12} />
                  </Link>
                  <Link
                    href="/ebook"
                    className="inline-flex items-center gap-1.5 rounded-full border border-[#E7E9EC] bg-white px-4 py-2 text-xs font-bold text-[#16181D] hover:bg-[#F6F7F9]"
                  >
                    <span>Akses Resource Library</span>
                    <ExternalLink size={12} />
                  </Link>
                </div>
              )}
            </div>
          </div>

          {/* Student Info & License Holder Card */}
          <div className="rounded-[26px] border border-[#E7E9EC] bg-white p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-[#E7E9EC] pb-3">
              <h3 className="font-bold text-base text-[#16181D]">Informasi Siswa & Penerima Lisensi</h3>
              <span className="text-xs font-semibold text-[#5B616E]">Lisensi Tunggal Siswa</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="space-y-1">
                <span className="text-[#5B616E]">Nama Lengkap</span>
                <p className="font-bold text-[#16181D]">
                  {order.user?.name ?? "Kreator Hazl"}
                </p>
              </div>

              <div className="space-y-1">
                <span className="text-[#5B616E]">Email Akun (LMS & Notifikasi)</span>
                <p className="font-medium text-[#16181D] truncate">
                  {order.user?.email ?? "pembeli@hazl.academy"}
                </p>
              </div>

              <div className="space-y-1">
                <span className="text-[#5B616E]">Nomor Telepon / WhatsApp</span>
                <p className="font-medium text-[#16181D]">
                  {order.user?.phone ?? "+62 812-xxxx-xxxx"}
                </p>
              </div>

              <div className="space-y-1">
                <span className="text-[#5B616E]">Institusi / Track Belajar</span>
                <p className="font-medium text-[#16181D]">Video AI & Commercial Creator</p>
              </div>
            </div>

            <div className="rounded-xl border border-[#E7E9EC] bg-[#FAFAFA] p-3 flex items-center justify-between text-xs text-[#5B616E]">
              <div className="flex items-center gap-2">
                <Lock size={14} className="text-[#0077A8]" />
                <span>Sertifikat kelulusan digital akan diterbitkan otomatis atas nama di atas.</span>
              </div>
              <Link href="/dashboard/profil" className="font-bold text-[#0077A8] hover:underline whitespace-nowrap">
                Edit Profil
              </Link>
            </div>
          </div>
        </div>

        {/* Right Column (Invoice Details & Verification) - 5 Cols */}
        <div className="lg:col-span-5 space-y-6">
          {/* Official Invoice Card */}
          <div className="rounded-[26px] border border-[#E7E9EC] bg-white p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-[#E7E9EC] pb-4">
              <div className="flex items-center gap-2">
                <FileText size={18} className="text-[#0077A8]" />
                <h3 className="font-bold text-base text-[#16181D]">Rincian Faktur Resmi</h3>
              </div>
              <span
                className={cn(
                  "rounded-full px-2.5 py-0.5 text-[11px] font-extrabold uppercase",
                  isPaid ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-amber-50 text-amber-700"
                )}
              >
                {isPaid ? "LUNAS" : "PENDING"}
              </span>
            </div>

            <div className="space-y-2.5 text-xs">
              <div className="flex justify-between">
                <span className="text-[#5B616E]">Nomor Invoice</span>
                <span className="font-mono font-bold text-[#16181D]">INV-HZL-{order.id.slice(0, 8).toUpperCase()}</span>
              </div>

              <div className="flex justify-between">
                <span className="text-[#5B616E]">Waktu Transaksi</span>
                <span className="text-[#16181D]">{formatDateTime(order.createdAt)}</span>
              </div>

              <div className="flex justify-between">
                <span className="text-[#5B616E]">Metode Pembayaran</span>
                <span className="font-semibold text-[#16181D] uppercase">
                  {order.paymentMethod ?? "QRIS Standar Nasional"}
                </span>
              </div>

              <div className="flex justify-between">
                <span className="text-[#5B616E]">Settlement ID</span>
                <span className="font-mono text-[#5B616E]">#0082{order.id.slice(0, 6)}</span>
              </div>

              {/* Price Calculation */}
              <div className="border-t border-[#E7E9EC] pt-3 space-y-2">
                <div className="flex justify-between text-[#5B616E]">
                  <span>Subtotal Harga</span>
                  <span>{formatRp(Number(order.totalAmount))}</span>
                </div>

                {Number(order.discountAmount) > 0 && (
                  <div className="flex justify-between text-rose-600 font-semibold">
                    <span className="flex items-center gap-1">
                      <Tag size={12} />
                      Diskon Promo {order.coupon ? `(${order.coupon.code})` : ""}
                    </span>
                    <span>- {formatRp(Number(order.discountAmount))}</span>
                  </div>
                )}

                <div className="flex justify-between text-[#5B616E]">
                  <span>Biaya Layanan & Gateway</span>
                  <span className="text-emerald-600 font-semibold">Rp 0 (Gratis)</span>
                </div>

                <div className="flex justify-between text-[#5B616E]">
                  <span>PPN 11% (Termasuk)</span>
                  <span>{formatRp(Math.round(Number(order.finalAmount) * 0.11 / 1.11))}</span>
                </div>

                <div className="border-t border-[#E7E9EC] pt-3 flex justify-between items-baseline">
                  <div>
                    <span className="font-extrabold text-sm text-[#16181D]">Total Dibayar</span>
                    <p className="text-[10px] text-emerald-700 font-semibold">Lunas & Terverifikasi Otomatis</p>
                  </div>
                  <span className="font-extrabold text-2xl text-[#0077A8]">
                    {formatRp(Number(order.finalAmount))}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 5. Money Back Guarantee & Support Footer Strip */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 rounded-[26px] border border-[#E7E9EC] bg-white p-5 shadow-sm text-xs text-[#5B616E]">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-200">
            <ShieldCheck size={20} />
          </div>
          <div>
            <p className="font-bold text-[#16181D]">Jaminan 7 Hari Pengembalian Dana Tanpa Syarat</p>
            <p className="text-[11px] text-[#5B616E]">
              Jika materi tidak sesuai dengan silabus industri yang dijanjikan, Anda berhak mengajukan refund penuh dalam 7 hari kerja.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <a
            href={supportWaHref ?? "https://wa.me/6281234567890"}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 rounded-full border border-[#E7E9EC] bg-white px-4 py-2 font-bold text-[#16181D] hover:bg-[#F6F7F9]"
          >
            <MessageSquare size={14} className="text-[#0077A8]" />
            <span>WhatsApp Support 24/7</span>
          </a>
          <Link
            href="/terms"
            className="rounded-full border border-[#E7E9EC] bg-white px-4 py-2 font-bold text-[#5B616E] hover:text-[#16181D]"
          >
            Syarat & Ketentuan Lisensi
          </Link>
          {isPaid && (
            <button
              type="button"
              onClick={() => setRefundOpen(true)}
              className="text-xs font-semibold text-[#8A909A] hover:text-rose-600 transition-colors px-2 py-1"
            >
              Ajukan Refund
            </button>
          )}
        </div>
      </div>

      {/* Refund Modal */}
      {refundOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-[26px] border border-[#E7E9EC] bg-white p-6 shadow-xl">
            <h2 className="text-lg font-bold text-[#16181D]">Ajukan Pengembalian Dana (Refund)</h2>
            <p className="mb-4 mt-1 text-xs text-[#5B616E] leading-relaxed">
              Jelaskan alasan pengajuan refund Anda. Tim kepatuhan kami akan meninjau dan merespons dalam 2–3 hari kerja.
            </p>
            <form onSubmit={submitRefund} className="space-y-4">
              <Textarea
                required
                rows={4}
                minLength={10}
                value={refundReason}
                onChange={(e) => setRefundReason(e.target.value)}
                placeholder="Alasan pengajuan refund (minimal 10 karakter)..."
                className="rounded-xl border-[#E7E9EC] text-xs"
              />
              <div className="flex gap-3">
                <Button
                  type="button"
                  variant="ghost"
                  className="flex-1 rounded-full text-xs font-bold"
                  onClick={() => setRefundOpen(false)}
                >
                  Batal
                </Button>
                <button
                  type="submit"
                  disabled={refundLoading}
                  className="flex-1 rounded-full bg-rose-600 px-4 py-2.5 text-xs font-bold text-white transition-colors hover:bg-rose-700 disabled:opacity-50"
                >
                  {refundLoading ? "Mengirim..." : "Kirim Permohonan"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default function OrderDetailPage() {
  return (
    <Suspense fallback={<DashboardLoading label="Memuat detail faktur pesanan…" />}>
      <OrderDetailContent />
    </Suspense>
  );
}
