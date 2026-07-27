# Dashboard Standardization — Analysis

> **Disusun:** 27 Jul 2026 · **Scope:** presentation/UI‑UX only (tanpa perubahan business logic, API, DB, auth, routing, state, permission, atau fitur). · **Metode:** audit kode langsung atas 4 area (User dashboard sebagai *reference*, Admin, Trainer‑Hub, dan design‑system bersama). · **SSOT proyek:** `PROJECT_PROGRESS_REPORT_V2.md` — dokumen ini **tidak** menggantikannya; ia adalah analisis pendukung untuk pekerjaan reskin (presentation‑only, sejalur dengan Wave 5/Lumina).

Dokumen turunan: `docs/dashboard-standardization-plan.md` (langkah implementasi) dan `docs/dashboard-standardization-final-report.md` (hasil, dibuat setelah implementasi).

---

## 1. Ringkasan Eksekutif

Ketiga dashboard (**User** `app/dashboard`, **Admin** `app/admin`, **Trainer** `app/trainer-hub`) sudah berbagi **satu sumber design‑token yang sama** (`app/globals.css` + `tailwind-legacy.config.ts`) dan **satu UI kit 13‑komponen** (`components/ui/`). Fondasinya bagus. Masalahnya bukan token yang berbeda, melainkan **adopsi yang tidak konsisten**:

1. **Shell/layout tiap dashboard di‑hardcode ulang** dengan `styled-jsx` + hex literal (`.al-*` admin, `.th-*` trainer, `.dashboard-*/.sidebar-*` user, plus varian LMS Tailwind). Empat shell hampir identik nilainya tetapi **nol kode bersama**.
2. **`StatCard` (kartu KPI kanonik) nyaris tak dipakai** — hanya di 2 halaman admin. Semua dashboard lain menggulung ulang kartu statistik inline (≥4 varian berbeda).
3. **Pola berulang tanpa abstraksi**: page‑header/breadcrumb, toolbar filter+search, empty/loading/error state, tombol aksi tabel, tabs — semua diketik ulang per halaman dengan nilai yang sedikit berbeda.
4. **Reference (User dashboard) sendiri belum 100% konsisten** secara internal (dua sistem tombol, radius campur, lebar kontainer campur, heading weight campur, skeleton vs spinner). Menstandarkan Admin/Trainer ke "User dashboard" menuntut lebih dulu memutuskan *versi* User dashboard yang mana yang menjadi kanon.

Konsekuensi: pengalaman terasa berbeda antar role, kode terduplikasi (perawatan mahal, rawan drift), dan beberapa **bug presentasi nyata** muncul (mis. label role hardcode `"Super Admin"`, tren KPI palsu — lihat §9).

**Arah perbaikan:** promosikan komponen kit yang sudah ada ke *semua* dashboard, ekstrak **shell dashboard bersama** (Sidebar + Header/topbar + content wrapper) berparametrik per‑role, dan kunci satu set nilai layout (grid, lebar, spacing, radius) sebagai kontrak. Semuanya presentation‑only.

---

## 2. Fondasi Bersama yang Sudah Ada (jangan dibangun ulang)

| Aset | Lokasi | Status |
|---|---|---|
| Design tokens (warna, surface, teks, border, radius, shadow e1–e4, motion) | `app/globals.css` (`:root` + `@theme inline`) | ✅ Solid, light‑only, dipakai luas |
| Tailwind theme extend (font, fontSize, spacing 18/22/30, shadow, gradient) | `tailwind-legacy.config.ts` (via `@config`) | ✅ Ada |
| **UI kit 13 komponen** | `components/ui/` (barrel `index.ts`) | ✅ Ada; adopsi tak merata |
| Komponen kit tambahan | `EmptyState`, `Section/SectionHeader`, `ProgressBar` (e‑course‑scoped) | ✅ Ada; sebagian di luar barrel |

**Isi UI kit (13):** `Button`, `Input`, `Textarea`, `Select`, `Badge` (= StatusBadge), `Card` (+Header/Title/Content/Footer), `Modal`, `Table` (=DataTable primitives: `TableContainer/Table/THead/TBody/TR/TH/TD`), `Tabs`, `Pagination`, `Skeleton` (=LoadingSkeleton), `Avatar`, `StatCard` (=MetricCard KPI kanonik).

