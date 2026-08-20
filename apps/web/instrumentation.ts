/**
 * Next.js server-side instrumentation hook (BL-17).
 *
 * Runs once per server runtime before any request is handled. The runtime check
 * matters: the edge bundle cannot load the Node SDK (no `node:` builtins), so
 * each runtime gets its own Sentry config module.
 *
 * The browser half lives in `instrumentation-client.ts`, not here.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("./sentry.server.config");
  }
  if (process.env.NEXT_RUNTIME === "edge") {
    await import("./sentry.edge.config");
  }
}

// Surfaces server-side React render errors (Server Components, route handlers)
// to Sentry. Without it those errors are logged by Next.js and dropped.
export { captureRequestError as onRequestError } from "@sentry/nextjs";
