import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import { app } from "../../../src/app.js";

/**
 * Contract test for `GET /api/affiliate/me` (BL-125).
 *
 * This endpoint had a two-layer failure. The dashboard called it with no
 * Authorization header, so it always answered 401 and the affiliate menu was
 * dead. Fixing only that would have swapped a blank page for a crashing one:
 * the page renders `commission.referredUser.name`, and the include never
 * selected `referredUser`, so the first commission an affiliate earned took the
 * page down.
 *
 * The lesson is that the contract, not the page, is the thing to pin. A response
 * shape the UI depends on has to be asserted here, or the next include someone
 * trims goes unnoticed until a user with data hits it — which is precisely the
 * population that matters.
 */

vi.mock("../../../src/db/prisma.js", () => ({
  prisma: {
    affiliate: { findUnique: vi.fn() },
  },
}));

vi.mock("../../../src/middleware/authenticate.js", () => ({
  authenticate: vi.fn((req, _res, next) => {
    req.user = { id: "user-1", email: "u@test.com", roles: ["student"] };
    next();
  }),
}));

const { prisma } = await import("../../../src/db/prisma.js");

const commission = {
  id: "comm-1",
  commissionAmt: "29900",
  grossAmount: "299000",
  status: "pending",
  createdAt: new Date("2026-09-01"),
  order: { id: "order-1", finalAmount: "299000" },
  referredUser: { id: "user-2", name: "Budi Santoso" },
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(prisma.affiliate.findUnique).mockResolvedValue({
    id: "aff-1",
    userId: "user-1",
    code: "JAGO123",
    balance: "29900",
    commissions: [commission],
  } as never);
});

describe("GET /api/affiliate/me — response contract", () => {
  it("includes referredUser on every commission the dashboard renders", async () => {
    const res = await request(app).get("/api/affiliate/me");

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    // The field whose absence crashed /dashboard/afiliasi.
    expect(res.body.data.commissions[0]).toHaveProperty("referredUser");
    expect(res.body.data.commissions[0].referredUser).toMatchObject({ name: "Budi Santoso" });
  });

  it("asks Prisma for referredUser explicitly", async () => {
    await request(app).get("/api/affiliate/me");

    const args = vi.mocked(prisma.affiliate.findUnique).mock.calls[0]![0] as unknown as {
      include: { commissions: { include: Record<string, unknown> } };
    };
    // Asserting the query, not just the mocked payload: without this, a mock
    // that happens to return referredUser would keep the test green after
    // someone removed the include.
    expect(args.include.commissions.include).toHaveProperty("referredUser");
    expect(args.include.commissions.include).toHaveProperty("order");
  });

  it("exposes only the referred user's id and name, not their contact details", async () => {
    await request(app).get("/api/affiliate/me");

    const args = vi.mocked(prisma.affiliate.findUnique).mock.calls[0]![0] as unknown as {
      include: { commissions: { include: { referredUser: { select: Record<string, boolean> } } } };
    };
    const select = args.include.commissions.include.referredUser.select;
    // This is somebody else's record. An affiliate needs a name to recognise a
    // conversion; they have no business receiving the buyer's email.
    expect(Object.keys(select).sort()).toEqual(["id", "name"]);
    expect(select).not.toHaveProperty("email");
    expect(select).not.toHaveProperty("phone");
  });

  it("keeps the commission fields the table renders", async () => {
    const res = await request(app).get("/api/affiliate/me");

    const row = res.body.data.commissions[0];
    for (const field of ["id", "commissionAmt", "grossAmount", "status", "createdAt", "order"]) {
      expect(row).toHaveProperty(field);
    }
    expect(row.order).toHaveProperty("finalAmount");
  });

  it("returns data: null — not 404 — for a user who never joined the programme", async () => {
    vi.mocked(prisma.affiliate.findUnique).mockResolvedValue(null as never);

    const res = await request(app).get("/api/affiliate/me");

    // The page distinguishes "no affiliate account" (show the join screen) from
    // "request failed" (show an error). Turning this into a 404 would collapse
    // the two back together.
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toBeNull();
  });
});

describe("GET /api/affiliate/me — authentication", () => {
  it("is behind authenticate, so an unauthenticated call cannot read commissions", async () => {
    const { authenticate } = await import("../../../src/middleware/authenticate.js");
    vi.mocked(authenticate).mockImplementationOnce(async (_req, res) => {
      res.status(401).json({ success: false, error: { code: "UNAUTHORIZED", message: "..." } });
    });

    const res = await request(app).get("/api/affiliate/me");

    expect(res.status).toBe(401);
    expect(prisma.affiliate.findUnique).not.toHaveBeenCalled();
  });
});
