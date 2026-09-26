# Dashboard Standardization — Implementation Plan

> **Turunan dari:** `docs/dashboard-standardization-analysis.md`. · **Scope:** presentation/UI‑UX only (tanpa perubahan business logic, API, DB, auth, routing, state, permission, fitur). · **Jaring pengaman:** `tsc --noEmit` + ESLint 0‑warning + build web + E2E (protokol server‑bersih ber‑flag). · **Governance:** CLAUDE.md — satu task = satu branch/PR, commit atomik, **tidak merge/push/deploy tanpa konfirmasi reviewer**.

## Keputusan yang Dikunci (dari reviewer, 27 Jul 2026)

- **D1 = Terapkan angka brief secara literal.** Angka brief menjadi **kanon**, diterapkan ke KETIGA dashboard **termasuk merombak User dashboard** agar match. "User dashboard sebagai acuan" tetap berlaku untuk *struktur/urutan section & bahasa desain*, tetapi **nilai numerik mengikuti brief**.
- **D2 = Standardisasi shell in‑place.** Tiga file `layout.tsx` (User/Admin/Trainer) tetap terpisah (aman untuk wiring auth‑guard). Nilai di dalamnya disamakan & digerakkan token (migrasi hex → token). **Tidak** mengekstrak satu `DashboardShell` bersama. Komponen **konten** reusable (PageHeader, FilterBar, StatCard, dst.) tetap dipusatkan di UI kit.
- **D3 = CSS Grid 12‑kolom literal di semua halaman dashboard**, dengan peta `col-span` per komponen + perilaku responsif.

---

## 0. Kontrak Desain (locked values) — sumber kebenaran numerik

Semua halaman & shell dashboard WAJIB mematuhi:

| Aspek | Nilai kanon | Implementasi |
|---|---|---|
| Layout utama | **CSS Grid 12 kolom** | `grid grid-cols-12` |
| Max‑width kontainer | **1600px** | token `--container-max: 100rem` → util `.dash-container` / `max-w-[var(--container-max)]` |
| Padding kontainer | **32 desktop / 24 tablet / 16 mobile** | `px-4 md:px-6 xl:px-8` (16/24/32) via util `.dash-container` |
| Gap grid | **24 desktop / 20 laptop** | `gap-5 xl:gap-6` (20/24) |
| Skala spacing | **hanya 8/12/16/20/24/32/40** | `2,3,4,5,6,8,10` (Tailwind) — dilarang `1.5/2.5/3.5/7/9/11/14` di file dashboard |
| Radius **card** | **20px** | token baru `--radius-card: 1.25rem` → `rounded-[var(--radius-card)]` |
| Radius **button/input** | **12px** | `--radius-md` (0.75rem, sudah 12px) |
| Avatar | full rounded | `Avatar` kit (`rounded-full`) |
| Badge | pill | `Badge` kit (`rounded-full`) |
| Shadow | konsisten | token `shadow-e1` (resting) / `shadow-e2` (hover/raised) / `shadow-e3` (elevated) |
| Warna | token only | `surface-*`, `text-*`, `border-*`, `accent-cyan-strong #0077A8` (dilarang teks `#00d4ff`) |
| Transition/hover | konsisten | `transition-all`, hover‑lift `-translate-y-0.5`, `hover:shadow-e2` |

**Skala tipografi kanon (lintas 3 dashboard):**
- **H1 halaman:** `font-display text-2xl font-extrabold text-text-primary` (greeting home boleh `md:text-3xl`).
- **H2 section:** `font-display text-lg font-bold`.
- **H3 card title:** `font-display text-base font-bold` (atau `CardTitle`).
- **KPI value:** `StatCard` (`text-2xl font-extrabold`).
- **Label mikro/eyebrow:** `text-[11px] font-semibold uppercase tracking-wider text-text-secondary`.
- **Body:** `text-sm text-text-secondary`.

> **Catatan token:** perubahan radius card memakai **token baru** `--radius-card` (bukan mengubah `--radius-lg` yang dipakai luas di luar dashboard) agar blast‑radius terkendali. Container/gap juga via token/util baru. Ini menjaga perubahan tetap presentation‑only & terisolasi ke dashboard.

---

## Peta Fase & Dependensi

