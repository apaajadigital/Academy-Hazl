import { test, expect, type Page } from "@playwright/test";

/**
 * One failing endpoint must cost exactly one widget.
 *
 * WHAT WENT WRONG
 * The console loaded all four of its endpoints through a single `Promise.all`
 * with no `.catch`. `Promise.all` rejects on the FIRST failure, so the `.then`
 * never ran and every widget kept its initial value — no KPI cards at all,
 * "Belum ada transaksi", "Belum ada kursus", a leads counter stuck on "—". The
 * `.finally` still cleared the spinner, so an admin was shown a complete,
 * confident dashboard reporting that the business had no orders, no courses and
 * no leads, with nothing on screen suggesting anything had gone wrong. The
 * rejection itself went unhandled.
 *
 * Separately, the KPI cards called `stats.totalUsers.toLocaleString()` on
 * whatever arrived. A success envelope missing one field threw
 * "Cannot read properties of undefined" into app/error.tsx and replaced the
 * entire console with a 500 page. Both are covered below.
 *
 * Unit coverage of the state machine lives in
 * test/unit/admin-dashboard-panels.test.ts; this file proves the page renders
 * those states, in a production build.
 */

// eslint-disable-next-line turbo/no-undeclared-env-vars
const PRODUCTION_BUILD = process.env.PLAYWRIGHT_PRODUCTION_BUILD === "1";
const NEEDS_PRODUCTION = "requires a production build: run with PLAYWRIGHT_PRODUCTION_BUILD=1";

function json(body: unknown, status = 200) {
  return { status, contentType: "application/json", body: JSON.stringify(body) };
}

const STATS = {
  totalUsers: 120,
  totalCourses: 8,
  totalEnrollments: 340,
  totalRevenue: 15000000,
  pendingCourses: 2,
  activeSubscriptions: 30,
  refundRate: 1.5,
  avgRating: 4.6,
  retailRevenue: 2000000,
};

const ORDERS = [
  {
    id: "o1",
    finalAmount: 250000,
    status: "paid",
    createdAt: "2026-08-01T00:00:00.000Z",
    user: { name: "Budi Pembeli", email: "budi@example.test" },
    items: [{ itemTitle: "Kursus Uji", itemType: "course" }],
  },
];

const COURSES = {
  courses: [
    { id: "c1", title: "Kursus Terpopuler Uji", totalEnrolled: 42, avgRating: "4.7", price: "199000" },
  ],
};

/** Marks unique to each panel's success state. */
const SHOWS = {
  stats: /120/,
  orders: /Budi Pembeli/,
  courses: /Kursus Terpopuler Uji/,
  leads: /Orang Terdeteksi/,
};

const ERROR_OF = {
  stats: /Gagal memuat statistik/i,
  orders: /Gagal memuat transaksi/i,
  courses: /Gagal memuat kursus terpopuler/i,
  leads: /Gagal memuat jumlah leads/i,
};

type Panel = "stats" | "orders" | "courses" | "leads";
const ENDPOINT: Record<Panel, string> = {
  stats: "**/api/admin/stats*",
  orders: "**/api/admin/orders*",
  courses: "**/api/admin/courses*",
  leads: "**/api/admin/leads*",
};

function fakeToken(): string {
  const payload = Buffer.from(
    JSON.stringify({ sub: "e2e-admin", exp: Math.floor(Date.now() / 1000) + 3600 }),
  ).toString("base64url");
  return `e2e.${payload}.signature`;
}

/** Sign in as an admin so the shell lets us through to the page under test. */
async function signInAsAdmin(page: Page) {
  await page.addInitScript((t) => {
    sessionStorage.setItem("access_token", t);
    localStorage.setItem("jg_access_token", t);
  }, fakeToken());

  await page.route("**/api/auth/me", (route) =>
    route.fulfill(
      json({
        success: true,
        data: {
          name: "Admin Uji",
          email: "admin@example.test",
          avatarUrl: null,
          roles: [{ role: "super_admin" }],
        },
      }),
    ),
  );
}

