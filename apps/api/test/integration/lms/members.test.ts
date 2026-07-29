import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import { app } from "../../../src/app.js";

// Roles are mutable so a single file can cover both the super-admin happy path
// and the "not an admin of this tenant" 403 path.
const authState = vi.hoisted(() => ({ roles: ["super_admin"] as string[] }));

vi.mock("../../../src/db/prisma.js", () => ({
  prisma: {
    userRole: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      upsert: vi.fn(),
    },
    lmsBatchMember: {
      findMany: vi.fn(),
    },
    user: {
      findUnique: vi.fn(),
    },
  },
}));

vi.mock("../../../src/middleware/authenticate.js", () => ({
  authenticate: vi.fn((req, _res, next) => {
    req.user = { id: "admin-1", email: "admin@test.com", name: "Admin", roles: authState.roles };
    next();
  }),
}));

const { prisma } = await import("../../../src/db/prisma.js");

const alice = { id: "user-a", name: "Alice", email: "alice@test.com" };
const bob = { id: "user-b", name: "Bob", email: "bob@test.com" };
const charlie = { id: "user-c", name: "Charlie", email: "charlie@test.com" };

beforeEach(() => {
  vi.clearAllMocks();
  authState.roles = ["super_admin"];
  vi.mocked(prisma.userRole.findFirst).mockResolvedValue(null);
  vi.mocked(prisma.userRole.findMany).mockResolvedValue([
    { role: "lms_admin", user: alice },
    { role: "lms_employee", user: bob },
  ] as never);
  vi.mocked(prisma.lmsBatchMember.findMany).mockResolvedValue([
    // Alice also sits in a batch — the admin role must still win.
    { user: alice },
    { user: bob },
    { user: charlie },
  ] as never);
  vi.mocked(prisma.userRole.upsert).mockResolvedValue({} as never);
  vi.mocked(prisma.user.findUnique).mockResolvedValue({ id: "user-a" } as never);
});

describe("GET /api/lms/tenants/:tenantId/members", () => {
  it("merges role grants and batch members, deduped, admin wins", async () => {
    const res = await request(app).get("/api/lms/tenants/tenant-1/members");
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveLength(3);
    expect(res.body.data[0]).toMatchObject({ id: "user-a", email: "alice@test.com", role: "lms_admin" });
    expect(res.body.data[1]).toMatchObject({ id: "user-b", role: "lms_employee" });
    expect(res.body.data[2]).toMatchObject({ id: "user-c", role: "lms_employee" });
  });

  it("scopes both queries to the tenant", async () => {
    await request(app).get("/api/lms/tenants/tenant-1/members");
    expect(prisma.userRole.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { tenantId: "tenant-1", role: { in: ["lms_admin", "lms_employee"] } },
      }),
    );
    expect(prisma.lmsBatchMember.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { batch: { tenantId: "tenant-1" } } }),
    );
  });

  it("returns 403 when caller is neither super admin nor tenant admin", async () => {
    authState.roles = ["student"];
    vi.mocked(prisma.userRole.findFirst).mockResolvedValue(null);
    const res = await request(app).get("/api/lms/tenants/tenant-1/members");
    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });
});

describe("POST /api/lms/tenants/:tenantId/admins", () => {
  it("assigns admin role by email when the user exists", async () => {
    const res = await request(app)
      .post("/api/lms/tenants/tenant-1/admins")
      .send({ email: "Alice@Test.com" });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(prisma.user.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { email: "alice@test.com" } }),
    );
    expect(prisma.userRole.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId_role_tenantId: { userId: "user-a", role: "lms_admin", tenantId: "tenant-1" } },
      }),
    );
  });

  it("returns 404 when no user matches the email", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null);
    const res = await request(app)
      .post("/api/lms/tenants/tenant-1/admins")
      .send({ email: "ghost@test.com" });
    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
    expect(prisma.userRole.upsert).not.toHaveBeenCalled();
  });

  it("returns 400 when body has neither userId nor email", async () => {
    const res = await request(app).post("/api/lms/tenants/tenant-1/admins").send({});
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });
});
