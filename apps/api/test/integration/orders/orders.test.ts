import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import { app } from "../../../src/app.js";

vi.mock("../../../src/db/prisma.js", () => ({
  prisma: {
    order: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      count: vi.fn(),
    },
    // BL-47: order detail looks up private-class courses for paid orders.
    course: {
      findMany: vi.fn(),
    },
  },
}));

vi.mock("../../../src/middleware/authenticate.js", () => ({
  authenticate: vi.fn((req, _res, next) => {
    req.user = { id: "user-1", email: "user@test.com", name: "Test User", roles: ["student"] };
    next();
  }),
}));

vi.mock("../../../src/services/invoice/invoiceService.js", () => ({
  generateInvoicePDF: vi.fn().mockResolvedValue(Buffer.from("pdf-content")),
}));

const { prisma } = await import("../../../src/db/prisma.js");

const mockOrders = [
  {
    id: "order-1",
    userId: "user-1",
    status: "paid",
    totalAmount: 299000,
    discountAmount: 0,
    finalAmount: 299000,
    createdAt: new Date(),
    items: [{ id: "item-1", itemId: "course-1", itemTitle: "Kursus Digital Marketing", itemType: "course" }],
    coupon: null,
  },
  {
    id: "order-2",
    userId: "user-1",
    status: "pending",
    totalAmount: 150000,
    discountAmount: 0,
    finalAmount: 150000,
    createdAt: new Date(),
    items: [{ id: "item-2", itemId: "ebook-1", itemTitle: "E-Book Marketing", itemType: "ebook" }],
    coupon: null,
  },
];

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(prisma.order.findMany).mockResolvedValue(mockOrders as never);
  vi.mocked(prisma.order.count).mockResolvedValue(2);
  vi.mocked(prisma.order.findUnique).mockResolvedValue(mockOrders[0] as never);
  // Default: no private-class course matches (regular courses only).
  vi.mocked(prisma.course.findMany).mockResolvedValue([] as never);
});

describe("GET /api/orders", () => {
  it("returns paginated list of user orders", async () => {
    const res = await request(app).get("/api/orders");

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveLength(2);
    expect(res.body.meta).toMatchObject({ total: 2, page: 1, limit: 10 });
  });

  it("supports pagination params", async () => {
    vi.mocked(prisma.order.findMany).mockResolvedValue([mockOrders[0]] as never);
    vi.mocked(prisma.order.count).mockResolvedValue(1);

    const res = await request(app).get("/api/orders?page=1&limit=1");

    expect(res.status).toBe(200);
    expect(res.body.meta.limit).toBe(1);
  });
});

describe("GET /api/orders/:orderId", () => {
  it("returns order detail for owner", async () => {
    const res = await request(app).get("/api/orders/order-1");

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.id).toBe("order-1");
  });

  it("returns 403 for non-owner", async () => {
    vi.mocked(prisma.order.findUnique).mockResolvedValue({
      ...mockOrders[0],
      userId: "other-user",
    } as never);

    const res = await request(app).get("/api/orders/order-1");

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });

  it("returns 404 when order not found", async () => {
    vi.mocked(prisma.order.findUnique).mockResolvedValue(null);

    const res = await request(app).get("/api/orders/nonexistent");

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });
});

describe("GET /api/orders/:orderId/invoice", () => {
  it("returns PDF for paid orders", async () => {
    vi.mocked(prisma.order.findUnique).mockResolvedValue({
      ...mockOrders[0],
      user: { name: "Test User", email: "test@test.com" },
      coupon: null,
      status: "paid",
    } as never);

    const res = await request(app).get("/api/orders/order-1/invoice");

    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toContain("application/pdf");
  });

  it("returns 400 for unpaid orders", async () => {
    vi.mocked(prisma.order.findUnique).mockResolvedValue({
      ...mockOrders[1],
      user: { name: "Test User", email: "test@test.com" },
      coupon: null,
    } as never);

    const res = await request(app).get("/api/orders/order-2/invoice");

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });
});
