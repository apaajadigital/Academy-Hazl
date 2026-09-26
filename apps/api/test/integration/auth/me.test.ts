/**
 * GET /api/auth/me response-contract tests.
 *
 * /me is the ONLY endpoint that returns the profile columns, and the trainer
 * profile form seeds itself from it. A `select` that omits headline/linkedin/
 * location therefore renders saved values as blank with no way to see or edit
 * them — a regression `tsc` cannot catch, because the web side parses
 * `res.json()` (typed `any`). Hence an explicit shape test on both the new
 * fields and the pre-existing flattened ones.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import { app } from "../../../src/app.js";
import { signAccessToken } from "../../../src/services/auth/token.js";

vi.mock("../../../src/db/prisma.js", () => ({
  prisma: {
    user: { findUnique: vi.fn() },
  },
}));

import { prisma } from "../../../src/db/prisma.js";

const mockPrisma = prisma as unknown as {
  user: { findUnique: ReturnType<typeof vi.fn> };
};

// Real signer + real `authenticate`, so the request exercises the genuine
// verification path; only the DB rows are faked.
const TOKEN = signAccessToken({ sub: "u-1", email: "trainer@test.com", roles: ["trainer"] });

/** The row `authenticate` reads (its own narrower select). */
const SESSION_ROW = {
  id: "u-1",
  email: "trainer@test.com",
  isActive: true,
  deletedAt: null,
  roles: [{ role: "trainer", tenantId: null }],
};

/** The row the /me handler reads. */
function meRow(profile: Record<string, string | null> | null) {
  return {
    id: "u-1",
    email: "trainer@test.com",
    name: "Rina",
    avatarUrl: null,
    isVerified: true,
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    roles: [{ role: "trainer", tenantId: null }],
    profile,
    subscription: null,
  };
}

const FULL_PROFILE = {
  phone: "08123456789",
  bio: "Mengajar analitik sejak 2016.",
  headline: "Praktisi Data 10 tahun",
  linkedin: "https://linkedin.com/in/rina",
  location: "Bandung",
};

function arrangeUser(profile: Record<string, string | null> | null) {
  // First call = authenticate, second call = the /me handler.
  mockPrisma.user.findUnique
    .mockResolvedValueOnce(SESSION_ROW)
    .mockResolvedValueOnce(meRow(profile));
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("GET /api/auth/me", () => {
  it("returns headline, linkedin and location flattened at the top level", async () => {
    arrangeUser(FULL_PROFILE);

    const res = await request(app).get("/api/auth/me").set("Authorization", `Bearer ${TOKEN}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toMatchObject({
      headline: "Praktisi Data 10 tahun",
      linkedin: "https://linkedin.com/in/rina",
      location: "Bandung",
    });
  });

  it("selects the three profile columns from the database", async () => {
    arrangeUser(FULL_PROFILE);

    await request(app).get("/api/auth/me").set("Authorization", `Bearer ${TOKEN}`);

    // Guards the root cause, not just the symptom: the fields must be asked
    // for. Without this, a mock returning them would keep passing even if the
    // select were reverted.
    const meSelect = mockPrisma.user.findUnique.mock.calls[1]![0].select;
    expect(meSelect.profile.select).toMatchObject({
      phone: true,
      bio: true,
      headline: true,
      linkedin: true,
      location: true,
    });
  });

  it("keeps the pre-existing flattened shape (phone, bio, roles) unchanged", async () => {
    arrangeUser(FULL_PROFILE);

    const res = await request(app).get("/api/auth/me").set("Authorization", `Bearer ${TOKEN}`);

    expect(res.body.data.phone).toBe("08123456789");
    expect(res.body.data.bio).toBe("Mengajar analitik sejak 2016.");
    // Every other /me caller in apps/web reads roles as { role }[].
    expect(res.body.data.roles).toEqual([{ role: "trainer" }]);
    expect(res.body.data.id).toBe("u-1");
    expect(res.body.data.email).toBe("trainer@test.com");
    expect(res.body.data.name).toBe("Rina");
  });

  it("does not nest the profile columns under a `profile` key", async () => {
    arrangeUser(FULL_PROFILE);

    const res = await request(app).get("/api/auth/me").set("Authorization", `Bearer ${TOKEN}`);

    // The flattening is the contract clients depend on; a nested object would
    // reintroduce exactly the mismatch this suite exists to prevent.
    expect(res.body.data).not.toHaveProperty("profile");
  });

  it("returns null for every profile field when the user has no profile row", async () => {
    arrangeUser(null);

    const res = await request(app).get("/api/auth/me").set("Authorization", `Bearer ${TOKEN}`);

    expect(res.status).toBe(200);
    // Explicit null, never a missing key — the form reads `?? ""` and a missing
    // key would be indistinguishable from a field the API forgot to send.
    for (const key of ["phone", "bio", "headline", "linkedin", "location"]) {
      expect(res.body.data).toHaveProperty(key, null);
    }
  });

  it("returns 401 without a token", async () => {
    const res = await request(app).get("/api/auth/me");
    expect(res.status).toBe(401);
  });
});