```
FASE 0 (Fondasi: token + util + kit baru)  ──►  semua fase lain
   │
   ├─► FASE 1 (Shell in‑place ×3)            ─┐
   ├─► FASE 2 (StatCard + Grid 12‑col)        ├─► FASE 5 (Typography/Spacing sweep)
   ├─► FASE 3 (Tabel/Toolbar/Filter)          │        │
   └─► FASE 4 (States + Bug fixes)           ─┘        ├─► FASE 6 (A11y)
                                                       ├─► FASE 7 (Perf)
                                                       └─► FASE 8 (Validasi + Final report)
```
- Fase 1–4 boleh **paralel per file** (file dipisah, tanpa saling blok) setelah Fase 0 selesai.
- Fase 5–7 adalah *sweep* lintas file → jalankan setelah 1–4 stabil.
- **Legenda kompleksitas:** S = kecil (<1 file/lokal), M = sedang (1 halaman/komponen), L = besar (lintas banyak halaman).

---

## FASE 0 — Fondasi Design System (blocker semua)

**Step 1 — Buat branch.** `feat/dashboard-standardization` dari `main` terkonsolidasi. Konfirmasi base = `main` (bukan `task/*`). · Dep: — · **S**
- [ ] `git switch -c feat/dashboard-standardization`

**Step 2 — Tambah token kontrak di `app/globals.css`.** Tambah `--radius-card: 1.25rem`, `--container-max: 100rem`, ekspor via `@theme inline` agar util `rounded-[var(--radius-card)]` & `max-w-[var(--container-max)]` bekerja. · Dep: 1 · **S**
- [ ] Token tak menimpa `--radius-lg`; tak ada regresi halaman publik.

**Step 3 — Buat util `.dash-container` & `.dash-grid`** (di `@layer components` globals.css): container = `max-width var(--container-max); margin-inline auto; padding 16px` → `@media md 24px` → `@media xl 32px`. `.dash-grid` = `display:grid; grid-template-columns: repeat(12,1fr); gap:20px` → `@media xl gap:24px`. · Dep: 2 · **S**
- [ ] Dipakai konsisten oleh semua halaman (menggantikan `max-w-[1200px]`/`p-6` ad‑hoc).

**Step 4 — Definisikan lint guard skala spacing** (opsional tapi disarankan): dokumentasikan di plan + tambah komentar; jika memungkinkan tambah ESLint rule/`grep` check untuk kelas terlarang (`gap-3.5`, `p-7`, `size-11`, dst.) di folder dashboard. · Dep: 2 · **S**
- [ ] Daftar kelas terlarang tertulis; script cek di `package.json` (mis. `lint:spacing`).

**Step 5 — Promosikan `StatCard` ke barrel & pastikan sesuai kontrak** (`rounded-[var(--radius-card)] p-6`, value `text-2xl font-extrabold`, trend pill hanya jika data nyata). · Dep: 2 · **S**
- [ ] `StatCard` mematuhi radius/spacing kanon; tren opsional & jujur (no fake).

**Step 6 — Buat `PageHeader` (kit).** Props: `title`, `subtitle?`, `breadcrumb?`, `actions?`. Output: H1 kanon + subtitle + slot aksi (wrap responsif). Menggantikan header/breadcrumb strip yang diketik ulang. · Dep: 2 · **M**
- [ ] `components/ui/PageHeader.tsx` + export barrel.

**Step 7 — Buat `FilterBar` (kit).** Bungkus search + filter dalam filter‑card (`rounded-[var(--radius-card)] border bg-surface-card p-4 shadow-e1`), layout `flex-col gap-4 lg:flex-row lg:items-center lg:justify-between`. Slot `search`, `filters`, `actions`. · Dep: 2 · **M**
- [ ] `components/ui/FilterBar.tsx` + barrel.

**Step 8 — Buat `QuickActionCard` (kit).** Tile aksi cepat (ikon + label + href), radius/hover kanon. · Dep: 2 · **S**
- [ ] `components/ui/QuickActionCard.tsx` + barrel.

**Step 9 — Buat `TableActionButton` (kit).** Satu tombol aksi baris tabel (variants `ok/warn/danger/neutral`), `rounded-md px-3 py-1.5 text-xs font-semibold` + hover fill. Menggantikan 4 konstanta (`actionPill/ACTION_BTN×2/actBtn`). · Dep: 2 · **S**
- [ ] `components/ui/TableActionButton.tsx` + barrel.

