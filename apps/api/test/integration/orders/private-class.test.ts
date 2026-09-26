// BL-47 Private Class: the owner-scoped order detail is the ONLY place the
// WhatsApp onboarding data (waGroupLink/onboardingContact/liveSchedule) is
// revealed, and only once the order is paid.
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

const { prisma } = await import("../../../src/db/prisma.js");

const LIVE_SCHEDULE = new Date("2026-08-01T13:00:00.000Z");

const paidPrivateClassOrder = {
  id: "order-pc",
  userId: "user-1",
  status: "paid",
  totalAmount: 4999000,
  discountAmount: 0,
  finalAmount: 4999000,
  createdAt: new Date(),
  items: [
    { id: "item-1", itemId: "course-pc", itemType: "course", itemTitle: "Private Class Fullstack" },
    { id: "item-2", itemId: "ebook-1", itemType: "ebook", itemTitle: "E-Book Bonus" },
  ],
  coupon: null,
  transactions: [],
};

const privateClassCourse = {
  id: "course-pc",
  waGroupLink: "https://chat.whatsapp.com/AbCdEf123",
  onboardingContact: "6285283423737",
  liveSchedule: LIVE_SCHEDULE,
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(prisma.course.findMany).mockResolvedValue([] as never);
});

describe("GET /api/orders/:orderId — privateClass block (BL-47)", () => {
  it("includes privateClass data on the course item of a paid private-class order", async () => {
    vi.mocked(prisma.order.findUnique).mockResolvedValue(paidPrivateClassOrder as never);
    vi.mocked(prisma.course.findMany).mockResolvedValue([privateClassCourse] as never);

    const res = await request(app).get("/api/orders/order-pc");

    expect(res.status).toBe(200);
    const courseItem = res.body.data.items.find((i: { itemType: string }) => i.itemType === "course");
    expect(courseItem.privateClass).toEqual({
      waGroupLink: "https://chat.whatsapp.com/AbCdEf123",
      onboardingContact: "6285283423737",
      liveSchedule: LIVE_SCHEDULE.toISOString(),
    });
    // Non-course items never carry the block.
    const ebookItem = res.body.data.items.find((i: { itemType: string }) => i.itemType === "ebook");
    expect(ebookItem.privateClass).toBeNull();
    // Lookup is restricted to private_class courses among the order's items.
    const findManyArgs = vi.mocked(prisma.course.findMany).mock.calls[0]?.[0];
    expect(findManyArgs?.where).toEqual({ id: { in: ["course-pc"] }, format: "private_class" });
  });

  it("returns privateClass null for a paid order with a regular course", async () => {
    vi.mocked(prisma.order.findUnique).mockResolvedValue(paidPrivateClassOrder as never);
    // Regular course → the private_class-scoped lookup finds nothing.
    vi.mocked(prisma.course.findMany).mockResolvedValue([] as never);

    const res = await request(app).get("/api/orders/order-pc");

    expect(res.status).toBe(200);
    for (const item of res.body.data.items) {
      expect(item.privateClass).toBeNull();
    }
  });

  it("does not reveal privateClass on an unpaid (pending) order", async () => {
    vi.mocked(prisma.order.findUnique).mockResolvedValue({
      ...paidPrivateClassOrder,
      status: "pending",
    } as never);

    const res = await request(app).get("/api/orders/order-pc");

    expect(res.status).toBe(200);
    for (const item of res.body.data.items) {
      expect(item.privateClass).toBeNull();
    }
    // Payment is the gate: no course lookup happens before "paid".
    expect(vi.mocked(prisma.course.findMany)).not.toHaveBeenCalled();
  });
});
