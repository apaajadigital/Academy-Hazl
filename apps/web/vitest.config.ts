import { defineConfig } from "vitest/config";
import { resolve } from "node:path";

/**
 * Unit-test config for apps/web.
 *
 * This workspace previously had NO unit-test runner at all — only Playwright
 * E2E. Pure logic like the WhatsApp number normaliser and the feature-flag
 * parser had no home, which is part of why an empty-string flag value could
 * reach production and turn every WhatsApp CTA into a dead link.
 *
 * Scoped deliberately to `test/unit/**` so it cannot pick up Playwright specs
 * in `e2e/`, which need a browser and a running server.
 *
 * NOTE: `vitest` is not yet listed in apps/web/package.json devDependencies and
 * there is no `test` script here. Wiring that up changes package.json AND
 * package-lock.json, so it is deliberately left for a separate, reviewed step —
 * see the report. Run meanwhile with: npx vitest run --config vitest.config.ts
 */
export default defineConfig({
  resolve: {
    alias: { "@": resolve(__dirname, ".") },
  },
  test: {
    include: ["test/unit/**/*.test.ts"],
    environment: "node",
  },
});
