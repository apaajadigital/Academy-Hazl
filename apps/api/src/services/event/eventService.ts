import { prisma } from "../../db/prisma.js";
import { AppError } from "../../types/index.js";
import { logger } from "../../lib/logger.js";
import { searchEvents, type IndexEventInput } from "../search/meilisearch.js";
import { syncEventSearchIndex, removeEventFromSearchIndex } from "../../jobs/processors/searchIndex.js";

/**
 * Event domain service (BL-59).
 *
 * All Event/EventRegistration business logic and Prisma access lives here so the
 * route layer stays a thin HTTP adapter (SSOT §9.6: Route → Service →
 * Repository/Prisma). Nothing in this file may touch `req`/`res`; failures are
 * signalled with `AppError` and translated to HTTP by the central errorHandler.
 */

/** Public list projection — kept identical to the pre-refactor route select so
 *  the API contract (incl. `quota` and `totalSold`) does not change. */
const PUBLIC_LIST_SELECT = {
  id: true,
  slug: true,
  title: true,
  type: true,
  startDate: true,
  endDate: true,
  location: true,
  venue: true,
  price: true,
  salePrice: true,
  quota: true,
  totalSold: true,
  coverUrl: true,
  speakerName: true,
  isFeatured: true,
} as const;

const TICKET_EVENT_SELECT = {
  id: true,
  slug: true,
  title: true,
  type: true,
  startDate: true,
  endDate: true,
  location: true,
  venue: true,
  coverUrl: true,
} as const;

export type PaginatedResult<T> = { data: T[]; total: number; page: number; limit: number };

// ─── Search indexing (BL-63) ──────────────────────────────────────────────────

/** Structural view of a persisted Event row. Decimal columns are typed by their
 *  `toString()` capability so this service does not import Prisma runtime types. */
type PersistedEvent = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  type: string;
  status: string;
  startDate: Date;
  endDate: Date | null;
  location: string | null;
  venue: string | null;
  speakerName: string | null;
  coverUrl: string | null;
  price: { toString(): string };
  salePrice?: { toString(): string } | null;
  isFeatured: boolean;
};

function toEventSearchDocument(event: PersistedEvent): IndexEventInput {
  return {
    id: event.id,
    slug: event.slug,
    title: event.title,
    description: event.description,
    type: event.type,
    status: event.status,
    startDate: event.startDate,
    endDate: event.endDate,
    location: event.location,
    venue: event.venue,
    speakerName: event.speakerName,
    coverUrl: event.coverUrl,
    price: event.price.toString(),
    salePrice: event.salePrice === null || event.salePrice === undefined ? null : event.salePrice.toString(),
    isFeatured: event.isFeatured,
  };
}

/**
 * Best-effort index refresh for one persisted event (BL-63).
 *
 * The mapping is INSIDE the guard on purpose: search indexing is a side-effect
 * of an admin write, so neither a malformed row nor an unreachable Meilisearch
 * may ever turn a successful create/update into a 500.
 */
async function reindexEvent(event: PersistedEvent): Promise<void> {
  try {
    await syncEventSearchIndex(toEventSearchDocument(event));
  } catch (err) {
    logger.warn("event search reindex skipped", { eventId: event?.id, err: String(err) });
  }
}

/**
 * Full-text search over published events, used by `GET /api/search` (BL-63).
 * Mirrors `listCourses`: Meilisearch first, then re-fetch from Prisma so the
 * response shape is DB-authoritative, with an ILIKE fallback when Meilisearch is
 * unavailable or has not indexed anything yet (degrade-safe).
 */
