import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";

vi.mock("../../../src/db/prisma.js", () => ({
  prisma: {
    memberPortfolio: { findMany: vi.fn(), count: vi.fn(), findUnique: vi.fn() },
  },
}));

const { app } = await import("../../../src/app.js");
const { prisma } = await import("../../../src/db/prisma.js");
const p = prisma as unknown as {
  memberPortfolio: {
    findMany: ReturnType<typeof vi.fn>;
    count: ReturnType<typeof vi.fn>;
    findUnique: ReturnType<typeof vi.fn>;
  };
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("Public member portfolios (Phase B, BL-48)", () => {
  it("GET / lists only published portfolios, featured first, without portfolioItems", async () => {
    p.memberPortfolio.findMany.mockResolvedValue([
      { id: "pf-1", name: "Sari", role: "UI/UX Designer", headline: "Design lover", photoUrl: null, featured: true },
    ]);
    p.memberPortfolio.count.mockResolvedValue(1);

    const res = await request(app).get("/api/portfolios");
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.meta.total).toBe(1);
    // List view must stay light: no portfolioItems in the payload.
    expect(res.body.data[0]).not.toHaveProperty("portfolioItems");
    expect(p.memberPortfolio.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { status: "published" },
        orderBy: [{ featured: "desc" }, { createdAt: "desc" }],
        select: expect.not.objectContaining({ portfolioItems: true }),
      }),
    );
  });

  it("GET / paginates with default limit 20", async () => {
    p.memberPortfolio.findMany.mockResolvedValue([]);
    p.memberPortfolio.count.mockResolvedValue(0);

    const res = await request(app).get("/api/portfolios?page=2");
    expect(res.status).toBe(200);
    expect(res.body.meta).toEqual({ total: 0, page: 2, limit: 20 });
    expect(p.memberPortfolio.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ skip: 20, take: 20 }),
    );
  });

  it("GET /:id returns full detail incl. portfolioItems for a published portfolio", async () => {
    p.memberPortfolio.findUnique.mockResolvedValue({
      id: "pf-1",
      name: "Sari",
      role: "UI/UX Designer",
      status: "published",
      portfolioItems: [{ title: "Redesign App", url: "https://example.com/case" }],
    });

    const res = await request(app).get("/api/portfolios/pf-1");
    expect(res.status).toBe(200);
    expect(res.body.data.portfolioItems).toHaveLength(1);
    expect(res.body.data.portfolioItems[0].title).toBe("Redesign App");
  });

  it("GET /:id returns 404 for a draft portfolio", async () => {
    p.memberPortfolio.findUnique.mockResolvedValue({ id: "pf-2", status: "draft" });
    const res = await request(app).get("/api/portfolios/pf-2");
    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });

  it("GET /:id returns 404 for a missing portfolio", async () => {
    p.memberPortfolio.findUnique.mockResolvedValue(null);
    const res = await request(app).get("/api/portfolios/nope");
    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });
});
