# IMPLEMENTATION ROADMAP — 10 FASE PENGERJAAN
## Jago Akademi — Platform Edukasi Digital Terintegrasi

> Versi: 1.0 | Status: Final Draft | Tanggal: 22 Juni 2026
> Total Estimasi: 12–14 Bulan (Fase 1–10)

---

## RINGKASAN ROADMAP

```
FASE  NAMA                        DURASI   BULAN   MVP/P2/LT
──────────────────────────────────────────────────────────────
01    Discovery & Strategy         2 minggu  M1      PRE
02    Product Validation & UX      3 minggu  M1-2    PRE
03    UI Design System             4 minggu  M2-3    PRE
04    System Architecture Setup    3 minggu  M3      PRE
05    Core Development (MVP)       8 minggu  M3-5    MVP
06    E-Commerce & Payment         4 minggu  M5-6    MVP
07    LMS Development (B2B)        6 minggu  M6-8    P2
08    Phase 2 Features             8 minggu  M7-9    P2
09    Testing & Quality Assurance  4 minggu  M9-10   ALL
10    Launch, Growth & Scale       Ongoing   M10+    LT
──────────────────────────────────────────────────────────────
```

---

## FASE 1: DISCOVERY & STRATEGY

### Objective
Membangun fondasi strategis, menyelaraskan visi, dan mendefinisikan scope produk secara menyeluruh sebelum development dimulai.

### Timeline
**Durasi**: 2 minggu | **Periode**: Bulan 1, Minggu 1–2

### Scope
- Finalisasi Business Requirement Document (BRD)
- Finalisasi Product Requirement Document (PRD)
- Stakeholder alignment meeting
- Competitive analysis mendalam
- Revenue model finalisasi
- Tech stack decision

### Deliverables
- [ ] BRD v1.0 (approved)
- [ ] PRD v1.0 (approved)
- [ ] Competitive analysis report
- [ ] Tech stack decision document
- [ ] Team structure & RACI matrix
- [ ] Project management setup (Notion/Linear/Jira)
- [ ] Communication channels setup (Slack/Discord)
- [ ] Budget planning dokumen

### Team Requirement
| Role | Jumlah | Keterlibatan |
|------|--------|-------------|
| Product Manager | 1 | Full-time |
| CEO/Founder | 1 | Part-time (strategic) |
| Tech Lead | 1 | Part-time (tech review) |
| Business Analyst | 1 | Full-time |

### Business Tasks

> ⚠️ **Catatan (TASK-050 / INC-01):** dokumen roadmap ini merekam rencana awal yang menyebut **Midtrans**. **Keputusan final = DOKU** (lihat `00-INDEX.md`, `03-SYSTEM-ARCHITECTURE.md`, `apps/api/src/services/payment/dokuService.ts`). Referensi "Midtrans" di bawah dipertahankan sebagai catatan historis perencanaan; implementasi aktual memakai DOKU. Midtrans/Xendit hanya opsi failover potensial (Indonesia) / gateway Malaysia (Xendit, lihat 10D).

- Finalisasi unit bisnis dan pricing per produk
- Konfirmasi payment gateway (final: **DOKU**; rencana awal menyebut Midtrans)
- Legal: persiapkan ToS, Privacy Policy, Kontrak Trainer
- Tentukan domain & branding dasar
- Setup entitas hukum (PT) jika belum ada

### Technical Tasks
- Evaluasi dan pilih tech stack final
- Buat ADR (Architecture Decision Records)
- Setup repositori GitHub (monorepo)
- Define branch strategy (GitFlow)
- Setup project management tool

### Risk Analysis
| Risk | Level | Mitigasi |
|------|-------|---------|
| Scope creep dari stakeholder | Tinggi | Lock PRD sebelum development |
| Budget tidak cukup | Sedang | Buat 3 skenario budget |
| Tim belum lengkap | Sedang | Mulai rekrutmen di fase ini |

### Expected Outcome
- Semua stakeholder selaras dengan visi, scope, dan roadmap
- PRD & BRD final sebagai single source of truth
- Tim inti terbentuk
- Tool & infrastruktur kolaborasi siap

---

## FASE 2: PRODUCT VALIDATION & UX RESEARCH

### Objective
Memvalidasi asumsi produk dengan riset pengguna nyata sebelum investasi besar di design dan development.

### Timeline
**Durasi**: 3 minggu | **Periode**: Bulan 1 Minggu 3 – Bulan 2 Minggu 1

### Scope
- User interviews (min. 15 responden per persona)
- Competitor UX audit (MySkill, Ruangguru, Skill Academy)
- Information Architecture (IA) mapping
- Sitemap & user flow wireframe
- Usability test prototype awal

### Deliverables
- [ ] User research report (15+ wawancara)
- [ ] Competitive UX analysis
- [ ] Information Architecture diagram
- [ ] Sitemap lengkap
- [ ] Low-fidelity wireframe (semua halaman utama)
- [ ] User flow diagram per role
- [ ] Jobs-to-be-Done (JTBD) mapping

### Team Requirement
| Role | Jumlah | Keterlibatan |
|------|--------|-------------|
| UX Researcher | 1 | Full-time |
| Product Manager | 1 | Full-time |
| UX Designer | 1 | Part-time (IA & wireframe) |

