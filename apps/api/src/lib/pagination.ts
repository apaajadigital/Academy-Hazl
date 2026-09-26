import type { PaginationMeta } from "../types/index.js";

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

export type PageParams = { page: number; limit: number; skip: number };

/**
 * Parse `?page` and `?limit` query params into safe, bounded pagination values
 * (TASK-011). Guards against invalid, negative, or oversized inputs so list
 * endpoints stay consistent and cannot be abused with huge limits.
 */
export function parsePageParams(query: { page?: unknown; limit?: unknown }): PageParams {
  const rawPage = Number(query.page);
  const rawLimit = Number(query.limit);

  const page = Number.isInteger(rawPage) && rawPage > 0 ? rawPage : 1;
  const limitCandidate = Number.isInteger(rawLimit) && rawLimit > 0 ? rawLimit : DEFAULT_LIMIT;
  const limit = Math.min(limitCandidate, MAX_LIMIT);

  return { page, limit, skip: (page - 1) * limit };
}

/** Build a standard PaginationMeta envelope field from a total count. */
export function buildPaginationMeta(total: number, params: PageParams): PaginationMeta {
  return { total, page: params.page, limit: params.limit };
}
