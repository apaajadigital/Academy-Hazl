import Link from "next/link";
import Image from "next/image";
import { Library } from "lucide-react";
import { Section, SectionHeader } from "@/components/ui/Section";
import { EmptyState } from "@/components/ui/EmptyState";
import { Reveal } from "@/components/ui/Reveal";
import { MediaPlaceholder } from "@/components/shared/MediaPlaceholder";
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
};

async function getEBooks(): Promise<EBook[]> {
  try {
    const res = await fetch(
      `${API_BASE}/api/ebooks?limit=24`,
      {
        next: { revalidate: 300 },
        signal: AbortSignal.timeout(8000), // fail fast so build never hangs on a slow/unreachable API
      }
    );
    const data = await res.json();
    return data.success ? data.data : [];
  } catch {
    return [];
  }
}

export default async function EBookPage() {
  const ebooks = await getEBooks();

  return (
    <div className="pt-16">
      <Section>
        <SectionHeader
          eyebrow="E-Book"
          title={
            <>
              Referensi <span className="text-accent">praktis</span> untuk kerja
            </>
          }
          lede="Panduan dan template digital siap pakai untuk mendukung perjalanan belajarmu."
        />

        {ebooks.length === 0 ? (
          <EmptyState
            icon={Library}
            title="Belum ada e-book"
            description="Koleksi e-book sedang disiapkan. Gabung early access agar jadi yang pertama tahu saat rilis."
            action={
              <Link href="/early-access" className="btn btn-primary">
                Gabung Early Access
              </Link>
            }
          />
        ) : (
          <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-4">
            {ebooks.map((book, i) => {
              const displayPrice = book.salePrice ?? book.price;
              return (
                <Reveal key={book.id} delay={(i % 4) * 0.05}>
                  <Link href={`/ebook/${book.slug}`} className="card group flex h-full flex-col overflow-hidden !p-0">
                    <div className="relative aspect-[3/4] w-full overflow-hidden border-b border-[var(--border-subtle)]">
                      {book.coverUrl ? (
                        <Image
                          src={book.coverUrl}
                          alt={book.title}
                          fill
                          sizes="(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw"
                          className="object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                        />
                      ) : (
                        <MediaPlaceholder type="foto" ratio="3:4" showRatio={false} className="!rounded-none !border-0" />
                      )}
                    </div>
                    <div className="flex flex-1 flex-col gap-1.5 p-4">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--brand-cyan-strong)]">
                        {book.category ?? "E-Book"}
                      </p>
                      <h3 className="font-display text-sm font-bold leading-snug text-[var(--text-primary)] line-clamp-2">
                        {book.title}
                      </h3>
                      {book.author && <p className="text-xs text-[var(--text-muted)]">{book.author}</p>}
                      <div className="mt-auto flex items-center gap-2 pt-2">
                        <span className="text-sm font-bold text-[var(--text-primary)]">
                          Rp {Number(displayPrice).toLocaleString("id-ID")}
                        </span>
                        {book.salePrice && (
                          <span className="text-xs text-[var(--text-muted)] line-through">
                            Rp {Number(book.price).toLocaleString("id-ID")}
                          </span>
                        )}
                      </div>
                    </div>
                  </Link>
                </Reveal>
              );
            })}
          </div>
        )}
      </Section>
    </div>
  );
}
