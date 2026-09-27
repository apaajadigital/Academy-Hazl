import type { Metadata } from "next";
import { Target, Handshake, Rocket, Lightbulb } from "lucide-react";

export const metadata: Metadata = {
  title: "Tentang Kami",
  description:
    "Hazl Academy adalah platform edukasi digital yang mengintegrasikan e-course, event, e-book, dan program trainer dalam satu ekosistem belajar.",
};

// Real product offerings (no fabricated metrics — TASK-052).
const STATS = [
  { value: "E-Course", label: "Kursus online bersertifikat" },
  { value: "Event", label: "Webinar & workshop" },
  { value: "LMS B2B", label: "Untuk perusahaan" },
  { value: "Trainer", label: "Program sertifikasi" },
];

const VALUES = [
  {
    icon: Target,
    title: "Relevan",
    desc: "Kurikulum dirancang bersama praktisi industri sehingga selalu relevan dengan kebutuhan dunia kerja.",
  },
  {
    icon: Handshake,
    title: "Terpercaya",
    desc: "Setiap trainer melewati proses seleksi ketat. Kami menjamin kualitas pembelajaran yang konsisten.",
  },
  {
    icon: Rocket,
    title: "Aksesibel",
    desc: "Belajar kapan saja, di mana saja. Platform kami dirancang untuk memaksimalkan fleksibilitas Anda.",
  },
  {
    icon: Lightbulb,
    title: "Berdampak",
    desc: "Kami mengukur keberhasilan dari karier dan pertumbuhan nyata yang dialami pelajar kami.",
  },
];

export default function AboutPage() {
  return (
    <main id="main-content">
      {/* Hero */}
      <section className="border-b border-[var(--border-subtle)] bg-[var(--surface-card)] px-6 pb-16 pt-24">
        <div className="mx-auto max-w-4xl space-y-6 text-center">
          <p className="eyebrow eyebrow-center justify-center">Tentang Hazl Academy</p>
          <h1 className="font-display text-4xl font-extrabold leading-[1.1] tracking-tight text-[var(--text-primary)] text-balance md:text-5xl">
            Membangun Indonesia yang <span className="text-accent">Lebih Kompeten</span>
          </h1>
          <p className="mx-auto max-w-2xl text-lg leading-relaxed text-[var(--text-secondary)]">
            Hazl Academy hadir untuk menjembatani kesenjangan antara dunia pendidikan dan kebutuhan industri,
            melalui ekosistem belajar yang terintegrasi dan berorientasi pada hasil nyata.
          </p>
        </div>
      </section>

      {/* Stats */}
      <section className="border-b border-[var(--border-default)] bg-[var(--surface-card)] py-12">
        <div className="mx-auto grid max-w-5xl grid-cols-2 gap-8 px-6 md:grid-cols-4">
          {STATS.map((s) => (
            <div key={s.label} className="text-center">
              <p className="font-display text-3xl font-extrabold text-[var(--brand-cyan-strong)]">{s.value}</p>
              <p className="mt-1 text-sm text-[var(--text-secondary)]">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Mission */}
      <section className="bg-[var(--surface-sunken)] px-6 py-20">
        <div className="mx-auto grid max-w-5xl items-center gap-12 md:grid-cols-2">
          <div className="space-y-4">
            <p className="eyebrow">Misi Kami</p>
            <h2 className="font-display text-3xl font-extrabold tracking-tight text-[var(--text-primary)]">
              Pendidikan Berkualitas untuk Semua Orang Indonesia
            </h2>
            <p className="leading-relaxed text-[var(--text-secondary)]">
              Kami percaya bahwa setiap orang berhak mendapat akses ke pendidikan berkualitas tinggi yang
              relevan dengan kebutuhan karier mereka. Hazl Academy menghadirkan pengalaman belajar yang
              terstruktur, praktis, dan didukung oleh komunitas yang solid.
            </p>
            <p className="leading-relaxed text-[var(--text-secondary)]">
              Dengan memadukan teknologi terkini dan keahlian para praktisi terbaik, kami membantu individu
              dan organisasi berkembang lebih cepat di era digital ini.
            </p>
          </div>
          <div className="bg-brand-gradient space-y-4 rounded-[var(--radius-xl)] p-8 text-white shadow-e3">
            <p className="font-display text-2xl font-extrabold">Visi 2030</p>
            <p className="leading-relaxed text-white/90">
              Menjadi platform edukasi digital #1 di Indonesia yang menghasilkan 1 juta tenaga profesional
              kompeten dan berkontribusi pada pertumbuhan ekonomi digital nasional.
            </p>
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="bg-[var(--surface-card)] px-6 py-20">
        <div className="mx-auto max-w-5xl">
          <div className="mb-12 text-center">
            <p className="eyebrow eyebrow-center mb-3 justify-center">Nilai Kami</p>
            <h2 className="font-display text-3xl font-extrabold tracking-tight text-[var(--text-primary)]">Apa yang Mendorong Kami</h2>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 md:grid-cols-4">
            {VALUES.map((v) => {
              const Icon = v.icon;
              return (
                <div
                  key={v.title}
                  className="group flex h-full flex-col gap-3 rounded-[var(--radius-lg)] border border-[var(--border-default)] bg-[var(--surface-sunken)] p-6 transition-all duration-200 hover:-translate-y-1 hover:shadow-e2"
                >
                  <span className="flex h-12 w-12 flex-none items-center justify-center rounded-[var(--radius-md)] border border-[rgba(0,119,168,0.15)] bg-[var(--surface-accent-soft)] text-[var(--brand-cyan-strong)] transition-colors duration-200 group-hover:bg-[var(--brand-cyan-strong)] group-hover:text-white">
                    <Icon size={22} strokeWidth={1.75} aria-hidden="true" />
                  </span>
                  <h3 className="font-display font-bold text-[var(--text-primary)]">{v.title}</h3>
                  <p className="text-sm leading-relaxed text-[var(--text-secondary)]">{v.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* CTA — editorial ink band */}
      <section className="bg-[var(--text-primary)] px-6 py-20 text-center text-white">
        <div className="mx-auto max-w-2xl space-y-6">
          <h2 className="font-display text-3xl font-extrabold tracking-tight">Bergabunglah Bersama Kami</h2>
          <p className="text-white/70">
            Mulai perjalanan belajar Anda hari ini dan jadilah bagian dari komunitas profesional yang terus berkembang.
          </p>
          <div className="flex flex-col justify-center gap-3 sm:flex-row">
            <a href="/daftar" className="btn btn-lg bg-brand-gradient text-white shadow-e2 transition-opacity hover:opacity-90">
              Mulai Belajar Gratis
            </a>
            <a
              href="/contact"
              className="inline-flex items-center justify-center gap-2 rounded-full border border-white/30 px-9 py-4 font-display text-[1.0625rem] font-semibold text-white transition-colors hover:bg-white/10"
            >
              Hubungi Kami
            </a>
          </div>
        </div>
      </section>
    </main>
  );
}
