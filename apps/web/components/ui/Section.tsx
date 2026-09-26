import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type SectionProps = {
  children: ReactNode;
  /** Background tone. `sunken` alternates rhythm; `ink` is the dark editorial band. */
  tone?: "default" | "sunken" | "ink";
  /** Vertical rhythm; `sm` for compact bands. */
  size?: "default" | "sm";
  className?: string;
  id?: string;
};

/** Page section with consistent vertical rhythm + centered container. */
export function Section({ children, tone = "default", size = "default", className, id }: SectionProps) {
  return (
    <section
      id={id}
      className={cn(
        size === "sm" ? "section-sm" : "section",
        tone === "sunken" && "border-y border-[var(--border-subtle)] bg-[var(--surface-sunken)]",
        tone === "ink" && "bg-[var(--text-primary)] text-white",
        className,
      )}
    >
      <div className="container-pad">{children}</div>
    </section>
  );
}

type SectionHeaderProps = {
  /** Quiet uppercase label with a short rule — not a pill badge. */
  eyebrow?: string;
  /** Heading; accent ONE keyword via <span className="text-accent">. */
  title: ReactNode;
  /** One supporting sentence, max. */
  lede?: ReactNode;
  align?: "left" | "center";
  /** Optional action (e.g. arrow link) shown at the right on left-aligned headers. */
  action?: ReactNode;
  /** Set true inside tone="ink" sections. */
  onInk?: boolean;
  className?: string;
};

/**
 * Editorial section header. Left-aligned by default (center is the exception,
 * not the rule) so section rhythm doesn't collapse into centered-stack monotony.
 */
export function SectionHeader({
  eyebrow,
  title,
  lede,
  align = "left",
  action,
  onInk = false,
  className,
}: SectionHeaderProps) {
  return (
    <div
      className={cn(
        "mb-10 md:mb-12",
        align === "center" ? "mx-auto max-w-2xl text-center" : "flex flex-wrap items-end justify-between gap-6",
        className,
      )}
    >
      <div className={cn(align === "left" && "max-w-2xl")}>
        {eyebrow && (
          <p className={cn("eyebrow mb-3", align === "center" && "eyebrow-center justify-center", onInk && "text-[var(--brand-cyan)]")}>
            {eyebrow}
          </p>
        )}
        <h2
          className={cn(
            "font-display text-3xl font-bold tracking-tight text-balance md:text-4xl",
            onInk ? "text-white" : "text-[var(--text-primary)]",
          )}
        >
          {title}
        </h2>
        {lede && (
          <p className={cn("mt-3 text-base leading-relaxed md:text-lg", onInk ? "text-white/70" : "text-[var(--text-secondary)]")}>
            {lede}
          </p>
        )}
      </div>
      {action && align === "left" && <div className="flex-none pb-1">{action}</div>}
    </div>
  );
}
