/**
 * Visual Baseline — Dark Theme "Before" Snapshots
 * Dijalankan SEBELUM migrasi light theme (Phase 0).
 * Screenshots disimpan sebagai referensi perbandingan di tiap Phase berikutnya.
 * Jalankan: pnpm playwright test visual-baseline --update-snapshots
 */

import { test, expect } from "@playwright/test";

const VIEWPORTS = [
  { name: "mobile", width: 320, height: 812 },
  { name: "tablet", width: 768, height: 1024 },
  { name: "desktop", width: 1024, height: 768 },
  { name: "wide", width: 1440, height: 900 },
] as const;

const ROUTES = [
  { name: "homepage", path: "/" },
  { name: "e-course-landing", path: "/e-course" },
  { name: "level1-digital-marketing", path: "/e-course/digital-marketing" },
  { name: "level2-marketing-management", path: "/e-course/digital-marketing/marketing-management" },
  { name: "level3-marketing-intro", path: "/e-course/digital-marketing/marketing-management/marketing-introduction" },
  // "mentor-ahmad-fauzi" removed: the Mentor feature is OFF by owner decision
  // C-2, so the page cannot render and there is nothing to photograph. Keeping
  // it would also mean the repository carried rendered portraits of a fictional
  // person attributed to a real company (BL-114) — the exact artefact the
  // decision exists to stop shipping. Its stale .png baselines are deleted in
  // the same change; the route is covered by the behavioural assertion below
  // instead. Every other route keeps its visual coverage untouched.
] as const;

for (const route of ROUTES) {
  for (const vp of VIEWPORTS) {
    test(`baseline: ${route.name} @ ${vp.name} (${vp.width}px)`, async ({ page }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.goto(route.path, { waitUntil: "networkidle" });

      await page.evaluate(() => document.fonts.ready);

      await expect(page).toHaveScreenshot(
        `${route.name}--${vp.name}--${vp.width}.png`,
        {
          fullPage: true,
          animations: "disabled",
          threshold: 0.1,
          // Full-page shots of long marketing pages jitter a few hundred px
          // across runs (font raster, lazy image decode) even with animations
          // off; a small ratio tolerance keeps the diff meaningful without
          // flaking. 2% of a ~1440x8000 page ≈ real layout changes still fail.
          maxDiffPixelRatio: 0.02,
        }
      );
    });
  }
}

/**
 * Replaces the removed `mentor-ahmad-fauzi` snapshot. A visual baseline can only
 * assert "this page still looks like it did"; what matters for a gated route is
 * that it does not render at all. This is the behavioural equivalent, and it
 * fails loudly if the flag ever flips back on unnoticed.
 */
test("mentor profile is feature-disabled, not photographed", async ({ page }) => {
  const res = await page.goto("/mentor/ahmad-fauzi");
  expect(res?.status()).toBe(404);
});
