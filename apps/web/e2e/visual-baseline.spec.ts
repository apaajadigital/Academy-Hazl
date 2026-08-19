/**
 * Visual baseline for the public marketing surface.
 *
 * TWO RULES THIS FILE NOW ENFORCES, both learned the hard way:
 *
 * 1. Screenshots come from a PRODUCTION BUILD, never `next dev`. The dev server
 *    ignores `dynamicParams = false`, renders routes production 404s, and paints
 *    its own indicator badge into every full-page capture (~950 px that no
 *    visitor ever sees). Every baseline in this repo was captured that way, and
 *    twelve of them turned out to be photographs of a Next.js error overlay.
 *
 * 2. What is photographed must be deterministic. The /e-course baselines were
 *    recorded from whatever the local database held, so they only ever matched
 *    the machine that produced them. The catalogue is now served from a fixed
 *    fixture (e2e/fixtures/visual-courses.ts).
 *
 * Run it with:
 *
 *   PLAYWRIGHT_PRODUCTION_BUILD=1 npx playwright test visual-baseline
 *
 * Without that switch the screenshot and gated-route tests SKIP rather than run
 * against dev — a dev-server result here is not a weaker signal, it is a wrong
 * one, and recording it would put the old mess straight back.
 */

import { test, expect } from "@playwright/test";
import { installVisualCatalogue, VISUAL_COURSES } from "./fixtures/visual-courses";

/**
 * Mirrors PLAYWRIGHT_PRODUCTION_BUILD in playwright.config.ts. Not declared in
 * turbo.json for the reason documented there: Playwright is not a turbo task,
 * so this variable cannot affect any cached task output.
 */
// eslint-disable-next-line turbo/no-undeclared-env-vars
const PRODUCTION_BUILD = process.env.PLAYWRIGHT_PRODUCTION_BUILD === "1";
const NEEDS_PRODUCTION =
  "requires a production build: run with PLAYWRIGHT_PRODUCTION_BUILD=1 " +
  "(next dev renders gated routes and paints the dev indicator into screenshots)";

/**
 * Baselines in this repo are Windows-only, by owner decision, and the committed
 * files say so in their names (`…-chromium-win32.png`).
 *
 * This guard FAILS on any other platform instead of skipping. A skip would let
 * a Linux run report green while asserting nothing, and Playwright's default
 * behaviour is worse still: on a platform with no matching baseline it writes a
 * brand-new `-linux.png` and passes, quietly minting a second, unreviewed
 * source of truth. Neither is acceptable for the one suite whose entire job is
 * to notice change.
 *
 * The honest position is that a Win32 baseline says nothing about how Linux
 * rasterises the same page — font stacks and hinting differ — so no attempt is
 * made to reconcile the two with a looser threshold. If Linux coverage is
 * wanted later it needs its own reviewed baselines, recorded on that platform.
 */
const WINDOWS_ONLY_BASELINE =
  `Visual baselines are recorded on Windows only (files are named ` +
  `"…-chromium-win32.png") but this runner reports platform "${process.platform}". ` +
  `Do NOT re-record here: Playwright would silently create a separate, ` +
  `unreviewed "-${process.platform}" baseline, and a Win32 PNG is not evidence ` +
  `about Linux/macOS font rendering. The authoritative baselines are produced ` +
  `and verified by the Windows visual-regression job in CI ` +
  `(.github/workflows/ci.yml). See e2e/VISUAL_BASELINES.md.`;

function requireWindowsBaselinePlatform(): void {
  if (process.platform !== "win32") throw new Error(WINDOWS_ONLY_BASELINE);
}

const VIEWPORTS = [
  { name: "mobile", width: 320, height: 812 },
  { name: "tablet", width: 768, height: 1024 },
  { name: "desktop", width: 1024, height: 768 },
  { name: "wide", width: 1440, height: 900 },
] as const;

const ROUTES = [
  { name: "homepage", path: "/" },
  { name: "e-course-landing", path: "/e-course" },
  // The three learning-path routes that used to sit here are gone, along with
  // their twelve .png baselines. They were never coverage:
  //
  //  - `features.learningPath` is default-OFF, and each page pairs
  //    `dynamicParams = false` with a `generateStaticParams()` that returns []
  //    while the flag is off, so a production build serves 404 for all three.
  //  - `next dev` does NOT honour `dynamicParams = false`, so the suite — which
  //    ran against the dev server — still rendered them and photographed the
  //    result. The mismatch was invisible for exactly that reason.
  //  - Eleven of the twelve baselines were not photographs of a page at all:
  //    they captured the Next.js dev overlay reading "Runtime Error — Jest
  //    worker encountered 2 child process exceptions". Three different routes
  //    shared byte-identical PNGs, which is only possible if none of them
  //    rendered.
  //
  // Their contract is now asserted behaviourally at the bottom of this file:
  // the routes must 404, which is a stronger claim than "still looks the same".
  //
  // "mentor-ahmad-fauzi" was removed earlier for the same class of reason: the
  // Mentor feature is OFF by owner decision C-2, so the page cannot render and
  // there is nothing to photograph. Keeping it would also mean the repository
  // carried rendered portraits of a fictional person attributed to a real
  // company (BL-114).
] as const;

