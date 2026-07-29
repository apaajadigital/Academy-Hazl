"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  CheckCircle2,
  ChevronDown,
  CreditCard,
  GraduationCap,
  MessageCircle,
  Rocket,
  ShieldCheck,
  Users,
} from "lucide-react";
import { waLink } from "@/lib/config";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

const WA_CONSULT_HREF = waLink("Halo, saya ingin bertanya tentang Private Class");

// ─── Types (defensive — backend contract is being built in parallel) ──────────

type ApiCourse = {
  id?: string;
  slug: string;
  title: string;
  description?: string | null;
  price?: string | number | null;
  salePrice?: string | number | null;
  thumbnail?: string | null;
  liveSchedule?: string | null;
  totalLessons?: number | null;
};

// ─── Static content ───────────────────────────────────────────────────────────

const FLOW_STEPS = [
  {
    icon: CreditCard,
    title: "Checkout & bayar",
    desc: "Pilih paket yang sesuai, lalu selesaikan pembayaran di halaman checkout.",
  },
  {
    icon: ShieldCheck,
    title: "Konfirmasi admin",
    desc: "Admin kami menghubungi kamu untuk konfirmasi data & pembayaran.",
  },
  {
    icon: Users,
    title: "Join grup mentoring",
    desc: "Kamu diundang masuk grup mentoring privat via WhatsApp.",
  },
  {
    icon: GraduationCap,
    title: "Kenalan dengan mentor",
    desc: "Sesi perkenalan dengan mentor & pemetaan tujuan belajarmu.",
  },
  {
    icon: Rocket,
    title: "Mulai sesi",
    desc: "Program dimulai sesuai jadwal yang sudah disepakati bersama.",
  },
];

const FAQS = [
  {
    q: "Apa bedanya Private Class dengan kursus reguler?",
    a: "Private Class adalah program intensif dengan pendampingan langsung: kamu tergabung dalam grup mentoring privat, mengikuti sesi live bersama mentor, dan materinya diarahkan sesuai tujuan belajarmu — bukan sekadar video rekaman.",
  },
  {
    q: "Bagaimana alur setelah saya membayar?",
    a: "Setelah pembayaran terkonfirmasi, admin akan menghubungi kamu untuk konfirmasi data, lalu mengundangmu ke grup mentoring. Di grup itu kamu berkenalan dengan mentor dan menerima info jadwal serta teknis program.",
  },
  {
    q: "Kapan jadwal sesinya berlangsung?",
    a: "Jadwal sesi tercantum di masing-masing paket (jika sudah ditentukan) atau disepakati bersama mentor setelah kamu bergabung. Detailnya dibagikan di grup mentoring.",
  },
  {
    q: "Bagaimana metode pembayarannya?",
    a: "Pembayaran dilakukan online melalui halaman checkout dengan berbagai metode yang tersedia di gateway pembayaran kami.",
  },
  {
    q: "Saya masih ragu paket mana yang cocok. Bisa konsultasi dulu?",
    a: "Tentu. Klik tombol \"Konsultasi dulu via WhatsApp\" di halaman ini — tim kami akan membantu memilih paket yang paling sesuai dengan kebutuhanmu, tanpa kewajiban membeli.",
  },
];

// Shown when a course description has no parsable bullet list — generic
// benefits that hold for every private-class package on the platform.
const DEFAULT_BENEFITS = [
  "Pendampingan langsung dari mentor",
  "Grup mentoring privat via WhatsApp",
  "Sesi live sesuai jadwal program",
  "Akses materi selama program berjalan",
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function toNumber(v: string | number | null | undefined): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function formatRp(n: number): string {
  return `Rp ${n.toLocaleString("id-ID")}`;
}

/**
 * Derive a short intro + benefit checklist from a free-form course
 * description. Lines starting with a bullet marker (-, *, •, ✓) become
 * benefits; leading non-bullet lines become the intro. Defensive: any shape
 * of description (or none) yields a usable result.
 */
function parseBenefits(description: string | null | undefined): {
  intro: string;
  benefits: string[];
} {
  if (!description) return { intro: "", benefits: [] };
  const benefits: string[] = [];
  const introLines: string[] = [];
  for (const raw of description.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line) continue;
    const bullet = /^[-*•✓]\s*(.+)$/.exec(line)?.[1];
    if (bullet) benefits.push(bullet);
    else if (benefits.length === 0) introLines.push(line);
  }
  const intro = introLines.join(" ");
  return {
    intro: intro.length > 180 ? `${intro.slice(0, 177)}…` : intro,
    benefits: benefits.slice(0, 8),
  };
}