**Token kunci (kontrak):** surface `#FFFFFF`/`#FAFAFA`/`#F5F5F7`; teks `#1D1D1F`/`#636366`/`#6E6E73`; border `#E5E5E5`/`#D2D2D7`; brand cyan‑strong `#0077A8`; radius `md .75rem` (12px) / `lg 1rem` (16px) / `xl 1.5rem` (24px) / `full`; shadow `e1`–`e4`; brand gradient `#0077A8→#7C3AED→#CC0052`.

**Komponen yang MASIH KURANG di kit** (perlu dibuat agar tiga dashboard konvergen): `DashboardShell`/`Sidebar`/`DashboardHeader` (shell bersama), `SectionHeader` versi dashboard (yang ada `Section.tsx` = marketing), `QuickActionCard`, `DataTable` tingkat‑tinggi opsional (state loading/empty terbungkus), `FilterBar`, `ProgressBar` versi kit, dan konvensi `PageHeader` (judul + breadcrumb + action).

---

## 3. Referensi: User Dashboard (`app/dashboard`) — kanon yang harus diikuti

Shell: `app/dashboard/layout.tsx` (styled‑jsx `.dashboard-*/.sidebar-*`). Body halaman: Tailwind + token.

- **Sidebar** fixed `260px`, `#FFFFFF`, `border-right #E5E5E5`, `shadow 0 1px 3px`. Active nav: `bg rgba(0,212,255,.08)`, teks `#0077A8`, `inset 3px 0 0 #0077A8` (rail kiri). Avatar gradient `135deg #0077A8→#CC0052`.
- **Main** `margin-left:260px`. **Tidak ada topbar desktop** (topbar hanya muncul `@media max-width:768px`).
- **Content wrapper** `padding 28px 32px` (desktop) / `20px 16px` (mobile). Off‑canvas drawer + overlay di ≤768px.
- **Lebar konten per‑halaman** (di dalam body, bukan shell): Home & mayoritas `max-w-[1200px]`; Profil `max-w-6xl`; sisanya **tanpa max‑width**.
- **Grid**: CSS Grid untuk koleksi kartu, Flexbox untuk stacking. Ramp dominan `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3/4`. **Hanya Profil yang memakai `lg:grid-cols-12`**.
- **Gap**: `gap-3/3.5/4/5/6/8`. **Typography**: heading `font-display`; H1 home `text-3xl md:text-4xl font-bold`, subpage `text-2xl font-extrabold` (tidak konsisten). **Card**: `rounded-[var(--radius-lg)] border-border-default bg-surface-card shadow-e1`.

> **Catatan penting:** User dashboard adalah reference *terbaik yang tersedia*, tetapi **belum konsisten 100% secara internal**. Lihat §8 (divergensi reference). Keputusan token/nilai final (§10) harus diambil sebelum plan dieksekusi.

---

## 4. Perbandingan Tiga Dashboard (side‑by‑side)

