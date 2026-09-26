import { Router, type Request, type Response, type NextFunction } from "express";
import { z } from "zod";
import { validateBody } from "../../middleware/validateBody.js";
import { successResponse } from "../../types/index.js";
import * as eventService from "../../services/event/eventService.js";

/**
 * Admin event routes (BL-59). Mounted under `/api/admin` by `routes/admin.ts`,
 * which already applies `authenticate` + super-admin guard. Prisma access is
 * delegated to `services/event/eventService` so this stays a thin HTTP adapter
 * (SSOT §9.6).
 */
const router = Router();

// ─── Admin: Events ────────────────────────────────────────────────────────────

const EventListSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  status: z.string().optional(),
  search: z.string().optional(),
});

const EventIdParamSchema = z.object({ id: z.string().min(1).max(100) });

/**
 * BL-59: this endpoint used to accept an unvalidated body. Only `status` was —
 * and still is — applied; the enum now mirrors the Event.status values allowed
 * by the schema so a typo can no longer be written to the database.
 */
const EventStatusPatchSchema = z.object({
  status: z.enum(["draft", "published", "cancelled"]).optional(),
});

// GET /api/admin/events
router.get("/events", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { page, limit, status, search } = EventListSchema.parse(req.query);
    const result = await eventService.listAdminEvents({ page, limit, status, search });

    // Contract: `total` stays in `meta`, never in `data`.
    res.json(successResponse(result.data, { total: result.total, page: result.page, limit: result.limit }));
  } catch (err) {
    next(err);
  }
});

// PATCH /api/admin/events/:id
router.patch(
  "/events/:id",
  validateBody(EventStatusPatchSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = EventIdParamSchema.parse(req.params);
      const { status } = req.body as z.infer<typeof EventStatusPatchSchema>;
      const event = await eventService.updateEventStatus(id, status);
      res.json(successResponse(event));
    } catch (err) {
      next(err);
    }
  },
);

export default router;
