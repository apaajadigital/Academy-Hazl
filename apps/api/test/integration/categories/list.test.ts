import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import { app } from "../../../src/app.js";

vi.mock("../../../src/db/prisma.js", () => ({
  prisma: {
    courseCategory: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
    },
    course: { findMany: vi.fn(), count: vi.fn() },
    auditLog: { create: vi.fn().mockResolvedValue({}) },
  },
}));

vi.mock("../../../src/services/search/meilisearch.js", () => ({
  searchCourses: vi.fn().mockResolvedValue({ hits: [], total: 0 }),
  indexCourse: vi.fn().mockResolvedValue(undefined),
  deleteCourseFromIndex: vi.fn().mockResolvedValue(undefined),
}));

import { prisma } from "../../../src/db/prisma.js";

const mockPrisma = prisma as unknown as {
  courseCategory: {
    findMany: ReturnType<typeof vi.fn>;
    findUnique: ReturnType<typeof vi.fn>;
  };
};

const fakeCategories = [
  { id: "cat1", name: "Digital Marketing", slug: "digital-marketing", iconUrl: null, sortOrder: 0, _count: { courses: 12 } },
  { id: "cat2", name: "Data Science", slug: "data-science", iconUrl: null, sortOrder: 1, _count: { courses: 8 } },
];

beforeEach(() => {
  vi.clearAllMocks();
  mockPrisma.courseCategory.findMany.mockResolvedValue(fakeCategories);
});

describe("GET /api/categories", () => {
  it("returns 200 with all categories", async () => {
    const res = await request(app).get("/api/categories");
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveLength(2);
  });

  it("includes course count per category", async () => {
    const res = await request(app).get("/api/categories");
    expect(res.body.data[0]).toHaveProperty("_count");
  });
});

describe("GET /api/categories/:slug", () => {
  it("returns 200 for existing category", async () => {
    mockPrisma.courseCategory.findUnique.mockResolvedValue(fakeCategories[0]);
    const res = await request(app).get("/api/categories/digital-marketing");
    expect(res.status).toBe(200);
    expect(res.body.data.slug).toBe("digital-marketing");
  });

  it("returns 404 for non-existent category", async () => {
    mockPrisma.courseCategory.findUnique.mockResolvedValue(null);
    const res = await request(app).get("/api/categories/not-exist");
    expect(res.status).toBe(404);
  });
});
