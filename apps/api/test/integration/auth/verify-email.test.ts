/**
 * Regression suite for POST /api/auth/verify-email.
 *
 * /register mints the verification token (covered in register.test.ts); this is
 * the endpoint that spends it, and it had no coverage at all. What is locked in:
 *   1. a live token flips `isVerified` and BURNS the token in the same write —
 *      a token that survives verification is a permanent re-verification handle;
 *   2. expired, replayed, unknown and soft-deleted-account tokens all get the
 *      same generic 400, so the endpoint cannot be used to probe which tokens
 *      (or accounts) exist;
 *   3. a failing write surfaces as 500 and leaves no audit row claiming the
 *      account was verified.
 *
 * As in reset-password.test.ts, `user.findFirst` re-implements the handler's own
 * WHERE clause (token match, `expiry > now`, `deletedAt: null`) against an
 * in-memory row set and `user.update` writes back into it, so removing the
 * expiry predicate breaks these tests instead of passing against a stub that
 * always returns a row.
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
    auditLog: {
      create: vi.fn().mockResolvedValue({}),
    },
  },
}));

const { prisma } = await import("../../../src/db/prisma.js");

const GENERIC_FAILURE = "Token verifikasi tidak valid atau sudah kedaluwarsa.";

// Fixed UUIDs to satisfy `z.string().uuid()`; none of them is time-derived.
const ALICE_TOKEN = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const BOB_TOKEN = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const UNKNOWN_TOKEN = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";

type UserRow = {
  id: string;
  email: string;
  isVerified: boolean;
  emailVerifyToken: string | null;
  emailVerifyExpiry: Date | null;
  deletedAt: Date | null;
};

/**
 * Expiries are always relative to `Date.now()`. A literal calendar date here is
 * the BL-166 failure mode: green until the wall clock passes it, then main goes
 * red for reasons unrelated to the change that triggered the run.
 */
function buildRows(): UserRow[] {
  return [
    {
      id: "alice-1",
      email: "alice@example.com",
      isVerified: false,
      emailVerifyToken: ALICE_TOKEN,
      emailVerifyExpiry: new Date(Date.now() + 12 * 60 * 60 * 1000),
      deletedAt: null,
    },
    {
      id: "bob-2",
      email: "bob@example.com",
      isVerified: false,
      emailVerifyToken: BOB_TOKEN,
      emailVerifyExpiry: new Date(Date.now() + 12 * 60 * 60 * 1000),
      deletedAt: null,
    },
  ];
}

let rows: UserRow[];

type FindFirstArgs = {
  where: {
    emailVerifyToken?: string;
    emailVerifyExpiry?: { gt: Date };
    deletedAt?: Date | null;
  };
};

/** Evaluates the handler's own WHERE clause against `rows`. */
function findFirst(args: FindFirstArgs): Promise<UserRow | null> {
  const { where } = args;
  const match = rows.find(
    (r) =>
      r.emailVerifyToken !== null &&
      r.emailVerifyToken === where.emailVerifyToken &&
      r.emailVerifyExpiry !== null &&
      where.emailVerifyExpiry !== undefined &&
      r.emailVerifyExpiry.getTime() > where.emailVerifyExpiry.gt.getTime() &&
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
  vi.mocked(prisma.auditLog.create).mockResolvedValue({} as never);
});

function verifyWith(body: Record<string, unknown>) {
  return request(app).post("/api/auth/verify-email").send(body);
}

