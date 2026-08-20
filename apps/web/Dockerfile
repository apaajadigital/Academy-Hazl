FROM node:22-alpine AS base

# ─── Dependencies ─────────────────────────────────────────────────────────────
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

COPY package.json package-lock.json* ./
COPY apps/web/package.json ./apps/web/
COPY apps/api/package.json ./apps/api/
COPY packages/ ./packages/

# node:22-alpine sets NODE_ENV=production by default, which makes `npm ci` omit
# devDependencies. Tailwind (tailwindcss, @tailwindcss/postcss, @tailwindcss/
# typography) lives in devDependencies and is required AT BUILD TIME — without it
# @import "tailwindcss" is never processed and the site ships with zero utility
# classes (the BL-35 production CSS outage). --include=dev forces devDeps in
# regardless of NODE_ENV; the explicit env keeps intent obvious.
RUN NODE_ENV=development npm ci --include=dev

# ─── Build ────────────────────────────────────────────────────────────────────
FROM base AS builder
WORKDIR /app

# Copy both root and workspace node_modules (next binary lives in apps/web/node_modules)
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/web/node_modules ./apps/web/node_modules

# Copy source files AFTER node_modules to avoid overwriting them
COPY package.json package-lock.json* ./
COPY apps/web ./apps/web
COPY packages ./packages

ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_SITE_URL
# Optional server-side origin for the /api/* rewrite (BL-75/BL-79). Deliberately
# NOT NEXT_PUBLIC_*, so an internal origin such as http://api:4000 never reaches
# the client bundle. Must be an ARG here: next.config.js resolves rewrites at
# BUILD time for the standalone output, so a runtime `environment:` entry alone
# would never move the proxy target.
ARG API_PROXY_TARGET
ARG NEXT_PUBLIC_GA_ID
ARG NEXT_PUBLIC_MIXPANEL_TOKEN
ARG NEXT_PUBLIC_APP_NAME
# Feature flags (lib/features.ts) are NEXT_PUBLIC_* and therefore inlined at
# BUILD time — without these ARGs no flag could ever be enabled in a Docker
# image, no matter what the host .env said (the 30 Jul audit found all 8
# unreachable). They default to unset = OFF, so declaring them changes nothing
# until a value is passed via compose build.args / deploy.yml build-args.
ARG NEXT_PUBLIC_FEATURE_PRIVATE_CLASS
ARG NEXT_PUBLIC_FEATURE_ALL_ACCESS
ARG NEXT_PUBLIC_FEATURE_LEARNING_PATH
ARG NEXT_PUBLIC_FEATURE_COMMUNITY
ARG NEXT_PUBLIC_FEATURE_GAMIFICATION
ARG NEXT_PUBLIC_FEATURE_MENTOR
ARG NEXT_PUBLIC_FEATURE_ALUMNI
ARG NEXT_PUBLIC_FEATURE_PORTFOLIO
# Same build-time inlining applies to the WhatsApp contact override.
ARG NEXT_PUBLIC_WA_NUMBER
# Browser Sentry DSN (BL-17). NEXT_PUBLIC_* ⇒ inlined at BUILD time, so without
# this ARG the client SDK would initialise with an undefined DSN and stay silently
# disabled no matter what the host .env said. The SERVER DSN is deliberately not
# here: instrumentation.ts reads process.env.SENTRY_DSN at runtime, so it is
# supplied by compose `environment:` and can be rotated without a rebuild.
ARG NEXT_PUBLIC_SENTRY_DSN

ENV NEXT_TELEMETRY_DISABLED=1

# Run from root using npm workspace flag — npm sets correct PATH for workspace binaries
RUN npm run build -w apps/web

# Build-time guard (BL-35): the production CSS outage was silent — devDeps were
# skipped, @tailwindcss/postcss never ran, and the build happily emitted CSS with
# no utility classes (~18KB, no .flex/.grid/.mx-auto), collapsing every layout.
# Fail the build LOUDLY if Tailwind utilities are absent so a broken bundle can
# never reach production unnoticed again.
RUN set -e; \
    css_files=$(find apps/web/.next/static -name '*.css' 2>/dev/null); \
    test -n "$css_files" || { echo 'FATAL(BL-35): build emitted no CSS at all'; exit 1; }; \
    grep -qE '\.flex\{' $css_files || { \
      echo 'FATAL(BL-35): Tailwind utilities missing from build output.'; \
      echo '  Cause: @tailwindcss/postcss did not run — devDependencies not installed at build time.'; \
      echo '  Fix:   ensure `npm ci --include=dev` (deps stage) installs tailwindcss + @tailwindcss/postcss.'; \
      exit 1; \
    }; \
    echo 'OK(BL-35): Tailwind utilities present in build output.'

# ─── Production image ─────────────────────────────────────────────────────────
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Monorepo standalone output recreates the workspace layout:
# standalone/apps/web/server.js + standalone/node_modules. Static assets and
# public/ must sit next to the nested server.js (TASK-020 fix).
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/public ./apps/web/public

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3000 || exit 1

CMD ["node", "apps/web/server.js"]
