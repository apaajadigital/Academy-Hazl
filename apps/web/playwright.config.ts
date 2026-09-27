import { defineConfig, devices } from "@playwright/test";

/**
 * Opt-in production-build mode for the VISUAL suite.
 *
 * Why it exists: `next dev` and a production build do not agree about what this
 * app serves. `dynamicParams = false` is ignored in dev, so three learning-path
 * routes rendered happily there while a real build 404s them — which is how
 * twelve baselines of a Next.js error overlay came to be committed as
 * "expected" output (see e2e/visual-baseline.spec.ts). A screenshot suite that
 * photographs the dev server is documenting something no visitor will ever see:
 * the dev indicator badge alone put ~950 foreign pixels into every baseline.
 *
 * Deliberately a separate switch rather than a change to the default runner:
 * the non-visual specs keep the fast `next dev` loop, and only the visual suite
 * pays for a build. Invoke with:
 *
 *   PLAYWRIGHT_PRODUCTION_BUILD=1 npx playwright test visual-baseline
 *
 * The name is intentionally test-scoped — it must never be confused with the
 * application's own NODE_ENV/NEXT_PUBLIC_* production configuration.
 */
// Not declared in turbo.json on purpose: Playwright is not a turbo task
// (turbo.json defines build/lint/check-types/test/dev only, and `test:e2e` is
// invoked directly), so this variable cannot affect any cached task output.
// Adding it to globalEnv would instead invalidate the entire cache whenever it
// is set.
// eslint-disable-next-line turbo/no-undeclared-env-vars
const PRODUCTION_BUILD = process.env.PLAYWRIGHT_PRODUCTION_BUILD === "1";

/**
 * The API server, started for every suite EXCEPT the visual one.
 *
 * ROOT CAUSE of "Timed out waiting 30000ms from config.webServer" (diagnosed
 * 10 Aug 2026): the API bootstraps with `import "dotenv/config"`
 * (apps/api/src/config/env.ts:1), which reads `.env` from process.cwd().
 * Playwright runs webServer commands from the config's directory — apps/web —
 * so dotenv looked for apps/web/.env, never found the API variables, and the
 * process died IMMEDIATELY with:
 *
 *     Error: [env] Invalid environment variables:
 *       DATABASE_URL: Required / JWT_SECRET: Required / JWT_REFRESH_SECRET: Required
 *
 * Playwright only reports that the URL never became ready, so the crash reads
 * as a timeout. Running the identical command from apps/api starts it cleanly,
 * which is the whole fix: point the command at the right working directory.
 *
 * WHY THE VISUAL SUITE OMITS IT
 * The visual suite must photograph the same pixels on any machine, so it cannot
 * depend on a database. It does not have to: `/e-course` gets its catalogue from
 * e2e/fixtures/visual-courses.ts (intercepted in the browser), and the only
 * server-side fetch on either photographed page is TestimonialsSection, whose
 * `getApproved()` returns [] both when the API answers with an empty list and
 * when the fetch throws — and the section renders `null` for [] either way
 * (components/home/TestimonialsSection.tsx:14-32). Verified empirically: the
 * suite is 12/12 with the API stopped. Starting it would only add a source of
 * drift, and would force CI to provision a database for screenshots.
 */
const API_WEB_SERVER = {
  command: "npx tsx src/index.ts",
  cwd: "../api",
  url: "http://127.0.0.1:4000/api/health",
  reuseExistingServer: !process.env.CI,
  // STARTUP budget, not a test/assertion timeout. Both webServers launch in
  // parallel; on a cold `.next` the dev server saturates the disk and starves
  // this process, which needs ~20s alone. 120_000 matches the web budget so
  // neither is held to a stricter cold-start deadline.
  timeout: 120_000,
};

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [["list"], ["html", { open: "never" }]],

  use: {
    baseURL: "http://localhost:3004",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },

  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],

  webServer: [
    ...(PRODUCTION_BUILD ? [] : [API_WEB_SERVER]),
    {
      // Production mode runs the STANDALONE entrypoint, not `next start`.
      // next.config.js sets `output: "standalone"` and the container's CMD is
      // `node apps/web/server.js` (apps/web/Dockerfile:109); `next start` is
      // not the supported entrypoint for that mode and Next says so on stderr.
      // scripts/start-visual-standalone.mjs reproduces the Dockerfile's layout
      // and command exactly — see its header for the line-by-line mapping.
      //
      // The build is a PREREQUISITE, not part of this command, and that is a
      // deliberate choice: folding `npm run build &&` in here makes the
      // webServer "startup" budget cover a full cold compile, which measured
      // over 30 minutes on the reference machine. Covering that would mean a
      // startup timeout so large it could no longer distinguish "compiling" from
      // "hung" — the opposite of what a timeout is for. Splitting build and
      // serve is also the shape a CI pipeline already has (build step, then e2e
      // step), and the helper fails immediately and legibly when no standalone
      // build is present.
      //
      // Build it with the SAME NEXT_PUBLIC_* flags listed in `env` below: Next
      // inlines them at build time, so a build that could not see them serves a
      // different app than these tests expect.
      command: PRODUCTION_BUILD
        ? "node scripts/start-visual-standalone.mjs"
        : "npm run dev",
      url: "http://localhost:3004",
      // Locally, reusing an already-running dev server keeps the feedback loop
      // fast. Under CI it must NOT: a runner has to prove the app boots from
      // cold, and silently attaching to a stray server would hide exactly the
      // startup failure this config exists to catch.
      //
      // In production mode reuse is ALWAYS off, CI or not. The whole point is
      // that the screenshots come from a fresh build of the current working
      // tree; attaching to whatever happens to hold :3004 would silently
      // photograph stale output — the exact failure mode this mode exists to
      // remove.
      reuseExistingServer: PRODUCTION_BUILD ? false : !process.env.CI,
      // STARTUP budget only — no assertion, action, or navigation timeout is
      // affected. Left at the existing, proven 120s for BOTH modes: `next
      // start` serves a finished build and was ready in under 1.2s in every
      // measurement, so production mode needs no extra budget. Nothing here was
      // raised to make anything pass.
      timeout: 120_000,
      // Beta-feature pages (/kelas-privat, /komunitas, /alumni,
      // /portofolio-member) are gated by build-time NEXT_PUBLIC_FEATURE_* flags
      // (default OFF — their layouts call notFound()). Turning them ON here
      // affects ONLY the dev server Playwright spawns for E2E: `next dev`
      // inlines NEXT_PUBLIC_* at request-compile time from this process env, so
      // normal `next dev`/`next build` runs keep the OFF defaults.
      // NOTE: reuseExistingServer is true — if you already have a dev server
      // running on :3004 without these flags, beta-feature specs will see 404s;
      // stop it and let Playwright start its own.
      env: {
        NEXT_PUBLIC_FEATURE_PRIVATE_CLASS: "true",
        NEXT_PUBLIC_FEATURE_COMMUNITY: "true",
        NEXT_PUBLIC_FEATURE_ALUMNI: "true",
        NEXT_PUBLIC_FEATURE_PORTFOLIO: "true",
        // No NEXT_PUBLIC_FEATURE_MENTOR here on purpose: the flag no longer
        // exists. The fictional roster, its routes and its components were
        // deleted on 11 Sep 2026 (BL-114) rather than left behind a flag, so
        // there is nothing left for an exported shell variable to switch back
        // ON. The removal itself is asserted in e2e/mentor-disabled.spec.ts.
      },
    },
  ],
});
