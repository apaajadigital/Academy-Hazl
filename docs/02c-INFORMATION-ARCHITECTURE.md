# Information Architecture — Jago Akademi
**Fase 2: Product Validation & UX Research**
Versi: 1.0 | Tanggal: Juni 2026

---

## 1. Prinsip IA

1. **Discoverability** — setiap fitur harus bisa ditemukan dalam 3 klik dari homepage
2. **Mental model matching** — struktur mengikuti cara user berpikir, bukan cara platform dikode
3. **Role-based navigation** — menu berbeda untuk guest, student, trainer, admin, dan LMS user
4. **Progressive disclosure** — tampilkan informasi secara bertahap, jangan overwhelm di awal

---

## 2. Struktur Utama Platform

```
JAGO AKADEMI
├── PUBLIC (Tanpa Login)
│   ├── Home
│   ├── E-Course
│   │   ├── Catalog (semua kursus)
│   │   ├── [Kategori] → halaman per kategori
│   │   │   └── [Topik] → detail topik (lesson list) [LOCKED]
│   │   │       └── [Materi] → lesson player [LOCKED]
│   │   ├── Berlangganan (pricing subscription)
│   │   └── Search hasil pencarian
│   ├── Event
│   │   ├── Listing semua event
│   │   └── [slug] → detail event + daftar
│   ├── E-Book
│   │   ├── Listing semua e-book
│   │   └── [slug] → detail + beli/unduh
│   ├── Blog
│   │   ├── Listing artikel
│   │   ├── [slug] → detail artikel
│   │   └── Kategori / Tag
│   ├── Mentor / Trainer
│   │   └── [slug] → profil trainer publik
│   ├── Tentang Kami
│   ├── Klien & Partner
│   ├── FAQ
│   ├── Kontak
│   ├── Kebijakan Privasi
│   └── Syarat & Ketentuan
│
├── AUTH (Halaman tanpa state, redirect jika sudah login)
│   ├── Masuk (Login)
│   ├── Daftar (Register)
│   ├── Lupa Password
│   └── Reset Password
│
├── STUDENT DASHBOARD (Login Required — role: user/subscriber)
│   ├── Dashboard Home (ringkasan aktivitas)
│   ├── Kursus Saya (enrolled courses + progress)
│   ├── Belajar / [kursus] / [lesson] → video player
│   ├── Sertifikat Saya
│   ├── Tiket Event Saya
│   ├── E-Book Saya
│   ├── Pesanan & Transaksi
│   ├── Affiliate Saya
│   │   ├── Statistik & komisi
│   │   └── Withdrawal request
│   └── Profil & Pengaturan
│
├── TRAINER HUB (Login Required — role: trainer)
│   ├── Dashboard Overview (revenue, enrollment, rating)
│   ├── Kursus Saya
│   │   ├── Daftar kursus yang dibuat
│   │   └── [Edit Kursus] → course builder
│   ├── Analytics
│   │   ├── Pendapatan
│   │   ├── Enrollment trend
│   │   └── Completion & rating per kursus
│   ├── Payout
│   │   ├── Riwayat payout
│   │   └── Request payout baru
│   ├── Q&A
│   │   └── Pertanyaan dari pelajar
│   └── Profil Trainer
│
├── ADMIN PANEL (Login Required — role: admin/super_admin)
│   ├── Dashboard (KPI: users, revenue, active courses)
│   ├── Pengguna
│   │   ├── Semua user (search, filter, detail)
│   │   └── Role management
│   ├── Kursus
│   │   ├── Review & approve kursus baru
│   │   └── Semua kursus aktif
│   ├── Event
│   │   ├── Buat event baru
│   │   └── Kelola semua event
│   ├── E-Book
│   │   ├── Upload e-book
│   │   └── Kelola semua e-book
│   ├── Blog
│   │   ├── Tulis artikel baru
│   │   └── Kelola semua artikel
│   ├── Kupon & Promosi
│   ├── Transaksi
│   │   ├── Semua transaksi
│   │   └── Refund management
│   ├── LMS (Kelola tenant B2B)
│   ├── Affiliate & Komisi
│   ├── Review Moderasi
│   └── Laporan & Analitik
│
└── LMS B2B (Login Required — multi-tenant, role: lms_admin/lms_user)
    ├── [tenantSlug] / (LMS Portal per perusahaan)
    │   ├── Home Portal
    │   ├── Kursus Tersedia (assigned ke batch user)
    │   ├── Belajar / [kursusId] → video player
    │   ├── Sertifikat (branded per tenant)
    │   └── Profil
    └── [tenantSlug] / admin /
        ├── Dashboard Tenant (completion rate, progress per karyawan)
        ├── Kelola Pengguna (invite, import CSV, deactivate)
        ├── Batch / Kelompok
        ├── Assign Kursus ke Batch
        ├── Laporan
        │   ├── Per karyawan
        │   ├── Per kursus
        │   └── Export Excel/PDF
        └── Pengaturan Tenant (branding, domain, billing)
```

