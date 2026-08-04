"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { notFound, useParams } from "next/navigation";
import { ArrowLeft, ExternalLink, Sparkles } from "lucide-react";
import { API_BASE as API } from "@/lib/api/base";

// ─── Types (defensive — backend contract is being built in parallel) ──────────

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

/** Only render remote media / external links from https URLs. */
function safeHttpsUrl(url: string | null | undefined): string | null {
  return url && url.startsWith("https://") ? url : null;
}

// ─── Item card ────────────────────────────────────────────────────────────────

function PortfolioItemCard({ item }: { item: ApiPortfolioItem }) {
  const image = safeHttpsUrl(item.imageUrl);
  const link = safeHttpsUrl(item.url);

  return (
    <article className="pd-item-card">
      {image && (
        <div className="pd-item-thumb-wrap">
          {/* Remote user-uploaded images come from arbitrary hosts, so
              next/image (which requires a domain allowlist) is not usable here. */}
          <img src={image} alt="" className="pd-item-thumb" loading="lazy" />
        </div>
      )}
      <div className="pd-item-body">
        <h3 className="pd-item-title">{item.title}</h3>
        {item.description && <p className="pd-item-desc">{item.description}</p>}
        {link && (
          <a
            href={link}
            target="_blank"
            rel="noopener noreferrer"
            className="pd-item-link"
          >
            Lihat karya
            <ExternalLink size={13} aria-hidden="true" />
          </a>
        )}
      </div>
    </article>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function PortofolioMemberDetailPage() {
  const params = useParams<{ id: string }>();
  const id = typeof params?.id === "string" ? params.id : "";

  // undefined = loading; null = not found (renders Next.js 404); otherwise data.
  const [member, setMember] = useState<ApiPortfolioDetail | null | undefined>(undefined);

  useEffect(() => {
    if (!id) {
      setMember(null);
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

  // API said 404 / not published / malformed → render the app's 404 page.
  if (member === null) notFound();

  const photo = member ? safeHttpsUrl(member.photoUrl) : null;
  const items = (member?.portfolioItems ?? []).filter((it) => Boolean(it && it.title));

  return (
    <div className="pd-root">
      <div className="pd-container">
        <Link href="/portofolio-member" className="pd-back">
          <ArrowLeft size={15} aria-hidden="true" />
          Semua Portofolio
        </Link>

        {member === undefined ? (
          <div className="pd-skeleton" aria-busy="true" aria-label="Memuat portofolio">
            <div className="pd-skeleton-circle" />
            <div className="pd-skeleton-line pd-skeleton-name" />
            <div className="pd-skeleton-line pd-skeleton-short" />
          </div>
        ) : (
          <>
            {/* Profile header */}
            <header className="pd-profile">
              {photo ? (
                <img src={photo} alt="" className="pd-avatar-img" />
              ) : (
                <div className="pd-avatar-initials" aria-hidden="true">
                  {initialsOf(member.name)}
                </div>
              )}
              <div className="pd-profile-text">
                {member.featured && (
                  <span className="pd-badge">
                    <Sparkles size={11} aria-hidden="true" />
                    Member Unggulan
                  </span>
                )}
                <h1 className="pd-name">{member.name}</h1>
                <p className="pd-role">{member.role}</p>
                {member.headline && <p className="pd-headline">{member.headline}</p>}
              </div>
            </header>

            {/* Portfolio items */}
            <section className="pd-items-section" aria-label="Daftar karya">
              <h2 className="pd-section-title">Karya &amp; Proyek</h2>
              {items.length === 0 ? (
                <div className="pd-empty">
                  <p className="pd-empty-desc">
                    Member ini belum menambahkan karya ke portofolionya. Cek
                    kembali nanti, ya.
                  </p>
                </div>
              ) : (
                <div className="pd-items-grid">
                  {items.map((item, idx) => (
                    <PortfolioItemCard key={`${item.title}-${idx}`} item={item} />
                  ))}
                </div>
              )}
            </section>
          </>
        )}
      </div>

      <style>{`
        .pd-root {
          min-height: 100vh;
          background: var(--surface-page, #0a1628);
          color: var(--text-primary, #fff);
          font-family: var(--font-body, 'Inter', sans-serif);
          padding: 96px 24px 80px;
        }
        .pd-container { max-width: 960px; margin: 0 auto; }

        .pd-back {
          display: inline-flex; align-items: center; gap: 7px;
          font-size: 13px; font-weight: 600;
          color: rgba(255,255,255,0.55);
          text-decoration: none;
          margin-bottom: 32px;
          transition: color 0.2s;
        }
        .pd-back:hover { color: var(--brand-cyan, #00d4ff); }

        /* Profile header */
        .pd-profile {
          display: flex; align-items: center; gap: 24px;
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 20px;
          padding: 32px;
          margin-bottom: 40px;
        }
        .pd-avatar-img {
          width: 96px; height: 96px; border-radius: 50%;
          object-fit: cover; flex-shrink: 0;
          border: 2px solid rgba(255,255,255,0.12);
        }
        .pd-avatar-initials {
          width: 96px; height: 96px; border-radius: 50%; flex-shrink: 0;
          display: flex; align-items: center; justify-content: center;
          background: linear-gradient(135deg, rgba(0,119,168,0.5), rgba(204,0,82,0.4));
          color: #fff; font-size: 28px; font-weight: 700;
          border: 2px solid rgba(255,255,255,0.12);
        }
        .pd-badge {
          display: inline-flex; align-items: center; gap: 4px;
          background: linear-gradient(135deg, #cc0052, #0077A8);
          color: #fff; font-size: 11px; font-weight: 700;
          padding: 3px 12px; border-radius: 100px;
          letter-spacing: 0.04em;
          margin-bottom: 8px;
        }
        .pd-name {
          font-size: clamp(1.4rem, 3.5vw, 1.9rem);
          font-weight: 800; color: #fff;
          letter-spacing: -0.02em;
        }
        .pd-role { font-size: 14px; color: var(--brand-cyan, #00d4ff); margin-top: 2px; }
        .pd-headline {
          font-size: 14px; line-height: 1.6;
          color: rgba(255,255,255,0.6);
          margin-top: 10px; max-width: 560px;
        }

        /* Items */
        .pd-section-title {
          font-size: 1.3rem; font-weight: 800; color: #fff;
          margin-bottom: 20px; letter-spacing: -0.02em;
        }
        .pd-items-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
          gap: 20px;
        }
        .pd-item-card {
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 16px;
          overflow: hidden;
          display: flex; flex-direction: column;
          transition: transform 0.2s, box-shadow 0.2s;
        }
        .pd-item-card:hover {
          transform: translateY(-3px);
          box-shadow: 0 16px 48px rgba(0,0,0,0.3);
        }
        .pd-item-thumb-wrap {
          aspect-ratio: 16 / 9;
          background: rgba(255,255,255,0.03);
          overflow: hidden;
        }
        .pd-item-thumb { width: 100%; height: 100%; object-fit: cover; }
        .pd-item-body {
          padding: 18px 20px 20px;
          display: flex; flex-direction: column; gap: 8px; flex: 1;
        }
        .pd-item-title { font-size: 15px; font-weight: 700; color: #fff; }
        .pd-item-desc {
          font-size: 13px; line-height: 1.65;
          color: rgba(255,255,255,0.55); flex: 1;
        }
        .pd-item-link {
          display: inline-flex; align-items: center; gap: 6px;
          align-self: flex-start;
          margin-top: 6px;
          padding: 8px 16px;
          font-size: 13px; font-weight: 600;
          color: var(--brand-cyan, #00d4ff);
          background: rgba(0,212,255,0.08);
          border: 1px solid rgba(0,212,255,0.2);
          border-radius: 10px;
          text-decoration: none;
          transition: background 0.2s;
        }
        .pd-item-link:hover { background: rgba(0,212,255,0.14); }

        /* Item empty state */
        .pd-empty {
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 16px;
          padding: 36px 28px; text-align: center;
        }
        .pd-empty-desc { font-size: 14px; line-height: 1.7; color: rgba(255,255,255,0.55); }

        /* Skeleton */
        .pd-skeleton {
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 20px; padding: 32px;
          display: flex; flex-direction: column; align-items: center; gap: 14px;
        }
        .pd-skeleton-circle {
          width: 96px; height: 96px; border-radius: 50%;
          background: rgba(255,255,255,0.06);
          animation: pd-pulse 1.4s ease-in-out infinite;
        }
        .pd-skeleton-line {
          height: 16px; border-radius: 6px; width: 40%;
          background: rgba(255,255,255,0.06);
          animation: pd-pulse 1.4s ease-in-out infinite;
        }
        .pd-skeleton-name { width: 35%; }
        .pd-skeleton-short { width: 25%; }
        @keyframes pd-pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.45; }
        }

        @media (max-width: 640px) {
          .pd-root { padding: 80px 16px 56px; }
          .pd-profile { flex-direction: column; text-align: center; padding: 28px 20px; }
          .pd-items-grid { grid-template-columns: 1fr; }
        }
      `}</style>
    </div>
  );
}
