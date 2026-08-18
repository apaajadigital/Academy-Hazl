import { test, expect, type Page } from "@playwright/test";

/**
 * Role gates for the four protected shells.
 *
 * WHY PLAYWRIGHT AND NOT A UNIT TEST
 * The claim under test is "protected chrome must not be painted before the auth
 * decision lands". That is a rendering property, not a pure function, and this
 * workspace's vitest runs in `environment: node` with no DOM library — adding
 * one would mean a new dependency and a lockfile change. Playwright is already
 * here, drives the real layout, and answers the question directly. Every
 * response is mocked, so no account, token, or database is involved.
 *
 * WHAT IT GUARDS
 * Two regressions, both of which shipped and neither of which an anonymous
 * probe could see:
 *
 *  1. Shell flash. Before fix(auth) [a5b8183], /dashboard painted the full
 *     student menu for ~900ms and /lms/<slug>/admin painted the tenant console
 *     for ~460ms to a signed-out visitor.
 *  2. Lock-out. The guard added by that same commit called
 *     `${API_BASE}/api/lms/portal/me` — an absolute http://localhost:4000 URL
 *     that the production CSP (`connect-src 'self' https:`) refuses. The fetch
 *     never left the renderer, so every legitimate tenant admin was redirected
 *     to /masuk. "Redirect to /masuk" is the CORRECT answer for an anonymous
 *     visitor, which is why the anonymous probe reported green.
 *
 * Lesson encoded below as scenario 18: it is not enough to assert where the
 * visitor ends up. The authorisation request must be OBSERVED to happen. A gate
 * that fails closed because it cannot ask the question is indistinguishable, by
 * destination alone, from one that asked and got "no".
 *
 * Chrome is identified by NAV HREF, not by text: shell vocabularies overlap
 * ("Kursus Saya" is in both the student and trainer menus, "Payout" in both the
 * trainer and admin menus), so a text probe would report leaks that never
 * happened and miss ones that did.
 */

// eslint-disable-next-line turbo/no-undeclared-env-vars
const PRODUCTION_BUILD = process.env.PLAYWRIGHT_PRODUCTION_BUILD === "1";
const NEEDS_PRODUCTION =
  "requires a production build: run with PLAYWRIGHT_PRODUCTION_BUILD=1 " +
  "(the CSP that caused the lock-out is only sent in production)";

const TENANT = "acme";

/**
 * One nav href per shell, scoped to that shell's own <nav>.
 *
 * The scoping is load-bearing twice over. Unscoped, `a[href="/admin/pengguna"]`
 * also matches a KPI card on the admin dashboard page — two elements, so
 * Playwright's strict mode fails the assertion, and worse, a bare `.first()`
 * could be satisfied by page CONTENT when the claim is about shell CHROME.
 * Text markers are no good either: "Kursus Saya" is in both the student and
 * trainer menus and "Payout" in both the trainer and admin menus.
 */
const SHELL = {
  student: '.sidebar-nav a[href="/dashboard/kursus"]',
  admin: '.al-nav a[href="/admin/pengguna"]',
  trainer: '.th-nav a[href="/trainer-hub/payout"]',
  lmsAdmin: `aside a[href="/lms/${TENANT}/admin/batches"]`,
} as const;

/** The gated layouts render only a spinner — no <main> — until authorised. */
const CHILDREN = "main";
const SPINNER = '[role="status"], .dash-auth-spinner, .al-spinner';

/**
 * A syntactically valid, obviously fake JWT with a controllable `exp`.
 *
 * lib/auth/token.ts decodes the payload (without verifying) to decide whether
 * to refresh, so it has to parse. Nothing here is or resembles a real
 * credential, and every API response is mocked, so it is never presented to a
 * server.
 */
function fakeToken(expiresInSeconds: number): string {
  const payload = Buffer.from(
    JSON.stringify({
      sub: "e2e-user",
      exp: Math.floor(Date.now() / 1000) + expiresInSeconds,
    }),
  ).toString("base64url");
  return `e2e.${payload}.signature`;
}

