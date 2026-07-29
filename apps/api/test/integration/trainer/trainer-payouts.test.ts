import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import { Prisma } from "@prisma/client";
import { app } from "../../../src/app.js";

/**
 * Two client doubles on purpose (F1): `tx` is what `$transaction` hands the
 * callback, `prisma` is the global client. The balance MUST be read on `tx` —
 * asserting the global client stayed untouched is what proves the read and the
 * create share one transaction.
 */
const { txClient } = vi.hoisted(() => ({
  txClient: {
    course: { findMany: vi.fn() },
    orderItem: { aggregate: vi.fn() },
    trainerPayout: { aggregate: vi.fn(), create: vi.fn() },
    $queryRaw: vi.fn(),
  },
}));

vi.mock("../../../src/db/prisma.js", () => ({
  prisma: {
    course: { findMany: vi.fn() },
    orderItem: { aggregate: vi.fn() },
    // Kept mocked so a regression back to the platform-wide refund scan (F2)
    // shows up as an assertion failure instead of a crash.
    refund: { findMany: vi.fn() },
    courseEnrollment: { count: vi.fn() },
    trainerPayout: { findMany: vi.fn(), count: vi.fn(), aggregate: vi.fn(), create: vi.fn() },
    $queryRaw: vi.fn(),
    $transaction: vi.fn(),
  },
}));

vi.mock("../../../src/middleware/authenticate.js", () => ({
  authenticate: vi.fn((req, _res, next) => {
    req.user = { id: "trainer-1", email: "trainer@test.com", roles: ["trainer"] };
    next();
  }),
}));

const { prisma } = await import("../../../src/db/prisma.js");
const { authenticate } = await import("../../../src/middleware/authenticate.js");

const asTrainer = () => {
  vi.mocked(authenticate).mockImplementation(async (req, _res, next) => {
    (req as never as { user: unknown }).user = {
      id: "trainer-1", email: "trainer@test.com", roles: ["trainer"],
    };
    next();
  });
};

const asStudent = () => {
  vi.mocked(authenticate).mockImplementation(async (req, _res, next) => {
    (req as never as { user: unknown }).user = {
      id: "student-1", email: "student@test.com", roles: ["student"],
    };
    next();
  });
};

const validBody = {
  amount: 1_000_000,
  bankName: "BCA",
  accountNo: "1234567890",
  accountName: "Trainer Satu",
};

/** Amount handed to `trainerPayout.create` on the transaction client. */
const createdAmount = (): Prisma.Decimal =>
  (txClient.trainerPayout.create.mock.calls[0]?.[0] as { data: { amount: Prisma.Decimal } }).data.amount;

/**
 * Wire up the balance inputs used by services/payout/trainerPayoutService on the
 * TRANSACTION client: gross paid course revenue, the slice of it covered by
 * approved refunds, and payouts already committed.
 */
function mockBalance(opts: { gross: number; refunded?: number; committed?: number }) {
  txClient.course.findMany.mockResolvedValue([{ id: "course-1" }]);
  txClient.orderItem.aggregate.mockResolvedValue({ _sum: { totalPrice: opts.gross } });
  txClient.trainerPayout.aggregate.mockResolvedValue({ _sum: { amount: opts.committed ?? 0 } });
  // The refund slice is one scoped aggregate returning a decimal string (F2/F3).
  txClient.$queryRaw.mockResolvedValue([{ refunded: String(opts.refunded ?? 0) }]);
}

/** A Postgres serialization failure as Prisma surfaces it. */
const serializationFailure = () =>
  new Prisma.PrismaClientKnownRequestError("write conflict", {
    code: "P2034",
    clientVersion: "5.22.0",
  });

beforeEach(() => {
  vi.clearAllMocks();
  asTrainer();
  txClient.trainerPayout.create.mockImplementation(async (args: { data: object }) => ({
    id: "payout-new", status: "pending", ...args.data,
  }));
  // Default: run the callback against the transaction client, like Prisma does.
  vi.mocked(prisma.$transaction).mockImplementation((async (fn: (tx: unknown) => unknown) =>
    fn(txClient)) as never);
});

