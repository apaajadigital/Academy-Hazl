import { Router, type Request, type Response, type NextFunction } from "express";
import type { Prisma } from "@prisma/client";
import { z } from "zod";
import { validateBody } from "../../middleware/validateBody.js";
import { prisma } from "../../db/prisma.js";
import { AppError, successResponse, ROLES, type Role } from "../../types/index.js";
import { csvCell, CSV_EXPORT_MAX_ROWS } from "../../lib/csv.js";
import { writeAudit } from "../../services/audit/log.js";

const router = Router();

// ─── Super-admin lockout invariant (shared) ──────────────────────────────────
// Everything that can remove someone's admin access must enforce the SAME
// invariant, or the guard is theatre: role revoke, `isActive:false`, and
// self-delete each strip a user's ability to reach /api/admin, and there is no
// endpoint left to undo it once the last one is gone (every recovery path is
// itself behind requireAdmin). These helpers are exported — not copied — so the
// three call sites cannot drift apart again.

/**
 * Global (platform-wide) roles are stored with `tenantId = null`. Tenant-scoped
 * LMS roles are managed separately in modules/lms/tenant.ts and are out of
 * scope for this admin endpoint.
 */
const GLOBAL_TENANT_ID = null;

/**
 * The population the invariant actually protects: accounts that can sign in AND
 * pass requireAdmin *right now* — not soft-deleted, `isActive` (authenticate.ts
 * 401s the rest), holding the GLOBAL super_admin role.
 *
 * The first version of this guard counted `UserRole` ROWS with only
 * `{ role, user: { deletedAt: null } }`, which over-counted three ways: a
 * tenant-scoped super_admin row, a duplicate global row (see the partial index
 * in migration 20260729000001), and a row owned by an already-deactivated user
 * all inflated the total, letting the guard wave through the removal of the
 * last reachable admin. Counting USERS with this predicate cannot.
 */
export function activeSuperAdminWhere(excludeUserId?: string): Prisma.UserWhereInput {
  return {
    deletedAt: null,
    isActive: true,
    roles: { some: { role: "super_admin", tenantId: GLOBAL_TENANT_ID } },
    ...(excludeUserId ? { id: { not: excludeUserId } } : {}),
  };
}

/**
 * True when stripping `userId`'s admin access would leave zero reachable super
 * admins. Runs two counts on `user` (distinct people), never on role rows.
 *
 * MUST be called inside the same transaction as the mutation it guards: read
 * and write have to be one atomic step or two admins revoking each other
 * concurrently both observe "2 left" and both commit.
 */
export async function wouldLeaveNoSuperAdmin(
  tx: Prisma.TransactionClient,
  userId: string,
): Promise<boolean> {
  const isSuperAdmin = await tx.user.count({
    where: { ...activeSuperAdminWhere(), id: userId },
  });
  if (isSuperAdmin === 0) return false;
  const others = await tx.user.count({ where: activeSuperAdminWhere(userId) });
  return others === 0;
}

/** Postgres 40001 (serialization failure), surfaced by Prisma as P2034. */
const SERIALIZATION_FAILURE = "P2034";
const MAX_SERIALIZABLE_ATTEMPTS = 3;

function isSerializationFailure(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    (err as { code?: unknown }).code === SERIALIZATION_FAILURE
  );
}

/**
 * Runs `work` in a Serializable transaction, retrying the write-write conflicts
 * that isolation level produces.
 *
 * Serializable (not the default READ COMMITTED) is what makes the check and the
 * mutation one decision: with exactly two admins left, Alice revoking Bob while
 * Bob revokes Alice would otherwise have both transactions read "2 remaining"
 * and both commit, ending at zero. Postgres aborts the loser with 40001
 * instead; that is a retryable conflict, so it must not surface as a 500.
 */
export async function runGuarded<T>(
  work: (tx: Prisma.TransactionClient) => Promise<T>,
): Promise<T> {
  for (let attempt = 1; attempt <= MAX_SERIALIZABLE_ATTEMPTS; attempt++) {
    try {
      return await prisma.$transaction(work, { isolationLevel: "Serializable" });
    } catch (err) {
      if (!isSerializationFailure(err)) throw err;
    }
  }
  throw new AppError(
    409,
    "Perubahan bersamaan pada akun ini sedang diproses. Silakan coba lagi.",
    "CONCURRENT_ROLE_UPDATE",
  );
}

/** Shared 409 for "this would leave the platform with no admin". */
function lastSuperAdminError(): AppError {
  return new AppError(409, "Minimal satu super admin harus tetap ada.", "LAST_SUPER_ADMIN");
}

const UserListSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().optional(),
  // The /admin/pengguna UI sends a role dropdown; it was previously parsed
  // nowhere, so every value returned the full list. Constrain to known roles.
  role: z.enum(["student", "trainer", "affiliate", "super_admin"]).optional(),
});

