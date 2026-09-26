import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import { app } from "../../../src/app.js";

vi.mock("../../../src/db/prisma.js", () => ({
  prisma: {
    lmsTenant: {
      findUnique: vi.fn(),
    },
    lmsCertificate: {
      findFirst: vi.fn(),
    },
  },
}));

vi.mock("../../../src/middleware/authenticate.js", () => ({
  authenticate: (req: { user: unknown }, _res: unknown, next: () => void) => {
    req.user = { id: "user-1", email: "student@test.com", roles: [] };
    next();
  },
}));

const { prisma } = await import("../../../src/db/prisma.js");
const mockPrisma = prisma as typeof prisma & {
  lmsTenant: { findUnique: ReturnType<typeof vi.fn> };
  lmsCertificate: { findFirst: ReturnType<typeof vi.fn> };
};

const TENANT = {
  id: "tenant-1",
  slug: "acme-corp",
  name: "Acme Corp",
  logoUrl: null,
  primaryColor: "#CC0052",
  isActive: true,
  trialEndsAt: null,
  planType: "pro",
};

describe("GET /api/lms/public/:tenantSlug — branding endpoint", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns tenant branding without auth", async () => {
    mockPrisma.lmsTenant.findUnique.mockResolvedValue(TENANT);
    const res = await request(app).get("/api/lms/public/acme-corp");
    expect(res.status).toBe(200);
    expect(res.body.data.name).toBe("Acme Corp");
    expect(res.body.data.primaryColor).toBe("#CC0052");
    expect(res.body.data.planType).toBe("pro");
  });

  it("returns 404 for unknown tenant", async () => {
    mockPrisma.lmsTenant.findUnique.mockResolvedValue(null);
    const res = await request(app).get("/api/lms/public/nonexistent");
    expect(res.status).toBe(404);
  });

  it("exposes trial expiry info", async () => {
    const trialTenant = { ...TENANT, planType: "trial", trialEndsAt: new Date("2020-01-01").toISOString() };
    mockPrisma.lmsTenant.findUnique.mockResolvedValue(trialTenant);
    const res = await request(app).get("/api/lms/public/acme-corp");
    expect(res.status).toBe(200);
    expect(res.body.data.trialEndsAt).toBeTruthy();
    expect(res.body.data.planType).toBe("trial");
  });
});

describe("GET /api/lms/portal/:tenantSlug/certificates/:certId/download", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns PDF for valid owned certificate", async () => {
    mockPrisma.lmsTenant.findUnique.mockResolvedValue(TENANT);
    mockPrisma.lmsCertificate.findFirst.mockResolvedValue({
      id: "cert-1",
      courseTitle: "Marketing Dasar",
      issuedAt: new Date("2025-06-01"),
      tenantId: "tenant-1",
      userId: "user-1",
      user: { name: "Budi Santoso" },
    });
    const res = await request(app).get("/api/lms/portal/acme-corp/certificates/cert-1/download");
    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toContain("application/pdf");
    expect(res.headers["content-disposition"]).toContain("cert-1.pdf");
  });

  it("returns 404 when tenant not found", async () => {
    mockPrisma.lmsTenant.findUnique.mockResolvedValue(null);
    const res = await request(app).get("/api/lms/portal/nonexistent/certificates/cert-1/download");
    expect(res.status).toBe(404);
  });

  it("returns 404 when cert not owned by user", async () => {
    mockPrisma.lmsTenant.findUnique.mockResolvedValue(TENANT);
    mockPrisma.lmsCertificate.findFirst.mockResolvedValue(null);
    const res = await request(app).get("/api/lms/portal/acme-corp/certificates/cert-999/download");
    expect(res.status).toBe(404);
  });
});
