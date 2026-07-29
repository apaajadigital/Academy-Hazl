/**
 * @file lib/api/events.ts
 * @description The single caller of every Event / EventRegistration endpoint the
 *   web app uses, and — until BL-13 lands — the single source of Event DTO types
 *   on the web side.
 *
 * WHY THIS FILE EXISTS (E12 / BL-64)
 * The Event shape used to be redeclared in five places (`packages/types`, the
 * public list page, the public detail client, the admin list, the ticket
 * dashboard), and every screen hand-rolled its own `fetch()`. Worse, they did
 * not agree on the base URL: some hit `NEXT_PUBLIC_API_URL` straight from the
 * browser (which needs CORS and bypasses the proxy) while others used the
 * relative `/api/*` Next.js rewrite. Both concerns are centralised here.
 *
 * WHY THE TYPES LIVE HERE AND NOT IN `@repo/types`
 * `@repo/types` is NOT wired as a dependency of `apps/web` — it appears in no
 * `dependencies` block and in no `tsconfig` path, and it currently has zero
 * importers in the entire repo. `docs/BACKLOG.md` BL-13 records that the
 * workspace-build wiring was deliberately DEFERRED, so forcing it here would be
 * an out-of-scope build change. `packages/types` has nonetheless been corrected
 * in the same change to match `apps/api/prisma/schema.prisma`, so the DTOs below
 * are shape-identical to it: once BL-13 wires the package up, these types can be
 * replaced with imports from `@repo/types` without touching a single consumer.
 *
 * Serialisation notes: Prisma `Decimal` reaches the client as a decimal STRING
 * (`price`, `salePrice`) and `DateTime` as an ISO-8601 string. Nullable columns
 * arrive as explicit `null`, so they are typed `| null`, not optional.
 */

import { getApiBase } from "./base";
import { getValidToken } from "@/lib/auth/token";
import type { ApiError } from "@/lib/auth/types";

// ─── Result envelope ──────────────────────────────────────────────────────────

/** Pagination block the API returns in `meta` — never inside `data` (BL-60a). */
export type EventListMeta = { total: number; page: number; limit: number };

export type EventApiFailure = {
  success: false;
  /**
   * HTTP status of the failed response, or `0` when the request never completed
   * (offline / DNS / timeout). Callers key their "session expired → /masuk"
   * redirect off `status === 401`; see `isUnauthorized`.
   */
  status: number;
  error: ApiError;
};

export type EventApiResult<T> = { success: true; data: T } | EventApiFailure;

/** True when the call failed because the caller has no usable session. */
export function isUnauthorized(result: EventApiResult<unknown>): result is EventApiFailure {
  return !result.success && result.status === 401;
}

// ─── DTOs ─────────────────────────────────────────────────────────────────────

/**
 * `type` and `status` are intentionally `string`, not the narrow unions exported
 * by `@/lib/event-labels`: the columns are plain Prisma `String`s and rows
 * carrying legacy lifecycle values (`ongoing`, `ended`) already exist in the
 * database. `getEventTypeLabel` / `getEventStatusLabel` are the safe accessors
 * that render any such value — never re-declare label maps at the call site.
 */

/**
 * Public catalog projection — mirrors `PUBLIC_LIST_SELECT` in
 * `apps/api/src/services/event/eventService.ts`. It is a strict subset of
 * `EventRecord`; notably it carries no `description`, `status` or `speakerBio`.
 */
export type EventSummary = {
  id: string;
  slug: string;
  title: string;
  type: string;
  startDate: string;
  endDate: string | null;
  location: string | null;
  venue: string | null;
  price: string;
  salePrice: string | null;
  /** Seat cap; `null` means unlimited (guard before dividing — BL-60b). */
  quota: number | null;
  totalSold: number;
  coverUrl: string | null;
  speakerName: string | null;
  isFeatured: boolean;
};

/**
 * A full `model Event` row, as returned by the public detail endpoint and by the
 * admin list (both read the model without a `select`).
 *
 * Named `EventRecord` rather than `Event` on purpose: `Event` is a DOM global,
 * and shadowing it inside client components is a readability trap.
 */
export type EventRecord = EventSummary & {
  description: string | null;
  status: string;
  speakerBio: string | null;
  createdAt: string;
  updatedAt: string;
};

/** `model EventRegistration` row, without relations. */
export type EventRegistrationRecord = {
  id: string;
  eventId: string;
  userId: string;
  /** `null` for free events, which are fulfilled without an Order. */
  orderId: string | null;
  ticketCode: string;
  status: string;
  attendedAt: string | null;
  createdAt: string;
};

