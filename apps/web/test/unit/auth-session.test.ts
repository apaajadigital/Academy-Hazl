import { describe, it, expect, afterEach, vi } from "vitest";

/**
 * Regression coverage for the Navbar "asked to log in again" bug.
 *
 * Root cause: Navbar (and several other pages) used to read the access token
 * via the plain, non-refreshing getToken() to decide what to render. Once the
 * 15-minute access token expired mid-visit, that read silently reported
 * "logged out" even though the session was still recoverable via the httpOnly
 * refresh cookie — which is exactly what getValidToken() does. fetchAuthSession()
 * is the shared replacement; these tests pin down that it is built on the
 * refresh-aware primitive, not the bare one, and behaves correctly at both ends.
 */

vi.mock("@/lib/auth/token", () => ({
  getValidToken: vi.fn(),
}));

describe("fetchAuthSession", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    vi.resetModules();
  });

  it("reports logged-in using a token recovered via refresh, not just a live one", async () => {
    // Simulates the exact bug scenario: the stored access token had expired,
    // but getValidToken() transparently refreshed it via the httpOnly cookie
    // and resolved a fresh token anyway — the caller must not care which case
    // it was.
    const { getValidToken } = await import("@/lib/auth/token");
    vi.mocked(getValidToken).mockResolvedValue("refreshed.jwt.token");
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        json: () => Promise.resolve({ success: true, data: { name: "Budi Santoso" } }),
      }),
    );

    const { fetchAuthSession } = await import("@/lib/auth/session");
    const result = await fetchAuthSession();

    expect(result).toEqual({ isLoggedIn: true, user: { name: "Budi Santoso" } });
    expect(fetch).toHaveBeenCalledWith(
      "/api/auth/me",
      expect.objectContaining({ headers: { Authorization: "Bearer refreshed.jwt.token" } }),
    );
  });

  it("reports logged-out when no token exists and refresh fails, without throwing", async () => {
    const { getValidToken } = await import("@/lib/auth/token");
    vi.mocked(getValidToken).mockResolvedValue(null);
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);

    const { fetchAuthSession } = await import("@/lib/auth/session");
    const result = await fetchAuthSession();

    expect(result).toEqual({ isLoggedIn: false, user: null });
    // No token → never even attempts /api/auth/me.
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("reports logged-out (not a rejection) when /api/auth/me is unreachable", async () => {
    const { getValidToken } = await import("@/lib/auth/token");
    vi.mocked(getValidToken).mockResolvedValue("some.jwt.token");
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network down")));

    const { fetchAuthSession } = await import("@/lib/auth/session");
    await expect(fetchAuthSession()).resolves.toEqual({ isLoggedIn: false, user: null });
  });

  it("reports logged-out when the API rejects the (refreshed) token", async () => {
    const { getValidToken } = await import("@/lib/auth/token");
    vi.mocked(getValidToken).mockResolvedValue("some.jwt.token");
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ json: () => Promise.resolve({ success: false }) }),
    );

    const { fetchAuthSession } = await import("@/lib/auth/session");
    await expect(fetchAuthSession()).resolves.toEqual({ isLoggedIn: false, user: null });
  });
});
