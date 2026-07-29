import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import { app } from "../../../src/app.js";

/**
 * BL-59: the six duplicated `roles.includes("super_admin" as never)` checks in
 * routes/events.ts were replaced by the shared `authorize()` middleware. These
 * tests pin the resulting behaviour for a NON-admin (student) session: every
 * admin endpoint must answer 403 and never reach Prisma.
 */
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
    req.user = { id: "user-2", email: "student@test.com", roles: ["student"] };
    next();
  }),
}));

const { prisma } = await import("../../../src/db/prisma.js");

beforeEach(() => {
  vi.clearAllMocks();
});

describe("events admin RBAC (non-super_admin)", () => {
  const cases: Array<[string, () => request.Test]> = [
    ["GET /api/events/admin/all", () => request(app).get("/api/events/admin/all")],
    ["GET /api/events/admin/:id", () => request(app).get("/api/events/admin/event-1")],
    ["POST /api/events/admin", () => request(app).post("/api/events/admin").send({ slug: "abc", title: "Abc Event" })],
    ["PATCH /api/events/admin/:id", () => request(app).patch("/api/events/admin/event-1").send({ title: "Renamed" })],
    ["DELETE /api/events/admin/:id", () => request(app).delete("/api/events/admin/event-1")],
    ["GET /api/events/admin/:id/registrations", () => request(app).get("/api/events/admin/event-1/registrations")],
    ["POST /api/events/admin/checkin", () => request(app).post("/api/events/admin/checkin").send({ ticketCode: "T-1" })],
  ];

  for (const [name, call] of cases) {
    it(`${name} returns 403`, async () => {
      const res = await call();

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe("FORBIDDEN");
    });
  }

  it("never touches the database for a forbidden request", async () => {
    await request(app).delete("/api/events/admin/event-1");

    expect(vi.mocked(prisma.event.delete)).not.toHaveBeenCalled();
    expect(vi.mocked(prisma.eventRegistration.count)).not.toHaveBeenCalled();
  });
});
