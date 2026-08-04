"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { GraduationCap, Star, TrendingUp } from "lucide-react";
import { API_BASE as API } from "@/lib/api/base";

// ─── Types (defensive — backend contract is being built in parallel) ──────────

type ApiTestimonial = {
  id?: string;
  name: string;
  role: string;
  company?: string | null;
  quote: string;
  rating?: number | null;
  photoUrl?: string | null;
  featured?: boolean;
  category?: string;
  outcome?: string | null;
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
      .slice(0, 2) || "A"
  );
}

/** Only render remote photos from https URLs; anything else falls back to initials. */
function safePhotoUrl(url: string | null | undefined): string | null {
  return url && url.startsWith("https://") ? url : null;
}

function clampRating(rating: number | null | undefined): number | null {
  if (typeof rating !== "number" || !Number.isFinite(rating)) return null;
  const r = Math.round(rating);
  return r >= 1 && r <= 5 ? r : null;
}

// ─── Card ─────────────────────────────────────────────────────────────────────

function AlumniCard({ item }: { item: ApiTestimonial }) {
  const photo = safePhotoUrl(item.photoUrl);
  const rating = clampRating(item.rating);

  return (
    <article className={`al-card ${item.featured ? "al-card-featured" : ""}`}>
      {item.featured && <span className="al-badge">Alumni</span>}

      <div className="al-card-head">
        {photo ? (
          // Remote user-uploaded photos come from arbitrary hosts, so
          // next/image (which requires a domain allowlist) is not usable here.
          <img src={photo} alt="" className="al-avatar-img" loading="lazy" />
        ) : (
          <div className="al-avatar-initials" aria-hidden="true">
            {initialsOf(item.name)}
          </div>
        )}
        <div className="al-identity">
          <h3 className="al-name">{item.name}</h3>
          <p className="al-role">
            {item.role}
            {item.company && <> · {item.company}</>}
          </p>
        </div>
      </div>

      {item.outcome && (
        <p className="al-outcome">
          <TrendingUp size={14} aria-hidden="true" />
          <span>{item.outcome}</span>
        </p>
      )}

      <blockquote className="al-quote">&ldquo;{item.quote}&rdquo;</blockquote>

      {rating !== null && (
        <div className="al-stars" role="img" aria-label={`Rating ${rating} dari 5`}>
          {[1, 2, 3, 4, 5].map((i) => (
            <Star
              key={i}
              size={14}
              aria-hidden="true"
              className={i <= rating ? "al-star-on" : "al-star-off"}
            />
          ))}
        </div>
      )}
    </article>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AlumniPage() {
  // null = loading; [] = loaded-but-empty (or fetch failed — degrade to the
  // polite empty state, never a broken page).
  const [stories, setStories] = useState<ApiTestimonial[] | null>(null);

  useEffect(() => {
    fetch(`${API}/api/testimonials?category=alumni`)
      .then((r) => r.json())
      .then((body: { success?: boolean; data?: unknown }) => {
        const raw = Array.isArray(body?.data) ? body.data : [];
        const valid = body?.success
          ? (raw as ApiTestimonial[]).filter((t) => Boolean(t && t.name && t.quote && t.role))
          : [];
        setStories(valid);
      })
      .catch(() => setStories([]));
  }, []);

  return (
    <div className="al-root">
      {/* Hero */}
      <section className="al-hero">
        <div className="al-hero-inner">
          <span className="al-eyebrow">
            <GraduationCap size={14} aria-hidden="true" />
            Cerita Alumni
          </span>
          <h1 className="al-hero-title">
            Kisah Nyata,
            <br />
            <span className="al-hero-gradient">Langsung dari Alumni Kami</span>
          </h1>
          <p className="al-hero-desc">
            Setiap cerita di halaman ini datang dari alumni sungguhan — tentang
            perjalanan belajar mereka dan apa yang berubah setelahnya.
          </p>
        </div>
        <div className="al-hero-glow" aria-hidden="true" />
      </section>

      {/* Stories */}
      <section className="al-grid-section">
        {stories === null ? (
          <div className="al-grid" aria-busy="true" aria-label="Memuat cerita alumni">
            {[0, 1, 2].map((i) => (
              <div key={i} className="al-skeleton-card">
                <div className="al-skeleton-row">
                  <div className="al-skeleton-circle" />
                  <div className="al-skeleton-line al-skeleton-name" />
                </div>
                <div className="al-skeleton-line" />
                <div className="al-skeleton-line" />
                <div className="al-skeleton-line al-skeleton-short" />
              </div>
            ))}
          </div>
        ) : stories.length === 0 ? (
          <div className="al-empty">
            <div className="al-empty-icon" aria-hidden="true">
              🎓
            </div>
            <h2 className="al-empty-title">Cerita alumni segera hadir</h2>
            <p className="al-empty-desc">
              Kami hanya menampilkan cerita asli dari alumni sungguhan — dan
              sedang mengumpulkannya sekarang. Sambil menunggu, kamu bisa mulai
              perjalanan belajarmu sendiri hari ini.
            </p>
            <Link href="/kelas-gratis" className="al-btn-primary">
              Mulai dari Kelas Gratis
            </Link>
          </div>
        ) : (
          <div className="al-grid">
            {stories.map((item, idx) => (
              <AlumniCard key={item.id ?? `${item.name}-${idx}`} item={item} />
            ))}
          </div>
        )}
      </section>

      <style>{`
        .al-root {
          min-height: 100vh;
          background: var(--surface-page, #F5F5F7);
          color: var(--text-primary, #1D1D1F);
          font-family: var(--font-body, 'Inter', sans-serif);
        }

        /* Hero */
        .al-hero {
          position: relative;
          overflow: hidden;
          padding: 96px 24px 64px;
          text-align: center;
          background: linear-gradient(180deg, #FFFFFF 0%, var(--surface-page, #F5F5F7) 100%);
          border-bottom: 1px solid var(--border-subtle, #EFEFEF);
        }
        .al-hero-inner { position: relative; z-index: 1; max-width: 720px; margin: 0 auto; }
        .al-hero-glow {
          position: absolute;
          top: -200px; left: 50%; transform: translateX(-50%);
          width: 800px; height: 600px; border-radius: 50%;
          background: radial-gradient(ellipse, rgba(0,119,168,0.10) 0%, transparent 70%);
          pointer-events: none;
        }
        .al-eyebrow {
          display: inline-flex; align-items: center; gap: 6px;
          font-size: 13px; font-weight: 600; letter-spacing: 0.05em;
          color: var(--brand-cyan-strong, #0077A8);
          background: var(--surface-accent-soft, rgba(0,119,168,0.08));
          border: 1px solid rgba(0,119,168,0.2);
          border-radius: 100px; padding: 4px 14px;
          margin-bottom: 20px;
        }
        .al-hero-title {
          font-size: clamp(2rem, 5vw, 3.25rem);
          font-weight: 800; line-height: 1.15;
          letter-spacing: -0.03em;
          color: var(--text-primary, #1D1D1F); margin-bottom: 20px;
        }
        .al-hero-gradient {
          background: linear-gradient(135deg, #0077A8, #CC0052);
          -webkit-background-clip: text; -webkit-text-fill-color: transparent;
          background-clip: text;
        }
        .al-hero-desc {
          font-size: 1.05rem; line-height: 1.7;
          color: var(--text-secondary, #636366);
          max-width: 560px; margin: 0 auto;
        }

        /* Grid */
        .al-grid-section { padding: 64px 24px 80px; max-width: 1200px; margin: 0 auto; }
        .al-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
          gap: 24px;
        }

        /* Card */
        .al-card {
          position: relative;
          background: var(--surface-card, #FFFFFF);
          border: 1px solid var(--border-default, #E5E5E5);
          border-radius: 20px;
          padding: 26px;
          display: flex; flex-direction: column; gap: 16px;
          box-shadow: var(--shadow-e1);
          transition: transform 0.2s, box-shadow 0.2s;
        }
        .al-card:hover {
          transform: translateY(-4px);
          box-shadow: var(--shadow-e3);
        }
        .al-card-featured {
          border-color: rgba(0,119,168,0.35);
          background: linear-gradient(135deg, rgba(0,119,168,0.06), rgba(204,0,82,0.03));
          box-shadow: 0 0 0 1px rgba(0,119,168,0.2), var(--shadow-e2);
        }
        .al-badge {
          position: absolute; top: -11px; right: 20px;
          background: linear-gradient(135deg, #00d4ff, #0077A8);
          color: #fff; font-size: 11px; font-weight: 700;
          padding: 3px 12px; border-radius: 100px;
          letter-spacing: 0.04em;
        }

        .al-card-head { display: flex; align-items: center; gap: 13px; }
        .al-avatar-img {
          width: 48px; height: 48px; border-radius: 50%;
          object-fit: cover; flex-shrink: 0;
          border: 1px solid var(--border-default, #E5E5E5);
        }
        .al-avatar-initials {
          width: 48px; height: 48px; border-radius: 50%; flex-shrink: 0;
          display: flex; align-items: center; justify-content: center;
          background: linear-gradient(135deg, #0077A8, #CC0052);
          color: #fff; font-size: 15px; font-weight: 700;
        }
        .al-name { font-size: 15px; font-weight: 700; color: var(--text-primary, #1D1D1F); }
        .al-role { font-size: 13px; color: var(--text-muted, #6E6E73); margin-top: 1px; }

        .al-outcome {
          display: flex; align-items: flex-start; gap: 7px;
          font-size: 13px; font-weight: 600; line-height: 1.5;
          color: var(--brand-cyan-strong, #0077A8);
          background: var(--surface-accent-soft, rgba(0,119,168,0.07));
          border: 1px solid rgba(0,119,168,0.15);
          border-radius: 10px; padding: 9px 12px;
        }
        .al-outcome svg { flex-shrink: 0; margin-top: 2px; }

        .al-quote {
          flex: 1;
          font-size: 14px; line-height: 1.7;
          color: var(--text-secondary, #636366);
        }

        .al-stars { display: flex; gap: 3px; }
        .al-star-on { color: #F59E0B; fill: #F59E0B; }
        .al-star-off { color: var(--border-strong, #D2D2D7); }

        /* Skeleton */
        .al-skeleton-card {
          background: var(--surface-card, #FFFFFF);
          border: 1px solid var(--border-default, #E5E5E5);
          border-radius: 20px; padding: 26px;
          display: flex; flex-direction: column; gap: 14px;
        }
        .al-skeleton-row { display: flex; align-items: center; gap: 13px; }
        .al-skeleton-circle {
          width: 48px; height: 48px; border-radius: 50%; flex-shrink: 0;
          background: rgba(0,0,0,0.06);
          animation: al-pulse 1.4s ease-in-out infinite;
        }
        .al-skeleton-line {
          height: 14px; border-radius: 6px;
          background: rgba(0,0,0,0.06);
          animation: al-pulse 1.4s ease-in-out infinite;
        }
        .al-skeleton-name { width: 55%; }
        .al-skeleton-short { width: 70%; }
        @keyframes al-pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.45; }
        }

        /* Empty state */
        .al-empty {
          max-width: 520px; margin: 0 auto;
          background: var(--surface-card, #FFFFFF);
          border: 1px solid var(--border-default, #E5E5E5);
          border-radius: 20px;
          padding: 48px 32px; text-align: center;
          box-shadow: var(--shadow-e1);
          display: flex; flex-direction: column; align-items: center; gap: 12px;
        }
        .al-empty-icon { font-size: 2rem; }
        .al-empty-title { font-size: 1.2rem; font-weight: 700; color: var(--text-primary, #1D1D1F); }
        .al-empty-desc {
          font-size: 14px; line-height: 1.7;
          color: var(--text-secondary, #636366); margin-bottom: 12px;
        }
        .al-btn-primary {
          display: inline-flex; align-items: center; gap: 8px;
          padding: 13px 28px;
          background: linear-gradient(135deg, #0077A8, #cc0052);
          color: #fff; font-size: 14px; font-weight: 700;
          border-radius: 12px; text-decoration: none;
          box-shadow: 0 4px 20px rgba(0,119,168,0.35);
          transition: all 0.2s;
        }
        .al-btn-primary:hover { opacity: 0.9; transform: translateY(-2px); }

        @media (max-width: 640px) {
          .al-hero { padding: 72px 16px 48px; }
          .al-hero-title { font-size: 1.75rem; }
          .al-grid-section { padding: 48px 16px 56px; }
          .al-grid { grid-template-columns: 1fr; }
        }
      `}</style>
    </div>
  );
}