/** Serve a panel: `ok`, or a named failure mode. */
async function serve(
  page: Page,
  panel: Panel,
  mode: "ok" | "abort" | "500" | "malformed" | "empty",
  opts: { delayMs?: number } = {},
) {
  await page.route(ENDPOINT[panel], async (route) => {
    if (opts.delayMs) await new Promise((r) => setTimeout(r, opts.delayMs));
    if (mode === "abort") return route.abort();
    if (mode === "500") return route.fulfill(json({ success: false, error: { code: "ERR" } }, 500));
    if (mode === "malformed") {
      // A 200 success envelope missing required fields — the shape that used to
      // throw straight into the global error boundary.
      return route.fulfill(json({ success: true, data: { totalUsers: 1 }, meta: {} }));
    }
    if (mode === "empty") {
      const empty: Record<Panel, unknown> = {
        stats: { success: true, data: STATS },
        orders: { success: true, data: [] },
        courses: { success: true, data: { courses: [] } },
        leads: { success: true, data: null, meta: { total: 0 } },
      };
      return route.fulfill(json(empty[panel]));
    }
    const ok: Record<Panel, unknown> = {
      stats: { success: true, data: STATS },
      orders: { success: true, data: ORDERS },
      courses: { success: true, data: COURSES },
      leads: { success: true, data: null, meta: { total: 4 } },
    };
    return route.fulfill(json(ok[panel]));
  });
}

const ALL: Panel[] = ["stats", "orders", "courses", "leads"];

async function serveAll(page: Page, overrides: Partial<Record<Panel, "abort" | "500" | "malformed" | "empty">> = {}) {
  for (const p of ALL) await serve(page, p, overrides[p] ?? "ok");
}

