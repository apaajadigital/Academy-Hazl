// A3 — publishing from the admin panel must reach the search index.
// A5 — GET /api/admin/courses must honour `sort` and reject unknown values.
//
// Both bugs were silent: the admin PATCH path wrote status/publishedAt inline
// and never imported `enqueueSearchIndex`, and `sort` was not in the query
// schema at all so non-strict Zod dropped it and `orderBy` stayed hardcoded.
import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import { app } from "../../../src/app.js";
import jwt from "jsonwebtoken";

vi.mock("../../../src/db/prisma.js", () => ({
  prisma: {
    user: { findUnique: vi.fn() },
    course: {
      findUnique: vi.fn(),
      findUniqueOrThrow: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
      update: vi.fn(),
    },
  },
}));

// Stub the whole producer layer: these tests assert that the admin route ASKS
// for indexing, not what Meilisearch does with it.
vi.mock("../../../src/jobs/queues.js", () => ({
  enqueueEmail: vi.fn().mockResolvedValue(undefined),
  enqueueCertificate: vi.fn().mockResolvedValue(undefined),
  enqueueSearchIndex: vi.fn().mockResolvedValue(undefined),
  enqueueWebhook: vi.fn().mockResolvedValue(undefined),
  closeQueues: vi.fn().mockResolvedValue(undefined),
}));

const { prisma } = await import("../../../src/db/prisma.js");
const { enqueueSearchIndex } = await import("../../../src/jobs/queues.js");

const VALID_ADMIN = {
  id: "admin-1",
  email: "admin@jago.id",
  isActive: true,
  deletedAt: null,
  roles: [{ role: "super_admin" }],
};

const ADMIN_TOKEN = jwt.sign(
  { sub: "admin-1", email: "admin@jago.id", roles: ["super_admin"] },
  process.env.JWT_SECRET!,
  { expiresIn: "15m" },
);
const ADMIN_AUTH = { Authorization: `Bearer ${ADMIN_TOKEN}` };

/** Row shape `indexCourse` consumes (price/avgRating arrive as Prisma Decimals). */
const FULL_COURSE = {
  id: "c-1",
  slug: "kursus-baru",
  title: "Kursus Baru",
  shortDesc: "ringkas",
  description: "panjang",
  status: "published",
  level: "beginner",
  price: 250000,
  thumbnailUrl: null,
  avgRating: 4.5,
  totalEnrolled: 12,
  isFeatured: false,
  category: { name: "Data", slug: "data" },
};

const PATCH_RESULT = {
  id: "c-1",
  title: "Kursus Baru",
  status: "published",
  isFeatured: false,
  publishedAt: new Date(),
  adminFeedback: null,
  format: "regular",
  waGroupLink: null,
  onboardingContact: null,
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(prisma.user.findUnique).mockResolvedValue(VALID_ADMIN as never);
  vi.mocked(prisma.course.findUnique).mockResolvedValue({ id: "c-1", status: "draft" } as never);
  vi.mocked(prisma.course.update).mockResolvedValue(PATCH_RESULT as never);
  vi.mocked(prisma.course.findUniqueOrThrow).mockResolvedValue(FULL_COURSE as never);
  vi.mocked(enqueueSearchIndex).mockResolvedValue(undefined);
});

describe("PATCH /api/admin/courses/:id — search index sync (A3)", () => {
  it("publishing through the admin path enqueues an index job", async () => {
    const res = await request(app)
      .patch("/api/admin/courses/c-1")
      .set(ADMIN_AUTH)
      .send({ status: "published" });

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe("published");
    expect(enqueueSearchIndex).toHaveBeenCalledTimes(1);
    expect(enqueueSearchIndex).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "index-course",
        course: expect.objectContaining({
          id: "c-1",
          slug: "kursus-baru",
          status: "published",
          // Decimals are stringified exactly as services/course/courseService.ts does.
          price: "250000",
          avgRating: "4.5",
          categoryName: "Data",
        }),
      }),
    );
  });

  it("indexes on any admin course write, not only publish", async () => {
    await request(app)
      .patch("/api/admin/courses/c-1")
      .set(ADMIN_AUTH)
      .send({ isFeatured: true });

    expect(enqueueSearchIndex).toHaveBeenCalledTimes(1);
  });

  it("a failing index does NOT fail the publish (degrade-safe)", async () => {
    vi.mocked(enqueueSearchIndex).mockRejectedValueOnce(new Error("redis down"));

    const res = await request(app)
      .patch("/api/admin/courses/c-1")
      .set(ADMIN_AUTH)
      .send({ status: "published" });

    // The DB write already committed; reporting 500 here would tell the admin
    // their publish failed when it did not.
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe("published");
  });

  it("a failing index re-fetch does NOT fail the publish either", async () => {
    vi.mocked(prisma.course.findUniqueOrThrow).mockRejectedValueOnce(new Error("db blip"));

    const res = await request(app)
      .patch("/api/admin/courses/c-1")
      .set(ADMIN_AUTH)
      .send({ status: "published" });

    expect(res.status).toBe(200);
    expect(enqueueSearchIndex).not.toHaveBeenCalled();
  });

  it("does not index when the course does not exist", async () => {
    vi.mocked(prisma.course.findUnique).mockResolvedValue(null);

    const res = await request(app)
      .patch("/api/admin/courses/c-missing")
      .set(ADMIN_AUTH)
      .send({ status: "published" });

    expect(res.status).toBe(404);
    expect(enqueueSearchIndex).not.toHaveBeenCalled();
  });
});

describe("GET /api/admin/courses — sort (A5)", () => {
  beforeEach(() => {
    vi.mocked(prisma.course.findMany).mockResolvedValue([] as never);
    vi.mocked(prisma.course.count).mockResolvedValue(0 as never);
  });

  it("passes the requested order through to Prisma", async () => {
    const res = await request(app)
      .get("/api/admin/courses?limit=5&sort=totalEnrolled:desc")
      .set(ADMIN_AUTH);

    expect(res.status).toBe(200);
    expect(vi.mocked(prisma.course.findMany).mock.calls[0]?.[0]).toMatchObject({
      take: 5,
      orderBy: { totalEnrolled: "desc" },
    });
  });

  it("defaults to newest-first when sort is omitted", async () => {
    const res = await request(app).get("/api/admin/courses").set(ADMIN_AUTH);

    expect(res.status).toBe(200);
    expect(vi.mocked(prisma.course.findMany).mock.calls[0]?.[0]).toMatchObject({
      orderBy: { createdAt: "desc" },
    });
  });

  it("rejects an unknown sort key with 400 instead of ignoring it", async () => {
    const res = await request(app).get("/api/admin/courses?sort=totalEnrolled").set(ADMIN_AUTH);

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    // Nothing is queried: a dropped sort is what produced a "Terpopuler" widget
    // ordered by creation date.
    expect(prisma.course.findMany).not.toHaveBeenCalled();
  });

  it("rejects an unsortable field", async () => {
    const res = await request(app).get("/api/admin/courses?sort=price:desc").set(ADMIN_AUTH);

    expect(res.status).toBe(400);
    expect(prisma.course.findMany).not.toHaveBeenCalled();
  });
});
