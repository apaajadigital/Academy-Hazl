import { Router } from "express";
import { authenticate } from "../../middleware/authenticate.js";
import { prisma } from "../../db/prisma.js";
import { successResponse, errorResponse, AppError } from "../../types/index.js";
import { z } from "zod";
import { requireSuperAdmin, requireLmsAdmin } from "./guards.js";

const router = Router();

// ─── Super Admin: Tenant Management ──────────────────────────────────────────

const tenantSchema = z.object({
  slug: z.string().min(3).max(50).regex(/^[a-z0-9-]+$/),
  name: z.string().min(1).max(100),
  logoUrl: z.string().url().optional(),
  primaryColor: z.string().default("#2563eb"),
  customDomain: z.string().optional(),
  planType: z.enum(["trial", "starter", "pro", "enterprise"]).default("trial"),
  seatLimit: z.number().int().positive().default(50),
});

router.get("/tenants", authenticate, requireSuperAdmin, async (req, res, next) => {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(50, Number(req.query.limit) || 20);
    const skip = (page - 1) * limit;
    const search = (req.query.search as string) || "";

    const where = search ? { name: { contains: search, mode: "insensitive" as const } } : {};
    const [tenants, total] = await Promise.all([
      prisma.lmsTenant.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
        include: { _count: { select: { batches: true, courses: true, enrollments: true } } },
      }),
      prisma.lmsTenant.count({ where }),
    ]);
    return res.json(successResponse(tenants, { total, page, limit }));
  } catch (err) {
    next(err);
  }
});

router.post("/tenants", authenticate, requireSuperAdmin, async (req, res, next) => {
  try {
    const body = tenantSchema.safeParse(req.body);
    if (!body.success) return res.status(400).json(errorResponse("VALIDATION_ERROR", body.error.issues[0]?.message ?? "Validasi gagal."));
    const trialEndsAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);
    const tenant = await prisma.lmsTenant.create({
      data: { ...body.data, trialEndsAt },
    });
    return res.status(201).json(successResponse(tenant));
  } catch (err: unknown) {
    if ((err as { code?: string }).code === "P2002") {
      return res.status(409).json(errorResponse("CONFLICT", "Slug atau domain sudah digunakan."));
    }
    next(err);
  }
});

router.get("/tenants/:tenantId", authenticate, async (req, res, next) => {
  try {
    const { tenantId } = req.params;
    const isSuperAdmin = req.user?.roles.includes("super_admin" as never);
    if (!isSuperAdmin) {
      const role = await prisma.userRole.findFirst({
        where: { userId: req.user!.id, role: "lms_admin", tenantId },
      });
      if (!role) return res.status(403).json(errorResponse("FORBIDDEN", "Akses ditolak."));
    }
    const tenant = await prisma.lmsTenant.findUnique({
      where: { id: tenantId },
      include: {
        _count: { select: { batches: true, courses: true, enrollments: true, invites: true } },
      },
    });
    if (!tenant) throw new AppError(404, "Tenant tidak ditemukan.");
    return res.json(successResponse(tenant));
  } catch (err) {
    next(err);
  }
});

router.patch("/tenants/:tenantId", authenticate, requireSuperAdmin, async (req, res, next) => {
  try {
    const body = tenantSchema.partial().safeParse(req.body);
    if (!body.success) return res.status(400).json(errorResponse("VALIDATION_ERROR", body.error.issues[0]?.message ?? "Validasi gagal."));
    const tenant = await prisma.lmsTenant.update({
      where: { id: req.params.tenantId },
      data: body.data,
    });
    return res.json(successResponse(tenant));
  } catch (err) {
    next(err);
  }
});

// ─── Tenant: Member Directory ────────────────────────────────────────────────

type TenantMemberRole = "lms_admin" | "lms_employee";

interface TenantMember {
  id: string;
  name: string;
  email: string;
  role: TenantMemberRole;
}

/**
 * Membership lives in two places: explicit UserRole grants (admins, and employees
 * created when an invite is accepted) and batch enrolment rows. Merge both so the
 * admin UI never shows an empty roster for people who only joined through a batch.
 */
router.get("/tenants/:tenantId/members", authenticate, async (req, res, next) => {
  try {
    await requireLmsAdmin(req, res, async () => {
      const tenantId = req.params.tenantId as string;
      const [roleRows, batchRows] = await Promise.all([
        prisma.userRole.findMany({
          where: { tenantId, role: { in: ["lms_admin", "lms_employee"] } },
          include: { user: { select: { id: true, name: true, email: true } } },
        }),
        // Scope through the parent batch so a foreign batchId can never leak members.
        prisma.lmsBatchMember.findMany({
          where: { batch: { tenantId } },
          include: { user: { select: { id: true, name: true, email: true } } },
        }),
      ]);

      const byUserId = new Map<string, TenantMember>();
      const merge = (user: { id: string; name: string; email: string }, role: TenantMemberRole) => {
        // lms_admin outranks lms_employee when a user holds both.
        const existing = byUserId.get(user.id);
        if (existing?.role === "lms_admin") return;
        byUserId.set(user.id, { id: user.id, name: user.name, email: user.email, role });
      };

      for (const row of roleRows) {
        merge(row.user, row.role === "lms_admin" ? "lms_admin" : "lms_employee");
      }
      for (const row of batchRows) {
        merge(row.user, "lms_employee");
      }

      const members = [...byUserId.values()].sort((a, b) => {
        if (a.role !== b.role) return a.role === "lms_admin" ? -1 : 1;
        return a.name.localeCompare(b.name);
      });
      return res.json(successResponse(members));
    });
  } catch (err) {
    next(err);
  }
});

// Assign LMS admin role to a user (by id, or by email since the UI only knows emails)
const assignAdminSchema = z
  .object({
    userId: z.string().min(1).optional(),
    email: z.string().email().optional(),
  })
  .refine((body) => Boolean(body.userId ?? body.email), {
    message: "userId atau email diperlukan.",
  });

router.post("/tenants/:tenantId/admins", authenticate, requireSuperAdmin, async (req, res, next) => {
  try {
    const tenantId = req.params.tenantId as string;
    const parsed = assignAdminSchema.safeParse(req.body);
    if (!parsed.success) {
      return res
        .status(400)
        .json(errorResponse("VALIDATION_ERROR", parsed.error.issues[0]?.message ?? "Validasi gagal."));
    }

    let userId = parsed.data.userId;
    if (!userId) {
      const user = await prisma.user.findUnique({
        where: { email: parsed.data.email!.toLowerCase().trim() },
        select: { id: true },
      });
      if (!user) {
        return res
          .status(404)
          .json(
            errorResponse(
              "NOT_FOUND",
              "Pengguna dengan email tersebut belum terdaftar. Undang sebagai Karyawan terlebih dahulu.",
            ),
          );
      }
      userId = user.id;
    }

    await prisma.userRole.upsert({
      where: { userId_role_tenantId: { userId, role: "lms_admin", tenantId } },
      create: { userId, role: "lms_admin", tenantId },
      update: {},
    });
    return res.json(successResponse({ message: "Admin LMS ditambahkan." }));
  } catch (err) {
    next(err);
  }
});


export default router;
