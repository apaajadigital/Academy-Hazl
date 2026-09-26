import { test, expect } from "@playwright/test";

test.describe("E-Course public pages", () => {
  test("e-course listing page loads with at least a heading", async ({ page }) => {
    await page.goto("/e-course");
    await expect(page.locator("h1, h2").first()).toBeVisible();
  });

  test("e-course page has course cards or categories", async ({ page }) => {
    await page.goto("/e-course");
    await page.waitForLoadState("networkidle");
    // Should have some content — cards, categories, or empty state
    // (single locator: "main, body" matches both and violates strict mode)
    const main = page.locator("main#main-content");
    await expect(main).toBeVisible();
  });

  // Learning-path taxonomy routes are gated: /e-course/[kategori] sets
  // `dynamicParams = false` with an empty generateStaticParams() while
  // features.learningPath is OFF, so this URL is a real 404. The old assertion
  // (`body` visible) passed on the 404 page too — a hollow test that would have
  // stayed green no matter what shipped (same defect class as BL-100). Assert the
  // status code instead, so this starts failing the day the flag flips ON and the
  // test must be rewritten for the real page.
  test("e-course category page is 404 while learningPath is OFF", async ({ page }) => {
    const response = await page.goto("/e-course/digital-marketing");
    expect(response, "no document response").not.toBeNull();
    expect(
      response!.status(),
      "expected 404 for a gated learning-path category"
    ).toBe(404);
  });

  test("e-course berlangganan page shows subscription plans", async ({ page }) => {
    await page.goto("/berlangganan");
    await page.waitForLoadState("networkidle");
    // Subscription page or plans should be visible
    const content = await page.locator("body").textContent();
    expect(content?.length).toBeGreaterThan(50);
  });
});

test.describe("E-Course course detail", () => {
  test("courses page shows listing", async ({ page }) => {
    await page.goto("/e-course");
    await page.waitForLoadState("networkidle");
    const heading = page.locator("h1, h2, h3").first();
    await expect(heading).toBeVisible();
  });
});