/** Seed storage the way lib/auth/token.ts expects to find it. */
async function signIn(page: Page, expiresInSeconds = 3600) {
  await page.addInitScript((t) => {
    sessionStorage.setItem("access_token", t);
    localStorage.setItem("jg_access_token", t);
  }, fakeToken(expiresInSeconds));
}

function json(body: unknown, status = 200) {
  return { status, contentType: "application/json", body: JSON.stringify(body) };
}

type Counter = { hits: () => number; authorised: () => number };

/** `/api/auth/me` answering with the given roles. */
async function mockMe(
  page: Page,
  roles: string[],
  opts: { delayMs?: number } = {},
): Promise<Counter> {
  let hits = 0;
  let authorised = 0;
  await page.route("**/api/auth/me", async (route) => {
    hits++;
    if (route.request().headers()["authorization"]?.startsWith("Bearer ")) authorised++;
    if (opts.delayMs) await new Promise((r) => setTimeout(r, opts.delayMs));
    await route.fulfill(
      json({
        success: true,
        data: {
          name: "Pengguna Uji",
          email: "uji@example.test",
          avatarUrl: null,
          roles: roles.map((role) => ({ role })),
        },
      }),
    );
  });
  return { hits: () => hits, authorised: () => authorised };
}

/** `/api/lms/portal/me` — tenant list carrying `isAdmin` per tenant. */
async function mockPortal(
  page: Page,
  tenants: Array<{ slug: string; isAdmin: boolean }>,
  opts: { delayMs?: number } = {},
): Promise<Counter> {
  let hits = 0;
  let authorised = 0;
  await page.route("**/api/lms/portal/me", async (route) => {
    hits++;
    if (route.request().headers()["authorization"]?.startsWith("Bearer ")) authorised++;
    if (opts.delayMs) await new Promise((r) => setTimeout(r, opts.delayMs));
    await route.fulfill(
      json({
        success: true,
        data: tenants.map((t, i) => ({
          id: `tenant-${i}`,
          name: `Tenant ${t.slug}`,
          slug: t.slug,
          isAdmin: t.isAdmin,
        })),
      }),
    );
  });
  return { hits: () => hits, authorised: () => authorised };
}

/**
 * Every endpoint this suite does not care about is made UNREACHABLE.
 *
 * The obvious alternative — answering everything with `{success:true,data:[]}`
 * — was tried first and turned out to be an impossible fixture: the dashboard
 * pages read fields off that payload (`data.totalEnrolled`,
 * `…toLocaleString()`), so a generic empty envelope makes them throw into
 * app/error.tsx and take the whole shell down with them. That crash is a real
 * defect and is reported separately; it must not be smuggled into THIS suite,
 * whose subject is the layout gates, not the pages underneath.
 *
 * An unreachable API is a genuine production condition every one of these pages
 * is supposed to survive, so it is the honest stand-in. The two endpoints the
 * gates actually consult are mocked explicitly below and take precedence.
 */
async function mockRest(page: Page) {
  await page.route("**/api/**", (route) => route.abort());
}

type Watch = {
  /** ms after navigation when `selector` first appeared, or null if never. */
  firstSeen: number | null;
  /** Path transitions, in order. A loop keeps appending. */
  paths: string[];
  finalPath: string;
  samples: number;
};

/**
 * Sample the DOM every 100ms for `ms` and report whether `selector` ever
 * existed. Same method that measured the original leak (103ms → 1001ms), so a
 * regression of the same size cannot slip through.
 */
async function watchFor(page: Page, selector: string, ms = 2500): Promise<Watch> {
  let firstSeen: number | null = null;
  const paths: string[] = [];
  let samples = 0;
  const t0 = Date.now();

  while (Date.now() - t0 < ms) {
    const present = await page
      .evaluate((sel) => document.querySelector(sel) !== null, selector)
      .catch(() => false); // mid-navigation evaluate can throw; not a sighting
    const path = new URL(page.url()).pathname;
    if (paths[paths.length - 1] !== path) paths.push(path);
    samples++;
    if (present && firstSeen === null) firstSeen = Date.now() - t0;
    await page.waitForTimeout(100);
  }

  return { firstSeen, paths, finalPath: new URL(page.url()).pathname, samples };
}

