import { type ReactNode } from "react";
import { TrendingUp, TrendingDown, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Unified KPI / stat card for admin & dashboard surfaces. Replaces the ~5
 * divergent hand-rolled stat-card styles across admin pages with one shape:
 * icon tile (left), label + value stacked, and an optional real trend pill.
 * Presentational only. `trend` is optional and MUST reflect real data — never
 * pass a hardcoded/fake delta (no-data-fiktif rule).
 */
export type StatCardProps = {
  label: string;
  value: ReactNode;
  icon: LucideIcon;
  /** Icon glyph color (defaults to brand cyan). */
  iconColor?: string;
  /** Icon tile background (defaults to soft cyan). */
  iconBg?: string;
  /** Optional real period-over-period delta, e.g. "+12%". Omit when unknown. */
  trend?: string | null;
  className?: string;
};

export function StatCard({
  label,
  value,
  icon: Icon,
  iconColor = "var(--brand-cyan-strong)",
  iconBg = "var(--surface-accent-soft)",
  trend,
  className,
}: StatCardProps) {
  const negative = typeof trend === "string" && trend.trim().startsWith("-");
  const Trend = negative ? TrendingDown : TrendingUp;
  return (
    <div
      className={cn(
        "rounded-[var(--radius-lg)] border border-solid border-border-default bg-surface-card p-5 shadow-e1",
        className,
      )}
    >
      <div className="mb-3 flex items-start justify-between">
        <span
          className="flex h-10 w-10 items-center justify-center rounded-xl"
          style={{ background: iconBg }}
        >
          <Icon size={18} style={{ color: iconColor }} aria-hidden="true" />
        </span>
        {trend ? (
          <span
            className={cn(
              "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold",
              negative ? "bg-red-50 text-red-600" : "bg-green-50 text-green-700",
            )}
          >
            <Trend size={12} aria-hidden="true" />
            {trend}
          </span>
        ) : null}
      </div>
      <p className="font-display text-2xl font-extrabold text-text-primary">{value}</p>
      <p className="mt-0.5 text-[13px] text-text-secondary">{label}</p>
    </div>
  );
}
