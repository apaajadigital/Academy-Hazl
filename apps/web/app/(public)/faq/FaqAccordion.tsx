"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import type { FaqGroup } from "./page";

type Props = { items: FaqGroup[] };

function anchorId(category: string): string {
  return `faq-${category
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")}`;
}

export default function FaqAccordion({ items }: Props) {
  const [openKey, setOpenKey] = useState<string | null>(null);

  return (
    <div className="space-y-10">
      {items.map((group) => (
        <section key={group.category} id={anchorId(group.category)} className="scroll-mt-28">
          <div className="mb-4 flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-accent-cyan-strong" />
            <h2 className="text-xs font-bold uppercase tracking-widest text-accent-cyan-strong">
              {group.category}
            </h2>
          </div>
          <div className="divide-y divide-border-default overflow-hidden rounded-xl border border-border-default bg-white shadow-sm">
            {group.items.map((item, idx) => {
              const key = `${group.category}-${idx}`;
              const open = openKey === key;
              const safeKey = key.replace(/[^a-zA-Z0-9]+/g, "-");
              const buttonId = `faq-btn-${safeKey}`;
              const panelId = `faq-panel-${safeKey}`;
              return (
                <div key={key} className="transition-colors">
                  <button
                    type="button"
                    id={buttonId}
                    onClick={() => setOpenKey(open ? null : key)}
                    aria-expanded={open}
                    aria-controls={panelId}
                    className="flex w-full items-center justify-between gap-4 px-6 py-4 text-left transition-colors hover:bg-surface-page"
                  >
                    <span className="text-sm font-semibold text-text-primary md:text-base">
                      {item.q}
                    </span>
                    <ChevronDown
                      size={18}
                      aria-hidden="true"
                      className={`shrink-0 text-text-secondary transition-transform duration-200 ${
                        open ? "rotate-180 text-accent-cyan-strong" : ""
                      }`}
                    />
                  </button>
                  {open && (
                    <div
                      id={panelId}
                      role="region"
                      aria-labelledby={buttonId}
                      className="border-t border-border-default bg-surface-page/50 px-6 py-5 text-sm leading-relaxed text-text-secondary"
                    >
                      {item.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}
