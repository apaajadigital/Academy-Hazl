import { Router, type Request, type Response, type NextFunction } from "express";
import { z } from "zod";
import { authenticate } from "../middleware/authenticate.js";
import { validateBody } from "../middleware/validateBody.js";
import {
  enrollInCourse,
  getMyEnrollments,
  getEnrollment,
} from "../services/enrollment/enrollmentService.js";
import { successResponse } from "../types/index.js";

const router = Router();

const EnrollSchema = z.object({ courseId: z.string().uuid() });

// POST /api/enrollments — enroll in a course
router.post(
  "/",
  authenticate,
  validateBody(EnrollSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const enrollment = await enrollInCourse(req.user!.id, req.body.courseId);
      res.status(201).json(successResponse(enrollment));
    } catch (err) {
      next(err);
    }
  }
);

// GET /api/enrollments — my enrollments
router.get("/", authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const enrollments = await getMyEnrollments(req.user!.id);
    res.json(successResponse(enrollments));
  } catch (err) {
    next(err);
  }
});

// GET /api/enrollments/:courseId — single enrollment with course structure
router.get("/:courseId", authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const enrollment = await getEnrollment(req.user!.id, req.params.courseId!);
    res.json(successResponse(enrollment));
  } catch (err) {
    next(err);
  }
});

export default router;
