# Security Checklist — P1 (TASK-013)

> Pre-launch security posture. ✅ done · ⚠️ partial/accepted-risk · ⬜ todo. Full RBAC map: `docs/rbac-matrix.md`.

## P1 items

| # | Item | Status | Notes |
|---|------|--------|-------|
| 1 | No hardcoded secrets in source | ✅ | Scan clean (TASK-001 + re-verified TASK-013). `.env` gitignored. |
| 2 | SQL injection prevention | ✅ | Prisma parameterized queries throughout; injection test in `security.test.ts`. |
| 3 | XSS in rendered content | ✅ | `dangerouslySetInnerHTML` removed (TASK-002); React auto-escaping. |
| 4 | Auth: JWT + refresh (httpOnly cookie) | ✅ | `token.ts`, `REFRESH_COOKIE`. |
| 5 | RBAC on sensitive endpoints | ✅ | Enforced (mixed `authorize()` + inline guards). Matrix documented. |
| 6 | Rate limiting | ✅ | Global **500**/15m (`apps/api/src/middleware/rateLimiter.ts:12`) + auth **30**/15m (`:25`) + login/register/forgot-password **30**/15m (`:38`). Payment uses global (granular = minor enhancement). ⚠️ **Dikoreksi 30 Jul 2026:** baris ini sebelumnya menulis "Global 100/15m + auth 10/15m" — dua-duanya salah. `docs/BACKLOG.md` BL-42 mencatat kenaikan ke 500 tetapi checklist ini tak pernah ikut diperbarui; header live `RateLimit-Limit: 500` mengonfirmasi angka yang benar. |
| 7 | Security headers | ✅ | `X-Content-Type-Options`, `X-Frame-Options: DENY`, `Referrer-Policy`, `Permissions-Policy`, **HSTS** + **baseline CSP** added (TASK-013). |
| 8 | CSP nonce-based | ⚠️ | Baseline CSP enforcing; nonce-based hardening = P2 (BL-16). `'unsafe-inline'` needed for Next/Tailwind without nonces. |
| 9 | CSRF protection | ✅ (by design) | State-changing APIs use `Authorization: Bearer` (not cookie-auth) → not CSRF-vulnerable. Refresh cookie is httpOnly + SameSite. Verify SameSite=strict/lax in prod. |
| 10 | Error messages don't leak internals | ✅ | Central errorHandler returns structured codes; stack traces suppressed in prod; leak test in `security.test.ts`. |
| 11 | PDP right-to-erasure | ✅ | `DELETE /users/me` anonymizes (TD-14). Full PDP audit = P2 (TASK-051). |
| 12 | Dependency audit (`npm audit`) | ⚠️ **ACCEPTED RISK** | See below. |

## ⚠️ npm audit — accepted risk (BL-15)

`npm audit` reports **1 high + 1 moderate**, both from **Next.js 16.2.x** (DoS, middleware/proxy bypass, cache-poisoning, XSS-with-nonces, SSRF via WS) and its transitive **postcss**.

**No forward fix is available:** the advisory range covers up to `16.3.0-canary.5`; latest published is `16.2.10` (still in range) and `16.3.0` stable is **not released**. `npm audit fix` only offers a breaking downgrade to `next@9.3.3`.

This is RISK-T1 / ADR-0001 (bleeding-edge stack) materializing as a security issue.

**DECISION (2 Juli 2026): Option A — Accept + mitigate (interim).** Approved by reviewer.
- Edge rate-limiting via Nginx (DoS advisories) — configure in TASK-020.
- Enforce baseline CSP (added TASK-013); nonce upgrade tracked BL-16.
- No untrusted/user-controlled middleware or proxy config (mitigates middleware-bypass advisories).
- **Monitor** for a patched Next 16 release; re-evaluate weekly. If any advisory becomes actively exploited before a patch ships → **trigger ADR-0001 fallback to Next 15 LTS**.
- Rejected for now: **B. Next 15 LTS fallback** — framework downgrade requiring full RSC/hydration + E2E re-validation; hold as the escalation path.

Do **not** run `npm audit fix --force` (downgrades to next@9.3.3 — breaks the app).

## Remaining (P2 — tracked)
- Nonce-based CSP (BL-16), 2FA/OTP via WA, session management UI, full PDP compliance audit (TASK-051), expand AuditLog coverage (TASK-023), standardize authorize() usage, granular payment rate-limit.
