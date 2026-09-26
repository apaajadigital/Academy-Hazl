import { ROLES, type Role } from "../types/index.js";

/** A `UserRole` row as far as the session identity is concerned. */
export type RoleGrant = { role: string; tenantId?: string | null };

export function isKnownRole(role: string): role is Role {
  return (ROLES as readonly string[]).includes(role);
}

/**
 * Reduce raw `UserRole` rows to the *platform-wide* roles of the session (BL-78b).
 *
 * Global roles are stored with `tenantId = null` (the convention asserted by
 * `GLOBAL_TENANT_ID` in modules/admin/users.ts); tenant-scoped grants such as
 * `lms_admin`/`lms_employee` carry a tenant id. Previously every row landed in
 * `req.user.roles`, so a `super_admin` granted for ONE tenant satisfied every
 * platform-wide gate that merely string-matches "super_admin" (`requireAdmin` in
 * routes/admin.ts, `authorize()`, lms `requireSuperAdmin`, the inline checks in
 * routes/orders.ts, blog.ts, coupons.ts, …) — cross-tenant privilege escalation.
 *
 * Dropping tenant rows here is safe because nothing reads tenant authority from
 * `req.user.roles`: every tenant check (lms/guards.ts, lms/tenant.ts, lms/portal.ts)
 * re-queries `UserRole` with an explicit `tenantId`, which stays authoritative.
 *
 * `tenantId` is treated as global only when nullish. Prisma always returns the
 * selected column, so `undefined` cannot come from a real row — accepting it keeps
 * hand-built fixtures that predate the column working without weakening the gate.
 *
 * Unknown role strings are dropped so the returned `Role[]` is honest rather than
 * an unchecked cast; a string outside the union could never satisfy a gate anyway.
 *
 * Lives in lib/ rather than middleware/ because both the request-time identity
 * (middleware/authenticate.ts) and the token-issuing path (modules/auth/shared.ts)
 * must agree on it; a module importing from middleware/ would invert the layering.
 */
export function toGlobalRoles(grants: readonly RoleGrant[]): Role[] {
  return grants.filter((g) => (g.tenantId ?? null) === null).map((g) => g.role).filter(isKnownRole);
}