**Step 10 — Buat `ProgressBar` (kit) & `DashboardState` helper.** `ProgressBar` (track `h-2 rounded-full bg-border-default`, fill `bg-accent-cyan-strong`/gradient, `role="progressbar"` + aria). `DashboardState`: wrapper standar untuk **loading** (Skeleton/spinner `role="status"`), **empty** (`EmptyState`), **error** (banner + "Coba Lagi"). · Dep: 2 · **M**
- [ ] `components/ui/ProgressBar.tsx` + `components/ui/DashboardState.tsx` (atau util) + barrel.

**Step 11 — Verifikasi Fase 0.** `tsc --noEmit` + ESLint 0‑warning + build; render halaman publik tak berubah (token baru tak bocor). · Dep: 2–10 · **S**
- [ ] Commit: `feat(ui): add dashboard design-system primitives & tokens (standardization Fase 0)`.

---

## FASE 1 — Shell Standardization In‑Place (D2)

> Tiga `layout.tsx` tetap terpisah; nilai disamakan & token‑driven. Auth‑guard/`initAuth`/routing **tidak disentuh**.

**Step 12 — User shell** (`app/dashboard/layout.tsx`): migrasi styled‑jsx hex → var token (`#F5F5F7`→`var(--surface-page)`, `#0077A8`→`var(--brand-cyan-strong)`, dst.). Sidebar 260px, active rail konsisten. Pastikan content wrapper memakai `.dash-container` (padding 32/24/16). · Dep: 11 · **M**
- [ ] Tidak ada hex literal tersisa di shell; drawer mobile tetap jalan.

**Step 13 — Admin shell** (`app/admin/layout.tsx`): (a) migrasi `.al-*` hex → token; (b) **fix B1** role label hardcode `"Super Admin"` → role nyata dari state; (c) **fix B2** subteks logo; (d) **tambah mobile drawer** (off‑canvas + overlay) meniru pola User (fix: sidebar 240px menetap di mobile); (e) content wrapper → `.dash-container` (max‑width 1600 + padding 32/24/16). · Dep: 11 · **L**
- [ ] Role label akurat; drawer mobile berfungsi; nol hex literal.

**Step 14 — Trainer shell** (`app/trainer-hub/layout.tsx`): (a) migrasi `.th-*` hex → token; (b) **fix B5** breakpoint mismatch — selaraskan collapse shell dengan ramp grid; (c) content wrapper → `.dash-container`. · Dep: 11 · **M**
- [ ] Nol hex literal; tablet tak lagi "sidebar hilang + grid mobile".

**Step 15 — Greeting/PageHeader konsisten (fix H6/B‑trainer).** Tambahkan blok greeting + `PageHeader` di beranda trainer (belum ada) & seragamkan greeting User/Admin (satu pola). · Dep: 6, 12–14 · **M**
- [ ] Ketiga beranda punya greeting seragam (nama + ringkas peran/tanggal).

**Step 16 — Breadcrumb ramah (L3).** Label ramah (bukan `Sistem-health`/`Lms`/UUID mentah), ancestor jadi link; hapus breadcrumb ganda LMS (`admin/lms/[tenantId]`). · Dep: 13 · **S**
- [ ] Breadcrumb terbaca; tak ada duplikasi.

**Step 17 — Hapus orphan `components/admin/AdminSidebar.tsx` (L4).** Pastikan zero import. · Dep: 13 · **S**
- [ ] `grep` konfirmasi tak dipakai; file dihapus.

**Step 18 — Verifikasi Fase 1.** tsc+lint+build; smoke render 3 shell desktop+mobile. Commit atomik per shell. · Dep: 12–17 · **S**
- [ ] Commit: `style(dashboard): unify shells to tokens + admin role/drawer fixes (Fase 1)`.

---

## FASE 2 — StatCard + Grid 12‑Kolom (H2/H3/D3)

> Konversi tiap halaman ke `.dash-grid` (12‑col) + `col-span` map, dan ganti stat inline → `StatCard`.

**Step 19 — Peta `col-span` kanon (dokumentasi).** Tetapkan konvensi: KPI = `col-span-6 sm:col-span-4 xl:col-span-3` (4 per baris), kartu konten = `col-span-12 md:col-span-6 xl:col-span-4`, region utama+samping = `col-span-12 lg:col-span-8` + `lg:col-span-4`, tabel/full = `col-span-12`. · Dep: 11 · **S**
- [ ] Tabel peta span ditulis (jadi acuan semua halaman).

