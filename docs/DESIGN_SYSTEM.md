# Jago Akademi — Design System (v1, Jul 2026)

> Bahasa desain untuk `apps/web`. Referensi arah: **Udacity DNA** (editorial, premium, outcome-driven) diterapkan pada **light theme Jago** + token brand cyan/pink. Satu sumber gaya: token di `app/globals.css`; komponen di `components/ui/*` + `components/shared/MediaPlaceholder.tsx`.

## 1. Prinsip

1. **Data jujur.** Angka/testimoni/logo hanya dari data real & ber-consent. Tidak ada → **omit section** atau `EmptyState`. (`StatBlock`/`TestimonialCard` membawa aturan ini di JSDoc-nya.)
2. **Media jujur.** Semua slot foto/video = `MediaPlaceholder` (✕ + label "VIDEO/FOTO", aspect-ratio terkunci → zero layout shift). Tidak ada stock/AI imagery.
3. **Satu aksen per heading.** Heading = ink solid (`--text-primary`), aksen **satu kata** via `.text-accent` (cyan-strong). ~~Gradient kata-per-kata~~ dilarang; `.text-gradient-*` = deprecated.
4. **Eyebrow, bukan pill.** Label section = `.eyebrow` (uppercase 12px + garis pendek), bukan badge-pill + emoji.
5. **Ritme variatif.** Header section default **left-aligned** dengan `action` kanan; center = pengecualian. Komposisi bergantian: asimetris / grid / split / dark band (`Section tone="ink"`).
6. **Ikon = lucide** konsisten (stroke 1.75), bukan emoji.
7. **Motion bermakna:** `Reveal` (fade + rise 16px, sekali, ease-out-expo), hormati `prefers-reduced-motion`.

## 2. Token (di `globals.css :root`)

| Kelompok | Token kunci |
|---|---|
| Brand | `--brand-cyan #00d4ff` (fill), `--brand-cyan-strong #0077A8` (teks di putih, 4.67:1), `--brand-pink #ff0066`, `--brand-pink-strong #CC0052` (4.84:1) |
| Surface | `--surface-page #F5F5F7`, `--surface-card #FFF`, `--surface-sunken #FAFAFA`, `--surface-accent-soft`, `--surface-pink-soft` |
| Text | `--text-primary #1D1D1F` (ink), `--text-secondary #636366`, `--text-muted #6E6E73`, `--text-on-accent #001318` |
| Border | `--border-default #E5E5E5`, `--border-subtle`, `--border-strong`, `--border-focus #0077A8` |
| Elevation | `--shadow-e0..e4` + `--shadow-focus-cyan` |
| Radius | `--radius-sm .5rem` → `--radius-xl 1.5rem`, `--radius-full` |
| Rhythm | 8pt grid; `--section-py 6rem` / `--section-py-sm 4rem`; container 1200px (`.container-pad`) |
| Motion | `--transition-fast/base/slow`, `--ease-out-expo` |
| Font | `--font-display` Plus Jakarta Sans (heading/btn), `--font-body` Inter |

**Peran warna:** cyan = aksi & aksen utama; pink = highlight hemat (badge/pilar kedua); ink = teks & band gelap. Tidak ada warna ketiga.

## 3. Kelas CSS inti

| Kelas | Peran |
|---|---|
| `.eyebrow` / `.eyebrow-center` | Label section editorial (garis + uppercase) |
| `.text-accent` / `.text-accent-pink` | Aksen 1 kata pada heading |
| `.link-arrow` | Link editorial "Lihat semua →" (gap melebar saat hover) |
| `.card` (alias `.card-dark`) | Kartu kanonik: putih, border, radius-lg, e1→hover e2 + lift 2px |
| `.btn` + `.btn-primary/-accent/-outline/-ghost` + `-sm/-lg/-xl` | Tombol (radius full, display font) |
| `.badge` + `-cyan/-pink/-neutral` | Chip status kecil (untuk label data, bukan header section) |
| `.section` / `.section-sm` / `.container-pad` | Ritme vertikal + container |
| `.input-dark` | Input (border-strong, fokus ring cyan) |
| `.stat-number` | Angka besar display (hanya data real) |
| `.skeleton` | Loading shimmer |

