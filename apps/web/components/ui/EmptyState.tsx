import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  icon: LucideIcon;
  title: string;
  description?: string;
  /** CTA slot (buttons/links). */
  action?: ReactNode;
  className?: string;
};

/**
 * Honest empty state — the elegant answer when real data doesn't exist yet.
 * Lucide icon (never emoji), one title, one supporting line, optional CTA.
 */
export function EmptyState({ icon: Icon, title, description, action, className }: Props) {
  return (
    <div
      className={cn(
        "flex flex-col items-center rounded-[var(--radius-xl)] border border-dashed border-[var(--border-strong)] bg-[var(--surface-card)] px-6 py-14 text-center",
        className,
      )}
    >
      <span className="flex h-12 w-12 items-center justify-center rounded-full border border-[rgba(0,119,168,0.15)] bg-[var(--surface-accent-soft)] text-[var(--brand-cyan-strong)]">
        <Icon size={22} strokeWidth={1.75} aria-hidden="true" />
      </span>
      <h3 className="mt-4 font-display text-lg font-bold text-[var(--text-primary)]">{title}</h3>
      {description && (
        <p className="mt-1.5 max-w-sm text-sm leading-relaxed text-[var(--text-secondary)]">{description}</p>
      )}
      {action && <div className="mt-6 flex flex-wrap items-center justify-center gap-3">{action}</div>}
    </div>
  );
}
