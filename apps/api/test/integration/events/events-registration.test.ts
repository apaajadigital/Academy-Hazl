import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import jwt from "jsonwebtoken";
import { app } from "../../../src/app.js";

/**
 * E13/BL-65: coverage for the three event endpoints that had no test at all.
 *
 *   GET /api/events/:slug/registration      — "am I registered?" (any user)
 *   GET /api/events/admin/:id/registrations — attendee list (super_admin)
 *   GET /api/admin/events                   — admin catalog (super_admin)
 *
 * Unlike the sibling specs, `authenticate` is NOT mocked here: the real
 * middleware runs against a mocked `prisma.user` so the 401 paths are exercised
 * for real instead of being assumed.
 */
vi.mock("../../../src/db/prisma.js", () => ({
  prisma: {
    user: { findUnique: vi.fn() },
    event: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      count: vi.fn(),
    },
    eventRegistration: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
    },
  },
}));

const { prisma } = await import("../../../src/db/prisma.js");

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const STUDENT_DB_USER = {
  id: "user-1",
  email: "student@jago.id",
  isActive: true,
  deletedAt: null,
  roles: [{ role: "student" }],
};

const ADMIN_DB_USER = {
  id: "admin-1",
  email: "admin@jago.id",
  isActive: true,
  deletedAt: null,
  roles: [{ role: "super_admin" }],
};

const STUDENT_AUTH = {
  Authorization: `Bearer ${jwt.sign({ sub: "user-1", email: "student@jago.id", roles: ["student"] }, process.env.JWT_SECRET!, { expiresIn: "15m" })}`,
};

const ADMIN_AUTH = {
  Authorization: `Bearer ${jwt.sign({ sub: "admin-1", email: "admin@jago.id", roles: ["super_admin"] }, process.env.JWT_SECRET!, { expiresIn: "15m" })}`,
};

const EVENT = {
  id: "event-1",
  slug: "workshop-ui-ux",
  title: "Workshop UI/UX",
  status: "published",
  type: "online",
  startDate: new Date("2026-09-01T09:00:00.000Z"),
};

const REGISTRATION = {
  id: "reg-1",
  eventId: "event-1",
  userId: "user-1",
  ticketCode: "TKT-0001",
  status: "confirmed",
  attendedAt: null,
  createdAt: new Date("2026-08-01T00:00:00.000Z"),
};

beforeEach(() => {
  vi.clearAllMocks();
  // Default identity: the student. Admin cases override this per test.
  vi.mocked(prisma.user.findUnique).mockResolvedValue(STUDENT_DB_USER as never);
  vi.mocked(prisma.event.findUnique).mockResolvedValue(EVENT as never);
});

/** Make the real `authenticate` middleware resolve to the super-admin user. */
function asAdmin(): void {
  vi.mocked(prisma.user.findUnique).mockResolvedValue(ADMIN_DB_USER as never);
}

// ─── GET /api/events/:slug/registration ───────────────────────────────────────

describe("GET /api/events/:slug/registration", () => {
  it("returns 401 without an Authorization header", async () => {
    const res = await request(app).get("/api/events/workshop-ui-ux/registration");

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe("UNAUTHORIZED");
    // The handler must never run for an anonymous caller.
    expect(vi.mocked(prisma.eventRegistration.findUnique)).not.toHaveBeenCalled();
  });

  it("returns 401 for a malformed bearer token", async () => {
    const res = await request(app)
      .get("/api/events/workshop-ui-ux/registration")
      .set({ Authorization: "Bearer not-a-jwt" });

    expect(res.status).toBe(401);
    expect(vi.mocked(prisma.eventRegistration.findUnique)).not.toHaveBeenCalled();
  });

  it("returns the registration when the user is already registered", async () => {
    vi.mocked(prisma.eventRegistration.findUnique).mockResolvedValue(REGISTRATION as never);

    const res = await request(app)
      .get("/api/events/workshop-ui-ux/registration")
      .set(STUDENT_AUTH);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toMatchObject({
      id: "reg-1",
      status: "confirmed",
      ticketCode: "TKT-0001",
    });
  });

  it("returns success with a null payload when the user has NOT registered", async () => {
    // Contract check (not an assumption): the service returns the raw
    // findUnique result, so "no registration" is `data: null` with HTTP 200 —
    // this is what EventDetailClient relies on to show the register CTA.
    vi.mocked(prisma.eventRegistration.findUnique).mockResolvedValue(null);

    const res = await request(app)
      .get("/api/events/workshop-ui-ux/registration")
      .set(STUDENT_AUTH);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toBeNull();
  });

  it("scopes the lookup to the authenticated user and the resolved event", async () => {
    vi.mocked(prisma.eventRegistration.findUnique).mockResolvedValue(null);

    await request(app).get("/api/events/workshop-ui-ux/registration").set(STUDENT_AUTH);

    expect(vi.mocked(prisma.event.findUnique)).toHaveBeenCalledWith({
      where: { slug: "workshop-ui-ux" },
    });
    expect(vi.mocked(prisma.eventRegistration.findUnique)).toHaveBeenCalledWith({
      where: { eventId_userId: { eventId: "event-1", userId: "user-1" } },
    });
  });

  it("returns 404 when the slug does not resolve to an event", async () => {
    vi.mocked(prisma.event.findUnique).mockResolvedValue(null);

    const res = await request(app)
      .get("/api/events/tidak-ada/registration")
      .set(STUDENT_AUTH);

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
    expect(vi.mocked(prisma.eventRegistration.findUnique)).not.toHaveBeenCalled();
  });
});