### Business Tasks
- Rekrut 15–20 responden untuk interview (via LinkedIn, komunitas)
- Survey online ke 200+ responden (Google Form)
- Analisis top 5 platform kompetitor (fitur, pain point, pricing)
- Validasi asumsi pricing dengan target user

### Technical Tasks
- Buat low-fi wireframe di Figma
- Buat clickable prototype untuk usability test
- Jalankan 5 usability test session
- Dokumentasikan insight & iterasi wireframe

### UX Research Focus Areas
```
1. Discovery (bagaimana user menemukan kursus)
2. Trust (apa yang membuat user percaya untuk beli)
3. Learning experience (apa yang membuat user tetap belajar)
4. Certificate value (seberapa penting sertifikat)
5. Event motivation (kenapa ikut event, apa yang dicari)
6. B2B (pain point training manager saat ini)
7. Trainer motivation (apa yang mendorong jadi trainer)
8. Payment preference (metode favorit, hambatan bayar)
```

### Risk Analysis
| Risk | Level | Mitigasi |
|------|-------|---------|
| Susah rekrut responden | Sedang | Insentif voucher Rp 50-100k per interview |
| Insight tidak konsisten | Rendah | Triangulasi dengan data kompetitor |
| Waktu interview molor | Sedang | Parallel interview 2-3 per hari |

### Expected Outcome
- Data primer untuk menginformasikan semua keputusan UX
- Wireframe yang sudah divalidasi
- Prioritas fitur MVP lebih tepat sasaran
- Menghindari build fitur yang tidak dibutuhkan user

---

## FASE 3: UI DESIGN SYSTEM

### Objective
Membangun design system yang konsisten dan komprehensif sebagai fondasi semua tampilan Jago Akademi.

### Timeline
**Durasi**: 4 minggu | **Periode**: Bulan 2 Minggu 2 – Bulan 3 Minggu 2

### Scope
- Brand identity refinement (logo, color, typography)
- Design system & component library (Figma)
- High-fidelity mockup semua halaman MVP
- Responsive design (mobile, tablet, desktop)
- Dark mode preparation

### Deliverables
- [ ] Brand guideline final (warna, tipografi, logo usage)
- [ ] Design system di Figma (atoms, molecules, organisms)
- [ ] Hi-fi mockup: Home, Catalog, Detail Course, Checkout, Dashboard
- [ ] Hi-fi mockup: Event, E-Book, Trainer Program, LMS landing
- [ ] Hi-fi mockup: Admin dashboard
- [ ] Mobile-first design untuk semua halaman
- [ ] Interaction design (hover, animation, state)
- [ ] Design handoff ke developer (Figma inspect)

### Team Requirement
| Role | Jumlah | Keterlibatan |
|------|--------|-------------|
| UI/UX Designer (Senior) | 1 | Full-time |
| UI Designer | 1 | Full-time |
| Brand Designer | 1 | Part-time |
| Product Manager | 1 | Review & approval |

### Design Principles untuk Jago Akademi
```
1. TRUST-FIRST: Desain harus memancarkan kredibilitas & kepercayaan
2. CLARITY: Hierarki informasi jelas, tidak ada kebingungan
3. MOMENTUM: Setiap halaman mendorong langkah berikutnya
4. WARMTH: Terasa manusiawi, tidak kaku korporat
5. PERFORMANCE: Desain yang ringan, tidak berlebihan animasi
```

### Design System Components (Priority)
```
Foundation:
  Colors (primary, secondary, neutral, semantic)
  Typography (heading 1-6, body, caption, code)
  Spacing scale (4, 8, 12, 16, 24, 32, 48, 64px)
  Border radius, shadow tokens
  Icon system (Lucide base + custom)

Components:
  Button (primary, secondary, ghost, danger)
  Input, Textarea, Select, Checkbox, Radio
  Card (course card, event card, ebook card)
  Navigation (top nav, sidebar, mobile menu)
  Modal, Drawer, Toast notification
  Badge, Tag, Avatar
  Progress bar
  Video player overlay
  Pricing table
  Testimonial carousel
  Rating stars
  Accordion (FAQ)
  Table (admin)
  Chart components
```

### Risk Analysis
| Risk | Level | Mitigasi |
|------|-------|---------|
| Design terlalu complex → slow dev | Sedang | Prioritas component untuk MVP |
| Revisi berulang dari stakeholder | Tinggi | Approval process bertahap |
| Inkonsistensi antara designer | Sedang | Review component library mingguan |

### Expected Outcome
- Design system yang jadi single source of truth visual
- Developer dapat langsung implementasi tanpa ambiguitas
- Konsistensi UI di semua platform
- Basis untuk handoff ke development

---

## FASE 4: SYSTEM ARCHITECTURE SETUP

### Objective
Membangun fondasi infrastruktur teknis: repositori, environment, CI/CD, dan baseline service.

### Timeline
**Durasi**: 3 minggu | **Periode**: Bulan 3 Minggu 2 – Bulan 3 Minggu 5

### Scope
- Monorepo setup (Turborepo)
- Database schema awal + migration
- Docker development environment
- CI/CD pipeline
- Cloud infra provisioning (staging)
- Third-party integration setup (auth, email, payment, CDN)

