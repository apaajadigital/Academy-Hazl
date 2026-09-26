// BL-47 Private Class: catalog split + no leak of onboarding fields on public
// endpoints. The prisma layer is mocked, so these tests assert on the QUERY
// ARGUMENTS (the real protection) as well as the response shape.
import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import { app } from "../../../src/app.js";

vi.mock("../../../src/db/prisma.js", () => ({
  prisma: {
    course: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      count: vi.fn(),
    },
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

const mockPrisma = prisma as unknown as {
  course: {
    findMany: ReturnType<typeof vi.fn>;
    findUnique: ReturnType<typeof vi.fn>;
    count: ReturnType<typeof vi.fn>;
  };
};

const privateClassCourse = {
  id: "pc1",
  slug: "private-class-fullstack",
  title: "Private Class Fullstack",
  shortDesc: "Kelas privat intensif",
  description: "Deskripsi lengkap",
  price: "4999000",
  salePrice: null,
  status: "published",
  level: "beginner",
  thumbnailUrl: null,
  previewVideo: null,
  totalDuration: 0,
  totalLessons: 0,
  totalEnrolled: 3,
  avgRating: "5.0",
  totalReviews: 1,
  isFeatured: false,
  language: "id",
  metaTitle: null,
  metaDesc: null,
  format: "private_class",
  publishedAt: new Date().toISOString(),
  createdAt: new Date().toISOString(),
  category: null,
  trainer: { id: "t1", name: "Ahmad", avatarUrl: null },
  sections: [],
};

beforeEach(() => {
  vi.clearAllMocks();
  mockPrisma.course.findMany.mockResolvedValue([]);
  mockPrisma.course.count.mockResolvedValue(0);
});

describe("GET /api/courses (format filter, BL-47)", () => {
  it("excludes private_class from the default catalog query", async () => {
    const res = await request(app).get("/api/courses");
    expect(res.status).toBe(200);
    const findManyArgs = mockPrisma.course.findMany.mock.calls[0]?.[0];
    expect(findManyArgs.where.format).toEqual({ not: "private_class" });
  });

  it("returns only private classes when format=private_class", async () => {
    mockPrisma.course.findMany.mockResolvedValue([privateClassCourse]);
    mockPrisma.course.count.mockResolvedValue(1);
    const res = await request(app).get("/api/courses?format=private_class");
    expect(res.status).toBe(200);
    expect(res.body.data.data).toHaveLength(1);
    const findManyArgs = mockPrisma.course.findMany.mock.calls[0]?.[0];
    expect(findManyArgs.where.format).toBe("private_class");
    expect(findManyArgs.where.status).toBe("published");
  });

  it("accepts format=regular explicitly", async () => {
    const res = await request(app).get("/api/courses?format=regular");
    expect(res.status).toBe(200);
    const findManyArgs = mockPrisma.course.findMany.mock.calls[0]?.[0];
    expect(findManyArgs.where.format).toBe("regular");
  });

  it("rejects an invalid format value with 400", async () => {
    const res = await request(app).get("/api/courses?format=vip");
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(mockPrisma.course.findMany).not.toHaveBeenCalled();
  });

  it("does not select waGroupLink/onboardingContact in the list query", async () => {
    await request(app).get("/api/courses?format=private_class");
    const findManyArgs = mockPrisma.course.findMany.mock.calls[0]?.[0];
    expect(findManyArgs.select).not.toHaveProperty("waGroupLink");
    expect(findManyArgs.select).not.toHaveProperty("onboardingContact");
  });
});

describe("GET /api/courses/:slug (private class detail, BL-47)", () => {
  it("still serves a published private_class course (checkout needs it) with format", async () => {
    mockPrisma.course.findUnique.mockResolvedValue(privateClassCourse);
    const res = await request(app).get("/api/courses/private-class-fullstack");
    expect(res.status).toBe(200);
    expect(res.body.data.format).toBe("private_class");
  });

  it("does not select or expose waGroupLink/onboardingContact publicly", async () => {
    mockPrisma.course.findUnique.mockResolvedValue(privateClassCourse);
    const res = await request(app).get("/api/courses/private-class-fullstack");
    expect(res.status).toBe(200);
    // Query-level guarantee: the sensitive columns are never selected.
    const findUniqueArgs = mockPrisma.course.findUnique.mock.calls[0]?.[0];
    expect(findUniqueArgs.select).not.toHaveProperty("waGroupLink");
    expect(findUniqueArgs.select).not.toHaveProperty("onboardingContact");
    // Response-level guarantee for the mocked payload.
    expect(res.body.data).not.toHaveProperty("waGroupLink");
    expect(res.body.data).not.toHaveProperty("onboardingContact");
  });
});
