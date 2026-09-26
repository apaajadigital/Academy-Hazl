import type { InfoCard } from "@/lib/e-course/types";

type CategoryInfoCardsProps = {
  cards: InfoCard[];
};

export function CategoryInfoCards({ cards }: CategoryInfoCardsProps) {
  return (
    <section className="border-b border-border-default py-10">
      <div className="mx-auto max-w-[1152px] px-8">
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {cards.map((card) => (
            <div key={card.title} className="flex flex-col gap-3">
              <div className="border-b-2 border-[var(--brand-cyan-strong)] pb-2">
                <h3 className="text-base font-semibold text-text-primary">{card.title}</h3>
              </div>
              <p className="text-sm leading-relaxed text-text-secondary">{card.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
