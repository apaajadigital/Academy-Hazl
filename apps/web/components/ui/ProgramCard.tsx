import type { ReactNode } from "react";
import Link from "next/link";
import { Star, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { MediaPlaceholder } from "@/components/shared/MediaPlaceholder";

type Meta = {
  /** Only render when it comes from real data — never invent numbers. */
  rating?: number;
  level?: string;
  duration?: string;
  count?: string;
};

type Props = {
  href: string;
  title: string;
  description?: string;
  /** Business-unit tag, e.g. "E-Course", "Event", "E-Book". */
  unitLabel: string;
  unitIcon: LucideIcon;
  /** Metadata row; falsy fields are simply omitted. */
  meta?: Meta;
  /** Thumbnail slot — defaults to an honest 16:9 placeholder. */
  media?: ReactNode;
  className?: string;
};

/**
 * Program card (Udacity-style): thumbnail → unit chip → title → description →
 * metadata row. Meta values must come from real data; empty meta renders no row.
 */
export function ProgramCard({ href, title, description, unitLabel, unitIcon: UnitIcon, meta, media, className }: Props) {
  const metaItems: ReactNode[] = [];
  if (meta?.rating && meta.rating > 0) {
    metaItems.push(
      <span key="rating" className="inline-flex items-center gap-1">
        <Star size={11} className="fill-amber-400 text-amber-400" aria-hidden="true" />
        {meta.rating.toFixed(1)}
      </span>,
    );
  }
  if (meta?.level) metaItems.push(<span key="level">{meta.level}</span>);
  if (meta?.duration) metaItems.push(<span key="duration">{meta.duration}</span>);
  if (meta?.count) metaItems.push(<span key="count">{meta.count}</span>);

  return (
    <Link href={href} className={cn("card group flex flex-col overflow-hidden !rounded-[var(--radius-lg)]", className)}>
      <div className="[&>*]:rounded-none [&>*]:border-0 [&>*]:border-b [&>*]:border-[var(--border-subtle)]">
        {media ?? <MediaPlaceholder type="foto" ratio="16:9" />}
      </div>

      <div className="flex flex-1 flex-col gap-2 p-5">
        <p className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--brand-cyan-strong)]">
          <UnitIcon size={13} aria-hidden="true" />
          {unitLabel}
        </p>

        <h3 className="font-display text-base font-bold leading-snug text-[var(--text-primary)] transition-colors line-clamp-2 group-hover:text-[var(--brand-cyan-strong)]">
          {title}
        </h3>

        {description && (
          <p className="text-sm leading-relaxed text-[var(--text-secondary)] line-clamp-2">{description}</p>
        )}

        {metaItems.length > 0 && (
          <div className="mt-auto flex items-center gap-2 border-t border-[var(--border-subtle)] pt-3 text-xs text-[var(--text-muted)]">
            {metaItems.map((item, i) => (
              <span key={i} className="inline-flex items-center gap-2">
                {i > 0 && <span aria-hidden="true" className="text-[var(--border-strong)]">•</span>}
                {item}
              </span>
            ))}
          </div>
        )}
      </div>
    </Link>
  );
}
