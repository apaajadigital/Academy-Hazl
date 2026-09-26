import { describe, it, expect, vi } from "vitest";
import {
  submitWaitlist,
  NETWORK_FAILURE_MESSAGE,
  GENERIC_FAILURE_MESSAGE,
} from "@/lib/early-access/submit";

/**
 * The four outcomes the Early Access form must distinguish.
 *
 * The regression these guard: the handler's `catch` used to `setSubmitted(true)`
 * "to avoid drop-off", so a failed request produced "Pendaftaran Berhasil!" and
 * a promise of a coupon that could never arrive. Only case 1 below may ever
 * return `ok: true`.
 */

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("submitWaitlist", () => {
  const payload = { name: "Uji", email: "uji@example.com", source: "early-access-page" };

  // ── 1. Success ─────────────────────────────────────────────────────────────
  it("returns ok on 200", async () => {
    const f = vi.fn().mockResolvedValue(jsonResponse(200, { success: true, data: {} }));
    await expect(submitWaitlist(payload, f as never)).resolves.toEqual({ ok: true });
  });

  it("returns ok on 201", async () => {
    const f = vi.fn().mockResolvedValue(jsonResponse(201, { success: true, data: {} }));
    await expect(submitWaitlist(payload, f as never)).resolves.toEqual({ ok: true });
  });

  it("posts the payload to /api/waitlist as JSON", async () => {
    const f = vi.fn().mockResolvedValue(jsonResponse(201, {}));
    await submitWaitlist(payload, f as never);
    expect(f).toHaveBeenCalledWith(
      "/api/waitlist",
      expect.objectContaining({ method: "POST", body: JSON.stringify(payload) }),
    );
  });

  // ── 2. Reject (network / offline / DNS) ────────────────────────────────────
  it("returns a failure when fetch rejects — NEVER ok", async () => {
    const f = vi.fn().mockRejectedValue(new TypeError("Failed to fetch"));
    const r = await submitWaitlist(payload, f as never);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.message).toBe(NETWORK_FAILURE_MESSAGE);
  });

  it("says explicitly that nothing was saved on a network failure", async () => {
    const f = vi.fn().mockRejectedValue(new Error("network down"));
    const r = await submitWaitlist(payload, f as never);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.message).toMatch(/belum tersimpan/i);
  });

  // ── 3. Non-2xx ─────────────────────────────────────────────────────────────
  it("surfaces the server message on 400", async () => {
    const f = vi.fn().mockResolvedValue(
      jsonResponse(400, { success: false, error: { code: "VALIDATION_ERROR", message: "Email sudah terdaftar." } }),
    );
    const r = await submitWaitlist(payload, f as never);
    expect(r).toEqual({ ok: false, message: "Email sudah terdaftar." });
  });

  it("falls back to a generic message when the error body has none", async () => {
    const f = vi.fn().mockResolvedValue(jsonResponse(500, {}));
    const r = await submitWaitlist(payload, f as never);
    expect(r).toEqual({ ok: false, message: GENERIC_FAILURE_MESSAGE });
  });

  it("does not treat a non-JSON error body as success", async () => {
    const f = vi.fn().mockResolvedValue(new Response("<html>502</html>", { status: 502 }));
    const r = await submitWaitlist(payload, f as never);
    expect(r.ok).toBe(false);
  });

  it("never returns ok for any 4xx or 5xx status", async () => {
    for (const status of [400, 401, 403, 404, 409, 422, 429, 500, 502, 503]) {
      const f = vi.fn().mockResolvedValue(jsonResponse(status, {}));
      const r = await submitWaitlist(payload, f as never);
      expect(r.ok, `status ${status} must not be ok`).toBe(false);
    }
  });

  // ── 4. Timeout / abort ─────────────────────────────────────────────────────
  it("returns a failure when the request aborts (timeout)", async () => {
    const f = vi.fn().mockRejectedValue(new DOMException("The operation was aborted.", "AbortError"));
    const r = await submitWaitlist(payload, f as never);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.message).toBe(NETWORK_FAILURE_MESSAGE);
  });

  it("returns a failure when the request never settles before rejecting", async () => {
    const f = vi.fn().mockImplementation(
      () => new Promise((_, reject) => setTimeout(() => reject(new Error("timeout")), 5)),
    );
    const r = await submitWaitlist(payload, f as never);
    expect(r.ok).toBe(false);
  });
});
