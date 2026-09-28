import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { ChevronRight, BookOpen, FileText, ShoppingBag, Sparkles } from "lucide-react";
import EBookActions from "./EBookActions";
import { API_BASE } from "@/lib/api/base";

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
    const res = await fetch(`${API_BASE}/api/ebooks/${slug}`, {
      cache: "no-store",
    });
    const data = await res.json();
    return data.success ? data.data : null;
  } catch {
    return null;
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const book = await getEBook(slug);

  if (!book) {
    return { title: "E-Book tidak ditemukan | Hazl Academy" };
  }

  const description =
    (book.description ?? `${book.title} — panduan video AI di Hazl Academy.`)
      .slice(0, 160)
      .replace(/\s+/g, " ")
      .trim();

  return {
    title: `${book.title} | Hazl Academy`,
    description,
    alternates: { canonical: `/ebook/${book.slug}` },
    openGraph: {
      title: `${book.title} | Hazl Academy`,
      description,
      type: "website",
      url: `/ebook/${book.slug}`,
      ...(book.coverUrl ? { images: [{ url: book.coverUrl }] } : {}),
    },
  };
}

export default async function EBookDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const book = await getEBook(slug);
  if (!book) notFound();

  const displayPrice = book.salePrice ?? book.price;
  const isFree = Number(displayPrice) === 0;
  const discount =
    book.salePrice && book.price > 0 && book.salePrice < book.price
      ? Math.round(((book.price - book.salePrice) / book.price) * 100)
      : null;

  return (
    <div className="min-h-screen bg-[#FAFAFC] pt-24 pb-20">
      <div className="mx-auto max-w-5xl px-6 lg:px-8">
        {/* Breadcrumb */}
        <nav aria-label="Breadcrumb" className="mb-8 flex items-center gap-2 text-sm text-[#707880]">
          <Link href="/ebook" className="transition-colors hover:text-[#0077A8]">
            E-Book &amp; Prompt Library
          </Link>
          <ChevronRight size={14} aria-hidden="true" className="text-[#9CA3AF]" />
          <span className="line-clamp-1 font-medium text-[#16181D]">{book.title}</span>
        </nav>

        <div className="grid gap-10 md:grid-cols-12 items-start">
          {/* Cover */}
          <div className="md:col-span-5">
            <div className="relative flex aspect-[3/4] w-full items-center justify-center overflow-hidden rounded-[28px] border border-[#E7E9EC] bg-gradient-to-br from-[#E8F6FF] to-[#D0EDFF] shadow-sm">
              {book.coverUrl ? (
                <Image
                  src={book.coverUrl}
                  alt={book.title}
                  fill
                  sizes="(min-width: 768px) 40vw, 100vw"
                  className="object-cover"
                />
              ) : (
                <div className="flex flex-col items-center gap-3 text-[#0077A8]">
                  <BookOpen size={64} aria-hidden="true" />
                  <span className="text-xs font-bold uppercase tracking-wider text-[#0077A8]">
                    Prompt Guide
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Info */}
          <div className="md:col-span-7 flex flex-col">
            {book.category && (
              <span className="inline-flex items-center gap-1.5 w-fit rounded-full border border-[#C8E6FF] bg-[#E8F6FF] px-3.5 py-1 text-xs font-bold uppercase tracking-[0.12em] text-[#0077A8] mb-3">
                <Sparkles size={12} />
                {book.category}
              </span>
            )}
            <h1 className="font-display text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-[#16181D] leading-tight">
              {book.title}
            </h1>
            {book.author && <p className="mt-2 text-sm text-[#5B616E]">Karya {book.author}</p>}

            {book.description && (
              <p className="mt-4 text-sm sm:text-base leading-relaxed text-[#5B616E]">
                {book.description}
              </p>
            )}

            {(book.pages || book.totalSold > 0) && (
              <div className="mt-6 grid grid-cols-2 gap-4">
                {book.pages && (
                  <div className="rounded-2xl border border-[#E7E9EC] bg-white p-4 shadow-xs">
                    <div className="mb-1 flex items-center gap-1.5 text-[#0077A8]">
                      <FileText size={15} aria-hidden="true" />
                      <span className="text-xs font-semibold uppercase tracking-wide text-[#707880]">
                        Halaman
                      </span>
                    </div>
                    <p className="font-display text-lg font-bold text-[#16181D]">{book.pages}</p>
                  </div>
                )}
                {book.totalSold > 0 && (
                  <div className="rounded-2xl border border-[#E7E9EC] bg-white p-4 shadow-xs">
                    <div className="mb-1 flex items-center gap-1.5 text-[#0077A8]">
                      <ShoppingBag size={15} aria-hidden="true" />
                      <span className="text-xs font-semibold uppercase tracking-wide text-[#707880]">
                        Terunduh
                      </span>
                    </div>
                    <p className="font-display text-lg font-bold text-[#16181D]">
                      {book.totalSold.toLocaleString("id-ID")}
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Price + purchase card */}
            <div className="mt-8 rounded-[28px] border border-[#E7E9EC] bg-white p-6 sm:p-8 shadow-sm">
              <div className="mb-6 flex flex-wrap items-baseline gap-3">
                <span className="font-display text-3xl sm:text-4xl font-extrabold tracking-tight text-[#16181D]">
                  {isFree ? "Gratis Unduh" : `Rp ${Number(displayPrice).toLocaleString("id-ID")}`}
                </span>
                {book.salePrice && book.price > book.salePrice && (
                  <span className="text-base text-[#9CA3AF] line-through">
                    Rp {Number(book.price).toLocaleString("id-ID")}
                  </span>
                )}
                {discount && (
                  <span className="rounded-full bg-[#FF2F86]/10 px-3 py-1 text-xs font-bold text-[#CC0052]">
                    Hemat {discount}%
                  </span>
                )}
              </div>
              <EBookActions ebookSlug={book.slug} price={displayPrice} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
