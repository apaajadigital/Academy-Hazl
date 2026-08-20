/**
 * BL-103 — E-Book ↔ Meilisearch index sync.
 *
 * Guards the same two rules that make event search trustworthy (BL-63):
 *  1. only `published` ebooks are indexed;
 *  2. `draft` and deleted ebooks are actively REMOVED from the index, so an
 *     archived title can never keep selling itself through global search.
 *
 * Archiving to `draft` matters more here than for events: an ebook with paid
 * purchases cannot be hard-deleted at all (M1), so `draft` is the ONLY way an
 * admin can retire one — if that path missed the index, retiring an ebook would
 * be a no-op as far as search is concerned.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import jwt from "jsonwebtoken";
import { app } from "../../../src/app.js";

vi.mock("../../../src/db/prisma.js", () => ({
  prisma: {
    user: { findUnique: vi.fn() },
    eBook: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    orderItem: { count: vi.fn() },
  },
}));

vi.mock("../../../src/services/search/meilisearch.js", () => ({
  indexEbook: vi.fn().mockResolvedValue(undefined),
  deleteEbookFromIndex: vi.fn().mockResolvedValue(undefined),
  searchEbooks: vi.fn().mockResolvedValue({ hits: [], total: 0 }),
  // The shared search-index processor also imports the course + event helpers.
  indexCourse: vi.fn().mockResolvedValue(undefined),
  deleteCourseFromIndex: vi.fn().mockResolvedValue(undefined),
  searchCourses: vi.fn().mockResolvedValue([]),
  indexEvent: vi.fn().mockResolvedValue(undefined),
  deleteEventFromIndex: vi.fn().mockResolvedValue(undefined),
  searchEvents: vi.fn().mockResolvedValue({ hits: [], total: 0 }),
}));

import { prisma } from "../../../src/db/prisma.js";
import { indexEbook, deleteEbookFromIndex, searchEbooks } from "../../../src/services/search/meilisearch.js";
import { searchPublishedEbooks } from "../../../src/services/ebook/ebookSearchService.js";

const mockPrisma = prisma as unknown as {
  user: { findUnique: ReturnType<typeof vi.fn> };
  eBook: Record<string, ReturnType<typeof vi.fn>>;
  orderItem: { count: ReturnType<typeof vi.fn> };
};
const mockIndexEbook = indexEbook as ReturnType<typeof vi.fn>;
const mockDeleteEbook = deleteEbookFromIndex as ReturnType<typeof vi.fn>;
const mockSearchEbooks = searchEbooks as ReturnType<typeof vi.fn>;

const VALID_ADMIN = {
  id: "admin-1",
  email: "admin@jago.id",
  isActive: true,
  deletedAt: null,
  roles: [{ role: "super_admin" }],
};

const ADMIN_AUTH = {
  Authorization: `Bearer ${jwt.sign(
    { sub: "admin-1", email: "admin@jago.id", roles: ["super_admin"] },
    process.env.JWT_SECRET!,
    { expiresIn: "15m" },
  )}`,
};

/** Prisma returns Decimal columns as objects with `toString()`; strings stand in. */
const ebookRow = (overrides: Record<string, unknown> = {}) => ({
  id: "eb1",
  slug: "panduan-marketing",
  title: "Panduan Marketing",
  description: "Dasar-dasar marketing digital",
  author: "Rina",
  category: "marketing",
  status: "published",
  coverUrl: null,
  pages: 120,
  fileUrl: "https://jago.id/panduan-marketing.pdf",
  price: "75000",
  salePrice: null,
  totalSold: 0,
  ...overrides,
});

const createDto = {
  slug: "panduan-marketing",
  title: "Panduan Marketing",
  price: 75000,
  fileUrl: "https://jago.id/panduan-marketing.pdf",
  status: "published",
};

beforeEach(() => {
  vi.clearAllMocks();
  mockIndexEbook.mockResolvedValue(undefined);
  mockDeleteEbook.mockResolvedValue(undefined);
  mockSearchEbooks.mockResolvedValue({ hits: [], total: 0 });
  mockPrisma.user.findUnique.mockResolvedValue(VALID_ADMIN);
  mockPrisma.eBook.findUnique.mockResolvedValue(null);
});