for (const route of ROUTES) {
  for (const vp of VIEWPORTS) {
    test(`baseline: ${route.name} @ ${vp.name} (${vp.width}px)`, async ({ page }) => {
      test.skip(!PRODUCTION_BUILD, NEEDS_PRODUCTION);
      // Ordered after the production check on purpose: a developer who simply
      // forgot the env var gets the actionable message, not a platform lecture.
      requireWindowsBaselinePlatform();

      // Fixed catalogue + no external traffic. Installed for every route, not
      // just /e-course: the homepage pulls course data too, and a beacon firing
      // mid-capture is the classic source of a "flaky" screenshot.
      const { external } = await installVisualCatalogue(page);

      await page.setViewportSize({ width: vp.width, height: vp.height });
      const res = await page.goto(route.path, { waitUntil: "networkidle" });
      expect(res?.status(), `${route.path} must render, not error`).toBe(200);

      await page.evaluate(() => document.fonts.ready);

      // Guard the picture before taking it. A green screenshot of a broken page
      // is worse than a red one, and both of these have shipped here before.
      await expect(page.getByText("Terjadi Kesalahan", { exact: true })).toHaveCount(0);
      await expect(page.getByText(/Runtime Error/i)).toHaveCount(0);
      // WhatsApp is fail-closed until the owner confirms a number (BL-45); an
      // empty wa.me link must never be baked into a baseline.
      await expect(page.locator('a[href="https://wa.me/"]')).toHaveCount(0);
      // No horizontal overflow — a baseline that encodes a broken layout would
      // make the breakage the thing we defend.
      const { scrollWidth, innerWidth } = await page.evaluate(() => ({
        scrollWidth: document.scrollingElement?.scrollWidth ?? 0,
        innerWidth: window.innerWidth,
      }));
      expect(
        scrollWidth,
        `horizontal overflow on ${route.path}: ${scrollWidth} > ${innerWidth} + 1`,
      ).toBeLessThanOrEqual(innerWidth + 1);

      if (route.path === "/e-course") {
        // The fixture must be what is on screen — exactly three rows, in order,
        // with no error or "coming soon" copy standing in for them.
        for (const c of VISUAL_COURSES) {
          await expect(page.getByText(c.title, { exact: true }).first()).toBeVisible();
        }
        await expect(
          page.locator("#ecourse-catalog").getByText(/segera hadir|Gagal memuat katalog/i),
        ).toHaveCount(0);
        await expect(page.locator("#ecourse-catalog .skeleton")).toHaveCount(0);
      }

      expect(
        external,
        `external requests must not be needed:\n${external.join("\n")}`,
      ).toEqual([]);

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
          // NOT raised as part of this work — the same 2% that was here before.
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

/**
 * Replaces the twelve deleted learning-path baselines.
 *
 * A screenshot could only ever say "this still looks like it did". For a route
 * that production does not serve, the thing worth pinning is stronger and
 * cheaper: it must stay closed. These assertions are deliberately behavioural —
 * no snapshot, no tolerance to tune — so they mean the same thing on any
 * machine, and they fail loudly if `features.learningPath` is ever switched on
 * without the pages being finished.
 *
 * NOTE: these only hold against a PRODUCTION build. `next dev` ignores
 * `dynamicParams = false` and will happily render the pages, which is precisely
 * how twelve worthless baselines got committed. See playwright.config.ts for
 * the production-server wiring this file depends on.
 */
const GATED_LEARNING_PATH_ROUTES = [
  "/e-course/digital-marketing",
  "/e-course/digital-marketing/marketing-management",
  "/e-course/digital-marketing/marketing-management/marketing-introduction",
] as const;

test.describe("Learning-path routes stay closed (features.learningPath OFF)", () => {
  for (const path of GATED_LEARNING_PATH_ROUTES) {
    test(`${path} returns 404 and renders no learning-path content`, async ({ page }) => {
      // Only true on a production build — `next dev` serves these 200.
      test.skip(!PRODUCTION_BUILD, NEEDS_PRODUCTION);

      const pageErrors: string[] = [];
      const consoleErrors: string[] = [];
      page.on("pageerror", (e) => pageErrors.push(e.message));
      page.on("console", (m) => {
        if (m.type() !== "error") return;
        const text = m.text();
        // The browser reports the document's own 404 as a console error. That
        // is the status this test REQUIRES, so counting it would make the
        // assertion contradict itself. Narrow on purpose: only the "resource
        // returned 404" line is ignored, and every other console error — a
        // thrown component, a failed script, a 500 — still fails the test.
        if (/Failed to load resource:.*\b404\b/.test(text)) return;
        consoleErrors.push(text);
      });

      // Navigation must complete normally — a gated route is a 404 page, not a
      // hang, a crash, or a bounce somewhere else.
      const res = await page.goto(path, { waitUntil: "load" });

      expect(res, `no document response for ${path}`).not.toBeNull();
      expect(res!.status(), `${path} must not be publicly reachable`).toBe(404);

      // No redirect: the visitor must land on the URL they asked for, and must
      // NOT be quietly funnelled into the paid flow.
      expect(new URL(page.url()).pathname).toBe(path);
      expect(page.url()).not.toContain("/checkout");

      // None of the learning-path chrome may render behind the 404.
      await expect(page.getByText(/Daftar Learning Path/i)).toHaveCount(0);
      await expect(page.locator('a[href^="/e-course/digital-marketing/"]')).toHaveCount(0);

      // The Next.js error overlay is what the deleted baselines had captured.
      await expect(page.getByText(/Runtime Error/i)).toHaveCount(0);
      await expect(page.getByText(/Jest worker encountered/i)).toHaveCount(0);
      await expect(page.getByText("Terjadi Kesalahan", { exact: true })).toHaveCount(0);

      expect(pageErrors, `uncaught page errors on ${path}:\n${pageErrors.join("\n")}`).toEqual([]);
      expect(
        consoleErrors,
        `console errors on ${path}:\n${consoleErrors.join("\n")}`,
      ).toEqual([]);
    });
  }
});