/** Event projection embedded in a ticket — mirrors `TICKET_EVENT_SELECT`. */
export type EventTicketEvent = {
  id: string;
  slug: string;
  title: string;
  type: string;
  startDate: string;
  endDate: string | null;
  location: string | null;
  venue: string | null;
  coverUrl: string | null;
};

/** A registration as listed by `GET /api/events/my/tickets` (event included). */
export type EventTicket = EventRegistrationRecord & { event: EventTicketEvent };

/** `meta` folded into `data` so consumers never have to reach for the envelope. */
export type EventListPage = EventListMeta & { events: EventSummary[] };

export type AdminEventListPage = EventListMeta & { events: EventRecord[] };

/** Payload of `POST /api/checkout` for `itemType: "event"`. */
export type EventCheckoutResult = {
  orderId: string | null;
  paymentUrl: string | null;
  finalAmount: number;
  /** `true` when the seat was granted immediately with no payment step. */
  free?: boolean;
};

// ─── Transport ────────────────────────────────────────────────────────────────

/** Backend envelope contract (`apps/api/src/types/index.ts`). */
type Envelope<T> = {
  success?: boolean;
  data?: T;
  error?: ApiError;
  meta?: Partial<EventListMeta>;
};

type RequestOptions = {
  // BL-61 adds DELETE: the admin panel can now remove an event, which is the
  // only verb the transport was missing.
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  body?: unknown;
  /** Attach a bearer token; fails fast with a synthetic 401 when none is valid. */
  auth?: boolean;
  /** ISR window for server-rendered calls. Omitted → `no-store`. */
  revalidate?: number;
};

/**
 * Hard timeout so build-time prerendering never hangs when the API is slow or
 * unreachable — the request rejects fast and the caller degrades instead of
 * stalling `next build` (same rationale as `lib/api/courses.ts`).
 */
const TIMEOUT_MS = 8_000;

function failure(status: number, code: string, message: string): EventApiFailure {
  return { success: false, status, error: { code, message } };
}

