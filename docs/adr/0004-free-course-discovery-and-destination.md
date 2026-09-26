# ADR-0004: Free-Course Discovery Is a Server-Side Filter, and `/checkout/<slug>` Is the Course Landing

- **Status:** Accepted
- **Date:** 29 Juli 2026
- **Task:** Remediasi route `/kelas-gratis` (BL-51 … BL-54)
- **Deciders:** Engineering + reviewer (deploy human-gated)

## Context

`/kelas-gratis` is a public marketing route that promises free courses. Its catalog component (`apps/web/components/kelas-gratis/FreeCourseCatalog.tsx`) was built on two assumptions that the rest of the codebase does not hold:

1. **"Free" was computed in the browser.** The component fetched `GET /api/courses?limit=20` and then kept the rows whose *effective price* (`salePrice ?? price`) was `0`. There is no `isFree` column and no free filter in the API — free-ness was a per-call-site opinion.
2. **Course cards linked to `/kursus/<slug>`.** That path is not a route. `next.config.js` 308-redirects `/kursus/:path*` → `/checkout/:path*`, a compatibility shim left over from an older information architecture.

Three consequences followed, all of them invisible from the page itself:

- **Silent truncation.** Only the 20 most recently published courses were ever examined. A free course ranked 21st was unreachable through this page — with no empty state, no "load more", and no error. The page looked correct while under-serving its entire purpose.
- **A badge that could lie.** Checkout prices a course from `course.price` alone; `salePrice` is not applied to courses (`apps/api/src/routes/checkout.ts`, and the checkout page reads `Number(course.price)`). A course with `price = 250000, salePrice = 0` therefore satisfied the component's "effective price is 0" rule, rendered a green **GRATIS** badge, and then charged the visitor Rp 250.000 through DOKU.
- **A redirect hop on the primary CTA**, plus documentation (SSOT §854/§858, `docs/02-PRD.md`) describing a `/kelas-gratis/[slug]` detail page and a `FreeClass` model that were never built.

## Decision

### 1. Free-ness is decided in SQL, behind an explicit query parameter

`GET /api/courses` accepts `free=true`. The service (`courseService.listCourses`) translates it into:

```ts
const FREE_COURSE_WHERE = {
  AND: [{ price: 0, OR: [{ salePrice: null }, { salePrice: 0 }] }],
};
```

Two properties of this clause are deliberate:

- **Conservative, not "effective price".** A course qualifies only when it is free under *both* readings — list price and sale price. This is the only definition that cannot disagree with what checkout will actually charge. The looser rule is what produced the lying badge; adopting it server-side would have industrialised the bug rather than fixed it.
- **Wrapped in `AND`.** The text-search branch of `listCourses` already puts an `OR` on the where object (title/shortDesc ILIKE). A second `OR` key would overwrite the first. `AND` composes with every branch — plain list, ILIKE fallback, and the Meilisearch hit path — so the constraint cannot be lost by taking a different route through the function.

`free` is validated as a strict enum (`"true" | "false"`), matching the BL-47 precedent for `format`: an unrecognised value returns 400 rather than silently degrading to "serve the whole catalog", which is precisely the failure mode that puts a GRATIS badge on a paid course. `free=false` means "no price constraint" — the catalog has no paid-only view to serve.

### 2. The client keeps the same predicate as a deploy-window guard

`FreeCourseCatalog` requests `?free=true&limit=8` and *still* filters the response with an `isFree()` helper encoding the identical rule.

This is not redundant defensive coding for its own sake. The web app and the API are deployed as separate containers, so there is a real window in which a new web build talks to an API that predates the `free` parameter and ignores it — answering with the full catalog. Without the client guard, that window renders paid courses under a GRATIS badge.

Be precise about the degradation this trades for: because the request also asks for `limit=8`, a `free`-unaware API returns the 8 newest courses of any price, few or none of which survive `isFree()`. The likely outcome during that window is therefore the **empty state**, not a short catalog. That is a harder degradation than the pre-change behaviour (`limit=20`, filtered client-side) — accepted deliberately, because an empty catalog is recoverable by deploying the API, while a false "GRATIS" price claim is not.

### 3. `/checkout/<slug>` is the canonical course landing page

Courses have no detail page and are not getting one in this change. `/checkout/[slug]` is already the destination used by `ECourseCatalog` (`components/e-course/ECourseCatalog.tsx`) and `/kelas-privat`, so free-course cards now link there directly instead of bouncing through the `/kursus` 308.

For a genuinely free course, and for a visitor who is already signed in, this terminates correctly: `POST /api/checkout` sees `finalAmount === 0`, creates a `paid` order with `paymentMethod: "free"`, upserts the `CourseEnrollment`, and returns `{ free: true }`, which sends the browser to `/belajar/<slug>`. DOKU is never called.

