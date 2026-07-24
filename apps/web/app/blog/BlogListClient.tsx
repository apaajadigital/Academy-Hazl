"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { ChevronLeft, ChevronRight, ArrowRight, Search, Newspaper } from "lucide-react";
import { cn } from "@/lib/utils";
import { EmptyState } from "@/components/ui/EmptyState";
import { MediaPlaceholder } from "@/components/shared/MediaPlaceholder";

type BlogPost = {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  coverUrl: string | null;
  category: string | null;
  tags: string[];
  publishedAt: string | null;
  author: { name: string; avatarUrl: string | null };
};

const CATEGORIES = ["Bisnis", "Marketing", "Teknologi", "Desain", "Keuangan", "Karir"];

const dateLong = (iso: string) =>
  new Date(iso).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });

export default function BlogListClient() {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");

  const fetchPosts = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), limit: "12" });
    if (search) params.set("search", search);
    if (category) params.set("category", category);
    const res = await fetch(`/api/blog?${params}`);
    const data = await res.json();
    if (data.success) {
      setPosts(data.data);
      setTotal(data.meta?.total ?? 0);
    }
    setLoading(false);
  }, [page, search, category]);

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  const chip = (active: boolean) =>
    cn(
      "whitespace-nowrap rounded-full px-4 py-2 text-sm font-medium transition-colors",
      active
        ? "bg-[var(--brand-cyan-strong)] text-white shadow-[var(--shadow-e1)]"
        : "border border-[var(--border-default)] bg-[var(--surface-card)] text-[var(--text-secondary)] hover:border-[var(--brand-cyan-strong)] hover:text-[var(--brand-cyan-strong)]",
    );

  // Presentation-only highlight: surface the first article of an unfiltered
  // first page as an editorial "featured" card; the rest flow into the grid.
  const showFeatured = !search && !category && page === 1 && posts.length > 0;
  const featured = showFeatured ? posts[0] : null;
  const gridPosts = showFeatured ? posts.slice(1) : posts;

  return (
    <div className="min-h-screen bg-[var(--surface-page)] pt-16">
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-[var(--border-subtle)] bg-white">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-24 -top-28 h-96 w-96 rounded-full bg-accent-cyan-strong/10 blur-3xl"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -left-24 top-10 h-72 w-72 rounded-full bg-accent-purple/10 blur-3xl"
        />
        <div className="container-pad relative py-14 md:py-20">
          <p className="eyebrow mb-3">Blog</p>
          <h1 className="max-w-3xl font-display text-4xl font-extrabold leading-[1.1] tracking-tight text-[var(--text-primary)] text-balance md:text-5xl">
            Insight & <span className="text-accent">panduan</span> karier
          </h1>
          <p className="mt-4 max-w-xl text-lg leading-relaxed text-[var(--text-secondary)]">
            Tips dan wawasan pengembangan skill dan karier dari para praktisi.
          </p>
        </div>
      </section>

      {/* Featured / trending article */}
      {!loading && featured && (
        <section className="container-pad pt-10">
          <Link
            href={`/blog/${featured.slug}`}
            className="card group flex flex-col overflow-hidden !p-0 lg:flex-row lg:items-stretch"
          >
            <div className="relative aspect-video w-full overflow-hidden border-b border-[var(--border-subtle)] lg:aspect-auto lg:w-3/5 lg:border-b-0 lg:border-r">
              {featured.coverUrl ? (
                <Image
                  src={featured.coverUrl}
                  alt={featured.title}
                  fill
                  sizes="(min-width: 1024px) 60vw, 100vw"
                  className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                />
              ) : (
                <MediaPlaceholder type="foto" ratio="16:9" showRatio={false} className="!h-full !rounded-none !border-0" />
              )}
            </div>
            <div className="flex flex-col justify-center gap-4 p-6 md:p-8 lg:w-2/5">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-accent-purple">
                  Artikel Pilihan
                </span>
                {featured.category && <span className="badge badge-cyan">{featured.category}</span>}
              </div>
              <h2 className="font-display text-2xl font-extrabold leading-snug tracking-tight text-[var(--text-primary)] transition-colors group-hover:text-[var(--brand-cyan-strong)] md:text-3xl">
                {featured.title}
              </h2>
              {featured.excerpt && (
                <p className="text-base leading-relaxed text-[var(--text-secondary)] line-clamp-3">
                  {featured.excerpt}
                </p>
              )}
              <div className="flex items-center gap-2.5 pt-1">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--brand-cyan-strong)] text-sm font-bold text-white">
                  {featured.author.name.charAt(0)}
                </span>
                <div className="flex flex-col">
                  <span className="text-sm font-medium text-[var(--text-primary)]">{featured.author.name}</span>
                  {featured.publishedAt && (
                    <span className="text-xs text-[var(--text-muted)]">{dateLong(featured.publishedAt)}</span>
                  )}
                </div>
              </div>
              <span className="link-arrow mt-1">
                Baca selengkapnya
                <ArrowRight size={16} aria-hidden="true" />
              </span>
            </div>
          </Link>
        </section>
      )}

      {/* Filters + search */}
      <section className="container-pad pt-10">
        <div className="flex flex-col gap-4 border-b border-[var(--border-subtle)] pb-6 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide">
            <button type="button" onClick={() => { setCategory(""); setPage(1); }} className={chip(!category)}>
              Semua
            </button>
            {CATEGORIES.map((cat) => (
              <button key={cat} type="button" onClick={() => { setCategory(cat); setPage(1); }} className={chip(category === cat)}>
                {cat}
              </button>
            ))}
          </div>
          <div className="relative w-full md:w-80">
            <Search
              size={18}
              aria-hidden="true"
              className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)]"
            />
            <input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Cari artikel…"
              className="input-dark !rounded-full !pl-10"
              aria-label="Cari artikel"
            />
          </div>
        </div>
      </section>

      {/* Results */}
      <div className="container-pad py-10">
        {loading ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="card overflow-hidden !p-0">
                <div className="skeleton aspect-video !rounded-none" />
                <div className="flex flex-col gap-2.5 p-5">
                  <div className="skeleton h-3 w-16" />
                  <div className="skeleton h-4 w-full" />
                  <div className="skeleton h-4 w-2/3" />
                </div>
              </div>
            ))}
          </div>
        ) : posts.length === 0 ? (
          <EmptyState
            icon={Newspaper}
            title="Belum ada artikel"
            description="Artikel dan panduan sedang disiapkan. Cek lagi nanti — konten baru akan tayang di sini."
          />
        ) : (
          <>
            <p className="mb-6 text-sm text-[var(--text-muted)]">{total} artikel ditemukan</p>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {gridPosts.map((post) => (
                <Link key={post.id} href={`/blog/${post.slug}`} className="card group flex flex-col overflow-hidden !p-0">
                  <div className="relative aspect-video w-full overflow-hidden border-b border-[var(--border-subtle)]">
                    {post.coverUrl ? (
                      <Image
                        src={post.coverUrl}
                        alt={post.title}
                        fill
                        sizes="(min-width: 1024px) 33vw, (min-width: 768px) 50vw, 100vw"
                        className="object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                      />
                    ) : (
                      <MediaPlaceholder type="foto" ratio="16:9" showRatio={false} className="!rounded-none !border-0" />
                    )}
                    {post.category && (
                      <span className="glass-card absolute left-3 top-3 rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-accent shadow-[var(--shadow-e1)]">
                        {post.category}
                      </span>
                    )}
                  </div>
                  <div className="flex flex-1 flex-col p-5">
                    {post.publishedAt && (
                      <p className="mb-2 text-xs text-[var(--text-muted)]">{dateLong(post.publishedAt)}</p>
                    )}
                    <h2 className="font-display text-base font-bold leading-snug text-[var(--text-primary)] line-clamp-2 transition-colors group-hover:text-[var(--brand-cyan-strong)]">
                      {post.title}
                    </h2>
                    {post.excerpt && (
                      <p className="mt-1.5 text-sm leading-relaxed text-[var(--text-secondary)] line-clamp-2">{post.excerpt}</p>
                    )}
                    <div className="mt-4 flex items-center gap-2 border-t border-[var(--border-subtle)] pt-3">
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[var(--brand-cyan-strong)] text-xs font-bold text-white">
                        {post.author.name.charAt(0)}
                      </span>
                      <span className="text-xs text-[var(--text-secondary)]">{post.author.name}</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>

            {total > 12 && (
              <div className="mt-10 flex justify-center gap-2">
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="btn btn-ghost btn-sm disabled:opacity-40"
                >
                  <ChevronLeft size={15} aria-hidden="true" />
                  Sebelumnya
                </button>
                <span className="px-4 py-2 text-sm text-[var(--text-muted)]">Halaman {page}</span>
                <button
                  type="button"
                  onClick={() => setPage((p) => p + 1)}
                  disabled={page * 12 >= total}
                  className="btn btn-ghost btn-sm disabled:opacity-40"
                >
                  Berikutnya
                  <ChevronRight size={15} aria-hidden="true" />
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
