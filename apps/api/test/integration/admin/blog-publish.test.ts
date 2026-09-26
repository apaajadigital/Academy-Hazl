// A4 — PATCH /api/admin/blog/:id must preserve an article's original
// publication date and validate its body.
//
// The handler used to null `publishedAt` on every non-published status and
// stamp `new Date()` on every re-publish. Because the public listing orders by
// `publishedAt desc`, an old article that was unpublished once and re-published
// jumped to the top of the blog with its real date gone for good. It also had
// no Zod schema at all, so any string reached `status`.
import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import { app } from "../../../src/app.js";
import jwt from "jsonwebtoken";

vi.mock("../../../src/db/prisma.js", () => ({
  prisma: {
    user: { findUnique: vi.fn() },
    blogPost: { findUnique: vi.fn(), update: vi.fn() },
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

const ORIGINAL_PUBLISHED_AT = new Date("2024-03-01T08:00:00.000Z");

/** Convenience: the `data` object the route handed to prisma.blogPost.update. */
function updateData(): Record<string, unknown> {
  const call = vi.mocked(prisma.blogPost.update).mock.calls[0]?.[0] as
    | { data: Record<string, unknown> }
    | undefined;
  return call?.data ?? {};
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(prisma.user.findUnique).mockResolvedValue(VALID_ADMIN as never);
  vi.mocked(prisma.blogPost.update).mockImplementation((async (args: {
    data: { status?: string; publishedAt?: Date };
  }) => ({
    id: "p-1",
    title: "Artikel Lama",
    status: args.data.status ?? "draft",
    publishedAt: args.data.publishedAt ?? ORIGINAL_PUBLISHED_AT,
  })) as never);
});

describe("PATCH /api/admin/blog/:id — publishedAt preservation (A4)", () => {
  it("unpublishing keeps the original publishedAt", async () => {
    vi.mocked(prisma.blogPost.findUnique).mockResolvedValue({
      id: "p-1",
      publishedAt: ORIGINAL_PUBLISHED_AT,
    } as never);

    const res = await request(app)
      .patch("/api/admin/blog/p-1")
      .set(ADMIN_AUTH)
      .send({ status: "draft" });

    expect(res.status).toBe(200);
    expect(updateData()).toEqual({ status: "draft" });
    // The crucial assertion: the date is NOT wiped.
    expect(updateData()).not.toHaveProperty("publishedAt");
  });

  it("re-publishing an already-published article does not restamp publishedAt", async () => {
    vi.mocked(prisma.blogPost.findUnique).mockResolvedValue({
      id: "p-1",
      publishedAt: ORIGINAL_PUBLISHED_AT,
    } as never);

    const res = await request(app)
      .patch("/api/admin/blog/p-1")
      .set(ADMIN_AUTH)
      .send({ status: "published" });

    expect(res.status).toBe(200);
    expect(updateData()).toEqual({ status: "published" });
    expect(new Date(res.body.data.publishedAt).toISOString()).toBe(
      ORIGINAL_PUBLISHED_AT.toISOString(),
    );
  });

  it("archiving keeps the original publishedAt", async () => {
    vi.mocked(prisma.blogPost.findUnique).mockResolvedValue({
      id: "p-1",
      publishedAt: ORIGINAL_PUBLISHED_AT,
    } as never);

    const res = await request(app)
      .patch("/api/admin/blog/p-1")
      .set(ADMIN_AUTH)
      .send({ status: "archived" });

    expect(res.status).toBe(200);
    expect(updateData()).toEqual({ status: "archived" });
  });

  it("a never-published article gets a fresh publishedAt on first publish", async () => {
    vi.mocked(prisma.blogPost.findUnique).mockResolvedValue({
      id: "p-2",
      publishedAt: null,
    } as never);

    const before = Date.now();
    const res = await request(app)
      .patch("/api/admin/blog/p-2")
      .set(ADMIN_AUTH)
      .send({ status: "published" });

    expect(res.status).toBe(200);
    const data = updateData();
    expect(data.status).toBe("published");
    expect(data.publishedAt).toBeInstanceOf(Date);
    expect((data.publishedAt as Date).getTime()).toBeGreaterThanOrEqual(before);
  });

  it("returns 404 when the article does not exist", async () => {
    vi.mocked(prisma.blogPost.findUnique).mockResolvedValue(null);

    const res = await request(app)
      .patch("/api/admin/blog/missing")
      .set(ADMIN_AUTH)
      .send({ status: "published" });

    expect(res.status).toBe(404);
    expect(prisma.blogPost.update).not.toHaveBeenCalled();
  });
});

describe("PATCH /api/admin/blog/:id — body validation (A4)", () => {
  it("rejects an unknown status", async () => {
    const res = await request(app)
      .patch("/api/admin/blog/p-1")
      .set(ADMIN_AUTH)
      .send({ status: "publishedd" });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(prisma.blogPost.update).not.toHaveBeenCalled();
  });

  it("rejects a non-string status", async () => {
    const res = await request(app)
      .patch("/api/admin/blog/p-1")
      .set(ADMIN_AUTH)
      .send({ status: 1 });

    expect(res.status).toBe(400);
    expect(prisma.blogPost.update).not.toHaveBeenCalled();
  });

  it("rejects an empty body", async () => {
    const res = await request(app).patch("/api/admin/blog/p-1").set(ADMIN_AUTH).send({});

    expect(res.status).toBe(400);
    expect(prisma.blogPost.update).not.toHaveBeenCalled();
  });

  it("returns 401 without auth", async () => {
    const res = await request(app).patch("/api/admin/blog/p-1").send({ status: "draft" });

    expect(res.status).toBe(401);
  });
});
