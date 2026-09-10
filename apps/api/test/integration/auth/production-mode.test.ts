/**
 * The two auth branches that only exist in production.
 *
 * `register` and `forgot-password` both hand the freshly minted token to the
 * developer when `NODE_ENV !== "production"` — one in the JSON response, one in
 * the log — so E2E can finish the flow without an inbox. Vitest pins NODE_ENV to
 * "test" for the whole suite, so those escape hatches are the ONLY code in these
 * two modules that no other test can reach, and the production side of each is
 * exactly the side that matters: a verification token echoed back over HTTP, or
 * a reset token written into a log aggregator, is a live account-takeover
 * primitive sitting in a place that is retained, shipped and searchable.
 *
 * `env` is mocked (spread from the real parsed config, so every other setting
 * stays valid) rather than changed in vitest.config.ts, which is shared by the
 * whole suite. LOG_LEVEL is pinned to "fatal" only to keep pino quiet — the
 * assertions spy on the `logger` wrapper, which records calls regardless of level.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";

vi.mock("../../../src/config/env.js", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../../src/config/env.js")>();
  return {
    ...actual,
    env: { ...actual.env, NODE_ENV: "production" as const, LOG_LEVEL: "fatal" as const },
  };
});

vi.mock("../../../src/db/prisma.js", () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    auditLog: {
      create: vi.fn().mockResolvedValue({}),
    },
  },
}));

vi.mock("../../../src/services/notification/emailService.js", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("../../../src/services/notification/emailService.js")>();
  return {
    ...actual,
    sendVerificationEmail: vi.fn().mockResolvedValue(undefined),
    sendPasswordResetEmail: vi.fn().mockResolvedValue(undefined),
  };
});

// bcrypt at cost 12 costs seconds per call; registration only needs to prove the
// plaintext went through the hasher, which the register suite already asserts.
vi.mock("../../../src/services/auth/hash.js", () => ({
  hashPassword: vi.fn(async (plain: string) => `bcrypt-of:${plain}`),
  verifyPassword: vi.fn(async () => true),
}));

const { app } = await import("../../../src/app.js");
const { prisma } = await import("../../../src/db/prisma.js");
const { logger } = await import("../../../src/lib/logger.js");

const REGISTRATION = {
  name: "Budi Santoso",
  email: "budi@example.com",
  password: "SecurePass123",
  consent: true,
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(prisma.auditLog.create).mockResolvedValue({} as never);
  vi.mocked(prisma.user.update).mockResolvedValue({} as never);
});

describe("auth token escape hatches in production", () => {
  it("does not echo the verification token in the register response", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null);
    vi.mocked(prisma.user.create).mockResolvedValue({
      id: "uuid-1",
      email: REGISTRATION.email,
      name: REGISTRATION.name,
    } as never);

    const res = await request(app).post("/api/auth/register").send(REGISTRATION);

    expect(res.status).toBe(201);
    expect(res.body.data.userId).toBe("uuid-1");
    // Whoever can read the response — a proxy log, an analytics SDK, a shared
    // browser — could verify the address without ever holding the mailbox.
    expect(res.body.data).not.toHaveProperty("devEmailVerifyToken");
    const created = vi.mocked(prisma.user.create).mock.calls[0]?.[0] as unknown as {
      data: { emailVerifyToken: string };
    };
    expect(JSON.stringify(res.body)).not.toContain(created.data.emailVerifyToken);
  });

  it("does not log the reset token on forgot-password", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      id: "user-1",
      email: REGISTRATION.email,
      name: REGISTRATION.name,
      deletedAt: null,
    } as never);
    const infoSpy = vi.spyOn(logger, "info");

    const res = await request(app)
      .post("/api/auth/forgot-password")
      .send({ email: REGISTRATION.email });

    expect(res.status).toBe(200);
    // A reset token in the log stream is a password-reset link that anyone with
    // log access can replay; the dev convenience must stay behind the env gate.
    expect(infoSpy).not.toHaveBeenCalled();
    const persisted = vi.mocked(prisma.user.update).mock.calls[0]?.[0] as unknown as {
      data: { resetPasswordToken: string };
    };
    expect(JSON.stringify(res.body)).not.toContain(persisted.data.resetPasswordToken);
  });
});
