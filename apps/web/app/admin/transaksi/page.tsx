"use client";

import { useEffect, useState } from "react";
import type { LucideIcon } from "lucide-react";
import { Search, Download, Wallet, CheckCircle2, Clock, CreditCard } from "lucide-react";
import {
  Avatar,
  Badge,
  type BadgeProps,
  Button,
  Input,
  Pagination,
  FilterBar,
  DashboardLoading,
  DashboardError,
  TableContainer,
  Table,
  THead,
  TBody,
  TR,
  TH,
  TD,
  Tabs,
  TabsList,
  TabsTrigger,
  StatCard,
} from "@/components/ui";
import { EmptyState } from "@/components/ui/EmptyState";
import { cn } from "@/lib/utils";
import { getToken } from "@/lib/auth/token";

type Order = {
  id: string;
  finalAmount: number;
  totalAmount: number;
  status: string;
  paymentMethod: string | null;
  createdAt: string;
  user: { name: string; email: string };
  items: { itemTitle: string | null; itemType: string; amount: number }[];
};

/**
 * Envelope of GET /api/admin/orders (api/src/modules/admin/transactions.ts):
 * `data` is a FLAT array, page info lives in `meta`. The old `data.total ??
 * list.length` fallback was worse than a plain zero: on a full page it resolved
 * to exactly `limit`, so `totalPages` computed to 1 and the pagination footer
 * disappeared with no hint that more transactions existed.
 */
type OrderListResponse =
  | { success: true; data: Order[]; meta?: { total: number; page: number; limit: number } }
  | { success: false; error?: { message?: string } };

const STATUS_VARIANT: Record<string, NonNullable<BadgeProps["variant"]>> = {
  paid: "success",
  pending: "warning",
  failed: "danger",
  expired: "neutral",
  refunded: "info",
};

const STATUS_LABEL: Record<string, string> = {
  paid: "Lunas", pending: "Menunggu", failed: "Gagal", expired: "Kadaluarsa", refunded: "Refund",
};

// Product-type accent pill (Lumina): tinted, uppercase micro-label per item type.
const ITEM_TYPE_PILL: Record<string, { label: string; className: string }> = {
  course:       { label: "Kursus",    className: "bg-surface-accent-soft text-accent-cyan-strong" },
  ebook:        { label: "E-Book",    className: "bg-accent-purple/10 text-accent-purple" },
  event:        { label: "Event",     className: "bg-amber-500/10 text-amber-700" },
  subscription: { label: "Langganan", className: "bg-surface-pink-soft text-accent-pink-strong" },
};


const PAGE_SIZE = 15;

