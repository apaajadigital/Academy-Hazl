/**
 * Browser-side Sentry configuration (BL-17).
 *
 * NOTE: this file is NOT auto-loaded on this project. Next.js 16 builds with
 * Turbopack, and @sentry/nextjs only injects `sentry.client.config.*` through
 * its webpack entrypoint hook — under Turbopack it reads `instrumentation-client.ts`
 * instead. That file imports this module, so the init below is what actually runs.
 *
 * `dsn` is deliberately allowed to be undefined: Sentry.init() then disables the
 * SDK entirely, which is the wanted behaviour in dev/test and in any deploy that
 * has not been given a DSN yet.
 */
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 0.1,
  debug: false,
});
