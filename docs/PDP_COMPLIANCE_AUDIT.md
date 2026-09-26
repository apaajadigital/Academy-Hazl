# PDP Compliance Audit (TASK-051)

> Assessment against **UU No. 27/2022 (Pelindungan Data Pribadi / PDP)** — Indonesia's data protection law. Host-independent analysis; resolves INC-08 (PDP region/erasure). Legal review by a qualified DPO/counsel is still required before public launch — this is an engineering-level gap analysis, not legal advice.
> Date: 2 Juli 2026 · Scope: `apps/api` + `apps/web` data handling.

## 1. Personal-data inventory

| Data | Where | Sensitivity | Lawful basis (intended) |
|------|-------|-------------|-------------------------|
| Name, email | `User` | PII | consent + contract |
| Password (hash) | `User.passwordHash` (bcrypt) | credential | contract |
| Google sub / OAuth id | `User` | PII | consent |
| Phone | `UserProfile.phone` | PII | consent (WA notif) |
| Bio, headline, LinkedIn, location, avatar | `UserProfile` | PII (user-provided) | consent |
| IP, user-agent | `AuditLog`, `RefreshToken` | PII (security) | legitimate interest (security) |
| Payment metadata | `Order`, `PaymentTransaction` | financial | contract + legal retention |
| Learning activity | enrollments, progress, quiz | behavioral | contract |

## 2. Compliance status by principle

| # | PDP requirement | Status | Evidence / Gap |
|---|-----------------|--------|----------------|
| 1 | **Lawful basis & consent** (Art. 20) | ✅ Partial | Registration requires `consent: z.literal(true)` + `consentGivenAt` (password + Google). **Gap:** no privacy-policy **version** captured → can't prove which policy was consented to, can't trigger re-consent on policy change. |
| 2 | **Transparency / privacy notice** (Art. 21) | ⚠️ | ToS/Privacy Policy pages planned (roadmap Fase 1). Verify they are live + linked at consent point. |
| 3 | **Right to access / portability** (Art. 5–6) | ❌ **Gap** | No endpoint for a user to view/export their data. **Recommend:** `GET /api/users/me/export` returning a JSON bundle of the user's data. |
| 4 | **Right to rectification** (Art. 8) | ✅ | `PATCH /api/users/me` (name, avatar, bio, headline, linkedin, location). |
| 5 | **Right to erasure** (Art. 9) | ✅ | `DELETE /api/users/me` anonymizes (email→`deleted+<id>@jagoakademi.invalid`, name→"Akun Dihapus", `passwordHash`/tokens nulled, `deletedAt` set, refresh tokens revoked, `UserProfile` PII cleared). Financial records retained for legal obligation — correct. |
| 6 | **Data minimization** (Art. 16) | ⚠️ | Collects phone/bio/linkedin only with consent (ok). **Gap:** `AuditLog` stores `ip`+`user-agent` indefinitely (see #8). |
| 7 | **Security of processing** (Art. 35) | ✅ Strong | bcrypt, JWT + httpOnly refresh cookie, RBAC, rate limiting, HTTPS/HSTS, CSP, audit-log PII redaction (`redact()`), pino log PII redaction. |
| 8 | **Retention limitation** (Art. 43) | ❌ **Gap** | No defined retention periods. `AuditLog` (with IP/UA), anonymized accounts, and inactive-user data accumulate indefinitely. **Recommend:** purge/anonymize `AuditLog` > 12 months (keep security-relevant aggregates); define inactive-account policy. |
| 9 | **Breach notification** (Art. 46 — 3×24 jam) | ❌ **Gap (process)** | No documented breach-response process. **Recommend:** add a "Data Breach" section to `RUNBOOK_INCIDENT.md` with the 72-hour notification workflow to the data subject + authority. |
| 10 | **Cross-border transfer** (Art. 56) | ⚠️ **Assess** | Cloudflare R2/Stream + Resend + Sentry may process/store data outside Indonesia. **Recommend:** confirm each processor's data-residency, sign DPAs, and disclose in the privacy notice. |
| 11 | **DPO / accountability** (Art. 53–54) | ⚠️ | Appoint a data protection contact; record a Processing Activity Register (ROPA). |
| 12 | **Audit trail** (accountability) | ✅ Partial | `AuditLog` covers register/login/verify/password-reset/account-delete/course-CRUD. **Gap:** payout, refund, role-change, tenant-admin changes not yet audited (also flagged for TASK-023 follow-up). |

## 3. Prioritized remediation

| Priority | Item | Effort | Type |
|----------|------|--------|------|
| 🔴 P1 (pre-launch) | Privacy notice live + linked at consent; capture **policy version** on consent | S (code) + legal | code+legal |
| 🔴 P1 | **Breach-response process** documented (72-hour) | S | doc |
| 🔴 P1 | Cross-border **DPA** review (Cloudflare/Resend/Sentry) + disclosure | M | legal |
| 🟡 P2 | **Data-access/export** endpoint (`/users/me/export`) | M | code |
| 🟡 P2 | **Retention policy** + `AuditLog` purge job (BullMQ scheduled) | M | code |
| 🟡 P2 | Expand audit coverage (payout/refund/role/tenant) | M | code |
| 🟢 P3 | ROPA + DPO appointment | S | governance |

## 4. INC-08 resolution

INC-08 (PDP region / erasure inconsistency) is **resolved**: erasure is implemented as **anonymization** (not hard-delete) preserving financial/legal records — the compliant pattern under UU PDP (retention for legal obligation overrides erasure for those records). The `@jagoakademi.invalid` sentinel email is intentional (RFC 6761 reserved TLD, never routable). Data residency (Jakarta region) is captured as gap #10 (cross-border) for the processor-DPA review.

## 5. Follow-ups tracked

New BACKLOG items: BL-18 (data-export endpoint), BL-19 (retention + AuditLog purge), BL-20 (consent versioning), BL-21 (breach-response runbook section), BL-22 (cross-border DPA review). CSP-nonce hardening remains BL-16; 2FA/session-management UI are post-launch features.
