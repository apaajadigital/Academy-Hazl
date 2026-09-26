# BUSINESS REQUIREMENT DOCUMENT (BRD)
## Jago Akademi — Platform Edukasi Digital Terintegrasi

> Versi: 1.0 | Status: Final Draft | Tanggal: 22 Juni 2026
> Disusun oleh: Tim Product & Strategy Jago Akademi

---

## DAFTAR ISI

1. [Latar Belakang & Konteks Bisnis](#1-latar-belakang--konteks-bisnis)
2. [Visi, Misi & Business Objective](#2-visi-misi--business-objective)
3. [Analisis Pasar & Kompetitor](#3-analisis-pasar--kompetitor)
4. [Unit Bisnis & Model Revenue](#4-unit-bisnis--model-revenue)
5. [Stakeholder Analysis](#5-stakeholder-analysis)
6. [Business Process End-to-End](#6-business-process-end-to-end)
7. [Role & Permission Matrix](#7-role--permission-matrix)
8. [Monetization Strategy](#8-monetization-strategy)
9. [Business Rules & Constraints](#9-business-rules--constraints)
10. [Compliance & Legal](#10-compliance--legal)
11. [Risk Analysis](#11-risk-analysis)
12. [Success Metrics & KPI Bisnis](#12-success-metrics--kpi-bisnis)

---

## 1. LATAR BELAKANG & KONTEKS BISNIS

### 1.1 Problem Statement

Pasar edukasi digital Indonesia tumbuh 18–22% YoY (2023–2026), namun mayoritas platform hanya melayani satu segmen:
- Platform kursus online tidak menyediakan jalur trainer profesional
- Platform LMS korporat tidak terhubung ke ekosistem belajar individu
- Event organizer edukasi tidak mengmonetisasi konten pasca-event
- Tidak ada platform terintegrasi yang menghubungkan student → trainer → institusi → event dalam satu ekosistem

**Gap yang diisi Jago Akademi**: Platform pertama yang mengintegrasikan journey belajar dari konsumsi konten → event partisipasi → sertifikasi trainer → distribusi LMS ke institusi, dalam satu ekosistem digital yang saling menopang.

### 1.2 Market Opportunity

| Segmen | Ukuran Pasar (2026) | CAGR |
|--------|---------------------|------|
| Online Learning Indonesia | USD 2,8 Miliar | 22% |
| Corporate LMS | USD 450 Juta | 18% |
| Digital Event | USD 320 Juta | 35% |
| Trainer Certification | USD 180 Juta | 25% |
| E-Book Digital | USD 95 Juta | 15% |

### 1.3 Unique Value Proposition

```
JAGO AKADEMI = Belajar (E-Course + E-Book)
             + Berlatih (Event + Trainer Program)
             + Berkolaborasi (Creator Marketplace)
             + Mengelola (LMS untuk institusi)
```

---

## 2. VISI, MISI & BUSINESS OBJECTIVE

### 2.1 Visi
> "Menjadi ekosistem edukasi digital terbesar di Indonesia yang melahirkan generasi profesional berdampak."

### 2.2 Misi
1. Menyediakan akses belajar berkualitas tinggi yang terjangkau dan relevan
2. Membangun komunitas trainer profesional bersertifikat
3. Menghadirkan solusi LMS komprehensif untuk institusi Indonesia
4. Menjadi platform kolaborasi event edukasi terpercaya

### 2.3 Business Objective (12 Bulan Pertama)

| Objective | Target | Timeline |
|-----------|--------|----------|
| Total Registered User | 50.000 | Bulan 12 |
| Paying Customer (B2C) | 10.000 | Bulan 12 |
| Revenue Run Rate | Rp 500 Juta/bulan | Bulan 12 |
| Certified Trainer | 500 | Bulan 12 |
| B2B LMS Klien | 50 institusi | Bulan 12 |
| Published E-Course | 200 kursus | Bulan 12 |
| Event Diselenggarakan | 50 event | Bulan 12 |
| Net Promoter Score | >45 | Bulan 12 |

---

## 3. ANALISIS PASAR & KOMPETITOR

### 3.1 Competitive Landscape

| Platform | Segmen Utama | Kekuatan | Kelemahan |
|----------|-------------|----------|-----------|
| MySkill | Career Skills | Konten berkualitas, komunitas aktif | Tidak ada LMS B2B, event terbatas |
| Ruangguru | K-12 | Brand kuat, gamifikasi | Tidak relevan untuk profesional |
| Skill Academy | Soft Skills | Integrasi Tokopedia | Ekosistem terbatas |
| Coursera (Global) | Higher Ed | Konten global, sertifikasi partner | Harga mahal, tidak lokal |
| Udemy (Global) | Multi-topic | Marketplace konten | Kualitas tidak konsisten |
| Dicoding | Tech/IT | Developer community | Niche, tidak multi-domain |

### 3.2 Analisis MySkill sebagai Referensi Utama

**Hal yang diadopsi & ditingkatkan dari MySkill:**
- ✅ Live class & recorded class hybrid model
- ✅ Sertifikat completion dengan tracking progress
- ✅ Community engagement per topik
- ✅ Bootcamp intensive program

**Hal yang tidak ada di MySkill namun ada di Jago Akademi:**
- 🚀 Trainer Certification Program dengan jalur karier trainer
- 🚀 LMS white-label untuk institusi (B2B SaaS)
- 🚀 Event marketplace dengan monetisasi pasca-event
- 🚀 Creator/Partner collaboration program (Revenue Share)
- 🚀 Affiliate & referral program terstruktur
- 🚀 E-Book digital store terintegrasi

### 3.3 Positioning Map

```
                    HIGH QUALITY
                        |
              Coursera  |  JAGO AKADEMI
                        |  (Target)
LOW PRICE ─────────────────────────── HIGH PRICE
                        |
           MySkill      |   SkillAcademy
                        |
                    LOW QUALITY
```

---

## 4. UNIT BISNIS & MODEL REVENUE

### 4.1 Unit Bisnis 1: Trainer Program

**Deskripsi**: Program sertifikasi dan pengembangan trainer profesional. Individu mendaftar → mengikuti training → mendapat sertifikasi → bisa menjadi trainer di platform atau institusi lain.

**Sub-produk:**
- Trainer Starter Pack (Rp 1,5 Juta)
- Trainer Professional (Rp 3,5 Juta)
- Trainer Master (Rp 7,5 Juta)
- Corporate Trainer License (B2B, custom pricing)

**Revenue Model**: One-time purchase + renewal tahunan
**Target**: 500 certified trainer di tahun pertama

---

### 4.2 Unit Bisnis 2: Paket LMS

**Deskripsi**: Learning Management System berbasis SaaS untuk sekolah, universitas, perusahaan, dan institusi pemerintah.

**Paket LMS:**

| Paket | Target | Harga/Bulan | User Limit |
|-------|--------|-------------|------------|
| LMS Starter | SME, startup | Rp 1,5 Juta | 50 user |
| LMS Growth | Perusahaan menengah | Rp 4,5 Juta | 250 user |
| LMS Professional | Enterprise | Rp 12,5 Juta | 1.000 user |
| LMS Enterprise | Konglomerat/Govt | Custom | Unlimited |

**Fitur LMS:**
- Course builder (upload video, PDF, quiz, assignment)
- Batch management (kelola angkatan/kelas)
- Progress tracking per user
- Sertifikat otomatis
- Analytics & laporan completion
- White-label (logo & domain sendiri) untuk paket Professional ke atas
- API integration ke HRIS/ERP klien

**Revenue Model**: Monthly/Annual SaaS subscription
**Target**: 50 klien B2B tahun pertama

---

### 4.3 Unit Bisnis 3: Event

**Deskripsi**: Platform pengelolaan dan penjualan tiket event edukasi — baik event internal Jago Akademi maupun event kolaborasi dengan creator, komunitas, dan pemegang IP.

**Tipe Event:**
- Webinar online (gratis & berbayar)
- Workshop intensif (online/offline)
- Conference & summit
- Bootcamp (multi-session)
- Masterclass (exclusive, high-ticket)

**Model Kolaborasi Event:**
- **Internal Event**: Jago Akademi sebagai organizer, 100% revenue
- **Partner Event**: Revenue share 70:30 (partner:Jago Akademi)
- **IP Event**: Licensing fee + % tiket

**Revenue Model**: Tiket event + sponsorship + merchandise
**Target**: 50 event per tahun, rata-rata 200 peserta/event

---

### 4.4 Unit Bisnis 4: E-Course

**Deskripsi**: Kelas online berbasis video learning dengan sistem progress tracking, quiz, assignment, dan sertifikat.

**Tipe Course:**
- Self-paced (akses selamanya setelah beli)
- Live class (jadwal tetap, rekaman tersedia post-event)
- Cohort-based (batch dengan deadline)
- Subscription bundle (akses semua course kategori tertentu)

**Kategori Course:**
- Business & Entrepreneurship
- Marketing & Digital
- Technology & Data
- Finance & Accounting
- Human Resources & Training
- Leadership & Management
- Creative & Design
- Personal Development

**Pricing:**
- Self-paced course: Rp 150.000 – Rp 1.500.000
- Live class: Rp 300.000 – Rp 3.000.000
- Subscription: Rp 99.000/bulan atau Rp 799.000/tahun

**Revenue Model**: One-time purchase + subscription
**Target**: 200 course aktif tahun pertama

---

### 4.5 Unit Bisnis 5: E-Book

**Deskripsi**: Toko buku digital terintegrasi platform, menjual e-book karya trainer internal, penulis eksternal, dan bundle course+ebook.

**Format**: PDF + ePub (dengan DRM protection)
**Harga**: Rp 29.000 – Rp 299.000/judul
**Bundle**: Tersedia paket course + e-book dengan diskon

**Revenue Model**: Per-judul purchase + royalty split (70% penulis : 30% platform)
**Target**: 500 judul e-book aktif tahun pertama

---

### 4.6 Unit Bisnis 6: Marketplace Materi Event

**Deskripsi**: Marketplace penjualan rekaman, modul, slide, template, dan materi pasca-event. Creator event dapat memonetisasi ulang konten setelah event berakhir.

**Tipe Produk:**
- Rekaman video event (full/highlight)
- Slide presentasi + template
- Workbook & worksheet event
- Bundle materi (rekaman + slide + workbook)

**Pricing**: Rp 49.000 – Rp 499.000/bundle
**Revenue Model**: Per-produk purchase, revenue share 60:40 (creator:platform)
**Target**: 300 produk aktif akhir tahun pertama

---

### 4.7 Revenue Projection (12 Bulan)

| Unit Bisnis | Target Revenue/Bulan (Bulan 12) | Annual Run Rate |
|-------------|----------------------------------|-----------------|
| E-Course | Rp 150 Juta | Rp 1,8 M |
| Trainer Program | Rp 100 Juta | Rp 1,2 M |
| Paket LMS | Rp 120 Juta | Rp 1,44 M |
| Event | Rp 80 Juta | Rp 960 Juta |
| E-Book | Rp 30 Juta | Rp 360 Juta |
| Marketplace Materi | Rp 20 Juta | Rp 240 Juta |
| **TOTAL** | **Rp 500 Juta** | **Rp 6 M** |

---

## 5. STAKEHOLDER ANALYSIS

### 5.1 Internal Stakeholder

| Stakeholder | Peran | Kebutuhan Utama |
|-------------|-------|-----------------|
| CEO/Founder | Pemilik visi, investor relations | Dashboard eksekutif, growth metrics |
| Product Manager | Roadmap & backlog | Analytics, user feedback |
| Engineering Lead | Arsitektur & delivery | Tech docs, API specs |
| Marketing Lead | Akuisisi & retensi | CRM, analytics, konten |
| Finance | Revenue & cashflow | Laporan keuangan, payment gateway |
| Content Team | Produksi course & e-book | CMS, upload tools |
| CS Team | Support pengguna | Helpdesk, ticket system |

### 5.2 External Stakeholder

| Stakeholder | Peran | Kebutuhan Utama |
|-------------|-------|-----------------|
| Student/Learner | Konsumen utama | UX mudah, konten berkualitas |
| Trainer | Produsen konten | Revenue share, analytics |
| Corporate Client | Pelanggan LMS B2B | Laporan, customization, SLA |
| Event Partner/Creator | Kolaborator event | Rev share, tools promosi |
| Payment Gateway | Infrastruktur pembayaran | Integrasi stabil, reconciliation |
| Investor | Pendanaan | Growth metrics, unit economics |
| Pemerintah/Regulator | Kepatuhan | Legalitas konten, pajak |

---

## 6. BUSINESS PROCESS END-TO-END

### 6.1 Proses: Pembelian E-Course

```
Visitor → Landing Page Course → Preview Gratis → Klik Beli
→ Login/Register → Checkout → Pilih Metode Bayar
→ Payment Gateway → Konfirmasi Pembayaran
→ Akses Course Terbuka → Progress Tracking
→ Selesaikan Semua Modul → Quiz Final
→ Generate Sertifikat → Share / Download
→ Upsell ke Course Lanjutan / Trainer Program
```

### 6.2 Proses: Pendaftaran Trainer Program

```
Visitor/Student → Halaman Trainer Program
→ Baca Kurikulum & Benefit → Konsultasi (optional, via WhatsApp/Chat)
→ Pilih Paket Trainer → Checkout & Bayar
→ Onboarding Email → Akses Modul Trainer
→ Kerjakan Assignment & Praktik
→ Assessment oleh Senior Trainer
→ Lulus → Terbit Sertifikat Trainer
→ Profil Trainer Aktif di Platform → Mulai Menjual Expertise
→ Revenue Share dari Course/Event yang dibuat
```

### 6.3 Proses: Onboarding Klien LMS (B2B)

```
Lead Masuk (website/referral/sales outreach)
→ Demo Request → Tim Sales Demo Platform
→ Proposal Paket LMS → Negosiasi & Kontrak
→ Onboarding: Setup workspace klien
→ Upload konten klien (video, PDF, quiz)
→ Import user (karyawan/mahasiswa)
→ Konfigurasi branding (logo, warna, domain)
→ Go-live → Monitoring SLA
→ Monthly Check-in & Report → Renewal / Upsell
```

### 6.4 Proses: Penyelenggaraan Event

```
Inisiasi Event (internal / partner request)
→ Buat Event di Admin Dashboard
→ Setup halaman event (judul, deskripsi, speaker, jadwal)
→ Setup tiket (gratis/berbayar, kuota, early bird)
→ Publish & Promosi → Pendaftaran Peserta
→ Pembayaran Tiket → Konfirmasi & QR Code
→ Reminder otomatis (H-7, H-1, H-0)
→ Pelaksanaan Event (link Zoom/offline)
→ Post-event: Upload Rekaman & Materi
→ Publikasi di Marketplace Materi
→ Laporan Event: Peserta, Revenue, Rating
→ Sertifikat Keikutsertaan dikirim ke peserta
```

### 6.5 Proses: Creator Collaboration

```
Creator/Komunitas → Isi Form Collaboration Request
→ Tim Jago Akademi Review (3–5 hari kerja)
→ Meeting Alignment: konsep, target, rev share
→ Kontrak Kolaborasi ditandatangani
→ Co-branding halaman event/course
→ Promosi bersama (email, sosmed, komunitas)
→ Event/Course berlangsung
→ Rekap revenue → Transfer sesuai kesepakatan
→ Laporan kolaborasi dikirim ke partner
```

### 6.6 Proses: Affiliate / Referral

```
Student/Trainer mendaftar sebagai Affiliate
→ Dapat unique referral link/code
→ Share ke jaringan → Traffic datang via link
→ Konversi pembelian → Komisi tercatat otomatis
→ Dashboard affiliate: klik, konversi, komisi
→ Pencairan komisi (minimum Rp 100.000) via transfer bank
```

---

## 7. ROLE & PERMISSION MATRIX

### 7.1 Definisi Role

| Role | Kode | Deskripsi |
|------|------|-----------|
| Visitor | VISITOR | Belum login, akses public page |
| Student | STUDENT | User terdaftar & pembeli |
| Trainer | TRAINER | Instruktur bersertifikat |
| Trainer Candidate | TRAINER_CAND | Sedang menjalani program trainer |
| Event Participant | EVENT_PART | Peserta event terdaftar |
| Corporate Client | CORP_CLIENT | Admin perusahaan/institusi pengguna LMS |
| LMS Sub-User | LMS_USER | Karyawan/mahasiswa di klien LMS |
| Partner/Creator | PARTNER | Kolaborator event & konten |
| Affiliate | AFFILIATE | Anggota program referral |
| Admin Konten | ADMIN_CONTENT | Kelola course, e-book, materi |
| Admin Event | ADMIN_EVENT | Kelola event & peserta |
| Admin CRM | ADMIN_CRM | Kelola leads B2B & follow-up |
| Admin Keuangan | ADMIN_FINANCE | Kelola transaksi & payout |
| Admin CS | ADMIN_CS | Kelola tiket support |
| Super Admin | SUPER_ADMIN | Full access semua modul |

### 7.2 Permission Matrix

| Permission | VISITOR | STUDENT | TRAINER | CORP_CLIENT | PARTNER | ADMIN_* | SUPER_ADMIN |
|-----------|---------|---------|---------|-------------|---------|---------|-------------|
| Lihat halaman publik | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Register/Login | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Beli course/ebook/event | ❌ | ✅ | ✅ | ✅ | ✅ | ❌ | ✅ |
| Akses materi yang dibeli | ❌ | ✅ | ✅ | ✅ | ✅ | ❌ | ✅ |
| Upload & kelola konten | ❌ | ❌ | ✅ | ✅ (LMS) | ✅ | ✅ | ✅ |
| Lihat analytics course | ❌ | ❌ | ✅ (milik) | ✅ (LMS) | ✅ (milik) | ✅ | ✅ |
| Generate sertifikat | ❌ | ✅ (auto) | ✅ | ✅ | ✅ | ✅ | ✅ |
| Daftar event | ❌ | ✅ | ✅ | ✅ | ✅ | ❌ | ✅ |
| Buat event | ❌ | ❌ | ❌ | ❌ | ✅ (partner) | ✅ | ✅ |
| Kelola LMS workspace | ❌ | ❌ | ❌ | ✅ | ❌ | ✅ | ✅ |
| Akses dashboard affiliate | ❌ | ✅ | ✅ | ✅ | ✅ | ❌ | ✅ |
| Kelola user platform | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ |
| Kelola payment & payout | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ (Finance) | ✅ |
| Akses CRM | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ (CRM) | ✅ |
| Full system access | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |

---

## 8. MONETIZATION STRATEGY

### 8.1 Revenue Streams

**B2C Revenue Streams:**
1. **Course Purchase**: Per kursus, one-time payment
2. **Course Subscription**: Akses unlimited per kategori/all-access
3. **Event Ticket**: Per event, graded tiering (regular/VIP/VVIP)
4. **E-Book Purchase**: Per judul
5. **Marketplace Materi**: Per bundle/produk
6. **Trainer Program**: Per paket tier

**B2B Revenue Streams:**
1. **LMS SaaS Subscription**: Bulanan/tahunan per tier
2. **LMS Setup Fee**: Onboarding & konfigurasi awal
3. **LMS Add-on**: Fitur tambahan (white-label, API, custom report)
4. **Corporate Training Event**: Private event untuk klien korporat
5. **Content Licensing**: Konten Jago Akademi untuk LMS klien

**Indirect Revenue:**
1. **Affiliate Commission Fee**: Platform ambil 10% dari penjualan via affiliate
2. **Sponsorship Event**: Brand placement di event besar
3. **Ad Placement (Future)**: Banner/promosi dari brand partner
4. **Data Insight (Anonymized)**: Laporan tren belajar untuk brand partner

### 8.2 Pricing Strategy

**Penetration Pricing (Bulan 1–6):**
- Diskon 30–50% untuk early adopter
- Freemium course starter untuk akuisisi

**Value-Based Pricing (Bulan 7–12):**
- Harga berdasarkan outcome (sertifikasi, career impact)
- Bundle pricing untuk meningkatkan AoV

**Dynamic Pricing (Tahun 2):**
- Flash sale (24/48 jam)
- Early bird tiket event
- Seasonal sale (Hari Pendidikan, Harbolnas)

### 8.3 Unit Economics Target

| Metric | Target (Bulan 12) |
|--------|-------------------|
| Customer Acquisition Cost (CAC) | < Rp 150.000 |
| Lifetime Value (LTV) | > Rp 1.500.000 |
| LTV:CAC Ratio | > 10x |
| Gross Margin | > 65% |
| Monthly Churn (B2B LMS) | < 3% |
| Average Order Value | > Rp 500.000 |

---

## 9. BUSINESS RULES & CONSTRAINTS

### 9.1 Course & Konten

- Setiap course wajib memiliki minimal 3 modul dan 1 quiz
- Sertifikat hanya diterbitkan jika completion rate ≥ 80%
- Konten video wajib di-host di CDN (bukan YouTube embed untuk konten berbayar)
- Uji materi oleh tim QC sebelum dipublikasikan
- Trainer wajib aktif merespons komentar dalam 3x24 jam
- Konten harus berbahasa Indonesia atau memiliki subtitle Indonesia

### 9.2 Pembayaran & Refund

- Refund diizinkan dalam 7 hari jika progress < 10%
- Refund tidak berlaku untuk event yang sudah berlangsung
- Pembayaran wajib via gateway resmi (tidak transfer manual)
- Payout trainer: bulanan, minimum Rp 500.000
- Payout affiliate: bulanan, minimum Rp 100.000
- Fee platform: 30% untuk course trainer, 40% untuk marketplace materi event

### 9.3 Event

- Event berbayar wajib mencantumkan kebijakan refund
- Pembatalan event oleh platform: refund 100% + voucher kompensasi
- Rekaman event dapat dipublikasikan di marketplace minimum 7 hari setelah event
- Speaker/narasumber wajib menyerahkan materi minimal H-3 event

### 9.4 LMS

- SLA uptime: 99.5% per bulan
- Data klien tidak boleh dicampur antar tenant
- Backup data klien: harian (7 hari retensi), mingguan (4 minggu retensi)
- Penghapusan data klien setelah kontrak berakhir: 30 hari grace period

---

## 10. COMPLIANCE & LEGAL

### 10.1 Regulasi yang Berlaku

| Regulasi | Implikasi |
|----------|-----------|
| UU PDP No. 27/2022 | Perlindungan data pribadi pengguna |
| UU ITE | Konten digital, tanda tangan elektronik |
| PP Pendidikan Jarak Jauh | Akreditasi & standar LMS |
| Perpajakan (PPh & PPN) | PPN 11% untuk produk digital, PPh untuk payout |
| POJK (untuk konten finansial) | Disclaimer wajib di course finance/investasi |

### 10.2 Data Privacy

- Cookie consent harus tampil sebelum tracking aktif
- Pengguna dapat request export data (format JSON/CSV)
- Pengguna dapat request hapus akun (RTBF — Right to be Forgotten)
- Data tidak boleh dijual ke pihak ketiga
- Log akses disimpan minimum 12 bulan

### 10.3 Konten

- Semua konten wajib bebas dari SARA, ujaran kebencian, pornografi
- Hak cipta konten: trainer memiliki hak cipta, Jago Akademi mendapat lisensi distribusi
- Plagiarisme konten: mekanisme DMCA takedown tersedia
- Konten kesehatan/hukum/keuangan wajib disclaimer profesional

---

## 11. RISK ANALYSIS

### 11.1 Business Risk

| Risk | Probabilitas | Dampak | Mitigasi |
|------|-------------|--------|---------|
| Low conversion rate awal | Tinggi | Tinggi | Freemium funnel + promosi agresif |
| Kualitas konten tidak konsisten | Sedang | Tinggi | QC process ketat sebelum publish |
| Churn LMS klien B2B | Sedang | Tinggi | Dedicated CS + quarterly review |
| Kompetitor replication | Tinggi | Sedang | Kecepatan eksekusi + network effect |
| Payment gateway downtime | Rendah | Tinggi | Multi-gateway failover |
| Trainer tidak produktif | Sedang | Sedang | Incentive program + support |
| Event gagal kuorum | Sedang | Sedang | Minimum peserta policy + refund SOP |

### 11.2 Technical Risk

| Risk | Mitigasi |
|------|---------|
| Video streaming bottleneck | CDN global + adaptive bitrate |
| Database scalability | Horizontal scaling + read replicas |
| Security breach | Penetration testing + WAF |
| Third-party API dependency | Fallback & circuit breaker |
| DDoS attack | Cloudflare + rate limiting |

---

## 12. SUCCESS METRICS & KPI BISNIS

### 12.1 Growth Metrics

| KPI | Baseline | Target M6 | Target M12 |
|-----|----------|-----------|------------|
| Total Registered User | 0 | 20.000 | 50.000 |
| Monthly Active User (MAU) | 0 | 8.000 | 25.000 |
| Paying Customer | 0 | 3.000 | 10.000 |
| B2B LMS Klien | 0 | 20 | 50 |
| Certified Trainer | 0 | 200 | 500 |

### 12.2 Revenue Metrics

| KPI | Target M6 | Target M12 |
|-----|-----------|------------|
| Monthly Recurring Revenue (MRR) | Rp 150 Juta | Rp 500 Juta |
| Annual Recurring Revenue (ARR) | Rp 1,8 M | Rp 6 M |
| Average Revenue per User (ARPU) | Rp 50.000 | Rp 80.000 |
| Gross Revenue Retention (B2B) | N/A | > 85% |
| Net Revenue Retention (B2B) | N/A | > 110% |

### 12.3 Engagement Metrics

| KPI | Target M12 |
|-----|-----------|
| Course Completion Rate | > 40% |
| NPS Score | > 45 |
| Monthly Return Rate (student) | > 35% |
| Support Ticket Resolution < 24h | > 90% |
| Course Rating Average | > 4.2/5 |

---

*Dokumen BRD ini merupakan landasan strategis untuk seluruh development Jago Akademi. Semua keputusan produk dan teknis harus merujuk kembali ke dokumen ini.*

---
**Dibuat oleh:** Tim Product & Strategy Jago Akademi
**Review oleh:** CEO, Engineering Lead, Finance
**Status:** Approved for Development
