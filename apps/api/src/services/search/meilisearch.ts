import { Meilisearch } from "meilisearch";
import { env } from "../../config/env.js";

let _client: Meilisearch | null = null;

export function getMeiliClient(): Meilisearch {
  if (!_client) {
    _client = new Meilisearch({
      host: env.MEILISEARCH_URL,
      apiKey: env.MEILISEARCH_KEY,
    });
  }
  return _client;
}

export const COURSE_INDEX = "courses";

export async function indexCourse(course: {
  id: string;
  slug: string;
  title: string;
  shortDesc?: string | null;
  description?: string | null;
  status: string;
  categoryName?: string | null;
  level?: string | null;
  price: string | number;
  thumbnailUrl?: string | null;
  avgRating: string | number;
  totalEnrolled: number;
  isFeatured: boolean;
}): Promise<void> {
  try {
    const client = getMeiliClient();
    const index = client.index(COURSE_INDEX);
    await index.addDocuments([
      {
        id: course.id,
        slug: course.slug,
        title: course.title,
        shortDesc: course.shortDesc ?? "",
        description: course.description ?? "",
        status: course.status,
        categoryName: course.categoryName ?? "",
        level: course.level ?? "",
        price: Number(course.price),
        thumbnailUrl: course.thumbnailUrl ?? "",
        avgRating: Number(course.avgRating),
        totalEnrolled: course.totalEnrolled,
        isFeatured: course.isFeatured,
      },
    ]);
  } catch {
    // Meilisearch is optional — indexing failure must never crash the API
  }
}

export async function deleteCourseFromIndex(courseId: string): Promise<void> {
  try {
    const client = getMeiliClient();
    await client.index(COURSE_INDEX).deleteDocument(courseId);
  } catch {
    // silent
  }
}

export type CourseSearchResult = { hits: { id: string; slug: string; title: string }[]; total: number };

export async function searchCourses(
  query: string,
  opts?: { limit?: number; offset?: number; filter?: string },
): Promise<CourseSearchResult> {
  try {
    const client = getMeiliClient();
    const result = await client.index(COURSE_INDEX).search(query, {
      limit: opts?.limit ?? 20,
      offset: opts?.offset ?? 0,
      filter: opts?.filter,
      attributesToRetrieve: ["id", "slug", "title", "shortDesc", "thumbnailUrl", "price", "avgRating", "categoryName"],
    });
    const hits = result.hits as { id: string; slug: string; title: string }[];
    // Meilisearch reports the full match count as `estimatedTotalHits` for
    // offset/limit pagination and as `totalHits` for page/hitsPerPage
    // pagination. Both are read so the total stays correct if the pagination
    // mode ever changes; the page size is only a last-resort floor for a server
    // that reports neither. Mirrors `searchEvents` below.
    const paging = result as unknown as { estimatedTotalHits?: number; totalHits?: number };
    const total = paging.estimatedTotalHits ?? paging.totalHits ?? hits.length;
    return { hits, total };
  } catch {
    return { hits: [], total: 0 };
  }
}

export async function ensureCourseIndexSettings(): Promise<void> {
  try {
    const client = getMeiliClient();
    const index = client.index(COURSE_INDEX);
    await index.updateSearchableAttributes(["title", "shortDesc", "description", "categoryName"]);
    await index.updateFilterableAttributes(["status", "categoryName", "level", "isFeatured"]);
    await index.updateSortableAttributes(["price", "avgRating", "totalEnrolled"]);
  } catch {
    // Meilisearch may not be running in all environments
  }
}

// ─── Events (BL-63) ───────────────────────────────────────────────────────────

export const EVENT_INDEX = "events";

/**
 * Input accepted by `indexEvent`. Declared as a named type (unlike the inline
 * course shape above) because the job payload in jobs/processors/searchIndex.ts
 * derives from it, so the queue payload can never drift from the document shape.
 * Decimal columns arrive as strings — the caller stringifies them at the
 * service boundary so this module never depends on the Prisma runtime types.
 */
