import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import { app } from "../../../src/app.js";

/**
 * B3 regression: both review list endpoints fed `parseInt(limit)` straight into
 * Prisma `take` and `(parseInt(page)-1)*parseInt(limit)` straight into `skip`.
 * `?limit=999999` was unbounded and `?page=0` produced a negative skip (500).
 * These tests pin the clamp AND the response shape — `data` must stay a flat
 * array, because apps/web reads it as one.
 */
vi.mock("../../../src/db/prisma.js", () => ({
  prisma: {
    review: {
      findMany: vi.fn(),
      count: vi.fn(),
      aggregate: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
  },
}));

vi.mock("../../../src/middleware/authenticate.js", () => ({
  authenticate: vi.fn((req, _res, next) => {
    req.user = { id: "admin-1", email: "admin@test.com", roles: ["super_admin"] };
    next();
  }),
}));

const { prisma } = await import("../../../src/db/prisma.js");

/** MAX_LIMIT in src/lib/pagination.ts. */
const MAX_LIMIT = 100;
/** Legacy default page size of the public listing, preserved by the clamp. */
const PUBLIC_DEFAULT_LIMIT = 10;

const publicUrl = (query = "") => `/api/reviews?itemType=course&itemId=c1${query}`;

const findManyArgs = () =>
  vi.mocked(prisma.review.findMany).mock.calls[0]?.[0] as { skip: number; take: number };

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(prisma.review.findMany).mockResolvedValue([
    { id: "r1", rating: 5, content: "Bagus!", user: { id: "u1", name: "Ali", avatarUrl: null } },
  ] as never);
  vi.mocked(prisma.review.count).mockResolvedValue(1 as never);
  vi.mocked(prisma.review.aggregate).mockResolvedValue({
    _avg: { rating: 5 },
    _count: { id: 1 },
  } as never);
});

describe("GET /api/reviews (B3 — bounded pagination)", () => {
  it("keeps data a flat array and page info in meta", async () => {
    const res = await request(app).get(publicUrl());

    expect(res.status).toBe(200);
    // Shape contract: the blog article client does `setReviews(d.data)` and
    // `d.meta?.avgRating` — an object-wrapped `data` would break it.
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.meta).toMatchObject({
      total: 1,
      page: 1,
      limit: PUBLIC_DEFAULT_LIMIT,
      avgRating: 5,
      totalReviews: 1,
    });
  });

  it("keeps the legacy default page size of 10 when no limit is sent", async () => {
    await request(app).get(publicUrl());

    expect(findManyArgs()).toMatchObject({ skip: 0, take: PUBLIC_DEFAULT_LIMIT });
  });

  it("caps an oversized limit instead of passing it to Prisma", async () => {
    const res = await request(app).get(publicUrl("&limit=999999"));

    expect(res.status).toBe(200);
    expect(findManyArgs().take).toBe(MAX_LIMIT);
    expect(res.body.meta).toMatchObject({ limit: MAX_LIMIT });
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  it("never produces a negative skip for page=0 (was a 500)", async () => {
    const res = await request(app).get(publicUrl("&page=0"));

    expect(res.status).toBe(200);
    expect(findManyArgs().skip).toBe(0);
    expect(res.body.meta).toMatchObject({ page: 1 });
  });

  it("never produces a negative skip for a negative page", async () => {
    const res = await request(app).get(publicUrl("&page=-5&limit=10"));

    expect(res.status).toBe(200);
    expect(findManyArgs().skip).toBe(0);
  });

  it("falls back to safe values for non-numeric params", async () => {
    const res = await request(app).get(publicUrl("&page=abc&limit=abc"));

    expect(res.status).toBe(200);
    expect(findManyArgs()).toMatchObject({ skip: 0, take: PUBLIC_DEFAULT_LIMIT });
  });

  it("applies valid page/limit params unchanged", async () => {
    const res = await request(app).get(publicUrl("&page=3&limit=5"));

    expect(res.status).toBe(200);
    expect(findManyArgs()).toMatchObject({ skip: 10, take: 5 });
    expect(res.body.meta).toMatchObject({ page: 3, limit: 5 });
  });
});

describe("GET /api/reviews/admin (B3 — bounded pagination)", () => {
  it("keeps data a flat array with page info in meta", async () => {
    const res = await request(app).get("/api/reviews/admin");

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.meta).toMatchObject({ total: 1, page: 1, limit: 20 });
  });

  it("caps an oversized limit", async () => {
    const res = await request(app).get("/api/reviews/admin?limit=999999");

    expect(res.status).toBe(200);
    expect(findManyArgs().take).toBe(MAX_LIMIT);
  });

  it("never produces a negative skip for page=0", async () => {
    const res = await request(app).get("/api/reviews/admin?page=0&limit=20");

    expect(res.status).toBe(200);
    expect(findManyArgs().skip).toBe(0);
  });

  it("still filters by itemType and status", async () => {
    const res = await request(app).get("/api/reviews/admin?itemType=course&status=hidden&page=2&limit=5");

    expect(res.status).toBe(200);
    expect(vi.mocked(prisma.review.findMany).mock.calls[0]?.[0]).toMatchObject({
      where: { itemType: "course", status: "hidden" },
      skip: 5,
      take: 5,
    });
  });
});
