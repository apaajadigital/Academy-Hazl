-- Global-role uniqueness for "user_roles" (super-admin lockout hardening).
--
-- WHY: the init migration created
--   CREATE UNIQUE INDEX "user_roles_userId_role_tenantId_key"
--     ON "user_roles"("userId", "role", "tenantId");
-- and Postgres treats NULLs as DISTINCT in a unique index. Global (platform-
-- wide) roles are stored with "tenantId" IS NULL, so that constraint does NOT
-- bind them: two concurrent POST /api/admin/users/:id/roles both pass the
-- "already has the role?" check and both INSERT, with no P2002 raised. The
-- duplicate rows then inflate any count of super admins, which is precisely
-- what the last-super-admin guard relies on. A partial unique index is the
-- only way to make the constraint apply to the NULL-tenant rows.
--
-- SCHEMA DRIFT (deliberate, read before regenerating): Prisma's schema DSL
-- cannot express a partial (WHERE ...) index, so this index does not appear in
-- prisma/schema.prisma. `prisma migrate diff` / `prisma migrate dev` will
-- therefore report drift and will try to DROP it. Do not let it: keep this
-- migration, and re-add the index by hand in any future baseline/squash.
--
-- NOTE: not yet applied (no DB available in this environment). Apply with
-- `prisma migrate deploy` only after a human reviewer approves (SSOT §9.6).
-- PRE-FLIGHT: creation fails if duplicate global rows already exist. Check
-- first, and have a human decide which row survives before deleting anything:
--   SELECT "userId", "role", COUNT(*)
--     FROM "user_roles" WHERE "tenantId" IS NULL
--    GROUP BY "userId", "role" HAVING COUNT(*) > 1;

-- CreateIndex
CREATE UNIQUE INDEX "user_roles_userId_role_global_key"
  ON "user_roles"("userId", "role")
  WHERE "tenantId" IS NULL;
