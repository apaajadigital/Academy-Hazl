# RUNBOOK — CI & Branch Protection (TASK-004)

> CI pipeline: `.github/workflows/ci.yml`. This runbook covers what CI enforces and the **manual** branch-protection setup (requires GitHub repo admin — cannot be done from code).

## What CI Runs (on every PR + push to `main`)

`npm ci` → `prisma generate` → `npm run lint` → `npm run check-types` → `npm run test` → `npm run build`, then uploads the API coverage artifact. Any red step fails the job.

Node 20 (LTS), Turborepo cache via `actions/setup-node` npm cache. Concurrency cancels superseded runs on the same ref.

## Local Parity (run before pushing)

```bash
npm ci
npm run --workspace api exec -- prisma generate
npm run lint && npm run check-types && npm run test && npm run build
```

All four are currently green: API+web typecheck 0 errors, lint clean, both builds succeed.

### Jumlah test — satu sumber kebenaran

> **Ini satu-satunya tempat di repo yang boleh mencantumkan jumlah test.** Angka yang sama pernah
> tersebar di enam dokumen lain (267 / 281 / 256 / 279 / 286 / 608 / 708) dan **semuanya salah**,
> karena setiap gelombang PR menambah test tanpa ada yang memperbarui salinannya. Kalau kamu butuh
> angka ini di dokumen lain, tautkan ke sini — jangan salin nilainya.

| Diukur | Perintah | Hasil |
|---|---|---|
| 2 Sep 2026 (branch `fix/wave2-payment-methods`, basis `6d6b855`) | `cd apps/api && npx vitest run` | **108 file / 1130 test lulus, 0 gagal** (BL-147: `paymentMethodTypes` 12 + 4 kasus baru di `dokuCreateOrder`). Coverage: stmt 79,64% · branch 68,84% · func 80,66% · lines 81,13%. |
| 2 Sep 2026 (branch `test/wave1-money-path-coverage`, basis `ab0e793`) | `cd apps/api && npx vitest run` | **107 file / 1114 test lulus, 0 gagal** (Wave 1.7: `dokuCreateOrder` 21, `certificateService` 14, trainer curriculum 32 / quiz 76 / roster 15). Coverage global: stmt 79,51% · branch 68,65% · func 80,56% · lines 80,98%; ratchet dinaikkan ke 79/68/80/80 + per-file lock. |
| 26 Agu 2026 (branch `fix/bl137-doku-signature`, basis `bd19788`) | `cd apps/api && npx vitest run` | **93 file / 868 test lulus, 0 gagal** (termasuk suite baru `webhook-signature.test.ts`; `hash.test.ts` yang 21 Agu timeout kini lulus) |
| 21 Aug 2026 (branch `docs/overnight-doc-sync`) | `cd apps/api && npx vitest run` | **89 file / 854 test lulus** (7 gagal: `hash.test.ts` timeout bcrypt — non-blocker logic, resource constraint) |
| 31 Jul 2026 (branch `fix/post-deploy-remediation`, basis `22611e2` + BL-116) | `cd apps/api && npx vitest run` | **86 file / 774 test lulus** |
| 29 Jul 2026 (`ce1e4b8` + remediasi lintas-sesi) | `cd apps/api && npx vitest run` | 85 file / 765 test lulus |

Ukur ulang sebelum mengutip. Jalankan **sendirian** — BL-80 mencatat suite ini non-deterministik
bila dijalankan berbarengan dengan `tsc`/`next build` (kegagalan resource, bukan cacat logika).

## Branch Protection — MANUAL SETUP REQUIRED ⚠️

Per SSOT §9.6, this touches repo settings/credentials and must be done by a human admin **after the first push** creates the remote branches. Not automatable from this repo.

On GitHub → Settings → Branches → add rule for `main`:

- [ ] **Require a pull request before merging** (no direct pushes)
- [ ] **Require approvals**: ≥ 1 reviewer
- [ ] **Require status checks to pass**: select `Lint · Types · Test · Build`
- [ ] **Require branches to be up to date before merging**
- [ ] **Require conversation resolution before merging**
- [ ] (Optional) Restrict who can push / require signed commits

Equivalent via `gh` (run by an admin, once the check has appeared at least once):

```bash
gh api -X PUT repos/{owner}/{repo}/branches/main/protection \
  -F required_status_checks.strict=true \
  -F 'required_status_checks.contexts[]=Lint · Types · Test · Build' \
  -F enforce_admins=true \
  -F required_pull_request_reviews.required_approving_review_count=1 \
  -F restrictions=
```

## Status

- [x] CI workflow authored (`ci.yml`)
- [x] PR template authored
- [ ] Pushed to remote (pending reviewer confirmation — BL-07)
- [ ] Branch protection applied (manual, post-push)
