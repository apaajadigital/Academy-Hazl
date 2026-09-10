/**
 * Regression suite for the session lifecycle endpoints in
 * `modules/auth/session.ts`: `POST /api/auth/logout` and the failure branches of
 * `POST /api/auth/refresh`.
 *
 * Scope note: `refresh.test.ts` already covers the happy path plus the revoked
 * and DB-expired rows. What was untested — and is covered here — is everything
 * that decides whether a session can be *ended* or *forged*: logout had no test
 * at all, so nothing proved a logout actually revokes the presented token; and
 * refresh had no coverage for a malformed/forged token, a token that is no
 * longer in the store (reuse after rotation), a disabled account, or an
 * infrastructure fault. The last one matters because a DB blip that surfaced as
 * 401 instead of 500 would silently log out every user on the platform.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import jwt from "jsonwebtoken";
import { app } from "../../../src/app.js";
import {
  signRefreshToken,
  verifyRefreshToken,
  hashToken,
  REFRESH_COOKIE,
} from "../../../src/services/auth/token.js";

vi.mock("../../../src/db/prisma.js", () => ({
  prisma: {
    refreshToken: {
      findUnique: vi.fn(),
      update: vi.fn().mockResolvedValue({}),
      updateMany: vi.fn().mockResolvedValue({ count: 1 }),
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
    updateMany: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
  };
  user: { findUnique: ReturnType<typeof vi.fn> };
};

function setCookies(res: request.Response): string[] {
  const jar = res.headers["set-cookie"] as string[] | string | undefined;
  if (Array.isArray(jar)) return jar;
  return jar ? [jar] : [];
}

function cookieValue(res: request.Response, name: string): string | undefined {
  const hit = setCookies(res).find((c) => c.startsWith(`${name}=`));
  if (!hit) return undefined;
  const pair = hit.split(";")[0] ?? "";
  return decodeURIComponent(pair.slice(name.length + 1));
}

/** A stored row that passes every check in the refresh handler. */
function storedRow(raw: string, overrides: Record<string, unknown> = {}) {
  return {
    id: "rt-1",
    tokenHash: hashToken(raw),
    revokedAt: null,
    // Relative to now, never a literal: a fixed date silently rots into the past
    // and turns the suite red on an unrelated day (BL-166).
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    ip: "203.0.113.9",
    userAgent: "browser-ua",
    ...overrides,
  };
}

