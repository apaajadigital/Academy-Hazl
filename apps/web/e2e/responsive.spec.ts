import { test, expect } from "@playwright/test";

const BREAKPOINTS = [
  { name: "mobile-sm", width: 375, height: 812 },
  { name: "tablet", width: 768, height: 1024 },
  { name: "desktop", width: 1440, height: 900 },
];

const CRITICAL_PAGES = [
  { path: "/", name: "Homepage" },
  { path: "/e-course", name: "E-Course listing" },
  { path: "/masuk", name: "Login" },
  { path: "/blog", name: "Blog" },
];

for (const bp of BREAKPOINTS) {
  for (const pg of CRITICAL_PAGES) {
    test(`${pg.name} renders without horizontal overflow at ${bp.name} (${bp.width}px)`, async ({ page }) => {
      await page.setViewportSize({ width: bp.width, height: bp.height });
      await page.goto(pg.path);
      await page.waitForLoadState("networkidle");

      // Check scroll width is not larger than viewport (no horizontal overflow)
      const scrollWidth = await page.evaluate(() => document.body.scrollWidth);
      const viewportWidth = bp.width;
      // Allow small rounding differences (up to 5px)
      expect(scrollWidth).toBeLessThanOrEqual(viewportWidth + 5);
    });
  }
}

test("Homepage shows hero content on mobile", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto("/");
  await page.waitForLoadState("networkidle");
  await expect(page.locator("h1").first()).toBeVisible();
});

test("Navigation menu is accessible on mobile", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto("/");
  await page.waitForLoadState("networkidle");
  // Either hamburger menu or nav links should be present
  const nav = page.locator("nav, header");
  await expect(nav.first()).toBeVisible();
});