// ─── Package card ─────────────────────────────────────────────────────────────

function PackageCard({ course, featured }: { course: ApiCourse; featured: boolean }) {
  const price = toNumber(course.price);
  const sale = toNumber(course.salePrice);
  const hasSale = price !== null && sale !== null && sale > 0 && sale < price;
  const { intro, benefits } = parseBenefits(course.description);
  const list = benefits.length > 0 ? benefits : DEFAULT_BENEFITS;

  return (
    <article
      className={`pc-plan-card ${featured ? "pc-plan-featured" : ""}`}
      style={
        {
          "--plan-color": featured ? "var(--brand-pink-strong)" : "var(--brand-cyan-strong)",
        } as React.CSSProperties
      }
    >
      {featured && <div className="pc-plan-badge">Paling Populer</div>}

      <div className="pc-plan-header">
        <div className="pc-plan-icon-wrap">
          <GraduationCap size={22} />
        </div>
        <div>
          <h3 className="pc-plan-name">{course.title}</h3>
          <p className="pc-plan-desc">
            {intro || "Program mentoring intensif dengan pendampingan mentor."}
          </p>
        </div>
      </div>

      <div className="pc-plan-price-area">
        {price === null ? (
          <div className="pc-price-custom">
            <span className="pc-price-label">Harga Khusus</span>
            <span className="pc-price-sub">Hubungi tim kami</span>
          </div>
        ) : (
          <div className="pc-price-wrap">
            <span className="pc-price-num">{formatRp(hasSale ? sale : price)}</span>
            {hasSale && <span className="pc-price-strike">{formatRp(price)}</span>}
          </div>
        )}
        {(course.totalLessons ?? 0) > 0 && (
          <p className="pc-plan-meta">{course.totalLessons} materi terstruktur</p>
        )}
        {course.liveSchedule && (
          <p className="pc-plan-meta">📅 {course.liveSchedule}</p>
        )}
      </div>

      <ul className="pc-features">
        {list.map((f) => (
          <li key={f} className="pc-feature-item">
            <CheckCircle2 size={15} className="pc-feature-icon" />
            <span>{f}</span>
          </li>
        ))}
      </ul>

      <Link
        href={`/checkout/${course.slug}?type=course`}
        className={`pc-cta-btn ${featured ? "pc-cta-featured" : "pc-cta-default"}`}
      >
        Ambil Paket Ini
      </Link>
    </article>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function KelasPrivatPage() {
  // null = loading; [] = loaded-but-empty (or fetch failed — degrade to the
  // polite empty state, never a broken page).
  const [courses, setCourses] = useState<ApiCourse[] | null>(null);

  useEffect(() => {
    fetch(`${API}/api/courses?format=private_class&limit=50`)
      .then((r) => r.json())
      .then((body: { success?: boolean; data?: { data?: unknown } | unknown[] }) => {
        // GET /api/courses nests the page under data.data
        // ({ data, total, page, limit }). Testing Array.isArray(body.data) was
        // therefore always false and the page permanently showed its empty
        // state — latent only because the route is behind an OFF feature flag.
        // Same read as ECourseCatalog / FreeCourseCatalog, incl. their tolerance
        // for a flat array in case the envelope is ever un-nested.
        const payload = body?.data;
        const raw = Array.isArray(payload)
          ? payload
          : Array.isArray(payload?.data)
            ? payload.data
            : [];
        const valid = body?.success
          ? (raw as ApiCourse[]).filter((c) => Boolean(c && c.slug && c.title))
          : [];
        setCourses(valid);
      })
      .catch(() => setCourses([]));
  }, []);

  // "Paling Populer" badge on the middle/featured tier (needs ≥ 2 packages).
  const featuredIndex =
    courses && courses.length >= 3
      ? Math.floor(courses.length / 2)
      : courses && courses.length === 2
        ? 1
        : -1;

  return (
    <div className="pc-root">
      {/* Hero */}
      <section className="pc-hero">
        <div className="pc-hero-inner">
          <span className="pc-eyebrow">🎯 Private Class</span>
          <h1 className="pc-hero-title">
            Belajar Intensif,
            <br />
            <span className="pc-hero-gradient">Didampingi Mentor Pribadi</span>
          </h1>
          <p className="pc-hero-desc">
            Bukan sekadar video pembelajaran — Private Class memberimu grup
            mentoring privat, sesi live bersama mentor, dan arah belajar yang
            disesuaikan dengan tujuanmu.
          </p>
          <div className="pc-hero-btns">
            <a href="#pc-paket" className="pc-btn-primary">
              Lihat Paket
            </a>
            <a
              href={WA_CONSULT_HREF}
              target="_blank"
              rel="noopener noreferrer"
              className="pc-btn-outline"
            >
              <MessageCircle size={15} aria-hidden="true" />
              Konsultasi dulu via WhatsApp
            </a>
          </div>
        </div>
        <div className="pc-hero-glow" aria-hidden="true" />
      </section>

      {/* Packages */}
      <section id="pc-paket" className="pc-plans-section">
        <h2 className="pc-section-title">Pilih Paket Private Class</h2>
        <p className="pc-section-sub">
          Semua paket termasuk grup mentoring privat dan pendampingan admin
          hingga program dimulai.
        </p>

        {courses === null ? (
          <div className="pc-plans-grid" aria-busy="true" aria-label="Memuat paket">
            {[0, 1, 2].map((i) => (
              <div key={i} className="pc-skeleton-card">
                <div className="pc-skeleton-line pc-skeleton-title" />
                <div className="pc-skeleton-line pc-skeleton-price" />
                <div className="pc-skeleton-line" />
                <div className="pc-skeleton-line" />
                <div className="pc-skeleton-line pc-skeleton-short" />
              </div>
            ))}
          </div>
        ) : courses.length === 0 ? (
          <div className="pc-empty">
            <div className="pc-empty-icon" aria-hidden="true">
              🛠️
            </div>
            <h3 className="pc-empty-title">Paket sedang disiapkan</h3>
            <p className="pc-empty-desc">
              Kami sedang menyiapkan paket Private Class terbaik. Sementara itu,
              tim kami siap membantu kebutuhan belajarmu secara langsung.
            </p>
            <a
              href={WA_CONSULT_HREF}
              target="_blank"
              rel="noopener noreferrer"
              className="pc-btn-primary"
            >
              <MessageCircle size={15} aria-hidden="true" />
              Konsultasi via WhatsApp
            </a>
          </div>
        ) : (
          <div className="pc-plans-grid">
            {courses.map((course, idx) => (
              <PackageCard key={course.id ?? course.slug} course={course} featured={idx === featuredIndex} />
            ))}
          </div>
        )}
      </section>

      {/* Onboarding flow */}
      <section className="pc-flow-section">
        <div className="pc-flow-inner">
          <h2 className="pc-section-title">Bagaimana alurnya?</h2>
          <p className="pc-section-sub">
            Dari checkout sampai sesi pertama — semuanya didampingi.
          </p>
          <ol className="pc-flow-list">
            {FLOW_STEPS.map((step, i) => {
              const Icon = step.icon;
              return (
                <li key={step.title} className="pc-flow-step">
                  <div className="pc-flow-num" aria-hidden="true">
                    {i + 1}
                  </div>
                  <div className="pc-flow-icon" aria-hidden="true">
                    <Icon size={18} />
                  </div>
                  <div>
                    <h3 className="pc-flow-title">{step.title}</h3>
                    <p className="pc-flow-desc">{step.desc}</p>
                  </div>
                </li>
              );
            })}
          </ol>
          <div className="pc-flow-cta">
            <a
              href={WA_CONSULT_HREF}
              target="_blank"
              rel="noopener noreferrer"
              className="pc-btn-outline"
            >
              <MessageCircle size={15} aria-hidden="true" />
              Konsultasi dulu via WhatsApp
            </a>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="pc-faq-section">
        <div className="pc-faq-inner">
          <h2 className="pc-faq-title">Pertanyaan Umum</h2>
          <div className="pc-faq-list">
            {FAQS.map((faq) => (
              <details key={faq.q} className="pc-faq-item">
                <summary className="pc-faq-q">
                  <span>{faq.q}</span>
                  <ChevronDown size={18} className="pc-faq-chevron" />
                </summary>
                <p className="pc-faq-a">{faq.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <style>{`
        .pc-root {
          min-height: 100vh;
          background: var(--surface-page, #F5F5F7);
          color: var(--text-primary, #1D1D1F);
          font-family: var(--font-body, 'Inter', sans-serif);
        }

        /* Hero */
        .pc-hero {
          position: relative;
          overflow: hidden;
          padding: 96px 24px 64px;
          text-align: center;
          background: linear-gradient(180deg, #FFFFFF 0%, var(--surface-page, #F5F5F7) 100%);
          border-bottom: 1px solid var(--border-subtle, #EFEFEF);
        }
        .pc-hero-inner { position: relative; z-index: 1; max-width: 720px; margin: 0 auto; }
        .pc-hero-glow {
          position: absolute;
          top: -200px; left: 50%; transform: translateX(-50%);
          width: 800px; height: 600px; border-radius: 50%;
          background: radial-gradient(ellipse, rgba(204,0,82,0.10) 0%, transparent 70%);
          pointer-events: none;
        }
        .pc-eyebrow {
          display: inline-block;
          font-size: 13px; font-weight: 600; letter-spacing: 0.05em;
          color: var(--brand-cyan-strong, #0077A8);
          background: var(--surface-accent-soft, rgba(0,119,168,0.08));
          border: 1px solid rgba(0,119,168,0.2);
          border-radius: 100px; padding: 4px 14px;
          margin-bottom: 20px;
        }
        .pc-hero-title {
          font-size: clamp(2rem, 5vw, 3.25rem);
          font-weight: 800; line-height: 1.15;
          letter-spacing: -0.03em;
          color: var(--text-primary, #1D1D1F); margin-bottom: 20px;
        }
        .pc-hero-gradient {
          background: linear-gradient(135deg, #0077A8, #cc0052);
          -webkit-background-clip: text; -webkit-text-fill-color: transparent;
          background-clip: text;
        }
        .pc-hero-desc {
          font-size: 1.05rem; line-height: 1.7;
          color: var(--text-secondary, #636366);
          max-width: 560px; margin: 0 auto 32px;
        }
        .pc-hero-btns { display: flex; justify-content: center; gap: 12px; flex-wrap: wrap; }

        /* Buttons */
        .pc-btn-primary {
          display: inline-flex; align-items: center; gap: 8px;
          padding: 13px 28px;
          background: linear-gradient(135deg, #0077A8, #cc0052);
          color: #fff; font-size: 14px; font-weight: 700;
          border-radius: 12px; text-decoration: none;
          box-shadow: 0 4px 20px rgba(0,119,168,0.35);
          transition: all 0.2s;
        }
        .pc-btn-primary:hover { opacity: 0.9; transform: translateY(-2px); }
        .pc-btn-outline {
          display: inline-flex; align-items: center; gap: 8px;
          padding: 13px 28px;
          background: var(--surface-card, #FFFFFF);
          color: var(--text-primary, #1D1D1F);
          border: 1px solid var(--border-strong, #D2D2D7);
          font-size: 14px; font-weight: 600;
          border-radius: 12px; text-decoration: none;
          transition: all 0.2s;
        }
        .pc-btn-outline:hover { background: var(--surface-accent-soft, rgba(0,119,168,0.08)); border-color: var(--brand-cyan-strong, #0077A8); }

        /* Section headings */
        .pc-section-title {
          font-size: 1.75rem; font-weight: 800; color: var(--text-primary, #1D1D1F);
          text-align: center; margin-bottom: 8px;
          letter-spacing: -0.02em;
        }
        .pc-section-sub {
          text-align: center; font-size: 14px;
          color: var(--text-muted, #6E6E73);
          max-width: 520px; margin: 0 auto 40px;
        }

        /* Plans */
        .pc-plans-section { padding: 64px 24px 48px; max-width: 1200px; margin: 0 auto; }
        .pc-plans-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
          gap: 24px;
        }
        .pc-plan-card {
          position: relative;
          background: var(--surface-card, #FFFFFF);
          border: 1px solid var(--border-default, #E5E5E5);
          border-radius: 20px;
          padding: 28px;
          display: flex; flex-direction: column; gap: 20px;
          box-shadow: var(--shadow-e1);
          transition: transform 0.2s, box-shadow 0.2s;
        }
        .pc-plan-card:hover {
          transform: translateY(-4px);
          box-shadow: var(--shadow-e3);
        }
        .pc-plan-featured {
          border-color: var(--plan-color);
          background: linear-gradient(135deg, rgba(204,0,82,0.05), rgba(0,119,168,0.04));
          box-shadow: 0 0 0 1px var(--plan-color), var(--shadow-e2);
        }
        .pc-plan-badge {
          position: absolute; top: -12px; left: 50%; transform: translateX(-50%);
          background: var(--plan-color);
          color: #fff; font-size: 11px; font-weight: 700;
          padding: 4px 14px; border-radius: 100px;
          letter-spacing: 0.04em; white-space: nowrap;
        }
        .pc-plan-header { display: flex; align-items: flex-start; gap: 14px; }
        .pc-plan-icon-wrap {
          width: 44px; height: 44px; border-radius: 12px; flex-shrink: 0;
          display: flex; align-items: center; justify-content: center;
          background: var(--surface-sunken, #FAFAFA);
          color: var(--plan-color);
          border: 1px solid var(--border-default, #E5E5E5);
        }
        .pc-plan-name { font-size: 1.2rem; font-weight: 700; color: var(--text-primary, #1D1D1F); }
        .pc-plan-desc { font-size: 13px; color: var(--text-muted, #6E6E73); margin-top: 2px; }

        /* Price */
        .pc-price-wrap { display: flex; align-items: baseline; gap: 10px; flex-wrap: wrap; }
        .pc-price-num {
          font-size: 1.75rem; font-weight: 800; color: var(--text-primary, #1D1D1F);
          font-variant-numeric: tabular-nums;
        }
        .pc-price-strike {
          font-size: 14px; color: var(--text-muted, #6E6E73);
          text-decoration: line-through;
          font-variant-numeric: tabular-nums;
        }
        .pc-price-label { display: block; font-size: 1.5rem; font-weight: 800; color: var(--text-primary, #1D1D1F); }
        .pc-price-sub { font-size: 13px; color: var(--text-muted, #6E6E73); }
        .pc-plan-meta { font-size: 12px; color: var(--text-muted, #6E6E73); margin-top: 6px; }

        /* Features */
        .pc-features { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 10px; flex: 1; }
        .pc-feature-item { display: flex; align-items: flex-start; gap: 9px; font-size: 13.5px; color: var(--text-secondary, #636366); }
        .pc-feature-icon { flex-shrink: 0; margin-top: 1px; color: var(--plan-color, #0077A8); }

        /* CTA buttons on cards */
        .pc-cta-btn {
          display: block; text-align: center;
          padding: 12px 20px; border-radius: 12px;
          font-size: 14px; font-weight: 700;
          text-decoration: none;
          transition: all 0.2s;
        }
        .pc-cta-default {
          background: var(--surface-sunken, #FAFAFA);
          color: var(--text-primary, #1D1D1F);
          border: 1px solid var(--border-strong, #D2D2D7);
        }
        .pc-cta-default:hover { background: var(--surface-accent-soft, rgba(0,119,168,0.08)); border-color: var(--brand-cyan-strong, #0077A8); }
        .pc-cta-featured {
          background: linear-gradient(135deg, #cc0052, #0077A8);
          color: #fff;
          box-shadow: 0 4px 20px rgba(204,0,82,0.35);
        }
        .pc-cta-featured:hover { opacity: 0.9; transform: translateY(-1px); }

        /* Skeleton */
        .pc-skeleton-card {
          background: var(--surface-card, #FFFFFF);
          border: 1px solid var(--border-default, #E5E5E5);
          border-radius: 20px; padding: 28px;
          display: flex; flex-direction: column; gap: 14px;
        }
        .pc-skeleton-line {
          height: 14px; border-radius: 6px;
          background: rgba(0,0,0,0.06);
          animation: pc-pulse 1.4s ease-in-out infinite;
        }
        .pc-skeleton-title { height: 20px; width: 60%; }
        .pc-skeleton-price { height: 28px; width: 45%; }
        .pc-skeleton-short { width: 70%; }
        @keyframes pc-pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.45; }
        }

        /* Empty state */
        .pc-empty {
          max-width: 520px; margin: 0 auto;
          background: var(--surface-card, #FFFFFF);
          border: 1px solid var(--border-default, #E5E5E5);
          border-radius: 20px;
          padding: 48px 32px; text-align: center;
          box-shadow: var(--shadow-e1);
          display: flex; flex-direction: column; align-items: center; gap: 12px;
        }
        .pc-empty-icon { font-size: 2rem; }
        .pc-empty-title { font-size: 1.2rem; font-weight: 700; color: var(--text-primary, #1D1D1F); }
        .pc-empty-desc {
          font-size: 14px; line-height: 1.7;
          color: var(--text-secondary, #636366); margin-bottom: 12px;
        }

        /* Flow */
        .pc-flow-section {
          background: var(--surface-accent-soft, rgba(0,119,168,0.05));
          border-top: 1px solid rgba(0,119,168,0.12);
          border-bottom: 1px solid rgba(0,119,168,0.12);
          padding: 64px 24px;
        }
        .pc-flow-inner { max-width: 680px; margin: 0 auto; }
        .pc-flow-list {
          list-style: none; padding: 0; margin: 0;
          display: flex; flex-direction: column; gap: 18px;
        }
        .pc-flow-step {
          position: relative;
          display: flex; align-items: flex-start; gap: 14px;
          background: var(--surface-card, #FFFFFF);
          border: 1px solid var(--border-default, #E5E5E5);
          border-radius: 16px; padding: 18px 20px;
          box-shadow: var(--shadow-e1);
        }
        .pc-flow-num {
          position: absolute; top: -10px; left: -10px;
          width: 24px; height: 24px; border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          background: linear-gradient(135deg, #0077A8, #cc0052);
          color: #fff; font-size: 12px; font-weight: 700;
        }
        .pc-flow-icon {
          width: 40px; height: 40px; border-radius: 12px; flex-shrink: 0;
          display: flex; align-items: center; justify-content: center;
          background: var(--surface-accent-soft, rgba(0,119,168,0.08));
          border: 1px solid rgba(0,119,168,0.15);
          color: var(--brand-cyan-strong, #0077A8);
        }
        .pc-flow-title { font-size: 15px; font-weight: 700; color: var(--text-primary, #1D1D1F); }
        .pc-flow-desc { font-size: 13px; line-height: 1.6; color: var(--text-secondary, #636366); margin-top: 2px; }
        .pc-flow-cta { text-align: center; margin-top: 28px; }

        /* FAQ */
        .pc-faq-section { padding: 72px 24px; }
        .pc-faq-inner { max-width: 720px; margin: 0 auto; }
        .pc-faq-title {
          font-size: 1.75rem; font-weight: 700; color: var(--text-primary, #1D1D1F);
          text-align: center; margin-bottom: 40px;
        }
        .pc-faq-list { display: flex; flex-direction: column; gap: 12px; }
        .pc-faq-item {
          background: var(--surface-card, #FFFFFF);
          border: 1px solid var(--border-default, #E5E5E5);
          border-radius: 14px; overflow: hidden;
        }
        .pc-faq-item[open] { border-color: rgba(0,119,168,0.3); }
        .pc-faq-q {
          display: flex; align-items: center; justify-content: space-between;
          padding: 18px 20px;
          font-size: 14px; font-weight: 600; color: var(--text-primary, #1D1D1F);
          cursor: pointer; list-style: none;
          gap: 12px;
        }
        .pc-faq-q::-webkit-details-marker { display: none; }
        .pc-faq-chevron {
          flex-shrink: 0; color: var(--text-muted, #6E6E73);
          transition: transform 0.25s;
        }
        .pc-faq-item[open] .pc-faq-chevron { transform: rotate(180deg); }
        .pc-faq-a {
          padding: 0 20px 18px;
          font-size: 13.5px; line-height: 1.7;
          color: var(--text-secondary, #636366);
        }

        @media (max-width: 640px) {
          .pc-hero { padding: 72px 16px 48px; }
          .pc-hero-title { font-size: 1.75rem; }
          .pc-plans-section { padding: 48px 16px 32px; }
          .pc-plans-grid { grid-template-columns: 1fr; }
        }
      `}</style>
    </div>
  );
}