export async function searchPublishedEvents(filter: {
  q: string;
  page?: number;
  limit?: number;
}): Promise<PaginatedResult<unknown>> {
  const { q, page = 1, limit = 12 } = filter;
  const skip = (page - 1) * limit;

  const { hits, total: indexTotal } = await searchEvents(q, {
    limit,
    offset: skip,
    filter: 'status = "published"',
  });
  if (hits.length > 0) {
    const slugs = hits.map((h) => h.slug);
    // The status filter is re-applied here: the index can lag behind a status
    // change by one job, the DB never does.
    const events = await prisma.event.findMany({
      where: { slug: { in: slugs }, status: "published" },
      select: PUBLIC_LIST_SELECT,
    });
    const ordered = slugs.map((s) => events.find((e) => e.slug === s)).filter(Boolean);
    // BL-63b: the total must describe the whole match set, not this page —
    // `ordered.length` capped every search at one page of results. Meilisearch
    // supplies that count; because the index can lag the DB by one sync it is a
    // close estimate, so it is floored by what the caller can already see
    // (`skip + ordered.length`) and never reports fewer rows than it returns.
    return { data: ordered, total: Math.max(indexTotal, skip + ordered.length), page, limit };
  }

  const where = {
    status: "published",
    OR: [
      { title: { contains: q, mode: "insensitive" as const } },
      { description: { contains: q, mode: "insensitive" as const } },
      { speakerName: { contains: q, mode: "insensitive" as const } },
      { location: { contains: q, mode: "insensitive" as const } },
    ],
  };

  const [data, total] = await Promise.all([
    prisma.event.findMany({ where, select: PUBLIC_LIST_SELECT, skip, take: limit, orderBy: { startDate: "asc" } }),
    prisma.event.count({ where }),
  ]);

  return { data, total, page, limit };
}

export type EventListFilter = {
  page?: number;
  limit?: number;
  type?: string;
  featured?: boolean;
  /** Opt in to the archive: past events instead of upcoming ones. Default false. */
  past?: boolean;
};

/** Public catalog: published, still-attendable events only, soonest first. */
/**
 * The moment an event stops being sellable.
 *
 * `endDate` is optional in the schema, so a single-session event only carries
 * `startDate`. Falling back to `startDate` is the conservative reading: once a
 * one-off event has started, selling a seat for it is selling nothing.
 *
 * Both values are Prisma `DateTime`, i.e. UTC instants, and are compared
 * against `new Date()` which is also a UTC instant — so the comparison carries
 * no timezone assumption. A visitor in WIB and the server in UTC agree on
 * whether a given instant has passed.
 */
export function eventEndsAt(event: { startDate: Date; endDate?: Date | null }): Date {
  return event.endDate ?? event.startDate;
}

/**
 * THE boundary contract, used by the listing filter, the checkout guard and
 * (mirrored) the detail page:
 *
 *     active / upcoming  ⇔  eventEnd  >  now
 *     ended              ⇔  eventEnd <=  now
 *
 * The two halves must stay exact complements. If one used `>=` and the other
 * `<`, then at the single instant `eventEnd === now` an event would be both
 * ended and listed — or worse, hidden from the catalogue while checkout still
 * accepted money for it. Writing the rule once and deriving the query from it
 * is what keeps that impossible.
 *
 * The end instant itself counts as ended: the moment a session's end time
 * arrives, there is nothing left to sell.
 */
export function isEventEnded(
  event: { startDate: Date; endDate?: Date | null },
  now: Date = new Date(),
): boolean {
  return eventEndsAt(event).getTime() <= now.getTime();
}

export async function listPublishedEvents(filter: EventListFilter = {}): Promise<PaginatedResult<unknown>> {
  const { page = 1, limit = 12, type, featured, past = false } = filter;
  const skip = (page - 1) * limit;
  const now = new Date();

  const where = {
    status: "published",
    ...(type ? { type } : {}),
    // `featured` narrows the result set only when explicitly requested; a false
    // value must not exclude non-featured events (pre-refactor behaviour).
    ...(featured ? { isFeatured: true } : {}),
    // Default catalogue shows only what a visitor can still attend. On 10 Aug
    // 2026 all three published events had already happened (14/21/28 Jul) and
    // two of them were still taking money — this filter is what stops that.
    // `past=true` is an explicit opt-in for archive/history views; nothing is
    // deleted, only hidden from the default listing.
    //
    // Exact complement of `isEventEnded` (see its doc comment):
    //   upcoming → eventEnd >  now   (gt / gt)
    //   past     → eventEnd <= now   (lte / lte)
    // `gt` here and `<=` there are the same line drawn from opposite sides, so
    // no event can ever fall into both sets or neither.
    ...(past
      ? { OR: [{ endDate: { lte: now } }, { endDate: null, startDate: { lte: now } }] }
      : { OR: [{ endDate: { gt: now } }, { endDate: null, startDate: { gt: now } }] }),
  };

  const [data, total] = await Promise.all([
    prisma.event.findMany({
      where,
      orderBy: { startDate: "asc" },
      skip,
      take: limit,
      select: PUBLIC_LIST_SELECT,
    }),
    prisma.event.count({ where }),
  ]);

  return { data, total, page, limit };
}

