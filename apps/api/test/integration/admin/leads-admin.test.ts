import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import { app } from "../../../src/app.js";
import jwt from "jsonwebtoken";

vi.mock("../../../src/db/prisma.js", () => ({
  prisma: {
    user: { findUnique: vi.fn() },
    lead: { findMany: vi.fn(), count: vi.fn(), update: vi.fn() },
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
  { expiresIn: "15m" }
);

const ADMIN_AUTH = { Authorization: `Bearer ${ADMIN_TOKEN}` };

const LEAD = {
  id: "lead-1",
  name: "Budi Santoso",
  email: "budi@example.com",
  phone: "0812345",
  company: "PT Maju",
  message: "Halo",
  source: "contact",
  status: "new",
  createdAt: new Date("2026-07-01T00:00:00.000Z"),
  updatedAt: new Date("2026-07-01T00:00:00.000Z"),
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(prisma.user.findUnique).mockResolvedValue(VALID_ADMIN as never);
});

describe("GET /api/admin/leads", () => {
  it("returns a paginated list with default pagination", async () => {
    vi.mocked(prisma.lead.findMany).mockResolvedValue([LEAD] as never);
    vi.mocked(prisma.lead.count).mockResolvedValue(1);

    const res = await request(app).get("/api/admin/leads").set(ADMIN_AUTH);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.meta).toEqual(expect.objectContaining({ total: 1, page: 1, limit: 20 }));
    expect(vi.mocked(prisma.lead.findMany).mock.calls[0]![0]).toEqual(
      expect.objectContaining({ skip: 0, take: 20, where: {} })
    );
  });

  it("applies source/status filters and q builds an OR across name/email/company", async () => {
    vi.mocked(prisma.lead.findMany).mockResolvedValue([] as never);
    vi.mocked(prisma.lead.count).mockResolvedValue(0);

    const res = await request(app)
      .get("/api/admin/leads")
      .query({ q: "budi", source: "contact", status: "new", page: 2, limit: 10 })
      .set(ADMIN_AUTH);

    expect(res.status).toBe(200);
    const args = vi.mocked(prisma.lead.findMany).mock.calls[0]![0]!;
    expect(args.skip).toBe(10);
    expect(args.take).toBe(10);
    expect(args.where).toEqual({
      source: "contact",
      status: "new",
      OR: [
        { name: { contains: "budi", mode: "insensitive" } },
        { email: { contains: "budi", mode: "insensitive" } },
        { company: { contains: "budi", mode: "insensitive" } },
      ],
    });
  });

  it("rejects an invalid page (400)", async () => {
    const res = await request(app).get("/api/admin/leads").query({ page: 0 }).set(ADMIN_AUTH);
    expect(res.status).toBe(400);
    expect(prisma.lead.findMany).not.toHaveBeenCalled();
  });
});

describe("PATCH /api/admin/leads/:id", () => {
  it("updates the lead status", async () => {
    vi.mocked(prisma.lead.update).mockResolvedValue({
      id: "lead-1",
      status: "contacted",
      updatedAt: new Date(),
    } as never);

    const res = await request(app)
      .patch("/api/admin/leads/lead-1")
      .set(ADMIN_AUTH)
      .send({ status: "contacted" });

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe("contacted");
    expect(prisma.lead.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "lead-1" }, data: { status: "contacted" } })
    );
  });

  it("rejects an unknown status (400)", async () => {
    const res = await request(app)
      .patch("/api/admin/leads/lead-1")
      .set(ADMIN_AUTH)
      .send({ status: "hacked" });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(prisma.lead.update).not.toHaveBeenCalled();
  });

  it("rejects a missing status (400)", async () => {
    const res = await request(app).patch("/api/admin/leads/lead-1").set(ADMIN_AUTH).send({});
    expect(res.status).toBe(400);
    expect(prisma.lead.update).not.toHaveBeenCalled();
  });
});

describe("GET /api/admin/leads/export", () => {
  it("returns CSV with header row and attachment disposition", async () => {
    vi.mocked(prisma.lead.findMany).mockResolvedValue([LEAD] as never);

    const res = await request(app).get("/api/admin/leads/export").set(ADMIN_AUTH);

    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toContain("text/csv");
    expect(res.headers["content-disposition"]).toBe('attachment; filename="leads-export.csv"');
    const lines = res.text.split("\n");
    expect(lines[0]).toBe("ID,Nama,Email,Telepon,Perusahaan,Pesan,Sumber,Status,Dibuat Pada");
    expect(lines[1]).toContain('"Budi Santoso"');
    expect(lines[1]).toContain("2026-07-01T00:00:00.000Z");
  });

  it("neutralizes formula injection in user-controlled fields (M2)", async () => {
    vi.mocked(prisma.lead.findMany).mockResolvedValue([
      { ...LEAD, name: '=HYPERLINK("x")', message: "+62 tidak, ini formula" },
    ] as never);

    const res = await request(app).get("/api/admin/leads/export").set(ADMIN_AUTH);

    expect(res.status).toBe(200);
    // Leading `=` must be prefixed with a single quote; inner quotes doubled.
    expect(res.text).toContain('"\'=HYPERLINK(""x"")"');
    // Leading `+` is also a formula trigger.
    expect(res.text).toContain("\"'+62 tidak, ini formula\"");
    expect(res.text).not.toContain('"=HYPERLINK');
  });

  it("caps the export query at 10k rows", async () => {
    vi.mocked(prisma.lead.findMany).mockResolvedValue([] as never);

    const res = await request(app).get("/api/admin/leads/export").set(ADMIN_AUTH);

    expect(res.status).toBe(200);
    expect(vi.mocked(prisma.lead.findMany).mock.calls[0]![0]).toEqual(
      expect.objectContaining({ take: 10000 })
    );
  });
});
