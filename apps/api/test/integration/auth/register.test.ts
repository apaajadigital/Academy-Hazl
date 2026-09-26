import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import { app } from "../../../src/app.js";

// Mock Prisma to avoid requiring a live database
vi.mock("../../../src/db/prisma.js", () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      create: vi.fn(),
    },
    auditLog: {
      create: vi.fn().mockResolvedValue({}),
    },
  },
}));

// Keep every other template real (they no-op without RESEND_API_KEY) and stub
// only the one this endpoint sends, so the suite can force a send failure
// without ever reaching a mail provider.
vi.mock("../../../src/services/notification/emailService.js", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("../../../src/services/notification/emailService.js")>();
  return { ...actual, sendVerificationEmail: vi.fn().mockResolvedValue(undefined) };
});

// bcrypt at cost 12 costs seconds per call and this file registers repeatedly.
// The endpoint only cares THAT the plaintext is hashed, so stub the hasher and
// assert on what it was handed and what got persisted.
vi.mock("../../../src/services/auth/hash.js", () => ({
  hashPassword: vi.fn(async (plain: string) => `bcrypt-of:${plain}`),
  verifyPassword: vi.fn(async () => true),
}));

import { prisma } from "../../../src/db/prisma.js";
import { sendVerificationEmail } from "../../../src/services/notification/emailService.js";
import { logger } from "../../../src/lib/logger.js";

const mockPrisma = prisma as unknown as {
  user: { findUnique: ReturnType<typeof vi.fn>; create: ReturnType<typeof vi.fn> };
  auditLog: { create: ReturnType<typeof vi.fn> };
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(sendVerificationEmail).mockResolvedValue(undefined);
});

const validPayload = {
  name: "Budi Santoso",
  email: "budi@example.com",
  password: "SecurePass123",
  consent: true,
};

describe("POST /api/auth/register", () => {
  it("returns 201 on valid registration", async () => {
    mockPrisma.user.findUnique.mockResolvedValue(null);
    mockPrisma.user.create.mockResolvedValue({
      id: "uuid-1",
      email: validPayload.email,
      name: validPayload.name,
    });

    const res = await request(app).post("/api/auth/register").send(validPayload);

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.userId).toBe("uuid-1");
  });

  it("returns 409 when email already exists", async () => {
    mockPrisma.user.findUnique.mockResolvedValue({ id: "existing" });

    const res = await request(app).post("/api/auth/register").send(validPayload);

    expect(res.status).toBe(409);
    expect(res.body.success).toBe(false);
  });

  it("returns 400 when consent is missing", async () => {
    const res = await request(app)
      .post("/api/auth/register")
      .send({ ...validPayload, consent: false });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it("returns 400 when password is too short", async () => {
    const res = await request(app)
      .post("/api/auth/register")
      .send({ ...validPayload, password: "short" });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it("returns 400 when email is invalid", async () => {
    const res = await request(app)
      .post("/api/auth/register")
      .send({ ...validPayload, email: "not-an-email" });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it("returns 400 when name is missing", async () => {
    const res = await request(app)
      .post("/api/auth/register")
      .send({ email: validPayload.email, password: validPayload.password, consent: true });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it("persists a hash, the consent timestamp and the student role", async () => {
    mockPrisma.user.findUnique.mockResolvedValue(null);
    mockPrisma.user.create.mockResolvedValue({
      id: "uuid-1",
      email: validPayload.email,
      name: validPayload.name,
    });

    await request(app).post("/api/auth/register").send(validPayload);

    const created = mockPrisma.user.create.mock.calls[0]?.[0] as {
      data: { passwordHash: string; consentGivenAt: Date; roles: { create: { role: string } } };
    };
    // Writing the plaintext instead of the hash is the single worst regression
    // this endpoint can ship, and nothing else in the suite would catch it.
    expect(created.data.passwordHash).toBe(`bcrypt-of:${validPayload.password}`);
    expect(created.data.passwordHash).not.toBe(validPayload.password);
    // consent is a legal record (UU PDP): the row must carry when it was given.
    expect(created.data.consentGivenAt).toBeInstanceOf(Date);
    // Without the seeded role the account authenticates but can enrol in nothing.
    expect(created.data.roles.create.role).toBe("student");
  });

  it("mails the exact verification token it persisted", async () => {
    mockPrisma.user.findUnique.mockResolvedValue(null);
    mockPrisma.user.create.mockResolvedValue({
      id: "uuid-1",
      email: validPayload.email,
      name: validPayload.name,
    });

    const res = await request(app).post("/api/auth/register").send(validPayload);

    const created = mockPrisma.user.create.mock.calls[0]?.[0] as {
      data: { emailVerifyToken: string; emailVerifyExpiry: Date };
    };
    const mailedToken = vi.mocked(sendVerificationEmail).mock.calls[0]?.[2];

    // A token that is mailed but not stored (or vice versa) produces a link that
    // can never validate — the same class of bug that made "Lupa Password" a
    // dead end before forgot-password.test.ts locked it down.
    expect(mailedToken).toBe(created.data.emailVerifyToken);
    // Outside production the token is echoed back so E2E can finish the flow;
    // it must be the same one, not a freshly minted second token.
    expect(res.body.data.devEmailVerifyToken).toBe(created.data.emailVerifyToken);
    // The email copy advertises 24 hours — measured relatively so the assertion
    // does not rot the way a hardcoded date would (BL-166).
    const ttlMs = new Date(created.data.emailVerifyExpiry).getTime() - Date.now();
    expect(ttlMs).toBeGreaterThan(23 * 60 * 60 * 1000);
    expect(ttlMs).toBeLessThanOrEqual(24 * 60 * 60 * 1000);
  });

  it("still returns 201 when the verification email fails to send", async () => {
    mockPrisma.user.findUnique.mockResolvedValue(null);
    mockPrisma.user.create.mockResolvedValue({
      id: "uuid-1",
      email: validPayload.email,
      name: validPayload.name,
    });
    vi.mocked(sendVerificationEmail).mockRejectedValueOnce(new Error("resend down"));
    const warnSpy = vi.spyOn(logger, "warn");

    const res = await request(app).post("/api/auth/register").send(validPayload);

    // The account is already committed by the time the mailer runs. Surfacing a
    // provider outage as a failed registration would strand a user with an
    // account they cannot re-create (the retry hits the 409 above).
    expect(res.status).toBe(201);
    expect(res.body.data.userId).toBe("uuid-1");
    // The failure must still be recorded, otherwise nobody knows to resend.
    await vi.waitFor(() =>
      expect(warnSpy).toHaveBeenCalledWith("verification email send failed", expect.anything()),
    );
  });

  it("returns 500 when the account cannot be created", async () => {
    mockPrisma.user.findUnique.mockResolvedValue(null);
    mockPrisma.user.create.mockRejectedValue(new Error("unique constraint race"));

    const res = await request(app).post("/api/auth/register").send(validPayload);

    // The handler must forward to the error middleware rather than swallow: a
    // half-written registration reported as 201 sends the user to a login that
    // will never work.
    expect(res.status).toBe(500);
    expect(res.body.error.code).toBe("INTERNAL_ERROR");
    expect(sendVerificationEmail).not.toHaveBeenCalled();
    expect(mockPrisma.auditLog.create).not.toHaveBeenCalled();
  });
});
