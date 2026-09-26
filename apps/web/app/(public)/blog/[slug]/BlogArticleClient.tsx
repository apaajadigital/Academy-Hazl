"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Star, ArrowLeft } from "lucide-react";

type BlogPost = {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  content: string;
  coverUrl: string | null;
  category: string | null;
  tags: string[];
  publishedAt: string | null;
  author: { id: string; name: string; avatarUrl: string | null };
};

type Review = {
  id: string;
  rating: number;
  content: string | null;
  createdAt: string;
  user: { name: string; avatarUrl: string | null };
};

export default function BlogArticleClient() {
  const { slug } = useParams<{ slug: string }>();
  const [post, setPost] = useState<BlogPost | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [avgRating, setAvgRating] = useState(0);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [reviewForm, setReviewForm] = useState({ rating: 5, content: "" });
  const [submitting, setSubmitting] = useState(false);
  const [reviewMsg, setReviewMsg] = useState("");

  useEffect(() => {
    fetch(`/api/blog/${slug}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.success) setPost(d.data);
        else setNotFound(true);
      })
      .finally(() => setLoading(false));
  }, [slug]);

  useEffect(() => {
    if (!post) return;
    fetch(`/api/reviews?itemType=blog_post&itemId=${post.id}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.success) {
          setReviews(d.data);
          setAvgRating(d.meta?.avgRating ?? 0);
        }
      });
  }, [post]);

  async function submitReview(e: React.FormEvent) {
    e.preventDefault();
    if (!post) return;
    setSubmitting(true);
    setReviewMsg("");
    const res = await fetch("/api/reviews", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ itemType: "blog_post", itemId: post.id, ...reviewForm }),
    });
    const data = await res.json();
    if (data.success) {
      setReviews((prev) => [data.data, ...prev]);
      setReviewMsg("Ulasan berhasil dikirim.");
    } else {
      setReviewMsg(data.error?.message ?? "Gagal mengirim ulasan.");
    }
    setSubmitting(false);
  }

  if (loading)
    return (
      <div className="flex min-h-screen items-center justify-center text-[var(--text-muted)]">Memuat...</div>
    );
  if (notFound || !post)
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4">
        <p className="text-[var(--text-muted)]">Artikel tidak ditemukan.</p>
        <Link href="/blog" className="link-arrow">
          <ArrowLeft size={16} aria-hidden="true" />
          Kembali ke Blog
        </Link>
      </div>
    );

  return (
    <div className="min-h-screen bg-[var(--surface-page)]">
      {/* Breadcrumb */}
      <div className="border-b border-[var(--border-subtle)] bg-white">
        <div className="mx-auto flex max-w-3xl items-center gap-2 px-6 py-4 text-sm">
          <Link href="/blog" className="font-medium text-[var(--brand-cyan-strong)] hover:underline">
            Blog
          </Link>
          <span className="text-[var(--border-strong)]">/</span>
          <span className="max-w-xs truncate text-[var(--text-secondary)]">{post.title}</span>
        </div>
      </div>

      <div className="mx-auto max-w-3xl px-6 py-10 md:py-14">
        <article>
          {/* Header */}
          <header className="mb-8">
            {post.category && <span className="badge badge-cyan">{post.category}</span>}
            <h1 className="mt-4 font-display text-3xl font-extrabold leading-tight tracking-tight text-[var(--text-primary)] md:text-4xl">
              {post.title}
            </h1>
            <div className="mt-6 flex flex-wrap items-center gap-3 border-y border-[var(--border-subtle)] py-4">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--brand-cyan-strong)] text-sm font-bold text-white">
                {post.author.name.charAt(0)}
              </span>
              <div>
                <p className="text-sm font-medium text-[var(--text-primary)]">{post.author.name}</p>
                {post.publishedAt && (
                  <p className="text-xs text-[var(--text-muted)]">
                    {new Date(post.publishedAt).toLocaleDateString("id-ID", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })}
                  </p>
                )}
              </div>
              {avgRating > 0 && (
                <div className="ml-auto flex items-center gap-1.5">
                  <Star size={16} className="fill-amber-400 text-amber-400" aria-hidden="true" />
                  <span className="text-sm font-medium text-[var(--text-primary)]">{avgRating.toFixed(1)}</span>
                  <span className="text-xs text-[var(--text-muted)]">({reviews.length} ulasan)</span>
                </div>
              )}
            </div>
          </header>

          {/* Cover */}
          {post.coverUrl && (
            <div className="relative mb-8 aspect-video w-full overflow-hidden rounded-[var(--radius-lg)] border border-[var(--border-default)]">
              <Image
                src={post.coverUrl}
                alt={post.title}
                fill
                priority
                sizes="(min-width: 768px) 768px, 100vw"
                className="object-cover"
              />
            </div>
          )}

          {/* Body */}
          <div className="prose prose-neutral max-w-none whitespace-pre-wrap leading-relaxed text-[var(--text-primary)] prose-headings:font-display prose-headings:text-[var(--text-primary)] prose-a:text-[var(--brand-cyan-strong)]">
            {post.content}
          </div>

          {/* Tags */}
          {post.tags.length > 0 && (
            <div className="mt-10 flex flex-wrap gap-2 border-t border-[var(--border-subtle)] pt-6">
              {post.tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-full bg-[var(--surface-sunken)] px-3 py-1 text-xs text-[var(--text-secondary)]"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
        </article>

        {/* Review form */}
        <div className="mt-10 rounded-[var(--radius-lg)] border border-[var(--border-default)] bg-white p-6">
          <h2 className="mb-4 font-display text-lg font-bold text-[var(--text-primary)]">Berikan Ulasan</h2>
          <form onSubmit={submitReview} className="space-y-4">
            <div>
              <label className="mb-2 block text-xs font-medium text-[var(--text-secondary)]">Rating</label>
              <div className="flex gap-1.5">
                {[1, 2, 3, 4, 5].map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setReviewForm({ ...reviewForm, rating: r })}
                    aria-label={`Beri rating ${r}`}
                    className="transition-transform hover:scale-110"
                  >
                    <Star
                      size={26}
                      aria-hidden="true"
                      className={
                        r <= reviewForm.rating
                          ? "fill-amber-400 text-amber-400"
                          : "fill-transparent text-[var(--border-strong)]"
                      }
                    />
                  </button>
                ))}
              </div>
            </div>
            <textarea
              value={reviewForm.content}
              onChange={(e) => setReviewForm({ ...reviewForm, content: e.target.value })}
              placeholder="Bagikan pendapat Anda tentang artikel ini..."
              rows={3}
              className="w-full rounded-[var(--radius-md)] border border-[var(--border-default)] bg-white px-3 py-2 text-sm text-[var(--text-primary)] focus:border-[var(--border-focus)] focus:outline-none focus:ring-2 focus:ring-[rgba(0,119,168,0.2)]"
            />
            <div className="flex items-center gap-3">
              <button type="submit" disabled={submitting} className="btn btn-primary btn-sm disabled:opacity-50">
                {submitting ? "Mengirim..." : "Kirim Ulasan"}
              </button>
              {reviewMsg && <p className="text-sm text-[var(--brand-cyan-strong)]">{reviewMsg}</p>}
            </div>
          </form>
        </div>

        {reviews.length > 0 && (
          <div className="mt-6 rounded-[var(--radius-lg)] border border-[var(--border-default)] bg-white p-6">
            <h2 className="mb-4 font-display text-lg font-bold text-[var(--text-primary)]">
              Ulasan ({reviews.length})
            </h2>
            <div className="space-y-4">
              {reviews.map((r) => (
                <div key={r.id} className="border-b border-[var(--border-subtle)] pb-4 last:border-0 last:pb-0">
                  <div className="mb-2 flex items-center gap-2">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[var(--brand-cyan-strong)] text-xs font-bold text-white">
                      {r.user.name.charAt(0)}
                    </span>
                    <span className="text-sm font-medium text-[var(--text-primary)]">{r.user.name}</span>
                    <span className="flex items-center gap-0.5">
                      {Array.from({ length: r.rating }).map((_, i) => (
                        <Star key={i} size={13} className="fill-amber-400 text-amber-400" aria-hidden="true" />
                      ))}
                    </span>
                    <span className="ml-auto text-xs text-[var(--text-muted)]">
                      {new Date(r.createdAt).toLocaleDateString("id-ID")}
                    </span>
                  </div>
                  {r.content && <p className="text-sm text-[var(--text-secondary)]">{r.content}</p>}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
