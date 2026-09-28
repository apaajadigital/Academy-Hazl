"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Handshake, Wallet, Zap, Landmark, BarChart3, Rocket,
  MousePointerClick, Target, PiggyBank, Copy, Check, Banknote, Inbox,
} from "lucide-react";
import {
  Badge, Table, TableContainer, THead, TBody, TR, TH, TD,
  StatCard, Tabs, TabsList, TabsTrigger, TabsContent,
  EmptyState, Input, Button, DashboardLoading,
} from "@/components/ui";
import { cn } from "@/lib/utils";
import { getValidToken } from "@/lib/auth/token";

type AffiliateProfile = {
  id: string;
  code: string;
  totalClicks: number;
  totalConversions: number;
  totalEarnings: string;
  balance: string;
  commissionRate: string;
  status: string;
  commissions: {
    id: string;
    commissionAmt: string;
    grossAmount: string;
    status: string;
    createdAt: string;
    order: { id: string; finalAmount: string };
    // Optional on purpose: the API selects it, but a commission whose referred
    // user was deleted still has to render rather than take the page down.
    referredUser?: { name: string } | null;
  }[];
};

type Withdrawal = {
  id: string;
  amount: string;
  bankName: string;
  accountNo: string;
  status: string;
  requestedAt: string;
};

const STATUS_VARIANT: Record<string, "success" | "warning" | "info" | "danger"> = {
  pending:  "warning",
  settled:  "success",
  approved: "info",
  paid:     "success",
  rejected: "danger",
};

type WithdrawForm = { amount: string; bankName: string; accountNo: string; accountName: string };

/**
 * Withdrawal form fields. `min`/`step` only apply to the amount input.
 *
 * The amount hints mirror MIN_WITHDRAWAL_AMOUNT in api/src/routes/affiliate.ts.
 * This form used to advertise "Min. Rp 50.000" while the API enforced no floor
 * at all, so the stated minimum was decorative in both directions: a Rp 20.000
 * request was refused by the browser and a Rp 0,01 request went through via a
 * direct API call. The server is the authority; these are hints that must agree
 * with it.
 */
const WITHDRAW_FIELDS: ReadonlyArray<{
  key: keyof WithdrawForm;
  label: string;
  type: string;
  placeholder?: string;
  min?: string;
  step?: string;
}> = [
  { key: "amount", label: "Jumlah (Rp)", type: "number", placeholder: "Minimal Rp 10.000", min: "10000", step: "1000" },
  { key: "bankName", label: "Nama Bank", type: "text", placeholder: "BCA, BNI, Mandiri..." },
  { key: "accountNo", label: "Nomor Rekening", type: "text" },
  { key: "accountName", label: "Nama Pemilik", type: "text" },
];

/** Presentation-only money guard so a non-numeric string never renders "Rp NaN". */
function rp(value: string): string {
  const n = parseFloat(value);
  return Number.isFinite(n) ? `Rp ${n.toLocaleString("id-ID")}` : "Rp 0";
}

