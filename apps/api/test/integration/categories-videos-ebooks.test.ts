import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import { app } from "../../src/app.js";

vi.mock("../../src/db/prisma.js", () => ({
  prisma: {
    courseCategory: {
      findMany: vi.fn(), findUnique: vi.fn(),
    },
    courseLesson: { findUnique: vi.fn() },
    courseEnrollment: { findUnique: vi.fn() },
    eBook: {
      findMany: vi.fn(), findUnique: vi.fn(), count: vi.fn(),
    },
  },
}));

vi.mock("../../src/middleware/authenticate.js", () => ({
  authenticate: vi.fn((req, _res, next) => {
    req.user = { id: "user-1", email: "user@test.com", roles: [] };
    next();
  }),
}));

const { prisma } = await import("../../src/db/prisma.js");
const m = prisma as unknown as Record<string, Record<string, ReturnType<typeof vi.fn>>>;

// ─── Categories ───────────────────────────────────────────────────────────────

describe("GET /api/categories", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns list of categories with published course count", async () => {
    m.courseCategory.findMany.mockResolvedValue([
      { id: "cat1", name: "Marketing", slug: "marketing", iconUrl: null, sortOrder: 1, _count: { courses: 5 } },
      { id: "cat2", name: "Desain", slug: "desain", iconUrl: null, sortOrder: 2, _count: { courses: 3 } },
    ]);

    const res = await request(app).get("/api/categories");
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveLength(2);
    expect(res.body.data[0].name).toBe("Marketing");
  });

  it("returns empty array when no categories", async () => {
    m.courseCategory.findMany.mockResolvedValue([]);
    const res = await request(app).get("/api/categories");
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(0);
  });
});

describe("GET /api/categories/:slug", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns category by slug", async () => {
    m.courseCategory.findUnique.mockResolvedValue({
      id: "cat1", name: "Marketing", slug: "marketing",
      iconUrl: null, _count: { courses: 5 },
    });

    const res = await request(app).get("/api/categories/marketing");
    expect(res.status).toBe(200);
    expect(res.body.data.slug).toBe("marketing");
    expect(res.body.data._count.courses).toBe(5);
  });

  it("returns 404 for unknown category slug", async () => {
    m.courseCategory.findUnique.mockResolvedValue(null);
    const res = await request(app).get("/api/categories/tidak-ada");
    expect(res.status).toBe(404);
  });
});

// ─── Videos ───────────────────────────────────────────────────────────────────

describe("GET /api/videos/:lessonId/url", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns video URL for preview lesson (no enrollment required)", async () => {
    m.courseLesson.findUnique.mockResolvedValue({
      id: "l1", title: "Intro", isPreview: true,
      contentUrl: "https://cdn.example.com/video.mp4",
      section: { course: { id: "c1", status: "published" } },
    });

    const res = await request(app).get("/api/videos/l1/url");
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveProperty("url");
    expect(res.body.data).toHaveProperty("expiresAt");
  });

  it("returns video URL for enrolled non-preview lesson", async () => {
    m.courseLesson.findUnique.mockResolvedValue({
      id: "l2", title: "Lesson 2", isPreview: false,
      contentUrl: "https://cdn.example.com/lesson2.mp4",
      section: { course: { id: "c1", status: "published" } },
    });
    m.courseEnrollment.findUnique.mockResolvedValue({ courseId: "c1", userId: "user-1" });

    const res = await request(app).get("/api/videos/l2/url");
    expect(res.status).toBe(200);
    expect(res.body.data.url).toContain("example.com");
  });

  it("returns 403 for non-preview lesson when not enrolled", async () => {
    m.courseLesson.findUnique.mockResolvedValue({
      id: "l3", title: "Locked Lesson", isPreview: false,
      contentUrl: "https://cdn.example.com/locked.mp4",
      section: { course: { id: "c1", status: "published" } },
    });
    m.courseEnrollment.findUnique.mockResolvedValue(null);

    const res = await request(app).get("/api/videos/l3/url");
    expect(res.status).toBe(403);
  });

  it("returns 404 for unknown lesson", async () => {
    m.courseLesson.findUnique.mockResolvedValue(null);
    const res = await request(app).get("/api/videos/invalid/url");
    expect(res.status).toBe(404);
  });

  it("returns 404 when video URL not set", async () => {
    m.courseLesson.findUnique.mockResolvedValue({
      id: "l4", title: "No Video", isPreview: true,
      contentUrl: null,
      section: { course: { id: "c1", status: "published" } },
    });

    const res = await request(app).get("/api/videos/l4/url");
    expect(res.status).toBe(404);
  });
});

