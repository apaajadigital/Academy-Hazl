import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    conditions: ["node"],
  },
  test: {
    globals: true,
    environment: "node",
    env: {
      NODE_ENV: "test",
      DATABASE_URL: "postgresql://test:test@localhost:5432/test",
      JWT_SECRET: "test-jwt-secret-must-be-at-least-32-chars!!",
      JWT_REFRESH_SECRET: "test-refresh-secret-must-be-32-chars!!!!!",
      GOOGLE_CLIENT_ID: "test-google-client-id",
      GOOGLE_CLIENT_SECRET: "test-google-secret",
      GOOGLE_CALLBACK_URL: "http://localhost:4000/api/auth/google/callback",
      WEB_URL: "http://localhost:3000",
      CORS_ORIGIN: "http://localhost:3000",
      COOKIE_SECURE: "false",
      MEILISEARCH_URL: "http://localhost:7700",
      MEILISEARCH_KEY: "test-key",
      UPLOAD_DIR: "uploads",
      MAX_FILE_SIZE_MB: "10",
      // Force the queue OFF in tests so jobs run inline and nothing tries to
      // reach a real Redis (otherwise a REDIS_URL from a local .env makes
      // cache/queue/webhook tests hang and /ready report redis "error").
      // Set here (before dotenv, which never overrides existing vars) so tests
      // are deterministic without external infrastructure.
      REDIS_URL: "",
      // Pinned so signature tests are deterministic. Without these, dotenv fills
      // them from the developer's apps/api/.env (real sandbox credentials), and
      // the suite would pass or fail depending on whose machine it runs on.
      DOKU_CLIENT_ID: "CLIENT-TEST",
      DOKU_SECRET_KEY: "shh-test-secret-key",
    },
    include: ["src/**/*.test.ts", "test/**/*.test.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "lcov"],
      include: ["src/**/*.ts"],
      // Entry/init modules that only run in production (server bootstrap, worker,
      // Sentry init) cannot be meaningfully unit-tested.
      exclude: ["src/index.ts", "src/worker.ts", "src/instrument.ts"],
      // Ratchet gate (TASK-010): global thresholds are pinned at the verified
      // baseline so coverage can never regress. Raise these numbers as tests are
      // added — never lower them. Per-file thresholds lock in already-strong
      // critical code. The 80% target for auth/orders/lms/commerce routes is an
      // incremental goal tracked in docs/BACKLOG.md (BL-11), reached by adding
      // tests over successive PRs, not all at once (SSOT GAP-04 guidance).
      thresholds: {
        // Ratcheted up after BL-11 covered auth + lms (never lower).
        // Measured 10 Sep 2026: lines 84.90, functions 85.37, branches 71.41,
        // statements 83.30 — each pinned a point or two below to leave room for
        // ordinary refactors without letting real regressions through.
        // (Previous rung, 2 Sep: lines 80.98 / funcs 80.56 / branches 68.65 /
        // stmts 79.51 → gate 80/80/68/79.)
        lines: 84,
        functions: 84,
        branches: 70,
        statements: 82,
        // Critical middleware is already strong — lock it high to prevent drift.
        "src/middleware/authenticate.ts": { lines: 90, functions: 100, branches: 85, statements: 90 },
        "src/middleware/authorize.ts": { lines: 80, functions: 80, branches: 70, statements: 80 },
        // Wave 1.7 targets. These are the money path and the product a student
        // buys; they went from 1–12% to the numbers below, and a per-file lock is
        // what stops that from quietly eroding again. The global gate alone would
        // not notice: a file this size can fall back to 10% while the project
        // average barely moves.
        "src/services/payment/dokuService.ts": { lines: 95, functions: 100, branches: 85, statements: 92 },
        "src/services/certificate/certificateService.ts": {
          lines: 100,
          functions: 100,
          branches: 85,
          statements: 98,
        },
        "src/modules/trainer/curriculum.ts": { lines: 98, functions: 100, branches: 72, statements: 90 },
        "src/modules/trainer/quiz.ts": { lines: 96, functions: 100, branches: 80, statements: 89 },
        "src/modules/trainer/students.ts": { lines: 100, functions: 100, branches: 82, statements: 94 },
        "src/modules/trainer/certificates.ts": { lines: 100, functions: 100, branches: 72, statements: 93 },
        // BL-11 targets: the two critical modules SSOT §9.8 names that were
        // actually short — auth (61%) and lms (69%). Six files went from
        // 5.9-63% to 100%, and a per-file lock is what stops that eroding again.
        // The global gate alone would not notice: oauth.ts could fall back to
        // 12% and move the project average by well under a point.
        //
        // Covering these was not a metrics exercise. report.ts sat at 5.9% and
        // batch.ts at 17.6%, and writing tests for them is what surfaced BL-168
        // — a missing `return` in guards.ts that killed the API process for any
        // tenant admin who mistyped an id. Nothing had ever run that path.
        "src/modules/auth/oauth.ts": { lines: 98, functions: 100, branches: 90, statements: 98 },
        "src/modules/auth/session.ts": { lines: 98, functions: 100, branches: 90, statements: 98 },
        "src/modules/auth/password.ts": { lines: 98, functions: 100, branches: 90, statements: 98 },
        "src/modules/auth/register.ts": { lines: 98, functions: 100, branches: 90, statements: 98 },
        "src/modules/lms/report.ts": { lines: 98, functions: 100, branches: 90, statements: 98 },
        // branches is 75 rather than ~100 because the two uncovered ones are the
        // `?? "Validasi gagal."` fallbacks on `issues[0]?.message`. safeParse
        // never returns a ZodError with an empty issues array, so they are
        // defensively unreachable from HTTP — pinned at what is actually
        // achievable rather than at a number that would force a fake test.
        "src/modules/lms/batch.ts": { lines: 98, functions: 100, branches: 70, statements: 98 },
      },
    },
  },
});
