import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import { app } from "../../../src/app.js";
import jwt from "jsonwebtoken";

vi.mock("../../../src/db/prisma.js", () => ({
  prisma: {
    user: { findUnique: vi.fn(), findMany: vi.fn(), count: vi.fn(), update: vi.fn() },
  },
}));

const { prisma } = await import("../../../src/db/prisma.js");

const VALID_ADMIN = {
  id: "admin-1",
  email: "admin@jago.id",
  isActive: true,
  deletedAt: null,
  roles: [{ role: "super_admin" }],
};

const ADMIN_TOKEN = jwt.sign(
  { sub: "admin-1", email: "admin@jago.id", roles: ["super_admin"] },
  process.env.JWT_SECRET!,
  { expiresIn: "15m" }
);

const ADMIN_AUTH = { Authorization: `Bearer ${ADMIN_TOKEN}` };

const EXPORT_USER = {
  id: "user-1",
  name: "Budi Santoso",
  email: "budi@example.com",
  isActive: true,
  isVerified: false,
  createdAt: new Date("2026-01-15T00:00:00.000Z"),
  roles: [{ role: "student" }, { role: "trainer" }],
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(prisma.user.findUnique).mockResolvedValue(VALID_ADMIN as never);
});

describe("GET /api/admin/users/export", () => {
  it("returns CSV with header row, joined roles, and booleans", async () => {
    vi.mocked(prisma.user.findMany).mockResolvedValue([EXPORT_USER] as never);

    const res = await request(app).get("/api/admin/users/export").set(ADMIN_AUTH);

    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toContain("text/csv");
    expect(res.headers["content-disposition"]).toBe('attachment; filename="users-export.csv"');
    const lines = res.text.split("\n");
    expect(lines[0]).toBe("ID,Nama,Email,Active,Verified,Role,Bergabung");
    expect(lines[1]).toContain('"student; trainer"');
    expect(lines[1]).toContain("true,false");
    expect(lines[1]).toContain("2026-01-15T00:00:00.000Z");
  });

  it("only exports non-deleted users, capped at 10k rows", async () => {
    vi.mocked(prisma.user.findMany).mockResolvedValue([] as never);

    const res = await request(app).get("/api/admin/users/export").set(ADMIN_AUTH);

    expect(res.status).toBe(200);
    expect(vi.mocked(prisma.user.findMany).mock.calls[0]![0]).toEqual(
      expect.objectContaining({ where: { deletedAt: null }, take: 10000 })
    );
  });

  it("neutralizes formula injection in user name (M2)", async () => {
    vi.mocked(prisma.user.findMany).mockResolvedValue([
      { ...EXPORT_USER, name: '=HYPERLINK("x")' },
    ] as never);

    const res = await request(app).get("/api/admin/users/export").set(ADMIN_AUTH);

    expect(res.status).toBe(200);
    expect(res.text).toContain('"\'=HYPERLINK(""x"")"');
    expect(res.text).not.toContain('"=HYPERLINK');
  });
});

describe("GET /api/admin/users (query validation)", () => {
  it("builds a name/email OR filter for search", async () => {
    vi.mocked(prisma.user.findMany).mockResolvedValue([] as never);
    vi.mocked(prisma.user.count).mockResolvedValue(0);

    const res = await request(app)
      .get("/api/admin/users")
      .query({ search: "budi" })
      .set(ADMIN_AUTH);

    expect(res.status).toBe(200);
    expect(vi.mocked(prisma.user.findMany).mock.calls[0]![0]!.where).toEqual({
      deletedAt: null,
      OR: [
        { name: { contains: "budi", mode: "insensitive" } },
        { email: { contains: "budi", mode: "insensitive" } },
      ],
    });
  });

  it("rejects an out-of-range limit (400)", async () => {
    const res = await request(app)
      .get("/api/admin/users")
      .query({ limit: 1000 })
      .set(ADMIN_AUTH);

    expect(res.status).toBe(400);
    expect(prisma.user.findMany).not.toHaveBeenCalled();
  });

  it("filters by role via a roles.some clause", async () => {
    vi.mocked(prisma.user.findMany).mockResolvedValue([] as never);
    vi.mocked(prisma.user.count).mockResolvedValue(0);

    const res = await request(app)
      .get("/api/admin/users")
      .query({ role: "trainer" })
      .set(ADMIN_AUTH);

    expect(res.status).toBe(200);
    expect(vi.mocked(prisma.user.findMany).mock.calls[0]![0]!.where).toEqual({
      deletedAt: null,
      // Scoped to global grants (BL-78b) so the listing reflects the roles a
      // session would actually get, not tenant-only grants that never apply.
      roles: { some: { role: "trainer", tenantId: null } },
    });
  });

  it("rejects an unknown role value (400)", async () => {
    const res = await request(app)
      .get("/api/admin/users")
      .query({ role: "hacker" })
      .set(ADMIN_AUTH);

    expect(res.status).toBe(400);
    expect(prisma.user.findMany).not.toHaveBeenCalled();
  });
});

describe("PATCH /api/admin/users/:id", () => {
  it("updates isActive and isVerified", async () => {
    // First findUnique authenticates the admin, second one loads the target user.
    vi.mocked(prisma.user.findUnique)
      .mockResolvedValueOnce(VALID_ADMIN as never)
      // `roles` is now selected too: the handler must know whether the target
      // holds the global super_admin role before it may deactivate them.
      .mockResolvedValueOnce({ id: "user-1", deletedAt: null, roles: [] } as never);
    vi.mocked(prisma.user.update).mockResolvedValue({
      id: "user-1",
      name: "Budi",
      email: "budi@example.com",
      isActive: false,
      isVerified: true,
    } as never);

    const res = await request(app)
      .patch("/api/admin/users/user-1")
      .set(ADMIN_AUTH)
      .send({ isActive: false, isVerified: true });

    expect(res.status).toBe(200);
    expect(res.body.data.isActive).toBe(false);
    expect(prisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "user-1" },
        data: { isActive: false, isVerified: true },
      })
    );
  });

  it("returns 404 when the user does not exist", async () => {
    vi.mocked(prisma.user.findUnique)
      .mockResolvedValueOnce(VALID_ADMIN as never)
      .mockResolvedValueOnce(null);

    const res = await request(app)
      .patch("/api/admin/users/missing")
      .set(ADMIN_AUTH)
      .send({ isActive: true });

    expect(res.status).toBe(404);
    expect(prisma.user.update).not.toHaveBeenCalled();
  });
});
