import type { ReactNode } from "react";
import Link from "next/link";
import { Star, Clock, Users, ArrowRight, type LucideIcon } from "lucide-react";
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
  /** Business-unit tag, e.g. "E-Course", "Event", "E-Book", or topic name. */
  unitLabel: string;
  unitIcon?: LucideIcon;
  /** Metadata row; falsy fields are simply omitted. */
  meta?: Meta;
  /** Optional price display */
  price?: string;
  oldPrice?: string;
  /** Thumbnail slot — defaults to an honest 16:9 placeholder. */
  media?: ReactNode;
  className?: string;
};

/**
 * Modern Semi-Bento Program Card:
 * Media thumbnail with smooth zoom → floating category chip → bold title →
 * creator info → meta pills (duration, students, rating) → price + action button.
 */
export function ProgramCard({
  href,
  title,
  description,
  unitLabel,
  unitIcon: UnitIcon,
  meta,
  price,
  oldPrice,
  media,
  className,
}: Props) {
  return (
    <Link
      href={href}
      className={cn(
        "group flex flex-col overflow-hidden rounded-[26px] border border-[#E7E9EC] bg-white shadow-sm hover:shadow-md transition-all duration-300",
        className
      )}
    >
      {/* Media Slot with Floating Badge */}
      <div className="relative aspect-video w-full overflow-hidden bg-[#E8F6FF]">
        <div className="h-full w-full transition-transform duration-500 group-hover:scale-105">
          {media ?? <MediaPlaceholder type="foto" ratio="16:9" />}
        </div>
        <span className="absolute top-3 left-3 rounded-full bg-white/95 backdrop-blur-sm px-3 py-1 text-[11px] font-bold text-[#16181D] shadow-sm flex items-center gap-1.5">
          {UnitIcon && <UnitIcon size={12} className="text-[#0077A8]" aria-hidden="true" />}
          {unitLabel}
        </span>
      </div>

      {/* Card Content Body */}
      <div className="flex flex-1 flex-col p-5 sm:p-6">
        <h3 className="font-display text-base sm:text-lg font-extrabold text-[#16181D] leading-snug line-clamp-2 group-hover:text-[#0077A8] transition-colors">
          {title}
        </h3>

        {description && (
          <p className="mt-1.5 text-xs sm:text-sm leading-relaxed text-[#5B616E] line-clamp-2">
            {description}
          </p>
        )}

        {/* Metadata Chips */}
        {meta && (
          <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[#5B616E]">
            {meta.duration && (
              <span className="inline-flex items-center gap-1">
                <Clock size={13} className="text-[#707880]" aria-hidden="true" />
                {meta.duration}
              </span>
            )}
            {meta.count && (
              <span className="inline-flex items-center gap-1">
                <Users size={13} className="text-[#707880]" aria-hidden="true" />
                {meta.count}
              </span>
            )}
            {meta.rating && meta.rating > 0 && (
              <span className="inline-flex items-center gap-1 font-bold text-amber-500">
                <Star size={13} className="fill-amber-400 text-amber-400" aria-hidden="true" />
                {meta.rating.toFixed(1)}
              </span>
            )}
            {meta.level && (
              <span className="px-2 py-0.5 rounded-full bg-[#EDEDF4] text-[10px] font-semibold text-[#5B616E]">
                {meta.level}
              </span>
            )}
          </div>
        )}

        {/* Bottom Price and CTA Bar */}
        <div className="mt-auto flex items-end justify-between pt-5 border-t border-[#F0F2F5] mt-5">
          <div>
            {oldPrice && (
              <p className="text-[11px] text-[#9CA3AF] line-through">
                {oldPrice}
              </p>
            )}
            <p className="text-base sm:text-lg font-black text-[#16181D]">
              {price ?? "Detail Kelas"}
            </p>
          </div>
          <span className="inline-flex h-9 items-center gap-1 rounded-full bg-[#16181D] px-3.5 text-xs font-bold text-white group-hover:bg-[#36BDF2] group-hover:text-[#16181D] transition-colors shadow-sm">
            <span>Lihat</span>
            <ArrowRight size={13} aria-hidden="true" />
          </span>
        </div>
      </div>
    </Link>
  );
}
