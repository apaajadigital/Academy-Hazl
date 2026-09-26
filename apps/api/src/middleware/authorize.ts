import type { Request, Response, NextFunction } from "express";
import { AppError, type Role } from "../types/index.js";

/**
 * Platform-wide role gate.
 *
 * `req.user.roles` holds GLOBAL grants only — `authenticate` strips tenant-scoped
 * rows (BL-78b), so the `super_admin` bypass below cannot be satisfied by a
 * super_admin granted for a single tenant. Tenant authority is never decided here;
 * it is re-checked per tenant against `UserRole` in modules/lms/guards.ts.
 */
export function authorize(...allowedRoles: Role[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      return next(new AppError(401, "Autentikasi diperlukan."));
    }

    const isSuperAdmin = req.user.roles.includes("super_admin");
    if (isSuperAdmin) return next();

    const hasRole = req.user.roles.some((r) => allowedRoles.includes(r));
    if (!hasRole) {
      return next(new AppError(403, "Anda tidak memiliki izin untuk aksi ini."));
    }

    next();
  };
}
