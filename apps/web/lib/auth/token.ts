/**
 * @file lib/auth/token.ts
 * @description Centralized auth token utility — single source of truth for
 *   all token read/write/refresh operations across the entire web app.
 *
 * Storage strategy:
 *   - sessionStorage["access_token"]  → primary read/write (current tab)
 *   - localStorage["jg_access_token"] → cross-tab persistence (survives reload)
 *   - sessionStorage["jg_token"]      → legacy key (read-only backward compat)
 *
 * Refresh token is managed as an HttpOnly cookie (jg_refresh) by the backend.
 * We never touch it directly — the browser sends it automatically on
 * POST /api/auth/refresh with credentials: "include".
 */

// ─── Storage keys ─────────────────────────────────────────────────────────────

const KEY_SESSION = "access_token";      // primary sessionStorage key
const KEY_LOCAL   = "jg_access_token";   // localStorage cross-tab key
const KEY_LEGACY  = "jg_token";          // legacy key — read only

// ─── getToken ─────────────────────────────────────────────────────────────────

/**
 * Read the current access token from any available storage.
 * Priority: sessionStorage (primary) → localStorage (cross-tab) → legacy key.
 * Returns null if no token found or running on server.
 */
export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return (
    sessionStorage.getItem(KEY_SESSION) ||
    localStorage.getItem(KEY_LOCAL)     ||
    sessionStorage.getItem(KEY_LEGACY)  ||
    null
  );
}

// ─── setToken ─────────────────────────────────────────────────────────────────

/**
 * Persist a new access token to all storage locations.
 * Call this after a successful login or token refresh.
 */
export function setToken(token: string): void {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(KEY_SESSION, token);
  localStorage.setItem(KEY_LOCAL, token);
}

// ─── clearToken ───────────────────────────────────────────────────────────────

/**
 * Remove the access token from all storage locations.
 * Call this on logout or when a refresh attempt fails.
 */
export function clearToken(): void {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(KEY_SESSION);
  sessionStorage.removeItem(KEY_LEGACY);
  localStorage.removeItem(KEY_LOCAL);
}

// ─── isTokenExpired ───────────────────────────────────────────────────────────

/**
 * Decode a JWT (without verification) and check if it is expired.
 * Returns true if the token is expired or unparseable.
 * @param token  Raw JWT string
 * @param bufferMs  Extra buffer in ms to treat a token as expired early (default 60s)
 */
export function isTokenExpired(token: string, bufferMs = 60_000): boolean {
  try {
    const [, payloadB64] = token.split(".");
    if (!payloadB64) return true;
    const payload = JSON.parse(atob(payloadB64.replace(/-/g, "+").replace(/_/g, "/")));
    const exp: number | undefined = payload.exp;
    if (!exp) return false; // no expiry claim → treat as non-expiring
    return Date.now() >= exp * 1000 - bufferMs;
  } catch {
    return true; // unparseable → treat as expired
  }
}

// ─── refreshAccessToken ───────────────────────────────────────────────────────

/**
 * Request a new access token from the backend using the HttpOnly refresh-token
 * cookie (jg_rt). The browser sends the cookie automatically via credentials: "include".
 *
 * On success: stores the new token and returns it.
 * On failure: clears stored token and returns null.
 */
export async function refreshAccessToken(): Promise<string | null> {
  try {
    const res = await fetch("/api/auth/refresh", {
      method: "POST",
      credentials: "include", // sends jg_rt HttpOnly cookie automatically
      headers: { "Content-Type": "application/json" },
    });

    if (!res.ok) {
      clearToken();
      return null;
    }

    const body = (await res.json()) as { success: boolean; data?: { accessToken: string } };
    if (body.success && body.data?.accessToken) {
      setToken(body.data.accessToken);
      return body.data.accessToken;
    }

    clearToken();
    return null;
  } catch {
    // Network error — do not clear token (user might just be offline)
    return null;
  }
}

// ─── getValidToken ────────────────────────────────────────────────────────────

/**
 * Returns a valid (non-expired) access token, automatically refreshing if needed.
 *
 * Usage pattern:
 *   const token = await getValidToken();
 *   if (!token) { router.replace("/masuk"); return; }
 *   fetch("/api/...", { headers: { Authorization: `Bearer ${token}` } });
 *
 * Returns null if no token exists or refresh fails → caller should redirect to /masuk.
 */
export async function getValidToken(): Promise<string | null> {
  const token = getToken();

  // No token at all
  if (!token) return null;

  // Token still valid
  if (!isTokenExpired(token)) return token;

  // Token expired — attempt refresh
  const refreshed = await refreshAccessToken();
  return refreshed;
}
