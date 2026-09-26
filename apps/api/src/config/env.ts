import "dotenv/config";
import { z } from "zod";

// `z.coerce.boolean()` runs JS `Boolean(str)`, which is true for ANY non-empty
// string — including the literal "false". An env var set to "false" (as every
// .env.example in this repo does) is coerced to `true`, silently flipping
// ENFORCE_EMAIL_VERIFICATION/DUITKU_IS_PRODUCTION/COOKIE_SECURE on regardless of
// the value written. Discovered locally: a fresh signup got hard-blocked at
// login with "Email belum diverifikasi" while ENFORCE_EMAIL_VERIFICATION="false"
// in .env. This parses the literal string instead.
const zBooleanString = (defaultValue: boolean) =>
  z
    .string()
    .optional()
    .transform((v) => (v === undefined ? defaultValue : v === "true" || v === "1"));

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
  // Payment (Duitku) — replaces DOKU (see docs/BACKLOG.md for the migration note).
  // Only Virtual Account BCA ("BC") is wired for this first version; a proper
  // payment-method picker is future work, so there is no method-list/validator
  // machinery here the way DOKU's DOKU_PAYMENT_METHOD_TYPES needed one.
  DUITKU_MERCHANT_CODE: z.string().optional(),
  DUITKU_API_KEY: z.string().optional(),
  DUITKU_IS_PRODUCTION: zBooleanString(false),
  // Optional explicit base URL; overrides the sandbox/production URL derived
  // from DUITKU_IS_PRODUCTION. Default host resolution lives in duitkuService.ts
  // and always falls back to the SANDBOX host when unset — never production —
  // so a misconfigured deploy fails safe instead of silently going live.
  DUITKU_BASE_URL: z.string().optional(),
  /**
   * BL-144-equivalent — how often the payment reconciliation sweep runs, in
   * minutes. Gateway-neutral name kept as-is from the DOKU era. 15 is a
   * compromise, not a measurement: short enough that a buyer whose callback was
   * lost is not left staring at "menunggu pembayaran" for an hour, long enough
   * that the sweep is not inquiring against Duitku constantly for orders that
   * will resolve on their own. Every run is capped by RECONCILE_BATCH_SIZE.
   */
  RECONCILE_INTERVAL_MINUTES: z.coerce.number().int().positive().default(15),
  /** Maximum orders inquired about per sweep — a ceiling on gateway calls per run. */
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
  // Fail closed (H9): the Duitku callback verifier trusts all requests when the
  // API key is unset. That is only acceptable in dev/test — in production a
  // missing key would let anyone forge "paid" callbacks, so require it.
  if (val.NODE_ENV === "production" && !val.DUITKU_API_KEY) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["DUITKU_API_KEY"],
      message: "DUITKU_API_KEY is required in production (callback signature verification).",
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
