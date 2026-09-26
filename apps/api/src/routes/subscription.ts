import { Router, type Request, type Response, type NextFunction } from "express";
import { z } from "zod";
import { authenticate } from "../middleware/authenticate.js";
import { validateBody } from "../middleware/validateBody.js";
import { prisma } from "../db/prisma.js";
import { AppError, successResponse } from "../types/index.js";

const router = Router();

// GET /api/subscription/me — current subscription status
router.get("/me", authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const sub = await prisma.subscription.findUnique({ where: { userId } });
    if (!sub) return res.json(successResponse(null));

    const isExpired = new Date(sub.expiresAt) < new Date();
    return res.json(successResponse({ ...sub, isExpired, isActive: sub.status === "active" && !isExpired }));
  } catch (err) {
    next(err);
  }
});

const subscribeSchema = z.object({
  orderId: z.string().min(1, "orderId wajib diisi."),
});

// POST /api/subscription — activate/renew a subscription from a PAID order.
//
// Security (C1): activation must be backed by a paid order the caller owns that
// actually contains a subscription line item. The plan is DERIVED from that order
// item — never trusted from the request body — so a client cannot self-grant a
// subscription without a verified payment. Each paid order can only activate once
// (replay guard) to prevent extending a subscription indefinitely from one payment.
router.post("/", authenticate, validateBody(subscribeSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const { orderId } = req.body as z.infer<typeof subscribeSchema>;

    const order = await prisma.order.findFirst({
      where: { id: orderId, userId, status: "paid" },
      include: { items: true },
    });
    if (!order) throw new AppError(402, "Pembayaran belum terverifikasi.");

    // Batch8 D7 (subscription order anti-reuse): a paid order may activate a
    // subscription exactly once. The previous guard only blocked while the
    // subscription was still active, so a cancelled/expired subscription could be
    // re-activated from the SAME order to extend the plan indefinitely for free.
    if (order.subscriptionConsumedAt !== null) {
      throw new AppError(409, "Order ini sudah dipakai untuk langganan.");
    }

    const subItem = order.items.find((item) => item.itemType === "subscription");
    if (!subItem) throw new AppError(400, "Order ini tidak berisi paket langganan.");

    const planType = subItem.itemId;
    if (planType !== "monthly" && planType !== "annual") {
      throw new AppError(400, "Paket langganan tidak valid.");
    }

    const durationDays = planType === "annual" ? 365 : 30;
    const now = new Date();
    const expiresAt = new Date(now.getTime() + durationDays * 24 * 60 * 60 * 1000);

    // Mark the order consumed and activate the subscription atomically so the
    // one-time guard above can never be bypassed by a concurrent replay.
    const sub = await prisma.$transaction(async (tx) => {
      await tx.order.update({ where: { id: order.id }, data: { subscriptionConsumedAt: now } });
      return tx.subscription.upsert({
        where: { userId },
        create: { userId, planType, expiresAt, orderId, status: "active" },
        update: { planType, expiresAt, orderId, status: "active", startedAt: now },
      });
    });

    return res.status(201).json(successResponse(sub));
  } catch (err) {
    next(err);
  }
});

// PATCH /api/subscription/cancel — cancel subscription
router.patch("/cancel", authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const sub = await prisma.subscription.findUnique({ where: { userId } });
    if (!sub) throw new AppError(404, "Anda belum berlangganan.");

    const updated = await prisma.subscription.update({
      where: { userId },
      data: { status: "cancelled" },
    });
    return res.json(successResponse(updated));
  } catch (err) {
    next(err);
  }
});

// GET /api/subscription/plans — available plans with pricing
router.get("/plans", async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const plans = [
      {
        id: "monthly",
        name: "Bulanan",
        price: 199000,
        durationDays: 30,
        features: [
          "Akses semua kursus (500+ kursus)",
          "Sertifikat penyelesaian",
          "Akses komunitas eksklusif",
          "Tanya jawab dengan mentor",
        ],
        badge: null,
      },
      {
        id: "annual",
        name: "Tahunan",
        price: 1499000,
        durationDays: 365,
        pricePerMonth: Math.round(1499000 / 12),
        savings: 199000 * 12 - 1499000,
        features: [
          "Semua fitur paket Bulanan",
          "Hemat 37% dibanding bulanan",
          "Akses materi baru seumur hidup plan",
          "1 sesi mentoring 1-on-1 per kuartal",
        ],
        badge: "Terpopuler",
      },
    ];
    return res.json(successResponse(plans));
  } catch (err) {
    next(err);
  }
});

const adminUpdateSchema = z.object({
  status: z.enum(["active", "cancelled", "expired"]).optional(),
  expiresAt: z.string().datetime().optional(),
});

// PATCH /api/subscription/:userId — admin manage subscription
router.patch("/:userId", authenticate, validateBody(adminUpdateSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const isAdmin = req.user?.roles.includes("super_admin");
    if (!isAdmin) throw new AppError(403, "Akses ditolak.");

    const { userId } = req.params;
    const { status, expiresAt } = req.body as z.infer<typeof adminUpdateSchema>;

    const sub = await prisma.subscription.findUnique({ where: { userId } });
    if (!sub) throw new AppError(404, "Subscription tidak ditemukan.");

    const updated = await prisma.subscription.update({
      where: { userId },
      data: {
        ...(status && { status }),
        ...(expiresAt && { expiresAt: new Date(expiresAt) }),
      },
    });
    return res.json(successResponse(updated));
  } catch (err) {
    next(err);
  }
});

export default router;
