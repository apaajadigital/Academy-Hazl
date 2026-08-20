import { Router } from "express";
import fs from "node:fs";
import path from "node:path";
import { z } from "zod";
import { authenticate } from "../middleware/authenticate.js";
import { prisma } from "../db/prisma.js";
import { successResponse, AppError } from "../types/index.js";
import { logger } from "../lib/logger.js";
import { escapeLike } from "../lib/escapeLike.js";
import {
  EBOOK_DOWNLOAD_TTL_SECONDS,
  isLocalUploadPath,
  resolveEbookFilePath,
  signEbookDownload,
  verifyEbookDownload,
} from "../lib/ebookFile.js";

const router = Router();

const ListQuerySchema = z.object({
  // `.catch()` (not a hard min/max failure) preserves the previous lenient
  // behaviour: callers such as apps/web/app/sitemap.ts request `limit=200` and
  // relied on it being clamped to 50 rather than rejected with a 400.
  page: z.coerce.number().int().positive().catch(1),
  limit: z.coerce.number().int().positive().catch(12).transform((n) => Math.min(n, 50)),
  category: z.string().trim().min(1).optional().catch(undefined),
  // `.max(100)` bounds the term this endpoint feeds into a case-insensitive
  // `contains` over title+author. Those columns carry no trigram/text index, so
  // every search is a sequential scan whose per-row cost grows with the pattern
  // length — and this route is PUBLIC and unauthenticated, so an arbitrarily
  // long `search` is a free CPU amplifier. Same `.catch()` style as the fields
  // above: an oversized term degrades to "no search filter" instead of a 400.
  search: z.string().trim().min(1).max(100).optional().catch(undefined),
});

// List published ebooks
router.get("/", async (req, res, next) => {
  try {
    const { page, limit, category, search } = ListQuerySchema.parse(req.query);
    const skip = (page - 1) * limit;

    // BL-108: escape LIKE metacharacters before the term reaches `contains`.
    // This route is public and unauthenticated, so `?search=%` would otherwise
    // hand anyone an unfiltered full-table scan.
    const term = search ? escapeLike(search) : undefined;

    const where = {
      status: "published",
      ...(category ? { category } : {}),
      // Mirrors modules/admin/ebooks.ts: case-insensitive contains over
      // title + author, so public and admin search behave identically.
      ...(term
        ? {
            OR: [
              { title: { contains: term, mode: "insensitive" as const } },
              { author: { contains: term, mode: "insensitive" as const } },
            ],
          }
        : {}),
    };

    const [ebooks, total] = await Promise.all([
      prisma.eBook.findMany({ where, orderBy: { createdAt: "desc" }, skip, take: limit }),
      prisma.eBook.count({ where }),
    ]);

    return res.json(successResponse(ebooks, { total, page, limit }));
  } catch (err) {
    next(err);
  }
});

router.get("/my", authenticate, async (req, res, next) => {
  try {
    const orderItems = await prisma.orderItem.findMany({
      where: {
        itemType: "ebook",
        order: { userId: req.user!.id, status: "paid" },
      },
      select: {
        itemId: true,
        order: { select: { paidAt: true } },
      },
    });

    const ebookIds = orderItems.map((oi) => oi.itemId);
    if (ebookIds.length === 0) return res.json(successResponse([]));

    const ebooks = await prisma.eBook.findMany({
      where: { id: { in: ebookIds } },
      orderBy: { createdAt: "desc" },
    });

    const mapped = ebooks.map((eb) => {
      const item = orderItems.find((oi) => oi.itemId === eb.id);
      return {
        ...eb,
        purchasedAt: item?.order.paidAt ?? eb.createdAt,
      };
    });

    return res.json(successResponse(mapped));
  } catch (err) {
    next(err);
  }
});

// Get single ebook detail
router.get("/:slug", async (req, res, next) => {
  try {
    const ebook = await prisma.eBook.findUnique({ where: { slug: req.params.slug } });
    if (!ebook || ebook.status !== "published") throw new AppError(404, "E-Book tidak ditemukan.");
    return res.json(successResponse(ebook));
  } catch (err) {
    next(err);
  }
});

