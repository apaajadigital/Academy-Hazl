import { describe, it, expect, vi, beforeEach } from "vitest";

// The whole match set is larger than the page Meilisearch returns — that gap is
// what `total` exists to report, so the fixture keeps the two different.
const MOCK_TOTAL_HITS = 42;

const mockIndex = {
  addDocuments: vi.fn().mockResolvedValue({}),
  deleteDocument: vi.fn().mockResolvedValue({}),
  search: vi.fn().mockResolvedValue({
    hits: [{ id: "c1", slug: "kursus-a", title: "Kursus A" }],
    estimatedTotalHits: MOCK_TOTAL_HITS,
  }),
  updateSearchableAttributes: vi.fn().mockResolvedValue({}),
  updateFilterableAttributes: vi.fn().mockResolvedValue({}),
  updateSortableAttributes: vi.fn().mockResolvedValue({}),
};

const mockMeiliClient = {
  index: vi.fn().mockReturnValue(mockIndex),
};

vi.mock("meilisearch", () => ({
  Meilisearch: class {
    index(name: string) { return mockIndex; }
  },
}));

vi.mock("../../src/config/env.js", () => ({
  env: {
    MEILISEARCH_URL: "http://localhost:7700",
    MEILISEARCH_KEY: "test-key",
    NODE_ENV: "test",
    DATABASE_URL: "postgresql://test:test@localhost:5432/test",
    JWT_SECRET: "test-jwt-secret-must-be-at-least-32-chars!!",
    JWT_REFRESH_SECRET: "test-refresh-must-be-32-chars!!!!!!!!",
    GOOGLE_CLIENT_ID: "g-id", GOOGLE_CLIENT_SECRET: "g-secret",
    GOOGLE_CALLBACK_URL: "http://localhost:4000/api/auth/google/callback",
    WEB_URL: "http://localhost:3000", CORS_ORIGIN: "http://localhost:3000",
    COOKIE_SECURE: false, UPLOAD_DIR: "uploads", MAX_FILE_SIZE_MB: 10,
  },
}));

describe("meilisearch service", () => {
  beforeEach(() => vi.clearAllMocks());

  it("getMeiliClient returns a Meilisearch instance", async () => {
    const { getMeiliClient } = await import("../../src/services/search/meilisearch.js");
    const client = getMeiliClient();
    expect(client).toBeDefined();
  });

  it("indexCourse calls addDocuments with correct shape", async () => {
    const { indexCourse } = await import("../../src/services/search/meilisearch.js");

    await indexCourse({
      id: "c1", slug: "kursus-a", title: "Kursus A",
      shortDesc: "Deskripsi singkat", description: "Deskripsi lengkap",
      status: "published", categoryName: "Marketing", level: "beginner",
      price: 299000, thumbnailUrl: null,
      avgRating: 4.7, totalEnrolled: 120, isFeatured: false,
    });

    expect(mockIndex.addDocuments).toHaveBeenCalledWith([
      expect.objectContaining({
        id: "c1", slug: "kursus-a", title: "Kursus A",
        price: 299000, avgRating: 4.7,
      }),
    ]);
  });

  it("indexCourse handles null optional fields gracefully", async () => {
    const { indexCourse } = await import("../../src/services/search/meilisearch.js");

    await indexCourse({
      id: "c2", slug: "kursus-b", title: "Kursus B",
      status: "published", price: 0,
      avgRating: 0, totalEnrolled: 0, isFeatured: false,
    });

    expect(mockIndex.addDocuments).toHaveBeenCalledWith([
      expect.objectContaining({ shortDesc: "", description: "", categoryName: "", level: "", thumbnailUrl: "" }),
    ]);
  });

  it("indexCourse silently ignores Meilisearch errors", async () => {
    mockIndex.addDocuments.mockRejectedValueOnce(new Error("Meilisearch offline"));
    const { indexCourse } = await import("../../src/services/search/meilisearch.js");

    await expect(indexCourse({
      id: "c3", slug: "kursus-c", title: "Kursus C",
      status: "published", price: 0,
      avgRating: 0, totalEnrolled: 0, isFeatured: false,
    })).resolves.toBeUndefined();
  });

  it("deleteCourseFromIndex removes document by ID", async () => {
    const { deleteCourseFromIndex } = await import("../../src/services/search/meilisearch.js");
    await deleteCourseFromIndex("c1");
    expect(mockIndex.deleteDocument).toHaveBeenCalledWith("c1");
  });

  it("searchCourses returns hits with the full match total", async () => {
    const { searchCourses } = await import("../../src/services/search/meilisearch.js");
    const result = await searchCourses("kursus", { limit: 10, offset: 0 });
    expect(Array.isArray(result.hits)).toBe(true);
    expect(result.hits[0].id).toBe("c1");
    expect(result.total).toBe(MOCK_TOTAL_HITS);
  });

  it("searchCourses falls back to totalHits, then to the page size", async () => {
    const { searchCourses } = await import("../../src/services/search/meilisearch.js");

    // page/hitsPerPage pagination mode reports `totalHits` instead.
    mockIndex.search.mockResolvedValueOnce({ hits: [{ id: "c1" }], totalHits: 9 });
    expect((await searchCourses("kursus")).total).toBe(9);

    // A server reporting neither must not collapse the total to zero.
    mockIndex.search.mockResolvedValueOnce({ hits: [{ id: "c1" }, { id: "c2" }] });
    expect((await searchCourses("kursus")).total).toBe(2);
  });

  it("searchCourses returns an empty result on error", async () => {
    mockIndex.search.mockRejectedValueOnce(new Error("Search failed"));
    const { searchCourses } = await import("../../src/services/search/meilisearch.js");
    const result = await searchCourses("error-test");
    expect(result).toEqual({ hits: [], total: 0 });
  });

  it("ensureCourseIndexSettings updates all attribute settings", async () => {
    const { ensureCourseIndexSettings } = await import("../../src/services/search/meilisearch.js");
    await ensureCourseIndexSettings();
    expect(mockIndex.updateSearchableAttributes).toHaveBeenCalled();
    expect(mockIndex.updateFilterableAttributes).toHaveBeenCalled();
    expect(mockIndex.updateSortableAttributes).toHaveBeenCalled();
  });

  it("ensureCourseIndexSettings silently ignores errors", async () => {
    mockIndex.updateSearchableAttributes.mockRejectedValueOnce(new Error("Offline"));
    const { ensureCourseIndexSettings } = await import("../../src/services/search/meilisearch.js");
    await expect(ensureCourseIndexSettings()).resolves.toBeUndefined();
  });
});
