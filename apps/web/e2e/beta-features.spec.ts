/**
 * E2E — beta feature pages (flag-gated, default OFF):
 *   /kelas-privat (NEXT_PUBLIC_FEATURE_PRIVATE_CLASS)
 *   /komunitas    (NEXT_PUBLIC_FEATURE_COMMUNITY)
 *   /alumni       (NEXT_PUBLIC_FEATURE_ALUMNI)
 *   /portofolio-member (+/[id]) (NEXT_PUBLIC_FEATURE_PORTFOLIO)
 *
 * The Playwright webServer starts `next dev` with all four flags =true (see
 * playwright.config.ts) — runtime defaults for normal builds stay OFF.
 * All API responses are mocked with page.route(); no backend is required.
 */
import { test, expect } from "@playwright/test";
import { collectConsoleErrors, errorEnvelope, okEnvelope } from "./mock-utils";

// ─── /kelas-privat ────────────────────────────────────────────────────────────

// Hazl decision: Private Class stays OFF. Video sales use E-Course and seminar
// sales use Event, so this legacy mentoring route must remain unavailable.
test.describe("Private Class page (/kelas-privat)", () => {
  test("returns 404 while the legacy mentoring feature is OFF", async ({ page }) => {
    const response = await page.goto("/kelas-privat");

    expect(response?.status()).toBe(404);
    await expect(page.getByText("404", { exact: true })).toBeVisible();
  });
});

// ─── /komunitas ───────────────────────────────────────────────────────────────

test.describe("Community page (/komunitas)", () => {
  test("lead form submits with source=community and shows success state", async ({ page }) => {
    const consoleErrors = collectConsoleErrors(page);

    let leadBody: Record<string, unknown> | null = null;
    await page.route("**/api/leads", async (route) => {
      leadBody = route.request().postDataJSON() as Record<string, unknown>;
      await route.fulfill(okEnvelope({ id: "x", message: "ok" }, undefined, 201));
    });

    await page.goto("/komunitas");

    // LandingTemplate renders the LeadCaptureForm
    await expect(page.getByText("Daftar Jadi Anggota")).toBeVisible();
    await page.fill("#lead-name", "Budi E2E");
    await page.fill("#lead-email", "budi.e2e@example.com");
    await page.getByRole("button", { name: "Gabung Komunitas" }).click();

    // Success ("Terima kasih") state
    await expect(page.getByRole("heading", { name: "Terima kasih!" })).toBeVisible();

    // Request body carried the community source
    expect(leadBody).not.toBeNull();
    expect(leadBody).toMatchObject({
      name: "Budi E2E",
      email: "budi.e2e@example.com",
      source: "community",
    });

    expect(consoleErrors.errors).toEqual([]);
  });
});

// ─── /alumni ──────────────────────────────────────────────────────────────────

test.describe("Alumni stories page (/alumni)", () => {
  const stories = [
    {
      id: "t1",
      name: "Rina Santoso",
      role: "Frontend Developer",
      company: "TechCo",
      quote: "Materinya aplikatif dan mentornya sabar banget.",
      rating: 5,
      featured: true,
      category: "alumni",
      outcome: "Career switch jadi Frontend Developer dalam 6 bulan",
    },
    {
      id: "t2",
      name: "Andi Wijaya",
      role: "Data Analyst",
      quote: "Belajarnya terstruktur, langsung kepakai di kerjaan.",
      category: "alumni",
    },
  ];

  test("renders alumni cards with name and outcome", async ({ page }) => {
    const consoleErrors = collectConsoleErrors(page);
    await page.route("**/api/testimonials**", (route) =>
      route.fulfill(okEnvelope(stories)),
    );

    await page.goto("/alumni");

    const cards = page.locator("article.al-card");
    await expect(cards).toHaveCount(2);
    await expect(page.getByText("Rina Santoso")).toBeVisible();
    await expect(page.getByText("Andi Wijaya")).toBeVisible();
    // Outcome line on the featured story
    await expect(
      page.getByText("Career switch jadi Frontend Developer dalam 6 bulan"),
    ).toBeVisible();
    await expect(page.locator("article.al-card-featured")).toContainText("Rina Santoso");

    expect(consoleErrors.errors).toEqual([]);
  });

  test("empty list shows 'Cerita alumni segera hadir'", async ({ page }) => {
    const consoleErrors = collectConsoleErrors(page);
    await page.route("**/api/testimonials**", (route) =>
      route.fulfill(okEnvelope([])),
    );

    await page.goto("/alumni");

    await expect(
      page.getByRole("heading", { name: "Cerita alumni segera hadir" }),
    ).toBeVisible();

    expect(consoleErrors.errors).toEqual([]);
  });
});

