# Phase 10 — Launch Checklist

Go-live verification gate for Jago Akademi. Complete all items before marking launch as done.

---

## 1. Infrastructure

| # | Item | Status |
|---|------|--------|
| 1.1 | Server provisioned (min 4 vCPU / 8 GB RAM) | ☐ |
| 1.2 | PostgreSQL 16 deployed with daily automated backups | ☐ |
| 1.3 | Meilisearch v1.5 deployed, master key rotated | ☐ |
| 1.4 | Cloudflare R2 bucket `jago-akademi-media` created | ☐ |
| 1.5 | SSL certificate for `jagoakademi.com` + `www.jagoakademi.com` (do **not** add `api.jagoakademi.com` — it does not resolve, so its HTTP-01 challenge always fails and takes the whole issuance/renewal down with it; see BL-33 and `RUNBOOK_DEPLOY.md` §4) | ☐ |
| 1.6 | Nginx reverse-proxy configured (see `nginx/nginx.conf`) | ☐ |
| 1.7 | Docker Compose prod stack starts without error | ☐ |

---

## 2. Secrets & Environment Variables

| # | Item | Status |
|---|------|--------|
| 2.1 | All secrets stored in `.env` — NOT in git | ☐ |
| 2.2 | `JWT_SECRET` ≥ 48 chars (openssl rand -base64 48) | ☐ |
| 2.3 | `JWT_REFRESH_SECRET` different from JWT_SECRET | ☐ |
| 2.4 | DOKU credentials point to **production** (not sandbox) | ☐ |
| 2.5 | Resend API key is live key (`re_live_*`) | ☐ |
| 2.6 | `COOKIE_SECURE=true` and `COOKIE_DOMAIN=.jagoakademi.com` | ☐ |
| 2.7 | `CORS_ORIGIN` matches production web URL exactly | ☐ |
| 2.8 | Google OAuth callback URL updated to production | ☐ |

---

## 3. Database

| # | Item | Status |
|---|------|--------|
| 3.1 | `npx prisma migrate deploy` completed with zero errors | ☐ |
| 3.2 | Seed script executed: `npx tsx prisma/seed.ts` | ☐ |
| 3.3 | Admin password changed after first login | ☐ |
| 3.4 | Database user has minimal required permissions (not superuser) | ☐ |
| 3.5 | `pg_dump` backup verified and restorable | ☐ |

---

## 4. API Health Checks

| # | Item | Status |
|---|------|--------|
| 4.1 | `GET /api/health` returns 200 | ☐ |
| 4.2 | `POST /api/auth/login` (with seed admin) returns JWT | ☐ |
| 4.3 | `GET /api/categories` returns category list | ☐ |
| 4.4 | `GET /api/courses` returns published courses | ☐ |
| 4.5 | `GET /api/events` returns event list | ☐ |
| 4.6 | `GET /api/ebooks` returns e-book list | ☐ |
| 4.7 | Meilisearch course index populated (check /admin panel) | ☐ |

---

## 5. Web App

| # | Item | Status |
|---|------|--------|
| 5.1 | `next build` completes with 0 errors on production env | ☐ |
| 5.2 | Homepage loads in < 3s on 4G (Lighthouse Network throttle) | ☐ |
| 5.3 | `/sitemap.xml` returns valid XML with static + dynamic URLs | ☐ |
| 5.4 | `/robots.txt` blocks `/dashboard`, `/admin`, `/api/` | ☐ |
| 5.5 | JSON-LD `EducationalOrganization` visible in page source | ☐ |
| 5.6 | Custom 404 page loads at `/nonexistent-path` | ☐ |
| 5.7 | `NEXT_PUBLIC_API_URL` points to production API | ☐ |

---

## 6. Security

| # | Item | Status |
|---|------|--------|
| 6.1 | All response headers present (run `curl -I https://jagoakademi.com`) | ☐ |
| 6.2 | `X-Content-Type-Options: nosniff` header present | ☐ |
| 6.3 | `X-Frame-Options: DENY` header present | ☐ |
| 6.4 | `Strict-Transport-Security` header present | ☐ |
| 6.5 | HTTP → HTTPS redirect verified | ☐ |
| 6.6 | Auth endpoints rate-limited (test: 6+ rapid logins → 429) | ☐ |
| 6.7 | No secrets or stack traces in API error responses | ☐ |
| 6.8 | `npm audit --production` shows 0 critical vulnerabilities | ☐ |
| 6.9 | Google OAuth login completes without error | ☐ |

---

## 7. Payments (DOKU)

| # | Item | Status |
|---|------|--------|
| 7.1 | DOKU merchant account is live (not sandbox) | ☐ |
| 7.2 | Test payment flow completes end-to-end | ☐ |
| 7.3 | 🔴 Webhook URL registered: `https://jagoakademi.com/api/webhooks/doku` — **NOT** `api.jagoakademi.com` (does not resolve, BL-33). A webhook pointed at the dead host is never delivered: **payments are never confirmed and orders hang in `pending` forever.** Verify with a sandbox transaction, not by reading the DOKU dashboard. | ☐ |
| 7.4 | Payment confirmation email received after test purchase | ☐ |
| 7.5 | Invoice PDF generated and downloadable | ☐ |

---

## 8. Email

| # | Item | Status |
|---|------|--------|
| 8.1 | Resend domain `jagoakademi.com` verified and DNS records published | ☐ |
| 8.2 | `POST /api/auth/register` sends welcome email | ☐ |
| 8.3 | Payment confirmation email sent after DOKU webhook | ☐ |
| 8.4 | Password reset email sends and link works | ☐ |
| 8.5 | Email renders correctly in Gmail, Outlook, and mobile | ☐ |

---

## 9. Monitoring

| # | Item | Status |
|---|------|--------|
| 9.1 | Sentry project created, DSN configured in both API and web | ☐ |
| 9.2 | Test error captured in Sentry | ☐ |
| 9.3 | Server uptime monitoring configured (UptimeRobot / BetterUptime) | ☐ |
| 9.4 | Alert email configured for downtime > 1 minute | ☐ |
| 9.5 | Disk usage alert set at 80% threshold | ☐ |

---

## 10. SEO & Analytics

| # | Item | Status |
|---|------|--------|
| 10.1 | Google Search Console ownership verified | ☐ |
| 10.2 | Sitemap submitted to Search Console | ☐ |
| 10.3 | Google Analytics 4 property created, `NEXT_PUBLIC_GA_ID` set | ☐ |
| 10.4 | Lighthouse score: Performance ≥ 90, Accessibility ≥ 90 on homepage | ☐ |
| 10.5 | Open Graph tags verified with Facebook Sharing Debugger | ☐ |

---

## 11. Post-Launch (Day 1)

| # | Item | Status |
|---|------|--------|
| 11.1 | Monitor Sentry for new errors in first 24 hours | ☐ |
| 11.2 | Monitor API response times — alert if P95 > 1s | ☐ |
| 11.3 | Verify early-access signups landing in database | ☐ |
| 11.4 | Test complete user journey: register → enroll → pay → access content | ☐ |
| 11.5 | Share early-access URL with initial marketing channels | ☐ |

---

**Launch approved when:** All items in sections 1–10 are checked. Section 11 is day-of monitoring.
