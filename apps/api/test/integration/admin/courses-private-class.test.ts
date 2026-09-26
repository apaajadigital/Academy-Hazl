// BL-47 Private Class: admin PATCH manages format + onboarding fields with
// strict validation (enum format, https group link, digits-only WA number).
import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import { app } from "../../../src/app.js";
import jwt from "jsonwebtoken";

vi.mock("../../../src/db/prisma.js", () => ({
  prisma: {
    user: { findUnique: vi.fn() },
    course: { findUnique: vi.fn(), update: vi.fn() },
  },
}));

const { prisma } = await import("../../../src/db/prisma.js");

const VALID_ADMIN = {
  id: "admin-1",
  email: "admin@jago.id",
  isActive: true,
  deletedAt: null,
  roles: [{ role: "super_admin" }],
};

const ADMIN_TOKEN = jwt.sign(
  { sub: "admin-1", email: "admin@jago.id", roles: ["super_admin"] },
  process.env.JWT_SECRET!,
  { expiresIn: "15m" },
);
const ADMIN_AUTH = { Authorization: `Bearer ${ADMIN_TOKEN}` };

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(prisma.user.findUnique).mockResolvedValue(VALID_ADMIN as never);
  vi.mocked(prisma.course.findUnique).mockResolvedValue({ id: "c-1", status: "draft" } as never);
});

describe("PATCH /api/admin/courses/:id — private-class fields (BL-47)", () => {
  it("updates format, waGroupLink and onboardingContact", async () => {
    vi.mocked(prisma.course.update).mockResolvedValue({
      id: "c-1",
      title: "Test",
      status: "draft",
      isFeatured: false,
      publishedAt: null,
      adminFeedback: null,
      format: "private_class",
      waGroupLink: "https://chat.whatsapp.com/AbCdEf123",
      onboardingContact: "6285283423737",
    } as never);

    const res = await request(app).patch("/api/admin/courses/c-1").set(ADMIN_AUTH).send({
      format: "private_class",
      waGroupLink: "https://chat.whatsapp.com/AbCdEf123",
      onboardingContact: "6285283423737",
    });

    expect(res.status).toBe(200);
    expect(res.body.data.format).toBe("private_class");
    expect(res.body.data.waGroupLink).toBe("https://chat.whatsapp.com/AbCdEf123");
    expect(res.body.data.onboardingContact).toBe("6285283423737");
    // The three fields reach the update payload.
    const updateArgs = vi.mocked(prisma.course.update).mock.calls[0]?.[0];
    expect(updateArgs?.data).toMatchObject({
      format: "private_class",
      waGroupLink: "https://chat.whatsapp.com/AbCdEf123",
      onboardingContact: "6285283423737",
    });
  });

  it("allows clearing waGroupLink/onboardingContact with null", async () => {
    vi.mocked(prisma.course.update).mockResolvedValue({
      id: "c-1",
      title: "Test",
      status: "draft",
      isFeatured: false,
      publishedAt: null,
      adminFeedback: null,
      format: "regular",
      waGroupLink: null,
      onboardingContact: null,
    } as never);

    const res = await request(app)
      .patch("/api/admin/courses/c-1")
      .set(ADMIN_AUTH)
      .send({ format: "regular", waGroupLink: null, onboardingContact: null });

    expect(res.status).toBe(200);
    const updateArgs = vi.mocked(prisma.course.update).mock.calls[0]?.[0];
    expect(updateArgs?.data).toMatchObject({ format: "regular", waGroupLink: null, onboardingContact: null });
  });

  it("rejects an invalid format value", async () => {
    const res = await request(app)
      .patch("/api/admin/courses/c-1")
      .set(ADMIN_AUTH)
      .send({ format: "vip" });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(vi.mocked(prisma.course.update)).not.toHaveBeenCalled();
  });

  it("rejects a non-https waGroupLink", async () => {
    const res = await request(app)
      .patch("/api/admin/courses/c-1")
      .set(ADMIN_AUTH)
      .send({ waGroupLink: "http://chat.whatsapp.com/AbCdEf123" });

    expect(res.status).toBe(400);
    expect(vi.mocked(prisma.course.update)).not.toHaveBeenCalled();
  });

  it("rejects a waGroupLink that is not a URL", async () => {
    const res = await request(app)
      .patch("/api/admin/courses/c-1")
      .set(ADMIN_AUTH)
      .send({ waGroupLink: "not-a-url" });

    expect(res.status).toBe(400);
  });

  it("rejects a non-digit or out-of-range onboardingContact", async () => {
    const badValues = ["+6285283423737", "62852abc", "1234567", "6285283423737123456"];
    for (const onboardingContact of badValues) {
      const res = await request(app)
        .patch("/api/admin/courses/c-1")
        .set(ADMIN_AUTH)
        .send({ onboardingContact });
      expect(res.status, `expected 400 for ${onboardingContact}`).toBe(400);
    }
    expect(vi.mocked(prisma.course.update)).not.toHaveBeenCalled();
  });
});
