"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import {
  Plus, ShoppingBag, CheckCircle2, Clock, BookOpen, BookMarked, Ticket, Star,
} from "lucide-react";
import {
  Badge,
  Table,
  TableContainer,
  THead,
  TBody,
  TR,
  TH,
  TD,
  Pagination,
  StatCard,
  DashboardLoading,
  EmptyState,
} from "@/components/ui";
import { getToken } from "@/lib/auth/token";
import { downloadProtected } from "@/lib/download";

type OrderItem = { itemTitle: string | null; itemType: string };
type Order = {
  id: string;
  status: string;
  finalAmount: number;
  createdAt: string;
  items: OrderItem[];
};

const STATUS_LABEL: Record<string, { label: string; variant: "success" | "warning" | "danger" | "neutral" }> = {
  paid:      { label: "Lunas",               variant: "success" },
  pending:   { label: "Menunggu Pembayaran", variant: "warning" },
  failed:    { label: "Gagal",               variant: "danger" },
  expired:   { label: "Kedaluwarsa",         variant: "neutral" },
  cancelled: { label: "Dibatalkan",          variant: "neutral" },
};

const TYPE_ICON: Record<string, LucideIcon> = {
  course: BookOpen,
  ebook: BookMarked,
  event: Ticket,
  subscription: Star,
};


