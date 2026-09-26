import { test, expect } from "@playwright/test";

/**
 * Public list pages must not report a failed request as an empty catalogue.
 *
 * WHAT WENT WRONG
 * Four pages shared this shape:
 *
 *     fetch(`${API_BASE}/api/...`).then(...).catch(() => setItems([]))
 *
 * and rendered zero items as "segera hadir" — coming soon. Two defects rode
 * together: `API_BASE` is an absolute http://localhost:4000 URL that the
 * production CSP refuses outright, and the `.catch` then turned that refusal
 * into a confident, false claim about our own catalogue. A visitor was told we
 * had published nothing; the truth was that we never managed to ask.
 *
 * The unit tests in test/unit/list-resource.test.ts pin the state machine. This
 * file checks the part they cannot: that each page actually RENDERS the four
 * states distinctly, in a production build, with real CSP headers.
 */

// eslint-disable-next-line turbo/no-undeclared-env-vars
const PRODUCTION_BUILD = process.env.PLAYWRIGHT_PRODUCTION_BUILD === "1";
const NEEDS_PRODUCTION =
  "requires a production build: run with PLAYWRIGHT_PRODUCTION_BUILD=1 " +
  "(the CSP these pages tripped over is only sent in production)";

function json(body: unknown, status = 200) {
  return { status, contentType: "application/json", body: JSON.stringify(body) };
}

const paginated = (rows: unknown[]) => ({ success: true, data: { data: rows, total: rows.length } });
const bare = (rows: unknown[]) => ({ success: true, data: rows });

type Case = {
  name: string;
  path: string;
  /** The endpoint whose failure the page must report honestly. */
  endpoint: string;
  /** Heading shown when the request failed. */
  errorText: RegExp;
  /** Heading shown when the request SUCCEEDED and returned nothing. */
  emptyText: RegExp;
  rows: unknown[];
  envelope: (rows: unknown[]) => unknown;
  /** Something only visible once real rows render. */
  dataText: RegExp;
};

const CASES: Case[] = [
  {
    name: "alumni",
    path: "/alumni",
    endpoint: "**/api/testimonials*",
    errorText: /Gagal memuat cerita alumni/i,
    emptyText: /Cerita alumni segera hadir/i,
    rows: [{ id: "t1", name: "Alumni Uji", quote: "Kelasnya membantu sekali.", role: "Desainer" }],
    envelope: bare,
    dataText: /Alumni Uji/,
  },
  {
    name: "marketplace",
    path: "/marketplace",
    endpoint: "**/api/ebooks*",
    errorText: /Gagal memuat katalog/i,
    emptyText: /Materi segera hadir/i,
    rows: [
      {
        id: "b1",
        slug: "ebook-uji",
        title: "E-Book Uji",
        description: null,
        price: "50000",
        salePrice: null,
        coverUrl: null,
        author: "Penulis Uji",
        category: "Desain",
      },
    ],
    envelope: bare,
    dataText: /E-Book Uji/,
  },
  {
    name: "kelas-gratis",
    path: "/kelas-gratis",
    endpoint: "**/api/courses*",
    errorText: /Gagal memuat kelas gratis/i,
    emptyText: /Kelas gratis segera hadir/i,
    rows: [{ id: "c9", slug: "gratis-uji", title: "Kelas Gratis Uji", price: "0", salePrice: "0" }],
    envelope: paginated,
    dataText: /Kelas Gratis Uji/,
  },
];

