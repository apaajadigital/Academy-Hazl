/**
 * /kelas-gratis — catalog contract + lead capture.
 *
 * public-sweep.spec.ts already covers this route's chrome, overflow and console
 * hygiene against an empty API. What it cannot cover is the part that actually
 * carries commercial risk: which courses get a "GRATIS" badge, and where that
 * badge sends the visitor. Those are asserted here against mocked data.
 *
 * Fully hermetic: every /api/* call is intercepted, no backend required.
 */
import { test, expect, type Page } from "@playwright/test";
import { collectConsoleErrors, okEnvelope } from "./mock-utils";

type CourseFixture = {
  id: string;
  slug: string;
  title: string;
  price: string;
  salePrice: string | null;
};

const FREE_COURSE: CourseFixture = {
  id: "c-free",
  slug: "dasar-branding",
  title: "Dasar Branding untuk Pemula",
  price: "0",
  salePrice: null,
};

const SECOND_FREE_COURSE: CourseFixture = {
  id: "c-free-2",
  slug: "pengantar-copywriting",
  title: "Pengantar Copywriting",
  price: "0",
  salePrice: "0",
};

/**
 * price > 0 with salePrice 0. Under the OLD client rule ("effective price =
 * salePrice ?? price") this rendered as GRATIS — and then checkout charged
 * Rp 250.000, because checkout prices a course from `price` alone. It must
 * never appear on this page.
 */
const DECEPTIVE_COURSE: CourseFixture = {
  id: "c-trap",
  slug: "strategi-lanjutan",
  title: "Strategi Lanjutan",
  price: "250000",
  salePrice: "0",
};

const PAID_COURSE: CourseFixture = {
  id: "c-paid",
  slug: "kelas-berbayar",
  title: "Kelas Berbayar",
  price: "199000",
  salePrice: null,
};

/** Intercept the catalog fetch and record the URL the component asked for. */
async function mockCatalog(page: Page, courses: CourseFixture[]): Promise<{ url: string | null }> {
  const captured: { url: string | null } = { url: null };
  await page.route("**/api/courses**", async (route) => {
    captured.url = route.request().url();
    await route.fulfill(okEnvelope(courses));
  });
  return captured;
}

const catalog = (page: Page) => page.locator("#kelas-gratis-catalog");

/**
 * The green price badge, and nothing else.
 *
 * `exact: true` is load-bearing: the default substring match is case-insensitive
 * and would also hit the section eyebrow "Mulai Gratis", every card's
 * unitLabel "Kelas Gratis", and the empty state's "Kelas gratis segera hadir" —
 * turning a count assertion into noise.
 */
const freeBadges = (page: Page) => catalog(page).getByText("GRATIS", { exact: true });

