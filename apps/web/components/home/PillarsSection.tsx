import { Section, SectionHeader } from "@/components/ui/Section";
import { Reveal } from "@/components/ui/Reveal";

const PILLARS = [
  {
    number: "01",
    title: "Belajar dengan praktik",
    body: "Materi disusun dari studi kasus dan worksheet aplikatif — bukan sekadar teori yang selesai ditonton.",
  },
  {
    number: "02",
    title: "Dibimbing praktisi",
    body: "Kurikulum dirancang bersama praktisi industri agar relevan dengan kebutuhan kerja hari ini.",
  },
  {
    number: "03",
    title: "Hasil yang terukur",
    body: "Progres tercatat, dan setiap kelulusan menghasilkan sertifikat ber-QR yang bisa diverifikasi publik.",
  },
] as const;

/**
 * Three editorial pillars — Stitch "numbered steps" look: each pillar leads with
 * a brand-gradient number badge, echoing the marketing template's process band.
 */
export function PillarsSection() {
  return (
    <Section>
      <SectionHeader
        eyebrow="Cara kami mengajar"
        title={
          <>
            Dirancang untuk <span className="bg-brand-gradient bg-clip-text text-transparent">hasil</span>, bukan sekadar tontonan
          </>
        }
      />

      <div className="grid grid-cols-1 gap-10 md:grid-cols-3 md:gap-8">
        {PILLARS.map((pillar, i) => (
          <Reveal key={pillar.number} delay={i * 0.08}>
            <article className="group">
              <span className="flex h-14 w-14 items-center justify-center rounded-full bg-brand-gradient font-display text-lg font-bold text-white shadow-e2 transition-transform duration-300 group-hover:scale-105">
                {pillar.number}
              </span>
              <h3 className="mt-5 font-display text-xl font-bold tracking-tight text-[var(--text-primary)]">
                {pillar.title}
              </h3>
              <p className="mt-2.5 text-[15px] leading-relaxed text-[var(--text-secondary)]">{pillar.body}</p>
            </article>
          </Reveal>
        ))}
      </div>
    </Section>
  );
}
