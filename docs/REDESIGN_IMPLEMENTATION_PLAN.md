# REDESIGN IMPLEMENTATION PLAN — Jago Akademi

> Rencana eksekusi mandiri (multi-agent) untuk mengimplementasikan 20 desain Google Stitch ke website tanpa mengubah fitur.
> Disusun 24 Jul 2026 dari analisis mendalam: (1) 20 output Stitch, (2) arsitektur styling kode. Lanjutan dari `REDESIGN_BRIEF.md` + `REDESIGN_TOKENS_AND_PROMPTS.md`.
> **Kontrak mutlak: presentation-only** — hanya JSX + CSS/className yang berubah. Data, fetch, hooks, handler, auth guard, feature flag, routing, tenant-scoping TIDAK disentuh.

---

## 0. Keputusan Reviewer (24 Jul 2026)

1. **Dark mode:** LIGHT-ONLY — strip semua `dark:` dari Stitch. Dark mode ditunda.
2. **Shell login:** SATUKAN ke sidebar TERANG untuk admin + member + trainer (ganti navy gelap).
3. **Isi gap:** reviewer akan **menyuplai desain Stitch tambahan** untuk halaman gap (§6). Implementasi gap MENUNGGU desain itu; Wave 0 + template yang sudah ada tetap jalan. (Navigasi mobile = perilaku shell, dibangun di W0.3 mengikuti desain navbar desktop.)
4. **Cadence:** WAVE-DEMI-WAVE — tiap wave diverifikasi (E2E+build+CI) lalu checkpoint ke reviewer sebelum lanjut.

---

## 1. Keputusan Arsitektur Inti

**Kabar baik:** Tailwind v4 **sudah aktif penuh** di proyek (`@import "tailwindcss"` + `@config tailwind-legacy.config.ts` + `@theme inline` + plugin typography). Utility Tailwind sudah jalan di produksi hari ini. Sudah ada **token lengkap** di `globals.css` (`--brand-cyan-strong #0077A8`, surface, text, border, shadow e0–e4, radius, motion) + **layer komponen** (`.btn*`, `.badge*`, `.card*`, `.section`, `.container-pad`). Desain Stitch (Tailwind) karena itu **diadopsi, bukan diterjemahkan dari nol**.

**Tantangan:** situs terbagi **dua dunia**:
| Dunia | Halaman | Cara styling | Port |
|---|---|---|---|
| **Tailwind** (67 hal.) | `(public)/*`, `(auth)/*`, `trainer-hub/*`, `lms/*` | Tailwind utility + primitives + token | 🟢 Rendah/mekanis |
| **styled-jsx** (21 hal.) | `admin/*` + `dashboard/*` + 2 shell | `<style jsx>` bespoke, hex hardcoded, **sidebar navy gelap** | 🟠 Sedang–tinggi |

**Strategi = HYBRID (dipisah per dunia), bukan satu strategi global:**
- **Dunia Tailwind:** adopsi utility Stitch langsung; pakai ulang primitive yang sudah ada (`.btn`, `.card`, `Section`, `EmptyState`), remap token warna Stitch → token app (arbitrary hex `text-[#0077A8]` sudah idiomatik di kode).
- **Dunia styled-jsx:** pass-1 aman = **restyle nilai di dalam `<style jsx>`** ke token Stitch tanpa menyentuh JSX/logic (delta terkecil, presentation-only murni). Pass-2 (cleanup opsional) = ganti ke utility Tailwind. Perubahan visual terbesar ada di sini: **sidebar navy gelap → terang** ala Stitch.

---

## 2. Fondasi (Wave 0) — WAJIB pertama, sebelum halaman apa pun

Semua reskin bergantung pada fondasi ini. Dikerjakan lebih dulu, di-review, baru wave halaman jalan.

**W0.1 — Rekonsiliasi token.** Tambah token yang belum ada ke `globals.css`/`tailwind-legacy.config.ts`:
- `--brand-gradient: linear-gradient(100deg,#0077A8,#7C3AED,#CC0052)` (stop ungu `#7C3AED` belum jadi token — kini jadi 1 sumber).
- Kelas util `.bg-brand-gradient` + `.glass-card` (dipakai 93× & di hero/form Stitch) → pindah ke `@layer components` (sekali, bukan di-inline tiap file).
- **Tabel remap token MD3 Stitch → token app** (Stitch pakai `surface-container-*`, `on-primary`, `primary-container`, dll. yang TIDAK ada di app). Buat kamus: `surface-page→--surface-page`, `primary-container→#0077A8`, `secondary→#7C3AED`, dst. Referensi porting.

