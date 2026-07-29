import { Router, type Request, type Response, type NextFunction } from "express";
import { listCourses } from "../services/course/courseService.js";
import { searchPublishedEvents } from "../services/event/eventService.js";
import { logger } from "../lib/logger.js";
import { successResponse } from "../types/index.js";

const router = Router();

/**
 * BL-63: events participate in global search alongside courses. Their lookup is
 * isolated so a search/DB failure on the event side degrades to zero events
 * instead of failing the whole request — courses stay searchable either way.
 */
async function findEvents(q: string, page: number, limit: number): Promise<{ data: unknown[]; total: number }> {
  try {
    const result = await searchPublishedEvents({ q, page, limit });
    return { data: result.data, total: result.total };
  } catch (err) {
    logger.warn("event search failed, returning courses only", { err: String(err) });
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
      return res.json(successResponse({ courses: [], total: 0, events: [], eventsTotal: 0, q: q ?? "" }));
    }

    const result = await listCourses({ q, page, limit });
    const events = await findEvents(q, page, limit);

    res.json(
      successResponse({
        courses: result.data,
        // `total` stays course-scoped for backward compatibility with existing
        // clients; the event count is reported separately.
        total: result.total,
        events: events.data,
        eventsTotal: events.total,
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
