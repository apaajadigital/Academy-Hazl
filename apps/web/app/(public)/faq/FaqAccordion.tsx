"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import type { FAQ_ITEMS } from "./page";

type Props = { items: typeof FAQ_ITEMS };

/** Stable DOM id for a FAQ category — kept identical to `faqAnchorId` in page.tsx
 * so the sidebar TOC anchors resolve to these sections. Defined locally (not
 * imported) to avoid pulling the server page module into the client bundle. */
function anchorId(category: string): string {
  return `faq-${category
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")}`;
}

export default function FaqAccordion({ items }: Props) {
  const [openKey, setOpenKey] = useState<string | null>(null);

  return (
    <>
      {items.map((group) => (
        <section key={group.category} id={anchorId(group.category)} className="scroll-mt-24">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-widest text-accent-cyan-strong">
            {group.category}
          </h2>
          <div className="divide-y divide-border-default overflow-hidden rounded-2xl border border-border-default bg-surface-card shadow-e1">
            {group.items.map((item, idx) => {
              const key = `${group.category}-${idx}`;
              const open = openKey === key;
              // Finding #8a: tie the toggle button and its revealed panel together
              // for assistive tech. Stable, DOM-safe ids derived from the key.
              const safeKey = key.replace(/[^a-zA-Z0-9]+/g, "-");
              const buttonId = `faq-btn-${safeKey}`;
              const panelId = `faq-panel-${safeKey}`;
              return (
                <div key={key}>
                  <button
                    type="button"
                    id={buttonId}
                    onClick={() => setOpenKey(open ? null : key)}
                    aria-expanded={open}
                    aria-controls={panelId}
                    className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left transition-colors hover:bg-surface-sunken"
                  >
                    <span className="text-sm font-medium text-text-primary md:text-base">{item.q}</span>
                    <ChevronDown
                      size={18}
                      aria-hidden="true"
                      className={`shrink-0 text-text-secondary transition-transform ${open ? "rotate-180" : ""}`}
                    />
                  </button>
                  {open && (
                    <div
                      id={panelId}
                      role="region"
                      aria-labelledby={buttonId}
                      className="px-5 pb-5 text-sm leading-relaxed text-text-secondary"
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
    </>
  );
}
