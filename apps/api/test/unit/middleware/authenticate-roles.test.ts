/**
 * BL-78b regression: the session must expose PLATFORM-WIDE roles only.
 *
 * A `super_admin` row scoped to a single tenant used to land in `req.user.roles`,
 * so every global gate that string-matches "super_admin" accepted it — handing a
 * one-tenant admin the whole platform. These tests pin the boundary at both
 * levels: the reducer that builds the session, and `authorize()` that consumes it.
 */

import { describe, it, expect, vi } from "vitest";
import type { Request, Response, NextFunction } from "express";
import { toGlobalRoles, type RoleGrant } from "../../../src/middleware/authenticate.js";
import { authorize } from "../../../src/middleware/authorize.js";
import { AppError, type Role } from "../../../src/types/index.js";

const res = {} as Response;

function runAuthorize(roles: Role[], allowed: Role[]): unknown {
  const req = { user: { id: "u1", email: "a@b.com", roles } } as unknown as Request;
  const next = vi.fn() as NextFunction;
  authorize(...allowed)(req, res, next);
  return (next as ReturnType<typeof vi.fn>).mock.calls[0]?.[0];
}

describe("toGlobalRoles (session role reduction)", () => {
  it("keeps a global super_admin (tenantId null)", () => {
    expect(toGlobalRoles([{ role: "super_admin", tenantId: null }])).toEqual(["super_admin"]);
  });

  it("drops a tenant-scoped super_admin", () => {
    expect(toGlobalRoles([{ role: "super_admin", tenantId: "tenant-1" }])).toEqual([]);
  });

  it("keeps only the global rows when a user holds both", () => {
    const grants: RoleGrant[] = [
      { role: "student", tenantId: null },
      { role: "super_admin", tenantId: "tenant-1" },
      { role: "trainer", tenantId: "tenant-2" },
    ];
    expect(toGlobalRoles(grants)).toEqual(["student"]);
  });

  it("drops tenant-scoped LMS roles (they are re-checked against the DB per tenant)", () => {
    const grants: RoleGrant[] = [
      { role: "lms_admin", tenantId: "tenant-1" },
      { role: "lms_employee", tenantId: "tenant-1" },
    ];
    expect(toGlobalRoles(grants)).toEqual([]);
  });

  it("drops role strings outside the Role union so the result is not an unchecked cast", () => {
    expect(toGlobalRoles([{ role: "root", tenantId: null }])).toEqual([]);
  });

  it("treats a missing tenantId as global (fixtures predating the column)", () => {
    expect(toGlobalRoles([{ role: "super_admin" }])).toEqual(["super_admin"]);
  });
});

describe("authorize — tenant-scoped super_admin cannot pass a global gate", () => {
  it("accepts a global super_admin on a gate it does not literally list", () => {
    expect(runAuthorize(["super_admin"], ["trainer"])).toBeUndefined();
  });

  it("rejects a session built from a tenant-scoped super_admin grant", () => {
    // What `authenticate` now produces for a tenant-only grant: an empty session.
    const err = runAuthorize(toGlobalRoles([{ role: "super_admin", tenantId: "t1" }]), ["trainer"]);
    expect(err).toBeInstanceOf(AppError);
    expect((err as AppError).statusCode).toBe(403);
  });

  it("accepts a session built from a global super_admin grant", () => {
    expect(runAuthorize(toGlobalRoles([{ role: "super_admin", tenantId: null }]), ["trainer"])).toBeUndefined();
  });
});
