// ─── Shared CSV export helpers (admin exports) ───────────────────────────────

/**
 * Hard cap for CSV export queries. Exports previously ran unbounded findMany;
 * a very large table could exhaust memory or hang the response. 10k rows is
 * plenty for a manual admin export — larger extractions should go through a
 * proper reporting pipeline.
 */
export const CSV_EXPORT_MAX_ROWS = 10000;

/**
 * Serialize a single CSV cell safely:
 *
 * 1. Formula-injection guard (M2): Excel/Google Sheets execute cells starting
 *    with `=`, `+`, `-`, `@` (or tab/CR) as formulas, so user-controlled data
 *    like "=HYPERLINK(...)" would run on the admin's machine. Such cells are
 *    prefixed with a single quote, which spreadsheets treat as "literal text".
 * 2. Quote-escaping: the cell is always wrapped in double quotes with embedded
 *    quotes doubled, so commas/quotes/newlines cannot break row structure.
 */
export function csvCell(value: string | null | undefined): string {
  const raw = value ?? "";
  const neutralized = /^[=+\-@\t\r]/.test(raw) ? `'${raw}` : raw;
  return `"${neutralized.replace(/"/g, '""')}"`;
}
