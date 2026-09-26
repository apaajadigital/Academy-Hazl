import type { Request, Response, NextFunction, ErrorRequestHandler } from "express";
import { ZodError } from "zod";
import * as Sentry from "@sentry/node";
import { AppError, errorResponse } from "../types/index.js";
import { logger } from "../lib/logger.js";

export const notFound = (_req: Request, res: Response): void => {
  res.status(404).json(errorResponse("NOT_FOUND", "Route not found"));
};

export const errorHandler: ErrorRequestHandler = (
  err: unknown,
  req: Request,
  res: Response,
  _next: NextFunction,
): void => {
  if (err instanceof AppError && err.isOperational) {
    res.status(err.statusCode).json(errorResponse(err.code, err.message));
    return;
  }

  if (err instanceof ZodError) {
    const details = err.errors.map((e) => ({ path: e.path.join("."), message: e.message }));
    const message = details.map((d) => `${d.path}: ${d.message}`).join("; ");
    res.status(400).json(errorResponse("VALIDATION_ERROR", message, details));
    return;
  }

  // Unexpected error → report to Sentry (no-op if unset) + structured log with reqId.
  const requestId = (req as { id?: string }).id;
  Sentry.captureException(err, { tags: requestId ? { requestId } : undefined });
  logger.error("unhandled error", {
    requestId,
    method: req.method,
    url: req.originalUrl,
    err: err instanceof Error ? err.message : String(err),
    stack: err instanceof Error ? err.stack : undefined,
  });

  res.status(500).json(errorResponse("INTERNAL_ERROR", "Terjadi kesalahan server. Silakan coba lagi."));
};
