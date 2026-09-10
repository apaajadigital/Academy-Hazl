/**
 * Regression suite for POST /api/auth/reset-password — the second half of
 * account recovery. /forgot-password (covered in forgot-password.test.ts) only
 * mints the token; everything that decides whether that token may actually
 * change a password lives here, and none of it was exercised before.
 *
 * The properties locked in:
 *   1. a valid token rewrites the hash, BURNS the token, and revokes every
 *      refresh token — a session that survives a reset defeats the whole point
 *      of resetting after a compromise;
 *   2. expired / replayed / unknown tokens are refused with the same generic
 *      400, and the token's OWNER is the only account touched;
 *   3. a failing transaction surfaces as 500 and never leaves an audit row
 *      claiming a reset that did not happen.
 *
 * `user.findFirst` is not a blanket stub: it re-implements the three predicates
 * the handler puts in the WHERE clause (token match, `expiry > now`,
 * `deletedAt: null`) against an in-memory row set, and `user.update` writes back
 * into that same set. Dropping `gt: new Date()` from the query — the classic way
 * expired-token checks rot — therefore fails these tests instead of quietly
 * passing against a mock that always returns the row.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import { app } from "../../../src/app.js";

vi.mock("../../../src/db/prisma.js", () => ({
  prisma: {
    user: {
      findFirst: vi.fn(),
      update: vi.fn(),
    },
    refreshToken: {
      updateMany: vi.fn(),
    },
    auditLog: {
      create: vi.fn().mockResolvedValue({}),
    },
    $transaction: vi.fn(),
  },
}));

// bcrypt at cost 12 costs seconds per call; the endpoint only cares THAT the
// plaintext is hashed, so stub the hasher and assert on its input/output.
vi.mock("../../../src/services/auth/hash.js", () => ({
  hashPassword: vi.fn(async (plain: string) => `bcrypt-of:${plain}`),
  verifyPassword: vi.fn(async () => true),
}));

const { prisma } = await import("../../../src/db/prisma.js");
const { hashPassword } = await import("../../../src/services/auth/hash.js");

const GENERIC_FAILURE = "Token reset kata sandi tidak valid atau sudah kedaluwarsa.";

// Fixed UUIDs (the schema demands `z.string().uuid()`); nothing here is
// time-derived, so they carry no determinism risk.
const ALICE_TOKEN = "11111111-1111-4111-8111-111111111111";
const BOB_TOKEN = "22222222-2222-4222-8222-222222222222";
const UNKNOWN_TOKEN = "33333333-3333-4333-8333-333333333333";

const NEW_PASSWORD = "BrandNewPass123";

type UserRow = {
  id: string;
  email: string;
  passwordHash: string;
  resetPasswordToken: string | null;
  resetPasswordExpiry: Date | null;
  deletedAt: Date | null;
};

/**
 * Every expiry is expressed relative to `Date.now()` at fixture-build time.
 * A hardcoded calendar date here is exactly the bug that turned `main` red on
 * 10 Sep 2026 (BL-166): it passes until the wall clock walks past it.
 */
function buildRows(): UserRow[] {
  return [
    {
      id: "alice-1",
      email: "alice@example.com",
      passwordHash: "bcrypt-of:OldAlicePass1",
      resetPasswordToken: ALICE_TOKEN,
      resetPasswordExpiry: new Date(Date.now() + 30 * 60 * 1000),
      deletedAt: null,
    },
    {
      id: "bob-2",
      email: "bob@example.com",
      passwordHash: "bcrypt-of:OldBobPass1",
      resetPasswordToken: BOB_TOKEN,
      resetPasswordExpiry: new Date(Date.now() + 30 * 60 * 1000),
      deletedAt: null,
    },
  ];
}

let rows: UserRow[];

type FindFirstArgs = {
  where: {
    resetPasswordToken?: string;
    resetPasswordExpiry?: { gt: Date };
    deletedAt?: Date | null;
  };
};

