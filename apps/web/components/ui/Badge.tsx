import { type HTMLAttributes } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

/**
 * Status pill. Semantic hexes match the design tokens exactly via the Tailwind
 * palette (green-600 = success, amber = warning, red-600 = danger) and brand
 * tokens for info/brand/neutral. This is the status-pill language (normal case,
 * optional dot) — distinct from the uppercase `.eyebrow` micro-label.
 */
const badgeVariants = cva(
  "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold leading-5",
  {
    variants: {
      variant: {
        success: "bg-green-600/10 text-green-700",
        warning: "bg-amber-500/10 text-amber-700",
        danger: "bg-red-600/10 text-red-700",
        info: "bg-surface-accent-soft text-accent-cyan-strong",
        neutral: "border border-solid border-border-default bg-surface-sunken text-text-secondary",
        brand: "bg-surface-pink-soft text-accent-pink-strong",
      },
    },
    defaultVariants: { variant: "neutral" },
  },
);

const dotColor: Record<NonNullable<VariantProps<typeof badgeVariants>["variant"]>, string> = {
  success: "bg-green-600",
  warning: "bg-amber-600",
  danger: "bg-red-600",
  info: "bg-accent-cyan-strong",
  neutral: "bg-text-muted",
  brand: "bg-accent-pink-strong",
};

export interface BadgeProps
  extends HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {
  /** Render a leading status dot in the variant color. */
  dot?: boolean;
}

/** Pill-shaped status badge with semantic colors and an optional status dot. */
export function Badge({ variant, dot = false, className, children, ...props }: BadgeProps) {
  const v = variant ?? "neutral";
  return (
    <span className={cn(badgeVariants({ variant }), className)} {...props}>
      {dot && <span aria-hidden="true" className={cn("h-1.5 w-1.5 rounded-full", dotColor[v])} />}
      {children}
    </span>
  );
}
