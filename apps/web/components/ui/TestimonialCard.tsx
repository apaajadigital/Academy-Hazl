import { cn } from "@/lib/utils";
import { MediaPlaceholder } from "@/components/shared/MediaPlaceholder";

type Props = {
  /** Verbatim quote from a REAL, consenting person — never fabricated. */
  quote: string;
  name: string;
  role: string;
  company?: string;
  /** 1:1 photo slot; stays an honest placeholder until a real photo exists. */
  photo?: React.ReactNode;
  className?: string;
};

/**
 * Editorial testimonial. CONSENT RULE (BL-24): render only with a real quote,
 * real identity, and explicit consent. No real testimonials yet? Omit the
 * section entirely — do not ship this component with invented people.
 */
export function TestimonialCard({ quote, name, role, company, photo, className }: Props) {
  return (
    <figure className={cn("card flex h-full flex-col gap-5 p-6", className)}>
      <blockquote className="flex-1 text-[15px] leading-relaxed text-[var(--text-primary)]">
        &ldquo;{quote}&rdquo;
      </blockquote>
      <figcaption className="flex items-center gap-3 border-t border-[var(--border-subtle)] pt-4">
        <div className="w-11 flex-none">{photo ?? <MediaPlaceholder type="foto" ratio="1:1" showRatio={false} />}</div>
        <div>
          <p className="text-sm font-bold text-[var(--text-primary)]">{name}</p>
          <p className="text-xs text-[var(--text-secondary)]">
            {role}
            {company && <> · {company}</>}
          </p>
        </div>
      </figcaption>
    </figure>
  );
}
