import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import { app } from "../../../src/app.js";

vi.mock("../../../src/db/prisma.js", () => ({
  prisma: {
    course: {
      findMany: vi.fn(),
      count: vi.fn(),
    },
    courseCategory: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
    },
  },
}));

vi.mock("../../../src/services/search/meilisearch.js", () => ({
  searchCourses: vi.fn().mockResolvedValue({ hits: [], total: 0 }),
  indexCourse: vi.fn().mockResolvedValue(undefined),
  deleteCourseFromIndex: vi.fn().mockResolvedValue(undefined),
  ensureCourseIndexSettings: vi.fn().mockResolvedValue(undefined),
}));

import { prisma } from "../../../src/db/prisma.js";
import { searchCourses } from "../../../src/services/search/meilisearch.js";

const mockPrisma = prisma as unknown as {
  course: { findMany: ReturnType<typeof vi.fn>; count: ReturnType<typeof vi.fn> };
};

const freeCourse = {
  id: "c-free",
  slug: "dasar-branding",
  title: "Dasar Branding",
  shortDesc: "Kelas pembuka gratis",
  price: "0",
  salePrice: null,
  status: "published",
  level: "beginner",
  thumbnailUrl: null,
  totalDuration: 90,
  totalLessons: 4,
  totalEnrolled: 120,
  avgRating: "4.6",
  totalReviews: 12,
  isFeatured: false,
  publishedAt: new Date().toISOString(),
  createdAt: new Date().toISOString(),
  category: { id: "cat1", name: "Branding", slug: "branding" },
  trainer: { id: "t1", name: "Sari", avatarUrl: null },
};

/**
 * The where-clause the service must build for `free=true`.
 *
 * Asserting on the clause (rather than on filtered rows) is deliberate: prisma
 * is mocked, so row-level filtering never actually runs here. The clause IS the
 * contract — it encodes that a course counts as free only when price = 0 AND
 * salePrice is null-or-0, which is what keeps a "GRATIS" badge from appearing
 * on a course that checkout would still charge for.
 */
const FREE_CLAUSE = { AND: [{ price: 0, OR: [{ salePrice: null }, { salePrice: 0 }] }] };

beforeEach(() => {
  vi.clearAllMocks();
  mockPrisma.course.findMany.mockResolvedValue([freeCourse]);
  mockPrisma.course.count.mockResolvedValue(1);
  vi.mocked(searchCourses).mockResolvedValue({ hits: [], total: 0 });
});

describe("GET /api/courses?free=true", () => {
  it("returns 200 and constrains the query to genuinely free courses", async () => {
    const res = await request(app).get("/api/courses?free=true");

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    // Deliberately no assertion on the returned rows: prisma is mocked, so the
    // response only echoes the fixture and would look identical with a broken
    // filter. The where clause below is the only real evidence.
    expect(mockPrisma.course.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining(FREE_CLAUSE) }),
    );
  });

  it("applies the same constraint to the count so pagination stays truthful", async () => {
    await request(app).get("/api/courses?free=true");

    expect(mockPrisma.course.count).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining(FREE_CLAUSE) }),
    );
  });

  it("keeps private classes out of the free catalog", async () => {
    await request(app).get("/api/courses?free=true");

    const where = mockPrisma.course.findMany.mock.calls[0]![0].where;
    expect(where.format).toEqual({ not: "private_class" });
    expect(where.status).toBe("published");
  });

  it("does not constrain price when free is omitted", async () => {
    await request(app).get("/api/courses");

    const where = mockPrisma.course.findMany.mock.calls[0]![0].where;
    expect(where).not.toHaveProperty("AND");
  });

  it("treats free=false as no price constraint", async () => {
    await request(app).get("/api/courses?free=false");

    const where = mockPrisma.course.findMany.mock.calls[0]![0].where;
    expect(where).not.toHaveProperty("AND");
  });

  it("rejects an invalid free value instead of serving the whole catalog", async () => {
    const res = await request(app).get("/api/courses?free=gratis");

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
    expect(res.body.error.message).toContain("free");
    expect(mockPrisma.course.findMany).not.toHaveBeenCalled();
  });

  it("still reports the format error for an invalid format (BL-47 regression)", async () => {
    const res = await request(app).get("/api/courses?format=bogus");

    expect(res.status).toBe(400);
    expect(res.body.error.message).toContain("format");
  });

  it("survives the category/level/featured mutations on the where object", async () => {
    // The plain branch builds `where` as a mutable Record and then assigns
    // category/level/isFeatured onto it. A regression that overwrote the object
    // instead of adding keys would drop the free constraint silently.
    await request(app).get("/api/courses?free=true&category=branding&level=beginner&featured=true");

    const where = mockPrisma.course.findMany.mock.calls[0]![0].where;
    expect(where).toMatchObject(FREE_CLAUSE);
    expect(where.category).toEqual({ slug: "branding" });
    expect(where.level).toBe("beginner");
    expect(where.isFeatured).toBe(true);
  });

  it("composes with pagination", async () => {
    await request(app).get("/api/courses?free=true&limit=8");

    expect(mockPrisma.course.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ take: 8, where: expect.objectContaining(FREE_CLAUSE) }),
    );
  });

  it("survives the text-search fallback without losing the OR on title/shortDesc", async () => {
    await request(app).get("/api/courses?free=true&q=branding");

    const where = mockPrisma.course.findMany.mock.calls[0]![0].where;
    expect(where).toMatchObject(FREE_CLAUSE);
    // The ILIKE branch's own OR must survive alongside the free AND — a single
    // where object cannot carry two OR keys, which is why free uses AND.
    expect(where.OR).toHaveLength(2);
  });

  it("applies the constraint on the Meilisearch hit path too", async () => {
    vi.mocked(searchCourses).mockResolvedValue({ hits: [{ slug: "dasar-branding" }], total: 1 } as never);

    await request(app).get("/api/courses?free=true&q=branding");

    const where = mockPrisma.course.findMany.mock.calls[0]![0].where;
    expect(where).toMatchObject(FREE_CLAUSE);
    expect(where.slug).toEqual({ in: ["dasar-branding"] });
  });
});
