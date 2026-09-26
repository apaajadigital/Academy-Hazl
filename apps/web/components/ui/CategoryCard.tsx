import Link from "next/link";
import { ArrowUpRight, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  href: string;
  icon: LucideIcon;
  name: string;
  description?: string;
  /** Small status note, e.g. "Segera hadir". */
  note?: string;
  /** Pink accent for the icon chip (use sparingly). */
  accent?: "cyan" | "pink";
  className?: string;
};

/**
 * Category / business-unit tile ("Jelajahi berdasarkan bidang" — mirrors
 * Udacity Schools). Lucide icon chip + name + one-line description.
 */
export function CategoryCard({ href, icon: Icon, name, description, note, accent = "cyan", className }: Props) {
  return (
    <Link href={href} className={cn("card group relative flex flex-col gap-3 p-5", className)}>
      <span
        className={cn(
          "flex h-11 w-11 items-center justify-center rounded-[var(--radius-md)] border",
          accent === "cyan"
            ? "border-[rgba(0,119,168,0.15)] bg-[var(--surface-accent-soft)] text-[var(--brand-cyan-strong)]"
            : "border-[rgba(204,0,82,0.15)] bg-[var(--surface-pink-soft)] text-[var(--brand-pink-strong)]",
        )}
      >
        <Icon size={20} strokeWidth={1.75} aria-hidden="true" />
      </span>

      <div className="flex-1">
        <h3 className="font-display text-[15px] font-bold text-[var(--text-primary)]">{name}</h3>
        {description && (
          <p className="mt-1 text-[13px] leading-relaxed text-[var(--text-secondary)] line-clamp-2">{description}</p>
        )}
        {note && (
          <p className="mt-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--text-muted)]">{note}</p>
        )}
      </div>

      <ArrowUpRight
        size={15}
        aria-hidden="true"
        className="absolute right-4 top-4 text-[var(--border-strong)] transition-all duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-[var(--brand-cyan-strong)]"
      />
    </Link>
  );
}
