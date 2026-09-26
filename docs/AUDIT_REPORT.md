# 🔍 JAGO AKADEMI — REPOSITORY AUDIT REPORT

> **Auditor:** Technical Lead / Software Architect / QA / Project Coordinator (Claude)
> **Tanggal:** 3 Juli 2026 · **Scope:** seluruh monorepo (kode, config, deps, DB, API, FE, deploy, docs)
> **Metode:** inspeksi statik & struktural terverifikasi (file tool + git plumbing). Validasi dinamis (build/test/live browser) ditandai sebagai langkah IDE.
> **Basis kebenaran:** `PROJECT_PROGRESS_REPORT_V2.md` (SSOT). Laporan ini melengkapi, bukan menggantikan SSOT.
> **Status git saat audit:** repo stabil (Claude Code selesai). `HEAD → task/030-nonpayment-verify`.

---

## 1. Ringkasan Progres

Secara fitur & fondasi, project **kuat**: Phase 1–4 (stabilize → quality gate → infra → live integration non-payment) selesai di tingkat kode dan ter-commit; website sudah ter-deploy di `jagoakademi.com`. Bottleneck saat ini **bukan pengembangan**, melainkan **integrasi rilis (branch consolidation) + satu regresi UI (BL-35) yang fix-nya belum ada di branch yang di-deploy**.

- **Code completeness:** ~85% · **Production-readiness:** ~55–60%.
- **Blocker rilis utama:** UI production tampil tanpa styling (BL-35) karena image live dibangun dari branch tanpa fix.

## 2. Status Fitur

**✅ Selesai & ter-commit:** Auth (register/login/OAuth/verify/reset + refresh), 6 unit bisnis inti di `apps/web` (E-Course, E-Book, Event, Trainer Hub, LMS portal, + katalog), Admin panel (11 halaman), Payment DOKU (webhook signature + idempotency terverifikasi), Coupon, Affiliate, Subscription, Review, Blog CMS, Certificate+QR, Search (Meilisearch), integrasi non-payment terverifikasi (email/WA/video/search), observability API (Sentry/pino/`/ready`), EPIC 8 (hapus data fiktif, gating link, auth fix), backup/restore scripts, PDP audit.

**🔵 Sedang/parsial:** Deploy live (perlu redeploy dari branch yang benar), integrasi live payment (DEFERRED — uang nyata), monitoring host-gated (SENTRY_DSN, cron), seed produksi.

**⬜ Belum:** Marketplace (unit-6, TASK-042), landing pages (TASK-040), analytics/BI (TASK-041), EPIC 7 quick-win (093/095/096), R2+signed-URL (TASK-098, gate Public Launch), gamification (TASK-097).

## 3. Repo Health Snapshot (terverifikasi)

| Aspek | Nilai | Catatan |
|-------|-------|---------|
| Prisma models | 41 | sesuai SSOT |
| API route modules | 26 | sesuai SSOT |
| API test files | 43 | coverage perlu diverifikasi via run |
| Apps (nyata) | `web` + `api` + `worker` | 3 stub app = dead code (lihat §5) |
| `.env` ter-commit? | Tidak | ✅ aman |
| Redis + worker di compose | Ya | ✅ queue infra siap |
| Nginx `/_next/static` | Ya (upstream `web:3000`) | ✅ |
| Security headers (CSP/HSTS) | Ada (baseline) | CSP nonce = P2 (BL-16) |

## 4. Temuan Berdasarkan Severity + Root Cause

### 🔴 CRITICAL-1 — Fix UI (BL-35) tidak ada di branch yang di-deploy
- **Gejala:** `jagoakademi.com` tampil tanpa styling ("berantakan").
- **Root cause:** `node:22-alpine` men-set `NODE_ENV=production` → `npm ci` melewati devDependencies → Tailwind (`tailwindcss`, `@tailwindcss/postcss`) tak ter-install saat build → `@import "tailwindcss"` tak diproses → CSS tanpa utility class → seluruh layout ambruk.
- **Status fix:** SUDAH diperbaiki di commit `d8e4dba` (force devDeps + build-guard), **tetapi hanya di branch `chore/deploy-hardening`**. Branch aktif `task/030` dan `main` **tidak memuatnya** → deploy dari sana = UI tetap rusak.
- **Prioritas:** P0 · **Effort:** S (konsolidasi + redeploy) · **Dependency:** git sehat + host.

