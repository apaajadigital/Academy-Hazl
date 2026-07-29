/**
 * Shared helpers for the beta-feature E2E specs.
 *
 * These tests run with NO backend: every /api/* call the pages make is
 * intercepted per-test with page.route() and fulfilled with the standard
 * response envelope { success, data, error?, meta? } (packages/types).
 * The web pages call the API both via the absolute NEXT_PUBLIC_API_URL
 * origin (http://localhost:4000/api/…) and via same-origin relative paths
 * (/api/…, proxied by the Next rewrite) — the "**\/api\/…" glob patterns
 * used in the specs match both forms.
 *
 * Not a spec file: the default testMatch (*.spec.ts) ignores it.
 */
import type { Page } from "@playwright/test";

/** Build a Playwright fulfill() payload carrying a JSON success envelope. */
export function okEnvelope(data: unknown, meta?: Record<string, unknown>, status = 200) {
  return {
    status,
    contentType: "application/json",
    body: JSON.stringify({ success: true, data, ...(meta ? { meta } : {}) }),
  };
}

/** Build a Playwright fulfill() payload carrying a JSON error envelope. */
export function errorEnvelope(status: number, code: string, message: string) {
  return {
    status,
    contentType: "application/json",
    body: JSON.stringify({ success: false, error: { code, message } }),
  };
}

export type ConsoleErrorCollector = { errors: string[] };

/**
 * Collect page console messages of type "error" so each test can assert zero
 * console errors at the end. `allow` patterns (matched against both message
 * text and the reporting URL) exist only for errors a test intentionally
 * provokes — e.g. the browser's "Failed to load resource … 404" log when a
 * test mocks an API 404 on purpose. Prefer an empty allowlist.
 */
export function collectConsoleErrors(page: Page, allow: RegExp[] = []): ConsoleErrorCollector {
  const collector: ConsoleErrorCollector = { errors: [] };
  page.on("console", (msg) => {
    if (msg.type() !== "error") return;
    const text = msg.text();
    const url = msg.location().url ?? "";
    if (allow.some((re) => re.test(text) || re.test(url))) return;
    collector.errors.push(text || url);
  });
  return collector;
}

/**
 * Dummy JWT for pages that read the access token from web storage before
 * calling the (mocked) API. Payload is base64url of {"sub":"e2e-user"} with
 * NO exp claim, so lib/auth/token.ts#isTokenExpired treats it as non-expiring
 * and getValidToken() returns it without hitting /api/auth/refresh.
 * Never verified server-side — every API response is mocked.
 */
export const E2E_DUMMY_JWT = "eyJhbGciOiJub25lIiwidHlwIjoiSldUIn0.eyJzdWIiOiJlMmUtdXNlciJ9.e2e-signature";

/** Seed the dummy token into the storages lib/auth/token.ts reads. */
export async function seedAuthToken(page: Page): Promise<void> {
  await page.addInitScript((token) => {
    window.sessionStorage.setItem("access_token", token);
    window.localStorage.setItem("jg_access_token", token);
  }, E2E_DUMMY_JWT);
}

// ─── Event fixtures & mocks (E13/BL-65) ───────────────────────────────────────

/**
 * IMPORTANT scope note for every helper below.
 *
 * `page.route()` only sees requests made by the BROWSER. The event *listing*
 * (`app/(public)/event/page.tsx`) and the event detail *shell*
 * (`app/(public)/event/[slug]/page.tsx`) are React Server Components: their
 * `fetch()` runs inside the Next.js server process and can NOT be intercepted
 * here. Only the client island (`EventDetailClient`), the checkout POST and the
 * dashboard pages fetch from the browser — those are what these mocks cover.
 */

/** Shape returned by `GET /api/events/:slug` (mirrors EventDetailClient's type). */
export type E2EEvent = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  type: string;
  status: string;
  startDate: string;
  endDate: string | null;
  location: string | null;
  venue: string | null;
  price: string;
  salePrice: string | null;
  quota: number | null;
  totalSold: number;
  coverUrl: string | null;
  speakerName: string | null;
  speakerBio: string | null;
  isFeatured: boolean;
};

