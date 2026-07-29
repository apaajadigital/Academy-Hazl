import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import jwt from "jsonwebtoken";
import { app } from "../../../src/app.js";

/**
 * BL-78c: `GET /api/trainer/courses` exists so apps/web trainer-hub/kursus stops
 * calling `GET /api/trainer/dashboard` (revenue/refund/payout aggregates + the
 * withdrawable-balance computation) just to read `data.courses`.
 *
 * The contract these tests defend is the ITEM SHAPE: the page renders the same
 * object from either endpoint, so the two must stay field-for-field identical.
 */
vi.mock("../../../src/db/prisma.js", () => ({
  prisma: {
    user: { findUnique: vi.fn() },
    course: { findMany: vi.fn(), count: vi.fn() },
    courseEnrollment: { count: vi.fn() },
    orderItem: { aggregate: vi.fn() },
    trainerPayout: { count: vi.fn(), aggregate: vi.fn() },
    $queryRaw: vi.fn(),
  },
}));

const { prisma } = await import("../../../src/db/prisma.js");

const TRAINER_TOKEN = jwt.sign(
  { sub: "trainer-1", email: "trainer@jago.id", roles: ["trainer"] },
  process.env.JWT_SECRET!,
  { expiresIn: "15m" },
);
const STUDENT_TOKEN = jwt.sign(
  { sub: "student-1", email: "student@jago.id", roles: ["student"] },
  process.env.JWT_SECRET!,
  { expiresIn: "15m" },
);

const TRAINER_AUTH = { Authorization: `Bearer ${TRAINER_TOKEN}` };
const STUDENT_AUTH = { Authorization: `Bearer ${STUDENT_TOKEN}` };

const VALID_TRAINER = {
  id: "trainer-1",
  email: "trainer@jago.id",
  isActive: true,
  deletedAt: null,
  roles: [{ role: "trainer" }],
};

const VALID_STUDENT = {
  id: "student-1",
  email: "student@jago.id",
  isActive: true,
  deletedAt: null,
  roles: [{ role: "student" }],
};

/** One row exactly as the `TRAINER_COURSE_LIST_SELECT` projection returns it. */
const COURSE_ROW = {
  id: "course-1",
  title: "Kursus A",
  status: "published",
  price: 299_000,
  _count: { enrollments: 12 },
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(prisma.user.findUnique).mockResolvedValue(VALID_TRAINER as never);
  vi.mocked(prisma.course.findMany).mockResolvedValue([COURSE_ROW] as never);
  vi.mocked(prisma.course.count).mockResolvedValue(1 as never);
  // Inputs the dashboard additionally needs (this endpoint must not touch them).
  vi.mocked(prisma.courseEnrollment.count).mockResolvedValue(12 as never);
  vi.mocked(prisma.trainerPayout.count).mockResolvedValue(0 as never);
  vi.mocked(prisma.orderItem.aggregate).mockResolvedValue({
    _sum: { totalPrice: 10_000_000 },
  } as never);
  vi.mocked(prisma.trainerPayout.aggregate).mockResolvedValue({
    _sum: { amount: 2_000_000 },
  } as never);
  vi.mocked(prisma.$queryRaw).mockResolvedValue([{ refunded: "1000000" }] as never);
});

