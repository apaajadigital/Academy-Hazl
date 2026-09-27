# Hazl Academy — Frontend Redesign Implementation Plan

> **Dokumen Resmi Perencanaan Eksekusi Redesain Visual & UX Frontend**  
> **Status**: Siap Eksekusi Bertahap (Dimulai dari Fase 1)  
> **Target**: Menggantikan tampilan "AI Slop" dengan Modern, Flat, Precision Engineering Design System dari Google Stitch.  
> **Prinsip Utama**: Zero Backend Regression (Database, Express API, Auth, Duitku Gateway, LMS Logic 100% Utuh & Aman).

---

## 1. Ringkasan Audit Frontend (`apps/web`)

Berdasarkan audit menyeluruh terhadap 95 file route (`page.tsx`), layout, dan komponen UI di `apps/web`:

### 1.1 Temuan Masalah Desain Lama ("AI Slop")
1. **Pola Warna & Ungu Ilegal**:
   - Ditemukan residu token `accent-purple` / `#7C3AED` di 14 file (blog, contact, dashboard ebook, profil, pesanan, admin layout, lms admin).
   - Pemakaian inline multi-stop gradient (biru→ungu→pink) di berbagai badge, avatar placeholder, dan button CTA.
2. **Komponen Melayang Berlebihan (Over-elevation)**:
   - Pemakaian shadow tebal (`shadow-e3`, `shadow-e4`, glow) pada card informasi biasa.
   - Kotak angka besar (`StatCard`) bertumpuk tanpa hierarki data di dashboard.
3. **Pola Ikon Lingkaran Gradient**:
   - `rounded-full` + `bg-brand-gradient` + ikon di tengah bertebaran di fitur card dan pillars.
4. **Inkonsistensi Header & Footer**:
   - Navbar menggunakan button CTA dengan gradient ungu-pink.
   - Footer menggunakan `.divider-gradient` dengan gradien warna-warni yang tidak flat.
   - Elemen navigasi belum sepenuhnya mencerminkan top bar anchor Stitch (1.1).

### 1.2 Aset Referensi Stitch yang Sudah Siap
Semua aset Stitch telah digenerate dan tersimpan di `docs/design-system/stitch-output/`:
- **Fondasi**: `0-master.html`, `0-master.png`
- **Ronde 1 (Publik 1)**: `1.1-homepage.html`, `1.2-katalog.html`, `1.2-detail.html`, `1.3-checkout.html` (sudah live), `1.4-about-contact.png`, `1.4-faq.png`, `1.4-legal.png`, `1.4-kemitraan.png`
- **Ronde 2 (Publik 2 & Auth)**: `2.1-komunitas.png`, `2.1-alumni.png`, `2.1-portofolio.png`, `2.2-blog.png`, `2.2-marketplace.png`, `2.3-auth.png`, `2.3-register.png`, `2.3-forgot-password.png`, `2.3-verify-email.png`, `2.4-pricing.png`, `2.4-early-access.png`
- **Ronde 3 (Student Space)**: `3.1-dashboard.png`, `3.1-kursus-saya.png`, `3.2-sertifikat.png`, `3.2-ebook.png`, `3.2-tiket.png`, `3.3-pesanan-list.png`, `3.3-pesanan-detail.png`, `3.3-profil.png`, `3.4-afiliasi.png`, `3.4-berlangganan.png`
- **Ronde 4 (Admin Operations)**: `4.1-admin-dashboard.png`, `4.1-manajemen-pengguna.png`, `4.2-admin-kursus.png`, `4.2-admin-blog.png`, `4.2-admin-ebook.png`, `4.2-admin-event.png`, `4.3-transaksi.png`, `4.3-kupon.png`, `4.3-payout.png`, `4.3-leads-review.png`, `4.4-admin-lms.png`, `4.4-admin-portofolio.png`, `4.4-sistem-health.png`
- **Ronde 5 (Trainer Hub & LMS B2B)**: `5.1-trainer-dashboard.png`, `5.1-trainer-kursus.png`, `5.1-trainer-profil.png`, `5.2-trainer-buat-kursus.png`, `5.2-trainer-builder-kurikulum.png`, `5.3-trainer-quiz.png`, `5.3-trainer-sertifikat.png`, `5.3-trainer-payout.png`, `5.4-lms-tenant-dashboard.png`, `5.4-lms-batch.png`, `5.4-lms-reports.png`, `5.4-lms-invite-settings.png`

---

## 2. Standar Sistem Desain Hazl (Wajib Dipatuhi)