| Dimensi | **User** (`app/dashboard`) | **Admin** (`app/admin`) | **Trainer** (`app/trainer-hub`) |
|---|---|---|---|
| **Shell** | styled‑jsx `.dashboard-*` | styled‑jsx `.al-*` | styled‑jsx `.th-*` |
| **Sidebar width** | 260px | 240px (collapse 64px) | 260px (collapse 72px) |
| **Topbar desktop** | ❌ (mobile only) | ✅ breadcrumb + avatar 56px | ❌ (mobile only) |
| **Greeting block** | ✅ di `page.tsx` | ✅ di `dashboard/page.tsx` | ❌ **tidak ada** |
| **Mobile drawer** | ✅ off‑canvas + overlay | ❌ tidak ada (sidebar tetap 240px) | ✅ off‑canvas + overlay |
| **Container max‑w** | `1200px` (campur/none) | `1200px` (sistem‑health none) | `6xl/5xl/4xl/2xl` (campur berat) |
| **Content padding** | 28/32 → 20/16 | 24px (semua) | per‑page `p-6` |
| **Grid** | Grid kartu + Flex stack | Grid + Flex (gap campur 3/3.5/4/5/6, `auto-fill` di sistem‑health) | Grid `cols-2 lg:cols-3/4` + Flex rows |
| **StatCard** | ❌ hand‑roll | ⚠️ hanya transaksi+payout; 4 varian inline lain | ❌ hand‑roll (2 varian) |
| **H1** | `text-3xl`(home)/`text-2xl extrabold`(sub) | 3 gaya: `text-2xl extrabold` / `+tracking-tight` / `text-3xl bold` | `text-xl bold` (lebih kecil) |
| **Tombol** | `Button` + legacy `.btn` global | `Button` + 4 konstanta aksi tabel (`actionPill`/`ACTION_BTN`×2/`actBtn`) | `Button` (mayoritas `cyan`) |
| **Tabs** | hand‑roll (2 gaya) | `Tabs` + raw pills (leads) + underline (lms) | tidak banyak |
| **Loading** | Skeleton (home) / spinner (sub) | 3–4 varian spinner | spinner ukuran campur + teks "Memuat…" |
| **Empty** | `EmptyState` (home hand‑roll) | `EmptyState` konsisten (dashboard inline) | `EmptyState` sebagian; sisanya teks polos |
| **Error** | banner + retry (campur) | **hanya sistem‑health**; lain menelan error | teks merah full‑screen / banner (profil) |
| **Badge** | `Badge` component | `Badge` + pill inline `style={{}}` (leads/lms/kupon/pengguna/transaksi) | `Badge` component |

---

## 5. Admin Dashboard — temuan detail (`app/admin`)

**Shell** `layout.tsx`: styled‑jsx `.al-*` + hex literal. Sidebar 240px sticky (bukan fixed), topbar 56px breadcrumb+avatar, content `padding:24px` tanpa max‑width (tiap halaman set `max-w-[1200px]` sendiri). **Bug: label role di‑hardcode `"Super Admin"`** (baris ~188) apa pun role sebenarnya; subteks logo `Control Panel` juga statik.

Inkonsistensi antar‑subhalaman (16 halaman):
1. **StatCard 4 implementasi**: kit (transaksi, payout) vs inline dashboard (`size-11`/`text-3xl`) vs inline sistem‑health (`size-11`/`text-2xl`) vs inline lms vs "button‑card" leads.
2. **Gap baris stat campur** `gap-3`/`gap-3.5`/`gap-4`; kolom `lg:grid-cols-4` vs `-5` vs `auto-fill(minmax(200px))`.
3. **TableContainer diduplikasi inline** di kursus/pengguna/transaksi/leads (markup identik) alih‑alih memakai komponen.
4. **Header baris tabel** `<TR className="hover:bg-transparent">` vs raw `<tr>` (kehilangan hover‑reset).
5. **H1 tiga gaya** (lihat tabel §4).
6. **4 konstanta tombol aksi tabel** (`actionPill` `rounded-lg px-2.5`, `ACTION_BTN` event `px-3.5`, `ACTION_BTN` review `px-3`, `actBtn` payout `rounded-xl border-2 px-4`).
7. **3–4 varian spinner loading** (+ styled‑jsx `.al-spinner`).
8. **Error state hanya di sistem‑health**; halaman lain diam saat fetch gagal + `alert()` untuk mutasi.
9. **Badge vs pill inline‑style** hidup berdampingan (radius `rounded-full` vs `rounded-md`).
10. **Filter‑bar dua pola responsif** (`lg:flex-row justify-between` vs `flex-wrap gap-3`); tinggi input campur (`py-2` vs default `py-2.5`).
11. **Tombol "Cari"** kadang override redundan `variant="cyan" className="bg-accent-cyan-strong…"`, kadang polos.
12. **Card padding one‑off** `p-[18px]` (review).
13. **Sidebar admin tidak punya mobile drawer** (240px menetap di layar kecil).
14. Komponen **orphan** `components/admin/AdminSidebar.tsx` (legacy, tak terpakai) — kandidat hapus.

Fitur admin (dipertahankan penuh): manajemen pengguna, kursus, blog, ebook, event, kupon, leads, payout, portofolio, review, transaksi, LMS B2B, sistem‑health.

---

## 6. Trainer Dashboard — temuan detail (`app/trainer-hub`)

