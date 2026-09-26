# Design Spec: Community Feed + Gamifikasi (Hazl Academy)

- **Status:** Draft — menunggu review user sebelum lanjut ke implementation plan
- **Tanggal:** 2026-09-26
- **Diturunkan dari:** riset kompetitif Skool.com + yapp.ink (spike, sesi sama)
- **Konteks kerja:** LOKAL SAJA — `/Users/irfanpanduaji/Documents/Project Aji/HAZL Academy`. Tidak ada git push/commit/deploy sebagai bagian dari spec ini.

## 1. Latar Belakang

Riset kompetitif terhadap Skool.com (community + course platform) dan yapp.ink
(creator monetization platform, Indonesia) menemukan bahwa Hazl Academy sudah
punya LMS yang matang (Course, Section, Lesson, Quiz, Enrollment, Progress,
Certificate) tapi:

- Halaman `/komunitas` saat ini hanyalah landing page lead-capture (`POST
  /api/leads` dengan `source: "community"`) — bukan tempat interaksi
  fungsional. User mengisi form lalu tidak ada tempat untuk kembali.
- Flag `features.gamification` (`apps/web/lib/features.ts`) sudah dideklarasikan
  sejak lama tapi **tidak dibaca oleh kode manapun** — forward declaration
  kosong untuk EPIC 7.
- Tidak ada model data untuk post/comment/like di skema Prisma manapun.

Model gamifikasi Skool.com (poin dari like → level → gate konten) terbukti jadi
diferensiator dibanding forum/Facebook Group biasa (dikonfirmasi dari
studi kasus `skool.com/aivideoskool` dan review Trustpilot independen).
yapp.ink (all-in-one creator monetization: tip, produk digital, overlay
stream) filosofinya berbeda arah — target individual creator monetization,
bukan institutional LMS — sehingga **tidak diadopsi** di spec ini; ini
murni keputusan scope, bukan penilaian kualitas platform tersebut.

## 2. Keputusan yang Sudah Disetujui User

Selama sesi brainstorming interaktif, keputusan berikut sudah dikonfirmasi
satu per satu dan TIDAK terbuka untuk diubah tanpa sesi baru:

1. **Scope poin:** gabungan social (like di community feed) + belajar (quiz
   lulus, kursus selesai, sertifikat terbit).
2. **Cakupan feed:** satu komunitas global untuk semua user (bukan per-tenant
   B2B terpisah).
3. **Fungsi level:** bisa gate akses konten (course-level-lock, ala Skool) —
   bukan sekadar tampilan.
4. **Moderasi konten:** di-skip untuk v1 (hanya self-delete oleh pemilik post/
   komentar sendiri; tidak ada admin moderation UI, tidak ada filter kata
   kasar otomatis).
5. **Model poin:** event-sourced (`PointEvent` per aksi, `totalPoints` di-cache
   di `UserProfile`) — dipilih atas pendekatan "poin terpusat sederhana" dan
   "minimal inline" karena butuh audit trail dan fleksibilitas untuk fitur
   poin musiman/kadaluarsa di masa depan.
6. **Struktur halaman `/komunitas`:** satu pintu, ala TikTok — guest (belum
   login) bisa melihat feed dan melakukan like/komentar **sampai maksimal 3
   aksi gabungan**; aksi ke-4 diarahkan ke login. Guest **tidak** punya jatah
   gratis untuk membuat post baru — langsung diarahkan login.

## 3. Model Data

### Tabel baru

| Tabel | Kolom kunci | Fungsi |
|---|---|---|
| `CommunityPost` | `id`, `userId`, `content`, `createdAt`, `likeCount` (cache), `commentCount` (cache) | Post di feed |
| `CommunityComment` | `id`, `postId`, `userId`, `content`, `createdAt` | Komentar pada post |
| `CommunityLike` | `id`, `userId`, `targetType` (`post`\|`comment`), `targetId`, `createdAt`; unique `(userId, targetType, targetId)` | Like unik per (user, target) |
| `PointEvent` | `id`, `userId`, `points`, `reason` (`like_received`\|`quiz_passed`\|`course_completed`\|`certificate_earned`), `sourceType`, `sourceId`, `createdAt` | Riwayat poin, sumber kebenaran untuk audit |
| `Level` | `id`, `order`, `name`, `threshold`, `courseUnlockLabel?` | Tabel referensi 9 level, seed data statis |

