import { describe, it, expect } from "vitest";
import { csvCell, CSV_EXPORT_MAX_ROWS } from "../../src/lib/csv.js";

describe("csvCell", () => {
  it("wraps a plain value in double quotes", () => {
    expect(csvCell("hello")).toBe('"hello"');
  });

  it("doubles embedded double quotes", () => {
    expect(csvCell('say "hi"')).toBe('"say ""hi"""');
  });

  it("keeps commas and newlines inside one quoted cell", () => {
    expect(csvCell("a,b")).toBe('"a,b"');
    expect(csvCell("line1\nline2")).toBe('"line1\nline2"');
  });

  it("serializes null and undefined as an empty quoted cell", () => {
    expect(csvCell(null)).toBe('""');
    expect(csvCell(undefined)).toBe('""');
  });

  describe("formula-injection guard (M2)", () => {
    it.each([
      ["=HYPERLINK(\"x\")", '"\'=HYPERLINK(""x"")"'],
      ["+62-812", "\"'+62-812\""],
      ["-1+1", "\"'-1+1\""],
      ["@SUM(A1)", "\"'@SUM(A1)\""],
    ])("prefixes %s with a single quote", (input, expected) => {
      expect(csvCell(input)).toBe(expected);
    });

    it("prefixes cells starting with a tab or carriage return", () => {
      expect(csvCell("\t=1+1")).toBe('"\'\t=1+1"');
      expect(csvCell("\r=1+1")).toBe('"\'\r=1+1"');
    });

    it("does not touch formula characters in the middle of a cell", () => {
      expect(csvCell("a=b")).toBe('"a=b"');
      expect(csvCell("email@example.com ok")).toBe('"email@example.com ok"');
    });
  });
});

describe("CSV_EXPORT_MAX_ROWS", () => {
  it("is the documented 10k hard cap", () => {
    expect(CSV_EXPORT_MAX_ROWS).toBe(10000);
  });
});
