import Link from "next/link";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import { MediaPlaceholder } from "@/components/shared/MediaPlaceholder";
import { Section } from "@/components/ui/Section";
import { Reveal } from "@/components/ui/Reveal";

const FEATURES = [
  "Studi kasus dan worksheet yang bisa langsung dipraktikkan",
  "Sertifikat resmi ber-QR, terverifikasi publik",
  "Sekali bayar — akses materi tanpa batas waktu",
] as const;

/** Flagship spotlight: split editorial (media left, copy right). */
export function ECourseSpotlight() {
  return (
    <Section tone="sunken">
      <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-2 lg:gap-16">
        <Reveal>
          <div className="relative">
            {/* Soft brand-gradient glow behind the preview (Stitch flair). */}
            <div
              aria-hidden="true"
              className="pointer-events-none absolute -inset-5 rounded-full bg-brand-gradient opacity-[0.1] blur-3xl"
            />
            <MediaPlaceholder
              type="video"
              ratio="16:9"
              label="PREVIEW KELAS"
              className="relative !rounded-[var(--radius-xl)] bg-white shadow-e2"
            />
          </div>
        </Reveal>

        <Reveal delay={0.1}>
          <p className="eyebrow mb-4">E-Course</p>
          <h2 className="font-display text-3xl font-bold tracking-tight text-[var(--text-primary)] text-balance md:text-4xl">
            Sekali bayar, akses <span className="bg-brand-gradient bg-clip-text text-transparent">selamanya</span>
          </h2>
          <p className="mt-4 max-w-lg text-base leading-relaxed text-[var(--text-secondary)]">
            Tanpa langganan bulanan. Pilih materi yang kamu butuhkan, selesaikan
            dengan praktik, dan bawa sertifikatnya ke dunia kerja.
          </p>

          <ul className="mt-6 space-y-3">
            {FEATURES.map((feature) => (
              <li key={feature} className="flex items-start gap-3 text-[15px] text-[var(--text-primary)]">
                <CheckCircle2
                  size={19}
                  strokeWidth={1.75}
                  aria-hidden="true"
                  className="mt-0.5 flex-none text-[var(--brand-cyan-strong)]"
                />
                {feature}
              </li>
            ))}
          </ul>

          <Link href="/e-course" className="link-arrow mt-8">
            Jelajahi E-Course
            <ArrowRight size={16} aria-hidden="true" />
          </Link>
        </Reveal>
      </div>
    </Section>
  );
}
