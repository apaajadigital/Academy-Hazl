import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";

vi.mock("../../../src/db/prisma.js", () => ({
  prisma: {
    testimonial: { findMany: vi.fn(), create: vi.fn(), update: vi.fn() },
  },
}));

let currentRoles: string[] = ["student"];
vi.mock("../../../src/middleware/authenticate.js", () => ({
  authenticate: vi.fn((req, _res, next) => {
    req.user = { id: "user-1", email: "user@test.com", name: "T", roles: currentRoles };
    next();
  }),
}));

vi.mock("../../../src/services/audit/log.js", () => ({
  writeAudit: vi.fn().mockResolvedValue(undefined),
}));

const { app } = await import("../../../src/app.js");
const { prisma } = await import("../../../src/db/prisma.js");
const p = prisma as unknown as {
  testimonial: { findMany: ReturnType<typeof vi.fn>; create: ReturnType<typeof vi.fn>; update: ReturnType<typeof vi.fn> };
};

beforeEach(() => {
  vi.clearAllMocks();
  currentRoles = ["student"];
});

describe("Testimonial engine (TASK-095)", () => {
  it("GET / returns only approved testimonials (public)", async () => {
    p.testimonial.findMany.mockResolvedValue([{ id: "t1", name: "A", role: "Dev", quote: "Great" }]);
    const res = await request(app).get("/api/testimonials");
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(p.testimonial.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { status: "approved" } }),
    );
  });

  // Phase B (BL-48): alumni category + career outcome on public listing.
  it("GET /?category=alumni filters to approved alumni testimonials only", async () => {
    p.testimonial.findMany.mockResolvedValue([
      { id: "t3", name: "C", role: "Alumni", quote: "Job!", category: "alumni", outcome: "Kini bekerja sebagai Digital Marketer di X" },
    ]);
    const res = await request(app).get("/api/testimonials?category=alumni");
    expect(res.status).toBe(200);
    expect(p.testimonial.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { status: "approved", category: "alumni" } }),
    );
    expect(res.body.data[0].outcome).toBe("Kini bekerja sebagai Digital Marketer di X");
    expect(res.body.data[0].category).toBe("alumni");
  });

  it("GET / rejects an invalid category (400)", async () => {
    const res = await request(app).get("/api/testimonials?category=hacker");
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(p.testimonial.findMany).not.toHaveBeenCalled();
  });

  it("POST / creates a PENDING testimonial for the authenticated user", async () => {
    p.testimonial.create.mockResolvedValue({ id: "t2" });
    const res = await request(app)
      .post("/api/testimonials")
      .send({ name: "Budi", role: "Manager", quote: "Materinya sangat aplikatif dan membantu." });
    expect(res.status).toBe(201);
    expect(p.testimonial.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: "pending", userId: "user-1" }) }),
    );
  });

  it("POST / rejects a too-short quote (400)", async () => {
    const res = await request(app).post("/api/testimonials").send({ name: "B", role: "M", quote: "hi" });
    expect(res.status).toBe(400);
    expect(p.testimonial.create).not.toHaveBeenCalled();
  });

  it("GET /admin is forbidden for non-admins (403)", async () => {
    const res = await request(app).get("/api/testimonials/admin");
    expect(res.status).toBe(403);
  });

  it("PATCH /:id/moderate approves as admin", async () => {
    currentRoles = ["super_admin"];
    p.testimonial.update.mockResolvedValue({ id: "t1", status: "approved", featured: true });
    const res = await request(app)
      .patch("/api/testimonials/t1/moderate")
      .send({ status: "approved", featured: true });
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe("approved");
    expect(p.testimonial.update).toHaveBeenCalled();
  });

  // Phase B (BL-48): moderation may promote a testimonial to alumni + outcome.
  it("PATCH /:id/moderate sets category and outcome as admin", async () => {
    currentRoles = ["super_admin"];
    p.testimonial.update.mockResolvedValue({
      id: "t1",
      status: "approved",
      featured: false,
      category: "alumni",
      outcome: "Kini bekerja sebagai Data Analyst di Y",
    });
    const res = await request(app)
      .patch("/api/testimonials/t1/moderate")
      .send({ status: "approved", category: "alumni", outcome: "Kini bekerja sebagai Data Analyst di Y" });
    expect(res.status).toBe(200);
    expect(p.testimonial.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: "approved",
          category: "alumni",
          outcome: "Kini bekerja sebagai Data Analyst di Y",
        }),
      }),
    );
    expect(res.body.data.category).toBe("alumni");
  });

  it("PATCH /:id/moderate rejects an invalid category (400)", async () => {
    currentRoles = ["super_admin"];
    const res = await request(app)
      .patch("/api/testimonials/t1/moderate")
      .send({ status: "approved", category: "vip" });
    expect(res.status).toBe(400);
    expect(p.testimonial.update).not.toHaveBeenCalled();
  });

  it("PATCH /:id/moderate forbidden for non-admin (403)", async () => {
    const res = await request(app).patch("/api/testimonials/t1/moderate").send({ status: "approved" });
    expect(res.status).toBe(403);
    expect(p.testimonial.update).not.toHaveBeenCalled();
  });
});
