import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import jwt from "jsonwebtoken";
import { app } from "../../../src/app.js";
import { escapeLike } from "../../../src/lib/escapeLike.js";

// BL-108 regression suite: `?search=` was passed to Prisma's `contains` verbatim.
// Parameter binding stops SQL injection but NOT pattern injection — the bound
// value is still read as a LIKE pattern, so `?search=%` matched EVERY row and
// `?search=_` became a one-character wildcard. The public ebook list is
// unauthenticated, so anyone could dump the catalogue past the search filter.
//
// These tests do not assert on the generated `where` alone — a string-equality
// check would pass even if the escape were semantically wrong. Instead the
// prisma mock evaluates the filter with PostgreSQL LIKE semantics (backslash is
// the default escape character), so the assertions are about the ROWS RETURNED.

vi.mock("../../../src/db/prisma.js", () => ({
  prisma: {
    user: { findUnique: vi.fn() },
    eBook: { findMany: vi.fn(), count: vi.fn() },
  },
}));

const { prisma } = await import("../../../src/db/prisma.js");

// ─── Minimal PostgreSQL LIKE engine ──────────────────────────────────────────

const escapeRegExp = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * Translate a LIKE pattern to a RegExp the way PostgreSQL reads it: `%` is any
 * run of characters, `_` is exactly one, and a backslash makes the next
 * character literal. Left unanchored because Prisma's `contains` wraps the term
 * in `%…%` — the pattern only has to match somewhere in the value.
 */
function likeToRegExp(pattern: string): RegExp {
  let out = "";
  for (let i = 0; i < pattern.length; i++) {
    const ch = pattern[i];
    if (ch === "\\") {
      const next = pattern[++i];
      out += next === undefined ? "\\\\" : escapeRegExp(next);
    } else if (ch === "%") {
      out += ".*";
    } else if (ch === "_") {
      out += ".";
    } else {
      out += escapeRegExp(ch);
    }
  }
  return new RegExp(out, "i");
}

type Ebook = { id: string; title: string; author: string | null; status: string; category?: string };
type Filter = { contains: string; mode?: string };
type Where = Record<string, unknown> & { OR?: Record<string, Filter>[] };

function matches(row: Ebook, where: Where): boolean {
  for (const [key, cond] of Object.entries(where)) {
    if (key === "OR") {
      const clauses = cond as Record<string, Filter>[];
      const anyHit = clauses.some((clause) =>
        Object.entries(clause).some(([field, filter]) => {
          const value = row[field as keyof Ebook];
          return typeof value === "string" && likeToRegExp(filter.contains).test(value);
        }),
      );
      if (!anyHit) return false;
    } else if (row[key as keyof Ebook] !== cond) {
      return false;
    }
  }
  return true;
}

// One row carries a literal `%` and one a literal `_`, so the suite can also
// prove the escape did not make those terms unsearchable.
const EBOOKS: Ebook[] = [
  { id: "eb-1", title: "Panduan Produktivitas", author: "Andi", status: "published" },
  { id: "eb-2", title: "Dasar Keuangan Pribadi", author: "Budi", status: "published" },
  { id: "eb-3", title: "Diskon 50% Untuk Pemula", author: "Citra", status: "published" },
  { id: "eb-4", title: "Modul snake_case", author: "Dewi", status: "published" },
  { id: "eb-5", title: "Draf Rahasia", author: "Eka", status: "draft" },
];

const PUBLISHED_COUNT = EBOOKS.filter((e) => e.status === "published").length;

const VALID_ADMIN = {
  id: "admin-1",
  email: "admin@jago.id",
  isActive: true,
  deletedAt: null,
  roles: [{ role: "super_admin" }],
};

