import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";

/**
 * G2: DELETE /api/users/me sets `isActive:false` + `deletedAt`, which removes
 * the caller from the active-super-admin population exactly like an admin
 * revoking their role would — but this endpoint only ran `authenticate`, so the
 * last super admin could erase themselves and drop the admin count to zero with
 * no endpoint left to recover (every recovery path is behind requireAdmin).
 */
vi.mock("../../../src/db/prisma.js", () => ({
  prisma: {
    user: { count: vi.fn(), update: vi.fn() },
    userProfile: { updateMany: vi.fn() },
    refreshToken: { updateMany: vi.fn() },
    $transaction: vi.fn(),
  },
}));

vi.mock("../../../src/middleware/authenticate.js", () => ({
  authenticate: vi.fn((req, _res, next) => {
    req.user = { id: "admin-1", email: "admin@jago.id", roles: ["super_admin"] };
    next();
  }),
}));

vi.mock("../../../src/services/audit/log.js", () => ({
  writeAudit: vi.fn().mockResolvedValue(undefined),
}));

const { app } = await import("../../../src/app.js");
const { prisma } = await import("../../../src/db/prisma.js");

const p = prisma as unknown as {
  user: { count: ReturnType<typeof vi.fn>; update: ReturnType<typeof vi.fn> };
  userProfile: { updateMany: ReturnType<typeof vi.fn> };
  refreshToken: { updateMany: ReturnType<typeof vi.fn> };
  $transaction: ReturnType<typeof vi.fn>;
};

beforeEach(() => {
  vi.clearAllMocks();
  p.$transaction.mockImplementation((cb: unknown) =>
    (cb as (tx: typeof prisma) => Promise<unknown>)(prisma),
  );
  p.user.update.mockResolvedValue({ id: "admin-1" });
  p.userProfile.updateMany.mockResolvedValue({ count: 1 });
  p.refreshToken.updateMany.mockResolvedValue({ count: 1 });
});

describe("DELETE /api/users/me — super-admin lockout guard", () => {
  it("refuses self-delete by the last active super admin", async () => {
    p.user.count
      .mockResolvedValueOnce(1) // caller is an active global super admin
      .mockResolvedValueOnce(0); // nobody else is

    const res = await request(app).delete("/api/users/me");

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe("LAST_SUPER_ADMIN");
    // Nothing was anonymized — the transaction rolled back before any write.
    expect(p.user.update).not.toHaveBeenCalled();
    expect(p.refreshToken.updateMany).not.toHaveBeenCalled();
  });

  it("allows self-delete when another active super admin remains", async () => {
    p.user.count.mockResolvedValueOnce(1).mockResolvedValueOnce(2);

    const res = await request(app).delete("/api/users/me");

    expect(res.status).toBe(200);
    expect(res.body.data.message).toMatch(/dihapus/i);
    expect(p.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "admin-1" },
        data: expect.objectContaining({ isActive: false, deletedAt: expect.any(Date) }),
      }),
    );
  });

  it("allows self-delete for a non-admin without a second count query", async () => {
    p.user.count.mockResolvedValueOnce(0); // caller holds no global super_admin

    const res = await request(app).delete("/api/users/me");

    expect(res.status).toBe(200);
    expect(p.user.count).toHaveBeenCalledTimes(1);
    expect(p.user.update).toHaveBeenCalled();
  });

  it("uses the same protected predicate as the role-revoke guard (G3)", async () => {
    p.user.count.mockResolvedValueOnce(1).mockResolvedValueOnce(1);

    await request(app).delete("/api/users/me");

    // Active, not soft-deleted, GLOBAL super_admin — counted per user, so a
    // duplicate or tenant-scoped role row cannot inflate it.
    expect(p.user.count).toHaveBeenNthCalledWith(1, {
      where: {
        deletedAt: null,
        isActive: true,
        roles: { some: { role: "super_admin", tenantId: null } },
        id: "admin-1",
      },
    });
    expect(p.user.count).toHaveBeenNthCalledWith(2, {
      where: {
        deletedAt: null,
        isActive: true,
        roles: { some: { role: "super_admin", tenantId: null } },
        id: { not: "admin-1" },
      },
    });
    expect(p.$transaction).toHaveBeenCalledWith(expect.any(Function), {
      isolationLevel: "Serializable",
    });
  });
});
