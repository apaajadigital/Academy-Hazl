# E-Course Remediation — Report

> **Tanggal:** 28 Jul 2026 · **Branch:** `feat/ecourse-remediation` (dari `main`) · **Metode:** graphify + 4 Explore/investigasi agent. · **Validasi:** 2× build hijau + tsc + ESLint 0 + grep fungsional + spacing guard. · **Belum di‑merge** — menunggu konfirmasi reviewer.

Pendamping: `docs/ECOURSE_REMEDIATION_PLAN.md` (rencana + analisis route).

---

## 1. Ringkasan hasil

Dikerjakan **Fase 1 (Opsi A) penuh** + **bagian kode Fase 2 (Opsi B) yang bisa diselesaikan jujur** (kunci real). **Learning Path "fully working"** terbukti **terblokir konten** (bukan kode) — dijelaskan di §4, disusun sebagai epic siap‑eksekusi. Tidak ada data yang dipalsukan.

## 2. Tabel perbaikan (temuan → aksi → status)

| # | Temuan | Aksi | File | Status |
|---|---|---|---|---|
| **F1** | `MentorCourseGrid` menaut ke `/e-course/[kategori]/[topik]` yang **404** (flag OFF) — dead link di halaman mentor LIVE | Taut **sadar‑flag**: OFF → `/e-course` (landing hidup); ON → topic page real | `components/mentor/MentorCourseGrid.tsx` | ✅ Fixed |
| **F2** | `sitemap.ts` mengiklankan `/e-course/{courseSlug}` ke Google → **404 di semua kondisi** (slug kursus ≠ route kategori) | Hapus blok emisi kursus→`/e-course/{slug}` (salah struktural); dokumentasikan; katalog tetap via `/e-course` landing | `app/sitemap.ts` | ✅ Fixed |
| **F5** | `IS_LOCKED = true` **hardcoded stub** (auth belum di‑wire) | `SubscriptionLock` → **komponen client** cek entitlement **real** (`getValidToken` + `GET /api/subscription/me` → `isActive`, fail‑closed); halaman buang const stub | `components/e-course/shared/SubscriptionLock.tsx`, `[topik]/page.tsx`, `[materi]/page.tsx` | ✅ Fixed |
| **F3** | Subtree `/e-course/[kategori]/...` 404 (feature `learningPath` OFF) | **By design** (gated) — dikoreksi jadi flag‑aware; nyala penuh = epic §4 | — | ⏸️ Epic (blocked konten) |
| **F4** | Data katalog nested = **hardcoded fiktif** (`data.ts` studentCount "66.396", rating) — BL‑26 | Diganti wholesale saat DB‑backing (epic §4). Tidak render live (gated). **Tidak di‑scrub manual** karena akan dibuang bersama `data.ts` | — | ⏸️ Epic (blocked konten) |
| **F6** | Progress `percent={0}`, tombol aksi `disabled` placeholder | Real saat DB‑backing (epic §4) | — | ⏸️ Epic (blocked konten) |
| **F7** | Alur LIVE landing `/e-course` → `/api/courses` → `/checkout/[slug]` | Verifikasi (butuh API/DB live) | — | 🖐️ Reviewer‑gated |

## 3. Tabel pengecekan (2×)

| Cek | Ke‑1 | Ke‑2 | Hasil |
|---|---|---|---|
| `tsc --noEmit` | ✅ 0 error | ✅ (build ulang) | Lolos |
| ESLint `--max-warnings 0` | ✅ 0 warning | ✅ | Lolos |
| `next build` (semua route) | ✅ Compiled | ✅ Compiled | Lolos |
| Grep: stub `IS_LOCKED` live | — | ✅ 0 (sisa = komentar) | Lolos |
| Grep: `isLocked=` di halaman | — | ✅ 0 (self‑determine) | Lolos |
| Grep: sitemap emit `/e-course/${` | — | ✅ 0 (sisa = komentar) | Lolos |
| MentorCourseGrid sadar‑flag | — | ✅ `features.learningPath` | Lolos |
| SubscriptionLock cek `/api/subscription/me` | — | ✅ `getValidToken` + `isActive` | Lolos |
| `lint:spacing` (regresi) | — | ✅ clean | Lolos |