test.describe("Admin dashboard survives partial API failure", () => {
  test.beforeEach(async ({ page }) => {
    test.skip(!PRODUCTION_BUILD, NEEDS_PRODUCTION);
    await page.route("**/api/**", (route) => route.abort());
    await signInAsAdmin(page);
  });

  test("all four endpoints succeed", async ({ page }) => {
    await serveAll(page);
    await page.goto("/admin/dashboard", { waitUntil: "domcontentloaded" });

    for (const p of ALL) {
      await expect(page.getByText(SHOWS[p]).first()).toBeVisible({ timeout: 20_000 });
    }
    // Assert on the panel error copy, not on role="alert": Next's App Router
    // injects its own aria-live route announcer with that role, so counting
    // roles would be measuring the framework, not the page.
    for (const p of ALL) {
      await expect(page.getByText(ERROR_OF[p])).toHaveCount(0);
    }
  });

  for (const failing of ALL) {
    test(`${failing} fails — the other three still render`, async ({ page }) => {
      await serveAll(page, { [failing]: "500" });
      await page.goto("/admin/dashboard", { waitUntil: "domcontentloaded" });

      await expect(page.getByText(ERROR_OF[failing]).first()).toBeVisible({ timeout: 20_000 });

      // The whole point: everything else is untouched.
      for (const other of ALL.filter((p) => p !== failing)) {
        await expect(
          page.getByText(SHOWS[other]).first(),
          `${other} was lost to a ${failing} failure`,
        ).toBeVisible({ timeout: 20_000 });
      }
    });
  }

  test("two endpoints fail — the surviving two still render", async ({ page }) => {
    await serveAll(page, { stats: "abort", leads: "500" });
    await page.goto("/admin/dashboard", { waitUntil: "domcontentloaded" });

    await expect(page.getByText(ERROR_OF.stats).first()).toBeVisible({ timeout: 20_000 });
    await expect(page.getByText(ERROR_OF.leads).first()).toBeVisible();
    await expect(page.getByText(SHOWS.orders).first()).toBeVisible({ timeout: 20_000 });
    await expect(page.getByText(SHOWS.courses).first()).toBeVisible();
  });

  test("all four fail — four honest errors, and no crash", async ({ page }) => {
    const pageErrors: string[] = [];
    page.on("pageerror", (e) => pageErrors.push(e.message));

    await serveAll(page, { stats: "abort", orders: "abort", courses: "abort", leads: "abort" });
    await page.goto("/admin/dashboard", { waitUntil: "domcontentloaded" });

    for (const p of ALL) {
      await expect(page.getByText(ERROR_OF[p]).first()).toBeVisible({ timeout: 20_000 });
    }
    // The console must still be a console, not the global 500 page.
    await expect(page.getByText("Terjadi Kesalahan", { exact: true })).toHaveCount(0);
    expect(pageErrors, `uncaught errors:\n${pageErrors.join("\n")}`).toEqual([]);
  });

  test("a malformed stats payload is an error, never a fabricated zero", async ({ page }) => {
    await serveAll(page, { stats: "malformed" });
    await page.goto("/admin/dashboard", { waitUntil: "domcontentloaded" });

    await expect(page.getByText(ERROR_OF.stats).first()).toBeVisible({ timeout: 20_000 });
    // No KPI card may invent a value out of a missing field.
    await expect(page.getByText("Rp 0", { exact: true })).toHaveCount(0);
    await expect(page.getByText("Total Pendapatan")).toHaveCount(0);
    // …and it must not take the page down, which is what it used to do.
    await expect(page.getByText("Terjadi Kesalahan", { exact: true })).toHaveCount(0);
    await expect(page.getByText(SHOWS.orders).first()).toBeVisible();
  });

  test("valid empty responses are empty states, not errors", async ({ page }) => {
    await serveAll(page, { orders: "empty", courses: "empty", leads: "empty" });
    await page.goto("/admin/dashboard", { waitUntil: "domcontentloaded" });

    await expect(page.getByText(/Belum ada transaksi/i).first()).toBeVisible({ timeout: 20_000 });
    await expect(page.getByText(/Belum ada kursus/i).first()).toBeVisible();
    await expect(page.getByText(/Tidak ada leads baru saat ini/i).first()).toBeVisible();
    // A real zero from the API is allowed to say zero.
    await expect(page.getByText(ERROR_OF.orders)).toHaveCount(0);
    await expect(page.getByText(ERROR_OF.leads)).toHaveCount(0);
  });

  test("a slow panel does not hold the fast ones back", async ({ page }) => {
    await serve(page, "stats", "ok", { delayMs: 2500 });
    await serve(page, "orders", "ok");
    await serve(page, "courses", "ok");
    await serve(page, "leads", "ok");

    await page.goto("/admin/dashboard", { waitUntil: "domcontentloaded" });

    // Orders arrive while stats is still in flight — impossible under the old
    // single Promise.all, which made every widget wait for the slowest.
    await expect(page.getByText(SHOWS.orders).first()).toBeVisible({ timeout: 20_000 });
    await expect(page.getByText(SHOWS.stats).first()).toHaveCount(0);
    await expect(page.getByText(SHOWS.stats).first()).toBeVisible({ timeout: 20_000 });
  });

  test("retrying one widget recovers it and leaves the others alone", async ({ page }) => {
    let statsAttempts = 0;
    await page.route(ENDPOINT.stats, (route) => {
      statsAttempts++;
      return statsAttempts === 1
        ? route.fulfill(json({ success: false }, 503))
        : route.fulfill(json({ success: true, data: STATS }));
    });
    await serve(page, "orders", "ok");
    await serve(page, "courses", "ok");
    await serve(page, "leads", "ok");

    await page.goto("/admin/dashboard", { waitUntil: "domcontentloaded" });
    await expect(page.getByText(ERROR_OF.stats).first()).toBeVisible({ timeout: 20_000 });
    await expect(page.getByText(SHOWS.orders).first()).toBeVisible();

    await page.getByRole("button", { name: /Coba Lagi/i }).first().click();

    await expect(page.getByText(SHOWS.stats).first()).toBeVisible({ timeout: 20_000 });
    await expect(page.getByText(ERROR_OF.stats)).toHaveCount(0);
    // The retry really re-requested, and the healthy panel never reloaded away.
    expect(statsAttempts).toBeGreaterThan(1);
    await expect(page.getByText(SHOWS.orders).first()).toBeVisible();
  });

  test("no unhandled rejection when every endpoint is dead", async ({ page }) => {
    const rejections: string[] = [];
    page.on("pageerror", (e) => rejections.push(e.message));
    await page.addInitScript(() => {
      window.addEventListener("unhandledrejection", (e) => {
        // Surface it where the console listener can see it.
        console.error("UNHANDLED_REJECTION: " + String((e as PromiseRejectionEvent).reason));
      });
    });
    const consoleErrors: string[] = [];
    page.on("console", (m) => {
      if (m.type() === "error") consoleErrors.push(m.text());
    });

    await serveAll(page, { stats: "abort", orders: "abort", courses: "abort", leads: "abort" });
    await page.goto("/admin/dashboard", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(3000);

    expect(rejections, rejections.join("\n")).toEqual([]);
    const unhandled = consoleErrors.filter((t) => t.includes("UNHANDLED_REJECTION"));
    expect(unhandled, unhandled.join("\n")).toEqual([]);
  });
});
