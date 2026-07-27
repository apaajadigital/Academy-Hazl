import { cn } from "@/lib/utils";

/**
 * Accessible progress bar for dashboards (course completion, watch-time, etc).
 * Replaces the hand-rolled track/fill markup in user & trainer pages. Clamps to
 * 0–100 and exposes role="progressbar" + aria values. Presentational.
 */
type Props = {
  /** Percentage 0–100. Non-finite values render as 0. */
  value: number;
  /** Accessible label describing what the bar measures. */
  label?: string;
  /** Use the brand gradient fill instead of solid cyan. */
  gradient?: boolean;
  /** Track height classes (default h-2). */
  className?: string;
  barClassName?: string;
};

export function ProgressBar({ value, label, gradient, className, barClassName }: Props) {
  const pct = Math.max(0, Math.min(100, Number.isFinite(value) ? value : 0));
  return (
    <div
      className={cn("h-2 w-full overflow-hidden rounded-full bg-border-default", className)}
      role="progressbar"
      aria-valuenow={Math.round(pct)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label}
    >
      <div
        className={cn(
          "h-full rounded-full transition-all",
          gradient ? "bg-brand-gradient" : "bg-accent-cyan-strong",
          barClassName,
        )}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}
