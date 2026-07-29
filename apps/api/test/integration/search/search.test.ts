import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import { app } from "../../../src/app.js";

vi.mock("../../../src/db/prisma.js", () => ({
  prisma: {
    course: { findMany: vi.fn(), count: vi.fn() },
    courseCategory: { findMany: vi.fn(), findUnique: vi.fn() },
    event: { findMany: vi.fn(), count: vi.fn() },
  },
}));

vi.mock("../../../src/services/search/meilisearch.js", () => ({
  searchCourses: vi.fn().mockResolvedValue([]),
  indexCourse: vi.fn().mockResolvedValue(undefined),
  deleteCourseFromIndex: vi.fn().mockResolvedValue(undefined),
  // BL-63: events are searched through the same module.
  // BL-63b: the event search reports `{ hits, total }` so pagination can use a
  // match count that is not the size of the current page.
  searchEvents: vi.fn().mockResolvedValue({ hits: [], total: 0 }),
  indexEvent: vi.fn().mockResolvedValue(undefined),
  deleteEventFromIndex: vi.fn().mockResolvedValue(undefined),
}));

import { prisma } from "../../../src/db/prisma.js";
import { searchCourses, searchEvents } from "../../../src/services/search/meilisearch.js";

const mockPrisma = prisma as unknown as {
  course: { findMany: ReturnType<typeof vi.fn>; count: ReturnType<typeof vi.fn> };
  event: { findMany: ReturnType<typeof vi.fn>; count: ReturnType<typeof vi.fn> };
};
const mockSearch = searchCourses as ReturnType<typeof vi.fn>;
const mockSearchEvents = searchEvents as ReturnType<typeof vi.fn>;

const fakeCourse = {
  id: "c1",
  slug: "marketing-101",
  title: "Marketing 101",
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

const fakeEvent = {
  id: "e1",
  slug: "seminar-marketing",
  title: "Seminar Marketing",
  type: "offline",
  startDate: new Date("2026-09-01T02:00:00.000Z"),
  endDate: null,
  location: "Jakarta",
  venue: "Balai Kartini",
  price: "250000",
  salePrice: null,
  quota: 100,
  totalSold: 0,
  coverUrl: null,
  speakerName: "Budi",
  isFeatured: false,
};

beforeEach(() => {
  vi.clearAllMocks();
  mockPrisma.course.findMany.mockResolvedValue([fakeCourse]);
  mockPrisma.course.count.mockResolvedValue(1);
  mockSearchEvents.mockResolvedValue({ hits: [], total: 0 });
  mockPrisma.event.findMany.mockResolvedValue([]);
  mockPrisma.event.count.mockResolvedValue(0);
});

describe("GET /api/search", () => {
  it("returns empty array for missing query", async () => {
    const res = await request(app).get("/api/search");
    expect(res.status).toBe(200);
    expect(res.body.data.courses).toHaveLength(0);
  });

  it("returns empty array for query shorter than 2 chars", async () => {
    const res = await request(app).get("/api/search?q=a");
    expect(res.status).toBe(200);
    expect(res.body.data.courses).toHaveLength(0);
  });

  it("falls back to Prisma search when Meilisearch returns empty", async () => {
    mockSearch.mockResolvedValue([]);
    const res = await request(app).get("/api/search?q=marketing");
    expect(res.status).toBe(200);
    expect(res.body.data.courses).toHaveLength(1);
    expect(res.body.data.q).toBe("marketing");
  });

  it("returns Meilisearch results when available", async () => {
    mockSearch.mockResolvedValue([{ id: "c1", slug: "marketing-101", title: "Marketing 101" }]);
    mockPrisma.course.findMany.mockResolvedValue([fakeCourse]);
    const res = await request(app).get("/api/search?q=marketing");
    expect(res.status).toBe(200);
    expect(res.body.data.courses).toHaveLength(1);
  });

  it("includes pagination metadata", async () => {
    const res = await request(app).get("/api/search?q=marketing&page=1&limit=10");
    expect(res.body.data).toHaveProperty("page");
    expect(res.body.data).toHaveProperty("limit");
    expect(res.body.data).toHaveProperty("total");
  });

  // ─── BL-63: events in global search ────────────────────────────────────────

  it("returns an empty events array for a missing query", async () => {
    const res = await request(app).get("/api/search");
    expect(res.body.data.events).toEqual([]);
    expect(res.body.data.eventsTotal).toBe(0);
  });

  it("includes matching events from Meilisearch", async () => {
    mockSearchEvents.mockResolvedValue({
      hits: [{ id: "e1", slug: "seminar-marketing", title: "Seminar Marketing" }],
      total: 1,
    });
    mockPrisma.event.findMany.mockResolvedValue([fakeEvent]);

    const res = await request(app).get("/api/search?q=marketing");

    expect(res.status).toBe(200);
    expect(res.body.data.events).toHaveLength(1);
    expect(res.body.data.events[0].slug).toBe("seminar-marketing");
    expect(res.body.data.eventsTotal).toBe(1);
    // The index is filtered to published documents.
    expect(mockSearchEvents).toHaveBeenCalledWith("marketing", expect.objectContaining({ filter: 'status = "published"' }));
  });

  it("falls back to Prisma for events when Meilisearch returns nothing", async () => {
    mockSearchEvents.mockResolvedValue({ hits: [], total: 0 });
    mockPrisma.event.findMany.mockResolvedValue([fakeEvent]);
    mockPrisma.event.count.mockResolvedValue(1);

    const res = await request(app).get("/api/search?q=marketing");

    expect(res.body.data.events).toHaveLength(1);
    // Fallback is scoped to published events only.
    const where = mockPrisma.event.findMany.mock.calls[0][0].where;
    expect(where.status).toBe("published");
  });

  it("still returns courses when the event lookup fails (degrade-safe)", async () => {
    mockSearchEvents.mockRejectedValue(new Error("meili down"));
    mockPrisma.event.findMany.mockRejectedValue(new Error("db down"));

    const res = await request(app).get("/api/search?q=marketing");

    expect(res.status).toBe(200);
    expect(res.body.data.courses).toHaveLength(1);
    expect(res.body.data.events).toEqual([]);
  });
});
