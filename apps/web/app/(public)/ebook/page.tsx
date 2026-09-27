import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { BookOpen, Sparkles, ArrowRight, DownloadCloud, FileText } from "lucide-react";
import { EmptyState } from "@/components/ui/EmptyState";
import { MediaPlaceholder } from "@/components/shared/MediaPlaceholder";
import { API_BASE } from "@/lib/api/base";

export const metadata: Metadata = {
  title: "E-Book & Prompt Library Video AI | Hazl Academy",
  description:
    "Koleksi prompt library, cheat sheet terminologi kamera, buku panduan ComfyUI, dan rate card kreator video AI Indonesia.",
  openGraph: {
    title: "E-Book & Prompt Library Video AI | Hazl Academy",
    description:
      "Template prompt siap pakai dan buku panduan teknis dari kreator video AI Indonesia.",
    type: "website",
  },
};

export const dynamic = "force-dynamic";

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
};

async function getEBooks(): Promise<EBook[]> {
  try {
    const res = await fetch(`${API_BASE}/api/ebooks?limit=24`, {
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
    });
    const data = await res.json();
    return data.success ? data.data : [];
  } catch {
    return [];
  }
}

export default async function EBookPage() {
  const ebooks = await getEBooks();

  return (
    <div className="w-full bg-[#FAFAFC] pt-24 pb-20">
      <div className="max-w-[1440px] mx-auto px-6 lg:px-8">
        {/* Header */}
        <div className="mb-12 text-center max-w-3xl mx-auto">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-[#C8E6FF] bg-[#E8F6FF] px-3.5 py-1 text-xs font-bold uppercase tracking-[0.14em] text-[#0077A8]">
            <Sparkles size={13} className="text-[#0077A8]" />
            E-Book &amp; Prompt Library
          </span>
          <h1 className="mt-3 text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-[#16181D]">
            Template prompt &amp; <span className="text-[#0077A8]">panduan video AI</span>
          </h1>
          <p className="mt-4 text-base sm:text-lg leading-relaxed text-[#5B616E]">
            Koleksi prompt teruji, cheat sheet angle kamera sinematik, buku panduan node workflow, dan standar rate card bisnis kreator.
          </p>
        </div>

        {ebooks.length === 0 ? (
          <EmptyState
            icon={BookOpen}
            title="Belum ada e-book"
            description="Koleksi prompt library dan e-book sedang disiapkan. Gabung early access agar jadi yang pertama tahu saat rilis."
            action={
              <Link
                href="/early-access"
                className="h-10 px-6 rounded-full bg-[#0077A8] text-white font-bold text-sm inline-flex items-center justify-center hover:bg-[#0D5B8A] transition-colors shadow-sm"
              >
                Gabung Early Access
              </Link>
            }
          />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {ebooks.map((book) => {
              const displayPrice = book.salePrice ?? book.price;
              const isFree = Number(displayPrice) === 0;

              return (
                <Link
                  key={book.id}
                  href={`/ebook/${book.slug}`}
                  className="group flex flex-col overflow-hidden rounded-[26px] border border-[#E7E9EC] bg-white shadow-sm hover:shadow-md transition-all duration-300"
                >
                  {/* Visual Header / Cover Canvas */}
                  <div className="relative aspect-[16/10] w-full overflow-hidden bg-gradient-to-br from-[#E8F6FF] to-[#D0EDFF] p-6 flex items-center justify-center">
                    {book.coverUrl ? (
                      <Image
                        src={book.coverUrl}
                        alt={book.title}
                        fill
                        sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                        className="object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                    ) : (
                      <div className="w-16 h-20 rounded-xl bg-white shadow-md border border-[#E7E9EC] flex flex-col items-center justify-center text-[#0077A8] group-hover:scale-110 transition-transform">
                        <FileText size={28} />
                      </div>
                    )}
                    <span className="absolute top-3 left-3 rounded-full bg-white/95 backdrop-blur-sm px-3 py-1 text-[11px] font-bold text-[#16181D] shadow-sm">
                      {book.category ?? "Prompt Library"}
                    </span>
                    {isFree && (
                      <span className="absolute top-3 right-3 rounded-full bg-[#00875A] text-white px-2.5 py-0.5 text-[10px] font-bold shadow-xs">
                        Gratis
                      </span>
                    )}
                  </div>

                  {/* Body Content */}
                  <div className="flex flex-1 flex-col p-5 sm:p-6">
                    <h3 className="font-display text-base sm:text-lg font-extrabold leading-snug text-[#16181D] transition-colors line-clamp-2 group-hover:text-[#0077A8]">
                      {book.title}
                    </h3>

                    {book.description && (
                      <p className="mt-2 text-xs sm:text-sm leading-relaxed text-[#5B616E] line-clamp-2">
                        {book.description}
                      </p>
                    )}

                    {/* Bottom Action Bar */}
                    <div className="mt-auto flex items-center justify-between border-t border-[#F0F2F5] pt-4 mt-5">
                      <div>
                        {book.salePrice && book.price > book.salePrice && (
                          <p className="text-[11px] text-[#9CA3AF] line-through">
                            Rp {Number(book.price).toLocaleString("id-ID")}
                          </p>
                        )}
                        <p className="text-base sm:text-lg font-black text-[#16181D]">
                          {isFree ? "Gratis Unduh" : `Rp ${Number(displayPrice).toLocaleString("id-ID")}`}
                        </p>
                      </div>

                      <span className="inline-flex h-9 items-center gap-1.5 rounded-full bg-[#16181D] px-3.5 text-xs font-bold text-white group-hover:bg-[#0077A8] transition-colors shadow-xs">
                        {isFree ? (
                          <>
                            <DownloadCloud size={13} />
                            <span>Unduh</span>
                          </>
                        ) : (
                          <>
                            <span>Detail</span>
                            <ArrowRight size={13} />
                          </>
                        )}
                      </span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