test.describe("Public lists: failure is never rendered as emptiness", () => {
  test.beforeEach(async ({ page }) => {
    test.skip(!PRODUCTION_BUILD, NEEDS_PRODUCTION);
    // Everything not explicitly handled below is unreachable. The specific
    // route registered afterwards wins (Playwright matches last-registered
    // first), so each case controls exactly its own endpoint.
    await page.route("**/api/**", (route) => route.abort());
  });

  for (const c of CASES) {
    test(`${c.name}: HTTP 500 shows an error, not "segera hadir"`, async ({ page }) => {
      await page.route(c.endpoint, (route) =>
        route.fulfill(json({ success: false, error: { code: "ERR" } }, 500)),
      );

      await page.goto(c.path, { waitUntil: "domcontentloaded" });

      await expect(page.getByText(c.errorText).first()).toBeVisible({ timeout: 15_000 });
      // The decisive assertion: the "coming soon" copy must be absent.
      await expect(page.getByText(c.emptyText)).toHaveCount(0);
      await expect(page.getByRole("button", { name: /Muat Ulang/i }).first()).toBeVisible();
    });

    test(`${c.name}: network failure shows an error, not "segera hadir"`, async ({ page }) => {
      await page.route(c.endpoint, (route) => route.abort());

      await page.goto(c.path, { waitUntil: "domcontentloaded" });

      await expect(page.getByText(c.errorText).first()).toBeVisible({ timeout: 15_000 });
      await expect(page.getByText(c.emptyText)).toHaveCount(0);
    });

    test(`${c.name}: an unrecognised payload is an error, not an empty shelf`, async ({ page }) => {
      // A 200 whose body matches no known envelope. This used to fall through
      // to "empty" — a broken contract silently became a product claim.
      await page.route(c.endpoint, (route) => route.fulfill(json({ success: true, data: { nope: 1 } })));

      await page.goto(c.path, { waitUntil: "domcontentloaded" });

      await expect(page.getByText(c.errorText).first()).toBeVisible({ timeout: 15_000 });
      await expect(page.getByText(c.emptyText)).toHaveCount(0);
    });

    test(`${c.name}: a successful empty response IS the honest empty state`, async ({ page }) => {
      await page.route(c.endpoint, (route) => route.fulfill(json(c.envelope([]))));

      await page.goto(c.path, { waitUntil: "domcontentloaded" });

      await expect(page.getByText(c.emptyText).first()).toBeVisible({ timeout: 15_000 });
      // …and it must NOT be dressed up as a failure either. Both directions.
      await expect(page.getByText(c.errorText)).toHaveCount(0);
    });

    test(`${c.name}: rows render`, async ({ page }) => {
      await page.route(c.endpoint, (route) => route.fulfill(json(c.envelope(c.rows))));

      await page.goto(c.path, { waitUntil: "domcontentloaded" });

      await expect(page.getByText(c.dataText).first()).toBeVisible({ timeout: 15_000 });
      await expect(page.getByText(c.errorText)).toHaveCount(0);
      await expect(page.getByText(c.emptyText)).toHaveCount(0);
    });

    test(`${c.name}: retry re-fetches — failure then success`, async ({ page }) => {
      let attempts = 0;
      await page.route(c.endpoint, (route) => {
        attempts++;
        // First attempt fails; every attempt after it succeeds.
        return attempts === 1
          ? route.fulfill(json({ success: false }, 503))
          : route.fulfill(json(c.envelope(c.rows)));
      });

      await page.goto(c.path, { waitUntil: "domcontentloaded" });
      await expect(page.getByText(c.errorText).first()).toBeVisible({ timeout: 15_000 });

      await page.getByRole("button", { name: /Muat Ulang/i }).first().click();

      await expect(page.getByText(c.dataText).first()).toBeVisible({ timeout: 15_000 });
      await expect(page.getByText(c.errorText)).toHaveCount(0);
      // A retry that does not actually re-request is a lie of a different kind.
      expect(attempts, "retry did not issue a second request").toBeGreaterThan(1);
    });

    test(`${c.name}: retry that fails again stays honest`, async ({ page }) => {
      let attempts = 0;
      await page.route(c.endpoint, (route) => {
        attempts++;
        return route.fulfill(json({ success: false }, 500));
      });

      await page.goto(c.path, { waitUntil: "domcontentloaded" });
      await expect(page.getByText(c.errorText).first()).toBeVisible({ timeout: 15_000 });

      await page.getByRole("button", { name: /Muat Ulang/i }).first().click();

      // Still an error. It must never decay into "segera hadir" on retry.
      await expect(page.getByText(c.errorText).first()).toBeVisible({ timeout: 15_000 });
      await expect(page.getByText(c.emptyText)).toHaveCount(0);
      expect(attempts).toBeGreaterThan(1);
    });
  }

  test("no public list reaches a cross-origin API from the browser", async ({ page }) => {
    const refused: string[] = [];
    page.on("console", (m) => {
      if (/Content Security Policy|Refused to connect/i.test(m.text())) refused.push(m.text());
    });

    for (const c of CASES) {
      await page.route(c.endpoint, (route) => route.fulfill(json(c.envelope(c.rows))));
      await page.goto(c.path, { waitUntil: "domcontentloaded" });
      await expect(page.getByText(c.dataText).first()).toBeVisible({ timeout: 15_000 });
      await page.unroute(c.endpoint);
    }

    expect(refused, `CSP-refused requests:\n${refused.join("\n")}`).toEqual([]);
  });
});