describe("POST /api/trainer/payouts (balance guard)", () => {
  it("creates the payout when the amount fits the available balance", async () => {
    // 10jt gross * 0.7 = 7jt available, no refunds, nothing committed.
    mockBalance({ gross: 10_000_000 });

    const res = await request(app).post("/api/trainer/payouts").send(validBody);

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(txClient.trainerPayout.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ trainerId: "trainer-1" }) }),
    );
    expect(createdAmount().toString()).toBe("1000000");
  });

  it("rejects an amount above the available balance with 400", async () => {
    // 1jt gross * 0.7 = 700rb available < 1jt requested.
    mockBalance({ gross: 1_000_000 });

    const res = await request(app).post("/api/trainer/payouts").send(validBody);

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(txClient.trainerPayout.create).not.toHaveBeenCalled();
  });

  it("subtracts approved refunds from the available balance (T2)", async () => {
    // Gross 2jt would allow 1.4jt, but 1jt of it sits on an approved refund:
    // (2jt - 1jt) * 0.7 = 700rb < 1jt requested.
    mockBalance({ gross: 2_000_000, refunded: 1_000_000 });

    const res = await request(app).post("/api/trainer/payouts").send(validBody);

    expect(res.status).toBe(400);
    expect(txClient.trainerPayout.create).not.toHaveBeenCalled();
  });

  it("scopes the refund slice to one query and never scans platform-wide refunds (F2)", async () => {
    mockBalance({ gross: 10_000_000, refunded: 1_000_000 });

    const res = await request(app).post("/api/trainer/payouts").send(validBody);

    expect(res.status).toBe(201);
    // One joined aggregate, no `refund.findMany` over every approved refund and
    // no second orderItem.aggregate fed by an unbounded `orderId: { in: [...] }`.
    expect(txClient.$queryRaw).toHaveBeenCalledTimes(1);
    expect(txClient.orderItem.aggregate).toHaveBeenCalledTimes(1);
    expect(prisma.refund.findMany).not.toHaveBeenCalled();
    // The trainer id is a bind parameter, so query size is independent of volume.
    const sql = txClient.$queryRaw.mock.calls[0]?.[0] as Prisma.Sql;
    expect(sql.values).toEqual(["trainer-1"]);
  });

  it("subtracts payouts already committed", async () => {
    // 10jt * 0.7 = 7jt earned, 6.5jt already requested/paid → 500rb left.
    mockBalance({ gross: 10_000_000, committed: 6_500_000 });

    const res = await request(app).post("/api/trainer/payouts").send(validBody);

    expect(res.status).toBe(400);
    expect(txClient.trainerPayout.create).not.toHaveBeenCalled();
  });

  it("returns 400 for an invalid body (non-positive amount)", async () => {
    const res = await request(app)
      .post("/api/trainer/payouts")
      .send({ ...validBody, amount: -1 });

    expect(res.status).toBe(400);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it("returns 403 for a student (requireTrainer)", async () => {
    asStudent();

    const res = await request(app).post("/api/trainer/payouts").send(validBody);

    expect(res.status).toBe(403);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });
});

