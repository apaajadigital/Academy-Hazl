import { defineConfig, devices } from "@playwright/test";

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
    {
      command: "npm run dev",
      url: "http://localhost:3004",
      // Locally, reusing an already-running dev server keeps the feedback loop
      // fast. Under CI it must NOT: a runner has to prove the app boots from
      // cold, and silently attaching to a stray server would hide exactly the
      // startup failure this config exists to catch.
      reuseExistingServer: !process.env.CI,
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
        // Owner decision C-2 (6 Aug 2026): Mentor is default OFF — the roster is
        // fictional, and on 10 Aug the production sitemap was found advertising
        // /mentor plus seven invented profiles attributed to real companies.
        //
        // Set to the literal "false" rather than simply omitted: `env` here is
        // MERGED over the parent process environment, so leaving it out would
        // let a NEXT_PUBLIC_FEATURE_MENTOR exported in the developer's shell (or
        // a CI runner) silently switch the whole suite back ON. Being explicit
        // makes the suite's contract independent of who runs it.
        //
        // The OFF contract itself is asserted in e2e/mentor-disabled.spec.ts.
        NEXT_PUBLIC_FEATURE_MENTOR: "false",
      },
    },
    {
      // ROOT CAUSE of "Timed out waiting 30000ms from config.webServer"
      // (diagnosed 10 Aug 2026): the API bootstraps with `import "dotenv/config"`
      // (apps/api/src/config/env.ts:1), which reads `.env` from process.cwd().
      // Playwright runs webServer commands from the config's directory —
      // apps/web — so dotenv looked for apps/web/.env, never found the API
      // variables, and the process died IMMEDIATELY with:
      //
      //     Error: [env] Invalid environment variables:
      //       DATABASE_URL: Required
      //       JWT_SECRET: Required
      //       JWT_REFRESH_SECRET: Required
      //
      // Playwright only reports that the URL never became ready, so the crash
      // reads as a timeout. Running the identical command from apps/api starts
      // it cleanly ("API started", :4000, /api/health → 200), which is the whole
      // fix: point the command at the right working directory.
      //
      // The 30s timeout is NOT the problem and is left alone — raising it would
      // only have made the same crash take longer to report.
      command: "npx tsx src/index.ts",
      cwd: "../api",
      url: "http://127.0.0.1:4000/api/health",
      reuseExistingServer: !process.env.CI,
      // STARTUP budget, not a test/assertion timeout — nothing about what the
      // tests assert changes here.
      //
      // Both webServers are launched in parallel. On a cold `.next`, the Next
      // dev server compiles the whole app and saturates the disk (Next itself
      // logs "Slow filesystem detected" on this machine), which starves this
      // process: `npx tsx src/index.ts` needs ~20s alone and did not reach
      // /api/health inside 30s on 11 Aug 2026, so Playwright aborted before a
      // single test ran. The API was never crashing — it was still booting.
      //
      // 120_000 matches the Next dev server's budget above, so neither server
      // is held to a stricter cold-start deadline than the other.
      timeout: 120_000,
    },
  ],
});
