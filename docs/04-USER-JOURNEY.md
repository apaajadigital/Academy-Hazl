# USER JOURNEY & USER FLOW
## Jago Akademi — Platform Edukasi Digital Terintegrasi

> Versi: 1.0 | Status: Final Draft | Tanggal: 22 Juni 2026

---

## DAFTAR ISI

1. [Journey Map Overview](#1-journey-map-overview)
2. [User Flow: Visitor → Student (Registration)](#2-user-flow-visitor--student)
3. [User Flow: Pembelian & Akses E-Course](#3-user-flow-pembelian--akses-e-course)
4. [User Flow: Pendaftaran & Partisipasi Event](#4-user-flow-event)
5. [User Flow: Pembelian E-Book](#5-user-flow-e-book)
6. [User Flow: Trainer Program](#6-user-flow-trainer-program)
7. [User Flow: Corporate Client (LMS)](#7-user-flow-corporate-client-lms)
8. [User Flow: Creator / Partner Collaboration](#8-user-flow-creator--partner)
9. [User Flow: Affiliate / Referral](#9-user-flow-affiliate--referral)
10. [User Flow: Marketplace Materi Event](#10-user-flow-marketplace-materi)
11. [User Flow: Admin Dashboard](#11-user-flow-admin)
12. [Conversion Funnel & Drop-off Analysis](#12-conversion-funnel)
13. [Customer Lifecycle Map](#13-customer-lifecycle-map)
14. [Touchpoint & Communication Map](#14-touchpoint--communication-map)

---

## 1. JOURNEY MAP OVERVIEW

### 1.1 Master User Journey

```
AWARENESS → CONSIDERATION → PURCHASE → ONBOARDING → ENGAGEMENT → RETENTION → ADVOCACY
    │              │             │            │            │            │           │
  Iklan        Landing      Checkout      Akses        Belajar     Kembali    Referral
  Sosmed        Page        Payment       Materi       Aktif       Beli       & Review
  Blog         Detail                   Email                    Langganan
  Referral     Kursus                   Konfirmasi              Premium
```

### 1.2 Multi-Role Journey Overview

| Role | Entry Point | Core Journey | Exit Point |
|------|-------------|-------------|------------|
| Student | Iklan / Organic | Beli → Belajar → Sertifikat → Beli Lagi | Referral aktif |
| Trainer Candidate | Blog / Event | Program Trainer → Sertifikasi → Jual Kursus | Revenue share |
| Corporate Client | Sales Demo | Demo → Kontrak → Go-live → Renewal | Upsell paket |
| Event Participant | Iklan event | Daftar → Hadir → Rekaman → Materi | Beli kursus |
| Creator/Partner | Networking | Apply → Kontrak → Launch → Share revenue | Repeat collab |
| Affiliate | Invited | Daftar → Share → Komisi → Cairkan | Top earner |

---

## 2. USER FLOW: VISITOR → STUDENT (REGISTRATION)

### 2.1 Flow Diagram

```
START: User mengakses jagoakademi.com (organik/iklan/referral)
           │
           ▼
    [HALAMAN HOME]
    Lihat hero, fitur, testimoni, kursus populer
           │
           ├─── Klik "Lihat Semua Kursus" ──────────────→ [CATALOG KURSUS]
           │
           ├─── Klik kursus spesifik ──────────────────→ [DETAIL KURSUS]
           │
           └─── Klik "Daftar Sekarang" ────────────────→ [REGISTER PAGE]

    [REGISTER PAGE]
    Pilih metode:
           ├─── Google OAuth ──→ Ambil data Google → Auto-verifikasi → DASHBOARD
           │
           └─── Email/Password
                     │
                     ▼
              Isi form: nama, email, password
                     │
                     ▼
              Submit → Validasi server
                     │
              ┌──────┴──────┐
              │              │
           Error          Success
           (email          │
           terdaftar)      ▼
              │      Email verifikasi dikirim
              │             │
              │      User buka email → Klik verify link
              │             │
              │             ▼
              │      Akun terverifikasi ✅
              │             │
              └────────→ [DASHBOARD STUDENT]
                          (welcome onboarding tour)
```

### 2.2 Onboarding Checklist (Post-Register)

```
Setelah register, user diarahkan ke onboarding:

□ Lengkapi profil (nama, foto, headline) → +10 poin
□ Atur preferensi topik belajar (pilih 3 kategori) → personalisasi feed
□ Jelajahi kursus gratis/preview → reduce friction
□ Ikuti kursus starter gratis → first value
□ Invite teman → dapat voucher 15%

Progress bar onboarding → gamifikasi, dorong completion
```

### 2.3 Email Flow (Registration)

```
T+0 min   → Email Selamat Datang + verifikasi link
T+10 min  → (Jika belum verify) Reminder verifikasi
T+24 jam  → (Jika belum login) Email "Mulai Belajar" + kursus rekomendasi
T+3 hari  → (Jika belum beli) Email "Kursus populer minggu ini"
T+7 hari  → (Jika tidak aktif) Email "Jangan lewatkan promo early access"
```

---

## 3. USER FLOW: PEMBELIAN & AKSES E-COURSE

### 3.1 Discovery to Purchase

```
[CATALOG KURSUS]
Filter: kategori, harga, level, rating, durasi
Sort: populer, terbaru, harga rendah/tinggi
           │
           ▼
    [DETAIL KURSUS] ──────────────────────────────────────────────────┐
    Content:                                                           │
    - Thumbnail + preview video (gratis, 2-3 video)                   │
    - Deskripsi kursus                                                 │
    - Silabus (section & lesson list, terkunci kecuali preview)       │
    - Info trainer (foto, bio, rating, jumlah student)                │
    - Rating & ulasan student                                          │
    - Apa yang kamu pelajari (learning outcomes)                       │
    - Persyaratan & untuk siapa kursus ini                            │
    - Harga + tombol "Beli Sekarang" atau "Tambah ke Keranjang"       │
    - Jaminan: akses seumur hidup, sertifikat, 7-hari refund policy  │
           │                                                           │
           ├─── User belum login ──────────────────────────────────────┤
           │         → Redirect ke Login → Kembali ke detail kursus   │
           │                                                           │
           └─── User sudah login                                       │
                     │                                                 │
                     ▼                                                 │
              [CART / CHECKOUT]                                        │
              - Review item                                            │
              - Input kode voucher/referral                           │
              - Tampil diskon kalau ada                                │
              - Pilih metode pembayaran                                │
              - Klik "Bayar"                                          │
                     │
                     ▼
              [MIDTRANS SNAP POPUP]
              - Tampil opsi pembayaran (VA/QRIS/Ewallet/CC)
              - User memilih & membayar
                     │
              ┌──────┴──────┐
              │              │
           Sukses          Gagal/Cancel
              │                │
              ▼                ▼
    [HALAMAN SUKSES]    [HALAMAN GAGAL]
    - Order summary      - Pesan error
    - Tombol "Mulai      - Opsi retry
      Belajar"           - Pilih metode lain
    - Invoice PDF        
              │
              ▼
    Email konfirmasi + akses kursus

    [NOTIFIKASI PARALEL]
    - Email: "Pembelian berhasil + invoice"
    - WA: "Selamat! Kursus [X] siap diakses"
    - In-app notif: kursus baru di dashboard
```

### 3.2 Belajar (Learning Experience)

```
[DASHBOARD STUDENT] → [KURSUS SAYA] → Pilih kursus
           │
           ▼
    [COURSE PLAYER]
    Layout: 
    ┌─────────────────────────┬────────────────┐
    │                         │  Silabus:      │
    │   VIDEO PLAYER          │  Section 1     │
    │                         │  ✓ Lesson 1.1  │
    │   [play/pause][speed]   │  ► Lesson 1.2  │
    │   [seek bar]            │    Lesson 1.3  │
    │   [quality][fullscreen] │                │
    │                         │  Section 2     │
    ├─────────────────────────│    Lesson 2.1  │
    │   TABS:                 │    Lesson 2.2  │
    │   [Deskripsi][Materi]   │                │
    │   [Q&A][Catatan]        │  Progress: 45% │
    └─────────────────────────┴────────────────┘

    Progress tracking (auto-save setiap 10 detik):
    - Video ditandai selesai jika watched ≥ 90%
    - Lesson berikutnya unlock otomatis
    - Progress bar per section di silabus

    QUIZ (per lesson/section):
    - Muncul setelah video selesai (jika ada quiz)
    - Multiple choice / essay
    - Submit → Nilai langsung muncul
    - Bisa retry untuk multiple choice

    ASSIGNMENT:
    - Upload file (PDF, docx, gambar)
    - Trainer review & beri feedback
    - Status: submitted / reviewed / graded

    SELESAI SEMUA MODUL:
    - Progress = 100% → trigger auto-generate sertifikat
    - Popup: "Selamat! Sertifikat kamu siap"
    - Tombol: Download / Share ke LinkedIn
    - Upsell: kursus lanjutan yang relevan
```

### 3.3 Post-Completion Flow

```
Kursus Selesai
      │
      ├── Sertifikat otomatis diterbitkan
      │        └── Email: sertifikat siap
      │        └── In-app: notif sertifikat
      │
      ├── Prompt: "Beri ulasan untuk kursus ini"
      │        └── Rating bintang 1-5
      │        └── Text review (opsional)
      │
      └── Rekomendasi kursus lanjutan (based on kategori)
               └── Tombol "Lanjutkan Perjalanan Belajarmu"
```

---

## 4. USER FLOW: EVENT

### 4.1 Discovery to Registration

```
[LISTING EVENT]
- Grid kartu event: thumbnail, judul, tanggal, harga, status (open/sold out)
- Filter: tipe (webinar/workshop/conference), tanggal, harga, kategori
- Badge: "GRATIS", "EARLY BIRD", "HAMPIR HABIS"
           │
           ▼
    [DETAIL EVENT]
    - Thumbnail/banner event
    - Judul & deskripsi singkat
    - Tanggal, waktu, lokasi (online/offline)
    - Speaker/narasumber (foto, bio, jabatan)
    - Agenda (rundown)
    - Apa yang akan didapat (takeaways)
    - Tiket: [Gratis | Regular: Rp X | VIP: Rp Y | VVIP: Rp Z]
    - Kuota tersisa per tier
    - Countdown timer (early bird / sold out warning)
    - Tombol "Daftar Sekarang"
           │
    ┌──────┴──────┐
    │              │
  Gratis          Berbayar
    │                │
    ▼                ▼
  [FORM DAFTAR]  [CHECKOUT]
  - Konfirmasi    - Review tiket
    data diri     - Kode promo
  - Submit        - Pilih bayar
    │              - Bayar
    │                │
    ▼                ▼
  [EMAIL KONFIRMASI + TIKET QR]
  - Nama peserta
  - Detail event
  - QR Code unik
  - Link akses (jika online)
  - Tombol "Tambahkan ke Kalender"
```

### 4.2 Reminder & Day-of Flow

```
H-7: Email "Event semakin dekat! Persiapkan dirimu"
H-1: Email "Besok! Jangan lupa: [judul event] | Link: [Zoom/meet]"
     WA: "Reminder event besok jam [jam] - [judul]"
H-2jam: WA: "Event [judul] mulai 2 jam lagi! Link: [link]"
         Push Notification
H-0: Event berlangsung

Post-event (T+2 jam setelah selesai):
  → Email: "Terima kasih telah hadir!"
         + Link rekaman (jika ada)
         + Sertifikat keikutsertaan (download)
         + Form feedback/rating event
         + Cross-sell: kursus terkait, beli materi event
```

### 4.3 Event Check-in Flow (Offline)

```
Peserta datang ke lokasi
      │
      ▼
Panitia scan QR tiket (via admin event app / web)
      │
┌─────┴─────┐
│            │
Valid        Invalid
  │            │
  ▼            ▼
Check-in   Tampil pesan
berhasil   "Tiket tidak valid"
  │        atau "Sudah check-in"
  ▼
Update DB: status check-in = true
Counter peserta hadir bertambah
```

---

## 5. USER FLOW: E-BOOK

### 5.1 Discovery to Purchase

```
[TOKO E-BOOK]
- Grid buku: cover, judul, penulis, harga, rating
- Filter: kategori, harga, format, penulis
- Search: judul / penulis
           │
           ▼
    [DETAIL E-BOOK]
    - Cover + judul + penulis
    - Deskripsi buku
    - Daftar isi (sebagian)
    - Preview 3-5 halaman (watermarked)
    - Rating & ulasan pembeli
    - Harga + tombol "Beli"
    - Bundle suggestion: buku ini + kursus terkait (hemat X%)
           │
           ▼
    [CHECKOUT] → [PAYMENT] → [SUCCESS]
           │
           ▼
    [AKSES E-BOOK] (via "E-Book Saya" di dashboard)
    - Read online (PDF viewer in-browser)
    - Tombol Download (PDF dengan watermark nama/email)
    - Progress reading tracker
    - Note/highlight (Phase 2)
```

---

## 6. USER FLOW: TRAINER PROGRAM

### 6.1 Trainer Candidate Journey

```
[LANDING PAGE TRAINER PROGRAM]
- Value proposition: "Jadilah Trainer Profesional Bersertifikat"
- Bandingkan 3 tier: Starter / Professional / Master
- Benefit per tier: modul, mentoring, sertifikat, revenue share
- Testimoni trainer yang sudah lulus
- FAQ khusus program trainer
- Tombol "Daftar Program Trainer"
           │
           ▼
    [PILIH PAKET TRAINER]
    Starter: Rp 1.5 Juta → modul dasar, sertifikat digital
    Professional: Rp 3.5 Juta → mentor 1:1, live practice
    Master: Rp 7.5 Juta → semua fitur + exclusive community
           │
           ▼
    [CHECKOUT & PAYMENT]
           │
           ▼
    [ONBOARDING TRAINER CANDIDATE]
    Email: "Selamat bergabung di Trainer Program Jago Akademi"
    + Akses ke portal trainer candidate
           │
           ▼
    [PORTAL TRAINER CANDIDATE]
    Progress program: [Modul 1 → Modul 2 → ... → Assessment]
    
    Setiap modul:
    - Video pembelajaran
    - Materi PDF
    - Assignment praktik (submit ke portal)
    - Review oleh senior trainer (feedback 5 hari kerja)
           │
           ▼
    [ASSESSMENT FINAL]
    - Live presentation (via Zoom)
    - Panel: 2 senior trainer
    - Kriteria: konten, delivery, Q&A handling
           │
    ┌──────┴──────┐
    │              │
  LULUS          TIDAK LULUS
    │                │
    ▼                ▼
  Sertifikat      Feedback detail
  Trainer JA      + Kesempatan
  diterbitkan     retry 1x (30 hari)
    │
    ▼
  [AKTIVASI PROFIL TRAINER]
  - Profil trainer live di platform
  - Akses Trainer Hub (course builder, analytics, payout)
  - Onboarding: panduan membuat kursus pertama
    │
    ▼
  [TRAINER AKTIF]
  - Buat & publish kursus
  - Akses analytics
  - Cairkan revenue (> Rp 500k, bulanan)
  - Dapat badge "Trainer Tersertifikasi"
  - Akses trainer community
```

### 6.2 Trainer Hub Daily Flow

```
[TRAINER HUB DASHBOARD]
Stats: total student, revenue bulan ini, rating rata-rata
           │
           ├── Buat Kursus Baru
           │       └── Course Builder:
           │           1. Info dasar (judul, deskripsi, kategori, harga)
           │           2. Thumbnail & preview video
           │           3. Buat section
           │           4. Upload video per lesson
           │           5. Tambah quiz & materi PDF
           │           6. Set preview lesson
           │           7. Preview kursus
           │           8. Submit ke admin untuk review
           │           9. Admin approve → Publish
           │
           ├── Analytics
           │       └── Per kursus: enrollment, completion, revenue, rating
           │
           ├── Community (Q&A dari student)
           │       └── Balas pertanyaan → notif ke student
           │
           └── Payout
                   └── Saldo: Rp XXX | Cairkan → Input rekening/e-wallet
                       Konfirmasi → Transfer diproses 2-3 hari kerja
```

---

## 7. USER FLOW: CORPORATE CLIENT (LMS)

### 7.1 B2B Sales Journey

```
[LEAD GENERATION]
  ├── Inbound: form di /lms, Google Ads, LinkedIn
  ├── Outbound: cold email, referral, pameran
  └── Partnership: HR community, asosiasi bisnis
           │
           ▼
    [HALAMAN PAKET LMS]
    - Perbandingan paket: Starter / Growth / Professional / Enterprise
    - Fitur per paket (tabel)
    - Logo klien yang sudah pakai
    - Case study singkat
    - Tombol "Coba Gratis 14 Hari" atau "Konsultasi Demo"
           │
           ▼
    [FORM KONSULTASI / DEMO REQUEST]
    Isi: nama, jabatan, perusahaan, email, telepon, ukuran perusahaan, 
         kebutuhan, paket yang diminati
           │
           ▼
    [CRM: Lead Baru masuk]
    - Admin CRM notif: lead baru dari form
    - Sales follow-up dalam 1x24 jam
    - Schedule demo meeting (Google Calendar link otomatis)
           │
           ▼
    [DEMO MEETING]
    - Durasi: 30-45 menit
    - Tampilkan: demo LMS live, fitur, konfigurasi, laporan
    - Q&A
    - Setelah demo: kirim proposal + pricing
           │
           ▼
    [PROPOSAL & NEGOSIASI]
    - Kirim proposal PDF via email
    - Negosiasi (diskon annual, add-on, customization)
    - Update status di CRM
           │
           ▼
    [KONTRAK & PEMBAYARAN]
    - Sign contract (e-signature via DocuSign / jenis serupa)
    - Invoice dikirim
    - Payment: transfer bank / kartu kredit / cicilan quarterly
           │
           ▼
    [ONBOARDING LMS]
    Tahapan:
    1. Kick-off meeting → kenalan, tentukan PIC klien
    2. Setup workspace (slug, domain, branding)
    3. Import user (CSV upload atau manual)
    4. Upload konten pertama (training klien dibantu tim JA)
    5. Training admin klien (2 jam virtual session)
    6. Soft launch: test dengan 10 user pilot
    7. Go-live: seluruh user aktif
           │
           ▼
    [OPERASIONAL LMS (ongoing)]
    - Monthly check-in dengan CSM Jago Akademi
    - Laporan bulanan otomatis ke admin klien
    - Support via email + WhatsApp dedicated
    - Annual review → renewal / upsell paket
```

### 7.2 LMS Admin Daily Flow

```
[LMS WORKSPACE - ADMIN KLIEN]
           │
           ├── Dashboard
           │       - Total user, completion rate, last 30 days activity
           │
           ├── Kelola Kursus
           │       - Upload kursus internal baru
           │       - Atur kursus wajib per batch
           │       - Set deadline completion
           │
           ├── Kelola User
           │       - Invite user baru (email single / bulk CSV)
           │       - Kelola batch / divisi
           │       - Reset password user
           │       - Lihat progress individual
           │
           ├── Laporan
           │       - Export laporan completion (Excel)
           │       - Laporan per batch
           │       - Grafik progress per periode
           │
           └── Pengaturan
                   - Logo, warna, nama platform
                   - Custom domain setup
                   - Notification settings

[LMS USER (KARYAWAN/MAHASISWA)]
           │
           ├── Lihat kursus yang di-assign (mandatory first)
           ├── Mulai kursus → progress otomatis tersimpan
           ├── Quiz & assignment
           └── Download sertifikat completion
```

---

## 8. USER FLOW: CREATOR / PARTNER COLLABORATION

### 8.1 Partner Application Flow

```
[HALAMAN KOLABORASI (/kolaborasi)]
Content:
- Benefit berkolaborasi dengan Jago Akademi
- Tipe kolaborasi: event, kursus, bundle, konten
- Revenue share model yang jelas
- Persyaratan umum
- Klien / partner sebelumnya (testimoni)
- Tombol "Ajukan Kolaborasi"
           │
           ▼
    [FORM COLLABORATION REQUEST]
    Fields:
    - Nama lengkap + jabatan
    - Nama brand / komunitas / perusahaan
    - Kategori kolaborasi (event/course/bundle/konten)
    - Deskripsi proposal singkat
    - Tanggal target
    - Social media / website
    - Jumlah audience
    - Email + nomor telepon
           │
           ▼
    [AUTO-RESPONSE EMAIL]
    "Terima kasih! Tim kami akan review proposal Anda dalam 3–5 hari kerja."
           │
           ▼
    [REVIEW INTERNAL (Tim Marketing/Product)]
    - Evaluasi: relevansi, kualitas, potensi audience, fit
    - Keputusan: Lanjut / Tolak
           │
    ┌──────┴──────┐
    │              │
  Lanjut         Tolak
    │                └── Email: terima kasih, tidak cocok saat ini
    ▼
  [MEETING ALIGNMENT]
  - Video call (30-45 menit)
  - Bahas: konsep, format, jadwal, revenue share, deliverables
           │
           ▼
    [KONTRAK KOLABORASI]
    - Tentukan revenue split
    - Timeline & milestones
    - Kewajiban masing-masing pihak
    - Tanda tangan digital
           │
           ▼
    [CO-PRODUCTION]
    - Setup halaman event/kursus bersama
    - Co-branding asset (banner, email, sosmed)
    - Link pendaftaran / beli
           │
           ▼
    [PROMOSI BERSAMA]
    - Jago Akademi: email blast, sosmed, push notif
    - Partner: komunitas, newsletter, sosmed mereka
           │
           ▼
    [LAUNCH & PELAKSANAAN]
           │
           ▼
    [REKAP & REVENUE SHARE]
    - Laporan: peserta, revenue, engagement
    - Transfer revenue sesuai kontrak (H+7 setelah event)
    - Meeting post-mortem (opsional)
    - Evaluasi untuk kolaborasi berikutnya
```

---

## 9. USER FLOW: AFFILIATE / REFERRAL

### 9.1 Affiliate Registration & Activation

```
[HALAMAN PROGRAM AFILIASI (/afiliasi)]
Content:
- Cara kerja (3 langkah simpel)
- Komisi: 10% per penjualan berhasil
- Produk yang bisa direferensikan (semua)
- Contoh perhitungan komisi
- Testimoni affiliator top
- Syarat & ketentuan
- Tombol "Gabung Sekarang"
           │
           ▼
    [LOGIN / REGISTER] → (Jika belum punya akun)
           │
           ▼
    [FORM DAFTAR AFILIASI]
    - Setujui T&C
    - Isi info payout (rekening bank / e-wallet)
    - Submit
           │
           ▼
    Auto-approve → Afiliasi aktif
           │
           ▼
    [DASHBOARD AFILIASI]
    ┌──────────────────────────────────┐
    │  Saldo: Rp 0                     │
    │  Total Klik: 0 | Konversi: 0     │
    │                                  │
    │  Referral Link:                  │
    │  jagoakademi.com?ref=KODEKAMU   │
    │  [Copy] [Share]                  │
    │                                  │
    │  Referral Code: KODEKAMU         │
    │                                  │
    │  Riwayat Komisi:                 │
    │  (kosong)                        │
    │                                  │
    │  [Cairkan Komisi]                │
    └──────────────────────────────────┘
```

### 9.2 Referral Tracking Flow

```
Affiliator bagikan link:
jagoakademi.com/kursus/digital-marketing?ref=JOHNDOE
           │
           ▼
    User baru klik link
           │
           ▼
    Cookie `ref=JOHNDOE` disimpan (30 hari)
           │
           ▼
    User browse, register, checkout
           │
           ▼
    Saat checkout: kode referral otomatis terisi (dari cookie)
    User bisa juga manual input kode referral
           │
           ▼
    Payment sukses
           │
           ▼
    Sistem hitung komisi: 10% x nilai pembelian
    Record: affiliate_commissions dengan status 'pending'
           │
           ▼
    T+7 hari: Status komisi → 'settled' (setelah refund window)
           │
           ▼
    Dashboard affiliator: saldo bertambah + notif in-app
           │
           ▼
    Cairkan jika saldo ≥ Rp 100.000
    Transfer H+2 hari kerja
```

---

## 10. USER FLOW: MARKETPLACE MATERI EVENT

### 10.1 Creator Upload Flow

```
[CREATOR LOGIN → PORTAL CREATOR]
           │
           ▼
    [UPLOAD PRODUK MARKETPLACE]
    Form:
    - Judul produk
    - Kategori & event asal (opsional)
    - Deskripsi isi produk
    - Thumbnail
    - Upload file:
      - Video rekaman (Cloudflare Stream)
      - PDF/Slide
      - Workbook
      - Template (ZIP)
    - Harga (Rp 49.000 – Rp 499.000)
    - Preview item (untuk calon pembeli)
           │
           ▼
    Submit → Review admin (1–3 hari kerja)
           │
           ▼
    Approved → Produk live di marketplace
           │
    Creator menerima notif + share link produk
```

### 10.2 Buyer Flow

```
[MARKETPLACE MATERI (/marketplace)]
- Filter: kategori, event, harga, tipe produk (rekaman/slide/workbook/bundle)
- Search: nama event / topik / creator
           │
           ▼
    [DETAIL PRODUK]
    - Preview thumbnail + deskripsi isi
    - Apa yang termasuk di bundle
    - Rating & review pembeli
    - Info creator
    - Harga + tombol "Beli"
           │
           ▼
    [CHECKOUT] → [PAYMENT] → [SUCCESS]
           │
           ▼
    [AKSES PRODUK]
    - Video: streaming (bukan download)
    - PDF/Slide/Workbook: download
    - Akses selamanya
           │
           ▼
    Revenue sharing otomatis:
    Creator: 60%, Platform: 40%
    Record di DB → Masuk saldo creator
```

---

## 11. USER FLOW: ADMIN DASHBOARD

### 11.1 Super Admin Daily Flow

```
[LOGIN ADMIN]
URL: admin.jagoakademi.com
2FA via OTP email (wajib)
           │
           ▼
    [EXECUTIVE DASHBOARD]
    Widgets:
    - GMV hari ini vs kemarin (% change)
    - New user hari ini
    - Active sessions (real-time)
    - Revenue per unit bisnis (donut chart)
    - Funnel konversi (bar chart)
    - Event mendatang (countdown)
    - Alert: kursus pending review, refund request, complaint baru
```

### 11.2 Content Admin Flow

```
[ADMIN KONTEN]
           │
           ├── Queue Review Kursus
           │       - Kursus yang disubmit trainer
           │       - Checklist review: kualitas video, silabus, harga wajar
           │       - Action: Approve / Reject (dengan feedback)
           │       - Notif otomatis ke trainer
           │
           ├── Manage Kursus
           │       - Edit featured status
           │       - Edit kategori
           │       - Unpublish jika ada laporan
           │
           ├── Manage Blog
           │       - Buat artikel baru (rich text editor)
           │       - Set SEO metadata
           │       - Schedule publish
           │
           └── Halaman Publik (CMS)
                   - Edit konten: Home, About, Clients, Events Sebelumnya
                   - Kelola FAQ
                   - Kelola Testimoni
                   - Kelola logo klien
```

### 11.3 Finance Admin Flow

```
[ADMIN KEUANGAN]
           │
           ├── Dashboard Revenue
           │       - Grafik revenue harian (7/30/90 hari)
           │       - Per unit bisnis
           │       - Pending vs settled
           │
           ├── Transaksi
           │       - List semua order (filter: status, tanggal, metode bayar)
           │       - Detail per transaksi
           │       - Action: proses refund manual
           │
           ├── Payout Trainer
           │       - List request payout dari trainer
           │       - Verify saldo cukup
           │       - Proses transfer (manual atau via API)
           │       - Record di DB
           │
           ├── Payout Affiliate
           │       - List request penarikan affiliate
           │       - Proses batch setiap tanggal 10 bulan
           │
           └── Laporan
                   - Download laporan keuangan Excel/PDF
                   - Rekonsiliasi payment gateway
                   - Laporan pajak (PPN, PPh)
```

### 11.4 Event Admin Flow

```
[ADMIN EVENT]
           │
           ├── Buat Event Baru
           │       - Form: judul, deskripsi, tipe, tanggal, lokasi
           │       - Upload thumbnail/banner
           │       - Tambah speaker (nama, foto, bio, jabatan)
           │       - Setup tiket (nama tier, harga, kuota, early bird)
           │       - Set link live (Zoom/Meet)
           │       - Preview → Publish
           │
           ├── Kelola Peserta
           │       - List peserta per event
           │       - Export CSV
           │       - Send broadcast email ke peserta
           │       - Check-in management
           │
           ├── Post-Event
           │       - Upload rekaman ke Cloudflare Stream
           │       - Publish rekaman ke marketplace materi
           │       - Generate & kirim sertifikat ke peserta
           │       - Kirim email summary event
           │
           └── Partnership Event
                   - Review form collaboration request
                   - Update status lead ke CRM
                   - Assign ke tim untuk follow-up
```

### 11.5 CRM Admin Flow

```
[ADMIN CRM]
           │
           ├── Pipeline Board (Kanban)
           │   │
           │   ├── Lead (Baru)
           │   │       - Nama, perusahaan, sumber
           │   │       - Tambahkan catatan
           │   │       - Set follow-up date
           │   │       - Assign ke sales
           │   │
           │   ├── Qualified
           │   │       - Sudah kontak, ada kebutuhan nyata
           │   │
           │   ├── Demo Scheduled
           │   │       - Jadwal meeting tercatat
           │   │
           │   ├── Proposal Sent
           │   │       - Link proposal terlampir
           │   │
           │   ├── Negotiation
           │   │
           │   └── Closed (Won / Lost)
           │           - Won: trigger onboarding LMS
           │           - Lost: catat reason
           │
           ├── Activity Log per Lead
           │       - Timeline semua interaksi (email, call, WA, meeting)
           │       - Tambah activity baru
           │
           └── Laporan
                   - Conversion rate per stage
                   - Avg deal size
                   - Time to close
                   - Top performing sales
```

---

## 12. CONVERSION FUNNEL & DROP-OFF ANALYSIS

### 12.1 E-Course Purchase Funnel

```
Stage               Users       Conv Rate   Drop-off %
─────────────────────────────────────────────────────
Landing/Organic     10.000         -            -
Catalog View         7.000        70%          30%
Detail View          3.500        50%          50%
Checkout Start         700        20%          80%  ← Drop tertinggi
Payment Attempt        560        80%          20%
Payment Success        448        80%          20%
─────────────────────────────────────────────────────
Overall Conversion:  4.48%
```

### 12.2 Drop-off Mitigation Strategy

| Drop Stage | Taktik Mitigation |
|-----------|-------------------|
| Catalog → Detail (30% drop) | Improve card UX, add "populer" badge, better thumbnail |
| Detail → Checkout (80% drop) | Exit-intent popup dengan diskon 10%, add social proof |
| Checkout → Payment (20% drop) | Kurangi form fields, tampilkan trust badge |
| Payment → Success (20% drop) | Retry mechanism, multiple payment options, live chat |

### 12.3 Retargeting Flow (Abandoned Checkout)

```
User mulai checkout tapi tidak selesai
           │
           T+1 jam: Email "Kamu belum selesai checkout"
                    + Link kembali ke cart
           │
           T+24 jam: Email "Kursimu hampir habis!" (urgency)
                     + Voucher 10% (jika user first-time)
           │
           T+3 hari: Email "Penawaran terakhir" + diskon 15%
```

---

## 13. CUSTOMER LIFECYCLE MAP

```
┌─────────────────────────────────────────────────────────┐
│                  CUSTOMER LIFECYCLE                       │
│                                                          │
│  ACQUIRE → ACTIVATE → RETAIN → EXPAND → ADVOCATE        │
│     │          │         │        │          │           │
│   Iklan     1st Course  2nd Buy  Upsell    Referral     │
│   SEO       Selesai     Aktif    Trainer   Review        │
│   Referral  Sertifikat  Monthly  LMS B2B   Sosmed        │
│                         Login    Bundle     Share         │
│                                                          │
│  METRICS:                                                │
│  CAC        Activation  Churn    ARPU       NPS          │
│  < Rp 150k  Rate > 60%  < 8%/mo  > Rp 80k  > 45        │
└─────────────────────────────────────────────────────────┘
```

### 13.1 Lifecycle Email Sequence

| Tahap | Trigger | Email / Action |
|-------|---------|----------------|
| Acquisition | Register | Welcome + onboarding checklist |
| Activation | 3 hari belum beli | Rekomendasi kursus gratis |
| First Purchase | Order sukses | Invoice + panduan mulai belajar |
| Learning | Progress 50% | Encouragement + tips belajar |
| Completion | 100% progress | Sertifikat + upsell kursus lanjutan |
| Re-engagement | 14 hari tidak login | "Jangan berhenti! Kursus kamu menunggu" |
| Win-back | 30 hari tidak aktif | Voucher 20% + konten baru |
| Loyal | Sudah beli 3+ kursus | Invite program affiliate, early access promo |
| Advocate | NPS 9-10 | Minta review Google/Trustpilot |

---

## 14. TOUCHPOINT & COMMUNICATION MAP

### 14.1 Email Touchpoints

```
Kategori         Template                          Timing
─────────────────────────────────────────────────────────
Transaksional:
  - Welcome                                        Langsung saat register
  - Email Verifikasi                              Langsung
  - Konfirmasi Pembelian                          Langsung saat bayar
  - Invoice PDF                                   Langsung
  - Akses Kursus                                  Langsung post-payment
  - Sertifikat Siap                               Saat complete ≥ 80%
  - Tiket Event                                   Post-payment
  - Reminder Event                               H-7, H-1, H-2jam
  - Post-Event Summary                            T+2 jam post-event
  - Payout Sukses (Trainer)                       Saat transfer diproses

Marketing (Opt-in):
  - Newsletter mingguan                           Setiap Senin
  - Promo event                                   3-5 hari sebelum event
  - Kursus baru                                   Saat publish
  - Flash sale                                    Saat periode sale

Lifecycle:
  - Re-engagement                                 14 hari tidak login
  - Win-back + voucher                            30 hari tidak aktif
  - Upsell (setelah complete course)              Langsung post-complete
  - Renewal LMS reminder                          30 hari sebelum expired
```

### 14.2 WhatsApp Touchpoints

```
- Konfirmasi pembelian
- Reminder event (H-1 dan H-2 jam)
- Sertifikat siap download
- Payout trainer berhasil
- LMS renewal warning
- CS chat (dukungan pelanggan)
```

### 14.3 In-App & Push Notification

```
- Konten baru dari kursus yang diikuti
- Komentar/balasan di Q&A kursus
- Sertifikat tersedia
- Komisi affiliate masuk
- Event reminder
- Promo flash sale (dengan permission)
- Admin: kursus baru perlu review
- Admin: complaint/refund baru
```

---

*Dokumen User Journey ini menjadi acuan utama untuk UX design, content strategy, dan automation marketing Jago Akademi.*
