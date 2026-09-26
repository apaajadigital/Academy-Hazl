import { Router } from "express";
import tenantRouter from "../modules/lms/tenant.js";
import batchRouter from "../modules/lms/batch.js";
import inviteRouter from "../modules/lms/invite.js";
import courseRouter from "../modules/lms/course.js";
import reportRouter from "../modules/lms/report.js";
import publicRouter from "../modules/lms/public.js";
import portalRouter from "../modules/lms/portal.js";

/**
 * LMS B2B routes (TASK-012). The former 856-line monolith is split into
 * domain sub-routers under `modules/lms/`, each < 400 lines. All sub-routers
 * mount at the same `/api/lms` base so endpoint paths are unchanged.
 */
const router = Router();

router.use(tenantRouter);
router.use(batchRouter);
router.use(inviteRouter);
router.use(courseRouter);
router.use(reportRouter);
router.use(publicRouter);
router.use(portalRouter);

export default router;
