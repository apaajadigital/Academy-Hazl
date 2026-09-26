#!/usr/bin/env node
/**
 * Serve the web app the way PRODUCTION serves it, for the visual baseline suite.
 *
 * WHY NOT `next start`
 * apps/web/next.config.js sets `output: "standalone"` (line 119), and Next warns
 * that `next start` is not the supported entrypoint for that mode. The container
 * does not use it either — apps/web/Dockerfile ends with:
 *
 *     WORKDIR /app
 *     COPY --from=builder .../.next/standalone      ./                    (line 95)
 *     COPY --from=builder .../.next/static          ./apps/web/.next/static  (line 96)
 *     COPY --from=builder .../public                ./apps/web/public        (line 97)
 *     ENV PORT=3000 / HOSTNAME="0.0.0.0"                              (lines 103-104)
 *     CMD ["node", "apps/web/server.js"]                              (line 109)
 *
 * This script reproduces exactly that: same three copies, same working
 * directory, same `node apps/web/server.js` entrypoint. A screenshot suite that
 * photographs a different server than the one users hit is documenting fiction —
 * that is the whole reason these baselines needed remediating in the first
 * place.
 *
 * WHAT IT DELIBERATELY DOES NOT DO
 * It does not build. Playwright's webServer `timeout` is a startup budget, and
 * folding a cold `next build` into it (measured >30 min here) would make the
 * timeout unable to tell "compiling" from "hung". Build first, then run this.
 *
 * Everything written lands inside `.next/`, which is gitignored — no tracked
 * file is ever touched. Paths are resolved from this file's own location, so it
 * works on Windows and Linux and carries no machine-specific absolute path.
 */

import { spawn } from "node:child_process";
import { cp, access, rm } from "node:fs/promises";
import { constants } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const WEB_ROOT = path.resolve(HERE, "..");

// Mirrors the Dockerfile layout. STANDALONE_ROOT is the container's /app.
const NEXT_DIR = path.join(WEB_ROOT, ".next");
const STANDALONE_ROOT = path.join(NEXT_DIR, "standalone");
const APP_IN_STANDALONE = path.join(STANDALONE_ROOT, "apps", "web");
const SERVER_ENTRY = path.join("apps", "web", "server.js"); // relative to STANDALONE_ROOT

const SRC_STATIC = path.join(NEXT_DIR, "static");
const DST_STATIC = path.join(APP_IN_STANDALONE, ".next", "static");
const SRC_PUBLIC = path.join(WEB_ROOT, "public");
const DST_PUBLIC = path.join(APP_IN_STANDALONE, "public");

const PORT = process.env.PORT ?? "3004";
// Same default as the container (Dockerfile:104). Binding 127.0.0.1 only would
// leave `http://localhost:3004` failing wherever localhost resolves to ::1
// first, which it does on Windows.
//
// HOSTNAME is not declared in turbo.json on purpose: this script is Playwright
// test infrastructure, and Playwright is not a turbo task (turbo.json defines
// build/lint/check-types/test/dev only), so it cannot affect any cached output.
// eslint-disable-next-line turbo/no-undeclared-env-vars
const HOSTNAME = process.env.HOSTNAME ?? "0.0.0.0";

async function exists(p) {
  try {
    await access(p, constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

function fail(message) {
  // Explicit and actionable: a missing build is the one failure mode a reader
  // will hit, and "ECONNREFUSED" three minutes later would not explain it.
  console.error(`\n[visual-standalone] ${message}\n`);
  process.exit(1);
}

const serverPath = path.join(STANDALONE_ROOT, SERVER_ENTRY);
if (!(await exists(serverPath))) {
  fail(
    `No standalone build found at:\n  ${serverPath}\n\n` +
      `Build it first, with the SAME NEXT_PUBLIC_* flags the visual suite uses ` +
      `(they are inlined at build time):\n\n` +
      `  cd apps/web && npm run build\n\n` +
      `This script never builds: Playwright's webServer timeout is a startup ` +
      `budget, not a compile budget.`,
  );
}

// Recreate the two copies the Dockerfile performs. `next build` regenerates
// .next/static on every build, so the destination is removed first rather than
// merged — a stale asset here would silently change what gets photographed.
for (const [src, dst, label] of [
  [SRC_STATIC, DST_STATIC, ".next/static"],
  [SRC_PUBLIC, DST_PUBLIC, "public"],
]) {
  if (!(await exists(src))) fail(`Missing ${label} at ${src} — is the build complete?`);
  await rm(dst, { recursive: true, force: true });
  await cp(src, dst, { recursive: true });
}

console.log(
  `[visual-standalone] node ${SERVER_ENTRY} (cwd=${STANDALONE_ROOT}) ` +
    `HOSTNAME=${HOSTNAME} PORT=${PORT}`,
);

const child = spawn(process.execPath, [SERVER_ENTRY], {
  cwd: STANDALONE_ROOT,
  stdio: "inherit",
  env: { ...process.env, NODE_ENV: "production", PORT, HOSTNAME },
});

// Playwright stops a webServer by signalling this process. Without forwarding,
// the Node server would survive as an orphan holding the port, and the next run
// would either fail to bind or — worse — silently attach to yesterday's build.
let stopping = false;
function forward(signal) {
  if (stopping) return;
  stopping = true;
  if (!child.killed) child.kill(signal);
  // Windows has no real signals for child processes; kill() terminates it.
  // Give it a moment, then make sure this wrapper exits too.
  setTimeout(() => process.exit(0), 3000).unref();
}
for (const sig of ["SIGINT", "SIGTERM", "SIGHUP", "SIGBREAK"]) {
  process.on(sig, () => forward(sig));
}
process.on("exit", () => {
  if (!child.killed) child.kill();
});

child.on("error", (err) => fail(`failed to start standalone server: ${err.message}`));
child.on("exit", (code, signal) => {
  // Propagate the child's fate so a crashed server is a failed run, not a hang.
  process.exit(signal ? 1 : (code ?? 0));
});
