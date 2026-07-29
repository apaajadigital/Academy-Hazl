import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import { app } from "../../../src/app.js";

vi.mock("../../../src/db/prisma.js", () => ({
  prisma: {
    course: {
      findUnique: vi.fn(),
    },
    courseEnrollment: {
      findUnique: vi.fn(),
    },
    event: {
      findUnique: vi.fn(),
      updateMany: vi.fn(),
    },
    eventRegistration: {
      findUnique: vi.fn(),
      create: vi.fn(),
      upsert: vi.fn(),
    },
    coupon: {
      findUnique: vi.fn(),
    },
    order: {
      create: vi.fn(),
      update: vi.fn(),
    },
    paymentTransaction: {
      create: vi.fn(),
    },
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
  // BL-63: e-ticket confirmation, dispatched inline by the email processor in test.
  sendEventRegistrationConfirmed: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("../../../src/services/coupon/couponService.js", () => ({
  validateCoupon: vi.fn(),
  incrementCouponUsage: vi.fn().mockResolvedValue(undefined),
}));

const { prisma } = await import("../../../src/db/prisma.js");
const { validateCoupon } = await import("../../../src/services/coupon/couponService.js");

const mockCourse = {
  id: "course-1",
  title: "Kursus Test",
  slug: "kursus-test",
  price: 299000,
  coverUrl: null,
};

const mockOrder = {
  id: "order-1",
  status: "pending",
  finalAmount: 299000,
  user: { name: "Test User", email: "user@test.com" },
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(prisma.course.findUnique).mockResolvedValue(mockCourse as never);
  vi.mocked(prisma.courseEnrollment.findUnique).mockResolvedValue(null);
  vi.mocked(prisma.order.create).mockResolvedValue(mockOrder as never);
  vi.mocked(prisma.paymentTransaction.create).mockResolvedValue({} as never);
});

describe("POST /api/checkout", () => {
  it("creates order and returns paymentUrl for course", async () => {
    const res = await request(app)
      .post("/api/checkout")
      .send({ itemType: "course", itemId: "course-1" });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.paymentUrl).toBeDefined();
    expect(res.body.data.orderId).toBe("order-1");
  });

  it("returns 400 when itemType is invalid", async () => {
    const res = await request(app)
      .post("/api/checkout")
      .send({ itemType: "invalid", itemId: "course-1" });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it("returns 400 when course not found", async () => {
    vi.mocked(prisma.course.findUnique).mockResolvedValue(null);

    const res = await request(app)
      .post("/api/checkout")
      .send({ itemType: "course", itemId: "nonexistent" });

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });

  it("returns 400 when user already enrolled", async () => {
    vi.mocked(prisma.courseEnrollment.findUnique).mockResolvedValue({ id: "enroll-1" } as never);

    const res = await request(app)
      .post("/api/checkout")
      .send({ itemType: "course", itemId: "course-1" });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error.message).toContain("sudah terdaftar");
  });

  it("applies coupon when valid coupon code is provided", async () => {
    vi.mocked(validateCoupon).mockResolvedValue({
      couponId: "coupon-1",
      code: "DISKON10",
      discountAmount: 29900,
      finalAmount: 269100,
    });

    vi.mocked(prisma.order.create).mockResolvedValue({
      ...mockOrder,
      finalAmount: 269100,
    } as never);

    const res = await request(app)
      .post("/api/checkout")
      .send({ itemType: "course", itemId: "course-1", couponCode: "DISKON10" });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.finalAmount).toBe(269100);
  });

  it("returns 400 when itemId is missing", async () => {
    const res = await request(app)
      .post("/api/checkout")
      .send({ itemType: "course" });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  // Batch8 (free-event quota): a free event at capacity must be rejected (409) and
  // must NOT create a registration. The pre-check passes (totalSold read < quota)
  // but the atomic reservation matches 0 rows (someone filled it first / race).
  it("returns 409 when a free event is at capacity", async () => {
    vi.mocked(prisma.event.findUnique).mockResolvedValue({
      id: "event-1",
      title: "Webinar Gratis",
      slug: "webinar-gratis",
      status: "published",
      price: 0,
      salePrice: null,
      quota: 100,
      totalSold: 99,
    } as never);
    vi.mocked(prisma.eventRegistration.findUnique).mockResolvedValue(null);
    // Atomic reservation fails → event actually full.
    vi.mocked(prisma.event.updateMany).mockResolvedValue({ count: 0 } as never);

    const res = await request(app)
      .post("/api/checkout")
      .send({ itemType: "event", itemId: "event-1" });

    expect(res.status).toBe(409);
    expect(res.body.success).toBe(false);
    expect(res.body.error.message).toContain("penuh");
    expect(prisma.eventRegistration.create).not.toHaveBeenCalled();
  });

  it("registers a free event when capacity is available", async () => {
    vi.mocked(prisma.event.findUnique).mockResolvedValue({
      id: "event-1",
      title: "Webinar Gratis",
      slug: "webinar-gratis",
      status: "published",
      price: 0,
      salePrice: null,
      quota: 100,
      totalSold: 10,
    } as never);
    vi.mocked(prisma.eventRegistration.findUnique).mockResolvedValue(null);
    vi.mocked(prisma.event.updateMany).mockResolvedValue({ count: 1 } as never);
    vi.mocked(prisma.eventRegistration.create).mockResolvedValue({} as never);

    const res = await request(app)
      .post("/api/checkout")
      .send({ itemType: "event", itemId: "event-1" });

    expect(res.status).toBe(200);
    expect(res.body.data.free).toBe(true);
    expect(prisma.event.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ totalSold: { increment: 1 } }) }),
    );
    expect(prisma.eventRegistration.create).toHaveBeenCalled();
  });

  // ── BL-63: registration confirmation + e-ticket ─────────────────────────────
  // Before this, the ONLY event email was the failure path (event-full refund):
  // a successful registrant never received their ticketCode, which is exactly what
  // the check-in desk asks for.

  const mockEvent = {
    id: "event-1",
    title: "Workshop Offline",
    slug: "workshop-offline",
    status: "published",
    type: "offline",
    startDate: new Date("2026-09-10T09:00:00+07:00"),
    location: "Jakarta",
    venue: "Aula Utama",
    quota: 100,
    totalSold: 10,
  };

  it("sends the e-ticket confirmation after a FREE event registration (BL-63)", async () => {
    const { sendEventRegistrationConfirmed } = await import(
      "../../../src/services/notification/emailService.js"
    );
    vi.mocked(prisma.event.findUnique).mockResolvedValue({
      ...mockEvent,
      price: 0,
      salePrice: null,
    } as never);
    vi.mocked(prisma.eventRegistration.findUnique).mockResolvedValue(null);
    vi.mocked(prisma.event.updateMany).mockResolvedValue({ count: 1 } as never);
    vi.mocked(prisma.eventRegistration.create).mockResolvedValue({
      id: "reg-1",
      ticketCode: "TKT-FREE-001",
      user: { name: "Test User", email: "user@test.com" },
    } as never);

    const res = await request(app)
      .post("/api/checkout")
      .send({ itemType: "event", itemId: "event-1" });

    expect(res.status).toBe(200);
    // Enqueue is fire-and-forget so the response never waits on email delivery.
    await vi.waitFor(() =>
      expect(sendEventRegistrationConfirmed).toHaveBeenCalledWith(
        "user@test.com",
        expect.objectContaining({
          name: "Test User",
          eventTitle: "Workshop Offline",
          ticketCode: "TKT-FREE-001",
          venue: "Aula Utama",
          eventType: "offline",
        }),
      ),
    );
  });

  it("sends the e-ticket confirmation for a 100%-off coupon event registration (BL-63)", async () => {
    const { sendEventRegistrationConfirmed } = await import(
      "../../../src/services/notification/emailService.js"
    );
    vi.mocked(prisma.event.findUnique).mockResolvedValue({
      ...mockEvent,
      price: 500000,
      salePrice: null,
    } as never);
    vi.mocked(prisma.eventRegistration.findUnique).mockResolvedValue(null);
    vi.mocked(prisma.event.updateMany).mockResolvedValue({ count: 1 } as never);
    vi.mocked(prisma.eventRegistration.upsert).mockResolvedValue({
      id: "reg-2",
      ticketCode: "TKT-COUPON-002",
    } as never);
    vi.mocked(validateCoupon).mockResolvedValue({
      couponId: "coupon-free",
      code: "GRATIS100",
      discountAmount: 500000,
      finalAmount: 0,
    });
    vi.mocked(prisma.order.create).mockResolvedValue({
      ...mockOrder,
      id: "order-evt",
      status: "paid",
      finalAmount: 0,
    } as never);

    const res = await request(app)
      .post("/api/checkout")
      .send({ itemType: "event", itemId: "event-1", couponCode: "GRATIS100" });

    expect(res.status).toBe(200);
    expect(res.body.data.free).toBe(true);
    expect(prisma.eventRegistration.upsert).toHaveBeenCalled();
    await vi.waitFor(() =>
      expect(sendEventRegistrationConfirmed).toHaveBeenCalledWith(
        "user@test.com",
        expect.objectContaining({
          eventTitle: "Workshop Offline",
          ticketCode: "TKT-COUPON-002",
          orderId: "order-evt",
          eventType: "offline",
        }),
      ),
    );
  });

  it("still completes the registration when the e-ticket email throws (BL-63, BL-31)", async () => {
    const { sendEventRegistrationConfirmed } = await import(
      "../../../src/services/notification/emailService.js"
    );
    vi.mocked(prisma.event.findUnique).mockResolvedValue({
      ...mockEvent,
      price: 0,
      salePrice: null,
    } as never);
    vi.mocked(prisma.eventRegistration.findUnique).mockResolvedValue(null);
    vi.mocked(prisma.event.updateMany).mockResolvedValue({ count: 1 } as never);
    vi.mocked(prisma.eventRegistration.create).mockResolvedValue({
      id: "reg-3",
      ticketCode: "TKT-FREE-003",
      user: { name: "Test User", email: "user@test.com" },
    } as never);
    vi.mocked(sendEventRegistrationConfirmed).mockRejectedValueOnce(new Error("resend down"));

    const res = await request(app)
      .post("/api/checkout")
      .send({ itemType: "event", itemId: "event-1" });

    // Email is best-effort: the seat is reserved and the response still succeeds.
    expect(res.status).toBe(200);
    expect(res.body.data.free).toBe(true);
    expect(prisma.eventRegistration.create).toHaveBeenCalled();
  });
});
