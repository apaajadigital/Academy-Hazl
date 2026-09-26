import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Canonical list-page toolbar — a framed filter card wrapping a search field,
 * filter controls, and optional actions in one consistent responsive layout.
 * Replaces the two divergent admin filter-bar patterns (`lg:flex-row` vs
 * `flex-wrap`). Pass `children` for full control, or the named slots.
 */
type Props = {
  /** Search input (grows on desktop). */
  search?: ReactNode;
  /** Filter controls (selects, tabs, chips). */
  filters?: ReactNode;
  /** Trailing actions (e.g. "Tambah"). */
  actions?: ReactNode;
  children?: ReactNode;
  className?: string;
};

export function FilterBar({ search, filters, actions, children, className }: Props) {
  return (
    <div
      className={cn(
        "rounded-[var(--radius-card)] border border-solid border-border-default bg-surface-card p-4 shadow-e1",
        className,
      )}
    >
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        {children ?? (
          <>
            {search ? <div className="w-full lg:max-w-sm">{search}</div> : null}
            {filters || actions ? (
              <div className="flex flex-wrap items-center gap-3">
                {filters}
                {actions}
              </div>
            ) : null}
          </>
        )}
      </div>
    </div>
  );
}