/** Public detail. Draft/cancelled events are indistinguishable from missing ones. */
export async function getPublishedEventBySlug(slug: string) {
  const event = await prisma.event.findUnique({ where: { slug } });
  if (!event || event.status !== "published") throw new AppError(404, "Event tidak ditemukan.");
  return event;
}

/** The signed-in user's registration for a given event slug (null when none). */
export async function getUserRegistration(slug: string, userId: string) {
  const event = await prisma.event.findUnique({ where: { slug } });
  if (!event) throw new AppError(404, "Event tidak ditemukan.");

  return prisma.eventRegistration.findUnique({
    where: { eventId_userId: { eventId: event.id, userId } },
  });
}

/** Dashboard: every ticket owned by the user, newest first. */
export async function listUserTickets(userId: string) {
  return prisma.eventRegistration.findMany({
    where: { userId },
    include: { event: { select: TICKET_EVENT_SELECT } },
    orderBy: { createdAt: "desc" },
  });
}

export type AdminEventListFilter = {
  page?: number;
  limit?: number;
  status?: string;
  search?: string;
};

/**
 * Admin list used by `GET /api/events/admin/all` — every status, newest first.
 *
 * `status`/`search` used to be accepted and then silently dropped, so the
 * signature promised a filter the query never applied. They are now honoured
 * with the same semantics as `listAdminEvents` (exact status, case-insensitive
 * title match) so the two admin lists cannot drift apart. Both are optional:
 * omitting them keeps the previous "everything, newest first" behaviour, and
 * the response shape is unchanged.
 */
export async function listAllEvents(filter: AdminEventListFilter = {}): Promise<PaginatedResult<unknown>> {
  const { page = 1, limit = 20, status, search } = filter;
  const skip = (page - 1) * limit;

  const where = {
    ...(status ? { status } : {}),
    ...(search ? { title: { contains: search, mode: "insensitive" as const } } : {}),
  };

  const [data, total] = await Promise.all([
    prisma.event.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
      include: { _count: { select: { registrations: true } } },
    }),
    // The count must use the same `where` as the page, otherwise pagination
    // reports rows the filtered list can never reach.
    prisma.event.count({ where }),
  ]);

  return { data, total, page, limit };
}

/** Admin list used by `GET /api/admin/events` — supports status/search filters. */
export async function listAdminEvents(filter: AdminEventListFilter = {}): Promise<PaginatedResult<unknown>> {
  const { page = 1, limit = 20, status, search } = filter;
  const skip = (page - 1) * limit;

  const where = {
    ...(status ? { status } : {}),
    ...(search ? { title: { contains: search, mode: "insensitive" as const } } : {}),
  };

  const [data, total] = await Promise.all([
    prisma.event.findMany({ where, skip, take: limit, orderBy: { startDate: "desc" } }),
    prisma.event.count({ where }),
  ]);

  return { data, total, page, limit };
}

/**
 * Admin detail by id, used by `GET /api/events/admin/:id`.
 *
 * Unlike `getPublishedEventBySlug` this deliberately ignores `status`: an admin
 * edits draft and cancelled events too. A missing row is a clean 404 rather
 * than a `null` the route would have to interpret.
 */
export async function getAdminEventById(id: string) {
  const event = await prisma.event.findUnique({ where: { id } });
  if (!event) throw new AppError(404, "Event tidak ditemukan.");
  return event;
}

