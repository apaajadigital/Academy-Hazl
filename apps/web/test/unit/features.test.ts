import { describe, it, expect, afterEach, vi } from "vitest";

/**
 * Guards the feature-flag parser, with `mentor` as the case that regressed.
 *
 * Context: `mentor` used to be written as `=== "false" ? false : true`, which
 * inverted the convention every other flag follows — an unset or empty value
 * meant ON. On 10 Aug 2026 that put /mentor plus seven fictional profiles into
 * the live sitemap, advertising invented people attributed to real companies.
 * The rule is now the same for every flag: nothing is public unless something
 * explicitly says "true".
 */
async function loadFeatures(value: string | undefined) {
  vi.resetModules();
  vi.stubEnv("NEXT_PUBLIC_FEATURE_MENTOR", value === undefined ? "" : value);
  return import("@/lib/features");
}

describe("features.mentor", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("is OFF when the variable is unset", async () => {
    const { features } = await loadFeatures(undefined);
    expect(features.mentor).toBe(false);
  });

  // The exact production value: docker-compose resolved `${VAR:-}` to "".
  it("is OFF for an empty string", async () => {
    const { features } = await loadFeatures("");
    expect(features.mentor).toBe(false);
  });

  it("is OFF for the literal \"false\"", async () => {
    const { features } = await loadFeatures("false");
    expect(features.mentor).toBe(false);
  });

  it("is ON only for the literal \"true\"", async () => {
    const { features } = await loadFeatures("true");
    expect(features.mentor).toBe(true);
  });

  it("is ON for the documented \"1\" alias", async () => {
    const { features } = await loadFeatures("1");
    expect(features.mentor).toBe(true);
  });

  it("is OFF for invalid values rather than defaulting ON", async () => {
    for (const bad of ["TRUE", "yes", "on", "0", "  ", "maybe", "null", "undefined"]) {
      const { features } = await loadFeatures(bad);
      expect(features.mentor, `value ${JSON.stringify(bad)} must be OFF`).toBe(false);
    }
  });

  it("follows the same rule as every other flag", async () => {
    vi.resetModules();
    vi.stubEnv("NEXT_PUBLIC_FEATURE_MENTOR", "");
    vi.stubEnv("NEXT_PUBLIC_FEATURE_ALUMNI", "");
    vi.stubEnv("NEXT_PUBLIC_FEATURE_COMMUNITY", "");
    vi.stubEnv("NEXT_PUBLIC_FEATURE_PORTFOLIO", "");
    const { features } = await import("@/lib/features");
    // No flag may be ON just because nobody set it.
    expect(features.mentor).toBe(false);
    expect(features.alumni).toBe(false);
    expect(features.community).toBe(false);
    expect(features.portfolio).toBe(false);
  });
});

describe("isEnabled", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("mirrors the features object", async () => {
    const { features, isEnabled } = await loadFeatures("true");
    expect(isEnabled("mentor")).toBe(features.mentor);
  });
});
