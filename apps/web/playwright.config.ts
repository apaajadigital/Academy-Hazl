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
      reuseExistingServer: true,
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
        // BL-114: /mentor is gated in production (fictional roster) but stays ON
        // for E2E so public-sweep and the visual baselines keep covering the
        // page code for its flag-ON future.
        NEXT_PUBLIC_FEATURE_MENTOR: "true",
      },
    },
    {
      command: "npx tsx ../api/src/index.ts",
      url: "http://127.0.0.1:4000/api/health",
      reuseExistingServer: true,
      timeout: 30_000,
    },
  ],
});
