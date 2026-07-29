# Orphan Route & Dead-Link Audit — 29 Jul 2026

> **Metode:** inventaris rute mekanis (`app/**/page.tsx`) → ekstraksi semua target navigasi (`href=`, `href:`, `router.push/replace`, `redirect()`, nav config) → diff → verifikasi 5 agent paralel (public / dashboard / admin / LMS+trainer / reverse-link) → **verifikasi ulang manual per temuan**.
> **Studi kasus pemicu:** `/mentor` (commit `12a9554`) — halaman jadi, tapi tak ada satu pun link masuk; user harus ketik URL manual.
> **Status:** analisis saja. **Belum ada kode diubah.**

---

## Ringkasan eksekutif

Ditemukan **2 alur rusak (lebih parah dari orphan)**, **3 orphan sejati**, dan **beberapa isu navigasi/SEO turunan**.

Temuan terpenting bukan halaman yang tak terjangkau, melainkan **dua fitur yang UI-nya bilang "terkirim" padahal backend tidak pernah mengirim apa pun**: reset password dan undangan LMS. Keduanya membuat rute tujuannya (`/reset-password`, `/lms/invite/[token]`) mustahil dicapai di produksi.

---

## P0 — Alur rusak (bukan sekadar orphan)

### 1. `/reset-password` — user TIDAK BISA reset password di produksi

| Bukti | Lokasi |
|---|---|
| Token dibuat & disimpan | `apps/api/src/modules/auth/password.ts:29-36` |
| Komentar berjanji "In prod: send via email" | `password.ts:38` |
| **Tapi hanya ada cabang non-prod** `console.info`; **tidak ada `else`** — produksi tidak mengirim apa pun | `password.ts:39-41` |
| **Tidak ada template reset password** di email service (hanya payment/verification/event/invoice) | `apps/api/src/services/notification/emailService.ts:28,40,52,64,91,162,211` |
| UI tetap klaim "kami telah mengirimkan tautan reset kata sandi" | `apps/web/app/(auth)/lupa-password/LupaPasswordForm.tsx:36` |
| Halaman dead-end tanpa `?token=` | `apps/web/app/(auth)/reset-password/ResetPasswordForm.tsx:20-28` |

**Dampak:** `/lupa-password` terlink dari halaman login (`MasukForm.tsx:111`), user mengisi form, dapat pesan sukses — lalu tautan tak pernah datang. Rute `/reset-password` **0 inbound link** dan tak akan pernah tercapai.
**Catatan:** pola ini identik dengan BL-31 (email verifikasi) yang sudah diperbaiki di TASK-030 — perbaikannya tidak menjangkau password reset.

### 2. `/lms/invite/[token]` — rute mati total + pesan sukses palsu

| Bukti | Lokasi |
|---|---|
| Undangan dibuat di DB (expiry 7 hari) | `apps/api/src/modules/lms/invite.ts:50-57` |
| Response hanya `{created, skipped}` = **daftar email, token tidak pernah dikembalikan** | `invite.ts:63` |
| **Tidak ada mailer sama sekali** di file ini (0 hasil grep `sendEmail|emailService|Mail`) | `invite.ts` |
| Tidak ada route `GET` untuk membaca token | `apps/api/src/modules/lms/invite.ts` |
| UI klaim "Undangan terkirim: N" | `apps/web/app/lms/[tenantSlug]/admin/batches/page.tsx:102` |
| UI klaim "Undangan sudah dikirim ke {email}" | `apps/web/app/admin/lms/[tenantId]/page.tsx:139` |
| **Bug tambahan:** `fetch` accept **tanpa header `Authorization`**, padahal backend pakai `authenticate` + `req.user!.id` → 401 | web `app/lms/invite/[token]/page.tsx:21` vs api `invite.ts:71,74-75` |

**Dampak:** token hanya hidup sebagai kolom DB. Tidak ada email, tidak ada API baca, tidak ada UI yang menampilkannya. Admin mengira peserta sudah diundang — padahal tidak ada yang terkirim. Seandainya token didapat manual pun, accept akan 401.

---

## P1 — Orphan sejati (halaman jadi, tanpa jalur klik)

### 3. `/lms/[tenantSlug]/admin` — SELURUH konsol admin LMS orphan ⭐ kasus `/mentor` terulang

Tidak ada satu pun link masuk dari luar subtree-nya sendiri:

