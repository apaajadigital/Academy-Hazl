import { describe, it, expect, vi } from "vitest";
import type { Request, Response, NextFunction } from "express";
import { z } from "zod";
import { validateBody } from "../../../src/middleware/validateBody.js";
import { AppError } from "../../../src/types/index.js";

function makeReq(body: unknown): Request {
  return { body } as Request;
}

const res = {} as Response;

describe("validateBody", () => {
  const schema = z.object({ name: z.string().min(2), age: z.number() });

  it("calls next() with parsed body on valid input", () => {
    const req = makeReq({ name: "Alice", age: 25 });
    const next = vi.fn() as NextFunction;
    validateBody(schema)(req, res, next);
    expect(next).toHaveBeenCalledWith();
    expect(req.body).toEqual({ name: "Alice", age: 25 });
  });

  it("calls next(AppError(400)) on invalid input", () => {
    const req = makeReq({ name: "A" });
    const next = vi.fn() as NextFunction;
    validateBody(schema)(req, res, next);
    const err = (next as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(err).toBeInstanceOf(AppError);
    expect(err.statusCode).toBe(400);
  });

  it("calls next(AppError(400)) when body is missing required field", () => {
    const req = makeReq({});
    const next = vi.fn() as NextFunction;
    validateBody(schema)(req, res, next);
    const err = (next as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(err.statusCode).toBe(400);
  });
});