### Deliverables
- [ ] Monorepo terstruktur (apps/web, apps/admin, apps/trainer, services/api)
- [ ] PostgreSQL schema v1 dengan migrasi (Prisma)
- [ ] Docker Compose untuk development lokal
- [ ] CI/CD pipeline di GitHub Actions (test + build + deploy)
- [ ] Staging environment berjalan
- [ ] Supabase Auth / JWT auth baseline
- [ ] Midtrans sandbox terintegrasi
- [ ] Cloudflare R2 bucket + CDN configured
- [ ] Resend email service connected
- [ ] Redis instance running
- [ ] Meilisearch instance running
- [ ] Environment variable management (.env.example)
- [ ] Prisma schema semua tabel core

### Team Requirement
| Role | Jumlah | Keterlibatan |
|------|--------|-------------|
| Tech Lead / Arsitek | 1 | Full-time |
| Backend Engineer | 2 | Full-time |
| DevOps Engineer | 1 | Full-time |

### Technical Tasks Breakdown

```
Week 1:
  - Setup monorepo dengan Turborepo
  - Init Next.js app (web, admin, trainer, lms)
  - Init Express API service
  - Prisma schema: users, roles, courses, events, payments
  - Docker Compose: PostgreSQL + Redis + Meilisearch
  - GitHub Actions: lint + test job

Week 2:
  - JWT auth implementation (register, login, refresh)
  - Google OAuth integration
  - Email service (Resend) integration
  - Cloudflare R2 file upload baseline
  - Midtrans sandbox webhook handler
  - API documentation (Swagger/OpenAPI)

Week 3:
  - Staging environment di Railway/Fly.io
  - Deploy pipeline: main → staging auto-deploy
  - Secrets management (GitHub Secrets)
  - Database backup setup (daily)
  - Monitoring baseline (Sentry integration)
  - Load testing baseline (k6)
```

### Risk Analysis
| Risk | Level | Mitigasi |
|------|-------|---------|
| Third-party API access delay | Sedang | Apply API key di Fase 1, tidak tunggu Fase 4 |
| Infra cost overrun | Sedang | Mulai dari minimal plan, scale saat needed |
| CI/CD setup complex | Rendah | Gunakan template GitHub Actions |

### Expected Outcome
- Developer environment siap untuk semua engineer
- Core infrastructure berjalan di staging
- Zero manual deployment (semua via CI/CD)
- Foundation untuk development cepat di Fase berikutnya

---

## FASE 5: CORE DEVELOPMENT (MVP)

### Objective
Membangun fitur-fitur inti MVP yang memungkinkan platform berjalan end-to-end: dari landing page hingga student bisa beli kursus dan belajar.

### Timeline
**Durasi**: 8 minggu | **Periode**: Bulan 3 Minggu 5 – Bulan 5 Minggu 3

### Scope (MVP Must-Have)
- Public website (Home, About, Clients, FAQ, Contact)
- Course catalog & detail halaman
- Video player + progress tracking
- Student dashboard
- Basic admin panel
- Sertifikat generation
- Email notifikasi transaksional

### Deliverables
- [ ] **Public Web** — Semua halaman publik live
- [ ] **Auth System** — Register, login, Google OAuth, email verify
- [ ] **Course System** — Listing, filter, search, detail, video player
- [ ] **Progress Tracking** — Per lesson, per course, % completion
- [ ] **Quiz System** — Multiple choice per lesson
- [ ] **Student Dashboard** — My courses, progress, certificates
- [ ] **Certificate Engine** — Auto-generate PDF + QR verifikasi
- [ ] **Admin Panel** — User management, course review, basic reports
- [ ] **CMS dasar** — Kelola halaman publik, FAQ, testimonial
- [ ] **SEO** — Meta tags, OG tags, sitemap, robots.txt

### Team Requirement
| Role | Jumlah | Keterlibatan |
|------|--------|-------------|
| Frontend Engineer (Senior) | 2 | Full-time |
| Backend Engineer (Senior) | 2 | Full-time |
| UI/UX Designer | 1 | Part-time (support dev) |
| QA Engineer | 1 | Part-time |
| Tech Lead | 1 | Full-time (review & arch) |

### Sprint Breakdown (8 minggu = 4 sprint × 2 minggu)

**Sprint 1 (Minggu 1–2): Foundation & Auth**
```
Frontend:
- Setup Next.js dengan Tailwind + shadcn/ui
- Layout dasar: header, footer, navigation
- Halaman Home (hero, stats, featured, testimonial, CTA)
- Halaman Auth: login, register, forgot password
- Responsive design

Backend:
- Auth API: register, login, logout, refresh, verify-email
- Google OAuth endpoint
- User profile API
- Database seeding (categories, roles)

Acceptance Criteria:
✓ User bisa register dengan email dan Google
✓ Email verifikasi terkirim dan bisa diverifikasi
✓ Login berhasil → JWT token valid
✓ Home page tampil dengan benar di mobile & desktop
```

