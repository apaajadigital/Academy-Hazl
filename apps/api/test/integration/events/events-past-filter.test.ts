import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import { app } from "../../../src/app.js";
import { prisma } from "../../../src/db/prisma.js";

vi.mock("../../../src/db/prisma.js", () => ({
  prisma: {
    event: {
      findMany: vi.fn(),
      count: vi.fn(),
    },
  },
}));

/**
 * The public catalogue must not advertise events that already happened.
 *
 * Context: on 10 Aug 2026 `GET /api/events` returned three published events
 * dated 14, 21 and 28 Jul — all in the past, two of them still priced and
 * sellable. Nothing is deleted by this filter; `past=true` remains available
 * for archive views.
 *
 * These assertions read the `where` clause handed to Prisma rather than the
 * rows returned, because the rows are mocked — what is being verified is the
 * query the service actually asks for.
 */
describe("GET /api/events — expiry filter", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(prisma.event.findMany).mockResolvedValue([] as never);
    vi.mocked(prisma.event.count).mockResolvedValue(0 as never);
  });

  /** The OR branch that decides which side of "now" the query looks at. */
  function whereOf(): { OR?: unknown[] } {
    return vi.mocked(prisma.event.findMany).mock.calls[0]![0]!.where as { OR?: unknown[] };
  }

  it("defaults to upcoming only (endDate ahead, or no endDate and startDate ahead)", async () => {
    const res = await request(app).get("/api/events");
    expect(res.status).toBe(200);

    const or = whereOf().OR as Array<Record<string, { gt?: Date; lte?: Date } | null>>;
    expect(or).toHaveLength(2);
    // `gt`, not `gte` — exact complement of isEventEnded's `<=`.
    expect(or[0]!.endDate).toHaveProperty("gt");
    expect(or[1]!.endDate).toBeNull();
    expect(or[1]!.startDate).toHaveProperty("gt");
  });

  it("keeps the published-only constraint alongside the date filter", async () => {
    await request(app).get("/api/events");
    expect(whereOf()).toMatchObject({ status: "published" });
  });

  it("flips to past events when past=true is passed explicitly", async () => {
    await request(app).get("/api/events?past=true");

    const or = whereOf().OR as Array<Record<string, { gt?: Date; lte?: Date } | null>>;
    expect(or[0]!.endDate).toHaveProperty("lte");
    expect(or[1]!.endDate).toBeNull();
    expect(or[1]!.startDate).toHaveProperty("lte");
  });

  it("treats any non-\"true\" past value as the safe default", async () => {
    for (const bad of ["false", "1", "yes", ""]) {
      vi.clearAllMocks();
      vi.mocked(prisma.event.findMany).mockResolvedValue([] as never);
      vi.mocked(prisma.event.count).mockResolvedValue(0 as never);
      await request(app).get(`/api/events?past=${bad}`);
      const or = whereOf().OR as Array<Record<string, { gt?: Date; lte?: Date } | null>>;
      expect(or[0]!.endDate, `past=${bad} must stay on upcoming`).toHaveProperty("gt");
    }
  });

  it("still honours type and featured filters together with the date filter", async () => {
    await request(app).get("/api/events?type=online&featured=true");
    expect(whereOf()).toMatchObject({ status: "published", type: "online", isFeatured: true });
    expect(whereOf().OR).toHaveLength(2);
  });
});
