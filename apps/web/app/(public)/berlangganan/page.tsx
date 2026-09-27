import type { Metadata } from "next";
import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { CheckCircle2, Zap, Building2, Star, ChevronDown, Sparkles } from "lucide-react";
import { fetchList } from "@/lib/api/listResource";

export const metadata: Metadata = {
  title: "Berlangganan — Akses Semua Konten Premium",
  // "ribuan kursus" removed (BL-23): the catalogue is nowhere near that, and a
  // meta description is quoted verbatim by search engines — it is the one place
  // an inflated claim travels furthest.
  description:
    "Pilih paket berlangganan Hazl Academy yang sesuai kebutuhan. Akses kursus, event, e-book, dan sertifikasi dalam satu langganan.",
  alternates: { canonical: "/berlangganan" },
};

// ─── Plan data ────────────────────────────────────────────────────────────────

/**
 * View model this page renders. `/api/subscription/plans` is the single source of
 * truth for pricing (BL-85), but it carries no presentation fields — icon, colour,
 * CTA and href are derived here from the plan id.
 */
type PlanView = {
  id: string;
  name: string;
  icon: LucideIcon;
  badge: string | null;
  priceMonthly: number | null;
  priceAnnual: number | null;
  /** Secondary pricing line under the headline price (billing cadence, savings). */
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

/**
 * Last-known plan table, used only when the API is unreachable or returns nothing.
 * A pricing page that 500s is worse than one showing slightly stale numbers.
 */
const PLANS: PlanView[] = [
  {
    id: "starter",
    name: "Starter",
    icon: Zap,
    badge: null,
    priceMonthly: 99_000,
    priceAnnual: 79_000,
    note: "atau Rp 79.000/bln jika bayar tahunan",
    desc: "Untuk individu yang ingin mulai belajar.",
    color: "var(--brand-cyan-strong)",
    features: [
      // BL-23: was "Akses 50+ kursus pilihan" — a promise about catalogue size
      // that the catalogue does not keep. What the plan grants is a selection,
      // not a count.
      "Akses kursus pilihan",
      "5 e-book per bulan",
      "Sertifikat kelulusan",
      "Forum diskusi komunitas",
      "Update materi bulanan",
    ],
    cta: "Mulai Starter",
    href: "/daftar?plan=starter",
  },
  {
    id: "pro",
    name: "Pro",
    icon: Star,
    badge: "Paling Populer",
    priceMonthly: 199_000,
    priceAnnual: 159_000,
    note: "atau Rp 159.000/bln jika bayar tahunan",
    desc: "Untuk profesional yang serius berkembang.",
    color: "var(--brand-pink-strong)",
    features: [
      // BL-23: "(150+)" dropped for the same reason. "Semua kursus" is true
      // whatever the catalogue size is; the number was not.
      "Akses semua kursus",
      "E-book tanpa batas",
      "Sertifikat bersertifikasi nasional",
      "Akses rekaman semua event",
      "1-on-1 mentoring (2x/bulan)",
      "Download materi offline",
      "Badge profil eksklusif",
    ],
    cta: "Mulai Pro",
    href: "/daftar?plan=pro",
  },
  {
    id: "enterprise",
    name: "Enterprise",
    icon: Building2,
    badge: null,
    priceMonthly: null,
    priceAnnual: null,
    note: null,
    desc: "Untuk tim & perusahaan dengan kebutuhan khusus.",
    color: "#B45309",
    features: [
      "Semua fitur Pro",
      "LMS whitelabel untuk perusahaan",
      "Manajemen tim & progress report",
      "Kursus custom sesuai kebutuhan",
      "Dedicated account manager",
      "SLA & support prioritas",
    ],
    cta: "Hubungi Kami",
    href: "/contact?subject=Enterprise",
  },
];

/** Presentation-only fields, keyed by plan id. The API owns pricing; this owns look & feel. */
const PLAN_PRESENTATION: Record<
  string,
  { icon: LucideIcon; color: string; desc: string; cta: string; href: string }
> = {
  monthly: {
    icon: Zap,
    color: "var(--brand-cyan-strong)",
    desc: "Fleksibel, bayar per bulan tanpa komitmen panjang.",
    cta: "Mulai Bulanan",
    href: "/daftar?plan=monthly",
  },
  annual: {
    icon: Star,
    color: "var(--brand-pink-strong)",
    desc: "Komitmen setahun dengan harga per bulan termurah.",
    cta: "Mulai Tahunan",
    href: "/daftar?plan=annual",
  },
  starter: {
    icon: Zap,
    color: "var(--brand-cyan-strong)",
    desc: "Untuk individu yang ingin mulai belajar.",
    cta: "Mulai Starter",
    href: "/daftar?plan=starter",
  },
  pro: {
    icon: Star,
    color: "var(--brand-pink-strong)",
    desc: "Untuk profesional yang serius berkembang.",
    cta: "Mulai Pro",
    href: "/daftar?plan=pro",
  },
  enterprise: {
    icon: Building2,
    color: "#B45309",
    desc: "Untuk tim & perusahaan dengan kebutuhan khusus.",
    cta: "Hubungi Kami",
    href: "/contact?subject=Enterprise",
  },
};

const rupiah = (n: number) => n.toLocaleString("id-ID");

/**
 * Narrow untrusted JSON into an ApiPlan. The web app has no Zod dependency, so
 * this is a hand-rolled guard — a malformed entry must be dropped rather than
 * reach the JSX, where a missing `price` or `features` would throw at render.
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
 * Maps an API plan onto the view model. The API bills per period while the card
 * headline is always a per-month figure, so annual plans show `pricePerMonth`
 * and disclose the real amount charged in `note`.
 */
function toPlanView(plan: ApiPlan): PlanView {
  const presentation = PLAN_PRESENTATION[plan.id] ?? {
    icon: Sparkles,
    color: "var(--brand-cyan-strong)",
    desc: "",
    cta: `Pilih ${plan.name}`,
    href: `/daftar?plan=${encodeURIComponent(plan.id)}`,
  };

  const isAnnual = plan.durationDays >= 365;
  const note = isAnnual
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
    // Headline is per-month; an annual plan's own price is the yearly charge.
    priceMonthly: plan.pricePerMonth ?? plan.price,
    // Each API plan is a single cadence, so there is no second price to toggle to.
    priceAnnual: null,
    note,
    desc: presentation.desc,
    color: presentation.color,
    features: plan.features,
    cta: presentation.cta,
    href: presentation.href,
  };
}

