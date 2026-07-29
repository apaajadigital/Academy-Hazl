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

const withdrawSchema = z.object({
  amount: z.number().positive("Jumlah harus lebih dari 0."),
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
