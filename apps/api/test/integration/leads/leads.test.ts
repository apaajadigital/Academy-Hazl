import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";

vi.mock("../../../src/db/prisma.js", () => ({
  prisma: {
    lead: { create: vi.fn() },
  },
}));

const { app } = await import("../../../src/app.js");
const { prisma } = await import("../../../src/db/prisma.js");

const p = prisma as unknown as { lead: { create: ReturnType<typeof vi.fn> } };

beforeEach(() => {
  vi.clearAllMocks();
  p.lead.create.mockResolvedValue({ id: "lead-1", createdAt: new Date() });
});

describe("POST /api/leads (TASK-040 lead capture)", () => {
  it("creates a lead from a valid payload", async () => {
    const res = await request(app)
      .post("/api/leads")
      .send({ name: "Budi Santoso", email: "budi@example.com", source: "affiliate" });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.id).toBe("lead-1");
    expect(p.lead.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ email: "budi@example.com", source: "affiliate" }) }),
    );
  });

  it("defaults source to 'other' when omitted", async () => {
    await request(app).post("/api/leads").send({ name: "Rina", email: "rina@example.com" });
    expect(p.lead.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ source: "other" }) }),
    );
  });

  it("rejects an invalid email (400)", async () => {
    const res = await request(app).post("/api/leads").send({ name: "X", email: "not-an-email" });
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(p.lead.create).not.toHaveBeenCalled();
  });

  it("rejects a missing name (400)", async () => {
    const res = await request(app).post("/api/leads").send({ email: "a@b.com" });
    expect(res.status).toBe(400);
    expect(p.lead.create).not.toHaveBeenCalled();
  });

  // Regression BL-44: public contact form posts source "contact" + message.
  it("accepts source 'contact' with a message (201)", async () => {
    const res = await request(app)
      .post("/api/leads")
      .send({
        name: "Siti Aminah",
        email: "siti@example.com",
        source: "contact",
        message: "[Topik: Pertanyaan umum] Halo, saya ingin bertanya.",
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(p.lead.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          source: "contact",
          message: "[Topik: Pertanyaan umum] Halo, saya ingin bertanya.",
        }),
      }),
    );
  });

  // Phase B (BL-48): community landing page posts source "community".
  it("accepts source 'community' (201)", async () => {
    const res = await request(app)
      .post("/api/leads")
      .send({ name: "Andi Wijaya", email: "andi@example.com", source: "community" });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(p.lead.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ source: "community" }) }),
    );
  });

  it("rejects an unknown source (400)", async () => {
    const res = await request(app)
      .post("/api/leads")
      .send({ name: "Budi", email: "b@b.com", source: "hacker" });
    expect(res.status).toBe(400);
  });
});
