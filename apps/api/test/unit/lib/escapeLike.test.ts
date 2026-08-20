import { describe, it, expect } from "vitest";
import { escapeLike } from "../../../src/lib/escapeLike.js";

describe("escapeLike (BL-108)", () => {
  it("leaves ordinary terms untouched", () => {
    expect(escapeLike("Panduan Excel")).toBe("Panduan Excel");
    expect(escapeLike("")).toBe("");
  });

  it("escapes the LIKE wildcards", () => {
    expect(escapeLike("%")).toBe("\\%");
    expect(escapeLike("_")).toBe("\\_");
    expect(escapeLike("100%_off")).toBe("100\\%\\_off");
  });

  it("escapes backslash without double-escaping the ones it inserts", () => {
    expect(escapeLike("\\")).toBe("\\\\");
    // A naive `%`-then-`_` pass would turn this into `\\%`, which PostgreSQL
    // reads as an escaped backslash followed by a live wildcard.
    expect(escapeLike("\\%")).toBe("\\\\\\%");
  });

  it("never emits a pattern ending in a lone escape character", () => {
    // PostgreSQL rejects such patterns with an error, which would surface as a
    // 500 on the public search endpoint.
    const escaped = escapeLike("draft\\");
    expect(escaped.match(/\\*$/)![0].length % 2).toBe(0);
  });
});
