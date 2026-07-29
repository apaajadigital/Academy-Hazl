# Remediasi Route Trainer Program — 29 Jul 2026

> Branch kerja: `fix/trainer-remediation`. Backlog: **BL-69 … BL-78** di `docs/BACKLOG.md`.
> Dokumen ini adalah ringkasan operasional untuk reviewer. Detail temuan ada di BACKLOG.

## 1. Ruang lingkup

Audit menemukan bahwa "Trainer Program" sebenarnya **dua route terpisah yang tidak saling terhubung**:

| | `/trainer-program` | `/trainer-hub/**` |
|---|---|---|
| Sifat | Landing marketing publik | Dashboard privat role `trainer` |
| Auth | Tidak ada (publik) | Guard client-side + `requireTrainer` di API |
| API | `POST /api/leads` | `GET/PATCH/POST /api/trainer/*` |
| Masuk dari | Navbar, Footer, CategoryGrid, sitemap | Hanya redirect berbasis role setelah login |

Keputusan owner (29 Jul 2026): halaman `/trainer-program` **tetap live** dan menerima lead. Flag
`trainerProgram` yang yatim dihapus, badge "Segera hadir" di homepage dihapus.

## 2. Ringkasan perubahan

**Keamanan (P0)**
- IDOR `PUT /api/courses/:id` ditutup dengan scope kepemilikan (404, bukan 403) — BL-69.
- Double-spend `POST /api/trainer/payouts` ditutup dengan transaksi Serializable — BL-70.
- Guard "super admin terakhir" dibuat benar-benar berlaku di 3 jalur — BL-73, BL-74.

**Kebenaran data uang**
- Saldo payout mengurangi refund yang masih tercatat pada order `paid` — BL-71.
- Seluruh aritmetika saldo pindah ke `Prisma.Decimal`, ROUND_DOWN 2 desimal — BL-72.
- `netRevenue` dashboard & analytics kini refund-adjusted (field lama tidak diubah namanya).

**Konfigurasi deploy**
- Rewrite `/api/*` tidak lagi bisa menunjuk dirinya sendiri — BL-75.

**Funnel & kualitas**
- Endpoint grant/revoke role admin + audit log — BL-76.
- Pagination payout, N+1 analytics, `dropOffRate` negatif — BL-77.

## 3. Endpoint baru

| METHOD + PATH | Guard | Catatan |
|---|---|---|
| `POST /api/admin/users/:id/roles` | `authenticate` + `requireAdmin` | Body `{ role }`. **Idempoten**: grant ulang → 200 `granted:false`, bukan error. 400 role tak dikenal · 404 user tak ada. |
| `DELETE /api/admin/users/:id/roles/:role` | idem | 400 self-revoke `super_admin` · 409 `LAST_SUPER_ADMIN` · 404 user/role tak ada. |

Field response **baru** (aditif, tidak ada yang dihapus/diganti nama):
- `GET /api/trainer/dashboard` → `refundedRevenue`, `committedPayouts`, `availableBalance`
- `GET /api/trainer/courses/:id/analytics` → `refundedRevenue`
- `GET /api/trainer/payouts` → `meta` pagination (`total`, `page`, `limit`); `data` tetap array datar

Endpoint tambahan dari penuntasan BL-111 (sebelumnya bernomor BL-79; dinomori ulang 29 Jul 2026 karena bentrok dengan BL-79 batch LMS — lihat BL-81):

| METHOD + PATH | Guard | Catatan |
|---|---|---|
| `GET /api/trainer/courses` | `authenticate` + `requireTrainer` | List ringan terpaginasi. Bentuk item dikunci ke mapper bersama `toTrainerCourseListItem`, identik dengan `data.courses[]` pada `/dashboard`. Menggantikan over-fetch di `/trainer-hub/kursus`. |

Frontend trainer-hub sudah menampilkan `availableBalance` sebagai KPI utama ("Saldo Bisa Ditarik")
plus rincian saldo, dengan degradasi aman bila field belum tersedia.

## 4. 🖐️ Tindakan reviewer (human-gated, SSOT §9.6)

### 4.1 Migration — BELUM di-apply
Tiga migration ditulis manual, **tidak** dijalankan (`prisma migrate dev` sengaja tidak dipakai):

