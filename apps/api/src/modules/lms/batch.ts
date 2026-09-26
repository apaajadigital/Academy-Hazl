import { Router } from "express";
import { authenticate } from "../../middleware/authenticate.js";
import { prisma } from "../../db/prisma.js";
import { successResponse, errorResponse } from "../../types/index.js";
import { z } from "zod";
import { requireLmsAdmin, assertBatchInTenant } from "./guards.js";

const router = Router();

// ─── Tenant: Batch Management ─────────────────────────────────────────────────

const batchSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  isActive: z.boolean().default(true),
});

router.get("/tenants/:tenantId/batches", authenticate, async (req, res, next) => {
  try {
    await requireLmsAdmin(req, res, async () => {
      const batches = await prisma.lmsBatch.findMany({
        where: { tenantId: req.params.tenantId },
        orderBy: { createdAt: "desc" },
        include: { _count: { select: { members: true, assignments: true } } },
      });
      return res.json(successResponse(batches));
    });
  } catch (err) {
    next(err);
  }
});

router.post("/tenants/:tenantId/batches", authenticate, async (req, res, next) => {
  try {
    await requireLmsAdmin(req, res, async () => {
      const body = batchSchema.safeParse(req.body);
      if (!body.success) return res.status(400).json(errorResponse("VALIDATION_ERROR", body.error.issues[0]?.message ?? "Validasi gagal."));
      const batch = await prisma.lmsBatch.create({
        data: { ...body.data, tenantId: req.params.tenantId as string },
      });
      return res.status(201).json(successResponse(batch));
    });
  } catch (err) {
    next(err);
  }
});

router.patch("/tenants/:tenantId/batches/:batchId", authenticate, async (req, res, next) => {
  try {
    await requireLmsAdmin(req, res, async () => {
      await assertBatchInTenant(req.params.batchId as string, req.params.tenantId as string);
      const body = batchSchema.partial().safeParse(req.body);
      if (!body.success) return res.status(400).json(errorResponse("VALIDATION_ERROR", body.error.issues[0]?.message ?? "Validasi gagal."));
      const batch = await prisma.lmsBatch.update({
        where: { id: req.params.batchId },
        data: body.data,
      });
      return res.json(successResponse(batch));
    });
  } catch (err) {
    next(err);
  }
});

router.get("/tenants/:tenantId/batches/:batchId/members", authenticate, async (req, res, next) => {
  try {
    await requireLmsAdmin(req, res, async () => {
      await assertBatchInTenant(req.params.batchId as string, req.params.tenantId as string);
      const members = await prisma.lmsBatchMember.findMany({
        where: { batchId: req.params.batchId },
        include: { user: { select: { id: true, name: true, email: true } } },
        orderBy: { joinedAt: "desc" },
      });
      return res.json(successResponse(members));
    });
  } catch (err) {
    next(err);
  }
});


export default router;
