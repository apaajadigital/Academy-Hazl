/**
 * Course-catalogue fetching and view-state resolution (BL — /e-course honesty).
 *
 * WHY THIS EXISTS
 * `ECourseCatalog` used to funnel every outcome into one array:
 *
 *     .then((d) => { if (d?.success) {...} else { setCourses([]); } })
 *     .catch(() => { setCourses([]); setTotal(0); })
 *
 * and rendered `courses.length === 0` as "Katalog kursus segera hadir — Kami
 * sedang menyiapkan materi terbaik untukmu." So a dead API, a 500, a malformed
 * payload and a genuinely empty catalogue all produced the same confident claim
 * that we simply have not published anything yet. On 11 Aug 2026 a local
 * production build proved it: the browser fetch was refused outright and the
 * page still told the visitor the catalogue was being prepared.
 *
 * The rule encoded here is the one `lib/events/listState.ts` already applies to
 * events: **a failed call says nothing about how many courses exist.** Failure
 * and emptiness are different answers and must render differently.
 *
 * Kept as a pure module (no React, no DOM) so all four states are unit-testable
 * in the `node` environment this workspace runs — the same reason
 * `lib/early-access/submit.ts` exists.
 */

import { getApiBase } from "@/lib/api/base";

export type CatalogCourse = {
  id: string;
  slug: string;
  title: string;
  shortDesc?: string | null;
  level?: string | null;
  avgRating?: number | string;
  totalReviews?: number;
  totalEnrolled?: number;
  totalDuration?: number;
  thumbnailUrl?: string | null;
  price?: number;
  salePrice?: number | null;
  trainer?: { name?: string; avatarUrl?: string | null } | null;
  category?: { slug?: string; name?: string } | null;
};

/** What the network attempt produced. Deliberately boolean-tagged, not nullable. */
export type CatalogResult =
  | { ok: true; courses: CatalogCourse[]; total: number }
  | { ok: false };

/** The four states the catalogue UI must render distinctly. */
export type CatalogState =
  | { kind: "loading" }
  | { kind: "error" }
  | { kind: "empty" }
  | { kind: "list"; courses: CatalogCourse[]; total: number };

export type CatalogQuery = {
  q?: string;
  level?: string;
  page: number;
  limit: number;
};

/** Builds the `/api/courses` query string. Empty filters are omitted, not sent blank. */
export function buildCatalogQuery({ q, level, page, limit }: CatalogQuery): string {
  const params = new URLSearchParams({ limit: String(limit), page: String(page) });
  if (q) params.set("q", q);
  if (level) params.set("level", level);
  return params.toString();
}

/**
 * `GET /api/courses` — resolves to `{ ok: false }` for every outcome that does
 * not carry a usable list, so the caller cannot mistake a failure for a result.
 *
 * `ok: false` covers: network rejection, non-2xx, unparseable body, an envelope
 * whose `success` is not `true`, and a success envelope whose payload is
 * neither `{ data: Course[] }` nor `Course[]`. That last one used to fall
 * through to "empty" — a broken contract is a failure, not an empty shelf.
 *
 * `fetchImpl` and `baseUrl` are injectable so the four outcomes can be tested
 * without a browser or a server.
 */
export async function fetchCourseCatalog(
  query: CatalogQuery,
  fetchImpl: typeof fetch = fetch,
  baseUrl: string = getApiBase(),
): Promise<CatalogResult> {
  let res: Response;
  try {
    res = await fetchImpl(`${baseUrl}/api/courses?${buildCatalogQuery(query)}`);
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

  const envelope = body as { success?: unknown; data?: unknown };
  if (envelope?.success !== true) return { ok: false };

  const payload = envelope.data as { data?: unknown; total?: unknown } | unknown[] | undefined;

  // Paginated shape: { data: Course[], total, page, limit }.
  if (payload && !Array.isArray(payload) && Array.isArray(payload.data)) {
    const courses = payload.data as CatalogCourse[];
    return {
      ok: true,
      courses,
      total: typeof payload.total === "number" ? payload.total : courses.length,
    };
  }

  // Bare-array shape.
  if (Array.isArray(payload)) {
    const courses = payload as CatalogCourse[];
    return { ok: true, courses, total: courses.length };
  }

  return { ok: false };
}

/**
 * Turns one attempt into exactly one view state. `loading` is not derived here:
 * it is the caller's state before the promise settles.
 */
export function resolveCatalogState(result: CatalogResult): CatalogState {
  if (!result.ok) return { kind: "error" };
  if (result.courses.length === 0) return { kind: "empty" };
  return { kind: "list", courses: result.courses, total: result.total };
}