## 4. Komponen (`components/ui/*`)

| Komponen | Props inti | Catatan |
|---|---|---|
| `Section` | `tone: default\|sunken\|ink`, `size` | `ink` = band gelap editorial |
| `SectionHeader` | `eyebrow, title, lede, align, action, onInk` | Default left + action kanan |
| `Reveal` | `delay, y` | Wrapper motion; client |
| `ProgramCard` | `href, title, description, unitLabel, unitIcon, meta{rating,level,duration,count}, media` | Kartu program ala Udacity; meta falsy → tak dirender |
| `CategoryCard` | `href, icon, name, description, note, accent` | Tile "Jelajahi bidang" |
| `EmptyState` | `icon, title, description, action` | Jawaban elegan saat data kosong |
| `StatBlock` | `value, label, hint, onInk` | ⚠️ hanya angka real |
| `TestimonialCard` | `quote, name, role, company, photo` | ⚠️ hanya orang real + consent (BL-24) |
| `MediaPlaceholder` (`components/shared/`) | `type: video\|foto, ratio, label, showRatio` | Rasio: video 16:9, foto 1:1; banner 21:9 |

## 5. Type scale (disiplin)

Display (Plus Jakarta Sans, tracking-tight): H1 hero `text-4xl→6xl`, H2 section `text-3xl→4xl`, H3 card `text-base/lg` bold. Body (Inter): lede `text-lg`, body `text-[15px]/base`, meta `text-xs/[13px]`, eyebrow/chip `text-[11-12px] uppercase tracking-wide`. Maks 2 font — tidak ada pengecualian.

## 6. A11y baseline

Kontras teks AA (cyan-strong & pink-strong sudah lolos di putih); fokus `:focus-visible` ring cyan global; touch target ≥40px; ikon dekoratif `aria-hidden`; `MediaPlaceholder` ber-`role="img"`+label; reduced-motion mematikan semua animasi.

## 7. Kontrak layout Admin (`components/admin/*`, Ags 2026)

Halaman `/admin/*` memakai empat primitive di `apps/web/components/admin/`. Aturan di bawah bukan preferensi — tiap butir lahir dari cacat yang benar-benar tayang.

### 7.1 Container

`AdminPageContainer` membungkus `.dash-container` (max 1600px = `--container-max`, padding-inline 16 → 24 (≥768) → 32 (≥1280)) dan menambah `flex flex-col gap-6 lg:gap-8`.

- **Jangan** menulis ulang angka padding sebagai utility. Nilainya ada di token; menyalinnya berarti membuat salinan kedua yang akan menyimpang.
- **Jangan** menambah `py-*`. Padding vertikal sudah diberi `.al-content` (32px, 24px ≤768px); menambah lagi berarti dobel.
- **Jangan pernah** menambahkan reset `* { padding: 0 }` di halaman atau layout Admin. styled-jsx menyuntikkannya *unlayered*, dan aturan unlayered mengalahkan seluruh cascade layer Tailwind berapa pun specificity-nya. Ini pernah terjadi: `p-6` menghitung jadi `0px` dan `.dash-container` kehilangan seluruh padding-nya **di setiap halaman Admin** sampai Ags 2026.

### 7.2 Grid

| Bagian | Kelas |
|---|---|
| KPI | `AdminMetricGrid` → `grid-cols-1 sm:grid-cols-2 xl:grid-cols-4`, gap 16 → 24 |
| KPI 6 kartu | `<AdminMetricGrid className="xl:grid-cols-3">` — `cn()` memakai tailwind-merge, jadi override bersih |
| Panel utama 2:1 | `min-[1440px]:grid-cols-[minmax(0,2fr)_minmax(320px,1fr)]` |
| Akses cepat | `grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5` |