### 🔴 CRITICAL-2 — Integrasi/release belum terkonsolidasi
- **Root cause:** `main` masih kuno (`f06fcd5`); seluruh Phase 1–8 ada di feature branch, tak ada yang di-merge. Branch "paling benar" (`chore/deploy-hardening`) tidak terdokumentasi.
- **Fakta melegakan (terverifikasi):** `chore/deploy-hardening` adalah **superset LINEAR** dari `task/030` (tanpa divergensi) = `task/030` + `d8e4dba` (BL-35) + `20ae6b4` (live-deploy fixes). Berisi TASK-052..055 + 030 + BL-35. **Konsolidasi cukup fast-forward, bukan merge rumit.**
- **Prioritas:** P0 · **Effort:** S.

### 🟠 HIGH — git index corrupt (kemungkinan artefak lintas-OS)
- **Gejala:** `git status` gagal: *"index uses extension we do not understand / index file corrupt"*.
- **Root cause (dugaan):** index ditulis git Windows (versi baru) dibaca git Linux sandbox (versi lebih lama). History (`git log`) utuh → **tidak ada kehilangan data**.
- **Remedy:** verifikasi dulu di terminal/IDE Windows-mu; bila di sana normal → murni artefak sandbox. Bila memang rusak: `rm -f .git/index && git reset` (rebuild index dari HEAD).
- **Prioritas:** P1 · **Effort:** S.

### 🟡 MEDIUM — Dead scaffolding: `apps/admin`, `apps/lms`, `apps/trainer`
- **Fakta:** masing-masing hanya **2 file**, **tak tersentuh sejak commit awal** (`53af76b`). Fungsi asli admin/LMS/trainer ada di `apps/web` (route `admin` 11 hlm, `lms` 10, `trainer-hub` 5). Ketiga app terpisah = **stub mati**.
- **Dampak:** menambah waktu `npm ci`/lint, membingungkan arsitektur (menyesatkan pembaca SSOT), noise.
- **Remedy:** hapus ketiga folder + bersihkan dari workspaces. **Verifikasi** tak ada import lintas-app sebelum hapus.
- **Prioritas:** P2 · **Effort:** S.

### 🟡 MEDIUM — Pin dependency tidak konsisten
- **Fakta:** `apps/web/package.json` memuat **18 range caret** (`next: ^16.2.10`, Radix `^`, dll), melanggar aturan pin-exact (TASK-003/§9.7).
- **Dampak:** build non-reproducible; risiko drift versi minor tak terduga (khususnya di stack bleeding-edge Next 16/React 19).
- **Remedy:** pin exact + commit lockfile.
- **Prioritas:** P2 · **Effort:** S.

### 🟡 MEDIUM — Tailwind v4 masih bergantung `@config "../tailwind-legacy.config.ts"`
- **Fakta:** `globals.css` mem-bridge config TW3 lama ke TW4. Berfungsi, tapi penamaan "legacy" menandakan migrasi belum tuntas.
- **Remedy:** selesaikan migrasi ke `@theme` native TW4, hapus file legacy bila sudah setara.
- **Prioritas:** P3 · **Effort:** M.

### 🟢 LOW — Kebersihan config
- `autoprefixer` di devDeps tapi tak dipakai di `postcss.config` (TW4 menangani sendiri). Aman dihapus.

## 5. Gap Implementasi vs Dokumentasi (Documentation Drift)

