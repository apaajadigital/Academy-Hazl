import { describe, it, expect, vi } from "vitest";
import type { Request, Response, NextFunction } from "express";
import { asyncHandler } from "../../../src/lib/asyncHandler.js";

const mkNext = () => vi.fn() as unknown as NextFunction;
const req = {} as Request;
const res = {} as Response;

describe("asyncHandler", () => {
  it("forwards a rejected promise to next()", async () => {
    const next = mkNext();
    const err = new Error("boom");
    const handler = asyncHandler(async () => {
      throw err;
    });
    handler(req, res, next);
    await new Promise((r) => setImmediate(r));
    expect(next).toHaveBeenCalledWith(err);
  });

  it("does not call next() on success", async () => {
    const next = mkNext();
    const handler = asyncHandler(async () => "ok");
    handler(req, res, next);
    await new Promise((r) => setImmediate(r));
    expect(next).not.toHaveBeenCalled();
  });
});
