import { test, expect } from "@playwright/test";

/**
 * The Mentor feature is OFF — owner decision C-2, 6 Aug 2026.
 *
 * The roster in lib/e-course/data.ts is fictional: seven invented people
 * attributed to real companies (Tokopedia, Gojek, BCA, …) with placeholder
 * LinkedIn URLs. On 10 Aug 2026 the production sitemap was found handing all
 * eight of those URLs to search engines, because the flag inverted the project's
 * convention and defaulted to ON.
 *
 * This spec is the contract that keeps it off. It asserts the four surfaces the
 * flag has to close simultaneously — route, sub-route, sitemap and navigation —
 * because closing only some of them is exactly how the pages stayed indexable
 * while looking gated.
 *
 * The whole suite runs with NEXT_PUBLIC_FEATURE_MENTOR=false (set explicitly in
 * playwright.config.ts). Should the flag ever be turned back ON deliberately,
 * that belongs in a spec with its OWN isolated environment — not by flipping the
 * global default back.
 */

const FICTIONAL_SLUGS = ["ahmad-fauzi", "rina-kusuma", "kevin-wijaya", "hendra-gunawan"];

test.describe("Mentor feature disabled (C-2)", () => {
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
});
