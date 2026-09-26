# Test Plan — Jago Akademi Platform

## Status

| Area | Status | Coverage / Count |
|------|--------|-----------------|
| API Integration Tests | ✅ Done | 62% lines, 56% functions |
| API Security Tests | ✅ Done | OWASP checks |
| Unit Tests (Services) | ✅ Done | emailService, invoiceService, meilisearch |
| E2E Playwright | ✅ Done | 8 spec files, 35+ scenarios |
| Responsive Testing | ✅ Done | 375, 768, 1440px |
| Security Headers | ✅ Done | next.config.js headers |
| Performance Config | ✅ Done | AVIF/WebP, caching, compression |
| Load Testing (k6) | ⏳ Pre-launch | See Section 4 |
| UAT | ⏳ Pre-launch | See Section 5 |

---

## 1. API Unit + Integration Tests

**Framework:** Vitest + Supertest  
**Location:** `apps/api/test/`

### Coverage Summary (Phase 9 baseline)

| Metric | Before Phase 9 | After Phase 9 | Target |
|--------|---------------|---------------|--------|
| Lines | 52.95% | 61.82% | 60%+ |
| Statements | 51.76% | 60.37% | 60%+ |
| Functions | 46.42% | 55.71% | 54%+ |
| Branches | 42.38% | 49.94% | 48%+ |

### Coverage Gaps (by design)

The following files have low coverage due to external infrastructure dependencies. They are excluded from threshold calculations:

| File | Coverage | Reason |
|------|----------|--------|
| `google.ts` | ~7% | Google OAuth flow requires real Google credentials |
| `dokuService.ts` | ~9% | DOKU payment gateway requires live API credentials |
| `emailService.ts` | ~40%+ | Uses Resend; real email sending requires live key |
| `whatsappService.ts` | ~0% | WhatsApp API not configured |

### Test Files

```
test/
├── integration/
│   ├── auth.test.ts              — register, login, refresh, verify email
│   ├── courses.test.ts           — CRUD, enrollment, progress
│   ├── orders.test.ts            — checkout, payment status
│   ├── dashboard-users.test.ts   — dashboard stats, user PDP (Phase 9)
│   ├── categories-videos-ebooks.test.ts — public catalog routes (Phase 9)
│   ├── security.test.ts          — OWASP-aligned auth/authz checks (Phase 9)
│   ├── events-extended.test.ts   — event CRUD + admin (Phase 9)
│   ├── lms/
│   │   ├── tenants.test.ts
│   │   └── branding-cert.test.ts
│   └── phase8/
│       ├── trainer-reviews-blog.test.ts
│       └── affiliate-subscription.test.ts
└── unit/
    ├── services.test.ts          — emailService, invoiceService (Phase 9)
    └── meilisearch.test.ts       — search service (Phase 9)
```

---

## 2. E2E Tests (Playwright)

**Framework:** Playwright  
**Location:** `apps/web/e2e/`  
**Run:** `npx playwright test` (requires both Next.js dev server + API running)

### Spec Files

| File | Scenarios | What it tests |
|------|-----------|---------------|
| `smoke.spec.ts` | 9 | Public pages, auth redirects |
| `homepage.spec.ts` | 5+ | Homepage sections, visual |
| `visual-baseline.spec.ts` | 4+ | Screenshot baseline |
| `auth-flow.spec.ts` | 8 | Login, register, redirect guards |
| `e-course.spec.ts` | 5 | E-course listing, categories, berlangganan |
| `events-blog.spec.ts` | 8 | Events, blog listing, public pages |
| `responsive.spec.ts` | 14 | 375/768/1440px breakpoints, no overflow |

**Total E2E scenarios: 53+**

### Pre-requisites for E2E

```bash
# Terminal 1: API server
cd apps/api && npx tsx src/index.ts

# Terminal 2: Next.js dev
cd apps/web && npm run dev

# Terminal 3: Run tests
cd apps/web && npx playwright test
```

---

## 3. Security Audit

### OWASP-Aligned Checks (Automated)

Covered in `test/integration/security.test.ts`:

- [x] **401 enforcement** — all protected endpoints reject requests without JWT
- [x] **403 role checks** — admin-only endpoints block regular users  
- [x] **400 input validation** — Zod schema rejections on malformed input
- [x] **XSS prevention** — API responses are always `application/json`, never HTML
- [x] **Stack trace leak prevention** — errors never expose internal stack traces
- [x] **SQL injection** — all DB queries via Prisma ORM (parameterized)
- [x] **Env var leak prevention** — health endpoint doesn't expose config

### Security Headers (next.config.js)

- [x] `X-Content-Type-Options: nosniff`
- [x] `X-Frame-Options: DENY`
- [x] `Referrer-Policy: strict-origin-when-cross-origin`
- [x] `Permissions-Policy: camera=(), microphone=(), geolocation=()`
- [x] `Cache-Control: no-store` on API routes
- [x] `Cache-Control: immutable` on static assets

