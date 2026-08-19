/**
 * One list fetch, four honest outcomes.
 *
 * WHY THIS EXISTS
 * Four public pages had independently reinvented the same mistake:
 *
 *     fetch(`${API_BASE}/api/...`)
 *       .then((r) => r.json())
 *       .then((d) => setItems(d?.success ? unwrap(d) : []))
 *       .catch(() => setItems([]))
 *
 * and then rendered `items.length === 0` as "segera hadir" — coming soon. Two
 * separate defects rode along in that shape:
 *
 *  1. `API_BASE` is absolute. With NEXT_PUBLIC_API_URL unset it resolves to
 *     http://localhost:4000, which the production CSP (`connect-src 'self'
 *     https:`) refuses outright. So in a default production build the fetch
 *     never left the browser at all.
 *  2. The `.catch` then turned that refusal into an empty array, and the page
 *     calmly informed the visitor that we simply had not published anything
 *     yet. Every failure mode — dead API, 500, malformed payload, CSP refusal —
 *     produced the same confident, false claim about our own catalogue.
 *
 * `lib/e-course/catalog.ts` and `lib/events/listState.ts` already fixed this for
 * their own pages. This is that same rule, generalised, so the next list does
 * not have to rediscover it: **a failed call says nothing about how many rows
 * exist.** Failure and emptiness are different answers and must render
 * differently.
 *
 * Pure module — no React, no DOM — so all four outcomes are unit-testable in
 * the `node` environment this workspace runs.
 */

import { getApiBase } from "@/lib/api/base";

/** What one network attempt produced. Boolean-tagged, never nullable. */
export type ListResult<T> = { ok: true; items: T[]; total: number } | { ok: false };

/** The four states a list UI must render distinctly. */
export type ListState<T> =
  | { kind: "loading" }
  | { kind: "error" }
  | { kind: "empty" }
  | { kind: "list"; items: T[]; total: number };

/**
 * Pulls the rows out of the two envelope shapes this API uses, and reports
 * anything else as "no shape I recognise" rather than guessing.
 *
 * Returning `null` here — as distinct from `[]` — is the whole point: a broken
 * contract is a failure, not an empty shelf. `/api/courses` nests its page
 * under `data.data` while `/api/ebooks` returns `data` as a bare array, and a
 * previous attempt to read only one of the two shapes left an entire page
 * permanently showing its empty state.
 */
function unwrapRows(payload: unknown): unknown[] | null {
  if (Array.isArray(payload)) return payload;
  if (payload && typeof payload === "object") {
    const nested = (payload as { data?: unknown }).data;
    if (Array.isArray(nested)) return nested;
  }
  return null;
}

function readTotal(payload: unknown, fallback: number): number {
  if (payload && typeof payload === "object" && !Array.isArray(payload)) {
    const total = (payload as { total?: unknown }).total;
    if (typeof total === "number") return total;
  }
  return fallback;
}

/**
 * GET a list endpoint. Resolves to `{ ok: false }` for every outcome that does
 * not carry a usable list, so a caller physically cannot mistake a failure for
 * a result.
 *
 * `ok: false` covers: network rejection (including a CSP refusal), non-2xx,
 * unparseable body, an envelope whose `success` is not `true`, and a success
 * envelope whose payload matches neither known shape.
 *
 * @param path    Endpoint path with query string, e.g. "/api/ebooks?limit=50".
 *                Always same-origin via getApiBase() — see the CSP note above.
 * @param select  Maps/validates raw rows. Rows it drops are genuinely absent,
 *                so selecting down to zero is `empty`, which is honest: the
 *                server answered, and nothing qualified.
 * @param fetchImpl / baseUrl  Injectable so every outcome is testable without a
 *                browser or a server.
 */
export async function fetchList<T>(
  path: string,
  select: (rows: unknown[]) => T[],
  fetchImpl: typeof fetch = fetch,
  baseUrl: string = getApiBase(),
): Promise<ListResult<T>> {
  let res: Response;
  try {
    res = await fetchImpl(`${baseUrl}${path}`);
  } catch {
    // Rejection = no verdict from the server. Never optimistic here.
    return { ok: false };
  }

  if (!res.ok) return { ok: false };

  let body: unknown;
  try {
    body = await res.json();
  } catch {
    return { ok: false };
  }

  const envelope = body as { success?: unknown; data?: unknown } | null;
  if (envelope?.success !== true) return { ok: false };

  const rows = unwrapRows(envelope.data);
  if (rows === null) return { ok: false };

  const items = select(rows);
  return { ok: true, items, total: readTotal(envelope.data, items.length) };
}

/**
 * Turns one attempt into exactly one view state. `loading` is not derived here:
 * it is the caller's state before the promise settles.
 */
export function resolveListState<T>(result: ListResult<T>): ListState<T> {
  if (!result.ok) return { kind: "error" };
  if (result.items.length === 0) return { kind: "empty" };
  return { kind: "list", items: result.items, total: result.total };
}
