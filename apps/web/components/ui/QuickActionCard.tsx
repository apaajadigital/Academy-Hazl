import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Quick-action tile for dashboard home surfaces — icon + label (+ optional
 * description) linking to a destination. Contract radius/hover. Replaces the
 * inline quick-action tiles hand-rolled per dashboard. Presentational.
 */
type Props = {
  href: string;
  label: string;
  icon: LucideIcon;
  description?: string;
  iconColor?: string;
  iconBg?: string;
  className?: string;
};

export function QuickActionCard({
  href,
  label,
  icon: Icon,
  description,
  iconColor = "var(--brand-cyan-strong)",
  iconBg = "var(--surface-accent-soft)",
  className,
}: Props) {
  return (
    <Link
      href={href}
      className={cn(
        "group flex flex-col gap-3 rounded-[var(--radius-card)] border border-solid border-border-default bg-surface-card p-5 shadow-e1 transition-all hover:-translate-y-0.5 hover:border-border-strong hover:shadow-e2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-cyan-strong/40",
        className,
      )}
    >
      <span
        className="flex h-10 w-10 items-center justify-center rounded-[var(--radius-md)]"
        style={{ background: iconBg }}
      >
        <Icon size={18} style={{ color: iconColor }} aria-hidden="true" />
      </span>
      <div className="min-w-0">
        <p className="font-display text-base font-bold text-text-primary">{label}</p>
        {description ? <p className="mt-2 text-sm text-text-secondary">{description}</p> : null}
      </div>
    </Link>
  );
}
