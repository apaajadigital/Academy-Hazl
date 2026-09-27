/**
 * Canonical API base URL (BL-75).
 *
 * Uses `||` instead of `??` on purpose: deploy tooling (compose/CI) passes
 * `""` (empty string) when NEXT_PUBLIC_API_URL is unset. `??` lets the empty
 * string through, producing relative URLs that throw in server-side fetch.
 * `||` treats empty-as-unset and falls back to localhost.
 */
export const API_BASE = process.env.NEXT_PUBLIC_API_URL || process.env.API_PROXY_TARGET || "http://localhost:4010";

/**
 * Returns the API base URL appropriate for the current environment.
 * - On the SERVER (SSR): uses absolute URL to backend (e.g., http://localhost:4010)
 * - On the BROWSER (client): returns "" (empty string) so requests are relative (/api/*)
 *   and go through the Next.js proxy rewrite to avoid CORS issues.
 */
export function getApiBase(): string {
  if (typeof window === "undefined") {
    return process.env.NEXT_PUBLIC_API_URL || process.env.API_PROXY_TARGET || "http://localhost:4010";
  }
  // Client-side: use relative path, goes through Next.js /api/* proxy
  return "";
}
