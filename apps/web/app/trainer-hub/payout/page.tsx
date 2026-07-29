"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Info, Wallet } from "lucide-react";
import {
  Badge,
  Button,
  Card,
  Input,
  Table,
  TableContainer,
  THead,
  TBody,
  TR,
  TH,
  TD,
  EmptyState,
  PageHeader,
  Pagination,
  DashboardLoading,
  DashboardError,
} from "@/components/ui";
import { getValidToken } from "@/lib/auth/token";

type Payout = {
  id: string;
  amount: string;
  bankName: string;
  accountNo: string;
  accountName: string;
  status: string;
  note: string | null;
  requestedAt: string;
  processedAt: string | null;
};

/** Envelope of GET /api/trainer/payouts — `meta` is `PaginationMeta` (api/src/lib/pagination.ts). */
type PayoutListResponse =
  | { success: true; data: Payout[]; meta?: { total: number; page: number; limit: number } }
  | { success: false; error?: { message?: string } };

type PayoutCreateResponse =
  | { success: true; data: Payout }
  | { success: false; error?: { message?: string } };

// Mirrors the backend default page size; sent explicitly so the client never
// depends on the server default staying at 20.
const PAGE_SIZE = 20;

const STATUS_VARIANT: Record<string, "warning" | "info" | "danger" | "success"> = {
  pending: "warning",
  approved: "info",
  rejected: "danger",
  paid: "success",
};
const STATUS_LABEL: Record<string, string> = {
  pending: "Menunggu", approved: "Disetujui", rejected: "Ditolak", paid: "Dibayar",
};

