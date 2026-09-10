import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import { app } from "../../../src/app.js";

// Roles are mutable so a single file can cover the super-admin path, the
// per-tenant lms_admin path and the "administers a different tenant" 403.
const authState = vi.hoisted(() => ({ id: "admin-1", roles: ["super_admin"] as string[] }));

vi.mock("../../../src/db/prisma.js", () => ({
  prisma: {
    lmsBatch: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    lmsBatchMember: {
      findMany: vi.fn(),
    },
    userRole: {
      findFirst: vi.fn(),
    },
  },
}));

vi.mock("../../../src/middleware/authenticate.js", () => ({
  authenticate: vi.fn((req, _res, next) => {
    req.user = { id: authState.id, email: "admin@test.com", name: "Admin", roles: authState.roles };
    next();
  }),
}));

const { prisma } = await import("../../../src/db/prisma.js");

// ─── Two-tenant fixture ───────────────────────────────────────────────────────
// tenant-b rows exist on purpose. With a single-tenant `mockResolvedValue` the
// same array comes back whether or not the handler passed `tenantId`, so such a
// test can never fail on a missing scope — it only proves the route returns 200.

const DAY = 24 * 60 * 60 * 1000;
// Relative, never a date literal: a hardcoded date measured against "now" is
// exactly what turned main red on 10 Sep 2026 (BL-166).
const createdAt = new Date(Date.now() - 10 * DAY);
const joinedAt = new Date(Date.now() - 5 * DAY);
const startDateIso = new Date(Date.now() + 7 * DAY).toISOString();
const endDateIso = new Date(Date.now() + 37 * DAY).toISOString();

const BATCHES = [
  { id: "batch-a1", tenantId: "tenant-a", name: "Angkatan 1", isActive: true, createdAt },
  { id: "batch-a2", tenantId: "tenant-a", name: "Angkatan 2", isActive: false, createdAt },
  { id: "batch-b1", tenantId: "tenant-b", name: "Rahasia Tenant B", isActive: true, createdAt },
];

const BATCH_MEMBERS = [
  {
    batchId: "batch-a1",
    userId: "user-alice",
    joinedAt,
    user: { id: "user-alice", name: "Alice", email: "alice@tenant-a.test" },
  },
  {
    batchId: "batch-a1",
    userId: "user-bob",
    joinedAt,
    user: { id: "user-bob", name: "Bob", email: "bob@tenant-a.test" },
  },
  {
    batchId: "batch-b1",
    userId: "user-dave",
    joinedAt,
    user: { id: "user-dave", name: "Dave", email: "dave@tenant-b.test" },
  },
];

type BatchFindManyArgs = { where?: { tenantId?: string } };
type BatchFindFirstArgs = { where?: { id?: string; tenantId?: string } };
type BatchCreateArgs = { data: Record<string, unknown> };
type BatchUpdateArgs = { where: { id: string }; data: Record<string, unknown> };
type MemberFindManyArgs = { where?: { batchId?: string } };

beforeEach(() => {
  vi.clearAllMocks();
  authState.id = "admin-1";
  authState.roles = ["super_admin"];

  // Each mock FILTERS the fixture the way Postgres would, so an unscoped query
  // yields foreign rows and the content assertions fail.
  vi.mocked(prisma.lmsBatch.findMany).mockImplementation((((args: BatchFindManyArgs) =>
    Promise.resolve(
      BATCHES.filter((b) => args.where?.tenantId === undefined || b.tenantId === args.where.tenantId).map(
        (b) => ({ ...b, _count: { members: 2, assignments: 1 } }),
      ),
    )) as unknown) as never);

  vi.mocked(prisma.lmsBatch.findFirst).mockImplementation((((args: BatchFindFirstArgs) =>
    Promise.resolve(
      BATCHES.find(
        (b) =>
          (args.where?.id === undefined || b.id === args.where.id) &&
          (args.where?.tenantId === undefined || b.tenantId === args.where.tenantId),
      ) ?? null,
    )) as unknown) as never);

  vi.mocked(prisma.lmsBatch.create).mockImplementation((((args: BatchCreateArgs) =>
    Promise.resolve({ id: "batch-new", createdAt, ...args.data })) as unknown) as never);

  vi.mocked(prisma.lmsBatch.update).mockImplementation((((args: BatchUpdateArgs) =>
    Promise.resolve({
      ...(BATCHES.find((b) => b.id === args.where.id) ?? {}),
      ...args.data,
    })) as unknown) as never);

  // Mirrors the real query: `lmsBatchMember` carries no tenantId column, so the
  // route can only filter by batchId. The tenant guard is the sole protection.
  vi.mocked(prisma.lmsBatchMember.findMany).mockImplementation((((args: MemberFindManyArgs) =>
    Promise.resolve(BATCH_MEMBERS.filter((m) => m.batchId === args.where?.batchId))) as unknown) as never);

  vi.mocked(prisma.userRole.findFirst).mockResolvedValue(null);
});