export type CreateEventDto = {
  slug: string;
  title: string;
  description?: string;
  type: string;
  status: string;
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

export async function createEvent(dto: CreateEventDto) {
  // Slug is the public URL key: reject duplicates up-front instead of letting a
  // raw Prisma P2002 unique violation escape as a 500.
  const existing = await prisma.event.findUnique({ where: { slug: dto.slug } });
  if (existing) throw new AppError(400, "Slug sudah digunakan.");

  const event = await prisma.event.create({
    data: {
      ...dto,
      startDate: new Date(dto.startDate),
      endDate: dto.endDate ? new Date(dto.endDate) : null,
    },
  });

  // BL-63: keep global search in sync. Best-effort — never fails the admin write.
  await reindexEvent(event);

  return event;
}

export type UpdateEventDto = Partial<CreateEventDto>;

export async function updateEvent(id: string, dto: UpdateEventDto) {
  const existing = await prisma.event.findUnique({ where: { id } });
  if (!existing) throw new AppError(404, "Event tidak ditemukan.");

  const event = await prisma.event.update({
    where: { id },
    data: {
      ...dto,
      // Date fields arrive as ISO strings from the HTTP boundary; `undefined`
      // leaves the stored value untouched.
      startDate: dto.startDate ? new Date(dto.startDate) : undefined,
      endDate: dto.endDate ? new Date(dto.endDate) : undefined,
    },
  });

  // BL-63: re-index on every edit; an update that flips the status away from
  // `published` removes the document instead of refreshing it.
  await reindexEvent(event);

  return event;
}

/**
 * Status-only transition used by `PATCH /api/admin/events/:id`.
 *
 * The existence pre-check mirrors `updateEvent`/`deleteEvent`: without it an
 * unknown id reached `prisma.event.update` and escaped as a raw P2025, which
 * the error handler could only translate into a 500 for what is plainly a 404.
 */
export async function updateEventStatus(id: string, status?: string) {
  const existing = await prisma.event.findUnique({ where: { id } });
  if (!existing) throw new AppError(404, "Event tidak ditemukan.");

  const data: { status?: string } = {};
  if (status) data.status = status;

  const event = await prisma.event.update({ where: { id }, data });

  // BL-63: this is the path that cancels or unpublishes an event, so the delete
  // branch of the sync matters most here.
  await reindexEvent(event);

  return event;
}

/**
 * BL-62b: deleting an event that already has registrations used to bubble a raw
 * Prisma P2003 foreign-key error out as a 500. Registrations are PAID records —
 * cascading them away would destroy purchase history — so the delete is refused
 * with a 409 and the admin is told to cancel the event instead.
 */
export async function deleteEvent(id: string) {
  const registrationCount = await prisma.eventRegistration.count({ where: { eventId: id } });
  if (registrationCount > 0) {
    logger.warn("event delete refused: registrations exist", { eventId: id, registrationCount });
    throw new AppError(
      409,
      `Event tidak dapat dihapus karena sudah memiliki ${registrationCount} registrasi berbayar. ` +
        "Batalkan event dengan mengubah status menjadi 'cancelled' alih-alih menghapusnya.",
    );
  }

  await prisma.event.delete({ where: { id } });

  // BL-63: a hard-deleted event must not survive in the search index.
  await removeEventFromSearchIndex(id);

  return { id };
}

/** Attendee list for the admin check-in screen. */
export async function listEventRegistrations(eventId: string) {
  return prisma.eventRegistration.findMany({
    where: { eventId },
    include: { user: { select: { id: true, name: true, email: true } } },
    orderBy: { createdAt: "desc" },
  });
}

/** Scan a ticket at the door. Idempotency is intentionally NOT allowed: a second
 *  scan is a hard error so duplicate entry is caught by staff. */
export async function checkInTicket(ticketCode: string) {
  const reg = await prisma.eventRegistration.findUnique({ where: { ticketCode } });
  if (!reg) throw new AppError(404, "Tiket tidak ditemukan.");
  if (reg.attendedAt) throw new AppError(400, "Tiket sudah pernah di-scan.");
  if (reg.status !== "confirmed") throw new AppError(400, "Tiket belum confirmed.");

  return prisma.eventRegistration.update({
    where: { ticketCode },
    data: { status: "attended", attendedAt: new Date() },
    include: { user: { select: { name: true, email: true } }, event: { select: { title: true } } },
  });
}