**Sprint 2 (Minggu 3–4): Course System**
```
Frontend:
- Halaman Catalog: grid kursus, filter, search
- Halaman Detail Kursus: silabus, trainer, review, CTA
- Preview video player (untuk lesson preview gratis)
- Halaman About, Clients, FAQ, Contact

Backend:
- Courses API (CRUD, listing, filter, search)
- Categories API
- Course lesson/section API
- Meilisearch indexing untuk search
- File upload API (thumbnail, video)

Acceptance Criteria:
✓ User bisa browse catalog dengan filter
✓ Search berjalan (full-text di judul + deskripsi)
✓ Preview video bisa diputar tanpa login
✓ Detail kursus tampil lengkap
✓ Halaman publik semua berfungsi
```

**Sprint 3 (Minggu 5–6): Learning Experience**
```
Frontend:
- Course player (Video.js/Plyr): play, speed, fullscreen
- Silabus sidebar dengan progress
- Progress tracker (lesson, section, overall)
- Quiz interface (multiple choice)
- Student dashboard: my courses, progress
- Profile page

Backend:
- Enrollment API
- Progress tracking API
- Quiz submit & scoring API
- Video signed URL generation
- Student dashboard API

Acceptance Criteria:
✓ Student bisa mengakses course yang sudah dibeli
✓ Progress tersimpan per lesson
✓ Quiz bisa dikerjakan dan dinilai otomatis
✓ Dashboard student menampilkan kursus + progress
✓ Video tidak bisa didownload (HLS + signed URL)
```

**Sprint 4 (Minggu 7–8): Certificates & Admin MVP**
```
Frontend:
- Certificate download page
- Certificate verifikasi publik
- Admin panel: login, dashboard, user list, course list
- Admin: approve/reject kursus

Backend:
- Certificate generation (Puppeteer → PDF)
- Certificate verification API
- Admin API: dashboard stats, user management
- Course review/approval API
- Audit log middleware
- Sentry integration

QA:
- Unit test semua API endpoint
- E2E test: register → beli → belajar → sertifikat

Acceptance Criteria:
✓ Sertifikat auto-generated setelah completion ≥ 80%
✓ QR code di sertifikat bisa dipindai dan verifikasi valid
✓ Admin bisa review dan approve kursus
✓ Admin dashboard tampil data dasar
✓ Semua critical path bisa diakses tanpa error
```

### Risk Analysis
| Risk | Level | Mitigasi |
|------|-------|---------|
| Video player compatibility | Sedang | Test multi-browser sejak sprint 3 |
| Performance video loading | Sedang | CDN + adaptive bitrate dari awal |
| Sertifikat rendering inconsistent | Rendah | Puppeteer + fixed template |
| Scope creep dari stakeholder | Tinggi | Lock sprint scope tiap 2 minggu |

### Expected Outcome
- Platform bisa demo end-to-end kepada investor/stakeholder
- Student bisa register → beli (test payment) → belajar → dapat sertifikat
- Admin bisa kelola kursus dan user
- Siap untuk koneksi payment di Fase 6

---

## FASE 6: E-COMMERCE & PAYMENT INTEGRATION

### Objective
Mengaktifkan full payment flow sehingga platform siap menerima transaksi nyata dan dilaunching ke publik.

### Timeline
**Durasi**: 4 minggu | **Periode**: Bulan 5 Minggu 4 – Bulan 6 Minggu 3

### Scope
- Checkout flow lengkap
- Midtrans production integration
- Coupon & voucher system
- Referral code tracking
- Order history & invoice
- Refund management
- Event registration & ticketing
- E-Book purchase & reader
- WhatsApp notification

### Deliverables
- [ ] Checkout flow (cart → coupon → payment method → Midtrans)
- [ ] All payment methods aktif (VA, QRIS, GoPay, OVO, CC)
- [ ] Webhook handler production (Midtrans)
- [ ] Invoice PDF auto-generation
- [ ] Order history page
- [ ] Coupon/voucher system (create, validate, use)
- [ ] Referral code tracking di checkout
- [ ] Refund request & processing
- [ ] Event ticketing (pendaftaran, tiket QR, check-in)
- [ ] E-Book toko + reader (PDF viewer in-browser)
- [ ] E-Book watermark download
- [ ] WA notification via Fonnte
- [ ] Revenue distribution (trainer 70%, platform 30%)

### Sprint Breakdown (4 minggu = 2 sprint × 2 minggu)

**Sprint 5 (Minggu 1–2): Payment Core**
```
- Cart API & UI
- Checkout page (review order, coupon, referral input)
- Midtrans Snap integration (frontend + backend)
- Webhook handler (settlement, pending, failed)
- Post-payment access grant (course enrollment)
- Order page & invoice download
- Coupon CRUD (admin) + validate endpoint
- Referral tracking via cookie
- Revenue split logic (trainer/platform/affiliate)
```

**Sprint 6 (Minggu 3–4): Event + EBook + Notifications**
```
- Event tiket purchase flow
- QR code generation per registrant
- Event check-in (admin scan)
- E-Book store listing + detail
- PDF reader (react-pdf atau pdf.js)
- E-Book watermarked download
- WA notification (Fonnte API)
- Email: konfirmasi, invoice, tiket event
- Refund request UI + admin processing
- Admin: transaction list, revenue report dasar
```

### Acceptance Criteria (Fase 6)
```
✓ User bisa checkout dengan semua metode bayar
✓ Payment berhasil → akses kursus langsung terbuka
✓ Event ticket terkirim via email + WA
✓ Invoice PDF terunduh dengan benar
✓ Coupon berfungsi: diskon teraplikasi di checkout
✓ Referral code ditrack dan komisi dicatat
✓ Refund bisa di-request dan diproses admin
✓ E-Book bisa dibaca online dan didownload (watermark)
✓ Semua notifikasi email + WA terkirim
```