// ─── GET /tenants/:tenantId/batches ───────────────────────────────────────────

describe("GET /api/lms/tenants/:tenantId/batches", () => {
  it("lists only the addressed tenant's batches", async () => {
    const res = await request(app).get("/api/lms/tenants/tenant-a/batches");
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.map((b: { id: string }) => b.id)).toEqual(["batch-a1", "batch-a2"]);
    // Asserting on the payload, not just the status: a handler that dropped the
    // scope would still answer 200 — with tenant-b's batch names in the body.
    expect(res.body.data.map((b: { name: string }) => b.name)).not.toContain("Rahasia Tenant B");
  });

  it("scopes the query to the tenant and orders newest first", async () => {
    await request(app).get("/api/lms/tenants/tenant-a/batches");
    // Exact `where` (not objectContaining) so a widened scope is caught.
    expect(prisma.lmsBatch.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { tenantId: "tenant-a" }, orderBy: { createdAt: "desc" } }),
    );
  });

  it("includes member and assignment counts for the batch cards", async () => {
    const res = await request(app).get("/api/lms/tenants/tenant-a/batches");
    expect(res.body.data[0]._count).toEqual({ members: 2, assignments: 1 });
    expect(prisma.lmsBatch.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ include: { _count: { select: { members: true, assignments: true } } } }),
    );
  });

  it("returns an empty array for a tenant with no batches", async () => {
    const res = await request(app).get("/api/lms/tenants/tenant-empty/batches");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ success: true, data: [] });
  });

  it("allows a tenant lms_admin and looks the grant up scoped to that tenant", async () => {
    authState.roles = ["corporate_client"];
    vi.mocked(prisma.userRole.findFirst).mockResolvedValue({ id: "role-1" } as never);
    const res = await request(app).get("/api/lms/tenants/tenant-a/batches");
    expect(res.status).toBe(200);
    // A grant for ANY tenant must not open every tenant's batch list.
    expect(prisma.userRole.findFirst).toHaveBeenCalledWith({
      where: { userId: "admin-1", role: "lms_admin", tenantId: "tenant-a" },
    });
  });

  it("returns 403 and runs no query when the caller administers another tenant", async () => {
    authState.roles = ["corporate_client"];
    const res = await request(app).get("/api/lms/tenants/tenant-b/batches");
    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
    // The guard must short-circuit BEFORE the read, not filter after it.
    expect(prisma.lmsBatch.findMany).not.toHaveBeenCalled();
  });

  it("lets a super admin through without a per-tenant role lookup", async () => {
    const res = await request(app).get("/api/lms/tenants/tenant-a/batches");
    expect(res.status).toBe(200);
    expect(prisma.userRole.findFirst).not.toHaveBeenCalled();
  });

  it("converts a database failure into a 500 envelope without leaking the driver error", async () => {
    // The handler forwards to `next(err)`; if it ever swallowed the rejection the
    // request would hang instead. The message must stay generic — a raw Prisma
    // error carries table and column names straight to the client.
    vi.mocked(prisma.lmsBatch.findMany).mockRejectedValue(
      new Error("connect ECONNREFUSED 10.0.0.5:5432 lms_batch"),
    );
    const res = await request(app).get("/api/lms/tenants/tenant-a/batches");
    expect(res.status).toBe(500);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe("INTERNAL_ERROR");
    expect(JSON.stringify(res.body)).not.toContain("ECONNREFUSED");
  });
});

// ─── POST /tenants/:tenantId/batches ──────────────────────────────────────────