**Kesimpulan:** semua perubahan **presentation/link + UX‑lock**, build stabil 2×, tak ada regresi. Verifikasi fungsional penuh kunci‑real butuh subscriber aktif + API live (reviewer‑gated) — logikanya terverifikasi statis (endpoint benar, fail‑closed).

## 4. Opsi B (Learning Path real) — status jujur & epic tersisa

**Kenapa tidak bisa "fully working" sekarang** (temuan investigasi DB + `/belajar`):
1. **Nol konten belajar di DB.** 6 kursus ter‑seed sebagai kartu katalog, tapi **nol `CourseSection`, nol `CourseLesson`, nol video/quiz** — dan **tidak ada jalur kode** (seed/admin/trainer) yang membuat section/lesson. `GET /api/courses/:slug` → `sections: []`.
2. **Struktur beda.** DB: `Category → Course → Section → Lesson` (3 level). Tree marketing: `Category → Topic → Lesson → Chapter` (4 level). "Topic" tak punya rumah di DB; slug kategori pun beda (`marketing-digital` vs `digital-marketing`).
3. **Subscription‑unlock belum di‑wire.** Konten di‑gate per‑enrollment (`videos.ts`), bukan subscription. "Langganan buka semua kursus" belum ada.
4. Field marketing (`studentCount`, `rating`, `tutorQuote`, `isPortfolioProject`) tak punya kolom DB.

**Jadi "nyalakan flag → tampil konten" = halaman kosong.** Bukan "berfungsi". Membuatnya real = butuh **konten kursus asli** (tugas konten, bukan kode — **tidak boleh dipalsukan**, itu justru BL‑26).

**Epic tersisa (backlog, pasca Soft Launch — CLAUDE.md no‑new‑feature):**
1. **Keputusan model:** map `Topic→Course`, `Lesson→Section`, `Chapter→CourseLesson` **atau** tambah model `Topic`/`LearningPath` (migration). Rekonsiliasi slug kategori.
2. **Jalur authoring section/lesson** (belum ada) — admin/trainer bisa membuat kurikulum + upload video (kait BL‑32 storage R2/Stream).
3. **Konten real** diketik/di‑seed (tugas konten).
4. **Wire subscription→content unlock** di `videos.ts` (opsi all‑access).
5. **Rewire halaman** `[topik]/[materi]` dari `lib/e-course/data.ts` statik → fetch DB (`getCourseBySlug`/`getEnrollment`), progress real (`/api/progress`), buang `data.ts` fiktif. Pola sudah dipetakan dari sistem `/belajar` (reusable).
6. **Nyalakan flag** hanya setelah konten real + QA + no‑data‑fiktif.

> Sudah dicatat ke `docs/BACKLOG.md` (kait BL‑26/BL‑28/BL‑32).

## 5. File diubah (5)
- `components/mentor/MentorCourseGrid.tsx` — F1 taut sadar‑flag
- `app/sitemap.ts` — F2 hapus emisi 404
- `components/e-course/shared/SubscriptionLock.tsx` — F5 kunci real (client + subscription check)
- `app/(public)/e-course/[kategori]/[topik]/page.tsx` — buang stub `IS_LOCKED`
- `app/(public)/e-course/[kategori]/[topik]/[materi]/page.tsx` — buang stub `IS_LOCKED`
- (+ docs: plan, route‑map, report ini)

## 6. Batasan & governance
- Perubahan = presentation/link + UX‑lock; **tanpa** ubah API/DB/backend/routing/fitur (Fase 1) — aman.
- F5 client‑only (memanggil endpoint yang sudah ada); tak menyentuh backend.
- Epic §4 = fitur baru → backlog, pasca Soft Launch; migration DB human‑gated.
- Semua via branch/PR; tidak merge/deploy tanpa konfirmasi.
