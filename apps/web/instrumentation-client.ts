/**
 * Browser instrumentation entrypoint (BL-17).
 *
 * Next.js 16 builds with Turbopack, and @sentry/nextjs only reads
 * `instrumentation-client.ts` on that path — `sentry.client.config.ts` is wired
 * up exclusively by the legacy webpack entrypoint hook. Importing the config
 * module here keeps a single Sentry.init() while making it actually run.
 */
import "./sentry.client.config";

// Starts a navigation span on App Router client transitions. Required as an
// explicit export since Next.js 15.3; without it client-side route changes are
// invisible in tracing.
export { captureRouterTransitionStart as onRouterTransitionStart } from "@sentry/nextjs";
