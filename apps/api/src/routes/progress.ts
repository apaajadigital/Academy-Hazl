import { Router, type Request, type Response, type NextFunction } from "express";
import { z } from "zod";
import { authenticate } from "../middleware/authenticate.js";
import { validateBody } from "../middleware/validateBody.js";
import { updateLessonProgress } from "../services/enrollment/enrollmentService.js";
import { successResponse } from "../types/index.js";

const router = Router();

const ProgressSchema = z.object({
  enrollmentId: z.string().uuid(),
  lessonId: z.string().uuid(),
  watchedPct: z.number().min(0).max(100),
});

// POST /api/progress — upsert lesson progress
router.post(
  "/",
  authenticate,
  validateBody(ProgressSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { enrollmentId, lessonId, watchedPct } = req.body;
      const progress = await updateLessonProgress(
        req.user!.id,
        enrollmentId,
        lessonId,
        watchedPct
      );
      res.json(successResponse(progress));
    } catch (err) {
      next(err);
    }
  }
);

export default router;
