import type { Page } from "@playwright/test";

/**
 * Deterministic catalogue data for the visual baseline of /e-course.
 *
 * WHY THIS EXISTS
 * The four /e-course baselines used to be photographs of whatever the local
 * database happened to hold. Two consequences, both fatal to a screenshot test:
 * the committed PNG only matches the machine that produced it, and the page
 * height moved by up to +1648px between the baseline and a later run purely
 * because the row count changed. A baseline recorded from mutable data is not a
 * baseline; it is a snapshot of one afternoon's seed script.
 *
 * So the visual suite serves its own catalogue. Everything below is fixed:
 * three rows, explicit order, no timestamps, no generated ids, no ratings that
 * drift as reviews arrive. `thumbnailUrl` is null on purpose so the page falls
 * back to its own <MediaPlaceholder> — the test must never depend on an image
 * host being reachable, and an image that fails to load would silently change
 * the layout it is supposed to be pinning.
 *
 * Nothing here is real: the names are obviously synthetic, and there are no
 * phone numbers, emails, tokens, or personal data of any kind. This file is
 * test scaffolding only — it never ships, and it never touches API_BASE, the
 * production endpoint, or any application source.
 */

/** One row of `GET /api/courses` as `ECourseCatalog` consumes it. */
export type VisualCourse = {
  id: string;
  slug: string;
  title: string;
  shortDesc: string;
  level: string;
  avgRating: number;
  totalReviews: number;
  totalEnrolled: number;
  totalDuration: number;
  thumbnailUrl: null;
  trainer: { name: string; avatarUrl: null };
  category: { slug: string; name: string };
};

/**
 * Exactly three courses, in the order the grid must render them. Kept under the
 * catalogue's PAGE_SIZE of 8 so no pagination control appears — paging chrome
 * that depends on a row count is one more thing that would move between runs.
 */
export const VISUAL_COURSES: VisualCourse[] = [
  {
    id: "vfx-course-001",
    slug: "contoh-kursus-satu",
    title: "Contoh Kursus Satu",
    shortDesc: "Materi contoh untuk baseline visual.",
    level: "beginner",
    avgRating: 4.5,
    totalReviews: 12,
    totalEnrolled: 120,
    totalDuration: 180,
    thumbnailUrl: null,
    trainer: { name: "Instruktur Contoh A", avatarUrl: null },
    category: { slug: "kategori-contoh", name: "Kategori Contoh" },
  },
  {
    id: "vfx-course-002",
    slug: "contoh-kursus-dua",
    title: "Contoh Kursus Dua",
    shortDesc: "Materi contoh kedua untuk baseline visual.",
    level: "intermediate",
    avgRating: 4.0,
    totalReviews: 8,
    totalEnrolled: 80,
    totalDuration: 240,
    thumbnailUrl: null,
    trainer: { name: "Instruktur Contoh B", avatarUrl: null },
    category: { slug: "kategori-contoh", name: "Kategori Contoh" },
  },
  {
    id: "vfx-course-003",
    slug: "contoh-kursus-tiga",
    title: "Contoh Kursus Tiga",
    shortDesc: "Materi contoh ketiga untuk baseline visual.",
    level: "advanced",
    avgRating: 5.0,
    totalReviews: 20,
    totalEnrolled: 200,
    totalDuration: 300,
    thumbnailUrl: null,
    trainer: { name: "Instruktur Contoh C", avatarUrl: null },
    category: { slug: "kategori-contoh", name: "Kategori Contoh" },
  },
];

/** The success envelope shape `fetchCourseCatalog` accepts (paginated form). */
export const VISUAL_COURSES_ENVELOPE = {
  success: true,
  data: {
    data: VISUAL_COURSES,
    total: VISUAL_COURSES.length,
    page: 1,
    limit: 8,
  },
};

/**
 * Serve the fixed catalogue for `GET /api/courses` and block every request that
 * leaves localhost.
 *
 * The abort is not belt-and-braces: an analytics beacon or a CDN font arriving
 * mid-capture is exactly the kind of thing that makes a screenshot suite flaky
 * on someone else's network. Returns the count of aborted external requests so
 * a test can assert the page needed none.
 */
export async function installVisualCatalogue(page: Page): Promise<{ external: string[] }> {
  const external: string[] = [];

  await page.route("**/api/courses*", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(VISUAL_COURSES_ENVELOPE),
    }),
  );

  // Registered after the API route so it takes lower precedence for /api/*.
  await page.route(
    (url) => url.hostname !== "localhost" && url.hostname !== "127.0.0.1",
    (route) => {
      external.push(route.request().url());
      return route.abort();
    },
  );

  return { external };
}