// ─── E-Books ──────────────────────────────────────────────────────────────────

describe("GET /api/ebooks", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns published ebook list with pagination", async () => {
    m.eBook.findMany.mockResolvedValue([
      { id: "eb1", title: "Panduan Marketing", slug: "panduan-marketing", price: 0, isFree: true, coverUrl: null, category: "Marketing", _count: { purchases: 12 } },
    ]);
    m.eBook.count.mockResolvedValue(1);

    const res = await request(app).get("/api/ebooks");
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.meta.total).toBe(1);
  });

  it("filters by category query param", async () => {
    m.eBook.findMany.mockResolvedValue([]);
    m.eBook.count.mockResolvedValue(0);

    const res = await request(app).get("/api/ebooks?category=Desain");
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(0);
    expect(m.eBook.findMany.mock.calls[0]![0].where).toEqual(
      expect.objectContaining({ status: "published", category: "Desain" }),
    );
  });

  it("pushes the search term into the prisma where clause", async () => {
    const MATCH = { id: "eb1", title: "Panduan Marketing", slug: "panduan-marketing" };
    m.eBook.findMany.mockResolvedValue([MATCH]);
    m.eBook.count.mockResolvedValue(1);

    const res = await request(app).get("/api/ebooks?search=marketing");

    expect(res.status).toBe(200);
    expect(res.body.data).toEqual([MATCH]);
    // The filter must actually reach Prisma — asserting only on the status code
    // passed even while `search` was silently ignored.
    const where = m.eBook.findMany.mock.calls[0]![0].where;
    expect(where).toEqual({
      status: "published",
      OR: [
        { title: { contains: "marketing", mode: "insensitive" } },
        { author: { contains: "marketing", mode: "insensitive" } },
      ],
    });
    // count() must be filtered identically or pagination meta lies.
    expect(m.eBook.count.mock.calls[0]![0].where).toEqual(where);
  });

  it("omits the search clause when no search term is given", async () => {
    m.eBook.findMany.mockResolvedValue([]);
    m.eBook.count.mockResolvedValue(0);

    const res = await request(app).get("/api/ebooks");
    expect(res.status).toBe(200);
    expect(m.eBook.findMany.mock.calls[0]![0].where).toEqual({ status: "published" });
  });

  it("clamps an oversized limit instead of rejecting it (sitemap uses limit=200)", async () => {
    m.eBook.findMany.mockResolvedValue([]);
    m.eBook.count.mockResolvedValue(0);

    const res = await request(app).get("/api/ebooks?limit=200");
    expect(res.status).toBe(200);
    expect(m.eBook.findMany.mock.calls[0]![0].take).toBe(50);
    expect(res.body.meta.limit).toBe(50);
  });
});

describe("GET /api/ebooks/:slug", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns ebook detail including description and file info", async () => {
    m.eBook.findUnique.mockResolvedValue({
      id: "eb1", title: "Panduan Marketing", slug: "panduan-marketing",
      description: "Deskripsi lengkap", price: 0, isFree: true,
      coverUrl: null, fileUrl: null, category: "Marketing",
      status: "published", createdAt: new Date(),
    });

    const res = await request(app).get("/api/ebooks/panduan-marketing");
    expect(res.status).toBe(200);
    expect(res.body.data.slug).toBe("panduan-marketing");
    expect(res.body.data.isFree).toBe(true);
  });

  it("returns 404 for unknown slug", async () => {
    m.eBook.findUnique.mockResolvedValue(null);
    const res = await request(app).get("/api/ebooks/tidak-ada");
    expect(res.status).toBe(404);
  });
});

describe("GET /api/ebooks/:slug/file — requires auth + access", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 404 when ebook not found", async () => {
    m.eBook.findUnique.mockResolvedValue(null);
    const res = await request(app).get("/api/ebooks/missing/file");
    expect(res.status).toBe(404);
  });
});
