import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export interface PaginationProps {
  /** Current page (1-based). */
  page: number;
  /** Total number of pages. */
  pageCount: number;
  /** Fired with the requested page. */
  onPageChange: (page: number) => void;
  /** Pages to show on each side of the current page. Default 1. */
  siblingCount?: number;
  className?: string;
}

function range(start: number, end: number): number[] {
  return Array.from({ length: end - start + 1 }, (_, i) => start + i);
}

/** Build the page items with ellipses, always keeping first/last visible. */
function pageItems(page: number, pageCount: number, siblingCount: number): (number | "ellipsis")[] {
  const totalSlots = siblingCount * 2 + 5; // first + last + current + 2 ellipses
  if (pageCount <= totalSlots) return range(1, pageCount);

  const left = Math.max(page - siblingCount, 1);
  const right = Math.min(page + siblingCount, pageCount);
  const showLeftEllipsis = left > 2;
  const showRightEllipsis = right < pageCount - 1;

  const items: (number | "ellipsis")[] = [1];
  if (showLeftEllipsis) items.push("ellipsis");
  items.push(...range(Math.max(2, left), Math.min(pageCount - 1, right)));
  if (showRightEllipsis) items.push("ellipsis");
  items.push(pageCount);
  return items;
}

const arrowClass =
  "flex h-9 w-9 items-center justify-center rounded-[var(--radius-md)] border border-solid border-border-default text-text-secondary transition-colors duration-200 hover:bg-surface-sunken hover:text-text-primary disabled:pointer-events-none disabled:opacity-50";

/** Pill pagination (‹ 1 2 3 › with ellipses) matching the Stitch table footer. */
export function Pagination({ page, pageCount, onPageChange, siblingCount = 1, className }: PaginationProps) {
  if (pageCount <= 1) return null;
  const items = pageItems(page, pageCount, siblingCount);

  return (
    <nav aria-label="Pagination" className={cn("flex items-center gap-1", className)}>
      <button
        type="button"
        aria-label="Halaman sebelumnya"
        disabled={page <= 1}
        onClick={() => onPageChange(page - 1)}
        className={arrowClass}
      >
        <ChevronLeft size={18} />
      </button>

      {items.map((item, index) =>
        item === "ellipsis" ? (
          <span
            key={`ellipsis-${index}`}
            aria-hidden="true"
            className="flex h-9 min-w-9 items-center justify-center px-1 text-sm text-text-muted"
          >
            &hellip;
          </span>
        ) : (
          <button
            key={item}
            type="button"
            aria-label={`Halaman ${item}`}
            aria-current={item === page ? "page" : undefined}
            onClick={() => onPageChange(item)}
            className={cn(
              "flex h-9 min-w-9 items-center justify-center rounded-[var(--radius-md)] px-2 text-sm font-semibold tabular-nums transition-colors duration-200",
              item === page
                ? "bg-accent-cyan-strong text-white shadow-e1"
                : "text-text-primary hover:bg-surface-sunken",
            )}
          >
            {item}
          </button>
        ),
      )}

      <button
        type="button"
        aria-label="Halaman berikutnya"
        disabled={page >= pageCount}
        onClick={() => onPageChange(page + 1)}
        className={arrowClass}
      >
        <ChevronRight size={18} />
      </button>
    </nav>
  );
}
