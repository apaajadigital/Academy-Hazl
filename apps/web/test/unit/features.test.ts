import { describe, it, expect, afterEach, vi } from "vitest";

/**
 * Guards the feature-flag parser, with `alumni` as the representative case.
 *
 * Context — why this rule exists at all: the now-deleted `mentor` flag used to
 * be written as `=== "false" ? false : true`, which inverted the convention
 * every other flag follows — an unset or empty value meant ON. On 10 Aug 2026
 * that put /mentor plus seven fictional profiles into the live sitemap,
 * advertising invented people attributed to real companies. The roster and its
 * flag were deleted outright on 11 Sep 2026 (BL-114), so this spec now pins the
 * same contract on `alumni`, which is OFF for the same class of reason: it must
 * not go public until real, consented stories exist.
 *
 * The rule is the same for every flag: nothing is public unless something
 * explicitly says "true".
 */
async function loadFeatures(value: string | undefined) {
  vi.resetModules();
  vi.stubEnv("NEXT_PUBLIC_FEATURE_ALUMNI", value === undefined ? "" : value);
  return import("@/lib/features");
}

describe("features.alumni", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("is OFF when the variable is unset", async () => {
    const { features } = await loadFeatures(undefined);
    expect(features.alumni).toBe(false);
  });

  // The exact production value that caused the incident: docker-compose
  // resolved `${VAR:-}` to "".
  it("is OFF for an empty string", async () => {
    const { features } = await loadFeatures("");
    expect(features.alumni).toBe(false);
  });

  it("is OFF for the literal \"false\"", async () => {
    const { features } = await loadFeatures("false");
    expect(features.alumni).toBe(false);
  });

  it("is ON only for the literal \"true\"", async () => {
    const { features } = await loadFeatures("true");
    expect(features.alumni).toBe(true);
  });

  it("is ON for the documented \"1\" alias", async () => {
    const { features } = await loadFeatures("1");
    expect(features.alumni).toBe(true);
  });

  it("is OFF for invalid values rather than defaulting ON", async () => {
    for (const bad of ["TRUE", "yes", "on", "0", "  ", "maybe", "null", "undefined"]) {
      const { features } = await loadFeatures(bad);
      expect(features.alumni, `value ${JSON.stringify(bad)} must be OFF`).toBe(false);
    }
  });

  it("follows the same rule as every other flag", async () => {
    vi.resetModules();
    vi.stubEnv("NEXT_PUBLIC_FEATURE_ALUMNI", "");
    vi.stubEnv("NEXT_PUBLIC_FEATURE_COMMUNITY", "");
    vi.stubEnv("NEXT_PUBLIC_FEATURE_PORTFOLIO", "");
    vi.stubEnv("NEXT_PUBLIC_FEATURE_LEARNING_PATH", "");
    const { features } = await import("@/lib/features");
    // No flag may be ON just because nobody set it.
    expect(features.alumni).toBe(false);
    expect(features.community).toBe(false);
    expect(features.portfolio).toBe(false);
    expect(features.learningPath).toBe(false);
  });

  /**
   * The deleted flag must stay deleted. Re-adding `mentor` as a flag would mean
   * the fictional roster came back with it — deletion, not gating, was the
   * owner's decision (BL-114).
   */
  it("no longer exposes a mentor flag", async () => {
    const { features } = await loadFeatures("true");
    expect("mentor" in features).toBe(false);
  });
});

describe("isEnabled", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("mirrors the features object", async () => {
    const { features, isEnabled } = await loadFeatures("true");
    expect(isEnabled("alumni")).toBe(features.alumni);
  });
});