- Sidebar portal peserta **tidak punya item "Admin"** — `app/lms/[tenantSlug]/page.tsx:44-49` hanya "Kursus Saya" + "Sertifikat".
- Shortcut LMS di dashboard **selalu** ke `/lms/${t.slug}`, tak pernah `.../admin`, tanpa cek role `lms_admin` — `app/dashboard/layout.tsx:195`.
- Konsol super-admin B2B tidak menautkan ke konsol tenant — `app/admin/lms/[tenantId]/page.tsx:267` hanya kembali ke `/admin/lms`.
- Halaman settings menampilkan URL portal **peserta**, bukan admin — `app/lms/[tenantSlug]/admin/settings/page.tsx:216`.
- User `lms_admin` **tidak di-redirect ke mana pun** — `app/dashboard/layout.tsx:89-96` hanya menangani `admin`/`super_admin`/`trainer`.

**Akibat:** admin tenant login → mendarat di dashboard member → klik LMS → sampai di portal **peserta** → buntu. Harus mengetik `/lms/<slug>/admin` manual. Persis kasus `/mentor`, tapi ini satu subtree penuh (6 halaman: `admin`, `batches`, `courses`, `courses/[courseId]`, `reports`, `settings`).

**Perbaikan termurah:** item nav kondisional di `app/lms/[tenantSlug]/page.tsx:44-49` dan/atau `app/dashboard/layout.tsx:194-199`.

### 4. `/payment/pending` — orphan penuh

Halaman lengkap (countdown timer, param `expiresAt`), **0 referensi** di `apps/web` maupun `apps/api`:
- Email pending menautkan ke **URL hosted DOKU**, bukan halaman ini — `emailService.ts:40`.
- `/payment/success` sudah menyerap state "belum terkonfirmasi" secara inline — `app/(public)/payment/success/page.tsx:210-238`.
- DOKU hanya diberi `callback_url` (success) dan `failure_return_url`; tak ada pending URL — `apps/api/src/routes/checkout.ts:257,267`.

### 5. `/dashboard/affiliate` — stub redirect mati

10 baris, client-side `router.replace("/dashboard/afiliasi")` (`:8`), **0 inbound link** (satu-satunya hit grep = komentar dirinya sendiri di `:5`). Halaman asli `/dashboard/afiliasi` (379 baris) yang terlink dari nav. Duplikat alias EN/ID yang tertinggal — dan tidak didaftarkan di `next.config.js redirects()` seperti alias lain.

---

## P2 — Terjangkau tapi lemah / UI mati

| # | Temuan | Bukti |
|---|---|---|
| 6 | **`/berlangganan` tak ada di Navbar & Footer** — halaman pricing publik ber-`metadata`+canonical, tapi funnel akuisisi ini hanya bisa dicapai dari `SubscriptionLock.tsx:34` dan `dashboard/berlangganan:145`. Untuk pengunjung belum login = praktis orphan. | `app/berlangganan/page.tsx:5-10` |
| 7 | **Link "Admin Panel" di dashboard = dead code permanen** — `isAdmin` diinisialisasi `false` (`:52`), role admin `return` lebih dulu (`:90-91`), satu-satunya write lain `setIsAdmin(false)` (`:97`). Blok `:204-211` tak akan pernah render. | `app/dashboard/layout.tsx` |
| 8 | **BL-49 masih terbuka** — `/blog` & `/berlangganan` di luar route group `(public)`; root layout tak render Navbar/Footer → user tak bisa navigasi balik. Sudah dikonfirmasi E2E. | `app/layout.tsx` (0 hit Navbar), `e2e/public-sweep.spec.ts:38,48` |
| 9 | **`/trainer-hub` tanpa link berlabel** — hanya tercapai via redirect pasca-login (`MasukForm.tsx:66-68`, `auth/callback/page.tsx:59`, `dashboard/layout.tsx:93-96`). Trainer tak pernah *melihat* tautan "Trainer Hub" di luar hub. Bukan orphan, tapi tak discoverable. | — |
| 10 | `/dashboard/profil` & `/dashboard/berlangganan` absen dari grid `quickAccess` dashboard home. | `app/dashboard/page.tsx:131-137` |
| 11 | Halaman order terbelah dua tree: list `/dashboard/pesanan` → detail `/pesanan/[orderId]` (keluar shell sidebar), dan back-link `/pesanan` = stub redirect → **dua hop redirect + frame kosong**. | `app/dashboard/pesanan/page.tsx:201`, `app/pesanan/[orderId]/page.tsx:117,156` |

