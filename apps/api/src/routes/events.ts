import { Router, type RequestHandler } from "express";
import { z } from "zod";
import { authenticate } from "../middleware/authenticate.js";
import { authorize } from "../middleware/authorize.js";
import { validateBody } from "../middleware/validateBody.js";
import { asyncHandler } from "../lib/asyncHandler.js";
import { successResponse } from "../types/index.js";
import * as eventService from "../services/event/eventService.js";

/**
 * Event HTTP routes (BL-59).
 *
 * This layer only parses/validates the request, delegates to
 * `services/event/eventService`, and wraps the result in the standard
 * `{success,data,error,meta}` envelope. No Prisma access and no business rules
 * live here (SSOT §9.6). Role checks use the shared `authorize()` middleware
 * instead of the six hand-rolled, cast-laden super-admin role checks this file
 * used to carry.
 */
const router = Router();

// ─── Request schemas (Zod at every boundary — SSOT §9.5) ─────────────────────

const listQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  // Hard ceiling keeps the public catalog cheap to serve.
  limit: z.coerce.number().int().min(1).max(50).default(12),
  // `type` stays a free-form string: the catalog is filtered by whatever event
  // taxonomy is stored, and an unknown value simply yields an empty page.
  type: z.string().optional(),
  // Presence-style boolean flag: only the literal "true" enables the filter,
  // matching the pre-refactor behaviour for any other value.
  featured: z
    .string()
    .optional()
    .transform((v) => v === "true"),
  // Archive opt-in. Same presence-style convention as `featured`: only the
  // literal "true" flips it, so an absent or malformed value keeps the safe
  // default of showing upcoming events only.
  past: z
    .string()
    .optional()
    .transform((v) => v === "true"),
});

const adminListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
  // Both filters are optional and additive, so an existing caller that sends
  // only page/limit keeps the previous "every status, newest first" result.
  // `status` stays a free-form string rather than the canonical enum: legacy
  // rows carry lifecycle values the enum no longer accepts, and an admin must
  // still be able to list them.
  status: z.string().min(1).max(50).optional(),
  search: z.string().min(1).max(200).optional(),
});

const slugParamSchema = z.object({ slug: z.string().min(1).max(200) });
const idParamSchema = z.object({ id: z.string().min(1).max(100) });

const eventSchema = z.object({
  slug: z.string().min(2).max(100),
  title: z.string().min(3).max(200),
  description: z.string().optional(),
  type: z.enum(["online", "offline", "hybrid"]).default("online"),
  status: z.enum(["draft", "published", "cancelled"]).default("draft"),
  startDate: z.string().datetime(),
  endDate: z.string().datetime().optional(),
  location: z.string().optional(),
  venue: z.string().optional(),
  price: z.number().min(0).default(0),
  salePrice: z.number().min(0).optional(),
  quota: z.number().int().min(1).optional(),
  coverUrl: z.string().url().optional(),
  speakerName: z.string().optional(),
  speakerBio: z.string().optional(),
  isFeatured: z.boolean().default(false),
});

const eventPatchSchema = eventSchema.partial();

const checkinSchema = z.object({ ticketCode: z.string().min(1) });

/** Every admin endpoint below is super-admin only (BL-59). */
const adminOnly: RequestHandler[] = [authenticate, authorize("super_admin")];

// ─── Public ──────────────────────────────────────────────────────────────────

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const query = listQuerySchema.parse(req.query);
    const { data, total, page, limit } = await eventService.listPublishedEvents(query);
    res.json(successResponse(data, { total, page, limit }));
  }),
);

router.get(
  "/:slug",
  asyncHandler(async (req, res) => {
    const { slug } = slugParamSchema.parse(req.params);
    const event = await eventService.getPublishedEventBySlug(slug);
    res.json(successResponse(event));
  }),
);

// ─── Authenticated ────────────────────────────────────────────────────────────

router.get(
  "/:slug/registration",
  authenticate,
  asyncHandler(async (req, res) => {
    const { slug } = slugParamSchema.parse(req.params);
    const registration = await eventService.getUserRegistration(slug, req.user!.id);
    res.json(successResponse(registration));
  }),
);

// ─── Dashboard: my tickets ────────────────────────────────────────────────────

router.get(
  "/my/tickets",
  authenticate,
  asyncHandler(async (req, res) => {
    const registrations = await eventService.listUserTickets(req.user!.id);
    res.json(successResponse(registrations));
  }),
);

// ─── Admin ────────────────────────────────────────────────────────────────────

router.get(
  "/admin/all",
  ...adminOnly,
  asyncHandler(async (req, res) => {
    const query = adminListQuerySchema.parse(req.query);
    const result = await eventService.listAllEvents(query);
    res.json(successResponse(result.data, { total: result.total, page: result.page, limit: result.limit }));
  }),
);

/**
 * Admin detail by id.
 *
 * Declared AFTER `/admin/all` so the literal path keeps winning over this
 * parameterised one. It exists because the only endpoint that returned a
 * non-published event was the paginated list, which forced the edit screen to
 * walk up to 20 pages — and to give up (404) on any event past that window.
 */
router.get(
  "/admin/:id",
  ...adminOnly,
  asyncHandler(async (req, res) => {
    const { id } = idParamSchema.parse(req.params);
    const event = await eventService.getAdminEventById(id);
    res.json(successResponse(event));
  }),
);

router.post(
  "/admin",
  ...adminOnly,
  validateBody(eventSchema),
  asyncHandler(async (req, res) => {
    const dto = req.body as z.infer<typeof eventSchema>;
    const event = await eventService.createEvent(dto);
    res.status(201).json(successResponse(event));
  }),
);

router.patch(
  "/admin/:id",
  ...adminOnly,
  validateBody(eventPatchSchema),
  asyncHandler(async (req, res) => {
    const { id } = idParamSchema.parse(req.params);
    const dto = req.body as z.infer<typeof eventPatchSchema>;
    const updated = await eventService.updateEvent(id, dto);
    res.json(successResponse(updated));
  }),
);

router.delete(
  "/admin/:id",
  ...adminOnly,
  asyncHandler(async (req, res) => {
    const { id } = idParamSchema.parse(req.params);
    // BL-62b: 409 instead of a raw Prisma P2003 when registrations exist.
    const result = await eventService.deleteEvent(id);
    res.json(successResponse(result));
  }),
);

// ─── Admin: check-in ─────────────────────────────────────────────────────────

router.get(
  "/admin/:id/registrations",
  ...adminOnly,
  asyncHandler(async (req, res) => {
    const { id } = idParamSchema.parse(req.params);
    const registrations = await eventService.listEventRegistrations(id);
    res.json(successResponse(registrations));
  }),
);

router.post(
  "/admin/checkin",
  ...adminOnly,
  validateBody(checkinSchema),
  asyncHandler(async (req, res) => {
    const { ticketCode } = req.body as z.infer<typeof checkinSchema>;
    const updated = await eventService.checkInTicket(ticketCode);
    res.json(successResponse(updated));
  }),
);

export default router;