export default function AfiliasiPage() {
  const [profile, setProfile] = useState<AffiliateProfile | null>(null);
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [registering, setRegistering] = useState(false);
  const [tab, setTab] = useState<"komisi" | "penarikan">("komisi");
  const [form, setForm] = useState<WithdrawForm>({ amount: "", bankName: "", accountNo: "", accountName: "" });
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState("");
  const [msgType, setMsgType] = useState<"success" | "error">("success");
  const [copied, setCopied] = useState(false);
  const router = useRouter();

  const referralLink =
    typeof window !== "undefined" && profile
      ? `${window.location.origin}/?ref=${profile.code}`
      : "";

  // BL-125: every one of these calls used to go out WITHOUT an Authorization
  // header. `authenticate` runs on the whole affiliate router, so all four
  // returned 401 and the entire menu was dead — and because the failures were
  // swallowed below, it rendered as "you have no commissions yet" rather than as
  // an error anyone would report.
  useEffect(() => {
    async function load() {
      const token = await getValidToken();
      if (!token) {
        router.replace("/masuk");
        return;
      }
      const auth = { Authorization: `Bearer ${token}` };

      Promise.all([
        fetch("/api/affiliate/me", { headers: auth }).then((r) => r.json()),
        fetch("/api/affiliate/withdrawals", { headers: auth }).then((r) => r.json()),
      ])
        .then(([aff, wd]) => {
          // A failed profile load is an error, not an empty state. Rendering it as
          // "not registered yet" would invite the user to re-register an account
          // they already have.
          if (!aff.success) {
            setError(aff.error?.message ?? "Gagal memuat data afiliasi.");
            return;
          }
          if (aff.data) setProfile(aff.data);
          if (wd.success) setWithdrawals(wd.data ?? []);
          else setError(wd.error?.message ?? "Gagal memuat riwayat penarikan.");
        })
        .catch(() => setError("Gagal memuat data afiliasi."))
        .finally(() => setLoading(false));
    }
    load();
  }, [router]);

  async function register() {
    setRegistering(true);
    const token = await getValidToken();
    if (!token) {
      router.replace("/masuk");
      return;
    }
    const res = await fetch("/api/affiliate/register", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    if (data.success) setProfile({ ...data.data, commissions: [] });
    else setError(data.error?.message ?? "Gagal mendaftar program afiliasi.");
    setRegistering(false);
  }

  async function handleWithdraw(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setMsg("");
    const token = await getValidToken();
    if (!token) {
      router.replace("/masuk");
      return;
    }
    const res = await fetch("/api/affiliate/withdrawals", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ ...form, amount: parseFloat(form.amount) }),
    });
    const data = await res.json();
    if (data.success) {
      setWithdrawals((prev) => [data.data, ...prev]);
      setProfile((prev) =>
        prev ? { ...prev, balance: String(Number(prev.balance) - parseFloat(form.amount)) } : prev
      );
      setForm({ amount: "", bankName: "", accountNo: "", accountName: "" });
      setMsg("Permintaan penarikan berhasil dikirim.");
      setMsgType("success");
    } else {
      setMsg(data.error?.message ?? "Gagal mengirim permintaan.");
      setMsgType("error");
    }
    setSubmitting(false);
  }

  function copyLink() {
    navigator.clipboard.writeText(referralLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (loading) {
    return <DashboardLoading />;
  }

  // BL-125: a load failure must be visible. Falling through to the "join the
  // affiliate program" screen below would tell an affiliate who already has an
  // account — and unpaid commissions — that they have none.
  if (error) {
    return (
      <div className="dash-container flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center">
        <p className="font-display text-lg font-bold text-text-primary">Gagal memuat data afiliasi</p>
        <p className="max-w-md text-sm text-text-secondary">{error}</p>
        <Button onClick={() => window.location.reload()}>Coba lagi</Button>
      </div>
    );
  }

  if (!profile) {
    const benefits = [
      { Icon: Wallet, text: "Komisi 10% per transaksi" },
      { Icon: Zap, text: "Link unik untuk tracking" },
      { Icon: Landmark, text: "Tarik ke rekening bank kapan saja" },
      { Icon: BarChart3, text: "Dashboard statistik real-time" },
    ];
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="w-full max-w-lg rounded-[var(--radius-card)] border border-solid border-border-default bg-surface-card p-8 text-center shadow-e2">
          <span className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-surface-accent-soft text-accent-cyan-strong">
            <Handshake size={32} aria-hidden="true" />
          </span>
          <h1 className="font-display text-2xl font-extrabold text-text-primary">Bergabung Program Afiliasi</h1>
          <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-text-secondary">
            Dapatkan komisi untuk setiap referral yang berhasil bertransaksi di Hazl Academy.
            Tanpa modal, daftar gratis!
          </p>
          <div className="mt-6 flex flex-col gap-3 text-left">
            {benefits.map(({ Icon, text }) => (
              <div key={text} className="flex items-center gap-3 rounded-[var(--radius-md)] bg-surface-sunken px-4 py-3 text-sm text-text-primary">
                <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-surface-accent-soft text-accent-cyan-strong">
                  <Icon size={16} aria-hidden="true" />
                </span>
                <span>{text}</span>
              </div>
            ))}
          </div>
          <Button
            variant="primary"
            onClick={register}
            loading={registering}
            leftIcon={<Rocket size={18} aria-hidden="true" />}
            className="mt-8 w-full"
          >
            {registering ? "Mendaftar..." : "Daftar Sekarang — Gratis"}
          </Button>
        </div>
      </div>
    );
  }

  const statCards = [
    { label: "Total Klik", value: profile.totalClicks.toLocaleString("id-ID"), Icon: MousePointerClick, iconColor: "#0077A8", iconBg: "rgba(0,119,168,0.10)" },
    { label: "Konversi", value: profile.totalConversions.toLocaleString("id-ID"), Icon: Target, iconColor: "#D97706", iconBg: "rgba(217,119,6,0.10)" },
    { label: "Total Komisi", value: rp(profile.totalEarnings), Icon: Wallet, iconColor: "#16A34A", iconBg: "rgba(22,163,74,0.10)" },
    { label: "Saldo Tersedia", value: rp(profile.balance), Icon: PiggyBank, iconColor: "#FF2F86", iconBg: "rgba(255,47,134,0.10)" },
  ];

  return (
    <div className="dash-container flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="font-display text-2xl font-extrabold text-text-primary">Afiliasi Saya</h1>
            <Badge variant={profile.status === "active" ? "success" : "danger"} dot>
              {profile.status === "active" ? "Aktif" : "Nonaktif"}
            </Badge>
          </div>
          <p className="mt-1 text-sm text-text-secondary">Program referral Hazl Academy</p>
        </div>
        <div className="glass-card flex items-center gap-4 rounded-[var(--radius-card)] p-4 shadow-e1">
          <div className="flex flex-col">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-text-secondary">Saldo Komisi</span>
            <span className="font-display text-xl font-extrabold text-accent-cyan-strong">
              {rp(profile.balance)}
            </span>
          </div>
          <Button
            variant="primary"
            size="sm"
            onClick={() => setTab("penarikan")}
            leftIcon={<Banknote size={16} aria-hidden="true" />}
          >
            Tarik Dana
          </Button>
        </div>
      </div>

      {/* Stats */}
      <section className="dash-grid">
        {statCards.map(({ label, value, Icon, iconColor, iconBg }) => (
          <StatCard
            key={label}
            className="col-span-12 sm:col-span-6 xl:col-span-3"
            label={label}
            value={value}
            icon={Icon}
            iconColor={iconColor}
            iconBg={iconBg}
          />
        ))}
      </section>

      {/* Referral link card */}
      <div className="rounded-[var(--radius-card)] border border-solid border-border-default bg-surface-card p-6 shadow-e1">
        <p className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-text-secondary">Link Referral Anda</p>
        <div className="flex gap-2">
          <Input
            readOnly
            value={referralLink}
            aria-label="Link referral"
            containerClassName="flex-1"
          />
          <Button
            variant="cyan"
            onClick={copyLink}
            leftIcon={copied ? <Check size={15} aria-hidden="true" /> : <Copy size={15} aria-hidden="true" />}
            className={cn("shrink-0 whitespace-nowrap", copied && "!bg-green-500 !text-white")}
          >
            {copied ? "Tersalin!" : "Salin"}
          </Button>
        </div>
        <p className="mt-2 text-xs text-text-secondary">
          Kode: <strong className="text-text-primary">{profile.code}</strong>
          &ensp;·&ensp;
          Komisi: <strong className="text-text-primary">
            {Number.isFinite(parseFloat(profile.commissionRate)) ? parseFloat(profile.commissionRate).toFixed(0) : "0"}%
          </strong>
        </p>
      </div>

      {/* Tabs */}
      <Tabs
        value={tab}
        onValueChange={(v) => setTab(v as "komisi" | "penarikan")}
        className="flex flex-col gap-4"
      >
        <TabsList>
          <TabsTrigger value="komisi">Riwayat Komisi</TabsTrigger>
          <TabsTrigger value="penarikan">Penarikan Saldo</TabsTrigger>
        </TabsList>

        {/* Komisi tab */}
        <TabsContent value="komisi">
          {profile.commissions.length === 0 ? (
            <EmptyState
              icon={Inbox}
              title="Belum ada komisi"
              description="Bagikan link referral Anda untuk mulai mendapatkan komisi."
            />
          ) : (
            <TableContainer>
              <Table>
                <THead>
                  <TR>
                    <TH>Referral</TH>
                    <TH className="text-right">Nilai Order</TH>
                    <TH className="text-right">Komisi</TH>
                    <TH className="text-center">Status</TH>
                    <TH>Tanggal</TH>
                  </TR>
                </THead>
                <TBody>
                  {profile.commissions.map((c) => (
                    <TR key={c.id}>
                      <TD className="font-semibold text-text-primary">{c.referredUser?.name ?? "—"}</TD>
                      <TD className="text-right text-text-secondary">{rp(c.grossAmount)}</TD>
                      <TD className="text-right font-bold text-green-600">+{rp(c.commissionAmt)}</TD>
                      <TD className="text-center">
                        <Badge variant={STATUS_VARIANT[c.status] ?? "warning"}>{c.status}</Badge>
                      </TD>
                      <TD className="text-text-muted">{new Date(c.createdAt).toLocaleDateString("id-ID")}</TD>
                    </TR>
                  ))}
                </TBody>
              </Table>
            </TableContainer>
          )}
        </TabsContent>

        {/* Penarikan tab */}
        <TabsContent value="penarikan" className="flex flex-col gap-6">
          <div className="bg-brand-gradient flex items-center justify-between rounded-[var(--radius-card)] px-6 py-4 text-white shadow-e1">
            <span className="text-sm text-white/70">Saldo Tersedia</span>
            <span className="font-display text-xl font-extrabold">
              {rp(profile.balance)}
            </span>
          </div>

          <form onSubmit={handleWithdraw} className="flex flex-col gap-4">
            <h3 className="font-display text-base font-bold text-text-primary">Ajukan Penarikan</h3>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {WITHDRAW_FIELDS.map(({ key, label, type, placeholder, min, step }) => (
                <Input
                  key={key}
                  label={label}
                  type={type}
                  required
                  min={min}
                  step={step}
                  value={form[key]}
                  onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                  placeholder={placeholder}
                />
              ))}
            </div>

            {msg && (
              <div
                className={cn(
                  "rounded-[var(--radius-md)] border border-solid px-4 py-3 text-sm",
                  msgType === "error"
                    ? "border-red-200 bg-red-50 text-red-700"
                    : "border-green-200 bg-green-50 text-green-700"
                )}
              >
                {msg}
              </div>
            )}

            <Button
              type="submit"
              variant="primary"
              size="sm"
              loading={submitting}
              leftIcon={<Banknote size={16} aria-hidden="true" />}
              className="self-start"
            >
              {submitting ? "Mengirim..." : "Ajukan Penarikan"}
            </Button>
          </form>

          {withdrawals.length > 0 && (
            <div>
              <h3 className="font-display text-base font-bold text-text-primary">Riwayat Penarikan</h3>
              <div className="mt-2 flex flex-col gap-2">
                {withdrawals.map((w) => (
                  <div key={w.id} className="flex items-center justify-between rounded-[var(--radius-md)] bg-surface-sunken px-4 py-3">
                    <div>
                      <p className="text-sm font-bold text-text-primary">{rp(w.amount)}</p>
                      <p className="mt-0.5 text-[11px] text-text-secondary">{w.bankName} · {w.accountNo}</p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <Badge variant={STATUS_VARIANT[w.status] ?? "warning"}>{w.status}</Badge>
                      <p className="text-[11px] text-text-muted">{new Date(w.requestedAt).toLocaleDateString("id-ID")}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