### Perubahan tabel existing

- `UserProfile`: tambah `totalPoints` (Int, default 0), `currentLevel` (Int,
  default 1) — kolom cache yang di-refresh setiap `PointEvent` baru masuk.
- `Course`: tambah `requiredLevelId` (nullable FK ke `Level`) — null berarti
  tidak ada gate.

### Seed data Level (threshold ala Skool.com, dikonfirmasi dari riset)

```
Lv1: 0 pts   Lv2: 5 pts    Lv3: 20 pts   Lv4: 65 pts   Lv5: 155 pts
Lv6: 515 pts Lv7: 2,015 pts Lv8: 8,015 pts Lv9: 33,015 pts
```

## 4. Alur Poin & Anti-Abuse

| Event | Poin | Ke siapa | Guard |
|---|---|---|---|
| Post/komentar di-like orang lain | +1 | Pemilik post/komentar (bukan yang like) | Unique constraint `CommunityLike`; self-like diblokir di server logic |
| Quiz lulus (pertama kali) | +5 | User yang lulus | `PointEvent` dicek exist dulu per (user, quiz) sebelum insert — cegah grinding lewat re-submit |
| Kursus selesai 100% | +15 | User yang menyelesaikan | Sama — sekali per (user, course) |
| Sertifikat diterbitkan | +10 | User yang dapat sertifikat | Sama — sekali per (user, certificate) |

*(Angka poin adalah placeholder awal — mudah diubah karena dihitung
server-side di satu tempat, bukan hardcode di frontend.)*

**Gate akses konten:** saat user buka course dengan `requiredLevelId` terisi,
backend cek `user.currentLevel >= course.requiredLevel.order`. Jika belum
cukup, tampilkan pesan eksplisit ("Butuh Level X untuk buka kursus ini") —
BUKAN `notFound()` seperti pola flag-OFF (`/kelas-privat`), karena kasusnya
beda: course ini memang ada dan visible, hanya belum accessible.

## 5. Community Feed UX

### Guest (belum login)

- Bisa melihat feed dan detail post/komentar yang sudah ada.
- Bisa melakukan like/komentar sampai **3 aksi gabungan** (bukan 3 like + 3
  komentar terpisah).
- Aksi guest **tidak tersimpan ke database** dan **tidak menghasilkan poin** —
  murni optimistic UI feedback di sisi klien. Counter 3x dihitung di
  `localStorage`.
- Aksi ke-4 (atau percobaan membuat post baru — nol jatah gratis) memicu
  redirect/modal ke halaman login.

> `ponytail:` counter 3x adalah soft-gate sisi klien, bisa dilewati dengan
> clear `localStorage`. Cukup untuk v1 karena tujuannya konversi UX, bukan
> keamanan — upgrade ke device/session fingerprint sisi server hanya jika
> terbukti ada bypass massal nyata.

### Member (sudah login)

- Feed chronological (bukan algoritmik — kompleksitas tambahan yang belum
  perlu di v1).
- Tiap post: tombol like (toggle via `CommunityLike`), jumlah like,
  komentar collapsible.
- Header/sidebar kecil: level + poin user sendiri, link ke leaderboard.
- Halaman leaderboard terpisah (`/komunitas/leaderboard`): top-N `ORDER BY
  totalPoints DESC`, tampilkan level badge.
