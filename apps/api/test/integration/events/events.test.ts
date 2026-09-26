import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import { app } from "../../../src/app.js";

vi.mock("../../../src/db/prisma.js", () => ({
  prisma: {
    event: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      count: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    eventRegistration: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      count: vi.fn(),
    },
  },
}));

vi.mock("../../../src/middleware/authenticate.js", () => ({
  authenticate: vi.fn((req, _res, next) => {
    req.user = { id: "user-1", email: "user@test.com", name: "Test", roles: ["super_admin"] };
    next();
  }),
}));

const { prisma } = await import("../../../src/db/prisma.js");
const { listAllEvents } = await import("../../../src/services/event/eventService.js");

const mockEvent = {
  id: "event-1",
  slug: "workshop-ui-ux",
  title: "Workshop UI/UX",
  description: "Belajar UI/UX",
  type: "online",
  status: "published",
  startDate: new Date("2026-07-01"),
  endDate: null,
  location: null,
  venue: null,
  price: "150000",
  salePrice: null,
  quota: 100,
  totalSold: 10,
  coverUrl: null,
  speakerName: "Budi Santoso",
  speakerBio: null,
  isFeatured: false,
  createdAt: new Date(),
  updatedAt: new Date(),
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(prisma.event.findMany).mockResolvedValue([mockEvent] as never);
  vi.mocked(prisma.event.findUnique).mockResolvedValue(mockEvent as never);
  vi.mocked(prisma.event.count).mockResolvedValue(1);
  vi.mocked(prisma.eventRegistration.count).mockResolvedValue(0);
});

