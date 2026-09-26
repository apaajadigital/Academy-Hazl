import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import { app } from "../../../src/app.js";
import jwt from "jsonwebtoken";

vi.mock("../../../src/db/prisma.js", () => ({
  prisma: {
    user: { findUnique: vi.fn(), count: vi.fn(), update: vi.fn() },
    userRole: { create: vi.fn(), deleteMany: vi.fn(), findFirst: vi.fn(), count: vi.fn() },
    auditLog: { create: vi.fn().mockResolvedValue({}) },
    $transaction: vi.fn(),
  },
}));

const { prisma } = await import("../../../src/db/prisma.js");

const VALID_ADMIN = {
  id: "admin-1",
  email: "admin@jago.id",
  isActive: true,
  deletedAt: null,
  roles: [{ role: "super_admin", tenantId: null }],
};

const VALID_USER = {
  id: "user-1",
  email: "user@jago.id",
  isActive: true,
  deletedAt: null,
  roles: [{ role: "student", tenantId: null }],
};

// Target of the role mutations (second `user.findUnique` call in the handler;
// the first one is consumed by `authenticate`).
const TARGET_USER = {
  id: "user-2",
  email: "calon.trainer@jago.id",
  roles: [{ role: "student", tenantId: null }],
};

const TARGET_ADMIN = {
  id: "admin-2",
  email: "admin2@jago.id",
  roles: [{ role: "super_admin", tenantId: null }],
};

const ADMIN_TOKEN = jwt.sign(
  { sub: "admin-1", email: "admin@jago.id", roles: ["super_admin"] },
  process.env.JWT_SECRET!,
  { expiresIn: "15m" }
);

const USER_TOKEN = jwt.sign(
  { sub: "user-1", email: "user@jago.id", roles: ["student"] },
  process.env.JWT_SECRET!,
  { expiresIn: "15m" }
);

const ADMIN_AUTH = { Authorization: `Bearer ${ADMIN_TOKEN}` };
const USER_AUTH = { Authorization: `Bearer ${USER_TOKEN}` };

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(prisma.auditLog.create).mockResolvedValue({} as never);
  // Run the transaction callback against the mocked prisma client (same
  // pattern as test/integration/admin/payouts.test.ts).
  vi.mocked(prisma.$transaction).mockImplementation((cb: unknown) =>
    (cb as (tx: typeof prisma) => Promise<unknown>)(prisma),
  );
});

// ─── Grant ────────────────────────────────────────────────────────────────────