test.describe("Kelas Gratis — free course catalog", () => {
  test("asks the API for free courses only, and renders them", async ({ page }) => {
    const consoleErrors = collectConsoleErrors(page);
    const captured = await mockCatalog(page, [FREE_COURSE, SECOND_FREE_COURSE]);

    await page.goto("/kelas-gratis");

    const section = catalog(page);
    await expect(section).toBeVisible();

    // Assert on the rendered cards FIRST: the section is server-rendered and is
    // visible before the client-side catalog fetch has run, so reading
    // `captured.url` at this point would race the request.
    await expect(section.locator(`a[href="/checkout/${FREE_COURSE.slug}"]`)).toHaveCount(1);
    await expect(section.locator(`a[href="/checkout/${SECOND_FREE_COURSE.slug}"]`)).toHaveCount(1);
    await expect(freeBadges(page)).toHaveCount(2);
    await expect(page.getByRole("heading", { name: FREE_COURSE.title })).toBeVisible();

    // The free filter is the server's job (BL-52) — the page must delegate it
    // instead of over-fetching and trimming the result itself.
    expect(captured.url, "catalog fetch must carry free=true").toContain("free=true");
    expect(captured.url, "catalog must not over-fetch").toContain("limit=8");

    expect(consoleErrors.errors).toEqual([]);
  });

  test("card links to /checkout/<slug>, never to the legacy /kursus redirect", async ({ page }) => {
    await mockCatalog(page, [FREE_COURSE]);

    await page.goto("/kelas-gratis");

    const section = catalog(page);
    await expect(section.locator(`a[href="/checkout/${FREE_COURSE.slug}"]`)).toHaveCount(1);
    await expect(
      section.locator('a[href^="/kursus/"]'),
      "BL-51: /kursus/<slug> only resolves via a 308 redirect — link the canonical path",
    ).toHaveCount(0);
  });

  test("never badges a course that checkout would still charge for", async ({ page }) => {
    // Simulates an API that predates the `free` param and answers with the whole
    // catalog: the client-side guard must still refuse to advertise these.
    await mockCatalog(page, [FREE_COURSE, DECEPTIVE_COURSE, PAID_COURSE]);

    await page.goto("/kelas-gratis");

    const section = catalog(page);
    await expect(section.locator(`a[href="/checkout/${FREE_COURSE.slug}"]`)).toHaveCount(1);
    await expect(
      section.locator(`a[href="/checkout/${DECEPTIVE_COURSE.slug}"]`),
      "price>0 with salePrice=0 is NOT free — checkout prices courses from `price`",
    ).toHaveCount(0);
    await expect(section.locator(`a[href="/checkout/${PAID_COURSE.slug}"]`)).toHaveCount(0);
    await expect(freeBadges(page)).toHaveCount(1);
  });

  test("shows the empty state when there are no free courses", async ({ page }) => {
    const consoleErrors = collectConsoleErrors(page);
    await mockCatalog(page, []);

    await page.goto("/kelas-gratis");

    await expect(page.getByRole("heading", { name: "Kelas gratis segera hadir" })).toBeVisible();
    await expect(freeBadges(page)).toHaveCount(0);
    await expect(page.getByRole("link", { name: /Lihat Semua Kursus/ })).toBeVisible();

    expect(consoleErrors.errors).toEqual([]);
  });

  test("degrades to the empty state when the catalog API fails", async ({ page }) => {
    await page.route("**/api/courses**", (route) => route.abort());

    await page.goto("/kelas-gratis");

    // A failed catalog fetch must land on the empty state, not on a half-rendered
    // grid: no card, no badge, and the skeleton must not stay up forever.
    await expect(page.getByRole("heading", { name: "Kelas gratis segera hadir" })).toBeVisible();
    await expect(freeBadges(page)).toHaveCount(0);
    await expect(catalog(page).locator('a[href^="/checkout/"]')).toHaveCount(0);
  });
});

test.describe("Kelas Gratis — lead capture", () => {
  test("lead form submits with source=free-class and shows success state", async ({ page }) => {
    const consoleErrors = collectConsoleErrors(page);
    await mockCatalog(page, [FREE_COURSE]);

    let leadBody: Record<string, unknown> | null = null;
    await page.route("**/api/leads", async (route) => {
      leadBody = route.request().postDataJSON() as Record<string, unknown>;
      await route.fulfill(okEnvelope({ id: "lead-1", message: "ok" }, undefined, 201));
    });

    await page.goto("/kelas-gratis");

    await expect(page.getByText("Daftar kelas gratis")).toBeVisible();
    await page.fill("#lead-name", "Budi E2E");
    await page.fill("#lead-email", "budi.e2e@example.com");
    await page.getByRole("button", { name: "Daftar Gratis" }).click();

    await expect(page.getByRole("heading", { name: "Terima kasih!" })).toBeVisible();

    expect(leadBody).not.toBeNull();
    expect(leadBody).toMatchObject({
      name: "Budi E2E",
      email: "budi.e2e@example.com",
      source: "free-class",
    });

    expect(consoleErrors.errors).toEqual([]);
  });
});
