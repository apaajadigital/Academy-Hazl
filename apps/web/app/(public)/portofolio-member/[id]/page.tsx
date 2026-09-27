"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { notFound, useParams } from "next/navigation";
import { ArrowLeft, ExternalLink, Sparkles, CheckCircle2, ShieldCheck, Play, Layers } from "lucide-react";
import { API_BASE as API } from "@/lib/api/base";

// ─── Types ────────────────────────────────────────────────────────────────────

type ApiPortfolioItem = {
  title: string;
  url?: string | null;
  imageUrl?: string | null;
  description?: string | null;
};

type ApiPortfolioDetail = {
  id: string;
  name: string;
  role: string;
  headline?: string | null;
  photoUrl?: string | null;
  featured?: boolean;
  portfolioItems?: ApiPortfolioItem[];
};

// ─── Curated Fallback for Showcase Items ───────────────────────────────────────

const CURATED_SHOWCASE_DETAILS: Record<string, ApiPortfolioDetail> = {
  "showcase-1": {
    id: "showcase-1",
    name: "Dimas Bagaskara",
    role: "Commercial Video Director",
    headline: "Batch 12 • Spesialisasi Iklan TVC Komersial & Consistent Character",
    photoUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120&auto=format&fit=crop&q=80",
    featured: true,
    portfolioItems: [
      {
        title: "High-Paced Commercial TVC for Hydration Brand",
        description: "Kampanye video iklan 30 detik untuk produk minuman olahraga. Karakter konsisten di 8 scene.",
        url: "https://youtube.com/watch?v=example1",
        imageUrl: "https://images.unsplash.com/photo-1579783902614-a3fb3927b675?w=600&auto=format&fit=crop&q=80",
      },
      {
        title: "Master Node Graph ComfyUI IP-Adapter",
        description: "Arsitektur kontrol wajah multi-angle tanpa glitch.",
        url: null,
      },
    ],
  },
  "showcase-2": {
    id: "showcase-2",
    name: "Maya Anggraini",
    role: "Creative Director",
    headline: "Batch 14 • Fashion & UGC Shortform Lookbook",
    photoUrl: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=120&auto=format&fit=crop&q=80",
    featured: true,
    portfolioItems: [
      {
        title: "OmniPOS: Shortform Fashion Lookbook UGC",
        description: "Lookbook katalog fesyen 15 detik dengan otomasi pencahayaan studio.",
        url: "https://vimeo.com/example2",
        imageUrl: "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=600&auto=format&fit=crop&q=80",
      },
    ],
  },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function initialsOf(name: string): string {
  return (
    name
      .split(" ")
      .filter(Boolean)
      .map((w) => w[0])
      .join("")
      .toUpperCase()
      .slice(0, 2) || "M"
  );
}

function safeHttpsUrl(url: string | null | undefined): string | null {
  return url && url.startsWith("https://") ? url : null;
}

// ─── Item Card (Preserves E2E Selector Contract: a.pd-item-link) ───────────────

function PortfolioItemCard({ item }: { item: ApiPortfolioItem }) {
  const image = safeHttpsUrl(item.imageUrl);
  const link = safeHttpsUrl(item.url);

  return (
    <article className="pd-item-card overflow-hidden rounded-2xl border border-border-default bg-white p-5 shadow-sm transition-all hover:border-accent-cyan-strong hover:shadow-md">
      {image && (
        <div className="pd-item-thumb-wrap relative mb-4 aspect-video w-full overflow-hidden rounded-xl bg-surface-page">
          <img src={image} alt="" className="pd-item-thumb h-full w-full object-cover" loading="lazy" />
        </div>
      )}
      <div className="pd-item-body space-y-2">
        <h3 className="pd-item-title text-base font-bold text-text-primary">{item.title}</h3>
        {item.description && (
          <p className="pd-item-desc text-xs md:text-sm text-text-secondary leading-relaxed">
            {item.description}
          </p>
        )}
        {link && (
          <div className="pt-2">
            <a
              href={link}
              target="_blank"
              rel="noopener noreferrer"
              className="pd-item-link inline-flex items-center gap-1.5 rounded-full bg-accent-cyan-strong px-4 py-2 text-xs font-bold text-white transition-opacity hover:opacity-90"
            >
              Lihat karya
              <ExternalLink size={13} aria-hidden="true" />
            </a>
          </div>
        )}
      </div>
    </article>
  );
}

// ─── Main Detail Page Component ───────────────────────────────────────────────

export default function PortofolioMemberDetailPage() {
  const params = useParams<{ id: string }>();
  const id = typeof params?.id === "string" ? params.id : "";

  const [member, setMember] = useState<ApiPortfolioDetail | null | undefined>(undefined);

  useEffect(() => {
    if (!id) {
      setMember(null);
      return;
    }

    // Check curated showcase item first
    if (CURATED_SHOWCASE_DETAILS[id]) {
      setMember(CURATED_SHOWCASE_DETAILS[id]);
      return;
    }

    let cancelled = false;
    fetch(`${API}/api/portfolios/${encodeURIComponent(id)}`)
      .then(async (res) => {
        const body = (await res.json()) as { success?: boolean; data?: unknown };
        if (cancelled) return;
        const data = body?.data as ApiPortfolioDetail | undefined;
        if (res.status === 404 || !body?.success || !data || !data.name || !data.role) {
          setMember(null);
        } else {
          setMember(data);
        }
      })
      .catch(() => {
        if (!cancelled) setMember(null);
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (member === null) notFound();

  const photo = member ? safeHttpsUrl(member.photoUrl) : null;
  const items = (member?.portfolioItems ?? []).filter((it) => Boolean(it && it.title));

  return (
    <main id="main-content" className="pd-root min-h-screen bg-surface-page py-12 md:py-16">
      <div className="container-pad max-w-4xl mx-auto">
        <Link
          href="/portofolio-member"
          className="pd-back inline-flex items-center gap-2 text-xs font-semibold text-text-secondary hover:text-accent-cyan-strong mb-8 transition-colors"
        >
          <ArrowLeft size={15} aria-hidden="true" />
          Kembali ke Repositori Portofolio
        </Link>

        {member === undefined ? (
          <div className="pd-skeleton rounded-2xl border border-border-default bg-white p-8 animate-pulse space-y-4" aria-busy="true">
            <div className="h-16 w-16 rounded-full bg-gray-200" />
            <div className="h-5 w-48 rounded bg-gray-200" />
            <div className="h-4 w-32 rounded bg-gray-200" />
          </div>
        ) : (
          <div className="space-y-8">
            {/* Profile Header Card */}
            <header className="pd-profile rounded-2xl border border-border-default bg-white p-6 md:p-10 shadow-sm flex flex-col md:flex-row items-start md:items-center gap-6">
              {photo ? (
                <img src={photo} alt="" className="pd-avatar-img h-20 w-20 md:h-24 md:w-24 rounded-full border border-border-default object-cover" />
              ) : (
                <div className="pd-avatar-initials flex h-20 w-20 md:h-24 md:w-24 items-center justify-center rounded-full bg-surface-accent-soft text-2xl font-bold text-accent-cyan-strong">
                  {initialsOf(member.name)}
                </div>
              )}

              <div className="pd-profile-text space-y-2 flex-1">
                {member.featured && (
                  <span className="pd-badge inline-flex items-center gap-1 rounded-full bg-surface-accent-soft px-3 py-1 text-xs font-bold text-accent-cyan-strong">
                    <Sparkles size={12} aria-hidden="true" />
                    Member Unggulan
                  </span>
                )}
                <h1 className="pd-name text-2xl md:text-3xl font-extrabold text-text-primary tracking-tight">
                  {member.name}
                </h1>
                <p className="pd-role text-xs md:text-sm font-semibold text-accent-cyan-strong">{member.role}</p>
                {member.headline && (
                  <p className="pd-headline text-xs md:text-sm text-text-secondary leading-relaxed max-w-xl">
                    {member.headline}
                  </p>
                )}
              </div>
            </header>

            {/* Portfolio Items Grid */}
            <section className="pd-items-section space-y-6" aria-label="Daftar karya">
              <div className="flex items-center justify-between border-b border-border-default pb-3">
                <h2 className="pd-section-title text-xl font-bold text-text-primary">Karya &amp; Proyek</h2>
                <span className="text-xs text-text-muted">{items.length} Karya Terdaftar</span>
              </div>

              {items.length === 0 ? (
                <div className="pd-empty rounded-2xl border border-border-default bg-white p-8 text-center shadow-sm">
                  <p className="pd-empty-desc text-xs md:text-sm text-text-secondary">
                    Member ini belum menambahkan karya ke portofolionya. Cek kembali nanti.
                  </p>
                </div>
              ) : (
                <div className="pd-items-grid grid grid-cols-1 gap-6 md:grid-cols-2">
                  {items.map((item, idx) => (
                    <PortfolioItemCard key={`${item.title}-${idx}`} item={item} />
                  ))}
                </div>
              )}
            </section>
          </div>
        )}
      </div>
    </main>
  );
}
