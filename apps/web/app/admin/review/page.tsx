"use client";

import { useEffect, useState } from "react";
import { Star, MessageSquare, Trash2 } from "lucide-react";
import { getToken } from "@/lib/auth/token";
import {
  Card,
  Badge,
  Input,
  Select,
  Tabs,
  TabsList,
  TabsTrigger,
  Pagination,
} from "@/components/ui";

type Review = {
  id: string;
  rating: number;
  comment: string | null;
  isApproved: boolean;
  createdAt: string;
  user: { name: string; email: string };
  course: { title: string } | null;
};

// Defensive typing: backend fields may lag behind (category/outcome ship in parallel).
type Testimonial = {
  id: string;
  name: string;
  role?: string | null;
  company?: string | null;
  quote?: string | null;
  rating?: number | null;
  status?: string;
  featured?: boolean;
  category?: string | null;
  outcome?: string | null;
  createdAt?: string;
};

type ModerationDraft = { category: string; outcome: string };

const ACTION_BTN = "rounded-lg px-3 py-1.5 text-xs font-bold transition-colors";
const BTN_OK = `${ACTION_BTN} bg-green-600/10 text-green-700 hover:bg-green-600 hover:text-white`;
const BTN_WARN = `${ACTION_BTN} bg-amber-500/10 text-amber-700 hover:bg-amber-600 hover:text-white`;
const BTN_DEL = `${ACTION_BTN} inline-flex items-center gap-1 bg-red-600/10 text-red-700 hover:bg-red-600 hover:text-white`;


