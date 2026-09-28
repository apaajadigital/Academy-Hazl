import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Button style contract. Reuses the `.btn` base from globals.css (display font,
 * transition) for one source of truth, then overrides the radius to 12px
 * (--radius-md) so in-app buttons "rhyme" with inputs/controls (Linear/Stripe
 * enterprise language). The legacy `.btn` global class stays pill — used by the
 * marketing hero CTAs — giving a deliberate 2-tier hybrid: warm pill on the
 * public/marketing funnel, precise 12px inside the product (dashboards/forms).
 */
const buttonVariants = cva(
  // Branded keyboard focus: a soft cyan ring hugging the control (replaces the
  // generic global :focus-visible outline) for a premium, on-brand focus state.
  "btn rounded-[var(--radius-md)] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-cyan-strong/45 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        // Hero/primary CTA — solid cyan strong (matches Stitch flat primary action).
        primary: "bg-accent-cyan-strong text-white shadow-sm hover:bg-[#005f85] transition-colors",
        // Solid cyan bright — aligns to Stitch public CTA pill.
        cyan: "bg-accent-cyan text-text-on-accent shadow-sm hover:bg-accent-cyan-strong hover:text-white transition-colors",
        // Outline secondary — aligns to legacy `.btn-outline`.
        secondary:
          "border-solid border-[1.5px] border-border-strong text-accent-cyan-strong hover:border-accent-cyan-strong hover:bg-surface-accent-soft hover:shadow-e1",
        // Ghost — aligns to legacy `.btn-ghost`.
        ghost:
          "border-solid border border-border-default bg-surface-sunken text-text-primary hover:border-border-strong hover:bg-[#F0F0F2]",
      },
      size: {
        sm: "px-5 py-2 text-[0.8125rem]",
        md: "px-7 py-3 text-[0.9375rem]",
        lg: "px-9 py-4 text-[1.0625rem]",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  },
);

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  /** Show a spinner and block interaction. */
  loading?: boolean;
  /** Leading adornment, e.g. `<Plus size={18} />`. Hidden while loading. */
  leftIcon?: ReactNode;
  /** Trailing adornment, e.g. `<ArrowRight size={18} />`. Hidden while loading. */
  rightIcon?: ReactNode;
}

/** Pill button — gradient primary, solid cyan, outline secondary, and ghost variants. */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, variant, size, loading = false, leftIcon, rightIcon, disabled, type, children, ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type ?? "button"}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    >
      {loading ? <Loader2 aria-hidden="true" className="size-[1.15em] animate-spin" /> : leftIcon}
      {children}
      {!loading && rightIcon}
    </button>
  );
});
