import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import { app } from "../../../src/app.js";

vi.mock("../../../src/db/prisma.js", () => ({
  prisma: {
    course: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    courseCategory: { findMany: vi.fn(), findUnique: vi.fn() },
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
  course: {
    findUnique: ReturnType<typeof vi.fn>;
    findMany: ReturnType<typeof vi.fn>;
    count: ReturnType<typeof vi.fn>;
  };
};

const fullCourse = {
  id: "c1",
  slug: "digital-marketing-101",
  title: "Digital Marketing 101",
  shortDesc: "Belajar marketing digital",
  description: "Deskripsi lengkap",
  price: "199000",
  salePrice: null,
  status: "published",
  level: "beginner",
  thumbnailUrl: null,
  previewVideo: null,
  totalDuration: 300,
  totalLessons: 10,
  totalEnrolled: 500,
  avgRating: "4.8",
  totalReviews: 100,
  isFeatured: true,
  language: "id",
  metaTitle: null,
  metaDesc: null,
  publishedAt: new Date().toISOString(),
  createdAt: new Date().toISOString(),
  category: { id: "cat1", name: "Digital Marketing", slug: "digital-marketing" },
  trainer: { id: "t1", name: "Ahmad", avatarUrl: null },
  sections: [
    {
      id: "s1",
      title: "Pengantar",
      sortOrder: 0,
      lessons: [
        { id: "l1", title: "Apa itu Digital Marketing?", type: "video", duration: 600, isPreview: true, sortOrder: 0 },
      ],
    },
  ],
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("GET /api/courses/:slug", () => {
  it("returns 200 with full course detail for published course", async () => {
    mockPrisma.course.findUnique.mockResolvedValue(fullCourse);
    const res = await request(app).get("/api/courses/digital-marketing-101");
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.slug).toBe("digital-marketing-101");
    expect(res.body.data.sections).toHaveLength(1);
  });

  it("returns 404 for non-existent slug", async () => {
    mockPrisma.course.findUnique.mockResolvedValue(null);
    const res = await request(app).get("/api/courses/not-exist");
    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });

  it("returns 404 for draft course (non-admin)", async () => {
    mockPrisma.course.findUnique.mockResolvedValue({ ...fullCourse, status: "draft" });
    const res = await request(app).get("/api/courses/digital-marketing-101");
    expect(res.status).toBe(404);
  });
});