| Elemen | Aturan & Nilai |
|---|---|
| **Warna Utama** | Primer Cyan: `#36BDF2` \| Cyan Kontras/Teks: `#0077A8` |
| **Warna Aksen** | Pink Aksen: `#FF2F86` \| Pink Kontras/Teks: `#CC0052` |
| **Warna Netral** | Page Surface: `#FAFAFA` \| Card: `#FFFFFF` \| Border: `#E7E9EC` \| Text Primary: `#16181D` \| Text Secondary: `#5B616E` |
| **Warna Terlarang** | **100% BEBAS UNGU** (Token `#7C3AED` dihapus permanen) |
| **Card & Container** | Flat by default, border 1px solid `#E7E9EC`, radius 12px (`rounded-xl`), hover subtle shadow (`shadow-sm` / `hover:border-[#707880]`) |
| **Tombol (Button)** | Publik: `rounded-full`, warna solid `#36BDF2` (text `#16181D` font-semibold) atau `#0077A8` (text white). <br>Dashboard/Admin/Trainer: `rounded-lg` (presisi alat kerja, bukan pill marketing). |
| **Gradien** | Maksimal 1 gradien per halaman (di Hero atau Closing Banner), **TIDAK** ada gradien pada badge atau button kecil. |
| **Badge Status** | Pill kecil berlatar soft (10% opacity) dengan teks solid kontras tinggi. |

---

## 3. Pembagian Fase Pengerjaan (Roadmap Bertahap)

Pengerjaan dilakukan secara sekuensial, terisolasi, dan diverifikasi per fase untuk memastikan stabilitas sistem:

```
[Fase 1: Fondasi & Homepage] ──► [Fase 2: Katalog & Detail] ──► [Fase 3: Status Payment]
            │
            ▼
[Fase 4: Auth & Legal] ──► [Fase 5: Komunitas & Blog] ──► [Fase 6: Student Space]
            │
            ▼
[Fase 7: Trainer & LMS B2B] ──► [Fase 8: Admin & E2E Audit]
```

---

### FASE 1: Brand Foundation, Global Navigation & Homepage Baru
**Fokus**: Membangun fondasi visual menyeluruh yang konsisten untuk seluruh website + merilis Homepage baru (`/`).
- **File & Komponen Target**:
  - `apps/web/app/globals.css`: Bersihkan token ungu residu, pastikan utility classes flat & accessible.
  - `apps/web/components/layout/Navbar.tsx`: Sinkronisasi top bar anchor Stitch (1.1): sticky clean header, border-b 1px tipis, logo Hazl + dot pink, tombol Masuk & CTA solid cyan pill, drawer mobile bersih.
  - `apps/web/components/layout/Footer.tsx`: Sinkronisasi footer anchor Stitch (1.1): link columns terstruktur, WhatsApp CTA, divider 1px netral, legal disclaimer.
  - `apps/web/app/(public)/page.tsx`:
    - **Hero Asimetris**: Headline presisi + CTA ganda + Workspace LMS Window Preview (simulasi production Go code broker `redis_distributed_lock.go`, curriculum tree progres 68%, mentor verified badge).
    - **Trust Enterprise Ribbon**: Telkom Indonesia, GoTo Ecosystem, Bank Mandiri, Bukalapak.
    - **Jalur Pembelajaran Terstruktur**: 4 Track Cards (Fullstack Engineering, Cloud & DevOps, Data & AI Systems, Product & UI/UX).
    - **3 Value Pillars**: Flat icon container 12x12 rounded-lg, copy tajam, zero AI-slop circular badge.
    - **Flagship Course Spotlight**: Asymmetric showcase (Laravel & React Native Enterprise, microservices, DevOps, transparent price Rp 349.000).
    - **Testimonial Otentik**: Software Engineer Telkom, Cloud Reliability Engineer Bank Mandiri, Product Designer Bukalapak.
    - **Closing Dark CTA Band**: Background `#16181D`, border `#2e3036`, 3 trust guarantees.
- **Kriteria Verifikasi**:
  - Tampilan pixel-perfect sesuai `1.1-homepage.html`.
  - Navbar dan Footer konsisten, tidak bergeser saat scrolling.
  - Test suite unit (`npm test`) 100% pass (142 passed).
  - Sinkronisasi instan ke kedua direktori (`HaluanITCore/Jago-Akademi-Website1` dan `HAZL Academy`).

---