export default function AdminReviewPage() {
  const [mode, setMode] = useState<"review" | "testimoni">("review");
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "pending" | "approved">("all");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 15;

  // Testimonial moderation state
  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
  const [tLoading, setTLoading] = useState(false);
  const [tFilter, setTFilter] = useState<"all" | "pending" | "approved" | "rejected">("pending");
  const [drafts, setDrafts] = useState<Record<string, ModerationDraft>>({});

  function loadReviews() {
    const token = getToken();
    if (!token) return;
    const params = new URLSearchParams({ page: String(page), limit: String(limit), ...(filter !== "all" ? { approved: String(filter === "approved") } : {}) });
    setLoading(true);
    fetch(`/api/admin/reviews?${params}`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((body) => {
        if (body.success) { setReviews(body.data?.reviews ?? body.data ?? []); setTotal(body.data?.total ?? 0); }
      })
      .finally(() => setLoading(false));
  }

  useEffect(() => { loadReviews(); }, [page, filter]); // eslint-disable-line

  function loadTestimonials() {
    const token = getToken();
    if (!token) return;
    const params = new URLSearchParams(tFilter !== "all" ? { status: tFilter } : {});
    setTLoading(true);
    fetch(`/api/testimonials/admin?${params}`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((body) => {
        if (body.success) {
          const items: Testimonial[] = Array.isArray(body.data) ? body.data : [];
          setTestimonials(items);
          // Seed per-row moderation drafts from server values (keep unsaved edits).
          setDrafts((prev) => {
            const next = { ...prev };
            for (const t of items) {
              if (!next[t.id]) {
                next[t.id] = { category: t.category ?? "general", outcome: t.outcome ?? "" };
              }
            }
            return next;
          });
        }
      })
      .finally(() => setTLoading(false));
  }

  useEffect(() => {
    if (mode === "testimoni") loadTestimonials();
  }, [mode, tFilter]); // eslint-disable-line

  function setDraft(id: string, patch: Partial<ModerationDraft>) {
    setDrafts((prev) => ({
      ...prev,
      [id]: { category: "general", outcome: "", ...prev[id], ...patch },
    }));
  }

  async function moderateTestimonial(id: string, status: "approved" | "rejected" | "pending") {
    const draft = drafts[id] ?? { category: "general", outcome: "" };
    if (draft.outcome.trim().length > 300) {
      alert("Outcome maksimal 300 karakter.");
      return;
    }
    const token = getToken();
    if (!token) return;
    try {
      const res = await fetch(`/api/testimonials/${id}/moderate`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          status,
          category: draft.category,
          outcome: draft.outcome.trim() || null,
        }),
      });
      const body = await res.json();
      if (!body.success) {
        alert(body.error?.message ?? "Gagal memoderasi testimoni.");
        return;
      }
      loadTestimonials();
    } catch {
      alert("Gagal menghubungi server.");
    }
  }

  async function toggleApprove(id: string, current: boolean) {
    const token = getToken();
    if (!token) return;
    await fetch(`/api/admin/reviews/${id}`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ isApproved: !current }),
    });
    loadReviews();
  }

  async function deleteReview(id: string) {
    if (!confirm("Hapus review ini?")) return;
    const token = getToken();
    if (!token) return;
    await fetch(`/api/admin/reviews/${id}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
    loadReviews();
  }

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="flex max-w-[900px] flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-xl font-extrabold text-text-primary">{mode === "review" ? "Moderasi Review" : "Moderasi Testimoni"}</h1>
          <p className="mt-1 text-sm text-text-secondary">
            {mode === "review"
              ? `${total.toLocaleString("id-ID")} review total`
              : `${testimonials.length.toLocaleString("id-ID")} testimoni ditampilkan`}
          </p>
        </div>
        <Tabs value={mode} onValueChange={(v) => setMode(v as "review" | "testimoni")}>
          <TabsList>
            <TabsTrigger value="review">⭐ Review Kursus</TabsTrigger>
            <TabsTrigger value="testimoni">💬 Testimoni</TabsTrigger>
          </TabsList>
        </Tabs>
        {mode === "review" ? (
          <Tabs value={filter} onValueChange={(v) => { setFilter(v as "all" | "pending" | "approved"); setPage(1); }}>
            <TabsList className="flex-wrap">
              {(["all", "pending", "approved"] as const).map((f) => (
                <TabsTrigger key={f} value={f}>
                  {f === "all" ? "Semua" : f === "pending" ? "⏳ Menunggu" : "✅ Disetujui"}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        ) : (
          <Tabs value={tFilter} onValueChange={(v) => setTFilter(v as "all" | "pending" | "approved" | "rejected")}>
            <TabsList className="flex-wrap">
              {(["all", "pending", "approved", "rejected"] as const).map((f) => (
                <TabsTrigger key={f} value={f}>
                  {f === "all" ? "Semua" : f === "pending" ? "⏳ Menunggu" : f === "approved" ? "✅ Disetujui" : "🚫 Ditolak"}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        )}
      </div>

      {mode === "testimoni" ? (
        tLoading ? (
          <div className="flex justify-center py-12"><span className="size-8 animate-spin rounded-full border-[3px] border-accent-cyan-strong border-t-transparent" /></div>
        ) : testimonials.length === 0 ? (
          <div className="flex flex-col items-center gap-2 rounded-[var(--radius-lg)] border border-solid border-border-default bg-surface-card py-12 text-text-muted">
            <MessageSquare size={32} className="text-border-strong" />
            <p className="text-sm">Tidak ada testimoni ditemukan</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {testimonials.map((t) => {
              const draft = drafts[t.id] ?? { category: t.category ?? "general", outcome: t.outcome ?? "" };
              return (
                <Card key={t.id} className={`p-[18px] ${t.status === "pending" ? "border-l-[3px] border-l-amber-500" : ""}`}>
                  <div className="mb-2.5 flex items-start justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="bg-brand-gradient flex size-9 shrink-0 items-center justify-center rounded-[10px] text-[11px] font-extrabold text-white">{(t.name ?? "?").slice(0, 2).toUpperCase()}</div>
                      <div>
                        <p className="text-sm font-bold text-text-primary">{t.name}</p>
                        <p className="text-xs text-text-secondary">{[t.role, t.company].filter(Boolean).join(" · ") || "—"}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      {typeof t.rating === "number" && (
                        <div className="text-sm text-amber-400">{"★".repeat(t.rating)}{"☆".repeat(Math.max(0, 5 - t.rating))}</div>
                      )}
                      {t.createdAt && <p className="mt-0.5 text-xs text-text-muted">{new Date(t.createdAt).toLocaleDateString("id-ID")}</p>}
                    </div>
                  </div>
                  {t.quote && <p className="mb-3 rounded-lg bg-surface-sunken px-3 py-2.5 text-sm leading-relaxed text-text-primary">{t.quote}</p>}
                  <div className="mb-3 flex flex-wrap gap-2.5">
                    <Select
                      label="Kategori"
                      className="py-2 text-sm"
                      containerClassName="min-w-[140px]"
                      value={draft.category}
                      onChange={(e) => setDraft(t.id, { category: e.target.value })}
                    >
                      <option value="general">Umum</option>
                      <option value="alumni">Alumni</option>
                    </Select>
                    <Input
                      label="Outcome (opsional, maks 300)"
                      type="text"
                      maxLength={300}
                      className="py-2 text-sm"
                      containerClassName="min-w-[220px] flex-1"
                      placeholder="Kini bekerja sebagai ... di ..."
                      value={draft.outcome}
                      onChange={(e) => setDraft(t.id, { outcome: e.target.value })}
                    />
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant={t.status === "approved" ? "success" : t.status === "rejected" ? "danger" : "warning"} className="mr-auto">
                      {t.status === "approved" ? "✓ Disetujui" : t.status === "rejected" ? "🚫 Ditolak" : "⏳ Menunggu"}
                    </Badge>
                    {t.featured && <Badge variant="warning"><Star size={11} fill="currentColor" /> Featured</Badge>}
                    {t.status !== "approved" && (
                      <button className={BTN_OK} onClick={() => moderateTestimonial(t.id, "approved")}>Setujui</button>
                    )}
                    {t.status === "approved" && (
                      <button className={BTN_OK} onClick={() => moderateTestimonial(t.id, "approved")}>Simpan</button>
                    )}
                    {t.status !== "rejected" && (
                      <button className={BTN_DEL} onClick={() => moderateTestimonial(t.id, "rejected")}>Tolak</button>
                    )}
                    {t.status !== "pending" && (
                      <button className={BTN_WARN} onClick={() => moderateTestimonial(t.id, "pending")}>Kembalikan ke Menunggu</button>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        )
      ) : loading ? (
        <div className="flex justify-center py-12"><span className="size-8 animate-spin rounded-full border-[3px] border-accent-cyan-strong border-t-transparent" /></div>
      ) : reviews.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-[var(--radius-lg)] border border-solid border-border-default bg-surface-card py-12 text-text-muted">
          <Star size={32} className="text-border-strong" />
          <p className="text-sm">Tidak ada review ditemukan</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {reviews.map((r) => (
            <Card key={r.id} className={`p-[18px] ${!r.isApproved ? "border-l-[3px] border-l-amber-500" : ""}`}>
              <div className="mb-2.5 flex items-start justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="bg-brand-gradient flex size-9 shrink-0 items-center justify-center rounded-[10px] text-[11px] font-extrabold text-white">{r.user.name.slice(0, 2).toUpperCase()}</div>
                  <div>
                    <p className="text-sm font-bold text-text-primary">{r.user.name}</p>
                    <p className="text-xs text-text-secondary">{r.course?.title ?? "—"}</p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm text-amber-400">{"★".repeat(r.rating)}{"☆".repeat(5 - r.rating)}</div>
                  <p className="mt-0.5 text-xs text-text-muted">{new Date(r.createdAt).toLocaleDateString("id-ID")}</p>
                </div>
              </div>
              {r.comment && <p className="mb-3 rounded-lg bg-surface-sunken px-3 py-2.5 text-sm leading-relaxed text-text-primary">{r.comment}</p>}
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant={r.isApproved ? "success" : "warning"} className="mr-auto">
                  {r.isApproved ? "✓ Disetujui" : "⏳ Menunggu"}
                </Badge>
                <button className={r.isApproved ? BTN_WARN : BTN_OK} onClick={() => toggleApprove(r.id, r.isApproved)}>
                  {r.isApproved ? "Cabut" : "Setujui"}
                </button>
                <button className={BTN_DEL} onClick={() => deleteReview(r.id)}><Trash2 size={12} /> Hapus</button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {mode === "review" && totalPages > 1 && (
        <div className="flex justify-center">
          <Pagination page={page} pageCount={totalPages} onPageChange={setPage} />
        </div>
      )}
    </div>
  );
}
