import "dotenv/config";
import { z } from "zod";

/**
 * BL-147 — which payment methods DOKU is allowed to display at checkout.
 *
 * Omitting `payment.payment_method_types` means "show everything", and a sandbox
 * response from the host confirmed everything is 31 methods — including
 * PEER_TO_PEER_KREDIVO / _AKULAKU / _INDODANA / _BRI_CERIA. Those paylater
 * methods have conditional-mandatory fields we do not send (line_items.id, .sku,
 * .category, .url, .image_url, .type, plus customer phone/address/postcode/
 * city/state and shipping/billing_address). A buyer who picks one hits DOKU case
 * code 02 "Invalid Mandatory Field" — AFTER the order row and paymentTransaction
 * have already been created, so we are left holding a pending order for a
 * payment that could never have started.
 *
 * 🖐️ THESE CODES ARE NOT YET CONFIRMED AGAINST THIS MERCHANT ACCOUNT. Only
 * VIRTUAL_ACCOUNT_BCA has positive evidence in our own data (it arrives as
 * `channel.id` on real notifications). The rest are transcribed from DOKU's
 * published non-SNAP method list and MUST be checked against the sandbox before
 * this reaches production — the procedure is in docs/RUNBOOK_DEPLOY.md §7.1.
 * That is exactly what Wave 2.4 (real end-to-end sandbox run) is for. A method
 * the merchant has not enabled is the one failure mode this list can introduce,
 * and it is cheaper to find in sandbox than in production.
 *
 * Set DOKU_PAYMENT_METHOD_TYPES to change the list without a deploy. Unset or
 * empty means this default. The literal value "ALL" — and only that — omits the
 * field and restores DOKU's show-everything behaviour, which reinstates the
 * BL-147 hazard and therefore has to be typed on purpose.
 */
export const DEFAULT_DOKU_PAYMENT_METHOD_TYPES = [
  // Virtual account — the dominant method here, and the only family with
  // first-hand confirmation (BCA).
  "VIRTUAL_ACCOUNT_BCA",
  "VIRTUAL_ACCOUNT_BANK_MANDIRI",
  "VIRTUAL_ACCOUNT_BRI",
  "VIRTUAL_ACCOUNT_BNI",
  "VIRTUAL_ACCOUNT_BANK_PERMATA",
  "VIRTUAL_ACCOUNT_BANK_SYARIAH_MANDIRI",
  "VIRTUAL_ACCOUNT_DOKU",
  // Card. BL-148 shaped invoice_number for this: no symbols, max 30 chars.
  "CREDIT_CARD",
  // E-wallet.
  "EMONEY_OVO",
  "EMONEY_SHOPEEPAY",
  "EMONEY_DANA",
  "QRIS",
] as const;

/** Paylater family. Excluded until the conditional-mandatory fields are sent. */
const PAYLATER_PREFIX = "PEER_TO_PEER_";

/**
 * Explicit opt-out. Needed because "unset" and "empty" must BOTH mean the safe
 * default, not the open one: `docker-compose.vps.yml` writes
 * `${DOKU_PAYMENT_METHOD_TYPES:-}`, which puts an EMPTY STRING in the container
 * env rather than leaving the variable absent. Zod's `.default()` only fires on
 * `undefined`, so treating empty as "show everything" would have silently
 * reinstated all 31 methods — including the paylater ones — on any host that
 * had not set the variable. Going open must be something someone typed.
 */
const SHOW_ALL_SENTINEL = "ALL";

// `z.coerce.boolean()` runs JS `Boolean(str)`, which is true for ANY non-empty
// string — including the literal "false". An env var set to "false" (as every
// .env.example in this repo does) is coerced to `true`, silently flipping
// ENFORCE_EMAIL_VERIFICATION/DOKU_IS_PRODUCTION/COOKIE_SECURE on regardless of
// the value written. Discovered locally: a fresh signup got hard-blocked at
// login with "Email belum diverifikasi" while ENFORCE_EMAIL_VERIFICATION="false"
// in .env. This parses the literal string instead.
const zBooleanString = (defaultValue: boolean) =>
  z
    .string()
    .optional()
    .transform((v) => (v === undefined ? defaultValue : v === "true" || v === "1"));

