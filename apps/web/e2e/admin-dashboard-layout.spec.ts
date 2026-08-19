import { test, expect, type Page } from "@playwright/test";
import {
  serveAll,
  serve,
  signInAsAdmin,
  horizontalOverflow,
} from "./fixtures/admin-dashboard";

/**
 * Layout contracts for the admin dashboard.
 *
 * The partial-failure spec proves the console tells the truth about its data.
 * This one proves it stays legible while doing so — the half that no unit test
 * can reach, and the half that had actually regressed: a badge positioned
 * `absolute` over reflowing content, four metrics compressed into one card,
 * and a 2:1 split that engaged at a width where neither column had room.
 *
 * Every assertion here is a measurement, not a screenshot, so it explains
 * itself when it fails and does not need re-recording when a colour changes.
 */

// eslint-disable-next-line turbo/no-undeclared-env-vars
const PRODUCTION_BUILD = process.env.PLAYWRIGHT_PRODUCTION_BUILD === "1";
const NEEDS_PRODUCTION = "requires a production build: run with PLAYWRIGHT_PRODUCTION_BUILD=1";

/** The widths the console is expected to survive. */
const VIEWPORTS = [
  { name: "mobile", width: 390, height: 844 },
  { name: "tablet", width: 768, height: 1024 },
  { name: "laptop", width: 1024, height: 768 },
  { name: "desktop", width: 1280, height: 800 },
  { name: "wide", width: 1440, height: 900 },
  { name: "ultrawide", width: 1920, height: 1080 },
] as const;

async function openDashboard(page: Page) {
  await page.goto("/admin/dashboard", { waitUntil: "domcontentloaded" });
  // The shell gates on /api/auth/me; wait for the page's own H1 rather than a
  // timeout, so a slow runner does not measure a half-rendered layout.
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible({ timeout: 20_000 });
}

/** Bounding boxes overlap when they intersect on BOTH axes. */
function overlaps(a: { x: number; y: number; width: number; height: number }, b: typeof a) {
  return (
    a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height
  );
}

