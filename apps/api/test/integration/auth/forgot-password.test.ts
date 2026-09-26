/**
 * Regression suite for POST /api/auth/forgot-password.
 *
 * The endpoint used to mint + persist a reset token and then only `console.info`
 * it in non-production, so /reset-password was unreachable in prod and account
 * recovery was impossible. These tests lock in three properties at once:
 *   1. a known address actually triggers the reset mail, with the SAME token that
 *      was persisted (a mismatch would produce a link that can never validate);
 *   2. an unknown address gets a byte-identical 200 envelope (anti-enumeration);
 *   3. a throwing mailer still yields that same 200 — a 500 on send failure would
 *      itself leak which addresses are registered.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import { app } from "../../../src/app.js";

vi.mock("../../../src/db/prisma.js", () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    auditLog: {
      create: vi.fn().mockResolvedValue({}),
    },
  },
}));

// Keep every other template real (they no-op without RESEND_API_KEY) and stub
// only the one under test, so this file cannot accidentally send mail.
vi.mock("../../../src/services/notification/emailService.js", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("../../../src/services/notification/emailService.js")>();
  return { ...actual, sendPasswordResetEmail: vi.fn().mockResolvedValue(undefined) };
});

const { prisma } = await import("../../../src/db/prisma.js");
const { sendPasswordResetEmail } = await import("../../../src/services/notification/emailService.js");

const GENERIC_MESSAGE = "Jika email terdaftar, instruksi reset kata sandi telah dikirim.";

const knownUser = {
  id: "user-1",
  email: "budi@example.com",
  name: "Budi Santoso",
  deletedAt: null,
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(prisma.user.update).mockResolvedValue({} as never);
  vi.mocked(sendPasswordResetEmail).mockResolvedValue(undefined);
});

describe("POST /api/auth/forgot-password", () => {
  it("sends the reset email for a known address", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(knownUser as never);

    const res = await request(app)
      .post("/api/auth/forgot-password")
      .send({ email: knownUser.email });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(sendPasswordResetEmail).toHaveBeenCalledTimes(1);
    expect(sendPasswordResetEmail).toHaveBeenCalledWith(
      knownUser.email,
      knownUser.name,
      expect.any(String),
    );
  });

  it("mails the exact token it persisted", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(knownUser as never);

    await request(app).post("/api/auth/forgot-password").send({ email: knownUser.email });

    const persisted = vi.mocked(prisma.user.update).mock.calls[0]?.[0] as unknown as {
      data: { resetPasswordToken: string; resetPasswordExpiry: Date };
    };
    const mailedToken = vi.mocked(sendPasswordResetEmail).mock.calls[0]?.[2];

    expect(mailedToken).toBe(persisted.data.resetPasswordToken);
    // Expiry is advertised as 1 hour in the email copy; keep the two in sync.
    const ttlMs = persisted.data.resetPasswordExpiry.getTime() - Date.now();
    expect(ttlMs).toBeGreaterThan(55 * 60 * 1000);
    expect(ttlMs).toBeLessThanOrEqual(60 * 60 * 1000);
  });

  it("falls back to a neutral name when the account has none", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ ...knownUser, name: null } as never);

    await request(app).post("/api/auth/forgot-password").send({ email: knownUser.email });

    expect(sendPasswordResetEmail).toHaveBeenCalledWith(
      knownUser.email,
      "Pengguna",
      expect.any(String),
    );
  });

  it("returns the same 200 envelope for an unknown address (anti-enumeration)", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(knownUser as never);
    const known = await request(app)
      .post("/api/auth/forgot-password")
      .send({ email: knownUser.email });

    vi.mocked(prisma.user.findUnique).mockResolvedValue(null);
    const unknown = await request(app)
      .post("/api/auth/forgot-password")
      .send({ email: "nobody@example.com" });

    expect(unknown.status).toBe(200);
    expect(unknown.body).toEqual(known.body);
    expect(unknown.body.data.message).toBe(GENERIC_MESSAGE);
    // No token may be minted for an address that does not exist.
    expect(prisma.user.update).toHaveBeenCalledTimes(1);
  });

  it("does not mail a soft-deleted account", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      ...knownUser,
      deletedAt: new Date(),
    } as never);

    const res = await request(app)
      .post("/api/auth/forgot-password")
      .send({ email: knownUser.email });

    expect(res.status).toBe(200);
    expect(res.body.data.message).toBe(GENERIC_MESSAGE);
    expect(sendPasswordResetEmail).not.toHaveBeenCalled();
    expect(prisma.user.update).not.toHaveBeenCalled();
  });

  it("still returns 200 with the same message when the mailer throws", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(knownUser as never);
    vi.mocked(sendPasswordResetEmail).mockRejectedValueOnce(new Error("resend down"));

    const res = await request(app)
      .post("/api/auth/forgot-password")
      .send({ email: knownUser.email });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.message).toBe(GENERIC_MESSAGE);
    // The token is still persisted, so a manual resend can recover the user.
    expect(prisma.user.update).toHaveBeenCalledTimes(1);
  });

  it("never returns the reset token to the caller", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(knownUser as never);

    const res = await request(app)
      .post("/api/auth/forgot-password")
      .send({ email: knownUser.email });

    const persisted = vi.mocked(prisma.user.update).mock.calls[0]?.[0] as unknown as {
      data: { resetPasswordToken: string };
    };
    expect(JSON.stringify(res.body)).not.toContain(persisted.data.resetPasswordToken);
  });

  it("surfaces a database outage as 500 rather than a false success", async () => {
    vi.mocked(prisma.user.findUnique).mockRejectedValueOnce(new Error("connection refused"));

    const res = await request(app)
      .post("/api/auth/forgot-password")
      .send({ email: knownUser.email });

    // The generic 200 above exists to hide WHICH addresses are registered — it
    // must not also hide that the endpoint is broken. Swallowing the throw would
    // tell every user "instructions sent" while no token was ever minted, and
    // the outage would only be discovered from support tickets.
    expect(res.status).toBe(500);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe("INTERNAL_ERROR");
    expect(sendPasswordResetEmail).not.toHaveBeenCalled();
  });

  it("returns 500 when persisting the reset token fails", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(knownUser as never);
    vi.mocked(prisma.user.update).mockRejectedValueOnce(new Error("write timeout"));

    const res = await request(app)
      .post("/api/auth/forgot-password")
      .send({ email: knownUser.email });

    // A write failure escapes the inner best-effort try/catch (which only wraps
    // the mailer), so it reaches the handler catch. Documented here because the
    // status differs from the mailer-failure case above: 500 vs 200.
    expect(res.status).toBe(500);
    expect(sendPasswordResetEmail).not.toHaveBeenCalled();
  });

  it("returns 400 for an invalid email", async () => {
    const res = await request(app)
      .post("/api/auth/forgot-password")
      .send({ email: "not-an-email" });

    expect(res.status).toBe(400);
    expect(sendPasswordResetEmail).not.toHaveBeenCalled();
  });
});
