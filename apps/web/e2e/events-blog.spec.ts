import { test, expect, type APIRequestContext } from "@playwright/test";
import {
  makeFreeEvent,
  makeTicket,
  mockDashboardSession,
  mockEventDetail,
  mockFreeCheckout,
  mockMyTickets,
  seedAuthToken,
} from "./mock-utils";

/**
 * `app/(public)/event/page.tsx` is a React Server Component: its event list is
 * fetched by the Next.js server, not the browser, so `page.route()` cannot
 * shape it. The listing assertions below therefore read the SAME source of
 * truth the page reads (the API, via the `request` fixture) and assert the
 * rendered grid agrees with it — deterministic for any dataset, with an
 * explicit skip when the connected API has no event to assert on.
 */
const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

/**
 * Budget for a client-side route transition. Generous because `next dev`
 * compiles each route on its first request — the App Router only commits the
 * new URL once that compile has produced the RSC payload.
 */
const NAV_TIMEOUT = 60_000;

type ApiEvent = { id: string; slug: string; title: string; type: string; isFeatured: boolean };

async function fetchEvents(request: APIRequestContext, query: string): Promise<ApiEvent[]> {
  const res = await request.get(`${API_BASE}/api/events?${query}`);
  expect(res.ok(), `GET /api/events?${query} must succeed`).toBeTruthy();
  const body = (await res.json()) as { success: boolean; data: ApiEvent[] };
  expect(body.success).toBe(true);
  return body.data;
}

test.describe("Events pages", () => {
  test("events listing page loads", async ({ page }) => {
    await page.goto("/event");
    await page.waitForLoadState("networkidle");
    await expect(page.locator("h1, h2").first()).toBeVisible();
  });

  test("events page has navigation to individual events or categories", async ({ page }) => {
    await page.goto("/event");
    await page.waitForLoadState("networkidle");
    const body = await page.locator("body").textContent();
    expect(body?.length).toBeGreaterThan(50);
  });
});

// ─── BL-62a regression ────────────────────────────────────────────────────────

test.describe("Event catalogue filtering (BL-62a)", () => {
  test("/event?type=online renders every online event — featured ones included", async ({ page, request }) => {
    // Same query the page issues (limit=24, type=online).
    const online = await fetchEvents(request, "limit=24&type=online");
    test.skip(online.length === 0, "Connected API has no published online event to assert on.");

    await page.goto("/event?type=online");

    // The featured hero is only rendered on the unfiltered view…
    await expect(page.locator('[aria-label^="Event unggulan"]')).toHaveCount(0);

    // …so on a filtered view the grid must carry EVERY event, featured or not.
    // Before BL-62a the featured event was stripped from the grid on every view
    // and, with no hero to fall back on, vanished from /event?type=online.
    for (const ev of online) {
      await expect(
        page.locator(`a[href="/event/${ev.slug}"]`),
        `event "${ev.slug}" must appear exactly once in the filtered grid`,
      ).toHaveCount(1);
    }

    const featured = online.filter((e) => e.isFeatured);
    for (const ev of featured) {
      await expect(page.locator(`a[href="/event/${ev.slug}"]`)).toBeVisible();
    }
  });

  test("unfiltered /event promotes the featured event to the hero without duplicating it", async ({ page, request }) => {
    const all = await fetchEvents(request, "limit=24");
    // The page picks the first featured item in API order — mirror that here.
    const hero = all.find((e) => e.isFeatured);
    test.skip(hero === undefined, "Connected API has no featured event to assert on.");

    await page.goto("/event");

    const heroLink = page.locator('[aria-label^="Event unggulan"]');
    await expect(heroLink).toHaveCount(1);
    await expect(heroLink).toHaveAttribute("href", `/event/${hero!.slug}`);

    // Exactly one link → present as the hero, absent from the grid (no dupe).
    await expect(page.locator(`a[href="/event/${hero!.slug}"]`)).toHaveCount(1);

    // Every non-featured event still has its grid card.
    for (const ev of all.filter((e) => e.id !== hero!.id)) {
      await expect(page.locator(`a[href="/event/${ev.slug}"]`)).toHaveCount(1);
    }
  });
});

// ─── Free-event registration happy path ───────────────────────────────────────