export default function AdminTransaksiPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  // `search` is the input value; `appliedSearch` is what the last submit asked
  // for. Only the latter drives the fetch, so typing does not refetch per keystroke.
  const [appliedSearch, setAppliedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [summary, setSummary] = useState({ totalRevenue: 0, paidCount: 0, pendingCount: 0 });
  const [exporting, setExporting] = useState(false);
  // Bumped to force a refetch when the query itself did not change.
  const [reloadKey, setReloadKey] = useState(0);

  async function handleExportCSV() {
    const token = getToken();
    if (!token) return;
    setExporting(true);
    try {
      const res = await fetch("/api/admin/transactions/export", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Gagal mengunduh CSV");
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `transactions-export-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch {
      alert("Gagal mengekspor data transaksi.");
    } finally {
      setExporting(false);
    }
  }

  useEffect(() => {
    // `cancelled` makes the LAST requested page win: clicking next/prev quickly
    // fires overlapping requests, and without this an older, slower response
    // could overwrite the newer page's rows. Same guard as trainer-hub/payout.
    let cancelled = false;
    const token = getToken();
    if (!token) {
      setLoading(false);
      return;
    }
    const params = new URLSearchParams({
      page: String(page), limit: String(PAGE_SIZE),
      ...(appliedSearch ? { search: appliedSearch } : {}),
      ...(statusFilter !== "all" ? { status: statusFilter } : {}),
    });
    setLoading(true);
    setError("");
    (async () => {
      try {
        const r = await fetch(`/api/admin/orders?${params}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const d = (await r.json()) as OrderListResponse;
        if (cancelled) return;
        if (d.success) {
          setOrders(d.data);
          // Older API builds sent no `meta`; fall back to the row count so the
          // header never shows a total smaller than what is on screen.
          setTotal(d.meta?.total ?? d.data.length);
          // Summary is derived from the rows on screen only — the list endpoint
          // returns no aggregate. The card labels say so rather than passing a
          // per-page figure off as a platform total.
          const paid = d.data.filter((o) => o.status === "paid");
          setSummary({
            totalRevenue: paid.reduce((s, o) => s + Number(o.finalAmount), 0),
            paidCount: paid.length,
            pendingCount: d.data.filter((o) => o.status === "pending").length,
          });
        } else {
          setError(d.error?.message ?? "Gagal memuat daftar transaksi.");
        }
      } catch {
        if (!cancelled) setError("Gagal memuat daftar transaksi.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [page, statusFilter, appliedSearch, reloadKey]);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setPage(1);
    setAppliedSearch(search);
    // Re-submitting the same term leaves both deps unchanged, so nudge the key.
    setReloadKey((k) => k + 1);
  }

  const totalPages = Math.ceil(total / PAGE_SIZE);

  const summaryCards: { label: string; value: string | number; icon: LucideIcon; iconColor?: string; iconBg?: string }[] = [
    { label: "Pendapatan (halaman ini)", value: `Rp ${summary.totalRevenue.toLocaleString("id-ID")}`, icon: Wallet, iconColor: "#16a34a", iconBg: "rgba(22,163,74,0.1)" },
    { label: "Transaksi Lunas (halaman ini)", value: summary.paidCount, icon: CheckCircle2 },
    { label: "Menunggu Pembayaran (halaman ini)", value: summary.pendingCount, icon: Clock, iconColor: "#d97706", iconBg: "rgba(245,158,11,0.1)" },
  ];

  return (
    <div className="dash-container flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-extrabold text-text-primary">Laporan Transaksi</h1>
          <p className="mt-1 text-sm text-text-secondary">{total.toLocaleString("id-ID")} transaksi total</p>
        </div>
        <Button
          variant="secondary"
          size="sm"
          onClick={handleExportCSV}
          disabled={exporting}
          leftIcon={<Download size={16} aria-hidden="true" />}
        >
          {exporting ? "Mengekspor..." : "Ekspor CSV"}
        </Button>
      </div>

      {/* Summary cards */}
      <div className="dash-grid">
        {summaryCards.map(({ label, value, icon, iconColor, iconBg }) => (
          <StatCard key={label} className="col-span-12 sm:col-span-6 xl:col-span-3" label={label} value={value} icon={icon} iconColor={iconColor} iconBg={iconBg} />
        ))}
      </div>

      {/* Filters */}
      <FilterBar
        search={
          <form onSubmit={handleSearch} className="flex w-full items-end gap-2">
            <Input
              containerClassName="flex-1"
              leftIcon={<Search size={16} aria-hidden="true" />}
              placeholder="Cari nama pelanggan atau email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="Cari transaksi"
            />
            <Button type="submit" variant="cyan" size="sm" className="bg-accent-cyan-strong text-white hover:bg-accent-cyan-strong">Cari</Button>
          </form>
        }
        filters={
          <Tabs value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
            <TabsList className="flex-wrap">
              {["all", "paid", "pending", "failed", "expired", "refunded"].map((s) => (
                <TabsTrigger key={s} value={s}>
                  {s === "all" ? "Semua" : STATUS_LABEL[s] ?? s}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        }
      />

      {/* Table */}
      {loading ? (
        <DashboardLoading />
      ) : error ? (
        // Without this a failed request rendered the empty state, which reads as
        // "there are no transactions" — not "we could not load them".
        <DashboardError message={error} onRetry={() => setReloadKey((k) => k + 1)} />
      ) : orders.length === 0 ? (
        <EmptyState icon={CreditCard} title="Tidak ada transaksi ditemukan" description="Coba ubah kata kunci pencarian atau filter status." />
      ) : (
        <TableContainer>
            <Table className="min-w-[800px]">
              <THead>
                <TR className="hover:bg-transparent">
                  <TH>ID</TH>
                  <TH>Pelanggan</TH>
                  <TH>Produk</TH>
                  <TH>Metode</TH>
                  <TH>Status</TH>
                  <TH>Jumlah</TH>
                  <TH>Tanggal</TH>
                </TR>
              </THead>
              <TBody>
                {orders.map((order) => {
                  const title = order.items[0]?.itemTitle ?? "—";
                  const orig = Number(order.totalAmount);
                  const fin = Number(order.finalAmount);
                  const typePill = ITEM_TYPE_PILL[order.items[0]?.itemType ?? ""];
                  return (
                    <TR key={order.id}>
                      <TD>
                        <span className="whitespace-nowrap font-mono text-xs font-semibold text-accent-cyan-strong">#{order.id.slice(0, 8).toUpperCase()}</span>
                      </TD>
                      <TD>
                        <div className="flex items-center gap-3">
                          <Avatar name={order.user.name} size="sm" />
                          <div className="min-w-0">
                            <p className="font-semibold text-text-primary">{order.user.name}</p>
                            <p className="text-xs text-text-muted">{order.user.email}</p>
                          </div>
                        </div>
                      </TD>
                      <TD>
                        <p className="max-w-[180px] truncate">{title}</p>
                        <div className="mt-1 flex items-center gap-2">
                          {typePill && (
                            <span className={cn("inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide", typePill.className)}>
                              {typePill.label}
                            </span>
                          )}
                          {order.items.length > 1 && <span className="text-xs text-text-muted">+{order.items.length - 1} item</span>}
                        </div>
                      </TD>
                      <TD>
                        <span className="rounded-md bg-surface-sunken px-2 py-0.5 text-xs uppercase text-text-secondary">{order.paymentMethod ?? "—"}</span>
                      </TD>
                      <TD>
                        <Badge variant={STATUS_VARIANT[order.status] ?? "neutral"} dot>{STATUS_LABEL[order.status] ?? order.status}</Badge>
                      </TD>
                      <TD>
                        <p className="font-bold text-text-primary">Rp {(Number.isFinite(fin) ? fin : 0).toLocaleString("id-ID")}</p>
                        {Number.isFinite(orig) && orig > fin && (
                          <p className="text-xs text-text-muted line-through">Rp {orig.toLocaleString("id-ID")}</p>
                        )}
                      </TD>
                      <TD className="whitespace-nowrap text-text-secondary">
                        {new Date(order.createdAt).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}
                      </TD>
                    </TR>
                  );
                })}
              </TBody>
            </Table>

          {totalPages > 1 && (
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-solid border-border-default bg-surface-sunken px-6 py-4">
              <span className="text-sm text-text-secondary">Halaman {page} dari {totalPages}</span>
              <Pagination page={page} pageCount={totalPages} onPageChange={setPage} />
            </div>
          )}
        </TableContainer>
      )}
    </div>
  );
}