/**
 * Server-side plan fetch (BL-85/BL-122). `fetchList` already collapses every
 * no-usable-list outcome — network rejection, non-2xx, unparseable body, wrong
 * envelope — into `ok: false`, so this only has to decide what to render then.
 *
 * That decision is `PLANS`: unlike a catalogue page, an empty pricing page tells
 * the visitor nothing and sells nothing, so last-known pricing beats a blank
 * grid. Entries failing `isApiPlan` are dropped, and dropping every entry lands
 * on the same fallback.
 */
async function getPlans(): Promise<PlanView[]> {
  const result = await fetchList<PlanView>(
    "/api/subscription/plans",
    (rows) => rows.filter(isApiPlan).map(toPlanView),
    // Cache briefly; `AbortSignal.timeout` so an unreachable API fails fast
    // instead of hanging the build, matching the other public server pages.
    (input) => fetch(input, { next: { revalidate: 300 }, signal: AbortSignal.timeout(8000) }),
  );

  return result.ok && result.items.length > 0 ? result.items : PLANS;
}

const FAQS = [
  {
    q: "Apa yang termasuk dalam langganan?",
    a: "Langganan memberikan akses ke kursus, e-book, rekaman event, dan fitur sesuai paket yang dipilih. Kursus baru ditambahkan setiap bulan.",
  },
  {
    q: "Apakah saya bisa upgrade atau downgrade paket?",
    a: "Ya. Kamu bisa upgrade kapan saja dan tagihan akan disesuaikan secara proporsional. Downgrade berlaku di siklus billing berikutnya.",
  },
  {
    q: "Bagaimana metode pembayaran yang tersedia?",
    a: "Kami mendukung transfer bank, kartu kredit/debit, GoPay, OVO, DANA, dan QRIS melalui gateway pembayaran Midtrans.",
  },
  {
    q: "Apakah ada uji coba gratis?",
    a: "Kamu bisa mendaftar gratis dan mengakses konten preview tanpa kartu kredit. Upgrade kapan saja jika ingin akses penuh.",
  },
  {
    q: "Apakah sertifikat termasuk dalam langganan?",
    a: "Semua paket (Starter, Pro, Enterprise) menyertakan sertifikat kelulusan untuk setiap kursus yang diselesaikan. Paket Pro mendapatkan sertifikat bersertifikasi nasional.",
  },
];

