"use client";

import { useEffect, useState } from "react";
import { Search, Settings, Check, Inbox, Clock, Users, CheckCircle2, Wallet } from "lucide-react";
import { getValidToken } from "@/lib/auth/token";
import {
  Button,
  Input,
  Textarea,
  Badge,
  type BadgeProps,
  Modal,
  ModalContent,
  Tabs,
  TabsList,
  TabsTrigger,
  FilterBar,
  DashboardLoading,
  TableActionButton,
  TableContainer,
  Table,
  THead,
  TBody,
  TR,
  TH,
  TD,
  Pagination,
  StatCard,
} from "@/components/ui";
import { EmptyState } from "@/components/ui/EmptyState";

type TrainerPayout = {
  id: string;
  amount: string;
  bankName: string;
  accountNo: string;
  accountName: string;
  status: string;
  note: string | null;
  requestedAt: string;
  processedAt: string | null;
  trainer: { id: string; name: string; email: string };
};

type AffiliateWithdrawal = {
  id: string;
  amount: string;
  bankName: string;
  accountNo: string;
  accountName: string;
  status: string;
  note: string | null;
  requestedAt: string;
  processedAt: string | null;
  affiliate: { id: string; code: string; user: { id: string; name: string; email: string } };
};

type Stats = {
  trainer: { pending: number; approved: number; paid: number; pendingAmount: number };
  affiliate: { pending: number; approved: number; paid: number; pendingAmount: number };
};

const STATUS_MAP: Record<string, { label: string; variant: BadgeProps["variant"] }> = {
  pending:  { label: "Menunggu",  variant: "warning" },
  approved: { label: "Disetujui", variant: "info" },
  rejected: { label: "Ditolak",   variant: "danger" },
  paid:     { label: "Dibayar",   variant: "success" },
};

