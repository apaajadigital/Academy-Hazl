"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  ChevronRight,
  CheckCircle2,
  Clock,
  CircleX,
  AlertCircle,
  RotateCcw,
  Download,
  CreditCard,
  Tag,
  Wallet,
  GraduationCap,
  Loader2,
  type LucideIcon,
} from "lucide-react";
import { getToken } from "@/lib/auth/token";
import { downloadProtected } from "@/lib/download";
import { Card, CardHeader, CardTitle, CardContent, Button, Textarea } from "@/components/ui";
import { cn } from "@/lib/utils";

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
  items: { id: string; itemTitle: string | null; itemType: string; quantity: number; unitPrice: number; totalPrice: number }[];
  transactions: { gateway: string; status: string; createdAt: string }[];
};

const STATUS_LABEL: Record<string, { label: string; color: string }> = {
  paid: { label: "Lunas", color: "text-green-600 bg-green-50" },
  pending: { label: "Menunggu Pembayaran", color: "text-yellow-600 bg-yellow-50" },
  failed: { label: "Gagal", color: "text-red-600 bg-red-50" },
  expired: { label: "Kedaluwarsa", color: "text-gray-500 bg-gray-50" },
  refunded: { label: "Direfund", color: "text-purple-600 bg-purple-50" },
};

// Presentation-only tone map for the status banner (icon + colour per status).
const STATUS_TONE: Record<string, { box: string; Icon: LucideIcon }> = {
  paid: { box: "border-green-200 bg-green-50 text-green-700", Icon: CheckCircle2 },
  pending: { box: "border-amber-200 bg-amber-50 text-amber-700", Icon: Clock },
  failed: { box: "border-red-200 bg-red-50 text-red-700", Icon: CircleX },
  expired: { box: "border-border-default bg-surface-sunken text-text-secondary", Icon: AlertCircle },
  refunded: { box: "border-purple-200 bg-purple-50 text-accent-purple", Icon: RotateCcw },
};

function getApiBase() {
  return process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}


