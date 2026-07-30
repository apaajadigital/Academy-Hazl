import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import { app } from "../../../src/app.js";
import jwt from "jsonwebtoken";

vi.mock("../../../src/db/prisma.js", () => ({
  prisma: {
    user: { findUnique: vi.fn() },
    course: { findUnique: vi.fn() },
    order: { findFirst: vi.fn() },
    courseEnrollment: {
      findUnique: vi.fn(),
      create: vi.fn(),
      findMany: vi.fn(),
    },
  },
}));

const { prisma } = await import("../../../src/db/prisma.js");

const VALID_USER = { id: "user-1", email: "a@b.com", isActive: true, deletedAt: null, roles: [{ role: "student" }] };

const ACCESS_TOKEN = jwt.sign(
  { sub: "user-1", email: "a@b.com", roles: ["student"] },
  process.env.JWT_SECRET!,
  { expiresIn: "15m" }
);

const AUTH = { Authorization: `Bearer ${ACCESS_TOKEN}` };

const COURSE_ID = "00000000-0000-0000-0000-000000000001";
// BL-54: self-service enrollment is a FREE-course path, so the baseline fixture
// is a free course. Paid variants are built explicitly in the BL-54 block below.
const COURSE = {
  id: COURSE_ID,
  title: "Test Course",
  slug: "test-course",
  status: "published",
  price: 0,
  salePrice: null,
  deletedAt: null,
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(prisma.user.findUnique).mockResolvedValue(VALID_USER as never);
  vi.mocked(prisma.order.findFirst).mockResolvedValue(null as never);
});

describe("POST /api/enrollments", () => {
  it("returns 201 on successful enrollment", async () => {
    vi.mocked(prisma.course.findUnique).mockResolvedValue(COURSE as never);
    vi.mocked(prisma.courseEnrollment.findUnique).mockResolvedValue(null);
    vi.mocked(prisma.courseEnrollment.create).mockResolvedValue({
      id: "enr-1",
      courseId: COURSE_ID,
      userId: "user-1",
      course: COURSE,
    } as never);

    const res = await request(app)
      .post("/api/enrollments")
      .set(AUTH)
      .send({ courseId: COURSE_ID });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.id).toBe("enr-1");
  });

  it("returns 409 when already enrolled", async () => {
    vi.mocked(prisma.course.findUnique).mockResolvedValue(COURSE as never);
    vi.mocked(prisma.courseEnrollment.findUnique).mockResolvedValue({ id: "enr-1" } as never);

    const res = await request(app)
      .post("/api/enrollments")
      .set(AUTH)
      .send({ courseId: COURSE_ID });

    expect(res.status).toBe(409);
    expect(res.body.success).toBe(false);
  });

  it("returns 404 for non-existent course", async () => {
    vi.mocked(prisma.course.findUnique).mockResolvedValue(null);

    const res = await request(app)
      .post("/api/enrollments")
      .set(AUTH)
      .send({ courseId: "00000000-0000-0000-0000-000000000000" });

    expect(res.status).toBe(404);
  });

  it("returns 401 without auth", async () => {
    const res = await request(app).post("/api/enrollments").send({ courseId: COURSE_ID });
    expect(res.status).toBe(401);
  });

  it("returns 400 for invalid courseId", async () => {
    const res = await request(app)
      .post("/api/enrollments")
      .set(AUTH)
      .send({ courseId: "not-a-uuid" });
    expect(res.status).toBe(400);
  });
});

/**
 * BL-54 regression — self-service enrollment must not hand out paid courses.
 *
 * The endpoint only checked `status === "published"` and "not already enrolled",
 * so any authenticated user could POST a paid course id and receive it for free.
 * Paid access is granted by the two settlement paths (the 100%-off coupon branch
 * in routes/checkout.ts and the DOKU webhook), never here.
 */
