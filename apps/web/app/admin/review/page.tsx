"use client";

import { useEffect, useState } from "react";
import { Star, MessageSquare, Trash2 } from "lucide-react";
import { getValidToken } from "@/lib/auth/token";
import {
  Card,
  Badge,
  Input,
  Select,
  Tabs,
  TabsList,
  TabsTrigger,
  Pagination,
  PageHeader,
  FilterBar,
  TableActionButton,
  DashboardLoading,
} from "@/components/ui";
import { EmptyState } from "@/components/ui/EmptyState";

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

  async function loadReviews() {
    const token = await getValidToken();
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

  // `loadReviews` is re-created every render, so listing it would refetch on
  // every render; page/filter are the real reload triggers.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { loadReviews(); }, [page, filter]);

  async function loadTestimonials() {
    const token = await getValidToken();
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
    // `loadTestimonials` is re-created every render; only mode/tFilter should
    // trigger a reload, otherwise every render would refetch.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, tFilter]);

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
    const token = await getValidToken();
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
    const token = await getValidToken();
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
    const token = await getValidToken();
    if (!token) return;
    await fetch(`/api/admin/reviews/${id}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
    loadReviews();
  }

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="dash-container flex flex-col gap-6">
      {/* Header — title + subtitle; mode switch as its own actions slot */}
      <PageHeader
        title={mode === "review" ? "Moderasi Review" : "Moderasi Testimoni"}
        subtitle={
          mode === "review"
            ? `${total.toLocaleString("id-ID")} review total`
            : `${testimonials.length.toLocaleString("id-ID")} testimoni ditampilkan`
        }
        actions={
          <Tabs value={mode} onValueChange={(v) => setMode(v as "review" | "testimoni")}>
            <TabsList>
              <TabsTrigger value="review">⭐ Review Kursus</TabsTrigger>
              <TabsTrigger value="testimoni">💬 Testimoni</TabsTrigger>
            </TabsList>
          </Tabs>
        }
      />

      {/* Status filter on its own framed row (no tablet collision) */}
      <FilterBar
        filters={
          mode === "review" ? (
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
          )
        }
      />

      {mode === "testimoni" ? (
        tLoading ? (
          <DashboardLoading />
        ) : testimonials.length === 0 ? (
          <EmptyState icon={MessageSquare} title="Tidak ada testimoni ditemukan" />
        ) : (
          <div className="flex flex-col gap-3">
            {testimonials.map((t) => {
              const draft = drafts[t.id] ?? { category: t.category ?? "general", outcome: t.outcome ?? "" };
              return (
                <Card key={t.id} className={`p-4 ${t.status === "pending" ? "border-l-[3px] border-l-amber-500" : ""}`}>
                  <div className="mb-2 flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="bg-brand-gradient flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[11px] font-extrabold text-white">{(t.name ?? "?").slice(0, 2).toUpperCase()}</div>
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
                  {t.quote && <p className="mb-3 rounded-lg bg-surface-sunken px-4 py-2 text-sm leading-relaxed text-text-primary">{t.quote}</p>}
                  <div className="mb-3 flex flex-wrap gap-3">
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
                      <TableActionButton variant="ok" onClick={() => moderateTestimonial(t.id, "approved")}>Setujui</TableActionButton>
                    )}
                    {t.status === "approved" && (
                      <TableActionButton variant="ok" onClick={() => moderateTestimonial(t.id, "approved")}>Simpan</TableActionButton>
                    )}
                    {t.status !== "rejected" && (
                      <TableActionButton variant="danger" onClick={() => moderateTestimonial(t.id, "rejected")}>Tolak</TableActionButton>
                    )}
                    {t.status !== "pending" && (
                      <TableActionButton variant="warn" onClick={() => moderateTestimonial(t.id, "pending")}>Kembalikan ke Menunggu</TableActionButton>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        )
      ) : loading ? (
        <DashboardLoading />
      ) : reviews.length === 0 ? (
        <EmptyState icon={Star} title="Tidak ada review ditemukan" />
      ) : (
        <div className="flex flex-col gap-3">
          {reviews.map((r) => (
            <Card key={r.id} className={`p-4 ${!r.isApproved ? "border-l-[3px] border-l-amber-500" : ""}`}>
              <div className="mb-2 flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="bg-brand-gradient flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[11px] font-extrabold text-white">{r.user.name.slice(0, 2).toUpperCase()}</div>
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
              {r.comment && <p className="mb-3 rounded-lg bg-surface-sunken px-4 py-2 text-sm leading-relaxed text-text-primary">{r.comment}</p>}
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant={r.isApproved ? "success" : "warning"} className="mr-auto">
                  {r.isApproved ? "✓ Disetujui" : "⏳ Menunggu"}
                </Badge>
                <TableActionButton variant={r.isApproved ? "warn" : "ok"} onClick={() => toggleApprove(r.id, r.isApproved)}>
                  {r.isApproved ? "Cabut" : "Setujui"}
                </TableActionButton>
                <TableActionButton variant="danger" leftIcon={<Trash2 size={12} />} onClick={() => deleteReview(r.id)}>Hapus</TableActionButton>
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
