import { describe, it, expect, vi } from "vitest";
import {
  fetchCourseCatalog,
  resolveCatalogState,
  buildCatalogQuery,
  type CatalogCourse,
} from "@/lib/e-course/catalog";

/**
 * The four states /e-course must keep apart.
 *
 * The regression these guard: every failure path used to end in `setCourses([])`
 * (ECourseCatalog.tsx:163,167 before this change), and an empty array rendered
 * "Katalog kursus segera hadir — Kami sedang menyiapkan materi terbaik untukmu."
 * A dead API therefore told visitors the catalogue had not been published yet.
 *
 * Only case 2 below may ever produce `kind: "list"`, and only a genuinely
 * successful empty payload may produce `kind: "empty"`. Everything else is
 * `kind: "error"`. `loading` is the component's pre-settle state and is
 * asserted in e2e/e-course-catalog.spec.ts, where a real render exists.
 */

const QUERY = { page: 1, limit: 8 };
const BASE = "http://api.test";

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

const COURSE: CatalogCourse = { id: "c1", slug: "dasar-marketing", title: "Dasar Marketing" };

describe("buildCatalogQuery", () => {
  it("always sends page and limit", () => {
    expect(buildCatalogQuery(QUERY)).toBe("limit=8&page=1");
  });

  it("omits blank filters rather than sending them empty", () => {
    expect(buildCatalogQuery({ ...QUERY, q: "", level: "" })).toBe("limit=8&page=1");
  });

  it("includes q and level when present", () => {
    const qs = buildCatalogQuery({ ...QUERY, q: "seo", level: "beginner" });
    expect(qs).toContain("q=seo");
    expect(qs).toContain("level=beginner");
  });
});

describe("fetchCourseCatalog", () => {
  // ── 2. Success with data ───────────────────────────────────────────────────
  it("returns the list from the paginated shape", async () => {
    const f = vi
      .fn()
      .mockResolvedValue(jsonResponse(200, { success: true, data: { data: [COURSE], total: 42 } }));
    await expect(fetchCourseCatalog(QUERY, f as never, BASE)).resolves.toEqual({
      ok: true,
      courses: [COURSE],
      total: 42,
    });
  });

  it("returns the list from the bare-array shape and counts it", async () => {
    const f = vi.fn().mockResolvedValue(jsonResponse(200, { success: true, data: [COURSE] }));
    await expect(fetchCourseCatalog(QUERY, f as never, BASE)).resolves.toEqual({
      ok: true,
      courses: [COURSE],
      total: 1,
    });
  });

  it("falls back to the array length when total is missing", async () => {
    const f = vi.fn().mockResolvedValue(jsonResponse(200, { success: true, data: { data: [COURSE] } }));
    const r = await fetchCourseCatalog(QUERY, f as never, BASE);
    expect(r).toEqual({ ok: true, courses: [COURSE], total: 1 });
  });

  it("requests the expected URL", async () => {
    const f = vi.fn().mockResolvedValue(jsonResponse(200, { success: true, data: [] }));
    await fetchCourseCatalog({ ...QUERY, q: "seo" }, f as never, BASE);
    expect(f).toHaveBeenCalledWith(`${BASE}/api/courses?limit=8&page=1&q=seo`);
  });

  // ── 3. Success but empty ───────────────────────────────────────────────────
  it("reports an empty catalogue as a SUCCESS with no rows", async () => {
    const f = vi
      .fn()
      .mockResolvedValue(jsonResponse(200, { success: true, data: { data: [], total: 0 } }));
    await expect(fetchCourseCatalog(QUERY, f as never, BASE)).resolves.toEqual({
      ok: true,
      courses: [],
      total: 0,
    });
  });

  // ── 4. Failure — every variant ─────────────────────────────────────────────
  it("fails on network rejection", async () => {
    const f = vi.fn().mockRejectedValue(new TypeError("Failed to fetch"));
    await expect(fetchCourseCatalog(QUERY, f as never, BASE)).resolves.toEqual({ ok: false });
  });

  it("fails on 500 even when the body parses", async () => {
    const f = vi
      .fn()
      .mockResolvedValue(jsonResponse(500, { success: false, error: { message: "boom" } }));
    await expect(fetchCourseCatalog(QUERY, f as never, BASE)).resolves.toEqual({ ok: false });
  });

  it("fails on 404", async () => {
    const f = vi.fn().mockResolvedValue(jsonResponse(404, { success: false }));
    await expect(fetchCourseCatalog(QUERY, f as never, BASE)).resolves.toEqual({ ok: false });
  });

  it("fails when the body is not JSON (proxy/gateway HTML)", async () => {
    const f = vi
      .fn()
      .mockResolvedValue(new Response("<html>502 Bad Gateway</html>", { status: 200 }));
    await expect(fetchCourseCatalog(QUERY, f as never, BASE)).resolves.toEqual({ ok: false });
  });

  it("fails on a 200 whose envelope says success:false", async () => {
    const f = vi.fn().mockResolvedValue(jsonResponse(200, { success: false, data: [] }));
    await expect(fetchCourseCatalog(QUERY, f as never, BASE)).resolves.toEqual({ ok: false });
  });

  it("fails on a success envelope with an unusable payload shape", async () => {
    // A broken contract is a failure, not an empty shelf — this case used to
    // fall through to setCourses([]) and read as "segera hadir".
    const f = vi.fn().mockResolvedValue(jsonResponse(200, { success: true, data: { rows: [] } }));
    await expect(fetchCourseCatalog(QUERY, f as never, BASE)).resolves.toEqual({ ok: false });
  });

  it("fails when data is absent entirely", async () => {
    const f = vi.fn().mockResolvedValue(jsonResponse(200, { success: true }));
    await expect(fetchCourseCatalog(QUERY, f as never, BASE)).resolves.toEqual({ ok: false });
  });
});

describe("resolveCatalogState", () => {
  it("maps failure to error, never to empty", () => {
    expect(resolveCatalogState({ ok: false })).toEqual({ kind: "error" });
  });

  it("maps a successful empty payload to empty", () => {
    expect(resolveCatalogState({ ok: true, courses: [], total: 0 })).toEqual({ kind: "empty" });
  });

  it("maps a successful non-empty payload to list", () => {
    expect(resolveCatalogState({ ok: true, courses: [COURSE], total: 42 })).toEqual({
      kind: "list",
      courses: [COURSE],
      total: 42,
    });
  });

  it("never returns empty for a failed result, whatever the total says", () => {
    // Guards the exact collapse this module exists to prevent.
    const state = resolveCatalogState({ ok: false });
    expect(state.kind).not.toBe("empty");
    expect(state.kind).not.toBe("list");
  });
});