describe("POST /api/admin/users/:id/roles", () => {
  it("grants the trainer role to a user (completes the trainer funnel)", async () => {
    vi.mocked(prisma.user.findUnique)
      .mockResolvedValueOnce(VALID_ADMIN as never) // authenticate
      .mockResolvedValueOnce(TARGET_USER as never); // handler lookup
    vi.mocked(prisma.userRole.findFirst).mockResolvedValue(null);
    vi.mocked(prisma.userRole.create).mockResolvedValue({} as never);

    const res = await request(app)
      .post("/api/admin/users/user-2/roles")
      .set(ADMIN_AUTH)
      .send({ role: "trainer" });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toMatchObject({ userId: "user-2", role: "trainer", granted: true });
    expect(res.body.data.roles).toEqual(["student", "trainer"]);
    // Global roles are stored with tenantId = null.
    expect(prisma.userRole.create).toHaveBeenCalledTimes(1);
    expect(prisma.userRole.create).toHaveBeenCalledWith({
      data: { userId: "user-2", role: "trainer", tenantId: null },
    });
    // Privilege changes must be auditable.
    expect(prisma.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          action: "USER_ROLE_GRANT",
          resource: "UserRole",
          resourceId: "user-2",
          actorId: "admin-1",
        }),
      }),
    );
  });

  it("G5: re-checks existence and inserts inside one serializable transaction", async () => {
    // The (userId, role, tenantId) unique index does not bind global roles
    // (NULL tenantId is DISTINCT in Postgres), so the insert may only be
    // decided inside the transaction that re-reads the row.
    vi.mocked(prisma.user.findUnique)
      .mockResolvedValueOnce(VALID_ADMIN as never)
      .mockResolvedValueOnce(TARGET_USER as never);
    vi.mocked(prisma.userRole.findFirst).mockResolvedValue(null);
    vi.mocked(prisma.userRole.create).mockResolvedValue({} as never);

    await request(app).post("/api/admin/users/user-2/roles").set(ADMIN_AUTH).send({ role: "trainer" });

    expect(prisma.$transaction).toHaveBeenCalledWith(expect.any(Function), {
      isolationLevel: "Serializable",
    });
    expect(prisma.userRole.findFirst).toHaveBeenCalledWith({
      where: { userId: "user-2", role: "trainer", tenantId: null },
      select: { id: true },
    });
  });

  it("G5: a row that appeared between the pre-check and the transaction is a no-op", async () => {
    vi.mocked(prisma.user.findUnique)
      .mockResolvedValueOnce(VALID_ADMIN as never)
      .mockResolvedValueOnce(TARGET_USER as never);
    // Pre-check said "absent", the in-transaction read says "present".
    vi.mocked(prisma.userRole.findFirst).mockResolvedValue({ id: "ur-1" } as never);

    const res = await request(app)
      .post("/api/admin/users/user-2/roles")
      .set(ADMIN_AUTH)
      .send({ role: "trainer" });

    expect(res.status).toBe(200);
    expect(res.body.data.granted).toBe(false);
    expect(prisma.userRole.create).not.toHaveBeenCalled();
  });

  it("is idempotent: re-granting an existing role returns 200 without a write", async () => {
    vi.mocked(prisma.user.findUnique)
      .mockResolvedValueOnce(VALID_ADMIN as never)
      .mockResolvedValueOnce({
        ...TARGET_USER,
        roles: [
          { role: "student", tenantId: null },
          { role: "trainer", tenantId: null },
        ],
      } as never);

    const res = await request(app)
      .post("/api/admin/users/user-2/roles")
      .set(ADMIN_AUTH)
      .send({ role: "trainer" });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.granted).toBe(false);
    expect(prisma.userRole.create).not.toHaveBeenCalled();
  });

  it("does not treat a tenant-scoped role as an existing global role", async () => {
    // A tenant-scoped trainer row must not short-circuit the grant of the
    // platform-wide trainer role — they are different privileges.
    vi.mocked(prisma.user.findUnique)
      .mockResolvedValueOnce(VALID_ADMIN as never)
      .mockResolvedValueOnce({
        ...TARGET_USER,
        roles: [{ role: "trainer", tenantId: "tenant-1" }],
      } as never);
    vi.mocked(prisma.userRole.findFirst).mockResolvedValue(null);
    vi.mocked(prisma.userRole.create).mockResolvedValue({} as never);

    const res = await request(app)
      .post("/api/admin/users/user-2/roles")
      .set(ADMIN_AUTH)
      .send({ role: "trainer" });

    expect(res.status).toBe(201);
    expect(prisma.userRole.create).toHaveBeenCalledWith({
      data: { userId: "user-2", role: "trainer", tenantId: null },
    });
  });

  it("treats a concurrent unique-constraint race as an idempotent no-op", async () => {
    vi.mocked(prisma.user.findUnique)
      .mockResolvedValueOnce(VALID_ADMIN as never)
      .mockResolvedValueOnce(TARGET_USER as never);
    vi.mocked(prisma.userRole.findFirst).mockResolvedValue(null);
    vi.mocked(prisma.userRole.create).mockRejectedValue(
      Object.assign(new Error("Unique constraint failed"), { code: "P2002" }),
    );

    const res = await request(app)
      .post("/api/admin/users/user-2/roles")
      .set(ADMIN_AUTH)
      .send({ role: "trainer" });

    expect(res.status).toBe(200);
    expect(res.body.data.granted).toBe(false);
  });

  it("rejects an unknown role with 400", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(VALID_ADMIN as never);

    const res = await request(app)
      .post("/api/admin/users/user-2/roles")
      .set(ADMIN_AUTH)
      .send({ role: "wizard" });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(prisma.userRole.create).not.toHaveBeenCalled();
  });

  it("returns 404 when the target user does not exist", async () => {
    vi.mocked(prisma.user.findUnique)
      .mockResolvedValueOnce(VALID_ADMIN as never)
      .mockResolvedValueOnce(null);

    const res = await request(app)
      .post("/api/admin/users/missing/roles")
      .set(ADMIN_AUTH)
      .send({ role: "trainer" });

    expect(res.status).toBe(404);
    expect(prisma.userRole.create).not.toHaveBeenCalled();
  });

  it("returns 403 for non-admin users", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(VALID_USER as never);

    const res = await request(app)
      .post("/api/admin/users/user-2/roles")
      .set(USER_AUTH)
      .send({ role: "trainer" });

    expect(res.status).toBe(403);
    expect(prisma.userRole.create).not.toHaveBeenCalled();
  });

  it("returns 401 without auth", async () => {
    const res = await request(app).post("/api/admin/users/user-2/roles").send({ role: "trainer" });

    expect(res.status).toBe(401);
    expect(prisma.userRole.create).not.toHaveBeenCalled();
  });
});

