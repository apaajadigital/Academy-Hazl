"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Briefcase, Sparkles } from "lucide-react";
import { API_BASE as API } from "@/lib/api/base";

const PAGE_SIZE = 12;

// ─── Types (defensive — backend contract is being built in parallel) ──────────

type ApiPortfolio = {
  id: string;
  name: string;
  role: string;
  headline?: string | null;
  photoUrl?: string | null;
  featured?: boolean;
};

type ApiMeta = {
  total?: number;
  page?: number;
  limit?: number;
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

/** Only render remote photos from https URLs; anything else falls back to initials. */
function safePhotoUrl(url: string | null | undefined): string | null {
  return url && url.startsWith("https://") ? url : null;
}

// ─── Card ─────────────────────────────────────────────────────────────────────

function MemberCard({ member }: { member: ApiPortfolio }) {
  const photo = safePhotoUrl(member.photoUrl);

  return (
    <Link
      href={`/portofolio-member/${encodeURIComponent(member.id)}`}
      className={`pm-card ${member.featured ? "pm-card-featured" : ""}`}
    >
      {member.featured && (
        <span className="pm-badge">
          <Sparkles size={11} aria-hidden="true" />
          Unggulan
        </span>
      )}
      {photo ? (
        // Remote user-uploaded photos come from arbitrary hosts, so
        // next/image (which requires a domain allowlist) is not usable here.
        <img src={photo} alt="" className="pm-avatar-img" loading="lazy" />
      ) : (
        <div className="pm-avatar-initials" aria-hidden="true">
          {initialsOf(member.name)}
        </div>
      )}
      <h2 className="pm-name">{member.name}</h2>
      <p className="pm-role">{member.role}</p>
      {member.headline && <p className="pm-headline">{member.headline}</p>}
      <span className="pm-view-link">Lihat portofolio →</span>
    </Link>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function PortofolioMemberPage() {
  // null = loading; [] = loaded-but-empty (or fetch failed — degrade to the
  // polite empty state, never a broken page).
  const [members, setMembers] = useState<ApiPortfolio[] | null>(null);
  const [total, setTotal] = useState<number | null>(null);
  const [page, setPage] = useState(1);
  const [loadingMore, setLoadingMore] = useState(false);

  const fetchPage = useCallback(async (pageNum: number): Promise<{
    items: ApiPortfolio[];
    total: number | null;
  }> => {
    try {
      const res = await fetch(`${API}/api/portfolios?page=${pageNum}&limit=${PAGE_SIZE}`);
      const body = (await res.json()) as {
        success?: boolean;
        data?: unknown;
        meta?: ApiMeta;
      };
      if (!body?.success) return { items: [], total: null };
      const raw = Array.isArray(body.data) ? body.data : [];
      const items = (raw as ApiPortfolio[]).filter((m) => Boolean(m && m.id && m.name && m.role));
      const totalCount =
        typeof body.meta?.total === "number" && Number.isFinite(body.meta.total)
          ? body.meta.total
          : null;
      return { items, total: totalCount };
    } catch {
      return { items: [], total: null };
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    void fetchPage(1).then(({ items, total: t }) => {
      if (cancelled) return;
      setMembers(items);
      setTotal(t);
    });
    return () => {
      cancelled = true;
    };
  }, [fetchPage]);

  const loaded = members?.length ?? 0;
  const hasMore = total !== null && total > loaded;

  const loadMore = async () => {
    if (loadingMore) return;
    setLoadingMore(true);
    const next = page + 1;
    const { items, total: t } = await fetchPage(next);
    setMembers((prev) => [...(prev ?? []), ...items]);
    setPage(next);
    if (t !== null) setTotal(t);
    // Defensive: if the API stops returning items, stop offering "load more".
    if (items.length === 0) setTotal(loaded);
    setLoadingMore(false);
  };

  return (
    <div className="pm-root">
      {/* Hero */}
      <section className="pm-hero">
        <div className="pm-hero-inner">
          <span className="pm-eyebrow">
            <Briefcase size={14} aria-hidden="true" />
            Portofolio Member
          </span>
          <h1 className="pm-hero-title">
            Karya Nyata,
            <br />
            <span className="pm-hero-gradient">Dari Member Komunitas Kami</span>
          </h1>
          <p className="pm-hero-desc">
            Proyek dan karya yang dipublikasikan langsung oleh member Jago
            Akademi — bukti nyata hasil belajar mereka.
          </p>
        </div>
        <div className="pm-hero-glow" aria-hidden="true" />
      </section>

      {/* Grid */}
      <section className="pm-grid-section">
        {members === null ? (
          <div className="pm-grid" aria-busy="true" aria-label="Memuat portofolio member">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="pm-skeleton-card">
                <div className="pm-skeleton-circle" />
                <div className="pm-skeleton-line pm-skeleton-name" />
                <div className="pm-skeleton-line pm-skeleton-short" />
              </div>
            ))}
          </div>
        ) : members.length === 0 ? (
          <div className="pm-empty">
            <div className="pm-empty-icon" aria-hidden="true">
              🗂️
            </div>
            <h2 className="pm-empty-title">Portofolio member segera hadir</h2>
            <p className="pm-empty-desc">
              Member kami sedang menyusun portofolio mereka. Halaman ini hanya
              menampilkan karya yang benar-benar dipublikasikan — nantikan
              segera.
            </p>
            <Link href="/kelas-gratis" className="pm-btn-primary">
              Mulai Belajar Gratis
            </Link>
          </div>
        ) : (
          <>
            <div className="pm-grid">
              {members.map((member) => (
                <MemberCard key={member.id} member={member} />
              ))}
            </div>
            {hasMore && (
              <div className="pm-more-wrap">
                <button
                  type="button"
                  className="pm-btn-outline"
                  onClick={() => void loadMore()}
                  disabled={loadingMore}
                >
                  {loadingMore ? "Memuat…" : "Muat lebih banyak"}
                </button>
              </div>
            )}
          </>
        )}
      </section>

      <style>{`
        .pm-root {
          min-height: 100vh;
          background: var(--surface-page, #0a1628);
          color: var(--text-primary, #fff);
          font-family: var(--font-body, 'Inter', sans-serif);
        }

        /* Hero */
        .pm-hero {
          position: relative;
          overflow: hidden;
          padding: 96px 24px 64px;
          text-align: center;
          background: linear-gradient(180deg, #050d1a 0%, #0a1628 100%);
        }
        .pm-hero-inner { position: relative; z-index: 1; max-width: 720px; margin: 0 auto; }
        .pm-hero-glow {
          position: absolute;
          top: -200px; left: 50%; transform: translateX(-50%);
          width: 800px; height: 600px; border-radius: 50%;
          background: radial-gradient(ellipse, rgba(204,0,82,0.12) 0%, transparent 70%);
          pointer-events: none;
        }
        .pm-eyebrow {
          display: inline-flex; align-items: center; gap: 6px;
          font-size: 13px; font-weight: 600; letter-spacing: 0.05em;
          color: var(--brand-cyan, #00d4ff);
          background: rgba(0,212,255,0.08);
          border: 1px solid rgba(0,212,255,0.2);
          border-radius: 100px; padding: 4px 14px;
          margin-bottom: 20px;
        }
        .pm-hero-title {
          font-size: clamp(2rem, 5vw, 3.25rem);
          font-weight: 800; line-height: 1.15;
          letter-spacing: -0.03em;
          color: #fff; margin-bottom: 20px;
        }
        .pm-hero-gradient {
          background: linear-gradient(135deg, #00d4ff, #cc0052);
          -webkit-background-clip: text; -webkit-text-fill-color: transparent;
          background-clip: text;
        }
        .pm-hero-desc {
          font-size: 1.05rem; line-height: 1.7;
          color: rgba(255,255,255,0.62);
          max-width: 560px; margin: 0 auto;
        }

        /* Grid */
        .pm-grid-section { padding: 64px 24px 80px; max-width: 1200px; margin: 0 auto; }
        .pm-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
          gap: 24px;
        }

        /* Card */
        .pm-card {
          position: relative;
          display: flex; flex-direction: column; align-items: center;
          text-align: center; gap: 6px;
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 20px;
          padding: 32px 24px 26px;
          text-decoration: none;
          transition: transform 0.2s, box-shadow 0.2s, border-color 0.2s;
        }
        .pm-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 20px 60px rgba(0,0,0,0.3);
          border-color: rgba(0,212,255,0.3);
        }
        .pm-card-featured {
          border-color: rgba(204,0,82,0.4);
          background: linear-gradient(135deg, rgba(204,0,82,0.08), rgba(0,119,168,0.05));
          box-shadow: 0 0 0 1px rgba(204,0,82,0.3), 0 12px 40px rgba(204,0,82,0.1);
        }
        .pm-badge {
          position: absolute; top: -11px; left: 50%; transform: translateX(-50%);
          display: inline-flex; align-items: center; gap: 4px;
          background: linear-gradient(135deg, #cc0052, #0077A8);
          color: #fff; font-size: 11px; font-weight: 700;
          padding: 3px 12px; border-radius: 100px;
          letter-spacing: 0.04em; white-space: nowrap;
        }
        .pm-avatar-img {
          width: 72px; height: 72px; border-radius: 50%;
          object-fit: cover;
          border: 2px solid rgba(255,255,255,0.12);
          margin-bottom: 8px;
        }
        .pm-avatar-initials {
          width: 72px; height: 72px; border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          background: linear-gradient(135deg, rgba(0,119,168,0.5), rgba(204,0,82,0.4));
          color: #fff; font-size: 22px; font-weight: 700;
          border: 2px solid rgba(255,255,255,0.12);
          margin-bottom: 8px;
        }
        .pm-name { font-size: 16px; font-weight: 700; color: #fff; }
        .pm-role { font-size: 13px; color: var(--brand-cyan, #00d4ff); }
        .pm-headline {
          font-size: 13px; line-height: 1.6;
          color: rgba(255,255,255,0.55);
          margin-top: 4px;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
        .pm-view-link {
          margin-top: 12px;
          font-size: 13px; font-weight: 600;
          color: rgba(255,255,255,0.65);
        }
        .pm-card:hover .pm-view-link { color: var(--brand-cyan, #00d4ff); }

        /* Load more */
        .pm-more-wrap { text-align: center; margin-top: 40px; }
        .pm-btn-outline {
          display: inline-flex; align-items: center; gap: 8px;
          padding: 13px 28px;
          background: rgba(255,255,255,0.06);
          color: rgba(255,255,255,0.8);
          border: 1px solid rgba(255,255,255,0.12);
          font-size: 14px; font-weight: 600;
          border-radius: 12px; cursor: pointer;
          transition: all 0.2s;
          font-family: inherit;
        }
        .pm-btn-outline:hover:not(:disabled) { background: rgba(255,255,255,0.1); }
        .pm-btn-outline:disabled { opacity: 0.6; cursor: default; }

        /* Skeleton */
        .pm-skeleton-card {
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 20px; padding: 32px 24px;
          display: flex; flex-direction: column; align-items: center; gap: 12px;
        }
        .pm-skeleton-circle {
          width: 72px; height: 72px; border-radius: 50%;
          background: rgba(255,255,255,0.06);
          animation: pm-pulse 1.4s ease-in-out infinite;
        }
        .pm-skeleton-line {
          height: 14px; border-radius: 6px; width: 80%;
          background: rgba(255,255,255,0.06);
          animation: pm-pulse 1.4s ease-in-out infinite;
        }
        .pm-skeleton-name { width: 60%; }
        .pm-skeleton-short { width: 45%; }
        @keyframes pm-pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.45; }
        }

        /* Empty state */
        .pm-empty {
          max-width: 520px; margin: 0 auto;
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 20px;
          padding: 48px 32px; text-align: center;
          display: flex; flex-direction: column; align-items: center; gap: 12px;
        }
        .pm-empty-icon { font-size: 2rem; }
        .pm-empty-title { font-size: 1.2rem; font-weight: 700; color: #fff; }
        .pm-empty-desc {
          font-size: 14px; line-height: 1.7;
          color: rgba(255,255,255,0.55); margin-bottom: 12px;
        }
        .pm-btn-primary {
          display: inline-flex; align-items: center; gap: 8px;
          padding: 13px 28px;
          background: linear-gradient(135deg, #0077A8, #cc0052);
          color: #fff; font-size: 14px; font-weight: 700;
          border-radius: 12px; text-decoration: none;
          box-shadow: 0 4px 20px rgba(0,119,168,0.35);
          transition: all 0.2s;
        }
        .pm-btn-primary:hover { opacity: 0.9; transform: translateY(-2px); }

        @media (max-width: 640px) {
          .pm-hero { padding: 72px 16px 48px; }
          .pm-hero-title { font-size: 1.75rem; }
          .pm-grid-section { padding: 48px 16px 56px; }
          .pm-grid { grid-template-columns: 1fr; }
        }
      `}</style>
    </div>
  );
}
