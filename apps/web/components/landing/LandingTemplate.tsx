import { ArrowRight, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { Section } from "@/components/ui/Section";
import { Reveal } from "@/components/ui/Reveal";
import { LeadCaptureForm } from "@/components/landing/LeadCaptureForm";

type Benefit = { icon: LucideIcon; title: string; body: string };

type Props = {
  eyebrow: string;
  title: React.ReactNode;
  lede: string;
  benefits: Benefit[];
  formSource: "affiliate" | "lms" | "trainer" | "free-class" | "community" | "other";
  formTitle: string;
  formLede: string;
  withCompany?: boolean;
  submitLabel?: string;
  /**
   * Optional secondary exit link under the hero lede. Landings are otherwise a
   * dead end (lead form only), so funnels that have a next step for visitors
   * who are ready now can opt in without changing any other landing.
   */
  secondaryCta?: { label: string; href: string };
};

/**
 * Shared marketing landing layout (TASK-040): asymmetric hero with an inline
 * lead-capture form, then a benefits grid. Built on the editorial design
 * system; honest (no fabricated numbers).
 */
export function LandingTemplate({
  eyebrow,
  title,
  lede,
  benefits,
  formSource,
  formTitle,
  formLede,
  withCompany,
  submitLabel,
  secondaryCta,
}: Props) {
  return (
    <div className="pt-16">
      {/* Hero + form */}
      <section className="border-b border-[var(--border-subtle)] bg-white">
        <div className="container-pad grid grid-cols-1 items-start gap-12 py-16 md:py-20 lg:grid-cols-12 lg:gap-10">
          <div className="lg:col-span-7">
            <Reveal immediate>
              <p className="eyebrow mb-5">{eyebrow}</p>
            </Reveal>
            <Reveal immediate delay={0.06}>
              <h1 className="font-display text-4xl font-extrabold leading-[1.1] tracking-tight text-[var(--text-primary)] text-balance md:text-5xl">
                {title}
              </h1>
            </Reveal>
            <Reveal immediate delay={0.12}>
              <p className="mt-5 max-w-lg text-base leading-relaxed text-[var(--text-secondary)] md:text-lg">{lede}</p>
            </Reveal>
            {secondaryCta && (
              <Reveal immediate delay={0.18}>
                <Link href={secondaryCta.href} className="btn btn-outline mt-6">
                  {secondaryCta.label}
                  <ArrowRight size={18} aria-hidden="true" />
                </Link>
              </Reveal>
            )}
          </div>

          <div className="lg:col-span-5">
            <Reveal immediate delay={0.15}>
              <p className="mb-1 font-display text-lg font-bold text-[var(--text-primary)]">{formTitle}</p>
              <p className="mb-4 text-sm text-[var(--text-secondary)]">{formLede}</p>
              <LeadCaptureForm source={formSource} withCompany={withCompany} submitLabel={submitLabel} />
            </Reveal>
          </div>
        </div>
      </section>

      {/* Benefits — Stitch benefit grid (elevated cards, icon-tile hover fill) */}
      <Section tone="sunken">
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {benefits.map((b, i) => {
            const Icon = b.icon;
            return (
              <Reveal key={b.title} delay={(i % 3) * 0.06}>
                <article className="group flex h-full flex-col gap-4 rounded-[var(--radius-lg)] border border-[var(--border-default)] bg-[var(--surface-card)] p-6 shadow-e1 transition-all duration-200 hover:-translate-y-1 hover:shadow-e2">
                  <span className="flex h-12 w-12 flex-none items-center justify-center rounded-[var(--radius-md)] border border-[rgba(0,119,168,0.15)] bg-[var(--surface-accent-soft)] text-[var(--brand-cyan-strong)] transition-colors duration-200 group-hover:bg-[var(--brand-cyan-strong)] group-hover:text-white">
                    <Icon size={22} strokeWidth={1.75} aria-hidden="true" />
                  </span>
                  <div>
                    <h3 className="font-display text-lg font-bold tracking-tight text-[var(--text-primary)]">{b.title}</h3>
                    <p className="mt-1.5 text-[15px] leading-relaxed text-[var(--text-secondary)]">{b.body}</p>
                  </div>
                </article>
              </Reveal>
            );
          })}
        </div>
      </Section>
    </div>
  );
}
