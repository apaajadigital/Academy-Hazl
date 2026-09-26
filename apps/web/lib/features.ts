/**
 * Feature flags (TASK-053). Default OFF for anything not yet built, so unbuilt
 * features/links never surface in production. Enable per-env with
 * `NEXT_PUBLIC_FEATURE_*=true` once the corresponding task ships.
 *
 * These are inlined at build time (NEXT_PUBLIC_*), so toggling requires a rebuild.
 */
const on = (v: string | undefined): boolean => v === "true" || v === "1";

export const features = {
  // Note: the B2B LMS landing (/clients) is deliberately NOT flagged — it ships
  // live, sits in the sitemap, and is linked from the navbar/footer/homepage, so
  // gating it behind a default-OFF flag would 404 an already-public funnel.
  //
  // The same reasoning removed three flags — `marketplace`, `collaboration`, and
  // `affiliate`. Each was declared here but read by nothing (zero call sites),
  // while /marketplace, /kolaborasi, and /afiliasi all ship live with real content
  // and are swept by e2e/public-sweep.spec.ts expecting HTTP 200. That combination
  // is the actual defect: the flag reads as "this page is gated" in review while
  // the page is in fact fully public, so it hides a live surface from scrutiny.
  //
  // `allAccess`/`gamification` below are also unread today, but they gate NOTHING
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
} as const;

export type FeatureKey = keyof typeof features;

export function isEnabled(key: FeatureKey): boolean {
  return features[key];
}