| Folder | Isi |
|---|---|
| `20260729000000_trainer_payout_indexes` | `trainer_payouts(trainerId)`, `trainer_payouts(status)` |
| `20260729000001_user_roles_global_unique` | Partial unique index `user_roles(userId, role) WHERE tenantId IS NULL` |
| `20260729000002_refund_status_index` | `refunds(status)` |

Sebelum `prisma migrate deploy`:
1. Jalankan query pre-flight yang ada di header `20260729000001` untuk mendeteksi baris
   `user_roles` duplikat. **Jika ada duplikat, index gagal dibuat.** Penghapusan baris tidak
   disertakan karena manusia yang harus memutuskan baris mana yang bertahan.
2. Ambil backup (`scripts/backup.sh`) sebelum apply.

⚠️ **Drift schema yang disengaja**: partial index tidak bisa diekspresikan di Prisma DSL, jadi
tidak ada di `schema.prisma`. `prisma migrate diff` / `migrate dev` akan mengusulkan
`DROP INDEX "user_roles_userId_role_global_key"` — **abaikan usulan itu**. `migrate deploy`
(jalur produksi) tidak terpengaruh. Alasannya ditulis di header file migration.

### 4.2 Env proxy `/api/*` — runbook SUDAH diperbaiki, env host belum

**Sudah beres di repo** (tidak perlu tindakan reviewer):
- `docs/RUNBOOK_DEPLOY_RELEASE_JUL2026.md:35` yang dulu menetapkan `NEXT_PUBLIC_API_URL=https://jagoakademi.com`
  (origin **web**, memicu proxy loop) kini `https://api.jagoakademi.com`, selaras dengan
  `docs/RUNBOOK_DEPLOY.md`. Kedua runbook tidak lagi bertentangan.
- Kedua runbook punya bagian proxy khusus (`RELEASE_JUL2026` §0.1, `RUNBOOK_DEPLOY` §3.1) yang
  memisahkan `NEXT_PUBLIC_API_URL` (origin API untuk **browser**) dari `API_PROXY_TARGET` (origin
  **internal** untuk rewrite server-side, sengaja bukan `NEXT_PUBLIC_*` agar tidak bocor ke bundle klien).
- `API_PROXY_TARGET` terdaftar di `turbo.json` `globalEnv` dan dipakai `apps/web/next.config.js`
  dengan urutan `API_PROXY_TARGET` → `NEXT_PUBLIC_API_URL` → `http://localhost:4000`. Bila variabel
  baru itu tidak di-set, perilakunya **identik dengan sebelumnya**. Seluruh guard lama dipertahankan.

**🖐️ Sisa untuk reviewer (di host, bukan di repo):**
1. Set nilai env yang benar di `/var/www/jago-akademi/.env` — `NEXT_PUBLIC_API_URL` **≠**
   `NEXT_PUBLIC_SITE_URL`. Untuk topologi `docker-compose.vps.yml` (tanpa subdomain api), set
   `API_PROXY_TARGET=http://api:4000`.
2. **Rebuild image web** — bukan restart (lihat jebakan ops di bawah):
   `docker compose -f docker-compose.vps.yml build --no-cache web` lalu `up -d --force-recreate web`
   (**tanpa** `--remove-orphans` — nginx adalah orphan container di VPS ini).
3. Bila memakai `API_PROXY_TARGET`: wiring build-arg **sudah terpasang di repo**
   (`apps/web/Dockerfile` `ARG`, `docker-compose.prod.yml` + `vps.yml` `build.args`,
   `.github/workflows/deploy.yml` `build-args`, plus contoh di `.env.example`). Yang tersisa hanya
   menetapkan nilainya: `API_PROXY_TARGET=http://api:4000` di `/var/www/jago-akademi/.env`, dan
   repository variable dengan nama sama bila deploy lewat CI. Tidak di-set = perilaku lama.

Sampai env host diperbaiki, guard membuat `/api/*` gagal cepat (ECONNREFUSED, perilaku lama)
alih-alih membentuk proxy loop.

> **Jebakan ops:** `rewrites()` di-bake saat **BUILD** untuk output standalone. Mengubah
> `environment:` di compose lalu `restart` **tidak** memindahkan target proxy. Wajib rebuild
> image web dengan build-arg.

### 4.3 Jalur uang
BL-70, BL-71, BL-72 menyentuh perhitungan payout trainer. Per SSOT §9.6 ini butuh review manusia
sebelum merge, dan verifikasi di staging sebelum menyentuh data produksi.

