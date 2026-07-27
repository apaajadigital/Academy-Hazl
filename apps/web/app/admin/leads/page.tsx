"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Search, X, Download, ClipboardList, Loader2 } from "lucide-react";
import { Button, Input, Pagination, Table, THead, TBody, TR, TH, TD } from "@/components/ui";
import { EmptyState } from "@/components/ui/EmptyState";
import { cn } from "@/lib/utils";
import { getToken } from "@/lib/auth/token";

// ─── Types ────────────────────────────────────────────────────────────────────

type Lead = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  company: string | null;
  message: string | null;
  source: string;
  status: string;
  createdAt: string;
  updatedAt: string;
};

type Meta = { total: number; page: number; limit: number };

// ─── Constants ────────────────────────────────────────────────────────────────

const SOURCES = [
  { value: "", label: "Semua Sumber" },
  { value: "lms", label: "LMS B2B" },
  { value: "affiliate", label: "Afiliasi" },
  { value: "trainer", label: "Trainer" },
  { value: "free-class", label: "Kelas Gratis" },
  { value: "other", label: "Lainnya" },
] as const;

const STATUSES = [
  { value: "", label: "Semua Status" },
  { value: "new", label: "Baru" },
  { value: "contacted", label: "Dihubungi" },
  { value: "qualified", label: "Qualified" },
  { value: "converted", label: "Konversi" },
  { value: "archived", label: "Arsip" },
] as const;

const SOURCE_STYLE: Record<string, { bg: string; text: string; label: string }> = {
  lms:        { bg: "rgba(0,119,168,0.1)",    text: "#0077A8", label: "LMS B2B" },
  affiliate:  { bg: "rgba(124,58,237,0.1)",   text: "#7C3AED", label: "Afiliasi" },
  trainer:    { bg: "rgba(234,179,8,0.12)",   text: "#A16207", label: "Trainer" },
  "free-class": { bg: "rgba(22,163,74,0.1)", text: "#15803D", label: "Kelas Gratis" },
  other:      { bg: "rgba(107,114,128,0.1)",  text: "#6B7280", label: "Lainnya" },
};

const STATUS_STYLE: Record<string, { bg: string; text: string; label: string }> = {
  new:       { bg: "rgba(59,130,246,0.1)",   text: "#2563EB", label: "Baru" },
  contacted: { bg: "rgba(234,179,8,0.12)",   text: "#A16207", label: "Dihubungi" },
  qualified: { bg: "rgba(124,58,237,0.1)",   text: "#7C3AED", label: "Qualified" },
  converted: { bg: "rgba(22,163,74,0.1)",    text: "#15803D", label: "Konversi" },
  archived:  { bg: "rgba(107,114,128,0.1)",  text: "#6B7280", label: "Arsip" },
};

// ─── Helpers ─────────────────────────────────────────────────────────────────


