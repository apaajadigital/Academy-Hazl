/**
 * @file lib/auth/session.ts
 * @description Shared, refresh-aware "who is signed in" check for UI chrome
 *   (nav bars, header widgets) that only needs to know whether *someone* is
 *   logged in — not gate a protected page or route.
 *
 * Split out from getValidToken()/token.ts as a plain async function (not a
 * hook) so it can be unit-tested without a DOM/React renderer, and reused by
 * both the client hook (useAuthSession) and any future non-React caller.
 *
 * Why this exists: components used to read the token directly via the bare,
 * non-refreshing getToken() to decide what to render. That silently reports
 * "logged out" once the 15-minute access token expires, even though the
 * session is still valid and getValidToken() would recover it via the
 * httpOnly refresh cookie. Navbar.tsx was the highest-visibility instance of
 * this — present on every page, including the moment a user clicks into a
 * course after having browsed long enough for the token to expire.
 */

import { getValidToken } from "./token";

export interface AuthSessionUser {
  name: string;
}

export interface AuthSessionResult {
  isLoggedIn: boolean;
  user: AuthSessionUser | null;
}

const LOGGED_OUT: AuthSessionResult = { isLoggedIn: false, user: null };

/**
 * Resolve the current login state via the refresh-aware token read. Never
 * throws — a network error or a failed refresh both resolve to "logged out"
 * rather than rejecting, since chrome UI has no error state to show for this.
 */
export async function fetchAuthSession(): Promise<AuthSessionResult> {
  const token = await getValidToken();
  if (!token) return LOGGED_OUT;

  try {
    const res = await fetch("/api/auth/me", { headers: { Authorization: `Bearer ${token}` } });
    const body = await res.json();
    if (!body.success) return LOGGED_OUT;
    const name: string = body.data?.name ?? "";
    return { isLoggedIn: true, user: { name } };
  } catch {
    return LOGGED_OUT;
  }
}