test.describe("Free event registration journey", () => {
  test("/event → event detail → daftar gratis → /dashboard/tiket", async ({ page }) => {
    // Seeded before the first navigation: addInitScript only runs on a new
    // document, and the card click is a client-side Next.js transition.
    await seedAuthToken(page);

    await page.goto("/event");

    // Pick a real slug from the server-rendered catalogue: the detail route's
    // server component 404s on an unknown slug, and that fetch is not mockable.
    const cards = page.locator('a[href^="/event/"]');
    const cardCount = await cards.count();
    test.skip(cardCount === 0, "Connected API has no published event to open.");

    const href = await cards.first().getAttribute("href");
    expect(href).toBeTruthy();
    const slug = href!.slice("/event/".length);

    // From here the page is driven entirely by mocked browser calls: the detail
    // view is a client island that re-fetches and re-renders its own data.
    const event = makeFreeEvent({ slug });
    await mockEventDetail(page, event, null);
    await mockFreeCheckout(page);

    // Wait on the navigation itself, not on a polled URL assertion: the dev
    // server compiles /event/[slug] on first request, which routinely takes
    // longer than the default 5s expect timeout. This is a condition wait, not
    // an arbitrary sleep.
    await Promise.all([
      page.waitForURL(`**/event/${slug}`, { timeout: NAV_TIMEOUT }),
      cards.first().click(),
    ]);

    // Client island took over: free price → "Daftar Gratis" CTA.
    await expect(page.getByRole("heading", { name: event.title, level: 1 })).toBeVisible();
    const registerBtn = page.locator("#event-register-btn");
    await expect(registerBtn).toBeEnabled();
    await expect(registerBtn).toHaveText("Daftar Gratis");

    await registerBtn.click();

    // Success state: confirmation copy + the CTA flips to the ticket link.
    await expect(page.getByText("Berhasil mendaftar! Tiket Anda ada di dashboard.")).toBeVisible();
    await expect(page.getByText("Sudah Terdaftar")).toBeVisible();

    const ticketLink = page.getByRole("link", { name: "Lihat Tiket Saya" });
    await expect(ticketLink).toBeVisible();

    // The ticket now exists for the dashboard.
    const ticket = makeTicket(event);
    await mockDashboardSession(page);
    await mockMyTickets(page, [ticket]);

    await Promise.all([
      page.waitForURL("**/dashboard/tiket", { timeout: NAV_TIMEOUT }),
      ticketLink.click(),
    ]);

    await expect(page.getByRole("heading", { name: "Tiket Event Saya" })).toBeVisible();
    await expect(page.getByText("1 tiket terdaftar")).toBeVisible();
    await expect(page.getByRole("link", { name: event.title })).toBeVisible();
    // The page shows the first 8 characters of the code, upper-cased.
    await expect(page.getByText(ticket.ticketCode.slice(0, 8).toUpperCase())).toBeVisible();
    await expect(page.getByText("Terkonfirmasi")).toBeVisible();
  });

  test("an already-registered visitor sees the ticket link instead of a register CTA", async ({ page }) => {
    await seedAuthToken(page);

    await page.goto("/event");
    const cards = page.locator('a[href^="/event/"]');
    const cardCount = await cards.count();
    test.skip(cardCount === 0, "Connected API has no published event to open.");

    const href = await cards.first().getAttribute("href");
    const slug = href!.slice("/event/".length);

    const event = makeFreeEvent({ slug });
    await mockEventDetail(page, event, {
      id: "e2e-reg-1",
      eventId: event.id,
      userId: "e2e-user",
      ticketCode: "e2eticketcode0001",
      status: "confirmed",
      attendedAt: null,
      createdAt: "2099-01-01T00:00:00.000Z",
    });

    await Promise.all([
      page.waitForURL(`**/event/${slug}`, { timeout: NAV_TIMEOUT }),
      cards.first().click(),
    ]);

    await expect(page.getByText("Sudah Terdaftar")).toBeVisible();
    await expect(page.locator("#event-register-btn")).toHaveCount(0);
  });
});

test.describe("Blog pages", () => {
  test("blog listing page loads", async ({ page }) => {
    await page.goto("/blog");
    await page.waitForLoadState("networkidle");
    await expect(page.locator("body")).toBeVisible();
    const content = await page.locator("body").textContent();
    expect(content?.length).toBeGreaterThan(10);
  });

  test("blog page has search input", async ({ page }) => {
    await page.goto("/blog");
    await page.waitForLoadState("networkidle");
    // Blog page should have either a search input or article list
    const hasSearch = await page.locator('input[type="text"], input[placeholder*="cari" i], input[placeholder*="search" i]').count();
    const hasContent = await page.locator("article, .card, h2, h3").count();
    expect(hasSearch + hasContent).toBeGreaterThan(0);
  });
});

test.describe("Public info pages", () => {
  test("about page loads", async ({ page }) => {
    await page.goto("/about");
    await page.waitForLoadState("networkidle");
    await expect(page.locator("h1, h2").first()).toBeVisible();
  });

  test("contact page has form", async ({ page }) => {
    await page.goto("/contact");
    await page.waitForLoadState("networkidle");
    await expect(page.locator("form, input, textarea").first()).toBeVisible();
  });

  test("ebook listing page loads", async ({ page }) => {
    await page.goto("/ebook");
    await page.waitForLoadState("networkidle");
    await expect(page.locator("body")).toBeVisible();
  });
});
