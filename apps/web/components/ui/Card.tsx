import { type HTMLAttributes } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

/**
 * Surface card. White surface, hairline border, e1 shadow. Uses the dashboard
 * card radius token (20px, --radius-card) so every card surface across the app
 * — StatCard, QuickActionCard, tables, and this Card — shares ONE corner
 * radius. Opt-in hover lift and a frosted `glass` variant built on `.glass-card`.
 */
const cardVariants = cva("rounded-[var(--radius-card)]", {
  variants: {
    variant: {
      default: "border border-solid border-border-default bg-surface-card shadow-e1",
      glass: "glass-card shadow-e2",
    },
    hoverable: {
      true: "transition-all duration-200 ease-out hover:-translate-y-0.5 hover:border-border-strong hover:shadow-e2",
      false: "",
    },
  },
  defaultVariants: { variant: "default", hoverable: false },
});

export type CardProps = HTMLAttributes<HTMLDivElement> & VariantProps<typeof cardVariants>;

/** Elevated white (or glass) surface with optional hover lift. */
export function Card({ variant, hoverable, className, ...props }: CardProps) {
  return <div className={cn(cardVariants({ variant, hoverable }), className)} {...props} />;
}

/** Card header with a bottom divider. */
export function CardHeader({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("flex flex-col gap-1 border-b border-solid border-border-default px-6 py-5", className)}
      {...props}
    />
  );
}

/** Card title (display font). */
export function CardTitle({ className, ...props }: HTMLAttributes<HTMLHeadingElement>) {
  return <h3 className={cn("font-display text-lg font-bold text-text-primary", className)} {...props} />;
}

/** Muted supporting line under the title. */
export function CardDescription({ className, ...props }: HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn("text-sm text-text-secondary", className)} {...props} />;
}

/** Card body. */
export function CardContent({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("p-6", className)} {...props} />;
}

/** Card footer with a top divider and sunken background. */
export function CardFooter({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "flex items-center justify-end gap-2 border-t border-solid border-border-default bg-surface-sunken px-6 py-4",
        className,
      )}
      {...props}
    />
  );
}
