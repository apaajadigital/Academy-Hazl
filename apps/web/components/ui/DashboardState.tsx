import { Loader2, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Unified async-state primitives for dashboards. Replaces the 3–4 divergent
 * loading spinners and the missing/ad-hoc error states across admin & trainer.
 * Empty states continue to use the shared <EmptyState />. Presentational.
 */

/** Centered loading spinner with accessible live-region semantics. */
export function DashboardLoading({
  label = "Memuat…",
  className,
}: {
  label?: string;
  className?: string;
}) {
  return (
    <div
      role="status"
      aria-busy="true"
      aria-live="polite"
      className={cn("flex min-h-[40vh] items-center justify-center", className)}
    >
      <Loader2 size={32} className="animate-spin text-accent-cyan-strong" aria-hidden="true" />
      <span className="sr-only">{label}</span>
    </div>
  );
}

/** Error banner with an optional retry action. */
export function DashboardError({
  message = "Terjadi kesalahan saat memuat data. Silakan coba lagi.",
  onRetry,
  className,
}: {
  message?: string;
  onRetry?: () => void;
  className?: string;
}) {
  return (
    <div
      role="alert"
      className={cn(
        "flex flex-col items-center gap-4 rounded-[var(--radius-card)] border border-solid border-red-200 bg-red-50 px-6 py-10 text-center",
        className,
      )}
    >
      <AlertCircle size={28} className="text-red-600" aria-hidden="true" />
      <p className="max-w-md text-sm text-red-700">{message}</p>
      {onRetry ? (
        <button
          type="button"
          onClick={onRetry}
          className="rounded-[var(--radius-md)] border border-solid border-red-300 bg-white px-4 py-2 text-sm font-semibold text-red-700 transition-colors hover:bg-red-600 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400/40"
        >
          Coba Lagi
        </button>
      ) : null}
    </div>
  );
}
