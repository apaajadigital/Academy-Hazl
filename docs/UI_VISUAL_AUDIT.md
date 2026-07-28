# UI Visual Audit — Admin Panel (Enterprise Polish)

> **Tanggal:** 28 Jul 2026 · **Scope:** visual polishing Admin Panel ke standar Enterprise SaaS (Stripe/Linear/Vercel/Notion). **Hanya visual** — tanpa perubahan struktur/layout/flow/logic/API/routing/fitur (mengikuti ABSOLUTE RULES). · **Metode:** audit kode langsung atas UI kit (`components/ui/*`), design token (`globals.css`), dan shell admin (`app/admin/layout.tsx`).

## Konteks penting (baseline)
Admin Panel **sudah** distandarkan pada PR #17 (satu design system, 12‑col grid, token kontrak). Jadi audit ini **bukan** menemukan panel yang berantakan, melainkan **design‑debt refinement** untuk menaikkan dari "konsisten & rapi" → "premium enterprise". Titik ungkit utama = **UI kit + token** (memoles sekali → merambat ke semua halaman admin secara konsisten).

Strategi: perbaiki di **level komponen kit & token**, bukan menambal per‑halaman → menjamin "satu design language" dan mengurangi duplikasi (sesuai brief: reusable component + design token).

---

## 1. Design‑debt yang ditemukan (inkonsistensi nyata)

| # | Masalah | Lokasi | Dampak visual |
|---|---|---|---|
| **D1** | **Radius kartu tidak koheren** — `Card` & `TableContainer` pakai `--radius-lg` (16px), sedangkan `StatCard`, `QuickActionCard`, `FilterBar`, `DashboardError` pakai `--radius-card` (20px). | `Card.tsx`, `Table.tsx` | Kartu dan tabel terlihat "sedikit beda sudut" dari kartu KPI di halaman yang sama — merusak kesan satu sistem. |
| **D2** | **Radius kontrol tidak sinkron** — `Pagination` pakai `rounded-lg` (16px) hardcoded; kontrol lain (input/select/tombol aksi tabel) 12px (`--radius-md`). | `Pagination.tsx` | Tombol pagination "lebih bulat" dari kontrol di sekitarnya. |
| **D3** | **Angka KPI belum tabular** — nilai `StatCard` memakai proportional figures → digit "1/7" ber‑lebar beda, angka tidak rata antar kartu. | `StatCard.tsx` | Baris KPI terlihat kurang presisi (Stripe/Linear selalu `tabular-nums`). |
| **D4** | **Focus tombol generik** — `Button` mengandalkan outline `:focus-visible` global (`outline 2px, offset 3px`), bukan ring brand yang halus. Offset 3px agak lebar untuk kontrol padat. | `Button.tsx`, `globals.css` | Fokus keyboard terasa "default browser", bukan premium/branded. |
| **D5** | **Optical typography angka** — nilai KPI besar tanpa negative letter‑spacing → sedikit "melar" di ukuran besar. | `StatCard.tsx` | Angka besar kurang "tight/solid". |
| **D6** | **Transition tidak seragam durasinya** — beberapa memakai `transition-colors` cepat, kartu memakai `--transition-base` (250ms); tidak ada satu skala micro‑interaction. | lintas kit | Hover terasa sedikit tak selaras. |

## 2. Audit per komponen (kondisi & rekomendasi)