**Shell** `layout.tsx`: styled‑jsx `.th-*` + hex literal (`#F5F5F7`, `#0077A8`, `#1D1D1F`, `#E5E5E5`, gradient `#0077A8→#CC0052`). Sidebar 260px fixed (collapse 72px), off‑canvas drawer ≤768px. **Tidak ada greeting/welcome** di shell maupun beranda. Nama user hanya di kartu bawah sidebar.

Inkonsistensi:
1. **Split styling terparah**: shell = styled‑jsx hex; body halaman = token/Tailwind + kit. Perlu migrasi shell ke token.
2. **Lebar per‑halaman berantakan**: `max-w-6xl` (beranda) / `5xl` (kursus, course) / `4xl` (payout, ulasan) / `2xl` (profil). Tak ada konstanta lebar.
3. **Header/breadcrumb strip diduplikasi inline di 6 halaman** (`border-b … px-6 py-4` + `mx-auto max-w-*`) — tak ada `PageHeader`.
4. **Stat card hand‑roll** (beranda `page.tsx:82`, course metrics) alih‑alih `StatCard`; **TableContainer inlined** (beranda, payout).
5. **Input LinkedIn raw** `<label>+<input>` dengan class field hardcode (profil ~194) alih‑alih `Input`.
6. **Loading/empty tak konsisten**: spinner ukuran beda (`size={32}` vs `28`), payout pakai teks "Memuat…"; sebagian empty pakai `EmptyState`, sebagian teks polos; mutasi pakai `alert()/confirm()`.
7. **Breakpoint mismatch**: shell pecah di 768px (`md`) tetapi grid konten sering geser di `lg` (1024px) → di tablet sidebar sudah tersembunyi tapi grid masih 2 kolom mobile.
8. **Ukuran nilai stat beda** (`text-2xl` vs `text-xl`); H1 `text-xl` (lebih kecil dari User/Admin `text-2xl`).
9. **ProgressBar hand‑roll** (course `:281`) alih‑alih komponen bersama.

Fitur trainer (dipertahankan penuh): daftar kursus + status workflow (ajukan review/arsip), analitik per‑kursus (peserta, completion, rating, watch‑time & drop‑off per‑lesson, revenue gross/net 70/30), jadwal live/Zoom, ulasan siswa, payout (form + riwayat), profil. **Catatan cakupan:** UI trainer saat ini **belum** memuat editor kurikulum/modul, upload video, quiz, assignment, roster per‑siswa, atau sertifikat — beberapa item ini disebut di brief tetapi belum ada di kode; standardisasi ini **tidak menambah fitur baru** (lihat §11).

---

## 7. Aksesibilitas & Performa (observasi lintas dashboard)

**Aksesibilitas (perlu diperbaiki, WCAG AA target):**
- Sidebar/nav belum konsisten memakai `<nav aria-label>`, `aria-current="page"` pada item aktif, dan focus‑ring terlihat (shell styled‑jsx mengandalkan warna, bukan outline fokus).
- Tombol ikon‑saja (collapse, hamburger, aksi tabel) sering tanpa `aria-label`.
- `alert()/confirm()` untuk mutasi (admin & trainer) bukan pola yang dapat diakses; sebaiknya `Modal` kit.
- Kontras: brand cyan **fill** `#00d4ff` gagal AA untuk teks — kanon sudah benar memakai `#0077A8` (`cyan-strong`, 4.67:1); audit harus memastikan tak ada teks/`btn` yang memakai `#00d4ff` di atas putih.
- Skeleton/empty/loading belum konsisten sebagai `aria-busy`/`role="status"`.

**Performa:**
- Semua halaman dashboard client‑side fetch (`"use client"`); belum ada skeleton konsisten → layout shift. Skeleton kit (`Skeleton`) sudah ada tapi hanya home yang memakainya.
- Belum ada `dynamic()`/lazy untuk komponen berat (chart sistem‑health, modal). Peluang code‑split.
- Duplikasi styled‑jsx per shell = CSS berulang; konsolidasi shell mengurangi payload.
- Gambar/thumbnail: `MediaPlaceholder` sudah dipakai sebagian; pastikan `next/image` + dimensi eksplisit untuk mencegah CLS.

---

## 8. Divergensi Internal Reference (User dashboard) — harus dinormalkan lebih dulu

