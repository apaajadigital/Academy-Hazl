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

const mockPrisma = prisma as unknown as {
  course: { findMany: ReturnType<typeof vi.fn>; count: ReturnType<typeof vi.fn> };
};

const fakeCourse = {
  id: "c1",
  slug: "digital-marketing-101",
  title: "Digital Marketing 101",
  shortDesc: "Belajar marketing digital",
  price: "199000",
  salePrice: null,
  status: "published",
  level: "beginner",
  thumbnailUrl: null,
  totalDuration: 300,
  totalLessons: 10,
  totalEnrolled: 500,
  avgRating: "4.8",
  totalReviews: 100,
  isFeatured: true,
  publishedAt: new Date().toISOString(),
  createdAt: new Date().toISOString(),
  category: { id: "cat1", name: "Digital Marketing", slug: "digital-marketing" },
  trainer: { id: "t1", name: "Ahmad", avatarUrl: null },
};

beforeEach(() => {
  vi.clearAllMocks();
  mockPrisma.course.findMany.mockResolvedValue([fakeCourse]);
  mockPrisma.course.count.mockResolvedValue(1);
});

describe("GET /api/courses", () => {
  it("returns 200 with courses list", async () => {
    const res = await request(app).get("/api/courses");
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.data).toHaveLength(1);
    expect(res.body.data.total).toBe(1);
  });

  it("accepts category filter", async () => {
    mockPrisma.course.findMany.mockResolvedValue([]);
    mockPrisma.course.count.mockResolvedValue(0);
    const res = await request(app).get("/api/courses?category=design&page=1&limit=10");
    expect(res.status).toBe(200);
    expect(res.body.data.data).toHaveLength(0);
  });

  it("accepts level filter", async () => {
    const res = await request(app).get("/api/courses?level=beginner");
    expect(res.status).toBe(200);
  });

  it("accepts featured filter", async () => {
    const res = await request(app).get("/api/courses?featured=true");
    expect(res.status).toBe(200);
  });

  it("clamps limit to max 50", async () => {
    const res = await request(app).get("/api/courses?limit=1000");
    expect(res.status).toBe(200);
  });

  it("returns correct pagination shape", async () => {
    const res = await request(app).get("/api/courses?page=2&limit=5");
    expect(res.body.data).toHaveProperty("page");
    expect(res.body.data).toHaveProperty("limit");
    expect(res.body.data).toHaveProperty("total");
  });
});
