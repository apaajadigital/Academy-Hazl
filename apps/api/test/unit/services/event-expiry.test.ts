import { describe, it, expect } from "vitest";
import { eventEndsAt, isEventEnded } from "../../../src/services/event/eventService.js";

/**
 * Guards the rule that decides whether an event may still be sold.
 *
 * Context: on 10 Aug 2026 all three published production events had already
 * happened (14, 21 and 28 Jul) and two of them were still taking money —
 * Rp 350.000 and Rp 150.000 — because nothing anywhere compared the event date
 * to the current time. These tests pin the comparison down, including the
 * boundary and the timezone question.
 */
describe("eventEndsAt", () => {
  it("uses endDate when the event has one", () => {
    const start = new Date("2026-08-01T00:00:00.000Z");
    const end = new Date("2026-08-03T00:00:00.000Z");
    expect(eventEndsAt({ startDate: start, endDate: end })).toEqual(end);
  });

  it("falls back to startDate when endDate is null", () => {
    const start = new Date("2026-08-01T00:00:00.000Z");
    expect(eventEndsAt({ startDate: start, endDate: null })).toEqual(start);
  });

  it("falls back to startDate when endDate is undefined", () => {
    const start = new Date("2026-08-01T00:00:00.000Z");
    expect(eventEndsAt({ startDate: start })).toEqual(start);
  });
});

describe("isEventEnded", () => {
  const now = new Date("2026-08-10T06:00:00.000Z");

  it("treats a multi-day event as ended once endDate has passed", () => {
    expect(
      isEventEnded(
        { startDate: new Date("2026-08-01T00:00:00.000Z"), endDate: new Date("2026-08-09T23:59:59.000Z") },
        now,
      ),
    ).toBe(true);
  });

  it("treats a multi-day event as live while endDate is still ahead, even if it already started", () => {
    expect(
      isEventEnded(
        { startDate: new Date("2026-08-01T00:00:00.000Z"), endDate: new Date("2026-08-11T00:00:00.000Z") },
        now,
      ),
    ).toBe(false);
  });

  it("treats a single-session event as ended once startDate has passed", () => {
    expect(isEventEnded({ startDate: new Date("2026-07-21T04:41:55.000Z"), endDate: null }, now)).toBe(true);
  });

  it("treats an upcoming event as not ended", () => {
    expect(isEventEnded({ startDate: new Date("2026-09-01T00:00:00.000Z"), endDate: null }, now)).toBe(false);
  });

  // ── Boundary ───────────────────────────────────────────────────────────────
  // The contract is: active ⇔ eventEnd > now, ended ⇔ eventEnd <= now.
  // The end instant itself counts as ended — nothing is left to sell at the
  // moment a session's end time arrives.
  describe("at the exact boundary", () => {
    it("is ENDED when eventEnd === now (no endDate)", () => {
      expect(isEventEnded({ startDate: now, endDate: null }, now)).toBe(true);
    });

    it("is ENDED when endDate === now", () => {
      expect(isEventEnded({ startDate: new Date("2026-01-01T00:00:00.000Z"), endDate: now }, now)).toBe(true);
    });

    it("is ENDED one millisecond after the boundary", () => {
      expect(isEventEnded({ startDate: new Date(now.getTime() - 1), endDate: null }, now)).toBe(true);
      expect(isEventEnded({ startDate: new Date("2020-01-01"), endDate: new Date(now.getTime() - 1) }, now)).toBe(true);
    });

    it("is NOT ended one millisecond before the boundary", () => {
      expect(isEventEnded({ startDate: new Date(now.getTime() + 1), endDate: null }, now)).toBe(false);
      expect(isEventEnded({ startDate: new Date("2020-01-01"), endDate: new Date(now.getTime() + 1) }, now)).toBe(false);
    });
  });

  // The property that matters more than any single case: "ended" and "active"
  // must partition the timeline with no overlap and no gap. A mismatch here is
  // exactly how an event could vanish from the catalogue while checkout still
  // took money for it.
  it("is the exact complement of the listing's `eventEnd > now` rule", () => {
    const offsets = [-1000, -1, 0, 1, 1000];
    for (const off of offsets) {
      const end = new Date(now.getTime() + off);
      const endedByHelper = isEventEnded({ startDate: end, endDate: null }, now);
      const activeByListingRule = end.getTime() > now.getTime(); // what Prisma `gt` asks
      expect(endedByHelper, `offset ${off}ms`).toBe(!activeByListingRule);
    }
  });

  // ── Timezone ───────────────────────────────────────────────────────────────
  // Both sides are absolute instants, so the verdict must not depend on how the
  // instant was written. 2026-08-10T13:00+07:00 (WIB) IS 06:00Z — the same
  // moment as `now`, therefore not ended; one second earlier in WIB is.
  it("gives the same verdict for the same instant written in UTC or WIB", () => {
    const utc = new Date("2026-08-10T06:00:00.000Z");
    const wib = new Date("2026-08-10T13:00:00.000+07:00");
    expect(wib.getTime()).toBe(utc.getTime());
    // Same instant as `now` → ended under the `<=` contract, from both notations.
    expect(isEventEnded({ startDate: utc, endDate: null }, now)).toBe(true);
    expect(isEventEnded({ startDate: wib, endDate: null }, now)).toBe(true);
  });

  it("treats a WIB-written instant one second in the past as ended", () => {
    expect(
      isEventEnded({ startDate: new Date("2026-08-10T12:59:59.000+07:00"), endDate: null }, now),
    ).toBe(true);
  });

  it("treats a WIB-written instant one second in the future as still active", () => {
    expect(
      isEventEnded({ startDate: new Date("2026-08-10T13:00:01.000+07:00"), endDate: null }, now),
    ).toBe(false);
  });

  it("gives the same verdict for an endDate written in UTC or WIB", () => {
    const start = new Date("2026-01-01T00:00:00.000Z");
    expect(isEventEnded({ startDate: start, endDate: new Date("2026-08-11T00:00:00.000Z") }, now)).toBe(false);
    expect(isEventEnded({ startDate: start, endDate: new Date("2026-08-11T07:00:00.000+07:00") }, now)).toBe(false);
    expect(isEventEnded({ startDate: start, endDate: new Date("2026-08-09T00:00:00.000Z") }, now)).toBe(true);
    expect(isEventEnded({ startDate: start, endDate: new Date("2026-08-09T07:00:00.000+07:00") }, now)).toBe(true);
  });
});