**Step 20 — User dashboard home** (`app/dashboard/page.tsx`): bungkus `.dash-container` + `.dash-grid`; KPI → `StatCard`; quick access → `QuickActionCard`; kartu kursus → `col-span` map; skeleton via `DashboardState`. · Dep: 5,8,10,19 · **L**

**Step 21 — User subpages** (kursus, pesanan, profil, sertifikat, tiket, ebook, berlangganan, afiliasi, affiliate): masing‑masing → `.dash-container`+`.dash-grid`, buang stat inline → `StatCard`, tabs hand‑roll → `Tabs` kit, tombol legacy `.btn` → `Button`. · Dep: 5,19 · **L** (9 file, paralel)
- [ ] Profil tetap 2‑kolom (ID card `col-span-4` + form `col-span-8`).

**Step 22 — Admin dashboard** (`app/admin/dashboard/page.tsx`): KPI inline (`size-11`/`text-3xl`) → `StatCard`; region utama `lg:col-span-8`+`lg:col-span-4` via 12‑col; quick actions → `QuickActionCard`; buang tren%/pagination palsu bila kambuh. · Dep: 5,8,19 · **M**

**Step 23 — Admin stat/list pages** (transaksi, payout sudah StatCard → konfirmasikan kontrak; leads, lms, sistem‑health → ganti inline/`auto-fill` → `StatCard`+12‑col). · Dep: 5,19 · **L**
- [ ] sistem‑health `auto-fill` → grid 12‑col; gap seragam 24/20.

**Step 24 — Trainer pages** (beranda, kursus, kursus/[courseId], payout, ulasan, profil): lebar campur (`6xl/5xl/4xl/2xl`) → `.dash-container` (1600); stat hand‑roll → `StatCard`; metric grid → 12‑col; ProgressBar hand‑roll → kit; input LinkedIn raw → `Input` (fix B7). · Dep: 5,10,19 · **L**

**Step 25 — Verifikasi Fase 2.** tsc+lint+build; cek visual grid di 1600/1280/1024/768/375. Commit per grup. · Dep: 20–24 · **S**
- [ ] Commit: `style(dashboard): 12-col grid + unified StatCard across all pages (Fase 2)`.

---

## FASE 3 — Tabel, Toolbar, Filter, Badge (M1/M2/M4)

**Step 26 — Adopsi `TableContainer` kit** di kursus/pengguna/transaksi/leads (admin) & beranda/payout (trainer) — buang duplikasi inline. · Dep: 11 · **M**

**Step 27 — Header baris tabel konsisten (fix B3).** Semua `THead` pakai `<TR>` (bukan raw `<tr>`), header class kanon. · Dep: 26 · **S**

**Step 28 — Ganti 4 konstanta tombol aksi → `TableActionButton`** (kursus/event/review/payout admin + aksi trainer). · Dep: 9 · **M**

**Step 29 — Adopsi `FilterBar`** di semua list page admin (blog/event/payout tanpa card → dapat frame; kursus/pengguna/transaksi/ebook → satu pola responsif). Perbaiki header `admin/review` (pisah mode‑tabs & status‑filter). · Dep: 7 · **L**

**Step 30 — Satukan Badge (M4).** Ganti pill inline `style={{}}` (leads/lms/kupon/pengguna/transaksi admin) → `Badge` variants; radius pill konsisten (`rounded-full`). · Dep: 11 · **M**

**Step 31 — Satukan Tabs & Input (M5).** Tabs hand‑roll (leads raw pills, lms underline) → `Tabs` kit; input tinggi campur (`py-2`) → default `Input` (fix B8); tombol "Cari" hapus override redundan. · Dep: 11 · **M**

**Step 32 — Verifikasi Fase 3.** tsc+lint+build. Commit. · Dep: 26–31 · **S**
- [ ] Commit: `style(dashboard): unified tables/toolbars/badges/tabs (Fase 3)`.

---

## FASE 4 — States & Bug Fixes (M3/H5/B‑list)

**Step 33 — Loading state seragam.** Semua halaman → `DashboardState` loading (Skeleton mirroring untuk konten berstruktur; spinner `role="status"` untuk aksi). Buang 3–4 varian spinner. · Dep: 10 · **L**

**Step 34 — Empty state seragam.** Semua empty → `EmptyState` (buang teks polos & blok inline home/afiliasi/payout/trainer). · Dep: 11 · **M**

**Step 35 — Error state seragam (fix B4).** Tambah banner error + "Coba Lagi" via `DashboardState` di halaman yang menelan error (mayoritas admin). · Dep: 10 · **M**

