import Link from "next/link";
import { ArrowRight, BadgeCheck } from "lucide-react";
import { MediaPlaceholder } from "@/components/shared/MediaPlaceholder";
import { Reveal } from "@/components/ui/Reveal";

const categories = [
  "Digital Marketing",
  "Data Science",
  "Microsoft Office",
  "UI/UX Design",
  "Product Management",
  "Web Development",
];

/** E-Course hero (design refresh) — asymmetric, honest, one-accent heading. */
export function ECourseHero() {
  return (
    <section className="border-b border-[var(--border-subtle)] bg-white pt-16">
      <div className="container-pad grid grid-cols-1 items-center gap-12 py-16 md:py-20 lg:grid-cols-12 lg:gap-8">
        {/* Copy */}
        <div className="lg:col-span-6">
          <Reveal immediate>
            <p className="eyebrow mb-5">E-Learning</p>
          </Reveal>
          <Reveal immediate delay={0.06}>
            <h1 className="font-display text-4xl font-extrabold leading-[1.1] tracking-tight text-[var(--text-primary)] text-balance md:text-5xl">
              Kuasai skill baru, <span className="text-accent">bawa buktinya</span>
            </h1>
          </Reveal>
          <Reveal immediate delay={0.12}>
            <p className="mt-5 max-w-md text-base leading-relaxed text-[var(--text-secondary)] md:text-lg">
              Akses materi sekali bayar. Selesaikan dengan praktik, dan bawa
              sertifikat resmi ber-QR ke dunia kerja.
            </p>
          </Reveal>
          <Reveal immediate delay={0.18}>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
              <Link href="/daftar" className="btn btn-primary btn-lg">
                Mulai Belajar
                <ArrowRight size={18} aria-hidden="true" />
              </Link>
              <Link href="/early-access" className="btn btn-outline btn-lg">
                Gabung Early Access
              </Link>
            </div>
          </Reveal>
          <Reveal immediate delay={0.24}>
            <div className="mt-8 flex flex-wrap gap-2">
              {categories.map((cat) => (
                <span
                  key={cat}
                  className="rounded-full border border-[var(--border-default)] bg-[var(--surface-sunken)] px-3 py-1 text-xs font-medium text-[var(--text-secondary)]"
                >
                  {cat}
                </span>
              ))}
            </div>
          </Reveal>
        </div>

        {/* Visual */}
        <Reveal immediate delay={0.15} className="lg:col-span-6">
          <div className="relative mx-auto max-w-xl lg:ml-auto">
            <MediaPlaceholder
              type="video"
              ratio="4:3"
              label="PREVIEW KELAS"
              className="!rounded-[var(--radius-xl)] shadow-e2"
            />
            <div className="absolute -bottom-5 -left-3 flex items-center gap-3 rounded-[var(--radius-lg)] border border-[var(--border-default)] bg-white p-4 shadow-e3 sm:-left-6">
              <span className="flex h-10 w-10 flex-none items-center justify-center rounded-[var(--radius-md)] bg-[var(--surface-accent-soft)] text-[var(--brand-cyan-strong)]">
                <BadgeCheck size={20} strokeWidth={1.75} aria-hidden="true" />
              </span>
              <div>
                <p className="text-sm font-bold text-[var(--text-primary)]">Sertifikat ber-QR</p>
                <p className="text-xs text-[var(--text-secondary)]">Terverifikasi publik</p>
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
