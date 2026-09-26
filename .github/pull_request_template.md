# <type>(scope): <summary>

> Ref: TASK-XXX (SSOT: PROJECT_PROGRESS_REPORT_V2.md)

## What & Why
<!-- What does this change do, and which SSOT task/gap does it address? -->

## Scope
- [ ] One task per PR (§9.4) — this PR addresses a single task
- [ ] No new features during Phase 1–4 (Stabilize→Integration)

## Validation (§9.11) — all must pass in CI
- [ ] `npm run check-types` — 0 errors (src + test)
- [ ] `npm run lint` — clean (web `--max-warnings 0`)
- [ ] `npm run test` — green; critical-module coverage ≥ 80% where applicable
- [ ] `npm run build` — both apps build
- [ ] Self-reviewed the diff; no debug code, secrets, or `.env`

## Contract / Schema changes
- [ ] `packages/types` + frontend + tests updated in this PR (if API contract changed)
- [ ] Prisma migration added (if schema changed) / documented for TASK-021
- [ ] ADR added under `docs/adr/` (if architecture changed)

## Docs
- [ ] Relevant docs updated in this PR (docs-as-code, §9.10)

## Notes for reviewer
<!-- Anything high-stakes (auth, payment, deploy) needing extra scrutiny -->
