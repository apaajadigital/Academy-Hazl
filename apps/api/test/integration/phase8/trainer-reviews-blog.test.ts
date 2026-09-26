import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import { app } from "../../../src/app.js";

vi.mock("../../../src/db/prisma.js", () => ({
  prisma: {
    course: { findMany: vi.fn(), findFirst: vi.fn() },
    courseEnrollment: { count: vi.fn(), findUnique: vi.fn() },
    orderItem: { aggregate: vi.fn(), findFirst: vi.fn() },
    trainerPayout: { findMany: vi.fn(), create: vi.fn(), count: vi.fn(), update: vi.fn(), aggregate: vi.fn() },
    review: {
      findMany: vi.fn(), count: vi.fn(), aggregate: vi.fn(),
      findUnique: vi.fn(), create: vi.fn(), update: vi.fn(),
    },
    blogPost: {
      findMany: vi.fn(), count: vi.fn(), findFirst: vi.fn(), findUnique: vi.fn(),
      create: vi.fn(), update: vi.fn(), delete: vi.fn(),
    },
    // The trainer dashboard now derives its money figures from
    // computeTrainerAvailableBalance, which sums committed payouts and joins
    // refunds via raw SQL — both must exist on the mock or the route 500s.
    $queryRaw: vi.fn(),
  },
}));

vi.mock("../../../src/middleware/authenticate.js", () => ({
  authenticate: vi.fn((req, _res, next) => {
    req.user = { id: "trainer-1", email: "trainer@test.com", roles: ["trainer"] };
    next();
  }),
}));

const { prisma } = await import("../../../src/db/prisma.js");
const mockPrisma = prisma as unknown as Record<string, Record<string, ReturnType<typeof vi.fn>>>;
// $queryRaw sits at the client root, not inside a model namespace, so it needs
// its own handle rather than going through mockPrisma's nested-record shape.
const mockQueryRaw = (prisma as unknown as { $queryRaw: ReturnType<typeof vi.fn> }).$queryRaw;

describe("GET /api/trainer/dashboard", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns trainer dashboard stats", async () => {
    mockPrisma.course.findMany.mockResolvedValue([
      { id: "c1", title: "Kursus A", status: "published", price: 299000, _count: { enrollments: 12 } },
    ]);
    mockPrisma.courseEnrollment.count.mockResolvedValue(12);
    mockPrisma.orderItem.aggregate.mockResolvedValue({ _sum: { totalPrice: 3000000 } });
    mockPrisma.trainerPayout.count.mockResolvedValue(0);
    mockPrisma.trainerPayout.aggregate.mockResolvedValue({ _sum: { amount: 0 } });
    mockQueryRaw.mockResolvedValue([{ refunded: "0" }]);

    const res = await request(app).get("/api/trainer/dashboard");
    expect(res.status).toBe(200);
    expect(res.body.data.totalCourses).toBe(1);
    expect(res.body.data.totalEnrollments).toBe(12);
    expect(res.body.data.totalRevenue).toBe(3000000);
    expect(res.body.data.netRevenue).toBeCloseTo(2100000);
  });
});

describe("GET /api/reviews", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns reviews for an item", async () => {
    mockPrisma.review.findMany.mockResolvedValue([
      { id: "r1", rating: 5, content: "Bagus!", createdAt: new Date(), user: { id: "u1", name: "Ali", avatarUrl: null } },
    ]);
    mockPrisma.review.count.mockResolvedValue(1);
    mockPrisma.review.aggregate.mockResolvedValue({ _avg: { rating: 5 }, _count: { id: 1 } });

    const res = await request(app).get("/api/reviews?itemType=course&itemId=c1");
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.meta.avgRating).toBe(5);
  });

  it("returns 400 when itemType or itemId missing", async () => {
    const res = await request(app).get("/api/reviews?itemType=course");
    expect(res.status).toBe(400);
  });
});

describe("POST /api/reviews", () => {
  beforeEach(() => vi.clearAllMocks());

  it("creates a review when the user is enrolled/has purchased", async () => {
    mockPrisma.review.findUnique.mockResolvedValue(null);
    // M-review: enrollment proves ownership for a course.
    mockPrisma.courseEnrollment.findUnique.mockResolvedValue({ id: "enr-1" });
    mockPrisma.review.create.mockResolvedValue({
      id: "r1", rating: 4, content: "Oke", itemType: "course", itemId: "c1",
      user: { id: "trainer-1", name: "Trainer", avatarUrl: null },
    });

    const res = await request(app).post("/api/reviews").send({ itemType: "course", itemId: "c1", rating: 4, content: "Oke" });
    expect(res.status).toBe(201);
    expect(res.body.data.rating).toBe(4);
  });

  it("rejects a review from a non-buyer (M-review)", async () => {
    mockPrisma.review.findUnique.mockResolvedValue(null);
    mockPrisma.courseEnrollment.findUnique.mockResolvedValue(null);
    mockPrisma.orderItem.findFirst.mockResolvedValue(null);
    const res = await request(app).post("/api/reviews").send({ itemType: "course", itemId: "c1", rating: 4 });
    expect(res.status).toBe(403);
    expect(mockPrisma.review.create).not.toHaveBeenCalled();
  });

  it("returns 409 if review already exists", async () => {
    mockPrisma.review.findUnique.mockResolvedValue({ id: "r1" });
    const res = await request(app).post("/api/reviews").send({ itemType: "course", itemId: "c1", rating: 3 });
    expect(res.status).toBe(409);
  });
});

describe("GET /api/blog", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns published blog posts", async () => {
    mockPrisma.blogPost.findMany.mockResolvedValue([
      { id: "b1", slug: "test-post", title: "Test", excerpt: null, coverUrl: null, category: null, tags: [], publishedAt: new Date(), author: { id: "a1", name: "Admin", avatarUrl: null } },
    ]);
    mockPrisma.blogPost.count.mockResolvedValue(1);

    const res = await request(app).get("/api/blog");
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].slug).toBe("test-post");
  });
});

describe("GET /api/blog/:slug", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns post by slug", async () => {
    mockPrisma.blogPost.findFirst.mockResolvedValue({
      id: "b1", slug: "test-post", title: "Test", content: "Isi...",
      tags: [], status: "published", author: { id: "a1", name: "Admin", avatarUrl: null },
    });
    const res = await request(app).get("/api/blog/test-post");
    expect(res.status).toBe(200);
    expect(res.body.data.title).toBe("Test");
  });

  it("returns 404 for missing slug", async () => {
    mockPrisma.blogPost.findFirst.mockResolvedValue(null);
    const res = await request(app).get("/api/blog/tidak-ada");
    expect(res.status).toBe(404);
  });
});
