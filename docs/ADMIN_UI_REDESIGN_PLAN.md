# Implementation Plan: Redesain & Restrukturisasi UI/UX Admin Dashboard

Rencana implementasi ini mendokumentasikan secara rinci **22 detail rancangan** yang diubah pada **6 kategori utama UI/UX** untuk **Dashboard Admin (`/admin/dashboard`)** dan **14 Subhalaman Admin**. Seluruh rancangan diselaraskan dengan standar desain **Student Dashboard (Gambar 1)** dan **Trainer Hub (Gambar 3)**.

---

## 📊 Ringkasan Jumlah Rancangan Detail yang Diubah

| No | Kategori Rancangan | Jumlah Detail | Lingkup Perubahan |
|----|--------------------|---------------|-------------------|
| 1 | **Sistem Grid & Spacing** | 5 Detail | Layout 12-kolom, container, responsivitas grid, Akses Cepat |
| 2 | **Struktur Header & Navigasi** | 4 Detail | Cleaning greeting header, standardisasi PageHeader, breadcrumb |
| 3 | **Layout Section & Hero Banner** | 4 Detail | Leads hero full-width, 2-column split (8+4) Transaksi & Kursus |
| 4 | **Token Visual & Komponen Card** | 4 Detail | Border radius, badge icon tint, secondary KPI panel, Quick Action hover |
| 5 | **Tipografi & Palette Warna** | 3 Detail | Font display hierarchy, subtitle muted, konsistensi token warna |
| 6 | **Standardisasi Subhalaman Admin** | 2 Detail | PageHeader di 14 subhalaman, slot actions & button UI Kit |
| **TOTAL** | **6 Kategori Utama** | **22 Rancangan Detail** | **15 File Utama Frontend** |

---

## 📋 Rancangan Detail per Kategori

### 1. Sistem Grid & Spacing (5 Detail)
1. **Container Standard (`dash-container`)**:
   - `max-width: 1600px`, padding responsif: `16px` (mobile), `24px` (tablet), `32px` (desktop).
2. **Grid 12-Kolom (`dash-grid`)**:
   - Spacing `gap: 20px` (laptop) dan `gap: 24px` (desktop ≥1280px).
3. **KPI Primary Grid (Row 1)**:
   - Mengubah 8 StatCard padat (2 baris) menjadi 4 StatCard utama di baris 1 (`col-span-12 sm:col-span-6 xl:col-span-3`).
4. **KPI Secondary Panel (Row 2)**:
   - Membungkus 4 metrik sekunder dalam 1 kartu panel horizontal dengan grid `grid-cols-2 sm:grid-cols-4` (merata & hemat ruang).
5. **Quick Actions Grid**:
   - Mengubah kartu Akses Cepat dari `col-span-2` (9 item = baris ke-3 ganjil/1 item) menjadi `col-span-4` (3 item per baris merata).

---

### 2. Struktur Header & Navigasi (4 Detail)
6. **Pembersihan Header Greeting**:
   - Menghapus 2 tombol CTA (`+ Tambah Kursus` & `Kelola Pengguna`) dari area salam agar judul tidak berdesakan dengan tombol.
7. **Pola Header Sederhana**:
   - Mengadopsi pola Student/Trainer: *Status Pulse Badge* + *Judul Salam (`font-display text-2xl/3xl`)* + *Tanggal Hari Ini dengan Icon Calendar*.
8. **Penggunaan `PageHeader` Standard**:
   - Mengganti seluruh `<h1>` inline kustom di 14 subhalaman dengan komponen `<PageHeader>`.
9. **Jalur Breadcrumb**:
   - Menambahkan breadcrumb eksplisit `Admin / [Nama Halaman]` pada seluruh subhalaman untuk hierarki navigasi yang jelas.

---

### 3. Layout Section & Hero Banner (4 Detail)
10. **Banner Hero Leads Baru (Full-Width)**:
    - Memindahkan widget Leads dari sidebar kanan (4-col sempit) menjadi **Full-Width Hero Card** di atas tabel utama.
11. **Visual Style Leads Card**:
    - Menggunakan gradien profesional (`linear-gradient(145deg, #16283e 0%, #0c4a5a 55%, #045b66 100%)`), badge real-time backdrop blur, dan tombol CTA putih kontras.
12. **Tabel Transaksi Terbaru (Spacious 8-Col)**:
    - Alokasi lebar `col-span-12 lg:col-span-8` memberikan ruang legot untuk Avatar pembeli, Email, Judul Kursus, Badge Status, dan Total Harga.
13. **Widget Kursus Terpopuler (4-Col)**:
    - Ditempatkan berdampingan dengan Transaksi Terbaru (`col-span-12 lg:col-span-4`) dengan tinggi kartu yang sejajar (`h-full`).

---

### 4. Token Visual & Komponen Card (4 Detail)
14. **Border Radius Consistency**:
    - Seluruh kartu menggunakan `rounded-[var(--radius-card)]` (16px) dan garis tepi `border-border-default`.
15. **StatCard Icon Badge Tint**:
    - Ikon KPI utama menggunakan latar `rgba(...)` 10% opacity dengan warna aksen cyan, purple, green, dan red.
16. **Secondary KPI Mini Badge**:
    - Kartu sekunder menggunakan mini icon badge 36px x 36px dengan warna aksen yang sesuai.
