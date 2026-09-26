# ADR-0001: Frontend Stack — Next.js 16 + React 19 (bleeding-edge) with Fallback Plan

- **Status:** Accepted
- **Date:** 2 Juli 2026
- **Task:** TASK-003 (Phase 1 Stabilize)
- **Deciders:** Engineering + reviewer

## Context

The web app runs on **Next.js 16.2.0** + **React 19.2.7** — very new releases at project start (TD-09). This carries risk: third-party libraries (Radix UI, framer-motion, testing tooling) may not be fully compatible, and RSC/hydration breaking changes can surface subtle runtime bugs (CRIT-06 / RISK-T1).

Baseline audit (TASK-000) confirmed the web app **builds and type-checks cleanly** on this stack, so the risk is currently theoretical — but unpinned `^` ranges allow silent drift on a fresh `npm install`.

## Decision

1. **Keep** Next 16 / React 19 — the build is green and the App Router + RSC features are wanted.
2. **Pin critical dependencies to exact versions** (remove `^`) so `npm install` is reproducible and matches `npm ci`. See `docs/COMPATIBILITY_MATRIX.md`.
3. **Commit the lockfile** as the source of truth for the full tree.
4. **Document a fallback** to the previous LTS line (Next 15 / React 18) to be used only if a hard blocker appears.

## Fallback Plan (only if a blocker appears)

| Package | Current | Fallback (LTS) |
|---------|---------|----------------|
| next | 16.2.0 | 15.x latest |
| react / react-dom | 19.2.7 | 18.3.x |
| @types/react(-dom) | 19.2.2 | 18.3.x |

Trigger: an unresolvable runtime/hydration/library-compat bug traced to React 19 / Next 16. Procedure: create branch `chore/downgrade-lts`, pin the fallback versions, run full validation (§9.11), smoke-test RSC + hydration via E2E, update this ADR to "Superseded".

## Consequences

- **Positive:** reproducible builds; explicit, reviewed upgrade path; risk made visible not hidden.
- **Negative:** exact pins require deliberate bumps (dependabot/manual) instead of passive `^` updates — acceptable trade-off for a bleeding-edge stack.
- Re-evaluate after Soft Launch stability data.