export default function OrderDetailPage() {
  const { orderId } = useParams() as { orderId: string };
  const router = useRouter();
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refundOpen, setRefundOpen] = useState(false);
  const [refundReason, setRefundReason] = useState("");
  const [refundLoading, setRefundLoading] = useState(false);
  const [refundMessage, setRefundMessage] = useState("");
  // Kept apart from `error`, which drives the full-page fallback — a failed
  // download must not replace an already-rendered order detail.
  const [downloadError, setDownloadError] = useState("");

  useEffect(() => {
    const token = getToken();
    if (!token) {
      router.push(`/masuk?redirect=/pesanan/${orderId}`);
      return;
    }

    fetch(`${getApiBase()}/api/orders/${orderId}`, {
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
  }, [orderId, router]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface-page">
        <Loader2 className="size-8 animate-spin text-accent-cyan-strong" aria-hidden="true" />
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-surface-page">
        <p className="text-red-600">{error}</p>
        <Link href="/dashboard/pesanan" className="text-accent-cyan-strong underline">Kembali ke Pesanan</Link>
      </div>
    );
  }

  const status = STATUS_LABEL[order.status] ?? { label: order.status, color: "text-gray-500 bg-gray-50" };
  const tone = STATUS_TONE[order.status] ?? { box: "border-border-default bg-surface-sunken text-text-secondary", Icon: AlertCircle };

  async function submitRefund(e: React.FormEvent) {
    e.preventDefault();
    const token = getToken();
    if (!token) return;
    setRefundLoading(true);
    try {
      const res = await fetch(`${getApiBase()}/api/orders/${orderId}/refund`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ reason: refundReason }),
      });
      const data = await res.json();
      if (data.success) {
        setRefundMessage("Permintaan refund berhasil dikirim. Tim kami akan meninjau dalam 2–3 hari kerja.");
        setRefundOpen(false);
        setRefundReason("");
      } else {
        setRefundMessage(data.error?.message ?? "Gagal mengirim permintaan refund.");
      }
    } catch {
      setRefundMessage("Terjadi kesalahan.");
    } finally {
      setRefundLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-surface-page">
      <div className="mx-auto max-w-6xl px-4 py-10 md:px-8">
        {/* Breadcrumb */}
        <nav className="mb-6 flex items-center gap-2 text-sm text-text-secondary">
          <Link href="/dashboard/pesanan" className="inline-flex items-center gap-1 hover:text-accent-cyan-strong">
            <ArrowLeft size={16} aria-hidden="true" /> Pesanan
          </Link>
          <ChevronRight size={16} aria-hidden="true" className="text-border-strong" />
          <span className="font-mono text-text-primary">#{order.id.slice(0, 8).toUpperCase()}</span>
        </nav>

        {/* Header + status banner */}
        <div className="mb-8 flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div>
            <h1 className="font-display text-2xl font-extrabold text-text-primary">Detail Pesanan</h1>
            <p className="mt-1 text-sm text-text-secondary">{formatDateTime(order.createdAt)}</p>
          </div>
          <div className={cn("flex items-center gap-3 rounded-xl border px-5 py-3", tone.box)}>
            <tone.Icon size={22} aria-hidden="true" />
            <div className="flex flex-col">
              <span className="text-[11px] font-semibold uppercase tracking-widest opacity-80">Status Pembayaran</span>
              <span className="font-display text-base font-bold">{status.label}</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Left column: items + payment breakdown */}
          <div className="space-y-6 lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>Rincian Produk</CardTitle>
              </CardHeader>
              <CardContent className="space-y-1">
                {order.items.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between gap-4 rounded-lg px-2 py-3 transition-colors hover:bg-surface-sunken"
                  >
                    <span className="text-sm text-text-primary">{item.itemTitle ?? "Item"}</span>
                    <span className="whitespace-nowrap text-sm font-bold text-text-primary">
                      Rp {Number(item.totalPrice).toLocaleString("id-ID")}
                    </span>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Rincian Pembayaran</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between text-sm text-text-secondary">
                  <span>Subtotal</span>
                  <span>Rp {Number(order.totalAmount).toLocaleString("id-ID")}</span>
                </div>
                {Number(order.discountAmount) > 0 && (
                  <div className="flex items-center justify-between text-sm text-green-700">
                    <span className="inline-flex items-center gap-1.5">
                      <Tag size={16} aria-hidden="true" /> Diskon{order.coupon ? ` (${order.coupon.code})` : ""}
                    </span>
                    <span>-Rp {Number(order.discountAmount).toLocaleString("id-ID")}</span>
                  </div>
                )}
                <div className="flex items-center justify-between border-t border-border-default pt-3">
                  <span className="font-display text-lg font-bold text-text-primary">Total</span>
                  <span className="font-display text-lg font-bold text-accent-cyan-strong">
                    Rp {Number(order.finalAmount).toLocaleString("id-ID")}
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right column: instruction + metadata + actions */}
          <div className="space-y-6">
            {order.status === "pending" && (
              <div className="space-y-3 rounded-[var(--radius-lg)] border border-accent-cyan-strong/20 bg-surface-accent-soft p-6">
                <div className="flex items-center gap-2">
                  <Wallet size={20} className="text-accent-cyan-strong" aria-hidden="true" />
                  <h4 className="text-sm font-bold uppercase tracking-wide text-text-primary">Instruksi Pembayaran</h4>
                </div>
                <p className="text-sm text-text-secondary">Menunggu konfirmasi pembayaran dari DOKU...</p>
              </div>
            )}

            <Card>
              <CardHeader>
                <CardTitle className="text-sm uppercase tracking-wide">Info Pembayaran</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {order.paymentMethod && (
                  <div className="flex items-center gap-3">
                    <span className="flex h-12 w-12 items-center justify-center rounded-lg bg-surface-sunken text-accent-cyan-strong">
                      <CreditCard size={22} aria-hidden="true" />
                    </span>
                    <div>
                      <p className="text-sm font-bold uppercase text-text-primary">{order.paymentMethod}</p>
                      <p className="text-sm text-text-secondary">
                        {order.status === "paid" ? "Otomatis Terverifikasi" : "Menunggu pembayaran"}
                      </p>
                    </div>
                  </div>
                )}
                <div className={cn("space-y-2 text-sm", order.paymentMethod && "border-t border-border-default pt-3")}>
                  <div className="flex items-center justify-between">
                    <span className="text-text-secondary">Waktu Transaksi</span>
                    <span className="text-text-primary">{formatDateTime(order.createdAt)}</span>
                  </div>
                  {order.paidAt && (
                    <div className="flex items-center justify-between">
                      <span className="text-text-secondary">Dibayar pada</span>
                      <span className="text-text-primary">{formatDateTime(order.paidAt)}</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Actions */}
            <div className="space-y-3">
              {refundMessage && (
                <p
                  className={cn(
                    "rounded-xl p-3 text-center text-sm",
                    refundMessage.includes("berhasil") ? "bg-green-50 text-green-700" : "bg-red-50 text-red-600",
                  )}
                >
                  {refundMessage}
                </p>
              )}

              {downloadError && (
                <p role="alert" className="rounded-xl bg-red-50 p-3 text-center text-sm text-red-600">
                  {downloadError}
                </p>
              )}

              {order.status === "paid" && (
                <>
                  {/* The invoice endpoint is bearer-token protected and the token
                      lives in storage, not a cookie — a plain <a href> navigation
                      sends no Authorization header and always 401s. */}
                  <button
                    type="button"
                    onClick={() => {
                      setDownloadError("");
                      downloadProtected(
                        `${getApiBase()}/api/orders/${order.id}/invoice`,
                        `invoice-${order.id}.pdf`,
                      ).catch(() => setDownloadError("Gagal mengunduh invoice."));
                    }}
                    className="flex w-full items-center justify-center gap-2 rounded-full bg-brand-gradient px-4 py-3 text-sm font-semibold text-white shadow-e1 transition-opacity hover:opacity-90"
                  >
                    <Download size={18} aria-hidden="true" /> Unduh Invoice
                  </button>
                  <Link
                    href="/dashboard/kursus"
                    className="flex w-full items-center justify-center gap-2 rounded-full border border-border-strong px-4 py-3 text-sm font-semibold text-accent-cyan-strong transition-colors hover:bg-surface-accent-soft"
                  >
                    <GraduationCap size={18} aria-hidden="true" /> Mulai Belajar
                  </Link>
                  <button
                    onClick={() => setRefundOpen(true)}
                    className="w-full text-center text-sm text-text-muted transition-colors hover:text-red-600"
                  >
                    Ajukan Refund
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Refund Modal */}
      {refundOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-[var(--radius-lg)] border border-border-default bg-surface-card p-6 shadow-e3">
            <h2 className="font-display text-lg font-bold text-text-primary">Ajukan Refund</h2>
            <p className="mb-6 mt-2 text-sm text-text-secondary">
              Jelaskan alasan Anda mengajukan refund. Proses peninjauan membutuhkan 2–3 hari kerja.
            </p>
            <form onSubmit={submitRefund} className="space-y-4">
              <Textarea
                required
                rows={4}
                minLength={10}
                value={refundReason}
                onChange={(e) => setRefundReason(e.target.value)}
                placeholder="Alasan refund (minimal 10 karakter)..."
              />
              <div className="flex gap-3">
                <Button type="button" variant="ghost" className="flex-1" onClick={() => setRefundOpen(false)}>
                  Batal
                </Button>
                <button
                  type="submit"
                  disabled={refundLoading}
                  className="flex-1 rounded-full bg-red-600 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-red-700 disabled:opacity-50"
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
