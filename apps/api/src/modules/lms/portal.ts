import { Router } from "express";
import { authenticate } from "../../middleware/authenticate.js";
import { prisma } from "../../db/prisma.js";
import { successResponse, AppError } from "../../types/index.js";

const router = Router();

// ─── LMS Portal (Student-facing) ─────────────────────────────────────────────

// Get my tenant memberships
router.get("/portal/me", authenticate, async (req, res, next) => {
  try {
    const userId = req.user!.id;

    // A user can reach a tenant two ways: enrolled as a batch member, or appointed
    // lms_admin for it (UserRole, the same fact `requireLmsAdmin` checks). Reading
    // only batch membership stranded "pure" admins — someone who administers a
    // tenant without studying in it got an empty list, so both the portal and the
    // admin-console link derived from this list were invisible to them.
    const [batchMemberships, adminRoles] = await Promise.all([
      prisma.lmsBatchMember.findMany({
        where: { userId },
        include: { batch: { include: { tenant: true } } },
      }),
      prisma.userRole.findMany({
        where: { userId, role: "lms_admin", NOT: { tenantId: null } },
        select: { tenantId: true },
      }),
    ]);

    const adminTenantIds = new Set(adminRoles.map((r) => r.tenantId as string));
    const byId = new Map(batchMemberships.map((m) => [m.batch.tenant.id, m.batch.tenant]));

    // UserRole.tenantId is a bare column with no relation to LmsTenant, so tenants
    // known only through an admin grant need a second lookup.
    const adminOnlyIds = [...adminTenantIds].filter((id) => !byId.has(id));
    if (adminOnlyIds.length > 0) {
      const adminTenants = await prisma.lmsTenant.findMany({ where: { id: { in: adminOnlyIds } } });
      adminTenants.forEach((t) => byId.set(t.id, t));
    }

    // `isAdmin` is served here so the client can render the admin-console link
    // directly instead of probing an admin endpoint once per tenant.
    const result = [...byId.values()].map((t) => ({ ...t, isAdmin: adminTenantIds.has(t.id) }));
    return res.json(successResponse(result));
  } catch (err) {
    next(err);
  }
});

// Get my courses in a tenant
router.get("/portal/:tenantSlug/courses", authenticate, async (req, res, next) => {
  try {
    const userId = req.user!.id;
    const { tenantSlug } = req.params;
    const tenant = await prisma.lmsTenant.findUnique({ where: { slug: tenantSlug } });
    if (!tenant) throw new AppError(404, "Tenant tidak ditemukan.");

    const enrollments = await prisma.lmsEnrollment.findMany({
      where: { tenantId: tenant.id, userId },
      include: {
        course: { include: { lessons: { select: { id: true } } } },
        progress: { select: { lessonId: true } },
        certificate: { select: { issuedAt: true } },
      },
    });

    const result = enrollments.map((e) => {
      const total = e.course.lessons.length;
      const completed = e.progress.length;
      const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
      return {
        courseId: e.courseId,
        courseTitle: e.course.title,
        description: e.course.description,
        totalLessons: total,
        completedLessons: completed,
        completionPct: pct,
        isCompleted: e.completedAt !== null,
        enrolledAt: e.enrolledAt,
        certificate: e.certificate,
      };
    });
    return res.json(successResponse(result));
  } catch (err) {
    next(err);
  }
});

// Get lessons for a course (portal)
router.get("/portal/:tenantSlug/courses/:courseId/lessons", authenticate, async (req, res, next) => {
  try {
    const userId = req.user!.id;
    const { tenantSlug, courseId } = req.params;
    const tenant = await prisma.lmsTenant.findUnique({ where: { slug: tenantSlug } });
    if (!tenant) throw new AppError(404, "Tenant tidak ditemukan.");

    const enrollment = await prisma.lmsEnrollment.findUnique({
      where: { courseId_userId: { courseId: courseId as string, userId } },
    });
    if (!enrollment) throw new AppError(403, "Anda belum terdaftar di kursus ini.");

    const [lessons, completedProgress] = await Promise.all([
      prisma.lmsLesson.findMany({
        where: { courseId: courseId as string },
        orderBy: { sortOrder: "asc" },
        include: { quizzes: { select: { id: true, question: true, options: true } } },
      }),
      prisma.lmsProgress.findMany({
        where: { enrollmentId: enrollment.id },
        select: { lessonId: true },
      }),
    ]);

    const completedSet = new Set(completedProgress.map((p) => p.lessonId));
    const result = lessons.map((l) => ({ ...l, isCompleted: completedSet.has(l.id) }));
    return res.json(successResponse(result));
  } catch (err) {
    next(err);
  }
});

