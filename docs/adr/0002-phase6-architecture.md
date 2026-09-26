# ADR-0002: Phase 6 (Group D) Domain Architecture — Fit New Feature Epics to Existing Conventions

- **Status:** Proposed (planning only — no feature code merged)
- **Date:** 7 Juli 2026
- **Task:** Phase 6 planning (TASK-042/043/090/091/092/094/097). See `docs/PHASE6_MASTER_PLAN.md`.
- **Deciders:** Engineering + reviewer (pending)

## Context

Phase 6 adds seven greenfield-ish feature domains (Marketplace, CRM+Drip, Learning Path, Bootcamp, Community, Corporate HRIS, Gamification). Per SSOT §9.2 these are **post-Soft-Launch**; none may deploy until Soft Launch is live (CLAUDE.md §d.3). This ADR fixes the **architectural rules** so that when each epic is built (epic-by-epic, one PR each), it integrates without disturbing the 5 shipped units.

Baseline audit of existing conventions (verified against the codebase, not assumed):

- **No repository layer.** Routes either call `prisma` inline (thin routes) or delegate to plain async functions in `apps/api/src/services/<domain>/`. LMS uses a third shape: a barrel router (`routes/lms.ts`) mounting `modules/lms/*` sub-routers to stay under the 400-line/file rule.
- **No native Prisma enums.** Enums are `String` + `// a | b | c` comment, enforced by Zod (`z.enum`) at the route boundary.
- **IDs/timestamps:** `id String @id @default(uuid())`, `createdAt @default(now())`, `updatedAt @updatedAt`, `@@map("snake_case_plural")`. Money = `Decimal @db.Decimal(12,2)` (serialized to **string** over the wire).
- **Multi-tenant isolation is application-enforced, not DB-level (no RLS).** Tenant-root models carry a `tenantId String`; child models reach it transitively. Guards (`modules/lms/guards.ts`) query `UserRole{ role:"lms_admin", tenantId }`. `super_admin` bypasses. `lms_admin` is *not* in the `ROLES` const union — it lives only in `UserRole` rows.
- **Envelope** `{success,data,error:{code,message,details?},meta?}` via `successResponse`/`errorResponse`/`AppError` in `apps/api/src/types/index.ts`; `errorHandler` + `notFound` mounted last.
- **Commerce foundation is strong and reusable:** `Order`, `OrderItem` (polymorphic via `itemType`/`itemId`), `PaymentTransaction`, `Coupon`, `Refund`, `AffiliateCommission`, `TrainerPayout` already exist; `checkout.ts` + `dokuService.ts` (HMAC, constant-time verify) + queue-based `webhooks.ts` fulfillment are live. **No cart** (single-item checkout).
- **Feature flags are web/build-time only** (`apps/web/lib/features.ts`, `NEXT_PUBLIC_FEATURE_*`, default OFF). No API-side flag system exists.
- **Known debt that Phase 6 must not worsen:** `routes/auth.ts` is **524 lines (already over the 400 limit)**; `admin.ts` (310) and `events.ts` (269) are the next candidates.

## Decision

1. **Follow the LMS module pattern for every new domain.** Each epic ships as `apps/api/src/modules/<domain>/` with a barrel router mounted once in `app.ts` (`/api/marketplace`, `/api/crm`, `/api/learning-paths`, `/api/bootcamps`, `/api/community`, `/api/hris`, `/api/gamification`). Split into sub-routers before any file approaches 400 lines. Reusable business logic goes in `services/<domain>/` plain async functions. **No repository layer is introduced** — consistency over novelty.

2. **Extend, do not fork, the commerce core.** Marketplace and Bootcamp are new `OrderItem.itemType` values (`marketplace_item`, `bootcamp_seat`), reusing `checkout.ts`, DOKU, and queue fulfillment. Seller/mentor payouts reuse the existing `TrainerPayout` model rather than a parallel payout system. A multi-line **cart** is the one net-new commerce primitive and is scoped inside TASK-042 (subtask 042b), behind a flag, not retrofitted onto existing single-item flows.

