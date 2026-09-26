import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import { app } from "../../../src/app.js";
import { signRefreshToken, hashToken } from "../../../src/services/auth/token.js";
import { REFRESH_COOKIE } from "../../../src/services/auth/token.js";

vi.mock("../../../src/db/prisma.js", () => ({
  prisma: {
    refreshToken: {
      findUnique: vi.fn(),
      update: vi.fn().mockResolvedValue({}),
      create: vi.fn().mockResolvedValue({}),
    },
    user: {
      findUnique: vi.fn(),
    },
  },
}));

import { prisma } from "../../../src/db/prisma.js";

const mockPrisma = prisma as unknown as {
  refreshToken: {
    findUnique: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
  };
  user: { findUnique: ReturnType<typeof vi.fn> };
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("POST /api/auth/refresh", () => {
  it("returns 401 when no refresh cookie present", async () => {
    const res = await request(app).post("/api/auth/refresh");
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it("returns 401 for a revoked token", async () => {
    const raw = signRefreshToken({ sub: "uid-1", jti: "jti-1" });
    const hash = hashToken(raw);

    mockPrisma.refreshToken.findUnique.mockResolvedValue({
      id: "rt-1",
      tokenHash: hash,
      revokedAt: new Date(),
      expiresAt: new Date(Date.now() + 86400_000),
      ip: "",
      userAgent: "",
    });

    const res = await request(app)
      .post("/api/auth/refresh")
      .set("Cookie", `${REFRESH_COOKIE}=${raw}`);

    expect(res.status).toBe(401);
  });

  it("returns 200 with new access token for a valid token", async () => {
    const raw = signRefreshToken({ sub: "uid-valid", jti: "jti-valid" });
    const hash = hashToken(raw);

    mockPrisma.refreshToken.findUnique.mockResolvedValue({
      id: "rt-valid",
      tokenHash: hash,
      revokedAt: null,
      expiresAt: new Date(Date.now() + 86400_000),
      ip: "127.0.0.1",
      userAgent: "test",
    });

    mockPrisma.user.findUnique.mockResolvedValue({
      id: "uid-valid",
      email: "valid@test.com",
      isActive: true,
      deletedAt: null,
      roles: [{ role: "student" }],
    });

    const res = await request(app)
      .post("/api/auth/refresh")
      .set("Cookie", `${REFRESH_COOKIE}=${raw}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.accessToken).toBeDefined();
  });

  it("returns 401 for an expired token", async () => {
    const raw = signRefreshToken({ sub: "uid-exp", jti: "jti-exp" });
    const hash = hashToken(raw);

    mockPrisma.refreshToken.findUnique.mockResolvedValue({
      id: "rt-exp",
      tokenHash: hash,
      revokedAt: null,
      expiresAt: new Date(Date.now() - 1000), // already expired in DB
      ip: "",
      userAgent: "",
    });

    const res = await request(app)
      .post("/api/auth/refresh")
      .set("Cookie", `${REFRESH_COOKIE}=${raw}`);

    expect(res.status).toBe(401);
  });
});
