FROM node:22-alpine AS base

# ─── Dependencies ─────────────────────────────────────────────────────────────
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

COPY package.json package-lock.json* ./
COPY apps/api/package.json ./apps/api/
COPY packages/ ./packages/

# node:22-alpine defaults NODE_ENV=production → npm ci omits devDependencies.
# The API needs prisma CLI (migrate/generate) and tsx (seed) at build AND for
# one-off `docker compose run` ops on the host, so force devDeps in
# (same class of fix as BL-35 for the web image).
RUN npm ci --include=dev

# ─── Build ────────────────────────────────────────────────────────────────────
FROM base AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/api/node_modules ./apps/api/node_modules
COPY apps/api ./apps/api
COPY packages ./packages

WORKDIR /app/apps/api
RUN npx prisma generate
RUN npm run build

# ─── Production image ─────────────────────────────────────────────────────────
FROM base AS runner
# Run from the api workspace dir so Node module resolution finds node_modules
WORKDIR /app/apps/api

ENV NODE_ENV=production

# Prisma requires openssl at runtime for libquery_engine
RUN apk add --no-cache openssl libc6-compat

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 apiuser

# Copy both root hoisted node_modules AND workspace node_modules
# express and other deps may be in either location
COPY --from=builder --chown=apiuser:nodejs /app/node_modules /app/node_modules
COPY --from=builder --chown=apiuser:nodejs /app/apps/api/node_modules ./node_modules
COPY --from=builder --chown=apiuser:nodejs /app/apps/api/dist ./dist
COPY --from=builder --chown=apiuser:nodejs /app/apps/api/prisma ./prisma

USER apiuser

EXPOSE 4000

HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD wget -qO- http://127.0.0.1:4000/api/health || exit 1

CMD ["node", "dist/index.js"]
