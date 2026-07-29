import { Router, type Request, type Response, type NextFunction } from "express";
import { z } from "zod";
import { authenticate } from "../middleware/authenticate.js";
import { validateBody } from "../middleware/validateBody.js";
import { prisma } from "../db/prisma.js";
import { AppError, successResponse } from "../types/index.js";

const router = Router();
router.use(authenticate);

// GET /api/affiliate/me — current user's affiliate profile + stats
router.get("/me", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const affiliate = await prisma.affiliate.findUnique({
      where: { userId },
      include: {
        commissions: {
          orderBy: { createdAt: "desc" },
          take: 20,
          include: { order: { select: { id: true, finalAmount: true } } },
        },
      },
    });
    if (!affiliate) return res.json(successResponse(null));
    return res.json(successResponse(affiliate));
  } catch (err) {
    next(err);
  }
});

// POST /api/affiliate/register — join affiliate program
router.post("/register", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const existing = await prisma.affiliate.findUnique({ where: { userId } });
    if (existing) throw new AppError(409, "Anda sudah terdaftar sebagai affiliate.");

    const code = `JA${userId.slice(0, 6).toUpperCase()}`;
    const affiliate = await prisma.affiliate.create({ data: { userId, code } });
    return res.status(201).json(successResponse(affiliate));
  } catch (err) {
    next(err);
  }
});

// GET /api/affiliate/commissions — paginated commission history
router.get("/commissions", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const affiliate = await prisma.affiliate.findUnique({ where: { userId } });
    if (!affiliate) throw new AppError(404, "Anda belum terdaftar sebagai affiliate.");

    // Batch8 (unbounded pagination): clamp limit to [1,50] and page to >=1 so a
    // client cannot request an oversized page or produce a negative skip.
    const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 20));
    const page = Math.max(1, Number(req.query.page) || 1);
    const skip = (page - 1) * limit;

    const [commissions, total] = await Promise.all([
      prisma.affiliateCommission.findMany({
        where: { affiliateId: affiliate.id },
        include: {
          order: { select: { id: true, finalAmount: true, createdAt: true } },
          referredUser: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.affiliateCommission.count({ where: { affiliateId: affiliate.id } }),
    ]);

    return res.json(successResponse(commissions, { total, page, limit }));
  } catch (err) {
    next(err);
  }
});

/**
 * Largest value the `AffiliateWithdrawal.amount` column can hold
 * (`Decimal(12,2)` — 10 integer digits + 2 fraction digits, schema.prisma:811).
 * Without this bound a request for 1e300 passes `positive()`, clears the
 * balance check, and only fails at the driver — or worse, is silently coerced.
 */
const MAX_WITHDRAWAL_AMOUNT = 9_999_999_999.99;

/**
 * Smallest withdrawal an affiliate may request (owner decision, 29 Jul 2026).
 *
 * Deliberately the SAME number the trainer payout path enforces
 * (`MIN_PAYOUT_AMOUNT` in services/payout/trainerPayoutService.ts): both are
 * manually reviewed bank transfers with the same per-transfer cost, so one floor
 * for both is the rule. It is redefined here rather than imported because
 * services/payout/** is the trainer domain and this route must not depend on it;
 * the duplication is the price of that boundary and is flagged for backlog
 * (a shared money Zod schema in packages/types would remove it).
 */
const MIN_WITHDRAWAL_AMOUNT = 10_000;

const withdrawSchema = z.object({
  // B1 (money validation): `positive()` alone let a direct API call file a
  // Rp 0,01 withdrawal — or a 0,005 one that the Decimal(12,2) column rounds
  // silently — for staff to process by hand, while the web form advertised a
  // Rp 50.000 floor that nothing enforced. The trainer path was hardened for
  // exactly this (routes/trainer.ts payoutSchema); the affiliate path ran
  // alongside it with none of the same guards. Bound the value to the column,
  // to whole cents, and to the business floor.
  amount: z
    .number()
    .positive("Jumlah harus lebih dari 0.")
    .min(MIN_WITHDRAWAL_AMOUNT, "Minimal penarikan Rp 10.000.")
    .max(MAX_WITHDRAWAL_AMOUNT, "Jumlah melebihi batas maksimum.")
    .multipleOf(0.01, "Jumlah maksimal 2 angka desimal."),
  bankName: z.string().min(1),
  accountNo: z.string().min(1),
  accountName: z.string().min(1),
});

// POST /api/affiliate/withdrawals — request withdrawal
router.post("/withdrawals", validateBody(withdrawSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const { amount, bankName, accountNo, accountName } = req.body as z.infer<typeof withdrawSchema>;

    const affiliate = await prisma.affiliate.findUnique({ where: { userId } });
    if (!affiliate) throw new AppError(404, "Anda belum terdaftar sebagai affiliate.");

    // M-affiliate: guard against a TOCTOU race by decrementing atomically with a
    // `balance >= amount` predicate. Two concurrent requests can no longer both
    // pass a stale balance read and overdraw the account.
    const withdrawal = await prisma.$transaction(async (tx) => {
      const debited = await tx.affiliate.updateMany({
        where: { id: affiliate.id, balance: { gte: amount } },
        data: { balance: { decrement: amount } },
      });
      if (debited.count !== 1) {
        throw new AppError(400, "Saldo tidak mencukupi.");
      }
      return tx.affiliateWithdrawal.create({
        data: { affiliateId: affiliate.id, amount, bankName, accountNo, accountName },
      });
    });

    return res.status(201).json(successResponse(withdrawal));
  } catch (err) {
    next(err);
  }
});

// GET /api/affiliate/withdrawals — withdrawal history
router.get("/withdrawals", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const affiliate = await prisma.affiliate.findUnique({ where: { userId } });
    if (!affiliate) throw new AppError(404, "Anda belum terdaftar sebagai affiliate.");

    const withdrawals = await prisma.affiliateWithdrawal.findMany({
      where: { affiliateId: affiliate.id },
      orderBy: { requestedAt: "desc" },
    });
    return res.json(successResponse(withdrawals));
  } catch (err) {
    next(err);
  }
});

// ─── Admin ────────────────────────────────────────────────────────────────────

// PATCH /api/affiliate/withdrawals/:withdrawalId — admin process withdrawal
router.patch("/withdrawals/:withdrawalId", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const isAdmin = req.user?.roles.includes("super_admin");
    if (!isAdmin) throw new AppError(403, "Akses ditolak.");

    const { withdrawalId } = req.params;
    const { status } = req.body as { status: string };
    if (!["approved", "rejected", "paid"].includes(status)) throw new AppError(400, "Status tidak valid.");

    // M-affiliate: only a still-pending withdrawal may be processed. Without this
    // guard, a repeated "rejected" call would refund the balance multiple times.
    const existing = await prisma.affiliateWithdrawal.findUnique({ where: { id: withdrawalId } });
    if (!existing) throw new AppError(404, "Penarikan tidak ditemukan.");
    if (existing.status !== "pending") throw new AppError(400, "Penarikan sudah diproses.");

    const withdrawal = await prisma.affiliateWithdrawal.update({
      where: { id: withdrawalId },
      data: { status, processedAt: new Date() },
    });

    // If rejected, refund balance
    if (status === "rejected") {
      await prisma.affiliate.update({
        where: { id: withdrawal.affiliateId },
        data: { balance: { increment: Number(withdrawal.amount) } },
      });
    }

    return res.json(successResponse(withdrawal));
  } catch (err) {
    next(err);
  }
});

export default router;
