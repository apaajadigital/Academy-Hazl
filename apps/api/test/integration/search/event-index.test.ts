/**
 * BL-63 — Event ↔ Meilisearch index sync.
 *
 * Guards the two rules that make event search trustworthy:
 *  1. only `published` events are indexed;
 *  2. `draft` / `cancelled` / deleted events are actively REMOVED from the index,
 *     so a cancelled event can never keep selling tickets through search.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../../../src/db/prisma.js", () => ({
  prisma: {
    event: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    eventRegistration: { count: vi.fn() },
  },
}));

vi.mock("../../../src/services/search/meilisearch.js", () => ({
  indexEvent: vi.fn().mockResolvedValue(undefined),
  deleteEventFromIndex: vi.fn().mockResolvedValue(undefined),
  // BL-63b: searchEvents now reports the whole match set, not just the page.
  searchEvents: vi.fn().mockResolvedValue({ hits: [], total: 0 }),
  // The shared search-index processor also imports the course helpers.
  indexCourse: vi.fn().mockResolvedValue(undefined),
  deleteCourseFromIndex: vi.fn().mockResolvedValue(undefined),
  searchCourses: vi.fn().mockResolvedValue([]),
}));

import { prisma } from "../../../src/db/prisma.js";
import { indexEvent, deleteEventFromIndex, searchEvents } from "../../../src/services/search/meilisearch.js";
import {
  createEvent,
  updateEvent,
  updateEventStatus,
  deleteEvent,
  searchPublishedEvents,
} from "../../../src/services/event/eventService.js";

const mockPrisma = prisma as unknown as {
  event: Record<string, ReturnType<typeof vi.fn>>;
  eventRegistration: { count: ReturnType<typeof vi.fn> };
};
const mockIndexEvent = indexEvent as ReturnType<typeof vi.fn>;
const mockDeleteEvent = deleteEventFromIndex as ReturnType<typeof vi.fn>;
const mockSearchEvents = searchEvents as ReturnType<typeof vi.fn>;

/** Prisma returns Decimal columns as objects with `toString()`; strings stand in. */
const eventRow = (overrides: Record<string, unknown> = {}) => ({
  id: "e1",
  slug: "seminar-ai",
  title: "Seminar AI",
  description: "Belajar AI untuk bisnis",
  type: "offline",
  status: "published",
  startDate: new Date("2026-09-01T02:00:00.000Z"),
  endDate: null,
  location: "Jakarta",
  venue: "Balai Kartini",
  speakerName: "Budi",
  speakerBio: null,
  coverUrl: null,
  price: "250000",
  salePrice: null,
  quota: 100,
  totalSold: 0,
  isFeatured: false,
  ...overrides,
});

const createDto = {
  slug: "seminar-ai",
  title: "Seminar AI",
  type: "offline",
  status: "published",
  startDate: "2026-09-01T02:00:00.000Z",
  price: 250000,
  isFeatured: false,
};

beforeEach(() => {
  vi.clearAllMocks();
  mockIndexEvent.mockResolvedValue(undefined);
  mockDeleteEvent.mockResolvedValue(undefined);
  mockSearchEvents.mockResolvedValue({ hits: [], total: 0 });
  mockPrisma.event.findUnique.mockResolvedValue(null);
});

describe("createEvent → search index", () => {
  it("indexes a published event with the searchable fields", async () => {
    mockPrisma.event.create.mockResolvedValue(eventRow());

    await createEvent(createDto);

    expect(mockIndexEvent).toHaveBeenCalledTimes(1);
    expect(mockIndexEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "e1",
        slug: "seminar-ai",
        title: "Seminar AI",
        description: "Belajar AI untuk bisnis",
        speakerName: "Budi",
        location: "Jakarta",
        venue: "Balai Kartini",
        type: "offline",
        status: "published",
        isFeatured: false,
        price: "250000",
      }),
    );
    expect(mockDeleteEvent).not.toHaveBeenCalled();
  });

  it("does NOT index a draft event — it removes it from the index instead", async () => {
    mockPrisma.event.create.mockResolvedValue(eventRow({ status: "draft" }));

    await createEvent({ ...createDto, status: "draft" });

    expect(mockIndexEvent).not.toHaveBeenCalled();
    expect(mockDeleteEvent).toHaveBeenCalledWith("e1");
  });

  it("never fails the admin write when indexing throws", async () => {
    mockPrisma.event.create.mockResolvedValue(eventRow());
    mockIndexEvent.mockRejectedValue(new Error("meilisearch offline"));

    await expect(createEvent(createDto)).resolves.toMatchObject({ id: "e1" });
  });
});

