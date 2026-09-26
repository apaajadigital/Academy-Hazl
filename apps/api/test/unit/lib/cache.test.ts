import { describe, it, expect, vi } from "vitest";
import { cached, cacheGet, cacheSet, cacheInvalidate } from "../../../src/lib/cache.js";

// REDIS_URL is unset under tests → cache is a no-op passthrough.
describe("cache (Redis disabled)", () => {
  it("cacheGet returns null without Redis", async () => {
    expect(await cacheGet("k")).toBeNull();
  });

  it("cacheSet / cacheInvalidate are no-ops that never throw", async () => {
    await expect(cacheSet("k", { a: 1 }, 60)).resolves.toBeUndefined();
    await expect(cacheInvalidate("k:*")).resolves.toBeUndefined();
  });

  it("cached runs the loader (uncached) and returns its value", async () => {
    const loader = vi.fn().mockResolvedValue({ v: 1 });
    const result = await cached("k", 60, loader);
    expect(result).toEqual({ v: 1 });
    expect(loader).toHaveBeenCalledOnce();
  });
});
