import { describe, it, expect } from "vitest";
import { parsePageParams, buildPaginationMeta } from "../../../src/lib/pagination.js";

describe("parsePageParams", () => {
  it("returns defaults for missing params", () => {
    const p = parsePageParams({});
    expect(p).toEqual({ page: 1, limit: 20, skip: 0 });
  });

  it("computes skip from page and limit", () => {
    const p = parsePageParams({ page: 3, limit: 10 });
    expect(p).toEqual({ page: 3, limit: 10, skip: 20 });
  });

  it("clamps limit to the maximum", () => {
    expect(parsePageParams({ limit: 500 }).limit).toBe(100);
  });

  it("rejects invalid/negative/zero inputs and falls back to safe values", () => {
    expect(parsePageParams({ page: -5, limit: 0 })).toEqual({ page: 1, limit: 20, skip: 0 });
    expect(parsePageParams({ page: "abc", limit: "xyz" })).toEqual({ page: 1, limit: 20, skip: 0 });
    expect(parsePageParams({ page: 2.5, limit: 3.7 })).toEqual({ page: 1, limit: 20, skip: 0 });
  });
});

describe("buildPaginationMeta", () => {
  it("builds meta from total and page params", () => {
    const meta = buildPaginationMeta(57, { page: 2, limit: 20, skip: 20 });
    expect(meta).toEqual({ total: 57, page: 2, limit: 20 });
  });
});
