export const ROLES = [
  "visitor",
  "student",
  "trainer",
  "event_participant",
  "corporate_client",
  "partner",
  "creator",
  // Affiliate accounts are already issued and filterable in the admin user list
  // (modules/admin/users.ts); the union must know about them or role filters
  // silently fall outside the type.
  "affiliate",
  "super_admin",
] as const;

export type Role = (typeof ROLES)[number];

export type PaginationMeta = {
  total: number;
  page: number;
  limit: number;
  // Optional aggregate stats for list endpoints (e.g. reviews avg rating).
  avgRating?: number;
  totalReviews?: number;
};

/**
 * Structured API error (TASK-011). `code` is a stable, machine-readable string
 * (e.g. "AUTH_401", "VALIDATION_422"); `message` is human-readable; `details`
 * carries optional field-level context (e.g. Zod issues).
 */
export type ApiError = {
  code: string;
  message: string;
  details?: unknown;
};

export type ApiResponse<T = undefined> =
  | { success: true; data: T; meta?: PaginationMeta }
  | { success: false; error: ApiError };

export function successResponse<T>(data: T, meta?: PaginationMeta): ApiResponse<T> {
  return meta ? { success: true, data, meta } : { success: true, data };
}

/** Map an HTTP status code to a stable default error code. */
export function defaultErrorCode(statusCode: number): string {
  const map: Record<number, string> = {
    400: "BAD_REQUEST",
    401: "UNAUTHORIZED",
    403: "FORBIDDEN",
    404: "NOT_FOUND",
    409: "CONFLICT",
    422: "VALIDATION_ERROR",
    429: "RATE_LIMITED",
    500: "INTERNAL_ERROR",
    502: "UPSTREAM_ERROR",
  };
  return map[statusCode] ?? `HTTP_${statusCode}`;
}

export function errorResponse(code: string, message: string, details?: unknown): ApiResponse<never> {
  return { success: false, error: details === undefined ? { code, message } : { code, message, details } };
}

export class AppError extends Error {
  public readonly code: string;

  constructor(
    public readonly statusCode: number,
    message: string,
    codeOrOperational?: string | boolean,
    public readonly isOperational = true,
  ) {
    super(message);
    this.name = "AppError";
    // Backward-compatible signature: `new AppError(status, message)` still works.
    // Third arg may be an explicit error code (string) or the legacy isOperational
    // boolean; default the code from the status when not provided.
    this.code = typeof codeOrOperational === "string" ? codeOrOperational : defaultErrorCode(statusCode);
    if (typeof codeOrOperational === "boolean") this.isOperational = codeOrOperational;
    Error.captureStackTrace(this, this.constructor);
  }
}

export type AuthUser = {
  id: string;
  email: string;
  roles: Role[];
};