describe("GET /api/trainer/courses", () => {
  it("returns 200 with data as a flat array and pagination in meta", async () => {
    const res = await request(app).get("/api/trainer/courses").set(TRAINER_AUTH);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    // apps/web reads body.data as an array — page info belongs in meta.
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.meta).toMatchObject({ total: 1, page: 1, limit: 20 });
  });

  it("returns the exact item shape, field for field", async () => {
    const res = await request(app).get("/api/trainer/courses").set(TRAINER_AUTH);

    const item = res.body.data[0];
    expect(item).toEqual({
      id: "course-1",
      title: "Kursus A",
      status: "published",
      price: 299_000,
      enrollments: 12,
    });
    // No extra fields either: the shape is a contract, not a superset.
    expect(Object.keys(item).sort()).toEqual(["enrollments", "id", "price", "status", "title"]);
    expect(typeof item.price).toBe("number");
    expect(typeof item.enrollments).toBe("number");
  });

  it("item shape is identical to GET /dashboard's `courses` element", async () => {
    const list = await request(app).get("/api/trainer/courses").set(TRAINER_AUTH);
    const dashboard = await request(app).get("/api/trainer/dashboard").set(TRAINER_AUTH);

    expect(list.status).toBe(200);
    expect(dashboard.status).toBe(200);
    // Same row in, same object out — this is the assertion that breaks if the
    // two endpoints ever drift apart.
    expect(list.body.data[0]).toEqual(dashboard.body.data.courses[0]);
  });

  it("applies bounded page/limit params", async () => {
    const res = await request(app).get("/api/trainer/courses?page=3&limit=5").set(TRAINER_AUTH);

    expect(res.status).toBe(200);
    expect(prisma.course.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ skip: 10, take: 5, where: { trainerId: "trainer-1" } }),
    );
    expect(res.body.meta).toMatchObject({ total: 1, page: 3, limit: 5 });
  });

  it("caps an oversized limit at MAX_LIMIT", async () => {
    const res = await request(app).get("/api/trainer/courses?limit=99999").set(TRAINER_AUTH);

    expect(res.status).toBe(200);
    expect(prisma.course.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ take: 100 }), // MAX_LIMIT from lib/pagination
    );
    expect(res.body.meta).toMatchObject({ limit: 100 });
  });

  it("orders deterministically so pages cannot repeat a row", async () => {
    await request(app).get("/api/trainer/courses").set(TRAINER_AUTH);

    expect(prisma.course.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ orderBy: { createdAt: "desc" } }),
    );
  });

  it("selects only the listed columns and counts enrollments instead of loading them", async () => {
    await request(app).get("/api/trainer/courses").set(TRAINER_AUTH);

    const args = vi.mocked(prisma.course.findMany).mock.calls[0][0] as {
      select: Record<string, unknown>;
      include?: unknown;
    };
    expect(args.select).toEqual({
      id: true,
      title: true,
      status: true,
      price: true,
      _count: { select: { enrollments: true } },
    });
    // Loading the enrollment rows would pull every learner into memory for a list.
    expect(args.select).not.toHaveProperty("enrollments");
    expect(args.include).toBeUndefined();
  });

  it("does none of the dashboard's money work (the point of the endpoint)", async () => {
    const res = await request(app).get("/api/trainer/courses").set(TRAINER_AUTH);

    expect(res.status).toBe(200);
    expect(prisma.orderItem.aggregate).not.toHaveBeenCalled();
    expect(prisma.trainerPayout.aggregate).not.toHaveBeenCalled();
    expect(prisma.trainerPayout.count).not.toHaveBeenCalled();
    expect(prisma.courseEnrollment.count).not.toHaveBeenCalled();
    expect(prisma.$queryRaw).not.toHaveBeenCalled();
  });

  it("scopes the list to the authenticated trainer", async () => {
    await request(app).get("/api/trainer/courses").set(TRAINER_AUTH);

    expect(prisma.course.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { trainerId: "trainer-1" } }),
    );
    expect(prisma.course.count).toHaveBeenCalledWith({ where: { trainerId: "trainer-1" } });
  });

  it("returns 403 for a student (requireTrainer)", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(VALID_STUDENT as never);

    const res = await request(app).get("/api/trainer/courses").set(STUDENT_AUTH);

    expect(res.status).toBe(403);
    expect(prisma.course.findMany).not.toHaveBeenCalled();
  });

  it("returns 401 without auth", async () => {
    const res = await request(app).get("/api/trainer/courses");

    expect(res.status).toBe(401);
    expect(prisma.course.findMany).not.toHaveBeenCalled();
  });
});
