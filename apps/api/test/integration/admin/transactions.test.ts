import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import { app } from "../../../src/app.js";
import jwt from "jsonwebtoken";

vi.mock("../../../src/db/prisma.js", () => ({
  prisma: {
    user: { findUnique: vi.fn() },
    order: { findMany: vi.fn(), count: vi.fn() },
  },
}));

const { prisma } = await import("../../../src/db/prisma.js");

const VALID_ADMIN = {
  id: "admin-1",
  email: "admin@jago.id",
  isActive: true,
  deletedAt: null,
  roles: [{ role: "super_admin" }],
};

const ADMIN_TOKEN = jwt.sign(
  { sub: "admin-1", email: "admin@jago.id", roles: ["super_admin"] },
  process.env.JWT_SECRET!,
  { expiresIn: "15m" }
);

const ADMIN_AUTH = { Authorization: `Bearer ${ADMIN_TOKEN}` };

const ORDER = {
  id: "ord-1",
  totalAmount: 200000,
  discountAmount: 50000,
  finalAmount: 150000,
  status: "paid",
  createdAt: new Date("2026-07-02T00:00:00.000Z"),
  user: { id: "user-1", name: "Budi", email: "budi@example.com" },
  items: [
    { itemType: "course", itemTitle: "Kelas Node" },
    { itemType: "ebook", itemTitle: "Buku TS" },
  ],
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(prisma.user.findUnique).mockResolvedValue(VALID_ADMIN as never);
});

describe("GET /api/admin/transactions", () => {
  it("returns a paginated order list", async () => {
    vi.mocked(prisma.order.findMany).mockResolvedValue([ORDER] as never);
    vi.mocked(prisma.order.count).mockResolvedValue(1);

    const res = await request(app).get("/api/admin/transactions").set(ADMIN_AUTH);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.meta).toEqual(expect.objectContaining({ total: 1, page: 1, limit: 20 }));
    expect(vi.mocked(prisma.order.findMany).mock.calls[0]![0]).toEqual(
      expect.objectContaining({ skip: 0, take: 20, where: {} })
    );
  });

  it("filters by status and searches id/user name/user email", async () => {
    vi.mocked(prisma.order.findMany).mockResolvedValue([] as never);
    vi.mocked(prisma.order.count).mockResolvedValue(0);

    const res = await request(app)
      .get("/api/admin/transactions")
      .query({ status: "paid", search: "budi", page: 3, limit: 5 })
      .set(ADMIN_AUTH);

    expect(res.status).toBe(200);
    const args = vi.mocked(prisma.order.findMany).mock.calls[0]![0]!;
    expect(args.skip).toBe(10);
    expect(args.take).toBe(5);
    expect(args.where).toEqual({
      status: "paid",
      OR: [
        { id: { contains: "budi" } },
        { user: { name: { contains: "budi", mode: "insensitive" } } },
        { user: { email: { contains: "budi", mode: "insensitive" } } },
      ],
    });
  });

  it("rejects an unknown status (400)", async () => {
    const res = await request(app)
      .get("/api/admin/transactions")
      .query({ status: "cancelled-by-alien" })
      .set(ADMIN_AUTH);

    expect(res.status).toBe(400);
    expect(prisma.order.findMany).not.toHaveBeenCalled();
  });
});

describe("GET /api/admin/orders (alias)", () => {
  it("serves the same paginated list", async () => {
    vi.mocked(prisma.order.findMany).mockResolvedValue([ORDER] as never);
    vi.mocked(prisma.order.count).mockResolvedValue(1);

    const res = await request(app)
      .get("/api/admin/orders")
      .query({ status: "pending" })
      .set(ADMIN_AUTH);

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(vi.mocked(prisma.order.findMany).mock.calls[0]![0]!.where).toEqual({
      status: "pending",
    });
  });
});

describe("GET /api/admin/transactions/export", () => {
  it("returns CSV with header row, joined items, and raw numeric amounts", async () => {
    vi.mocked(prisma.order.findMany).mockResolvedValue([ORDER] as never);

    const res = await request(app).get("/api/admin/transactions/export").set(ADMIN_AUTH);

    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toContain("text/csv");
    expect(res.headers["content-disposition"]).toBe(
      'attachment; filename="transactions-export.csv"'
    );
    const lines = res.text.split("\n");
    expect(lines[0]).toBe("ID,User,Email,Items,Total Amount,Discount,Final Amount,Status,Created At");
    expect(lines[1]).toContain('"[course] Kelas Node; [ebook] Buku TS"');
    // Numbers are emitted unquoted.
    expect(lines[1]).toContain("200000,50000,150000");
    expect(lines[1]).toContain("2026-07-02T00:00:00.000Z");
  });

  it("neutralizes formula injection in user name (M2)", async () => {
    vi.mocked(prisma.order.findMany).mockResolvedValue([
      { ...ORDER, user: { ...ORDER.user, name: "=cmd|'/C calc'!A0" } },
    ] as never);

    const res = await request(app).get("/api/admin/transactions/export").set(ADMIN_AUTH);

    expect(res.status).toBe(200);
    expect(res.text).toContain("\"'=cmd|'/C calc'!A0\"");
    expect(res.text).not.toContain('"=cmd');
  });

  it("caps the export query at 10k rows", async () => {
    vi.mocked(prisma.order.findMany).mockResolvedValue([] as never);

    const res = await request(app).get("/api/admin/transactions/export").set(ADMIN_AUTH);

    expect(res.status).toBe(200);
    expect(vi.mocked(prisma.order.findMany).mock.calls[0]![0]).toEqual(
      expect.objectContaining({ take: 10000 })
    );
  });
});

describe("GET /api/admin/orders/export (alias)", () => {
  it("serves the same CSV export", async () => {
    vi.mocked(prisma.order.findMany).mockResolvedValue([ORDER] as never);

    const res = await request(app).get("/api/admin/orders/export").set(ADMIN_AUTH);

    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toContain("text/csv");
    expect(res.text).toContain('"ord-1"');
  });
});