const ACTIVE_USER = {
  id: "uid-1",
  email: "budi@example.com",
  isActive: true,
  deletedAt: null,
  roles: [{ role: "student", tenantId: null }],
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("POST /api/auth/logout", () => {
  it("revokes the presented refresh token", async () => {
    const raw = signRefreshToken({ sub: "uid-1", jti: "jti-logout" });

    const res = await request(app)
      .post("/api/auth/logout")
      .set("Cookie", `${REFRESH_COOKIE}=${raw}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    // Without this the endpoint would only drop the browser cookie, leaving a
    // fully valid refresh token alive on the server for another seven days —
    // logout on a shared machine would be theatre.
    const arg = mockPrisma.refreshToken.updateMany.mock.calls[0]?.[0] as
      | { where: { tokenHash: string }; data: { revokedAt: Date } }
      | undefined;
    expect(arg?.where.tokenHash).toBe(hashToken(raw));
    expect(arg?.data.revokedAt).toBeInstanceOf(Date);
    expect(cookieValue(res, REFRESH_COOKIE)).toBe("");
  });

  it("succeeds without a refresh cookie and touches nothing in the database", async () => {
    // Logging out twice, or from a session whose cookie already expired, must
    // not error — the client has no way to recover from a failed logout.
    const res = await request(app).post("/api/auth/logout");

    expect(res.status).toBe(200);
    expect(mockPrisma.refreshToken.updateMany).not.toHaveBeenCalled();
    expect(cookieValue(res, REFRESH_COOKIE)).toBe("");
  });

  it("revokes an unverifiable cookie value without inspecting it", async () => {
    // Logout deliberately hashes whatever it is given rather than verifying it.
    // If it ever started verifying, a user holding an expired or tampered token
    // could never revoke the row it points at.
    const res = await request(app)
      .post("/api/auth/logout")
      .set("Cookie", `${REFRESH_COOKIE}=not-a-jwt`);

    expect(res.status).toBe(200);
    const arg = mockPrisma.refreshToken.updateMany.mock.calls[0]?.[0] as
      | { where: { tokenHash: string } }
      | undefined;
    expect(arg?.where.tokenHash).toBe(hashToken("not-a-jwt"));
  });

  it("reports a revocation failure instead of claiming the session ended", async () => {
    // A 200 here would tell the user "you are logged out" while the refresh
    // token stays live server-side, which is the worst possible lie for this
    // endpoint to tell.
    mockPrisma.refreshToken.updateMany.mockRejectedValueOnce(new Error("db down"));
    const raw = signRefreshToken({ sub: "uid-1", jti: "jti-fail" });

    const res = await request(app)
      .post("/api/auth/logout")
      .set("Cookie", `${REFRESH_COOKIE}=${raw}`);

    expect(res.status).toBe(500);
    expect(res.body.success).toBe(false);
  });
});

describe("POST /api/auth/refresh", () => {
  it("rejects a malformed refresh cookie before querying the database", async () => {
    const res = await request(app)
      .post("/api/auth/refresh")
      .set("Cookie", `${REFRESH_COOKIE}=garbage.token.value`);

    expect(res.status).toBe(401);
    // Signature verification must gate the lookup; otherwise unauthenticated
    // traffic can drive one DB query per request through the auth limiter.
    expect(mockPrisma.refreshToken.findUnique).not.toHaveBeenCalled();
  });

  it("rejects a token signed with a foreign secret", async () => {
    // The forgery case: correct shape, correct claims, wrong key. If the verify
    // step ever fell back to decode-only, anyone could mint a session for any
    // user id.
    const forged = jwt.sign({ sub: "uid-1", jti: "forged" }, "attacker-secret-at-least-32-chars!!!", {
      expiresIn: "7d",
    });

    const res = await request(app)
      .post("/api/auth/refresh")
      .set("Cookie", `${REFRESH_COOKIE}=${forged}`);

    expect(res.status).toBe(401);
    expect(mockPrisma.refreshToken.findUnique).not.toHaveBeenCalled();
  });

  it("rejects a signature-valid token that is not in the store", async () => {
    // Reuse of a token that was already rotated away (or of one issued before a
    // password change wiped the rows): the JWT still verifies, so only the DB
    // lookup can catch it.
    const raw = signRefreshToken({ sub: "uid-1", jti: "jti-gone" });
    mockPrisma.refreshToken.findUnique.mockResolvedValue(null);

    const res = await request(app)
      .post("/api/auth/refresh")
      .set("Cookie", `${REFRESH_COOKIE}=${raw}`);

    expect(res.status).toBe(401);
    expect(mockPrisma.refreshToken.create).not.toHaveBeenCalled();
  });

  it("rejects a token whose user no longer exists", async () => {
    const raw = signRefreshToken({ sub: "uid-ghost", jti: "jti-ghost" });
    mockPrisma.refreshToken.findUnique.mockResolvedValue(storedRow(raw));
    mockPrisma.user.findUnique.mockResolvedValue(null);

    const res = await request(app)
      .post("/api/auth/refresh")
      .set("Cookie", `${REFRESH_COOKIE}=${raw}`);

    expect(res.status).toBe(401);
    expect(mockPrisma.refreshToken.create).not.toHaveBeenCalled();
  });

  it("rejects a deactivated account holding a still-valid token", async () => {
    // Banning a user has to take effect within one access-token lifetime; if
    // refresh ignored `isActive`, their session would renew indefinitely.
    const raw = signRefreshToken({ sub: ACTIVE_USER.id, jti: "jti-off" });
    mockPrisma.refreshToken.findUnique.mockResolvedValue(storedRow(raw));
    mockPrisma.user.findUnique.mockResolvedValue({ ...ACTIVE_USER, isActive: false });

    const res = await request(app)
      .post("/api/auth/refresh")
      .set("Cookie", `${REFRESH_COOKIE}=${raw}`);

    expect(res.status).toBe(401);
    expect(mockPrisma.refreshToken.create).not.toHaveBeenCalled();
  });

  it("rejects a soft-deleted account holding a still-valid token", async () => {
    // Separate branch from the one above: a soft-deleted row can keep
    // `isActive: true`, so deletion alone must also close the session.
    const raw = signRefreshToken({ sub: ACTIVE_USER.id, jti: "jti-del" });
    mockPrisma.refreshToken.findUnique.mockResolvedValue(storedRow(raw));
    mockPrisma.user.findUnique.mockResolvedValue({
      ...ACTIVE_USER,
      deletedAt: new Date(Date.now() - 60_000),
    });

    const res = await request(app)
      .post("/api/auth/refresh")
      .set("Cookie", `${REFRESH_COOKIE}=${raw}`);

    expect(res.status).toBe(401);
  });

  it("rotates the refresh token: old row revoked, new cookie issued", async () => {
    // Rotation is the whole security value of this endpoint. If the old row is
    // not revoked, a stolen token stays usable forever alongside the new one;
    // if no new cookie is set, the user is logged out on the next refresh.
    const raw = signRefreshToken({ sub: ACTIVE_USER.id, jti: "jti-old" });
    mockPrisma.refreshToken.findUnique.mockResolvedValue(storedRow(raw, { id: "rt-old" }));
    mockPrisma.user.findUnique.mockResolvedValue(ACTIVE_USER);

    const res = await request(app)
      .post("/api/auth/refresh")
      .set("Cookie", `${REFRESH_COOKIE}=${raw}`);

    expect(res.status).toBe(200);

    const revoke = mockPrisma.refreshToken.update.mock.calls[0]?.[0] as
      | { where: { id: string }; data: { revokedAt: Date } }
      | undefined;
    expect(revoke?.where.id).toBe("rt-old");
    expect(revoke?.data.revokedAt).toBeInstanceOf(Date);

    const issued = cookieValue(res, REFRESH_COOKIE) ?? "";
    expect(issued).not.toBe(raw);
    expect(verifyRefreshToken(issued).jti).not.toBe("jti-old");
    expect(verifyRefreshToken(issued).sub).toBe(ACTIVE_USER.id);
  });

  it("carries the originating ip and user agent onto the rotated token row", async () => {
    // The rotated row inherits the device fingerprint from the row it replaces
    // rather than from this request, so a session stays attributable across its
    // whole rotation chain. Null columns must degrade to "", not to `null`.
    const raw = signRefreshToken({ sub: ACTIVE_USER.id, jti: "jti-nulls" });
    mockPrisma.refreshToken.findUnique.mockResolvedValue(
      storedRow(raw, { ip: null, userAgent: null }),
    );
    mockPrisma.user.findUnique.mockResolvedValue(ACTIVE_USER);

    await request(app).post("/api/auth/refresh").set("Cookie", `${REFRESH_COOKIE}=${raw}`);

    const created = mockPrisma.refreshToken.create.mock.calls[0]?.[0] as
      | { data: { ip: string; userAgent: string } }
      | undefined;
    expect(created?.data.ip).toBe("");
    expect(created?.data.userAgent).toBe("");
  });

  it("returns 500, not 401, when the token store itself fails", async () => {
    // A 401 would tell the client the session is gone and trigger a global
    // logout across every tab during what is only a transient DB outage.
    const raw = signRefreshToken({ sub: ACTIVE_USER.id, jti: "jti-dbfail" });
    mockPrisma.refreshToken.findUnique.mockRejectedValueOnce(new Error("connection reset"));

    const res = await request(app)
      .post("/api/auth/refresh")
      .set("Cookie", `${REFRESH_COOKIE}=${raw}`);

    expect(res.status).toBe(500);
    expect(res.body.success).toBe(false);
  });
});