describe("updateEvent / updateEventStatus → search index", () => {
  it("re-indexes an event that stays published", async () => {
    mockPrisma.event.findUnique.mockResolvedValue(eventRow());
    mockPrisma.event.update.mockResolvedValue(eventRow({ title: "Seminar AI 2026" }));

    await updateEvent("e1", { title: "Seminar AI 2026" });

    expect(mockIndexEvent).toHaveBeenCalledWith(expect.objectContaining({ title: "Seminar AI 2026" }));
    expect(mockDeleteEvent).not.toHaveBeenCalled();
  });

  it("removes an event from the index when it is unpublished back to draft", async () => {
    mockPrisma.event.findUnique.mockResolvedValue(eventRow());
    mockPrisma.event.update.mockResolvedValue(eventRow({ status: "draft" }));

    await updateEvent("e1", { status: "draft" });

    expect(mockIndexEvent).not.toHaveBeenCalled();
    expect(mockDeleteEvent).toHaveBeenCalledWith("e1");
  });

  it("removes a CANCELLED event from the index", async () => {
    mockPrisma.event.findUnique.mockResolvedValue(eventRow());
    mockPrisma.event.update.mockResolvedValue(eventRow({ status: "cancelled" }));

    await updateEventStatus("e1", "cancelled");

    expect(mockIndexEvent).not.toHaveBeenCalled();
    expect(mockDeleteEvent).toHaveBeenCalledWith("e1");
  });

  it("indexes an event that is published via a status transition", async () => {
    mockPrisma.event.findUnique.mockResolvedValue(eventRow());
    mockPrisma.event.update.mockResolvedValue(eventRow({ status: "published" }));

    await updateEventStatus("e1", "published");

    expect(mockIndexEvent).toHaveBeenCalledTimes(1);
    expect(mockDeleteEvent).not.toHaveBeenCalled();
  });

  it("survives an index failure during a status change", async () => {
    mockPrisma.event.findUnique.mockResolvedValue(eventRow());
    mockPrisma.event.update.mockResolvedValue(eventRow({ status: "cancelled" }));
    mockDeleteEvent.mockRejectedValue(new Error("meilisearch offline"));

    await expect(updateEventStatus("e1", "cancelled")).resolves.toMatchObject({ id: "e1" });
  });

  // An unknown id must not reach prisma.update, where a raw P2025 would surface
  // as a 500 for what is a plain 404.
  it("rejects a status change on an unknown event without touching the index", async () => {
    mockPrisma.event.findUnique.mockResolvedValue(null);

    await expect(updateEventStatus("missing", "cancelled")).rejects.toMatchObject({ statusCode: 404 });
    expect(mockPrisma.event.update).not.toHaveBeenCalled();
    expect(mockIndexEvent).not.toHaveBeenCalled();
    expect(mockDeleteEvent).not.toHaveBeenCalled();
  });
});

describe("deleteEvent → search index", () => {
  it("removes the document after a hard delete", async () => {
    mockPrisma.eventRegistration.count.mockResolvedValue(0);
    mockPrisma.event.delete.mockResolvedValue(eventRow());

    await deleteEvent("e1");

    expect(mockDeleteEvent).toHaveBeenCalledWith("e1");
  });

  it("does not touch the index when the delete is refused (BL-62b)", async () => {
    mockPrisma.eventRegistration.count.mockResolvedValue(3);

    await expect(deleteEvent("e1")).rejects.toThrow();
    expect(mockDeleteEvent).not.toHaveBeenCalled();
    expect(mockPrisma.event.delete).not.toHaveBeenCalled();
  });
});

describe("searchPublishedEvents", () => {
  it("queries the index for published events only and re-fetches from the DB", async () => {
    mockSearchEvents.mockResolvedValue({ hits: [{ id: "e1", slug: "seminar-ai", title: "Seminar AI" }], total: 1 });
    mockPrisma.event.findMany.mockResolvedValue([{ id: "e1", slug: "seminar-ai", title: "Seminar AI" }]);

    const result = await searchPublishedEvents({ q: "ai", page: 1, limit: 12 });

    expect(mockSearchEvents).toHaveBeenCalledWith("ai", { limit: 12, offset: 0, filter: 'status = "published"' });
    expect(mockPrisma.event.findMany.mock.calls[0][0].where).toMatchObject({ status: "published" });
    expect(result.total).toBe(1);
  });

  // BL-63b: `total` describes the whole match set. Returning the page length
  // instead capped every search at a single page of results.
  it("reports the index-wide match count, not the size of the page", async () => {
    mockSearchEvents.mockResolvedValue({ hits: [{ id: "e1", slug: "seminar-ai", title: "Seminar AI" }], total: 37 });
    mockPrisma.event.findMany.mockResolvedValue([{ id: "e1", slug: "seminar-ai", title: "Seminar AI" }]);

    const result = await searchPublishedEvents({ q: "ai", page: 2, limit: 1 });

    expect(result.data).toHaveLength(1);
    expect(result.total).toBe(37);
  });

  it("never reports fewer results than it returns when the index lags", async () => {
    // A stale index can under-report; the caller must still be able to reach the
    // rows already handed to it on this page.
    mockSearchEvents.mockResolvedValue({ hits: [{ id: "e1", slug: "seminar-ai", title: "Seminar AI" }], total: 0 });
    mockPrisma.event.findMany.mockResolvedValue([{ id: "e1", slug: "seminar-ai", title: "Seminar AI" }]);

    const result = await searchPublishedEvents({ q: "ai", page: 2, limit: 10 });

    expect(result.total).toBe(11);
  });

  it("falls back to Prisma when Meilisearch is unavailable (degrade-safe)", async () => {
    // Mirrors the real client, which swallows connection errors and returns no hits.
    mockSearchEvents.mockResolvedValue({ hits: [], total: 0 });
    mockPrisma.event.findMany.mockResolvedValue([{ id: "e1", slug: "seminar-ai", title: "Seminar AI" }]);
    mockPrisma.event.count.mockResolvedValue(1);

    const result = await searchPublishedEvents({ q: "ai" });

    expect(result.total).toBe(1);
    expect(mockPrisma.event.findMany.mock.calls[0][0].where.status).toBe("published");
  });
});