// Get ebook file URL (requires ownership)
router.get("/:slug/file", authenticate, async (req, res, next) => {
  try {
    const ebook = await prisma.eBook.findUnique({ where: { slug: req.params.slug } });
    if (!ebook || ebook.status !== "published") throw new AppError(404, "E-Book tidak ditemukan.");

    // Check ownership: user has a paid order for this ebook
    const hasPurchased = await prisma.orderItem.findFirst({
      where: {
        itemType: "ebook",
        itemId: ebook.id,
        order: { userId: req.user!.id, status: "paid" },
      },
    });

    if (!hasPurchased && !req.user!.roles.includes("super_admin")) {
      throw new AppError(403, "Anda belum memiliki akses ke e-book ini.");
    }

    // Files hosted on a third party (R2/CDN/absolute URL) cannot be protected by
    // us — we do not control their access rules — so they pass through unchanged.
    if (!isLocalUploadPath(ebook.fileUrl)) {
      return res.json(successResponse({ fileUrl: ebook.fileUrl }));
    }

    // Local uploads are gated: hand out a short-lived signed link instead of the
    // raw /uploads path (which app.ts blocks for the ebooks sub-directory).
    // The response shape stays `{ fileUrl }` so existing web clients keep working.
    const userId = req.user!.id;
    const { exp, sig } = signEbookDownload(ebook.slug, userId, EBOOK_DOWNLOAD_TTL_SECONDS);
    const signedUrl =
      `/api/ebooks/${encodeURIComponent(ebook.slug)}/download` +
      `?uid=${encodeURIComponent(userId)}&exp=${exp}&sig=${sig}`;

    return res.json(successResponse({ fileUrl: signedUrl }));
  } catch (err) {
    next(err);
  }
});

const DownloadQuerySchema = z.object({
  // `uid` is part of the signed payload, so a tampered value invalidates `sig`.
  // It travels in the query string because browsers download via a plain
  // <a href download> that cannot carry an Authorization header.
  uid: z.string().min(1),
  exp: z.coerce.number().int(),
  sig: z.string().min(1),
});

// Stream a purchased ebook. Deliberately NOT behind `authenticate`: the
// signature minted by /:slug/file is the credential (see lib/ebookFile.ts).
router.get("/:slug/download", async (req, res, next) => {
  try {
    const query = DownloadQuerySchema.safeParse(req.query);
    if (!query.success) {
      throw new AppError(401, "Tautan unduhan tidak valid.");
    }

    const { slug } = req.params;
    const { uid, exp, sig } = query.data;

    if (!verifyEbookDownload(slug, uid, exp, sig)) {
      logger.warn("ebook download rejected: bad or expired signature", { slug, uid });
      throw new AppError(403, "Tautan unduhan tidak valid atau sudah kedaluwarsa.");
    }

    // Re-check the ebook on every download: a link minted before the ebook was
    // unpublished must stop working immediately.
    const ebook = await prisma.eBook.findUnique({ where: { slug } });
    if (!ebook || ebook.status !== "published") throw new AppError(404, "E-Book tidak ditemukan.");

    const filePath = resolveEbookFilePath(ebook.fileUrl);
    if (!filePath) {
      // Either an external URL (nothing to stream) or a path that escapes the
      // upload directory — refuse rather than serve arbitrary filesystem content.
      logger.warn("ebook download rejected: unsafe or non-local fileUrl", { slug });
      throw new AppError(403, "Berkas e-book tidak dapat diakses.");
    }

    if (!fs.existsSync(filePath)) throw new AppError(404, "Berkas e-book tidak ditemukan.");

    return res.download(filePath, path.basename(filePath), (err) => {
      // Headers are already sent once streaming starts; just log and let the
      // socket close rather than attempting a second response.
      if (err) logger.error("ebook download stream failed", { slug, err: err.message });
    });
  } catch (err) {
    next(err);
  }
});

export default router;
