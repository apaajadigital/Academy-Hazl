# Visual baselines

How the screenshot suite works, and the rules that keep it meaning something.

## The short version

- **Authoritative platform: Windows.** Baselines are Playwright's bundled
  Chromium on Windows, and the filenames say so: `…-chromium-win32.png`. They
  are produced and verified by the Windows visual-regression job in
  [`.github/workflows/ci.yml`](../../../.github/workflows/ci.yml).
- **Server: the production standalone build**, not `next dev` and not
  `next start`.
- **Data: a fixed fixture**, not the local database.
- **Eight snapshots**, and only eight.

## Why these rules exist

All three came from real defects found on 11–12 Aug 2026:

1. The suite ran against `next dev`. Dev ignores `dynamicParams = false`, so it
   rendered three learning-path routes that a production build 404s — and it
   painted its own indicator badge (~950 px) into every full-page capture.
2. Eleven of the twenty committed baselines were not photographs of a page at
   all: they captured the Next.js error overlay reading *"Runtime Error — Jest
   worker encountered 2 child process exceptions"*. Three different routes had
   byte-identical PNGs, which is only possible if none of them rendered.
3. The `/e-course` baselines were recorded from whatever the local database held,
   so the page height moved by up to +1648 px between runs.

A baseline that is wrong is worse than no baseline: it makes review *feel*
covered while pinning nothing.

## The eight legitimate snapshots

| Route | Viewports |
| --- | --- |
| `/` | mobile 320, tablet 768, desktop 1024, wide 1440 |
| `/e-course` | mobile 320, tablet 768, desktop 1024, wide 1440 |

The three learning-path routes are **not** screenshotted. They are gated off
(`features.learningPath` is default-OFF) and a production build serves 404, so
the suite asserts that behaviour instead — status 404, no redirect to
`/checkout`, no learning-path content, no Runtime Error. That is a stronger
claim than "still looks the same", and it costs no pixels.

## Running it locally (Windows only)

```bash
cd apps/web

# 1. Build. The visual suite NEVER builds for you: Playwright's webServer
#    timeout is a startup budget, and a cold build (>30 min on some machines)
#    would make it impossible to tell "compiling" from "hung".
#    The NEXT_PUBLIC_* flags are inlined AT BUILD TIME — a build that cannot see
#    them serves a different app than the tests expect.
NEXT_PUBLIC_FEATURE_PRIVATE_CLASS=true \
NEXT_PUBLIC_FEATURE_COMMUNITY=true \
NEXT_PUBLIC_FEATURE_ALUMNI=true \
NEXT_PUBLIC_FEATURE_PORTFOLIO=true \
NEXT_PUBLIC_FEATURE_MENTOR=false \
  npm run build

# 2. Run. PLAYWRIGHT_PRODUCTION_BUILD=1 switches the webServer to the
#    standalone entrypoint (scripts/start-visual-standalone.mjs).
PLAYWRIGHT_PRODUCTION_BUILD=1 npx playwright test visual-baseline
```

Without `PLAYWRIGHT_PRODUCTION_BUILD=1` the screenshot and gated-route tests
**skip**, with the reason printed. A dev-server result here is not a weaker
signal — it is a wrong one.

## Why Linux and macOS must not update baselines

Font stacks and hinting differ per platform, so a Win32 PNG says nothing about
how Linux rasterises the same page. Playwright's default on a platform with no
matching baseline is to *write a new one and pass* — quietly creating a second,
unreviewed source of truth.

So the suite **throws** on any non-Windows platform rather than skipping or
re-recording. Loosening `maxDiffPixelRatio` to paper over the difference is not
an option either: that would blind the suite to the real layout changes it
exists to catch.

If Linux coverage is wanted later, it needs its own baselines, recorded on Linux
and reviewed on their own merits.

## Server: production standalone, matching the container

`next.config.js` sets `output: "standalone"`, and `apps/web/Dockerfile` ends
with:

```dockerfile
COPY --from=builder .../.next/standalone  ./                       # line 95
COPY --from=builder .../.next/static      ./apps/web/.next/static  # line 96
COPY --from=builder .../public            ./apps/web/public        # line 97
ENV PORT=3000 / HOSTNAME="0.0.0.0"                                 # lines 103-104
CMD ["node", "apps/web/server.js"]                                 # line 109
```

[`scripts/start-visual-standalone.mjs`](../scripts/start-visual-standalone.mjs)
reproduces that layout and command exactly, only with `PORT=3004`. `next start`
is not used: Next itself warns it is not the entrypoint for `output:
"standalone"`, and photographing a server users never hit is how this suite got
into trouble the first time. Everything the helper writes goes inside `.next/`,
which is gitignored.

## Deterministic `/e-course` data

[`fixtures/visual-courses.ts`](./fixtures/visual-courses.ts) serves three fixed
courses for `**/api/courses*` and aborts every request that leaves localhost.
No timestamps, no generated ids, no drifting ratings, no remote images
(`thumbnailUrl` is null so the app's own placeholder renders). The fixture is
installed only by the visual spec — no other suite sees it.

## Narrow recapture procedure

**Never run a global `--update-snapshots`.** It rewrites every baseline in the
repository, including ones nobody looked at, which is precisely how eleven
error-overlay screenshots became "expected output".

When a change to `/` or `/e-course` is intentional:

1. Confirm the change is intended, and be able to say what moved and why.
2. Rebuild (step 1 above) so the build matches the tested flags.
3. Record the current hashes: `sha256sum e2e/visual-baseline.spec.ts-snapshots/*.png`
4. Update only the screenshot tests, with a narrow filter:

   ```bash
   PLAYWRIGHT_PRODUCTION_BUILD=1 \
     npx playwright test visual-baseline --grep "baseline: " --update-snapshots
   ```

   Narrow further when only one route changed, e.g. `--grep "baseline: homepage"`.
5. Re-record the hashes and confirm **exactly** the intended files changed, that
   no new file appeared, and that no `-linux`/`-darwin` baseline was created.
6. Run the suite twice from a clean start; both must be 12/12 with no diff.
7. Open the resulting PNG diff in review. A baseline update is a claim about
   what the product should look like, so it needs a human to agree — attach the
   Playwright report or the before/after images.

## Rollback

Baselines are ordinary tracked files:

```bash
# undo uncommitted baseline changes
git checkout -- apps/web/e2e/visual-baseline.spec.ts-snapshots/

# restore a single baseline from a known-good commit
git checkout <commit> -- apps/web/e2e/visual-baseline.spec.ts-snapshots/<file>.png
```

No build artefact, database, or deployment state is involved.