// ─── GET /api/events/admin/:id/registrations ──────────────────────────────────

describe("GET /api/events/admin/:id/registrations", () => {
  const ATTENDEES = [
    {
      id: "reg-2",
      eventId: "event-1",
      ticketCode: "TKT-0002",
      status: "confirmed",
      attendedAt: null,
      user: { id: "user-2", name: "Sari", email: "sari@jago.id" },
    },
    {
      ...REGISTRATION,
      user: { id: "user-1", name: "Budi", email: "budi@jago.id" },
    },
  ];

  it("returns the attendee list for a super_admin", async () => {
    asAdmin();
    vi.mocked(prisma.eventRegistration.findMany).mockResolvedValue(ATTENDEES as never);

    const res = await request(app)
      .get("/api/events/admin/event-1/registrations")
      .set(ADMIN_AUTH);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveLength(2);
    // The check-in screen needs both the ticket code and the attendee identity.
    expect(res.body.data[0].ticketCode).toBe("TKT-0002");
    expect(res.body.data[0].user.email).toBe("sari@jago.id");
  });

  it("queries only the requested event, newest registration first", async () => {
    asAdmin();
    vi.mocked(prisma.eventRegistration.findMany).mockResolvedValue([] as never);

    await request(app).get("/api/events/admin/event-1/registrations").set(ADMIN_AUTH);

    expect(vi.mocked(prisma.eventRegistration.findMany)).toHaveBeenCalledWith({
      where: { eventId: "event-1" },
      include: { user: { select: { id: true, name: true, email: true } } },
      orderBy: { createdAt: "desc" },
    });
  });

  it("returns an empty array (not 404) when the event has no attendees yet", async () => {
    asAdmin();
    vi.mocked(prisma.eventRegistration.findMany).mockResolvedValue([] as never);

    const res = await request(app)
      .get("/api/events/admin/event-1/registrations")
      .set(ADMIN_AUTH);

    expect(res.status).toBe(200);
    expect(res.body.data).toEqual([]);
  });

  it("returns 401 without auth", async () => {
    const res = await request(app).get("/api/events/admin/event-1/registrations");

    expect(res.status).toBe(401);
    expect(vi.mocked(prisma.eventRegistration.findMany)).not.toHaveBeenCalled();
  });
});

// ─── GET /api/admin/events ────────────────────────────────────────────────────

describe("GET /api/admin/events", () => {
  const ADMIN_EVENTS = [
    { ...EVENT, id: "event-1" },
    { ...EVENT, id: "event-2", slug: "bootcamp-data", title: "Bootcamp Data", status: "draft" },
  ];

  it("returns the list with `total` in meta and never inside data", async () => {
    asAdmin();
    vi.mocked(prisma.event.findMany).mockResolvedValue(ADMIN_EVENTS as never);
    vi.mocked(prisma.event.count).mockResolvedValue(2);

    const res = await request(app).get("/api/admin/events").set(ADMIN_AUTH);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    // Contract (BL-65): `data` is the bare array; pagination lives in `meta`.
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data).toHaveLength(2);
    expect(res.body.meta).toEqual({ total: 2, page: 1, limit: 20 });
  });

  it("applies the status and search filters", async () => {
    asAdmin();
    vi.mocked(prisma.event.findMany).mockResolvedValue([] as never);
    vi.mocked(prisma.event.count).mockResolvedValue(0);

    await request(app)
      .get("/api/admin/events?status=draft&search=bootcamp&page=2&limit=5")
      .set(ADMIN_AUTH);

    expect(vi.mocked(prisma.event.findMany)).toHaveBeenCalledWith({
      where: { status: "draft", title: { contains: "bootcamp", mode: "insensitive" } },
      skip: 5,
      take: 5,
      orderBy: { startDate: "desc" },
    });
  });

  it("rejects a limit above the 100 ceiling", async () => {
    asAdmin();

    const res = await request(app).get("/api/admin/events?limit=500").set(ADMIN_AUTH);

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(vi.mocked(prisma.event.findMany)).not.toHaveBeenCalled();
  });

  it("returns 403 for an authenticated non-admin", async () => {
    const res = await request(app).get("/api/admin/events").set(STUDENT_AUTH);

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe("FORBIDDEN");
    expect(vi.mocked(prisma.event.findMany)).not.toHaveBeenCalled();
  });

  it("returns 401 without auth", async () => {
    const res = await request(app).get("/api/admin/events");

    expect(res.status).toBe(401);
    expect(vi.mocked(prisma.event.findMany)).not.toHaveBeenCalled();
  });
});

// ─── PATCH /api/admin/events/:id — auth boundary ──────────────────────────────

describe("PATCH /api/admin/events/:id auth boundary", () => {
  it("returns 401 without auth", async () => {
    const res = await request(app)
      .patch("/api/admin/events/event-1")
      .send({ status: "published" });

    expect(res.status).toBe(401);
  });

  it("returns 403 for an authenticated non-admin", async () => {
    const res = await request(app)
      .patch("/api/admin/events/event-1")
      .set(STUDENT_AUTH)
      .send({ status: "published" });

    expect(res.status).toBe(403);
  });
});