// Mark lesson complete (portal)
router.post("/portal/:tenantSlug/courses/:courseId/lessons/:lessonId/complete", authenticate, async (req, res, next) => {
  try {
    const userId = req.user!.id;
    const { tenantSlug, courseId, lessonId } = req.params;
    const tenant = await prisma.lmsTenant.findUnique({ where: { slug: tenantSlug } });
    if (!tenant) throw new AppError(404, "Tenant tidak ditemukan.");

    const enrollment = await prisma.lmsEnrollment.findUnique({
      where: { courseId_userId: { courseId: courseId as string, userId } },
    });
    if (!enrollment) throw new AppError(403, "Anda belum terdaftar di kursus ini.");

    await prisma.lmsProgress.upsert({
      where: { enrollmentId_lessonId: { enrollmentId: enrollment.id, lessonId: lessonId as string } },
      // Denormalize tenantId for row-level isolation (defense-in-depth); enrollment.tenantId matches this tenant (resolved from slug).
      create: { enrollmentId: enrollment.id, lessonId: lessonId as string, tenantId: enrollment.tenantId },
      update: {},
    });

    // Check completion
    const [allLessons, completedProgress, course] = await Promise.all([
      prisma.lmsLesson.findMany({ where: { courseId: courseId as string }, select: { id: true } }),
      prisma.lmsProgress.findMany({ where: { enrollmentId: enrollment.id }, select: { id: true } }),
      prisma.lmsCourse.findUnique({ where: { id: courseId as string }, select: { title: true } }),
    ]);
    const totalLessons = allLessons.length;
    const completedLessons = completedProgress.length;
    if (totalLessons > 0 && completedLessons >= totalLessons && !enrollment.completedAt) {
      await prisma.lmsEnrollment.update({
        where: { id: enrollment.id },
        data: { completedAt: new Date() },
      });
      // Issue certificate
      await prisma.lmsCertificate.upsert({
        where: { enrollmentId: enrollment.id },
        create: {
          enrollmentId: enrollment.id,
          tenantId: tenant.id,
          userId,
          courseTitle: course?.title ?? "",
        },
        update: {},
      });
    }

    return res.json(successResponse({ lessonId, completed: true }));
  } catch (err) {
    next(err);
  }
});

// Get my certificates (portal)
router.get("/portal/:tenantSlug/certificates", authenticate, async (req, res, next) => {
  try {
    const userId = req.user!.id;
    const { tenantSlug } = req.params;
    const tenant = await prisma.lmsTenant.findUnique({ where: { slug: tenantSlug } });
    if (!tenant) throw new AppError(404, "Tenant tidak ditemukan.");

    const certs = await prisma.lmsCertificate.findMany({
      where: { tenantId: tenant.id, userId },
      orderBy: { issuedAt: "desc" },
    });
    return res.json(successResponse(certs));
  } catch (err) {
    next(err);
  }
});

// Download LMS certificate as PDF (with tenant branding)
router.get("/portal/:tenantSlug/certificates/:certId/download", authenticate, async (req, res, next) => {
  try {
    const userId = req.user!.id;
    const { tenantSlug, certId } = req.params;
    const tenant = await prisma.lmsTenant.findUnique({ where: { slug: tenantSlug } });
    if (!tenant) throw new AppError(404, "Tenant tidak ditemukan.");

    const cert = await prisma.lmsCertificate.findFirst({
      where: { id: certId as string, tenantId: tenant.id, userId },
      include: { user: { select: { name: true } } },
    });
    if (!cert) throw new AppError(404, "Sertifikat tidak ditemukan.");

    const PDFDocument = (await import("pdfkit")).default;
    const doc = new PDFDocument({ size: "A4", layout: "landscape", margin: 60 });
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="sertifikat-${certId}.pdf"`);
    doc.pipe(res);

    const primary = tenant.primaryColor ?? "#2563eb";

    // Background stripe
    doc.rect(0, 0, doc.page.width, 20).fill(primary);
    doc.rect(0, doc.page.height - 20, doc.page.width, 20).fill(primary);

    // Tenant name header
    doc.fillColor(primary).fontSize(22).font("Helvetica-Bold")
      .text(tenant.name, 0, 50, { align: "center" });

    // Certificate title
    doc.fillColor("#1D1D1F").fontSize(30).font("Helvetica-Bold")
      .text("SERTIFIKAT PENYELESAIAN", 0, 95, { align: "center" });

    // Recipient
    doc.fontSize(13).font("Helvetica").fillColor("#6E6E73")
      .text("Diberikan kepada:", 0, 155, { align: "center" });
    doc.fontSize(26).font("Helvetica-Bold").fillColor("#1D1D1F")
      .text(cert.user.name, 0, 175, { align: "center" });

    // Course
    doc.fontSize(13).font("Helvetica").fillColor("#6E6E73")
      .text("atas keberhasilan menyelesaikan kursus:", 0, 215, { align: "center" });
    doc.fontSize(18).font("Helvetica-Bold").fillColor(primary)
      .text(cert.courseTitle, 60, 238, { align: "center", width: doc.page.width - 120 });

    // Issue date
    const dateStr = new Date(cert.issuedAt).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });
    doc.fontSize(12).font("Helvetica").fillColor("#6E6E73")
      .text(`Diterbitkan pada ${dateStr}`, 0, 290, { align: "center" });

    // Certificate ID
    doc.fontSize(9).fillColor("#C0C0C0")
      .text(`ID Sertifikat: ${cert.id}`, 0, doc.page.height - 50, { align: "center" });

    doc.end();
  } catch (err) {
    next(err);
  }
});

export default router;