const ADMIN_AUTH = {
  Authorization: `Bearer ${jwt.sign(
    { sub: "admin-1", email: "admin@jago.id", roles: ["super_admin"] },
    process.env.JWT_SECRET!,
    { expiresIn: "15m" },
  )}`,
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(prisma.user.findUnique).mockResolvedValue(VALID_ADMIN as never);
  vi.mocked(prisma.eBook.findMany).mockImplementation((async (args: { where: Where }) =>
    EBOOKS.filter((e) => matches(e, args.where))) as never);
  vi.mocked(prisma.eBook.count).mockImplementation((async (args: { where: Where }) =>
    EBOOKS.filter((e) => matches(e, args.where)).length) as never);
});

// ─── Public list: GET /api/ebooks ────────────────────────────────────────────

describe("BL-108 — GET /api/ebooks escapes LIKE metacharacters", () => {
  const search = (term: string) =>
    request(app).get("/api/ebooks").query({ search: term });

  it("does NOT return every ebook for ?search=%", async () => {
    const res = await search("%");

    expect(res.status).toBe(200);
    // The bug: `%` reached `contains` unescaped, so the pattern was `%%%` and
    // matched every published row. Escaped, it looks for a literal `%`.
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].id).toBe("eb-3");
    expect(res.body.meta.total).toBe(1);
    expect(res.body.data.length).toBeLessThan(PUBLISHED_COUNT);
  });

  it("does NOT treat ?search=_ as a single-character wildcard", async () => {
    const res = await search("_");

    expect(res.status).toBe(200);
    // Unescaped, `_` matched any one character — i.e. every non-empty title.
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].id).toBe("eb-4");
  });

  it("matches a literal % inside a title (escaping must not break search)", async () => {
    const res = await search("50%");

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].id).toBe("eb-3");
  });

  it("returns nothing for a backslash that matches no title", async () => {
    // `\` alone would be a dangling escape in the SQL pattern; `escapeLike`
    // doubles it so the query stays valid and simply finds no literal match.
    const res = await search("\\");

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(0);
  });

  it("still performs an ordinary substring search", async () => {
    const res = await search("produktivitas");

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].id).toBe("eb-1");
  });

  it("still matches on author, and never leaks a draft", async () => {
    const res = await search("eka");

    expect(res.status).toBe(200);
    // eb-5's author matches, but the row is a draft — the status filter wins.
    expect(res.body.data).toHaveLength(0);
  });
});

// ─── Admin list: GET /api/admin/ebooks ───────────────────────────────────────

describe("BL-108 — GET /api/admin/ebooks escapes LIKE metacharacters", () => {
  const search = (term: string) =>
    request(app).get("/api/admin/ebooks").query({ search: term }).set(ADMIN_AUTH);

  it("does NOT return every ebook for ?search=%", async () => {
    const res = await search("%");

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].id).toBe("eb-3");
    expect(res.body.meta.total).toBe(1);
  });

  it("does NOT treat ?search=_ as a single-character wildcard", async () => {
    const res = await search("_");

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].id).toBe("eb-4");
  });

  it("still performs an ordinary substring search", async () => {
    const res = await search("keuangan");

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].id).toBe("eb-2");
  });
});

// ─── Helper contract ─────────────────────────────────────────────────────────

describe("escapeLike", () => {
  it("escapes %, _ and backslash, and leaves everything else alone", () => {
    expect(escapeLike("%")).toBe("\\%");
    expect(escapeLike("_")).toBe("\\_");
    expect(escapeLike("\\")).toBe("\\\\");
    expect(escapeLike("100% aman")).toBe("100\\% aman");
    expect(escapeLike("panduan produktivitas")).toBe("panduan produktivitas");
  });

  it("escapes the backslash without double-escaping the metacharacter after it", () => {
    // A naive two-pass implementation (replace % then \) would turn `\%` into
    // `\\\\%` — a literal backslash followed by a live wildcard.
    expect(escapeLike("\\%")).toBe("\\\\\\%");
    expect(likeToRegExp(escapeLike("\\%")).test("a\\%b")).toBe(true);
    expect(likeToRegExp(escapeLike("\\%")).test("anything")).toBe(false);
  });
});
