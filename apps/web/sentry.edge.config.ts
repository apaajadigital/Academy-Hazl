/**
 * Edge runtime Sentry configuration (BL-17). Loaded by `instrumentation.ts`.
 *
 * Kept separate from the Node config because the edge bundle cannot pull in the
 * Node SDK's `node:` builtins.
 */
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  tracesSampleRate: 0.1,
  debug: false,
});