describe("POST /api/auth/verify-email", () => {
  it("marks the account verified and burns the token in one write", async () => {
    const res = await verifyWith({ token: ALICE_TOKEN });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const written = vi.mocked(prisma.user.update).mock.calls[0]?.[0] as unknown as UpdateArgs;
    expect(written.where).toEqual({ id: "alice-1" });
    expect(written.data.isVerified).toBe(true);
    // Clearing both fields is what makes the link single-use; leaving them set
    // keeps a working verification handle in every inbox and log forever.
    expect(written.data.emailVerifyToken).toBeNull();
    expect(written.data.emailVerifyExpiry).toBeNull();
  });

  it("verifies only the account the token belongs to", async () => {
    const res = await verifyWith({ token: BOB_TOKEN });

    expect(res.status).toBe(200);
    expect(prisma.user.update).toHaveBeenCalledTimes(1);
    expect(rows[1]!.isVerified).toBe(true);
    // A widened WHERE clause would let one valid token verify somebody else's
    // address — the exact thing verification is supposed to prove it cannot.
    expect(rows[0]!.isVerified).toBe(false);
  });

  it("refuses an expired token", async () => {
    // Relative past instant (BL-166), never a hardcoded date.
    rows[0]!.emailVerifyExpiry = new Date(Date.now() - 60 * 1000);

    const res = await verifyWith({ token: ALICE_TOKEN });

    expect(res.status).toBe(400);
    expect(res.body.error.message).toBe(GENERIC_FAILURE);
    expect(prisma.user.update).not.toHaveBeenCalled();
  });

  it("refuses a replay of a token that was already spent", async () => {
    const first = await verifyWith({ token: ALICE_TOKEN });
    expect(first.status).toBe(200);

    const replay = await verifyWith({ token: ALICE_TOKEN });

    expect(replay.status).toBe(400);
    expect(replay.body.error.message).toBe(GENERIC_FAILURE);
    // Only the first click may write; a second write would also emit a second
    // audit row for an event that happened once.
    expect(prisma.user.update).toHaveBeenCalledTimes(1);
    expect(prisma.auditLog.create).toHaveBeenCalledTimes(1);
  });

  it("refuses a token that matches no account", async () => {
    const res = await verifyWith({ token: UNKNOWN_TOKEN });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    // Same message as every other failure: a distinct "unknown token" reply
    // would turn this endpoint into a token oracle.
    expect(res.body.error.message).toBe(GENERIC_FAILURE);
    expect(prisma.user.update).not.toHaveBeenCalled();
  });

  it("refuses a token held by a soft-deleted account", async () => {
    // Verifying a deleted account would resurrect it as a fully usable login.
    rows[0]!.deletedAt = new Date();

    const res = await verifyWith({ token: ALICE_TOKEN });

    expect(res.status).toBe(400);
    expect(prisma.user.update).not.toHaveBeenCalled();
  });

  it("rejects a non-UUID token before touching the database", async () => {
    const res = await verifyWith({ token: "not-a-uuid" });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
    expect(prisma.user.findFirst).not.toHaveBeenCalled();
  });

  it("rejects a missing token payload", async () => {
    const res = await verifyWith({});

    expect(res.status).toBe(400);
    expect(prisma.user.findFirst).not.toHaveBeenCalled();
  });

  it("audits the verification with the forwarded client IP", async () => {
    await request(app)
      .post("/api/auth/verify-email")
      .set("X-Forwarded-For", "198.51.100.4, 10.0.0.1")
      .send({ token: ALICE_TOKEN });

    expect(prisma.auditLog.create).toHaveBeenCalledTimes(1);
    const audit = vi.mocked(prisma.auditLog.create).mock.calls[0]?.[0] as unknown as {
      data: Record<string, unknown>;
    };
    // Verification is what unlocks a paid account; the audit trail has to name
    // the account and the source, and getIp must take the first XFF hop rather
    // than the proxy address.
    expect(audit.data).toMatchObject({
      actorId: "alice-1",
      actorEmail: "alice@example.com",
      action: "USER_EMAIL_VERIFIED",
      resource: "User",
      resourceId: "alice-1",
      ip: "198.51.100.4",
    });
  });

  it("returns 500 and writes no audit row when the update fails", async () => {
    vi.mocked(prisma.user.update).mockRejectedValueOnce(new Error("connection reset"));

    const res = await verifyWith({ token: ALICE_TOKEN });

    expect(res.status).toBe(500);
    expect(res.body.error.code).toBe("INTERNAL_ERROR");
    // An audit row for a verification that never committed would make the trail
    // disagree with the database.
    expect(prisma.auditLog.create).not.toHaveBeenCalled();
  });
});
