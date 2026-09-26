import { AlertTriangle } from "lucide-react";
import { Skeleton } from "@/components/ui";
import { cn } from "@/lib/utils";

/**
 * The two async states a dashboard panel owns. Empty stays with the shared
 * <EmptyState />, because "there is genuinely nothing here" is a statement
 * about the data, not about the request — and the whole point of this console
 * is that those two never wear the same clothes.
 */

/**
 * One panel could not load. Says so, offers a retry for that panel alone, and
 * states plainly that the rest of the page is unaffected — because the failure
 * this replaced looked like the opposite: a single dead endpoint used to blank
 * every widget at once, with nothing on screen admitting anything had gone
 * wrong.
 *
 * `role="alert"` so a screen reader is told, rather than left to notice.
 */
export function AdminPanelError({
  label,
  onRetry,
  className,
}: {
  /** Lower-case noun phrase, e.g. "transaksi". Rendered as "Gagal memuat …". */
  label: string;
  onRetry: () => void;
  className?: string;
}) {
  return (
    <div
      role="alert"
      className={cn(
        "flex flex-col items-center gap-3 px-6 py-10 text-center",
        className,
      )}
    >
      <span className="flex h-10 w-10 items-center justify-center rounded-full bg-surface-sunken text-text-secondary">
        <AlertTriangle size={20} aria-hidden="true" />
      </span>
      <div className="min-w-0">
        <p className="text-sm font-bold text-text-primary">Gagal memuat {label}</p>
        <p className="mt-1 text-xs text-text-secondary">
          Panel lain di halaman ini tidak terpengaruh.
        </p>
      </div>
      <button
        type="button"
        onClick={onRetry}
        className="inline-flex min-h-[44px] items-center justify-center rounded-[var(--radius-md)] border border-solid border-border-strong bg-surface-card px-4 text-sm font-semibold text-text-primary transition-colors hover:bg-surface-page focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-cyan-strong/40"
      >
        Coba Lagi
      </button>
    </div>
  );
}

/**
 * Placeholder rows sized like the real ones, so a panel does not change height
 * when its data lands. `rows` should match what the endpoint actually returns
 * (6 orders, 5 courses) rather than a round number.
 */
export function AdminPanelSkeleton({
  rows = 5,
  className,
}: {
  rows?: number;
  className?: string;
}) {
  return (
    <div
      aria-hidden="true"
      className={cn("flex flex-col gap-4 px-6 py-5", className)}
    >
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-3">
          <Skeleton className="h-10 w-10 shrink-0 rounded-full" />
          <div className="min-w-0 flex-1">
            <Skeleton className="h-4 w-2/5" />
            <Skeleton className="mt-2 h-3 w-1/4" />
          </div>
          <Skeleton className="h-4 w-16 shrink-0" />
        </div>
      ))}
    </div>
  );
}