**Step 36 — Ganti `alert()/confirm()` mutasi → `Modal` kit (fix B6).** Admin & trainer: konfirmasi hapus/aksi → `Modal` (a11y + konsisten). · Dep: 11 · **M**
- [ ] Tidak mengubah logika mutasi — hanya lapisan konfirmasi UI.

**Step 37 — Guard nilai tampilan (defensif).** `avgRating` `Number.isFinite`, `Rp NaN` (transaksi), count dari `meta.total` (kupon) — verifikasi ulang tetap presentation‑only. · Dep: — · **S**

**Step 38 — Verifikasi Fase 4.** tsc+lint+build. Commit. · Dep: 33–37 · **S**
- [ ] Commit: `style(dashboard): unified loading/empty/error states + bug fixes (Fase 4)`.

---

## FASE 5 — Typography & Spacing Sweep (H4/L5)

**Step 39 — Sweep tipografi.** Seluruh dashboard: H1/H2/H3 → skala kanon (§0). Satu weight (`extrabold` H1, `bold` H2/H3). Hapus `tracking-tight` sporadis. · Dep: 20–24 · **M**

**Step 40 — Sweep spacing.** Ganti kelas di luar skala 8‑step (`gap-3.5`, `p-7`, `p-[18px]`, `size-11`, `mt-2.5`, dll.) → nilai kanon terdekat (8/12/16/20/24/32/40). Jalankan `lint:spacing` (Step 4). · Dep: 4 · **L**

**Step 41 — Sweep radius & shadow.** Card literal `rounded-2xl/xl/lg` → `rounded-[var(--radius-card)]` (20px); button/input → `--radius-md` (12px); shadow → e1/e2/e3 sesuai state. · Dep: 2 · **M**

**Step 42 — Verifikasi Fase 5.** tsc+lint+build + `lint:spacing` bersih. Commit. · Dep: 39–41 · **S**
- [ ] Commit: `style(dashboard): typography/spacing/radius contract sweep (Fase 5)`.

---

## FASE 6 — Aksesibilitas (L1, target WCAG AA)

**Step 43 — Nav & landmark.** `<nav aria-label>`, `aria-current="page"` item aktif, `<main id="main-content">` + skip‑link, heading order benar. · Dep: 12–14 · **M**

**Step 44 — Kontrol & fokus.** `aria-label` untuk tombol ikon (collapse/hamburger/aksi), focus‑ring terlihat (`focus-visible:ring-2 ring-accent-cyan-strong/40`), `role="status"`/`aria-busy` loading, `role="progressbar"` progress. · Dep: 10,33 · **M**

**Step 45 — Kontras & warna.** Audit tak ada teks/`btn` memakai fill `#00d4ff` di atas putih (pakai `#0077A8`); state (success/warn/danger) memenuhi AA. · Dep: 30 · **S**

**Step 46 — Verifikasi a11y.** axe/Lighthouse a11y pass (target ≥95); keyboard‑only walkthrough 3 dashboard. Commit. · Dep: 43–45 · **M**
- [ ] Commit: `a11y(dashboard): landmarks, aria, focus, contrast (Fase 6)`.

---

## FASE 7 — Performa (L2)

**Step 47 — Code‑split komponen berat.** `dynamic()` untuk chart sistem‑health & `Modal` besar; pastikan `Skeleton` fallback. · Dep: 33 · **M**

**Step 48 — Memoization & anti‑CLS.** `useMemo`/`memo` untuk list/row derivation; `next/image` berdimensi eksplisit untuk thumbnail; skeleton konsisten (kurangi layout shift). · Dep: — · **M**

**Step 49 — Bersihkan console/hydration.** Nol `console.log` (pakai logger), nol warning hydration, nol React key warning di 3 dashboard. · Dep: — · **S**

**Step 50 — Verifikasi perf.** Lighthouse (Perf/Best‑Practices) baseline vs after; catat angka. Commit. · Dep: 47–49 · **S**
- [ ] Commit: `perf(dashboard): code-split, memoization, anti-CLS (Fase 7)`.

---

## FASE 8 — Validasi Berlapis, Regresi, Dokumentasi

**Step 51 — Validasi berlapis (SSOT §9.11).** (1) `apps/api` tsc+test bila tersentuh (harusnya tidak), (2) `apps/web` `tsc --noEmit` + ESLint `--max-warnings 0`, (3) build web, (4) `lint:spacing` bersih. · Dep: semua · **M**

