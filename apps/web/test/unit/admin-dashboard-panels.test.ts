import { describe, it, expect, vi } from "vitest";
import {
  loadPanel,
  parseStats,
  parseOrders,
  parseCourses,
  parseNewLeads,
} from "@/lib/admin/dashboardPanels";

/**
 * The rule under test: one failing endpoint must cost exactly one panel, and a
 * failure must never be dressed up as a zero. Before this, all four widgets
 * shared a single `Promise.all` with no `.catch`, so the first failure blanked
 * the whole console while the spinner still cleared — an admin was shown a
 * complete-looking dashboard reporting no orders, no courses and no leads.
 */

const STATS = {
  totalUsers: 120,
  totalCourses: 8,
  totalEnrollments: 340,
  totalRevenue: 15_000_000,
  pendingCourses: 2,
  activeSubscriptions: 30,
  refundRate: 1.5,
  avgRating: 4.6,
  retailRevenue: 2_000_000,
};

function response(body: unknown, { ok = true, status = 200 } = {}) {
  return { ok, status, json: async () => body } as unknown as Response;
}

const okEnvelope = (data: unknown, meta?: unknown) => ({ success: true, data, meta });

describe("parseStats", () => {
  it("accepts a complete payload", () => {
    expect(parseStats(STATS)).toMatchObject({ totalUsers: 120, totalRevenue: 15_000_000 });
  });

  it("accepts numeric strings, as the API sometimes sends", () => {
    expect(parseStats({ ...STATS, totalRevenue: "15000000" })?.totalRevenue).toBe(15_000_000);
  });

  it.each([
    "totalUsers",
    "totalCourses",
    "totalEnrollments",
    "totalRevenue",
    "activeSubscriptions",
    "refundRate",
    "avgRating",
    "retailRevenue",
  ])("refuses the payload when %s is missing — a KPI must not fall back to 0", (field) => {
    const partial: Record<string, unknown> = { ...STATS };
    delete partial[field];
    expect(parseStats(partial)).toBeNull();
  });

  it("refuses NaN and non-numeric junk rather than rendering it", () => {
    expect(parseStats({ ...STATS, totalUsers: "banyak" })).toBeNull();
    expect(parseStats({ ...STATS, avgRating: Number.NaN })).toBeNull();
  });

  it("refuses a non-object payload", () => {
    for (const bad of [null, undefined, 7, "x", []]) expect(parseStats(bad)).toBeNull();
  });

  it("keeps a genuine zero, because zero from the API is a real answer", () => {
    expect(parseStats({ ...STATS, totalRevenue: 0 })?.totalRevenue).toBe(0);
  });

  it("treats trends as optional without failing the panel", () => {
    expect(parseStats(STATS)?.trends).toBeUndefined();
    expect(parseStats({ ...STATS, trends: { totalUsers: "+3%" } })?.trends?.totalUsers).toBe("+3%");
  });
});

describe("parseOrders", () => {
  const order = {
    id: "o1",
    finalAmount: 250_000,
    status: "paid",
    createdAt: "2026-08-01T00:00:00.000Z",
    user: { name: "Budi", email: "budi@example.test" },
    items: [{ itemTitle: "Kursus A", itemType: "course" }],
  };

  it("accepts a well-formed list", () => {
    expect(parseOrders([order])).toHaveLength(1);
  });

  it("drops a row with no user instead of throwing on user.name.slice()", () => {
    expect(parseOrders([order, { id: "o2", finalAmount: 1 }])).toHaveLength(1);
  });

  it("returns an empty list for a genuinely empty response", () => {
    expect(parseOrders([])).toEqual([]);
  });

  it("refuses a non-array payload", () => {
    expect(parseOrders({ data: [] })).toBeNull();
    expect(parseOrders(null)).toBeNull();
  });
});

describe("parseCourses", () => {
  const course = { id: "c1", title: "Kursus A", totalEnrolled: 10, avgRating: "4.5", price: "100000" };

  it("accepts both a courses wrapper and a bare array", () => {
    expect(parseCourses({ courses: [course] })).toHaveLength(1);
    expect(parseCourses([course])).toHaveLength(1);
  });

  it("drops rows without a usable enrolment count", () => {
    expect(parseCourses([course, { id: "c2", title: "B" }])).toHaveLength(1);
  });

  it("refuses an unrecognised shape", () => {
    expect(parseCourses({ nope: 1 })).toBeNull();
  });
});

describe("parseNewLeads", () => {
  it("reads meta.total", () => {
    expect(parseNewLeads(null, { total: 5 })).toBe(5);
    expect(parseNewLeads(null, { total: 0 })).toBe(0);
  });

  it("refuses a missing total rather than reporting zero leads", () => {
    expect(parseNewLeads(null, {})).toBeNull();
    expect(parseNewLeads(null, undefined)).toBeNull();
  });
});

