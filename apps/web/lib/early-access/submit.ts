/**
 * Waitlist submission, extracted from the page component so the four outcomes
 * that matter can be unit-tested without a DOM.
 *
 * WHY THIS EXISTS
 * The handler used to do this inside its `catch`:
 *
 *     setSubmitted(true);   // "Fallback: mark as success to avoid drop-off"
 *
 * so a network failure rendered "Pendaftaran Berhasil!" plus a promise of an
 * Early Bird coupon and a webinar invitation — while nothing had been stored.
 * The rule encoded here is blunt on purpose: **only a successful response is a
 * success.** Everything else is a failure the visitor is told about.
 */

export type WaitlistPayload = { name: string; email: string; source: string };

export type WaitlistResult =
  | { ok: true }
  | { ok: false; message: string };

/** Shown when the request never reached a verdict (offline, DNS, timeout, abort). */
export const NETWORK_FAILURE_MESSAGE =
  "Koneksi ke server gagal. Pendaftaran Anda belum tersimpan — silakan coba lagi.";

/** Shown when the server answered with an error but gave no usable message. */
export const GENERIC_FAILURE_MESSAGE = "Terjadi kesalahan. Silakan coba lagi.";

export async function submitWaitlist(
  payload: WaitlistPayload,
  fetchImpl: typeof fetch = fetch,
): Promise<WaitlistResult> {
  let res: Response;
  try {
    res = await fetchImpl("/api/waitlist", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  } catch {
    // Rejection = no verdict from the server. Never optimistic here.
    return { ok: false, message: NETWORK_FAILURE_MESSAGE };
  }

  if (res.ok) return { ok: true };

  // Prefer the server's own wording; fall back only when it gives us nothing.
  const data = (await res.json().catch(() => ({}))) as { error?: { message?: string } };
  return { ok: false, message: data.error?.message ?? GENERIC_FAILURE_MESSAGE };
}
