"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { BookMarked, Search, X, ShoppingBag } from "lucide-react";
import { fetchList, resolveListState, type ListState } from "@/lib/api/listResource";

// The catalog is sourced solely from GET /api/ebooks. The former
// "recording" | "module" variants were mock-only: nothing ever produced them and
// their checkout link (?type=module) was rejected by /checkout/[slug], which only
// accepts course | event | ebook. Both were removed rather than patched — the real
// multi-type marketplace arrives with TASK-042 and its own backend.
type MarketplaceItem = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  price: string;
  salePrice: string | null;
  coverUrl: string | null;
  author: string | null;
  category: string | null;
  extraInfo?: string; // e.g. "180 Halaman"
};

// Shape of an e-book record returned by GET /api/ebooks.
type ApiEbook = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  price: string;
  salePrice: string | null;
  coverUrl: string | null;
  author: string | null;
  category: string | null;
  pages?: number | null;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatPrice(price: string, salePrice: string | null) {
  const num = salePrice ? Number(salePrice) : Number(price);
  if (num === 0) return "Gratis";
  return `Rp ${num.toLocaleString("id-ID")}`;
}

function getDiscount(price: string, salePrice: string | null): number | null {
  if (!salePrice) return null;
  const orig = Number(price);
  const sale = Number(salePrice);
  if (orig <= 0 || sale >= orig) return null;
  return Math.round(((orig - sale) / orig) * 100);
}

// ─── Skeleton Card ─────────────────────────────────────────────────────────────

function SkeletonCard() {
  return (
    <div className="card overflow-hidden !p-0" style={{ background: "var(--surface-card)", border: "1px solid var(--border-subtle)" }}>
      <div className="skeleton !rounded-none" style={{ aspectRatio: "3/4" }} />
      <div className="flex flex-col gap-2.5 p-4">
        <div className="skeleton h-3 w-16" />
        <div className="skeleton h-4 w-full" />
        <div className="skeleton h-4 w-2/3" />
        <div className="skeleton mt-1 h-5 w-24" />
      </div>
    </div>
  );
}

// ─── Item Card ────────────────────────────────────────────────────────────────

function ProductCard({ item }: { item: MarketplaceItem }) {
  const discount = getDiscount(item.price, item.salePrice);

  return (
    <Link
      href={`/ebook/${item.slug}`}
      className="card group flex flex-col overflow-hidden !p-0 transition-all duration-300 hover:translate-y-[-4px] hover:shadow-e2"
      style={{
        background: "var(--surface-card)",
        border: "1px solid var(--border-subtle)",
        borderRadius: "16px",
      }}
      aria-label={item.title}
    >
      {/* Cover/Placeholder Area */}
      <div className="relative overflow-hidden" style={{ aspectRatio: "3/4" }}>
        {item.coverUrl ? (
          <Image
            src={item.coverUrl}
            alt={item.title}
            fill
            sizes="(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw"
            className="object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div
            className="flex h-full w-full flex-col items-center justify-center gap-3 p-4"
            style={{ background: "linear-gradient(135deg, var(--surface-accent-soft) 0%, rgba(0,119,168,0.05) 100%)" }}
          >
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl" style={{ background: "var(--surface-card)", border: "1px solid var(--border-subtle)", boxShadow: "var(--shadow-e1)" }}>
              <BookMarked size={36} style={{ color: "var(--brand-cyan-strong)", opacity: 0.8 }} />
            </div>
            <p className="px-2 text-center text-xs font-semibold leading-normal text-[var(--text-secondary)] line-clamp-3">
              {item.title}
            </p>
          </div>
        )}

        {/* Discount Badge */}
        {discount && (
          <span
            className="absolute right-2.5 top-2.5 rounded-full px-2 py-0.5 text-xs font-bold text-white bg-green-600"
          >
            -{discount}%
          </span>
        )}
      </div>

      {/* Product Details */}
      <div className="flex flex-1 flex-col gap-1.5 p-4">
        <div className="flex items-center gap-1.5">
          {item.category && (
            <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: "var(--brand-cyan-strong)" }}>
              {item.category}
            </p>
          )}
          <span className="text-[9px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded" style={{
            background: "rgba(0,212,255,0.08)",
            color: "var(--brand-cyan)"
          }}>
            E-Book
          </span>
        </div>
        
        <h3 className="font-display text-sm font-bold leading-snug text-[var(--text-primary)] line-clamp-2 group-hover:text-[var(--brand-cyan-strong)] transition-colors">
          {item.title}
        </h3>
        
        {item.author && (
          <p className="text-xs text-[var(--text-muted)]">oleh {item.author}</p>
        )}

        <div className="mt-auto pt-3 border-t border-[var(--border-subtle)] flex flex-col gap-1">
          {item.salePrice ? (
            <div className="flex items-baseline gap-2">
              <span className="text-base font-extrabold" style={{ color: "var(--text-primary)" }}>
                {`Rp ${Number(item.salePrice).toLocaleString("id-ID")}`}
              </span>
              <span className="text-xs line-through text-[var(--text-muted)]">
                {`Rp ${Number(item.price).toLocaleString("id-ID")}`}
              </span>
            </div>
          ) : (
            <span className="text-base font-extrabold text-[var(--text-primary)]">
              {formatPrice(item.price, item.salePrice)}
            </span>
          )}
          {item.extraInfo && (
            <p className="text-[10px] text-[var(--text-muted)]">{item.extraInfo}</p>
          )}
        </div>
      </div>
    </Link>
  );
}