---

## 3. Navigation Architecture

### 3.1 Global Navigation (Header) — Guest

```
[Logo]   E-Course   Event   E-Book   Blog   Tentang   [Masuk]   [Daftar Gratis]
```

### 3.2 Global Navigation — Logged In (Student)

```
[Logo]   E-Course   Event   E-Book   Blog   [Search 🔍]   [🔔]   [Avatar ▼]
                                                                   ├─ Dashboard
                                                                   ├─ Kursus Saya
                                                                   ├─ Sertifikat
                                                                   ├─ Profil
                                                                   └─ Keluar
```

### 3.3 Trainer Hub Sidebar

```
[Logo Trainer Hub]
─────────────────
📊 Dashboard
🎓 Kursus Saya
  └─ + Buat Kursus Baru
📈 Analytics
💰 Payout
❓ Q&A Pelajar
👤 Profil Trainer
─────────────────
← Kembali ke Utama
```

### 3.4 Admin Panel Sidebar

```
[Logo Admin]
─────────────
📊 Dashboard
👥 Pengguna
📚 Kursus (Review)
📅 Event
📖 E-Book
✍️ Blog
🏷️ Kupon
💳 Transaksi
🏢 LMS Tenant
🤝 Affiliate
⭐ Review
📊 Laporan
⚙️ Pengaturan
```

### 3.5 LMS Student Sidebar

```
[Logo Perusahaan]
─────────────────
🏠 Beranda
📚 Kursus Saya
📈 Progress
🏆 Sertifikat
👤 Profil
```

### 3.6 LMS Admin Sidebar

```
[Logo Perusahaan]
─────────────────
📊 Dashboard
👥 Karyawan
  ├─ Kelola Pengguna
  └─ Import CSV
📋 Batch / Kelompok
📚 Kursus
  ├─ Katalog Tersedia
  └─ Assign ke Batch
📊 Laporan
  ├─ Per Karyawan
  ├─ Per Kursus
  └─ Export
⚙️ Pengaturan
  ├─ Branding
  └─ Billing
```

---

## 4. Sitemap Lengkap (URL Structure)

### Public

```
/                           Homepage
/e-course                   Catalog semua kursus
/e-course/[kategori]        Halaman kategori (Level 1)
/e-course/[kategori]/[topik]              Level 2 - detail topik
/e-course/[kategori]/[topik]/[materi]     Level 3 - lesson player
/e-course/berlangganan      Halaman pricing subscription
/event                      Listing semua event
/event/[slug]               Detail event
/e-book                     Listing e-book
/e-book/[slug]              Detail e-book
/blog                       Listing artikel
/blog/[slug]                Detail artikel
/mentor/[slug]              Profil trainer publik
/tentang                    Halaman Tentang Kami
/klien                      Halaman Klien & Partner
/faq                        FAQ
/kontak                     Kontak
/kebijakan-privasi          Kebijakan Privasi
/syarat-ketentuan           Syarat & Ketentuan
/early-access               Landing early access / waitlist
/sertifikat/[kode]          Verifikasi sertifikat publik
/search?q=                  Hasil pencarian
```

### Auth

```
/masuk                      Login
/daftar                     Register
/lupa-password              Forgot password
/reset-password?token=      Reset password
/auth/google/callback        OAuth callback (server-side)
```

### Student Dashboard

```
/dashboard                  Dashboard home
/dashboard/kursus           Kursus yang diikuti
/dashboard/sertifikat       Sertifikat yang dimiliki
/dashboard/tiket            Tiket event
/dashboard/affiliate        Program affiliate
/dashboard/profil           Profil & pengaturan
/belajar/[kursusSlug]       Halaman kursus (silabus + player)
/belajar/[kursusSlug]/[lessonId]  Lesson player
/pesanan                    Riwayat transaksi
/pesanan/[orderId]          Detail pesanan
/berlangganan               Halaman subscription (manage)
/checkout                   Checkout
/payment/success            Konfirmasi pembayaran berhasil
/payment/pending            Pembayaran pending
/payment/failed             Pembayaran gagal
```

### Trainer Hub

```
/trainer-hub                Dashboard trainer
/trainer-hub/kursus         Kursus yang dibuat
/trainer-hub/kursus/buat    Buat kursus baru
/trainer-hub/kursus/[id]/edit  Edit kursus
/trainer-hub/analytics      Analytics
/trainer-hub/payout         Payout
/trainer-hub/qa             Q&A pelajar
/trainer-hub/profil         Profil trainer
```

### Admin Panel

```
/admin                      Dashboard
/admin/pengguna             Manajemen user
/admin/kursus               Review & kelola kursus
/admin/event                Kelola event
/admin/blog                 Kelola blog
/admin/ebook                Kelola e-book
/admin/kupon                Kelola kupon
/admin/transaksi            Semua transaksi
/admin/lms                  Kelola LMS tenant
/admin/affiliate            Affiliate & komisi
/admin/review               Moderasi review
/admin/laporan              Laporan & analitik
```