// ─── /portofolio-member ───────────────────────────────────────────────────────

test.describe("Member portfolio pages (/portofolio-member)", () => {
  const members = [
    { id: "m1", name: "Citra Lestari", role: "UI Designer", headline: "Design systems enthusiast", featured: true },
    { id: "m2", name: "Dodi Pratama", role: "Backend Engineer" },
  ];

  test("list renders member cards linking to detail pages", async ({ page }) => {
    const consoleErrors = collectConsoleErrors(page);
    await page.route("**/api/portfolios?*", (route) =>
      route.fulfill(okEnvelope(members, { total: 2, page: 1, limit: 12 })),
    );

    await page.goto("/portofolio-member");

    await expect(page.locator("a.pm-card")).toHaveCount(2);
    await expect(page.locator('a[href="/portofolio-member/m1"]')).toBeVisible();
    await expect(page.locator('a[href="/portofolio-member/m2"]')).toBeVisible();
    await expect(page.getByText("Citra Lestari")).toBeVisible();
    await expect(page.getByText("Dodi Pratama")).toBeVisible();

    expect(consoleErrors.errors).toEqual([]);
  });

  test("detail shows external link button only for https portfolio items", async ({ page }) => {
    const consoleErrors = collectConsoleErrors(page);
    await page.route("**/api/portfolios/m1", (route) =>
      route.fulfill(
        okEnvelope({
          id: "m1",
          name: "Citra Lestari",
          role: "UI Designer",
          headline: "Design systems enthusiast",
          portfolioItems: [
            {
              title: "Desain Aplikasi Kasir",
              url: "https://example.com/karya-kasir",
              description: "Case study lengkap.",
            },
            // No https url → must NOT get an external link button
            { title: "Logo Warung Kopi", url: null },
          ],
        }),
      ),
    );

    await page.goto("/portofolio-member/m1");

    await expect(page.getByRole("heading", { name: "Citra Lestari" })).toBeVisible();
    await expect(page.getByText("Desain Aplikasi Kasir")).toBeVisible();
    await expect(page.getByText("Logo Warung Kopi")).toBeVisible();

    // Exactly one "Lihat karya" external link — for the https item only
    const itemLinks = page.locator("a.pd-item-link");
    await expect(itemLinks).toHaveCount(1);
    await expect(itemLinks).toHaveAttribute("href", "https://example.com/karya-kasir");

    expect(consoleErrors.errors).toEqual([]);
  });

  test("detail 404 from the API renders the app 404 page", async ({ page }) => {
    // Allowlist: this test deliberately mocks a 404, and Chromium logs the
    // failed resource load as a console error — that one is expected.
    const consoleErrors = collectConsoleErrors(page, [
      /\/api\/portfolios\/tidak-ada/,
      /the server responded with a status of 404/,
    ]);
    await page.route("**/api/portfolios/tidak-ada", (route) =>
      route.fulfill(errorEnvelope(404, "NOT_FOUND", "Portfolio not found")),
    );

    await page.goto("/portofolio-member/tidak-ada");

    // app/not-found.tsx
    await expect(page.getByText("404", { exact: true })).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Halaman Tidak Ditemukan" }),
    ).toBeVisible();

    expect(consoleErrors.errors).toEqual([]);
  });
});
