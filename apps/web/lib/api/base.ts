/**
 * Canonical API base URL (BL-75).
 *
 * Uses `||` instead of `??` on purpose: deploy tooling (compose/CI) passes
 * `""` (empty string) when NEXT_PUBLIC_API_URL is unset. `??` lets the empty
 * string through, producing relative URLs that throw in server-side fetch.
 * `||` treats empty-as-unset and falls back to localhost.
 */
export const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

/**
 * Returns the API base URL appropriate for the current environment.
 * - On the SERVER (SSR): uses absolute URL to backend (e.g., http://localhost:4000)
 * - On the BROWSER (client): returns "" (empty string) so requests are relative (/api/*)
 *   and go through the Next.js proxy rewrite to avoid CORS issues.
 */
export function getApiBase(): string {
  if (typeof window === "undefined") {
    // Server-side: use absolute URL. `||` not `??` — see API_BASE comment (BL-75):
    // an empty-string env var must fall back too, or SSR fetch gets a relative URL.
    return process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
  }
  // Client-side: use relative path, goes through Next.js /api/* proxy
  return "";
}
