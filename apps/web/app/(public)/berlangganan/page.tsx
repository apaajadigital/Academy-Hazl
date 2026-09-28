import type { Metadata } from "next";
import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { CheckCircle2, Zap, Star, ChevronDown, Sparkles } from "lucide-react";
import { fetchList } from "@/lib/api/listResource";

export const metadata: Metadata = {
  title: "Berlangganan — Akses Semua Konten Premium",
  description:
    "Berlangganan Hazl Academy untuk akses penuh ke seluruh kursus, sertifikat penyelesaian, dan komunitas eksklusif.",
  alternates: { canonical: "/berlangganan" },
};

// ─── Plan data ────────────────────────────────────────────────────────────────

/**
 * View model the page renders. `/api/subscription/plans` is the single source
 * of truth for pricing AND features (there are only two real plans: monthly
 * and annual — see apps/api/src/routes/subscription.ts). This file only adds
 * presentation fields (icon, colour) keyed by plan id; it never invents a
 * tier, feature, or payment method the API doesn't have.
 */
type PlanView = {
  id: string;
  name: string;
  icon: LucideIcon;
  badge: string | null;
  priceMonthly: number;
  note: string | null;
  desc: string;
  color: string;
  features: string[];
  cta: string;
  href: string;
};

/** Shape returned by GET /api/subscription/plans. */
type ApiPlan = {
  id: string;
  name: string;
  price: number;
  durationDays: number;
  pricePerMonth?: number;
  savings?: number;
  features: string[];
  badge: string | null;
};

/** Presentation-only fields, keyed by plan id. API owns pricing and features; this owns look & feel. */
const PLAN_PRESENTATION: Record<string, { icon: LucideIcon; color: string; desc: string; cta: string }> = {
  monthly: {
    icon: Zap,
    color: "var(--brand-cyan-strong)",
    desc: "Fleksibel, bayar per bulan tanpa komitmen panjang.",
    cta: "Mulai Bulanan",
  },
  annual: {
    icon: Star,
    color: "var(--brand-pink-strong)",
    desc: "Untuk yang serius belajar sepanjang tahun — lebih hemat.",
    cta: "Mulai Tahunan",
  },
};
const DEFAULT_PRESENTATION = { icon: Zap, color: "var(--brand-cyan-strong)", desc: "", cta: "Berlangganan" };

const rupiah = (n: number) => n.toLocaleString("id-ID");

/**
 * Narrow untrusted JSON into an ApiPlan. The web app has no Zod dependency, so
 * this is a hand-rolled guard — a malformed entry must be dropped rather than
 * reach JSX, where a missing `price` or `features` would throw at render.
 */
function isApiPlan(value: unknown): value is ApiPlan {
  if (typeof value !== "object" || value === null) return false;
  const p = value as Record<string, unknown>;
  return (
    typeof p.id === "string" &&
    typeof p.name === "string" &&
    typeof p.price === "number" &&
    Number.isFinite(p.price) &&
    typeof p.durationDays === "number" &&
    Array.isArray(p.features) &&
    p.features.every((f) => typeof f === "string")
  );
}

/**
 * Maps an API plan onto the view model. The API bills per period while the
 * card headline is always a per-month figure, so an annual plan shows its
 * `pricePerMonth` with a note explaining the total yearly charge.
 */
function toPlanView(plan: ApiPlan): PlanView {
  const presentation = PLAN_PRESENTATION[plan.id] ?? DEFAULT_PRESENTATION;
  const note =
    plan.durationDays > 30
      ? `Ditagih Rp ${rupiah(plan.price)}/tahun` +
        (typeof plan.savings === "number" && plan.savings > 0
          ? ` — hemat Rp ${rupiah(plan.savings)}`
          : "")
      : plan.durationDays === 30
        ? "Ditagih setiap bulan"
        : `Ditagih Rp ${rupiah(plan.price)} per ${plan.durationDays} hari`;

  return {
    id: plan.id,
    name: plan.name,
    icon: presentation.icon,
    badge: plan.badge ?? null,
    // Headline is always per-month; for an annual plan this is its own price
    // divided by the API (`pricePerMonth`), never a hand-picked number.
    priceMonthly: plan.pricePerMonth ?? plan.price,
    note,
    desc: presentation.desc,
    color: presentation.color,
    features: plan.features,
    cta: presentation.cta,
    href: `/daftar?plan=${encodeURIComponent(plan.id)}`,
  };
}