---

## P3 — SEO & konfigurasi

| # | Temuan | Bukti |
|---|---|---|
| 12 | **Sitemap mengirim soft-404 ke Google** — `sitemap.ts:48` meng-emit `/e-course/{courseSlug}` untuk tiap kursus, padahal `/e-course/[kategori]` adalah listing **kategori** yang `notFound()` untuk slug tak dikenal. Slug kursus ≠ slug kategori. Detail kursus sebenarnya di `/checkout/[slug]`. | `app/(public)/e-course/[kategori]/page.tsx:36` |
| 13 | **Flag mati** — `features.marketplace`, `features.collaboration`, `features.affiliate` didefinisikan tapi **tak pernah dikonsumsi**; `/marketplace`, `/kolaborasi`, `/afiliasi` tayang tanpa gate. | `lib/features.ts:15-17` |
| 14 | Sitemap belum memuat `/privacy`, `/terms`, `/early-access` (ketiganya publik & terjangkau). | `app/sitemap.ts` |

---

## ✅ Diverifikasi BUKAN masalah (false positive)

| Dugaan | Fakta |
|---|---|
| `/admin/event/check-in` link tanpa halaman | **Halaman ADA** — `app/admin/event/check-in/page.tsx` (dibuat 11:21 saat sesi ini berjalan; scan pertama saya lebih awal). Link di `admin/event/page.tsx:146` & `event/[id]/peserta/page.tsx:145` valid. |
| `/courses` `/batches` `/reports` `/settings` = href absolut rusak | **Fragmen suffix**, di-prefix saat render: `` href={`${base}${href}`} `` dengan `base = /lms/${tenantSlug}/admin` — `app/lms/[tenantSlug]/admin/layout.tsx:29,48`. |
| `/alumni` `/komunitas` `/kelas-privat` `/portofolio-member` orphan karena flag OFF | **Konsisten ter-gate** — tiap rute punya `layout.tsx:23` `if (!features.X) notFound()`. Link disembunyikan **dan** halaman 404. Bukan orphan. (BL-48: menunggu flag ON + konten.) |
| `/verifikasi-email`, `/payment/success`, `/payment/failed` orphan | **By design** — entry eksternal (email / redirect gateway). Wajar. |
| Nav item menunjuk rute tak ada | **Nihil** di admin (14 item), dashboard (9 item), trainer-hub (5 item). Semua resolve. |

---

## ⚠️ Risiko deploy yang tersingkap (di luar scope orphan)

Direktori fitur event admin **belum ter-commit** (untracked): `app/admin/event/[id]/`, `app/admin/event/baru/`, `app/admin/event/check-in/`, `app/admin/event/EventForm.tsx`, `lib/api/events.ts`, `lib/event-labels.ts` — sementara `app/admin/event/page.tsx` (tracked, modified) **sudah merender tombol ke semuanya**.

**Akibat pada checkout CI/CD bersih:** build gagal (import `lib/api/events.ts` hilang) atau, jika lolos, tombol "Buat Event" / "Check-in Peserta" → 404. Perlu di-commit sebelum deploy berikutnya.

---

## Rekomendasi urutan kerja

1. **P0-1 reset password** — tambah `sendPasswordResetEmail()` ke `emailService.ts` + wire ke `password.ts` (pola sama persis dengan `sendVerificationEmail` di BL-31). Auth rusak = blocker.
2. **P0-2 undangan LMS** — kirim email berisi token, atau (minimal, jujur) hentikan klaim "terkirim" di kedua UI sampai mailer ada. Sekalian perbaiki header `Authorization` yang hilang.
3. **P1-3 konsol admin LMS** — link kondisional per role; ini `/mentor` versi 6 halaman.
4. **P1-4/5** — putuskan: pakai `/payment/pending` (arahkan DOKU/email ke sana) atau hapus. Hapus `/dashboard/affiliate` atau pindah ke `next.config.js redirects()`.
5. **P2-6/8** — `/berlangganan` masuk Footer + pindahkan ke group `(public)` (menutup BL-49 sekalian).
6. **P3-12** — perbaiki sitemap agar tak mengirim soft-404.

> Semua P0 & P1 menyentuh auth/commerce/LMS. Per CLAUDE.md §9.8 tiap perbaikan wajib disertai **regression test**, dan per §9.6 perubahan alur email/undangan sebaiknya lewat PR terpisah dengan review.
