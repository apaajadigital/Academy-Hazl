import Link from "next/link";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

/**
 * Single row-action button for data tables. Replaces the 4 divergent inline
 * constants across admin pages (`actionPill`, two `ACTION_BTN`, `actBtn`) with
 * one shape: contract radius (12px), soft tint → solid fill on hover, one of
 * four semantic variants. Renders a Link when `href` is set, else a <button>.
 */
const tableActionStyles = cva(
  "inline-flex items-center justify-center gap-2 rounded-[var(--radius-md)] px-3 py-1.5 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-cyan-strong/40 disabled:cursor-not-allowed disabled:opacity-50",
  {
    variants: {
      variant: {
        ok: "bg-green-600/10 text-green-700 hover:bg-green-600 hover:text-white",
        warn: "bg-amber-500/10 text-amber-700 hover:bg-amber-500 hover:text-white",
        danger: "bg-red-600/10 text-red-700 hover:bg-red-600 hover:text-white",
        neutral: "bg-surface-sunken text-text-secondary hover:bg-border-default hover:text-text-primary",
      },
    },
    defaultVariants: { variant: "neutral" },
  },
);

type Variant = VariantProps<typeof tableActionStyles>["variant"];

type Props = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "className"> & {
  variant?: Variant;
  /** When set, renders a Next.js Link instead of a button. */
  href?: string;
  leftIcon?: ReactNode;
  className?: string;
  children: ReactNode;
};

export function TableActionButton({
  variant,
  href,
  leftIcon,
  className,
  children,
  ...buttonProps
}: Props) {
  const classes = cn(tableActionStyles({ variant }), className);
  const inner = (
    <>
      {leftIcon}
      {children}
    </>
  );
  if (href) {
    return (
      <Link href={href} className={classes}>
        {inner}
      </Link>
    );
  }
  return (
    <button type="button" className={classes} {...buttonProps}>
      {inner}
    </button>
  );
}