/**
 * Server-side plan fetch. When the API is unreachable there is no honest
 * "last-known" fallback to show — plan pricing/features live only in the API
 * (a previous hardcoded fallback invented tiers, prices, and features the API
 * has never offered). An empty list here renders a plain "coba lagi nanti"
 * state instead of fabricated data.
 */
async function getPlans(): Promise<PlanView[]> {
  const result = await fetchList<PlanView>(
    "/api/subscription/plans",
    (rows) => rows.filter(isApiPlan).map(toPlanView),
    // Cache briefly; `AbortSignal.timeout` so an unreachable API fails fast
    // instead of hanging the build, matching other public server pages.
    (input) => fetch(input, { next: { revalidate: 300 }, signal: AbortSignal.timeout(8000) }),
  );

  return result.ok ? result.items : [];
}

const FAQS = [
  {
    q: "Apa yang termasuk dalam langganan?",
    a: "Langganan memberikan akses ke seluruh kursus dan sertifikat penyelesaian setiap kursus yang diselesaikan. Detail lengkap tersedia pada kartu paket di atas.",
  },
  {
    q: "Apakah saya bisa upgrade atau downgrade paket?",
    a: "Ya. Kamu bisa upgrade kapan saja dan tagihan akan disesuaikan secara proporsional. Downgrade berlaku di siklus billing berikutnya.",
  },
  {
    q: "Bagaimana metode pembayaran yang tersedia?",
    a: "Pembayaran diproses melalui Duitku dengan metode Virtual Account bank.",
  },
  {
    q: "Apakah ada uji coba gratis?",
    a: "Kamu bisa mendaftar gratis dan mengakses konten preview tanpa kartu kredit. Upgrade kapan saja jika ingin akses penuh.",
  },
  {
    q: "Apakah sertifikat termasuk dalam langganan?",
    a: "Ya, setiap paket menyertakan sertifikat penyelesaian untuk setiap kursus yang diselesaikan.",
  },
];

// ─── Components ─────────────────────────────────────────────────────────────

function PriceDisplay({ monthly }: { monthly: number }) {
  return (
    <div className="flex items-baseline gap-1">
      <span className="text-sm font-medium text-text-muted">Rp</span>
      <span className="text-[2rem] font-extrabold leading-none tabular-nums text-text-primary">
        {monthly.toLocaleString("id-ID")}
      </span>
      <span className="text-sm text-text-muted">/bln</span>
    </div>
  );
}

// ─── Server Component (no client JS needed — FAQ uses native <details>) ────

