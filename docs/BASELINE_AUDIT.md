# BASELINE AUDIT — TASK-000

> **Tujuan:** Menetapkan baseline faktual repo/build/test sebelum perubahan apa pun, mengubah klaim tier **[C] Claimed** menjadi **[V] Verified** atau **[F] Falsified**.
> **Task:** TASK-000 (Part VI, PROJECT_PROGRESS_REPORT_V2.md)
> **Tanggal eksekusi:** 2 Juli 2026
> **Sifat:** Read-only verification. **Tidak ada perbaikan dilakukan di task ini** (sesuai AC — hanya mencatat).
> **Environment:** Windows 11 · Node **v24.15.0** · npm **11.12.1** · Git Bash

---

## 1. Ringkasan Eksekutif Baseline

| Aspek | Klaim v1/V2 | Hasil Verifikasi | Verdict |
|-------|-------------|------------------|---------|
| Backend API build | "95% selesai" [C] | **TIDAK kompilasi** — 52 TS error | ❌ **[F] Falsified** |
| Frontend build | "92% selesai" [C] | **Build hijau** (exit 0), typecheck 0 error | ✅ **[V] Verified** |
| Test suite | "coverage ~60%" [C] | 256 test, **255 lulus / 1 gagal**; coverage % belum diukur | ⚠️ **[P] Partial** |
| CI/CD | "tidak ada" | Dikonfirmasi tidak ada `.github/workflows` | ✅ [V] |
| 76 file uncommitted | "53 baru + 23 modif" | **56 untracked + 23 modified** (79 entri) | ⚠️ Sedikit berbeda |

**Kesimpulan baseline:** Perbedaan **Code Completeness vs Production Readiness** yang dihipotesiskan V2 **TERBUKTI dan lebih parah dari perkiraan di sisi backend**. Backend "code-complete" ternyata **tidak lolos typecheck maupun lint**. Frontend jauh lebih sehat (build + typecheck bersih).

---

## 2. Git State (Verified)

```
Branch aktif   : redesign/light-theme
Total commit   : 3
  68b8154 feat: redesign with light theme, add API services, auth, dashboard, and LMS features
  f06fcd5 feat: implement homepage, mentor profile, and comprehensive e-course system...
  53af76b initial commit: add project files and documentation
Untracked (??) : 56 entri
Modified  ( M) : 23 file
Staged         : 0
```

> ⚠️ Beberapa entri untracked adalah **direktori** (`test/integration/events/`, `test/integration/phase8/`, `app/(public)/event/`, `app/trainer-hub/`, dll), sehingga jumlah **file** aktual > 56 saat di-expand. Angka "53 baru" di v1 adalah perkiraan; angka entri git aktual = 56 untracked.

### 2.1 Temuan Anomali Git
- 🔴 **`Claude Dekstop/` (typo) directory** — berisi salinan duplikat `PROJECT_PROGRESS_REPORT_V2.md` (95KB). Artefak liar, harus dibersihkan/di-gitignore di TASK-001.
- ⚠️ `PROJECT_PROGRESS_REPORT.md` & `PROJECT_PROGRESS_REPORT_V2.md` ada di root (untracked).
- ⚠️ Banyak file `docs/*.md` (02a-e, 09, 10, 10B/C/D) masih untracked — dokumentasi belum masuk version control.

---

## 3. Code Metrics (Verified — dihitung ulang dari source)

| Metrik | Klaim v1 | Aktual [V] | Catatan |
|--------|----------|-----------|---------|
| Prisma models | 41 | **41** | ✅ Sesuai |
| Prisma enums | — | **0** | Role pakai `String`, bukan enum |
| Schema baris | 756 | **756** | ✅ Sesuai |
| API route files | 26 | **26** | ✅ Sesuai |
| API endpoints | ~130 | **130** | ✅ Sesuai |
| API services | 13 | **13** | ✅ Sesuai |
| API middleware | 5 | **5** | ✅ Sesuai |
| API test files | 36 | **36** | ✅ Sesuai |
| API total tests | — | **256** | Baru terukur |
| Web pages (`page.tsx`) | 52 | **61** | ❗ v1 undercount (nesting dalam) |
| Web components | 36 | **36** | ✅ Sesuai |
| Web E2E specs | 7 | **7** | ✅ Sesuai |
| Docs (.md) | 18 | **18** | ✅ Sesuai |

---

## 4. Build / Typecheck / Test / Lint Results (Verified)

Matriks kondisi aktual saat audit:

