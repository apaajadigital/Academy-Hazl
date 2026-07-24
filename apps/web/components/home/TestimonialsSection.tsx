import { Section, SectionHeader } from "@/components/ui/Section";
import { TestimonialCard } from "@/components/ui/TestimonialCard";
import { Reveal } from "@/components/ui/Reveal";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

type Testimonial = {
  id: string;
  name: string;
  role: string;
  company?: string | null;
  quote: string;
};

async function getApproved(): Promise<Testimonial[]> {
  try {
    const res = await fetch(`${API}/api/testimonials?limit=6`, { next: { revalidate: 300 } });
    const json = await res.json();
    return json?.success ? (json.data ?? []) : [];
  } catch {
    return [];
  }
}

/**
 * Social proof (TASK-095). Renders only REAL, moderated (approved) testimonials.
 * When none exist yet, the whole section is omitted — never a fabricated filler
 * (BL-24 consent rule).
 */
export async function TestimonialsSection() {
  const items = await getApproved();
  if (items.length === 0) return null;

  return (
    <Section tone="sunken">
      <SectionHeader
        eyebrow="Testimoni"
        title={
          <>
            Kata mereka yang sudah <span className="bg-brand-gradient bg-clip-text text-transparent">belajar</span>
          </>
        }
      />
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
        {items.map((t, i) => (
          <Reveal key={t.id} delay={(i % 3) * 0.05}>
            <TestimonialCard quote={t.quote} name={t.name} role={t.role} company={t.company ?? undefined} />
          </Reveal>
        ))}
      </div>
    </Section>
  );
}