function fmtDate(d: string) {
  return new Date(d).toLocaleDateString("id-ID", {
    day: "numeric", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

// Secure CSV export using backend API (verifies transaction/role)

// ─── Status select ────────────────────────────────────────────────────────────

function StatusSelect({ id, value, onChange }: { id: string; value: string; onChange: (v: string) => void }) {
  const [busy, setBusy] = useState(false);
  const s = STATUS_STYLE[value] ?? STATUS_STYLE["new"]!;

  async function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const next = e.target.value;
    setBusy(true);
    const token = getToken();
    try {
      await fetch(`/api/admin/leads/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token ?? ""}` },
        body: JSON.stringify({ status: next }),
      });
      onChange(next);
    } finally {
      setBusy(false);
    }
  }

  return (
    <select
      value={value}
      onChange={handleChange}
      disabled={busy}
      className="cursor-pointer rounded-lg border-0 px-2 py-1 text-xs font-semibold transition-opacity outline-none"
      style={{ background: s.bg, color: s.text, opacity: busy ? 0.5 : 1 }}
      aria-label="Ubah status lead"
    >
      {STATUSES.filter((s) => s.value !== "").map((st) => (
        <option key={st.value} value={st.value}>{st.label}</option>
      ))}
    </select>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AdminLeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [meta, setMeta] = useState<Meta>({ total: 0, page: 1, limit: 20 });
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [source, setSource] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [exporting, setExporting] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  async function handleExportCSV() {
    const token = getToken();
    if (!token) return;
    setExporting(true);
    try {
      const res = await fetch("/api/admin/leads/export", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Gagal mengunduh CSV");
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `leads-export-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch {
      alert("Gagal mengekspor data leads.");
    } finally {
      setExporting(false);
    }
  }

  const fetchLeads = useCallback((q: string, src: string, sts: string, pg: number) => {
    const token = getToken();
    if (!token) return;
    setLoading(true);
    const qs = new URLSearchParams({ page: String(pg), limit: "20" });
    if (q) qs.set("q", q);
    if (src) qs.set("source", src);
    if (sts) qs.set("status", sts);

    fetch(`/api/admin/leads?${qs}`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((body) => {
        if (body.success) {
          setLeads(body.data ?? []);
          setMeta(body.meta ?? { total: 0, page: pg, limit: 20 });
        }
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { fetchLeads(query, source, status, page); }, []); // eslint-disable-line

  function handleSearch(q: string) {
    setQuery(q);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => { setPage(1); fetchLeads(q, source, status, 1); }, 350);
  }

  function handleSource(src: string) {
    setSource(src);
    setPage(1);
    fetchLeads(query, src, status, 1);
  }

  function handleStatus(sts: string) {
    setStatus(sts);
    setPage(1);
    fetchLeads(query, source, sts, 1);
  }

  function handlePage(p: number) {
    setPage(p);
    fetchLeads(query, source, status, p);
  }

  function handleStatusChange(id: string, next: string) {
    setLeads((prev) => prev.map((l) => l.id === id ? { ...l, status: next } : l));
  }

  const totalPages = Math.ceil(meta.total / meta.limit);

  // Metrics
  const counts = STATUSES.filter((s) => s.value).reduce<Record<string, number>>((acc, s) => {
    acc[s.value] = leads.filter((l) => l.status === s.value).length;
    return acc;
  }, {});

  return (
    <div className="flex max-w-[1200px] flex-col gap-5">

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-extrabold text-text-primary">Leads CRM</h1>
          <p className="mt-1 text-sm text-text-secondary">
            {meta.total.toLocaleString("id-ID")} leads dari semua landing page
          </p>
        </div>
        <Button
          id="leads-export-csv-btn"
          variant="secondary"
          size="sm"
          onClick={handleExportCSV}
          disabled={exporting}
          leftIcon={<Download size={15} aria-hidden="true" />}
        >
          {exporting ? "Mengekspor..." : "Export CSV"}
        </Button>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-5">
        {STATUSES.filter((s) => s.value).map((s) => {
          const st = STATUS_STYLE[s.value]!;
          const active = status === s.value;
          return (
            <button
              id={`leads-filter-status-${s.value}-btn`}
              key={s.value}
              onClick={() => handleStatus(active ? "" : s.value)}
              className={cn(
                "rounded-[var(--radius-lg)] border p-3.5 text-left transition-colors",
                active ? "" : "border-border-default bg-surface-card hover:bg-surface-sunken",
              )}
              style={active ? { background: st.bg, borderColor: st.text } : undefined}
            >
              <p className="text-xl font-extrabold" style={{ color: st.text }}>
                {counts[s.value] ?? 0}
              </p>
              <p className="mt-0.5 text-xs text-text-secondary">{s.label}</p>
            </button>
          );
        })}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2.5">
        {/* Search */}
        <div className="relative min-w-[200px] max-w-[320px] flex-1">
          <Input
            id="leads-search-input"
            type="search"
            leftIcon={<Search size={15} aria-hidden="true" />}
            value={query}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder="Cari nama / email / perusahaan…"
            aria-label="Cari lead"
            containerClassName="w-full"
            className={query ? "pr-9" : undefined}
          />
          {query && (
            <button
              id="leads-search-clear-btn"
              onClick={() => handleSearch("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary"
              aria-label="Hapus pencarian"
            >
              <X size={14} aria-hidden="true" />
            </button>
          )}
        </div>

        {/* Source pills */}
        <div className="flex flex-wrap gap-1.5">
          {SOURCES.map((s) => {
            const active = source === s.value;
            const style = s.value ? SOURCE_STYLE[s.value] : null;
            return (
              <button
                id={`leads-source-${s.value || "all"}-btn`}
                key={s.value}
                onClick={() => handleSource(s.value)}
                className={cn(
                  "rounded-full px-3 py-1.5 text-xs font-semibold transition-colors",
                  !active && "bg-surface-sunken text-text-secondary hover:bg-surface-page",
                )}
                style={active ? { background: style?.bg ?? "var(--surface-sunken)", color: style?.text ?? "var(--text-primary)" } : undefined}
                aria-pressed={active}
              >
                {s.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex justify-center rounded-[var(--radius-lg)] border border-border-default bg-surface-card py-16 shadow-e1">
          <Loader2 className="animate-spin text-accent-cyan-strong" size={32} aria-hidden="true" />
        </div>
      ) : leads.length === 0 ? (
        <EmptyState
          icon={ClipboardList}
          title="Tidak ada leads ditemukan"
          description={
            query || source || status
              ? "Coba ubah filter atau hapus pencarian."
              : "Leads akan muncul di sini saat ada yang mengisi form di landing page."
          }
        />
      ) : (
        <div className="overflow-hidden rounded-[var(--radius-lg)] border border-border-default bg-surface-card shadow-e1">
          <div className="overflow-x-auto">
            <Table>
              <THead>
                <tr>
                  {["Nama & Email", "Perusahaan", "Telepon", "Sumber", "Status", "Tanggal"].map((h) => (
                    <TH key={h}>{h}</TH>
                  ))}
                </tr>
              </THead>
              <TBody>
                {leads.map((lead) => {
                  const src = SOURCE_STYLE[lead.source] ?? SOURCE_STYLE["other"]!;
                  return (
                    <TR key={lead.id}>
                      <TD>
                        <p className="font-semibold text-text-primary">{lead.name}</p>
                        <p className="mt-0.5 text-xs text-text-secondary">{lead.email}</p>
                        {lead.message && (
                          <p className="mt-0.5 max-w-[240px] truncate text-xs text-text-muted">{lead.message}</p>
                        )}
                      </TD>
                      <TD className="text-text-secondary">{lead.company ?? "—"}</TD>
                      <TD className="font-mono text-xs text-text-secondary">{lead.phone ?? "—"}</TD>
                      <TD>
                        <span
                          className="whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-bold"
                          style={{ background: src.bg, color: src.text }}
                        >
                          {src.label}
                        </span>
                      </TD>
                      <TD>
                        <StatusSelect id={lead.id} value={lead.status} onChange={(v) => handleStatusChange(lead.id, v)} />
                      </TD>
                      <TD className="whitespace-nowrap text-xs text-text-muted">{fmtDate(lead.createdAt)}</TD>
                    </TR>
                  );
                })}
              </TBody>
            </Table>
          </div>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex flex-wrap items-center justify-center gap-3">
          <span className="text-sm text-text-secondary">
            {page} / {totalPages} ({meta.total.toLocaleString("id-ID")} leads)
          </span>
          <Pagination page={page} pageCount={totalPages} onPageChange={handlePage} />
        </div>
      )}
    </div>
  );
}
