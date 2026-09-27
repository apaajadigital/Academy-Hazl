import { Router } from "express";
import { authenticate } from "../../middleware/authenticate.js";
import { prisma } from "../../db/prisma.js";
import { successResponse, errorResponse, AppError } from "../../types/index.js";
import { z } from "zod";
import { logger } from "../../lib/logger.js";
import { sendLmsInviteEmail } from "../../services/notification/emailService.js";
import { requireLmsAdmin } from "./guards.js";

const router = Router();

// ─── Tenant: User Invites ─────────────────────────────────────────────────────

/**
 * Normalize the two accepted body shapes into one deduped address list.
 * The admin UI invites one person at a time (`email`), while scripts/imports
 * still post a batch (`emails`); accepting both keeps a single endpoint.
 */
function normalizeInviteEmails(input: { email?: string; emails?: string[] }): string[] {
  const raw = [...(input.emails ?? []), ...(input.email ? [input.email] : [])];
  const normalized = raw.map((value) => value.toLowerCase().trim()).filter((value) => value.length > 0);
  // Cap the batch so one request cannot fan out into unbounded writes.
  return [...new Set(normalized)].slice(0, 100);
}

const inviteCreateSchema = z
  .object({
    email: z.string().email().optional(),
    emails: z.array(z.string().email()).optional(),
    batchId: z.string().optional(),
  })
  .refine((body) => normalizeInviteEmails(body).length > 0, {
    message: "Minimal satu email harus diisi (email atau emails).",
  });

router.post("/tenants/:tenantId/invites", authenticate, async (req, res, next) => {
  try {
    await requireLmsAdmin(req, res, async () => {
      const parsed = inviteCreateSchema.safeParse(req.body);
      if (!parsed.success) {
        return res
          .status(400)
          .json(errorResponse("VALIDATION_ERROR", parsed.error.issues[0]?.message ?? "Validasi gagal."));
      }
      const { batchId } = parsed.data;
      const emails = normalizeInviteEmails(parsed.data);
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      const tenantId = req.params.tenantId as string;
      // Needed for the invite email only; a missing (or unreadable) name must not
      // block the invite itself, so this degrades to a neutral brand name below.
      let tenantName = "Hazl Academy";
      try {
        const tenant = await prisma.lmsTenant.findUnique({
          where: { id: tenantId },
          select: { name: true },
        });
        if (tenant?.name) tenantName = tenant.name;
      } catch (lookupErr) {
        logger.warn("lms tenant name lookup failed — using neutral invite sender name", {
          tenantId,
          err: lookupErr,
        });
      }
      const created: string[] = [];
      const skipped: string[] = [];
      // Delivery outcome is tracked separately from row creation: the admin UI used
      // to report "Undangan terkirim" purely from `created`, which was a lie for any
      // invite whose mail never left. Splitting the two lets the UI tell the truth.
      const emailed: string[] = [];
      const emailFailed: string[] = [];
      for (const email of emails) {
        try {
          const invite = await prisma.lmsUserInvite.create({
            data: {
              tenantId,
              email,
              batchId: batchId ?? null,
              expiresAt,
            },
            // `token` is a DB-side default, so it only exists after the write —
            // select it explicitly and mail the persisted value, never a guess.
            select: { token: true },
          });
          // Delivery is best-effort (BL-31): the invite row is the source of
          // truth, so a mail failure must not turn a created invite into a
          // "skipped" one — that would hide a seat that actually exists.
          try {
            await sendLmsInviteEmail(email, tenantName, invite.token);
            emailed.push(email);
          } catch (mailErr) {
            logger.error("lms invite email failed", { tenantId, email, err: mailErr });
            emailFailed.push(email);
          }
          created.push(email);
        } catch {
          skipped.push(email);
        }
      }
      // The invite token stays out of the response on purpose: it is a bearer
      // credential and must only ever reach the invitee's own inbox.
      return res.status(201).json(successResponse({ created, skipped, emailed, emailFailed }));
    });
  } catch (err) {
    next(err);
  }
});

// Accept invite
router.post("/invite/:token/accept", authenticate, async (req, res, next) => {
  try {
    const { token } = req.params;
    const userId = req.user!.id;
    const userEmail = req.user!.email;

    const invite = await prisma.lmsUserInvite.findUnique({ where: { token } });
    if (!invite) throw new AppError(404, "Undangan tidak ditemukan.");
    if (invite.status !== "pending") throw new AppError(400, "Undangan sudah digunakan atau kedaluwarsa.");
    if (invite.expiresAt < new Date()) {
      await prisma.lmsUserInvite.update({ where: { token }, data: { status: "expired" } });
      throw new AppError(400, "Undangan telah kedaluwarsa.");
    }
    if (invite.email !== userEmail) throw new AppError(403, "Undangan bukan untuk akun ini.");

    // Add to batch if batchId present
    if (invite.batchId) {
      await prisma.lmsBatchMember.upsert({
        where: { batchId_userId: { batchId: invite.batchId, userId } },
        // Denormalize tenantId for row-level isolation (defense-in-depth); the invite (and its batch) belong to this tenant.
        create: { batchId: invite.batchId, userId, tenantId: invite.tenantId },
        update: {},
      });
      // Auto-enroll in courses assigned to this batch
      const assignments = await prisma.lmsCourseAssignment.findMany({
        where: { batchId: invite.batchId },
      });
      for (const assignment of assignments) {
        await prisma.lmsEnrollment.upsert({
          where: { courseId_userId: { courseId: assignment.courseId, userId } },
          create: { tenantId: invite.tenantId, courseId: assignment.courseId, userId },
          update: {},
        });
      }
    }

    // Grant tenant membership regardless of batch. Without this an invite with no
    // batchId is marked accepted yet produces no UserRole and no batch row, so the
    // user belongs to nothing and GET /tenants/:tenantId/members cannot see them.
    await prisma.userRole.upsert({
      where: { userId_role_tenantId: { userId, role: "lms_employee", tenantId: invite.tenantId } },
      create: { userId, role: "lms_employee", tenantId: invite.tenantId },
      update: {},
    });

    await prisma.lmsUserInvite.update({ where: { token }, data: { status: "accepted" } });
    const tenant = await prisma.lmsTenant.findUnique({ where: { id: invite.tenantId }, select: { slug: true } });
    return res.json(successResponse({ tenantId: invite.tenantId, tenantSlug: tenant?.slug ?? null }));
  } catch (err) {
    next(err);
  }
});


export default router;
