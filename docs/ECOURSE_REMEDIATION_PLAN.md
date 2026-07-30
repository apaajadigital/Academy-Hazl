# E-Course Route — Implementation Plan (Penyelesaian Temuan)

> **Tanggal:** 28 Jul 2026 · **Basis:** analisis route E-Course (graphify + 2 Explore agent). · **Governance:** CLAUDE.md — no‑new‑feature Phase 1–4; satu task = satu branch/PR; tunggu reviewer. · **Sumber temuan:** dead‑link/404, data fiktif, stub auth, konten kosong.

## 0. Ringkasan temuan

| # | Temuan | Tipe | Live sekarang? | Severity |
|---|---|---|---|---|
| **F1** | `MentorCourseGrid.tsx:25` menaut ke `/e-course/[kategori]/[topik]` yang **404** (flag `learningPath` OFF) — di halaman `/mentor/[slug]` yang LIVE | Dead link → 404 | ✅ **YA (live)** | 🔴 High |
| **F2** | `sitemap.ts:46` mengiklankan `/e-course/{kategori}` ke mesin pencari, padahal URL itu **404** saat flag OFF | SEO / 404 | ✅ **YA (live)** | 🟠 Medium |
| **F3** | Seluruh subtree `/e-course/[kategori]/[topik]/[materi]` **404** (feature `learningPath` OFF, `dynamicParams=false`) | Kosong / fitur belum jadi | ⚙️ Gated (by design) | 🟠 Medium |
| **F4** | Katalog nested = **data hardcoded fiktif** (`lib/e-course/data.ts`: siswa "66.396", rating 4.9, dll) — melanggar no‑data‑fiktif (BL‑26/BL‑28) | Data salah | ⚙️ Gated (tak render) | 🟠 Medium |
| **F5** | `IS_LOCKED = true` **hardcoded** di `[topik]/page.tsx:32` & `[materi]/page.tsx:41` (stub, komentar "Replace with auth session check") | Stub auth | ⚙️ Gated | 🟡 Low |
| **F6** | Progress `percent={0}` hardcoded, semua chapter `isLocked:true`, tombol aksi (Sertifikat/LinkedIn/Komunitas/Jadwal) `disabled` placeholder | Konten kosong/stub | ⚙️ Gated | 🟡 Low |
| **F7** | (verifikasi) Alur LIVE landing `/e-course` → `GET /api/courses` → `/checkout/[slug]` harus dipastikan benar‑benar jalan (data real + checkout) | Verifikasi | ✅ Live | 🟠 Medium |

**Insight kunci:** subtree learning‑path memang **sengaja di‑gate OFF** (karena datanya fiktif) — jadi F3–F6 **bukan bug liar**, tapi "fitur belum selesai". Yang benar‑benar **rusak live** hanya **F1 & F2** (link/SEO menuju 404) + **F7** (alur beli perlu dipastikan). Landing `/e-course` sendiri sudah pakai data real (`/api/courses`).

---

## 1. Keputusan strategis (pilih arah)

| Opsi | Isi | Kapan |
|---|---|---|
| **A — Keep gated + tutup semua pintu ke 404** *(Rekomendasi sekarang)* | Subtree tetap OFF; hapus/redirect semua **link live** yang menuju ke sana; sitemap bersih; pastikan alur landing→checkout jalan. Cepat, aman, **sesuai no‑new‑feature Phase 1–4**. | Sekarang (pre/pasca Soft Launch) |
| **B — Bangun Learning Path real** | Wire subtree ke DB (kategori/topik/lesson/progress nyata), auth‑lock real, hapus data fiktif, lalu nyalakan flag. Ini **EPIC** (fitur baru). | Setelah Soft Launch (EPIC 7 territory) |

> Keduanya tidak eksklusif: **kerjakan A dulu** (hilangkan 404 live), lalu **B** sebagai epic terjadwal. Di bawah ini plan untuk keduanya.

---

## FASE 1 — Quick Remediation (Opsi A) — aman, bisa sekarang

Semua presentation/link‑level; tanpa fitur baru; flag tetap OFF.

**Step 1 — Fix F1 (dead link Mentor).** `components/mentor/MentorCourseGrid.tsx:25`.
- Jadikan taut **sadar‑flag**: `import { features } from "@/lib/features"`. Bila `features.learningPath` OFF → arahkan ke target yang hidup (mis. `/e-course` landing, atau `/checkout/${course.slug}` bila kartu merepresentasikan kursus real), **atau** sembunyikan grid/kartu deep‑link itu.
- Dep: — · **S** (1 file). Checklist: tak ada lagi `<Link>` mentor yang menuju URL 404.

**Step 2 — Fix F2 (sitemap 404).** `app/sitemap.ts:46`.
- Bungkus entri `/e-course/{kategori}` dengan guard `features.learningPath` (hanya emit bila ON). Saat OFF, sitemap hanya memuat `/e-course` (landing) — tak mengiklankan URL 404.
- Dep: — · **S**. Checklist: `sitemap.xml` tak memuat path kategori saat flag OFF.