### Manual Security Checklist (Pre-launch)

- [ ] OWASP Top 10 manual review of auth flows
- [ ] Penetration test on payment/checkout endpoint
- [ ] File upload path traversal test
- [ ] CSRF check on state-changing forms
- [ ] Session expiry after token invalidation
- [ ] Rate limiting test (confirm 429 after limit)

---

## 4. Performance Testing

### Next.js Optimizations Applied

- [x] Image formats: AVIF + WebP fallback
- [x] Optimized package imports: `lucide-react`, `framer-motion`
- [x] Compression enabled (`compress: true`)
- [x] Removed `X-Powered-By` header
- [x] Static assets cached with `max-age=31536000, immutable`

### Core Web Vitals Targets (Lighthouse)

| Metric | Target | Measurement Tool |
|--------|--------|-----------------|
| LCP | < 2.5s | Lighthouse CLI |
| INP | < 200ms | Lighthouse CI |
| CLS | < 0.1 | Lighthouse CI |
| FCP | < 1.5s | Lighthouse CI |
| Performance Score | ≥ 85 | Lighthouse |

### Load Test Plan (k6 — Pre-launch)

```javascript
// k6 script: load-test.js
import http from "k6/http";
import { check } from "k6";

export const options = {
  stages: [
    { duration: "2m", target: 100 },   // ramp up to 100 users
    { duration: "5m", target: 500 },   // hold at 500 users
    { duration: "2m", target: 1000 },  // peak: 1000 concurrent
    { duration: "2m", target: 0 },     // ramp down
  ],
  thresholds: {
    http_req_duration: ["p(95)<2000"],  // 95% under 2s
    http_req_failed: ["rate<0.01"],     // <1% error rate
  },
};

export default function () {
  http.get("https://jagoakademi.com/e-course");
  http.get("https://jagoakademi.com/api/courses");
}
```

Run: `k6 run load-test.js`

---

## 5. UAT (User Acceptance Testing)

**Timeline:** Before public launch  
**Participants:** 10 internal users + 5 beta testers

### Critical User Flows

| # | Flow | Expected Result |
|---|------|----------------|
| 1 | Register → Verify Email → Login | Account created, verified, logged in |
| 2 | Browse E-Course → Add to Cart → Pay via DOKU | Payment confirmed, enrollment created |
| 3 | Watch Video → Mark Complete → Get Certificate | Certificate with unique code issued |
| 4 | Register Event → Receive Ticket → QR Code | Ticket with valid QR code received |
| 5 | Download E-Book (free) | PDF downloaded |
| 6 | Download E-Book (paid) → Order Required | Blocked; redirected to checkout |
| 7 | LMS Portal Login → Access Kursus | Enrolled content accessible |
| 8 | Submit Review → Review Visible on Course | Review published |
| 9 | Affiliate Register → Get Referral Link | Link works, click tracked |
| 10 | Subscribe (Monthly) → Access Premium Content | Subscription active |

### Accessibility Checklist

- [ ] All images have `alt` text
- [ ] Color contrast ≥ 4.5:1 for normal text (WCAG AA)
- [ ] Keyboard navigation works for all interactive elements
- [ ] Form error messages announced to screen readers
- [ ] `prefers-reduced-motion` respected for animations

---

## 6. Cross-Browser Testing

| Browser | Version | Status |
|---------|---------|--------|
| Chrome (desktop) | Latest | ✅ Playwright CI |
| Firefox | Latest | ⏳ Pre-launch manual |
| Safari (macOS) | Latest | ⏳ Pre-launch manual |
| Safari (iOS) | 17+ | ⏳ Pre-launch manual |
| Chrome (Android) | Latest | ⏳ Pre-launch manual |
| Edge | Latest | ⏳ Pre-launch manual |

---

## 7. Running the Full Test Suite

```bash
# API tests + coverage
cd apps/api
npx vitest run --coverage

# E2E tests (requires servers running)
cd apps/web
npx playwright test

# Type check
cd apps/web
npx tsc --noEmit

# API build check
cd apps/api
npx tsc --noEmit
```

---

## 8. CI/CD Recommendations

### GitHub Actions Workflow

```yaml
name: Test Suite
on: [push, pull_request]
jobs:
  api-tests:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:16
        env: { POSTGRES_DB: test, POSTGRES_USER: test, POSTGRES_PASSWORD: test }
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 22 }
      - run: npm ci
      - run: cd apps/api && npx vitest run --coverage

  e2e:
    runs-on: ubuntu-latest
    needs: api-tests
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npx playwright install --with-deps chromium
      - run: npm ci
      - run: cd apps/web && npx playwright test --reporter=html
      - uses: actions/upload-artifact@v4
        with:
          name: playwright-report
          path: apps/web/playwright-report/
```