// GET /api/admin/users — paginated user list
router.get("/users", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { page, limit, search, role } = UserListSchema.parse(req.query);
    const skip = (page - 1) * limit;

    const where = {
      deletedAt: null,
      // Scoped to global grants so the listing matches what a session actually
      // gets (BL-78b) — an unscoped match shows tenant-only grants as if they
      // were platform admins, which misreads the real admin population.
      ...(role ? { roles: { some: { role, tenantId: GLOBAL_TENANT_ID } } } : {}),
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: "insensitive" as const } },
              { email: { contains: search, mode: "insensitive" as const } },
            ],
          }
        : {}),
    };

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          name: true,
          email: true,
          isActive: true,
          isVerified: true,
          authProvider: true,
          createdAt: true,
          roles: { select: { role: true } },
          _count: { select: { enrollments: true } },
        },
      }),
      prisma.user.count({ where }),
    ]);

    res.json(
      successResponse(users, {
        total,
        page,
        limit,
      })
    );
  } catch (err) {
    next(err);
  }
});

// PATCH /api/admin/users/:id — update user (isActive and/or isVerified)
const AdminUserUpdateSchema = z.object({
  isActive: z.boolean().optional(),
  isVerified: z.boolean().optional(),
});

router.patch("/users/:id", validateBody(AdminUserUpdateSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const targetId = req.params.id as string;
    const { isActive, isVerified } = req.body as z.infer<typeof AdminUserUpdateSchema>;

    // `isActive:false` is a privilege revocation wearing a different name:
    // authenticate.ts rejects every subsequent request from the account with
    // 401, so flipping it on the last super admin bricks /api/admin exactly the
    // way DELETE /users/:id/roles/super_admin would. Same invariant, same
    // error codes — enforced here instead of being routed around.
    if (isActive === false && req.user?.id === targetId) {
      return next(
        new AppError(
          400,
          "Anda tidak dapat menonaktifkan akun Anda sendiri.",
          "SELF_DEACTIVATE_FORBIDDEN",
        ),
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: targetId, deletedAt: null },
      select: { id: true, roles: { select: { role: true, tenantId: true } } },
    });
    if (!user) return next(new AppError(404, "Pengguna tidak ditemukan."));

    const data: Record<string, boolean> = {};
    if (typeof isActive === "boolean") data.isActive = isActive;
    if (typeof isVerified === "boolean") data.isVerified = isVerified;

    const select = { id: true, name: true, email: true, isActive: true, isVerified: true };
    const targetIsGlobalSuperAdmin = user.roles.some(
      (r) => r.role === "super_admin" && r.tenantId === GLOBAL_TENANT_ID,
    );

    // Only a deactivation of an admin can breach the invariant, so ordinary
    // user updates keep the single cheap UPDATE they always had.
    if (isActive === false && targetIsGlobalSuperAdmin) {
      const updated = await runGuarded(async (tx) => {
        if (await wouldLeaveNoSuperAdmin(tx, targetId)) throw lastSuperAdminError();
        return tx.user.update({ where: { id: targetId }, data, select });
      });
      return res.json(successResponse(updated));
    }

    const updated = await prisma.user.update({ where: { id: targetId }, data, select });

    return res.json(successResponse(updated));
  } catch (err) {
    next(err);
  }
});
// ─── Role management ─────────────────────────────────────────────────────────
// Granting a role is what turns a signed-up user into a trainer (or affiliate).
// Before this endpoint existed the only way was a seed script or manual SQL, so
// the public "become a trainer" funnel had no operational completion step.

/**
 * Grantable roles derive from the ROLES single source of truth
 * (src/types/index.ts), so a role added there is accepted here with no edit.
 * "visitor" is excluded: it is the implicit role of a request that has no
 * UserRole row at all, never something an admin assigns.
 */
type GrantableRole = Exclude<Role, "visitor">;
const GRANTABLE_ROLES = ROLES.filter((r): r is GrantableRole => r !== "visitor") as [
  GrantableRole,
  ...GrantableRole[],
];
const RoleValueSchema = z.enum(GRANTABLE_ROLES);
const RoleGrantSchema = z.object({ role: RoleValueSchema });

/** Prisma unique-constraint violation, detected without importing the runtime class. */
function isUniqueViolation(err: unknown): boolean {
  return typeof err === "object" && err !== null && (err as { code?: unknown }).code === "P2002";
}

