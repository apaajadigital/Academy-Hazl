# CLAUDE.md — Jago Akademi

> Petunjuk wajib untuk setiap sesi Claude Code di repo ini. **Baca sebelum menyentuh kode.**

## (a) Single Source of Truth

**`PROJECT_PROGRESS_REPORT_V2.md`** (root) adalah **Single Source of Truth (SSOT)**. Jika terjadi konflik antara SSOT dan dokumen lain (`PROJECT_PROGRESS_REPORT.md`, `docs/*.md`, memory, komentar kode), **SSOT yang menang** sampai diperbarui eksplisit.

- Kondisi baseline faktual (hasil TASK-000): **`docs/BASELINE_AUDIT.md`**.
- Setiap sesi: **baca Part IX (Claude Code Execution Instructions) SSOT lebih dulu**, lalu eksekusi Part VI sesuai urutan Part IV.

## (b) Aturan Wajib (ringkasan Part IX — rujuk detail di SSOT)

- **Coding standards** → SSOT §9.5: TypeScript strict, no `any` tanpa alasan tertulis; Prettier + ESLint `--max-warnings 0`; validasi **Zod di setiap boundary**; tak ada `console.log` di produksi (pakai `logger`); komentar jelaskan *why* (Bahasa Inggris untuk kode).
- **Architecture rules** → SSOT §9.6: layering **Route → Service → Repository/Prisma** (route tanpa business logic; service tanpa `req/res`); envelope `{success,data,error,meta}` dari `packages/types`; **setiap query LMS wajib ter-scope `tenantId`**; tak ada file route > 400 baris; perubahan arsitektur → tulis **ADR** (`docs/adr/`).
- **Dependency rules** → SSOT §9.7: pin **exact version**; cek kompatibilitas React 19/Next 16 (`docs/COMPATIBILITY_MATRIX.md`); `npm ci` reproducible; jalankan `npm audit` tiap perubahan dependency.
- **Testing rules** → SSOT §9.8: unit (logic) + integration (endpoint) + E2E (alur kritis); coverage modul kritis (**auth, commerce/payment, orders, lms**) **≥ 80%**; test deterministik; bug fix wajib **regression test**; CI hijau sebelum merge.
- **Commit strategy** → SSOT §9.9: **Conventional Commits** `feat|fix|chore|docs|test|refactor|perf|ci(scope): subject`; commit kecil & atomik; referensikan ID task (mis. `feat(lms): split routes (TASK-012)`); jangan commit secret/`.env`/build artifact.
- **Validation strategy** → SSOT §9.11: sebelum Done jalankan berlapis — (1) `tsc --noEmit` + ESLint 0 warning, (2) `vitest --coverage` + threshold, (3) Playwright E2E terkait, (4) `turbo run build`, (5) Validation Checklist task, (6) self-review diff, (7) high-stakes → review.
- **Definisi Done global** → SSOT §A.6.

## (c) Work Order (SSOT §9.2)

```
TASK-000 → 001 → 002 → (003 ∥ 004 ∥ 011) → (012 ∥ 013) → [QUALITY GATE 010]
→ 020 → (021 ∥ 022 ∥ 023) → 030 → 🚀 SOFT LAUNCH
→ (040 ∥ 050 ∥ 051) → (041 ∥ 042* ∥ 043) → 🚀 PUBLIC LAUNCH → 060 → 070 → 080
```
`∥` = boleh berurutan-cepat tanpa saling blokir. `042*` = pecah dulu jadi subtask. Ikuti dependency graph **SSOT §4.1**; **jangan lompat dependency**.

## (d) Aturan Sesi

1. **Setiap sesi**, baca **SSOT Part IX** sebelum menyentuh kode; jangan percaya klaim tier **[C]** tanpa verifikasi.
2. **Satu task = satu branch/PR**; commit atomik referensi task; **jangan merge/push tanpa konfirmasi reviewer**.
3. **Jangan tambah fitur baru selama Phase 1–4** (Stabilize→Integration). Fitur (termasuk EPIC 7) hanya setelah Soft Launch.
4. **Aksi sensitif** (deploy ke host, DNS/SSL, migration destruktif, transaksi uang nyata) → siapkan config + runbook, lalu **minta konfirmasi human reviewer** (SSOT §9.6). Jangan eksekusi sendiri.
5. Gap baru → catat di `docs/BACKLOG.md` (jangan kerjakan di luar urutan kecuali P0/blocker).
6. Dokumentasi diperbarui **dalam PR yang sama** dengan perubahan kode (docs-as-code, SSOT §9.10).

## Progress Tracker (per fase — SSOT §9.12)

