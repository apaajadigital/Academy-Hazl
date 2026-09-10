import { describe, expect, it, vi } from "vitest";

/**
 * BL-167 — the /uploads rewrite must exist and must point AWAY from the web app.
 *
 * The bug this pins: uploaded files live in a volume mounted into `api` and
 * `worker` but not into `web`. Host nginx routes /uploads/* to the api
 * container, so hitting the URL directly returns 200 and everything looks fine
 * from outside. The image optimizer is what breaks — it runs inside the web
 * container and resolves a local `src` against its own server, so
 * `<Image src="/uploads/x.png">` made web fetch itself, get 404, and answer the
 * browser `400 "url" parameter is not allowed`. Measured in production on
 * 10 Sep 2026: /ebook/Cara-Kaya rendered its cover through /_next/image and got
 * 400 — a blank cover on a published page.
 *
 * Asserting on the config rather than on a running server is deliberate: for
 * `output: "standalone"` rewrites are evaluated at BUILD time and baked into
 * routes-manifest.json, so a wrong destination cannot be fixed by restarting a
 * container. Catching it here means catching it before the image is built.
 */
describe("next.config rewrites", () => {
  const load = async (env: Record<string, string | undefined>) => {
    const saved = { ...process.env };
    Object.assign(process.env, env);
    // The proxy target is resolved once at module scope (next.config.js:104), so
    // the module cache has to be dropped between cases or every case would read
    // the first one's environment. A query-string cache-buster cannot be used
    // here: Vite refuses to analyse a dynamic import whose path is a template.
    vi.resetModules();
    const mod = await import("../../next.config.js");
    const config = (mod.default ?? mod) as { rewrites: () => Promise<unknown> };
    const rewrites = await config.rewrites();
    Object.assign(process.env, saved);
    return rewrites as Array<{ source: string; destination: string }>;
  };

  it("proxies /uploads/* to the api origin, not to itself", async () => {
    const rules = await load({ API_PROXY_TARGET: "http://api:4000" });
    const uploads = rules.find((r) => r.source === "/uploads/:path*");

    expect(uploads, "the /uploads rewrite is missing — next/image will 400 on every uploaded file").toBeDefined();
    expect(uploads!.destination).toBe("http://api:4000/uploads/:path*");
  });

  it("never lets the uploads destination collapse onto its own source", async () => {
    // An empty proxy target is the failure that produced BL-56/BL-33-style
    // self-referential rewrites before: destination === source is an infinite
    // loop, not a proxy. The fallback must keep it absolute.
    for (const env of [
      { API_PROXY_TARGET: "", NEXT_PUBLIC_API_URL: "" },
      { API_PROXY_TARGET: "not-a-url", NEXT_PUBLIC_API_URL: "" },
      { API_PROXY_TARGET: "/uploads", NEXT_PUBLIC_API_URL: "" },
    ]) {
      const rules = await load(env);
      const uploads = rules.find((r) => r.source === "/uploads/:path*");
      expect(uploads!.destination).not.toBe(uploads!.source);
      expect(uploads!.destination).toMatch(/^https?:\/\//);
    }
  });

  it("keeps the existing /api rewrite intact", async () => {
    const rules = await load({ API_PROXY_TARGET: "http://api:4000" });
    const api = rules.find((r) => r.source === "/api/:path*");
    expect(api?.destination).toBe("http://api:4000/api/:path*");
  });
});

/**
 * BL-159 — AVIF must stay off while the remotePatterns wildcard is still there.
 *
 * These two settings are only dangerous together: `{ https, "**" }` lets any
 * unauthenticated request name a host, and `formats` decides which decoders that
 * attacker-controlled bytes reach. Two AVIF/libheif RCEs hit this chain in 2026
 * (BL-158), so until the wildcard goes, AVIF stays out.
 *
 * Pinned as a test rather than a comment because the failure is invisible: adding
 * "image/avif" back would look like a harmless performance win in review.
 */
describe("next.config images (BL-159)", () => {
  it("does not serve AVIF while remotePatterns still allows any host", async () => {
    const { default: config } = (await import("../../next.config.js")) as unknown as {
      default: { images: { formats: string[]; remotePatterns: Array<{ hostname: string }> } };
    };
    const wildcard = config.images.remotePatterns.some((p) => p.hostname === "**");
    if (wildcard) {
      expect(
        config.images.formats,
        "remotePatterns still has the `**` wildcard, so AVIF must stay off (BL-159)",
      ).not.toContain("image/avif");
    }
    // WebP stays — dropping both would ship the originals and undo the whole point.
    expect(config.images.formats).toContain("image/webp");
  });
});