// POST /api/admin/users/:id/roles — grant a global role to a user.
// Idempotent: re-granting a role the user already has returns 200 with
// `granted: false` instead of 409, so an admin UI can safely replay the call.
router.post(
  "/users/:id/roles",
  validateBody(RoleGrantSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.params.id as string;
      const { role } = req.body as z.infer<typeof RoleGrantSchema>;

      const user = await prisma.user.findUnique({
        where: { id: userId, deletedAt: null },
        select: { id: true, email: true, roles: { select: { role: true, tenantId: true } } },
      });
      if (!user) return next(new AppError(404, "Pengguna tidak ditemukan."));

      const currentRoles = user.roles.map((r) => r.role);
      const hasGlobalRole = user.roles.some(
        (r) => r.role === role && r.tenantId === GLOBAL_TENANT_ID,
      );
      if (hasGlobalRole) {
        return res.json(
          successResponse({ userId: user.id, role, granted: false, roles: currentRoles }),
        );
      }

      try {
        // The existence check and the insert must be one atomic step. The
        // unique index on (userId, role, tenantId) does NOT constrain global
        // roles — Postgres treats NULL tenantId as distinct — so until the
        // partial index from migration 20260729000001 is applied, two
        // simultaneous grants would both pass the check above and both insert,
        // producing duplicate rows that then inflate every super-admin count.
        const granted = await runGuarded(async (tx) => {
          const existing = await tx.userRole.findFirst({
            where: { userId: user.id, role, tenantId: GLOBAL_TENANT_ID },
            select: { id: true },
          });
          if (existing) return false;
          await tx.userRole.create({
            data: { userId: user.id, role, tenantId: GLOBAL_TENANT_ID },
          });
          return true;
        });
        if (!granted) {
          // Someone granted it between the pre-check and the transaction: the
          // end state is what the caller asked for, so report the role as held.
          return res.json(
            successResponse({ userId: user.id, role, granted: false, roles: [...currentRoles, role] }),
          );
        }
      } catch (err) {
        // A concurrent grant won the unique race; the end state is what the
        // caller asked for, so report it as an idempotent no-op.
        if (!isUniqueViolation(err)) throw err;
        return res.json(
          successResponse({ userId: user.id, role, granted: false, roles: [...currentRoles, role] }),
        );
      }

      await writeAudit({
        actorId: req.user!.id,
        actorEmail: req.user!.email,
        action: "USER_ROLE_GRANT",
        resource: "UserRole",
        resourceId: user.id,
        newValue: { role, targetUserId: user.id, targetEmail: user.email },
        ip: req.ip,
        userAgent: req.headers["user-agent"],
      });

      return res
        .status(201)
        .json(successResponse({ userId: user.id, role, granted: true, roles: [...currentRoles, role] }));
    } catch (err) {
      next(err);
    }
  },
);

// DELETE /api/admin/users/:id/roles/:role — revoke a global role from a user.
router.delete("/users/:id/roles/:role", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.params.id as string;
    const parsedRole = RoleValueSchema.safeParse(req.params.role);
    if (!parsedRole.success) {
      return next(new AppError(400, "role: nilai role tidak valid.", "VALIDATION_ERROR"));
    }
    const role = parsedRole.data;

    // Self-lockout guard: an admin must not be able to strip their own
    // super_admin role and lock themselves out of the admin panel.
    if (role === "super_admin" && req.user?.id === userId) {
      return next(
        new AppError(
          400,
          "Anda tidak dapat mencabut role super admin dari akun Anda sendiri.",
          "SELF_ROLE_REVOKE_FORBIDDEN",
        ),
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: userId, deletedAt: null },
      select: { id: true, email: true, roles: { select: { role: true } } },
    });
    if (!user) return next(new AppError(404, "Pengguna tidak ditemukan."));

    // Last-super-admin guard + delete, atomically. Checking outside the
    // transaction was a two-round-trip window in which a concurrent revoke
    // could take the other half of the last admin pair (see runGuarded).
    await runGuarded(async (tx) => {
      if (role === "super_admin" && (await wouldLeaveNoSuperAdmin(tx, user.id))) {
        throw lastSuperAdminError();
      }
      const { count } = await tx.userRole.deleteMany({
        where: { userId: user.id, role, tenantId: GLOBAL_TENANT_ID },
      });
      if (count === 0) throw new AppError(404, "Role tidak ditemukan pada pengguna ini.");
      return count;
    });

    await writeAudit({
      actorId: req.user!.id,
      actorEmail: req.user!.email,
      action: "USER_ROLE_REVOKE",
      resource: "UserRole",
      resourceId: user.id,
      oldValue: { role, targetUserId: user.id, targetEmail: user.email },
      ip: req.ip,
      userAgent: req.headers["user-agent"],
    });

    const roles = user.roles.map((r) => r.role).filter((r) => r !== role);
    return res.json(successResponse({ userId: user.id, role, revoked: true, roles }));
  } catch (err) {
    next(err);
  }
});

// GET /api/admin/users/export — export all active users as CSV
router.get("/users/export", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const users = await prisma.user.findMany({
      where: { deletedAt: null },
      // Hard cap (see CSV_EXPORT_MAX_ROWS): keep the export bounded in memory.
      take: CSV_EXPORT_MAX_ROWS,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        email: true,
        isActive: true,
        isVerified: true,
        createdAt: true,
        roles: { select: { role: true } },
      },
    });

    const csvHeaders = "ID,Nama,Email,Active,Verified,Role,Bergabung\n";
    // csvCell handles quote-escaping AND formula-injection (M2) for every
    // string cell — name/email are user-controlled input.
    const csvRows = users.map((u) => {
      const roles = u.roles.map((r) => r.role).join("; ");
      const joinedDate = u.createdAt.toISOString();
      return [
        csvCell(u.id),
        csvCell(u.name),
        csvCell(u.email),
        u.isActive,
        u.isVerified,
        csvCell(roles),
        joinedDate,
      ].join(",");
    }).join("\n");

    const csvContent = csvHeaders + csvRows;

    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", 'attachment; filename="users-export.csv"');
    return res.send(csvContent);
  } catch (err) {
    next(err);
  }
});

export default router;