- [x] **TASK-000** — Baseline audit (`docs/BASELINE_AUDIT.md`)
- [x] **Phase 1 STABILIZE** — TASK-001..004 ✅ (commit+tag, 52 type errors fixed, deps pinned, CI). Build+typecheck+lint green.
- [~] **Phase 2 QUALITY GATE** — TASK-010..013 kode selesai (error-envelope migration, lms.ts split to 7 modules, security P1 CSP/HSTS/RBAC), both builds green. Next.js audit = accepted risk (BL-15). ⚠️ **Kriteria coverage SSOT §9.12 BELUM terpenuhi** — lihat catatan di bawah.
- [x] **Phase 3 INFRA (code)** — TASK-020..023 ✅ code complete: deploy config+CD+runbooks, DB baseline migration+indexes+backup, BullMQ queue+worker, observability (Sentry/pino/requestId//ready). 🖐️ Host execution: deploy ✅ sudah jalan; `migrate deploy` ✅ **CURRENT 13/13 per 30 Jul 2026** (`docs/RUNBOOK_DB.md` §1.1). Sisa host: backup cron, restore drill, `SENTRY_DSN`, cron certbot.

  > 🔴 **Koreksi 29 Jul 2026 — klaim "coverage gate enforced" menyesatkan.** Yang ada adalah
  > **ratchet gate** (anti-regresi), bukan gate 80%. Threshold nyata di `apps/api/vitest.config.ts:48-51`:
  > **lines 61 / functions 58 / branches 49 / statements 60**. Kriteria SSOT §9.12 menuntut modul
  > kritis (auth, commerce/payment, orders, lms) **≥ 80%**, dan BL-11 mencatat **orders 75%,
  > trainer 37%, affiliate 35%** — jadi target itu **belum tercapai**. Riwayat tetap dicatat: gate
  > anti-regresi memang berjalan dan tak pernah diturunkan. Status Phase 2 diturunkan ke
  > **sebagian** sampai BL-11 tuntas.
- [x] **Phase 4 prep** — TASK-030 non-payment integrations verified (email/WA degrade-safe, DOKU webhook signature+idempotency, Meilisearch live). Matrix `docs/INTEGRATION_VERIFICATION.md`. 🖐️ Live payment (uang nyata) DEFERRED.
- [x] **EPIC 8 — Pre-launch content integrity** — TASK-052..055 ✅ (hapus data fiktif, feature-flag gating, auth flow fix). BL-35 CSS-outage fix ✅ (`d8e4dba`).
- [x] **Release consolidation (3 Jul 2026)** — `main` di-fast-forward dari integration branch `chore/deploy-hardening` + fold SSOT v2.2.0. **main = superset linear semua feature branch** (lihat TD-35). ⚠️ **Deploy HARUS dari `main` terkonsolidasi** — bukan `task/*`/branch lama (yang tak punya fix BL-35). ✅ **`main` sudah di-push** (`origin/main == main`; per 29 Jul 2026 di `ce1e4b8`).
- [x] **Gelombang remediasi 17–29 Jul 2026** — ≥6 PR merged ke `main` (BL-44 … BL-114): QA remediation + deploy ke VPS (CI hijau 414/414 saat itu), redesign Stitch, perbaikan dashboard admin, reskin Lumina admin, remediasi trainer (PR #27, jalur uang), remediasi LMS/orphan-route/e-book/kelas-gratis/event. **Deploy host sudah berjalan** — situs live menyajikan `main`.
- [ ] 🚀 **Soft Launch (10B)** → Phase 5–6 → Public Launch (10C) → Scale (10D) — masih tertahan blocker konten + `migrate deploy` (human-gated)

> **Angka test — satu tempat saja.** Jumlah test **hanya** dicatat di `docs/RUNBOOK_CI.md` (satu
> sumber kebenaran) dan wajib **diukur ulang** (`cd apps/api && npx vitest run`), bukan disalin dari
> dokumen lain. Menuliskannya di runbook/laporan lain sudah terbukti beranak jadi enam angka yang
> semuanya salah (267 / 281 / 256 / 279 / 286 / 608 / 708). Angka terverifikasi ada di runbook itu —
> **jangan disalin ke sini**, karena setiap gelombang PR membuatnya basi dalam hitungan jam.

### 🖐️ Awaiting reviewer (human-gated, SSOT §9.6)
1. 🔴 **BL-114 — 7 mentor fiktif live + terindeks sitemap** (dipasangkan perusahaan nyata, LinkedIn placeholder). **Blocker Go/No-Go**, butuh keputusan pemilik: hapus / ganti mentor nyata ber-consent / gate di balik flag — `docs/BACKLOG.md` BL-114
2. ✅ **SELESAI 30 Jul 2026 — `prisma migrate deploy` sudah dijalankan, DB prod CURRENT 13/13.** Pre-flight (duplikat `user_roles` + audit role ber-tenant) dua-duanya 0 baris, backup `jago-2026-07-30-0621.sql.gz`, keempat migration 29 Jul ter-apply berurutan. Klaim lama "≥7 pending termasuk private-class & alumni" **salah** — #7–9 ternyata sudah applied sejak sebelumnya; yang pending hanya 4. Detail + jebakan "image basi bikin `migrate status` berbohong" di `docs/RUNBOOK_DB.md` §1.1
3. Backup cron + restore drill + index audit — `docs/RUNBOOK_DB.md` (backup manual sudah terbukti jalan 30 Jul; **cron & restore drill masih belum**)
4. **Perbaiki cron certbot** (deploy-hook ke nginx **host**, hapus domain yang tak resolve dari `-d`) — TLS bisa kedaluwarsa senyap — `docs/RUNBOOK_DEPLOY.md` §4
5. Set `SENTRY_DSN` + uptime/alert monitors (arahkan ke `https://jagoakademi.com/api/health`) — `docs/RUNBOOK_INCIDENT.md`
6. **Daftarkan webhook DOKU ke `https://jagoakademi.com/api/webhooks/doku`** dan jalankan live integration matrix (sandbox→prod) — host lama `api.jagoakademi.com` tidak resolve ⇒ pembayaran tak pernah terkonfirmasi — `docs/INTEGRATION_VERIFICATION.md`
7. Soft Launch Go/No-Go (Playbook 10B)

## Perintah Cepat

```bash
# Verifikasi berlapis (per §9.11)
cd apps/api && npx tsc --noEmit && npm run test
cd apps/web && npm run build
# Metrics
grep -cE '^model ' apps/api/prisma/schema.prisma
```

---
*Detail penuh selalu di `PROJECT_PROGRESS_REPORT_V2.md`. File ini hanya pointer + ringkasan; jangan duplikasi isi SSOT.*