### FASE 2: Discovery, Katalog & Detail Produk
**Fokus**: Satu sistem card produk terpadu dan halaman detail untuk 4 jenis produk digital.
- **File & Komponen Target**:
  - `apps/web/components/ui/ProgramCard.tsx`: Standarisasi card produk flat, badge harga/gratis soft tint.
  - `apps/web/app/(public)/e-course/page.tsx` & sub-routes (`[kategori]`, `[topik]`, `[materi]`).
  - `apps/web/app/(public)/ebook/page.tsx` & `apps/web/app/(public)/ebook/[slug]/page.tsx`.
  - `apps/web/app/(public)/event/page.tsx` & `apps/web/app/(public)/event/[slug]/page.tsx`.
  - `apps/web/app/(public)/kelas-gratis/page.tsx` & `apps/web/app/(public)/kelas-privat/page.tsx`.
- **Referensi Stitch**: `1.2-katalog.html`, `1.2-detail.html`.
- **Kriteria Verifikasi**:
  - Filter kategori, level, pencarian, dan pagination berfungsi interaktif.
  - Route detail produk menampilkan silabus/agenda, profil trainer, dan CTA checkout aktif.

---

### FASE 3: Status Pembayaran & Order Viewer
**Fokus**: Merapikan halaman konfirmasi pembayaran pasca-checkout Duitku.
- **File & Komponen Target**:
  - `apps/web/app/(public)/payment/success/page.tsx`: Status sukses, detail instruksi akses kelas, invoice download button.
  - `apps/web/app/(public)/payment/pending/page.tsx`: Status pending dengan instruksi QRIS/Virtual Account expire timer.
  - `apps/web/app/(public)/payment/failed/page.tsx`: Status gagal/expired dengan tombol coba bayar ulang.
  - `apps/web/app/pesanan/[orderId]/page.tsx`: Standalone invoice & order status viewer.
- **Referensi Stitch**: `1.3-payment-success.png`, `1.3-payment-pending.png`, `1.3-payment-failed.png`.
- **Kriteria Verifikasi**:
  - Integrasi webhook Duitku tetap aman, status update real-time via polling/SWR.

---

### FASE 4: Auth Shell & Halaman Informasi / Legal
**Fokus**: Shell autentikasi minimal-distraksi dan halaman statis legal/korporasi yang mudah dibaca.
- **File & Komponen Target**:
  - `apps/web/app/(auth)/layout.tsx`: Centered auth shell flat dengan logo Hazl.
  - `apps/web/app/(auth)/masuk/page.tsx` & `apps/web/app/(auth)/daftar/page.tsx`.
  - `apps/web/app/(auth)/lupa-password/page.tsx` & `apps/web/app/(auth)/reset-password/page.tsx`.
  - `apps/web/app/(auth)/verifikasi-email/page.tsx`.
  - `apps/web/app/(public)/about/page.tsx`, `contact/page.tsx`, `faq/page.tsx`.
  - `apps/web/app/(public)/terms/page.tsx`, `privacy/page.tsx`.
  - `apps/web/app/(public)/kolaborasi/page.tsx`, `afiliasi/page.tsx`, `trainer-program/page.tsx`, `clients/page.tsx`.
- **Referensi Stitch**: `2.3-auth.png`, `2.3-register.png`, `1.4-about-contact.png`, `1.4-faq.png`, `1.4-legal.png`, `1.4-kemitraan.png`.
- **Kriteria Verifikasi**:
  - Login, register, forgot-password flow berfungsi mulus dengan session cookie httpOnly.
  - FAQ accordion responsif dan accessible.

---

### FASE 5: Komunitas, Alumni, Portofolio & Blog
**Fokus**: Tampilan sosial-bukti yang hidup dengan foto/avatar nyata, serta tipografi baca nyaman.
- **File & Komponen Target**:
  - `apps/web/app/(public)/komunitas/page.tsx` (channel Discord/WA & jadwal meetup).
  - `apps/web/app/(public)/alumni/page.tsx` (showcase alumni & pencapaian karier).
  - `apps/web/app/(public)/portofolio-member/page.tsx` & `[id]/page.tsx`.
  - `apps/web/app/(public)/blog/page.tsx` & `apps/web/app/(public)/blog/[slug]/page.tsx` (prose typography max-w 680px).
  - `apps/web/app/(public)/marketplace/page.tsx`.
  - `apps/web/app/(public)/berlangganan/page.tsx` & `early-access/page.tsx`.
- **Referensi Stitch**: `2.1-komunitas.png`, `2.1-alumni.png`, `2.1-portofolio.png`, `2.2-blog.png`, `2.2-marketplace.png`, `2.4-pricing.png`.
- **Kriteria Verifikasi**:
  - Grid karya member interaktif, pembaca artikel blog nyaman tanpa distraksi visual.