Agar "ikuti User dashboard" bermakna tunggal, divergensi ini harus dipilih kanonnya:
1. **Dua sistem tombol**: `Button` komponen vs class global `.btn .btn-primary .btn-sm` (yang justru mendominasi subhalaman). → Pilih `Button`.
2. **Stat/KPI hand‑roll** (≥4 varian) padahal `StatCard` ada. → Pakai `StatCard`.
3. **Loading**: skeleton (home) vs spinner (lainnya). → Standarkan (skeleton untuk konten berstruktur).
4. **Heading**: `font-bold` (home) vs `font-extrabold` (subpage); H1 `text-3xl md:text-4xl` vs `text-2xl`. → Pilih satu skala.
5. **Radius**: token `rounded-[var(--radius-lg)]` vs literal `rounded-2xl/xl/lg`. → Token saja.
6. **Lebar kontainer**: `max-w-[1200px]` vs `max-w-6xl` vs none. → Satu konstanta.
7. **Tabs** hand‑roll 2 cara; `Tabs` kit tak dipakai. → Pakai `Tabs`.
8. Tak ada `SectionHeader`/`DataTable` level dashboard.

---

## 9. Katalog Bug Presentasi (nyata, presentation‑only)

| # | Bug | Lokasi | Dampak |
|---|---|---|---|
| B1 | Label role hardcode `"Super Admin"` apa pun role | `app/admin/layout.tsx` ~188 | Salah info role |
| B2 | Subteks logo statik `Control Panel` | `app/admin/layout.tsx` | Kosmetik |
| B3 | Header baris tabel raw `<tr>` kehilangan hover‑reset | kursus/pengguna/transaksi/ebook/leads | Hover tak konsisten |
| B4 | Error fetch ditelan diam (hanya sistem‑health punya error state) | mayoritas halaman admin | Layar kosong tanpa feedback |
| B5 | Breakpoint mismatch shell(768) vs grid(lg=1024) | trainer‑hub | Tablet: sidebar hilang, grid masih mobile |
| B6 | `alert()/confirm()` untuk mutasi | admin & trainer | UX & a11y buruk |
| B7 | Input LinkedIn raw (bypass `Input`) | `trainer-hub/profil` ~194 | Inkonsistensi + a11y |
| B8 | Tinggi input campur (`py-2` override) | blog/event/payout/review admin | Ritme vertikal pecah |

> Tren/persen KPI palsu & pagination palsu telah dicatat/diperbaiki di jalur `ADMIN_DASHBOARD_FIX_PLAN.md` (EPIC 8 / BL‑28, no‑data‑fiktif). Verifikasi ulang saat implementasi agar tidak kambuh.

---

## 10. Isu Keputusan Kunci (harus dijawab sebelum Plan dieksekusi)

**Brief menetapkan angka eksplisit yang BERBEDA dari User dashboard saat ini:**

| Aspek | Brief (diminta) | User dashboard (aktual) | Konflik? |
|---|---|---|---|
| Grid utama | **CSS Grid 12 kolom** | Mayoritas `1→sm:2→lg:3/4`; 12‑col hanya di Profil | ⚠️ Ya |
| Max‑width | **1600px** | `1200px` (`max-w-[1200px]`) | ⚠️ Ya |
| Padding kontainer | **32/24/16** | `32/16` (desktop/mobile) — tak ada tier tablet 24 | ⚠️ Sebagian |
| Gap grid | **24 (desktop) / 20 (laptop)** | `gap-6`=24 (umum) tapi juga `gap-4/5` | ⚠️ Sebagian |
| Skala spacing | **hanya 8/12/16/20/24/32/40** | Skala 4px penuh (termasuk 10/14/`3.5`) | ⚠️ Ya |
| Radius card | **20px** | `--radius-lg` = **16px** | ⚠️ Ya |
| Radius button/input | **12px** | `--radius-md` = **12px** | ✅ Cocok |
| Avatar full‑round, badge pill, shadow konsisten | ✅ | ✅ (Avatar/Badge kit) | ✅ Cocok |

