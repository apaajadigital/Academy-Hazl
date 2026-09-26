import { type HTMLAttributes } from "react";
import { Skeleton } from "@/components/ui";
import { cn } from "@/lib/utils";

/**
 * The KPI row: one card per metric, four across on a wide screen.
 *
 * WHY NOT THE 12-COLUMN `.dash-grid`
 * The old page mixed three column languages on one screen —
 * `sm:col-span-6 xl:col-span-3` for primary KPIs, a raw `grid-cols-2
 * sm:grid-cols-4` strip for secondary ones, and `col-span-6 sm:col-span-4
 * xl:col-span-4` for quick actions. Every new section invented its own spans,
 * so nothing lined up and a fourth card could never be added without redoing
 * the arithmetic. A four-track grid says the intent directly: 1 → 2 → 4.
 *
 * `minmax(0, 1fr)` is implicit in Tailwind's `grid-cols-*`, which is what stops
 * a long "Rp 1.234.567.890" from widening its track and pushing the row past
 * the viewport.
 */
export function AdminMetricGrid({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4 lg:gap-6", className)}
      {...props}
    />
  );
}

/**
 * Placeholder cards in the exact shape of the real ones.
 *
 * The old page rendered `<DashboardLoading />` — a centred spinner with
 * `min-h-[40vh]` — in place of the whole KPI section, so the page jumped by
 * roughly half a viewport when stats arrived and shoved everything below it
 * down. A skeleton that occupies the final layout keeps the page still.
 */
export function AdminMetricGridSkeleton({
  count = 4,
  compact = false,
}: {
  count?: number;
  /** Match the shorter secondary-metric card instead of the headline one. */
  compact?: boolean;
}) {
  return (
    <AdminMetricGrid aria-hidden="true">
      {Array.from({ length: count }).map((_, i) =>
        compact ? (
          <div
            key={i}
            className="flex items-center gap-3 rounded-[var(--radius-card)] border border-solid border-border-default bg-surface-card p-4 shadow-e1"
          >
            <Skeleton className="h-10 w-10 shrink-0 rounded-[var(--radius-md)]" />
            <div className="min-w-0 flex-1">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="mt-1.5 h-4 w-24" />
            </div>
          </div>
        ) : (
          <div
            key={i}
            className="rounded-[var(--radius-card)] border border-solid border-border-default bg-surface-card p-6 shadow-e1"
          >
            <Skeleton className="mb-4 h-10 w-10 rounded-[var(--radius-md)]" />
            <Skeleton className="h-7 w-28" />
            <Skeleton className="mt-2 h-4 w-20" />
          </div>
        ),
      )}
    </AdminMetricGrid>
  );
}