### Risk Analysis
| Risk | Level | Mitigasi |
|------|-------|---------|
| Midtrans production approval delay | Sedang | Apply sandbox → production paralel sejak Fase 4 |
| Webhook tidak reliable | Sedang | Idempotency key + retry mechanism |
| PDF watermark corrupt | Rendah | Test multiple PDF library |
| Payment error user experience | Sedang | Error message jelas + CS live chat |

### Expected Outcome
- Platform siap go-live menerima pembayaran nyata
- Full MVP: beli kursus + event + ebook berfungsi
- Revenue terdistribusi otomatis ke trainer
- Landasan untuk Soft Launch di akhir Fase 6

---

## FASE 7: LMS DEVELOPMENT (B2B)

### Objective
Membangun modul LMS multi-tenant untuk melayani klien B2B (perusahaan, universitas, sekolah).

### Timeline
**Durasi**: 6 minggu | **Periode**: Bulan 6 Minggu 4 – Bulan 8 Minggu 1

### Scope
- Multi-tenant architecture (schema per tenant)
- LMS portal (custom domain, branding)
- Workspace & user management
- LMS course builder
- Progress tracking B2B
- Reporting & export
- Admin console LMS

### Deliverables
- [ ] Tenant provisioning system (buat workspace baru)
- [ ] LMS portal app (custom domain routing)
- [ ] Custom branding (logo, warna, nama platform)
- [ ] Bulk user invite (CSV)
- [ ] Batch/group management
- [ ] LMS course builder (video, PDF, quiz)
- [ ] Mandatory course assignment
- [ ] Progress tracking per user
- [ ] Completion certificate (branded)
- [ ] Reporting dashboard per tenant
- [ ] Excel/PDF export laporan
- [ ] Admin console: kelola tenant, paket, billing
- [ ] 14-hari free trial flow

### Sprint Breakdown (6 minggu = 3 sprint × 2 minggu)

**Sprint 7 (Minggu 1–2): Multi-Tenant Foundation**
```
- Schema-per-tenant PostgreSQL setup
- Tenant provisioning API
- Subdomain routing (*.lms.jagoakademi.com)
- Custom domain routing (via Cloudflare Workers)
- Tenant branding API (logo, warna, nama)
- LMS portal basic layout
- Tenant admin auth (role: LMS_ADMIN)
```

**Sprint 8 (Minggu 3–4): LMS Core Features**
```
- Bulk user invite (email + CSV)
- Batch management (divisi/kelas)
- LMS course builder (reuse komponen trainer hub)
- Video upload per tenant (quota enforced)
- Mandatory course assignment per batch
- Quiz builder untuk LMS
- Progress tracking API per tenant
- Student view: LMS portal homepage + course list
```

**Sprint 9 (Minggu 5–6): Reporting & Admin Console**
```
- Completion report per course per batch
- Individual progress timeline
- Excel export laporan (exceljs)
- PDF export laporan (Puppeteer)
- LMS certificate dengan branding tenant
- Admin console: list tenant, status, paket
- Billing & subscription management per tenant
- Trial → paid conversion flow
- SLA monitoring per tenant
```

### Risk Analysis
| Risk | Level | Mitigasi |
|------|-------|---------|
| Data isolation failure (tenant leak) | Kritis | Extensive testing cross-tenant queries |
| Custom domain SSL provisioning | Tinggi | Gunakan Cloudflare for SaaS (auto SSL) |
| Performance degradasi multi-tenant | Sedang | Query optimization + read replica |
| Onboarding klien terlalu kompleks | Sedang | Buat panduan video + dedicated onboarding call |

### Expected Outcome
- LMS siap untuk onboarding klien B2B pertama
- 5–10 klien pilot berhasil di-onboard
- Laporan berjalan otomatis
- Fondasi untuk upsell paket enterprise

---

## FASE 8: PHASE 2 FEATURES

### Objective
Melengkapi platform dengan fitur-fitur monetisasi tambahan, komunitas, dan tools untuk trainer.

### Timeline
**Durasi**: 8 minggu | **Periode**: Bulan 7 Minggu 1 – Bulan 9 Minggu 1

### Scope
- Trainer Hub (course builder, analytics, payout)
- Trainer Program (pendaftaran, modul, assessment)
- Marketplace Materi Event
- Affiliate & Referral Program
- Blog CMS
- Review & Rating System
- Push Notification
- Upsell & cross-sell automation
- Subscription plan E-Course

### Deliverables
- [ ] **Trainer Hub** — Dashboard, course builder, analytics, payout request
- [ ] **Trainer Program** — Landing, purchase, modul akses, assignment, assessment, sertifikat
- [ ] **Marketplace Materi Event** — Upload, listing, purchase, akses rekaman
- [ ] **Affiliate System** — Dashboard, unique link, tracking, komisi, pencairan
- [ ] **Blog** — CMS, kategori, tag, search, related posts, SEO
- [ ] **Review & Rating** — Course, event, e-book dengan moderasi
- [ ] **Push Notification** — OneSignal/FCM web push
- [ ] **Subscription** — All-access plan per kategori / all platform
- [ ] **Upsell engine** — Post-completion recommendations
- [ ] **Coupon Generator** — Admin buat batch kupon untuk campaign

