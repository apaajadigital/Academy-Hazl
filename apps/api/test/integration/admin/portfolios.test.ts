import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import { app } from "../../../src/app.js";
import jwt from "jsonwebtoken";

vi.mock("../../../src/db/prisma.js", () => ({
  prisma: {
    user: { findUnique: vi.fn() },
    memberPortfolio: {
      findMany: vi.fn(),
      count: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
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

const VALID_STUDENT = {
  id: "student-1",
  email: "student@jago.id",
  isActive: true,
  deletedAt: null,
  roles: [{ role: "student" }],
};

const ADMIN_TOKEN = jwt.sign(
  { sub: "admin-1", email: "admin@jago.id", roles: ["super_admin"] },
  process.env.JWT_SECRET!,
  { expiresIn: "15m" }
);
const STUDENT_TOKEN = jwt.sign(
  { sub: "student-1", email: "student@jago.id", roles: ["student"] },
  process.env.JWT_SECRET!,
  { expiresIn: "15m" }
);

const ADMIN_AUTH = { Authorization: `Bearer ${ADMIN_TOKEN}` };
const STUDENT_AUTH = { Authorization: `Bearer ${STUDENT_TOKEN}` };

const VALID_BODY = {
  name: "Sari Dewi",
  role: "UI/UX Designer",
  headline: "Designing delightful products",
  photoUrl: "https://cdn.jago.id/sari.jpg",
  portfolioItems: [
    { title: "Redesign App", url: "https://example.com/case", description: "Case study" },
  ],
  featured: true,
  status: "published",
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("Admin member portfolios guards (Phase B, BL-48)", () => {
  it("rejects unauthenticated requests (401)", async () => {
    const res = await request(app).get("/api/admin/portfolios");
    expect(res.status).toBe(401);
    expect(prisma.memberPortfolio.findMany).not.toHaveBeenCalled();
  });

  it("rejects non-admin users (403)", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(VALID_STUDENT as never);
    const res = await request(app).get("/api/admin/portfolios").set(STUDENT_AUTH);
    expect(res.status).toBe(403);
    expect(prisma.memberPortfolio.findMany).not.toHaveBeenCalled();
  });
});

describe("GET /api/admin/portfolios", () => {
  it("returns paginated portfolios of all statuses with optional status filter", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(VALID_ADMIN as never);
    vi.mocked(prisma.memberPortfolio.findMany).mockResolvedValue([
      { id: "pf-1", name: "Sari", status: "draft" },
    ] as never);
    vi.mocked(prisma.memberPortfolio.count).mockResolvedValue(1);

    const res = await request(app).get("/api/admin/portfolios?status=draft").set(ADMIN_AUTH);
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.meta.total).toBe(1);
    expect(prisma.memberPortfolio.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { status: "draft" } }),
    );
  });
});

describe("POST /api/admin/portfolios", () => {
  it("creates a portfolio from a valid payload (201)", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(VALID_ADMIN as never);
    vi.mocked(prisma.memberPortfolio.create).mockResolvedValue({ id: "pf-1", ...VALID_BODY } as never);

    const res = await request(app).post("/api/admin/portfolios").set(ADMIN_AUTH).send(VALID_BODY);
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.name).toBe("Sari Dewi");
    expect(prisma.memberPortfolio.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: "published", featured: true }),
      }),
    );
  });

  it("rejects a non-https photoUrl (400)", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(VALID_ADMIN as never);
    const res = await request(app)
      .post("/api/admin/portfolios")
      .set(ADMIN_AUTH)
      .send({ ...VALID_BODY, photoUrl: "http://insecure.example.com/x.jpg" });
    expect(res.status).toBe(400);
    expect(prisma.memberPortfolio.create).not.toHaveBeenCalled();
  });

  it("rejects a bad portfolio item url (400)", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(VALID_ADMIN as never);
    const res = await request(app)
      .post("/api/admin/portfolios")
      .set(ADMIN_AUTH)
      .send({ ...VALID_BODY, portfolioItems: [{ title: "X", url: "not-a-url" }] });
    expect(res.status).toBe(400);
    expect(prisma.memberPortfolio.create).not.toHaveBeenCalled();
  });

  it("rejects more than 30 portfolio items (400)", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(VALID_ADMIN as never);
    const tooMany = Array.from({ length: 31 }, (_, i) => ({ title: `Item ${i + 1}` }));
    const res = await request(app)
      .post("/api/admin/portfolios")
      .set(ADMIN_AUTH)
      .send({ ...VALID_BODY, portfolioItems: tooMany });
    expect(res.status).toBe(400);
    expect(prisma.memberPortfolio.create).not.toHaveBeenCalled();
  });
});

describe("PATCH /api/admin/portfolios/:id", () => {
  it("partially updates an existing portfolio", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(VALID_ADMIN as never);
    vi.mocked(prisma.memberPortfolio.findUnique).mockResolvedValue({ id: "pf-1" } as never);
    vi.mocked(prisma.memberPortfolio.update).mockResolvedValue({ id: "pf-1", status: "published" } as never);

    const res = await request(app)
      .patch("/api/admin/portfolios/pf-1")
      .set(ADMIN_AUTH)
      .send({ status: "published" });
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe("published");
    expect(prisma.memberPortfolio.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "pf-1" }, data: { status: "published" } }),
    );
  });

  it("returns 404 when updating a missing portfolio", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(VALID_ADMIN as never);
    vi.mocked(prisma.memberPortfolio.findUnique).mockResolvedValue(null);

    const res = await request(app)
      .patch("/api/admin/portfolios/nope")
      .set(ADMIN_AUTH)
      .send({ status: "published" });
    expect(res.status).toBe(404);
    expect(prisma.memberPortfolio.update).not.toHaveBeenCalled();
  });
});

describe("DELETE /api/admin/portfolios/:id", () => {
  it("hard deletes a portfolio", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(VALID_ADMIN as never);
    vi.mocked(prisma.memberPortfolio.findUnique).mockResolvedValue({ id: "pf-1" } as never);
    vi.mocked(prisma.memberPortfolio.delete).mockResolvedValue({ id: "pf-1" } as never);

    const res = await request(app).delete("/api/admin/portfolios/pf-1").set(ADMIN_AUTH);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(prisma.memberPortfolio.delete).toHaveBeenCalledWith({ where: { id: "pf-1" } });
  });

  it("returns 404 when deleting a missing portfolio", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(VALID_ADMIN as never);
    vi.mocked(prisma.memberPortfolio.findUnique).mockResolvedValue(null);

    const res = await request(app).delete("/api/admin/portfolios/nope").set(ADMIN_AUTH);
    expect(res.status).toBe(404);
    expect(prisma.memberPortfolio.delete).not.toHaveBeenCalled();
  });
});