---

### FASE 6: Student Learning Space & Dashboard
**Fokus**: Workspace belajar student yang produktif, rapi, dan terstruktur.
- **File & Komponen Target**:
  - `apps/web/app/dashboard/layout.tsx`: Sidebar flat dengan active state border biru kiri (tanpa full gradient).
  - `apps/web/app/dashboard/page.tsx`: Overview ringkas (maks 3-4 StatCard headline).
  - `apps/web/app/dashboard/kursus/page.tsx` & `apps/web/app/belajar/[slug]/[lessonId]/page.tsx` (LMS Player).
  - `apps/web/app/dashboard/sertifikat/page.tsx` & `apps/web/app/(public)/verify/[certId]/page.tsx`.
  - `apps/web/app/dashboard/ebook/page.tsx` & `tiket/page.tsx`.
  - `apps/web/app/dashboard/pesanan/page.tsx` & `[orderId]/page.tsx`.
  - `apps/web/app/dashboard/profil/page.tsx`, `afiliasi/page.tsx`, `berlangganan/page.tsx`.
- **Referensi Stitch**: `3.1-dashboard.png`, `3.1-kursus-saya.png`, `3.2-sertifikat.png`, `3.2-ebook.png`, `3.3-pesanan-list.png`, `3.3-profil.png`.
- **Kriteria Verifikasi**:
  - Progress belajar tersimpan di database, player video/materi responsif, verifikasi QR sertifikat valid.

---

### FASE 7: Trainer Hub & Multi-Tenant LMS B2B
**Fokus**: Alat kerja trainer profesional dan portal B2B enterprise yang presisi.
- **File & Komponen Target**:
  - `apps/web/app/trainer-hub/layout.tsx` & `page.tsx`.
  - `apps/web/app/trainer-hub/kursus/*`: Builder kurikulum drag-drop, quiz creator, sertifikat kursus, daftar siswa, payout queue.
  - `apps/web/app/lms/[tenantSlug]/*`: Tenant admin dashboard, batch management, reports, portal kustom, invite flow `invite/[token]`.
- **Referensi Stitch**: `5.1-trainer-dashboard.png`, `5.2-trainer-builder-kurikulum.png`, `5.3-trainer-quiz.png`, `5.4-lms-tenant-dashboard.png`, `5.4-lms-batch.png`.
- **Kriteria Verifikasi**:
  - Kurikulum builder dapat menambah modul & lesson, tenant LMS terisolasi per organisasi.

---

### FASE 8: Admin Operational Control & Full End-to-End Audit
**Fokus**: Panel kendali bisnis berdensitas tinggi, moderasi, laporan finansial, dan audit seluruh rute.
- **File & Komponen Target**:
  - `apps/web/app/admin/layout.tsx` & `dashboard/page.tsx`.
  - `apps/web/app/admin/pengguna/page.tsx`, `kursus/page.tsx`, `blog/page.tsx`, `ebook/page.tsx`, `event/*`.
  - `apps/web/app/admin/transaksi/page.tsx`, `kupon/page.tsx`, `payout/page.tsx`, `leads/page.tsx`, `review/page.tsx`.
  - `apps/web/app/admin/lms/*`, `portofolio/page.tsx`, `sistem-health/page.tsx`.
- **Referensi Stitch**: `4.1-admin-dashboard.png`, `4.1-manajemen-pengguna.png`, `4.2-admin-kursus.png`, `4.3-transaksi.png`, `4.4-sistem-health.png`.
- **Kriteria Verifikasi & Final Gate**:
  - Audit seluruh 95 route: 0 link 404, 0 runtime exception di console.
  - Semua 142+ unit test lolos.
  - Semua flow transaksional (Duitku, enroll, login, payout) berfungsi 100%.

---

## 4. Mekanisme Eksekusi & Protokol Sinkronisasi

1. **Dual Directory Synchronization**:
   - Seluruh perubahan file pada workspace `HaluanITCore/Jago-Akademi-Website1` wajib disinkronisasikan ke direktori server aktif `HAZL Academy`.
2. **Turbopack Icon Stability**:
   - Menggunakan SVG lokal / direct icon exports untuk mencegah issue `lucide-react` HMR chunking pada Next.js 16 Turbopack.
3. **Validasi Setiap Langkah**:
   - Menjalankan `npm test` di `apps/web` setelah setiap fase.
   - Menguji tampilan langsung via headless browser / curl status code sebelum menyatakan fase selesai.
