import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { ChevronRight, BookOpen, FileText, ShoppingBag } from "lucide-react";
import EBookActions from "./EBookActions";

type EBook = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  price: number;
  salePrice: number | null;
  coverUrl: string | null;
  author: string | null;
  pages: number | null;
  category: string | null;
  totalSold: number;
};

async function getEBook(slug: string): Promise<EBook | null> {
  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000"}/api/ebooks/${slug}`,
      { next: { revalidate: 300 } }
    );
    const data = await res.json();
    return data.success ? data.data : null;
  } catch {
    return null;
  }
}

// Finding #5: e-book detail previously shipped no metadata, so crawlers and
// social shares fell back to the generic site title. Emit real SEO metadata
// server-side (matches the blog/[slug] and event/[slug] convention).
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const book = await getEBook(slug);

  if (!book) {
    return { title: "E-Book tidak ditemukan — Jago Akademi" };
  }

  const description =
    (book.description ?? `${book.title} — e-book di Jago Akademi.`)
      .slice(0, 160)
      .replace(/\s+/g, " ")
      .trim();

  return {
    title: `${book.title} — E-Book Jago Akademi`,
    description,
    alternates: { canonical: `/ebook/${book.slug}` },
    openGraph: {
      title: book.title,
      description,
      type: "website",
      url: `/ebook/${book.slug}`,
      ...(book.coverUrl ? { images: [{ url: book.coverUrl }] } : {}),
    },
  };
}

export default async function EBookDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const book = await getEBook(slug);
  if (!book) notFound();

  const displayPrice = book.salePrice ?? book.price;
  const discount =
    book.salePrice && book.price > 0 && book.salePrice < book.price
      ? Math.round(((book.price - book.salePrice) / book.price) * 100)
      : null;

  return (
    <div className="min-h-screen" style={{ background: "var(--surface-page)" }}>
      <div className="mx-auto max-w-5xl px-4 py-12">
        {/* Breadcrumb */}
        <nav aria-label="Breadcrumb" className="mb-8 flex items-center gap-1.5 text-sm text-[var(--text-muted)]">
          <Link href="/ebook" className="transition-colors hover:text-[var(--brand-cyan-strong)]">
            E-Book
          </Link>
          <ChevronRight size={16} aria-hidden="true" className="text-[var(--border-strong)]" />
          <span className="line-clamp-1 text-[var(--text-secondary)]">{book.title}</span>
        </nav>

        <div className="grid gap-10 md:grid-cols-5">
          {/* Cover */}
          <div className="md:col-span-2">
            <div
              className="relative flex aspect-[3/4] items-center justify-center overflow-hidden rounded-2xl border border-[var(--border-subtle)]"
              style={{
                background: "linear-gradient(135deg, var(--surface-accent-soft) 0%, rgba(124,58,237,0.06) 100%)",
                boxShadow: "var(--shadow-e2)",
              }}
            >
              {book.coverUrl ? (
                <Image src={book.coverUrl} alt={book.title} fill sizes="(min-width: 768px) 40vw, 100vw" className="object-cover" />
              ) : (
                <BookOpen size={64} aria-hidden="true" style={{ color: "var(--brand-cyan-strong)", opacity: 0.7 }} />
              )}
            </div>
          </div>

          {/* Info */}
          <div className="md:col-span-3">
            {book.category && <span className="badge badge-cyan">{book.category}</span>}
            <h1 className="mt-3 mb-2 font-display text-2xl font-extrabold tracking-tight text-[var(--text-primary)] md:text-3xl">
              {book.title}
            </h1>
            {book.author && <p className="mb-4 text-[var(--text-secondary)]">oleh {book.author}</p>}

            {book.description && (
              <p className="mb-6 text-sm leading-relaxed text-[var(--text-secondary)]">{book.description}</p>
            )}

            {(book.pages || book.totalSold > 0) && (
              <div className="mb-6 grid grid-cols-2 gap-4">
                {book.pages && (
                  <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-sunken)] p-4">
                    <div className="mb-1 flex items-center gap-1.5 text-[var(--brand-cyan-strong)]">
                      <FileText size={15} aria-hidden="true" />
                      <span className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">Halaman</span>
                    </div>
                    <p className="font-display text-lg font-bold text-[var(--text-primary)]">{book.pages}</p>
                  </div>
                )}
                {book.totalSold > 0 && (
                  <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-sunken)] p-4">
                    <div className="mb-1 flex items-center gap-1.5 text-[var(--brand-cyan-strong)]">
                      <ShoppingBag size={15} aria-hidden="true" />
                      <span className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">Terjual</span>
                    </div>
                    <p className="font-display text-lg font-bold text-[var(--text-primary)]">{book.totalSold.toLocaleString("id-ID")}</p>
                  </div>
                )}
              </div>
            )}

            {/* Price + purchase card */}
            <div
              className="rounded-2xl border border-[var(--border-default)] bg-[var(--surface-card)] p-6"
              style={{ boxShadow: "var(--shadow-e2)" }}
            >
              <div className="mb-4 flex flex-wrap items-center gap-3">
                <span className="font-display text-3xl font-extrabold tracking-tight text-[var(--brand-cyan-strong)]">
                  Rp {Number(displayPrice).toLocaleString("id-ID")}
                </span>
                {book.salePrice && (
                  <span className="text-lg text-[var(--text-muted)] line-through">
                    Rp {Number(book.price).toLocaleString("id-ID")}
                  </span>
                )}
                {discount && <span className="badge badge-pink">Hemat {discount}%</span>}
              </div>
              <EBookActions ebookSlug={book.slug} price={displayPrice} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
