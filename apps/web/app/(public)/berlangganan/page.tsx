import type { Metadata } from "next";
import Link from "next/link";
import { CheckCircle2, Zap, Building2, Star, ChevronDown, Sparkles } from "lucide-react";

export const metadata: Metadata = {
  title: "Berlangganan — Akses Semua Konten Premium",
  description:
    "Pilih paket berlangganan Jago Akademi yang sesuai kebutuhan. Akses ribuan kursus, event eksklusif, e-book, dan sertifikasi dalam satu langganan.",
  alternates: { canonical: "/berlangganan" },
};

// ─── Plan data ────────────────────────────────────────────────────────────────

const PLANS = [
  {
    id: "starter",
    name: "Starter",
    icon: Zap,
    badge: null,
    priceMonthly: 99_000,
    priceAnnual: 79_000,
    desc: "Untuk individu yang ingin mulai belajar.",
    color: "var(--brand-cyan-strong)",
    features: [
      "Akses 50+ kursus pilihan",
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
    desc: "Untuk profesional yang serius berkembang.",
    color: "var(--brand-pink-strong)",
    features: [
      "Akses semua kursus (150+)",
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

export default function BerlanggananPage() {
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
            Jago Akademi Premium
          </span>
          <h1 className="mb-5 text-[clamp(2rem,5vw,3.25rem)] font-extrabold leading-[1.12] tracking-tight text-text-primary">
            Satu Langganan,
            <br />
            <span className="text-accent">Akses Semua Konten</span>
          </h1>
          <p className="mx-auto mb-9 max-w-xl text-[1.05rem] leading-relaxed text-text-secondary">
            Ratusan kursus, ribuan e-book, rekaman event eksklusif, mentoring, dan
            sertifikasi — semuanya dalam satu paket terjangkau.
          </p>

          {/* Stats row */}
          <div className="mx-auto grid max-w-2xl grid-cols-2 overflow-hidden rounded-2xl border border-border-default bg-surface-card shadow-e1 sm:grid-cols-4">
            {[
              { val: "150+", label: "Kursus aktif" },
              { val: "50+", label: "Mentor expert" },
              { val: "10rb+", label: "Pelajar aktif" },
              { val: "98%", label: "Kepuasan pengguna" },
            ].map((s) => (
              <div
                key={s.label}
                className="border-b border-r border-border-subtle px-4 py-[18px] text-center last:border-r-0 sm:border-b-0"
              >
                <span className="block text-2xl font-extrabold text-accent-cyan-strong">{s.val}</span>
                <span className="mt-0.5 block text-[11px] text-text-muted">{s.label}</span>
              </div>
            ))}
          </div>
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
          {PLANS.map((plan) => {
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
                  {plan.priceMonthly && (
                    <p className="mt-1.5 text-xs text-text-muted">
                      atau Rp {plan.priceAnnual!.toLocaleString("id-ID")}/bln jika bayar tahunan
                    </p>
                  )}
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
