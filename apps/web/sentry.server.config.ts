/**
 * Node.js runtime Sentry configuration (BL-17). Loaded by `instrumentation.ts`.
 *
 * Server-only DSN — no NEXT_PUBLIC_ prefix, so it is never inlined into the
 * client bundle.
 */
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  tracesSampleRate: 0.1,
  debug: false,
});
