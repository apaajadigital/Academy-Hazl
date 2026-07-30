import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import { app } from "../../../src/app.js";

/**
 * BL-53 regression — courses must be billed at `salePrice` when one is set.
 *
 * Courses were the only item type that read `price` directly, so a discounted
 * course was advertised at the sale price in the catalog and then charged at the
 * full price at checkout. Ebooks and events already used the `salePrice ?? price`
 * precedence; these tests pin the course path to the same rule and assert on the
 * amounts actually written to the order, not just on the HTTP status.
 */

vi.mock("../../../src/db/prisma.js", () => ({
  prisma: {
    course: { findUnique: vi.fn() },
    courseEnrollment: { findUnique: vi.fn() },
    event: { findUnique: vi.fn(), updateMany: vi.fn() },
    eventRegistration: { findUnique: vi.fn(), create: vi.fn(), upsert: vi.fn() },
    coupon: { findUnique: vi.fn() },
    order: { create: vi.fn(), update: vi.fn() },
    paymentTransaction: { create: vi.fn() },
  },
}));

vi.mock("../../../src/middleware/authenticate.js", () => ({
  authenticate: vi.fn((req, _res, next) => {
    req.user = { id: "user-1", email: "user@test.com", name: "Test User", roles: ["student"] };
    next();
  }),
}));

vi.mock("../../../src/services/payment/dokuService.js", () => ({
  createDokuOrder: vi.fn().mockResolvedValue({
    invoiceNumber: "JA-TEST123",
    paymentUrl: "http://localhost:3000/payment/success?order=JA-TEST123&mock=1",
  }),
}));

vi.mock("../../../src/services/notification/emailService.js", () => ({
  sendPaymentPending: vi.fn().mockResolvedValue(undefined),
  sendPaymentSuccess: vi.fn().mockResolvedValue(undefined),
  sendOrderInvoice: vi.fn().mockResolvedValue(undefined),
  sendEventRegistrationConfirmed: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("../../../src/services/coupon/couponService.js", () => ({
  validateCoupon: vi.fn(),
  incrementCouponUsage: vi.fn().mockResolvedValue(undefined),
}));

const { prisma } = await import("../../../src/db/prisma.js");

const FULL_PRICE = 299000;
const SALE_PRICE = 149000;

const baseCourse = {
  id: "course-1",
  title: "Kursus Test",
  slug: "kursus-test",
  price: FULL_PRICE,
  salePrice: null as number | null,
  coverUrl: null,
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(prisma.courseEnrollment.findUnique).mockResolvedValue(null);
  vi.mocked(prisma.order.create).mockResolvedValue({
    id: "order-1",
    status: "pending",
    finalAmount: SALE_PRICE,
    user: { name: "Test User", email: "user@test.com" },
  } as never);
  vi.mocked(prisma.paymentTransaction.create).mockResolvedValue({} as never);
});

/** The `data` object handed to prisma.order.create for the single checkout call. */
function orderCreateData() {
  const call = vi.mocked(prisma.order.create).mock.calls[0]?.[0] as
    | { data: Record<string, unknown> }
    | undefined;
  return call?.data;
}

describe("POST /api/checkout — course salePrice (BL-53)", () => {
  it("charges salePrice, not price, when a course is on sale", async () => {
    vi.mocked(prisma.course.findUnique).mockResolvedValue({
      ...baseCourse,
      salePrice: SALE_PRICE,
    } as never);

    const res = await request(app)
      .post("/api/checkout")
      .send({ itemType: "course", itemId: "course-1" });

    expect(res.status).toBe(200);

    const data = orderCreateData();
    expect(data?.totalAmount).toBe(SALE_PRICE);
    expect(data?.finalAmount).toBe(SALE_PRICE);
    // The regression: the full price must not survive anywhere on the order.
    expect(data?.totalAmount).not.toBe(FULL_PRICE);
  });

  it("writes salePrice onto the order line, not the list price", async () => {
    vi.mocked(prisma.course.findUnique).mockResolvedValue({
      ...baseCourse,
      salePrice: SALE_PRICE,
    } as never);

    await request(app).post("/api/checkout").send({ itemType: "course", itemId: "course-1" });

    const items = orderCreateData()?.items as { create: Record<string, unknown> } | undefined;
    expect(items?.create.unitPrice).toBe(SALE_PRICE);
    expect(items?.create.totalPrice).toBe(SALE_PRICE);
  });

  it("falls back to price when salePrice is null", async () => {
    vi.mocked(prisma.course.findUnique).mockResolvedValue(baseCourse as never);

    const res = await request(app)
      .post("/api/checkout")
      .send({ itemType: "course", itemId: "course-1" });

    expect(res.status).toBe(200);
    expect(orderCreateData()?.totalAmount).toBe(FULL_PRICE);
  });
});