export default async function BerlanggananPage() {
  const plans = await getPlans();

  return (
    <main id="main-content" className="min-h-screen bg-surface-page text-text-primary">
      <section className="relative overflow-hidden px-6 pb-16 pt-24 text-center">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute left-1/2 top-0 h-72 w-72 -translate-x-1/2 rounded-full"
          style={{ background: "radial-gradient(ellipse, rgba(0,119,168,0.10) 0%, transparent 70%)" }}
        />
        <div className="relative z-10 mx-auto max-w-3xl">
          <span className="mb-5 inline-flex items-center gap-2 rounded-full border border-[rgba(0,119,168,0.2)] bg-surface-accent-soft px-4 py-1.5 text-xs font-semibold tracking-wide text-accent-cyan-strong">
            <Sparkles size={14} />
            Berlangganan
          </span>
          <h1 className="mb-5 text-4xl font-extrabold leading-[1.12] tracking-tight text-text-primary sm:text-5xl">
            Satu Paket, <span className="text-accent-cyan-strong">Akses Seluruh Ekosistem AI</span>
          </h1>
          <p className="mx-auto mb-9 max-w-xl text-[1.05rem] leading-relaxed text-text-secondary">
            Masterclass video AI, workflow ComfyUI, rekaman live coaching, dan mentoring praktisi — semuanya dalam satu paket transparan.
          </p>
        </div>
      </section>

      {/* Plans */}
      <section className="mx-auto max-w-6xl px-6 pb-12 pt-16">
        {plans.length === 0 ? (
          <p className="text-center text-sm text-text-muted">
            Daftar paket sedang tidak bisa dimuat. Coba muat ulang halaman beberapa saat lagi.
          </p>
        ) : (
          <div className={`mb-8 grid grid-cols-1 gap-6 ${plans.length > 1 ? "md:grid-cols-2 max-w-3xl mx-auto" : "max-w-md mx-auto"}`}>
            {plans.map((plan) => {
              const Icon = plan.icon;
              const featured = Boolean(plan.badge);
              return (
                <article
                  key={plan.id}
                  className={`relative flex flex-col gap-5 rounded-[var(--radius-xl)] border bg-surface-card p-7 shadow-e1 transition-all hover:-translate-y-1 hover:shadow-e2 ${
                    featured ? "border-[color:var(--plan-color)] shadow-e2" : "border-border-default"
                  }`}
                  style={{ "--plan-color": plan.color } as React.CSSProperties}
                >
                  {plan.badge && (
                    <div
                      className="absolute -top-3 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full px-3.5 py-1 text-[11px] font-bold tracking-wide text-white"
                      style={{ background: "var(--plan-color)" }}
                    >
                      {plan.badge}
                    </div>
                  )}

                  <div className="flex items-start gap-3.5">
                    <div
                      className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl"
                      style={{
                        color: "var(--plan-color)",
                        background: "color-mix(in srgb, var(--plan-color) 10%, transparent)",
                        border: "1px solid color-mix(in srgb, var(--plan-color) 22%, transparent)",
                      }}
                    >
                      <Icon size={22} />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-text-primary">{plan.name}</h2>
                      <p className="mt-0.5 text-[13px] text-text-muted">{plan.desc}</p>
                    </div>
                  </div>

                  <div>
                    <PriceDisplay monthly={plan.priceMonthly} />
                    {plan.note && <p className="mt-1.5 text-xs text-text-muted">{plan.note}</p>}
                  </div>

                  <ul className="flex flex-1 flex-col gap-2.5">
                    {plan.features.map((f) => (
                      <li key={f} className="flex items-start gap-2.5 text-[13.5px] text-text-secondary">
                        <CheckCircle2 size={16} className="mt-0.5 flex-shrink-0" style={{ color: "var(--plan-color)" }} />
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>

                  <Link
                    href={plan.href}
                    className={
                      featured
                        ? "btn btn-primary w-full justify-center text-white shadow-e1 hover:opacity-95 hover:shadow-e2"
                        : "btn btn-outline w-full justify-center"
                    }
                  >
                    {plan.cta}
                  </Link>
                </article>
              );
            })}
          </div>
        )}

        <p className="text-center text-[13px] text-text-muted">
          Punya pertanyaan sebelum berlangganan?{" "}
          <Link href="/contact" className="font-semibold text-accent-cyan-strong hover:underline">
            Hubungi kami
          </Link>
        </p>
      </section>

      {/* Already subscribed CTA */}
      <section className="border-y border-[rgba(0,119,168,0.12)] bg-surface-accent-soft px-6 py-12 text-center">
        <div className="mx-auto max-w-xl">
          <h2 className="mb-2 font-bold text-text-primary">Sudah berlangganan?</h2>
          <p className="mb-5 text-sm text-text-secondary">
            Kelola paket dan riwayat pembayaranmu di dashboard.
          </p>
          <Link href="/dashboard/berlangganan" className="btn btn-outline">
            Buka Dashboard
          </Link>
        </div>
      </section>

      {/* FAQ */}
      <section className="px-6 py-20">
        <div className="mx-auto max-w-3xl">
          <h2 className="mb-10 text-center text-2xl font-extrabold text-text-primary">
            Pertanyaan Umum
          </h2>
          <div className="flex flex-col gap-3">
            {FAQS.map((faq) => (
              <details
                key={faq.q}
                className="group overflow-hidden rounded-xl border border-border-default bg-surface-card shadow-e1 open:border-[rgba(0,119,168,0.25)]"
              >
                <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-5 py-4 text-sm font-semibold text-text-primary [&::-webkit-details-marker]:hidden">
                  <span>{faq.q}</span>
                  <ChevronDown size={18} className="flex-shrink-0 text-text-muted transition-transform duration-200 group-open:rotate-180" />
                </summary>
                <p className="px-5 pb-4 text-[13.5px] leading-relaxed text-text-secondary">{faq.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="bg-brand-gradient px-6 py-20 text-center">
        <div className="mx-auto max-w-xl">
          <h2 className="mb-3 text-[2rem] font-extrabold text-white">Mulai belajar hari ini, gratis</h2>
          <p className="mb-8 text-[15px] text-white/80">
            Daftar gratis, jelajahi konten preview, upgrade kapan saja.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <Link href="/daftar" className="btn bg-white justify-center text-accent-cyan-strong shadow-e1 hover:opacity-90">
              Daftar Gratis
            </Link>
            <Link href="/e-course" className="btn justify-center border border-solid border-white/40 bg-white/10 text-white hover:bg-white/20">
              Jelajahi Kursus
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
