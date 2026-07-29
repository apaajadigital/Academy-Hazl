/** @type {import('next').NextConfig} */
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));

// Origin the /api/* rewrite proxies to. In a split web/api deployment (Docker
// compose, separate hosts) the backend is NOT on the web container's localhost,
// so a hardcoded target silently breaks every proxied call. NEXT_PUBLIC_API_URL
// is reused because it is already the declared deploy-time API origin
// (turbo.json globalEnv + apps/web/Dockerfile ARG); the localhost fallback keeps
// `npm run dev` working with zero configuration.
//
// ⚠️ OPS: `rewrites()` is evaluated at BUILD TIME for `output: "standalone"` —
// the destination is baked as a literal into .next/routes-manifest.json and
// .next/standalone/apps/web/server.js. Changing `environment:` in
// docker-compose.*.yml and restarting the container does NOT change the proxy
// target. The value only moves when the image is REBUILT with the build-arg
// (apps/web/Dockerfile `ARG NEXT_PUBLIC_API_URL`, wired from compose
// `build.args` / the deploy workflow's `build-args`).
const API_PROXY_FALLBACK = "http://localhost:4000";

/**
 * Resolve the /api/* proxy target, refusing any value that would make the
 * rewrite point back at the web app itself (source === destination → the
 * request re-enters this same rewrite forever and exhausts the connection pool).
 */
function resolveApiProxyTarget() {
  // `||`, not `??`: both deploy paths hand Next.js an EMPTY STRING when the
  // variable is unset — docker-compose.prod.yml / docker-compose.vps.yml pass
  // `NEXT_PUBLIC_API_URL: ${NEXT_PUBLIC_API_URL}` and .github/workflows/deploy.yml
  // passes `NEXT_PUBLIC_API_URL=${{ vars.NEXT_PUBLIC_API_URL }}`. `??` only
  // falls back on null/undefined, so "" survived and collapsed the destination
  // to "/api/:path*", byte-identical to the source.
  const raw = (process.env.NEXT_PUBLIC_API_URL || "").trim().replace(/\/+$/, "");
  if (!raw) {
    return {
      target: API_PROXY_FALLBACK,
      // `next dev` is meant to run with no NEXT_PUBLIC_API_URL at all, so the
      // empty case only warns on a production build — where an empty value is a
      // misconfigured deploy rather than the documented zero-config default.
      warning:
        process.env.NODE_ENV === "production" ? "NEXT_PUBLIC_API_URL is empty or unset" : "",
    };
  }

  let parsed;
  try {
    parsed = new URL(raw);
  } catch {
    // A relative value ("/api", "api.example.com") yields a destination that is
    // either self-referential or not a valid proxy origin at all.
    return {
      target: API_PROXY_FALLBACK,
      warning: `NEXT_PUBLIC_API_URL="${raw}" is not an absolute http(s) URL`,
    };
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return {
      target: API_PROXY_FALLBACK,
      warning: `NEXT_PUBLIC_API_URL="${raw}" must use http: or https:`,
    };
  }

  // Self-proxy guard. docs/RUNBOOK_DEPLOY_RELEASE_JUL2026.md currently documents
  // NEXT_PUBLIC_API_URL=https://jagoakademi.com — the WEB origin, not the API
  // origin — which routes /api/* back through nginx into this very container.
  const siteRaw = (process.env.NEXT_PUBLIC_SITE_URL || "").trim().replace(/\/+$/, "");
  if (siteRaw) {
    try {
      if (new URL(siteRaw).origin === parsed.origin) {
        return {
          target: API_PROXY_FALLBACK,
          warning: `NEXT_PUBLIC_API_URL (${parsed.origin}) equals the web origin NEXT_PUBLIC_SITE_URL (${siteRaw})`,
        };
      }
    } catch {
      // An unparseable NEXT_PUBLIC_SITE_URL cannot prove a loop; keep the target.
    }
  }

  return { target: raw, warning: "" };
}

const { target: apiProxyTarget, warning: apiProxyWarning } = resolveApiProxyTarget();

