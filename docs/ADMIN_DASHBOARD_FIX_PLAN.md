# Implementation Plan — Perbaikan Dashboard Admin (pasca-redesign)

> Disusun 27 Jul 2026 dari analisis 2 agent (root-cause kit/shell + audit 16 halaman admin). Semua fix **presentation/frontend-only** kecuali dicatat. Jaring pengaman: 120 E2E + build + regen visual baseline (protokol server-bersih ber-flag). Target branch: `fix/admin-dashboard-polish` dari `main` @ 3a1fc4a.

## Ringkasan masalah yang dilaporkan
1. Dashboard admin "berantakan" — bentuk cyan oversized/menimpa teks di tombol "Cari", tab "Semua", dan CTA di hampir semua halaman list.
2. **Tidak ada tombol Logout** di shell admin (kritis).
3. "Rp NaN" di bawah tiap nominal halaman Transaksi.

---

## P0 — Wajib (broken / data salah / fitur wajib hilang)

### P0.1 — "Blob cyan / berantakan": DIAGNOSA DULU, mayoritas = CSS basi di VPS
**Temuan:** UI kit (`Button`/`Input`/`Tabs`) di-compile lewat pipeline Tailwind v4 asli → **CSS bersih**, tidak ada padding ganda / background bocor / pseudo-element. Halaman **publik** render normal di live. Gejala (teks di bawah ikon search, tombol jadi balok cyan) persis pola **utility hilang di bundle** (`pl-11`, `px-5`, `rounded-full` absen tapi `bg-accent-cyan` tetap mewarnai) → **CSS bundle basi/parsial**.
**Aksi:**
1. **Rebuild web `--no-cache` + hard-reload** (hazard BL-35, `RUNBOOK_DEPLOY.md §5.1`). Verifikasi: chunk CSS live memuat `.pl-11`/`.px-5`/`.bg-accent-cyan`. Ini kemungkinan besar menghilangkan seluruh "blob".
2. **Fix kode kecil yang tetap dikerjakan** (latent, bukan penyebab utama):
   - `apps/web/app/globals.css:284` — komentar rusak `\* … */` (harusnya `/* … */`), 1 karakter. Latent trap.
   - Audit shade cyan: pastikan tombol/tab aktif pakai `--brand-cyan-strong` (#0077A8), bukan `--brand-cyan` (#00d4ff terang menyilaukan) bila tampilan terlalu "neon".
   - Search form `flex … gap-2` pakai `align-items: stretch` default → tambah `items-end`/`items-stretch` eksplisit agar tombol "Cari" tak melar bila Input kelak berlabel (`ebook:229`, `kursus:328`, `pengguna:144`, dll).
> Jika setelah rebuild --no-cache blob MASIH ada di local juga → naik jadi bug kode, lanjut audit mendalam kit. (Local dev diyakini bersih; konfirmasi saat eksekusi.)

### P0.2 — Logout hilang di shell admin
`apps/web/app/admin/layout.tsx`: `clearToken` diimpor tapi hanya dipakai di guard; sidebar cuma "Situs Utama", avatar top-bar = `<div>` mati. Fix (cermin `dashboard/layout.tsx:107,207`):
- Impor `LogOut` (lucide), tambah `function logout(){ clearToken(); router.replace("/masuk"); }`.
- Tambah tombol "Keluar" (merah `#DC2626`) di `.al-bottom` di atas "Situs Utama" + CSS `.al-logout-btn` (pola `.al-*` shell, bukan kit).

### P0.3 — "Rp NaN" di Transaksi
`apps/web/app/admin/transaksi/page.tsx` (type L25-34, render L226-231) membaca `order.originalAmount` yang **tidak ada** di schema (`Order` punya `totalAmount`/`discountAmount`/`finalAmount`). Fix presentation-only: ganti field type `originalAmount`→`totalAmount`; render harga-coret hanya bila diskon nyata: `const orig=Number(order.totalAmount), fin=Number(order.finalAmount); Number.isFinite(orig) && orig>fin && (<strike>Rp {orig.toLocaleString("id-ID")}</strike>)`.

### P0.4 — Logout Trainer Hub (gap lebih besar)
`trainer-hub/` **tak punya layout/shell/logout sama sekali**; trainer diarahkan ke sini tanpa cara sign-out. Minimal: tambah aksi "Keluar" di header `trainer-hub/page.tsx` (pola `logout()` yang sama). Opsional (lebih baik): buat `trainer-hub/layout.tsx` shell konsisten dengan admin/member.

---

## P1 — Kejujuran data & konsistensi layout

- **Hapus tren % palsu** di KPI dashboard (`admin/dashboard/page.tsx:123-130`, "+12%/-1%" hardcoded) — melanggar aturan no-data-fiktif (EPIC 8/BL-28). Buang badge tren, atau wire ke delta nyata dari API.
- **Hapus pagination palsu** di "Transaksi Terbaru" (`admin/dashboard/page.tsx:348-357`) — 3 `<span>` mati; cukup link "Semua Pesanan →".
- **Seragamkan toolbar** (search + filter dalam filter-card ber-frame `rounded-lg border bg-surface-card p-4 shadow-e1`) di semua list page — saat ini blog/event/payout tanpa card, review menjejalkan title+2 grup tab dalam 1 baris.
- **Perbaiki header `admin/review`** (L169-205): pisah mode-tabs & status-filter ke baris/kartu sendiri (tabrakan di tablet/mobile).
- **Standardisasi**: 1 komponen `<StatCard>` (kini 5 gaya berbeda), H1 `text-2xl`, dan `max-w-[1200px]` di semua halaman admin (kini campur text-xl/2xl & 900/1100/1200px).

## P2 — Polish / defensif

- Breadcrumb shell: label ramah (bukan "Sistem-health"/"Lms"/UUID tenant mentah), ancestor jadi link (`admin/layout.tsx:189-198`).
- Hapus breadcrumb ganda di `admin/lms/[tenantId]/page.tsx:219-225`.
- Ganti empty-state inline (blog/event/review/portofolio/payout/lms) → komponen `<EmptyState>`.
- Guard `avgRating`: `Number.isFinite(n)?n.toFixed(1):"0.0"` (`dashboard:277`, `kursus:421`).
- `admin/kupon` count dari `meta.total` (kini `coupons.length`, undercount >50).
- `admin/leads`: pakai kit `Input` + `Pagination` (kini native input + tombol custom).
- `admin/blog:106` ikon search dobel (Input leftIcon + button leftIcon) → hapus salah satu.

---

## Urutan eksekusi (agent paralel, file dipisah) + double-check

1. **Batch 1 (P0 kode):** Agent-shell (logout admin + trainer-hub + globals.css:284) ∥ Agent-transaksi (Rp NaN) ∥ Agent-honesty (hapus tren%+pagination palsu dashboard).
2. **Batch 2 (P1 konsistensi):** Agent-toolbar (filter-card + StatCard + H1/width di semua list page) ∥ Agent-review-header.
3. **Batch 3 (P2 polish):** breadcrumb, empty-state, guards, leads/kupon/blog.
4. **Double-check tiap batch:** kill server basi :3004 (by PID) → `rm -rf apps/web/.next` → tsc+lint+build → regen visual baseline (server ber-flag bersih) → 120 E2E → commit.
5. **Deploy:** rebuild web `--no-cache` + `up -d --force-recreate web` (ini yang menuntaskan P0.1 blob di live). Tanpa migration (frontend only).

Semua presentation-only; guard/fetch/flag/tenant-scoping dipertahankan; E2E jadi jaring pengaman.

## Keputusan yang dibutuhkan sebelum eksekusi
1. **Tren % KPI** — hapus saja (tercepat, jujur), atau wire ke data delta nyata (butuh endpoint)?
2. **Trainer Hub logout** — minimal (tombol Keluar di header) atau shell penuh `trainer-hub/layout.tsx`?
3. Jalankan **semua P0+P1+P2** sekaligus, atau **P0 dulu** lalu tinjau?
