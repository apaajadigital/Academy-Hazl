import { nextJsConfig } from "@repo/eslint-config/next-js";
import globals from "globals";

/** @type {import("eslint").Linter.Config[]} */
export default [
  ...nextJsConfig,
  {
    // Node-run config files (e.g. next.config.js) and the repo-local tooling
    // scripts under scripts/ execute in a Node.js environment, so `process` and
    // friends are defined there. Without scripts/** this block, `npm run lint`
    // fails repo-wide on scripts/lint-spacing.mjs (3 no-undef warnings vs
    // --max-warnings 0), which blocks CI for every branch (BL-60).
    files: ["*.config.js", "*.config.mjs", "next.config.js", "scripts/**"],
    languageOptions: {
      globals: {
        ...globals.node,
      },
    },
  },
  {
    rules: {
      // `<img>` is intentional for arbitrary user-provided URLs (avatars, course
      // thumbnails, uploaded event/blog covers) where next/image's domain
      // allowlist would break rendering at runtime. Migrating these to a custom
      // next/image CDN loader is tracked as BL-08 (Phase 5 / TASK-060 performance).
      "@next/next/no-img-element": "off",
    },
  },
];