/** Evaluates the handler's own WHERE clause against `rows`. */
function findFirst(args: FindFirstArgs): Promise<UserRow | null> {
  const { where } = args;
  const match = rows.find(
    (r) =>
      r.resetPasswordToken !== null &&
      r.resetPasswordToken === where.resetPasswordToken &&
      r.resetPasswordExpiry !== null &&
      where.resetPasswordExpiry !== undefined &&
      r.resetPasswordExpiry.getTime() > where.resetPasswordExpiry.gt.getTime() &&
      (where.deletedAt === null ? r.deletedAt === null : true),
  );
  return Promise.resolve(match ?? null);
}

type UpdateArgs = { where: { id: string }; data: Partial<UserRow> };

/** Persists into `rows` so a replayed token really finds a burnt row. */
function update(args: UpdateArgs): Promise<UserRow | null> {
  const row = rows.find((r) => r.id === args.where.id);
  if (row) Object.assign(row, args.data);
  return Promise.resolve(row ?? null);
}

beforeEach(() => {
  vi.clearAllMocks();
  rows = buildRows();
  vi.mocked(prisma.user.findFirst).mockImplementation(findFirst as never);
  vi.mocked(prisma.user.update).mockImplementation(update as never);
  vi.mocked(prisma.refreshToken.updateMany).mockResolvedValue({ count: 2 } as never);
  vi.mocked(prisma.auditLog.create).mockResolvedValue({} as never);
  // The route uses the ARRAY form of $transaction, not the callback form.
  vi.mocked(prisma.$transaction).mockImplementation(((ops: Promise<unknown>[]) =>
    Promise.all(ops)) as never);
});

function resetWith(body: Record<string, unknown>) {
  return request(app).post("/api/auth/reset-password").send(body);
}

