import { describe, it, expect } from "vitest";
import { resolveEventListState, isEventEndedClient } from "@/lib/events/listState";
import type { EventApiResult, EventSummary } from "@/lib/api/events";

/**
 * The /event page used to render a failed API exactly like an empty catalogue:
 *
 *     const events = result.success ? result.data.events : [];
 *
 * so an outage told visitors "no events scheduled yet" with full confidence.
 * These tests keep error, empty and list as three distinct outcomes.
 */

const NOW = new Date("2026-08-10T06:00:00.000Z").getTime();

function ev(over: Partial<EventSummary> & { id: string; startDate: string }): EventSummary {
  return {
    title: "Event",
    slug: over.id,
    type: "online",
    endDate: null,
    location: null,
    venue: null,
    price: "0",
    salePrice: null,
    quota: null,
    totalSold: 0,
    coverUrl: null,
    speakerName: null,
    isFeatured: false,
    ...over,
  } as EventSummary;
}

function ok(events: EventSummary[], total = events.length): EventApiResult<{ events: EventSummary[]; total: number }> {
  return { success: true, data: { events, total } };
}

describe("resolveEventListState", () => {
  // ── Loading ────────────────────────────────────────────────────────────────
  // /event is a server component: it renders only after the fetch settles, so
  // "loading" is Next's streaming fallback (app/(public)/event/loading.tsx),
  // never a state this resolver can produce. Asserting that it only ever
  // returns one of three kinds is what pins that down.
  it("only ever produces error | empty | list — loading is not its concern", () => {
    const kinds = [
      resolveEventListState({ success: false, status: 500, error: { code: "X", message: "y" } }).kind,
      resolveEventListState(ok([])).kind,
      resolveEventListState(ok([ev({ id: "a", startDate: "2026-09-01T00:00:00.000Z" })]), NOW).kind,
    ];
    expect(kinds).toEqual(["error", "empty", "list"]);
  });

  // ── API error ──────────────────────────────────────────────────────────────
  it("returns error for a 5xx failure, never empty", () => {
    const s = resolveEventListState({ success: false, status: 500, error: { code: "INTERNAL", message: "boom" } });
    expect(s.kind).toBe("error");
  });

  it("returns error for a network failure (status 0)", () => {
    const s = resolveEventListState({ success: false, status: 0, error: { code: "NETWORK", message: "offline" } });
    expect(s.kind).toBe("error");
  });

  it("returns error for a 400, never empty", () => {
    const s = resolveEventListState({ success: false, status: 400, error: { code: "VALIDATION_ERROR", message: "limit" } });
    expect(s.kind).toBe("error");
  });

  // ── Genuinely empty ────────────────────────────────────────────────────────
  it("returns empty for a successful call with zero events", () => {
    expect(resolveEventListState(ok([])).kind).toBe("empty");
  });

  it("returns empty when every event returned is already finished", () => {
    const s = resolveEventListState(
      ok([
        ev({ id: "a", startDate: "2026-07-14T04:41:55.000Z" }),
        ev({ id: "b", startDate: "2026-07-21T04:41:55.000Z" }),
        ev({ id: "c", startDate: "2026-07-28T04:41:55.000Z" }),
      ]),
      NOW,
    );
    // This is the exact production data of 10 Aug 2026.
    expect(s.kind).toBe("empty");
  });

  // ── Upcoming ───────────────────────────────────────────────────────────────
  it("returns list for upcoming events and preserves the API total", () => {
    const s = resolveEventListState(
      ok([ev({ id: "a", startDate: "2026-09-01T00:00:00.000Z" }), ev({ id: "b", startDate: "2026-10-01T00:00:00.000Z" })], 2),
      NOW,
    );
    expect(s).toMatchObject({ kind: "list", total: 2 });
    if (s.kind === "list") expect(s.events.map((e) => e.id)).toEqual(["a", "b"]);
  });

  // ── Mixed past / upcoming ──────────────────────────────────────────────────
  it("drops finished events from a mixed response and reports the visible count", () => {
    const s = resolveEventListState(
      ok(
        [
          ev({ id: "past-1", startDate: "2026-07-21T04:41:55.000Z" }),
          ev({ id: "up-1", startDate: "2026-09-01T00:00:00.000Z" }),
          ev({ id: "past-2", startDate: "2026-01-01T00:00:00.000Z" }),
          ev({ id: "up-2", startDate: "2026-12-01T00:00:00.000Z" }),
        ],
        4,
      ),
      NOW,
    );
    expect(s.kind).toBe("list");
    if (s.kind === "list") {
      expect(s.events.map((e) => e.id)).toEqual(["up-1", "up-2"]);
      // `total` must match what the visitor can actually count on screen.
      expect(s.total).toBe(2);
    }
  });

  it("keeps a multi-day event that has started but not finished", () => {
    const s = resolveEventListState(
      ok([ev({ id: "running", startDate: "2026-08-01T00:00:00.000Z", endDate: "2026-08-20T00:00:00.000Z" })]),
      NOW,
    );
    expect(s.kind).toBe("list");
  });
});

describe("isEventEndedClient — same contract as the server", () => {
  it("is ENDED at the exact boundary instant", () => {
    expect(isEventEndedClient({ startDate: "2026-08-10T06:00:00.000Z", endDate: null }, NOW)).toBe(true);
  });

  it("is NOT ended one millisecond before the boundary", () => {
    expect(isEventEndedClient({ startDate: "2026-08-10T06:00:00.001Z", endDate: null }, NOW)).toBe(false);
  });

  it("is ENDED one millisecond after the boundary", () => {
    expect(isEventEndedClient({ startDate: "2026-08-10T05:59:59.999Z", endDate: null }, NOW)).toBe(true);
  });

  it("prefers endDate over startDate", () => {
    expect(isEventEndedClient({ startDate: "2020-01-01T00:00:00.000Z", endDate: "2026-12-01T00:00:00.000Z" }, NOW)).toBe(false);
    expect(isEventEndedClient({ startDate: "2026-12-01T00:00:00.000Z", endDate: "2020-01-01T00:00:00.000Z" }, NOW)).toBe(true);
  });

  it("gives the same verdict for UTC and WIB notations of one instant", () => {
    expect(isEventEndedClient({ startDate: "2026-08-10T06:00:00.000Z", endDate: null }, NOW)).toBe(true);
    expect(isEventEndedClient({ startDate: "2026-08-10T13:00:00.000+07:00", endDate: null }, NOW)).toBe(true);
    expect(isEventEndedClient({ startDate: "2026-08-10T13:00:00.001+07:00", endDate: null }, NOW)).toBe(false);
  });
});
