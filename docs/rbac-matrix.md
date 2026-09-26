# RBAC Matrix (TASK-013)

> Maps sensitive endpoint groups to required roles and the enforcement mechanism. RBAC is enforced via two patterns: `authorize(...)` middleware and inline guards (`requireSuperAdmin`, `requireLmsAdmin`, `requireTrainer`). `super_admin` bypasses tenant/role checks by design (logged via AuditLog on mutations).

## Roles
`visitor · student · trainer · event_participant · corporate_client · partner · creator · super_admin` (+ tenant-scoped `lms_admin` in `UserRole`).

## Enforcement by module

| Module | Endpoint group | Required role | Mechanism |
|--------|----------------|---------------|-----------|
| auth | register/login/refresh/verify/reset | public (rate-limited) | `authLimiter` |
| users | `PATCH/DELETE /users/me` | authenticated (self) | `authenticate` |
| courses | `POST/PATCH/publish/DELETE` | trainer, super_admin | `authorize("trainer","super_admin")` / `authorize("super_admin")` |
| categories | write ops | super_admin | `authorize("super_admin")` |
| courses/categories | read | public | none |
| trainer | dashboard/analytics/payouts | trainer, super_admin | inline `requireTrainer` |
| trainer | `PATCH /payouts/:id` (approve) | super_admin | inline check |
| lms (tenant mgmt) | create/patch tenant, add admin | super_admin | `requireSuperAdmin` |
| lms (batch/course/invite/report) | tenant ops | lms_admin (tenant) or super_admin | `requireLmsAdmin` (tenant-scoped) |
| lms (portal) | student portal | authenticated member | `authenticate` + membership |
| lms (public branding) | `GET /public/:slug` | public | none |
| admin | dashboard/user/transaksi | super_admin | inline check |
| coupons | create/validate admin | super_admin | inline check |
| ebooks | admin write | super_admin | inline check |
| checkout/orders | create/refund | authenticated (self); refund admin | `authenticate` + owner/admin check |
| webhooks | DOKU callback | signature-verified (no session) | signature check |
| reviews/blog/affiliate/subscription | write | authenticated / admin per action | `authenticate` + role check |

## Gaps to verify (follow-up)
- Standardize on `authorize(...)` middleware vs inline guards for consistency (BL).
- Add explicit negative-authz tests for every sensitive endpoint (partial today; LMS invite/guard paths covered).
- `super_admin` bypass should always write an AuditLog entry — audit coverage to be expanded (TASK-023 observability).