// F1 regression: balance read and payout create must be one atomic unit.
describe("POST /api/trainer/payouts (F1 — atomic balance check)", () => {
  it("reads the balance inside the same transaction that creates the payout", async () => {
    mockBalance({ gross: 10_000_000 });

    const res = await request(app).post("/api/trainer/payouts").send(validBody);

    expect(res.status).toBe(201);
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    // Serializable: Postgres SSI aborts the losers of the read-then-insert race.
    expect(vi.mocked(prisma.$transaction).mock.calls[0]?.[1]).toEqual(
      expect.objectContaining({ isolationLevel: Prisma.TransactionIsolationLevel.Serializable }),
    );
    // Every balance input was read on the transaction client…
    expect(txClient.course.findMany).toHaveBeenCalled();
    expect(txClient.orderItem.aggregate).toHaveBeenCalled();
    expect(txClient.trainerPayout.aggregate).toHaveBeenCalled();
    expect(txClient.$queryRaw).toHaveBeenCalled();
    // …and nothing ran on the global client, which is what the pre-fix
    // read-then-write route did before creating the payout.
    expect(prisma.course.findMany).not.toHaveBeenCalled();
    expect(prisma.orderItem.aggregate).not.toHaveBeenCalled();
    expect(prisma.trainerPayout.aggregate).not.toHaveBeenCalled();
    expect(prisma.trainerPayout.create).not.toHaveBeenCalled();
  });

  it("creates nothing when the transaction body rejects the amount", async () => {
    mockBalance({ gross: 1_000_000 });

    const res = await request(app).post("/api/trainer/payouts").send(validBody);

    expect(res.status).toBe(400);
    expect(txClient.trainerPayout.create).not.toHaveBeenCalled();
    expect(prisma.trainerPayout.create).not.toHaveBeenCalled();
  });

  it("retries a serialization failure and still succeeds", async () => {
    mockBalance({ gross: 10_000_000 });
    vi.mocked(prisma.$transaction)
      .mockRejectedValueOnce(serializationFailure())
      .mockImplementationOnce((async (fn: (tx: unknown) => unknown) => fn(txClient)) as never);

    const res = await request(app).post("/api/trainer/payouts").send(validBody);

    expect(res.status).toBe(201);
    expect(prisma.$transaction).toHaveBeenCalledTimes(2);
  });

  it("returns 409 (not 500) when the request keeps losing the serialization race", async () => {
    mockBalance({ gross: 10_000_000 });
    vi.mocked(prisma.$transaction).mockRejectedValue(serializationFailure());

    const res = await request(app).post("/api/trainer/payouts").send(validBody);

    expect(res.status).toBe(409);
    expect(res.body.success).toBe(false);
    expect(prisma.$transaction).toHaveBeenCalledTimes(3);
  });

  it("does not retry an unrelated database error", async () => {
    mockBalance({ gross: 10_000_000 });
    vi.mocked(prisma.$transaction).mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError("boom", { code: "P2002", clientVersion: "5.22.0" }),
    );

    const res = await request(app).post("/api/trainer/payouts").send(validBody);

    expect(res.status).toBe(500);
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
  });
});

