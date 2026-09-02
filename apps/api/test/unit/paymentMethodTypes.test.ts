import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

/**
 * BL-147 — DOKU_PAYMENT_METHOD_TYPES is parsed and validated at the env
 * boundary, so a bad value fails at startup rather than at a buyer's checkout.
 *
 * env.ts reads process.env once at module load, so each case resets the module
 * registry and re-imports with the value under test.
 */

const BASE_ENV = {
  NODE_ENV: "test",
  DATABASE_URL: "postgresql://test:test@localhost:5432/test",
  JWT_SECRET: "test-jwt-secret-must-be-at-least-32-chars!!",
  JWT_REFRESH_SECRET: "test-refresh-must-be-32-chars!!!!!!!!!!!",
};

let saved: NodeJS.ProcessEnv;

async function loadEnv(value?: string) {
  vi.resetModules();
  process.env = { ...BASE_ENV } as NodeJS.ProcessEnv;
  if (value !== undefined) process.env.DOKU_PAYMENT_METHOD_TYPES = value;
  return import("../../src/config/env.js");
}

beforeEach(() => {
  saved = process.env;
});

afterEach(() => {
  process.env = saved;
});

describe("DOKU_PAYMENT_METHOD_TYPES", () => {
  it("defaults to a list that excludes every paylater method", async () => {
    const { env, DEFAULT_DOKU_PAYMENT_METHOD_TYPES } = await loadEnv();

    expect(env.DOKU_PAYMENT_METHOD_TYPES).toEqual([...DEFAULT_DOKU_PAYMENT_METHOD_TYPES]);
    // The whole point of BL-147: none of the four methods that fail with case
    // code 02 may be offered.
    expect(env.DOKU_PAYMENT_METHOD_TYPES.some((t) => t.startsWith("PEER_TO_PEER_"))).toBe(false);
  });

  it("covers virtual account, card and e-wallet by default", async () => {
    const { env } = await loadEnv();

    expect(env.DOKU_PAYMENT_METHOD_TYPES).toContain("VIRTUAL_ACCOUNT_BCA");
    expect(env.DOKU_PAYMENT_METHOD_TYPES).toContain("CREDIT_CARD");
    expect(env.DOKU_PAYMENT_METHOD_TYPES.some((t) => t.startsWith("EMONEY_"))).toBe(true);
  });

  it("parses a comma-separated override, trimming whitespace", async () => {
    const { env } = await loadEnv(" VIRTUAL_ACCOUNT_BCA , CREDIT_CARD ");

    expect(env.DOKU_PAYMENT_METHOD_TYPES).toEqual(["VIRTUAL_ACCOUNT_BCA", "CREDIT_CARD"]);
  });

  it("treats an EMPTY value as the safe default, not as 'show everything'", async () => {
    const { env, DEFAULT_DOKU_PAYMENT_METHOD_TYPES } = await loadEnv("");

    // This is the footgun that matters: docker-compose.vps.yml writes
    // `${DOKU_PAYMENT_METHOD_TYPES:-}`, so the container sees an EMPTY STRING,
    // not an absent variable. Zod's .default() only fires on undefined. If
    // empty meant "show everything", every host that had not set the variable
    // would silently offer all 31 methods again — paylater included.
    expect(env.DOKU_PAYMENT_METHOD_TYPES).toEqual([...DEFAULT_DOKU_PAYMENT_METHOD_TYPES]);
  });

  it("only the literal ALL opens checkout back up to every DOKU method", async () => {
    const { env } = await loadEnv("ALL");

    // dokuService omits payment_method_types entirely for an empty list.
    expect(env.DOKU_PAYMENT_METHOD_TYPES).toEqual([]);
  });

  it("accepts the sentinel case-insensitively, with surrounding whitespace", async () => {
    const { env } = await loadEnv("  all  ");

    expect(env.DOKU_PAYMENT_METHOD_TYPES).toEqual([]);
  });

  it("drops stray separators rather than emitting empty codes", async () => {
    const { env } = await loadEnv("VIRTUAL_ACCOUNT_BCA,,CREDIT_CARD,");

    expect(env.DOKU_PAYMENT_METHOD_TYPES).toEqual(["VIRTUAL_ACCOUNT_BCA", "CREDIT_CARD"]);
  });

  it("refuses a paylater method, naming why", async () => {
    await expect(loadEnv("VIRTUAL_ACCOUNT_BCA,PEER_TO_PEER_KREDIVO")).rejects.toThrow(
      /paylater method \(BL-147\)/,
    );
  });

  it("refuses every paylater variant seen in the sandbox response", async () => {
    for (const code of [
      "PEER_TO_PEER_KREDIVO",
      "PEER_TO_PEER_AKULAKU",
      "PEER_TO_PEER_INDODANA",
      "PEER_TO_PEER_BRI_CERIA",
    ]) {
      await expect(loadEnv(code)).rejects.toThrow(/BL-147/);
    }
  });

  it("refuses a malformed code instead of forwarding it to DOKU", async () => {
    await expect(loadEnv("virtual_account_bca")).rejects.toThrow(/UPPER_SNAKE_CASE/);
  });

  it("refuses a code containing a space", async () => {
    await expect(loadEnv("VIRTUAL ACCOUNT BCA")).rejects.toThrow(/UPPER_SNAKE_CASE/);
  });

  it("accepts a method code we have never heard of — the list must not need a deploy", async () => {
    // Deliberately NOT validated against a hardcoded enum of DOKU codes:
    // pinning one would assert a third-party protocol detail from memory (the
    // BL-137 mistake) and would block an operator from enabling a method DOKU
    // activates later.
    const { env } = await loadEnv("SOME_NEW_METHOD_2027");

    expect(env.DOKU_PAYMENT_METHOD_TYPES).toEqual(["SOME_NEW_METHOD_2027"]);
  });
});
