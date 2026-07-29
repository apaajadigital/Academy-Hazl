import { describe, it, expect, vi, beforeEach, afterAll } from "vitest";
import request from "supertest";
import jwt from "jsonwebtoken";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

vi.mock("../../src/db/prisma.js", () => ({
  prisma: {
    user: { findUnique: vi.fn() },
    eBook: { findUnique: vi.fn(), findMany: vi.fn(), count: vi.fn() },
    orderItem: { findMany: vi.fn(), findFirst: vi.fn() },
  },
}));

// The upload root is resolved from env at module-load time, so it must point at
// a throwaway directory BEFORE app.ts / lib/ebookFile.ts are evaluated. Static
// `import` statements are hoisted above this assignment, hence dynamic import.
const UPLOAD_ROOT = fs.mkdtempSync(path.join(os.tmpdir(), "jago-ebook-"));
process.env.UPLOAD_DIR = UPLOAD_ROOT;

const EBOOK_FILE = path.join(UPLOAD_ROOT, "ebooks", "buku-ts.pdf");
fs.mkdirSync(path.dirname(EBOOK_FILE), { recursive: true });
fs.writeFileSync(EBOOK_FILE, "%PDF-1.4 fake ebook body");

// Traversal target: lives OUTSIDE the upload root (sibling of it in the OS temp
// dir) so a successful escape would be unambiguous.
const SECRET_NAME = `${path.basename(UPLOAD_ROOT)}-secret.txt`;
const SECRET_FILE = path.join(path.dirname(UPLOAD_ROOT), SECRET_NAME);
fs.writeFileSync(SECRET_FILE, "TOP-SECRET");

const { app } = await import("../../src/app.js");
const { signEbookDownload } = await import("../../src/lib/ebookFile.js");
const { prisma } = await import("../../src/db/prisma.js");

afterAll(() => {
  fs.rmSync(UPLOAD_ROOT, { recursive: true, force: true });
  fs.rmSync(SECRET_FILE, { force: true });
});

const VALID_USER = {
  id: "user-1",
  email: "user@jago.id",
  isActive: true,
  deletedAt: null,
  roles: [{ role: "student" }],
};

const USER_TOKEN = jwt.sign(
  { sub: "user-1", email: "user@jago.id", roles: ["student"] },
  process.env.JWT_SECRET!,
  { expiresIn: "15m" },
);
const USER_AUTH = { Authorization: `Bearer ${USER_TOKEN}` };

const LOCAL_EBOOK = {
  id: "eb-1",
  slug: "buku-ts",
  title: "Buku TS",
  status: "published",
  fileUrl: "/uploads/ebooks/buku-ts.pdf",
  createdAt: new Date("2026-01-01T00:00:00.000Z"),
};

const EXTERNAL_EBOOK = { ...LOCAL_EBOOK, fileUrl: "https://cdn.example.com/buku-ts.pdf" };

/** Arrange a logged-in user who owns `ebook`. */
function grantAccess(ebook: unknown) {
  vi.mocked(prisma.user.findUnique).mockResolvedValue(VALID_USER as never);
  vi.mocked(prisma.eBook.findUnique).mockResolvedValue(ebook as never);
  vi.mocked(prisma.orderItem.findFirst).mockResolvedValue({ id: "oi-1" } as never);
}

