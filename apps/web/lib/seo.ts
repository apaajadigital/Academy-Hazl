/**
 * Shared OG-image fallback for page-level metadata (fix, 29 Sep 2026).
 *
 * Next.js does NOT merge a page's `metadata.openGraph` with its layout's —
 * a page that sets its own `openGraph.title/description` REPLACES the whole
 * object, silently dropping the root layout's `images`. Found when '/' was
 * changed to redirect to /e-course (which overrides openGraph without an
 * `images` field): the resulting link preview lost the Hazl artwork
 * entirely, even though app/layout.tsx sets it correctly.
 *
 * Every page-level `openGraph` block must spread `...OG_IMAGE_FALLBACK`
 * unless it already builds its own `images` from real content (e.g. an
 * ebook cover or event photo).
 */
export const OG_IMAGE_FALLBACK = {
  images: [{ url: "/og-hazl-skill.png", width: 1200, height: 630, alt: "Hazl Academy" }],
};