| # | Check | Perintah | Hasil | Exit |
|---|-------|----------|-------|------|
| 1 | **API typecheck (src)** | `tsc --noEmit` | ❌ **FAIL — 52 error** | 2 |
| 2 | **API typecheck (test)** | `tsc -p tsconfig.test.json --noEmit` | ❌ **FAIL** (error yang sama menjalar) | 2 |
| 3 | **API build** | `npm run build` (`tsc`) | ❌ **FAIL — 52 error** (namun `dist/` tetap ter-emit) | 2 |
| 4 | **API test** | `npm run test` (`vitest run`) | ⚠️ **255 lulus / 1 GAGAL** (256 total, 36 file) | 1 |
| 5 | **API lint** | `npm run lint` (`eslint src`) | ❌ **FAIL** — `eslint.config.js` tidak ditemukan (ESLint v9 flat config) | 2 |
| 6 | **Web typecheck** | `next typegen && tsc --noEmit` | ✅ **PASS — 0 error** | 0 |
| 7 | **Web build** | `npm run build` (`next build`) | ✅ **PASS** — semua route ter-generate | 0 |
| 8 | **Web lint** | `npm run lint` (`eslint --max-warnings 0`) | ❌ **FAIL** — 24 **warning** (0 error), diblok `--max-warnings 0` | 1 |