function downloadUrl(slug: string, uid: string, ttlSeconds: number): string {
  const { exp, sig } = signEbookDownload(slug, uid, ttlSeconds);
  return `/api/ebooks/${slug}/download?uid=${encodeURIComponent(uid)}&exp=${exp}&sig=${sig}`;
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("GET /api/ebooks/:slug/file — signed URL minting", () => {
  it("returns a short-lived signed download URL for a local upload path", async () => {
    grantAccess(LOCAL_EBOOK);

    const res = await request(app).get("/api/ebooks/buku-ts/file").set(USER_AUTH);

    expect(res.status).toBe(200);
    const fileUrl: string = res.body.data.fileUrl;
    // Contract kept as `{ fileUrl }` so existing web clients keep working.
    expect(fileUrl.startsWith("/api/ebooks/buku-ts/download?")).toBe(true);
    // The raw /uploads path must never leak to the client.
    expect(fileUrl).not.toContain("/uploads/");
    const params = new URLSearchParams(fileUrl.split("?")[1]);
    expect(params.get("uid")).toBe("user-1");
    expect(params.get("sig")).toMatch(/^[0-9a-f]{64}$/);
    const exp = Number(params.get("exp"));
    const now = Math.floor(Date.now() / 1000);
    expect(exp).toBeGreaterThan(now);
    expect(exp).toBeLessThanOrEqual(now + 15 * 60);
  });

  it("passes an external http(s) URL through untouched", async () => {
    grantAccess(EXTERNAL_EBOOK);

    const res = await request(app).get("/api/ebooks/buku-ts/file").set(USER_AUTH);

    expect(res.status).toBe(200);
    expect(res.body.data.fileUrl).toBe("https://cdn.example.com/buku-ts.pdf");
  });

  it("still refuses to mint a link for a user without a paid order", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(VALID_USER as never);
    vi.mocked(prisma.eBook.findUnique).mockResolvedValue(LOCAL_EBOOK as never);
    vi.mocked(prisma.orderItem.findFirst).mockResolvedValue(null);

    const res = await request(app).get("/api/ebooks/buku-ts/file").set(USER_AUTH);

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });
});

describe("GET /api/ebooks/:slug/download — signature enforcement", () => {
  it("streams the file for a valid, unexpired signature", async () => {
    vi.mocked(prisma.eBook.findUnique).mockResolvedValue(LOCAL_EBOOK as never);

    const res = await request(app).get(downloadUrl("buku-ts", "user-1", 900));

    expect(res.status).toBe(200);
    expect(res.headers["content-disposition"]).toContain("buku-ts.pdf");
    // No Authorization header was sent: the signature is the credential.
    expect(prisma.user.findUnique).not.toHaveBeenCalled();
  });

  it("rejects an expired signature with 403", async () => {
    vi.mocked(prisma.eBook.findUnique).mockResolvedValue(LOCAL_EBOOK as never);

    const res = await request(app).get(downloadUrl("buku-ts", "user-1", -60));

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe("FORBIDDEN");
  });

  it("rejects a tampered signature", async () => {
    vi.mocked(prisma.eBook.findUnique).mockResolvedValue(LOCAL_EBOOK as never);
    const url = downloadUrl("buku-ts", "user-1", 900);
    // Flip the last hex digit — same length, so this exercises the timing-safe
    // comparison rather than the length short-circuit.
    const tampered = url.replace(/(.)$/, (c) => (c === "a" ? "b" : "a"));

    const res = await request(app).get(tampered);

    expect(res.status).toBe(403);
  });

  it("rejects a tampered userId (the uid is covered by the signature)", async () => {
    vi.mocked(prisma.eBook.findUnique).mockResolvedValue(LOCAL_EBOOK as never);
    const url = downloadUrl("buku-ts", "user-1", 900).replace("uid=user-1", "uid=user-2");

    const res = await request(app).get(url);

    expect(res.status).toBe(403);
  });

  it("rejects a signature minted for a different ebook slug", async () => {
    vi.mocked(prisma.eBook.findUnique).mockResolvedValue(LOCAL_EBOOK as never);
    const url = downloadUrl("buku-lain", "user-1", 900).replace("/buku-lain/", "/buku-ts/");

    const res = await request(app).get(url);

    expect(res.status).toBe(403);
  });

  it("rejects an extended expiry (exp is covered by the signature)", async () => {
    vi.mocked(prisma.eBook.findUnique).mockResolvedValue(LOCAL_EBOOK as never);
    const { exp, sig } = signEbookDownload("buku-ts", "user-1", 900);

    const res = await request(app).get(
      `/api/ebooks/buku-ts/download?uid=user-1&exp=${exp + 86400}&sig=${sig}`,
    );

    expect(res.status).toBe(403);
  });

  it("returns 401 when the signature params are missing entirely", async () => {
    const res = await request(app).get("/api/ebooks/buku-ts/download");

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe("UNAUTHORIZED");
    // Must fail before touching the database.
    expect(prisma.eBook.findUnique).not.toHaveBeenCalled();
  });

  it("returns 404 for an unpublished ebook even with a valid signature", async () => {
    vi.mocked(prisma.eBook.findUnique).mockResolvedValue({
      ...LOCAL_EBOOK,
      status: "draft",
    } as never);

    const res = await request(app).get(downloadUrl("buku-ts", "user-1", 900));

    expect(res.status).toBe(404);
  });

  it("returns 404 when the file is missing on disk", async () => {
    vi.mocked(prisma.eBook.findUnique).mockResolvedValue({
      ...LOCAL_EBOOK,
      fileUrl: "/uploads/ebooks/tidak-ada.pdf",
    } as never);

    const res = await request(app).get(downloadUrl("buku-ts", "user-1", 900));

    expect(res.status).toBe(404);
  });

  it("refuses to stream an external URL through the download endpoint", async () => {
    vi.mocked(prisma.eBook.findUnique).mockResolvedValue(EXTERNAL_EBOOK as never);

    const res = await request(app).get(downloadUrl("buku-ts", "user-1", 900));

    expect(res.status).toBe(403);
  });
});

