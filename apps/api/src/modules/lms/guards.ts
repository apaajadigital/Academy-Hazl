import { authenticate } from "../../middleware/authenticate.js";
import { prisma } from "../../db/prisma.js";
import { errorResponse, AppError } from "../../types/index.js";

/** Allow only super admins. */
export function requireSuperAdmin(
  req: Parameters<typeof authenticate>[0],
  res: Parameters<typeof authenticate>[1],
  next: Parameters<typeof authenticate>[2],
) {
  if (!req.user?.roles.includes("super_admin")) {
    return res.status(403).json(errorResponse("FORBIDDEN", "Akses ditolak."));
  }
  next();
}

/** Allow tenant LMS admins (or super admins) for the `:tenantId` in the route. */
export async function requireLmsAdmin(
  req: Parameters<typeof authenticate>[0],
  res: Parameters<typeof authenticate>[1],
  next: Parameters<typeof authenticate>[2],
) {
  const { tenantId } = req.params;
  const userId = req.user?.id;
  if (!userId || !tenantId) return res.status(403).json(errorResponse("FORBIDDEN", "Akses ditolak."));
  const isSuperAdmin = req.user?.roles.includes("super_admin");
  if (isSuperAdmin) return next();
  const role = await prisma.userRole.findFirst({
    where: { userId, role: "lms_admin", tenantId },
  });
  if (!role) return res.status(403).json(errorResponse("FORBIDDEN", "Akses ditolak."));
  // BL-168: `return` is load-bearing, not style. This is not Express middleware —
  // every LMS route does `await requireLmsAdmin(req, res, async () => {...})`, so
  // only a returned promise gets adopted by that await and lands inside the
  // route's try/catch. A bare `next()` dropped the handler's promise: the route
  // completed, the catch went out of scope, and the handler's AppError rejected
  // afterwards with nobody listening. apps/api registers no unhandledRejection
  // handler and production runs Node 22, where the default is `throw` — so the
  // process died. A tenant lms_admin mistyping a batch id was enough to do it.
  // The super-admin branch above always had its `return` and was never affected,
  // which is why this only ever bit tenant admins.
  return next();
}

// ─── Tenant-scoping helpers (H1) ──────────────────────────────────────────────
// `requireLmsAdmin` only proves the caller administers the tenant in the URL. It
// does NOT prove that a nested resource addressed by its own id (courseId,
// lessonId, batchId) belongs to that tenant. Without these checks an lms_admin of
// tenant A could pass their own tenantId plus a foreign lessonId/batchId and reach
// into tenant B. Every nested handler must resolve the child THROUGH the tenant.

/** Verify a course belongs to the tenant; throws 404 otherwise. */
export async function assertCourseInTenant(courseId: string, tenantId: string) {
  const course = await prisma.lmsCourse.findFirst({ where: { id: courseId, tenantId } });
  if (!course) throw new AppError(404, "Course tidak ditemukan.");
  return course;
}

/** Verify a lesson belongs to a course in the tenant; throws 404 otherwise. */
export async function assertLessonInTenant(lessonId: string, tenantId: string) {
  const lesson = await prisma.lmsLesson.findFirst({ where: { id: lessonId, course: { tenantId } } });
  if (!lesson) throw new AppError(404, "Lesson tidak ditemukan.");
  return lesson;
}

/** Verify a batch belongs to the tenant; throws 404 otherwise. */
export async function assertBatchInTenant(batchId: string, tenantId: string) {
  const batch = await prisma.lmsBatch.findFirst({ where: { id: batchId, tenantId } });
  if (!batch) throw new AppError(404, "Batch tidak ditemukan.");
  return batch;
}