describe("POST /api/lms/tenants/:tenantId/batches", () => {
  it("creates a batch owned by the tenant in the URL", async () => {
    const res = await request(app)
      .post("/api/lms/tenants/tenant-a/batches")
      .send({ name: "Angkatan 3", description: "Onboarding Q3", startDate: startDateIso, endDate: endDateIso });
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(prisma.lmsBatch.create).toHaveBeenCalledWith({
      data: {
        name: "Angkatan 3",
        description: "Onboarding Q3",
        startDate: startDateIso,
        endDate: endDateIso,
        isActive: true,
        tenantId: "tenant-a",
      },
    });
  });

  it("ignores a tenantId smuggled in the request body", async () => {
    // The only trustworthy tenant is the one in the path, because that is the one
    // `requireLmsAdmin` authorised. If the body could override it, any tenant
    // admin could plant a batch inside another company's LMS.
    const res = await request(app)
      .post("/api/lms/tenants/tenant-a/batches")
      .send({ name: "Angkatan 3", tenantId: "tenant-b" });
    expect(res.status).toBe(201);
    expect(prisma.lmsBatch.create).toHaveBeenCalledWith({
      data: { name: "Angkatan 3", isActive: true, tenantId: "tenant-a" },
    });
    expect(res.body.data.tenantId).toBe("tenant-a");
  });

  it("defaults isActive to true when omitted", async () => {
    await request(app).post("/api/lms/tenants/tenant-a/batches").send({ name: "Angkatan 3" });
    expect(prisma.lmsBatch.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ isActive: true }) }),
    );
  });

  it("honours an explicit isActive false", async () => {
    await request(app)
      .post("/api/lms/tenants/tenant-a/batches")
      .send({ name: "Angkatan 3", isActive: false });
    expect(prisma.lmsBatch.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ isActive: false }) }),
    );
  });

  it("returns 400 and writes nothing when name is missing", async () => {
    const res = await request(app).post("/api/lms/tenants/tenant-a/batches").send({});
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
    expect(prisma.lmsBatch.create).not.toHaveBeenCalled();
  });

  it("returns 400 for an empty name", async () => {
    const res = await request(app).post("/api/lms/tenants/tenant-a/batches").send({ name: "" });
    expect(res.status).toBe(400);
    expect(prisma.lmsBatch.create).not.toHaveBeenCalled();
  });

  it("returns 400 for a name longer than 100 characters", async () => {
    // The column is bounded; without the max() the insert fails at the database
    // with a 500 instead of a field-level 400.
    const res = await request(app)
      .post("/api/lms/tenants/tenant-a/batches")
      .send({ name: "x".repeat(101) });
    expect(res.status).toBe(400);
    expect(prisma.lmsBatch.create).not.toHaveBeenCalled();
  });

  it("returns 400 for a date-only startDate", async () => {
    // Built from a relative date so it can never go stale. `.datetime()` demands
    // a full ISO timestamp; a bare "YYYY-MM-DD" would reach Prisma and blow up
    // there, not here.
    const dateOnly = new Date(Date.now() + DAY).toISOString().slice(0, 10);
    const res = await request(app)
      .post("/api/lms/tenants/tenant-a/batches")
      .send({ name: "Angkatan 3", startDate: dateOnly });
    expect(res.status).toBe(400);
    expect(prisma.lmsBatch.create).not.toHaveBeenCalled();
  });

  it("returns 400 for a non-boolean isActive", async () => {
    const res = await request(app)
      .post("/api/lms/tenants/tenant-a/batches")
      .send({ name: "Angkatan 3", isActive: "ya" });
    expect(res.status).toBe(400);
    expect(prisma.lmsBatch.create).not.toHaveBeenCalled();
  });

  it("returns 403 and writes nothing when the caller administers another tenant", async () => {
    authState.roles = ["corporate_client"];
    const res = await request(app).post("/api/lms/tenants/tenant-b/batches").send({ name: "Angkatan 3" });
    expect(res.status).toBe(403);
    expect(prisma.lmsBatch.create).not.toHaveBeenCalled();
  });

  it("returns a 500 envelope when the insert fails", async () => {
    // A unique-constraint or connection failure must surface as the standard
    // envelope, not as a hanging request or a leaked constraint name.
    vi.mocked(prisma.lmsBatch.create).mockRejectedValue(
      new Error("Unique constraint failed on the fields: (`tenantId`,`name`)"),
    );
    const res = await request(app).post("/api/lms/tenants/tenant-a/batches").send({ name: "Angkatan 3" });
    expect(res.status).toBe(500);
    expect(res.body.error.code).toBe("INTERNAL_ERROR");
    expect(JSON.stringify(res.body)).not.toContain("Unique constraint");
  });
});

// ─── PATCH /tenants/:tenantId/batches/:batchId ────────────────────────────────

