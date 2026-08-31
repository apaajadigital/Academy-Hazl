import { describe, it, expect, afterEach, vi } from "vitest";
import { isDokuTimestampFresh } from "../../src/services/payment/dokuService.js";

/**
 * BL-145 regression suite (Wave 1.2) — a correctly signed notification could be
 * replayed forever, because `Request-Timestamp` was fed into the signature and
 * then never looked at again.
 *
 * The window deliberately errs wide. See the comment on
 * `DOKU_WEBHOOK_MAX_AGE_SECONDS` in config/env.ts: the clock skew between DOKU
 * and us was measured at roughly a second, but DOKU's retry horizon — how long
 * it keeps redelivering a notification that carries its ORIGINAL timestamp — has
 * not been measured, and a window narrower than that horizon would reject
 * legitimate retries. Rejecting real payment notifications is a worse failure
 * than tolerating a replay that BL-138's atomic claim already neutralises.
 */

const HOUR = 3_600_000;

function iso(offsetMs: number): string {
  return new Date(Date.now() + offsetMs).toISOString();
}

afterEach(() => {
  vi.useRealTimers();
});

describe("BL-145 — DOKU notification freshness", () => {
  it("accepts a notification stamped right now", () => {
    expect(isDokuTimestampFresh(iso(0))).toBe(true);
  });

  it("accepts a redelivery from a few hours ago", () => {
    // DOKU retries carry the original timestamp; this must not be rejected.
    expect(isDokuTimestampFresh(iso(-6 * HOUR))).toBe(true);
  });

  it("rejects a notification replayed days later", () => {
    expect(isDokuTimestampFresh(iso(-72 * HOUR))).toBe(false);
  });

  it("tolerates a small clock difference in the future direction", () => {
    // Measured skew against DOKU sandbox on 27 Aug 2026 was under 2 seconds;
    // the allowance is far wider so ordinary host clock drift is not fatal.
    expect(isDokuTimestampFresh(iso(60_000))).toBe(true);
  });

  it("rejects a timestamp implausibly far in the future", () => {
    expect(isDokuTimestampFresh(iso(48 * HOUR))).toBe(false);
  });

  it("rejects a missing or unparseable timestamp", () => {
    expect(isDokuTimestampFresh("")).toBe(false);
    expect(isDokuTimestampFresh("not-a-date")).toBe(false);
    expect(isDokuTimestampFresh(undefined as unknown as string)).toBe(false);
  });

  it("accepts the second-resolution format DOKU actually sends", () => {
    // dokuService strips milliseconds when it signs outbound requests
    // (`2026-08-27T05:34:46Z`); inbound notifications use the same shape.
    const stamp = new Date().toISOString().replace(/\.\d{3}Z$/, "Z");
    expect(isDokuTimestampFresh(stamp)).toBe(true);
  });
});
