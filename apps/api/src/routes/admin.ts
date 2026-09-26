import { Router, type Request, type Response, type NextFunction } from "express";
import { authenticate } from "../middleware/authenticate.js";
import { AppError, type Role } from "../types/index.js";
import statsRouter from "../modules/admin/stats.js";
import usersRouter from "../modules/admin/users.js";
import coursesRouter from "../modules/admin/courses.js";
import transactionsRouter from "../modules/admin/transactions.js";
import leadsRouter from "../modules/admin/leads.js";
import eventsRouter from "../modules/admin/events.js";
import blogRouter from "../modules/admin/blog.js";
import reviewsRouter from "../modules/admin/reviews.js";
import couponsRouter from "../modules/admin/coupons.js";
import ebooksRouter from "../modules/admin/ebooks.js";
import portfoliosRouter from "../modules/admin/portfolios.js";
import payoutsRouter from "../modules/admin/payouts.js";
import systemHealthRouter from "../modules/admin/system-health.js";

/**
 * Admin routes. The former 668-line monolith is split into resource sub-routers
 * under `modules/admin/`, each < 400 lines. All sub-routers mount at the same
 * `/api/admin` base so endpoint paths are unchanged. The shared global
 * middleware (authenticate + requireAdmin) is applied ONCE here before the
 * sub-routers, exactly as in the original file.
 */
const router = Router();

/**
 * Role check against the authenticated user, typed against `Role`.
 *
 * The previous `roles.includes("super_admin" as never)` compiled the gate for
 * EVERY /api/admin route with the compiler switched off: rename or misspell the
 * role and the cast silently accepts it, producing a guard that can never match
 * — with no build error to notice. `readonly Role[]` makes an unknown role name
 * a compile failure. (Same shape as `hasAnyRole` in routes/trainer.ts; it is
 * re-stated locally rather than imported because that helper is private to the
 * trainer router.)
 */
function hasAnyRole(req: Request, allowed: readonly Role[]): boolean {
  const roles: readonly Role[] = req.user?.roles ?? [];
  return allowed.some((role) => roles.includes(role));
}

const ADMIN_ROLES: readonly Role[] = ["super_admin"];

// All admin routes require authentication + super_admin role
function requireAdmin(req: Request, _res: Response, next: NextFunction) {
  if (!hasAnyRole(req, ADMIN_ROLES)) {
    return next(new AppError(403, "Akses ditolak. Hanya super admin."));
  }
  next();
}

router.use(authenticate, requireAdmin);

router.use(statsRouter);
router.use(usersRouter);
router.use(coursesRouter);
router.use(transactionsRouter);
router.use(leadsRouter);
router.use(eventsRouter);
router.use(blogRouter);
router.use(reviewsRouter);
router.use(couponsRouter);
router.use(ebooksRouter);
router.use(portfoliosRouter);
router.use(payoutsRouter);
router.use(systemHealthRouter);

export default router;