- User hanya bisa hapus post/komentar miliknya sendiri (tidak ada admin
  moderation UI di v1, sesuai keputusan #4).

## 6. API Endpoints Baru

| Method | Route | Auth | Fungsi |
|---|---|---|---|
| `GET` | `/api/community/posts` | Publik (read-only) | List feed, paginated |
| `POST` | `/api/community/posts` | Wajib login | Buat post baru |
| `DELETE` | `/api/community/posts/:id` | Wajib login (pemilik) | Hapus post sendiri |
| `POST` | `/api/community/posts/:id/comments` | Wajib login | Tambah komentar |
| `POST` | `/api/community/posts/:id/like` | Wajib login | Toggle like post |
| `POST` | `/api/community/comments/:id/like` | Wajib login | Toggle like komentar |
| `GET` | `/api/community/leaderboard` | Publik | Top-N user berdasarkan `totalPoints` |
| `GET` | `/api/community/me/points` | Wajib login | Detail poin & level user sendiri |

## 7. Titik Integrasi dengan Sistem LMS Existing

`PointEvent` dipicu dari tiga tempat yang sudah ada (bukan file baru,
modifikasi terarah pada handler existing):

- Quiz submission handler (area `apps/api/src/routes/lms.ts` / modul quiz
  terkait) → emit `PointEvent` saat quiz lulus pertama kali.
- Course completion / progress handler → emit `PointEvent` saat progress
  mencapai 100%.
- `apps/api/src/services/certificate/certificateService.ts` → emit
  `PointEvent` saat sertifikat diterbitkan.

## 8. Feature Flag

Sistem ini berada di belakang flag **baru**: `NEXT_PUBLIC_FEATURE_COMMUNITY_FEED`
(default **OFF**).

Flag existing `NEXT_PUBLIC_FEATURE_COMMUNITY` (untuk landing/lead-form yang
sekarang) **tetap dipertahankan terpisah** — rollout feed baru tidak otomatis
mengubah perilaku halaman lama. Ini konsisten dengan pola proyek yang sudah
mapan (lih. BL-23, BL-114): fitur baru selalu default OFF sampai teruji dan
sengaja dinyalakan.

## 9. Yang Sengaja Tidak Termasuk di v1 (Out of Scope)

- Moderasi konten oleh admin (report/hapus/ban) — keputusan eksplisit #4.
- Filter kata kasar otomatis.
- Feed algoritmik / ranking non-chronological.
- Community per-tenant B2B terpisah (`LmsTenant`-scoped) — keputusan eksplisit #2.
- Elemen monetisasi ala yapp.ink (tip/donasi, produk digital ringan,
  overlay stream) — filosofi berbeda (individual creator monetization vs
  institutional LMS), tidak diadopsi di spec ini.
- Poin kadaluarsa / musiman (ala "Skool Games" kuartalan) — model data
  event-sourced sudah disiapkan supaya ini bisa ditambah nanti tanpa migrasi
  ulang besar, tapi tidak dibangun sekarang (YAGNI).
- Device/session fingerprint untuk guest interaction limit — lihat catatan
  `ponytail:` di atas.

## 10. Referensi Riset

- Riset Skool.com (skool-researcher agent, sesi ini): model gamifikasi
  (poin dari like → 9 level eksponensial → course-lock), pricing
  Hobby/$9-10% vs Pro/$99-2.9%, studi kasus `skool.com/aivideoskool`
  (solo-creator, ~1.700 member, kontes mingguan cash-prize).
  Keterbatasan riset: WebSearch tool gagal total sepanjang sesi riset;
  triangulasi review independen hanya dari Trustpilot (52 review,
  TrustScore 1.5/5, sample kecil & rawan bias negatif).
- Riset yapp.ink (yapp-researcher agent, sesi ini): all-in-one creator
  monetization platform Indonesia (PT Cuan Bersama Kawan). Keterbatasan
  riset signifikan: halaman pricing/FAQ resmi 404, **nol sumber independen**
  ditemukan setelah pencarian ekstensif — keputusan untuk tidak mengadopsi
  pola yapp.ink didasarkan pada perbedaan filosofi produk yang jelas
  (creator-individual vs institutional-LMS), bukan pada data kompetitif
  yang tidak tersedia.

## 11. Langkah Berikutnya

Spec ini menunggu review user. Setelah disetujui, langkah berikutnya adalah
invoke skill `writing-plans` untuk menyusun implementation plan bertahap
(migrasi Prisma → API endpoints → UI feed → integrasi trigger poin LMS →
testing). Tidak ada implementasi kode yang dimulai sebelum ada persetujuan
eksplisit atas spec ini.