| # | Drift | Realita | Aksi Dok |
|---|-------|---------|----------|
| D1 | SSOT §3.1/§6.2 mendeskripsikan `apps/api` + `apps/web` saja | Nyata: `web` + `api` + `worker` + **3 stub mati** | Perbarui struktur folder & diagram; catat stub untuk dihapus |
| D2 | BL-35 tidak tercatat | Regresi UI nyata + fix di `chore/deploy-hardening` | Tambah BL-35 ke BACKLOG + catat branch deployable |
| D3 | "Branch deployable" tak terdokumentasi | `chore/deploy-hardening` = superset terlengkap | Dokumentasikan integration branch + alur merge ke `main` |
| D4 | Aturan pin-exact diklaim (TASK-003) | `apps/web` masih caret | Tandai TASK-003 belum tuntas untuk `web` |

## 6. Rekomendasi Optimasi

- **Performance:** setelah UI pulih, jalankan Lighthouse (target LCP<2.5s, INP<200ms, CLS<0.1); aktifkan cache katalog via Redis (worker sudah ada).
- **Security:** CSP nonce-based (BL-16); BL-34 (signature DOKU constant-time) + seed fail-closed **wajib sebelum jual berbayar**; RBAC negative-tests dipertahankan di CI.
- **Maintainability:** hapus dead scaffolding; pin exact; selesaikan migrasi Tailwind v4; satukan branch ke `main` agar tak ada "hidden correct branch".
- **Scalability:** provision Redis di prod sebelum Public Launch (TASK-022 kode siap); R2+signed-URL (TASK-098) sebelum konten berbayar.
- **DX:** replikasi build-guard gaya BL-35 untuk deteksi dini; pulihkan `git status`; branch protection pada `main` (CI hijau + review).

## 7. Prioritas Pekerjaan Berikutnya

| # | Pekerjaan | Prioritas | Effort | Dependency |
|---|-----------|-----------|--------|------------|
| 1 | Konsolidasi: fast-forward `main` ← `chore/deploy-hardening`; jadikan integration branch | 🔴 P0 | S | git sehat |
| 2 | Redeploy web image dari branch terkonsolidasi + verifikasi CSS | 🔴 P0 | S | host |
| 3 | Rebuild git index (bila korup di env kamu) | 🟠 P1 | S | — |
| 4 | Hapus `apps/admin|lms|trainer` (dead code) + bersihkan workspaces | 🟡 P2 | S | verifikasi no-import |
| 5 | Pin exact dependency `apps/web` | 🟡 P2 | S | #1 |
| 6 | Sinkronkan SSOT/BACKLOG (D1–D4) | 🟡 P2 | M | #1 |
| 7 | Migrasi Tailwind v4 tuntas (hapus legacy) | 🟢 P3 | M | #2 |

## 8. Checklist Validasi (Definition of Done per fix)

- [ ] Satu branch memuat BL-35 + TASK-052..055 + 030 (verifikasi `git merge-base --is-ancestor`)
- [ ] `npm run build -w apps/web` hijau + guard BL-35 lolos
- [ ] `/_next/static/*.css` berisi `.flex{` (utility ada) — cek `curl -I` 200 `text/css`
- [ ] Screenshot homepage & `/e-course` tampil ber-styling di production
- [ ] `git status` bersih & branch ter-push
- [ ] `apps/admin|lms|trainer` terhapus, `npm ci` sukses, tidak ada broken import
- [ ] `apps/web` deps pinned exact + lockfile ter-commit
- [ ] SSOT + BACKLOG diperbarui (D1–D4) di PR yang sama

## 9. Dokumen `.md` yang Perlu Diperbarui (agar tak drift)

- `PROJECT_PROGRESS_REPORT_V2.md` — §3.1 struktur folder (web+api+worker, stub dihapus), §6.2 diagram, tambah BL-35 + integration-branch policy, tandai TASK-003 belum tuntas untuk web.
- `docs/BACKLOG.md` — tambah BL-35 (resolved di `chore/deploy-hardening`), item hapus stub, item pin-web.
- `CLAUDE.md` — progress tracker + catatan "deploy dari `chore/deploy-hardening` sampai di-merge ke `main`".
- `docs/RUNBOOK_DEPLOY.md` — tegaskan branch/sumber image yang benar.

---

*Laporan ini bersifat analitis; perbaikan dieksekusi via konsolidasi branch + redeploy (lihat prompt Claude Code terpisah). Confidential — internal only.*
