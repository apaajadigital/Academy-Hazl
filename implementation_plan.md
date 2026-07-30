# IMPLEMENTATION PLAN — Audit Menyeluruh & Checklist Eksekusi

> **Dibuat:** 30 Juli 2026 · **Audit window:** 48 jam terakhir (28–30 Jul 2026)
> **Repo HEAD:** `9625cf8` @ `fix/cross-session-remediation` · **`origin/main`:** `ce1e4b8`
> **Metode:** 4 agent paralel (code-quality, DevOps/infra, DB/migration, PM/docs) + verifikasi
> mandiri Git, build, test, dan probe HTTP langsung ke produksi. Setiap temuan disertai evidence.
>
> ⚠️ Dokumen ini **menggantikan** isi lama file ini (rencana pembuatan dokumen dari 8 Jul 2026,
> sudah usang — dokumen yang direncanakan sudah terbit sebagai `docs/01-BRD.md` dst).
>
> 🖐️ = **human-gated** (SSOT §9.6). Claude Code menyiapkan; operator/reviewer yang mengeksekusi.

---

## RINGKASAN EKSEKUTIF

Kondisi repo **sehat secara kode**, tetapi ada **jurang antara `main` dan produksi**, dan
**tiga lubang uang/keamanan yang sudah tayang**. Kabar baiknya: tidak ada pekerjaan yang
hilang — tidak ada commit yang belum di-push, tidak ada stash.

| Lapisan | Status | Bukti |
|---|---|---|
| Working tree | ✅ Bersih (hanya 5 untracked non-kode) | `git status --porcelain` |
| Local → Git | ✅ Sinkron, **0 commit unpushed** | `git cherry` (lihat §1.3) |
| Git → `main` | ❌ **2 PR terbuka**, 5 commit belum masuk | PR #28, PR #20 |
| `main` → VPS | ❌ **`main` belum ter-deploy** | fingerprint live (§3.2) |
| Skema DB | ❌ **7 dari 13 migration pending** | `docs/RUNBOOK_DB.md:44` |
| CI/CD | ❌ Deploy workflow **belum pernah sukses** & akan menyebabkan outage | §4 |

**Verifikasi lokal hari ini (diukur ulang, bukan disalin):**

| Gate | Hasil |
|---|---|
| `apps/api` `tsc --noEmit` | ✅ 0 error |
| `apps/web` `tsc --noEmit` | ✅ 0 error |
| `apps/web` `eslint --max-warnings 0` | ✅ 0 warning |
| `apps/api` `vitest run` | ✅ **85 file / 765 test lulus** |
| Coverage | ⚠️ stmt 74.26 / br 63.44 / fn 75.09 / **lines 75.51** — di bawah target §9.12 (≥80%) |
| `npm audit` | ⚠️ **6 high**, semua ada fix non-major |

---

## 1. TEMUAN GIT — STATE LENGKAP

### 1.1 Working tree
Bersih dari perubahan kode. 5 item untracked, **tak satu pun ter-`.gitignore`** sehingga
selalu muncul di `git status` dan berisiko ikut ter-commit:

| Path | Ukuran | Klasifikasi |
|---|---|---|
| `stitch_clean_design_refinement/` | 4.9 MB, 25 file | Aset desain Stitch (input, bukan source) |
| `Laporan_Fitur_JagoAkademi.docx` | 18 KB | Laporan |
| `Laporan_Update_Fitur_JagoAkademi.docx` | 40 KB | Laporan |
| `Manual_Guide_Book_JagoAkademi.docx` | 16 KB | Dokumen |
| `WEBSITE FEEDBACK .docx` | 172 KB | Feedback beta |

**Tidak ada stash** (`git stash list` kosong).

### 1.2 Branch belum ter-merge ke `main` — hanya 2 yang nyata

Diverifikasi dengan `git cherry` (perbandingan **patch-id**, bukan sekadar ancestry),
karena squash-merge membuat branch tampak "belum merge" padahal isinya sudah ada di `main`.

