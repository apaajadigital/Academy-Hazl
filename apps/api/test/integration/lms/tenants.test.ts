import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import { app } from "../../../src/app.js";

vi.mock("../../../src/db/prisma.js", () => ({
  prisma: {
    lmsTenant: {
      findMany: vi.fn(),
      count: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    userRole: {
      findFirst: vi.fn(),
      upsert: vi.fn(),
    },
  },
}));

vi.mock("../../../src/middleware/authenticate.js", () => ({
  authenticate: vi.fn((req, _res, next) => {
    req.user = { id: "admin-1", email: "admin@test.com", name: "Admin", roles: ["super_admin"] };
    next();
  }),
}));

const { prisma } = await import("../../../src/db/prisma.js");

const mockTenant = {
  id: "tenant-1",
  slug: "perusahaan-abc",
  name: "PT ABC",
  logoUrl: null,
  primaryColor: "#2563eb",
  customDomain: null,
  planType: "trial",
  trialEndsAt: new Date(Date.now() + 14 * 86400000),
  isActive: true,
  seatLimit: 50,
  createdAt: new Date(),
  updatedAt: new Date(),
  _count: { batches: 2, courses: 3, enrollments: 10 },
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(prisma.lmsTenant.findMany).mockResolvedValue([mockTenant] as never);
  vi.mocked(prisma.lmsTenant.count).mockResolvedValue(1);
  vi.mocked(prisma.lmsTenant.findUnique).mockResolvedValue(mockTenant as never);
  vi.mocked(prisma.lmsTenant.create).mockResolvedValue(mockTenant as never);
  vi.mocked(prisma.lmsTenant.update).mockResolvedValue(mockTenant as never);
  vi.mocked(prisma.userRole.findFirst).mockResolvedValue(null);
  vi.mocked(prisma.userRole.upsert).mockResolvedValue({} as never);
});

describe("GET /api/lms/tenants", () => {
  it("returns paginated tenant list for super_admin", async () => {
    const res = await request(app).get("/api/lms/tenants");
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.meta.total).toBe(1);
  });
});

describe("POST /api/lms/tenants", () => {
  it("creates a new tenant", async () => {
    const res = await request(app).post("/api/lms/tenants").send({
      slug: "perusahaan-abc",
      name: "PT ABC",
      planType: "trial",
    });
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.slug).toBe("perusahaan-abc");
  });

  it("returns 400 when slug is invalid", async () => {
    const res = await request(app).post("/api/lms/tenants").send({
      slug: "INVALID SLUG!",
      name: "PT ABC",
    });
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });
});

describe("GET /api/lms/tenants/:tenantId", () => {
  it("returns tenant details", async () => {
    const res = await request(app).get("/api/lms/tenants/tenant-1");
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.id).toBe("tenant-1");
  });

  it("returns 404 when tenant not found", async () => {
    vi.mocked(prisma.lmsTenant.findUnique).mockResolvedValue(null);
    const res = await request(app).get("/api/lms/tenants/nonexistent");
    expect(res.status).toBe(404);
  });
});

describe("PATCH /api/lms/tenants/:tenantId", () => {
  it("updates tenant details", async () => {
    const res = await request(app).patch("/api/lms/tenants/tenant-1").send({ name: "PT ABC Updated" });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});

describe("POST /api/lms/tenants/:tenantId/admins", () => {
  it("assigns LMS admin role", async () => {
    const res = await request(app)
      .post("/api/lms/tenants/tenant-1/admins")
      .send({ userId: "user-1" });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it("returns 400 when userId missing", async () => {
    const res = await request(app).post("/api/lms/tenants/tenant-1/admins").send({});
    expect(res.status).toBe(400);
  });
});
