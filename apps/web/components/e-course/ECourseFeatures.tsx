import { GraduationCap, Layers, CreditCard, Trophy } from "lucide-react";
import { Section, SectionHeader } from "@/components/ui/Section";
import { Reveal } from "@/components/ui/Reveal";

const FEATURES = [
  {
    icon: GraduationCap,
    title: "Belajar fleksibel & bersertifikat",
    body: "Disusun bertahap dari dasar hingga lanjutan. Belajar kapan saja, di mana saja, sesuai ritmemu.",
  },
  {
    icon: Layers,
    title: "Materi praktis & studi kasus",
    body: "Belajar sambil praktik lewat studi kasus dan worksheet aplikatif yang bisa langsung diterapkan.",
  },
  {
    icon: CreditCard,
    title: "Akses sekali bayar",
    body: "Bayar sekali, akses materi kapan saja tanpa batas waktu — tanpa langganan bulanan.",
  },
  {
    icon: Trophy,
    title: "Kurikulum relevan industri",
    body: "Dirancang bersama praktisi berpengalaman agar selalu relevan dengan kebutuhan dunia kerja.",
  },
] as const;

/** Why E-Course — editorial 2×2 feature grid with lucide icons (no fake visuals). */
export function ECourseFeatures() {
  return (
    <Section tone="sunken">
      <SectionHeader
        eyebrow="Kenapa E-Course"
        title={
          <>
            Dirancang untuk <span className="text-accent">skill</span> yang terpakai
          </>
        }
        lede="Bukan sekadar tontonan — setiap materi mengarah ke hasil yang bisa kamu buktikan."
      />

      <div className="grid grid-cols-1 gap-x-8 gap-y-10 sm:grid-cols-2">
        {FEATURES.map((f, i) => {
          const Icon = f.icon;
          return (
            <Reveal key={f.title} delay={(i % 2) * 0.06}>
              <article className="flex gap-4">
                <span className="flex h-11 w-11 flex-none items-center justify-center rounded-[var(--radius-md)] border border-[rgba(0,119,168,0.15)] bg-[var(--surface-accent-soft)] text-[var(--brand-cyan-strong)]">
                  <Icon size={20} strokeWidth={1.75} aria-hidden="true" />
                </span>
                <div>
                  <h3 className="font-display text-lg font-bold tracking-tight text-[var(--text-primary)]">
                    {f.title}
                  </h3>
                  <p className="mt-1.5 text-[15px] leading-relaxed text-[var(--text-secondary)]">{f.body}</p>
                </div>
              </article>
            </Reveal>
          );
        })}
      </div>
    </Section>
  );
}