### Sprint Breakdown (8 minggu = 4 sprint × 2 minggu)

**Sprint 10 (Minggu 1–2): Trainer Hub**
```
- Trainer Hub layout & navigation
- Course builder (upload video, section, lesson, quiz, preview)
- Course submit untuk review
- Analytics: enrollment, revenue, completion, rating per course
- Payout request form + payout history
- Trainer profile page (public)
- Q&A reply dari trainer
```

**Sprint 11 (Minggu 3–4): Trainer Program + Marketplace**
```
- Trainer Program landing page (3 tier)
- Purchase trainer program
- Module viewer untuk trainer candidate
- Assignment upload per modul
- Admin review assignment + feedback
- Assessment scheduling (Calendly-like integration)
- Sertifikat trainer auto-issued setelah lulus
- Marketplace: listing, detail, upload produk
- Marketplace: streaming video rekaman event
- Marketplace: download materi (PDF, slide)
- Revenue share 60:40 untuk marketplace
```

**Sprint 12 (Minggu 5–6): Affiliate + Subscription**
```
- Affiliate registration flow
- Unique referral link + code per user
- Click tracking (server-side redirect)
- Commission calculation engine
- Affiliate dashboard (stats, history, balance)
- Withdrawal request
- Multi-level referral (L1 + L2)
- Subscription paket (All-Access monthly/annual)
- Subscription management (cancel, upgrade, downgrade)
- Dunning management (payment reminder, retry, cancel)
```

**Sprint 13 (Minggu 7–8): Blog + Notifications + Polish**
```
- Blog CMS (TipTap editor, kategori, tag, SEO meta)
- Blog listing + detail + related posts
- Blog sitemap update
- Push notification (OneSignal web push)
- Push notification permission prompt flow
- In-app notification center (bell icon)
- Review & rating system (course, event, ebook)
- Review moderation (admin flag, hide)
- Upsell engine (post-completion kursus recommendations)
- Polish: loading states, error messages, empty states
```

### Risk Analysis
| Risk | Level | Mitigasi |
|------|-------|---------|
| Course builder UX terlalu kompleks | Tinggi | User test dengan trainer sebelum dev |
| Affiliate fraud (fake referral) | Sedang | IP tracking, cookie validation, manual review |
| Subscription churn | Sedang | Dunning management + annual discount |
| Marketplace konten tidak berkualitas | Tinggi | Review sebelum publish |

### Expected Outcome
- Platform fully featured untuk semua unit bisnis
- Trainer bisa self-onboard dan mulai jual kursus
- Affiliate program aktif dan menghasilkan referral
- Subscription plan meningkatkan recurring revenue

---

## FASE 9: TESTING & QUALITY ASSURANCE

### Objective
Memastikan seluruh platform berfungsi dengan benar, aman, performant, dan siap production launch.

### Timeline
**Durasi**: 4 minggu | **Periode**: Bulan 9 Minggu 2 – Bulan 10 Minggu 1

### Scope
- Functional testing semua fitur
- Integration testing (payment, email, video, sertifikat)
- Performance testing
- Security testing
- Accessibility audit
- Cross-browser & cross-device testing
- UAT dengan internal user
- Bug fixing & regression testing

### Deliverables
- [ ] Test plan dokumen
- [ ] Test cases (manual): > 200 test case
- [ ] Automated test suite: unit (>70%) + E2E (critical paths)
- [ ] Performance report (Lighthouse + k6 load test)
- [ ] Security audit report (OWASP checklist)
- [ ] Accessibility audit (WCAG 2.1 AA)
- [ ] Cross-browser test report
- [ ] UAT completion sign-off
- [ ] Bug tracker: semua Critical/High resolved
- [ ] Final staging → production migration checklist

### Testing Strategy

```
LAYER 1: Unit Tests (Vitest)
  Coverage target: ≥ 70%
  Focus: utility functions, business logic, API handlers
  
LAYER 2: Integration Tests (Supertest)
  Focus: API endpoints end-to-end
  - Auth flow (register → login → refresh)
  - Payment webhook handling
  - Certificate generation
  - LMS tenant isolation
  
LAYER 3: E2E Tests (Playwright)
  Critical paths (min. 20 scenarios):
  - Register → Verify Email → Login
  - Browse kursus → Checkout → Payment → Akses
  - Watch video → Complete → Certificate
  - Daftar event → Tiket → Check-in
  - Trainer upload course → Admin approve → Student beli
  - LMS Admin invite user → User login → Complete course
  
LAYER 4: Performance Tests (k6 + Lighthouse)
  - 1000 concurrent users → API stability
  - Lighthouse score semua public pages: > 85
  - Video load time < 3 detik
  - Payment flow response < 500ms
  
LAYER 5: Security Tests
  - OWASP Top 10 checklist manual
  - Penetration test oleh third-party (optional, phase launch)
  - SQL injection test semua input
  - XSS test semua form
  - Authentication bypass test
  - API authorization test (semua role)

LAYER 6: Accessibility Tests
  - Axe DevTools automated scan
  - Manual keyboard navigation test
  - Screen reader test (NVDA/VoiceOver)
  - Color contrast check

LAYER 7: Cross-Browser Tests
  - Chrome, Firefox, Safari, Edge (desktop)
  - iOS Safari, Android Chrome (mobile)
  - Tablet: iPad (landscape + portrait)
```

