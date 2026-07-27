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

export default function TrainerReviewsPage() {
  const router = useRouter();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      const token = await getValidToken();
      if (!token) { router.replace("/masuk"); return; }
      try {
        const r = await fetch("/api/trainer/reviews", {
          headers: { Authorization: `Bearer ${token}` },
        });
        const d = await r.json();
        if (d.success) setReviews(d.data);
        else setError(d.error?.message ?? "Gagal memuat ulasan.");
      } catch {
        setError("Gagal memuat ulasan.");
      } finally {
        setLoading(false);
      }
    })();
  }, [router]);

  if (loading) {
    return (
      <div className="dash-container">
        <DashboardLoading />
      </div>
    );
  }
  if (error) {
    return (
      <div className="dash-container">
        <DashboardError message={error} onRetry={() => router.refresh()} />
      </div>
    );
  }

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
        <h2 className="mb-6 font-display text-lg font-bold text-text-primary">Daftar Feedback & Ulasan Kursus Anda</h2>

        {reviews.length === 0 ? (
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
      </Card>
    </div>
  );
}
