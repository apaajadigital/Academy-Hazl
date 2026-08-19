import { test, expect, type Page } from "@playwright/test";

/**
 * /e-course must never dress a failure up as an empty catalogue.
 *
 * The unit tests in test/unit/e-course-catalog.test.ts pin the state machine;
 * this spec pins what the visitor actually sees for each of the four states,
 * because the defect was never in the data layer alone — it was the copy. A
 * blocked or broken fetch rendered "Katalog kursus segera hadir — Kami sedang
 * menyiapkan materi terbaik untukmu", which is a confident claim about our
 * catalogue that we had no basis to make.
 *
 * Every state is driven by mocking `/api/courses` at the network layer, so the
 * assertions hold with or without a database behind the server.
 */

const EMPTY_ENVELOPE = { success: true, data: { data: [], total: 0, page: 1, limit: 8 } };

function coursesEnvelope(count: number) {
  return {
    success: true,
    data: {
      data: Array.from({ length: count }, (_, i) => ({
        id: `course-${i}`,
        slug: `kursus-uji-${i}`,
        title: `Kursus Uji ${i + 1}`,
        level: "beginner",
        totalDuration: 120,
        totalEnrolled: 10 + i,
        avgRating: 4.5,
        trainer: { name: "Instruktur Uji" },
      })),
      total: count,
      page: 1,
      limit: 8,
    },
  };
}

/** The catalogue section, so assertions never match copy from other sections. */
function catalog(page: Page) {
  return page.locator("#ecourse-catalog");
}

const COPY = {
  loadingSkeleton: "#ecourse-catalog .skeleton",
  errorTitle: "Gagal memuat katalog kursus",
  errorReassurance: /Ini bukan berarti katalog kosong/i,
  retryButton: "Muat Ulang",
  emptyTitle: "Belum ada kursus tersedia",
  // The exact sentence the regression produced. It must never appear again,
  // in ANY state — this is the assertion the whole spec exists for.
  bannedOnFailure: /segera hadir|sedang menyiapkan materi/i,
};

const VIEWPORTS = [
  { name: "desktop", width: 1280, height: 800 },
  { name: "mobile", width: 390, height: 844 },
] as const;

for (const vp of VIEWPORTS) {
  test.describe(`Katalog e-course — ${vp.name} (${vp.width}x${vp.height})`, () => {
    test.use({ viewport: { width: vp.width, height: vp.height } });

    // ── A. Loading ───────────────────────────────────────────────────────────
    test("loading: skeleton tampil, tanpa empty state atau error", async ({ page }) => {
      let release: (() => void) | undefined;
      const held = new Promise<void>((resolve) => (release = resolve));

      await page.route("**/api/courses*", async (route) => {
        await held;
        await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(coursesEnvelope(4)) });
      });

      await page.goto("/e-course");

      // While the request is in flight: skeletons, and neither of the other states.
      await expect(page.locator(COPY.loadingSkeleton).first()).toBeVisible();
      await expect(catalog(page).getByText(COPY.emptyTitle)).toHaveCount(0);
      await expect(catalog(page).getByText(COPY.errorTitle)).toHaveCount(0);
      await expect(catalog(page).getByRole("button", { name: COPY.retryButton })).toHaveCount(0);

      release!();
      await expect(catalog(page).getByText("Kursus Uji 1")).toBeVisible();
    });

    // ── B. Success with data ─────────────────────────────────────────────────
    test("sukses berisi: katalog normal tampil", async ({ page }) => {
      await page.route("**/api/courses*", (route) =>
        route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(coursesEnvelope(3)) })
      );

      await page.goto("/e-course");

      await expect(catalog(page).getByText("Kursus Uji 1")).toBeVisible();
      await expect(catalog(page).getByText("Kursus Uji 3")).toBeVisible();
      await expect(catalog(page).getByText("3 kursus ditemukan")).toBeVisible();
      await expect(catalog(page).getByText(COPY.errorTitle)).toHaveCount(0);
      await expect(catalog(page).getByText(COPY.emptyTitle)).toHaveCount(0);
    });

    // ── C. Success but empty ─────────────────────────────────────────────────
    test("sukses kosong: empty state jujur, bukan error", async ({ page }) => {
      await page.route("**/api/courses*", (route) =>
        route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(EMPTY_ENVELOPE) })
      );

      await page.goto("/e-course");

      await expect(catalog(page).getByText(COPY.emptyTitle)).toBeVisible();
      await expect(catalog(page).getByText(COPY.errorTitle)).toHaveCount(0);
      await expect(catalog(page).getByRole("button", { name: COPY.retryButton })).toHaveCount(0);
    });

    // ── D. Failure ───────────────────────────────────────────────────────────
    test("API gagal: error state + Muat Ulang, tanpa klaim katalog kosong", async ({ page }) => {
      await page.route("**/api/courses*", (route) => route.abort());

      await page.goto("/e-course");

      await expect(catalog(page).getByText(COPY.errorTitle)).toBeVisible();
      await expect(catalog(page).getByText(COPY.errorReassurance)).toBeVisible();
      await expect(catalog(page).getByRole("button", { name: COPY.retryButton })).toBeVisible();

      // The regression, stated as an assertion: no wording anywhere in the
      // catalogue may suggest we simply have not published courses yet.
      await expect(catalog(page).getByText(COPY.bannedOnFailure)).toHaveCount(0);
      await expect(catalog(page).getByText(COPY.emptyTitle)).toHaveCount(0);
      await expect(catalog(page).getByRole("link", { name: /Gabung Early Access/i })).toHaveCount(0);
    });

    test("API 500 juga menghasilkan error state, bukan empty", async ({ page }) => {
      await page.route("**/api/courses*", (route) =>
        route.fulfill({
          status: 500,
          contentType: "application/json",
          body: JSON.stringify({ success: false, error: { code: "BOOM", message: "gagal" } }),
        })
      );

      await page.goto("/e-course");

      await expect(catalog(page).getByText(COPY.errorTitle)).toBeVisible();
      await expect(catalog(page).getByText(COPY.emptyTitle)).toHaveCount(0);
    });

    // ── Retry actually re-fetches ────────────────────────────────────────────
    test("retry: gagal → Muat Ulang → sukses, dan benar-benar memanggil API lagi", async ({ page }) => {
      let calls = 0;
      await page.route("**/api/courses*", async (route) => {
        calls += 1;
        if (calls === 1) return route.abort();
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(coursesEnvelope(2)),
        });
      });

      await page.goto("/e-course");
      await expect(catalog(page).getByText(COPY.errorTitle)).toBeVisible();
      expect(calls, "permintaan pertama harus sudah terjadi").toBe(1);

      await catalog(page).getByRole("button", { name: COPY.retryButton }).click();

      await expect(catalog(page).getByText("Kursus Uji 1")).toBeVisible();
      await expect(catalog(page).getByText(COPY.errorTitle)).toHaveCount(0);
      // A retry that re-renders without re-requesting would leave this at 1.
      expect(calls, "Muat Ulang harus memicu fetch kedua").toBe(2);
    });
  });
}
