import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Section } from "@/components/ui/Section";
import { Reveal } from "@/components/ui/Reveal";

/**
 * Dark editorial closing band (tone="ink") — honest early-access invitation.
 * Replaces the two look-alike centered CTA sections from the old homepage.
 */
export function EarlyAccessBand() {
  return (
    <Section tone="ink">
      <div className="relative overflow-hidden">
        {/* Decorative brand-gradient glow on the dark band (Stitch flair). */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-16 -top-20 h-72 w-72 rounded-full bg-brand-gradient opacity-25 blur-[100px]"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -left-24 -bottom-24 h-72 w-72 rounded-full bg-[var(--brand-cyan)] opacity-[0.12] blur-[100px]"
        />

        <div className="relative grid grid-cols-1 items-center gap-10 lg:grid-cols-12">
          <Reveal className="lg:col-span-8">
            <p className="eyebrow mb-4 !text-[var(--brand-cyan)]">Early access</p>
            <h2 className="font-display text-3xl font-bold tracking-tight text-white text-balance md:text-4xl">
              Platform ini baru dibuka.
              <br />
              Jadilah bagian dari{" "}
              <span className="bg-brand-gradient bg-clip-text text-transparent">angkatan pertama</span>.
            </h2>
            <p className="mt-4 max-w-xl text-base leading-relaxed text-white/70">
              Daftar gratis hari ini — dapatkan akses awal saat katalog dirilis,
              dan bantu bentuk arah platform ini bersama kami.
            </p>
          </Reveal>

          <Reveal delay={0.1} className="lg:col-span-4">
            <div className="flex flex-col gap-3 lg:items-end">
              <Link
                href="/daftar"
                className="btn btn-lg bg-brand-gradient text-white shadow-e1 hover:opacity-90 hover:shadow-e2 w-full sm:w-auto"
              >
                Daftar Gratis
                <ArrowRight size={18} aria-hidden="true" />
              </Link>
              <Link
                href="/early-access"
                className="btn btn-lg w-full border border-white/25 bg-transparent text-white transition-colors hover:border-white/50 hover:bg-white/10 sm:w-auto"
              >
                Gabung Early Access
              </Link>
              <Link
                href="/kelas-gratis"
                className="text-sm text-white/50 hover:text-white/80 transition-colors text-center"
              >
                Atau mulai dari kelas gratis →
              </Link>
            </div>
          </Reveal>
        </div>
      </div>
    </Section>
  );
}
