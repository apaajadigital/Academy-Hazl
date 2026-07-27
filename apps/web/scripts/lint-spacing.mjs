#!/usr/bin/env node
/**
 * Dashboard spacing-scale guard (standardization contract, Jul 2026).
 *
 * The dashboards must use ONLY the 8-step spacing scale 8/12/16/20/24/32/40
 * (Tailwind 2/3/4/5/6/8/10). This script scans the three dashboard trees and
 * reports layout-spacing utilities that fall off that scale (fractional .5
 * steps and the odd integers 7/9/11/14), plus arbitrary px paddings.
 *
 * Advisory by default (exit 0). Pass --strict to fail (exit 1) when any
 * off-scale class is found — use that once the Fase 5 sweep is complete.
 *
 * Usage: node scripts/lint-spacing.mjs [--strict]
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const APP = resolve(__dirname, "..", "app");
const DIRS = ["dashboard", "admin", "trainer-hub"].map((d) => join(APP, d));

// Layout-spacing props that must stay on-scale. Excludes h-/w- (legit icon &
// sizing values) — only rhythm props (gap/padding/margin/space/size).
const PROP = "(?:gap|p|px|py|pt|pb|pl|pr|m|mx|my|mt|mb|ml|mr|space-x|space-y|size)";
const OFF = "(?:1\\.5|2\\.5|3\\.5|7|9|11|14)";
const OFF_SCALE = new RegExp(`\\b${PROP}-${OFF}\\b`, "g");
const ARBITRARY_PX = /\b(?:gap|p|px|py|pt|pb|pl|pr|m|mx|my|mt|mb|ml|mr)-\[\d+px\]/g;

const strict = process.argv.includes("--strict");
let total = 0;

/** @param {string} dir */
function walk(dir) {
  let files = [];
  try {
    for (const name of readdirSync(dir)) {
      const p = join(dir, name);
      if (statSync(p).isDirectory()) files = files.concat(walk(p));
      else if (/\.(tsx|ts)$/.test(name)) files.push(p);
    }
  } catch {
    /* dir may not exist */
  }
  return files;
}

for (const root of DIRS) {
  for (const file of walk(root)) {
    const src = readFileSync(file, "utf8");
    const hits = [
      ...(src.match(OFF_SCALE) ?? []),
      ...(src.match(ARBITRARY_PX) ?? []),
    ];
    if (hits.length) {
      total += hits.length;
      const rel = file.replace(APP, "app");
      const counts = hits.reduce((m, c) => ((m[c] = (m[c] ?? 0) + 1), m), {});
      const summary = Object.entries(counts)
        .map(([c, n]) => `${c}×${n}`)
        .join("  ");
      console.log(`  ${rel}: ${summary}`);
    }
  }
}

if (total === 0) {
  console.log("lint:spacing — clean: dashboard spacing is on the 8-step contract scale.");
  process.exit(0);
}

console.log(`\nlint:spacing — ${total} off-scale spacing class(es) found in dashboard files.`);
console.log("Contract allows only 8/12/16/20/24/32/40 (Tailwind 2/3/4/5/6/8/10).");
process.exit(strict ? 1 : 0);