describe("POST /api/admin/ebooks → search index", () => {
  it("indexes a published ebook with the searchable fields", async () => {
    mockPrisma.eBook.create.mockResolvedValue(ebookRow());

    const res = await request(app).post("/api/admin/ebooks").set(ADMIN_AUTH).send(createDto);

    expect(res.status).toBe(201);
    expect(mockIndexEbook).toHaveBeenCalledTimes(1);
    expect(mockIndexEbook).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "eb1",
        slug: "panduan-marketing",
        title: "Panduan Marketing",
        description: "Dasar-dasar marketing digital",
        author: "Rina",
        category: "marketing",
        status: "published",
        price: "75000",
      }),
    );
    expect(mockDeleteEbook).not.toHaveBeenCalled();
  });

  // The download URL is purchase-gated; it must never travel into a public index.
  it("never puts fileUrl into the index document", async () => {
    mockPrisma.eBook.create.mockResolvedValue(ebookRow());

    await request(app).post("/api/admin/ebooks").set(ADMIN_AUTH).send(createDto);

    expect(mockIndexEbook.mock.calls[0][0]).not.toHaveProperty("fileUrl");
  });

  it("does NOT index a draft ebook — it removes it from the index instead", async () => {
    mockPrisma.eBook.create.mockResolvedValue(ebookRow({ status: "draft" }));

    const res = await request(app)
      .post("/api/admin/ebooks")
      .set(ADMIN_AUTH)
      .send({ ...createDto, status: "draft" });

    expect(res.status).toBe(201);
    expect(mockIndexEbook).not.toHaveBeenCalled();
    expect(mockDeleteEbook).toHaveBeenCalledWith("eb1");
  });

  it("never fails the admin write when indexing throws", async () => {
    mockPrisma.eBook.create.mockResolvedValue(ebookRow());
    mockIndexEbook.mockRejectedValue(new Error("meilisearch offline"));

    const res = await request(app).post("/api/admin/ebooks").set(ADMIN_AUTH).send(createDto);

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
  });

  // A partial row (no Decimal columns) would throw inside the field mapping.
  // That mapping sits inside the guard precisely so it degrades to "not indexed".
  it("never fails the admin write when the row cannot be mapped", async () => {
    mockPrisma.eBook.create.mockResolvedValue({ id: "eb1", slug: "x", title: "X", status: "published" });

    const res = await request(app).post("/api/admin/ebooks").set(ADMIN_AUTH).send(createDto);

    expect(res.status).toBe(201);
  });
});

describe("PATCH /api/admin/ebooks/:id → search index", () => {
  it("re-indexes an ebook that stays published", async () => {
    mockPrisma.eBook.findUnique.mockResolvedValue(ebookRow());
    mockPrisma.eBook.update.mockResolvedValue(ebookRow({ title: "Panduan Marketing 2026" }));

    const res = await request(app)
      .patch("/api/admin/ebooks/eb1")
      .set(ADMIN_AUTH)
      .send({ title: "Panduan Marketing 2026" });

    expect(res.status).toBe(200);
    expect(mockIndexEbook).toHaveBeenCalledWith(expect.objectContaining({ title: "Panduan Marketing 2026" }));
    expect(mockDeleteEbook).not.toHaveBeenCalled();
  });

  it("removes an ebook from the index when it is archived back to draft", async () => {
    mockPrisma.eBook.findUnique.mockResolvedValue(ebookRow());
    mockPrisma.eBook.update.mockResolvedValue(ebookRow({ status: "draft" }));

    const res = await request(app).patch("/api/admin/ebooks/eb1").set(ADMIN_AUTH).send({ status: "draft" });

    expect(res.status).toBe(200);
    expect(mockIndexEbook).not.toHaveBeenCalled();
    expect(mockDeleteEbook).toHaveBeenCalledWith("eb1");
  });

  it("survives an index failure during an update", async () => {
    mockPrisma.eBook.findUnique.mockResolvedValue(ebookRow());
    mockPrisma.eBook.update.mockResolvedValue(ebookRow({ status: "draft" }));
    mockDeleteEbook.mockRejectedValue(new Error("meilisearch offline"));

    const res = await request(app).patch("/api/admin/ebooks/eb1").set(ADMIN_AUTH).send({ status: "draft" });

    expect(res.status).toBe(200);
  });

  it("does not touch the index for an unknown ebook", async () => {
    mockPrisma.eBook.findUnique.mockResolvedValue(null);

    const res = await request(app).patch("/api/admin/ebooks/missing").set(ADMIN_AUTH).send({ title: "X" });

    expect(res.status).toBe(404);
    expect(mockPrisma.eBook.update).not.toHaveBeenCalled();
    expect(mockIndexEbook).not.toHaveBeenCalled();
    expect(mockDeleteEbook).not.toHaveBeenCalled();
  });
});

