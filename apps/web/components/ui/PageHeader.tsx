import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Canonical dashboard page header — H1 (contract scale) + optional subtitle,
 * breadcrumb, and a responsive actions slot. Replaces the header/breadcrumb
 * strip that was duplicated inline across trainer/admin pages. Presentational.
 */
type Props = {
  title: ReactNode;
  subtitle?: ReactNode;
  /** Breadcrumb node rendered above the title. */
  breadcrumb?: ReactNode;
  /** Right-aligned actions (buttons/links); wrap below title on narrow screens. */
  actions?: ReactNode;
  className?: string;
};

export function PageHeader({ title, subtitle, breadcrumb, actions, className }: Props) {
  return (
    <header className={cn("flex flex-col gap-4", className)}>
      {breadcrumb ? <div className="text-sm text-text-secondary">{breadcrumb}</div> : null}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="font-display text-2xl font-extrabold text-text-primary">{title}</h1>
          {subtitle ? <p className="mt-2 text-sm text-text-secondary">{subtitle}</p> : null}
        </div>
        {actions ? <div className="flex flex-wrap items-center gap-3">{actions}</div> : null}
      </div>
    </header>
  );
}