### UAT Process

```
Week 1-2: Internal QA Testing
  - QA team jalankan semua test case
  - Log bug di Linear/Jira
  - Dev team fix bug (daily bug bash)

Week 3: UAT dengan Internal Users
  - 10 internal user (non-dev) jalankan skenario nyata
  - Rekrut 5 beta tester eksternal (student, trainer, HR manager)
  - Session: "Beli kursus," "Jadi trainer," "Setup LMS"
  - Dokumentasi feedback

Week 4: Regression & Final Check
  - Fix semua bug dari UAT
  - Regression test setelah setiap fix
  - Final checklist: keamanan, performa, backup, monitoring
  - Sign-off dari Product Manager dan Tech Lead
```

### Bug Severity & Resolution

| Severity | Definisi | Target Resolve |
|----------|---------|---------------|
| Critical | Crash, data loss, keamanan bocor | Langsung, < 24 jam |
| High | Fitur utama tidak berfungsi | < 3 hari kerja |
| Medium | Fitur minor tidak berfungsi, UX buruk | < 1 sprint |
| Low | Visual issue, typo, minor | Batch fix sebelum launch |

### Risk Analysis
| Risk | Level | Mitigasi |
|------|-------|---------|
| Bug Critical ditemukan H-3 launch | Tinggi | Buffer 1 minggu tambahan di timeline |
| Performance tidak memenuhi target | Sedang | Profiling + CDN optimization |
| Payment gateway issue di production | Kritis | Dual gateway (Midtrans + Xendit backup) |
| Data bocor antar tenant LMS | Kritis | Automated cross-tenant query test |

### Expected Outcome
- Platform stabil, aman, dan performant
- Zero Critical bug untuk go-live
- Lighthouse score > 85 di semua halaman publik
- Tim percaya diri untuk go-live

---

## FASE 10: LAUNCH, GROWTH & SCALE

### Objective
Meluncurkan Jago Akademi ke publik, mengakuisisi pengguna pertama, dan membangun fondasi pertumbuhan berkelanjutan.

### Timeline
**Durasi**: Ongoing | **Periode**: Bulan 10 – Bulan 18+

### Sub-Fase 10A: Pre-Launch (Bulan 10, Minggu 1–2)

```
Activitas:
- Setup domain production (jagoakademi.com)
- DNS & SSL final
- Cloudflare production configuration
- Monitoring & alerting setup (Grafana/Sentry)
- Database production migration
- Seed data: 20 kursus, 10 event, 50 e-book
- Rekrut 10 trainer awal (early trainer program)
- Email list early access (target: 1000 subscriber)
- Press kit & media materials siap
- Landing page "Coming Soon" dengan email capture

Go-Live Checklist:
□ Semua Critical bug resolved
□ Backup production berjalan
□ Monitoring alert aktif
□ Payment gateway production aktif
□ Email transaksional terkirim di production
□ SSL/HTTPS berfungsi
□ CDN aktif (video + static assets)
□ Customer support siap (live chat + WA)
□ Knowledge base / FAQ publik live
□ Google Analytics + Mixpanel aktif
□ Google Search Console configured
```

### Sub-Fase 10B: Soft Launch (Bulan 10, Minggu 3 – Bulan 11)

```
Strategi:
- Invite-only launch (1000 early adopter dari waitlist)
- Early bird diskon 30–50% untuk semua produk
- 3 event webinar gratis di bulan pertama
- Program "First 100 Trainer" (diskon trainer program 40%)
- Konten organic: blog, Instagram, TikTok, LinkedIn
- Minta review & testimoni dari user pertama

Target M10-11:
□ 5.000 registered user
□ 500 paying customer
□ 20 trainer aktif
□ Rp 50 Juta revenue
□ 5 klien LMS pilot
□ NPS ≥ 40
```

### Sub-Fase 10C: Full Public Launch (Bulan 11–12)

```
Aktivasi Channels:
1. Paid Advertising
   - Meta Ads (Instagram + Facebook)
   - Google Ads (Search + Display)
   - TikTok Ads
   Budget: Rp 30–50 Juta/bulan

2. Organic & Content
   - Blog SEO (2 artikel/minggu)
   - YouTube channel (tutorial, behind the scene)
   - Instagram (daily, stories, reels)
   - LinkedIn (thought leadership, B2B)
   - TikTok (short-form, viral content)

3. Partnership & Community
   - Kolaborasi dengan 5 komunitas profesi besar
   - Guest post di media HR/bisnis ternama
   - Sponsorship event HR/startup Indonesia

4. Referral & Affiliate
   - Launch affiliate program ke public
   - Incentive referral untuk existing user
   - Leaderboard affiliate (gamifikasi)

5. B2B Sales
   - Email campaign ke 500 perusahaan target
   - LinkedIn outreach ke HR Manager/Director
   - Pameran HR Tech Indonesia (jika ada)
   - Partnership dengan asosiasi HR Indonesia

Target M12:
□ 50.000 registered user
□ 10.000 paying customer
□ 200+ kursus aktif
□ 500 certified trainer
□ 50 klien LMS B2B
□ Rp 500 Juta MRR
□ NPS ≥ 45
```