// ─── Components ───────────────────────────────────────────────────────────────

function PriceDisplay({
  monthly,
  annual,
  isAnnual,
}: {
  monthly: number | null;
  annual: number | null;
  isAnnual: boolean;
}) {
  if (monthly === null) {
    return (
      <div>
        <span className="block text-2xl font-extrabold text-text-primary">Harga Khusus</span>
        <span className="text-sm text-text-muted">Hubungi tim kami</span>
      </div>
    );
  }
  const price = isAnnual ? annual! : monthly;
  return (
    <div className="flex items-baseline gap-1">
      <span className="text-sm font-medium text-text-muted">Rp</span>
      <span className="text-[2rem] font-extrabold leading-none tabular-nums text-text-primary">
        {price.toLocaleString("id-ID")}
      </span>
      <span className="text-sm text-text-muted">/bln</span>
      {isAnnual && (
        <span className="ml-2 rounded-full bg-green-600/10 px-2 py-0.5 text-[11px] font-bold text-green-700">
          Hemat {Math.round((1 - annual! / monthly) * 100)}%
        </span>
      )}
    </div>
  );
}

// ─── Server Component (no useState needed — FAQ uses CSS <details>) ──────────

export default async function BerlanggananPage() {
  const plans = await getPlans();

  return (
    // A plain <div>, not <main>: the (public) layout already wraps children in
    // <main id="main-content">, and nesting a second <main> breaks the single
    // landmark the skip-link targets.
    <div className="min-h-screen bg-surface-page text-text-primary">
      {/* Hero */}
      <section className="relative overflow-hidden px-6 pb-16 pt-24 text-center">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute left-1/2 top-[-220px] h-[560px] w-[820px] -translate-x-1/2 rounded-full"
          style={{ background: "radial-gradient(ellipse, rgba(0,119,168,0.10) 0%, transparent 70%)" }}
        />
        <div className="relative z-10 mx-auto max-w-3xl">
          <span className="mb-5 inline-flex items-center gap-2 rounded-full border border-[rgba(0,119,168,0.2)] bg-surface-accent-soft px-4 py-1.5 text-xs font-semibold tracking-wide text-accent-cyan-strong">
            <Sparkles size={14} />
            Hazl Academy Premium
          </span>
          <h1 className="mb-5 text-[clamp(2rem,5vw,3.25rem)] font-extrabold leading-[1.12] tracking-tight text-text-primary">
            Satu Langganan,
            <br />
            <span className="text-accent">Akses Semua Konten</span>
          </h1>
          <p className="mx-auto mb-9 max-w-xl text-[1.05rem] leading-relaxed text-text-secondary">
            Kursus, e-book, rekaman event, mentoring, dan sertifikasi — semuanya
            dalam satu paket terjangkau.
          </p>

          {/*
            BL-23: a stats row used to sit here claiming "150+ Kursus aktif",
            "50+ Mentor expert", "10rb+ Pelajar aktif" and "98% Kepuasan
            pengguna". None of it came from the database — the figures were
            written by hand, and the catalogue behind them is far smaller.
            TASK-052 had already stripped exactly this kind of claim from the
            homepage hero and /about on 2 Jul 2026; this page was created 27
            days later and reintroduced it, linked from the Footer and listed in
            the sitemap.

            Deleted rather than replaced with softer numbers: the homepage hero
            settled this question already ("No fake numbers, no stock imagery" —
            components/home/HeroSection.tsx). What this subscription actually
            includes is stated honestly in the plan cards below, which read from
            real plan data. If a proof row belongs here later, it has to come
            from the API, and hide itself when the count is zero — the pattern
            TestimonialsSection already uses.
          */}
        </div>
      </section>

      {/* Billing note */}
      <section className="border-y border-[rgba(0,119,168,0.12)] bg-surface-accent-soft px-6 py-4 text-center">
        <span className="text-sm font-medium text-text-secondary">
          💡 Bayar tahunan lebih hemat hingga 20%
        </span>
      </section>

      {/* Plans */}
      <section className="mx-auto max-w-6xl px-6 pb-12 pt-16">
        <div className="mb-8 grid grid-cols-1 gap-6 md:grid-cols-3">
          {plans.map((plan) => {
            const Icon = plan.icon;
            const featured = Boolean(plan.badge);
            return (
              <article
                key={plan.id}
                className={`relative flex flex-col gap-5 rounded-[var(--radius-xl)] border bg-surface-card p-7 shadow-e1 transition-all hover:-translate-y-1 hover:shadow-e2 ${
                  featured ? "border-[color:var(--plan-color)] shadow-e2" : "border-border-default"
                }`}
                style={
                  {
                    "--plan-color": plan.color,
                    ...(featured ? { boxShadow: "0 0 0 1px var(--plan-color), var(--shadow-e2)" } : {}),
                  } as React.CSSProperties
                }
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
                  <PriceDisplay
                    monthly={plan.priceMonthly}
                    annual={plan.priceAnnual}
                    isAnnual={false}
                  />
                  {/*
                    Render the mapped `note`, not a hardcoded annual line: an API
                    plan is a single cadence, so its `priceAnnual` is null and the
                    old `priceAnnual!` deref threw at render the moment real plans
                    reached the JSX.
                  */}
                  {plan.note && <p className="mt-1.5 text-xs text-text-muted">{plan.note}</p>}
                </div>

                <ul className="flex flex-1 flex-col gap-2.5">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2.5 text-[13.5px] text-text-secondary">
                      <CheckCircle2
                        size={16}
                        className="mt-0.5 flex-shrink-0"
                        style={{ color: "var(--plan-color)" }}
                      />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>

                <Link
                  href={plan.href}
                  className={
                    featured
                      ? "btn bg-brand-gradient w-full justify-center text-white shadow-e1 hover:opacity-90 hover:shadow-e2"
                      : "btn btn-outline w-full justify-center"
                  }
                >
                  {plan.cta}
                </Link>
              </article>
            );
          })}
        </div>

        <p className="text-center text-[13px] text-text-muted">
          Semua paket dilengkapi garansi uang kembali 7 hari.{" "}
          <Link href="/contact" className="font-semibold text-accent-cyan-strong hover:underline">
            Butuh bantuan memilih?
          </Link>
        </p>
      </section>

      {/* Compare CTA */}
      <section className="border-y border-[rgba(0,119,168,0.12)] bg-surface-accent-soft px-6 py-12 text-center">
        <div className="mx-auto max-w-xl">
          <h2 className="mb-2 text-2xl font-bold text-text-primary">Sudah berlangganan?</h2>
          <p className="mb-5 text-sm text-text-secondary">
            Akses langsung dashboard kamu untuk melihat status dan riwayat langganan.
          </p>
          <Link href="/dashboard/berlangganan" className="btn btn-outline">
            Lihat Status Langganan →
          </Link>
        </div>
      </section>

      {/* FAQ */}
      <section className="px-6 py-20">
        <div className="mx-auto max-w-3xl">
          <h2 className="mb-10 text-center text-3xl font-extrabold text-text-primary">
            Pertanyaan Umum
          </h2>
          <div className="flex flex-col gap-3">
            {FAQS.map((faq, i) => (
              <details
                key={i}
                className="group overflow-hidden rounded-2xl border border-border-default bg-surface-card shadow-e1 open:border-[rgba(0,119,168,0.25)]"
              >
                <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-5 py-4 text-sm font-semibold text-text-primary [&::-webkit-details-marker]:hidden">
                  <span>{faq.q}</span>
                  <ChevronDown
                    size={18}
                    className="flex-shrink-0 text-text-muted transition-transform duration-200 group-open:rotate-180"
                  />
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
            <Link
              href="/daftar"
              className="btn bg-white justify-center text-accent-cyan-strong shadow-e1 hover:opacity-90"
            >
              Daftar Gratis
            </Link>
            <Link
              href="/e-course"
              className="btn justify-center border border-solid border-white/40 bg-white/10 text-white hover:bg-white/20"
            >
              Jelajahi Kursus
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