export default function TrainerPayoutPage() {
  const router = useRouter();
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  // Bumped after a successful submit to force a refetch even when `page` is
  // already 1 (a no-op setPage would not re-run the effect).
  const [reloadKey, setReloadKey] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState("");
  const [form, setForm] = useState({ amount: "", bankName: "", accountNo: "", accountName: "" });

  useEffect(() => {
    // `cancelled` makes the LAST requested page win: clicking next/prev quickly
    // fires overlapping requests, and without this an older, slower response
    // could overwrite the newer page's rows.
    let cancelled = false;
    (async () => {
      const token = await getValidToken();
      if (!token) { router.replace("/masuk"); return; }
      setLoading(true);
      setError("");
      try {
        const r = await fetch(`/api/trainer/payouts?page=${page}&limit=${PAGE_SIZE}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const d = (await r.json()) as PayoutListResponse;
        if (cancelled) return;
        if (d.success) {
          setPayouts(d.data);
          // Older API builds sent no `meta`; fall back to the row count so the
          // header never shows a total smaller than what is on screen.
          setTotal(d.meta?.total ?? d.data.length);
        } else {
          setError(d.error?.message ?? "Gagal memuat riwayat penarikan.");
        }
      } catch {
        if (!cancelled) setError("Gagal memuat riwayat penarikan.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [page, reloadKey, router]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setMsg("");
    const token = await getValidToken();
    if (!token) { router.replace("/masuk"); return; }
    try {
      const res = await fetch("/api/trainer/payouts", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ ...form, amount: parseFloat(form.amount) }),
      });
      const data = (await res.json()) as PayoutCreateResponse;
      if (data.success) {
        setForm({ amount: "", bankName: "", accountNo: "", accountName: "" });
        setMsg("Permintaan penarikan berhasil dikirim.");
        // The list is ordered requestedAt DESC, so a brand-new payout always
        // lands on page 1. Prepending to the current page would show it in the
        // wrong slice and desync `total`; jump back to page 1 and refetch so the
        // trainer actually sees the request they just made.
        setPage(1);
        setReloadKey((k) => k + 1);
      } else {
        setMsg(data.error?.message ?? "Gagal mengirim permintaan.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="dash-container flex flex-col gap-8">
      <PageHeader
        title="Penarikan Saldo"
        breadcrumb={
          <span className="flex items-center gap-2">
            <Link href="/trainer-hub" className="text-accent-cyan-strong hover:underline">Trainer Hub</Link>
            <span className="text-text-secondary">/</span>
            <span className="font-medium text-text-primary">Penarikan Saldo</span>
          </span>
        }
      />

      <Card className="p-6">
        <h3 className="mb-4 font-display text-base font-bold text-text-primary">Ajukan Penarikan</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input
              label="Jumlah (Rp)"
              type="number" min="100000" step="1000" required
              value={form.amount}
              onChange={(e) => setForm({ ...form, amount: e.target.value })}
              placeholder="Minimal Rp 100.000"
            />
            <Input
              label="Nama Bank"
              type="text" required
              value={form.bankName}
              onChange={(e) => setForm({ ...form, bankName: e.target.value })}
              placeholder="Contoh: BCA, BNI, Mandiri"
            />
            <Input
              label="Nomor Rekening"
              type="text" required
              value={form.accountNo}
              onChange={(e) => setForm({ ...form, accountNo: e.target.value })}
            />
            <Input
              label="Nama Pemilik Rekening"
              type="text" required
              value={form.accountName}
              onChange={(e) => setForm({ ...form, accountName: e.target.value })}
            />
          </div>
          <p className="flex items-start gap-2 text-xs text-text-secondary">
            <Info size={14} className="mt-0.5 flex-shrink-0 text-text-muted" aria-hidden="true" />
            Penarikan diproses dalam 1–3 hari kerja. Minimal Rp 100.000.
          </p>
          <div className="flex items-center gap-3">
            <Button type="submit" variant="cyan" size="sm" disabled={submitting} loading={submitting}>
              {submitting ? "Mengirim..." : "Ajukan Penarikan"}
            </Button>
            {msg && <p className="text-sm text-accent-cyan-strong">{msg}</p>}
          </div>
        </form>
      </Card>

      <section className="flex flex-col gap-4">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="font-display text-lg font-bold text-text-primary">Riwayat Penarikan</h2>
          {!loading && !error && total > 0 && (
            <p className="text-sm text-text-secondary">
              Menampilkan {payouts.length} dari {total} penarikan
            </p>
          )}
        </div>
        {loading ? (
          <DashboardLoading />
        ) : error ? (
          <DashboardError message={error} onRetry={() => setReloadKey((k) => k + 1)} />
        ) : payouts.length === 0 ? (
          <EmptyState
            icon={Wallet}
            title="Belum ada riwayat penarikan"
            description="Permintaan penarikan yang Anda ajukan akan muncul di sini."
          />
        ) : (
          <TableContainer>
            <Table>
              <THead>
                <TR>
                  <TH>Jumlah</TH>
                  <TH>Bank</TH>
                  <TH>Tanggal</TH>
                  <TH>Status</TH>
                  <TH>Catatan</TH>
                </TR>
              </THead>
              <TBody>
                {payouts.map((p) => {
                  const amount = parseFloat(p.amount);
                  return (
                    <TR key={p.id}>
                      <TD className="font-semibold text-text-primary">
                        Rp {Number.isFinite(amount) ? amount.toLocaleString("id-ID") : "0"}
                      </TD>
                      <TD className="text-text-secondary">{p.bankName} · {p.accountNo}</TD>
                      <TD className="text-xs text-text-secondary">{new Date(p.requestedAt).toLocaleDateString("id-ID")}</TD>
                      <TD>
                        <Badge variant={STATUS_VARIANT[p.status] ?? "neutral"} dot>
                          {STATUS_LABEL[p.status] ?? p.status}
                        </Badge>
                      </TD>
                      <TD className="text-xs text-text-secondary">{p.note ?? "—"}</TD>
                    </TR>
                  );
                })}
              </TBody>
            </Table>

            {/* Pagination footer — same shape as dashboard/pesanan. */}
            {totalPages > 1 && (
              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-solid border-border-default bg-surface-sunken px-6 py-4">
                <span className="text-sm text-text-secondary">Halaman {page} dari {totalPages}</span>
                <Pagination page={page} pageCount={totalPages} onPageChange={setPage} />
              </div>
            )}
          </TableContainer>
        )}
      </section>
    </div>
  );
}
