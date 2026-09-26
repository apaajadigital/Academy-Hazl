import { Router, type Request, type Response, type NextFunction } from "express";
import { z } from "zod";
import { prisma } from "../db/prisma.js";
import { validateBody } from "../middleware/validateBody.js";
import { successResponse } from "../types/index.js";

const router = Router();

const leadSchema = z.object({
  name: z.string().min(2).max(120),
  email: z.string().email(),
  phone: z.string().max(40).optional(),
  company: z.string().max(160).optional(),
  message: z.string().max(2000).optional(),
  source: z.enum(["affiliate", "lms", "trainer", "free-class", "waitlist", "early-access-page", "contact", "community", "other"]).default("other"),
});

// POST /api/leads — public lead capture from marketing landing pages (TASK-040).
router.post(
  "/",
  validateBody(leadSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = req.body as z.infer<typeof leadSchema>;
      const lead = await prisma.lead.create({
        data,
        select: { id: true, createdAt: true },
      });
      res.status(201).json(
        successResponse({
          id: lead.id,
          message: "Terima kasih! Tim kami akan segera menghubungi Anda.",
        }),
      );
    } catch (err) {
      next(err);
    }
  },
);

export default router;