// ─── Revoke ───────────────────────────────────────────────────────────────────

describe("DELETE /api/admin/users/:id/roles/:role", () => {
  it("revokes the trainer role from a user", async () => {
    vi.mocked(prisma.user.findUnique)
      .mockResolvedValueOnce(VALID_ADMIN as never)
      .mockResolvedValueOnce({ ...TARGET_USER, roles: [{ role: "student" }, { role: "trainer" }] } as never);
    vi.mocked(prisma.userRole.deleteMany).mockResolvedValue({ count: 1 } as never);

    const res = await request(app)
      .delete("/api/admin/users/user-2/roles/trainer")
      .set(ADMIN_AUTH);

    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ userId: "user-2", role: "trainer", revoked: true });
    expect(res.body.data.roles).toEqual(["student"]);
    expect(prisma.userRole.deleteMany).toHaveBeenCalledWith({
      where: { userId: "user-2", role: "trainer", tenantId: null },
    });
    expect(prisma.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ action: "USER_ROLE_REVOKE", resourceId: "user-2" }),
      }),
    );
  });

  it("G4: guard + delete run inside one serializable transaction", async () => {
    // Two admins revoking each other concurrently both read "2 remaining" when
    // the check sits outside the transaction, and both commit.
    vi.mocked(prisma.user.findUnique)
      .mockResolvedValueOnce(VALID_ADMIN as never)
      .mockResolvedValueOnce(TARGET_ADMIN as never);
    vi.mocked(prisma.user.count)
      .mockResolvedValueOnce(1) // target is an active super admin
      .mockResolvedValueOnce(2); // two others remain
    vi.mocked(prisma.userRole.deleteMany).mockResolvedValue({ count: 1 } as never);

    const res = await request(app)
      .delete("/api/admin/users/admin-2/roles/super_admin")
      .set(ADMIN_AUTH);

    expect(res.status).toBe(200);
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(prisma.$transaction).toHaveBeenCalledWith(expect.any(Function), {
      isolationLevel: "Serializable",
    });
    // The delete is the callback's work, i.e. it happened inside the tx.
    expect(prisma.userRole.deleteMany).toHaveBeenCalledTimes(1);
  });

  it("refuses self-revocation of super_admin (lockout guard)", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(VALID_ADMIN as never);

    const res = await request(app)
      .delete("/api/admin/users/admin-1/roles/super_admin")
      .set(ADMIN_AUTH);

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe("SELF_ROLE_REVOKE_FORBIDDEN");
    expect(prisma.userRole.deleteMany).not.toHaveBeenCalled();
  });

  it("refuses to remove the last remaining super_admin", async () => {
    vi.mocked(prisma.user.findUnique)
      .mockResolvedValueOnce(VALID_ADMIN as never)
      .mockResolvedValueOnce(TARGET_ADMIN as never);
    vi.mocked(prisma.user.count)
      .mockResolvedValueOnce(1) // target is an active super admin
      .mockResolvedValueOnce(0); // nobody else is
    vi.mocked(prisma.userRole.deleteMany).mockResolvedValue({ count: 1 } as never);

    const res = await request(app)
      .delete("/api/admin/users/admin-2/roles/super_admin")
      .set(ADMIN_AUTH);

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe("LAST_SUPER_ADMIN");
    expect(prisma.userRole.deleteMany).not.toHaveBeenCalled();
  });

  it("G3: counts PEOPLE, excluding tenant-scoped, inactive and soft-deleted rows", async () => {
    vi.mocked(prisma.user.findUnique)
      .mockResolvedValueOnce(VALID_ADMIN as never)
      .mockResolvedValueOnce(TARGET_ADMIN as never);
    vi.mocked(prisma.user.count).mockResolvedValueOnce(1).mockResolvedValueOnce(0);

    await request(app).delete("/api/admin/users/admin-2/roles/super_admin").set(ADMIN_AUTH);

    // Counting `user` rows (not `userRole` rows) is what makes duplicate role
    // rows unable to inflate the number.
    expect(prisma.userRole.count).not.toHaveBeenCalled();
    expect(prisma.user.count).toHaveBeenNthCalledWith(1, {
      where: {
        deletedAt: null,
        isActive: true,
        roles: { some: { role: "super_admin", tenantId: null } },
        id: "admin-2",
      },
    });
    expect(prisma.user.count).toHaveBeenNthCalledWith(2, {
      where: {
        deletedAt: null,
        isActive: true,
        roles: { some: { role: "super_admin", tenantId: null } },
        id: { not: "admin-2" },
      },
    });
  });

  it("returns 404 when the user does not hold that role", async () => {
    vi.mocked(prisma.user.findUnique)
      .mockResolvedValueOnce(VALID_ADMIN as never)
      .mockResolvedValueOnce(TARGET_USER as never);
    vi.mocked(prisma.userRole.deleteMany).mockResolvedValue({ count: 0 } as never);

    const res = await request(app)
      .delete("/api/admin/users/user-2/roles/trainer")
      .set(ADMIN_AUTH);

    expect(res.status).toBe(404);
    expect(prisma.auditLog.create).not.toHaveBeenCalled();
  });

  it("returns 409 (not 500) when the serializable transaction keeps conflicting", async () => {
    vi.mocked(prisma.user.findUnique)
      .mockResolvedValueOnce(VALID_ADMIN as never)
      .mockResolvedValueOnce(TARGET_USER as never);
    vi.mocked(prisma.$transaction).mockRejectedValue(
      Object.assign(new Error("Transaction failed due to a write conflict"), { code: "P2034" }),
    );

    const res = await request(app)
      .delete("/api/admin/users/user-2/roles/trainer")
      .set(ADMIN_AUTH);

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe("CONCURRENT_ROLE_UPDATE");
    // Retried a bounded number of times rather than failing on first conflict.
    expect(prisma.$transaction).toHaveBeenCalledTimes(3);
  });

  it("rejects an unknown role with 400", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(VALID_ADMIN as never);

    const res = await request(app).delete("/api/admin/users/user-2/roles/wizard").set(ADMIN_AUTH);

    expect(res.status).toBe(400);
    expect(prisma.userRole.deleteMany).not.toHaveBeenCalled();
  });

  it("returns 403 for non-admin users", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(VALID_USER as never);

    const res = await request(app).delete("/api/admin/users/user-2/roles/trainer").set(USER_AUTH);

    expect(res.status).toBe(403);
    expect(prisma.userRole.deleteMany).not.toHaveBeenCalled();
  });
});