describe("DELETE /api/admin/ebooks/:id → search index", () => {
  it("removes the document after a hard delete", async () => {
    mockPrisma.eBook.findUnique.mockResolvedValue(ebookRow());
    mockPrisma.orderItem.count.mockResolvedValue(0);
    mockPrisma.eBook.delete.mockResolvedValue(ebookRow());

    const res = await request(app).delete("/api/admin/ebooks/eb1").set(ADMIN_AUTH);

    expect(res.status).toBe(200);
    expect(mockDeleteEbook).toHaveBeenCalledWith("eb1");
  });

  // M1 refuses the delete; the row survives, so the index must too.
  it("does not touch the index when the delete is refused", async () => {
    mockPrisma.eBook.findUnique.mockResolvedValue(ebookRow());
    mockPrisma.orderItem.count.mockResolvedValue(3);

    const res = await request(app).delete("/api/admin/ebooks/eb1").set(ADMIN_AUTH);

    expect(res.status).toBe(409);
    expect(mockDeleteEbook).not.toHaveBeenCalled();
    expect(mockPrisma.eBook.delete).not.toHaveBeenCalled();
  });
});

describe("searchPublishedEbooks", () => {
  it("queries the index for published ebooks only and re-fetches from the DB", async () => {
    mockSearchEbooks.mockResolvedValue({
      hits: [{ id: "eb1", slug: "panduan-marketing", title: "Panduan Marketing" }],
      total: 1,
    });
    mockPrisma.eBook.findMany.mockResolvedValue([{ id: "eb1", slug: "panduan-marketing", title: "Panduan Marketing" }]);

    const result = await searchPublishedEbooks({ q: "marketing", page: 1, limit: 12 });

    expect(mockSearchEbooks).toHaveBeenCalledWith("marketing", {
      limit: 12,
      offset: 0,
      filter: 'status = "published"',
    });
    expect(mockPrisma.eBook.findMany.mock.calls[0][0].where).toMatchObject({ status: "published" });
    expect(result.total).toBe(1);
  });

  // Same contract as BL-63b: the total describes the whole match set, not the
  // page — returning the page length caps every search at one page.
  it("reports the index-wide match count, not the size of the page", async () => {
    mockSearchEbooks.mockResolvedValue({
      hits: [{ id: "eb1", slug: "panduan-marketing", title: "Panduan Marketing" }],
      total: 42,
    });
    mockPrisma.eBook.findMany.mockResolvedValue([{ id: "eb1", slug: "panduan-marketing", title: "Panduan Marketing" }]);

    const result = await searchPublishedEbooks({ q: "marketing", page: 2, limit: 1 });

    expect(result.data).toHaveLength(1);
    expect(result.total).toBe(42);
  });

  it("never reports fewer results than it returns when the index lags", async () => {
    mockSearchEbooks.mockResolvedValue({
      hits: [{ id: "eb1", slug: "panduan-marketing", title: "Panduan Marketing" }],
      total: 0,
    });
    mockPrisma.eBook.findMany.mockResolvedValue([{ id: "eb1", slug: "panduan-marketing", title: "Panduan Marketing" }]);

    const result = await searchPublishedEbooks({ q: "marketing", page: 2, limit: 10 });

    expect(result.total).toBe(11);
  });

  it("falls back to Prisma when Meilisearch is unavailable (degrade-safe)", async () => {
    // Mirrors the real client, which swallows connection errors and returns no hits.
    mockSearchEbooks.mockResolvedValue({ hits: [], total: 0 });
    mockPrisma.eBook.findMany.mockResolvedValue([{ id: "eb1", slug: "panduan-marketing", title: "Panduan Marketing" }]);
    mockPrisma.eBook.count.mockResolvedValue(1);

    const result = await searchPublishedEbooks({ q: "marketing" });

    expect(result.total).toBe(1);
    expect(mockPrisma.eBook.findMany.mock.calls[0][0].where.status).toBe("published");
  });

  it("drops a hit whose DB row is no longer published (index lag)", async () => {
    mockSearchEbooks.mockResolvedValue({
      hits: [
        { id: "eb1", slug: "panduan-marketing", title: "Panduan Marketing" },
        { id: "eb2", slug: "sudah-diarsipkan", title: "Sudah Diarsipkan" },
      ],
      total: 2,
    });
    // The DB re-fetch is status-scoped, so the archived row simply is not returned.
    mockPrisma.eBook.findMany.mockResolvedValue([{ id: "eb1", slug: "panduan-marketing", title: "Panduan Marketing" }]);

    const result = await searchPublishedEbooks({ q: "marketing", page: 1, limit: 12 });

    expect(result.data).toHaveLength(1);
  });
});
