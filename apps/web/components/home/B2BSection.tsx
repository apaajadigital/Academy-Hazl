import Link from "next/link";
import { Building2, BarChart3, Shield } from "lucide-react";
import { Section } from "@/components/ui/Section";
import { Reveal } from "@/components/ui/Reveal";

/**
 * B2B enterprise mini-section: connects homepage → /clients funnel.
 * Placed between TestimonialsSection and EarlyAccessBand.
 */
export function B2BSection() {
  return (
    <Section>
      <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-12">
        {/* Left: copy */}
        <Reveal className="lg:col-span-7">
          <p className="eyebrow mb-4">Untuk Perusahaan & Institusi</p>
          <h2 className="font-display text-3xl font-bold tracking-tight text-[var(--text-primary)] text-balance md:text-4xl">
            Kelola pelatihan tim dalam{" "}
            <span className="bg-brand-gradient bg-clip-text text-transparent">satu platform terpadu</span>
          </h2>
          <p className="mt-4 max-w-lg text-base leading-relaxed text-[var(--text-secondary)]">
            Jago Akademi LMS B2B memungkinkan perusahaan mengelola program pelatihan karyawan, melacak progres, dan menerbitkan sertifikat — semua dalam satu workspace yang bisa dikustomisasi.
          </p>
          <div className="mt-8 flex flex-wrap gap-6">
            {[
              { icon: Building2, text: "Workspace per divisi atau team" },
              { icon: BarChart3, text: "Dashboard progres real-time" },
              { icon: Shield,    text: "Data terisolasi per perusahaan" },
            ].map(({ icon: Icon, text }) => (
              <div key={text} className="flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--surface-accent-soft)] text-[var(--brand-cyan-strong)]">
                  <Icon size={16} strokeWidth={1.75} aria-hidden="true" />
                </span>
                <span className="text-sm font-medium text-[var(--text-secondary)]">{text}</span>
              </div>
            ))}
          </div>
        </Reveal>

        {/* Right: CTA card */}
        <Reveal delay={0.1} className="lg:col-span-5">
          <div className="relative overflow-hidden rounded-[var(--radius-xl)] border border-[var(--border-subtle)] bg-white p-8 shadow-e2">
            {/* Gradient accent bar (Stitch flair) — decorative. */}
            <span aria-hidden="true" className="absolute inset-x-0 top-0 h-1 bg-brand-gradient" />
            <p className="text-sm font-semibold text-[var(--text-secondary)] mb-1">Mulai dari trial 14 hari</p>
            <p className="font-display text-2xl font-bold text-[var(--text-primary)] mb-6">
              Coba LMS B2B gratis — tanpa kartu kredit
            </p>
            <Link
              href="/clients"
              className="btn bg-brand-gradient text-white shadow-e1 hover:opacity-90 hover:shadow-e2 w-full justify-center mb-3"
            >
              Lihat Paket LMS B2B
            </Link>
            <Link href="/contact" className="btn btn-ghost w-full justify-center text-[var(--text-secondary)]">
              Konsultasi dengan tim kami
            </Link>
          </div>
        </Reveal>
      </div>
    </Section>
  );
}
