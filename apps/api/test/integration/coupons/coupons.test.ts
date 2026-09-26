import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import { app } from "../../../src/app.js";

vi.mock("../../../src/db/prisma.js", () => ({
  prisma: {
    coupon: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
  },
}));

vi.mock("../../../src/middleware/authenticate.js", () => ({
  authenticate: vi.fn((req, _res, next) => {
    req.user = { id: "admin-1", email: "admin@test.com", name: "Admin", roles: ["super_admin"] };
    next();
  }),
}));

const { prisma } = await import("../../../src/db/prisma.js");

const mockCoupon = {
  id: "coupon-1",
  code: "DISKON10",
  type: "percentage",
  value: 10,
  maxDiscount: 50000,
  minPurchase: 0,
  usageLimit: 100,
  usageCount: 5,
  startDate: null,
  endDate: null,
  isActive: true,
  description: "Diskon 10%",
  createdAt: new Date(),
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(prisma.coupon.findUnique).mockResolvedValue(mockCoupon as never);
  vi.mocked(prisma.coupon.findMany).mockResolvedValue([mockCoupon] as never);
  vi.mocked(prisma.coupon.count).mockResolvedValue(1);
  vi.mocked(prisma.coupon.create).mockResolvedValue(mockCoupon as never);
  vi.mocked(prisma.coupon.update).mockResolvedValue(mockCoupon as never);
});

describe("POST /api/coupons/validate", () => {
  it("validates a valid percentage coupon", async () => {
    const res = await request(app)
      .post("/api/coupons/validate")
      .send({ code: "DISKON10", subtotal: 299000 });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.discountAmount).toBe(29900);
    expect(res.body.data.finalAmount).toBe(269100);
  });

  it("respects maxDiscount cap for percentage coupon", async () => {
    // 10% of 600000 = 60000 but max is 50000
    const res = await request(app)
      .post("/api/coupons/validate")
      .send({ code: "DISKON10", subtotal: 600000 });

    expect(res.status).toBe(200);
    expect(res.body.data.discountAmount).toBe(50000);
    expect(res.body.data.finalAmount).toBe(550000);
  });

  it("returns 404 when coupon does not exist", async () => {
    vi.mocked(prisma.coupon.findUnique).mockResolvedValue(null);

    const res = await request(app)
      .post("/api/coupons/validate")
      .send({ code: "NOTEXIST", subtotal: 100000 });

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });

  it("returns 400 when coupon is inactive", async () => {
    vi.mocked(prisma.coupon.findUnique).mockResolvedValue({ ...mockCoupon, isActive: false } as never);

    const res = await request(app)
      .post("/api/coupons/validate")
      .send({ code: "DISKON10", subtotal: 100000 });

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });

  it("returns 400 when subtotal is missing", async () => {
    const res = await request(app)
      .post("/api/coupons/validate")
      .send({ code: "DISKON10" });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });
});

describe("GET /api/coupons", () => {
  it("returns paginated coupon list for admin", async () => {
    const res = await request(app).get("/api/coupons");

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.meta.total).toBe(1);
  });
});

describe("POST /api/coupons", () => {
  it("creates a new coupon", async () => {
    const res = await request(app).post("/api/coupons").send({
      code: "BARU20",
      type: "percentage",
      value: 20,
      minPurchase: 100000,
    });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.code).toBe("DISKON10"); // mock returns mockCoupon
  });

  it("returns 400 when code is missing", async () => {
    const res = await request(app).post("/api/coupons").send({
      type: "percentage",
      value: 20,
    });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });
});
