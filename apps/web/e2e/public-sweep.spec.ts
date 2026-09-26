import { test, expect, type Page } from "@playwright/test";

/**
 * Public-page sweep (beta checklist F6).
 *
 * For every key public page, at desktop (1280x800) and mobile (390x844):
 *  1. Document request succeeds (response.ok()).
 *  2. No horizontal overflow on mobile (scrollWidth <= innerWidth + 1).
 *  3. Zero console errors / uncaught page errors. All non-localhost requests
 *     are aborted so third-party scripts (gtag/mixpanel/CDNs) can never make
 *     the suite flaky; errors caused by those aborts are filtered out.
 *  4. Navbar is visible; on mobile the hamburger opens the menu.
 *  5. All /api/* responses are mocked to an empty envelope so pages render
 *     their empty states deterministically. The global error boundary
 *     ("Terjadi Kesalahan") appearing counts as a failure.
 *
 * Navbar coverage notes (layout audit, apps/web/app):
 *  - (public) layout renders the Navbar component -> hasNavbar: true.
 *  - /masuk and /daftar use the (auth) card shell (logo only, by design).
 *  - /blog and /berlangganan were moved into (public) (BL-49) — they used to
 *    render neither Navbar nor Footer, leaving visitors with no way out.
 */

type PageDef = {
  path: string;
  name: string;
  /** Whether the (public) layout Navbar is expected on this route. */
  hasNavbar: boolean;
  /**
   * Extra time budget for THIS route only, for the `next dev` cold compile —
   * not a relaxation of what the test asserts. Set it only where the first hit
   * on a cold `.next` genuinely cannot finish inside the default per-test
   * budget; every assertion below stays exactly as strict.
   */
  coldCompileSlow?: boolean;
};

const PAGES: PageDef[] = [
  { path: "/", name: "Homepage", hasNavbar: true },
  { path: "/e-course", name: "E-Course listing", hasNavbar: true },
  // /event is a server component that, on its first hit against a cold `.next`,
  // must be compiled AND must complete its server-side listEvents() call before
  // any HTML reaches the browser. On 11 Aug 2026 that exceeded the default
  // per-test budget on the desktop viewport (which hits the route first) while
  // the identical mobile test passed moments later on the warm route — proof
  // the page itself is fine. Only this entry gets the extra budget.
  { path: "/event", name: "Event listing", hasNavbar: true, coldCompileSlow: true },
  { path: "/ebook", name: "E-Book listing", hasNavbar: true },
  { path: "/kelas-gratis", name: "Kelas Gratis", hasNavbar: true },
  { path: "/blog", name: "Blog listing", hasNavbar: true },
  { path: "/about", name: "About", hasNavbar: true },
  { path: "/contact", name: "Contact", hasNavbar: true },
  { path: "/faq", name: "FAQ", hasNavbar: true },
  // Auth shell pages intentionally render a centered card without the Navbar.
  { path: "/masuk", name: "Login", hasNavbar: false },
  { path: "/daftar", name: "Register", hasNavbar: false },
  { path: "/afiliasi", name: "Afiliasi", hasNavbar: true },
  { path: "/kolaborasi", name: "Kolaborasi", hasNavbar: true },
  // Blind-spot closure: these four are linked from the Navbar dropdown and/or the
  // homepage CategoryGrid but had zero sweep coverage — a route reachable from
  // global chrome must be swept, otherwise a crash there ships unnoticed.
  { path: "/marketplace", name: "Marketplace Materi", hasNavbar: true },
  // /mentor deliberately absent from this list: every entry here is asserted to
  // return response.ok(), and the Mentor feature is OFF by owner decision C-2
  // (fictional roster). Its contract moved from "must render" to "must 404" and
  // is asserted at the bottom of this file plus in e2e/mentor-disabled.spec.ts.
  { path: "/clients", name: "LMS Perusahaan", hasNavbar: true },
  { path: "/trainer-program", name: "Trainer Program", hasNavbar: true },
  { path: "/berlangganan", name: "Berlangganan", hasNavbar: true },
];

const VIEWPORTS = [
  { name: "desktop", width: 1280, height: 800, isMobile: false },
  { name: "mobile", width: 390, height: 844, isMobile: true },
] as const;

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1"]);

const EMPTY_ENVELOPE = JSON.stringify({
  success: true,
  data: [],
  meta: { total: 0, page: 1, limit: 20 },
});

/**
 * Hermetic setup: mock every /api/* call with an empty success envelope and
 * abort every request that leaves localhost. Returns a live array of console
 * errors + uncaught exceptions (errors from our own aborts are filtered out).
 */
