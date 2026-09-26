import { env } from "./config/env.js";

/**
 * Sentry initialization (TASK-023). Imported FIRST in index.ts (before app.js) so
 * auto-instrumentation wraps the app. No-op when SENTRY_DSN is unset (dev/test).
 * Uses dynamic import so the app doesn't crash if @sentry/node is not installed.
 */
if (env.SENTRY_DSN) {
  try {
    const Sentry = await import("@sentry/node");
    Sentry.init({
      dsn: env.SENTRY_DSN,
      environment: env.NODE_ENV,
      release: env.APP_VERSION,
      tracesSampleRate: env.NODE_ENV === "production" ? 0.2 : 1.0,
    });
  } catch {
    console.warn("Sentry not available, skipping initialization.");
  }
}