// F3 regression: the share is exact decimal arithmetic, not `Number * 0.7`.
describe("POST /api/trainer/payouts (F3 — decimal money)", () => {
  it("allows withdrawing the exact decimal share (8.15jt * 0.7 = 5.705jt)", async () => {
    // `8_150_000 * 0.7` on a double is 5_704_999.999999999, so the float version
    // rejected a trainer asking for exactly what they earned.
    mockBalance({ gross: 8_150_000 });

    const res = await request(app)
      .post("/api/trainer/payouts")
      .send({ ...validBody, amount: 5_705_000 });

    expect(res.status).toBe(201);
    expect(createdAmount().toString()).toBe("5705000");
  });

  it("rejects a sub-cent amount at the schema boundary", async () => {
    mockBalance({ gross: 10_000_000 });

    const res = await request(app)
      .post("/api/trainer/payouts")
      .send({ ...validBody, amount: 1_000_000.005 });

    expect(res.status).toBe(400);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it("rejects an amount larger than the Decimal(12,2) column", async () => {
    mockBalance({ gross: 10_000_000 });

    const res = await request(app)
      .post("/api/trainer/payouts")
      .send({ ...validBody, amount: 10_000_000_000 });

    expect(res.status).toBe(400);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it("truncates the share to 2 decimals instead of rounding up", async () => {
    // 1_000_000.05 * 0.7 = 700_000.035 → 700_000.03 withdrawable, not .04.
    mockBalance({ gross: 1_000_000.05 });

    const rejected = await request(app)
      .post("/api/trainer/payouts")
      .send({ ...validBody, amount: 700_000.04 });
    expect(rejected.status).toBe(400);

    const accepted = await request(app)
      .post("/api/trainer/payouts")
      .send({ ...validBody, amount: 700_000.03 });
    expect(accepted.status).toBe(201);
  });
});

describe("GET /api/trainer/payouts (pagination)", () => {
  beforeEach(() => {
    vi.mocked(prisma.trainerPayout.findMany).mockResolvedValue([] as never);
    vi.mocked(prisma.trainerPayout.count).mockResolvedValue(0 as never);
  });

  it("returns data as a flat array with pagination in meta", async () => {
    vi.mocked(prisma.trainerPayout.findMany).mockResolvedValue([
      { id: "payout-1", amount: "100000", status: "pending" },
    ] as never);
    vi.mocked(prisma.trainerPayout.count).mockResolvedValue(1 as never);

    const res = await request(app).get("/api/trainer/payouts");

    expect(res.status).toBe(200);
    // apps/web trainer-hub/payout reads body.data as an array — keep it flat.
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.meta).toMatchObject({ total: 1, page: 1, limit: 20 });
  });

  it("applies bounded page/limit params", async () => {
    const res = await request(app).get("/api/trainer/payouts?page=3&limit=5");

    expect(res.status).toBe(200);
    expect(prisma.trainerPayout.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ skip: 10, take: 5, where: { trainerId: "trainer-1" } }),
    );
    expect(res.body.meta).toMatchObject({ total: 0, page: 3, limit: 5 });
  });

  it("caps an oversized limit at MAX_LIMIT", async () => {
    const res = await request(app).get("/api/trainer/payouts?limit=99999");

    expect(res.status).toBe(200);
    expect(prisma.trainerPayout.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ take: 100 }), // MAX_LIMIT from lib/pagination
    );
    expect(res.body.meta).toMatchObject({ limit: 100 });
  });

  it("returns 403 for a student (requireTrainer)", async () => {
    asStudent();

    const res = await request(app).get("/api/trainer/payouts");

    expect(res.status).toBe(403);
    expect(prisma.trainerPayout.findMany).not.toHaveBeenCalled();
  });
});

// F4 regression: what the dashboard shows must be what the payout guard allows.
describe("GET /api/trainer/dashboard (F4 — displayed balance matches withdrawable)", () => {
  beforeEach(() => {
    vi.mocked(prisma.course.findMany).mockResolvedValue([
      { id: "course-1", title: "Kursus A", status: "published", price: 299_000, _count: { enrollments: 12 } },
    ] as never);
    vi.mocked(prisma.trainerPayout.count).mockResolvedValue(0 as never);
    vi.mocked(prisma.courseEnrollment.count).mockResolvedValue(12 as never);
    // The balance service runs on the global client here (no transaction).
    vi.mocked(prisma.orderItem.aggregate).mockResolvedValue({
      _sum: { totalPrice: 10_000_000 },
    } as never);
    vi.mocked(prisma.trainerPayout.aggregate).mockResolvedValue({
      _sum: { amount: 2_000_000 },
    } as never);
    vi.mocked(prisma.$queryRaw).mockResolvedValue([{ refunded: "1000000" }] as never);
  });

  it("reports gross, refunds, commitments and the withdrawable balance", async () => {
    const res = await request(app).get("/api/trainer/dashboard");

    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({
      totalRevenue: 10_000_000,
      refundedRevenue: 1_000_000,
      // (10jt - 1jt) * 0.7 = 6.3jt net, minus 2jt already committed.
      netRevenue: 6_300_000,
      committedPayouts: 2_000_000,
      availableBalance: 4_300_000,
    });
  });

  it("never shows a negative withdrawable balance", async () => {
    vi.mocked(prisma.trainerPayout.aggregate).mockResolvedValue({
      _sum: { amount: 99_000_000 },
    } as never);

    const res = await request(app).get("/api/trainer/dashboard");

    expect(res.status).toBe(200);
    expect(res.body.data.availableBalance).toBe(0);
  });
});