export type IndexEventInput = {
  id: string;
  slug: string;
  title: string;
  description?: string | null;
  type: string;
  status: string;
  startDate: Date | string;
  endDate?: Date | string | null;
  location?: string | null;
  venue?: string | null;
  speakerName?: string | null;
  coverUrl?: string | null;
  price: string | number;
  salePrice?: string | number | null;
  isFeatured: boolean;
};

/** Meilisearch sorts numbers reliably but compares strings lexicographically,
 *  so dates are stored as epoch milliseconds for the sortable/filterable field
 *  and kept as ISO text in a separate attribute for display. */
function toEpochMs(value: Date | string | null | undefined): number | null {
  if (!value) return null;
  const ms = value instanceof Date ? value.getTime() : Date.parse(value);
  return Number.isNaN(ms) ? null : ms;
}

function toIso(value: Date | string | null | undefined): string {
  if (!value) return "";
  return value instanceof Date ? value.toISOString() : value;
}

export async function indexEvent(event: IndexEventInput): Promise<void> {
  try {
    const client = getMeiliClient();
    const index = client.index(EVENT_INDEX);
    await index.addDocuments([
      {
        id: event.id,
        slug: event.slug,
        title: event.title,
        description: event.description ?? "",
        type: event.type,
        status: event.status,
        startDate: toEpochMs(event.startDate),
        startDateIso: toIso(event.startDate),
        endDate: toEpochMs(event.endDate),
        endDateIso: toIso(event.endDate),
        location: event.location ?? "",
        venue: event.venue ?? "",
        speakerName: event.speakerName ?? "",
        coverUrl: event.coverUrl ?? "",
        price: Number(event.price),
        salePrice: event.salePrice === null || event.salePrice === undefined ? null : Number(event.salePrice),
        isFeatured: event.isFeatured,
      },
    ]);
  } catch {
    // Meilisearch is optional — indexing failure must never crash the API
  }
}

export async function deleteEventFromIndex(eventId: string): Promise<void> {
  try {
    const client = getMeiliClient();
    await client.index(EVENT_INDEX).deleteDocument(eventId);
  } catch {
    // silent
  }
}

export type EventSearchHit = { id: string; slug: string; title: string };

/**
 * A page of event hits PLUS the size of the whole match set.
 *
 * `total` is returned separately because `hits.length` only ever describes the
 * current page — a caller that used it as the total would compute a wrong page
 * count for every paginated search (BL-63b).
 */
export type EventSearchResult = { hits: EventSearchHit[]; total: number };

export async function searchEvents(
  query: string,
  opts?: { limit?: number; offset?: number; filter?: string },
): Promise<EventSearchResult> {
  try {
    const client = getMeiliClient();
    const result = await client.index(EVENT_INDEX).search(query, {
      limit: opts?.limit ?? 20,
      offset: opts?.offset ?? 0,
      filter: opts?.filter,
      attributesToRetrieve: [
        "id",
        "slug",
        "title",
        "type",
        "startDateIso",
        "location",
        "venue",
        "speakerName",
        "coverUrl",
        "price",
      ],
    });
    const hits = result.hits as EventSearchHit[];
    // Meilisearch reports the full match count as `estimatedTotalHits` for
    // offset/limit pagination and as `totalHits` for page/hitsPerPage
    // pagination. Both are read so the total stays correct if the pagination
    // mode ever changes; the page size is only a last-resort floor for a server
    // that reports neither.
    const paging = result as unknown as { estimatedTotalHits?: number; totalHits?: number };
    const total = paging.estimatedTotalHits ?? paging.totalHits ?? hits.length;
    return { hits, total };
  } catch {
    return { hits: [], total: 0 };
  }
}

export async function ensureEventIndexSettings(): Promise<void> {
  try {
    const client = getMeiliClient();
    const index = client.index(EVENT_INDEX);
    await index.updateSearchableAttributes(["title", "description", "speakerName", "location", "venue"]);
    await index.updateFilterableAttributes(["type", "status", "isFeatured"]);
    await index.updateSortableAttributes(["startDate"]);
  } catch {
    // Meilisearch may not be running in all environments
  }
}