export default function AdminPayoutPage() {
  const [tab, setTab] = useState<"trainer" | "affiliate">("trainer");
  const [stats, setStats] = useState<Stats | null>(null);

  // Trainer state
  const [trainerPayouts, setTrainerPayouts] = useState<TrainerPayout[]>([]);
  const [trainerTotal, setTrainerTotal] = useState(0);
  const [trainerPage, setTrainerPage] = useState(1);
  const [trainerLoading, setTrainerLoading] = useState(true);

  // Affiliate state
  const [affWithdrawals, setAffWithdrawals] = useState<AffiliateWithdrawal[]>([]);
  const [affTotal, setAffTotal] = useState(0);
  const [affPage, setAffPage] = useState(1);
  const [affLoading, setAffLoading] = useState(true);

  // Common
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");
  const limit = 15;

  // Modal
  const [modalItem, setModalItem] = useState<TrainerPayout | AffiliateWithdrawal | null>(null);
  const [modalTab, setModalTab] = useState<"trainer" | "affiliate">("trainer");
  const [modalAction, setModalAction] = useState<"approved" | "rejected" | "paid" | null>(null);
  const [modalNote, setModalNote] = useState("");
  const [modalSaving, setModalSaving] = useState(false);

  // ─── Load Stats ────────────────────────────────────────────────────────────
  async function loadStats() {
    const token = await getValidToken();
    if (!token) return;
    try {
      const r = await fetch("/api/admin/payouts/stats", { headers: { Authorization: `Bearer ${token}` } });
      const d = await r.json();
      if (d.success) setStats(d.data);
    } catch { /* ignore */ }
  }

  // ─── Load Trainer Payouts ──────────────────────────────────────────────────
  async function loadTrainer() {
    const token = await getValidToken();
    if (!token) return;
    setTrainerLoading(true);
    const params = new URLSearchParams({
      page: String(trainerPage), limit: String(limit),
      ...(search ? { search } : {}),
      ...(statusFilter !== "all" ? { status: statusFilter } : {}),
    });
    try {
      const r = await fetch(`/api/admin/payouts/trainer?${params}`, { headers: { Authorization: `Bearer ${token}` } });
      const d = await r.json();
      if (d.success) {
        setTrainerPayouts(d.data?.payouts ?? []);
        setTrainerTotal(d.data?.total ?? 0);
      }
    } finally { setTrainerLoading(false); }
  }

  // ─── Load Affiliate Withdrawals ────────────────────────────────────────────
  async function loadAffiliate() {
    const token = await getValidToken();
    if (!token) return;
    setAffLoading(true);
    const params = new URLSearchParams({
      page: String(affPage), limit: String(limit),
      ...(search ? { search } : {}),
      ...(statusFilter !== "all" ? { status: statusFilter } : {}),
    });
    try {
      const r = await fetch(`/api/admin/payouts/affiliate?${params}`, { headers: { Authorization: `Bearer ${token}` } });
      const d = await r.json();
      if (d.success) {
        setAffWithdrawals(d.data?.withdrawals ?? []);
        setAffTotal(d.data?.total ?? 0);
      }
    } finally { setAffLoading(false); }
  }

  useEffect(() => { loadStats(); }, []);
  useEffect(() => { if (tab === "trainer") loadTrainer(); }, [trainerPage, statusFilter, tab]); // eslint-disable-line
  useEffect(() => { if (tab === "affiliate") loadAffiliate(); }, [affPage, statusFilter, tab]); // eslint-disable-line

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (tab === "trainer") { setTrainerPage(1); loadTrainer(); }
    else { setAffPage(1); loadAffiliate(); }
  }

  function handleSwitchTab(t: "trainer" | "affiliate") {
    setTab(t);
    setStatusFilter("all");
    setSearch("");
  }

  // ─── Modal ─────────────────────────────────────────────────────────────────
  function openModal(item: TrainerPayout | AffiliateWithdrawal, type: "trainer" | "affiliate") {
    setModalItem(item);
    setModalTab(type);
    setModalAction(null);
    setModalNote("");
  }

  async function handleModalSubmit() {
    if (!modalItem || !modalAction) return;
    if (modalAction === "rejected" && !modalNote.trim()) {
      alert("Silakan masukkan alasan penolakan.");
      return;
    }
    setModalSaving(true);
    const token = await getValidToken();
    if (!token) return;
    try {
      const endpoint = modalTab === "trainer"
        ? `/api/admin/payouts/trainer/${modalItem.id}`
        : `/api/admin/payouts/affiliate/${modalItem.id}`;
      const r = await fetch(endpoint, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ status: modalAction, note: modalNote || undefined }),
      });
      const d = await r.json();
      if (d.success) {
        setModalItem(null);
        loadStats();
        if (modalTab === "trainer") loadTrainer();
        else loadAffiliate();
      } else {
        alert(d.error?.message ?? "Gagal memperbarui status.");
      }
    } catch {
      alert("Gagal menghubungi server.");
    } finally {
      setModalSaving(false);
    }
  }

  const trainerPages = Math.ceil(trainerTotal / limit);
  const affPages = Math.ceil(affTotal / limit);

  const kpiCards = stats ? [
    { label: "Trainer Pending", value: stats.trainer.pending, color: "#B45309", icon: Clock },
    { label: "Afiliator Pending", value: stats.affiliate.pending, color: "#B45309", icon: Users },
    { label: "Total Sudah Dibayar", value: stats.trainer.paid + stats.affiliate.paid, color: "#16A34A", icon: CheckCircle2 },
    { label: "Nominal Pending", value: `Rp ${(stats.trainer.pendingAmount + stats.affiliate.pendingAmount).toLocaleString("id-ID")}`, color: "#0077A8", icon: Wallet },
  ] : [];

  // Semantic action-select button styling (money moderation controls).
  const actBtn = (active: boolean, tone: "approve" | "reject" | "paid") => {
    const base = "rounded-xl border-2 px-4 py-2 text-sm font-bold transition-colors";
    if (tone === "approve") return `${base} ${active ? "border-green-700 bg-green-600 text-white" : "border-transparent bg-green-600/10 text-green-700 hover:bg-green-600 hover:text-white"}`;
    if (tone === "reject") return `${base} ${active ? "border-red-700 bg-red-600 text-white" : "border-transparent bg-red-600/10 text-red-700 hover:bg-red-600 hover:text-white"}`;
    return `${base} ${active ? "border-[#005f87] bg-accent-cyan-strong text-white" : "border-transparent bg-surface-accent-soft text-accent-cyan-strong hover:bg-accent-cyan-strong hover:text-white"}`;
  };

  return (
    <div className="dash-container flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-extrabold text-text-primary">Pencatatan Payout</h1>
          <p className="mt-1 text-sm text-text-secondary">Kelola penarikan saldo Trainer &amp; Afiliator</p>
        </div>
      </div>

      {/* KPI Cards */}
      {stats && (
        <div className="dash-grid">
          {kpiCards.map((k) => (
            <StatCard
              key={k.label}
              className="col-span-12 sm:col-span-6 xl:col-span-3"
              label={k.label}
              value={k.value}
              icon={k.icon}
              iconColor={k.color}
              iconBg={`${k.color}18`}
            />
          ))}
        </div>
      )}

      {/* Tabs */}
      <div className="flex flex-col gap-3">
        <Tabs value={tab} onValueChange={(v) => handleSwitchTab(v as "trainer" | "affiliate")}>
          <TabsList>
            <TabsTrigger value="trainer" data-testid="tab-trainer">👨‍🏫 Trainer</TabsTrigger>
            <TabsTrigger value="affiliate" data-testid="tab-affiliate">🤝 Afiliator</TabsTrigger>
          </TabsList>
        </Tabs>

        <FilterBar
          search={
            <form onSubmit={handleSearch} className="flex items-end gap-2">
              <Input className="min-w-[200px]" containerClassName="flex-1" placeholder="Cari nama..." value={search} onChange={(e) => setSearch(e.target.value)} leftIcon={<Search size={16} aria-hidden="true" />} />
              <Button type="submit" variant="cyan" size="sm" aria-label="Cari"><Search size={16} aria-hidden="true" /></Button>
            </form>
          }
          filters={
            <Tabs
              value={statusFilter}
              onValueChange={(s) => { setStatusFilter(s); if (tab === "trainer") setTrainerPage(1); else setAffPage(1); }}
            >
              <TabsList className="flex-wrap">
                {["all", "pending", "approved", "rejected", "paid"].map((s) => (
                  <TabsTrigger key={s} value={s}>
                    {s === "all" ? "Semua" : STATUS_MAP[s]?.label ?? s}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          }
        />
      </div>

      {/* Table */}
      {tab === "trainer" ? (
        trainerLoading ? (
          <DashboardLoading />
        ) : trainerPayouts.length === 0 ? (
          <EmptyState icon={Inbox} title="Tidak ada data payout trainer." />
        ) : (
          <TableContainer>
            <Table className="min-w-[800px]">
              <THead>
                <TR className="hover:bg-transparent">
                  <TH>Trainer</TH><TH>Bank / Rekening</TH><TH>Jumlah</TH><TH>Tanggal</TH><TH>Status</TH><TH>Catatan</TH><TH>Aksi</TH>
                </TR>
              </THead>
              <TBody>
                {trainerPayouts.map((p) => {
                  const st = STATUS_MAP[p.status] ?? STATUS_MAP["pending"]!;
                  return (
                    <TR key={p.id}>
                      <TD className="py-3">
                        <div className="flex items-center gap-3">
                          <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-brand-gradient text-[11px] font-extrabold text-white">
                            {(p.trainer.name ?? "?").slice(0, 2).toUpperCase()}
                          </span>
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-text-primary">{p.trainer.name}</p>
                            <p className="truncate text-xs text-text-muted">{p.trainer.email}</p>
                          </div>
                        </div>
                      </TD>
                      <TD className="py-3">
                        <p className="text-sm text-text-primary">{p.bankName}</p>
                        <p className="text-xs text-text-muted">{p.accountNo} · {p.accountName}</p>
                      </TD>
                      <TD className="py-3"><span className="text-sm font-bold text-text-primary">Rp {parseFloat(p.amount).toLocaleString("id-ID")}</span></TD>
                      <TD className="py-3">
                        <p className="text-xs text-text-secondary">{new Date(p.requestedAt).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" })}</p>
                        {p.processedAt && <p className="text-[10px] text-text-muted">Diproses: {new Date(p.processedAt).toLocaleDateString("id-ID")}</p>}
                      </TD>
                      <TD className="py-3"><Badge variant={st.variant}>{st.label}</Badge></TD>
                      <TD className="py-3"><span className="block max-w-[140px] truncate text-xs text-text-secondary">{p.note ?? "—"}</span></TD>
                      <TD className="py-3">
                        {p.status === "pending" || p.status === "approved" ? (
                          <TableActionButton variant="neutral" leftIcon={<Settings size={13} aria-hidden="true" />} onClick={() => openModal(p, "trainer")}>Kelola</TableActionButton>
                        ) : (
                          <Check size={16} className="text-green-600" />
                        )}
                      </TD>
                    </TR>
                  );
                })}
              </TBody>
            </Table>
          </TableContainer>
        )
      ) : (
        affLoading ? (
          <DashboardLoading />
        ) : affWithdrawals.length === 0 ? (
          <EmptyState icon={Inbox} title="Tidak ada data withdrawal afiliator." />
        ) : (
          <TableContainer>
            <Table className="min-w-[800px]">
              <THead>
                <TR className="hover:bg-transparent">
                  <TH>Afiliator</TH><TH>Bank / Rekening</TH><TH>Jumlah</TH><TH>Tanggal</TH><TH>Status</TH><TH>Catatan</TH><TH>Aksi</TH>
                </TR>
              </THead>
              <TBody>
                {affWithdrawals.map((w) => {
                  const st = STATUS_MAP[w.status] ?? STATUS_MAP["pending"]!;
                  return (
                    <TR key={w.id}>
                      <TD className="py-3">
                        <div className="flex items-center gap-3">
                          <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-brand-gradient text-[11px] font-extrabold text-white">
                            {(w.affiliate.user.name ?? "?").slice(0, 2).toUpperCase()}
                          </span>
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-text-primary">{w.affiliate.user.name}</p>
                            <p className="truncate text-xs text-text-muted">{w.affiliate.user.email}</p>
                            <p className="mt-0.5 text-[10px] font-semibold text-accent-cyan-strong">Kode: {w.affiliate.code}</p>
                          </div>
                        </div>
                      </TD>
                      <TD className="py-3">
                        <p className="text-sm text-text-primary">{w.bankName}</p>
                        <p className="text-xs text-text-muted">{w.accountNo} · {w.accountName}</p>
                      </TD>
                      <TD className="py-3"><span className="text-sm font-bold text-text-primary">Rp {parseFloat(w.amount).toLocaleString("id-ID")}</span></TD>
                      <TD className="py-3">
                        <p className="text-xs text-text-secondary">{new Date(w.requestedAt).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" })}</p>
                        {w.processedAt && <p className="text-[10px] text-text-muted">Diproses: {new Date(w.processedAt).toLocaleDateString("id-ID")}</p>}
                      </TD>
                      <TD className="py-3"><Badge variant={st.variant}>{st.label}</Badge></TD>
                      <TD className="py-3"><span className="block max-w-[140px] truncate text-xs text-text-secondary">{w.note ?? "—"}</span></TD>
                      <TD className="py-3">
                        {w.status === "pending" || w.status === "approved" ? (
                          <TableActionButton variant="neutral" leftIcon={<Settings size={13} aria-hidden="true" />} onClick={() => openModal(w, "affiliate")}>Kelola</TableActionButton>
                        ) : (
                          <Check size={16} className="text-green-600" />
                        )}
                      </TD>
                    </TR>
                  );
                })}
              </TBody>
            </Table>
          </TableContainer>
        )
      )}

      {/* Pagination */}
      {tab === "trainer" && trainerPages > 1 && (
        <div className="flex justify-center">
          <Pagination page={trainerPage} pageCount={trainerPages} onPageChange={setTrainerPage} />
        </div>
      )}
      {tab === "affiliate" && affPages > 1 && (
        <div className="flex justify-center">
          <Pagination page={affPage} pageCount={affPages} onPageChange={setAffPage} />
        </div>
      )}

      {/* Modal */}
      <Modal open={modalItem !== null} onOpenChange={(o) => { if (!o) setModalItem(null); }}>
        {modalItem && (
          <ModalContent
            title="Kelola Payout"
            footer={
              <>
                <Button variant="ghost" size="sm" onClick={() => setModalItem(null)} disabled={modalSaving}>Batal</Button>
                {modalAction && (
                  <button
                    className={`rounded-lg px-4 py-2 text-sm font-bold text-white transition-colors disabled:opacity-50 ${
                      modalAction === "approved" ? "bg-green-600 hover:bg-green-700" :
                      modalAction === "rejected" ? "bg-red-600 hover:bg-red-700" :
                      "bg-accent-cyan-strong hover:bg-[#005f87]"
                    }`}
                    onClick={handleModalSubmit}
                    disabled={modalSaving}
                  >
                    {modalSaving ? "Memproses..." :
                      modalAction === "approved" ? "✓ Konfirmasi Setujui" :
                      modalAction === "rejected" ? "✕ Konfirmasi Tolak" :
                      "💰 Konfirmasi Dibayar"}
                  </button>
                )}
              </>
            }
          >
            <div className="flex flex-col gap-5">
              {/* Summary */}
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1 rounded-[var(--radius-md)] border border-solid border-border-default bg-surface-sunken px-4 py-3">
                  <span className="text-[10px] font-bold uppercase text-text-muted">Nama</span>
                  <span className="text-sm font-semibold text-text-primary">
                    {modalTab === "trainer"
                      ? (modalItem as TrainerPayout).trainer.name
                      : (modalItem as AffiliateWithdrawal).affiliate.user.name}
                  </span>
                </div>
                <div className="flex flex-col gap-1 rounded-[var(--radius-md)] border border-solid border-border-default bg-surface-sunken px-4 py-3">
                  <span className="text-[10px] font-bold uppercase text-text-muted">Jumlah</span>
                  <span className="text-sm font-bold text-text-primary">Rp {parseFloat(modalItem.amount).toLocaleString("id-ID")}</span>
                </div>
                <div className="flex flex-col gap-1 rounded-[var(--radius-md)] border border-solid border-border-default bg-surface-sunken px-4 py-3">
                  <span className="text-[10px] font-bold uppercase text-text-muted">Bank</span>
                  <span className="text-sm font-semibold text-text-primary">{modalItem.bankName} — {modalItem.accountNo} ({modalItem.accountName})</span>
                </div>
                <div className="flex flex-col gap-1 rounded-[var(--radius-md)] border border-solid border-border-default bg-surface-sunken px-4 py-3">
                  <span className="text-[10px] font-bold uppercase text-text-muted">Status Saat Ini</span>
                  <span><Badge variant={STATUS_MAP[modalItem.status]?.variant ?? "neutral"}>{STATUS_MAP[modalItem.status]?.label ?? modalItem.status}</Badge></span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex flex-col gap-3">
                <h3 className="text-xs font-bold uppercase tracking-wide text-text-primary">Pilih Tindakan</h3>
                <div className="flex gap-2">
                  {modalItem.status === "pending" && (
                    <button
                      className={actBtn(modalAction === "approved", "approve")}
                      onClick={() => { setModalAction("approved"); setModalNote(""); }}
                    >
                      ✓ Setujui
                    </button>
                  )}
                  {modalItem.status === "pending" && (
                    <button
                      className={actBtn(modalAction === "rejected", "reject")}
                      onClick={() => { setModalAction("rejected"); setModalNote(""); }}
                    >
                      ✕ Tolak
                    </button>
                  )}
                  {(modalItem.status === "pending" || modalItem.status === "approved") && (
                    <button
                      className={actBtn(modalAction === "paid", "paid")}
                      onClick={() => { setModalAction("paid"); setModalNote(""); }}
                    >
                      💰 Tandai Dibayar
                    </button>
                  )}
                </div>
              </div>

              {/* Note input */}
              {modalAction && (
                <Textarea
                  label={modalAction === "rejected" ? "Alasan Penolakan (Wajib)" : modalAction === "paid" ? "Referensi Transfer (Opsional)" : "Catatan (Opsional)"}
                  rows={3}
                  placeholder={
                    modalAction === "rejected" ? "Contoh: Nomor rekening tidak valid..."
                    : modalAction === "paid" ? "Contoh: Transfer BCA #12345 tanggal 17 Jul 2026"
                    : "Catatan tambahan..."
                  }
                  value={modalNote}
                  onChange={(e) => setModalNote(e.target.value)}
                />
              )}
            </div>
          </ModalContent>
        )}
      </Modal>
    </div>
  );
}