async function requestEvent<T>(
  path: string,
  options: RequestOptions = {},
): Promise<{ success: true; data: T; meta?: Partial<EventListMeta> } | EventApiFailure> {
  const { method = "GET", body, auth = false, revalidate } = options;

  const headers: Record<string, string> = {};
  if (body !== undefined) headers["Content-Type"] = "application/json";

  if (auth) {
    // Refresh-aware: swaps an expired access token for a fresh one before the
    // call, so a long-lived session does not 401 into a silently empty list.
    const token = await getValidToken();
    if (!token) {
      return failure(401, "UNAUTHORIZED", "Sesi Anda telah berakhir. Silakan masuk kembali.");
    }
    headers.Authorization = `Bearer ${token}`;
  }

  let res: Response;
  try {
    res = await fetch(`${getApiBase()}${path}`, {
      method,
      headers,
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
      ...(revalidate !== undefined ? { next: { revalidate } } : { cache: "no-store" as const }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch {
    return failure(0, "NETWORK_ERROR", "Tidak dapat terhubung ke server.");
  }

  let envelope: Envelope<T>;
  try {
    envelope = (await res.json()) as Envelope<T>;
  } catch {
    return failure(res.status, `HTTP_${res.status}`, "Respons server tidak valid.");
  }

  // `data` may legitimately be `null` (e.g. "no registration"), so only an
  // absent key counts as a malformed success.
  if (!res.ok || envelope.success !== true || envelope.data === undefined) {
    return {
      success: false,
      status: res.status,
      error: envelope.error ?? { code: `HTTP_${res.status}`, message: "Permintaan gagal." },
    };
  }

  return { success: true, data: envelope.data, meta: envelope.meta };
}

/** Fold the envelope's `meta` into a page object, defaulting missing counters. */
function toPage<T>(
  items: T[],
  meta: Partial<EventListMeta> | undefined,
  fallback: { page: number; limit: number },
): EventListMeta & { items: T[] } {
  return {
    items,
    total: meta?.total ?? 0,
    page: meta?.page ?? fallback.page,
    limit: meta?.limit ?? fallback.limit,
  };
}

// ─── Public catalog ───────────────────────────────────────────────────────────

export type EventListFilter = {
  /** Free-form; an unknown taxonomy value simply yields an empty page. */
  type?: string;
  page?: number;
  limit?: number;
  featured?: boolean;
};

/** `GET /api/events` — published events only, soonest first. */
export async function listEvents(
  filter: EventListFilter = {},
  revalidate = 300,
): Promise<EventApiResult<EventListPage>> {
  const { type, page = 1, limit = 12, featured } = filter;

  const params = new URLSearchParams({ page: String(page), limit: String(limit) });
  if (type) params.set("type", type);
  // Presence-style flag: the API enables the filter only on the literal "true".
  if (featured) params.set("featured", "true");

  const result = await requestEvent<EventSummary[]>(`/api/events?${params}`, { revalidate });
  if (!result.success) return result;

  const { items, ...meta } = toPage(result.data, result.meta, { page, limit });
  return { success: true, data: { ...meta, events: items } };
}

/** `GET /api/events/:slug` — 404s for draft/cancelled events too. */
export async function getEvent(slug: string): Promise<EventApiResult<EventRecord>> {
  const result = await requestEvent<EventRecord>(`/api/events/${encodeURIComponent(slug)}`);
  return result.success ? { success: true, data: result.data } : result;
}

// ─── Authenticated ────────────────────────────────────────────────────────────

/**
 * `GET /api/events/:slug/registration` — the signed-in user's registration for
 * one event, or `null` when they have not registered. Returns a 401 failure
 * (without issuing a request) for anonymous visitors, so callers never send a
 * `Bearer null` header.
 */
export async function getMyRegistration(
  slug: string,
): Promise<EventApiResult<EventRegistrationRecord | null>> {
  const result = await requestEvent<EventRegistrationRecord | null>(
    `/api/events/${encodeURIComponent(slug)}/registration`,
    { auth: true },
  );
  return result.success ? { success: true, data: result.data } : result;
}

/** `GET /api/events/my/tickets` — every ticket the user owns, newest first. */
export async function listMyTickets(): Promise<EventApiResult<EventTicket[]>> {
  const result = await requestEvent<EventTicket[]>("/api/events/my/tickets", { auth: true });
  return result.success ? { success: true, data: result.data } : result;
}

/**
 * `POST /api/checkout` for an event seat. A zero-price event resolves with
 * `free: true` and the seat is already reserved; anything else returns a
 * `paymentUrl` for the gateway.
 */
export async function checkoutEvent(eventId: string): Promise<EventApiResult<EventCheckoutResult>> {
  const result = await requestEvent<EventCheckoutResult>("/api/checkout", {
    method: "POST",
    auth: true,
    body: { itemType: "event", itemId: eventId },
  });
  return result.success ? { success: true, data: result.data } : result;
}

// ─── Admin ────────────────────────────────────────────────────────────────────

export type AdminEventListFilter = {
  page?: number;
  limit?: number;
  status?: string;
  search?: string;
};

/** `GET /api/admin/events` — every status, with optional status/title filters. */
export async function listAdminEvents(
  filter: AdminEventListFilter = {},
): Promise<EventApiResult<AdminEventListPage>> {
  const { page = 1, limit = 20, status, search } = filter;

  const params = new URLSearchParams({ page: String(page), limit: String(limit) });
  if (search) params.set("search", search);
  if (status) params.set("status", status);

  const result = await requestEvent<EventRecord[]>(`/api/admin/events?${params}`, { auth: true });
  if (!result.success) return result;

  const { items, ...meta } = toPage(result.data, result.meta, { page, limit });
  return { success: true, data: { ...meta, events: items } };
}

/**
 * `PATCH /api/admin/events/:id` — status-only transition.
 *
 * `status` stays a `string` rather than the canonical union: the admin panel has
 * historically written lifecycle values (`ongoing`, `ended`) that the route's Zod
 * schema does not accept, and narrowing the type here would silently change
 * which buttons compile rather than fixing that mismatch (tracked separately).
 */
export async function updateAdminEventStatus(
  id: string,
  status: string,
): Promise<EventApiResult<EventRecord>> {
  const result = await requestEvent<EventRecord>(`/api/admin/events/${encodeURIComponent(id)}`, {
    method: "PATCH",
    auth: true,
    body: { status },
  });
  return result.success ? { success: true, data: result.data } : result;
}

// ─── Admin: full CRUD + check-in (BL-61) ──────────────────────────────────────

/**
 * Create payload — a 1:1 mirror of `eventSchema` in
 * `apps/api/src/routes/events.ts`.
 *
 * Optional keys must be OMITTED rather than sent as `""`/`null`. The schema
 * types them `z.string().url().optional()` / `z.number().optional()`, so an
 * empty string fails parsing with a 400 instead of clearing the column — the
 * API has no "unset this field" verb at all. Plain optional strings
 * (`description`, `location`, `venue`, `speakerName`, `speakerBio`) do accept
 * `""`, which is how the form clears them.
 *
 * `type`/`status` stay `string` for the same reason `EventRecord.status` does:
 * rows carrying legacy lifecycle values already exist and must survive a
 * round-trip through the edit form untouched.
 */
export type AdminEventInput = {
  slug: string;
  title: string;
  description?: string;
  type: string;
  status: string;
  /** ISO-8601 **with** timezone — `z.string().datetime()` rejects a bare
   *  `datetime-local` value such as `2026-08-01T09:00`. */
  startDate: string;
  endDate?: string;
  location?: string;
  venue?: string;
  price: number;
  salePrice?: number;
  quota?: number;
  coverUrl?: string;
  speakerName?: string;
  speakerBio?: string;
  isFeatured: boolean;
};

/** `PATCH` body — `eventSchema.partial()`; unsent keys are left untouched. */
export type AdminEventPatch = Partial<AdminEventInput>;

/** A registration as listed by `GET /api/events/admin/:id/registrations`. */
export type AdminEventRegistration = EventRegistrationRecord & {
  user: { id: string; name: string; email: string };
};

/** Payload of a successful `POST /api/events/admin/checkin`. */
export type EventCheckinResult = EventRegistrationRecord & {
  user: { name: string; email: string };
  event: { title: string };
};

/** `POST /api/events/admin` — 400 `VALIDATION_ERROR` carries the field list. */
export async function createAdminEvent(
  input: AdminEventInput,
): Promise<EventApiResult<EventRecord>> {
  const result = await requestEvent<EventRecord>("/api/events/admin", {
    method: "POST",
    auth: true,
    body: input,
  });
  return result.success ? { success: true, data: result.data } : result;
}

/** `PATCH /api/events/admin/:id` — partial update of any editable column. */
export async function updateAdminEvent(
  id: string,
  patch: AdminEventPatch,
): Promise<EventApiResult<EventRecord>> {
  const result = await requestEvent<EventRecord>(`/api/events/admin/${encodeURIComponent(id)}`, {
    method: "PATCH",
    auth: true,
    body: patch,
  });
  return result.success ? { success: true, data: result.data } : result;
}

/**
 * `DELETE /api/events/admin/:id`.
 *
 * BL-62b: the API answers **409** when the event already has registrations,
 * because those are paid records and cascading them away would destroy purchase
 * history. The 409 message names the count and the workaround, so callers must
 * render `error.message` verbatim rather than a generic "gagal" string.
 */
export async function deleteAdminEvent(id: string): Promise<EventApiResult<{ id: string }>> {
  const result = await requestEvent<{ id: string }>(`/api/events/admin/${encodeURIComponent(id)}`, {
    method: "DELETE",
    auth: true,
  });
  return result.success ? { success: true, data: result.data } : result;
}

/** `GET /api/events/admin/:id/registrations` — attendee list, newest first. */
export async function listAdminEventRegistrations(
  eventId: string,
): Promise<EventApiResult<AdminEventRegistration[]>> {
  const result = await requestEvent<AdminEventRegistration[]>(
    `/api/events/admin/${encodeURIComponent(eventId)}/registrations`,
    { auth: true },
  );
  return result.success ? { success: true, data: result.data } : result;
}

/**
 * `POST /api/events/admin/checkin` — scan one ticket at the door.
 *
 * The API deliberately refuses to be idempotent, so every failure mode is a
 * distinct status the UI must distinguish: 404 "Tiket tidak ditemukan.",
 * 400 "Tiket sudah pernah di-scan.", 400 "Tiket belum confirmed.".
 */
export async function checkInEventTicket(
  ticketCode: string,
): Promise<EventApiResult<EventCheckinResult>> {
  const result = await requestEvent<EventCheckinResult>("/api/events/admin/checkin", {
    method: "POST",
    auth: true,
    body: { ticketCode },
  });
  return result.success ? { success: true, data: result.data } : result;
}

/**
 * `GET /api/events/admin/:id` — locate one event by id for the edit screen.
 *
 * This replaces a walk over the paginated admin list (up to 20 requests, each
 * with its own 8s timeout) that the missing by-id endpoint used to force. The
 * walk also reported a false "Event tidak ditemukan." for any event beyond the
 * 1000th row; a single request cannot. The endpoint returns drafts and
 * cancelled events too, and answers a real 404 when the id is unknown.
 */
export async function getAdminEventById(id: string): Promise<EventApiResult<EventRecord>> {
  const result = await requestEvent<EventRecord>(`/api/events/admin/${encodeURIComponent(id)}`, {
    auth: true,
  });
  return result.success ? { success: true, data: result.data } : result;
}
