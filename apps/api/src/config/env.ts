import "dotenv/config";
import { z } from "zod";

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
  COOKIE_SECURE: z.coerce.boolean().default(false),
  MEILISEARCH_URL: z.string().default("http://localhost:7700"),
  MEILISEARCH_KEY: z.string().optional(),
  UPLOAD_DIR: z.string().default("uploads"),
  MAX_FILE_SIZE_MB: z.coerce.number().default(10),
  // Payment (DOKU)
  DOKU_CLIENT_ID: z.string().optional(),
  DOKU_SECRET_KEY: z.string().optional(),
  DOKU_IS_PRODUCTION: z.coerce.boolean().default(false),
  // Optional explicit base URL; overrides the sandbox/production URL derived
  // from DOKU_IS_PRODUCTION (reconciles docker-compose which sets DOKU_BASE_URL).
  DOKU_BASE_URL: z.string().optional(),
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
  ENFORCE_EMAIL_VERIFICATION: z.coerce.boolean().default(false),
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