| Branch | Commit unik | PR | CI | Nyata belum masuk? |
|---|---|---|---|---|
| `fix/cross-session-remediation` | **4** | #28 OPEN | ✅ SUCCESS | ✅ **YA** |
| `feat/ecourse-remediation` | **1** (`36d1c47`) | #20 OPEN | ❌ **FAILURE** | ✅ **YA** |
| `chore/cleanup-deploy-docs` | 0 (patch sudah di `main`) | #15 MERGED | — | ❌ tidak |
| `chore/cleanup-stubs-pin-deps` | 0 | #9 CLOSED | — | ❌ tidak |
| `ci/fix-ghcr-lowercase-image` | 0 | #13 MERGED | — | ❌ tidak |
| `docs/ssot-v2.2.0-epic8` | 0 | #7 CLOSED | — | ❌ tidak |
| `fix/build-time-fetch-timeout` | 0 | #14 MERGED | — | ❌ tidak |
| `fix/qa-audit-hero-header-title` | 0 | #12 MERGED | — | ❌ tidak |

### 1.3 ✅ TIDAK ADA COMMIT YANG BELUM DI-PUSH

Dua branch lokal tampak "ahead" — keduanya **false positive** (ref origin lokal basi):

| Branch lokal | vs origin-nya | vs `main` (patch-id) | Kesimpulan |
|---|---|---|---|
| `fix/trainer-remediation` | ahead 4 | **kosong** | Isi sudah di `main` (`502f5c5`…`098db99` ada di log `main`) |
| `fix/qa-batch1-critical-security` | ahead 2 | **kosong** | Isi sudah di `main` |

