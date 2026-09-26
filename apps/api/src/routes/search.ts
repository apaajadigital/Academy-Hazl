import { Router, type Request, type Response, type NextFunction } from "express";
import { listCourses } from "../services/course/courseService.js";
import { searchPublishedEvents } from "../services/event/eventService.js";
import { searchPublishedEbooks } from "../services/ebook/ebookSearchService.js";
import { logger } from "../lib/logger.js";
import { successResponse } from "../types/index.js";

const router = Router();

type SearchSlice = { data: unknown[]; total: number };

/**
 * Run one secondary search vertical in isolation.
 *
 * BL-63 (events) and BL-103 (ebooks) participate in global search alongside
 * courses. Each lookup is isolated so a search/DB failure in one vertical
 * degrades to zero results for that vertical instead of failing the whole
 * request — courses stay searchable either way.
 */
async function findOrEmpty(
  label: string,
  run: () => Promise<{ data: unknown[]; total: number }>,
): Promise<SearchSlice> {
  try {
    const result = await run();
    return { data: result.data, total: result.total };
  } catch (err) {
    logger.warn(`${label} search failed, omitting it from the results`, { err: String(err) });
    return { data: [], total: 0 };
  }
}

// GET /api/search?q=&type=course&page=1&limit=20
router.get("/", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const q = (req.query.q as string | undefined)?.trim();
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string) || 20));

    if (!q || q.length < 2) {
      return res.json(
        successResponse({ courses: [], total: 0, events: [], eventsTotal: 0, ebooks: [], ebooksTotal: 0, q: q ?? "" }),
      );
    }

    const result = await listCourses({ q, page, limit });
    // The two secondary verticals are independent, so they run concurrently
    // rather than adding their latencies together. `findOrEmpty` never rejects,
    // so `Promise.all` cannot fail here.
    const [events, ebooks] = await Promise.all([
      findOrEmpty("event", () => searchPublishedEvents({ q, page, limit })),
      findOrEmpty("ebook", () => searchPublishedEbooks({ q, page, limit })),
    ]);

    res.json(
      successResponse({
        courses: result.data,
        // `total` stays course-scoped for backward compatibility with existing
        // clients; the event and ebook counts are reported separately.
        total: result.total,
        events: events.data,
        eventsTotal: events.total,
        ebooks: ebooks.data,
        ebooksTotal: ebooks.total,
        page: result.page,
        limit: result.limit,
        q,
      }),
    );
  } catch (err) {
    next(err);
  }
});

export default router;