### Sub-Fase 10D: Growth & Scale (Bulan 13–18)

```
Feature Enhancements:
- Mobile app (React Native) — iOS & Android
- AI course recommendation engine
- Live streaming platform terintegrasi
- Gamifikasi: badge, XP, leaderboard
- Community forum per topik
- Advanced LMS: SSO, API, HRIS integration
- Multi-language support (English)
- B2B marketplace (perusahaan beli kursus batch)
- Analytics dashboard advanced (BI)

Scale Infrastructure:
- Kubernetes production scaling
- Database sharding untuk LMS (> 100 tenant)
- Video transcoding di-scale
- CDN expansion ke Asia Tenggara
- 99.9% SLA enforcement

Business Expansion:
- Buka kantor fisik (co-working space untuk trainer)
- Program akselerator trainer (Jago Trainer Academy)
- Investasi konten premium (kerjasama universitas)
- Ekspansi ke Malaysia/Singapura (phase 2 regional)
- Series A fundraising (target USD 2-5M)

Target M18:
□ 200.000 registered user
□ 50.000 paying customer
□ 2.000 certified trainer
□ 200 klien LMS B2B
□ Rp 2 Miliar MRR
□ Mobile app > 50.000 download
```

---

## RINGKASAN TEAM & BUDGET

### Team Komposisi (Full Build)

| Role | Jumlah | Timing |
|------|--------|--------|
| Product Manager | 1 | Fase 1 – ongoing |
| Tech Lead / Arsitek | 1 | Fase 1 – ongoing |
| Frontend Engineer (Senior) | 2 | Fase 3 – ongoing |
| Frontend Engineer (Mid) | 1 | Fase 5 – ongoing |
| Backend Engineer (Senior) | 2 | Fase 4 – ongoing |
| Backend Engineer (Mid) | 1 | Fase 6 – ongoing |
| DevOps Engineer | 1 | Fase 4 – ongoing |
| UI/UX Designer (Senior) | 1 | Fase 2 – Fase 8 |
| UI Designer | 1 | Fase 3 – Fase 6 |
| QA Engineer | 1 | Fase 7 – ongoing |
| UX Researcher | 1 | Fase 2 – Fase 3 |
| Content Strategist | 1 | Fase 8 – ongoing |
| Digital Marketer | 1 | Fase 10 – ongoing |
| Customer Support | 2 | Fase 10 – ongoing |
| Sales (B2B LMS) | 2 | Fase 7 – ongoing |
| **TOTAL** | **19** | |

### Estimasi Budget (12 Bulan)

| Kategori | Estimasi/Bulan | Total 12 Bulan |
|----------|---------------|----------------|
| Tim (gaji) | Rp 150 Juta | Rp 1,8 M |
| Cloud Infrastructure | Rp 15 Juta | Rp 180 Juta |
| Third-party SaaS | Rp 10 Juta | Rp 120 Juta |
| Marketing & Ads | Rp 50 Juta | Rp 600 Juta |
| Konten Produksi | Rp 20 Juta | Rp 240 Juta |
| Legal & Compliance | Rp 5 Juta | Rp 60 Juta |
| Operasional | Rp 10 Juta | Rp 120 Juta |
| **TOTAL** | **Rp 260 Juta** | **Rp 3,12 M** |

### Break-even Analysis
```
Titik Break-even: Bulan 9–10 (projected)
Asumsi:
- Revenue mulai signifikan di Bulan 6 (post soft launch)
- MRR Bulan 6: Rp 100 Juta
- MRR Bulan 9: Rp 280 Juta
- MRR Bulan 12: Rp 500 Juta
- Biaya tetap: Rp 260 Juta/bulan
```

---

## MILESTONE SUMMARY

| Milestone | Fase | Bulan Target | Status |
|-----------|------|-------------|--------|
| PRD & BRD Final | 1 | M1 | ⬜ Planning |
| UX Research Done | 2 | M2 | ⬜ Planning |
| Design System v1 | 3 | M3 | ⬜ Planning |
| Infrastructure Live | 4 | M3 | ⬜ Planning |
| MVP Demo Ready | 5 | M5 | ⬜ Planning |
| Payment Live | 6 | M6 | ⬜ Planning |
| **SOFT LAUNCH** | 6 | **M6** | ⬜ Planning |
| LMS B2B Ready | 7 | M8 | ⬜ Planning |
| Phase 2 Features | 8 | M9 | ⬜ Planning |
| QA & UAT Done | 9 | M10 | ⬜ Planning |
| **FULL PUBLIC LAUNCH** | 10 | **M10** | ⬜ Planning |
| 50k Users | 10 | M12 | ⬜ Planning |
| Mobile App Launch | 10 | M15 | ⬜ Planning |
| 200k Users | 10 | M18 | ⬜ Planning |

---

*Dokumen Roadmap ini bersifat dinamis. Update dilakukan setiap sprint review atau saat ada perubahan signifikan pada prioritas bisnis.*

---
**Approved by**: CEO, Product Manager, Tech Lead
**Next Review**: Setelah Fase 2 selesai (UX Research done)
