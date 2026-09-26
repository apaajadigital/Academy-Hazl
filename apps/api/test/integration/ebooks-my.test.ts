import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import { app } from "../../src/app.js";
import jwt from "jsonwebtoken";

vi.mock("../../src/db/prisma.js", () => ({
  prisma: {
    user: { findUnique: vi.fn() },
    eBook: { findUnique: vi.fn(), findMany: vi.fn() },
    orderItem: { findMany: vi.fn(), findFirst: vi.fn() },
  },
}));

const { prisma } = await import("../../src/db/prisma.js");

const VALID_USER = {
  id: "user-1",
  email: "user@jago.id",
  isActive: true,
  deletedAt: null,
  roles: [{ role: "student" }],
};

const VALID_ADMIN = {
  id: "admin-1",
  email: "admin@jago.id",
  isActive: true,
  deletedAt: null,
  roles: [{ role: "super_admin" }],
};

const USER_TOKEN = jwt.sign(
  { sub: "user-1", email: "user@jago.id", roles: ["student"] },
  process.env.JWT_SECRET!,
  { expiresIn: "15m" }
);

const ADMIN_TOKEN = jwt.sign(
  { sub: "admin-1", email: "admin@jago.id", roles: ["super_admin"] },
  process.env.JWT_SECRET!,
  { expiresIn: "15m" }
);

const USER_AUTH = { Authorization: `Bearer ${USER_TOKEN}` };
const ADMIN_AUTH = { Authorization: `Bearer ${ADMIN_TOKEN}` };

const PUBLISHED_EBOOK = {
  id: "eb-1",
  slug: "buku-ts",
  title: "Buku TS",
  status: "published",
  fileUrl: "https://jago.id/buku-ts.pdf",
  createdAt: new Date("2026-01-01T00:00:00.000Z"),
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("GET /api/ebooks/my", () => {
  it("returns purchased ebooks with purchasedAt taken from the paid order", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(VALID_USER as never);
    vi.mocked(prisma.orderItem.findMany).mockResolvedValue([
      { itemId: "eb-1", order: { paidAt: new Date("2026-06-30T10:00:00.000Z") } },
    ] as never);
    vi.mocked(prisma.eBook.findMany).mockResolvedValue([PUBLISHED_EBOOK] as never);

    const res = await request(app).get("/api/ebooks/my").set(USER_AUTH);

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].purchasedAt).toBe("2026-06-30T10:00:00.000Z");
    // Only paid orders of THIS user may be considered.
    expect(vi.mocked(prisma.orderItem.findMany).mock.calls[0]![0]).toEqual(
      expect.objectContaining({
        where: expect.objectContaining({
          itemType: "ebook",
          order: { userId: "user-1", status: "paid" },
        }),
      })
    );
  });

  it("falls back to the ebook createdAt when the order has no paidAt", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(VALID_USER as never);
    vi.mocked(prisma.orderItem.findMany).mockResolvedValue([
      { itemId: "eb-1", order: { paidAt: null } },
    ] as never);
    vi.mocked(prisma.eBook.findMany).mockResolvedValue([PUBLISHED_EBOOK] as never);

    const res = await request(app).get("/api/ebooks/my").set(USER_AUTH);

    expect(res.status).toBe(200);
    expect(res.body.data[0].purchasedAt).toBe("2026-01-01T00:00:00.000Z");
  });

  it("returns an empty list without querying ebooks when nothing was purchased", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(VALID_USER as never);
    vi.mocked(prisma.orderItem.findMany).mockResolvedValue([] as never);

    const res = await request(app).get("/api/ebooks/my").set(USER_AUTH);

    expect(res.status).toBe(200);
    expect(res.body.data).toEqual([]);
    expect(prisma.eBook.findMany).not.toHaveBeenCalled();
  });

  it("returns 401 without auth", async () => {
    const res = await request(app).get("/api/ebooks/my");
    expect(res.status).toBe(401);
  });
});

describe("GET /api/ebooks/:slug (draft gating)", () => {
  it("returns 404 for a draft ebook even when it exists", async () => {
    vi.mocked(prisma.eBook.findUnique).mockResolvedValue({
      ...PUBLISHED_EBOOK,
      status: "draft",
    } as never);

    const res = await request(app).get("/api/ebooks/buku-ts");
    expect(res.status).toBe(404);
  });
});

describe("GET /api/ebooks/:slug/file", () => {
  it("returns the file URL for a user with a paid purchase", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(VALID_USER as never);
    vi.mocked(prisma.eBook.findUnique).mockResolvedValue(PUBLISHED_EBOOK as never);
    vi.mocked(prisma.orderItem.findFirst).mockResolvedValue({ id: "oi-1" } as never);

    const res = await request(app).get("/api/ebooks/buku-ts/file").set(USER_AUTH);

    expect(res.status).toBe(200);
    expect(res.body.data.fileUrl).toBe("https://jago.id/buku-ts.pdf");
  });

  it("returns 403 when the user has not purchased the ebook", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(VALID_USER as never);
    vi.mocked(prisma.eBook.findUnique).mockResolvedValue(PUBLISHED_EBOOK as never);
    vi.mocked(prisma.orderItem.findFirst).mockResolvedValue(null);

    const res = await request(app).get("/api/ebooks/buku-ts/file").set(USER_AUTH);

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });

  it("lets a super_admin access the file without a purchase", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(VALID_ADMIN as never);
    vi.mocked(prisma.eBook.findUnique).mockResolvedValue(PUBLISHED_EBOOK as never);
    vi.mocked(prisma.orderItem.findFirst).mockResolvedValue(null);

    const res = await request(app).get("/api/ebooks/buku-ts/file").set(ADMIN_AUTH);

    expect(res.status).toBe(200);
    expect(res.body.data.fileUrl).toBe("https://jago.id/buku-ts.pdf");
  });

  it("returns 404 for a draft ebook", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(VALID_USER as never);
    vi.mocked(prisma.eBook.findUnique).mockResolvedValue({
      ...PUBLISHED_EBOOK,
      status: "draft",
    } as never);

    const res = await request(app).get("/api/ebooks/buku-ts/file").set(USER_AUTH);
    expect(res.status).toBe(404);
  });
});