test.describe("Protected shells — role gates", () => {
  test.beforeEach(async ({ page }) => {
    test.skip(!PRODUCTION_BUILD, NEEDS_PRODUCTION);
    // Registered first so the specific handlers below take precedence:
    // Playwright matches routes last-registered-first.
    await mockRest(page);
  });

  // ── 1 ── student sah membuka /dashboard ────────────────────────────────────
  test("1. student reaches /dashboard; no shell paints before auth resolves", async ({ page }) => {
    await signIn(page);
    const me = await mockMe(page, ["student"], { delayMs: 900 });
    await mockPortal(page, []);

    await page.goto("/dashboard", { waitUntil: "commit" });

    const during = await watchFor(page, SHELL.student, 800);
    expect(during.firstSeen, "student shell painted before auth resolved").toBeNull();
    expect(during.samples).toBeGreaterThan(4);

    await expect(page.locator(SHELL.student)).toBeVisible({ timeout: 15_000 });
    expect(new URL(page.url()).pathname).toBe("/dashboard");
    await expect(page.locator(SHELL.admin)).toHaveCount(0);
    await expect(page.locator(SHELL.trainer)).toHaveCount(0);
    // The decision was actually asked for, with credentials.
    expect(me.authorised()).toBeGreaterThan(0);
  });

  // ── 2 ── admin membuka /admin/dashboard ────────────────────────────────────
  test("2. admin reaches /admin/dashboard", async ({ page }) => {
    await signIn(page);
    const me = await mockMe(page, ["admin"]);

    await page.goto("/admin/dashboard", { waitUntil: "commit" });
    await expect(page.locator(SHELL.admin)).toBeVisible({ timeout: 15_000 });
    expect(new URL(page.url()).pathname).toBe("/admin/dashboard");
    expect(me.authorised()).toBeGreaterThan(0);
  });

  // ── 3 ── super_admin membuka /admin/dashboard ──────────────────────────────
  test("3. super_admin sees the admin shell only after the role is confirmed", async ({ page }) => {
    await signIn(page);
    await mockMe(page, ["super_admin"], { delayMs: 900 });

    await page.goto("/admin/dashboard", { waitUntil: "commit" });

    const during = await watchFor(page, SHELL.admin, 800);
    expect(during.firstSeen, "admin shell painted before the role was known").toBeNull();

    await expect(page.locator(SHELL.admin)).toBeVisible({ timeout: 15_000 });
    expect(new URL(page.url()).pathname).toBe("/admin/dashboard");
  });

  // ── 4 ── student ditolak dari /admin/dashboard ─────────────────────────────
  test("4. a student never sees the admin shell", async ({ page }) => {
    await signIn(page);
    await mockMe(page, ["student"]);

    await page.goto("/admin/dashboard", { waitUntil: "commit" });
    const seen = await watchFor(page, SHELL.admin);

    expect(seen.firstSeen, "admin shell must never paint for a student").toBeNull();
    expect(seen.finalPath).toBe("/dashboard");
  });

  // ── 5 ── trainer membuka /trainer-hub ──────────────────────────────────────
  test("5. trainer reaches /trainer-hub and stays there", async ({ page }) => {
    await signIn(page);
    await mockMe(page, ["trainer"]);

    await page.goto("/trainer-hub", { waitUntil: "commit" });
    await expect(page.locator(SHELL.trainer)).toBeVisible({ timeout: 15_000 });
    expect(new URL(page.url()).pathname).toBe("/trainer-hub");
    await expect(page.locator(SHELL.admin)).toHaveCount(0);
  });

  // ── 6 ── student ditolak dari /trainer-hub ─────────────────────────────────
  test("6. a student never sees the trainer shell", async ({ page }) => {
    await signIn(page);
    await mockMe(page, ["student"]);

    await page.goto("/trainer-hub", { waitUntil: "commit" });
    const seen = await watchFor(page, SHELL.trainer);

    expect(seen.firstSeen, "trainer shell must never paint for a student").toBeNull();
    expect(seen.finalPath).toBe("/dashboard");
  });

  // ── 7 + 18 ── tenant admin isAdmin=true, and the request must be OBSERVED ──
  test("7+18. tenant admin reaches the console, and the portal call is observed", async ({ page }) => {
    await signIn(page);
    await mockMe(page, ["student"]);
    const portal = await mockPortal(page, [{ slug: TENANT, isAdmin: true }], { delayMs: 900 });

    await page.goto(`/lms/${TENANT}/admin`, { waitUntil: "commit" });

    const during = await watchFor(page, SHELL.lmsAdmin, 800);
    expect(during.firstSeen, "console painted before isAdmin was known").toBeNull();

    await expect(page.locator(SHELL.lmsAdmin)).toBeVisible({ timeout: 15_000 });
    expect(new URL(page.url()).pathname).toBe(`/lms/${TENANT}/admin`);

    /**
     * Scenario 18. This is the assertion that would have caught the lock-out.
     * A CSP-refused request never reaches the interceptor, so the count stays
     * at zero while the visitor is redirected to /masuk — a destination that
     * looks perfectly correct if you only check the URL.
     */
    expect(portal.hits(), "the portal was never actually asked").toBeGreaterThan(0);
    expect(portal.authorised(), "the portal call carried no Bearer token").toBeGreaterThan(0);
  });

  // ── 8 ── anggota tenant isAdmin=false ──────────────────────────────────────
  test("8. tenant member without isAdmin goes to the participant portal", async ({ page }) => {
    await signIn(page);
    await mockMe(page, ["student"]);
    const portal = await mockPortal(page, [{ slug: TENANT, isAdmin: false }]);

    await page.goto(`/lms/${TENANT}/admin`, { waitUntil: "commit" });
    const seen = await watchFor(page, SHELL.lmsAdmin);

    expect(seen.firstSeen, "console chrome must never paint for a non-admin").toBeNull();
    expect(seen.finalPath).toBe(`/lms/${TENANT}`);
    expect(portal.hits()).toBeGreaterThan(0);
  });

  // ── 9 ── bukan anggota tenant ──────────────────────────────────────────────
  test("9. a non-member of the tenant is sent to their own dashboard", async ({ page }) => {
    await signIn(page);
    await mockMe(page, ["student"]);
    const portal = await mockPortal(page, [{ slug: "other-tenant", isAdmin: true }]);

    await page.goto(`/lms/${TENANT}/admin`, { waitUntil: "commit" });
    const seen = await watchFor(page, SHELL.lmsAdmin);

    expect(seen.firstSeen, "console chrome must never paint for a non-member").toBeNull();
    expect(seen.finalPath).toBe("/dashboard");
    expect(portal.hits()).toBeGreaterThan(0);
  });

  // ── 10 ── tanpa token ──────────────────────────────────────────────────────
  test("10. no token: no shell paints on any protected route, all land on /masuk", async ({ page }) => {
    for (const [path, selector] of [
      ["/dashboard", SHELL.student],
      [`/lms/${TENANT}/admin`, SHELL.lmsAdmin],
      ["/admin/dashboard", SHELL.admin],
      ["/trainer-hub", SHELL.trainer],
    ] as const) {
      await page.goto(path, { waitUntil: "commit" });
      const seen = await watchFor(page, selector, 1200);
      expect(seen.firstSeen, `${path} leaked its shell to a signed-out visitor`).toBeNull();
      expect(seen.finalPath, `${path} did not land on /masuk`).toBe("/masuk");
    }
  });

  // ── 11 ── token kedaluwarsa + refresh gagal ────────────────────────────────
  test("11. expired token with a failing refresh lands on /masuk", async ({ page }) => {
    // Expired past the 60s buffer in isTokenExpired(), so getValidToken() calls
    // /api/auth/refresh — which the unreachable-API catch-all fails, leaving it
    // with no token to return.
    await signIn(page, -120);
    await mockMe(page, ["student"]);

    await page.goto(`/lms/${TENANT}/admin`, { waitUntil: "commit" });
    const seen = await watchFor(page, SHELL.lmsAdmin);

    expect(seen.firstSeen).toBeNull();
    expect(seen.finalPath).toBe("/masuk");
  });

  // ── 12 ── /api/auth/me gagal ───────────────────────────────────────────────
  test("12. a failing /api/auth/me paints no protected shell", async ({ page }) => {
    await signIn(page);
    await page.route("**/api/auth/me", (route) => route.abort());

    for (const [path, selector] of [
      ["/dashboard", SHELL.student],
      ["/admin/dashboard", SHELL.admin],
      ["/trainer-hub", SHELL.trainer],
    ] as const) {
      await page.goto(path, { waitUntil: "commit" });
      const seen = await watchFor(page, selector, 1500);
      expect(seen.firstSeen, `${path} leaked its shell on API failure`).toBeNull();
      expect(seen.finalPath).toBe("/masuk");
    }
  });

  // ── 13 ── /api/lms/portal/me gagal ─────────────────────────────────────────
  test("13. a failing /api/lms/portal/me paints no tenant-admin shell", async ({ page }) => {
    for (const failure of ["abort", "500", "401", "garbage"] as const) {
      await signIn(page);
      await page.route("**/api/lms/portal/me", (route) => {
        if (failure === "abort") return route.abort();
        if (failure === "garbage") {
          return route.fulfill({ status: 200, contentType: "application/json", body: "not json" });
        }
        return route.fulfill(
          json({ success: false, error: { code: "ERR" } }, failure === "500" ? 500 : 401),
        );
      });

      await page.goto(`/lms/${TENANT}/admin`, { waitUntil: "commit" });
      const seen = await watchFor(page, SHELL.lmsAdmin, 1500);

      expect(seen.firstSeen, `console leaked on portal ${failure}`).toBeNull();
      expect(seen.finalPath, `portal ${failure} did not fail closed`).toBe("/masuk");
      await page.unroute("**/api/lms/portal/me");
    }
  });

  // ── 14 ── spinner tampil, children belum terlihat ──────────────────────────
  test("14. a slow decision shows a spinner and renders no children", async ({ page }) => {
    await signIn(page);
    await mockMe(page, ["student"]);
    await mockPortal(page, [{ slug: TENANT, isAdmin: true }], { delayMs: 1800 });

    await page.goto(`/lms/${TENANT}/admin`, { waitUntil: "commit" });

    await expect(page.locator(SPINNER).first()).toBeVisible({ timeout: 5_000 });
    // The gated branch returns the spinner INSTEAD of the layout, so the page's
    // <main> — which wraps {children} — must not exist yet.
    await expect(page.locator(CHILDREN)).toHaveCount(0);

    const during = await watchFor(page, SHELL.lmsAdmin, 1200);
    expect(during.firstSeen, "console painted while the check was in flight").toBeNull();

    // …and it does eventually resolve, so the spinner is a gate, not a hang.
    await expect(page.locator(SHELL.lmsAdmin)).toBeVisible({ timeout: 15_000 });
  });

  // ── 15 ── tidak ada redirect loop ──────────────────────────────────────────
  test("15. every rejection settles in one hop, with no redirect loop", async ({ page }) => {
    const cases = [
      { name: "401", portal: null, expect: "/masuk" },
      { name: "member-not-admin", portal: [{ slug: TENANT, isAdmin: false }], expect: `/lms/${TENANT}` },
      { name: "non-member", portal: [{ slug: "other", isAdmin: true }], expect: "/dashboard" },
    ] as const;

    for (const c of cases) {
      await signIn(page);
      await mockMe(page, ["student"]);
      if (c.portal === null) {
        await page.route("**/api/lms/portal/me", (route) =>
          route.fulfill(json({ success: false, error: { code: "UNAUTHORIZED" } }, 401)),
        );
      } else {
        await mockPortal(page, [...c.portal]);
      }

      await page.goto(`/lms/${TENANT}/admin`, { waitUntil: "commit" });
      const seen = await watchFor(page, SHELL.lmsAdmin, 2000);

      expect(seen.finalPath, `${c.name} settled somewhere unexpected`).toBe(c.expect);
      // `paths` records transitions only, so a loop keeps appending. One
      // decision means at most two: the requested route, then the destination.
      expect(
        seen.paths.length,
        `${c.name} looped: ${seen.paths.join(" → ")}`,
      ).toBeLessThanOrEqual(2);

      await page.unroute("**/api/lms/portal/me");
      await page.unroute("**/api/auth/me");
    }
  });

  // ── 16 ── tidak ada update state setelah unmount ───────────────────────────
  test("16. leaving mid-decision writes no state and throws nothing", async ({ page }) => {
    const pageErrors: string[] = [];
    const consoleErrors: string[] = [];
    page.on("pageerror", (e) => pageErrors.push(e.message));
    page.on("console", (m) => {
      if (m.type() === "error") consoleErrors.push(m.text());
    });

    await signIn(page);
    await mockMe(page, ["student"]);
    // Answers long after we have navigated away, so the `cancelled` guard is
    // the only thing standing between it and a write to an unmounted tree.
    await mockPortal(page, [{ slug: TENANT, isAdmin: true }], { delayMs: 2000 });

    await page.goto(`/lms/${TENANT}/admin`, { waitUntil: "commit" });
    await page.waitForTimeout(300);

    /**
     * Navigate to a route that does NOT talk to the API. Landing on a redirect
     * destination instead would drag that page's own fetches into the result:
     * /lms/<slug> runs an unguarded `Promise.all` of two fetches, so with the
     * API unreachable it emits an unhandled "Failed to fetch" that has nothing
     * to do with unmount safety here. That is a real defect and is reported
     * separately — it is simply not what this test is about.
     */
    await page.goto("/", { waitUntil: "domcontentloaded" });
    // Outlast the pending portal response by a wide margin.
    await page.waitForTimeout(2500);

    expect(pageErrors, `page errors after unmount:\n${pageErrors.join("\n")}`).toEqual([]);
    const unmountWarnings = consoleErrors.filter((t) =>
      /unmounted component|update on an unmounted|memory leak|setState/i.test(t),
    );
    expect(unmountWarnings, unmountWarnings.join("\n")).toEqual([]);
    // We really did leave before the decision landed.
    expect(new URL(page.url()).pathname).toBe("/");
  });

  // ── 17 ── tidak ada credential di console ──────────────────────────────────
  test("17. the gates log nothing credential-shaped", async ({ page }) => {
    const logs: string[] = [];
    page.on("console", (m) => logs.push(m.text()));

    await signIn(page);
    await mockMe(page, ["student"]);
    await mockPortal(page, [{ slug: TENANT, isAdmin: true }]);

    await page.goto(`/lms/${TENANT}/admin`, { waitUntil: "commit" });
    await page.waitForTimeout(1500);

    const leaked = logs.filter((t) =>
      /Bearer\s|access_token|jg_access_token|jg_rt|password/i.test(t),
    );
    expect(leaked, `credential-shaped console output:\n${leaked.join("\n")}`).toEqual([]);
  });

  /**
   * The specific defect, pinned directly. Nothing may reach an absolute
   * cross-origin API URL from the browser: the production CSP refuses it, and
   * the refusal is silent enough to look like a correct sign-out.
   */
  test("bonus. no protected shell reaches a cross-origin API from the browser", async ({ page }) => {
    const blocked: string[] = [];
    page.on("console", (m) => {
      if (/Content Security Policy|Refused to connect/i.test(m.text())) blocked.push(m.text());
    });

    await signIn(page);
    await mockMe(page, ["student"]);
    await mockPortal(page, [{ slug: TENANT, isAdmin: true }]);

    await page.goto(`/lms/${TENANT}/admin`, { waitUntil: "commit" });
    await expect(page.locator(SHELL.lmsAdmin)).toBeVisible({ timeout: 15_000 });
    await page.waitForTimeout(500);

    expect(blocked, `CSP-refused requests:\n${blocked.join("\n")}`).toEqual([]);
  });
});