/** Shape returned by `GET /api/events/:slug/registration` and `/my/tickets`. */
export type E2ERegistration = {
  id: string;
  eventId: string;
  userId: string;
  ticketCode: string;
  status: string;
  attendedAt: string | null;
  createdAt: string;
};

export type E2ETicket = E2ERegistration & {
  event: Pick<E2EEvent, "id" | "slug" | "title" | "type" | "startDate" | "location" | "venue" | "coverUrl">;
};

/**
 * A far-future start date. Pinned (not `Date.now() + n`) so the countdown, the
 * "Sedang Berlangsung" badge and the formatted date are byte-identical on every
 * run — no wall-clock dependency, no flakiness (SSOT §9.8).
 */
export const E2E_EVENT_START = "2099-03-14T02:00:00.000Z";

/** A published, free, online event — the happy path for registration. */
export function makeFreeEvent(overrides: Partial<E2EEvent> = {}): E2EEvent {
  return {
    id: "e2e-event-1",
    slug: "e2e-webinar-gratis",
    title: "Webinar Gratis E2E",
    description: "Sesi pengenalan gratis untuk pengujian end-to-end.",
    type: "online",
    status: "published",
    startDate: E2E_EVENT_START,
    endDate: null,
    location: null,
    venue: null,
    price: "0",
    salePrice: null,
    quota: 100,
    totalSold: 10,
    coverUrl: null,
    speakerName: "Narasumber E2E",
    speakerBio: null,
    isFeatured: false,
    ...overrides,
  };
}

/** Build the ticket row `/dashboard/tiket` renders for a given event. */
export function makeTicket(event: E2EEvent, overrides: Partial<E2ETicket> = {}): E2ETicket {
  return {
    id: "e2e-reg-1",
    eventId: event.id,
    userId: "e2e-user",
    ticketCode: "e2eticketcode0001",
    status: "confirmed",
    attendedAt: null,
    createdAt: "2099-01-01T00:00:00.000Z",
    event: {
      id: event.id,
      slug: event.slug,
      title: event.title,
      type: event.type,
      startDate: event.startDate,
      location: event.location,
      venue: event.venue,
      coverUrl: event.coverUrl,
    },
    ...overrides,
  };
}

/**
 * Mock the two browser calls `EventDetailClient` makes for `event`.
 *
 * The glob patterns are deliberately disjoint (`*` never crosses `/`), so route
 * resolution does not depend on Playwright's registration order.
 */
export async function mockEventDetail(
  page: Page,
  event: E2EEvent,
  registration: E2ERegistration | null = null,
): Promise<void> {
  await page.route(`**/api/events/${event.slug}/registration`, (route) =>
    route.fulfill(okEnvelope(registration)),
  );
  await page.route(`**/api/events/${event.slug}`, (route) => route.fulfill(okEnvelope(event)));
}

/**
 * Mock `POST /api/checkout`. `free: true` is the branch EventDetailClient reads
 * to confirm a zero-price registration without redirecting to the payment page.
 */
export async function mockFreeCheckout(page: Page): Promise<void> {
  await page.route("**/api/checkout", (route) =>
    route.fulfill(okEnvelope({ free: true, orderId: "e2e-order-1" })),
  );
}

/** Mock `GET /api/events/my/tickets` used by `/dashboard/tiket`. */
export async function mockMyTickets(page: Page, tickets: E2ETicket[]): Promise<void> {
  await page.route("**/api/events/my/tickets", (route) => route.fulfill(okEnvelope(tickets)));
}

/**
 * Mock the two calls `app/dashboard/layout.tsx` makes before it renders any
 * child page. Without these the layout clears the token and bounces to /masuk.
 * The role must stay non-admin/non-trainer or the layout redirects away.
 */
export async function mockDashboardSession(page: Page): Promise<void> {
  await page.route("**/api/auth/me", (route) =>
    route.fulfill(
      okEnvelope({
        id: "e2e-user",
        name: "Peserta E2E",
        email: "peserta@e2e.test",
        avatarUrl: null,
        roles: [{ role: "student" }],
        subscription: null,
      }),
    ),
  );
  await page.route("**/api/lms/portal/me", (route) => route.fulfill(okEnvelope([])));
}
