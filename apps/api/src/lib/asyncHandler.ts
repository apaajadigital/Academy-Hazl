import type { Request, Response, NextFunction, RequestHandler } from "express";

/**
 * Wraps an async route handler so a rejected promise is forwarded to the
 * centralized error middleware instead of crashing the process. Removes the
 * repetitive `try/catch { next(err) }` boilerplate (TASK-011).
 *
 * Usage: `router.get("/", asyncHandler(async (req, res) => { ... }))`
 */
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>,
): RequestHandler {
  return (req, res, next) => {
    fn(req, res, next).catch(next);
  };
}
