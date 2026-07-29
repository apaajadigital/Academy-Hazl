"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Star } from "lucide-react";
import {
  Avatar,
  Card,
  EmptyState,
  PageHeader,
  Pagination,
  DashboardLoading,
  DashboardError,
} from "@/components/ui";
import { cn } from "@/lib/utils";
import { getValidToken } from "@/lib/auth/token";

type Review = {
  id: string;
  rating: number;
  content: string | null;
  createdAt: string;
  user: {
    id: string;
    name: string;
    avatarUrl: string | null;
  };
};

/** Envelope of GET /api/trainer/reviews — `meta` is `PaginationMeta` (api/src/lib/pagination.ts). */
type ReviewListResponse =
  | { success: true; data: Review[]; meta?: { total: number; page: number; limit: number } }
  | { success: false; error?: { message?: string } };

// Mirrors the backend default page size; sent explicitly so the client never
// depends on the server default staying at 20.
const PAGE_SIZE = 20;

export default function TrainerReviewsPage() {
  const router = useRouter();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  // Bumped by the retry button to re-run the effect without changing `page`.
  const [reloadKey, setReloadKey] = useState(0);

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
        const r = await fetch(`/api/trainer/reviews?page=${page}&limit=${PAGE_SIZE}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const d = (await r.json()) as ReviewListResponse;
        if (cancelled) return;
        if (d.success) {
          setReviews(d.data);
          // Older API builds sent no `meta`; fall back to the row count so the
          // header never shows a total smaller than what is on screen.
          setTotal(d.meta?.total ?? d.data.length);
        } else {
          setError(d.error?.message ?? "Gagal memuat ulasan.");
        }
      } catch {
        if (!cancelled) setError("Gagal memuat ulasan.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [page, reloadKey, router]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="dash-container flex flex-col gap-8">
      <PageHeader
        title="Ulasan Siswa"
        breadcrumb={
          <span className="flex items-center gap-2">
            <Link href="/trainer-hub" className="text-accent-cyan-strong hover:underline">Trainer Hub</Link>
            <span className="text-text-secondary">/</span>
            <span className="font-medium text-text-primary">Ulasan Siswa</span>
          </span>
        }
      />

      <Card className="p-6">
        <div className="mb-6 flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="font-display text-lg font-bold text-text-primary">Daftar Feedback & Ulasan Kursus Anda</h2>
          {!loading && !error && total > 0 && (
            <p className="text-sm text-text-secondary">
              Menampilkan {reviews.length} dari {total} ulasan
            </p>
          )}
        </div>

        {loading ? (
          <DashboardLoading />
        ) : error ? (
          <DashboardError message={error} onRetry={() => setReloadKey((k) => k + 1)} />
        ) : reviews.length === 0 ? (
          <EmptyState
            icon={Star}
            title="Belum ada ulasan"
            description="Belum ada ulasan dari siswa untuk kursus Anda."
          />
        ) : (
          <div className="space-y-6">
            {reviews.map((rev) => (
              <div key={rev.id} className="border-b border-solid border-border-default pb-6 last:border-b-0 last:pb-0">
                <div className="flex items-start gap-4">
                  <Avatar src={rev.user.avatarUrl ?? undefined} name={rev.user.name} size="md" className="flex-shrink-0" />

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold text-text-primary">{rev.user.name}</p>
                      <span className="text-xs text-text-secondary">
                        {new Date(rev.createdAt).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}
                      </span>
                    </div>

                    <div className="my-1 flex items-center gap-0.5">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star
                          key={i}
                          size={16}
                          aria-hidden="true"
                          className={cn(i < rev.rating ? "text-amber-400" : "text-border-strong")}
                          fill={i < rev.rating ? "currentColor" : "none"}
                        />
                      ))}
                    </div>

                    {rev.content ? (
                      <p className="mt-2 whitespace-pre-wrap text-sm text-text-primary">{rev.content}</p>
                    ) : (
                      <p className="mt-2 text-sm italic text-text-muted">Tidak ada ulasan tertulis.</p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pagination footer — same shape as payout. */}
        {!loading && !error && totalPages > 1 && (
          <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-solid border-border-default pt-4">
            <span className="text-sm text-text-secondary">Halaman {page} dari {totalPages}</span>
            <Pagination page={page} pageCount={totalPages} onPageChange={setPage} />
          </div>
        )}
      </Card>
    </div>
  );
}
