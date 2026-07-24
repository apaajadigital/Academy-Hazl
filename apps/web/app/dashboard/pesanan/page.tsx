"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import {
  Plus, ShoppingBag, CheckCircle2, Clock, BookOpen, BookMarked, Ticket, Star, Loader2,
} from "lucide-react";
import { Badge, Table, THead, TBody, TR, TH, TD, Pagination } from "@/components/ui";
import { EmptyState } from "@/components/ui/EmptyState";
import { getToken } from "@/lib/auth/token";

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
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="animate-spin text-accent-cyan-strong" size={32} aria-hidden="true" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
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
          <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-3">
            {[
              { label: "Total Pesanan", value: total, Icon: ShoppingBag, wrap: "bg-surface-accent-soft text-accent-cyan-strong" },
              { label: "Pesanan Selesai", value: paidCount, Icon: CheckCircle2, wrap: "bg-green-600/10 text-green-600" },
              { label: "Menunggu Pembayaran", value: pendingCount, Icon: Clock, wrap: "bg-amber-500/10 text-amber-600" },
            ].map(({ label, value, Icon, wrap }) => (
              <div key={label} className="flex items-center gap-3.5 rounded-[var(--radius-lg)] border border-border-default bg-surface-card p-5 shadow-e1">
                <span className={`flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full ${wrap}`}>
                  <Icon size={22} aria-hidden="true" />
                </span>
                <div>
                  <p className="text-[11px] font-medium uppercase tracking-wider text-text-secondary">{label}</p>
                  <p className="font-display text-lg font-extrabold text-text-primary">{value}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Orders table */}
          <div className="overflow-hidden rounded-[var(--radius-lg)] border border-border-default bg-surface-card shadow-e1">
            <div className="overflow-x-auto">
              <Table>
              <THead>
                <tr>
                  <TH>No. Pesanan</TH>
                  <TH>Tanggal</TH>
                  <TH>Item</TH>
                  <TH className="text-right">Total</TH>
                  <TH>Status</TH>
                  <TH className="text-center">Aksi</TH>
                </tr>
              </THead>
              <TBody>
                {orders.map((order) => {
                  const status = STATUS_LABEL[order.status] ?? { label: order.status, variant: "neutral" as const };
                  const title = order.items[0]?.itemTitle ?? "Produk";
                  const itemType = order.items[0]?.itemType ?? "";
                  const Icon = TYPE_ICON[itemType] ?? ShoppingBag;

                  return (
                    <TR key={order.id}>
                      <TD className="font-mono text-xs font-semibold text-text-primary">#{order.id.slice(0, 8).toUpperCase()}</TD>
                      <TD className="whitespace-nowrap text-text-secondary">
                        {new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "long", year: "numeric" }).format(new Date(order.createdAt))}
                      </TD>
                      <TD>
                        <div className="flex items-center gap-2.5">
                          <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-surface-sunken text-accent-cyan-strong">
                            <Icon size={16} aria-hidden="true" />
                          </span>
                          <div className="min-w-0">
                            <p className="truncate font-semibold text-text-primary">{title}</p>
                            {itemType && <p className="text-xs capitalize text-text-muted">{itemType}</p>}
                          </div>
                        </div>
                      </TD>
                      <TD className="whitespace-nowrap text-right font-bold text-text-primary">
                        Rp {Number(order.finalAmount).toLocaleString("id-ID")}
                      </TD>
                      <TD>
                        <Badge variant={status.variant} dot>{status.label}</Badge>
                      </TD>
                      <TD>
                        <div className="flex items-center justify-center gap-3">
                          <Link href={`/pesanan/${order.id}`} className="whitespace-nowrap text-sm font-semibold text-accent-cyan-strong hover:underline">
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
                            <a
                              href={`/api/orders/${order.id}/invoice`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="whitespace-nowrap text-sm text-text-secondary hover:text-text-primary"
                            >
                              Invoice
                            </a>
                          )}
                        </div>
                      </TD>
                    </TR>
                  );
                })}
              </TBody>
            </Table>
            </div>

            {/* Pagination footer */}
            {totalPages > 1 && (
              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border-default bg-surface-sunken px-6 py-4">
                <span className="text-sm text-text-secondary">Halaman {page} dari {totalPages}</span>
                <Pagination page={page} pageCount={totalPages} onPageChange={setPage} />
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