- **Button** — base `.btn` (pill), sizes `sm/md/lg` (`px-5/7/9`), `active:scale-[0.98]`, loading spinner, disabled 50%. **Baik**. Rekomendasi: focus‑ring brand (D4); pertahankan bahasa pill (konsisten all‑pill; catatan: jika ingin lebih "Linear/Stripe", pill→12px adalah keputusan design app‑wide terpisah — tidak diambil di pass ini agar identitas tombol marketing publik tak berubah tak sengaja).
- **Input / Select / Textarea** — `px-4 py-2.5`, radius 12px, `focus:ring-2 ring-accent-cyan-strong/20` + border cyan, ikon `left-3.5`+`pl-11`, disabled jelas. **Sudah premium & konsisten.** Rekomendasi: naikkan opasitas ring fokus tipis (20%→25%) untuk visibilitas; sisanya pertahankan.
- **Card** — padding 24px (`p-6`/header `px-6 py-5`), border hairline, `shadow-e1`, hover lift opsional. **Baik**, kecuali radius (D1).
- **Table** — `TH px-6 py-3` uppercase muted; `TD px-6 py-4` (row nyaman 16px); hover `surface-page`; `THead` sunken. **Baik** (pola Linear/GitHub), kecuali radius container (D1). Row height & padding sudah nyaman.
- **Badge** — pill `px-2.5 py-0.5`, `text-xs`, `leading-5`, 6 varian semantik + dot. **Konsisten & rapi.** Tidak diubah.
- **StatCard** — icon tile + value + label + trend pill opsional. Nilai = fokus, label = secondary ✓. Kurang: tabular‑nums + optical (D3/D5).
- **Pagination** — arrow/page `h-9 w-9`, radius `lg` (D2), active cyan solid. Rekomendasi: radius 12px + shadow tipis di halaman aktif.
- **Tabs** — segmented pill di `surface-sunken`, active `bg-accent-cyan-strong text-white shadow-e1`, keyboard roving ✓. **Premium.** Tidak diubah.
- **Avatar** — 4 ukuran, image→initials→glyph. **Baik.** Tidak diubah.
- **Shell admin** (`app/admin/layout.tsx`) — token‑driven (pasca PR #17), sidebar active rail, mobile drawer, breadcrumb ramah. **Baik.** Polish ringan: durasi transition seragam, offset focus.

## 3. White space, hierarchy, balance
- **White space:** padding card 24px, gap grid 24/20, section gap 32px — **napas cukup** setelah PR #17. Tidak ditemukan elemen sesak/terlalu jauh yang signifikan di kit.
- **Hierarchy:** H1 (`text-2xl extrabold`) → StatCard value (fokus) → section H2 (`text-lg bold`) → body/secondary muted. **Urutan baca sudah benar**; penguatan angka KPI (D3/D5) mempertegas fokus.
- **Balance:** proporsi tombol/badge/card sudah proporsional pasca‑standardisasi. Tidak ada tombol "gepeng"/badge "terlalu tinggi" di kit.

## 4. Prioritas perbaikan
- **High (koherensi design system):** D1 (radius kartu 16→20), D2 (pagination 12px), D3 (tabular‑nums).
- **Medium (premium feel):** D4 (focus‑ring brand tombol), D5 (optical tracking angka), D6 (skala transition seragam ~200ms).
- **Low (opsional):** ring fokus input 20%→25%; offset focus global 3px→2px.

## 5. Design token — status
Token sudah lengkap (color, surface, text, border, radius `sm/md/lg/xl/card/full`, shadow `e1–e4`, transition `fast/base/slow`, motion easing). **Kekurangan kecil:** belum ada alias eksplisit untuk **focus‑ring** yang dipakai konsisten. → tambah pemakaian `--shadow-focus-cyan` sebagai ring fokus branded pada tombol.

## 6. Batasan (dijaga)
- Tanpa perubahan struktur/posisi (sidebar/navbar/card/button/table/search/filter tetap di tempatnya), flow, logic, API, routing, atau fitur.
- Perubahan kit merambat ke semua dashboard (User/Admin/Trainer) — **disengaja** demi "satu design system"; efek ke halaman publik dijaga minimal (radius kartu/pagination/tabular‑nums tidak dipakai identitas marketing; focus‑ring = perbaikan universal yang aman).

*Lanjut: implementasi → `docs/UI_IMPLEMENTATION_REPORT.md`.*
