import { describe, it, expect } from "vitest";
import { logger } from "../../../src/lib/logger.js";

describe("logger", () => {
  it("exposes all levels and never throws (silent under test)", () => {
    expect(() => {
      logger.debug("debug");
      logger.info("info", { a: 1 });
      logger.warn("warn", { b: 2 });
      logger.error("error", { err: "boom" });
    }).not.toThrow();
  });
});
