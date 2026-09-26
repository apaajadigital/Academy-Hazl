# ADR-0003: Denormalize `tenantId` onto LMS Child Tables for Row-Level Tenant Isolation

- **Status:** Accepted
- **Date:** 15 Juli 2026
- **Task:** LMS multi-tenant hardening (defense-in-depth). Follows the H1 tenant-scoping guards in `apps/api/src/modules/lms/guards.ts`.
- **Deciders:** Engineering + reviewer (migration APPLY human-gated)

## Context

The B2B LMS is multi-tenant: every LMS row belongs to exactly one `LmsTenant`. Isolation between tenants is a security boundary — an admin of tenant A must never read or mutate tenant B's data.

Today, the *parent* LMS tables already carry `tenantId` directly: `LmsTenant`, `LmsBatch`, `LmsCourse`, `LmsEnrollment`, `LmsCertificate`, `LmsUserInvite`. The *child* tables do not — they reach their tenant only through a foreign-key chain:

- `LmsLesson` → `LmsCourse` (`courseId`)
- `LmsQuiz` → `LmsLesson` → `LmsCourse`
- `LmsProgress` → `LmsEnrollment`
- `LmsBatchMember` → `LmsBatch`
- `LmsCourseAssignment` → `LmsCourse` / `LmsBatch`

Isolation is enforced at the **route layer** by the H1 guards `assertCourseInTenant` / `assertLessonInTenant` / `assertBatchInTenant` (`guards.ts`), which resolve the child *through* the tenant before any nested handler runs. `requireLmsAdmin` only proves the caller administers the tenant named in the URL; the asserts prove the addressed child actually belongs to that tenant, closing the cross-tenant IDOR gap.

That protection is correct but **structural** — it depends on every current and future handler remembering to call the right assert, and on every ad-hoc query joining back to the parent to filter by tenant. A single forgotten join on a child table (e.g. a report, a bulk export, a new endpoint) can leak across tenants, and the database itself offers no direct guard rail because the child row carries no tenant identity of its own.

## Decision

Denormalize `tenantId` onto the five child tables as an **additive, defense-in-depth** layer — **not** a replacement for the H1 guards, which remain in place unchanged.

1. **Schema:** add `tenantId String?` (nullable) plus `@@index([tenantId])` to `LmsLesson`, `LmsQuiz`, `LmsProgress`, `LmsBatchMember`, `LmsCourseAssignment`.
2. **Populate on write:** every create/upsert path sets `tenantId` from a value already proven in scope — the route's `:tenantId` param (already asserted to own the parent), or the parent record already fetched (`invite.tenantId`, `enrollment.tenantId`).
3. **Backfill:** the migration backfills existing rows from their parent chain (lesson→course, quiz→lesson→course, progress→enrollment, batch_member→batch, course_assignment→course), run after `ADD COLUMN` and before `CREATE INDEX`.

`tenantId` is intentionally **nullable**: a `NOT NULL` column would require the backfill to succeed for every pre-existing row before the column could be added, turning any orphaned/edge-case row into a migration failure. Nullable lets the column land safely; the app populates it on every write going forward, and the backfill fills existing rows best-effort.

### Create paths updated

| Table | File:line | tenantId source |
|---|---|---|
| `LmsLesson` | `src/modules/lms/course.ts:97` | route `:tenantId` (course asserted in tenant) |
| `LmsQuiz` | `src/modules/lms/course.ts:150` | route `:tenantId` (lesson asserted in tenant) |
| `LmsCourseAssignment` | `src/modules/lms/course.ts:182` | route `:tenantId` (course + batch asserted) |
| `LmsBatchMember` | `src/modules/lms/invite.ts:64` | `invite.tenantId` |
| `LmsProgress` | `src/modules/lms/portal.ts:114` | `enrollment.tenantId` |

## Consequences

**Positive**
- **Fail-safer filters.** Any query — including future ad-hoc ones — can filter/verify tenant with a direct `where: { tenantId }` on the child, without a parent join. A forgotten join no longer silently leaks; the tenant is on the row.
- **Cheaper hot-path filters.** `@@index([tenantId])` supports tenant-scoped scans of children (reports, exports) without joining up the chain.
- **Auditability.** Each child row self-identifies its tenant, which simplifies leak detection and future Postgres Row-Level-Security policies.

**Negative / cost**
- **Slight write overhead / redundancy.** `tenantId` is duplicated from the parent; writers must set it. This is mitigated by deriving it from an already-in-scope, already-asserted value (no extra query).
- **Denormalization invariant.** `child.tenantId` must equal the parent's tenant. Parent tenant reassignment is not a supported operation in this domain, so drift is not expected; if that ever changes, a cascade/trigger would be needed.
- **Nullable during transition.** Until backfill runs and all rows are written by the new code, `tenantId` may be null on legacy rows — so direct child filters are defense-in-depth, and the H1 join-based guards remain the primary enforcement.
- **Backfill migration.** The migration includes five `UPDATE ... FROM` statements; APPLY is human-gated (no DB in this environment).

## Alternatives considered

1. **Keep join-only (status quo).** Rejected as the sole mechanism: correct but fragile, relying on every query remembering the parent join; offers no row-level backstop and no path to DB-level RLS. (It is retained as the *primary* layer — this ADR is additive.)
2. **Make `tenantId` required (`NOT NULL`).** Rejected for now: forces a hard backfill as a precondition of the migration, so any orphaned/edge-case existing row fails the deploy. Nullable lands safely; a follow-up migration can tighten to `NOT NULL` once backfill is verified complete and all writers are confirmed populating it.

## Follow-ups

- After backfill is verified in production, consider a follow-up migration to enforce `NOT NULL` and add composite indexes where child queries filter by `tenantId` + another column.
- Optionally add Postgres RLS policies keyed on `tenantId` for true DB-enforced isolation.