**Step 3 — Audit menyeluruh pintu masuk lain.** `grep -rn "/e-course/\${" apps/web` + review manual.
- Pastikan **tak ada** komponen yang **dirender di luar** subtree (mis. home, dashboard, mentor, blog) yang menaut ke `/e-course/<kategori>/...`. Yang berada **di dalam** subtree (CategorySectionRow, LessonCard, TopicHero/LessonHero breadcrumb, ProgressTrackerSection) **aman** — hanya render saat flag ON, jadi self‑consistent. Konfirmasikan pemisahan ini.
- Dep: 1 · **S**.

**Step 4 — Custom not‑found untuk /e-course (jaring pengaman UX).**
- Tambah `app/(public)/e-course/[kategori]/not-found.tsx` (atau andalkan `app/not-found.tsx` global) dengan CTA jelas kembali ke `/e-course`. Agar bila ada URL nyasar (bookmark lama, crawler), user tak buntu.
- Dep: — · **S** (opsional tapi disarankan).

**Step 5 — Verifikasi F7 (alur live beli).**
- Cek `ECourseCatalog.tsx:146` `GET /api/courses` mengembalikan data real (bukan kosong) di lingkungan target; kartu → `/checkout/${slug}` → order → DOKU. Bila katalog kosong, tampilkan empty‑state jujur (sudah ada `EmptyState`). Konfirmasi checkout `[slug]` resolve untuk `itemType=course`.
- Dep: — · **M** (butuh API/DB live — reviewer‑gated).

**Step 6 — Validasi Fase 1.** `tsc` + ESLint 0 + `build`; grep akhir nol dead‑link; smoke `/mentor/[slug]` (link tak 404) + `sitemap.xml` bersih. Commit atomik, PR, tunggu reviewer.

---

## FASE 2 — Build Learning Path Real (Opsi B) — EPIC, pasca Soft Launch

> Fitur baru → **hanya setelah Soft Launch** (CLAUDE.md §d.3). Masuk backlog sebagai epik. Ringkasan roadmap:

**Step A — Model & endpoint data real.** Ganti sumber static `lib/e-course/data.ts` → DB. Butuh: skema/relasi kategori→topik→lesson→chapter (atau map ke `Course`/`Lesson` yang sudah ada), + endpoint (`GET /api/learning-path/...` atau reuse `courses`/`categories`). Hapus literal fiktif (F4).

**Step B — Ganti lookup static → fetch.** `utils.ts` (`getCategoryBySlug`, dst.) dari sinkron in‑memory → data loader (server component fetch / `generateStaticParams` dari DB). Pertahankan `dynamicParams` sesuai strategi ISR.

**Step C — Auth‑lock real (F5).** Ganti `IS_LOCKED = true` → cek session + entitlement (enrollment/subscription aktif) via token/`/api/auth/me` + `/api/enrollments`/subscription. `SubscriptionLock` tampil hanya bila user memang belum berhak.

**Step D — Progress real (F6).** `percent` & `isLocked` per chapter dari `/api/progress`; hapus placeholder 0%. Aktifkan tombol aksi (Sertifikat/Komunitas/dll) hanya bila fiturnya nyata; jika belum, biarkan tergate (jangan tampilkan tombol mati).

**Step E — Nyalakan flag + QA.** Set `NEXT_PUBLIC_FEATURE_LEARNING_PATH=on` **hanya** setelah data real + auth + progress lolos QA + no‑data‑fiktif terverifikasi. Balikkan Step 1/2 guard (mentor link & sitemap otomatis ikut hidup karena sadar‑flag).

---

## 2. Definisi Done
- **Fase 1:** nol link **live** menuju URL 404 (F1); sitemap tak memuat URL ter‑gate (F2); alur landing→`/api/courses`→checkout terverifikasi (F7); `tsc`/ESLint/`build` hijau; flag tetap OFF; PR menunggu reviewer.
- **Fase 2 (epic):** subtree memakai data DB (nol fiktif), auth‑lock & progress real, flag ON setelah QA.

## 3. Batasan & governance
- Fase 1 = presentation/link‑level, **bukan fitur baru** → boleh sekarang.
- Fase 2 = fitur baru → **backlog/EPIC, pasca Soft Launch**; catat ke `docs/BACKLOG.md` (kait BL‑26/BL‑28 data fiktif, BL‑32 video storage bila lesson pakai video).
- Semua lewat branch/PR; **tidak** merge/deploy tanpa konfirmasi reviewer. Aksi live (verifikasi API/DB) reviewer‑gated.

## 4. Catatan cakupan
Plan ini menyelesaikan temuan **route E-Course** (dari analisis terakhir). Jika Anda ingin plan serupa untuk **seluruh app** (audit menyeluruh semua route: link mati, empty‑state, 404, data fiktif lintas halaman), itu audit terpisah yang lebih besar — bisa saya siapkan bila diminta.
