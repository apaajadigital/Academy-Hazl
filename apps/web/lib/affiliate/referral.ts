/**
 * @file lib/affiliate/referral.ts
 * @description Affiliate referral attribution (H3). Affiliate links look like
 *   `https://jagoakademi.com/?ref=<code>`. We capture that code on landing and
 *   persist it until checkout, where it is sent to the API so the commission is
 *   attributed. Without this the entire affiliate earnings loop is dead.
 */

const KEY = "jg_ref";

/** Persist a `?ref=` affiliate code (if present in the given query string). */
export function captureReferral(search: string): void {
  if (typeof window === "undefined") return;
  const ref = new URLSearchParams(search).get("ref");
  if (ref && ref.trim()) {
    localStorage.setItem(KEY, ref.trim());
  }
}

/** Read the stored affiliate referral code, or null if none. */
export function getStoredReferral(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(KEY);
}

/** Clear the stored referral (call after a successful attributed checkout). */
export function clearStoredReferral(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(KEY);
}
