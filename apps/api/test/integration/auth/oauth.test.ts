/**
 * Regression suite for the Google sign-in endpoints
 * (`GET /api/auth/google` and `GET /api/auth/google/callback`).
 *
 * This whole module had 0% branch coverage, which is dangerous for two reasons:
 *   1. the callback is the ONLY unauthenticated endpoint that can mint a session
 *      for an arbitrary email address, so its CSRF state check and its
 *      disabled-account gate are the last things standing between a crafted URL
 *      and a valid access token;
 *   2. the state cookie and the `state` query parameter are produced by two
 *      different handlers — if they ever drift apart, Google login breaks for
 *      every user at once and nothing else in the suite would notice.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import { app } from "../../../src/app.js";
import { verifyAccessToken } from "../../../src/services/auth/token.js";
import { REFRESH_COOKIE } from "../../../src/services/auth/token.js";

vi.mock("../../../src/db/prisma.js", () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      create: vi.fn(),
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

// Only the network-bound half of the Google client is stubbed. `buildGoogleAuthUrl`
// stays real so the redirect assertions below check the URL a browser would
// actually be sent to, not a fixture that could silently diverge from it.
vi.mock("../../../src/services/auth/google.js", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("../../../src/services/auth/google.js")>();
  return { ...actual, exchangeGoogleCode: vi.fn() };
});

import { prisma } from "../../../src/db/prisma.js";
import { exchangeGoogleCode } from "../../../src/services/auth/google.js";

const mockPrisma = prisma as unknown as {
  user: {
    findUnique: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
  };
  refreshToken: { create: ReturnType<typeof vi.fn> };
  auditLog: { create: ReturnType<typeof vi.fn> };
};

const GOOGLE_PROFILE = {
  email: "budi@gmail.com",
  name: "Budi Santoso",
  avatarUrl: "https://lh3.googleusercontent.com/a/budi",
  googleSub: "google-sub-123",
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

function tokenFromRedirect(res: request.Response): string {
  const location = (res.headers["location"] as string | undefined) ?? "";
  return new URL(location).searchParams.get("token") ?? "";
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("GET /api/auth/google", () => {
  it("hands the browser a Google URL whose state matches the cookie it just set", async () => {
    const res = await request(app).get("/api/auth/google");

    expect(res.status).toBe(302);
    const location = (res.headers["location"] as string | undefined) ?? "";
    expect(location.startsWith("https://accounts.google.com/")).toBe(true);

    // The single property that makes the CSRF check work at all: a mismatch here
    // means every callback is rejected and Google login is dead for everyone.
    const urlState = new URL(location).searchParams.get("state");
    expect(urlState).toBe(cookieValue(res, "oauth_state"));
    expect(urlState).toBeTruthy();
  });

  it("keeps the state cookie httpOnly and same-site so script or cross-site reads cannot forge a callback", async () => {
    const res = await request(app).get("/api/auth/google");

    const raw = setCookies(res).find((c) => c.startsWith("oauth_state=")) ?? "";
    expect(raw).toMatch(/HttpOnly/i);
    expect(raw).toMatch(/SameSite=Lax/i);
  });

  it("mints a fresh state per request", async () => {
    // A reused state would reduce the callback check to a formality: an attacker
    // who learns one value could replay it against any victim.
    const first = await request(app).get("/api/auth/google");
    const second = await request(app).get("/api/auth/google");

    expect(cookieValue(first, "oauth_state")).not.toBe(cookieValue(second, "oauth_state"));
  });
});

describe("GET /api/auth/google/callback", () => {
  it("rejects a callback with no authorization code", async () => {
    const res = await request(app)
      .get("/api/auth/google/callback?state=s1")
      .set("Cookie", "oauth_state=s1");

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(exchangeGoogleCode).not.toHaveBeenCalled();
  });

  it("rejects a callback that carries no state cookie", async () => {
    // This is the attacker-initiated flow: a victim is lured to a callback URL
    // built with the attacker's own code+state. Without a matching cookie from
    // this browser the request must die before any token exchange happens.
    const res = await request(app).get("/api/auth/google/callback?code=c1&state=s1");

    expect(res.status).toBe(400);
    expect(exchangeGoogleCode).not.toHaveBeenCalled();
    expect(mockPrisma.refreshToken.create).not.toHaveBeenCalled();
  });

  it("rejects a state that does not match the cookie", async () => {
    const res = await request(app)
      .get("/api/auth/google/callback?code=c1&state=attacker-state")
      .set("Cookie", "oauth_state=victim-state");

    expect(res.status).toBe(400);
    expect(exchangeGoogleCode).not.toHaveBeenCalled();
  });

  it("creates a student account on first Google sign-in and audits it", async () => {
    mockPrisma.user.findUnique.mockResolvedValue(null);
    mockPrisma.user.create.mockResolvedValue({
      id: "uid-new",
      email: GOOGLE_PROFILE.email,
      isActive: true,
      deletedAt: null,
      roles: [{ role: "student", tenantId: null }],
    });
    vi.mocked(exchangeGoogleCode).mockResolvedValue(GOOGLE_PROFILE);

    const res = await request(app)
      .get("/api/auth/google/callback?code=good-code&state=s1")
      .set("Cookie", "oauth_state=s1")
      .set("User-Agent", "integration-test-ua")
      .set("X-Forwarded-For", "203.0.113.7, 10.0.0.1");

    expect(res.status).toBe(302);

    const createArg = mockPrisma.user.create.mock.calls[0]?.[0] as
      | { data: Record<string, unknown> }
      | undefined;
    // A self-service Google signup must never land with anything but `student`,
    // and must be marked verified because Google already proved the address.
    expect(createArg?.data.roles).toEqual({ create: { role: "student" } });
    expect(createArg?.data.authProvider).toBe("google");
    expect(createArg?.data.isVerified).toBe(true);

    const auditArg = mockPrisma.auditLog.create.mock.calls[0]?.[0] as
      | { data: Record<string, unknown> }
      | undefined;
    expect(auditArg?.data.action).toBe("USER_REGISTER_GOOGLE");

    // Session forensics depend on the client's real IP surviving the proxy hop
    // and on the UA being recorded; both are read off the request, not the DB.
    const rtArg = mockPrisma.refreshToken.create.mock.calls[0]?.[0] as
      | { data: Record<string, unknown> }
      | undefined;
    expect(rtArg?.data.ip).toBe("203.0.113.7");
    expect(rtArg?.data.userAgent).toBe("integration-test-ua");
  });

  it("issues a usable access token and refresh cookie, and burns the state cookie", async () => {
    mockPrisma.user.findUnique.mockResolvedValue({
      id: "uid-existing",
      email: GOOGLE_PROFILE.email,
      isActive: true,
      deletedAt: null,
      roles: [{ role: "student", tenantId: null }],
    });
    vi.mocked(exchangeGoogleCode).mockResolvedValue(GOOGLE_PROFILE);

    const res = await request(app)
      .get("/api/auth/google/callback?code=good-code&state=s2")
      .set("Cookie", "oauth_state=s2");

    expect(res.status).toBe(302);
    const payload = verifyAccessToken(tokenFromRedirect(res));
    expect(payload.sub).toBe("uid-existing");
    expect(payload.email).toBe(GOOGLE_PROFILE.email);
    expect(cookieValue(res, REFRESH_COOKIE)).toBeTruthy();

    // The state cookie is single-use: without this clear, a leaked code+state
    // pair could be replayed from the same browser.
    expect(cookieValue(res, "oauth_state")).toBe("");

    const updateArg = mockPrisma.user.update.mock.calls[0]?.[0] as
      | { data: { lastLoginAt?: Date } }
      | undefined;
    expect(updateArg?.data.lastLoginAt).toBeInstanceOf(Date);
  });

  it("links to an existing account by email instead of creating a duplicate", async () => {
    // A user who registered with a password and later clicks "sign in with
    // Google" must land in the SAME account. The route keys on email alone, so
    // this test also pins that no second row and no USER_REGISTER audit appear.
    mockPrisma.user.findUnique.mockResolvedValue({
      id: "uid-local",
      email: GOOGLE_PROFILE.email,
      authProvider: "local",
      isActive: true,
      deletedAt: null,
      roles: [{ role: "student", tenantId: null }],
    });
    vi.mocked(exchangeGoogleCode).mockResolvedValue(GOOGLE_PROFILE);

    const res = await request(app)
      .get("/api/auth/google/callback?code=good-code&state=s3")
      .set("Cookie", "oauth_state=s3");

    expect(res.status).toBe(302);
    expect(mockPrisma.user.create).not.toHaveBeenCalled();
    expect(mockPrisma.auditLog.create).not.toHaveBeenCalled();
    expect(verifyAccessToken(tokenFromRedirect(res)).sub).toBe("uid-local");
  });

  it("drops tenant-scoped grants from the token it mints (BL-78b)", async () => {
    // A `super_admin` grant that exists only inside one LMS tenant must not ride
    // into the platform-wide token, or it satisfies every gate that merely
    // string-matches the role name. The Google path shares `issueTokens` with
    // password login, so it has to honour the same reduction.
    mockPrisma.user.findUnique.mockResolvedValue({
      id: "uid-tenant",
      email: GOOGLE_PROFILE.email,
      isActive: true,
      deletedAt: null,
      roles: [
        { role: "student", tenantId: null },
        { role: "super_admin", tenantId: "tenant-1" },
      ],
    });
    vi.mocked(exchangeGoogleCode).mockResolvedValue(GOOGLE_PROFILE);

    const res = await request(app)
      .get("/api/auth/google/callback?code=good-code&state=s4")
      .set("Cookie", "oauth_state=s4");

    expect(verifyAccessToken(tokenFromRedirect(res)).roles).toEqual(["student"]);
  });

  it("refuses to sign in a deactivated account", async () => {
    mockPrisma.user.findUnique.mockResolvedValue({
      id: "uid-off",
      email: GOOGLE_PROFILE.email,
      isActive: false,
      deletedAt: null,
      roles: [{ role: "student", tenantId: null }],
    });
    vi.mocked(exchangeGoogleCode).mockResolvedValue(GOOGLE_PROFILE);

    const res = await request(app)
      .get("/api/auth/google/callback?code=good-code&state=s5")
      .set("Cookie", "oauth_state=s5");

    expect(res.status).toBe(302);
    expect(res.headers["location"]).toBe("http://localhost:3000/masuk?error=account_disabled");
    // The bounce is only worth anything if no session was minted on the way out.
    expect(mockPrisma.refreshToken.create).not.toHaveBeenCalled();
    expect(cookieValue(res, REFRESH_COOKIE)).toBeUndefined();
  });

  it("refuses to sign in a soft-deleted account", async () => {
    // `isActive` can still be true on a row that was soft-deleted, so this is a
    // genuinely separate branch from the one above — deleting an account must
    // not leave Google sign-in as a way back in.
    mockPrisma.user.findUnique.mockResolvedValue({
      id: "uid-del",
      email: GOOGLE_PROFILE.email,
      isActive: true,
      deletedAt: new Date(Date.now() - 60_000),
      roles: [{ role: "student", tenantId: null }],
    });
    vi.mocked(exchangeGoogleCode).mockResolvedValue(GOOGLE_PROFILE);

    const res = await request(app)
      .get("/api/auth/google/callback?code=good-code&state=s6")
      .set("Cookie", "oauth_state=s6");

    expect(res.headers["location"]).toBe("http://localhost:3000/masuk?error=account_disabled");
    expect(mockPrisma.refreshToken.create).not.toHaveBeenCalled();
  });

  it("fails closed when Google rejects the code", async () => {
    // Covers a stale/replayed code, a revoked consent, and the unverified-email
    // guard inside exchangeGoogleCode — all of which surface here as a throw.
    // The only unacceptable outcome is a session, so assert none was created.
    mockPrisma.user.findUnique.mockResolvedValue(null);
    vi.mocked(exchangeGoogleCode).mockRejectedValueOnce(new Error("invalid_grant"));

    const res = await request(app)
      .get("/api/auth/google/callback?code=stale-code&state=s7")
      .set("Cookie", "oauth_state=s7");

    expect(res.status).toBe(500);
    expect(res.body.success).toBe(false);
    expect(mockPrisma.user.create).not.toHaveBeenCalled();
    expect(mockPrisma.refreshToken.create).not.toHaveBeenCalled();
  });
});