describe("loadPanel", () => {
  it("returns ready on a good response, and sends the bearer token", async () => {
    const impl = vi.fn().mockResolvedValue(response(okEnvelope(STATS)));
    const state = await loadPanel("/api/admin/stats", (d) => parseStats(d), "tok", impl);

    expect(state.kind).toBe("ready");
    expect(impl).toHaveBeenCalledWith("/api/admin/stats", {
      headers: { Authorization: "Bearer tok" },
    });
  });

  it("never rejects — a network failure becomes an error state", async () => {
    const impl = vi.fn().mockRejectedValue(new TypeError("Failed to fetch"));
    await expect(
      loadPanel("/api/admin/stats", (d) => parseStats(d), "tok", impl),
    ).resolves.toEqual({ kind: "error" });
  });

  it.each([500, 502, 401, 403])("returns error on HTTP %i", async (status) => {
    const impl = vi.fn().mockResolvedValue(response({ success: false }, { ok: false, status }));
    expect(await loadPanel("/api/admin/stats", (d) => parseStats(d), "tok", impl)).toEqual({
      kind: "error",
    });
  });

  it("returns error on an unparseable body", async () => {
    const impl = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => {
        throw new SyntaxError("bad json");
      },
    } as unknown as Response);
    expect(await loadPanel("/api/admin/stats", (d) => parseStats(d), "tok", impl)).toEqual({
      kind: "error",
    });
  });

  it("returns error when success is not true", async () => {
    const impl = vi.fn().mockResolvedValue(response({ success: false, data: STATS }));
    expect(await loadPanel("/api/admin/stats", (d) => parseStats(d), "tok", impl)).toEqual({
      kind: "error",
    });
  });

  it("returns error when the parser refuses the payload", async () => {
    const impl = vi.fn().mockResolvedValue(response(okEnvelope({ totalUsers: 1 })));
    expect(await loadPanel("/api/admin/stats", (d) => parseStats(d), "tok", impl)).toEqual({
      kind: "error",
    });
  });
});

describe("partial failure across the four panels", () => {
  /** Mirrors the page: four independent loads settled together. */
  async function loadAll(impls: Record<string, () => Promise<Response>>) {
    const call = (path: string) => {
      const impl = impls[path];
      if (!impl) throw new Error(`no stub for ${path}`);
      return impl();
    };
    const results = await Promise.allSettled([
      loadPanel("stats", (d) => parseStats(d), "tok", call as never),
      loadPanel("orders", (d) => parseOrders(d), "tok", call as never),
      loadPanel("courses", (d) => parseCourses(d), "tok", call as never),
      loadPanel("leads", (d, m) => parseNewLeads(d, m), "tok", call as never),
    ]);
    // Nothing may reject: an unhandled rejection is what the old code produced.
    expect(results.every((r) => r.status === "fulfilled")).toBe(true);
    return results.map((r) => (r as PromiseFulfilledResult<{ kind: string }>).value);
  }

  const good = {
    stats: () => Promise.resolve(response(okEnvelope(STATS))),
    orders: () =>
      Promise.resolve(
        response(
          okEnvelope([
            {
              id: "o1",
              finalAmount: 1,
              status: "paid",
              createdAt: "2026-08-01",
              user: { name: "Budi", email: "b@e.test" },
              items: [],
            },
          ]),
        ),
      ),
    courses: () =>
      Promise.resolve(
        response(okEnvelope({ courses: [{ id: "c1", title: "A", totalEnrolled: 3 }] })),
      ),
    leads: () => Promise.resolve(response(okEnvelope(null, { total: 4 }))),
  };

  it("all four succeed", async () => {
    expect((await loadAll(good)).map((s) => s.kind)).toEqual(["ready", "ready", "ready", "ready"]);
  });

  it("one failing endpoint costs exactly one panel", async () => {
    const states = await loadAll({
      ...good,
      stats: () => Promise.reject(new TypeError("Failed to fetch")),
    });
    expect(states.map((s) => s.kind)).toEqual(["error", "ready", "ready", "ready"]);
  });

  it("two failing endpoints leave the other two intact", async () => {
    const states = await loadAll({
      ...good,
      stats: () => Promise.reject(new TypeError("down")),
      leads: () => Promise.resolve(response({ success: false }, { ok: false, status: 500 })),
    });
    expect(states.map((s) => s.kind)).toEqual(["error", "ready", "ready", "error"]);
  });

  it("all four failing yields four errors and still no rejection", async () => {
    const dead = () => Promise.reject(new TypeError("down"));
    const states = await loadAll({ stats: dead, orders: dead, courses: dead, leads: dead });
    expect(states.map((s) => s.kind)).toEqual(["error", "error", "error", "error"]);
  });

  it("a valid empty response is ready-and-empty, not an error", async () => {
    const states = await loadAll({
      ...good,
      orders: () => Promise.resolve(response(okEnvelope([]))),
      leads: () => Promise.resolve(response(okEnvelope(null, { total: 0 }))),
    });
    expect(states[1]).toEqual({ kind: "ready", data: [] });
    expect(states[3]).toEqual({ kind: "ready", data: 0 });
  });

  it("retrying only the failed panel recovers it without touching the rest", async () => {
    let statsAttempts = 0;
    const flaky = () => {
      statsAttempts++;
      return statsAttempts === 1
        ? Promise.reject(new TypeError("down"))
        : Promise.resolve(response(okEnvelope(STATS)));
    };

    const first = await loadAll({ ...good, stats: flaky });
    expect(first.map((s) => s.kind)).toEqual(["error", "ready", "ready", "ready"]);

    const retried = await loadPanel("stats", (d) => parseStats(d), "tok", flaky as never);
    expect(retried.kind).toBe("ready");
    expect(statsAttempts).toBe(2);
  });
});

describe("stale responses", () => {
  it("a slow first request must not overwrite a newer one", async () => {
    // Reproduces the page's guard: each load takes a ticket, and only the
    // holder of the current ticket is allowed to write.
    let current = 0;
    const applied: string[] = [];

    async function load(label: string, delayMs: number) {
      const id = ++current;
      await new Promise((r) => setTimeout(r, delayMs));
      if (id !== current) return; // superseded
      applied.push(label);
    }

    await Promise.all([load("slow-first", 40), load("fast-second", 5)]);

    expect(applied).toEqual(["fast-second"]);
  });
});