// ─── Marketplace Catalog Component ───────────────────────────────────────────

function MarketplaceCatalog() {
  // Finding #7: the "Semua/E-Book" tabs were dead after mock recordings/modules
  // were removed — getFilteredItems ignored activeTab — so the tab state and UI
  // were dropped. Search + category filters remain the sole controls.
  const [state, setState] = useState<ListState<MarketplaceItem>>({ kind: "loading" });
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("");
  const requestIdRef = useRef(0);

  // Fetch real EBooks from Backend
  const load = useCallback(() => {
    const id = ++requestIdRef.current;
    setState({ kind: "loading" });
    void fetchList<MarketplaceItem>("/api/ebooks?limit=50", (rows) =>
      (rows as ApiEbook[]).map((b) => ({
        id: b.id,
        slug: b.slug,
        title: b.title,
        description: b.description,
        price: b.price,
        salePrice: b.salePrice,
        coverUrl: b.coverUrl,
        author: b.author,
        category: b.category,
        extraInfo: b.pages ? `${b.pages} Halaman` : undefined,
      })),
    ).then((result) => {
      if (id !== requestIdRef.current) return; // superseded — drop it
      setState(resolveListState(result));
    });
  }, []);

  useEffect(() => { load(); }, [load]);

  const dbBooks = state.kind === "list" ? state.items : [];

  // Compute items displayed depending on active category and search query.
  const getFilteredItems = (): MarketplaceItem[] => {
    let items: MarketplaceItem[] = [];

    // Only real, purchasable inventory is shown. Recordings/modules were mock
    // data with a broken checkout (EPIC 8: no fictional data) and were removed;
    // the marketplace currently lists e-books sourced from the API.
    items = dbBooks;

    // Apply Search filter
    if (query) {
      const qLower = query.toLowerCase();
      items = items.filter(
        (item) =>
          item.title.toLowerCase().includes(qLower) ||
          (item.author && item.author.toLowerCase().includes(qLower)) ||
          (item.category && item.category.toLowerCase().includes(qLower))
      );
    }

    // Apply Category Filter
    if (activeCategory) {
      items = items.filter((item) => item.category === activeCategory);
    }

    return items;
  };

  const filteredItems = getFilteredItems();

  // Categories extraction helper
  const allCategories = Array.from(
    new Set(
      dbBooks
        .map((item) => item.category)
        .filter(Boolean)
    )
  ) as string[];

  return (
    <div className="mx-auto max-w-6xl px-4 pt-24 pb-16">
      
      {/* Section Header */}
      <div className="mb-10 text-center sm:text-left">
        <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold" style={{ background: "rgba(0,119,168,0.08)", border: "1px solid rgba(0,119,168,0.2)", color: "var(--brand-cyan-strong)" }}>
          <ShoppingBag size={12} /> Marketplace &amp; Aset
        </span>
        <h1 className="mt-4 mb-3 text-3xl md:text-4xl font-extrabold tracking-tight text-[var(--text-primary)] font-display">
          Koleksi Materi &amp; <span className="text-accent-cyan-strong">Aset Digital</span>
        </h1>
        <p className="max-w-2xl text-base leading-relaxed text-[var(--text-secondary)]">
          Etalase aset dan panduan digital Hazl Academy — berisi e-book teknis, panduan workflow generative AI, dan modul referensi praktisi. Beli sekali, unduh langsung, akses selamanya.
        </p>
      </div>

      {/* Feature Badges Strip */}
      <div className="mb-10 grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          { icon: "📥", text: "Download Instan" },
          { icon: "♾️", text: "Akses Selamanya" },
          { icon: "💳", text: "Satu Kali Bayar" },
          { icon: "✍️", text: "Ditulis Praktisi" },
        ].map((f) => (
          <div
            key={f.text}
            className="flex items-center gap-2.5 rounded-2xl p-4 transition-all duration-200 hover:scale-[1.02]"
            style={{
              background: "var(--surface-card)",
              border: "1px solid var(--border-subtle)",
              boxShadow: "var(--shadow-e1)",
            }}
          >
            <span className="text-xl">{f.icon}</span>
            <span className="text-xs font-bold text-[var(--text-secondary)]">{f.text}</span>
          </div>
        ))}
      </div>

      {/* Filters (Search & Categories) */}
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        {/* Search */}
        <div className="relative w-full sm:max-w-xs">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" aria-hidden="true" />
          <input
            id="marketplace-search-input"
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Cari produk..."
            className="input-dark w-full pl-9 pr-8"
            aria-label="Cari produk"
          />
          {query && (
            <button
              id="marketplace-search-clear-btn"
              onClick={() => setQuery("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-full p-0.5 hover:bg-[var(--border-subtle)]"
              aria-label="Hapus pencarian"
            >
              <X size={14} className="text-[var(--text-muted)]" aria-hidden="true" />
            </button>
          )}
        </div>

        {/* Category Pills */}
        {allCategories.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            <button
              id="marketplace-cat-all-btn"
              onClick={() => setActiveCategory("")}
              className="rounded-full px-3.5 py-1.5 text-xs font-bold transition-all border"
              style={
                activeCategory === ""
                  ? { background: "var(--brand-cyan-strong)", color: "#fff", borderColor: "var(--brand-cyan-strong)" }
                  : { background: "var(--surface-card)", color: "var(--text-secondary)", borderColor: "var(--border-default)" }
              }
            >
              Semua Topik
            </button>
            {allCategories.map((cat) => (
              <button
                id={`marketplace-cat-${cat.toLowerCase().replace(/\s+/g, "-")}-btn`}
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className="rounded-full px-3.5 py-1.5 text-xs font-bold transition-all border"
                style={
                  activeCategory === cat
                    ? { background: "var(--brand-cyan-strong)", color: "#fff", borderColor: "var(--brand-cyan-strong)" }
                    : { background: "var(--surface-card)", color: "var(--text-secondary)", borderColor: "var(--border-default)" }
                }
              >
                {cat}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Grid Area */}
      {state.kind === "loading" ? (
        <div className="grid grid-cols-2 gap-6 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {Array.from({ length: 8 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : state.kind === "error" ? (
        /* "Materi segera hadir" is a claim about our inventory. When the
           request failed we have no idea what the inventory holds, so we say
           what actually happened instead. */
        <div
          role="alert"
          className="flex flex-col items-center gap-4 rounded-2xl py-16 text-center"
          style={{ background: "var(--surface-card)", border: "1px solid var(--border-subtle)" }}
        >
          <div className="flex h-16 w-16 items-center justify-center rounded-full" style={{ background: "var(--surface-accent-soft)" }}>
            <BookMarked size={32} style={{ color: "var(--brand-cyan-strong)" }} />
          </div>
          <div>
            <h3 className="text-lg font-bold text-[var(--text-primary)]">Gagal memuat katalog</h3>
            <p className="text-sm text-[var(--text-secondary)] mt-1">
              Koneksi ke server sedang bermasalah, jadi katalog belum bisa
              ditampilkan. Ini bukan berarti katalognya kosong.
            </p>
          </div>
          <button type="button" onClick={load} className="btn btn-outline btn-sm mt-2">
            Muat Ulang
          </button>
        </div>
      ) : filteredItems.length === 0 ? (
        <div
          className="flex flex-col items-center gap-4 rounded-2xl py-16 text-center"
          style={{ background: "var(--surface-card)", border: "1px solid var(--border-subtle)" }}
        >
          <div className="flex h-16 w-16 items-center justify-center rounded-full" style={{ background: "var(--surface-accent-soft)" }}>
            <BookMarked size={32} style={{ color: "var(--brand-cyan-strong)" }} />
          </div>
          <div>
            <h3 className="text-lg font-bold text-[var(--text-primary)]">
              {query ? `Tidak ada hasil untuk "${query}"` : "Materi segera hadir"}
            </h3>
            <p className="text-sm text-[var(--text-secondary)] mt-1">
              {query ? "Coba gunakan kata kunci pencarian lain atau setel ulang filter." : "Kami sedang mengkurasi konten digital terbaik untuk kategori ini."}
            </p>
          </div>
          {query && (
            <button onClick={() => setQuery("")} className="btn btn-outline btn-sm mt-2">
              Hapus Pencarian
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-6 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {filteredItems.map((item) => (
            <ProductCard key={item.id} item={item} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function MarketplacePage() {
  return (
    <div style={{ background: "var(--surface-page)", minHeight: "100vh" }}>
      <MarketplaceCatalog />
    </div>
  );
}
