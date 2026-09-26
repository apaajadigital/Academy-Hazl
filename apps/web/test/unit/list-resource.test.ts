import { describe, it, expect, vi } from "vitest";
import {
  fetchList,
  resolveListState,
  type ListResult,
} from "@/lib/api/listResource";

/**
 * The contract these tests defend is one sentence: a failed call says nothing
 * about how many rows exist. Every case below is a failure mode that four
 * public pages used to render as "segera hadir" — coming soon.
 */

type Row = { id: string; title: string };

const select = (rows: unknown[]): Row[] =>
  (rows as Row[]).filter((r) => Boolean(r && r.id && r.title));

function response(body: unknown, { ok = true, status = 200 } = {}) {
  return {
    ok,
    status,
    json: async () => body,
  } as unknown as Response;
}

/** A fetch that rejects, the way a CSP refusal or a dead host does. */
const rejecting = () => Promise.reject(new TypeError("Failed to fetch"));

describe("fetchList", () => {
  it("returns the rows for a paginated envelope", async () => {
    const impl = vi.fn().mockResolvedValue(
      response({ success: true, data: { data: [{ id: "1", title: "A" }], total: 42 } }),
    );
    const result = await fetchList<Row>("/api/things?limit=2", select, impl, "");

    expect(result).toEqual({ ok: true, items: [{ id: "1", title: "A" }], total: 42 });
    expect(impl).toHaveBeenCalledWith("/api/things?limit=2");
  });

  it("returns the rows for a bare-array envelope", async () => {
    const impl = vi.fn().mockResolvedValue(
      response({ success: true, data: [{ id: "1", title: "A" }, { id: "2", title: "B" }] }),
    );
    const result = await fetchList<Row>("/api/things", select, impl, "");

    // No `total` in this shape: report what was actually returned.
    expect(result).toEqual({
      ok: true,
      items: [{ id: "1", title: "A" }, { id: "2", title: "B" }],
      total: 2,
    });
  });

  it("reports a genuinely empty list as a SUCCESS, not a failure", async () => {
    const impl = vi.fn().mockResolvedValue(response({ success: true, data: { data: [], total: 0 } }));
    expect(await fetchList<Row>("/api/things", select, impl, "")).toEqual({
      ok: true,
      items: [],
      total: 0,
    });
  });

  it("fails on network rejection", async () => {
    expect(await fetchList<Row>("/api/things", select, rejecting as never, "")).toEqual({ ok: false });
  });

  it.each([500, 502, 404, 401])("fails on HTTP %i", async (status) => {
    const impl = vi.fn().mockResolvedValue(response({ success: false }, { ok: false, status }));
    expect(await fetchList<Row>("/api/things", select, impl, "")).toEqual({ ok: false });
  });

  it("fails on an unparseable body", async () => {
    const impl = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => {
        throw new SyntaxError("Unexpected token");
      },
    } as unknown as Response);
    expect(await fetchList<Row>("/api/things", select, impl, "")).toEqual({ ok: false });
  });

  it("fails when success is not true", async () => {
    const impl = vi.fn().mockResolvedValue(response({ success: false, error: { code: "ERR" } }));
    expect(await fetchList<Row>("/api/things", select, impl, "")).toEqual({ ok: false });
  });

  it.each([
    ["null data", { success: true, data: null }],
    ["object without rows", { success: true, data: { nope: 1 } }],
    ["scalar data", { success: true, data: 7 }],
    ["missing data", { success: true }],
  ])("fails on an unrecognised payload shape: %s", async (_label, body) => {
    const impl = vi.fn().mockResolvedValue(response(body));
    expect(await fetchList<Row>("/api/things", select, impl, "")).toEqual({ ok: false });
  });

  it("treats rows dropped by select as absent, not as a failure", async () => {
    const impl = vi.fn().mockResolvedValue(
      response({ success: true, data: [{ id: "1", title: "A" }, { id: "", title: "" }] }),
    );
    // The server answered; one row did not qualify. That is emptiness of a
    // kind, never an error.
    expect(await fetchList<Row>("/api/things", select, impl, "")).toEqual({
      ok: true,
      items: [{ id: "1", title: "A" }],
      total: 1,
    });
  });

  it("prefixes the base URL when one is given", async () => {
    const impl = vi.fn().mockResolvedValue(response({ success: true, data: [] }));
    await fetchList<Row>("/api/things", select, impl, "http://example.test");
    expect(impl).toHaveBeenCalledWith("http://example.test/api/things");
  });
});

describe("resolveListState", () => {
  it("maps a failure to error — never to empty", () => {
    expect(resolveListState<Row>({ ok: false })).toEqual({ kind: "error" });
  });

  it("maps a successful empty result to empty", () => {
    expect(resolveListState<Row>({ ok: true, items: [], total: 0 })).toEqual({ kind: "empty" });
  });

  it("maps rows to a list", () => {
    const result: ListResult<Row> = { ok: true, items: [{ id: "1", title: "A" }], total: 9 };
    expect(resolveListState(result)).toEqual({
      kind: "list",
      items: [{ id: "1", title: "A" }],
      total: 9,
    });
  });

  it("never returns the same state for a failure and an empty success", () => {
    const failure = resolveListState<Row>({ ok: false });
    const empty = resolveListState<Row>({ ok: true, items: [], total: 0 });
    expect(failure).not.toEqual(empty);
  });
});

describe("retry semantics", () => {
  it("a retry that succeeds after a failure yields data, not a stuck error", async () => {
    const impl = vi
      .fn()
      .mockRejectedValueOnce(new TypeError("Failed to fetch"))
      .mockResolvedValueOnce(response({ success: true, data: [{ id: "1", title: "A" }] }));

    expect(resolveListState(await fetchList<Row>("/api/things", select, impl, ""))).toEqual({
      kind: "error",
    });
    expect(resolveListState(await fetchList<Row>("/api/things", select, impl, ""))).toEqual({
      kind: "list",
      items: [{ id: "1", title: "A" }],
      total: 1,
    });
    expect(impl).toHaveBeenCalledTimes(2);
  });

  it("a retry that fails again stays honest instead of decaying to empty", async () => {
    const impl = vi.fn().mockRejectedValue(new TypeError("Failed to fetch"));

    for (let attempt = 0; attempt < 3; attempt++) {
      expect(resolveListState(await fetchList<Row>("/api/things", select, impl, ""))).toEqual({
        kind: "error",
      });
    }
    expect(impl).toHaveBeenCalledTimes(3);
  });
});
