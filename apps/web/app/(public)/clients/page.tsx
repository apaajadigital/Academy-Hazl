import type { Metadata } from "next";
import Link from "next/link";
import {
  Users, BarChart3, Award, Building2, ShieldCheck,
  Clock, Layers, CheckCircle2,
} from "lucide-react";
import { Section, SectionHeader } from "@/components/ui/Section";
import { Reveal } from "@/components/ui/Reveal";
import { LeadCaptureForm } from "@/components/landing/LeadCaptureForm";

export const metadata: Metadata = {
  title: "LMS B2B untuk Perusahaan — Jago Akademi",
  description:
    "Digitalkan program pelatihan karyawan dengan LMS B2B Jago Akademi. Kelola batch, tugaskan kursus, pantau progres tim, dan terbitkan sertifikat ber-branding perusahaan Anda.",
  alternates: { canonical: "/clients" },
  openGraph: {
    title: "LMS B2B untuk Perusahaan — Jago Akademi",
    description:
      "Platform pelatihan karyawan terpusat — workspace eksklusif, laporan real-time, sertifikasi otomatis.",
    type: "website",
  },
};

// ─── Data ─────────────────────────────────────────────────────────────────────

const CAPABILITIES = [
  {
    icon: Building2,
    title: "Workspace Multi-tenant",
    desc: "Ruang belajar eksklusif ber-branding perusahaan Anda — logo, warna, dan domain kustom.",
  },
  {
    icon: Users,
    title: "Kelola Batch & Peserta",
    desc: "Undang karyawan via email, kelompokkan ke batch pelatihan, dan tugaskan kursus secara massal.",
  },
  {
    icon: BarChart3,
    title: "Laporan Progres Real-time",
    desc: "Pantau completion rate, waktu belajar, dan nilai kuis seluruh tim dalam satu dashboard.",
  },
  {
    icon: Award,
    title: "Sertifikat Otomatis",
    desc: "Terbitkan sertifikat kelulusan ber-branding institusi Anda secara otomatis saat kursus selesai.",
  },
  {
    icon: Layers,
    title: "Konten Fleksibel",
    desc: "Buat kursus sendiri atau gabungkan dengan katalog kursus Jago Akademi yang sudah ada.",
  },
  {
    icon: ShieldCheck,
    title: "Keamanan Enterprise",
    desc: "Kontrol akses berbasis role (LMS Admin & Employee), audit log, dan data terisolasi per tenant.",
  },
];