**W0.2 — Kit komponen.** App belum punya `Button/Input/Modal/Table/Badge/Tabs/Select` sebagai komponen (hanya kelas global `.btn`/`.badge` + markup bespoke). Radix (`dialog`, `dropdown-menu`, `accordion`, `navigation-menu`) + CVA + `cn()` **sudah terpasang tapi nyaris tak dipakai**. Bangun kit resmi di `components/ui/` (CVA-based): `Button`, `Input`, `Select`, `Textarea`, `Badge`, `Card`, `Modal` (Radix Dialog), `Table`, `Tabs` (Radix), `Pagination`, `Skeleton`, `Avatar`. Semua pakai token W0.1. Ini yang dipakai ulang di semua wave → konsistensi otomatis.

**W0.3 — Keputusan shell terpadu.** Stitch punya **3 paradigma** (admin top-nav, member/B2B sidebar, trainer hibrid) + navbar publik yang drift (tag/class/link/CTA/logo beda antar halaman) + **tidak ada navigasi mobile sama sekali**. Tetapkan:
- 1 **navbar publik kanonik** (S1) + footer (S2) → satukan `components/layout/Navbar.tsx` & `Footer.tsx` (sudah ada, tinggal reskin) + **tambah hamburger/drawer mobile** (gap wajib).
- 1 **app-shell login** (sidebar terang) dipakai member + admin + trainer → ganti sidebar navy gelap di `admin/layout.tsx` & `dashboard/layout.tsx`.
- 1 lockup logo + 1 theme-toggle (lihat keputusan dark mode §7).

**W0.4 — Peta ikon.** Material Symbols (Stitch, 302 instance) → lucide-react (standar app, 55 file). Buat tabel padanan glyph→komponen lucide; hapus `<link>` Material Symbols + CSS `.material-symbols-outlined`. Hapus juga `<link>` Google Fonts Stitch (next/font sudah sediakan Jakarta+Inter).

---

## 3. Aturan Terjemah v3 → v4 (checklist tiap port)

Output Stitch = Tailwind **v3 CDN**; app = **v4**. Setiap kali porting satu desain:
- [ ] **Buang** `<script src="cdn.tailwindcss.com">`, `tailwind.config` inline, `<link>` Google Fonts & Material Symbols, `<html class="light">`.
- [ ] **Strip semua `dark:`** class + aturan `.dark .glass-card` (app light-only — lihat §7).
- [ ] **Rename utility v4:** `shadow-sm→shadow-xs`, `shadow→shadow-sm`, `rounded→rounded-sm`, `outline-none→outline-hidden`, `bg-opacity-x`/`text-opacity-x`→ slash (`bg-black/50`); border default kini `currentColor` (set eksplisit); `ring` default kini 1px currentColor.
- [ ] **Token MD3 Stitch → token app** (kamus W0.1) — jangan tempel `bg-primary-container` mentah (tak resolve).
- [ ] **Form:** `@tailwindcss/forms` TIDAK terpasang → ganti `form-input/form-select` dengan komponen `Input/Select` (W0.2) atau util manual.
- [ ] **Ikon:** Material Symbols → lucide (W0.4).
- [ ] **Buang artefak Stitch inert:** `docked`, `full-width`, kelas no-op lain.
- [ ] Perbaiki bug render `katalog_berjenjang` (hero overlap) saat porting.

---

## 4. Kontrak Presentation-Only (terbukti bersih)

Boundary sudah diverifikasi bersih di seluruh app (contoh `admin/pengguna`: baris 1–102 logic, 104–307 presentation). Saat port:
- **BOLEH ubah:** struktur JSX, className, blok `<style jsx>`, komponen presentational.
- **TIDAK BOLEH ubah:** `fetch`/endpoint, `useState`/`useEffect`, handler, `getValidToken`/auth, guard di `*/layout.tsx` (`initAuth`, role enforcement), feature flag (`@/lib/features`), routing, tenant-scoping, teks yang diuji E2E (kecuali diselaraskan bersama test-nya).

**Jaring pengaman:** 458 test API + **120 test E2E Playwright** mengunci perilaku & teks — reskin yang merusak fitur → test merah. **24 visual baseline** di-regenerate per halaman (memang berubah karena tampilan baru). Tiap template = 1 branch/PR, jalankan E2E terkait + regen baseline + `npm run build` sebelum merge.

---

