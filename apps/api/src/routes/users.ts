import { Router, type Request, type Response, type NextFunction } from "express";
import multer from "multer";
import path from "node:path";
import fs from "node:fs";
import { z } from "zod";
import { prisma } from "../db/prisma.js";
import { authenticate } from "../middleware/authenticate.js";
import { writeAudit } from "../services/audit/log.js";
import { hashPassword, verifyPassword } from "../services/auth/hash.js";
import { AppError, successResponse, errorResponse } from "../types/index.js";
// Single source of truth for the "never zero super admins" invariant. Defined
// next to the role-management endpoints that first needed it (modules/admin/
// users.ts) and imported — not copied — so this path cannot drift from them.
import { runGuarded, wouldLeaveNoSuperAdmin } from "../modules/admin/users.js";
import { passwordSchema } from "./auth.js";
import { REFRESH_COOKIE } from "../services/auth/token.js";
import { env } from "../config/env.js";

const router = Router();

// ---------------------------------------------------------------------------
// Avatar upload setup (multer)
// ---------------------------------------------------------------------------
const ALLOWED_AVATAR_TYPES = ["image/jpeg", "image/png", "image/webp"];

function ensureDir(dir: string) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

const avatarStorage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    const dir = path.join(env.UPLOAD_DIR, "avatars");
    ensureDir(dir);
    cb(null, dir);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`);
  },
});

const avatarUpload = multer({
  storage: avatarStorage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_AVATAR_TYPES.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new AppError(400, `Format tidak didukung. Gunakan: ${ALLOWED_AVATAR_TYPES.join(", ")}`));
    }
  },
});

// ---------------------------------------------------------------------------
// PATCH /api/users/me — update name, phone, bio, headline, linkedin, location
// ---------------------------------------------------------------------------
router.patch(
  "/me",
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.user!;
      const { name, avatarUrl, phone, bio, headline, linkedin, location } = req.body as {
        name?: string;
        avatarUrl?: string;
        phone?: string;
        bio?: string;
        headline?: string;
        linkedin?: string;
        location?: string;
      };

      // avatarUrl is normally a server path from the upload endpoint; reject
      // client-supplied javascript:/data: or off-scheme values.
      if (avatarUrl !== undefined && !(avatarUrl.startsWith("/") || /^https?:\/\//i.test(avatarUrl))) {
        return res.status(400).json(errorResponse("VALIDATION_ERROR", "avatarUrl tidak valid."));
      }

      const user = await prisma.user.update({
        where: { id },
        data: {
          ...(name !== undefined ? { name } : {}),
          ...(avatarUrl !== undefined ? { avatarUrl } : {}),
        },
        select: { id: true, name: true, email: true, avatarUrl: true },
      });

      if (phone !== undefined || bio !== undefined || headline !== undefined || linkedin !== undefined || location !== undefined) {
        await prisma.userProfile.upsert({
          where: { userId: id },
          create: { userId: id, phone, bio, headline, linkedin, location },
          update: {
            ...(phone !== undefined ? { phone } : {}),
            ...(bio !== undefined ? { bio } : {}),
            ...(headline !== undefined ? { headline } : {}),
            ...(linkedin !== undefined ? { linkedin } : {}),
            ...(location !== undefined ? { location } : {}),
          },
        });
      }

      // Return user with profile fields flattened
      const profile = await prisma.userProfile.findUnique({ where: { userId: id } });
      res.json(successResponse({
        ...user,
        phone: profile?.phone ?? null,
        bio: profile?.bio ?? null,
      }));
    } catch (err) {
      next(err);
    }
  },
);

// ---------------------------------------------------------------------------
// POST /api/users/me/avatar — upload avatar image
// ---------------------------------------------------------------------------
router.post(
  "/me/avatar",
  authenticate,
  (req: Request, res: Response, next: NextFunction) => {
    avatarUpload.single("avatar")(req, res, (err) => {
      if (err instanceof multer.MulterError) {
        if (err.code === "LIMIT_FILE_SIZE") {
          return next(new AppError(400, "Ukuran foto maks. 5 MB."));
        }
        return next(new AppError(400, err.message));
      }
      if (err) return next(err);
      next();
    });
  },
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.file) return next(new AppError(400, "Tidak ada file yang diunggah."));

      const { id } = req.user!;
      const avatarUrl = `/uploads/avatars/${req.file.filename}`;

      await prisma.user.update({
        where: { id },
        data: { avatarUrl },
      });

      res.json(successResponse({ avatarUrl }));
    } catch (err) {
      next(err);
    }
  },
);

// ---------------------------------------------------------------------------
// PATCH /api/users/me/password — change password
// ---------------------------------------------------------------------------
// M1: enforce the shared password policy (min 8, not all-numeric) via Zod
// instead of the old bare length check.
const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Password lama harus diisi."),
  newPassword: passwordSchema,
});

router.patch(
  "/me/password",
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.user!;

      const parsed = changePasswordSchema.safeParse(req.body);
      if (!parsed.success) {
        return res
          .status(400)
          .json(errorResponse("VALIDATION_ERROR", parsed.error.issues[0]?.message ?? "Validasi gagal."));
      }
      const { currentPassword, newPassword } = parsed.data;

      const user = await prisma.user.findUnique({
        where: { id },
        select: { passwordHash: true, authProvider: true },
      });

      if (!user) return next(new AppError(404, "Pengguna tidak ditemukan."));

      // Users who signed up via Google (or other OAuth) may not have a password
      if (!user.passwordHash) {
        return next(new AppError(400, "Akun Anda menggunakan login sosial dan tidak memiliki password."));
      }

      const valid = await verifyPassword(currentPassword, user.passwordHash);
      if (!valid) {
        return next(new AppError(400, "Password lama tidak sesuai."));
      }

      const newHash = await hashPassword(newPassword);
      // M1: change the hash and revoke every existing refresh token in one
      // transaction so a password change logs out all other sessions, mirroring
      // the reset-password flow in auth.ts.
      await prisma.$transaction([
        prisma.user.update({
          where: { id },
          data: { passwordHash: newHash },
        }),
        prisma.refreshToken.updateMany({
          where: { userId: id, revokedAt: null },
          data: { revokedAt: new Date() },
        }),
      ]);

      res.json(successResponse({ message: "Password berhasil diubah." }));
    } catch (err) {
      next(err);
    }
  },
);

// ---------------------------------------------------------------------------
// DELETE /api/users/me — PDP right to erasure (anonymize, not hard-delete)
// ---------------------------------------------------------------------------
router.delete(
  "/me",
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id, email } = req.user!;

      // Self-delete sets isActive:false + deletedAt, which drops the caller out
      // of the active-super-admin population exactly like an admin revoking
      // their role would — and nothing here checked for it, so the last admin
      // could erase themselves and leave the platform with zero reachable
      // admins. Reuses the guard from modules/admin/users.ts (one predicate,
      // three call sites) and runs inside the anonymization transaction so the
      // check and the write cannot be interleaved.
      await runGuarded(async (tx) => {
        if (await wouldLeaveNoSuperAdmin(tx, id)) {
          throw new AppError(
            409,
            "Anda adalah satu-satunya super admin aktif. Tunjuk super admin lain sebelum menghapus akun Anda.",
            "LAST_SUPER_ADMIN",
          );
        }

        // Anonymize user — preserve record for financial/legal retention
        await tx.user.update({
          where: { id },
          data: {
            email: `deleted+${id}@jagoakademi.invalid`,
            name: "Akun Dihapus",
            avatarUrl: null,
            passwordHash: null,
            authProvider: "deleted",
            isActive: false,
            deletedAt: new Date(),
            emailVerifyToken: null,
            emailVerifyExpiry: null,
            resetPasswordToken: null,
            resetPasswordExpiry: null,
          },
        });
        // Anonymize profile PII
        await tx.userProfile.updateMany({
          where: { userId: id },
          data: {
            phone: null,
            bio: null,
            headline: null,
            linkedin: null,
            location: null,
            expertise: [],
          },
        });
        // Revoke all refresh tokens
        await tx.refreshToken.updateMany({
          where: { userId: id, revokedAt: null },
          data: { revokedAt: new Date() },
        });
      });

      await writeAudit({
        actorId: id,
        actorEmail: email,
        action: "USER_ACCOUNT_DELETED",
        resource: "User",
        resourceId: id,
        ip: (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() ?? req.ip ?? "",
        userAgent: req.headers["user-agent"],
      });

      res.clearCookie(REFRESH_COOKIE, { path: "/" });
      res.json(successResponse({ message: "Akun Anda telah dihapus sesuai permintaan." }));
    } catch (err) {
      next(err);
    }
  },
);

// ---------------------------------------------------------------------------
// GET /api/users/me/export — PDP right to data access/portability (BL-18).
// Returns a downloadable JSON bundle of everything we hold about the caller.
// ---------------------------------------------------------------------------
router.get(
  "/me/export",
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id, email } = req.user!;

      const [user, orders, courseEnrollments, lmsEnrollments, activityLog] = await Promise.all([
        prisma.user.findUnique({
          where: { id },
          include: { profile: true, roles: { select: { role: true } } },
        }),
        prisma.order.findMany({ where: { userId: id }, include: { items: true } }),
        prisma.courseEnrollment.findMany({ where: { userId: id } }),
        prisma.lmsEnrollment.findMany({ where: { userId: id } }),
        prisma.auditLog.findMany({
          where: { actorId: id },
          orderBy: { createdAt: "desc" },
          take: 500,
        }),
      ]);

      // Strip internal secrets/tokens — a data export must never leak them.
      const safeUser: Record<string, unknown> = { ...(user ?? {}) };
      for (const secret of [
        "passwordHash",
        "emailVerifyToken",
        "emailVerifyExpiry",
        "resetPasswordToken",
        "resetPasswordExpiry",
      ]) {
        delete safeUser[secret];
      }

      const bundle = {
        exportedAt: new Date().toISOString(),
        subject: { id, email },
        account: safeUser,
        orders,
        courseEnrollments,
        lmsEnrollments,
        activityLog,
      };

      await writeAudit({
        actorId: id,
        actorEmail: email,
        action: "USER_DATA_EXPORT",
        resource: "User",
        resourceId: id,
        ip: (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() ?? req.ip ?? "",
        userAgent: req.headers["user-agent"],
      });

      res.setHeader("Content-Disposition", `attachment; filename="jago-data-${id}.json"`);
      res.setHeader("Content-Type", "application/json; charset=utf-8");
      res.status(200).send(JSON.stringify(successResponse(bundle), null, 2));
    } catch (err) {
      next(err);
    }
  },
);

export default router;

