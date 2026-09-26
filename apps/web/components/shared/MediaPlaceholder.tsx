import { cn } from "@/lib/utils";

type Ratio = "16:9" | "4:3" | "1:1" | "21:9" | "3:4";

type Props = {
  /** What real media will eventually live here. */
  type: "video" | "foto";
  /** Aspect ratio; defaults to 16:9 for video, 1:1 for foto. */
  ratio?: Ratio;
  /** Override the small caption under the ✕ mark. */
  label?: string;
  /** Show the ratio (e.g. "16:9") next to the caption. */
  showRatio?: boolean;
  className?: string;
};

const RATIO_CLASS: Record<Ratio, string> = {
  "16:9": "aspect-video",
  "4:3": "aspect-[4/3]",
  "1:1": "aspect-square",
  "21:9": "aspect-[21/9]",
  "3:4": "aspect-[3/4]",
};

/**
 * Honest media slot (design refresh, Jul 2026). Every place that will hold a
 * real photo/video renders this labeled empty box instead of fake imagery —
 * no stock photos, no AI mockups. The fixed aspect-ratio guarantees zero
 * layout shift when real media replaces it later.
 */
export function MediaPlaceholder({ type, ratio, label, showRatio = true, className }: Props) {
  const resolvedRatio: Ratio = ratio ?? (type === "video" ? "16:9" : "1:1");
  const caption = label ?? (type === "video" ? "VIDEO" : "FOTO");

  return (
    <div
      role="img"
      aria-label={`Placeholder ${type}${label ? `: ${label}` : ""}`}
      className={cn(
        "relative w-full overflow-hidden rounded-[var(--radius-md)] border border-[var(--border-default)] bg-[var(--surface-sunken)]",
        RATIO_CLASS[resolvedRatio],
        className,
      )}
    >
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5">
        {/* Big ✕ mark — crisp SVG, not an emoji */}
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          className="h-[22%] max-h-14 min-h-6 w-auto text-[var(--text-muted)] opacity-45"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.4"
          strokeLinecap="round"
        >
          <path d="M5 5l14 14M19 5L5 19" />
        </svg>
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--text-muted)]">
          {caption}
          {showRatio && <span className="ml-1.5 font-normal text-[var(--border-strong)]">{resolvedRatio}</span>}
        </p>
      </div>
    </div>
  );
}
