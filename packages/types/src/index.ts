export interface User {
  id: string;
  email: string;
  name: string;
  avatarUrl?: string;
  role: string;
  isVerified: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Course {
  id: string;
  slug: string;
  title: string;
  description?: string;
  price: number;
  salePrice?: number;
  status: 'draft' | 'published';
  trainerId: string;
  categoryId?: string;
  level?: string;
  thumbnailUrl?: string;
  totalDuration: number;
  totalLessons: number;
  avgRating: number;
  createdAt: string;
}

// ─── Events ───────────────────────────────────────────────────────────────────
// Source of truth: `model Event` / `model EventRegistration` in
// `apps/api/prisma/schema.prisma`, as serialised by the API's JSON envelope.
//
// BL-64: the previous `Event` here described a table that has never existed —
// `startAt`/`endAt`/`maxParticipants`/`organizerId`/`thumbnailUrl` and a
// `webinar | workshop | conference | bootcamp` taxonomy. Nothing imported it, so
// the drift was invisible; it is corrected here so the shape can only mislead
// in the direction of the database.
//
// Serialisation notes (why these are not the raw Prisma scalar types):
//   - Prisma `Decimal` is emitted as a decimal STRING by `JSON.stringify`,
//     so `price`/`salePrice` are `string`, not `number`.
//   - `DateTime` is emitted as an ISO-8601 string.
//   - Nullable columns arrive as explicit `null`, never as a missing key, so
//     they are modelled as `| null` rather than optional (`?`).

/** `Event.type` — validated by `eventSchema` in `apps/api/src/routes/events.ts`. */
export type EventType = 'online' | 'offline' | 'hybrid';

/** `Event.status` — validated by `eventSchema`; stored as a plain `String` column. */
export type EventStatus = 'draft' | 'published' | 'cancelled';

/** `EventRegistration.status` — see the enum comment in schema.prisma. */
export type EventRegistrationStatus = 'pending' | 'confirmed' | 'cancelled' | 'attended';

export interface Event {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  type: EventType;
  status: EventStatus;
  startDate: string;
  endDate: string | null;
  location: string | null;
  venue: string | null;
  /** Decimal(12,2) serialised as a string, e.g. "150000.00". */
  price: string;
  /** Decimal(12,2) serialised as a string; `null` when the event is not discounted. */
  salePrice: string | null;
  /** Seat cap; `null` means unlimited. */
  quota: number | null;
  totalSold: number;
  coverUrl: string | null;
  speakerName: string | null;
  speakerBio: string | null;
  isFeatured: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface EventRegistration {
  id: string;
  eventId: string;
  userId: string;
  /** `null` for free events, which are fulfilled without an Order. */
  orderId: string | null;
  ticketCode: string;
  status: EventRegistrationStatus;
  attendedAt: string | null;
  createdAt: string;
}

// ─── E-Books ──────────────────────────────────────────────────────────────────
// Source of truth: `model EBook` in `apps/api/prisma/schema.prisma`, as
// serialised by the API's JSON envelope (`routes/ebooks.ts` returns the whole
// row, so every column below really is on the wire).
//
// BL-65: the previous `EBook` here described columns that have never existed —
// `authorId` and `publishedAt` — while omitting `salePrice`, `author`,
// `category`, `status`, `totalSold` and the timestamps. Nothing imported it, so
// the drift stayed invisible; it is corrected here so the shape can only
// mislead in the direction of the database.
//
// Serialisation notes (same conventions as `Event` above):
//   - Prisma `Decimal` is emitted as a decimal STRING by `JSON.stringify`,
//     so `price`/`salePrice` are `string`, not `number`.
//   - `DateTime` is emitted as an ISO-8601 string.
//   - Nullable columns arrive as explicit `null`, never as a missing key, so
//     they are modelled as `| null` rather than optional (`?`).

/**
 * `EBook.status` — the only writer is the admin CRUD, where `ebookSchema` in
 * `apps/api/src/modules/admin/ebooks.ts` validates it with
 * `z.enum(['draft', 'published'])`.
 *
 * In Prisma the column is a bare `String` with no enum/check constraint, so this
 * union is an UNENFORCED narrowing: it describes what the API writes, not what
 * the database is able to hold. A row seeded or patched outside that route can
 * carry any string and would still be typed as `EBookStatus` here.
 */
export type EBookStatus = 'draft' | 'published';

export interface EBook {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  /** Decimal(12,2) serialised as a string, e.g. "99000.00". */
  price: string;
  /** Decimal(12,2) serialised as a string; `null` when the ebook is not discounted. */
  salePrice: string | null;
  /**
   * Download location. Non-null in the database, but only reachable through the
   * ownership-gated `GET /api/ebooks/:slug/file` endpoint.
   */
  fileUrl: string;
  coverUrl: string | null;
  author: string | null;
  pages: number | null;
  category: string | null;
  status: EBookStatus;
  /**
   * GROSS lifetime paid purchases (BL-65). Increment-only: a refund revokes
   * download access but deliberately leaves this counter alone, so it is a
   * "copies ever sold" figure, NOT a net/current-owners figure.
   */
  totalSold: number;
  createdAt: string;
  updatedAt: string;
}