const paymentMethodTypes = z
  .string()
  .default("")
  .transform((raw) => {
    const trimmed = raw.trim();
    if (trimmed.toUpperCase() === SHOW_ALL_SENTINEL) return [];
    if (trimmed === "") return [...DEFAULT_DOKU_PAYMENT_METHOD_TYPES];
    return trimmed
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
  })
  .superRefine((list, ctx) => {
    for (const code of list) {
      // Shape only — deliberately NOT an allowlist of known DOKU codes. Pinning
      // an enum here would mean asserting a third-party protocol detail from
      // memory (the BL-137 mistake) and would also stop an operator enabling a
      // newly-activated method without a deploy, which is the point of this var.
      if (!/^[A-Z0-9_]+$/.test(code)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `"${code}" is not a DOKU method code (expected UPPER_SNAKE_CASE).`,
        });
      }
      // The one value judgement worth encoding: paylater cannot work with the
      // body we send, so enabling it can only produce case-02 failures on
      // orders we have already written.
      if (code.startsWith(PAYLATER_PREFIX)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message:
            `"${code}" is a paylater method (BL-147). It requires line_items.id/.sku/.category/` +
            `.url/.image_url/.type and customer address fields that dokuService does not send, so ` +
            `a buyer choosing it fails with case code 02 AFTER the order is created. Send those ` +
            `fields first, then allow it.`,
        });
      }
    }
  });

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().default(4000),
  DATABASE_URL: z.string().min(1),
  JWT_SECRET: z.string().min(32),
  JWT_REFRESH_SECRET: z.string().min(32),
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  GOOGLE_CALLBACK_URL: z.string().optional(),
  CORS_ORIGIN: z.string().default("http://localhost:3004"),
  WEB_URL: z.string().default("http://localhost:3004"),
  COOKIE_SECURE: zBooleanString(false),
  MEILISEARCH_URL: z.string().default("http://localhost:7700"),
  MEILISEARCH_KEY: z.string().optional(),
  UPLOAD_DIR: z.string().default("uploads"),
  MAX_FILE_SIZE_MB: z.coerce.number().default(10),
  // Payment (DOKU)
  DOKU_CLIENT_ID: z.string().optional(),
  DOKU_SECRET_KEY: z.string().optional(),
  DOKU_IS_PRODUCTION: zBooleanString(false),
  // Optional explicit base URL; overrides the sandbox/production URL derived
  // from DOKU_IS_PRODUCTION (reconciles docker-compose which sets DOKU_BASE_URL).
  DOKU_BASE_URL: z.string().optional(),
  /** BL-147 — see DEFAULT_DOKU_PAYMENT_METHOD_TYPES above. Empty = that default; "ALL" = show all. */
  DOKU_PAYMENT_METHOD_TYPES: paymentMethodTypes,
  /**
   * BL-145 — replay window for webhook notifications, in seconds.
   *
   * How this number was chosen, because guessing it wrong is expensive in both
   * directions. The clock difference between DOKU and us WAS measured (sandbox,
   * 27 Aug 2026, five samples of the HTTP `Date` header): under 2 seconds. What
   * was NOT measured is DOKU's retry horizon — how long it keeps redelivering a
   * notification that still carries its ORIGINAL `Request-Timestamp`. Measuring
   * that needs a real inbound notification on the host, which is human-gated.
   *
   * So the default is deliberately far wider than any plausible retry horizon
   * rather than a tight window that would reject legitimate redeliveries — and
   * we now cause redeliveries on purpose (BL-142 answers non-2xx). It still ends
   * the "replayable forever" property BL-145 is about, and BL-138's atomic claim
   * means a replay inside the window can no longer revoke a paid order anyway.
   *
   * Tighten it once the real distribution is visible: every notification logs
   * its measured skew (`doku notification timestamp skew`). See BL-150.
   */
  DOKU_WEBHOOK_MAX_AGE_SECONDS: z.coerce.number().int().positive().default(86_400),
  /**
   * How far into the future a notification timestamp may sit before we refuse
   * it. Covers host clock drift, not DOKU behaviour — measured skew was ~1s, so
   * 15 minutes is generous. Kept separate from the age window on purpose: a
   * future-dated timestamp means one of the two clocks is wrong, which is a very
   * different problem from a late redelivery.
   */
  DOKU_WEBHOOK_MAX_FUTURE_SECONDS: z.coerce.number().int().positive().default(900),
  /**
   * BL-144 — how often the payment reconciliation sweep runs, in minutes.
   *
   * 15 is a compromise, not a measurement: short enough that a buyer whose
   * notification was lost is not left staring at "menunggu pembayaran" for an
   * hour, long enough that the sweep is not inquiring against DOKU constantly
   * for orders that will resolve on their own. Every run is capped by
   * RECONCILE_BATCH_SIZE, so the inquiry rate has a hard ceiling either way.
   */
  RECONCILE_INTERVAL_MINUTES: z.coerce.number().int().positive().default(15),
  /** Maximum orders inquired about per sweep — a ceiling on DOKU calls per run. */
  RECONCILE_BATCH_SIZE: z.coerce.number().int().positive().default(100),
  // Email (Resend)
  RESEND_API_KEY: z.string().optional(),
  EMAIL_FROM: z.string().default("noreply@jagoakademi.com"),
  EMAIL_FROM_NAME: z.string().default("Jago Akademi"),
  // WhatsApp (Fonnte)
  FONNTE_TOKEN: z.string().optional(),
  // Redis / BullMQ (TASK-022) — absent = queue disabled, jobs run inline (dev/test)
  REDIS_URL: z.string().optional(),
  // Observability (TASK-023)
  SENTRY_DSN: z.string().optional(),
  LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace"]).optional(),
  APP_VERSION: z.string().optional(),
  // Feature flags
  // Block login for unverified emails. Default OFF — enabling it locks out
  // existing users whose isVerified=false, so flip it only after backfilling.
  ENFORCE_EMAIL_VERIFICATION: zBooleanString(false),
  // Storage (Cloudflare R2) — validated here as the single source of truth for
  // documented config; consumed by the storage layer once object storage lands.
  R2_ACCOUNT_ID: z.string().optional(),
  R2_ACCESS_KEY_ID: z.string().optional(),
  R2_SECRET_ACCESS_KEY: z.string().optional(),
  R2_BUCKET_NAME: z.string().optional(),
  R2_PUBLIC_URL: z.string().optional(),
  // Video (Cloudflare Stream) — optional, same rationale as R2 above.
  CLOUDFLARE_STREAM_ACCOUNT_ID: z.string().optional(),
  CLOUDFLARE_STREAM_TOKEN: z.string().optional(),
}).superRefine((val, ctx) => {
  // Fail closed (H9): the DOKU webhook verifier trusts all requests when the
  // secret is unset. That is only acceptable in dev/test — in production a
  // missing secret would let anyone forge "paid" webhooks, so require it.
  if (val.NODE_ENV === "production" && !val.DOKU_SECRET_KEY) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["DOKU_SECRET_KEY"],
      message: "DOKU_SECRET_KEY is required in production (webhook signature verification).",
    });
  }
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  const issues = parsed.error.issues
    .map((i) => `  ${i.path.join(".")}: ${i.message}`)
    .join("\n");
  throw new Error(`[env] Invalid environment variables:\n${issues}`);
}

export const env = parsed.data;