describe("POST /api/enrollments — paid-course guard (BL-54)", () => {
  const PAID_COURSE = { ...COURSE, price: 299000, salePrice: null };

  beforeEach(() => {
    vi.mocked(prisma.courseEnrollment.findUnique).mockResolvedValue(null);
    vi.mocked(prisma.courseEnrollment.create).mockResolvedValue({
      id: "enr-1",
      courseId: COURSE_ID,
      userId: "user-1",
      course: COURSE,
    } as never);
  });

  it("rejects a paid course when the user has no paid order", async () => {
    vi.mocked(prisma.course.findUnique).mockResolvedValue(PAID_COURSE as never);
    vi.mocked(prisma.order.findFirst).mockResolvedValue(null as never);

    const res = await request(app)
      .post("/api/enrollments")
      .set(AUTH)
      .send({ courseId: COURSE_ID });

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
    // The actual exploit: no enrollment row may be written.
    expect(prisma.courseEnrollment.create).not.toHaveBeenCalled();
  });

  it("allows a paid course once a paid order for it exists", async () => {
    vi.mocked(prisma.course.findUnique).mockResolvedValue(PAID_COURSE as never);
    vi.mocked(prisma.order.findFirst).mockResolvedValue({ id: "order-1" } as never);

    const res = await request(app)
      .post("/api/enrollments")
      .set(AUTH)
      .send({ courseId: COURSE_ID });

    expect(res.status).toBe(201);
    expect(prisma.courseEnrollment.create).toHaveBeenCalled();
  });

  it("scopes the paid-order lookup to this user, this course, and status paid", async () => {
    vi.mocked(prisma.course.findUnique).mockResolvedValue(PAID_COURSE as never);
    vi.mocked(prisma.order.findFirst).mockResolvedValue({ id: "order-1" } as never);

    await request(app).post("/api/enrollments").set(AUTH).send({ courseId: COURSE_ID });

    // A lookup missing any of these three would let someone else's order, an
    // unpaid order, or an order for a different course unlock this one.
    expect(prisma.order.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          userId: "user-1",
          status: "paid",
          items: { some: { itemType: "course", itemId: COURSE_ID } },
        }),
      })
    );
  });

  it("still allows a free course without any order", async () => {
    vi.mocked(prisma.course.findUnique).mockResolvedValue(COURSE as never);
    vi.mocked(prisma.order.findFirst).mockResolvedValue(null as never);

    const res = await request(app)
      .post("/api/enrollments")
      .set(AUTH)
      .send({ courseId: COURSE_ID });

    expect(res.status).toBe(201);
    expect(prisma.order.findFirst).not.toHaveBeenCalled();
  });

  it("treats a discounted-to-zero course as free", async () => {
    vi.mocked(prisma.course.findUnique).mockResolvedValue({
      ...COURSE,
      price: 299000,
      salePrice: 0,
    } as never);

    const res = await request(app)
      .post("/api/enrollments")
      .set(AUTH)
      .send({ courseId: COURSE_ID });

    expect(res.status).toBe(201);
  });

  it("fails closed when the price cannot be parsed", async () => {
    vi.mocked(prisma.course.findUnique).mockResolvedValue({
      ...COURSE,
      price: undefined,
      salePrice: null,
    } as never);
    vi.mocked(prisma.order.findFirst).mockResolvedValue(null as never);

    const res = await request(app)
      .post("/api/enrollments")
      .set(AUTH)
      .send({ courseId: COURSE_ID });

    expect(res.status).toBe(403);
    expect(prisma.courseEnrollment.create).not.toHaveBeenCalled();
  });
});

describe("GET /api/enrollments", () => {
  it("returns enrolled courses list", async () => {
    vi.mocked(prisma.courseEnrollment.findMany).mockResolvedValue([
      { id: "enr-1", courseId: COURSE_ID, userId: "user-1", course: COURSE, progress: [] },
    ] as never);

    const res = await request(app).get("/api/enrollments").set(AUTH);
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
  });

  it("returns 401 without auth", async () => {
    const res = await request(app).get("/api/enrollments");
    expect(res.status).toBe(401);
  });
});
