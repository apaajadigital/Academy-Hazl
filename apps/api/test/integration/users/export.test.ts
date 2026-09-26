import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";

vi.mock("../../../src/db/prisma.js", () => ({
  prisma: {
    user: { findUnique: vi.fn() },
    order: { findMany: vi.fn() },
    courseEnrollment: { findMany: vi.fn() },
    lmsEnrollment: { findMany: vi.fn() },
    auditLog: { findMany: vi.fn() },
  },
}));

vi.mock("../../../src/middleware/authenticate.js", () => ({
  authenticate: vi.fn((req, _res, next) => {
    req.user = { id: "user-1", email: "user@test.com", name: "Test User", roles: ["student"] };
    next();
  }),
}));

vi.mock("../../../src/services/audit/log.js", () => ({
  writeAudit: vi.fn().mockResolvedValue(undefined),
}));

const { app } = await import("../../../src/app.js");
const { prisma } = await import("../../../src/db/prisma.js");
const { writeAudit } = await import("../../../src/services/audit/log.js");

const p = prisma as unknown as {
  user: { findUnique: ReturnType<typeof vi.fn> };
  order: { findMany: ReturnType<typeof vi.fn> };
  courseEnrollment: { findMany: ReturnType<typeof vi.fn> };
  lmsEnrollment: { findMany: ReturnType<typeof vi.fn> };
  auditLog: { findMany: ReturnType<typeof vi.fn> };
};

beforeEach(() => {
  vi.clearAllMocks();
  p.user.findUnique.mockResolvedValue({
    id: "user-1",
    email: "user@test.com",
    name: "Test User",
    passwordHash: "$2a$SECRET_HASH",
    emailVerifyToken: "secret-token",
    resetPasswordToken: "secret-reset",
    profile: { bio: "hi" },
    roles: [{ role: "student" }],
  });
  p.order.findMany.mockResolvedValue([{ id: "order-1", items: [] }]);
  p.courseEnrollment.findMany.mockResolvedValue([{ courseId: "c1" }]);
  p.lmsEnrollment.findMany.mockResolvedValue([]);
  p.auditLog.findMany.mockResolvedValue([{ action: "USER_LOGIN" }]);
});

describe("GET /api/users/me/export (PDP data portability, BL-18)", () => {
  it("returns a JSON bundle of the caller's data with a download filename", async () => {
    const res = await request(app).get("/api/users/me/export");

    expect(res.status).toBe(200);
    expect(res.headers["content-disposition"]).toContain('filename="jago-data-user-1.json"');
    expect(res.body.success).toBe(true);
    expect(res.body.data.account.email).toBe("user@test.com");
    expect(res.body.data.orders).toHaveLength(1);
    expect(res.body.data.courseEnrollments).toHaveLength(1);
    expect(res.body.data.activityLog).toHaveLength(1);
  });

  it("NEVER leaks password hash or verification/reset tokens", async () => {
    const res = await request(app).get("/api/users/me/export");
    const raw = JSON.stringify(res.body);
    expect(raw).not.toContain("SECRET_HASH");
    expect(raw).not.toContain("secret-token");
    expect(raw).not.toContain("secret-reset");
    expect(res.body.data.account.passwordHash).toBeUndefined();
  });

  it("writes an audit entry for the export (accountability)", async () => {
    await request(app).get("/api/users/me/export");
    expect(writeAudit).toHaveBeenCalledWith(
      expect.objectContaining({ action: "USER_DATA_EXPORT", resourceId: "user-1" }),
    );
  });
});