Two honest caveats about this destination:

- **It is auth-walled.** `checkout/[slug]/page.tsx` resolves a token before fetching anything and pushes anonymous visitors to `/masuk?redirect=…`. `/kelas-gratis` is a public marketing page, so most visitors will meet a login screen. This is unchanged from the old `/kursus` link (which redirected to the same page) — the change removes a redirect hop, not the login wall. Making free courses previewable without an account is a product decision, not a remediation.
- **It presents as a payment.** For a Rp 0 course the page still renders "Rp 0", a "Bayar Sekarang" button and a "Pembayaran aman melalui DOKU" badge before the free short-circuit fires. Cosmetically wrong, functionally correct; logged as BL-110 rather than changed here, because the checkout page is shared with paid flows.

The `/kursus/:path*` redirect stays — external and historical links still depend on it.

## Consequences

**Positive**

- The page now shows the 8 newest **free** courses, instead of whichever free courses happened to fall inside the 20 newest courses overall. Free courses are no longer hidden by paid courses published after them — which was the actual defect.
- The GRATIS badge is now a claim the checkout flow can honour, under both the new and the legacy pricing reading.
- One fewer redirect hop on the page's primary CTA.
- The free-course contract is asserted at both ends: the where-clause shape in `apps/api/test/integration/courses/free.test.ts`, the rendered outcome in `apps/web/e2e/kelas-gratis.spec.ts`.

**Negative / accepted**

- **The catalog is still capped at 8 with no pagination.** `/kelas-gratis` is a marketing page, not the catalog of record, and its "Semua kursus" escape hatch points at `/e-course` — which has no free filter of its own. A 9th free course is still not reachable *from this page*. This is a deliberately smaller claim than "every free course is discoverable"; a paginated free view belongs to `/e-course` and is logged as BL-109.
- A course priced `0` with a non-zero `salePrice` (an odd but expressible state) is excluded. Accepted: such a course is not unambiguously free, and excluding it fails safe.
- **`free=true` combined with `q=` narrows a page of search hits rather than searching within free courses.** The Meilisearch branch queries the index with only a `status` filter and applies the free constraint afterwards in Prisma, so free matches ranked below the search page are dropped, and the branch's pre-existing `total: ordered.length` reports the post-filter count. `/kelas-gratis` never sends `q`, but `/api/courses` is public. Not introduced by this change (the same post-hoc pattern already applied to `format`), and not widened into a search-index change here.
- The free predicate now exists in two places (API and web). Accepted for the deploy-window reason above; both sites carry a comment naming the other.
- `free=true` has no dedicated index. `Course` already indexes `(format, status)`; the price predicate is evaluated on a set already narrowed by status+format, which at current catalog size is not worth a partial index. Revisit if the catalog grows past a few thousand rows.
- The API-side tests assert the **shape of the where clause**, not filtered rows — prisma is mocked, and this repo runs no test database. Decimal-vs-`0` and `salePrice IS NULL` semantics are therefore verified by review against the Prisma docs and by the E2E fixtures, not by SQL execution.

**Not fixed here — logged instead**

Two defects surfaced during this work that sit outside the route and touch money. They are recorded as BL-53 and BL-54 rather than patched in a marketing-page PR:

- **BL-53 (High):** checkout ignores `salePrice` for courses, so *every* discounted course is charged at full list price. This affects the whole marketplace, not just `/kelas-gratis`.
- **BL-54 (High):** `POST /api/enrollments` creates an enrolment with no price or order check — an authenticated user can enrol in any published paid course for free. Nothing in the web app calls it; the endpoint is reachable directly.

## Alternatives considered

| Alternative | Why rejected |
|---|---|
| Keep client-side filtering, raise `limit` to 50 | Moves the cliff, does not remove it; still silently truncates, and still allows the lying badge. |
| Add an `isFree` boolean column to `Course` | Denormalises a value derivable from price, and adds a second source of truth that can drift from what checkout charges. The bug being fixed *is* a drift bug. |
| Define free as `salePrice ?? price === 0` server-side | Matches the old client rule and the intuitive reading, but contradicts what checkout charges until BL-53 is fixed. Would make the badge lie by design. |
| Build `/kelas-gratis/[slug]` as SSOT §854 specifies | New feature, not remediation; blocked by the no-new-features rule for Phase 1–4 (CLAUDE.md §d.3). Divergence recorded as BL-51 instead. |
| Fix BL-53 (checkout `salePrice`) in this PR | Touches payment amount calculation for every course. Sensitive per SSOT §9.6 — needs its own change, its own tests, and reviewer sign-off. |