> **Catatan kunci:** Test API **lolos meski 52 type error** karena Vitest (esbuild) mentranspilasi tanpa type-checking. Artinya **type-safety tidak dijalankan** di test path — bug tipe tersembunyi bisa lolos ke runtime (dibuktikan oleh test #4 yang gagal).

---

## 5. Rincian Kegagalan

### 5.1 API TypeScript — 52 Error (P0 untuk TASK-002)

**Distribusi per file:**
| File | Error | Indikasi |
|------|-------|----------|
| `src/routes/trainer.ts` | **21** | Referensi field Prisma tak ada: `Course.instructorId`, `OrderItem.price`/`courseId`, `Course.enrollments`/`sections`/`_count` |
| `src/routes/lms.ts` | **14** | `LmsEnrollment` include `user`/`progress`/`course`/`certificate` tidak ada di schema; `LmsCertificate.user` tak ada |
| `src/routes/courses.ts` | 4 | `string \| undefined` diteruskan ke param `string` |
| `src/routes/quiz.ts` | 2 | `QuizQuestion.answer` tidak ada |
| `src/routes/certificates.ts` | 2 | `string \| undefined` |
| `src/services/audit/log.ts` | 2 | — |
| `src/routes/{reviews,enrollments,dashboard}.ts` | 1 each | `PaginationMeta.avgRating` tak ada; Decimal vs number |
| `src/services/{search,enrollment,certificate,auth}` | 1 each | — |

**Distribusi per kode error:**
| Kode | Jumlah | Arti |
|------|--------|------|
| TS2339 | 20 | Property tidak ada pada type |
| TS2353 | 10 | Object literal property tak dikenal |
| TS2345 | 6 | Argumen tipe tak cocok |
| TS2322 | 5 | Assignment tipe tak cocok |
| TS7006 | 3 | Parameter implicit `any` |
| TS18048 | 3 | Possibly `undefined` |
| TS2551/2769/2724/2365 | 4 | Lain-lain |

**Interpretasi:** `trainer.ts` & `lms.ts` (fitur Fase 7-8) tampaknya **ditulis tanpa pernah di-typecheck** terhadap schema Prisma final. Kode mereferensikan relasi/field yang **tidak ada di `schema.prisma`**. Ini menandakan sebagian "fitur selesai" mungkin **tidak berfungsi benar di runtime** (dikonfirmasi oleh §5.2).

### 5.2 API Test — 1 Gagal (Bug Runtime Nyata)

```
FAIL test/integration/lms/invites.test.ts
  > POST /api/lms/invite/:token/accept > accepts a valid invite and adds to batch
  AssertionError: expected 500 to be 200
  Sumber error: apps/api/src/routes/lms.ts:288
```
Endpoint accept-invite melempar 500 (bukan 200). Konsisten dengan error tipe di `lms.ts` — kemungkinan besar query Prisma dengan include yang salah. **Bug fungsional nyata**, bukan sekadar noise tipe.

### 5.3 API Lint — Config Hilang
ESLint v9 butuh `eslint.config.js` (flat config). App `apps/api` tidak memilikinya (hanya `@repo/eslint-config` di devDeps tapi tak ter-reference). Lint tidak pernah bisa jalan di API.

### 5.4 Web Lint — Warning Diblok
24 warning, **0 error**. Semua bertipe `turbo/no-undeclared-env-vars` (env `CI` di `playwright.config.ts` tidak dideklarasikan di `turbo.json`). Diblok karena `--max-warnings 0`. Isu konfigurasi ringan, bukan cacat kode.

---

## 6. Perbedaan Klaim vs Realita (untuk resolusi INC & tier)

| Klaim | Tier awal | Realita terverifikasi | Tier baru |
|-------|-----------|----------------------|-----------|
| "Backend API 95% selesai" | [C] | Tidak typecheck (52 err), tidak lint, 1 endpoint 500 | ❌ **[F]** — "code ada" ≠ "compiles/works" |
| "Frontend 92% selesai" | [C] | Build + typecheck bersih | ✅ **[V]** (lint strictness minor) |
| "Coverage ~60%" (INC-07) | [C] | 255/256 test lulus; **% coverage belum diukur** | ⚠️ **[P]** — ukur di TASK-010 |
| "52 pages" | [C] | **61** `page.tsx` | 🔧 koreksi |
| "76 file uncommitted" | [C] | 56 untracked + 23 modified | ✅ ~sesuai |
| "Tidak ada CI/CD" | [C] | Dikonfirmasi | ✅ [V] |
| Payment DOKU (INC-01) | — | `dokuService.ts` ada; belum diverifikasi runtime | ⏳ TASK-030 |
| Redis/BullMQ (INC-04) | ghost | Tidak ada implementasi di `src/` | ✅ [V] ghost |
| OneSignal (INC-03) | ghost | Tidak ada di `src/` | ✅ [V] ghost |
| Marketplace (INC-06) | ghost | Tidak ada route/halaman | ✅ [V] ghost |

> **Pembaruan 29 Jul 2026 (baris Marketplace/INC-06):** baris di atas adalah kondisi baseline saat TASK-000 dan **tidak dihapus** (dokumen historis). Kondisi sekarang: `/marketplace` **sudah ada dan live** — `apps/web/app/(public)/marketplace/page.tsx` bukan placeholder, menarik data nyata dari `GET /api/ebooks` dan menjual e-book asli (kartu menaut ke `/ebook/{slug}`); ditautkan dari Navbar, Footer, homepage `CategoryGrid`, dan `sitemap.ts`. Namun **backend marketplace tetap nol** — tidak ada route/service di `apps/api` dan tidak ada model Prisma (`MarketplaceProduct`/`Bundle`/`Package`/`Cart`). Jadi status akuratnya: **facade di atas domain E-Book, bukan unit bisnis mandiri** (bukan lagi "ghost", tapi juga belum unit-6). Backend marketplace sesungguhnya = **TASK-042, belum dikerjakan, tetap Phase 6**, masih blocked oleh TASK-098 (Cloudflare R2 / BL-32).

---

## 7. Implikasi untuk Roadmap

1. **TASK-002 (build verification) naik jadi lebih berat dari perkiraan** — bukan sekadar "pastikan hijau", tapi **perbaiki 52 type error** yang mengindikasikan mismatch schema↔kode. Effort revisi: **M → L**.
2. **TASK-001 (commit)** tetap P0 & aman dilakukan lebih dulu — mengamankan kode apa adanya (termasuk yang error) lebih baik daripada kehilangan. Type-fix dilakukan di TASK-002 setelah repo aman.
3. **Bug `lms.ts:288`** harus masuk daftar fix TASK-002 dengan **regression test** (§9.8 aturan).
4. **API lint config** perlu diperbaiki (tambah `eslint.config.js` referensi `@repo/eslint-config`) — masuk TASK-002/004.
5. **Coverage sebenarnya** wajib diukur di TASK-010 (`vitest --coverage`) — angka 60% tidak dipakai.
6. **`Claude Dekstop/` + docs untracked** dibersihkan/di-commit di TASK-001.

---

## 8. Rekomendasi Urutan (tidak mengubah dependency graph V2)

Urutan tetap sesuai Part IV: **TASK-000 (ini) → TASK-001 (commit) → TASK-002 (build fix, kini termasuk 52 type error + bug lms + eslint config) → ...**

Tidak ada penyimpangan dari SSOT. Hanya **estimasi effort TASK-002 dinaikkan** dan cakupannya diperjelas berdasarkan bukti audit ini.

---

## 9. Lampiran — Perintah yang Dijalankan

```bash
# Git state
git status --porcelain ; git log --oneline --all ; git branch --show-current

# Metrics
grep -cE '^model ' apps/api/prisma/schema.prisma          # 41
grep -rhcE 'router\.(get|post|patch|put|delete)\(' apps/api/src/routes/*.ts  # 130
find apps/web/app -name page.tsx | wc -l                  # 61

# Verification
cd apps/api && npx tsc --noEmit                            # 52 errors
cd apps/api && npm run test                                # 255/256 pass
cd apps/api && npm run lint                                # FAIL (no eslint config)
cd apps/api && npm run build                               # FAIL (52 errors)
cd apps/web && npx tsc --noEmit                            # 0 errors
cd apps/web && npm run build                               # PASS (exit 0)
cd apps/web && npm run lint                                # FAIL (24 warnings)
```

---

*TASK-000 selesai. Baseline faktual ditetapkan. Menunggu konfirmasi reviewer sebelum TASK-001 (per instruksi eksekusi & Part IX §9.6).*
