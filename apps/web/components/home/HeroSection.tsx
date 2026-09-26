import Link from "next/link";
import { ArrowRight, BadgeCheck, LayoutGrid } from "lucide-react";
import { MediaPlaceholder } from "@/components/shared/MediaPlaceholder";
import { Reveal } from "@/components/ui/Reveal";

/**
 * Hero (Stitch redesign, Jul 2026) — asymmetric marketing hero matching the
 * Stitch landing template: soft pill eyebrow, ink headline with ONE keyword in
 * the brand gradient, one-sentence subhead, gradient primary CTA + outline
 * secondary, and a layered honest visual (labeled media placeholder + real
 * product facts over a soft gradient glow). No fake numbers, no stock imagery.
 */
export function HeroSection() {
  return (
    <section className="relative overflow-hidden border-b border-[var(--border-subtle)] bg-white pt-16">
      {/* Decorative brand-gradient glow (Stitch flair) — purely presentational. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-24 right-0 h-96 w-96 rounded-full bg-brand-gradient opacity-[0.07] blur-[100px]"
      />

      <div className="container-pad relative grid grid-cols-1 items-center gap-12 py-16 md:py-24 lg:grid-cols-12 lg:gap-8">
        {/* Left — copy */}
        <div className="lg:col-span-6 xl:col-span-6">
          <Reveal immediate>
            <p className="mb-5">
              <span className="badge badge-cyan">Platform edukasi digital</span>
            </p>
          </Reveal>

          <Reveal immediate delay={0.06}>
            <h1 className="font-display text-4xl font-extrabold leading-[1.08] tracking-tight text-[var(--text-primary)] text-balance md:text-5xl xl:text-6xl">
              Belajar. Berlatih.
              <br />
              <span className="bg-brand-gradient bg-clip-text text-transparent">Berkarier.</span>
            </h1>
          </Reveal>

          <Reveal immediate delay={0.12}>
            <p className="mt-6 max-w-md text-base leading-relaxed text-[var(--text-secondary)] md:text-lg">
              Kursus online, event, dan LMS perusahaan dalam satu platform —
              dengan sertifikat resmi yang bisa diverifikasi publik.
            </p>
          </Reveal>

          <Reveal immediate delay={0.18}>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
              <Link
                href="/daftar"
                className="btn btn-lg bg-brand-gradient text-white shadow-e1 hover:opacity-90 hover:shadow-e2"
              >
                Mulai Belajar
                <ArrowRight size={18} aria-hidden="true" />
              </Link>
              <Link href="/clients" className="btn btn-outline btn-lg">
                Untuk Perusahaan
              </Link>
            </div>
          </Reveal>
        </div>

        {/* Right — layered honest visual over a soft brand-gradient glow */}
        <Reveal immediate delay={0.15} className="lg:col-span-6 xl:col-span-6">
          <div className="relative mx-auto max-w-xl lg:ml-auto">
            {/* Gradient glow halo behind the media (Stitch flair) — decorative. */}
            <div
              aria-hidden="true"
              className="pointer-events-none absolute -inset-6 rounded-full bg-brand-gradient opacity-[0.12] blur-3xl"
            />

            <div className="relative">
              <MediaPlaceholder
                type="video"
                ratio="4:3"
                label="VIDEO PROFIL PLATFORM"
                className="!rounded-[var(--radius-xl)] shadow-e2"
              />

              {/* Floating fact card — real product feature (certificate + public verify) */}
              <div className="absolute -bottom-6 -left-3 flex items-center gap-3 rounded-[var(--radius-lg)] border border-[var(--border-default)] bg-white p-4 shadow-e3 sm:-left-8">
                <span className="flex h-10 w-10 flex-none items-center justify-center rounded-[var(--radius-md)] bg-[var(--surface-accent-soft)] text-[var(--brand-cyan-strong)]">
                  <BadgeCheck size={20} strokeWidth={1.75} aria-hidden="true" />
                </span>
                <div>
                  <p className="text-sm font-bold text-[var(--text-primary)]">Sertifikat ber-QR</p>
                  <p className="text-xs text-[var(--text-secondary)]">Terverifikasi publik</p>
                </div>
              </div>

              {/* Floating chip — real platform structure */}
              <div className="absolute -top-4 right-4 hidden items-center gap-2 rounded-full border border-[var(--border-default)] bg-white py-2 pl-2.5 pr-4 shadow-e2 sm:flex">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[var(--surface-pink-soft)] text-[var(--brand-pink-strong)]">
                  <LayoutGrid size={14} strokeWidth={2} aria-hidden="true" />
                </span>
                <p className="text-xs font-semibold text-[var(--text-primary)]">6 unit dalam 1 platform</p>
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