export default function PesananDashboardPage() {
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const limit = 10;

  async function handleCancelOrder(orderId: string) {
    const token = getToken();
    if (!token) return;
    if (!confirm("Apakah Anda yakin ingin membatalkan pesanan ini?")) return;

    setCancellingId(orderId);
    try {
      const res = await fetch(`/api/orders/${orderId}/cancel`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const body = await res.json();
      if (body.success) {
        setOrders((prev) =>
          prev.map((o) => (o.id === orderId ? { ...o, status: "cancelled" } : o))
        );
      } else {
        alert(body.error?.message ?? "Gagal membatalkan pesanan.");
      }
    } catch {
      alert("Gagal menghubungi server.");
    } finally {
      setCancellingId(null);
    }
  }

  // The invoice endpoint is bearer-token protected and the token lives in
  // storage, not a cookie — a plain <a href> navigation sends no Authorization
  // header and always 401s, so fetch the PDF with the token instead.
  function handleDownloadInvoice(orderId: string) {
    downloadProtected(`/api/orders/${orderId}/invoice`, `invoice-${orderId}.pdf`).catch(() => {
      alert("Gagal mengunduh invoice.");
    });
  }

  useEffect(() => {
    const token = getToken();
    if (!token) { router.replace("/masuk"); return; }

    fetch(
      `/api/orders?page=${page}&limit=${limit}`,
      { headers: { Authorization: `Bearer ${token}` } }
    )
      .then((r) => r.json())
      .then((data) => {
        if (data.success) {
          setOrders(data.data);
          setTotal(data.meta?.total ?? 0);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [page, router]);

  const totalPages = Math.ceil(total / limit);
  const paidCount = orders.filter((o) => o.status === "paid").length;
  const pendingCount = orders.filter((o) => o.status === "pending").length;

  if (loading) {
    return <DashboardLoading label="Memuat pesanan…" />;
  }

  const stats = [
    { label: "Total Pesanan", value: total, icon: ShoppingBag, iconColor: "#0077A8", iconBg: "rgba(0,119,168,0.10)" },
    { label: "Pesanan Selesai", value: paidCount, icon: CheckCircle2, iconColor: "#16A34A", iconBg: "rgba(22,163,74,0.10)" },
    { label: "Menunggu Pembayaran", value: pendingCount, icon: Clock, iconColor: "#D97706", iconBg: "rgba(217,119,6,0.10)" },
  ];

  return (
    <div className="dash-container flex flex-col gap-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-extrabold text-text-primary">Pesanan Saya</h1>
          <p className="mt-1 text-sm text-text-secondary">{total} total transaksi</p>
        </div>
        <Link href="/e-course" className="btn btn-primary btn-sm">
          <Plus size={16} aria-hidden="true" /> Beli Kursus
        </Link>
      </div>

      {orders.length === 0 ? (
        <EmptyState
          icon={ShoppingBag}
          title="Belum ada pesanan"
          description="Mulai belajar dengan membeli kursus pertama Anda."
          action={<Link href="/e-course" className="btn btn-primary btn-sm">Jelajahi Kursus</Link>}
        />
      ) : (
        <>
          {/* Stat summary */}
          <section className="dash-grid">
            {stats.map((s) => (
              <StatCard
                key={s.label}
                className="col-span-12 sm:col-span-6 xl:col-span-4"
                label={s.label}
                value={s.value}
                icon={s.icon}
                iconColor={s.iconColor}
                iconBg={s.iconBg}
              />
            ))}
          </section>

          {/* Orders table */}
          <TableContainer>
            <Table>
              <THead>
                <TR>
                  <TH>No. Pesanan</TH>
                  <TH>Tanggal</TH>
                  <TH>Item</TH>
                  <TH className="text-right">Total</TH>
                  <TH>Status</TH>
                  <TH className="text-center">Aksi</TH>
                </TR>
              </THead>
              <TBody>
                {orders.map((order) => {
                  const status = STATUS_LABEL[order.status] ?? { label: order.status, variant: "neutral" as const };
                  const title = order.items[0]?.itemTitle ?? "Produk";
                  const itemType = order.items[0]?.itemType ?? "";
                  const Icon = TYPE_ICON[itemType] ?? ShoppingBag;
                  const amount = Number(order.finalAmount);

                  return (
                    <TR key={order.id}>
                      <TD className="font-mono text-xs font-semibold text-text-primary">#{order.id.slice(0, 8).toUpperCase()}</TD>
                      <TD className="whitespace-nowrap text-text-secondary">
                        {new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "long", year: "numeric" }).format(new Date(order.createdAt))}
                      </TD>
                      <TD>
                        <div className="flex items-center gap-3">
                          <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-[var(--radius-md)] bg-surface-sunken text-accent-cyan-strong">
                            <Icon size={16} aria-hidden="true" />
                          </span>
                          <div className="min-w-0">
                            <p className="truncate font-semibold text-text-primary">{title}</p>
                            {itemType && <p className="text-xs capitalize text-text-muted">{itemType}</p>}
                          </div>
                        </div>
                      </TD>
                      <TD className="whitespace-nowrap text-right font-bold text-text-primary">
                        {Number.isFinite(amount) ? `Rp ${amount.toLocaleString("id-ID")}` : "Rp 0"}
                      </TD>
                      <TD>
                        <Badge variant={status.variant} dot>{status.label}</Badge>
                      </TD>
                      <TD>
                        <div className="flex items-center justify-center gap-3">
                          <Link href={`/dashboard/pesanan/${order.id}`} className="whitespace-nowrap text-sm font-semibold text-accent-cyan-strong hover:underline">
                            Lihat Detail
                          </Link>
                          {order.status === "pending" && (
                            <button
                              onClick={() => handleCancelOrder(order.id)}
                              disabled={cancellingId === order.id}
                              className="whitespace-nowrap text-sm font-semibold text-red-600 disabled:opacity-50"
                            >
                              {cancellingId === order.id ? "Batal..." : "Batalkan"}
                            </button>
                          )}
                          {order.status === "paid" && (
                            <button
                              type="button"
                              onClick={() => handleDownloadInvoice(order.id)}
                              className="whitespace-nowrap text-sm text-text-secondary hover:text-text-primary"
                            >
                              Invoice
                            </button>
                          )}
                        </div>
                      </TD>
                    </TR>
                  );
                })}
              </TBody>
            </Table>

            {/* Pagination footer */}
            {totalPages > 1 && (
              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-solid border-border-default bg-surface-sunken px-6 py-4">
                <span className="text-sm text-text-secondary">Halaman {page} dari {totalPages}</span>
                <Pagination page={page} pageCount={totalPages} onPageChange={setPage} />
              </div>
            )}
          </TableContainer>
        </>
      )}
    </div>
  );
}