describe("POST /api/auth/reset-password", () => {
  it("rewrites the hash, burns the token and revokes every refresh token", async () => {
    const res = await resetWith({ token: ALICE_TOKEN, password: NEW_PASSWORD });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const written = vi.mocked(prisma.user.update).mock.calls[0]?.[0] as unknown as UpdateArgs;
    expect(written.where).toEqual({ id: "alice-1" });
    expect(written.data.passwordHash).toBe(`bcrypt-of:${NEW_PASSWORD}`);
    // Single-use: leaving the token set would let anyone who ever saw the reset
    // link take the account over again at any later point.
    expect(written.data.resetPasswordToken).toBeNull();
    expect(written.data.resetPasswordExpiry).toBeNull();

    // Revoking sessions is the reason a reset is worth anything after a
    // compromise; an attacker's live refresh token must not outlive it.
    expect(prisma.refreshToken.updateMany).toHaveBeenCalledWith({
      where: { userId: "alice-1", revokedAt: null },
      data: { revokedAt: expect.any(Date) },
    });
    // Both writes must go out atomically — a hash change without the revoke
    // (or vice versa) is worse than doing neither.
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(vi.mocked(prisma.$transaction).mock.calls[0]?.[0]).toHaveLength(2);
  });

  it("stores a hash, never the plaintext password", async () => {
    await resetWith({ token: ALICE_TOKEN, password: NEW_PASSWORD });

    expect(hashPassword).toHaveBeenCalledWith(NEW_PASSWORD);
    const written = vi.mocked(prisma.user.update).mock.calls[0]?.[0] as unknown as UpdateArgs;
    expect(written.data.passwordHash).not.toBe(NEW_PASSWORD);
  });

  it("audits the reset against the token owner and the forwarded client IP", async () => {
    await request(app)
      .post("/api/auth/reset-password")
      .set("X-Forwarded-For", "203.0.113.7, 10.0.0.1")
      .send({ token: ALICE_TOKEN, password: NEW_PASSWORD });

    // A password reset is an account-takeover primitive: without a truthful
    // actor + source IP an incident review has nothing to work from.
    expect(prisma.auditLog.create).toHaveBeenCalledTimes(1);
    const audit = vi.mocked(prisma.auditLog.create).mock.calls[0]?.[0] as unknown as {
      data: Record<string, unknown>;
    };
    expect(audit.data).toMatchObject({
      actorId: "alice-1",
      actorEmail: "alice@example.com",
      action: "USER_PASSWORD_RESET",
      resource: "User",
      resourceId: "alice-1",
      ip: "203.0.113.7",
    });
  });

  it("refuses an expired token", async () => {
    // Relative, never a literal date (BL-166): one minute in the past is expired
    // whatever day the suite runs.
    rows[0]!.resetPasswordExpiry = new Date(Date.now() - 60 * 1000);

    const res = await resetWith({ token: ALICE_TOKEN, password: NEW_PASSWORD });

    expect(res.status).toBe(400);
    expect(res.body.error.message).toBe(GENERIC_FAILURE);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it("refuses a replay of a token that was already spent", async () => {
    const first = await resetWith({ token: ALICE_TOKEN, password: NEW_PASSWORD });
    expect(first.status).toBe(200);

    // Same link clicked (or intercepted) a second time. The row now carries a
    // null token because the first reset burnt it.
    const replay = await resetWith({ token: ALICE_TOKEN, password: "SecondTryPass9" });

    expect(replay.status).toBe(400);
    expect(replay.body.error.message).toBe(GENERIC_FAILURE);
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(rows[0]!.passwordHash).toBe(`bcrypt-of:${NEW_PASSWORD}`);
  });

  it("resets only the account the token belongs to", async () => {
    const res = await resetWith({ token: BOB_TOKEN, password: NEW_PASSWORD });

    expect(res.status).toBe(200);
    // Lookup is by token alone, so a bug that widened the WHERE clause would
    // hand the wrong (or every) account to whoever holds one valid token.
    expect(prisma.user.update).toHaveBeenCalledTimes(1);
    expect(rows[1]!.passwordHash).toBe(`bcrypt-of:${NEW_PASSWORD}`);
    expect(rows[0]!.passwordHash).toBe("bcrypt-of:OldAlicePass1");
    expect(prisma.refreshToken.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: "bob-2", revokedAt: null } }),
    );
  });

  it("refuses a token that matches no account", async () => {
    const res = await resetWith({ token: UNKNOWN_TOKEN, password: NEW_PASSWORD });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(prisma.user.update).not.toHaveBeenCalled();
  });

  it("refuses a token held by a soft-deleted account", async () => {
    // Deactivated accounts must stay unreachable; an unexpired token minted
    // before deletion would otherwise resurrect the login.
    rows[0]!.deletedAt = new Date();

    const res = await resetWith({ token: ALICE_TOKEN, password: NEW_PASSWORD });

    expect(res.status).toBe(400);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it("rejects a non-UUID token before touching the database", async () => {
    const res = await resetWith({ token: "not-a-uuid", password: NEW_PASSWORD });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
    expect(prisma.user.findFirst).not.toHaveBeenCalled();
  });

  it("rejects an all-numeric password (shared password policy)", async () => {
    // passwordSchema in modules/auth/shared.ts is deliberately reused here; if
    // reset ever stopped importing it, "12345678" would sail through a boundary
    // that register already blocks.
    const res = await resetWith({ token: ALICE_TOKEN, password: "12345678" });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
    expect(prisma.user.findFirst).not.toHaveBeenCalled();
  });

  it("rejects a password shorter than the 8-char minimum", async () => {
    const res = await resetWith({ token: ALICE_TOKEN, password: "Sh0rt" });

    expect(res.status).toBe(400);
    expect(prisma.user.findFirst).not.toHaveBeenCalled();
  });

  it("returns 500 and writes no audit row when the transaction fails", async () => {
    vi.mocked(prisma.$transaction).mockRejectedValueOnce(new Error("deadlock detected"));

    const res = await resetWith({ token: ALICE_TOKEN, password: NEW_PASSWORD });

    expect(res.status).toBe(500);
    expect(res.body.error.code).toBe("INTERNAL_ERROR");
    // An audit row for a reset that never committed would send an incident
    // review chasing a takeover that did not happen.
    expect(prisma.auditLog.create).not.toHaveBeenCalled();
  });
});
