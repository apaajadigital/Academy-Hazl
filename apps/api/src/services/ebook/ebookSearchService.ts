import { prisma } from "../../db/prisma.js";
import { logger } from "../../lib/logger.js";
import { searchEbooks, type IndexEbookInput } from "../search/meilisearch.js";
import { syncEbookSearchIndex, removeEbookFromSearchIndex } from "../../jobs/processors/searchIndex.js";

/**
 * E-Book search service (BL-103).
 *
 * Scoped deliberately to search/indexing rather than the whole e-book domain:
 * the read and download paths in routes/ebooks.ts and modules/admin/ebooks.ts
 * still talk to Prisma directly, and moving them is a separate refactor. What
 * this file guarantees is that the route layer never contains index logic — it
 * calls `reindexEbook` / `removeEbookFromIndex` and nothing else (SSOT §9.6).
 */

/**
 * Public projection for search results.
 *
 * `fileUrl` is excluded on purpose: /api/search is unauthenticated, and the
 * download link is only meant to be handed out by `GET /api/ebooks/:slug/file`
 * after the purchase check. `status` is excluded because every row here is
 * published by construction.
 */
const PUBLIC_SEARCH_SELECT = {
  id: true,
  slug: true,
  title: true,
  description: true,
  price: true,
  salePrice: true,
  coverUrl: true,
  author: true,
  pages: true,
  category: true,
  totalSold: true,
  createdAt: true,
} as const;

export type PaginatedResult<T> = { data: T[]; total: number; page: number; limit: number };

/** Structural view of a persisted EBook row. Decimal columns are typed by their
 *  `toString()` capability so this service does not import Prisma runtime types. */
type PersistedEbook = {
  id: string;
  slug: string;
  title: string;
  description?: string | null;
  author?: string | null;
  category?: string | null;
  status: string;
  coverUrl?: string | null;
  pages?: number | null;
  price: { toString(): string };
  salePrice?: { toString(): string } | null;
  totalSold?: number;
};

function toEbookSearchDocument(ebook: PersistedEbook): IndexEbookInput {
  return {
    id: ebook.id,
    slug: ebook.slug,
    title: ebook.title,
    description: ebook.description ?? null,
    author: ebook.author ?? null,
    category: ebook.category ?? null,
    status: ebook.status,
    coverUrl: ebook.coverUrl ?? null,
    pages: ebook.pages ?? null,
    price: ebook.price.toString(),
    salePrice: ebook.salePrice === null || ebook.salePrice === undefined ? null : ebook.salePrice.toString(),
    totalSold: ebook.totalSold ?? 0,
  };
}

/**
 * Best-effort index refresh for one persisted ebook (BL-103).
 *
 * The mapping is INSIDE the guard on purpose: indexing is a side-effect of an
 * admin write, so neither a malformed row (a partial `update` result missing the
 * Decimal columns, say) nor an unreachable Meilisearch may turn a successful
 * create/update into a 500.
 */
export async function reindexEbook(ebook: PersistedEbook): Promise<void> {
  try {
    await syncEbookSearchIndex(toEbookSearchDocument(ebook));
  } catch (err) {
    logger.warn("ebook search reindex skipped", { ebookId: ebook?.id, err: String(err) });
  }
}

/** Drop a hard-deleted ebook from the index. Never throws. */
export async function removeEbookFromIndex(ebookId: string): Promise<void> {
  try {
    await removeEbookFromSearchIndex(ebookId);
  } catch (err) {
    logger.warn("ebook search removal skipped", { ebookId, err: String(err) });
  }
}

/**
 * Full-text search over published ebooks, used by `GET /api/search` (BL-103).
 * Mirrors `searchPublishedEvents`: Meilisearch first, then re-fetch from Prisma
 * so the response shape is DB-authoritative, with an ILIKE fallback when
 * Meilisearch is unavailable or has not indexed anything yet (degrade-safe).
 */
export async function searchPublishedEbooks(filter: {
  q: string;
  page?: number;
  limit?: number;
}): Promise<PaginatedResult<unknown>> {
  const { q, page = 1, limit = 12 } = filter;
  const skip = (page - 1) * limit;

  const { hits, total: indexTotal } = await searchEbooks(q, {
    limit,
    offset: skip,
    filter: 'status = "published"',
  });
  if (hits.length > 0) {
    const slugs = hits.map((h) => h.slug);
    // The status filter is re-applied here: the index can lag behind a status
    // change by one sync, the DB never does.
    const ebooks = await prisma.eBook.findMany({
      where: { slug: { in: slugs }, status: "published" },
      select: PUBLIC_SEARCH_SELECT,
    });
    const ordered = slugs.map((s) => ebooks.find((e) => e.slug === s)).filter(Boolean);
    // As in BL-63b: `total` must describe the whole match set, not this page, or
    // pagination caps at a single page. The index count can lag the DB, so it is
    // floored by what the caller can already see and never under-reports the
    // rows handed back on this page.
    return { data: ordered, total: Math.max(indexTotal, skip + ordered.length), page, limit };
  }

  // Mirrors the `contains` filter used by the public list route so search and
  // browse agree on what "matches" means when Meilisearch is down.
  const where = {
    status: "published",
    OR: [
      { title: { contains: q, mode: "insensitive" as const } },
      { description: { contains: q, mode: "insensitive" as const } },
      { author: { contains: q, mode: "insensitive" as const } },
      { category: { contains: q, mode: "insensitive" as const } },
    ],
  };

  const [data, total] = await Promise.all([
    prisma.eBook.findMany({
      where,
      select: PUBLIC_SEARCH_SELECT,
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
    }),
    prisma.eBook.count({ where }),
  ]);

  return { data, total, page, limit };
}
