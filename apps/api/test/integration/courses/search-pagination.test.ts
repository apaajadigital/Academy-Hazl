/**
 * GET /api/courses?q= — pagination of the Meilisearch branch.
 *
 * The branch used to report `total` as the length of the page it had just
 * fetched, so the catalog computed totalPages = 1 for any active keyword and
 * every result after page 1 became unreachable. These tests pin `total` to the
 * size of the match set and the page to the requested slice.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import { app } from "../../../src/app.js";

vi.mock("../../../src/db/prisma.js", () => ({
  prisma: {
    course: { findMany: vi.fn(), count: vi.fn() },
    courseCategory: { findMany: vi.fn(), findUnique: vi.fn() },
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
const mockSearch = searchCourses as ReturnType<typeof vi.fn>;

const MATCH_COUNT = 12;

function fakeCourse(n: number) {
  return {
    id: `c${n}`,
    slug: `marketing-${n}`,
    title: `Marketing ${n}`,
    shortDesc: null,
    price: "99000",
    salePrice: null,
    status: "published",
    level: "beginner",
    thumbnailUrl: null,
    totalDuration: 0,
    totalLessons: 0,
    totalEnrolled: 0,
    avgRating: "0",
    totalReviews: 0,
    isFeatured: false,
    publishedAt: null,
    createdAt: new Date().toISOString(),
    category: null,
    trainer: { id: "t1", name: "Trainer", avatarUrl: null },
  };
}

const ALL = Array.from({ length: MATCH_COUNT }, (_, i) => fakeCourse(i + 1));

beforeEach(() => {
  vi.clearAllMocks();
  // Meilisearch matches 12 courses; Prisma hydrates all 12.
  mockSearch.mockResolvedValue({
    hits: ALL.map((c) => ({ id: c.id, slug: c.slug, title: c.title })),
    total: MATCH_COUNT,
  });
  mockPrisma.course.findMany.mockResolvedValue(ALL);
  mockPrisma.course.count.mockResolvedValue(MATCH_COUNT);
});

describe("GET /api/courses?q= — Meilisearch branch pagination", () => {
  it("reports the size of the match set, not the size of the page", async () => {
    const res = await request(app).get("/api/courses?q=marketing&limit=5&page=1");

    expect(res.status).toBe(200);
    expect(res.body.data.total).toBe(MATCH_COUNT);
    // The page itself is still capped at `limit` — total !== data.length is
    // exactly the property that was broken.
    expect(res.body.data.data).toHaveLength(5);
  });

  it("serves page 2 of a search instead of repeating page 1", async () => {
    const res = await request(app).get("/api/courses?q=marketing&limit=5&page=2");

    expect(res.status).toBe(200);
    expect(res.body.data.total).toBe(MATCH_COUNT);
    expect(res.body.data.data).toHaveLength(5);
    expect(res.body.data.data[0].slug).toBe("marketing-6");
  });

  it("serves a short final page", async () => {
    const res = await request(app).get("/api/courses?q=marketing&limit=5&page=3");

    expect(res.body.data.total).toBe(MATCH_COUNT);
    expect(res.body.data.data).toHaveLength(2);
    expect(res.body.data.data[0].slug).toBe("marketing-11");
  });

  it("counts only the hits that survive the Prisma filter", async () => {
    // Format/free/status are not in the search index, so hits can be dropped on
    // the Prisma fetch. `total` must reflect what the client can actually page
    // through, not the raw hit count.
    mockPrisma.course.findMany.mockResolvedValue(ALL.slice(0, 3));

    const res = await request(app).get("/api/courses?q=marketing&limit=5&page=1");

    expect(res.body.data.total).toBe(3);
    expect(res.body.data.data).toHaveLength(3);
  });

  it("preserves Meilisearch relevance order", async () => {
    // Prisma returns rows in its own order; the service must re-order by hit.
    mockSearch.mockResolvedValue({
      hits: [
        { id: "c3", slug: "marketing-3", title: "Marketing 3" },
        { id: "c1", slug: "marketing-1", title: "Marketing 1" },
      ],
      total: 2,
    });
    mockPrisma.course.findMany.mockResolvedValue([fakeCourse(1), fakeCourse(3)]);

    const res = await request(app).get("/api/courses?q=marketing");

    expect(res.body.data.data.map((c: { slug: string }) => c.slug)).toEqual([
      "marketing-3",
      "marketing-1",
    ]);
    expect(res.body.data.total).toBe(2);
  });

  it("falls back to the Prisma ILIKE branch when Meilisearch has no hits", async () => {
    mockSearch.mockResolvedValue({ hits: [], total: 0 });
    mockPrisma.course.findMany.mockResolvedValue(ALL.slice(0, 5));
    mockPrisma.course.count.mockResolvedValue(MATCH_COUNT);

    const res = await request(app).get("/api/courses?q=marketing&limit=5&page=1");

    // That branch already counted correctly — assert it stayed that way.
    expect(res.body.data.total).toBe(MATCH_COUNT);
    expect(res.body.data.data).toHaveLength(5);
  });
});
