import { type HTMLAttributes, type TdHTMLAttributes, type ThHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

/**
 * Presentational data-table primitives matching the Stitch admin pattern:
 * uppercase muted header, row hover, generous cell padding. Compose freely —
 * wrap in <TableContainer> for the framed, horizontally-scrollable card look.
 */

/** Framed, horizontally-scrollable card wrapper for a table. */
export function TableContainer({ className, children, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        // 20px (--radius-card) so the table frame matches every other card surface.
        "overflow-hidden rounded-[var(--radius-card)] border border-solid border-border-default bg-surface-card shadow-e1",
        className,
      )}
      {...props}
    >
      <div className="overflow-x-auto">{children}</div>
    </div>
  );
}

/** `<table>` — full width, left-aligned, collapsed borders. */
export function Table({ className, ...props }: HTMLAttributes<HTMLTableElement>) {
  return <table className={cn("w-full border-collapse text-left text-sm", className)} {...props} />;
}

/** `<thead>` — sunken background with a bottom rule. */
export function THead({ className, ...props }: HTMLAttributes<HTMLTableSectionElement>) {
  return (
    <thead
      className={cn("border-b border-solid border-border-default bg-surface-sunken", className)}
      {...props}
    />
  );
}

/** `<tbody>`. */
export function TBody({ className, ...props }: HTMLAttributes<HTMLTableSectionElement>) {
  return <tbody className={className} {...props} />;
}

/** Body `<tr>` — bottom rule and row hover. */
export function TR({ className, ...props }: HTMLAttributes<HTMLTableRowElement>) {
  return (
    <tr
      className={cn(
        "border-b border-solid border-border-default transition-colors last:border-0 hover:bg-surface-page",
        className,
      )}
      {...props}
    />
  );
}

/** Header cell — uppercase, muted, tracked. */
export function TH({ className, ...props }: ThHTMLAttributes<HTMLTableCellElement>) {
  return (
    <th
      className={cn(
        "px-6 py-3 text-xs font-semibold uppercase tracking-wider text-text-secondary",
        className,
      )}
      {...props}
    />
  );
}

/** Body cell. */
export function TD({ className, ...props }: TdHTMLAttributes<HTMLTableCellElement>) {
  return <td className={cn("px-6 py-4 align-middle text-text-primary", className)} {...props} />;
}
