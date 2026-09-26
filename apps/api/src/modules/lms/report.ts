import { Router } from "express";
import { authenticate } from "../../middleware/authenticate.js";
import { prisma } from "../../db/prisma.js";
import { successResponse, AppError } from "../../types/index.js";
import { requireLmsAdmin, assertBatchInTenant } from "./guards.js";

const router = Router();

// ─── Reports ──────────────────────────────────────────────────────────────────

router.get("/tenants/:tenantId/reports/completion", authenticate, async (req, res, next) => {
  try {
    await requireLmsAdmin(req, res, async () => {
      const { tenantId } = req.params;
      const { batchId, courseId } = req.query as { batchId?: string; courseId?: string };

      const enrollments = await prisma.lmsEnrollment.findMany({
        where: {
          tenantId,
          ...(courseId ? { courseId } : {}),
        },
        include: {
          user: { select: { id: true, name: true, email: true } },
          course: { select: { id: true, title: true } },
          progress: true,
          certificate: { select: { issuedAt: true } },
        },
      });

      const courseLessonCounts = await prisma.lmsLesson.groupBy({
        by: ["courseId"],
        where: { course: { tenantId } },
        _count: { id: true },
      });
      const lessonCountMap = new Map(courseLessonCounts.map((r) => [r.courseId, r._count.id]));

      const rows = enrollments.map((e) => {
        const totalLessons = lessonCountMap.get(e.courseId) ?? 0;
        const completedLessons = e.progress.length;
        const pct = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;
        return {
          userId: e.userId,
          userName: e.user.name,
          userEmail: e.user.email,
          courseId: e.courseId,
          courseTitle: e.course.title,
          totalLessons,
          completedLessons,
          completionPct: pct,
          isCompleted: e.completedAt !== null,
          completedAt: e.completedAt,
          certificateIssuedAt: e.certificate?.issuedAt ?? null,
          enrolledAt: e.enrolledAt,
        };
      });

      // Filter by batchId if provided
      let filtered = rows;
      if (batchId) {
        // BL-169: resolve the batch THROUGH the tenant first. `lmsBatchMember`
        // has no tenantId column, so a bare `where: { batchId }` happily reads a
        // foreign tenant's roster.
        //
        // No foreign ROW ever escaped — `rows` above is already tenant-scoped, so
        // the response only ever contained this tenant's enrolments. What leaked
        // was the FILTER: an lms_admin of tenant A passing tenant B's batchId
        // learned which of their own users also sit in that batch. An intersection
        // oracle over lmsBatchMember, invisible in the response body, which is why
        // it survived review — every row on screen genuinely belonged to the
        // caller.
        //
        // This was the only nested LMS handler skipping the H1 guard the helpers
        // below `requireLmsAdmin` exist to enforce.
        // `tenantId` is `string | undefined` off req.params, but requireLmsAdmin
        // above already 403s when it is missing, so by here it is present. Same
        // cast the other nested handlers use (batch.ts:53, :70).
        await assertBatchInTenant(batchId, tenantId as string);
        const memberIds = (
          await prisma.lmsBatchMember.findMany({ where: { batchId }, select: { userId: true } })
        ).map((m) => m.userId);
        filtered = rows.filter((r) => memberIds.includes(r.userId));
      }

      return res.json(successResponse(filtered));
    });
  } catch (err) {
    next(err);
  }
});

// CSV export
router.get("/tenants/:tenantId/reports/completion/csv", authenticate, async (req, res, next) => {
  try {
    await requireLmsAdmin(req, res, async () => {
      const { tenantId } = req.params;
      const enrollments = await prisma.lmsEnrollment.findMany({
        where: { tenantId },
        include: {
          user: { select: { name: true, email: true } },
          course: { select: { title: true } },
          progress: true,
        },
      });
      const courseLessonCounts = await prisma.lmsLesson.groupBy({
        by: ["courseId"],
        where: { course: { tenantId } },
        _count: { id: true },
      });
      const lessonCountMap = new Map(courseLessonCounts.map((r) => [r.courseId, r._count.id]));

      const rows = enrollments.map((e) => {
        const total = lessonCountMap.get(e.courseId) ?? 0;
        const pct = total > 0 ? Math.round((e.progress.length / total) * 100) : 0;
        return [e.user.name, e.user.email, e.course.title, total, e.progress.length, pct, e.completedAt ? "Ya" : "Tidak"];
      });

      const header = "Nama,Email,Kursus,Total Pelajaran,Selesai,Persentase,Lulus\n";
      const body = rows.map((r) => r.join(",")).join("\n");
      const csv = header + body;

      res.setHeader("Content-Type", "text/csv");
      res.setHeader("Content-Disposition", `attachment; filename="laporan-${tenantId}.csv"`);
      return res.send(csv);
    });
  } catch (err) {
    next(err);
  }
});

// PDF report
router.get("/tenants/:tenantId/reports/completion/pdf", authenticate, async (req, res, next) => {
  try {
    await requireLmsAdmin(req, res, async () => {
      const { tenantId } = req.params;
      const tenant = await prisma.lmsTenant.findUnique({ where: { id: tenantId } });
      if (!tenant) throw new AppError(404, "Tenant tidak ditemukan.");

      const enrollments = await prisma.lmsEnrollment.findMany({
        where: { tenantId },
        include: { course: { select: { title: true } }, progress: true },
      });
      const courseLessonCounts = await prisma.lmsLesson.groupBy({
        by: ["courseId"],
        where: { course: { tenantId } },
        _count: { id: true },
      });
      const lessonCountMap = new Map(courseLessonCounts.map((r) => [r.courseId, r._count.id]));

      const PDFDocument = (await import("pdfkit")).default;
      const doc = new PDFDocument({ size: "A4", margin: 50 });
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `attachment; filename="laporan-${tenant.slug}.pdf"`);
      doc.pipe(res);

      doc.fontSize(18).text(`Laporan Completion — ${tenant.name}`, { align: "center" });
      doc.moveDown().fontSize(10).text(`Diekspor: ${new Date().toLocaleDateString("id-ID")}`, { align: "center" });
      doc.moveDown(2);

      for (const e of enrollments) {
        const total = lessonCountMap.get(e.courseId) ?? 0;
        const pct = total > 0 ? Math.round((e.progress.length / total) * 100) : 0;
        doc.fontSize(10).text(`Kursus: ${e.course.title} | User: ${e.userId} | ${pct}% (${e.progress.length}/${total})`);
      }
      doc.end();
    });
  } catch (err) {
    next(err);
  }
});


export default router;