// ─── G1: the same invariant on the deactivation path ─────────────────────────
// PATCH {isActive:false} is an equivalent way to strip admin access:
// authenticate.ts 401s an inactive account, and every endpoint that could undo
// it sits behind requireAdmin.

describe("PATCH /api/admin/users/:id — super-admin lockout guard", () => {
  it("refuses to deactivate the last active super_admin", async () => {
    vi.mocked(prisma.user.findUnique)
      .mockResolvedValueOnce(VALID_ADMIN as never)
      .mockResolvedValueOnce(TARGET_ADMIN as never);
    vi.mocked(prisma.user.count)
      .mockResolvedValueOnce(1) // target is an active super admin
      .mockResolvedValueOnce(0); // no other active super admin
    vi.mocked(prisma.user.update).mockResolvedValue({} as never);

    const res = await request(app)
      .patch("/api/admin/users/admin-2")
      .set(ADMIN_AUTH)
      .send({ isActive: false });

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe("LAST_SUPER_ADMIN");
    expect(prisma.user.update).not.toHaveBeenCalled();
  });

  it("refuses self-deactivation", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(VALID_ADMIN as never);

    const res = await request(app)
      .patch("/api/admin/users/admin-1")
      .set(ADMIN_AUTH)
      .send({ isActive: false });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("SELF_DEACTIVATE_FORBIDDEN");
    expect(prisma.user.update).not.toHaveBeenCalled();
  });

  it("allows deactivating a super_admin while another active one remains", async () => {
    vi.mocked(prisma.user.findUnique)
      .mockResolvedValueOnce(VALID_ADMIN as never)
      .mockResolvedValueOnce(TARGET_ADMIN as never);
    vi.mocked(prisma.user.count)
      .mockResolvedValueOnce(1) // target is an active super admin
      .mockResolvedValueOnce(1); // one other remains
    vi.mocked(prisma.user.update).mockResolvedValue({
      id: "admin-2",
      name: "Admin Dua",
      email: "admin2@jago.id",
      isActive: false,
      isVerified: true,
    } as never);

    const res = await request(app)
      .patch("/api/admin/users/admin-2")
      .set(ADMIN_AUTH)
      .send({ isActive: false });

    expect(res.status).toBe(200);
    expect(res.body.data.isActive).toBe(false);
    // Check + write are one atomic decision here too.
    expect(prisma.$transaction).toHaveBeenCalledWith(expect.any(Function), {
      isolationLevel: "Serializable",
    });
  });

  it("does not pay for a transaction when the target is not a super_admin", async () => {
    vi.mocked(prisma.user.findUnique)
      .mockResolvedValueOnce(VALID_ADMIN as never)
      .mockResolvedValueOnce(TARGET_USER as never);
    vi.mocked(prisma.user.update).mockResolvedValue({
      id: "user-2",
      name: "Calon Trainer",
      email: "calon.trainer@jago.id",
      isActive: false,
      isVerified: false,
    } as never);

    const res = await request(app)
      .patch("/api/admin/users/user-2")
      .set(ADMIN_AUTH)
      .send({ isActive: false });

    expect(res.status).toBe(200);
    expect(prisma.$transaction).not.toHaveBeenCalled();
    expect(prisma.user.count).not.toHaveBeenCalled();
  });

  it("ignores the guard for a tenant-scoped super_admin row", async () => {
    // Tenant-scoped roles are a different privilege and are not part of the
    // protected population.
    vi.mocked(prisma.user.findUnique)
      .mockResolvedValueOnce(VALID_ADMIN as never)
      .mockResolvedValueOnce({
        id: "admin-3",
        roles: [{ role: "super_admin", tenantId: "tenant-1" }],
      } as never);
    vi.mocked(prisma.user.update).mockResolvedValue({
      id: "admin-3",
      name: "Tenant Admin",
      email: "tenant.admin@jago.id",
      isActive: false,
      isVerified: true,
    } as never);

    const res = await request(app)
      .patch("/api/admin/users/admin-3")
      .set(ADMIN_AUTH)
      .send({ isActive: false });

    expect(res.status).toBe(200);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });
});