**Keputusan yang diperlukan** (detail opsi di plan §Decisions):
- **D1 — Rekonsiliasi token/nilai:** ketika angka brief ≠ User dashboard, mana yang menang? (A) User‑as‑is jadi kanon; (B) terapkan angka brief secara literal ke ketiga dashboard (**termasuk merombak User dashboard**); (C) hybrid — bump token global tertentu (mis. card radius 16→20px, container 1200→1600px) diterapkan konsisten ke tiga dashboard.
- **D2 — Kedalaman shell:** ekstrak `DashboardShell/Sidebar/DashboardHeader` bersama (arsitektur benar, sentuh wiring auth‑guard tiap layout) **vs** standardisasi in‑place (adopsi kit + samakan nilai tanpa ekstraksi shell).
- **D3 — Grid 12‑kolom:** terapkan 12‑col literal (butuh peta span per komponen) atau pertahankan ramp responsif User dashboard sebagai "grid system" kanon.

---

## 11. Batasan (dijaga ketat)

- **Tidak** mengubah business logic, API, DB, autentikasi, routing, state management, atau permission.
- **Tidak menambah fitur baru** (termasuk fitur trainer yang disebut brief tapi belum ada di kode: editor modul, upload video, quiz, assignment, roster siswa, sertifikat). Standardisasi hanya menyeragamkan yang **sudah ada**; gap fitur dicatat ke `docs/BACKLOG.md`, bukan dikerjakan di sini (CLAUDE.md §d.3 — no new features Phase 1–4).
- Semua perubahan **presentation‑only**; guard/fetch/flag/tenant‑scoping dipertahankan.
- Jaring pengaman: `tsc --noEmit` + ESLint 0‑warning, build web, dan **E2E** (protokol server‑bersih ber‑flag) sebagai regresi visual.

---

## 12. Prioritas Perbaikan (High / Medium / Low)

### High (H) — konsistensi struktural & bug nyata
- **H1** Ekstrak/menyatukan **shell dashboard** (Sidebar + Header + content wrapper) untuk User/Admin/Trainer; migrasi styled‑jsx hex → token. (D2)
- **H2** Adopsi **`StatCard`** di semua grid KPI (buang ≥4 varian inline).
- **H3** Kunci **kontrak layout**: satu max‑width, satu skala padding/gap, satu grid‑system, radius via token. (D1/D3)
- **H4** Standarkan **H1/heading** (satu skala + weight) lintas tiga dashboard.
- **H5** Perbaiki **bug**: role label hardcode (B1), error‑state hilang (B4), raw `<tr>` (B3), breakpoint mismatch trainer (B5).
- **H6** Tambah **greeting/PageHeader** konsisten (trainer belum punya).

### Medium (M) — dedup & pola
- **M1** Satukan **tombol aksi tabel** jadi satu komponen (`TableActionButton`) — buang 4 konstanta.
- **M2** Pakai **`TableContainer`** komponen (buang duplikasi inline) + header row konsisten.
- **M3** Satukan **loading** (Skeleton pattern) & **empty** (`EmptyState`) & **error** (banner+retry) state.
- **M4** Satukan **Badge** (buang pill inline‑style); **FilterBar** komponen untuk toolbar search+filter.
- **M5** Pakai **`Tabs`** kit (buang tabs hand‑roll); pakai **`Input`** kit di mana masih raw (B7, tinggi input B8).
- **M6** **`QuickActionCard`** + **`ProgressBar`** versi kit; `SectionHeader` level dashboard.

### Low (L) — polish & a11y/perf
- **L1** A11y: `aria-current`, `aria-label` ikon, focus‑ring terlihat, `role="status"` pada loading, ganti `alert()/confirm()` → `Modal`.
- **L2** Perf: `dynamic()` untuk chart/modal berat; skeleton konsisten (kurangi CLS); `next/image` berdimensi.
- **L3** Breadcrumb ramah (bukan `Sistem-health`/UUID mentah); hapus breadcrumb ganda LMS.
- **L4** Hapus orphan `components/admin/AdminSidebar.tsx`.
- **L5** Micro: gap grid seragam, card padding one‑off (`p-[18px]`), override tombol "Cari" redundan.

---

*Lanjut ke `docs/dashboard-standardization-plan.md` untuk langkah implementasi berurutan (≥40 langkah, checklist, dependency, estimasi).*
