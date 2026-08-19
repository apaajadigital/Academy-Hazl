import { type ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  title: string;
  /** One line under the title. Omit when the title already says everything. */
  description?: string;
  /** Small glyph before the title. Decorative — never the only label. */
  icon?: LucideIcon;
  /** Right-aligned link/button in the header. */
  action?: ReactNode;
  /** Heading level. `h2` by default; pass `h3` when nested under one. */
  as?: "h2" | "h3";
  children: ReactNode;
  /** Applied to the body wrapper — use `p-6` for prose, omit for flush tables. */
  bodyClassName?: string;
  className?: string;
};

/**
 * A titled surface: header strip, hairline divider, body.
 *
 * This shape was already on the page three times over, hand-written each time
 * with slightly different padding (`px-6 py-5` here, `p-6` with an inner
 * `mb-5` there) and two different heading sizes for panels of equal rank. The
 * mismatch is most of why the old dashboard read as "busy" — nothing lined up
 * across a row. Same shape as trainer-hub's "Kursus Saya" panel, so the two
 * consoles look related without either copying the other's markup.
 *
 * `min-w-0` matters more than it looks: this is a grid child, and without it a
 * wide table or a long unbroken title inside would set the track's minimum
 * width and push the page into horizontal scroll. `h-full` lets two panels
 * sitting side by side agree on height instead of one floating short.
 */
export function AdminPanel({
  title,
  description,
  icon: Icon,
  action,
  as: Heading = "h2",
  children,
  bodyClassName,
  className,
}: Props) {
  return (
    <section
      className={cn(
        "flex h-full min-w-0 flex-col overflow-hidden rounded-[var(--radius-card)] border border-solid border-border-default bg-surface-card shadow-e1",
        className,
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-solid border-border-default px-6 py-5">
        <div className="min-w-0">
          <Heading className="flex items-center gap-2 font-display text-lg font-bold text-text-primary">
            {Icon ? <Icon size={18} className="shrink-0 text-accent-purple" aria-hidden="true" /> : null}
            <span className="min-w-0">{title}</span>
          </Heading>
          {description ? (
            <p className="mt-1 text-sm text-text-secondary">{description}</p>
          ) : null}
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
      <div className={cn("min-w-0 flex-1", bodyClassName)}>{children}</div>
    </section>
  );
}