## 5. Hasil verifikasi

| Gate | Hasil |
|---|---|
| `apps/api` → `tsc --noEmit` | ✅ 0 error |
| `apps/api` → `prisma validate` | ✅ valid |
| `apps/api` → `npm run lint` | ✅ 0 warning |
| `apps/api` → `vitest run` | ✅ **708/708** (79 file) |
| `apps/web` → `tsc --noEmit` | ✅ 0 error |
| `apps/web` → `npm run lint` | ✅ 0 warning (`--max-warnings 0`) |
| `apps/web` → `npm run build` | ✅ compiled |

E2E Playwright **tidak** dijalankan (butuh server hidup; ada masalah stale-server yang diketahui).
Reviewer-gated.

### 4.4 🖐️ Audit data sebelum deploy (BL-111)

Reduksi role global-only (BL-78b) mengasumsikan role platform disimpan `tenantId = NULL`. Seluruh
penulis role di kode memang begitu (`seed.ts:96,142`, `register.ts:50`, `oauth.ts:51`,
`admin/users.ts:296`), tapi baris yang dimasukkan lewat SQL manual di host tidak bisa diverifikasi
dari repo. **Jalankan sebelum deploy:**
```sql
SELECT "userId", role, "tenantId" FROM user_roles
WHERE "tenantId" IS NOT NULL AND role NOT IN ('lms_admin','lms_employee');
```
Hasil non-kosong = orang yang akan kehilangan akses setelah deploy. Kosong = aman.

## 6. Catatan lingkungan kerja

Working tree sesi ini memuat **empat pekerjaan paralel** (Event, LMS/mentor, kelas-gratis, trainer)
dan branch berpindah sendiri tiga kali (`feat/mentor-navigation` → `fix/lms-route-remediation` →
`fix/kelas-gratis-remediation`). Akibatnya sebagian perubahan web trainer (`next.config.js`,
`lib/features.ts`, `dashboard/layout.tsx`, `admin/layout.tsx`, `BACKLOG.md`) **ikut ter-commit ke
dalam commit sesi lain** dan tidak lagi muncul sebagai perubahan tertunda — isinya sudah diverifikasi
utuh, tapi jejak PR-nya bercampur. Sisa perubahan trainer masih **belum di-commit**; lihat §7.

## 7. File milik remediasi trainer

**apps/api**
```
src/routes/courses.ts                 src/routes/trainer.ts
src/routes/admin.ts                   src/routes/users.ts
src/services/course/courseService.ts  src/services/payout/trainerPayoutService.ts   (baru)
src/modules/admin/users.ts            src/types/index.ts
prisma/schema.prisma                  (hanya @@index)
prisma/migrations/20260729000000_trainer_payout_indexes/                            (baru)
prisma/migrations/20260729000001_user_roles_global_unique/                          (baru)
prisma/migrations/20260729000002_refund_status_index/                               (baru)
test/integration/courses/course-ownership.test.ts                                   (baru)
test/integration/trainer/trainer-payouts.test.ts                                    (baru)
test/integration/trainer/trainer-analytics.test.ts                                  (baru)
test/integration/admin/user-roles.test.ts                                           (baru)
test/integration/users/self-delete.test.ts                                          (baru)
test/integration/admin/users-export.test.ts                                         (mock disesuaikan)
test/integration/phase8/trainer-reviews-blog.test.ts                                (mock disesuaikan)
```

**apps/web**
```
next.config.js                        lib/features.ts
components/home/CategoryGrid.tsx      components/landing/LandingTemplate.tsx
components/landing/LeadCaptureForm.tsx
app/(public)/trainer-program/page.tsx
app/trainer-hub/layout.tsx            app/trainer-hub/profil/page.tsx
app/trainer-hub/payout/page.tsx       app/trainer-hub/kursus/page.tsx
app/dashboard/layout.tsx              app/admin/layout.tsx
```

**docs**
```
docs/BACKLOG.md                       (BL-69 … BL-78)
docs/TRAINER_REMEDIATION_REPORT.md    (dokumen ini)
```

⚠️ `apps/web/next.config.js` disunting **dua sesi** (trainer + LMS/mentor). Periksa diff-nya
sebelum commit agar perubahan sesi lain tidak ikut terbawa atau malah terhapus.
