# TASK-011 Breakdown — API Envelope + Zod Standardization

> Written per SSOT §9.3 before executing. TASK-011 is Effort L with a **breaking** slice.

## Verified current state (better than SSOT assumed)

| Aspect | State |
|--------|-------|
| Envelope `successResponse` | **24/26** route files ✅ (health.ts intentionally raw) |
| Centralized error handling (`next(err)`→`errorHandler`) | **25/26** ✅ |
| Zod validation | 18/26 route files (body via `validateBody`); query/params inconsistent |
| Error format | `error: string` (flat) — SSOT §3.5 wants `error: {code, message, details}` |
| `ApiResponse` location | `apps/api/src/types` — SSOT wants `packages/types` (SSOT) |
| Frontend error consumption | reads `body.error` **as string** in **15+ files** |

## The decision point: error-format migration

Upgrading `error: string` → `error: {code, message, details}` is a **breaking change** to 15+ frontend call sites (they'd render `[object Object]`). Two approaches:

### Option A — Backward-compatible enrichment (non-breaking) ✅ recommended
- Keep `error` as a **string** (frontend unchanged).
- Add optional `code?: string` + `details?` to the envelope alongside `error`.
- Add stable error codes to `AppError` (e.g. `AUTH_401`, `VALIDATION_422`).
- Move `ApiResponse`/`PaginationMeta` to `packages/types` (api re-exports).
- Add `asyncHandler` + `pagination` helpers.
- Add Zod to the ~8 routes/boundaries missing it (query/params).
- Add a contract test asserting every endpoint returns the envelope shape.
- **Blast radius:** API only. Frontend keeps working. Reversible.

### Option B — Full breaking migration (per §3.5 literal)
- Change `error` to `{code, message, details}` object.
- Update **all 15+ frontend** call sites to read `error.message`.
- Update `packages/types`, errorHandler, every route, contract + E2E tests **atomically** in one PR.
- **Blast radius:** API + 15+ frontend files + tests. Higher risk, larger diff.

## Subtasks (either option)

1. `011a` — Move `ApiResponse`/`PaginationMeta` to `packages/types`; api re-exports. (non-breaking)
2. `011b` — Add `apps/api/src/lib/{asyncHandler,pagination,apiError}.ts` helpers.
3. `011c` — Enrich `AppError` with stable `code`; update `errorHandler` (A: keep string + add code; B: object).
4. `011d` — Zod audit: add body/query/params validation to routes missing it.
5. `011e` — Contract test: every mounted route returns `{success, ...}`; frontend `lib/api` aligned.
6. `011f` (B only) — Migrate 15+ frontend error-reads to `error.message`.

## Recommendation

**Option A.** The envelope + centralized errors are already ~92% in place; a non-breaking enrichment captures the §3.5 intent (stable codes, richer errors, SSOT types, full Zod) without a risky 15-file frontend migration. Option B's literal object-format can be a later, dedicated PR once codes are in use. Keeps "small, reversible steps" (§0.3).
