/**
 * Site-wide contact configuration (BL-45).
 *
 * WHY THIS IS FAIL-CLOSED — production incident found 10 Aug 2026
 * ---------------------------------------------------------------
 * Every WhatsApp CTA on the live site pointed at `https://wa.me/` with no
 * number, and /contact rendered the phone number as a bare "+". The chain:
 *
 *   host .env defines      WA_NUMBER
 *   docker-compose asks    NEXT_PUBLIC_WA_NUMBER:-        → ""
 *   this file used         process.env.NEXT_PUBLIC_WA_NUMBER ?? "628..."
 *
 * `??` only falls back on null/undefined, so the empty string sailed through
 * and became the "configured" number. An empty string is not configuration —
 * it is the absence of configuration wearing a costume.
 *
 * So: the number is validated, and everything downstream is `string | null`.
 * That type is the enforcement mechanism — TypeScript makes every call site
 * decide what to show when WhatsApp is unavailable, instead of silently
 * rendering a dead link. There is deliberately NO hard-coded fallback number:
 * the business number is owner-confirmed data, not something this file may
 * invent.
 */

/**
 * Normalise a raw env value into WhatsApp's wa.me form: digits only, no "+",
 * spaces, or dashes. Returns null when the value cannot be a real number.
 *
 * Accepted: "6281234567890", "+62 812-3456-7890", " 6281234567890 ".
 * Rejected: undefined, "", "   ", "abc", "+62-abc", and anything whose digit
 * count falls outside the E.164-ish 8–15 range.
 */
export function normalizeWaNumber(raw: string | undefined | null): string | null {
  if (typeof raw !== "string") return null;

  const trimmed = raw.trim();
  if (trimmed === "") return null;

  // Strip only the separators a human might type. Anything else left over
  // (letters, punctuation) means the value is not a phone number at all.
  const stripped = trimmed.replace(/^\+/, "").replace(/[\s()-]/g, "");
  if (!/^\d+$/.test(stripped)) return null;

  // 8 digits is shorter than any valid international number; 15 is the E.164
  // maximum. Outside that range the value is a typo, not a number.
  if (stripped.length < 8 || stripped.length > 15) return null;

  return stripped;
}

/**
 * Business WhatsApp number, or null when not configured/invalid.
 * Build-time value: Next.js inlines NEXT_PUBLIC_* into the client bundle.
 */
export const WA_NUMBER: string | null = normalizeWaNumber(process.env.NEXT_PUBLIC_WA_NUMBER);

/** True when a usable WhatsApp number exists. Use to decide whether to render a CTA. */
export const WA_AVAILABLE: boolean = WA_NUMBER !== null;

/**
 * Human-readable form, e.g. "+62 852-8342-3737". Null when unavailable — never
 * a bare "+", which is what the old formatter produced from an empty number.
 */
export const WA_NUMBER_DISPLAY: string | null =
  WA_NUMBER === null
    ? null
    : WA_NUMBER.startsWith("62") && /^\d{10,15}$/.test(WA_NUMBER)
      ? `+62 ${WA_NUMBER.slice(2).replace(/^(\d{3})(\d{4})(\d+)$/, "$1-$2-$3")}`
      : `+${WA_NUMBER}`;

/**
 * WhatsApp chat deep link, optionally with a prefilled message.
 * Returns null when no number is configured — callers must hide or disable the
 * CTA rather than render a link that goes nowhere.
 */
export function waLink(text?: string): string | null {
  if (WA_NUMBER === null) return null;
  const base = `https://wa.me/${WA_NUMBER}`;
  return text ? `${base}?text=${encodeURIComponent(text)}` : base;
}

/** Honest fallback when WhatsApp is unavailable. */
export const CONTACT_FALLBACK_HREF = "/contact";