describe("GET /api/events", () => {
  it("returns list of published events", async () => {
    const res = await request(app).get("/api/events");

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.meta.total).toBe(1);
  });

  it("accepts type filter", async () => {
    const res = await request(app).get("/api/events?type=online");

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it("accepts featured filter", async () => {
    vi.mocked(prisma.event.findMany).mockResolvedValue([{ ...mockEvent, isFeatured: true }] as never);

    const res = await request(app).get("/api/events?featured=true");

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  // BL-59: query params are Zod-validated at the boundary.
  it("returns 400 when limit exceeds the 50 ceiling", async () => {
    const res = await request(app).get("/api/events?limit=500");

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("returns 400 for a non-numeric page", async () => {
    const res = await request(app).get("/api/events?page=abc");

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });
});

describe("GET /api/events/:slug", () => {
  it("returns event detail for published event", async () => {
    const res = await request(app).get("/api/events/workshop-ui-ux");

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.slug).toBe("workshop-ui-ux");
  });

  it("returns 404 for non-existent slug", async () => {
    vi.mocked(prisma.event.findUnique).mockResolvedValue(null);

    const res = await request(app).get("/api/events/tidak-ada");

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });

  it("returns 404 for draft event", async () => {
    vi.mocked(prisma.event.findUnique).mockResolvedValue({ ...mockEvent, status: "draft" } as never);

    const res = await request(app).get("/api/events/workshop-ui-ux");

    expect(res.status).toBe(404);
  });
});

describe("GET /api/events/my/tickets", () => {
  it("returns user registrations", async () => {
    vi.mocked(prisma.eventRegistration.findMany).mockResolvedValue([
      {
        id: "reg-1",
        eventId: "event-1",
        userId: "user-1",
        ticketCode: "TKT-001",
        status: "confirmed",
        event: { id: "event-1", slug: "workshop-ui-ux", title: "Workshop UI/UX", type: "online", startDate: new Date(), endDate: null, location: null, venue: null, coverUrl: null },
      },
    ] as never);

    const res = await request(app).get("/api/events/my/tickets");

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
  });
});

describe("POST /api/events/admin", () => {
  it("creates event when admin", async () => {
    vi.mocked(prisma.event.findUnique).mockResolvedValue(null);
    vi.mocked(prisma.event.create).mockResolvedValue({ ...mockEvent, id: "event-new" } as never);

    const res = await request(app).post("/api/events/admin").send({
      slug: "workshop-ui-ux",
      title: "Workshop UI/UX",
      type: "online",
      status: "published",
      startDate: "2026-07-01T09:00:00.000Z",
      price: 150000,
    });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
  });

  it("returns 400 when slug already exists", async () => {
    vi.mocked(prisma.event.findUnique).mockResolvedValue(mockEvent as never);

    const res = await request(app).post("/api/events/admin").send({
      slug: "workshop-ui-ux",
      title: "Workshop UI/UX",
      type: "online",
      status: "published",
      startDate: "2026-07-01T09:00:00.000Z",
      price: 150000,
    });

    expect(res.status).toBe(400);
    expect(res.body.error.message).toContain("Slug");
  });

  it("returns 400 when required fields missing", async () => {
    const res = await request(app).post("/api/events/admin").send({ title: "Missing slug" });

    expect(res.status).toBe(400);
  });
});

describe("POST /api/events/admin/checkin", () => {
  it("marks ticket as attended", async () => {
    vi.mocked(prisma.eventRegistration.findUnique).mockResolvedValue({
      id: "reg-1",
      eventId: "event-1",
      userId: "user-1",
      ticketCode: "TKT-001",
      status: "confirmed",
      attendedAt: null,
    } as never);
    vi.mocked(prisma.eventRegistration.update).mockResolvedValue({
      id: "reg-1",
      status: "attended",
      attendedAt: new Date(),
      user: { name: "Test", email: "test@test.com" },
      event: { title: "Workshop" },
    } as never);

    const res = await request(app).post("/api/events/admin/checkin").send({ ticketCode: "TKT-001" });

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe("attended");
  });

  it("returns 404 for invalid ticket code", async () => {
    vi.mocked(prisma.eventRegistration.findUnique).mockResolvedValue(null);

    const res = await request(app).post("/api/events/admin/checkin").send({ ticketCode: "INVALID" });

    expect(res.status).toBe(404);
  });

  it("returns 400 when ticket already scanned", async () => {
    vi.mocked(prisma.eventRegistration.findUnique).mockResolvedValue({
      id: "reg-1",
      status: "attended",
      attendedAt: new Date(),
    } as never);

    const res = await request(app).post("/api/events/admin/checkin").send({ ticketCode: "TKT-001" });

    expect(res.status).toBe(400);
    expect(res.body.error.message).toContain("sudah pernah");
  });

  it("returns 400 when ticket not confirmed", async () => {
    vi.mocked(prisma.eventRegistration.findUnique).mockResolvedValue({
      id: "reg-1",
      status: "pending",
      attendedAt: null,
    } as never);

    const res = await request(app).post("/api/events/admin/checkin").send({ ticketCode: "TKT-001" });

    expect(res.status).toBe(400);
    expect(res.body.error.message).toContain("belum confirmed");
  });

  // BL-59: ticketCode is now enforced by Zod at the boundary.
  it("returns 400 when ticketCode is missing", async () => {
    const res = await request(app).post("/api/events/admin/checkin").send({});

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
    expect(vi.mocked(prisma.eventRegistration.findUnique)).not.toHaveBeenCalled();
  });
});

// ─── BL-62b: delete guard ─────────────────────────────────────────────────────

describe("DELETE /api/events/admin/:id", () => {
  it("returns 409 and keeps the event when registrations exist", async () => {
    vi.mocked(prisma.eventRegistration.count).mockResolvedValue(3);

    const res = await request(app).delete("/api/events/admin/event-1");

    expect(res.status).toBe(409);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe("CONFLICT");
    expect(res.body.error.message).toContain("cancelled");
    // The paid registrations — and the event itself — must survive.
    expect(vi.mocked(prisma.event.delete)).not.toHaveBeenCalled();
  });

  it("deletes the event when it has no registrations", async () => {
    vi.mocked(prisma.eventRegistration.count).mockResolvedValue(0);
    vi.mocked(prisma.event.delete).mockResolvedValue(mockEvent as never);

    const res = await request(app).delete("/api/events/admin/event-1");

    expect(res.status).toBe(200);
    expect(res.body.data.id).toBe("event-1");
    expect(vi.mocked(prisma.event.delete)).toHaveBeenCalledWith({ where: { id: "event-1" } });
  });
});

// ─── BL-59: admin status patch validation ────────────────────────────────────

describe("PATCH /api/admin/events/:id", () => {
  it("rejects an unknown status value", async () => {
    const res = await request(app).patch("/api/admin/events/event-1").send({ status: "bogus" });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
    expect(vi.mocked(prisma.event.update)).not.toHaveBeenCalled();
  });

  it("applies a valid status", async () => {
    vi.mocked(prisma.event.update).mockResolvedValue({ ...mockEvent, status: "cancelled" } as never);

    const res = await request(app).patch("/api/admin/events/event-1").send({ status: "cancelled" });

    expect(res.status).toBe(200);
    expect(vi.mocked(prisma.event.update)).toHaveBeenCalledWith({
      where: { id: "event-1" },
      data: { status: "cancelled" },
    });
  });

  // An unknown id used to hit prisma.update directly, where Prisma's P2025
  // escaped as a 500. The pre-check now matches createEvent/updateEvent/delete.
  it("returns a clean 404 for an unknown event id", async () => {
    vi.mocked(prisma.event.findUnique).mockResolvedValue(null);

    const res = await request(app).patch("/api/admin/events/tidak-ada").send({ status: "cancelled" });

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
    expect(res.body.error.message).toContain("tidak ditemukan");
    expect(vi.mocked(prisma.event.update)).not.toHaveBeenCalled();
  });
});

// ─── Admin detail by id: replaces the web client's 20-request page walk ───────

describe("GET /api/events/admin/:id", () => {
  it("returns the event, including a non-published one", async () => {
    vi.mocked(prisma.event.findUnique).mockResolvedValue({ ...mockEvent, status: "draft" } as never);

    const res = await request(app).get("/api/events/admin/event-1");

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.id).toBe("event-1");
    expect(res.body.data.status).toBe("draft");
    expect(vi.mocked(prisma.event.findUnique)).toHaveBeenCalledWith({ where: { id: "event-1" } });
  });

  it("returns 404 for an unknown id", async () => {
    vi.mocked(prisma.event.findUnique).mockResolvedValue(null);

    const res = await request(app).get("/api/events/admin/tidak-ada");

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
    expect(res.body.error.message).toContain("tidak ditemukan");
  });

  // The literal route must keep winning over the parameterised one.
  it("does not shadow GET /api/events/admin/all", async () => {
    const res = await request(app).get("/api/events/admin/all");

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.meta.total).toBe(1);
  });
});

// ─── /admin/all forwards the filters instead of dropping them at the boundary ──

describe("GET /api/events/admin/all filters", () => {
  it("passes status and search through to the query", async () => {
    const res = await request(app).get("/api/events/admin/all?status=draft&search=ui");

    expect(res.status).toBe(200);
    expect(vi.mocked(prisma.event.findMany).mock.calls[0][0]).toMatchObject({
      where: { status: "draft", title: { contains: "ui", mode: "insensitive" } },
    });
  });

  it("still lists every status when no filter is sent", async () => {
    const res = await request(app).get("/api/events/admin/all");

    expect(res.status).toBe(200);
    expect(vi.mocked(prisma.event.findMany).mock.calls[0][0]).toMatchObject({ where: {} });
  });
});

// ─── listAllEvents: status/search filters are applied, not silently dropped ───

describe("eventService.listAllEvents", () => {
  it("lists every status when no filter is given", async () => {
    const result = await listAllEvents({ page: 1, limit: 20 });

    expect(vi.mocked(prisma.event.findMany).mock.calls[0][0]).toMatchObject({ where: {} });
    expect(result.total).toBe(1);
  });

  it("applies the status filter to both the page and its count", async () => {
    await listAllEvents({ page: 1, limit: 20, status: "draft" });

    expect(vi.mocked(prisma.event.findMany).mock.calls[0][0]).toMatchObject({ where: { status: "draft" } });
    expect(vi.mocked(prisma.event.count)).toHaveBeenCalledWith({ where: { status: "draft" } });
  });

  it("applies a case-insensitive title search", async () => {
    await listAllEvents({ search: "ui/ux" });

    expect(vi.mocked(prisma.event.findMany).mock.calls[0][0]).toMatchObject({
      where: { title: { contains: "ui/ux", mode: "insensitive" } },
    });
  });
});
