import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import { app } from "../../../src/app.js";
import { hashPassword } from "../../../src/services/auth/hash.js";

vi.mock("../../../src/db/prisma.js", () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      update: vi.fn().mockResolvedValue({}),
    },
    refreshToken: {
      create: vi.fn().mockResolvedValue({}),
    },
    auditLog: {
      create: vi.fn().mockResolvedValue({}),
    },
  },
}));

import { prisma } from "../../../src/db/prisma.js";

const mockPrisma = prisma as unknown as {
  user: { findUnique: ReturnType<typeof vi.fn>; update: ReturnType<typeof vi.fn> };
  refreshToken: { create: ReturnType<typeof vi.fn> };
  auditLog: { create: ReturnType<typeof vi.fn> };
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("POST /api/auth/login", () => {
  it("returns 200 with access token on valid credentials", async () => {
    const hash = await hashPassword("ValidPass123");
    mockPrisma.user.findUnique.mockResolvedValue({
      id: "uid-1",
      email: "user@test.com",
      name: "Rina",
      passwordHash: hash,
      isActive: true,
      deletedAt: null,
      roles: [{ role: "student" }],
    });

    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: "user@test.com", password: "ValidPass123" });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.accessToken).toBeDefined();
    expect(res.headers["set-cookie"]).toBeDefined();
  });

  it("returns 401 for wrong password", async () => {
    const hash = await hashPassword("CorrectPass");
    mockPrisma.user.findUnique.mockResolvedValue({
      id: "uid-1",
      email: "user@test.com",
      name: "Rina",
      passwordHash: hash,
      isActive: true,
      deletedAt: null,
      roles: [],
    });

    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: "user@test.com", password: "WrongPass" });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it("returns 401 for unknown email", async () => {
    mockPrisma.user.findUnique.mockResolvedValue(null);

    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: "unknown@test.com", password: "anything" });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it("returns 401 for soft-deleted user", async () => {
    const hash = await hashPassword("pass");
    mockPrisma.user.findUnique.mockResolvedValue({
      id: "uid-del",
      email: "del@test.com",
      passwordHash: hash,
      isActive: false,
      deletedAt: new Date(),
      roles: [],
    });

    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: "del@test.com", password: "pass" });

    expect(res.status).toBe(401);
  });

  it("returns 400 for missing fields", async () => {
    const res = await request(app).post("/api/auth/login").send({ email: "only@test.com" });
    expect(res.status).toBe(400);
  });
});