test.describe("Admin dashboard — layout contracts", () => {
  test.beforeEach(async ({ page }) => {
    test.skip(!PRODUCTION_BUILD, NEEDS_PRODUCTION);
    await page.route("**/api/**", (route) => route.abort());
    await signInAsAdmin(page);
  });

  for (const vp of VIEWPORTS) {
    test(`${vp.name} (${vp.width}px): no horizontal overflow, nothing clipped`, async ({ page }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await serveAll(page);
      await openDashboard(page);
      await expect(page.getByText(/Kursus Terpopuler/).first()).toBeVisible({ timeout: 20_000 });

      // 1. The page itself must not scroll sideways.
      const { scrollWidth, innerWidth } = await horizontalOverflow(page);
      expect(
        scrollWidth,
        `horizontal overflow at ${vp.width}px: ${scrollWidth} > ${innerWidth}`,
      ).toBeLessThanOrEqual(innerWidth + 1);

      // 2. No KPI value may be cut off by its own card.
      const clipped = await page.evaluate(() => {
        const out: string[] = [];
        document.querySelectorAll("p.tabular-nums").forEach((el) => {
          const e = el as HTMLElement;
          // 1px of tolerance for sub-pixel text metrics.
          if (e.scrollWidth > e.clientWidth + 1) out.push(`${e.textContent?.trim()}`);
        });
        return out;
      });
      expect(clipped, `clipped numeric values: ${clipped.join(" | ")}`).toEqual([]);
    });
  }

  test("leads banner never overlaps its own contents", async ({ page }) => {
    await serveAll(page);
    // Sweep the range where the old absolute badge collided with the CTAs.
    for (const width of [390, 600, 700, 768, 820, 900, 1024, 1280, 1920]) {
      await page.setViewportSize({ width, height: 900 });
      if (width === 390) await openDashboard(page);
      await expect(page.getByRole("heading", { name: "Leads Baru" })).toBeVisible({ timeout: 20_000 });

      const badge = await page.getByText("Real-time", { exact: true }).boundingBox();
      const cta = await page.getByRole("link", { name: /Tindak Lanjuti/ }).boundingBox();
      const heading = await page.getByRole("heading", { name: "Leads Baru" }).boundingBox();

      expect(badge, `badge missing at ${width}px`).not.toBeNull();
      expect(heading, `heading missing at ${width}px`).not.toBeNull();
      if (badge && cta) {
        expect(overlaps(badge, cta), `badge overlaps CTA at ${width}px`).toBe(false);
      }
      if (badge && heading) {
        expect(overlaps(badge, heading), `badge overlaps heading at ${width}px`).toBe(false);
      }
    }
  });

  test("transactions: list on mobile, semantic table on desktop", async ({ page }) => {
    await serveAll(page);

    await page.setViewportSize({ width: 390, height: 844 });
    await openDashboard(page);
    await expect(page.getByText("Budi Pembeli").filter({ visible: true })).toBeVisible({ timeout: 20_000 });
    // A table forced into 390px would scroll inside its card; the list does not.
    await expect(page.getByRole("table")).toBeHidden();

    await page.setViewportSize({ width: 1280, height: 800 });
    const table = page.getByRole("table");
    await expect(table).toBeVisible();
    // Semantics survive the redesign: real column headers, not styled divs.
    for (const h of ["Pembeli", "Kursus", "Status", "Total"]) {
      await expect(table.getByRole("columnheader", { name: h })).toBeVisible();
    }
  });

  test("extreme values do not break the grid", async ({ page }) => {
    await serveAll(page, {
      stats: "extreme",
      orders: "extreme",
      courses: "extreme",
      leads: "extreme",
    });

    for (const vp of VIEWPORTS) {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      if (vp.width === 390) await openDashboard(page);
      await expect(page.getByText(/Kursus Terpopuler/).first()).toBeVisible({ timeout: 20_000 });

      const { scrollWidth, innerWidth } = await horizontalOverflow(page);
      expect(
        scrollWidth,
        `long names/big numbers caused overflow at ${vp.width}px: ${scrollWidth} > ${innerWidth}`,
      ).toBeLessThanOrEqual(innerWidth + 1);
    }
  });

  test("truncated text keeps its full value reachable", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await serveAll(page, { orders: "extreme", courses: "extreme" });
    await openDashboard(page);
    await expect(page.getByRole("table")).toBeVisible({ timeout: 20_000 });

    // Every clipped label carries the whole string in `title`, so hovering or
    // an assistive tool can still read it. The old cell clipped at 220px with
    // no way to recover the rest.
    const missing = await page.evaluate(() => {
      const out: string[] = [];
      document.querySelectorAll("p.truncate").forEach((el) => {
        const e = el as HTMLElement;
        if (e.scrollWidth > e.clientWidth + 1 && !e.getAttribute("title")) {
          out.push(e.textContent?.slice(0, 40) ?? "?");
        }
      });
      return out;
    });
    expect(missing, `truncated without title: ${missing.join(" | ")}`).toEqual([]);
  });

  test("heading hierarchy is valid and unique at the top", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await serveAll(page);
    await openDashboard(page);
    await expect(page.getByText(/Kursus Terpopuler/).first()).toBeVisible({ timeout: 20_000 });

    const levels = await page.evaluate(() =>
      [...document.querySelectorAll("h1,h2,h3,h4,h5,h6")]
        .filter((h) => (h as HTMLElement).offsetParent !== null || h.classList.contains("sr-only"))
        .map((h) => Number(h.tagName[1])),
    );

    expect(levels.filter((l) => l === 1)).toHaveLength(1);
    expect(levels[0], "first heading must be the h1").toBe(1);
    // No level may be skipped on the way down (h1 → h3 without an h2).
    for (let i = 1; i < levels.length; i++) {
      expect(
        levels[i]! - levels[i - 1]!,
        `heading jumped from h${levels[i - 1]} to h${levels[i]}`,
      ).toBeLessThanOrEqual(1);
    }
  });

  test("interactive targets are reachable and large enough", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await serveAll(page);
    await openDashboard(page);
    await expect(page.getByRole("link", { name: /Tindak Lanjuti/ })).toBeVisible({ timeout: 20_000 });

    // The leads CTAs are the primary actions on this page and sit on a coloured
    // surface where a thin target is easiest to miss.
    for (const name of [/Tindak Lanjuti/, /Kelola Leads/]) {
      const box = await page.getByRole("link", { name }).boundingBox();
      expect(box, `${name} has no box`).not.toBeNull();
      expect(box!.height, `${name} is ${box!.height}px tall`).toBeGreaterThanOrEqual(44);
    }

    // Focus must be visible, not merely present.
    const cta = page.getByRole("link", { name: /Tindak Lanjuti/ });
    await cta.focus();
    const ring = await cta.evaluate((el) => {
      const s = getComputedStyle(el);
      return { outline: s.outlineStyle, width: s.outlineWidth, shadow: s.boxShadow };
    });
    const hasRing =
      (ring.outline !== "none" && ring.width !== "0px") || (ring.shadow ?? "none") !== "none";
    expect(hasRing, `no visible focus indicator: ${JSON.stringify(ring)}`).toBe(true);
  });

  test("loading shows skeletons in the final shape, not a collapsing spinner", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    // Hold everything long enough to measure the loading layout.
    await serveAll(page, {});
    for (const p of ["stats", "orders", "courses", "leads"] as const) {
      await page.unroute("**/api/admin/" + (p === "stats" ? "stats" : p) + "*").catch(() => {});
    }
    await serve(page, "stats", "ok", { delayMs: 2500 });
    await serve(page, "orders", "ok", { delayMs: 2500 });
    await serve(page, "courses", "ok", { delayMs: 2500 });
    await serve(page, "leads", "ok", { delayMs: 2500 });

    await page.goto("/admin/dashboard", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible({ timeout: 20_000 });

    // Skeletons are present while loading…
    await expect(page.locator(".skeleton").first()).toBeVisible({ timeout: 10_000 });
    const loadingHeight = await page.evaluate(() => document.body.scrollHeight);

    await expect(page.getByText("Budi Pembeli").filter({ visible: true })).toBeVisible({ timeout: 20_000 });
    const readyHeight = await page.evaluate(() => document.body.scrollHeight);

    // …and the page does not lurch when data replaces them. The old centred
    // `min-h-[40vh]` spinner moved everything below it by roughly half a
    // viewport. A generous bound still catches that class of jump.
    expect(
      Math.abs(readyHeight - loadingHeight),
      `layout shifted ${Math.abs(readyHeight - loadingHeight)}px between loading and ready`,
    ).toBeLessThan(360);
  });

  test("valid zero renders as zero, and never as an error", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await serveAll(page, { orders: "empty", courses: "empty", leads: "empty" });
    await openDashboard(page);

    await expect(page.getByText(/Belum ada transaksi/).first()).toBeVisible({ timeout: 20_000 });
    await expect(page.getByText(/Belum ada kursus/).first()).toBeVisible();
    await expect(page.getByText(/Tidak ada leads baru saat ini/).first()).toBeVisible();
    // Zero leads is a real answer and must be printed, not replaced by "—".
    await expect(page.getByText("0", { exact: true }).first()).toBeVisible();
    for (const re of [/Gagal memuat transaksi/i, /Gagal memuat kursus/i, /Gagal memuat jumlah leads/i]) {
      await expect(page.getByText(re)).toHaveCount(0);
    }
  });

  test("a failed panel keeps its place in the grid", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await serveAll(page, { courses: "500" });
    await openDashboard(page);
    await expect(page.getByText(/Gagal memuat kursus terpopuler/i)).toBeVisible({ timeout: 20_000 });

    // The surviving panel must not stretch across the whole row just because
    // its neighbour failed — the two-column shape is the layout, not a
    // consequence of both succeeding.
    const orders = await page.getByRole("table").boundingBox();
    const { innerWidth } = await horizontalOverflow(page);
    expect(orders, "orders table missing").not.toBeNull();
    expect(
      orders!.width,
      `orders panel took ${orders!.width}px of ${innerWidth}px after a neighbour failed`,
    ).toBeLessThan(innerWidth * 0.85);

    const { scrollWidth } = await horizontalOverflow(page);
    expect(scrollWidth).toBeLessThanOrEqual(innerWidth + 1);
  });
});