**Step 52 — E2E regresi visual (protokol server‑bersih ber‑flag).** Kill server basi (`:3004` by PID) → `rm -rf apps/web/.next` → regen baseline (server ber‑flag bersih) → jalankan E2E 3 dashboard. Flags tetap OFF (presentation‑only). · Dep: 51 · **L**
- [ ] Semua E2E hijau; baseline visual diperbarui sadar.

**Step 53 — Self‑review diff** (SSOT §9.11 #6): pastikan nol perubahan pada service/repository/route/prisma/auth; hanya `app/**` UI + `components/ui/**` + `globals.css`/config token. · Dep: 51 · **M**

**Step 54 — Update dokumentasi (docs‑as‑code).** Tulis `docs/dashboard-standardization-final-report.md` (ringkasan, file dimodifikasi, komponen baru/refactor, before/after, Lighthouse, rekomendasi). Update Progress Tracker CLAUDE.md bila relevan. Catat gap fitur trainer (modul/quiz/assignment/roster/sertifikat) ke `docs/BACKLOG.md`. · Dep: 50 · **M**

**Step 55 — PR + serahkan ke reviewer (human‑gated).** Buka PR `feat/dashboard-standardization` → `main`; ringkas perubahan + screenshot before/after. **Jangan merge/push/deploy tanpa konfirmasi.** Deploy (jika disetujui) = web‑only `--no-cache` rebuild, tanpa migration. · Dep: 51–54 · **S**
- [ ] PR dibuka; menunggu review.

---

## Roadmap Migrasi Komponen (ringkas)

| Pola lama (inline/duplikat) | → | Komponen kanon | Halaman terdampak |
|---|---|---|---|
| Stat/KPI hand‑roll (≥5 varian) | → | `StatCard` | user home, admin dashboard/sistem‑health/lms/leads, trainer beranda/course |
| Header/breadcrumb strip inline | → | `PageHeader` | semua trainer (6), sebagian admin |
| Toolbar search+filter ad‑hoc | → | `FilterBar` | semua list page admin |
| `actionPill`/`ACTION_BTN`×2/`actBtn` | → | `TableActionButton` | kursus/event/review/payout admin, trainer |
| TableContainer inline | → | `TableContainer` (kit) | kursus/pengguna/transaksi/leads admin, trainer |
| Pill `style={{}}` inline | → | `Badge` | leads/lms/kupon/pengguna/transaksi admin |
| Tabs hand‑roll (2–3 gaya) | → | `Tabs` | user profil/afiliasi, admin leads/lms |
| Spinner/empty/error ad‑hoc | → | `DashboardState` + `EmptyState` + `Skeleton` | semua |
| ProgressBar hand‑roll | → | `ProgressBar` (kit) | user home/kursus, trainer course |
| Quick‑action tile inline | → | `QuickActionCard` | user home, admin dashboard |
| `alert()/confirm()` | → | `Modal` | admin & trainer mutasi |
| Shell hex literal | → | token (`--surface-*`/`--brand-*`) | 3 `layout.tsx` |

**Estimasi total:** ~55 langkah · Fase 0 (blocker) → Fase 1–4 (paralel per file) → Fase 5–7 (sweep) → Fase 8 (validasi). Kompleksitas agregat **L** (lintas ~35 file UI + 8 komponen kit baru/diadopsi), tetapi **presentation‑only** & bertahap dengan commit atomik per fase.

## Definisi Done (global, SSOT §A.6 + kontrak §0)
- [ ] Ketiga dashboard mematuhi Kontrak Desain §0 (grid 12‑col, 1600px, padding 32/24/16, gap 24/20, spacing 8‑step, radius card 20/btn 12).
- [ ] Semua pola memakai komponen kit kanon (nol duplikasi inline yang terdaftar di roadmap).
- [ ] `tsc --noEmit` 0 error · ESLint `--max-warnings 0` · `lint:spacing` bersih · build web hijau.
- [ ] E2E 3 dashboard hijau; nol hydration/console/key warning.
- [ ] A11y ≥ target (AA), keyboard‑navigable.
- [ ] Nol perubahan logic/API/DB/auth/routing/permission (self‑review diff bersih).
- [ ] `docs/dashboard-standardization-final-report.md` ditulis; BACKLOG diperbarui.
- [ ] PR dibuka, menunggu konfirmasi reviewer (tidak auto‑merge/deploy).