17. **Quick Action Card Styling**:
    - Kartu Akses Cepat menggunakan efek hover border `hover:border-accent-cyan-strong` dan ikon 20px yang rapi.

---

### 5. Tipografi & Palette Warna (3 Detail)
18. **Hierarki Typography**:
    - Judul utama: `font-display text-2xl md:text-3xl font-extrabold text-text-primary`.
    - Judul section: `font-display text-lg font-bold text-text-primary`.
    - Subtitle/keterangan: `text-xs / text-sm text-text-secondary`.
19. **Standardisasi Badge Status**:
    - Menggunakan variant `success` (Paid/Aktif), `warning` (Pending/Trial), `danger` (Failed/Expired), `neutral`.
20. **Harmonisasi Neutral Colors**:
    - Latar belakang halaman `bg-surface-card` & `bg-surface-sunken` selaras dengan tema Student & Trainer.

---

### 6. Standardisasi Subhalaman Admin (2 Detail)
21. **Standardisasi 14 File Subhalaman**:
    - Diimplementasikan di: `blog`, `kursus`, `payout`, `pengguna`, `transaksi`, `ebook`, `leads`, `kupon`, `portofolio`, `lms`, `lms/[tenantId]`, `sistem-health`, `event`.
22. **Penyatuan Button Actions**:
    - Seluruh tombol aksi utama (Ekspor CSV, Tambah E-Book, Buat Event, Check-in, Refresh) dimasukkan ke dalam slot `actions` dari `<PageHeader>`.

---

## 📁 File yang Diubah (15 File)

1. [dashboard/page.tsx](file:///c:/Users/Halua/OneDrive/Documents/HaluanITCore/Jago-Akademi-Website1/apps/web/app/admin/dashboard/page.tsx) — Overhead Redesign (KPI 4+4, Leads Hero, 8+4 Split Grid, Quick Actions 3x3)
2. [blog/page.tsx](file:///c:/Users/Halua/OneDrive/Documents/HaluanITCore/Jago-Akademi-Website1/apps/web/app/admin/blog/page.tsx) — PageHeader + Breadcrumb
3. [kursus/page.tsx](file:///c:/Users/Halua/OneDrive/Documents/HaluanITCore/Jago-Akademi-Website1/apps/web/app/admin/kursus/page.tsx) — PageHeader + Breadcrumb
4. [payout/page.tsx](file:///c:/Users/Halua/OneDrive/Documents/HaluanITCore/Jago-Akademi-Website1/apps/web/app/admin/payout/page.tsx) — PageHeader + Breadcrumb
5. [pengguna/page.tsx](file:///c:/Users/Halua/OneDrive/Documents/HaluanITCore/Jago-Akademi-Website1/apps/web/app/admin/pengguna/page.tsx) — PageHeader + Action Export CSV
6. [transaksi/page.tsx](file:///c:/Users/Halua/OneDrive/Documents/HaluanITCore/Jago-Akademi-Website1/apps/web/app/admin/transaksi/page.tsx) — PageHeader + Action Export CSV
7. [ebook/page.tsx](file:///c:/Users/Halua/OneDrive/Documents/HaluanITCore/Jago-Akademi-Website1/apps/web/app/admin/ebook/page.tsx) — PageHeader + Action Tambah E-Book
8. [leads/page.tsx](file:///c:/Users/Halua/OneDrive/Documents/HaluanITCore/Jago-Akademi-Website1/apps/web/app/admin/leads/page.tsx) — PageHeader + Action Export CSV
9. [kupon/page.tsx](file:///c:/Users/Halua/OneDrive/Documents/HaluanITCore/Jago-Akademi-Website1/apps/web/app/admin/kupon/page.tsx) — PageHeader + Action Buat Kupon
10. [portofolio/page.tsx](file:///c:/Users/Halua/OneDrive/Documents/HaluanITCore/Jago-Akademi-Website1/apps/web/app/admin/portofolio/page.tsx) — PageHeader + Action Tambah Member
11. [lms/page.tsx](file:///c:/Users/Halua/OneDrive/Documents/HaluanITCore/Jago-Akademi-Website1/apps/web/app/admin/lms/page.tsx) — PageHeader + Action Buat Tenant
12. [lms/[tenantId]/page.tsx](file:///c:/Users/Halua/OneDrive/Documents/HaluanITCore/Jago-Akademi-Website1/apps/web/app/admin/lms/%5BtenantId%5D/page.tsx) — PageHeader + Breadcrumb Tenant Detail
13. [sistem-health/page.tsx](file:///c:/Users/Halua/OneDrive/Documents/HaluanITCore/Jago-Akademi-Website1/apps/web/app/admin/sistem-health/page.tsx) — PageHeader + Action Refresh Data
14. [event/page.tsx](file:///c:/Users/Halua/OneDrive/Documents/HaluanITCore/Jago-Akademi-Website1/apps/web/app/admin/event/page.tsx) — PageHeader + Action Check-in & Buat Event
15. [globals.css](file:///c:/Users/Halua/OneDrive/Documents/HaluanITCore/Jago-Akademi-Website1/apps/web/app/globals.css) — Standard `.dash-container` & `.dash-grid` utilities
