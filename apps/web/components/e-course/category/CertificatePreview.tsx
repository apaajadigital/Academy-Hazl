import { BookOpen, QrCode, Share2, ExternalLink } from "lucide-react";
import type { Category } from "@/lib/e-course/types";

type CertificatePreviewProps = {
  category: Category;
};

export function CertificatePreview({ category }: CertificatePreviewProps) {
  return (
    <section className="border-b border-border-default bg-surface-card py-10">
      <div className="mx-auto flex max-w-[1152px] flex-col gap-8 px-8">
        <header className="flex flex-col gap-1.5">
          <h2 className="font-display text-xl font-bold text-text-primary">
            Sertifikat Resmi Hazl Academy
          </h2>
          <p className="text-sm text-text-muted">
            Selesaikan 80% materi dan dapatkan sertifikat ini
          </p>
        </header>

        <div className="relative mx-auto max-w-lg overflow-hidden rounded-2xl border-2 border-border-default bg-surface-card p-8 shadow-e3">
          <div className="absolute left-0 right-0 top-0 h-1.5 bg-brand-gradient" />

          <div className="mt-2 flex items-center justify-center gap-2">
            <BookOpen size={18} className="text-accent" aria-hidden="true" />
            <span className="font-display font-bold tracking-wide text-accent">
              HAZL ACADEMY
            </span>
          </div>

          <p className="mt-4 text-center text-sm uppercase tracking-widest text-text-primary">
            Sertifikat Penyelesaian
          </p>

          <h3 className="mt-2 text-center font-display text-2xl font-bold leading-tight text-text-primary">
            {category.title}
          </h3>

          <div className="mt-5 flex flex-col items-center gap-0.5">
            <p className="text-xs text-text-muted">Diberikan kepada</p>
            <p className="font-display text-xl italic text-accent">NAMA PESERTA</p>
          </div>

          <div className="mt-8 grid grid-cols-3 items-end gap-3">
            <div className="flex flex-col items-center gap-1.5">
              <div className="flex h-12 w-12 items-center justify-center rounded border border-border-default bg-surface-page">
                <QrCode size={24} className="text-[#AEAEB2]" aria-hidden="true" />
              </div>
              <span className="text-[10px] text-[#AEAEB2]">Verifikasi</span>
            </div>

            <div className="flex flex-col items-center gap-0.5 text-center">
              <span className="text-[10px] uppercase tracking-wide text-text-muted">
                Tanggal
              </span>
              <span className="text-xs font-medium text-text-primary">22 Juni 2026</span>
            </div>

            <div className="flex flex-col items-center gap-1 text-center">
              <span className="font-display text-sm italic leading-none text-text-primary">
                Jago
              </span>
              <span className="w-full border-t border-[var(--text-primary)] pt-1 text-[10px] text-text-muted">
                Founder &amp; CEO
              </span>
            </div>
          </div>

          <div className="pointer-events-none absolute bottom-0 right-0 h-24 w-24 bg-gradient-to-tl from-[rgba(0,119,168,0.06)] to-transparent" />
        </div>

        <div className="flex flex-col items-center gap-3">
          <p className="max-w-md text-center text-sm text-text-muted">
            Dapat dibagikan ke LinkedIn, CV, dan platform profesional lainnya
          </p>
          <div className="flex items-center gap-3">
            <button
              type="button"
              aria-label="Bagikan ke LinkedIn"
              className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-[var(--border-brand)] bg-[rgba(0,119,168,0.04)] px-3 py-1.5 text-sm font-medium text-accent transition-colors hover:bg-surface-accent-soft"
            >
              <ExternalLink size={15} aria-hidden="true" />
              LinkedIn
            </button>
            <button
              type="button"
              aria-label="Bagikan sertifikat"
              className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-border-default bg-surface-card px-3 py-1.5 text-sm font-medium text-text-secondary transition-colors hover:bg-surface-page"
            >
              <Share2 size={15} aria-hidden="true" />
              Bagikan
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
