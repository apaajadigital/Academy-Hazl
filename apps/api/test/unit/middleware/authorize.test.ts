import { describe, it, expect, vi } from "vitest";
import type { Request, Response, NextFunction } from "express";
import { authorize } from "../../../src/middleware/authorize.js";
import { AppError } from "../../../src/types/index.js";

function makeReq(roles?: string[]): Request {
  return {
    user: roles ? { id: "u1", email: "a@b.com", roles } : undefined,
  } as unknown as Request;
}

const res = {} as Response;

describe("authorize", () => {
  it("calls next() when user has an allowed role", () => {
    const req = makeReq(["student"]);
    const next = vi.fn() as NextFunction;
    authorize("student")(req, res, next);
    expect(next).toHaveBeenCalledWith();
  });

  it("super_admin bypasses role check", () => {
    const req = makeReq(["super_admin"]);
    const next = vi.fn() as NextFunction;
    authorize("trainer")(req, res, next);
    expect(next).toHaveBeenCalledWith();
  });

  it("returns 403 when user lacks required role", () => {
    const req = makeReq(["student"]);
    const next = vi.fn() as NextFunction;
    authorize("trainer")(req, res, next);
    const err = (next as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(err).toBeInstanceOf(AppError);
    expect(err.statusCode).toBe(403);
  });

  it("returns 401 when req.user is missing", () => {
    const req = makeReq();
    const next = vi.fn() as NextFunction;
    authorize("student")(req, res, next);
    const err = (next as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(err.statusCode).toBe(401);
  });
});
