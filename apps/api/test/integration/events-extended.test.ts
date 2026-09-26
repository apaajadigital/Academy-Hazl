import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import { app } from "../../src/app.js";

vi.mock("../../src/db/prisma.js", () => ({
  prisma: {
    event: {
      findMany: vi.fn(), findUnique: vi.fn(), count: vi.fn(),
      create: vi.fn(), update: vi.fn(), delete: vi.fn(),
    },
    eventRegistration: {
      findUnique: vi.fn(), findMany: vi.fn(), count: vi.fn(),
      create: vi.fn(), update: vi.fn(),
    },
    ticket: { findFirst: vi.fn(), findMany: vi.fn(), create: vi.fn() },
  },
}));

vi.mock("../../src/middleware/authenticate.js", () => ({
  authenticate: vi.fn((req, _res, next) => {
    req.user = { id: "user-1", email: "user@test.com", roles: ["super_admin"] };
    next();
  }),
}));

const { prisma } = await import("../../src/db/prisma.js");
const m = prisma as unknown as Record<string, Record<string, ReturnType<typeof vi.fn>>>;

// ─── Public event routes ───────────────────────────────────────────────────────

describe("GET /api/events", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns published events with pagination", async () => {
    m.event.findMany.mockResolvedValue([
      {
        id: "ev1", slug: "workshop-marketing", title: "Workshop Marketing",
        type: "workshop", startDate: new Date(), endDate: new Date(),
        location: "Jakarta", isOnline: false, isPaid: true,
        price: 350000, status: "published", maxAttendees: 50,
        _count: { registrations: 20 },
      },
    ]);
    m.event.count.mockResolvedValue(1);

    const res = await request(app).get("/api/events");
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.meta.total).toBe(1);
  });

  it("filters events by type", async () => {
    m.event.findMany.mockResolvedValue([]);
    m.event.count.mockResolvedValue(0);

    const res = await request(app).get("/api/events?type=webinar");
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(0);
  });

  it("filters free events", async () => {
    m.event.findMany.mockResolvedValue([]);
    m.event.count.mockResolvedValue(0);

    const res = await request(app).get("/api/events?free=true");
    expect(res.status).toBe(200);
  });

  it("filters online events", async () => {
    m.event.findMany.mockResolvedValue([]);
    m.event.count.mockResolvedValue(0);

    const res = await request(app).get("/api/events?online=true");
    expect(res.status).toBe(200);
  });
});

describe("GET /api/events/:slug", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns event detail by slug", async () => {
    m.event.findUnique.mockResolvedValue({
      id: "ev1", slug: "workshop-marketing", title: "Workshop Marketing",
      description: "Deskripsi workshop", type: "workshop",
      startDate: new Date(), endDate: new Date(),
      location: "Jakarta", isOnline: false, isPaid: true,
      price: 350000, status: "published", maxAttendees: 50,
      _count: { registrations: 20 },
    });

    const res = await request(app).get("/api/events/workshop-marketing");
    expect(res.status).toBe(200);
    expect(res.body.data.slug).toBe("workshop-marketing");
  });

  it("returns 404 for unknown event slug", async () => {
    m.event.findUnique.mockResolvedValue(null);
    const res = await request(app).get("/api/events/tidak-ada");
    expect(res.status).toBe(404);
  });
});

describe("GET /api/events/my/tickets", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns user ticket list", async () => {
    m.eventRegistration.findMany.mockResolvedValue([
      {
        id: "reg1", userId: "user-1", status: "confirmed",
        registeredAt: new Date(), ticketCode: "TKT-001",
        event: { id: "ev1", title: "Workshop Marketing", startDate: new Date(), location: "Jakarta" },
      },
    ]);

    const res = await request(app).get("/api/events/my/tickets");
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
  });
});

// ─── Admin event routes ────────────────────────────────────────────────────────

describe("GET /api/events/admin/all", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns all events for admin", async () => {
    m.event.findMany.mockResolvedValue([
      { id: "ev1", slug: "workshop-marketing", title: "Workshop Marketing", status: "published", _count: { registrations: 20 } },
    ]);
    m.event.count.mockResolvedValue(1);

    const res = await request(app).get("/api/events/admin/all");
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
  });
});

describe("POST /api/events/admin", () => {
  beforeEach(() => vi.clearAllMocks());

  it("creates a new event", async () => {
    m.event.create.mockResolvedValue({
      id: "ev2", slug: "webinar-desain", title: "Webinar Desain",
      type: "webinar", startDate: new Date(), endDate: new Date(),
      location: "Online", isOnline: true, isPaid: false,
      price: 0, status: "draft", maxAttendees: 200,
    });

    const res = await request(app).post("/api/events/admin").send({
      title: "Webinar Desain",
      slug: "webinar-desain",
      type: "online",
      startDate: new Date(Date.now() + 7 * 86400000).toISOString(),
      endDate: new Date(Date.now() + 7 * 86400000 + 3600000).toISOString(),
      location: "Online",
      isOnline: true,
      isPaid: false,
      price: 0,
      maxAttendees: 200,
    });
    expect([200, 201]).toContain(res.status);
  });

  it("returns validation error for missing required fields", async () => {
    const res = await request(app).post("/api/events/admin").send({ title: "Incomplete" });
    expect([400, 422]).toContain(res.status);
  });
});

describe("PATCH /api/events/admin/:id", () => {
  beforeEach(() => vi.clearAllMocks());

  it("updates event status", async () => {
    m.event.findUnique.mockResolvedValue({ id: "ev1" });
    m.event.update.mockResolvedValue({ id: "ev1", status: "published" });

    const res = await request(app).patch("/api/events/admin/ev1").send({ status: "published" });
    expect([200, 201]).toContain(res.status);
  });
});

describe("DELETE /api/events/admin/:id", () => {
  beforeEach(() => vi.clearAllMocks());

  it("deletes event when no registrations", async () => {
    m.event.findUnique.mockResolvedValue({ id: "ev1", _count: { registrations: 0 } });
    m.event.delete.mockResolvedValue({ id: "ev1" });

    const res = await request(app).delete("/api/events/admin/ev1");
    expect([200, 204]).toContain(res.status);
  });
});