## 5. Gelombang Eksekusi (multi-agent otonom)

Tiap template = 1 agent, 1 branch, port presentation-only, swap ikon, strip dark:, terjemah v3→v4, jalankan E2E terkait, regen baseline, `build`. Fondasi (Wave 0) selesai & di-review dulu.

| Wave | Isi | Desain Stitch | Risiko |
|---|---|---|---|
| **0. Fondasi** | Token, kit komponen, shell terpadu, peta ikon, navbar+footer+mobile | DESIGN.md | 🟢 tapi fondasi |
| **1. Publik + Auth + Commerce** | Homepage, marketing landing (8 hal), katalog (T3/T5), detail (T4), artikel (FAQ/privacy/terms), kontak, auth, checkout, pembayaran | 13 desain | 🟢 dunia Tailwind |
| **2. Member + Learning** | Dashboard member (home/list/profil), detail pesanan, learning player + kuis, verifikasi sertifikat | 5 desain | 🟠 sebagian styled-jsx |
| **3. Admin + Trainer** | Admin dashboard, manajemen data (11 hal tabel), sistem-health, trainer hub | 4 desain | 🟠 navy→terang, styled-jsx |
| **4. LMS B2B** | Portal perusahaan + admin tenant | 1 desain | 🟢 dunia Tailwind |

**Model otonom:** tiap wave dijalankan sebagai batch agent paralel (1 per template/kelompok halaman), file tidak beririsan. Setelah tiap wave: verifikasi penuh (E2E + build + lint) → commit atomik → push → CI → checkpoint ke Anda sebelum wave berikutnya. Estimasi ~4–6 wave, masing-masing beberapa PR.

---

## 6. Gap — Halaman Tanpa Desain Stitch

Perlu diputuskan: **saya desain in-code** (konsisten kit W0.2) **atau Anda buat desain Stitch tambahan**.
- **T1 homepage khusus** (marketing template dipakai ganda — bisa cukup).
- **T12 dashboard member/beranda** (belum ada).
- **T13 "Kelas Saya"** + **daftar transaksi member** + **daftar sertifikat** (hanya detail pesanan yang ada).
- **T19/T20 admin** — hanya 2 dari 4 template (kurang: manajemen kursus/konten & pengaturan; sebagian tercakup pola `manajemen_data_admin`).
- **Auth register + lupa/reset password** (hanya login).
- **Artikel blog** (`blog/*` — nav menautkannya, tak ada desain).
- **Navigasi mobile** (tidak ada di semua desain — wajib dibuat di W0.3).

Rekomendasi: gap kecil (member lists, auth variants, blog, mobile) **saya desain in-code** memakai kit + pola Stitch terdekat (cepat & konsisten). Gap besar/strategis (bila Anda ingin arahan visual khusus) → desain Stitch tambahan.

---

## 7. Keputusan yang Memblokir Eksekusi Otonom

Perlu jawaban Anda sebelum wave jalan:

1. **Dark mode.** Stitch mengirim varian `dark:`; app saat ini **light-only**. Opsi: (a) **strip dark** — pertahankan light-only, tercepat & teraman; (b) **tambah dark mode** penuh (token dark + toggle) — nilai tambah tapi lingkup lebih besar & butuh uji ekstra.
2. **Shell area login.** Admin & dashboard sekarang **sidebar navy gelap**; Stitch terang. Satukan ke **sidebar terang** untuk semua area login (perubahan visual terbesar) — setuju?
3. **Pengisian gap (§6).** Saya desain in-code, atau Anda suplai desain Stitch tambahan?
4. **Cadence.** Jalankan otonom wave-demi-wave dengan checkpoint tiap wave (disarankan), atau sekaligus?

---

## 8. Ringkasan Alur

```
Wave 0 (fondasi: token + kit + shell + ikon + navbar/mobile) → review
  → Wave 1 (publik/auth/commerce, dunia Tailwind, mudah)
  → Wave 2 (member + learning)
  → Wave 3 (admin + trainer, navy→terang, tersulit)
  → Wave 4 (LMS B2B)
Tiap template: presentation-only, swap ikon, strip dark:, v3→v4, E2E hijau, regen baseline, build, PR.
```

Referensi teknis: kamus token & aturan v3→v4 (§3), kontrak (§4), file kunci porting (globals.css, tailwind-legacy.config.ts, layout shells, components/ui, components/layout). Desain sumber: `stitch_task_execution_manager/.../DESIGN.md` + 20 folder `code.html`+`screen.png`.
