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
  DashboardLoading,
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
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState("");
  const [form, setForm] = useState({ amount: "", bankName: "", accountNo: "", accountName: "" });

  useEffect(() => {
    (async () => {
      const token = await getValidToken();
      if (!token) { router.replace("/masuk"); return; }
      try {
        const r = await fetch("/api/trainer/payouts", {
          headers: { Authorization: `Bearer ${token}` },
        });
        const d = await r.json();
        if (d.success) setPayouts(d.data);
      } finally {
        setLoading(false);
      }
    })();
  }, [router]);

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
      const data = await res.json();
      if (data.success) {
        setPayouts((prev) => [data.data, ...prev]);
        setForm({ amount: "", bankName: "", accountNo: "", accountName: "" });
        setMsg("Permintaan penarikan berhasil dikirim.");
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
        <h2 className="font-display text-lg font-bold text-text-primary">Riwayat Penarikan</h2>
        {loading ? (
          <DashboardLoading />
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
          </TableContainer>
        )}
      </section>
    </div>
  );
}