**Kenapa 1440, bukan `2xl`/1536.** Diukur, bukan dipilih berdasarkan selera — lebar konten setelah sidebar 240px dan padding, lalu kedua track setelah gap 24px:

```
1280px → 976px  → 635 / 317   rail di bawah lantai 320px: tidak aman
1360px → 1056px → 688 / 344   tabel di bawah ~700px yang dibutuhkan
1440px → 1136px → 741 / 371   keduanya nyaman        ← ambang
1536px → 1232px → 805 / 403
```

Menunggu 1536 menyisakan 1136px lebar untuk satu tabel yang hanya butuh ~740, dan membuat halaman setinggi 2243px alih-alih 1603. Di 1280 rail memang tidak muat, jadi menumpuk — itu jawaban benar, bukan kompromi.

Jangan mengubah ambang ini tanpa mengukur ulang keempat angka di atas.

### 7.3 Panel

`AdminPanel` = header (ikon opsional + judul + deskripsi + slot aksi) → garis tipis → body.

- `min-w-0` wajib dan sudah built-in: sebagai anak grid, tabel lebar atau judul tanpa spasi akan menetapkan lebar minimum track dan mendorong halaman ke scroll horizontal.
- `bodyClassName="p-6"` untuk konten prosa; kosongkan untuk tabel yang menempel tepi.
- `iconClassName` menjaga warna aksen per-panel.
- Heading `h2` secara default; pakai `as="h3"` bila bersarang.

### 7.4 `overflow-x-auto`

Hanya boleh membungkus `<table>`. Test menegakkan ini: setiap scroll container horizontal yang tidak memuat tabel akan menggagalkan build. Untuk data non-tabel, ubah bentuknya (list, kartu) — jangan menggeser masalahnya ke scrollbar.

### 7.5 Loading / empty / error / partial failure

| State | Aturan |
|---|---|
| loading | Skeleton **dalam bentuk final**, bukan spinner terpusat. Spinner `min-h-[40vh]` dulu menggeser halaman 405px saat data tiba |
| data | — |
| empty | `EmptyState` — pernyataan tentang **data** |
| error | `AdminPanelError` — pernyataan tentang **request**. Wajib beda tampilan dari empty |
| partial failure | Satu endpoint gagal hanya boleh merugikan satu panel. Pakai `Promise.allSettled`, jangan `Promise.all` |
| retry | Hanya memuat ulang panel terkait. Pakai penghitung request per-panel agar respons lama tidak menimpa yang baru |

**Angka `0` hanya boleh berarti nilai sah dari API.** Field yang hilang → error, bukan `Rp 0`. "Rp 0" adalah pernyataan tentang bisnis; kita tidak berhak membuatnya karena sebuah field absen.

### 7.6 Target sentuh & truncation

- Aksi utama ≥ 44px tinggi. Tautan teks di header panel: `-my-2 … py-2` memperbesar area klik tanpa menambah tinggi header.
- Setiap `truncate` wajib punya `title` berisi nilai penuh.
- Angka memakai `tabular-nums` agar digit sejajar antar-baris.

### 7.7 Checklist route Admin baru

- [ ] `AdminPageContainer` sebagai pembungkus terluar
- [ ] Tidak ada reset `*` atau angka padding acak
- [ ] KPI memakai `AdminMetricGrid`, panel memakai `AdminPanel`
- [ ] Tepat satu `<h1>`, tanpa lompatan level heading
- [ ] Empat state ditangani dan **error ≠ empty**
- [ ] `overflow-x-auto` hanya pada tabel
- [ ] Semua `truncate` punya `title`
- [ ] Diperiksa pada 390 / 768 / 1024 / 1280 / 1440 / 1920
- [ ] `e2e/admin-dashboard-layout.spec.ts` hijau — ia mengukur clipping oleh ancestor `overflow:hidden`, sesuatu yang `scrollWidth` tidak bisa lihat
