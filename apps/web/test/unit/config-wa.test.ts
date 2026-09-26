import { describe, it, expect, afterEach, vi } from "vitest";
import { normalizeWaNumber } from "@/lib/config";

/**
 * Guards the WhatsApp contact configuration.
 *
 * Context: on 10 Aug 2026 every WhatsApp CTA on the live site pointed at
 * `https://wa.me/` with no number, and /contact rendered the number as a bare
 * "+". The host .env defined WA_NUMBER while the build arg asked for
 * NEXT_PUBLIC_WA_NUMBER, so the value resolved to "" — and `??` does not fall
 * back on an empty string. These tests pin down that an empty or malformed
 * value can never again be mistaken for configuration.
 */
// Fixtures use the synthetic 6281234567890 on purpose: a unit test must not
// depend on — or restate — the real business contact number.
describe("normalizeWaNumber", () => {
  it("returns null for undefined", () => {
    expect(normalizeWaNumber(undefined)).toBeNull();
  });

  it("returns null for null", () => {
    expect(normalizeWaNumber(null)).toBeNull();
  });

  // The exact value that shipped to production.
  it("returns null for an empty string", () => {
    expect(normalizeWaNumber("")).toBeNull();
  });

  it("returns null for whitespace only", () => {
    expect(normalizeWaNumber("   ")).toBeNull();
    expect(normalizeWaNumber("\t\n ")).toBeNull();
  });

  it("accepts a plain Indonesian number", () => {
    expect(normalizeWaNumber("6281234567890")).toBe("6281234567890");
  });

  it("trims surrounding whitespace", () => {
    expect(normalizeWaNumber("  6281234567890  ")).toBe("6281234567890");
  });

  it("strips a leading + and human separators", () => {
    expect(normalizeWaNumber("+62 812-3456-7890")).toBe("6281234567890");
    expect(normalizeWaNumber("+62 (812) 3456 7890")).toBe("6281234567890");
  });

  it("rejects illegal characters", () => {
    expect(normalizeWaNumber("abc")).toBeNull();
    expect(normalizeWaNumber("+62-abc-1234")).toBeNull();
    expect(normalizeWaNumber("62852834237e7")).toBeNull();
    // A second + is not a separator we accept.
    expect(normalizeWaNumber("++6281234567890")).toBeNull();
  });

  it("rejects numbers that are too short", () => {
    expect(normalizeWaNumber("1234567")).toBeNull(); // 7 digits
  });

  it("accepts the shortest allowed length", () => {
    expect(normalizeWaNumber("12345678")).toBe("12345678"); // 8 digits
  });

  it("rejects numbers that are too long", () => {
    expect(normalizeWaNumber("1234567890123456")).toBeNull(); // 16 digits
  });

  it("accepts the longest allowed length", () => {
    expect(normalizeWaNumber("123456789012345")).toBe("123456789012345"); // 15 digits
  });
});

/**
 * The module-level constants read process.env at import time (Next inlines
 * NEXT_PUBLIC_* at build), so each case needs a fresh module registry.
 */
describe("WA_NUMBER / waLink / WA_NUMBER_DISPLAY", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  async function loadWith(value: string | undefined) {
    vi.resetModules();
    if (value === undefined) vi.stubEnv("NEXT_PUBLIC_WA_NUMBER", "");
    else vi.stubEnv("NEXT_PUBLIC_WA_NUMBER", value);
    return import("@/lib/config");
  }

  it("fails closed on an empty value: no link, no display, not available", async () => {
    const m = await loadWith("");
    expect(m.WA_NUMBER).toBeNull();
    expect(m.WA_AVAILABLE).toBe(false);
    expect(m.waLink()).toBeNull();
    expect(m.waLink("halo")).toBeNull();
    // Never the bare "+" that production rendered.
    expect(m.WA_NUMBER_DISPLAY).toBeNull();
  });

  it("fails closed on whitespace", async () => {
    const m = await loadWith("   ");
    expect(m.WA_NUMBER).toBeNull();
    expect(m.waLink()).toBeNull();
  });

  it("builds a wa.me link when configured", async () => {
    const m = await loadWith("6281234567890");
    expect(m.WA_AVAILABLE).toBe(true);
    expect(m.waLink()).toBe("https://wa.me/6281234567890");
    expect(m.WA_NUMBER_DISPLAY).toBe("+62 812-3456-7890");
  });

  it("url-encodes a prefilled message", async () => {
    const m = await loadWith("6281234567890");
    expect(m.waLink("Halo, saya ingin bertanya")).toBe(
      "https://wa.me/6281234567890?text=Halo%2C%20saya%20ingin%20bertanya",
    );
  });

  it("never emits a link without digits", async () => {
    for (const bad of ["", "  ", "abc", "123"]) {
      const m = await loadWith(bad);
      expect(m.waLink()).not.toBe("https://wa.me/");
      expect(m.waLink()).toBeNull();
    }
  });
});

/**
 * buildWaLink() is the low-level builder waLink() now delegates to, and the
 * one a caller with a *different* number (e.g. a per-order contact on the
 * payment-success page) uses directly instead of re-implementing the
 * `https://wa.me/...` + encodeURIComponent construction independently.
 */
describe("buildWaLink", () => {
  it("returns null for a null number regardless of text", async () => {
    const { buildWaLink } = await import("@/lib/config");
    expect(buildWaLink(null)).toBeNull();
    expect(buildWaLink(null, "halo")).toBeNull();
  });

  it("builds a bare link with no text", async () => {
    const { buildWaLink } = await import("@/lib/config");
    expect(buildWaLink("6281234567890")).toBe("https://wa.me/6281234567890");
  });

  it("url-encodes prefilled text for an arbitrary number", async () => {
    const { buildWaLink } = await import("@/lib/config");
    expect(buildWaLink("6281111111111", "Halo, saya ingin bertanya")).toBe(
      "https://wa.me/6281111111111?text=Halo%2C%20saya%20ingin%20bertanya",
    );
  });
});