Branch lokal tanpa upstream (`fix/lms-route-remediation`, `fix/mentor-hero-spacing`,
`fix/orphan-route-remediation`, `fix/qa-batch7-followups`, `fix/qa-batch8-newfindings`,
`redesign/wave0-foundation`) → `git cherry` kosong semua = **sudah di `main`**.
`fix/event-remediation` hanya pointer duplikat ke `36d1c47` (sama dengan PR #20).

### 1.4 Tata kelola repo — 🔴 gap governance

| Temuan | Bukti |
|---|---|
| `main` **tidak diproteksi** — CI bukan required check, push langsung diizinkan | `gh api …/branches/main/protection` → 404 "Branch not protected" |
| **0 GitHub Environment** — gate approval `production` di `deploy.yml:100` **tidak ada** | `gh api …/environments` → `total_count: 0` |
| **0 tag** (lokal & remote) — padahal `deploy.yml` hanya trigger di tag `v*` | `git tag -l`, `git ls-remote --tags` |

---

## 2. TEMUAN KODE

### 2.1 🔴 P0 — Lubang uang & keamanan (diverifikasi mandiri, bukan klaim agent)

**A. `POST /api/enrollments` memberi kursus berbayar GRATIS (BL-54)**
`apps/api/src/routes/enrollments.ts:17-20` hanya memakai `authenticate` + `validateBody`.
`apps/api/src/services/enrollment/enrollmentService.ts:5-20` hanya cek `status === "published"`
dan duplikat — **tidak ada cek order/pembayaran**. Setiap user terdaftar bisa meng-enroll
kursus berbayar mana pun tanpa membayar. **API ini live.**

**B. Checkout mengabaikan `salePrice` untuk kursus (BL-53)**
`apps/api/src/routes/checkout.ts:60` → `price = Number(course.price);`
Bandingkan e-book `:66` dan event `:82` yang keduanya `salePrice ? … : price`.
**Setiap kursus diskon ditagih harga penuh.**

**C. Worker kehilangan `WEB_URL` → URL `localhost` di email & sertifikat**
`docker-compose.vps.yml` menyetel `WEB_URL` untuk service `api` tetapi **tidak** untuk `worker`.
`apps/api/src/config/env.ts:14` default `http://localhost:3004`. Dikonsumsi di
`emailService.ts:69` (verifikasi email), `:89` (reset password), `:106` (undangan LMS),
`:265` (invoice), dan **dipersistensi** di `certificateService.ts:32` (URL verifikasi sertifikat).
`/api/ready` melaporkan `redis: ok` ⇒ BullMQ aktif ⇒ job memang lewat worker.
Konsekuensi: link email rusak, atau — bila container worker tidak jalan — email/sertifikat
**tidak pernah terkirim sama sekali**. Keduanya P0.

### 2.2 🔴 Konten fiktif tayang (BL-114) — blocker Go/No-Go

`apps/web/lib/e-course/data.ts:1407-1514` — 7 mentor rekaan dipasangkan dengan perusahaan
nyata dan metrik karangan; `linkedinUrl` semuanya placeholder `"https://linkedin.com"`.
Mengalir ke `/mentor`, `/mentor/[slug]`, `/e-course/*`, dan `app/sitemap.ts`.

**Terverifikasi live:**
- `https://jagoakademi.com/mentor/ahmad-fauzi` → **HTTP 200**, memuat `Tokopedia`, `89.2K`, `linkedin.com`
- `sitemap.xml` mengindeks ke-7 mentor (dari total 35 URL)

### 2.3 Higienitas kode — sangat baik
0 `TODO`/`FIXME`/`HACK`, 0 `.only(`, 0 `debugger`, 0 `@ts-ignore`, 0 `as any`/`: any`,
0 `console.log` di `apps/api/src` & kode produksi web.

Debt nyata yang tersisa:
- **8 `// eslint-disable-line` telanjang** (tanpa nama rule ⇒ mematikan *semua* rule) di 6 halaman
  admin; `apps/web/app/admin/leads/page.tsx:216` juga ber-`[]` deps padahal memakai 4 argumen live.
- **`localhost:4000` di-copy-paste ke 24 file**, mem-bypass `apps/web/lib/api/base.ts`;
  `??` tidak menangkap string kosong (BL-75).
- 4 `test.skip` data-dependent di `apps/web/e2e/events-blog.spec.ts` → suite bisa hijau tanpa
  meng-assert apa pun.

---

## 3. TEMUAN PRODUKSI (probe langsung)

### 3.1 Yang sehat ✅
| Cek | Hasil |
|---|---|
| `https://jagoakademi.com/` | 200 |
| `/api/health` | `{"status":"healthy"}` |
| `/api/ready` | `db: ok, search: ok, redis: ok` |
| TLS | valid (`ssl_verify=0`) |
| Security headers | HSTS preload, CSP, X-Frame-Options, nosniff, Referrer-Policy, Permissions-Policy |
| Rate limit | aktif (`RateLimit-Limit: 500; w=900`) |

### 3.2 🔴 Produksi TERTINGGAL dari `main`

Fingerprint metadata (`843f8d8` mengubah judul marketplace):

| Sumber | `<title>` `/marketplace` |
|---|---|
| `origin/main` | `Marketplace Materi Digital — Jago Akademi` |
| **Live** | `Marketplace E-Book & Modul — Jago Akademi` ← **lama** |

⇒ `843f8d8`, `af87e38`, `098db99`, `ce1e4b8` **belum ter-deploy**.
Sementara `12a9554` (navigasi mentor) **sudah** live ⇒ posisi deploy ada di antara
merge PR #21 dan PR #27.

Bukti pendukung: `/api/courses` mengembalikan `"status":"published"` dengan
`"publishedAt":null` — persis bug yang diperbaiki `3a40107` (di PR #28, belum merge).

### 3.3 `api.jagoakademi.com` **NXDOMAIN**
`nslookup` → "Non-existent domain". Domain live = `jagoakademi.com` (212.85.26.131).

---

## 4. TEMUAN CI/CD & INFRA

### 4.1 🔴 `deploy.yml` akan mengulang outage BL-43
`.github/workflows/deploy.yml:115,118,119` memakai `docker-compose.prod.yml`, yang
header filenya sendiri melarang:

> `docker-compose.prod.yml:1-5` — "⛔ DO NOT USE ON THE LIVE VPS ⛔ … publishes NO host ports
> on web/api, so running it there detaches the site from host nginx → 502 outage
> (incident 17 Jul 2026, BL-43)."

Runbook sudah disapu ke `vps.yml` pada 29 Jul; **workflow-nya terlewat.**

### 4.2 🔴 Smoke test CD mustahil lulus
`deploy.yml:125` → `curl -fsS https://api.jagoakademi.com/api/health` (NXDOMAIN, §3.3).
Job gagal **setelah** migration dan container swap dieksekusi.

### 4.3 CD belum pernah sukses
Hanya 2 run `deploy.yml` seumur repo — keduanya **failure**, 8 Jul 2026 (tag `v0.1.0`, `v0.1.1`).
Tag-nya kini sudah dihapus. Deploy rutin = **manual SSH**.

### 4.4 CI tidak menjaga apa pun
`ci.yml` jalan di PR + push `main`, tapi `main` tak diproteksi ⇒ advisory saja.
**Tidak ada step E2E** (11 spec Playwright ada, tak pernah jalan di CI; `apps/web/package.json`
bahkan tak punya script `test:e2e`). Tidak ada `npm audit`/Dependabot.
Tag `v*` **tidak** memicu `ci.yml` dan job `deploy` tak punya `needs:` ke test ⇒ push tag
men-deploy kode tak teruji.

### 4.5 Migration — 7 pending, satu bisa menggagalkan deploy di tengah jalan
13 folder migration; `docs/RUNBOOK_DB.md:28-42` akurat terhadap disk. **Nol schema drift**
(44 model ↔ 44 tabel; private-class, alumni/portfolio, index BL-98 semuanya ter-cover).

Risiko urutan: `20260729000001_user_roles_global_unique` membuat **unique index di atas data
existing tanpa dedup**. Bila ada duplikat → error `23505`, `migrate deploy` berhenti, dan
migration `…000002` (`refunds(status)`) serta `…000003` (index BL-98) **tidak pernah tereksekusi**.

### 4.6 Lain-lain (P1)
- Port `4010`/`3010` di-bind ke `0.0.0.0` ⇒ API/web bisa diakses plaintext lewat IP,
  mem-bypass TLS & rate limit.
- `DOKU_BASE_URL` default ke **`https://api.doku.com` (produksi)** bila env kosong.
- 7 flag `NEXT_PUBLIC_FEATURE_*` **mustahil diaktifkan** — tidak ada `ARG` di
  `apps/web/Dockerfile` maupun `build.args`.
- Backup cron ship dengan `R2_REMOTE=` kosong ⇒ backup hanya lokal, satu host dengan DB.
  Restore drill belum pernah dijalankan.
- `SENTRY_DSN` kosong ⇒ tidak ada visibilitas error produksi.
- Cron certbot di host masih versi lama yang rusak (perbaikannya baru ada di dokumen,
  di PR #28 yang belum merge).

---

## 5. CHECKLIST EKSEKUSI

> Urut. Jangan lompat. Setiap fase punya **gate** yang harus hijau sebelum lanjut.

### FASE 0 — Persiapan (lokal, aman)

- [ ] 0.1 `git fetch --all --prune`
- [ ] 0.2 Konfirmasi tree bersih: `git status --porcelain`
- [ ] 0.3 Putuskan nasib 5 untracked item (§1.1). Rekomendasi: tambahkan ke `.gitignore`
      (`*.docx`, `stitch_clean_design_refinement/`) — aset desain/laporan, bukan source.
- [ ] 0.4 Re-verifikasi berlapis (SSOT §9.11):
      `cd apps/api && npx tsc --noEmit && npx vitest run`
      `cd apps/web && npx tsc --noEmit && npm run lint`
- [ ] 0.5 🖐️ **Keputusan owner BL-114** (blocker Go/No-Go, §2.2): hapus / ganti mentor nyata
      ber-consent / gate di balik flag + de-index sitemap.
      **Tanpa ini, Soft Launch tidak boleh jalan.**
- [ ] 0.6 🖐️ Keputusan BL-112: apakah 70/30 kontrak nyata & seragam per trainer?
      (harus terjawab sebelum payout uang nyata pertama)

**Gate F0:** semua perintah 0.4 exit 0; 0.5 terjawab tertulis.

---

### FASE 1 — Tuntaskan PR yang menggantung

- [ ] 1.1 **Merge PR #28** (`fix/cross-session-remediation` → `main`).
      Status: CI ✅ SUCCESS, `MERGEABLE`, `mergeStateStatus: CLEAN`, 39 file, +1956/−269,
      termasuk **6 file test integrasi baru**.
      Isi: perbaikan paginasi admin, batas withdrawal afiliasi (BL-113), 4 kontrak respons API,
      **dan koreksi runbook certbot/deploy yang mencegah outage**.
      🖐️ Butuh persetujuan reviewer — jalur uang tersentuh (SSOT §9.6).
- [ ] 1.2 **Perbaiki PR #20** (`feat/ecourse-remediation`). CI gagal karena
      `apps/web/scripts/lint-spacing.mjs` → `'process' is not defined` (3 warning, `--max-warnings 0`).
      **Sudah diperbaiki di `main` oleh `51239c9`** (`apps/web/eslint.config.js`).
      Aksi: rebase `36d1c47` ke `main` terbaru → CI hijau → review → merge.
- [ ] 1.3 Setelah 1.1 & 1.2: `git checkout main && git pull --ff-only`
- [ ] 1.4 Hapus 6 branch remote basi yang isinya sudah di `main` (§1.2) + branch lokal usang.

**Gate F1:** `git cherry origin/main <tiap-branch>` kosong untuk semua branch selain yang
sengaja hidup; CI `main` hijau.

---

### FASE 2 — Perbaikan P0 sebelum deploy (PR terpisah, kecil, atomik)

> Tiga item ini **sudah tayang di produksi**. Kerjakan sebelum/berbarengan dengan deploy.

- [ ] 2.1 **BL-54 — tutup enrollment gratis ke kursus berbayar.**
      `enrollmentService.ts:5-20` harus menolak bila `course.price > 0` tanpa `Order`
      berstatus `paid` milik user tsb. **Wajib regression test** (SSOT §9.8).
      🖐️ Review keamanan.
- [ ] 2.2 **BL-53 — hormati `salePrice` untuk kursus** di `checkout.ts:60`,
      samakan dengan pola e-book (`:66`) & event (`:82`). Regression test wajib.
      🖐️ Review jalur uang.
- [ ] 2.3 **Tambahkan `WEB_URL: ${WEB_URL}` ke service `worker`** di `docker-compose.vps.yml`.
      Satu baris; mencegah URL `localhost` di email & sertifikat. (§2.1C)
- [ ] 2.4 **Perbaiki `deploy.yml`**: `prod.yml` → `docker-compose.vps.yml` (baris 115/118/119)
      **dan** smoke test `api.jagoakademi.com` → `https://jagoakademi.com/api/health` (baris 125).
      Alternatif sementara: nonaktifkan workflow. **Jangan biarkan apa adanya** — satu
      `workflow_dispatch` atau tag `v*` = 502 sitewide.
- [ ] 2.5 Tambah `needs:` test pada job `deploy`, atau jalankan `ci.yml` pada tag.

**Gate F2:** `tsc` + `lint` + `vitest` hijau; test regresi 2.1 & 2.2 ada dan lulus; CI hijau.

---

### FASE 3 — Code review & commit

- [ ] 3.1 Self-review diff tiap PR (SSOT §9.11 langkah 6)
- [ ] 3.2 Conventional Commits + referensi ID task/BL (§9.9)
- [ ] 3.3 Perbarui dokumentasi **dalam PR yang sama** (§9.10)
- [ ] 3.4 Pastikan tidak ada secret/`.env`/artifact ikut ter-commit
- [ ] 3.5 🖐️ Review manusia untuk semua perubahan jalur uang/auth/deploy

---

### FASE 4 — Push & merge ke `main`

- [ ] 4.1 Push branch fitur (jangan push langsung ke `main`)
- [ ] 4.2 Tunggu CI hijau per PR
- [ ] 4.3 🖐️ Merge setelah persetujuan reviewer
- [ ] 4.4 🖐️ **Aktifkan branch protection di `main`**: require PR, require status check
      "Lint · Types · Test · Build", larang force-push. Menutup gap §1.4 dan memenuhi
      §9.12 Fase 2 ("CI blocks red").
- [ ] 4.5 🖐️ **Buat GitHub Environment `production`** dengan required reviewer — gate yang
      diasumsikan `deploy.yml:100` saat ini **tidak ada**.

**Gate F4:** `git merge-base --is-ancestor <sha> origin/main` → true untuk setiap perbaikan;
CI `main` hijau.

---

### FASE 5 — 🖐️ Pre-flight database (SEBELUM menyentuh VPS)

> Semua langkah di host. Urutan ini mencegah `migrate deploy` berhenti di tengah.

- [ ] 5.1 **Backup dulu**: `bash scripts/backup.sh` — verifikasi file dump > 1 KB.
      Ini satu-satunya jalur pemulihan; belum ada otomatisasi pre-deploy.
- [ ] 5.2 Ground truth:
      `docker compose -f docker-compose.vps.yml run --rm api npx prisma migrate status`
      Rekonsiliasi dengan `docs/RUNBOOK_DB.md:28-42`. Selesaikan kontradiksi migration #6
      (runbook bilang applied, komentar file bilang belum) — file itu memuat
      `DELETE FROM "certificates"` yang **tidak bisa di-undo**.
- [ ] 5.3 Pre-flight duplikat global role (mencegah abort `23505`):
      lihat `20260729000001_user_roles_global_unique/migration.sql:24-26`
- [ ] 5.4 Pre-flight audit tenant-role BL-111:
      `SELECT "userId", role, "tenantId" FROM user_roles WHERE "tenantId" IS NOT NULL AND role NOT IN ('lms_admin','lms_employee');`
      Bila ada baris → **stop**, minta keputusan (orang bisa kehilangan akses).

**Gate F5:** backup terverifikasi ada; 5.3 & 5.4 mengembalikan 0 baris (atau sudah diputuskan).

---

### FASE 6 — 🖐️ Deploy ke VPS

> Path: `/var/www/jago-akademi`. **Selalu** `docker-compose.vps.yml`. **JANGAN PERNAH** `prod.yml`
> (BL-43). **Jangan pernah** pakai `--remove-orphans`.

- [ ] 6.1 `cd /var/www/jago-akademi && git pull --ff-only origin main`
- [ ] 6.2 **Migration** (setelah Gate F5):
      `docker compose -f docker-compose.vps.yml run --rm api npx prisma migrate deploy`
- [ ] 6.3 Verifikasi **semua 13** ter-apply — khususnya `…000002` & `…000003` yang berada
      **setelah** migration berisiko: `… npx prisma migrate status`
- [ ] 6.4 **Build production** (`--no-cache` wajib — pelajaran BL-35 CSS outage):
      `docker compose -f docker-compose.vps.yml build --no-cache web`
      Bila ada perubahan API/worker: build `api` juga.
- [ ] 6.5 **Restart service**:
      `docker compose -f docker-compose.vps.yml up -d --force-recreate web`
      (tambah `api worker` bila tersentuh — worker **wajib** direstart untuk memuat `WEB_URL` dari 2.3)
- [ ] 6.6 **Guard BL-43 — WAJIB**: `docker port jago-akademi-web-1` **harus** menampilkan `3010`.
      Bila kosong → topologi salah, langsung recreate dari `vps.yml`.
- [ ] 6.7 `docker compose -f docker-compose.vps.yml ps` — semua `healthy`
      (kecuali `worker`, yang healthcheck-nya sengaja dinonaktifkan)

**Gate F6:** 6.6 menampilkan `3010`; semua container healthy.

---

### FASE 7 — Validasi & smoke test

- [ ] 7.1 `curl -fsS https://jagoakademi.com/api/health` → `"status":"healthy"`
- [ ] 7.2 `curl -fsS https://jagoakademi.com/api/ready` → `db/search/redis` semua `ok`
- [ ] 7.3 `curl -fsSI https://jagoakademi.com | head -5` → 200 + security headers
- [ ] 7.4 **Verifikasi deploy benar-benar naik** (jangan asumsi):
      `curl -s https://jagoakademi.com/marketplace | grep -o '<title>[^<]*</title>'`
      → **harus** `Marketplace Materi Digital` (bukan `E-Book & Modul`). Ini fingerprint §3.2.
- [ ] 7.5 API kontrak: `/api/courses` → `publishedAt` **tidak lagi null** untuk kursus published
      (perbaikan `3a40107`)
- [ ] 7.6 Integration test: `/api/events`, `/api/ebooks`, `/api/courses?isFree=true`
      mengembalikan envelope `{success,data}`
- [ ] 7.7 **Regresi P0**: konfirmasi `POST /api/enrollments` menolak kursus berbayar tanpa order (2.1)
- [ ] 7.8 **E2E** (belum ada di CI — jalankan manual):
      `cd apps/web && npx playwright test`. Awas gotcha stale-server/:3004.
- [ ] 7.9 Verifikasi worker: picu satu email transaksional, pastikan link ber-domain
      `https://jagoakademi.com`, **bukan** `localhost:3004` (validasi 2.3)

**Gate F7:** 7.1–7.7 lulus; 7.4 menunjukkan judul baru.

---

### FASE 8 — 🖐️ Ops yang tertunda (bisa paralel setelah F7)

- [ ] 8.1 **Perbaiki cron certbot** di host — deploy-hook ke `systemctl reload nginx`,
      hapus `-d api.jagoakademi.com`. Prosedur benar ada di `docs/RUNBOOK_DEPLOY.md:218-243`
      (versi terkoreksi ikut ter-merge lewat PR #28). Uji: `sudo certbot renew --dry-run`.
      **Tanpa ini TLS kedaluwarsa senyap dalam ~90 hari.**
- [ ] 8.2 Pastikan nginx host melayani `/.well-known/acme-challenge/` — template repo
      `deploy/jagoakademi.com.nginx:1-5` tidak punya location-nya.
- [ ] 8.3 Set `SENTRY_DSN` + `APP_VERSION` di `.env` host, restart api & worker.
- [ ] 8.4 Pasang uptime monitor + alert ke `https://jagoakademi.com/api/health`.
- [ ] 8.5 Install backup cron **dan set `R2_REMOTE`** (saat ini kosong di
      `deploy/jago-backup.cron:11` ⇒ backup satu host dengan DB). Catatan: path di
      `docs/RUNBOOK_DB.md:98-105` tertulis `/opt/jago-akademi`, **seharusnya** `/var/www/jago-akademi`.
- [ ] 8.6 Jalankan **restore drill** (`scripts/restore.sh`) — belum pernah dijalankan.
- [ ] 8.7 Bind port ke loopback: `"127.0.0.1:4010:4000"` & `"127.0.0.1:3010:3000"`.
- [ ] 8.8 Set `DOKU_BASE_URL` eksplisit — default-nya jatuh ke **produksi DOKU**.
- [ ] 8.9 🖐️ Daftarkan webhook DOKU ke `https://jagoakademi.com/api/webhooks/doku`.
      ⚠️ Selesaikan dulu konflik: `10B-SOFT-LAUNCH-STRATEGY.md:99` menuntut transaksi live
      Rp 1.000, sementara `INTEGRATION_VERIFICATION.md:5` **melarangnya** tanpa otorisasi eksplisit.

---

### FASE 9 — Monitoring pasca-deploy (60 menit pertama)

- [ ] 9.1 Menit 0–15: `docker compose -f docker-compose.vps.yml logs -f --tail=100 api web worker`
- [ ] 9.2 Pantau Sentry (setelah 8.3) untuk error baru
- [ ] 9.3 Verifikasi ulang `/api/ready` pada T+15, T+30, T+60
- [ ] 9.4 Cek antrean BullMQ tidak menumpuk (job diproses, bukan hanya di-enqueue)
- [ ] 9.5 Spot-check halaman kunci: `/`, `/e-course`, `/event`, `/ebook`, `/kelas-gratis`, `/masuk`

---

### FASE 10 — Rollback plan

> Semua migration pending bersifat **aditif** (kolom nullable / kolom ber-default / index /
> satu tabel baru) ⇒ **rollback image aman** tanpa rollback skema.

| Skenario | Aksi |
|---|---|
| Web/API buruk pasca-deploy | `git checkout <sha-sebelumnya>` → `build --no-cache` → `up -d --force-recreate` |
| **502 sitewide** (gejala BL-43) | `docker compose -f docker-compose.vps.yml up -d --force-recreate api worker web`, lalu `docker rm -f jago-akademi-nginx-1` bila ada. Verifikasi `docker port jago-akademi-web-1` = `3010` |
| `migrate deploy` berhenti di tengah | `migrate status` untuk tahu titik henti; migration sebelumnya **sudah ter-commit**. Jangan ulang buta — selesaikan penyebab (biasanya duplikat di 5.3) |
| Kerusakan data | Restore dari backup 5.1 via `scripts/restore.sh` (restore ke DB scratch dulu) |

- [ ] 10.1 Catat SHA sebelum deploy: `git rev-parse HEAD` di host
- [ ] 10.2 Pastikan backup 5.1 masih ada dan terverifikasi

---

### FASE 11 — Verifikasi akhir: seluruh environment sinkron

- [ ] 11.1 `git status --porcelain` → hanya untracked yang disengaja
- [ ] 11.2 `git log origin/main..HEAD` → kosong
- [ ] 11.3 Tiap perbaikan: `git merge-base --is-ancestor <sha> origin/main` → true
- [ ] 11.4 Host: `git rev-parse HEAD` == `origin/main`
- [ ] 11.5 `prisma migrate status` → 13/13 applied
- [ ] 11.6 Fingerprint 7.4 menunjukkan kode baru
- [ ] 11.7 CI `main` hijau; branch protection aktif
- [ ] 11.8 Perbarui **`docs/RUNBOOK_CI.md`** dengan jumlah test hasil ukur ulang
      (satu-satunya tempat angka test dicatat — jangan salin ke dokumen lain)
- [ ] 11.9 Perbarui `docs/BACKLOG.md` + tracker `CLAUDE.md`

---

## 6. HYGIENE DOKUMEN (murah, leverage tinggi)

15 baris backlog **stale-open** — sudah diperbaiki di kode tapi belum ditandai; ini terus
menghasilkan pekerjaan palsu:

- Tandai **resolved**: BL-02, 03, 04, 05, 06, 07, 14, 23, 24, 26, 34, 44, 45, 46 — dan
  **BL-39 setengah**. (Diverifikasi mandiri: BL-44 → `leads.ts:15` enum sudah memuat `"contact"`;
  BL-45 → placeholder `6281234567890` sudah tidak ada di codebase.)
- Koreksi `docs/ORPHAN_ROUTE_AUDIT.md:5` ("Belum ada kode diubah" — sudah tidak benar).
- Koreksi `docs/SECURITY_CHECKLIST.md:14` (tertulis 100/15m; kode = 500, `rateLimiter.ts:12`).
- Anotasi/arsipkan checklist yang murni drift: `05-IMPLEMENTATION-ROADMAP.md`
  (92 unchecked, 0 checked), `10-LAUNCH-CHECKLIST.md` (68 ☐, 0 checked),
  `dashboard-standardization-plan.md`.
- `nginx/nginx.conf` di repo **tidak** mencerminkan nginx live — hapus atau beri banner.

**Item tanpa BL ID (perlu dibuatkan):** 4 file route melebihi batas 400 baris §9.6
(`trainer.ts` 553, `admin/users.ts` 444, `eventService.ts` 427, `orders.ts` 414);
penunjukan DPO + ROPA (`PDP_COMPLIANCE_AUDIT.md:33,46`); backfill `totalSold` event
(`EVENT_REMEDIATION_PLAN.md:48`); 7 pertanyaan strategi di `implementation_plan2.md:606-627`.

---

## 7. CATATAN KRITERIA FASE (jujur)

Kriteria exit SSOT §9.12 **belum terpenuhi** untuk Fase 2, 3, dan 4 meski tracker menandainya
selesai/hampir selesai:

| Fase | Kriteria gagal | Angka nyata |
|---|---|---|
| 2 | coverage modul kritis ≥80% | 74.26/63.44/75.09/**75.51**; `dokuService` **43.75**, `affiliate` 49.35, `users` 37.07, `upload` 16.36, `certificateService` **1.36** |
| 2 | CI memblokir merah | branch protection **tidak aktif** |
| 2 | `npm audit` bersih | **6 high** |
| 3 | migration prod + restore drill | 7 pending; drill belum pernah |
| 3 | Sentry + alert | `SENTRY_DSN` kosong |
| 4 | Go/No-Go 10B | 4/9 |

Gate di `apps/api/vitest.config.ts:48-51` adalah **ratchet anti-regresi** (61/58/49/60),
**bukan** gate 80%. Ini konsisten dengan koreksi yang sudah tercatat di `CLAUDE.md`.

---

*Referensi penuh: `PROJECT_PROGRESS_REPORT_V2.md` (SSOT), `docs/BACKLOG.md`,
`docs/RUNBOOK_DB.md`, `docs/RUNBOOK_DEPLOY.md`, `docs/RUNBOOK_CI.md`.*
