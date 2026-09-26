import { Router, type Request, type Response, type NextFunction } from "express";
import { z } from "zod";
import { validateBody } from "../../middleware/validateBody.js";
import { prisma } from "../../db/prisma.js";
import { AppError, successResponse } from "../../types/index.js";
import { processTrainerPayout } from "../../services/payout/trainerPayoutService.js";

const router = Router();

// ─── Stats ────────────────────────────────────────────────────────────────────
// GET /api/admin/payouts/stats — aggregate KPI for trainer + affiliate payouts
router.get("/payouts/stats", async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const [trainerPending, trainerApproved, trainerPaid, trainerPendingSum,
           affPending, affApproved, affPaid, affPendingSum] = await Promise.all([
      prisma.trainerPayout.count({ where: { status: "pending" } }),
      prisma.trainerPayout.count({ where: { status: "approved" } }),
      prisma.trainerPayout.count({ where: { status: "paid" } }),
      prisma.trainerPayout.aggregate({ _sum: { amount: true }, where: { status: "pending" } }),
      prisma.affiliateWithdrawal.count({ where: { status: "pending" } }),
      prisma.affiliateWithdrawal.count({ where: { status: "approved" } }),
      prisma.affiliateWithdrawal.count({ where: { status: "paid" } }),
      prisma.affiliateWithdrawal.aggregate({ _sum: { amount: true }, where: { status: "pending" } }),
    ]);

    res.json(successResponse({
      trainer: {
        pending: trainerPending,
        approved: trainerApproved,
        paid: trainerPaid,
        pendingAmount: Number(trainerPendingSum._sum.amount ?? 0),
      },
      affiliate: {
        pending: affPending,
        approved: affApproved,
        paid: affPaid,
        pendingAmount: Number(affPendingSum._sum.amount ?? 0),
      },
    }));
  } catch (err) {
    next(err);
  }
});

// ─── Trainer Payouts ──────────────────────────────────────────────────────────

const TrainerPayoutListSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  status: z.enum(["pending", "approved", "rejected", "paid"]).optional(),
  search: z.string().optional(),
});

// GET /api/admin/payouts/trainer
router.get("/payouts/trainer", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { page, limit, status, search } = TrainerPayoutListSchema.parse(req.query);
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};
    if (status) where.status = status;
    if (search) {
      where.trainer = {
        OR: [
          { name: { contains: search, mode: "insensitive" as const } },
          { email: { contains: search, mode: "insensitive" as const } },
        ],
      };
    }

    const [payouts, total] = await Promise.all([
      prisma.trainerPayout.findMany({
        where,
        skip,
        take: limit,
        orderBy: { requestedAt: "desc" },
        include: {
          trainer: { select: { id: true, name: true, email: true } },
        },
      }),
      prisma.trainerPayout.count({ where }),
    ]);

    res.json(successResponse({ payouts, total, page, limit }));
  } catch (err) {
    next(err);
  }
});

// PATCH /api/admin/payouts/trainer/:id — update status
const PayoutUpdateSchema = z.object({
  status: z.enum(["approved", "rejected", "paid"]),
  note: z.string().optional(),
});

router.patch("/payouts/trainer/:id", validateBody(PayoutUpdateSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    // Express types route params as possibly-undefined; narrow instead of
    // casting so the service keeps a non-optional id in its contract.
    if (!id) throw new AppError(400, "Payout ID tidak valid.");
    const { status, note } = req.body as z.infer<typeof PayoutUpdateSchema>;

    // BL-78d: the C2 pending-guard, the 404/409 classification and the re-read
    // all live in the service, shared with PATCH /api/trainer/payouts/:payoutId
    // — the two flows used to be byte-for-byte copies that could drift apart.
    // `includeTrainer` keeps this response's `trainer` relation intact.
    const updated = await processTrainerPayout({
      payoutId: id,
      status,
      note,
      processedBy: req.user!.id,
      includeTrainer: true,
    });

    res.json(successResponse(updated));
  } catch (err) {
    next(err);
  }
});

// ─── Affiliate Withdrawals ────────────────────────────────────────────────────

const AffiliateWithdrawalListSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  status: z.enum(["pending", "approved", "rejected", "paid"]).optional(),
  search: z.string().optional(),
});

// GET /api/admin/payouts/affiliate
router.get("/payouts/affiliate", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { page, limit, status, search } = AffiliateWithdrawalListSchema.parse(req.query);
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};
    if (status) where.status = status;
    if (search) {
      where.affiliate = {
        user: {
          OR: [
            { name: { contains: search, mode: "insensitive" as const } },
            { email: { contains: search, mode: "insensitive" as const } },
          ],
        },
      };
    }

    const [withdrawals, total] = await Promise.all([
      prisma.affiliateWithdrawal.findMany({
        where,
        skip,
        take: limit,
        orderBy: { requestedAt: "desc" },
        include: {
          affiliate: {
            select: {
              id: true,
              code: true,
              user: { select: { id: true, name: true, email: true } },
            },
          },
        },
      }),
      prisma.affiliateWithdrawal.count({ where }),
    ]);

    res.json(successResponse({ withdrawals, total, page, limit }));
  } catch (err) {
    next(err);
  }
});

// PATCH /api/admin/payouts/affiliate/:id — update status
router.patch("/payouts/affiliate/:id", validateBody(PayoutUpdateSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { status, note } = req.body as z.infer<typeof PayoutUpdateSchema>;

    const existing = await prisma.affiliateWithdrawal.findUnique({ where: { id } });
    if (!existing) throw new AppError(404, "Withdrawal tidak ditemukan.");

    // C1+C2: the affiliate's balance was DEBITED when the withdrawal was
    // requested (routes/affiliate.ts POST /withdrawals), so a rejection MUST
    // credit it back or the money silently disappears. The status update and
    // the refund run in one transaction, and the `status: "pending"` predicate
    // guarantees a withdrawal is processed (and refunded) at most once even
    // under concurrent PATCHes.
    const updated = await prisma.$transaction(async (tx) => {
      const guarded = await tx.affiliateWithdrawal.updateMany({
        where: { id, status: "pending" },
        data: {
          status,
          note: note ?? null,
          processedAt: new Date(),
          processedBy: req.user!.id,
        },
      });
      if (guarded.count === 0) throw new AppError(409, "Withdrawal sudah diproses.");

      if (status === "rejected") {
        // Refund: mirror the invariant in routes/affiliate.ts (rejection
        // returns the debited amount to affiliate.balance).
        await tx.affiliate.update({
          where: { id: existing.affiliateId },
          data: { balance: { increment: Number(existing.amount) } },
        });
      }

      return tx.affiliateWithdrawal.findUnique({
        where: { id },
        include: {
          affiliate: {
            select: {
              id: true,
              code: true,
              user: { select: { id: true, name: true, email: true } },
            },
          },
        },
      });
    });

    res.json(successResponse(updated));
  } catch (err) {
    next(err);
  }
});

export default router;
