# PRODUCT REQUIREMENT DOCUMENT (PRD)
## Jago Akademi — Platform Edukasi Digital Terintegrasi

> Versi: 1.0 | Status: Final Draft | Tanggal: 22 Juni 2026

---

## DAFTAR ISI

1. [Product Overview](#1-product-overview)
2. [User Persona](#2-user-persona)
3. [User Story](#3-user-story)
4. [Functional Requirements](#4-functional-requirements)
5. [Non-Functional Requirements](#5-non-functional-requirements)
6. [Technical Requirements](#6-technical-requirements)
7. [API Requirements](#7-api-requirements)
8. [Database Requirements](#8-database-requirements)
9. [Security Requirements](#9-security-requirements)
10. [SEO Requirements](#10-seo-requirements)
11. [Analytics Requirements](#11-analytics-requirements)
12. [Feature Priority: MVP vs Phase 2 vs Long-Term](#12-feature-priority)

---

## 1. PRODUCT OVERVIEW

### 1.1 Product Vision
Jago Akademi adalah platform edukasi digital all-in-one yang melayani pengguna dari awal perjalanan belajar (student) hingga menjadi pengajar profesional (certified trainer) dan solusi belajar untuk institusi (LMS).

### 1.2 Platform Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                    JAGO AKADEMI PLATFORM                 │
├─────────────┬──────────────┬──────────────┬─────────────┤
│  PUBLIC WEB │  STUDENT APP │  TRAINER HUB │  ADMIN DASH │
│             │              │              │             │
│ - Landing   │ - Dashboard  │ - Course     │ - CMS       │
│ - About     │ - My Courses │   Builder    │ - CRM       │
│ - Catalog   │ - My Events  │ - Analytics  │ - Finance   │
│ - Blog      │ - My E-Books │ - Payout     │ - Event Mgr │
│ - Pricing   │ - Community  │ - Community  │ - LMS Mgr   │
│ - Events    │ - Progress   │ - Cert Mgmt  │ - Reports   │
│ - Contact   │ - Certs      │              │             │
└─────────────┴──────────────┴──────────────┴─────────────┘
         ↓              ↓             ↓             ↓
┌─────────────────────────────────────────────────────────┐
│                      LMS PORTAL (B2B)                    │
│  Per-tenant workspace dengan white-label & custom domain │
└─────────────────────────────────────────────────────────┘
```

### 1.3 Halaman Utama Website (Public)

| Halaman | URL | Deskripsi |
|---------|-----|-----------|
| Home/Beranda | / | Hero, featured courses, stats, testimonials |
| Tentang Kami | /tentang-kami | Sejarah, misi, tim, pencapaian |
| Klien Kami | /klien | Previous clients logo wall + case study |
| Event Sebelumnya | /event-sebelumnya | Galeri & rekap event yang pernah digelar |
| Kolaborasi | /kolaborasi | Form collaboration request + benefit |
| FAQ | /faq | Accordion FAQ per kategori |
| Hubungi Kami | /hubungi-kami | Form kontak + WhatsApp button |
| Kursus | /kursus | Catalog kursus dengan filter |
| Detail Kursus | /kursus/[slug] | Detail page per kursus |
| Event | /event | Listing event mendatang |
| Detail Event | /event/[slug] | Detail page per event |
| E-Book | /ebook | Toko e-book dengan filter |
| Trainer Program | /trainer-program | Landing page program trainer |
| Paket LMS | /lms | Landing page & pricing LMS |
| Marketplace Materi | /marketplace | Listing materi pasca-event |
| Blog | /blog | Artikel edukasi |
| Afiliasi | /afiliasi | Program referral info |

---

## 2. USER PERSONA

### Persona 1: Rina — "The Ambitious Professional"
- **Usia**: 24 tahun | **Pekerjaan**: Marketing Staff
- **Goal**: Upgrade skill digital marketing, dapat sertifikat, naik jabatan
- **Pain**: Tidak punya waktu belajar, bingung mau mulai dari mana
- **Behavior**: Aktif LinkedIn, ikut webinar gratis, beli buku motivasi
- **Trigger**: Promosi Instagram, rekomendasi teman
- **WTP (Willingness to Pay)**: Rp 200.000 – 500.000/produk
- **Produk yang relevan**: E-Course, Event, E-Book

### Persona 2: Budi — "The Career Switcher"
- **Usia**: 28 tahun | **Pekerjaan**: Accounting, ingin masuk HR/Training
- **Goal**: Menjadi Corporate Trainer profesional bersertifikat
- **Pain**: Tidak tahu caranya, butuh portofolio & pengakuan
- **Behavior**: Riset di Google, YouTube, aktif di grup Telegram HR
- **Trigger**: Artikel blog, LinkedIn post trainer sukses
- **WTP**: Rp 1.500.000 – 5.000.000 untuk program serius
- **Produk yang relevan**: Trainer Program, Live Class, E-Book

### Persona 3: Pak Hendra — "The HR Director"
- **Usia**: 42 tahun | **Pekerjaan**: HR Director perusahaan 500 karyawan
- **Goal**: Digitalisasi training internal, tracking progress karyawan
- **Pain**: LMS mahal, ribet setup, tidak ada laporan yang simpel
- **Behavior**: Dapat rekomendasi dari network, cari via Google "LMS Indonesia"
- **Trigger**: Demo langsung, case study klien sejenis
- **WTP**: Rp 4.500.000 – 15.000.000/bulan (B2B budget)
- **Produk yang relevan**: Paket LMS Professional/Enterprise

### Persona 4: Sari — "The Content Creator"
- **Usia**: 31 tahun | **Pekerjaan**: Motivational Speaker & Trainer Freelance
- **Goal**: Monetisasi expertise, jangkau audiens lebih luas
- **Pain**: Kelola admin sendiri (payment, sertifikat) sangat melelahkan
- **Behavior**: Aktif Instagram, YouTube, sering hosting webinar
- **Trigger**: Ajakan kolaborasi, revenue share yang menarik
- **WTP**: Mau berbagi revenue, butuh platform solid
- **Produk yang relevan**: Partner/Creator, Event, Marketplace Materi

### Persona 5: Dewi — "The University Program Manager"
- **Usia**: 38 tahun | **Pekerjaan**: Kepala Program Studi Universitas Swasta
- **Goal**: Tambah kelas online untuk mahasiswa, kelola absensi digital
- **Pain**: Tidak punya IT team, Moodle terlalu rumit
- **Behavior**: Cari platform yang mudah, ada support, terjangkau
- **WTP**: Rp 1.500.000 – 5.000.000/bulan (budget institusi)
- **Produk yang relevan**: LMS Starter/Growth untuk perguruan tinggi

---

## 3. USER STORY

### 3.1 Visitor / Calon Pembeli

```
US-001: Sebagai Visitor, saya ingin melihat daftar kursus yang tersedia
        beserta harga dan rating, agar saya dapat memilih kursus yang sesuai.

US-002: Sebagai Visitor, saya ingin mencoba preview gratis kursus (2-3 video pertama),
        agar saya dapat menilai kualitas sebelum membeli.

US-003: Sebagai Visitor, saya ingin melihat daftar event mendatang beserta
        detail speaker dan jadwal, agar saya bisa merencanakan keikutsertaan.

US-004: Sebagai Visitor, saya ingin mengisi form kolaborasi sebagai creator,
        agar tim Jago Akademi dapat menghubungi saya.

US-005: Sebagai Visitor, saya ingin melihat halaman Tentang Kami dan daftar
        klien sebelumnya, agar saya dapat menilai kredibilitas platform.

US-006: Sebagai Visitor, saya ingin mendaftar akun dengan email atau Google,
        agar saya dapat mulai berbelanja dan belajar.
```

### 3.2 Student

```
US-010: Sebagai Student, saya ingin membeli kursus dan langsung mengaksesnya,
        tanpa perlu menunggu konfirmasi manual.

US-011: Sebagai Student, saya ingin melihat progress belajar saya dalam
        persentase per kursus, agar saya tahu seberapa jauh saya sudah belajar.

US-012: Sebagai Student, saya ingin mengunduh sertifikat setelah menyelesaikan
        kursus, agar dapat saya bagikan di LinkedIn.

US-013: Sebagai Student, saya ingin menggunakan kode diskon/kupon saat checkout,
        agar mendapat harga lebih murah.

US-014: Sebagai Student, saya ingin mendaftar event dan mendapat tiket digital
        beserta reminder otomatis, agar tidak lupa jadwal event.

US-015: Sebagai Student, saya ingin memberi rating dan ulasan pada kursus
        yang telah saya selesaikan, agar membantu student lain memilih.

US-016: Sebagai Student, saya ingin mengakses e-book yang saya beli secara
        online di browser dan offline via download PDF, agar bisa dibaca di mana saja.

US-017: Sebagai Student, saya ingin mendaftar program affiliate dan memantau
        komisi saya, agar dapat penghasilan tambahan.

US-018: Sebagai Student, saya ingin bertanya kepada trainer di kolom diskusi
        kursus, agar kendala belajar saya dapat terjawab.
```

### 3.3 Trainer

```
US-020: Sebagai Trainer, saya ingin membuat kursus baru dengan mengunggah
        video, PDF, dan quiz, agar saya dapat menjual expertise saya.

US-021: Sebagai Trainer, saya ingin melihat dashboard analytics kursus saya
        (jumlah student, revenue, rating, completion rate), agar dapat evaluasi.

US-022: Sebagai Trainer, saya ingin mencairkan pendapatan saya setiap bulan
        ke rekening bank saya, agar saya mendapatkan kompensasi tepat waktu.

US-023: Sebagai Trainer, saya ingin membalas komentar dan pertanyaan student
        di dalam platform, agar engagement kursus tetap tinggi.

US-024: Sebagai Trainer, saya ingin mengeluarkan sertifikat kustom dengan
        nama saya sebagai instruktur, agar sertifikat terlihat profesional.
```

### 3.4 Corporate Client (LMS)

```
US-030: Sebagai Admin LMS perusahaan, saya ingin mengundang karyawan saya
        ke dalam workspace LMS via email bulk invite, agar onboarding cepat.

US-031: Sebagai Admin LMS perusahaan, saya ingin membuat kursus internal
        dengan mengunggah video training perusahaan saya, agar karyawan
        dapat belajar kapan saja.

US-032: Sebagai Admin LMS perusahaan, saya ingin melihat laporan completion
        dan progress per karyawan per kursus, agar saya dapat audit pelatihan.

US-033: Sebagai Admin LMS perusahaan, saya ingin mengaktifkan subdomain
        khusus (training.perusahaan.com) agar LMS terasa milik perusahaan.

US-034: Sebagai Admin LMS perusahaan, saya ingin mengatur kursus menjadi
        wajib (mandatory) untuk batch tertentu, agar kepatuhan training terjaga.
```

### 3.5 Event Participant

```
US-040: Sebagai Peserta Event, saya ingin mendaftar event dan mendapat
        konfirmasi email beserta link akses (Zoom/meet), agar saya siap hadir.

US-041: Sebagai Peserta Event, saya ingin mendapat rekaman event setelah
        selesai, agar dapat saya tonton ulang.

US-042: Sebagai Peserta Event, saya ingin mendapat sertifikat keikutsertaan
        event, agar dapat saya lampirkan di portofolio.
```

### 3.6 Admin & Super Admin

```
US-050: Sebagai Admin Konten, saya ingin me-review dan approve kursus
        sebelum dipublikasikan, agar kualitas konten terjaga.

US-051: Sebagai Admin Keuangan, saya ingin melihat laporan transaksi
        harian/bulanan per unit bisnis, agar saya dapat monitor cashflow.

US-052: Sebagai Super Admin, saya ingin mengelola semua user, role,
        dan permission dari satu dashboard, agar operasional terpusat.

US-053: Sebagai Admin CRM, saya ingin mencatat semua leads B2B dan
        pipeline status, agar tim sales dapat follow-up tepat waktu.
```

---

## 4. FUNCTIONAL REQUIREMENTS

### 4.1 Modul Authentication & User Management

**FR-AUTH-001**: Registrasi dengan email + password
**FR-AUTH-002**: Registrasi dengan Google OAuth
**FR-AUTH-003**: Login email + password dengan JWT token
**FR-AUTH-004**: Login Google OAuth
**FR-AUTH-005**: Forgot password via email (reset link valid 24 jam)
**FR-AUTH-006**: Email verifikasi wajib setelah registrasi
**FR-AUTH-007**: 2FA via email OTP (optional, dapat diaktifkan user)
**FR-AUTH-008**: Session management (auto logout setelah 30 hari)
**FR-AUTH-009**: Rate limiting login (max 5 attempt, lock 15 menit)
**FR-AUTH-010**: Role assignment dan permission check per request

---

### 4.2 Modul E-Course

**FR-COURSE-001**: Listing kursus dengan filter (kategori, harga, rating, durasi, level)
**FR-COURSE-002**: Search kursus dengan full-text search
**FR-COURSE-003**: Halaman detail kursus (silabus, instruktur, review, preview gratis)
**FR-COURSE-004**: Sistem pembelian kursus (cart + checkout + payment)
**FR-COURSE-005**: Video player dengan kontrol playback (speed, fullscreen, PiP)
**FR-COURSE-006**: Progress tracking per modul/video
**FR-COURSE-007**: Sistem quiz per modul (multiple choice, essay)
**FR-COURSE-008**: Assignment upload (PDF/doc)
**FR-COURSE-009**: Auto-generate sertifikat setelah completion ≥ 80%
**FR-COURSE-010**: Rating & review system (1–5 bintang + komentar)
**FR-COURSE-011**: Wishlist kursus (simpan untuk nanti)
**FR-COURSE-012**: Related courses recommendation
**FR-COURSE-013**: Bundled course package
**FR-COURSE-014**: Subscription plan (akses semua kursus per kategori)
**FR-COURSE-015**: Notifikasi konten baru dari kursus yang diikuti
**FR-COURSE-016**: Fitur Q&A / diskusi per lesson (threaded comment)
**FR-COURSE-017**: Download materi pendukung (PDF, template)

**Course Builder (untuk Trainer):**
**FR-COURSE-B001**: Upload video (mp4, max 4GB per file)
**FR-COURSE-B002**: Organisasi kursus: Section → Lesson
**FR-COURSE-B003**: Tambah teks/narasi per lesson
**FR-COURSE-B004**: Tambah quiz per lesson atau per section
**FR-COURSE-B005**: Set lesson preview (gratis) atau locked (berbayar)
**FR-COURSE-B006**: Set harga kursus & jadwal publish
**FR-COURSE-B007**: Preview mode sebelum publish
**FR-COURSE-B008**: Analytics per kursus (enrollment, revenue, completion, rating)

---

### 4.3 Modul Event Management

**FR-EVENT-001**: Listing event dengan filter (tipe, tanggal, harga, kategori)
**FR-EVENT-002**: Halaman detail event (deskripsi, speaker, agenda, tiket)
**FR-EVENT-003**: Pembelian tiket (berbagai tier: free, regular, VIP, VVIP)
**FR-EVENT-004**: Kode promo/early bird per event
**FR-EVENT-005**: QR code tiket digital via email
**FR-EVENT-006**: Check-in sistem (scan QR untuk event offline)
**FR-EVENT-007**: Reminder otomatis (H-7, H-1, H-2 jam via email & push notification)
**FR-EVENT-008**: Live stream link distribution ke peserta terdaftar
**FR-EVENT-009**: Post-event: upload rekaman & materi
**FR-EVENT-010**: Auto-generate sertifikat keikutsertaan event
**FR-EVENT-011**: Rating event oleh peserta
**FR-EVENT-012**: Waitlist untuk event penuh
**FR-EVENT-013**: Refund management untuk event yang dibatalkan
**FR-EVENT-014**: Event recurring / multi-session management
**FR-EVENT-015**: Collaboration request form & management untuk partner event

**Event Admin:**
**FR-EVENT-A001**: Create/edit event dengan rich text editor
**FR-EVENT-A002**: Manajemen speaker/narasumber per event
**FR-EVENT-A003**: Manajemen tiket per tier + kuota
**FR-EVENT-A004**: Laporan peserta (export CSV)
**FR-EVENT-A005**: Broadcast email ke peserta event terdaftar

---

### 4.4 Modul Trainer Program

**FR-TRAINER-001**: Landing page Trainer Program dengan tier comparison
**FR-TRAINER-002**: Pembelian paket trainer (Starter, Professional, Master)
**FR-TRAINER-003**: Akses modul training trainer setelah pembelian
**FR-TRAINER-004**: Assignment submission & penilaian oleh senior trainer
**FR-TRAINER-005**: Progress tracking program trainer
**FR-TRAINER-006**: Assessment final trainer
**FR-TRAINER-007**: Issuance sertifikat trainer bersertifikat
**FR-TRAINER-008**: Aktivasi profil trainer di platform (setelah lulus)
**FR-TRAINER-009**: Trainer profile page (bio, expertise, kursus, rating)
**FR-TRAINER-010**: Onboarding trainer: upload course, set price, set payout

---

### 4.5 Modul E-Book

**FR-EBOOK-001**: Toko e-book dengan filter (kategori, harga, penulis)
**FR-EBOOK-002**: Preview halaman contoh e-book (3–5 halaman)
**FR-EBOOK-003**: Pembelian e-book (single + bundle)
**FR-EBOOK-004**: Reader in-browser (PDF viewer dengan DRM)
**FR-EBOOK-005**: Download e-book (watermark dengan nama pembeli)
**FR-EBOOK-006**: Rating & review e-book
**FR-EBOOK-007**: Related e-books recommendation
**FR-EBOOK-008**: Bundle course + e-book cross-sell
**FR-EBOOK-009**: Upload e-book oleh admin/penulis

---

### 4.6 Modul Marketplace Materi Event

**FR-MKTPL-001**: Listing materi event dengan filter (kategori, event asal, harga)
**FR-MKTPL-002**: Preview materi (thumbnail, deskripsi konten)
**FR-MKTPL-003**: Pembelian materi (per bundle/per item)
**FR-MKTPL-004**: Akses rekaman video via streaming (bukan download langsung)
**FR-MKTPL-005**: Download materi non-video (PDF, slide, worksheet)
**FR-MKTPL-006**: Rating & review produk marketplace
**FR-MKTPL-007**: Upload & kelola produk oleh creator/partner
**FR-MKTPL-008**: Revenue tracking per produk untuk creator

---

### 4.7 Modul LMS (B2B)

**FR-LMS-001**: Tenant management (per perusahaan/institusi = 1 workspace)
**FR-LMS-002**: Custom domain/subdomain per tenant
**FR-LMS-003**: Custom branding (logo, warna, nama platform)
**FR-LMS-004**: User management per tenant (invite, role, batch/grup)
**FR-LMS-005**: Course builder (sama seperti trainer, tapi konten internal)
**FR-LMS-006**: Library konten Jago Akademi (akses kursus platform, sesuai paket)
**FR-LMS-007**: Mandatory course assignment per batch/user
**FR-LMS-008**: Quiz & assessment builder
**FR-LMS-009**: Progress tracking individual
**FR-LMS-010**: Auto-generate sertifikat completion
**FR-LMS-011**: Reporting dashboard (completion rate, waktu belajar, nilai)
**FR-LMS-012**: Export laporan (PDF, Excel)
**FR-LMS-013**: Batch management (angkatan/kelas/divisi)
**FR-LMS-014**: Announcement / notifikasi ke user LMS
**FR-LMS-015**: API access untuk integrasi HRIS (paket Professional+)
**FR-LMS-016**: Mobile-responsive LMS portal

---

### 4.8 Modul Payment & Checkout

**FR-PAY-001**: Cart (dapat berisi multiple item dari berbagai kategori)
**FR-PAY-002**: Checkout flow (review order → apply coupon → pilih metode → bayar)
**FR-PAY-003**: Metode pembayaran:
  - Transfer bank virtual account (BCA, Mandiri, BNI, BRI)
  - QRIS
  - GoPay, OVO, Dana, ShopeePay
  - Kartu kredit/debit (Visa, Mastercard)
  - Cicilan (Akulaku, Kredivo)
  - Indomaret/Alfamart
**FR-PAY-004**: Kode kupon/voucher dengan validasi (sekali pakai, per user, expired date)
**FR-PAY-005**: Referral code tracking saat checkout
**FR-PAY-006**: Invoice otomatis per transaksi (PDF)
**FR-PAY-007**: Email konfirmasi pembayaran otomatis
**FR-PAY-008**: Refund management (request → review → approve → proses)
**FR-PAY-009**: Payment retry untuk pembayaran gagal
**FR-PAY-010**: Multi-currency (IDR primer, USD untuk konten internasional)

---

### 4.9 Modul Sertifikat

**FR-CERT-001**: Auto-generate sertifikat dengan template dinamis
**FR-CERT-002**: Data sertifikat: nama pemegang, nama kursus, tanggal, nomor unik
**FR-CERT-003**: QR code pada sertifikat untuk verifikasi online
**FR-CERT-004**: Halaman verifikasi publik: input nomor sertifikat → tampil validasi
**FR-CERT-005**: Download sertifikat (PDF high-quality)
**FR-CERT-006**: Share sertifikat ke LinkedIn (Open Graph metadata)
**FR-CERT-007**: Template sertifikat per jenis (course, trainer, event)
**FR-CERT-008**: Custom sertifikat untuk klien LMS (branding klien)

---

### 4.10 Modul Notifikasi

**FR-NOTIF-001**: Email transaksional (order, payment, sertifikat, reminder)
**FR-NOTIF-002**: Push notification browser (Web Push API)
**FR-NOTIF-003**: In-app notification (bell icon + notif center)
**FR-NOTIF-004**: WhatsApp notification via API (konfirmasi pembelian, reminder event)
**FR-NOTIF-005**: Email marketing (newsletter, promo) — opt-in
**FR-NOTIF-006**: Notifikasi admin: kursus baru perlu review, transaksi besar, complaint
**FR-NOTIF-007**: User notification preferences (dapat atur jenis notif yang diterima)

---

### 4.11 Modul Affiliate & Referral

**FR-AFF-001**: Registrasi program affiliate (open untuk semua user)
**FR-AFF-002**: Generate unique referral link per user
**FR-AFF-003**: Generate kode referral (alternatif link)
**FR-AFF-004**: Tracking klik, konversi, komisi per referral
**FR-AFF-005**: Dashboard affiliate: stats, riwayat, pending/paid komisi
**FR-AFF-006**: Komisi structure (% dari pembelian yang direferensikan)
**FR-AFF-007**: Penarikan komisi (minimum Rp 100.000, via bank/e-wallet)
**FR-AFF-008**: Multi-level referral (opsional, level 1 & 2)
**FR-AFF-009**: Leaderboard affiliate (gamifikasi)

---

### 4.12 Modul CRM & Admin Dashboard

**FR-CRM-001**: Database leads B2B (nama, perusahaan, kontak, sumber)
**FR-CRM-002**: Pipeline management (stage: Lead → Qualified → Demo → Proposal → Closed)
**FR-CRM-003**: Task & reminder per lead
**FR-CRM-004**: Email log per lead (history komunikasi)
**FR-CRM-005**: Laporan pipeline (conversion rate, avg deal size)
**FR-CRM-006**: Integrasi dengan form kolaborasi (auto masuk pipeline)

**Admin Dashboard:**
**FR-ADMIN-001**: Executive dashboard (GMV, MAU, NPS, growth chart)
**FR-ADMIN-002**: User management (search, filter, edit role, suspend)
**FR-ADMIN-003**: Course management (review, approve, reject, featured)
**FR-ADMIN-004**: Event management (create, edit, publish, cancel)
**FR-ADMIN-005**: Transaction management (list, search, refund)
**FR-ADMIN-006**: Coupon & promo management
**FR-ADMIN-007**: Content moderation (flag, remove, report handling)
**FR-ADMIN-008**: System settings (payment gateway, email, notification config)
**FR-ADMIN-009**: Audit log (semua aksi admin tercatat)

---

### 4.13 Modul Halaman Publik (Website)

**FR-WEB-001**: Halaman Home dengan hero, featured content, statistics, testimonial, CTA
**FR-WEB-002**: Halaman Tentang Kami (sejarah, misi, tim, media mention)
**FR-WEB-003**: Halaman Klien Sebelumnya (logo grid + highlight 3 case study)
**FR-WEB-004**: Halaman Event Sebelumnya (galeri foto/video + rekap metrics)
**FR-WEB-005**: Halaman Kolaborasi (benefit + form request + kontak)
**FR-WEB-006**: Halaman FAQ (accordion, searchable)
**FR-WEB-007**: Halaman Hubungi Kami (form + maps + WhatsApp float button)
**FR-WEB-008**: Blog/Artikel (kategori, tag, search, related post)
**FR-WEB-009**: Live Chat widget (Tawk.to / Crisp integration)
**FR-WEB-010**: Cookie consent banner (GDPR/UU PDP compliance)

---

## 5. NON-FUNCTIONAL REQUIREMENTS

### 5.1 Performance

| Requirement | Target |
|-------------|--------|
| Page Load Time (LCP) | < 2,5 detik (mobile & desktop) |
| Time to Interactive | < 3,5 detik |
| API Response Time (P95) | < 500ms |
| Video Start Time | < 3 detik |
| Concurrent Users | 10.000 (scalable to 100.000) |
| Database Query P95 | < 100ms |
| Uptime SLA | 99,9% (public), 99,5% (LMS B2B) |

### 5.2 Scalability

- Horizontal scaling untuk semua stateless services
- Auto-scaling berdasarkan CPU/memory threshold
- CDN untuk asset statis & video delivery
- Database sharding untuk LMS multi-tenant
- Queue-based async processing untuk video transcoding, sertifikat, email

### 5.3 Security

- HTTPS/TLS 1.3 wajib untuk semua endpoint
- JWT token dengan expiry 15 menit (refresh token 30 hari)
- Rate limiting per IP dan per user
- Input sanitization & validation di semua endpoint
- OWASP Top 10 compliance
- Annual penetration testing
- Video content tidak dapat di-download langsung (HLS streaming + signed URL)

### 5.4 Accessibility

- WCAG 2.1 Level AA compliance
- Keyboard navigable
- Screen reader compatible
- Alt text untuk semua gambar
- Contrast ratio minimum 4.5:1

### 5.5 Compatibility

- Browser: Chrome 100+, Firefox 100+, Safari 15+, Edge 100+
- Mobile: iOS 14+, Android 10+
- Responsive breakpoints: 320px, 768px, 1024px, 1440px

### 5.6 Lokalisasi

- Bahasa: Indonesia (primer), Inggris (opsional, phase 2)
- Timezone: WIB (UTC+7) default, adjustable per user
- Mata uang: IDR (primer)
- Format tanggal: DD/MM/YYYY

---

## 6. TECHNICAL REQUIREMENTS

### 6.1 Tech Stack Rekomendasi

**Frontend:**
- Framework: Next.js 14 (App Router) + React 18
- Styling: Tailwind CSS + shadcn/ui
- State Management: Zustand + TanStack Query
- Form: React Hook Form + Zod
- Video Player: Video.js atau Plyr.js
- Rich Text Editor: TipTap

**Backend:**
- API: Node.js + Express.js / Hono (REST API)
- Realtime: Socket.io (untuk chat & notif)
- Queue: BullMQ + Redis
- Video Processing: FFmpeg + cloud transcoding
- PDF Generation: Puppeteer (sertifikat, invoice)

**Database:**
- Primary: PostgreSQL 16 (via Supabase atau RDS)
- Cache: Redis 7
- Search: PostgreSQL Full-Text Search + Meilisearch
- File Storage: AWS S3 / Cloudflare R2

**Infrastructure:**
- Container: Docker + Docker Compose
- Orchestration: Kubernetes (production) / Fly.io / Railway
- CDN: Cloudflare
- Video CDN: Cloudflare Stream / Mux
- Email: Resend / AWS SES
- Monitoring: Sentry + Grafana + Prometheus

**Third-Party Integration:**
- Payment: DOKU (VA, QRIS, e-wallet)
- WhatsApp: Fonnte / WA Business API
- Push Notification: OneSignal / Firebase FCM
- Analytics: Google Analytics 4 + Mixpanel
- Maps: Google Maps API
- Auth: Supabase Auth / NextAuth.js

---

## 7. API REQUIREMENTS

### 7.1 API Design Principles

- RESTful API dengan JSON response
- Versioning: `/api/v1/`
- Authentication: Bearer JWT token di header
- Standard response envelope:

```json
{
  "success": true,
  "data": {},
  "error": null,
  "meta": {
    "total": 100,
    "page": 1,
    "limit": 20,
    "totalPages": 5
  }
}
```

### 7.2 Core API Endpoints

**Auth:**
```
POST   /api/v1/auth/register
POST   /api/v1/auth/login
POST   /api/v1/auth/logout
POST   /api/v1/auth/refresh
POST   /api/v1/auth/forgot-password
POST   /api/v1/auth/reset-password
POST   /api/v1/auth/verify-email
GET    /api/v1/auth/me
PATCH  /api/v1/auth/profile
```

**Courses:**
```
GET    /api/v1/courses                    (list + filter)
GET    /api/v1/courses/:slug              (detail)
POST   /api/v1/courses                   (trainer: create)
PATCH  /api/v1/courses/:id               (trainer: update)
DELETE /api/v1/courses/:id               (admin/trainer)
POST   /api/v1/courses/:id/enroll        (purchase/enroll)
GET    /api/v1/courses/:id/lessons       (list lessons)
GET    /api/v1/courses/:id/progress      (student progress)
PATCH  /api/v1/courses/:id/progress      (update progress)
POST   /api/v1/courses/:id/reviews       (add review)
GET    /api/v1/courses/:id/reviews       (list reviews)
POST   /api/v1/courses/:id/certificate   (generate cert)
```

**Events:**
```
GET    /api/v1/events
GET    /api/v1/events/:slug
POST   /api/v1/events                    (admin/partner)
PATCH  /api/v1/events/:id
POST   /api/v1/events/:id/register
GET    /api/v1/events/:id/participants   (admin)
POST   /api/v1/events/:id/checkin        (QR scan)
```

**Payment:**
```
POST   /api/v1/payment/checkout
POST   /api/v1/payment/webhook           (gateway callback)
GET    /api/v1/payment/orders
GET    /api/v1/payment/orders/:id
POST   /api/v1/payment/refund
GET    /api/v1/payment/invoices/:id
```

**LMS (B2B):**
```
GET    /api/v1/lms/workspace             (get tenant info)
PATCH  /api/v1/lms/workspace             (update settings)
GET    /api/v1/lms/users                 (list users in tenant)
POST   /api/v1/lms/users/invite          (bulk invite)
GET    /api/v1/lms/courses               (courses in LMS)
POST   /api/v1/lms/courses               (create LMS course)
GET    /api/v1/lms/reports/progress      (completion report)
GET    /api/v1/lms/reports/export        (Excel/PDF export)
```

**Certificates:**
```
GET    /api/v1/certificates/:code        (public verification)
GET    /api/v1/certificates/my           (user's certs)
POST   /api/v1/certificates/generate     (admin/system)
```

**Affiliate:**
```
GET    /api/v1/affiliate/dashboard
GET    /api/v1/affiliate/referrals
POST   /api/v1/affiliate/withdraw
GET    /api/v1/affiliate/link
```

**Admin:**
```
GET    /api/v1/admin/dashboard
GET    /api/v1/admin/users
PATCH  /api/v1/admin/users/:id
GET    /api/v1/admin/transactions
GET    /api/v1/admin/reports/revenue
GET    /api/v1/admin/reports/users
POST   /api/v1/admin/coupons
GET    /api/v1/admin/audit-log
```

---

## 8. DATABASE REQUIREMENTS

### 8.1 Core Entities

```sql
-- Users
users (id, email, name, avatar, role, is_verified, created_at)
user_profiles (user_id, phone, bio, linkedin, headline, location)
user_roles (user_id, role, tenant_id, created_at)

-- Courses
courses (id, slug, title, description, price, status, trainer_id, category_id,
         level, language, thumbnail, preview_video, created_at)
course_sections (id, course_id, title, sort_order)
course_lessons (id, section_id, title, type, content_url, duration, is_preview, sort_order)
course_enrollments (id, course_id, user_id, purchased_at, progress_pct, completed_at)
course_lesson_progress (id, enrollment_id, lesson_id, watched_pct, completed_at)
course_quizzes (id, lesson_id, title, pass_score)
course_quiz_questions (id, quiz_id, question, type, options, correct_answer)
course_reviews (id, course_id, user_id, rating, comment, created_at)

-- Events
events (id, slug, title, description, type, start_at, end_at, location,
        max_participants, status, organizer_id, thumbnail, created_at)
event_tickets (id, event_id, name, price, quota, sold, description)
event_registrations (id, event_id, user_id, ticket_id, qr_code, status, paid_at)
event_speakers (id, event_id, name, title, bio, photo)

-- E-Books
ebooks (id, slug, title, description, price, author_id, file_url,
        preview_url, cover_url, pages, published_at)
ebook_purchases (id, ebook_id, user_id, purchased_at)

-- Marketplace
marketplace_products (id, slug, title, description, price, creator_id,
                      type, thumbnail, content_url, event_id, status)
marketplace_purchases (id, product_id, user_id, purchased_at)

-- Certificates
certificates (id, code, type, user_id, course_id, event_id, issued_at,
              template_id, verified_url)

-- Payments
orders (id, user_id, total_amount, status, payment_method, paid_at,
        coupon_id, referral_code, created_at)
order_items (id, order_id, item_type, item_id, quantity, unit_price)
payment_transactions (id, order_id, gateway, gateway_tx_id, amount,
                      status, created_at)
refunds (id, order_id, amount, reason, status, processed_at)

-- Coupons
coupons (id, code, discount_type, discount_value, min_purchase, max_uses,
         used_count, valid_from, valid_until, scope, created_at)
coupon_uses (id, coupon_id, user_id, order_id, used_at)

-- Affiliate
affiliates (id, user_id, code, link, total_clicks, total_conversions,
            total_earnings, balance, status)
affiliate_referrals (id, affiliate_id, referred_user_id, order_id, 
                     commission_amount, status, created_at)
affiliate_withdrawals (id, affiliate_id, amount, bank_info, status, processed_at)

-- LMS (Multi-tenant)
lms_tenants (id, name, slug, domain, logo, primary_color, plan, 
             max_users, status, owner_id, contract_start, contract_end)
lms_users (id, tenant_id, user_id, role, batch_ids, invited_at, joined_at)
lms_batches (id, tenant_id, name, description, start_date, end_date)
lms_course_assignments (id, tenant_id, course_id, batch_id, is_mandatory, deadline)

-- Trainer
trainer_programs (id, user_id, tier, status, purchased_at, completed_at)
trainer_assignments (id, program_id, module, submission_url, grade, graded_by, graded_at)
trainer_profiles (user_id, headline, bio, expertise_tags, rating, total_students)

-- Notifications
notifications (id, user_id, type, title, body, is_read, data, created_at)

-- CRM
crm_leads (id, name, company, email, phone, source, stage, owner_id,
           notes, next_followup, created_at)
crm_activities (id, lead_id, type, notes, done_by, done_at)

-- Blog
blog_posts (id, slug, title, content, cover_url, author_id, category,
            tags, published_at, read_time)
```

### 8.2 Indexing Strategy

- Index pada semua foreign key
- Composite index pada (status + created_at) untuk listing query
- Full-text search index pada course title, description
- Partial index untuk active/published records
- UUID v4 untuk semua primary key (privacy + distributed safe)

---

## 9. SECURITY REQUIREMENTS

**SR-001**: HTTPS/TLS 1.3 mandatory semua endpoint
**SR-002**: JWT access token expiry 15 menit, refresh token 30 hari (HttpOnly cookie)
**SR-003**: CSRF protection via SameSite cookie + CSRF token
**SR-004**: SQL injection prevention via parameterized queries (tidak pernah string concat)
**SR-005**: XSS prevention: sanitize semua user-generated content (DOMPurify)
**SR-006**: File upload validation: type whitelist, size limit, virus scan
**SR-007**: Video content served via signed URL (expired 4 jam, tidak bisa share)
**SR-008**: E-book PDF watermark dengan nama & email pembeli
**SR-009**: Rate limiting: 100 req/menit per IP, 1000 req/menit per authenticated user
**SR-010**: Admin endpoint wajib 2FA
**SR-011**: Sensitive data (password, token) tidak pernah di-log
**SR-012**: PII (nama, email, nomor HP) di-encrypt at rest di database
**SR-013**: Payment data tidak pernah disentuh langsung (tokenized via gateway)
**SR-014**: Audit log semua aksi admin dengan IP dan timestamp
**SR-015**: CORS whitelist hanya domain resmi Jago Akademi
**SR-016**: Dependency scanning otomatis di CI/CD (npm audit, Snyk)

---

## 10. SEO REQUIREMENTS

**SEO-001**: Server-Side Rendering (SSR) atau Static Generation untuk semua halaman publik
**SEO-002**: Metadata dinamis: title, description, og:image per halaman/kursus/event
**SEO-003**: Structured data (JSON-LD): Course schema, Event schema, BreadcrumbList
**SEO-004**: Sitemap XML otomatis (di-generate ulang setiap course/event baru)
**SEO-005**: robots.txt yang melarang crawl halaman private
**SEO-006**: Canonical URL untuk mencegah duplicate content
**SEO-007**: Core Web Vitals: LCP < 2,5s, CLS < 0,1, INP < 200ms
**SEO-008**: Image WebP format + lazy loading + explicit width/height
**SEO-009**: URL structure SEO-friendly: /kursus/[slug-nama-kursus]
**SEO-010**: 301 redirect untuk URL lama jika slug berubah
**SEO-011**: Breadcrumb navigation dengan schema markup
**SEO-012**: Blog artikel dengan long-tail keyword targeting
**SEO-013**: Internal linking antar course, event, dan blog yang relevan

---

## 11. ANALYTICS REQUIREMENTS

### 11.1 Business Analytics

- **Revenue Dashboard**: GMV harian/mingguan/bulanan per unit bisnis
- **Funnel Analysis**: Visitor → Register → Purchase conversion
- **Cohort Analysis**: Retensi student per bulan akuisisi
- **Course Performance**: Enrollment, completion rate, rating, revenue per course
- **Event Performance**: Registrasi, kehadiran, rating, revenue per event
- **LMS Health**: MAU per tenant, completion rate, churn risk

### 11.2 Product Analytics (Mixpanel Events)

```
user_registered, user_logged_in
course_viewed, course_preview_played, course_purchased
lesson_started, lesson_completed, quiz_submitted
certificate_generated, certificate_shared
event_viewed, event_registered, event_attended
ebook_viewed, ebook_purchased
checkout_started, payment_completed, payment_failed
referral_link_shared, referral_converted
```

### 11.3 Marketing Analytics

- UTM parameter tracking di semua campaign URL
- Attribution model: first-touch + last-touch (multi-touch phase 2)
- Email open rate, click rate, conversion rate
- Social referral tracking
- Search keyword ranking (Google Search Console integration)

---

## 12. FEATURE PRIORITY

### MVP (Fase 1–3, Bulan 1–4)

**Must Have:**
- ✅ Auth (register, login, Google OAuth)
- ✅ Halaman publik (home, about, clients, FAQ, contact)
- ✅ E-Course (listing, detail, purchase, video player, progress, sertifikat)
- ✅ Event (listing, detail, pendaftaran, tiket digital)
- ✅ Payment Gateway (DOKU: VA, QRIS, e-wallet)
- ✅ Student Dashboard (my courses, progress, certificates)
- ✅ Admin Dashboard (dasar: kelola kursus, user, transaksi)
- ✅ Email notifikasi transaksional
- ✅ Sertifikat otomatis

### Phase 2 (Fase 4–6, Bulan 5–8)

**Should Have:**
- 🔵 Trainer Hub (course builder, analytics, payout)
- 🔵 Trainer Program (landing, purchase, modul, assessment)
- 🔵 E-Book (toko, reader, download)
- 🔵 Marketplace Materi Event
- 🔵 Affiliate & Referral System
- 🔵 Coupon & Promo System
- 🔵 LMS B2B (multi-tenant dasar)
- 🔵 Push notification & WhatsApp notif
- 🔵 Blog CMS
- 🔵 Review & Rating System

### Long-Term Growth (Fase 7–10, Bulan 9–18)

**Nice to Have:**
- 🟣 LMS Enterprise (white-label, API integration, SSO)
- 🟣 Mobile App (React Native)
- 🟣 AI-powered course recommendation
- 🟣 Live streaming terintegrasi (bukan Zoom)
- 🟣 Gamifikasi (badge, leaderboard, XP system)
- 🟣 Community forum per topik
- 🟣 Marketplace B2B (corporate beli kursus batch)
- 🟣 Multi-language (English)
- 🟣 Advanced analytics & BI dashboard
- 🟣 Partner API (third-party integrations)
- 🟣 Subscription bundle "Jago All Access"

---

*Dokumen PRD ini menjadi rujukan utama tim engineering dan product dalam development Jago Akademi.*