### LMS B2B

```
/lms/[tenantSlug]                         LMS portal home
/lms/[tenantSlug]/kursus                  Katalog kursus tenant
/lms/[tenantSlug]/kursus/[id]             Detail kursus
/lms/[tenantSlug]/kursus/[id]/belajar     Lesson player
/lms/[tenantSlug]/sertifikat              Sertifikat karyawan
/lms/[tenantSlug]/profil                  Profil karyawan
/lms/[tenantSlug]/admin                   Admin dashboard
/lms/[tenantSlug]/admin/pengguna          Kelola karyawan
/lms/[tenantSlug]/admin/batch             Batch/kelompok
/lms/[tenantSlug]/admin/kursus            Assign kursus
/lms/[tenantSlug]/admin/laporan           Laporan
/lms/[tenantSlug]/admin/pengaturan        Pengaturan tenant
/lms/invite/[token]                       Halaman terima undangan karyawan
```

---

## 5. Content Hierarchy per Halaman Utama

### Homepage

```
1. Hero Section (CTA utama: "Mulai Belajar" + "Untuk Perusahaan")
2. Stats (X kursus, X trainer, X pelajar, X sertifikat)
3. Featured Courses (6 kursus terpopuler)
4. Kategori (6 kategori dengan ikon)
5. Upcoming Events (3 event terdekat)
6. Testimonials / Social Proof
7. Trainer Highlights (3 trainer terfeatured)
8. E-Book Gratis (3 e-book download gratis)
9. CTA Section (Untuk Perusahaan — LMS B2B)
10. Blog Terbaru (3 artikel)
11. FAQ Singkat (5 pertanyaan paling sering)
12. Footer
```

### Halaman E-Course (Catalog)

```
1. Hero / Page Header ("Tingkatkan Keahlian Anda")
2. Filter Bar (Kategori, Level, Harga, Rating, Sort)
3. Grid Kursus (3 kolom desktop, 2 tablet, 1 mobile)
   - Setiap card: thumbnail, kategori badge, judul, trainer, rating, harga, total pelajar
4. Pagination / Load More
5. Sidebar (kategori populer, level, harga range) — desktop only
```

### Halaman Detail Kursus

```
1. Breadcrumb (Beranda > E-Course > [Kategori] > [Judul])
2. Hero: Judul, deskripsi singkat, rating, total pelajar, trainer, badge (level/terbaru)
3. Preview Video (lesson pertama gratis)
4. Sticky Sidebar (harga, CTA Beli/Berlangganan, what's included)
5. "Apa yang akan kamu pelajari" (bullet points)
6. Silabus lengkap (accordion per section)
7. Profil Trainer (foto, bio, stat)
8. Review & Rating (breakdown + komentar terbaru)
9. Kursus Terkait
```

### Halaman Belajar (Video Player)

```
1. Header: judul kursus + progress bar keseluruhan
2. Area Utama: Video Player (16:9)
3. Panel Kiri: Silabus navigasi (collapsible)
4. Panel Bawah: Tab (Overview | Q&A | Notes | Resources)
5. Navigasi: tombol Previous / Next Lesson
6. Tombol: Tandai Selesai
```

---

## 6. Navigation Depth Analysis

| Halaman | Klik dari Homepage | Catatan |
|---------|-------------------|---------|
| Detail kursus | 2 | Homepage → Catalog → Detail |
| Mulai belajar | 3 | + Beli/Subscribe → Player |
| Dashboard | 1 | Click avatar → Dashboard |
| Trainer Hub | 2 | Avatar → Switch ke Trainer Hub |
| LMS Portal | 2 | Terima email invite → Login → Portal |
| Sertifikat download | 3 | Dashboard → Sertifikat → Download |

**Semua fitur kritis bisa dicapai dalam ≤ 3 klik. ✅**

---

## 7. Cross-linking & Discoverability

| Dari | Menuju | Metode |
|------|--------|--------|
| Course card di homepage | Halaman detail kursus | Click card |
| Profil trainer di detail kursus | Profil trainer publik | Click nama/foto |
| Profil trainer publik | Semua kursus trainer ini | Section "Kursus dari trainer ini" |
| Artikel blog | Kursus terkait | Widget sidebar/bottom |
| Setelah beli kursus | Belajar sekarang | CTA di halaman konfirmasi |
| Setelah kursus selesai | Kursus terkait / Sertifikat | Halaman completion |
| Sertifikat | Share ke LinkedIn | Tombol share |

---

*Dokumen IA ini adalah input utama untuk desain wireframe dan implementasi routing/navigation.*

**Disusun oleh:** UX Designer + Product Manager
**Status:** Final — Divalidasi dengan usability test
