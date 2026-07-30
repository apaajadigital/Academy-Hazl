# SYSTEM ARCHITECTURE & TECHNICAL DESIGN
## Jago Akademi — Platform Edukasi Digital Terintegrasi

> Versi: 1.0 | Status: Final Draft | Tanggal: 22 Juni 2026

---

## DAFTAR ISI

1. [Architecture Overview](#1-architecture-overview)
2. [Frontend Architecture](#2-frontend-architecture)
3. [Backend Architecture](#3-backend-architecture)
4. [Database Design](#4-database-design)
5. [Video & Media Infrastructure](#5-video--media-infrastructure)
6. [Authentication & Security](#6-authentication--security)
7. [Payment Gateway Integration](#7-payment-gateway-integration)
8. [LMS Multi-Tenant Architecture](#8-lms-multi-tenant-architecture)
9. [Notification System](#9-notification-system)
10. [Certificate Engine](#10-certificate-engine)
11. [Search & Discovery](#11-search--discovery)
12. [Analytics & Monitoring](#12-analytics--monitoring)
13. [DevOps & Infrastructure](#13-devops--infrastructure)
14. [API Gateway & Rate Limiting](#14-api-gateway--rate-limiting)

---

## 1. ARCHITECTURE OVERVIEW

### 1.1 High-Level System Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLIENT LAYER                              │
│  ┌───────────┐  ┌───────────┐  ┌───────────┐  ┌───────────┐   │
│  │ Public Web│  │Student App│  │Trainer Hub│  │Admin Panel│   │
│  │(Next.js)  │  │(Next.js)  │  │(Next.js)  │  │(Next.js)  │   │
│  └─────┬─────┘  └─────┬─────┘  └─────┬─────┘  └─────┬─────┘   │
│        │              │              │              │           │
│  ┌─────▼──────────────▼──────────────▼──────────────▼──────┐   │
│  │                LMS Portal (per-tenant)                    │   │
│  │           custom-domain.jagoakademi.com                  │   │
│  └──────────────────────────────────────────────────────────┘   │
└────────────────────────────┬────────────────────────────────────┘
                             │ HTTPS
                    ┌────────▼────────┐
                    │   Cloudflare    │
                    │ (CDN + WAF +    │
                    │  DDoS protect)  │
                    └────────┬────────┘
                             │
                    ┌────────▼────────┐
                    │   API Gateway   │
                    │ (Rate Limiting, │
                    │  Auth, Routing) │
                    └────────┬────────┘
                             │
          ┌──────────────────┼──────────────────┐
          │                  │                  │
   ┌──────▼──────┐  ┌───────▼──────┐  ┌───────▼──────┐
   │  Core API   │  │  LMS Service │  │ Media Service │
   │  (Node.js)  │  │  (Node.js)   │  │  (Node.js)    │
   └──────┬──────┘  └───────┬──────┘  └───────┬──────┘
          │                  │                  │
   ┌──────▼──────┐  ┌───────▼──────┐  ┌───────▼──────┐
   │ PostgreSQL  │  │ PostgreSQL   │  │ Cloudflare   │
   │  (Primary)  │  │  (LMS DB)    │  │   Stream     │
   └──────┬──────┘  └──────────────┘  └──────────────┘
          │
   ┌──────▼──────┐   ┌─────────────┐   ┌─────────────┐
   │    Redis    │   │     S3/R2   │   │  Meilisearch│
   │  (Cache +   │   │  (Storage)  │   │  (Search)   │
   │   Queue)    │   └─────────────┘   └─────────────┘
   └─────────────┘
          │
   ┌──────▼──────────────────────────────────────┐
   │                WORKER SERVICES               │
   │  ┌──────────┐ ┌──────────┐ ┌────────────┐  │
   │  │  Email   │ │  Notif   │ │  Cert Gen  │  │
   │  │ Worker   │ │  Worker  │ │  Worker    │  │
   │  └──────────┘ └──────────┘ └────────────┘  │
   │  ┌──────────┐ ┌──────────┐                 │
   │  │ Payment  │ │ Report   │                 │
   │  │ Worker   │ │ Worker   │                 │
   │  └──────────┘ └──────────┘                 │
   └─────────────────────────────────────────────┘
```

### 1.2 Architecture Principles

1. **Monorepo + Service Decomposition**: Mulai sebagai monolith terstruktur, siap dipecah ke microservices
2. **API-First**: Semua fitur dikonsumsi via API (siap untuk mobile app future)
3. **Multi-Tenant Isolation**: LMS setiap klien terisolasi di schema/database terpisah
4. **Async by Default**: Operasi berat (video, email, sertifikat) diproses via queue
5. **Observability First**: Semua service terlog, termetrik, dan ter-trace

---

## 2. FRONTEND ARCHITECTURE

### 2.1 Tech Stack

```
Framework:    Next.js 14 (App Router)
Language:     TypeScript 5
Styling:      Tailwind CSS 3 + shadcn/ui
State:        Zustand (client) + TanStack Query (server state)
Form:         React Hook Form + Zod validation
Animation:    Framer Motion
Charts:       Recharts
Video:        Plyr.js / Video.js
PDF:          react-pdf (viewer)
Rich Text:    TipTap Editor
Icons:        Lucide React
Testing:      Vitest + React Testing Library + Playwright (E2E)
```

### 2.2 Project Structure

```
apps/
├── web/                    # Public website + student dashboard
│   ├── app/
│   │   ├── (public)/       # Public routes (no auth required)
│   │   │   ├── page.tsx    # Home
│   │   │   ├── kursus/
│   │   │   ├── event/
│   │   │   ├── ebook/
│   │   │   ├── tentang-kami/
│   │   │   ├── klien/
│   │   │   ├── kolaborasi/
│   │   │   ├── faq/
│   │   │   └── hubungi-kami/
│   │   ├── (auth)/         # Auth routes
│   │   │   ├── login/
│   │   │   ├── register/
│   │   │   └── forgot-password/
│   │   ├── (dashboard)/    # Protected: student dashboard
│   │   │   ├── dashboard/
│   │   │   ├── kursus-saya/
│   │   │   ├── event-saya/
│   │   │   ├── sertifikat/
│   │   │   ├── ebook-saya/
│   │   │   ├── afiliasi/
│   │   │   └── profil/
│   │   └── belajar/        # Course player (protected)
│   │       └── [courseSlug]/
│   │           └── [lessonId]/
│   ├── components/
│   │   ├── ui/             # shadcn components
│   │   ├── layout/         # Header, Footer, Sidebar
│   │   ├── course/         # CourseCard, CoursePlayer, etc.
│   │   ├── event/
│   │   ├── payment/
│   │   └── shared/
│   └── lib/
│       ├── api/            # API client functions
│       ├── auth/           # Auth utilities
│       ├── hooks/          # Custom hooks
│       └── utils/
├── trainer/                # Trainer Hub (separate app)
│   └── app/
│       ├── dashboard/
│       ├── course-builder/
│       ├── analytics/
│       └── payout/
├── admin/                  # Admin Dashboard (separate app)
│   └── app/
│       ├── dashboard/
│       ├── users/
│       ├── courses/
│       ├── events/
│       ├── transactions/
│       ├── crm/
│       └── reports/
└── lms/                    # LMS Portal (multi-tenant)
    └── app/
        ├── workspace/
        ├── courses/
        ├── users/
        └── reports/

packages/
├── ui/                     # Shared UI components
├── types/                  # Shared TypeScript types
├── config/                 # Shared configs (eslint, tsconfig)
└── utils/                  # Shared utility functions
```

### 2.3 Rendering Strategy

| Halaman | Strategy | Alasan |
|---------|----------|--------|
| Home, About, FAQ | SSG (Static) | Konten jarang berubah, SEO optimal |
| Course Listing | ISR (1 jam) | Konten berubah tapi tidak real-time |
| Course Detail | ISR (10 menit) | SEO kritis, ada review baru |
| Event Listing | ISR (5 menit) | Stok tiket berubah |
| Student Dashboard | CSR | Data personal, tidak perlu SSR |
| Course Player | CSR | Interaktif, real-time progress |
| Admin Dashboard | CSR | Data real-time, tidak perlu SEO |
| LMS Portal | CSR | Per-tenant, tidak perlu SEO publik |

### 2.4 Performance Strategy

```javascript
// Image optimization
<Image
  src={course.thumbnail}
  width={400}
  height={225}
  loading="lazy"
  placeholder="blur"
  format="webp"
/>

// Code splitting per route (Next.js automatic)
// Dynamic import untuk komponen berat
const VideoPlayer = dynamic(() => import('@/components/VideoPlayer'), {
  ssr: false,
  loading: () => <VideoPlayerSkeleton />
})

// Bundle analysis
// Target: < 150KB JS (gzipped) untuk halaman publik
// Target: < 300KB JS untuk dashboard
```

---

## 3. BACKEND ARCHITECTURE

### 3.1 Tech Stack

```
Runtime:      Node.js 20 (LTS)
Framework:    Express.js / Hono (REST API)
Language:     TypeScript 5
ORM:          Prisma 5
Validation:   Zod
Queue:        BullMQ + Redis
Scheduler:    node-cron
Auth:         jose (JWT) + bcrypt
File Upload:  Multer + AWS SDK
PDF:          Puppeteer (headless Chrome)
Email:        Resend SDK
WA:           Fonnte API
Testing:      Vitest + Supertest
```

### 3.2 Service Structure

```
services/
├── core-api/               # Main API server
│   ├── src/
│   │   ├── modules/
│   │   │   ├── auth/
│   │   │   ├── users/
│   │   │   ├── courses/
│   │   │   ├── events/
│   │   │   ├── ebooks/
│   │   │   ├── marketplace/
│   │   │   ├── payments/
│   │   │   ├── certificates/
│   │   │   ├── affiliates/
│   │   │   ├── notifications/
│   │   │   └── admin/
│   │   ├── middleware/
│   │   │   ├── auth.middleware.ts
│   │   │   ├── rateLimit.middleware.ts
│   │   │   ├── validate.middleware.ts
│   │   │   └── audit.middleware.ts
│   │   ├── config/
│   │   ├── lib/
│   │   └── app.ts
│
├── lms-service/            # LMS multi-tenant service
│   ├── src/
│   │   ├── tenant/
│   │   ├── courses/
│   │   ├── users/
│   │   ├── progress/
│   │   └── reports/
│
├── media-service/          # File upload & video processing
│   ├── src/
│   │   ├── upload/
│   │   ├── transcode/
│   │   └── stream/
│
└── worker/                 # Background job processors
    ├── src/
    │   ├── jobs/
    │   │   ├── email.job.ts
    │   │   ├── certificate.job.ts
    │   │   ├── notification.job.ts
    │   │   ├── payment.job.ts
    │   │   └── report.job.ts
    │   └── queues/
```

### 3.3 Module Pattern (per modul)

```typescript
// modules/courses/
├── course.controller.ts    // HTTP handlers
├── course.service.ts       // Business logic
├── course.repository.ts    // Database queries
├── course.schema.ts        // Zod validation schemas
├── course.types.ts         // TypeScript interfaces
└── course.router.ts        // Route definitions
```

### 3.4 Middleware Chain

```
Request
  → Helmet (security headers)
  → CORS
  → Rate Limiter
  → Body Parser
  → JWT Auth (jika route protected)
  → Role Guard
  → Validate Request (Zod)
  → Controller
  → Audit Logger (untuk admin action)
Response
```

---

## 4. DATABASE DESIGN

### 4.1 Database Strategy

```
┌─────────────────────────────────────┐
│         PostgreSQL (Primary)         │
│                                      │
│  Schema: public                      │
│  - users, roles, profiles           │
│  - courses, lessons, enrollments    │
│  - events, registrations            │
│  - ebooks, marketplace              │
│  - payments, orders                 │
│  - certificates                     │
│  - affiliates                       │
│  - notifications                    │
│  - blog                             │
│  - crm_leads                        │
│                                      │
└──────────────────┬──────────────────┘
                   │
┌──────────────────▼──────────────────┐
│         PostgreSQL (LMS DB)          │
│                                      │
│  Schema: tenant_{tenant_id}          │
│  - lms_courses                      │
│  - lms_users                        │
│  - lms_batches                      │
│  - lms_progress                     │
│  - lms_assignments                  │
│  - lms_announcements                │
│                                      │
└─────────────────────────────────────┘

Redis:
  - Session cache
  - Rate limit counters
  - OTP temporary storage
  - Queue jobs (BullMQ)
  - Popular courses cache (TTL: 1 jam)
  - Trending searches cache

Meilisearch:
  - Course search index
  - Event search index
  - Blog search index
```

### 4.2 Schema Detail: Core Tables

```sql
-- =====================
-- USERS
-- =====================
CREATE TABLE users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email         VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255),
  name          VARCHAR(255) NOT NULL,
  avatar_url    TEXT,
  is_verified   BOOLEAN DEFAULT FALSE,
  is_active     BOOLEAN DEFAULT TRUE,
  auth_provider VARCHAR(50) DEFAULT 'email',
  last_login_at TIMESTAMPTZ,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE user_profiles (
  user_id     UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  phone       VARCHAR(20),
  bio         TEXT,
  headline    VARCHAR(255),
  linkedin    VARCHAR(255),
  location    VARCHAR(100),
  expertise   TEXT[],
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE user_roles (
  id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id   UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role      VARCHAR(50) NOT NULL,
  tenant_id UUID,
  granted_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, role, tenant_id)
);

-- =====================
-- COURSES
-- =====================
CREATE TABLE course_categories (
  id       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name     VARCHAR(100) NOT NULL,
  slug     VARCHAR(100) UNIQUE NOT NULL,
  icon_url TEXT,
  sort_order INT DEFAULT 0
);

CREATE TABLE courses (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug            VARCHAR(255) UNIQUE NOT NULL,
  title           VARCHAR(500) NOT NULL,
  description     TEXT,
  short_desc      VARCHAR(500),
  price           DECIMAL(12,2) NOT NULL DEFAULT 0,
  sale_price      DECIMAL(12,2),
  status          VARCHAR(20) DEFAULT 'draft',
  trainer_id      UUID NOT NULL REFERENCES users(id),
  category_id     UUID REFERENCES course_categories(id),
  level           VARCHAR(20),
  language        VARCHAR(10) DEFAULT 'id',
  thumbnail_url   TEXT,
  preview_video   TEXT,
  total_duration  INT DEFAULT 0,
  total_lessons   INT DEFAULT 0,
  total_enrolled  INT DEFAULT 0,
  avg_rating      DECIMAL(3,2) DEFAULT 0,
  total_reviews   INT DEFAULT 0,
  is_featured     BOOLEAN DEFAULT FALSE,
  meta_title      VARCHAR(500),
  meta_desc       TEXT,
  published_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE course_sections (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id  UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  title      VARCHAR(500) NOT NULL,
  sort_order INT DEFAULT 0
);

CREATE TABLE course_lessons (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  section_id   UUID NOT NULL REFERENCES course_sections(id) ON DELETE CASCADE,
  title        VARCHAR(500) NOT NULL,
  type         VARCHAR(20) NOT NULL, -- video, text, quiz, assignment
  content_url  TEXT,
  content_text TEXT,
  duration     INT DEFAULT 0, -- seconds
  is_preview   BOOLEAN DEFAULT FALSE,
  sort_order   INT DEFAULT 0,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE course_enrollments (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id     UUID NOT NULL REFERENCES courses(id),
  user_id       UUID NOT NULL REFERENCES users(id),
  order_id      UUID,
  progress_pct  DECIMAL(5,2) DEFAULT 0,
  is_completed  BOOLEAN DEFAULT FALSE,
  completed_at  TIMESTAMPTZ,
  enrolled_at   TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(course_id, user_id)
);

CREATE TABLE course_lesson_progress (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  enrollment_id UUID NOT NULL REFERENCES course_enrollments(id) ON DELETE CASCADE,
  lesson_id    UUID NOT NULL REFERENCES course_lessons(id),
  watched_pct  DECIMAL(5,2) DEFAULT 0,
  is_completed BOOLEAN DEFAULT FALSE,
  completed_at TIMESTAMPTZ,
  UNIQUE(enrollment_id, lesson_id)
);

-- =====================
-- PAYMENTS
-- =====================
CREATE TABLE orders (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES users(id),
  total_amount    DECIMAL(12,2) NOT NULL,
  discount_amount DECIMAL(12,2) DEFAULT 0,
  final_amount    DECIMAL(12,2) NOT NULL,
  status          VARCHAR(20) DEFAULT 'pending',
  payment_method  VARCHAR(50),
  coupon_id       UUID,
  referral_code   VARCHAR(50),
  paid_at         TIMESTAMPTZ,
  expired_at      TIMESTAMPTZ,
  notes           TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE order_items (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id    UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  item_type   VARCHAR(50) NOT NULL, -- course, event, ebook, marketplace, trainer_program, lms
  item_id     UUID NOT NULL,
  item_title  VARCHAR(500),
  quantity    INT DEFAULT 1,
  unit_price  DECIMAL(12,2) NOT NULL,
  total_price DECIMAL(12,2) NOT NULL
);

CREATE TABLE payment_transactions (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id       UUID NOT NULL REFERENCES orders(id),
  gateway        VARCHAR(50) NOT NULL,
  gateway_tx_id  VARCHAR(255),
  payment_method VARCHAR(50),
  amount         DECIMAL(12,2) NOT NULL,
  status         VARCHAR(20) DEFAULT 'pending',
  gateway_raw    JSONB,
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  updated_at     TIMESTAMPTZ DEFAULT NOW()
);

-- =====================
-- CERTIFICATES
-- =====================
CREATE TABLE certificates (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code         VARCHAR(50) UNIQUE NOT NULL,
  type         VARCHAR(30) NOT NULL, -- course, event, trainer
  user_id      UUID NOT NULL REFERENCES users(id),
  course_id    UUID REFERENCES courses(id),
  event_id     UUID,
  issued_at    TIMESTAMPTZ DEFAULT NOW(),
  file_url     TEXT,
  is_valid     BOOLEAN DEFAULT TRUE,
  metadata     JSONB
);

-- =====================
-- AFFILIATES
-- =====================
CREATE TABLE affiliates (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID UNIQUE NOT NULL REFERENCES users(id),
  code                VARCHAR(20) UNIQUE NOT NULL,
  total_clicks        INT DEFAULT 0,
  total_conversions   INT DEFAULT 0,
  total_earnings      DECIMAL(12,2) DEFAULT 0,
  balance             DECIMAL(12,2) DEFAULT 0,
  commission_rate     DECIMAL(5,2) DEFAULT 10,
  status              VARCHAR(20) DEFAULT 'active',
  joined_at           TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE affiliate_commissions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_id    UUID NOT NULL REFERENCES affiliates(id),
  order_id        UUID NOT NULL REFERENCES orders(id),
  referred_user   UUID NOT NULL REFERENCES users(id),
  commission_pct  DECIMAL(5,2),
  gross_amount    DECIMAL(12,2),
  commission_amt  DECIMAL(12,2),
  status          VARCHAR(20) DEFAULT 'pending',
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  settled_at      TIMESTAMPTZ
);
```

### 4.3 Indexing Strategy

```sql
-- Performance indexes
CREATE INDEX idx_courses_status_published ON courses(status, published_at DESC);
CREATE INDEX idx_courses_category ON courses(category_id, status);
CREATE INDEX idx_courses_trainer ON courses(trainer_id);
CREATE INDEX idx_enrollments_user ON course_enrollments(user_id, enrolled_at DESC);
CREATE INDEX idx_enrollments_course ON course_enrollments(course_id);
CREATE INDEX idx_orders_user ON orders(user_id, created_at DESC);
CREATE INDEX idx_orders_status ON orders(status, created_at);
CREATE INDEX idx_events_start ON events(start_at, status);
CREATE INDEX idx_certs_user ON certificates(user_id, issued_at DESC);
CREATE INDEX idx_certs_code ON certificates(code);

-- Full-text search
CREATE INDEX idx_courses_fts ON courses USING gin(
  to_tsvector('indonesian', title || ' ' || COALESCE(description, ''))
);
```

---

## 5. VIDEO & MEDIA INFRASTRUCTURE

### 5.1 Video Delivery Architecture

```
Trainer Upload Video
        │
        ▼
   Media Service (Node.js)
   - Validate type/size
   - Store original to S3/R2
   - Queue transcoding job
        │
        ▼
   Transcoding Worker
   - FFmpeg: convert to HLS (multiple quality)
   - Thumbnail extraction (3 keyframes)
   - Duration extraction
   - Update DB with CDN URL
        │
        ▼
   Cloudflare Stream / Mux
   - HLS delivery
   - Adaptive bitrate (240p, 480p, 720p, 1080p)
   - Signed URL (expired per session)
   - Analytics (watch time, play events)
        │
        ▼
   Video.js / Plyr.js Player
   - Quality selector
   - Playback speed (0.5x – 2x)
   - Progress tracking → API
   - Picture-in-Picture
   - Keyboard shortcuts
```

### 5.2 File Storage Strategy

| File Type | Storage | Access |
|-----------|---------|--------|
| Course videos | Cloudflare Stream | Signed URL (4 jam) |
| Course thumbnails | Cloudflare R2 | Public via CDN |
| PDF materi | Cloudflare R2 | Signed URL (24 jam) |
| E-Book file | Cloudflare R2 | Signed URL (1 jam) + watermark |
| Rekaman event | Cloudflare Stream | Signed URL (4 jam) |
| Sertifikat PDF | Cloudflare R2 | Public (nama random) |
| Avatar user | Cloudflare R2 | Public via CDN |
| Invoice PDF | Cloudflare R2 | Signed URL (per user) |

### 5.3 Content Protection

```javascript
// Signed URL generation untuk video
async function getVideoSignedUrl(videoId: string, userId: string) {
  const expiry = Date.now() + 4 * 60 * 60 * 1000; // 4 hours

  // Verify user has access
  const enrollment = await db.checkEnrollment(userId, videoId);
  if (!enrollment) throw new ForbiddenError();

  // Generate Cloudflare signed URL
  const url = await cloudflareStream.signUrl({
    videoId,
    expiry,
    sub: userId,
    restrictions: {
      ip: request.ip,
      downloadable: false
    }
  });

  return url;
}

// E-Book watermark on download
async function downloadEbook(ebookId: string, userId: string) {
  const user = await db.getUser(userId);
  const purchase = await db.checkEbookPurchase(userId, ebookId);
  if (!purchase) throw new ForbiddenError();

  const pdf = await addWatermark(ebook.file_url, {
    text: `${user.name} | ${user.email}`,
    position: 'diagonal',
    opacity: 0.15
  });

  return pdf;
}
```

---

## 6. AUTHENTICATION & SECURITY

### 6.1 Auth Flow

```
┌─────────────────────────────────────────────────────────┐
│                    AUTH FLOW                              │
│                                                          │
│  Register/Login                                          │
│       │                                                  │
│       ▼                                                  │
│  Validate credentials                                    │
│       │                                                  │
│       ▼                                                  │
│  Generate tokens:                                        │
│  - Access Token (JWT, 15 min, in memory)                │
│  - Refresh Token (JWT, 30 days, HttpOnly cookie)        │
│       │                                                  │
│       ▼                                                  │
│  API Request → Authorization: Bearer {accessToken}      │
│       │                                                  │
│       ▼                                                  │
│  Access Token expired?                                   │
│  → POST /auth/refresh (uses refresh cookie)              │
│  → New access token returned                            │
│       │                                                  │
│  Refresh Token expired?                                  │
│  → Force re-login                                        │
└─────────────────────────────────────────────────────────┘
```

### 6.2 JWT Token Structure

```typescript
// Access Token Payload
{
  sub: "user-uuid",
  email: "user@email.com",
  roles: ["STUDENT", "AFFILIATE"],
  tenants: [],        // LMS tenant IDs if corp client
  iat: 1719000000,
  exp: 1719000900     // +15 min
}

// Refresh Token Payload
{
  sub: "user-uuid",
  jti: "unique-token-id",  // stored in DB for revocation
  iat: 1719000000,
  exp: 1721592000          // +30 days
}
```

### 6.3 Security Headers (Helmet.js)

```javascript
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'nonce-{CSP_NONCE}'", "https://js.midtrans.com"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      imgSrc: ["'self'", "data:", "https:", "blob:"],
      mediaSrc: ["'self'", "https://cloudflarestream.com"],
      // ⚠️ `api.jagoakademi.com` TIDAK resolve (BL-33, dikonfirmasi DNS + `nginx -T` 29 Jul 2026).
      // API dilayani lewat `https://jagoakademi.com/api/*` oleh nginx host, jadi `'self'` sudah
      // cukup. Snippet ini desain awal dan tidak tercermin di kode (`grep connectSrc apps/` = 0).
      connectSrc: ["'self'"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      frameSrc: ["'none'"],
      objectSrc: ["'none'"]
    }
  },
  hsts: { maxAge: 31536000, includeSubDomains: true, preload: true },
  noSniff: true,
  xssFilter: true,
  frameguard: { action: 'deny' },
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' }
}));
```

---

## 7. PAYMENT GATEWAY INTEGRATION

> ⚠️ **Correction (TASK-050 / INC-01):** the primary gateway is **DOKU**, not Midtrans.
> The actual implementation lives in `apps/api/src/services/payment/dokuService.ts`
> (`createDokuOrder`, `verifyDokuWebhook`) with env `DOKU_CLIENT_ID`, `DOKU_SECRET_KEY`,
> `DOKU_BASE_URL`. Webhook fulfillment is queued idempotently (see `docs/RUNBOOK_QUEUE.md`
> and `apps/api/src/jobs/processors/webhook.ts`). The block below is retained as a
> generic gateway-flow illustration only.

### 7.1 DOKU Integration (Primary) — illustrative flow

```typescript
// Checkout Flow (illustrative — see dokuService.ts for the real DOKU calls)
async function createPayment(order: Order) {
  const gateway = new PaymentClient({
    clientId: process.env.DOKU_CLIENT_ID,
    secretKey: process.env.DOKU_SECRET_KEY,
    isProduction: process.env.NODE_ENV === 'production'
  });

  const parameter = {
    transaction_details: {
      order_id: order.id,
      gross_amount: order.final_amount
    },
    item_details: order.items.map(item => ({
      id: item.item_id,
      price: item.unit_price,
      quantity: item.quantity,
      name: item.item_title
    })),
    customer_details: {
      first_name: order.user.name,
      email: order.user.email,
      phone: order.user.phone
    },
    enabled_payments: [
      "credit_card", "bca_va", "bni_va", "bri_va", "mandiri_bill",
      "permata_va", "gopay", "shopeepay", "dana", "ovo",
      "qris", "indomaret", "alfamart",
      "akulaku", "kredivo"
    ],
    expiry: {
      unit: "hours",
      duration: 24
    }
  };

  const response = await midtrans.createTransaction(parameter);
  return response.token; // Snap token untuk frontend
}

// Webhook Handler
async function handlePaymentWebhook(notification: PaymentNotification) {
  // Verify signature
  const hash = crypto.createHash('sha512')
    .update(`${notification.order_id}${notification.status_code}${notification.gross_amount}${SERVER_KEY}`)
    .digest('hex');

  if (hash !== notification.signature_key) {
    throw new UnauthorizedError('Invalid signature');
  }

  // Process based on transaction_status
  switch (notification.transaction_status) {
    case 'settlement':
    case 'capture':
      await processPaymentSuccess(notification.order_id);
      break;
    case 'pending':
      await updateOrderStatus(notification.order_id, 'pending');
      break;
    case 'deny':
    case 'cancel':
    case 'expire':
      await processPaymentFailed(notification.order_id);
      break;
  }
}

// processPaymentSuccess triggers:
// 1. Update order status → 'paid'
// 2. Enroll user ke course/event/ebook yang dibeli
// 3. Record affiliate commission jika ada referral code
// 4. Queue: send confirmation email
// 5. Queue: send WhatsApp confirmation
// 6. Update trainer revenue balance
```

### 7.2 Revenue Distribution Logic

```typescript
async function distributeRevenue(orderId: string) {
  const order = await db.getOrderWithItems(orderId);

  for (const item of order.items) {
    if (item.item_type === 'course') {
      const course = await db.getCourse(item.item_id);
      const trainerShare = item.total_price * 0.70;  // 70% trainer
      const platformFee = item.total_price * 0.30;   // 30% platform

      await db.creditTrainerBalance(course.trainer_id, trainerShare);
      await db.recordPlatformRevenue(item.total_price, 'course', platformFee);
    }

    if (item.item_type === 'marketplace') {
      const product = await db.getMarketplaceProduct(item.item_id);
      const creatorShare = item.total_price * 0.60;  // 60% creator
      const platformFee = item.total_price * 0.40;   // 40% platform

      await db.creditCreatorBalance(product.creator_id, creatorShare);
    }

    if (item.item_type === 'ebook') {
      const ebook = await db.getEbook(item.item_id);
      const authorShare = item.total_price * 0.70;   // 70% author
      await db.creditAuthorBalance(ebook.author_id, authorShare);
    }
  }

  // Affiliate commission
  if (order.referral_code) {
    const affiliate = await db.getAffiliateByCode(order.referral_code);
    const commissionAmt = order.final_amount * (affiliate.commission_rate / 100);
    await db.creditAffiliateBalance(affiliate.id, commissionAmt);
    await db.createAffiliateCommission(affiliate.id, order.id, commissionAmt);
  }
}
```

---

## 8. LMS MULTI-TENANT ARCHITECTURE

### 8.1 Tenancy Model

```
Strategy: Schema-per-tenant (PostgreSQL schemas)

public schema → Platform utama Jago Akademi
tenant_xxxx schema → Per corporate client

Keuntungan:
- Isolasi data sempurna
- Backup per-tenant mudah
- Performa query tidak terpengaruh antar tenant
- Custom migration per tenant jika diperlukan
```

### 8.2 Tenant Routing

```typescript
// Middleware: Resolve tenant dari domain
async function resolveTenant(req: Request, res: Response, next: NextFunction) {
  const hostname = req.hostname;

  // Custom domain: training.perusahaan.com
  // Subdomain: perusahaan.lms.jagoakademi.com
  const tenant = await db.getTenantByDomain(hostname)
    || await db.getTenantBySubdomain(hostname);

  if (!tenant) {
    return res.status(404).json({ error: 'Workspace tidak ditemukan' });
  }

  if (tenant.status !== 'active') {
    return res.status(403).json({ error: 'Workspace tidak aktif' });
  }

  // Set schema for all queries in this request
  await db.setSchema(`tenant_${tenant.id}`);
  req.tenant = tenant;
  next();
}

// Dynamic schema switching dengan Prisma
async function setTenantSchema(tenantId: string) {
  await prisma.$executeRaw`SET search_path TO ${'tenant_' + tenantId}, public`;
}
```

### 8.3 LMS Features per Plan

| Fitur | Starter | Growth | Professional | Enterprise |
|-------|---------|--------|-------------|------------|
| Max Users | 50 | 250 | 1.000 | Unlimited |
| Storage Video | 10 GB | 50 GB | 200 GB | Custom |
| Custom Branding | Partial | Full | Full | Full |
| Custom Domain | ❌ | ❌ | ✅ | ✅ |
| White-label | ❌ | ❌ | ✅ | ✅ |
| API Access | ❌ | ❌ | ✅ | ✅ |
| SSO Integration | ❌ | ❌ | ❌ | ✅ |
| Dedicated Support | ❌ | Email | Email+WA | Dedicated CSM |
| SLA | 99% | 99,5% | 99,5% | 99,9% |
| Konten Library JA | ❌ | 20 kursus | 100 kursus | All Access |
| Analytics Export | Basic | Standard | Advanced | Custom |

---

## 9. NOTIFICATION SYSTEM

### 9.1 Notification Architecture

```
Event Trigger (DB / API)
        │
        ▼
   Notification Queue (BullMQ)
        │
        ├──────────────────────────────┐
        │                              │
        ▼                              ▼
   Email Worker                WhatsApp Worker
   (Resend/AWS SES)            (Fonnte/WA API)
        │                              │
        ▼                              ▼
   Email Sent                  WA Message Sent
        │
        ├──────────────────────────────┐
        │                              │
        ▼                              ▼
   Push Notif Worker          In-App Notif
   (OneSignal/FCM)            (WebSocket/DB)
```

### 9.2 Notification Templates

| Event | Email | WA | Push | In-App |
|-------|-------|-----|------|--------|
| Register | ✅ (verifikasi) | ❌ | ❌ | ❌ |
| Payment Success | ✅ invoice | ✅ | ✅ | ✅ |
| Payment Failed | ✅ | ❌ | ✅ | ✅ |
| Course Access | ✅ | ✅ | ✅ | ✅ |
| Certificate Ready | ✅ | ✅ | ✅ | ✅ |
| Event Reminder H-7 | ✅ | ❌ | ✅ | ✅ |
| Event Reminder H-1 | ✅ | ✅ | ✅ | ✅ |
| Event Reminder H-2jam | ❌ | ✅ | ✅ | ❌ |
| Affiliate Commission | ✅ | ❌ | ❌ | ✅ |
| Trainer Payout | ✅ | ✅ | ❌ | ✅ |
| New Course Review | ❌ | ❌ | ❌ | ✅ (trainer) |
| LMS User Invite | ✅ | ✅ | ❌ | ❌ |

---

## 10. CERTIFICATE ENGINE

### 10.1 Certificate Generation Flow

```typescript
// Queue job: generate certificate
async function generateCertificate(job: Job) {
  const { userId, courseId, type } = job.data;

  // 1. Validate completion
  if (type === 'course') {
    const enrollment = await db.getEnrollment(userId, courseId);
    if (enrollment.progress_pct < 80) {
      throw new Error('Progress insufficient for certificate');
    }
  }

  // 2. Generate unique code
  const code = generateCertCode(); // Format: JA-YYYY-XXXXX

  // 3. Fetch template & data
  const template = await db.getCertTemplate(type);
  const user = await db.getUser(userId);
  const course = courseId ? await db.getCourse(courseId) : null;

  // 4. Render HTML template
  const html = renderCertTemplate(template.html, {
    recipientName: user.name,
    courseName: course?.title,
    issueDate: format(new Date(), 'dd MMMM yyyy'),
    certCode: code,
    verifyUrl: `https://jagoakademi.com/sertifikat/verifikasi/${code}`,
    qrCodeUrl: await generateQR(`https://jagoakademi.com/verifikasi/${code}`)
  });

  // 5. Convert HTML → PDF (Puppeteer)
  const browser = await puppeteer.launch({ args: ['--no-sandbox'] });
  const page = await browser.newPage();
  await page.setContent(html);
  const pdfBuffer = await page.pdf({
    width: '297mm',  // A4 landscape
    height: '210mm',
    printBackground: true
  });
  await browser.close();

  // 6. Upload to R2
  const fileUrl = await uploadToR2(pdfBuffer, `certificates/${code}.pdf`);

  // 7. Save to DB
  await db.createCertificate({
    code,
    type,
    userId,
    courseId,
    fileUrl,
    issuedAt: new Date()
  });

  // 8. Notify user
  await notificationQueue.add('send', {
    type: 'certificate_ready',
    userId,
    data: { certCode: code, fileUrl }
  });
}
```

### 10.2 Certificate Verification (Public)

```
GET /sertifikat/verifikasi/:code

Response:
{
  "valid": true,
  "certificate": {
    "code": "JA-2026-12345",
    "type": "course",
    "recipientName": "Budi Santoso",
    "courseName": "Digital Marketing Masterclass",
    "issuedAt": "22 Juni 2026",
    "issuer": "Jago Akademi",
    "trainerName": "Rina Wati"
  }
}
```

---

## 11. SEARCH & DISCOVERY

### 11.1 Search Architecture

```
User Types Query
      │
      ▼
  Debounce 300ms
      │
      ▼
  GET /api/v1/search?q={query}&type={all|course|event|ebook}
      │
      ▼
  Meilisearch Client
      │
      ├─ Course Index (title, description, trainer, category, tags)
      ├─ Event Index (title, description, speakers, category)
      └─ EBook Index (title, description, author, category)
      │
      ▼
  Results (relevance scored + highlighted snippets)
      │
      ▼
  Cache result in Redis (TTL: 5 menit per query)
```

### 11.2 Recommendation Engine

```typescript
// Simple collaborative filtering (Phase 1)
async function getCourseRecommendations(userId: string) {
  // 1. Courses user belum beli dari kategori yang pernah dibeli
  const purchasedCategories = await db.getUserPurchasedCategories(userId);

  // 2. Popular courses di kategori tersebut
  const recommended = await db.getPopularCoursesByCategories({
    categories: purchasedCategories,
    excludeIds: await db.getUserEnrolledCourseIds(userId),
    limit: 6
  });

  return recommended;
}

// Phase 2: ML-based recommendation dengan embedding
// user_vector × course_vector → cosine similarity
```

---

## 12. ANALYTICS & MONITORING

### 12.1 Business Metrics Dashboard

```typescript
// Executive Dashboard data
async function getExecutiveDashboard(dateRange: DateRange) {
  const [revenue, users, courses, events] = await Promise.all([
    db.getRevenueSummary(dateRange),
    db.getUserGrowth(dateRange),
    db.getCourseMetrics(dateRange),
    db.getEventMetrics(dateRange)
  ]);

  return {
    revenue: {
      total: revenue.total,
      byUnit: revenue.byUnit,      // per unit bisnis
      growth: revenue.growthPct,
      mrr: revenue.mrr
    },
    users: {
      total: users.total,
      new: users.new,
      active: users.active,        // MAU
      paying: users.paying,
      churn: users.churnRate
    },
    courses: {
      total: courses.total,
      published: courses.published,
      avgRating: courses.avgRating,
      completionRate: courses.completionRate,
      topPerformers: courses.top5
    }
  };
}
```

### 12.2 Observability Stack

```
Application Logs → Pino Logger → Loki / CloudWatch Logs
Metrics → Prometheus Exporter → Grafana Dashboard
Errors → Sentry (error tracking, performance)
Traces → OpenTelemetry → Jaeger / Honeycomb

Key Alerts:
- API error rate > 1% → PagerDuty
- P95 latency > 1s → PagerDuty
- Payment failure rate > 2% → Immediate Slack alert
- Storage > 80% → Slack warning
- DB connection pool > 80% → Slack warning
```

---

## 13. DEVOPS & INFRASTRUCTURE

### 13.1 Environment Strategy

```
Development:   Local Docker Compose
Staging:       Railway / Fly.io (shared)
Production:    Kubernetes (GCP GKE / AWS EKS)

Branch strategy:
  main → Production auto-deploy
  staging → Staging auto-deploy
  feature/* → PR preview (Vercel)
```

### 13.2 CI/CD Pipeline

```yaml
# .github/workflows/deploy.yml
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - Checkout
      - Install dependencies
      - Run linter (ESLint)
      - Run type check (tsc)
      - Run unit tests (Vitest)
      - Run E2E tests (Playwright, staging)
      - Security scan (npm audit, Snyk)

  build:
    needs: test
    steps:
      - Build Docker images
      - Push to Container Registry
      - Run DB migrations (Prisma migrate deploy)

  deploy:
    needs: build
    steps:
      - Rolling deploy to Kubernetes
      - Health check (wait for pods ready)
      - Smoke test (critical paths)
      - Notify Slack (success/failure)
      - Rollback if smoke test fails
```

### 13.3 Kubernetes Resources

```yaml
# core-api Deployment
replicas: 3 (min) → auto-scale to 20 (max)
resources:
  requests: cpu: 250m, memory: 256Mi
  limits: cpu: 1000m, memory: 1Gi

# PostgreSQL
  Primary + 2 Read Replicas
  PgBouncer connection pooling
  Daily backup to S3

# Redis
  Cluster mode (3 shards)
  Persistence: AOF

# HPA (Horizontal Pod Autoscaler)
  CPU threshold: 70%
  Memory threshold: 80%
```

---

## 14. API GATEWAY & RATE LIMITING

### 14.1 Rate Limiting Rules

```typescript
const rateLimits = {
  // Public endpoints
  '/auth/login': { windowMs: 15 * 60 * 1000, max: 5 },
  '/auth/register': { windowMs: 60 * 60 * 1000, max: 10 },
  '/auth/forgot-password': { windowMs: 60 * 60 * 1000, max: 3 },
  '/payment/webhook': { skip: true }, // No limit, but verify signature

  // Authenticated users
  default: { windowMs: 60 * 1000, max: 100 },  // 100 req/min per user

  // Upload endpoints
  '/upload': { windowMs: 60 * 1000, max: 10 },  // 10 uploads/min

  // Search
  '/search': { windowMs: 60 * 1000, max: 30 },   // 30 searches/min
};
```

### 14.2 CORS Configuration

```typescript
const corsOptions = {
  origin: [
    'https://jagoakademi.com',
    'https://www.jagoakademi.com',
    'https://app.jagoakademi.com',
    'https://trainer.jagoakademi.com',
    'https://admin.jagoakademi.com',
    /\.lms\.jagoakademi\.com$/,    // LMS subdomains
    process.env.NODE_ENV === 'development' ? 'http://localhost:3000' : null
  ].filter(Boolean),
  credentials: true,
  methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Tenant-ID']
};
```

---

*Dokumen System Architecture ini menjadi blueprint teknis utama untuk seluruh development Jago Akademi.*