describe("PATCH /api/lms/tenants/:tenantId/batches/:batchId", () => {
  it("updates a batch that belongs to the tenant", async () => {
    const res = await request(app)
      .patch("/api/lms/tenants/tenant-a/batches/batch-a1")
      .send({ name: "Angkatan 1 (revisi)" });
    expect(res.status).toBe(200);
    expect(res.body.data.name).toBe("Angkatan 1 (revisi)");
    expect(prisma.lmsBatch.update).toHaveBeenCalledWith({
      where: { id: "batch-a1" },
      data: { name: "Angkatan 1 (revisi)" },
    });
  });

  it("resolves the batch THROUGH the tenant before writing", async () => {
    await request(app).patch("/api/lms/tenants/tenant-a/batches/batch-a1").send({ name: "Baru" });
    // `update` itself is keyed on id alone, so this lookup is the only thing that
    // ties the write to the tenant the caller was authorised for.
    expect(prisma.lmsBatch.findFirst).toHaveBeenCalledWith({
      where: { id: "batch-a1", tenantId: "tenant-a" },
    });
  });

  it("returns 404 and writes nothing for a batch owned by another tenant", async () => {
    // The attack this blocks: an admin of tenant-a supplies their OWN tenantId
    // (so requireLmsAdmin passes) plus tenant-b's batchId. Without the guard the
    // update would key on id alone and rename another company's batch.
    const res = await request(app)
      .patch("/api/lms/tenants/tenant-a/batches/batch-b1")
      .send({ name: "Dibajak" });
    expect(res.status).toBe(404);
    expect(res.body).toEqual({
      success: false,
      error: { code: "NOT_FOUND", message: "Batch tidak ditemukan." },
    });
    expect(prisma.lmsBatch.update).not.toHaveBeenCalled();
  });

  it("returns 404 for a batch id that does not exist at all", async () => {
    const res = await request(app)
      .patch("/api/lms/tenants/tenant-a/batches/batch-ghost")
      .send({ name: "Baru" });
    expect(res.status).toBe(404);
    expect(prisma.lmsBatch.update).not.toHaveBeenCalled();
  });

  it("returns 400 for an invalid field even after the tenant check passes", async () => {
    const res = await request(app).patch("/api/lms/tenants/tenant-a/batches/batch-a1").send({ name: "" });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
    expect(prisma.lmsBatch.findFirst).toHaveBeenCalled();
    expect(prisma.lmsBatch.update).not.toHaveBeenCalled();
  });

  it("does not silently flip isActive when the patch omits it", async () => {
    // `batchSchema` defaults isActive to true. If `.partial()` still applied that
    // default, renaming an archived batch would quietly republish it to learners.
    await request(app).patch("/api/lms/tenants/tenant-a/batches/batch-a2").send({ name: "Baru" });
    const call = vi.mocked(prisma.lmsBatch.update).mock.calls[0]?.[0] as unknown as BatchUpdateArgs;
    expect(call.data).toEqual({ name: "Baru" });
  });

  it("returns 403 and writes nothing when the caller administers another tenant", async () => {
    authState.roles = ["corporate_client"];
    const res = await request(app).patch("/api/lms/tenants/tenant-b/batches/batch-b1").send({ name: "X" });
    expect(res.status).toBe(403);
    expect(prisma.lmsBatch.findFirst).not.toHaveBeenCalled();
    expect(prisma.lmsBatch.update).not.toHaveBeenCalled();
  });
});

// ─── GET /tenants/:tenantId/batches/:batchId/members ──────────────────────────

describe("GET /api/lms/tenants/:tenantId/batches/:batchId/members", () => {
  it("lists the batch members with their user details", async () => {
    const res = await request(app).get("/api/lms/tenants/tenant-a/batches/batch-a1/members");
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveLength(2);
    expect(res.body.data[0].user).toEqual({
      id: "user-alice",
      name: "Alice",
      email: "alice@tenant-a.test",
    });
  });

  it("queries members by batchId and orders newest first", async () => {
    await request(app).get("/api/lms/tenants/tenant-a/batches/batch-a1/members");
    expect(prisma.lmsBatchMember.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { batchId: "batch-a1" }, orderBy: { joinedAt: "desc" } }),
    );
  });

  it("returns 404 and never reads the roster of another tenant's batch", async () => {
    // This is the sharpest tenant-isolation case in the file. The member query is
    // `where: { batchId }` with NO tenant column to filter on, so the guard is the
    // only thing between a tenant-a admin and tenant-b's employee names and email
    // addresses. Asserting the 404 alone is not enough — the query must never run.
    const res = await request(app).get("/api/lms/tenants/tenant-a/batches/batch-b1/members");
    expect(res.status).toBe(404);
    expect(res.body).toEqual({
      success: false,
      error: { code: "NOT_FOUND", message: "Batch tidak ditemukan." },
    });
    expect(prisma.lmsBatchMember.findMany).not.toHaveBeenCalled();
    expect(prisma.lmsBatch.findFirst).toHaveBeenCalledWith({
      where: { id: "batch-b1", tenantId: "tenant-a" },
    });
  });

  it("returns an empty array for a batch with no members", async () => {
    const res = await request(app).get("/api/lms/tenants/tenant-a/batches/batch-a2/members");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ success: true, data: [] });
  });

  it("returns 403 and runs no query when the caller administers another tenant", async () => {
    authState.roles = ["corporate_client"];
    const res = await request(app).get("/api/lms/tenants/tenant-b/batches/batch-b1/members");
    expect(res.status).toBe(403);
    expect(prisma.lmsBatch.findFirst).not.toHaveBeenCalled();
    expect(prisma.lmsBatchMember.findMany).not.toHaveBeenCalled();
  });
});
