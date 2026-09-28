/**
 * Feature flags (TASK-053). Default OFF for anything not yet built, so unbuilt
 * features/links never surface in production. Enable per-env with
 * `NEXT_PUBLIC_FEATURE_*=true` once the corresponding task ships.
 *
 * These are inlined at build time (NEXT_PUBLIC_*), so toggling requires a rebuild.
 */
const on = (v: string | undefined): boolean => v === "true" || v === "1";

export const features = {
  // `allAccess`/`gamification` below are unread today, but they gate NOTHING
  // public — they are forward declarations reserved by EPIC 7 (and, for
  // gamification, by the resolved reviewer decision in BL-25 → TASK-097), so they
  // stay. Never re-add a flag for an already-public page without its call site.

  // Private Class package page (/kelas-privat) — courses with format
  // "private_class". OFF until the backend catalog endpoint ships.
  privateClass: on(process.env.NEXT_PUBLIC_FEATURE_PRIVATE_CLASS),

  // EPIC 7 features — post-Soft-Launch (TASK-090/092/093...)
  allAccess: on(process.env.NEXT_PUBLIC_FEATURE_ALL_ACCESS),
  learningPath: on(process.env.NEXT_PUBLIC_FEATURE_LEARNING_PATH),
  community: on(process.env.NEXT_PUBLIC_FEATURE_COMMUNITY),
  gamification: on(process.env.NEXT_PUBLIC_FEATURE_GAMIFICATION),

  // NOTE: there is deliberately no `mentor` flag any more. The /mentor route,
  // its components and its seven fictional profiles were deleted outright
  // (BL-114, owner decision 11 Sep 2026) rather than left behind a flag — a
  // flag only hides fabricated people attributed to real companies, it does
  // not remove them from the repository. A future mentor/trainer showcase
  // starts from real, consented data and gets its own flag then.

  // Alumni stories page (/alumni) — approved alumni testimonials. OFF until
  // the testimonials endpoint ships with real, consented stories (BL-28).
  alumni: on(process.env.NEXT_PUBLIC_FEATURE_ALUMNI),
  // Member portfolio showcase (/portofolio-member) — published member
  // portfolios. OFF until the portfolios endpoint ships.
  portfolio: on(process.env.NEXT_PUBLIC_FEATURE_PORTFOLIO),

  // ─── Scope-down pass (28 Sep 2026, owner decision) ─────────────────────────
  // Owner compared the platform against hazl-skill.vercel.app (a deliberately
  // minimal browse → checkout → simple-dashboard reference) and asked to hide
  // every large standalone surface that reference doesn't have. Every flag
  // below defaults OFF but the underlying code, routes, and nav wiring are
  // untouched — flip the env var to "true" and rebuild to restore the exact
  // surface, nothing here was deleted.
  blog: on(process.env.NEXT_PUBLIC_FEATURE_BLOG),
  marketplace: on(process.env.NEXT_PUBLIC_FEATURE_MARKETPLACE),
  affiliate: on(process.env.NEXT_PUBLIC_FEATURE_AFFILIATE),
  trainerHub: on(process.env.NEXT_PUBLIC_FEATURE_TRAINER_HUB),
  lmsB2b: on(process.env.NEXT_PUBLIC_FEATURE_LMS_B2B),
  subscription: on(process.env.NEXT_PUBLIC_FEATURE_SUBSCRIPTION),
  // /clients markets the LMS B2B workspace and /trainer-program markets
  // becoming a trainer — both gated with their underlying feature so we never
  // advertise a funnel whose destination is hidden.
  clients: on(process.env.NEXT_PUBLIC_FEATURE_LMS_B2B),
  trainerProgram: on(process.env.NEXT_PUBLIC_FEATURE_TRAINER_HUB),

  // Root ('/') as the marketing homepage vs the catalog (Sep 2026, owner
  // decision). Owner asked the site root to match the reference (hazl-skill.
  // vercel.app), whose root is the catalog with no separate homepage. This
  // flag HIDES the homepage rather than deleting it: OFF means '/' redirects
  // to /e-course; ON restores the marketing homepage at '/' untouched.
  homepage: on(process.env.NEXT_PUBLIC_FEATURE_HOMEPAGE),
  // Public creator directory + profile pages (/creators, /creator/[id]).
  // Reads real trainer + MemberPortfolio data via GET /api/creators — no
  // fabricated profiles, so this stays independent of `trainerHub`.
  // Default ON (unlike the flags above): this is a shipped, working
  // feature, not something staged behind a launch decision.
  creators: process.env.NEXT_PUBLIC_FEATURE_CREATORS !== "false",
} as const;

export type FeatureKey = keyof typeof features;

export function isEnabled(key: FeatureKey): boolean {
  return features[key];
}
