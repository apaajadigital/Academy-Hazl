import { test, expect } from "@playwright/test";

/**
 * The Mentor roster was DELETED, not merely gated — owner decision 11 Sep 2026
 * (BL-114).
 *
 * History: lib/e-course/data.ts carried seven invented people attributed to
 * real companies (Tokopedia, Gojek, BCA, …) with placeholder LinkedIn URLs. On
 * 10 Aug 2026 the production sitemap was found handing all eight of those URLs
 * to search engines, because the flag inverted the project's convention and
 * defaulted to ON. It was gated OFF on 31 Jul, and on 11 Sep the data, the
 * routes, the components and the flag itself were removed from the repository
 * — a flag hides fabricated people, it does not delete them.
 *
 * This spec is the regression guard that keeps them gone. It asserts the same
 * four surfaces as before — route, sub-route, sitemap and navigation — because
 * closing only some of them is exactly how the pages stayed indexable while
 * looking gated. It now also asserts the invented names appear nowhere in the
 * served HTML at all.
 */

const FICTIONAL_SLUGS = ["ahmad-fauzi", "rina-kusuma", "kevin-wijaya", "hendra-gunawan"];
const FICTIONAL_NAMES = ["Ahmad Fauzi", "Rina Kusuma", "Kevin Wijaya", "Hendra Gunawan"];

test.describe("Mentor roster removed (BL-114)", () => {
  test("/mentor returns 404", async ({ page }) => {
    const res = await page.goto("/mentor");
    expect(res?.status()).toBe(404);
  });

  test("every fictional mentor profile returns 404", async ({ page }) => {
    for (const slug of FICTIONAL_SLUGS) {
      const res = await page.goto(`/mentor/${slug}`);
      expect(res?.status(), `/mentor/${slug} must not be reachable`).toBe(404);
    }
  });

  test("sitemap advertises no mentor URL", async ({ request }) => {
    const res = await request.get("/sitemap.xml");
    expect(res.ok()).toBe(true);
    const xml = await res.text();

    // Guard against the assertion silently passing on an empty document.
    expect(xml).toContain("<urlset");
    expect(xml.match(/<url>/g)?.length ?? 0).toBeGreaterThan(0);

    expect(xml).not.toContain("/mentor");
    for (const slug of FICTIONAL_SLUGS) {
      expect(xml, `sitemap must not list ${slug}`).not.toContain(slug);
    }
  });

  test("public navigation exposes no Mentor link", async ({ page }) => {
    await page.goto("/");
    // Anchor on the href: the word "mentor" legitimately appears in marketing
    // copy elsewhere, but a LINK to the route must not exist anywhere on the
    // page — navbar, footer, or body.
    await expect(page.locator('a[href="/mentor"]')).toHaveCount(0);
    await expect(page.locator('a[href^="/mentor/"]')).toHaveCount(0);
  });

  test("the invented names are not served anywhere on the homepage", async ({ page }) => {
    await page.goto("/");
    const html = await page.content();
    for (const name of FICTIONAL_NAMES) {
      expect(html, `"${name}" is fabricated and must not be served`).not.toContain(name);
    }
  });
});
