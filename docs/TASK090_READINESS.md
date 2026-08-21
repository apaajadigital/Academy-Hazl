# TASK-090 Learning Path — Readiness Audit

> Dibuat: 21 Agu 2026 | Auditor: Claude Code (opus) | Status: READ-ONLY

## 1. Schema — Chain Lengkap

Model sudah ada: CourseCategory, Course, CourseSection, CourseLesson, CourseEnrollment, CourseLessonProgress.
TIDAK ada model LearningPath — taksonomi belum punya representasi DB.

KRITIS: CourseSection dan CourseLesson tidak punya index pada FK courseId/sectionId.
Harus ditambah sebelum seed konten (index lebih mahal setelah tabel terisi).

## 2. Seed — Section/Lesson Kosong

seed.ts hanya buat 3 CourseCategory. Nol CourseSection/CourseLesson.
Player DB-backed tidak punya konten.

## 3. Gating /e-course — Sudah Benar

Dua lapis: dynamicParams=false + generateStaticParams return [].
Flag NEXT_PUBLIC_FEATURE_LEARNING_PATH=OFF sudah melindungi semua sub-route.

## 4. Asimetri Subscription vs videos.ts

- Web SubscriptionLock.tsx: sudah cek subscription
- API videos.ts:29-37: tidak cek subscription — subscriber tanpa enrollment dapat 403

## 5. Temuan Utama — Dua Dunia Terputus

Halaman learning path baca data.ts (1514 baris hardcoded), bukan DB.
Wire subscription ke videos.ts TIDAK akan menghidupkan halaman — halaman tidak memanggilnya.
Inti Wave 1 = migrasi taksonomi data.ts ke DB.

RISIKO KONTEN: data.ts punya tutorName fiktif (Ahmad Fauzi dll) di CategoryHero.tsx.
Flag tidak boleh di-flip sebelum data tutor bersih (sekelas BL-114).

## 6. Urutan Wave 1

1. Tambah index CourseSection.courseId + CourseLesson.sectionId (migration kecil)
2. Seed Section/Lesson nyata
3. Migrasi taksonomi data.ts ke DB (inti, 3-5 PR)
4. Wire subscription di videos.ts
5. Gate tutor fiktif di CategoryHero sebelum flip flag

## 7. Estimasi

Total MVP: 6-9 PR, 2-3 minggu kerja.

## 8. Keputusan Dibutuhkan Owner

1. Scope Wave 1 = migrasi taksonomi data.ts ke DB?
2. Gate tutor fiktif sekarang atau tunggu Wave 1?
3. PR terpisah untuk index DB sebelum Wave 1?