// Every plan routes to the same on-page consultation form (#konsultasi). There is
// no B2B pricing/checkout endpoint, so the CTA label is the only thing that
// differentiates the tiers — no prices are stated anywhere.
const PLANS = [
  {
    name: "Trial",
    badge: "Coba Gratis",
    badgeCls: "bg-[var(--surface-accent-soft)] text-[var(--brand-cyan-strong)]",
    perks: ["14 hari gratis", "50 kursi", "1 batch", "Laporan dasar"],
    cta: "Mulai Trial Gratis",
  },
  {
    name: "Starter",
    badge: "Populer",
    badgeCls: "bg-[rgba(124,58,237,0.1)] text-[#7C3AED]",
    perks: ["100 kursi", "5 batch", "Laporan lengkap", "Sertifikat branded"],
    highlight: true,
    cta: "Konsultasi Paket Starter",
  },
  {
    name: "Pro",
    badge: "",
    badgeCls: "",
    perks: ["500 kursi", "Batch tak terbatas", "Custom domain", "Priority support"],
    cta: "Konsultasi Paket Pro",
  },
  {
    name: "Enterprise",
    badge: "",
    badgeCls: "",
    perks: ["Kursi tak terbatas", "SSO/SAML", "Dedicated server", "SLA 99.9%"],
    cta: "Hubungi Sales",
  },
];

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ClientsPage() {
  return (
    <div style={{ background: "var(--surface-page)" }}>

      {/* ── Hero (light) ──────────────────────────────────────────────────────── */}
      <section
        className="relative overflow-hidden border-b border-[var(--border-subtle)] pb-20 pt-24"
        style={{ background: "var(--surface-card)" }}
      >
        {/* Background grid decoration — subtle brand tint on light */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage:
              "linear-gradient(rgba(0,119,168,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(0,119,168,0.05) 1px, transparent 1px)",
            backgroundSize: "48px 48px",
            maskImage: "radial-gradient(ellipse 80% 60% at 50% 0%, #000 40%, transparent 100%)",
            WebkitMaskImage: "radial-gradient(ellipse 80% 60% at 50% 0%, #000 40%, transparent 100%)",
          }}
        />

        <div className="relative mx-auto max-w-5xl px-4 text-center">
          <Reveal immediate>
            <span className="badge badge-cyan mb-4">
              🏢 Paket LMS B2B
            </span>
          </Reveal>

          <Reveal immediate delay={0.06}>
            <h1
              className="mb-5 text-4xl font-extrabold leading-[1.1] tracking-tight text-[var(--text-primary)] text-balance md:text-5xl lg:text-6xl"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Pelatihan Karyawan,{" "}
              <span className="text-accent">Terpusat &amp; Terukur</span>
            </h1>
          </Reveal>

          <Reveal immediate delay={0.12}>
            <p className="mx-auto mb-10 max-w-2xl text-lg leading-relaxed text-[var(--text-secondary)]">
              Digitalkan program pengembangan SDM perusahaan Anda dalam satu platform.
              Workspace eksklusif, kursus terkurasi, laporan real-time — semuanya dalam satu ekosistem.
            </p>
          </Reveal>

          {/* Stat pills — light neutral chips */}
          <Reveal immediate delay={0.18}>
            <div className="mb-10 flex flex-wrap justify-center gap-3">
              {[
                { icon: "⚡", text: "Setup dalam 24 jam" },
                { icon: "🔒", text: "Data terisolasi per tenant" },
                { icon: "📱", text: "Akses dari semua perangkat" },
              ].map((s) => (
                <span
                  key={s.text}
                  className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border-default)] bg-[var(--surface-sunken)] px-4 py-1.5 text-sm font-medium text-[var(--text-secondary)]"
                >
                  {s.icon} {s.text}
                </span>
              ))}
            </div>
          </Reveal>

          {/* Scroll cue — a real anchor to the consultation form, not dead text. */}
          <Reveal immediate delay={0.22}>
            <Link
              href="#konsultasi"
              className="inline-block text-sm text-[var(--text-muted)] transition-colors hover:text-[var(--brand-cyan-strong)]"
            >
              ↓ Konsultasi gratis di bawah
            </Link>
          </Reveal>
        </div>
      </section>

      {/* ── Capabilities ──────────────────────────────────────────────────────── */}
      <Section id="capabilities">
        <SectionHeader
          eyebrow="Fitur Utama"
          title={
            <>
              Semua yang dibutuhkan tim{" "}
              <span className="text-accent">HR & L&D</span>
            </>
          }
          lede="Dari onboarding karyawan baru hingga pelatihan lanjutan — kelola semua di satu tempat."
        />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {CAPABILITIES.map((cap, i) => {
            const Icon = cap.icon;
            return (
              <Reveal key={cap.title} delay={(i % 3) * 0.06}>
                <article
                  className="flex gap-4 rounded-2xl p-6 transition-all duration-200 hover:-translate-y-0.5"
                  style={{
                    background: "var(--surface-card)",
                    border: "1px solid var(--border-subtle)",
                    boxShadow: "var(--shadow-e1)",
                  }}
                >
                  <span
                    className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl"
                    style={{
                      background: "var(--surface-accent-soft)",
                      border: "1px solid rgba(0,119,168,0.15)",
                    }}
                  >
                    <Icon size={20} strokeWidth={1.75} style={{ color: "var(--brand-cyan-strong)" }} aria-hidden="true" />
                  </span>
                  <div>
                    <h3
                      className="mb-1 font-bold"
                      style={{ color: "var(--text-primary)", fontFamily: "var(--font-display)" }}
                    >
                      {cap.title}
                    </h3>
                    <p className="text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>
                      {cap.desc}
                    </p>
                  </div>
                </article>
              </Reveal>
            );
          })}
        </div>
      </Section>

      {/* ── Pricing tiers ─────────────────────────────────────────────────────── */}
      <Section tone="sunken">
        <SectionHeader
          eyebrow="Paket"
          title={
            <>
              Pilih paket yang{" "}
              <span className="text-accent">sesuai skala</span> tim Anda
            </>
          }
          lede="Mulai trial gratis 14 hari — tidak perlu kartu kredit. Upgrade kapan saja."
        />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {PLANS.map((plan, i) => (
            <Reveal key={plan.name} delay={i * 0.05} className="h-full">
              <div
                className="flex h-full flex-col rounded-2xl p-6"
                style={{
                  background: plan.highlight ? "var(--brand-cyan-strong)" : "var(--surface-card)",
                  border: plan.highlight
                    ? "none"
                    : "1px solid var(--border-default)",
                  boxShadow: plan.highlight ? "0 8px 32px rgba(0,119,168,0.25)" : "var(--shadow-e1)",
                }}
              >
                <div className="mb-3 flex items-center justify-between">
                  <p
                    className="font-display text-lg font-extrabold"
                    style={{ color: plan.highlight ? "#fff" : "var(--text-primary)" }}
                  >
                    {plan.name}
                  </p>
                  {plan.badge && (
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${plan.badgeCls}`}>
                      {plan.badge}
                    </span>
                  )}
                </div>
                <ul className="mb-6 space-y-2">
                  {plan.perks.map((perk) => (
                    <li key={perk} className="flex items-center gap-2 text-sm">
                      <CheckCircle2
                        size={14}
                        aria-hidden="true"
                        style={{ color: plan.highlight ? "rgba(255,255,255,0.7)" : "var(--brand-cyan-strong)", flexShrink: 0 }}
                      />
                      <span style={{ color: plan.highlight ? "rgba(255,255,255,0.9)" : "var(--text-secondary)" }}>
                        {perk}
                      </span>
                    </li>
                  ))}
                </ul>

                {/* CTA — all tiers funnel to the consultation form below. `mt-auto`
                    keeps the buttons on one baseline across the (equal-height) cards.
                    On the cyan highlight card the button inverts to white-on-cyan
                    so it stays legible against the solid brand background. */}
                <Link
                  href="#konsultasi"
                  aria-label={`${plan.cta} — paket ${plan.name}`}
                  className={
                    plan.highlight
                      ? "btn btn-sm mt-auto w-full bg-white text-[var(--brand-cyan-strong)] shadow-e1 hover:bg-[var(--surface-accent-soft)] hover:shadow-e2"
                      : "btn btn-outline btn-sm mt-auto w-full"
                  }
                >
                  {plan.cta}
                </Link>
              </div>
            </Reveal>
          ))}
        </div>
        <p className="mt-6 text-center text-sm" style={{ color: "var(--text-muted)" }}>
          Butuh konfigurasi khusus? Konsultasikan kebutuhan Anda lewat form di bawah.
        </p>
      </Section>

      {/* ── Lead capture form ─────────────────────────────────────────────────── */}
      <Section id="konsultasi">
        <div className="mx-auto max-w-2xl">
          <Reveal>
            <div className="mb-8 text-center">
              <p className="eyebrow mb-3">Konsultasi Gratis</p>
              <h2
                className="mb-3 text-3xl font-extrabold tracking-tight"
                style={{ color: "var(--text-primary)", fontFamily: "var(--font-display)" }}
              >
                Mulai program pelatihan{" "}
                <span className="text-accent">korporat Anda</span>
              </h2>
              <p className="text-base leading-relaxed" style={{ color: "var(--text-secondary)" }}>
                Isi form di bawah — tim kami akan menghubungi dalam 1×24 jam untuk menyiapkan
                workspace trial dan proposal yang disesuaikan.
              </p>
            </div>
          </Reveal>

          <Reveal delay={0.08}>
            <div
              className="rounded-2xl p-1"
              style={{
                background: "linear-gradient(135deg, var(--brand-cyan-strong) 0%, #7C3AED 100%)",
              }}
            >
              <div
                className="rounded-[calc(var(--radius-xl)-2px)]"
                style={{ background: "var(--surface-card)" }}
              >
                <div className="p-6 sm:p-8">
                  <LeadCaptureForm
                    source="lms"
                    withCompany
                    submitLabel="Konsultasi Gratis"
                  />
                </div>
              </div>
            </div>
          </Reveal>

          {/* Trust signals */}
          <Reveal delay={0.14}>
            <div className="mt-6 flex flex-wrap justify-center gap-4">
              {[
                { icon: Clock, text: "Respon dalam 24 jam" },
                { icon: ShieldCheck, text: "Data aman & rahasia" },
                { icon: Award, text: "Trial gratis 14 hari" },
              ].map(({ icon: Icon, text }) => (
                <div
                  key={text}
                  className="flex items-center gap-1.5 text-xs font-medium"
                  style={{ color: "var(--text-muted)" }}
                >
                  <Icon size={12} aria-hidden="true" style={{ color: "var(--brand-cyan-strong)" }} />
                  {text}
                </div>
              ))}
            </div>
          </Reveal>
        </div>
      </Section>

    </div>
  );
}