3. **All B2B/tenant-scoped models carry `tenantId String` and are guarded in application code**, mirroring LMS exactly. HRIS (TASK-094) is the primary case: every `KpiMetric/EmployeeGoal/SkillMatrix/PerformanceReview` query MUST be scoped by `tenantId` via a `requireLmsAdmin`-style guard. **No cross-tenant query may exist.** This is a security invariant (RISK-SEC3), covered by a mandatory negative integration test per HRIS endpoint (tenant A cannot read tenant B).

4. **Introduce an API-side feature-flag mirror.** Web flags gate UI, but the new domains expose write endpoints that touch money/PII and must be independently disable-able server-side without a web rebuild. Add `apps/api/src/config/features.ts` (env `FEATURE_*`, default OFF) and a `requireFeature("marketplace")` middleware that returns `404 NOT_FOUND` (not 403 — do not reveal the surface) when off. Web `features.ts` gains keys `crm`, `hris`, `bootcamp` for parity. Rationale: a build-time-only flag cannot stop a live API endpoint; a partially-shipped marketplace must be killable server-side.

5. **Gamification is event-sourced and OFF until anti-abuse exists.** XP is never mutated in place. A single append-only `GamificationEvent` ledger (userId, type, points, sourceType/sourceId, dedupe key) is the source of truth; `UserGameStat` (XP/level/streak) is a derived projection recomputed from the ledger. Awards are enqueued via the existing job queue from domain events (lesson complete, purchase, post created), never written synchronously in hot paths. `features.gamification` stays OFF (UI) and `FEATURE_GAMIFICATION` OFF (API) until dedupe + rate-limit + idempotency are in place (per TD-27). No fabricated leaderboard data ever ships (BL-25).

6. **Reuse real progress infra for Learning Path — do not duplicate it.** TASK-090 sequences existing `Course`/`CourseEnrollment`/`CourseLessonProgress` via new `LearningPath`/`LearningPathItem`/`LearningPathEnrollment` models. Path progress is **derived** from per-course progress (no second progress store). The static `apps/web/lib/e-course/data.ts` placeholder is replaced by DB-backed data as part of 090, not extended.

7. **External-dependency epics are gated on their prerequisites and must degrade safe.** Marketplace signed uploads require Cloudflare **R2 (TASK-098)**; Bootcamp recordings require **Cloudflare Stream**; CRM drip requires the **notification abstraction + queue (TASK-022)** and OneSignal. Where the dependency is unverified, the epic ships the DB + read paths behind a flag and stubs the external call behind an interface (mirroring the email/WA degrade-safe pattern), never blocking the build.

8. **One ADR per material deviation.** This ADR governs the shared shape. Any epic that must break these rules (e.g. Marketplace needing a genuine second payout ledger, or Gamification needing synchronous writes) files its own ADR (0003+) before merge, per CLAUDE.md §9.6.

## Consequences

- **Positive:** every new domain looks like the code already in the repo (module routers, Zod-at-boundary, app-enforced tenant scoping, event-sourced points); commerce/payout/queue/cert infra is reused not reinvented; features are independently killable on both web and API; security invariants (tenant isolation, anti-abuse) are explicit and test-gated; the build never blocks on unverified external services.
- **Negative:** the LMS module pattern + no-repository rule means business logic lives in services/route handlers, which needs discipline to keep under 400 lines (7 new domains × multiple sub-routers). The API-side flag system is net-new surface to maintain in parallel with web flags. Event-sourced gamification is more upfront work than a mutable counter — justified by anti-abuse/audit needs.
- **Neutral:** does not resolve the pre-existing `auth.ts` 524-line breach (tracked separately in BACKLOG); Phase 6 simply must not add to it.
- Re-evaluate after the first two epics (090 Learning Path, 042 Marketplace) ship, to confirm the module pattern holds at scale.