if (apiProxyWarning) {
  // Emitted once per build (module scope) so a misconfigured deploy is visible
  // in the image build log instead of surfacing as a production request loop.
  console.warn(
    `[next.config] /api/* proxy target rejected (would be self-referential): ${apiProxyWarning}. ` +
      `Falling back to ${API_PROXY_FALLBACK}. Set NEXT_PUBLIC_API_URL to the API ` +
      `origin (e.g. https://api.jagoakademi.com) and REBUILD the web image — ` +
      `rewrites are baked at build time.`,
  );
}

const nextConfig = {
  // Self-contained server build for the Docker runner image (TASK-020).
  // apps/web/Dockerfile copies .next/standalone — without this the image build fails.
  output: "standalone",

  // Turbopack needs the monorepo root in workspaces (Next.js 16+).
  turbopack: {
    root: resolve(__dirname, "../.."),
  },

  async redirects() {
    return [
      { source: "/kursus", destination: "/e-course", permanent: true },
      { source: "/kursus/:path*", destination: "/checkout/:path*", permanent: true },
      // /lms index → the B2B LMS landing (/clients). The /lms/* namespace is the
      // multi-tenant LMS app, so only the exact /lms path redirects.
      { source: "/lms", destination: "/clients", permanent: false },
      // Legacy aliases that used to be client-side `router.replace` shim pages.
      // A shim renders HTML, then bounces — search engines index the empty shell
      // and the user pays a round trip. Served as real 308s instead.
      { source: "/pesanan", destination: "/dashboard/pesanan", permanent: true },
      { source: "/admin", destination: "/admin/dashboard", permanent: true },
      { source: "/dashboard/affiliate", destination: "/dashboard/afiliasi", permanent: true },
    ];
  },

  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${apiProxyTarget}/api/:path*`,
      },
    ];
  },

  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
          {
            // Baseline CSP (TASK-013). `'unsafe-inline'`/`'unsafe-eval'` are required
            // by Next.js hydration + Tailwind without per-request nonces; upgrading
            // to a nonce-based policy is the P2 hardening tracked in BL-16.
            // frame-ancestors/base-uri/form-action/object-src are the safe,
            // high-value directives that block clickjacking and injection.
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              // Analytics (TASK-041): GA (googletagmanager) + Mixpanel (mxpnl) script origins.
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.googletagmanager.com https://cdn.mxpnl.com",
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: blob: https:",
              "font-src 'self' data:",
              // Analytics beacons: GA collect + Mixpanel API.
              // Also allow localhost:4000 for development (backend API direct fetch).
              `connect-src 'self' https: ${process.env.NODE_ENV === 'development' ? 'http://localhost:4000' : ''}`.trim(),
              "frame-ancestors 'none'",
              "base-uri 'self'",
              "form-action 'self'",
              "object-src 'none'",
            ].join("; "),
          },
        ],
      },
      {
        source: "/api/(.*)",
        headers: [
          { key: "Cache-Control", value: "no-store" },
        ],
      },
      {
        source: "/_next/static/(.*)",
        headers: [
          { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
        ],
      },
    ];
  },

  transpilePackages: ["@repo/ui"],

  images: {
    formats: ["image/avif", "image/webp"],
    remotePatterns: [
      { protocol: "https", hostname: "**.jagoakademi.com" },
      { protocol: "https", hostname: "**.cloudflare.com" },
      { protocol: "https", hostname: "**.r2.dev" },
      { protocol: "https", hostname: "images.unsplash.com" },
      // coverUrl/thumbnailUrl/avatarUrl/logoUrl are free-text admin/user fields
      // (Prisma `String?`), so cover/thumbnail images can live on ANY https host.
      // A broad https pattern lets next/image optimize them and mirrors the
      // existing CSP `img-src 'self' data: blob: https:`. Narrow to the upload
      // CDN(s) once media storage is fixed to a known origin.
      { protocol: "https", hostname: "**" },
      // Local API origin in development (NEXT_PUBLIC_API_URL default).
      { protocol: "http", hostname: "localhost", port: "4000" },
    ],
    minimumCacheTTL: 60,
  },

  compress: true,

  poweredByHeader: false,

  experimental: {
    optimizePackageImports: ["lucide-react", "framer-motion"],
  },
};

export default nextConfig;