async function setupHermeticPage(page: Page): Promise<string[]> {
  const errors: string[] = [];

  page.on("console", (msg) => {
    if (msg.type() !== "error") return;
    const url = msg.location().url;
    // "Failed to load resource" errors for requests WE aborted (external
    // hosts) are expected noise, not app bugs — everything else counts.
    if (url) {
      try {
        if (!LOCAL_HOSTS.has(new URL(url).hostname)) return;
      } catch {
        /* not a URL — keep the error */
      }
    }
    errors.push(`[console.error] ${msg.text()} (${url || "no url"})`);
  });

  page.on("pageerror", (err) => {
    errors.push(`[pageerror] ${err.message}`);
  });

  // Deterministic empty state for every backend call.
  await page.route("**/api/**", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: EMPTY_ENVELOPE,
    })
  );

  // Registered last so it takes precedence: kill ALL external traffic
  // (analytics, CDNs, fonts) — tests stay fast, offline-safe, and quiet.
  await page.route(
    (url) => !LOCAL_HOSTS.has(url.hostname),
    (route) => route.abort()
  );

  return errors;
}

for (const vp of VIEWPORTS) {
  test.describe(`Public sweep — ${vp.name} (${vp.width}x${vp.height})`, () => {
    test.use({ viewport: { width: vp.width, height: vp.height } });

    for (const pg of PAGES) {
      test(`${pg.name} (${pg.path}) renders cleanly`, async ({ page }) => {
        // Cold-compile budget for flagged routes only — see PageDef.coldCompileSlow.
        // Nothing below changes: same assertions, same order, same expectations.
        if (pg.coldCompileSlow) test.slow();

        const consoleErrors = await setupHermeticPage(page);

        // 1. Document request succeeds.
        const response = await page.goto(pg.path);
        expect(response, `no document response for ${pg.path}`).not.toBeNull();
        expect(
          response!.ok(),
          `expected 2xx/3xx for ${pg.path}, got ${response!.status()}`
        ).toBeTruthy();

        // Let client components fetch (mocked) data and settle. networkidle
        // can be flaky under `next dev` HMR, so don't fail the test on it.
        await page.waitForLoadState("networkidle").catch(() => {});

        // 5. Global error boundary must NOT have replaced the page.
        await expect(
          page.getByText("Terjadi Kesalahan", { exact: true }),
          `error boundary rendered on ${pg.path} — page crashed on empty data`
        ).toHaveCount(0);
        await expect(
          page.getByText(/Application error: a client-side exception/i)
        ).toHaveCount(0);

        // 4. Navbar (or the route's intentional fallback chrome).
        if (pg.hasNavbar) {
          const navbar = page.getByRole("navigation", { name: "Navigasi utama" });
          await expect(navbar).toBeVisible();

          if (vp.isMobile) {
            // Hamburger opens the mobile menu; a known link becomes visible.
            const hamburger = page.getByRole("button", { name: "Buka menu" });
            await expect(hamburger).toBeVisible();
            await hamburger.click();
            const mobileMenu = page.locator("#mobile-nav-menu");
            await expect(mobileMenu).toBeVisible();
            await expect(
              mobileMenu.getByRole("link", { name: "E-Course", exact: true })
            ).toBeVisible();
            // Close it again so the overflow check sees the normal page state.
            await page.getByRole("button", { name: "Tutup menu" }).click();
            await expect(mobileMenu).toBeHidden();
          }
        } else {
          // Routes without the global Navbar still need visible page chrome.
          await expect(
            page.locator("h1, h2").first(),
            `no heading visible on ${pg.path}`
          ).toBeVisible();
        }

        // 2. No horizontal overflow on mobile.
        if (vp.isMobile) {
          const { scrollWidth, innerWidth } = await page.evaluate(() => ({
            scrollWidth: document.scrollingElement?.scrollWidth ?? 0,
            innerWidth: window.innerWidth,
          }));
          expect(
            scrollWidth,
            `horizontal overflow on ${pg.path}: scrollWidth ${scrollWidth} > innerWidth ${innerWidth} + 1`
          ).toBeLessThanOrEqual(innerWidth + 1);
        }

        // 3. Zero console errors / uncaught exceptions.
        expect(
          consoleErrors,
          `console/page errors on ${pg.path} (${vp.name}):\n${consoleErrors.join("\n")}`
        ).toEqual([]);
      });
    }
  });
}

/**
 * Flag-gated routes: the sweep above proves what MUST render; this proves what
 * must NOT. /mentor used to sit in PAGES expecting HTTP 200 — that expectation
 * contradicted owner decision C-2 (fictional roster stays hidden), so it is
 * inverted here rather than dropped. Losing the assertion entirely would let the
 * route quietly come back.
 */
test.describe("Gated routes stay closed", () => {
  for (const path of ["/mentor", "/mentor/ahmad-fauzi"]) {
    test(`${path} returns 404 while the Mentor flag is OFF`, async ({ page }) => {
      const res = await page.goto(path);
      expect(res?.status(), `${path} must not be publicly reachable`).toBe(404);
    });
  }
});
