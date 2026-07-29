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
| 29 Jul 2026 (`ce1e4b8` + remediasi lintas-sesi) | `cd apps/api && npx vitest run` | **85 file / 765 test lulus** |

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