describe("GET /api/ebooks/:slug/download — path traversal", () => {
  it("rejects a stored fileUrl that escapes the upload directory", async () => {
    vi.mocked(prisma.eBook.findUnique).mockResolvedValue({
      ...LOCAL_EBOOK,
      fileUrl: `/uploads/ebooks/../../${SECRET_NAME}`,
    } as never);

    const res = await request(app).get(downloadUrl("buku-ts", "user-1", 900));

    expect(res.status).toBe(403);
    expect(res.text).not.toContain("TOP-SECRET");
  });

  it("rejects percent-encoded traversal", async () => {
    vi.mocked(prisma.eBook.findUnique).mockResolvedValue({
      ...LOCAL_EBOOK,
      fileUrl: `/uploads/ebooks/%2e%2e%2f%2e%2e%2f${SECRET_NAME}`,
    } as never);

    const res = await request(app).get(downloadUrl("buku-ts", "user-1", 900));

    expect(res.status).toBe(403);
    expect(res.text).not.toContain("TOP-SECRET");
  });
});

describe("static /uploads guard", () => {
  it("blocks unauthenticated access to /uploads/ebooks/*", async () => {
    const res = await request(app).get("/uploads/ebooks/buku-ts.pdf");

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe("FORBIDDEN");
    expect(res.text).not.toContain("%PDF");
  });

  it("blocks the ebooks directory listing itself", async () => {
    const res = await request(app).get("/uploads/ebooks/");
    expect(res.status).toBe(403);
  });

  it("does not block other /uploads sub-directories", async () => {
    const res = await request(app).get("/uploads/images/whatever.png");
    expect(res.status).not.toBe(403);
  });

  // Regression: the guard used to be mounted at `/uploads/ebooks`, which Express
  // matches against the RAW pathname while express.static decodes and normalises
  // before reading from disk. Each of these was verified to serve the paid PDF.
  it.each([
    ["percent-encoded first letter", "/uploads/%65books/buku-ts.pdf"],
    ["percent-encoded inner letter", "/uploads/eboo%6Bs/buku-ts.pdf"],
    ["doubled separator", "/uploads//ebooks/buku-ts.pdf"],
    ["uppercased segment", "/uploads/EBOOKS/buku-ts.pdf"],
    ["dot segment", "/uploads/./ebooks/buku-ts.pdf"],
    ["parent-then-back traversal", "/uploads/images/../ebooks/buku-ts.pdf"],
  ])("blocks the ebooks directory via %s", async (_label, url) => {
    const res = await request(app).get(url);

    expect(res.status).toBe(403);
    // The real assertion: the body must never carry the file, whatever the code.
    expect(res.text ?? "").not.toContain("%PDF");
  });
});
