# Mentor Navigation (Opsi A) — Report

> **Tanggal:** 28 Jul 2026 · **Branch:** `feat/mentor-navigation` (dari `main`) · **Metode:** implementasi + Explore agent verifikasi. · **Validasi:** build hijau (setelah 2× race OneDrive) + tsc + ESLint 0 + grep fungsional + agent independen. · ⚠️ **SUDAH DI-MERGE ke `main`** (`12a9554`, dikonfirmasi 29 Jul 2026 — `Navbar.tsx:27`, `Footer.tsx:10`, `sitemap.ts:106`). Klaim "belum di-merge" di versi awal dokumen ini **salah**; rutenya live dan diindeks sitemap. **Peringatan konten §5 karena itu bukan lagi pra-syarat, melainkan masalah produksi aktif** — lihat **BL-114**.

## 1. Ringkasan
Membuat rute **`/mentor`** (yang sebelumnya **orphan** — tak terjangkau dari mana pun) **terjangkau** via Navbar + Footer, dan **diindeks** via sitemap. Presentation/link only — tanpa ubah logic/API/DB/routing/fitur. **Peringatan konten (BL‑24) di §5 — WAJIB dibaca sebelum deploy.**

## 2. Tabel perbaikan (temuan → aksi → status)

| # | Temuan | Aksi | File:line | Status |
|---|---|---|---|---|
| **M1** | `/mentor` tak ada di Navbar (tak terjangkau) | Tambah item top‑level "Mentor" (setelah E‑Course, selalu tampil) | `components/layout/Navbar.tsx:27` | ✅ Fixed |
| **M2** | `/mentor` tak ada di Footer | Tambah "Mentor" di grup **Belajar** | `components/layout/Footer.tsx:10` | ✅ Fixed |
| **M3** | `/mentor` & detailnya tak ada di sitemap (tak terindeks SEO) | Emit `/mentor` (static) + `/mentor/[slug]` untuk 7 mentor (dari data statik) | `app/sitemap.ts:9, 103‑108, 112` | ✅ Fixed |

## 3. Tabel pengecekan (2×)

| Cek | Ke‑1 | Ke‑2 | Hasil |
|---|---|---|---|
| `tsc --noEmit` | ✅ 0 error | — | Lolos |
| ESLint `--max-warnings 0` | ✅ 0 warning | — | Lolos |
| `next build` | ✅ (sukses percobaan ke‑3; 2 gagal = race OneDrive pada `.next`, bukan kode) | — | Lolos |
| Grep: Navbar/Footer punya `/mentor` | — | ✅ Navbar:27, Footer:10 | Lolos |
| Grep: sitemap emit `/mentor` + `MENTOR_PAGES` | — | ✅ :9, :103, :112 | Lolos |
| **Agent independen — rantai reachability** | — | ✅ link → `/mentor` listing → kartu → `/mentor/[slug]` (SSG, 7 halaman, `notFound` utk slug tak dikenal) | Lolos |
| Regresi (struktur nav, duplikat) | — | ✅ tak ada duplikat, nav array valid, bukan dropdown | Lolos |

**Rantai reachability (terverifikasi):**
```
Navbar:27 / Footer:10  ──►  /mentor (listing, mentor/page.tsx)
                              └─ kartu (mentor/page.tsx:111) ──► /mentor/[slug]
                                   (SSG via generateStaticParams — 7 slug; notFound utk slug asing)
sitemap.xml: /mentor (0.8) + /mentor/{slug} ×7 (0.6)
```

## 4. File diubah (3 + doc)
- `components/layout/Navbar.tsx` — item "Mentor"
- `components/layout/Footer.tsx` — item "Mentor" (grup Belajar)
- `app/sitemap.ts` — `/mentor` + `MENTOR_PAGES` (7 slug dari `lib/e-course/utils` → `data.ts`)

## 5. ⚠️ PERINGATAN KONTEN — WAJIB sebelum deploy (BL‑24)

Agent verifikasi mengonfirmasi **data 7 mentor = placeholder/fiktif** (`lib/e-course/data.ts:1407‑1514`):
- Nama generik + **dipasangkan dengan perusahaan NYATA** (Tokopedia, Gojek, BCA, Deloitte, Shopee, Bukalapak, Traveloka).
- Statistik vanity dibulatkan (mis. `totalStudents: "89.2K"`).
- **Semua `linkedinUrl` = `"https://linkedin.com"`** (placeholder telanjang, bukan profil asli) → indikator kuat data demo.

**Risiko:** Opsi A kini **mengekspos + mengiklankan (sitemap)** nama individu yang dikaitkan dengan perusahaan nyata ke publik/SEO. Jika ini orang nyata tanpa consent → risiko **PDP/defamasi**; jika fiktif → nama perusahaan nyata bisa menyiratkan **endorsement palsu**. Ini persis kategori **BL‑24 (Blocker)** di `docs/BACKLOG.md`.

**Rekomendasi (pilih sebelum deploy):**
- **(disarankan)** Ganti 7 entri mentor dengan **profil mentor REAL yang berizin** (nama, perusahaan, LinkedIn asli, stat real) SEBELUM merge/deploy — kode navigasi ini sudah siap begitu datanya benar.
- **atau** Tunda deploy PR ini sampai data mentor real siap (kode tetap benar, tinggal ganti data).
- **atau** (jika ingin tetap deploy sekarang) sadari & terima risiko BL‑24 secara eksplisit.

> Kode navigasi = **selesai & benar**. Yang tersisa = **keputusan konten** (data mentor real), murni milik Anda sebagai pemilik.

## 6. Langkah deploy VPS (setelah merge — frontend‑only, tanpa migration)
```bash
ssh <user>@<ip-vps>
cd /var/www/jago-akademi
git pull --ff-only origin main
docker compose -f docker-compose.vps.yml build --no-cache web
docker compose -f docker-compose.vps.yml up -d --force-recreate web
# verifikasi:
docker port jago-akademi-web-1                       # 3010
curl -sI https://jagoakademi.com | head -1           # 200
curl -s https://jagoakademi.com/sitemap.xml | grep -c "/mentor"   # ≥ 8 (1 listing + 7 detail)
```
Lalu cek: Navbar & Footer punya "Mentor" → klik → `/mentor` tampil → klik kartu → `/mentor/<slug>`.
**⛔ Ingat:** `docker-compose.vps.yml` (bukan prod.yml), tanpa `--remove-orphans`, `--no-cache` wajib.

## 7. Governance
- Presentation/link only; tanpa ubah backend/API/DB/routing/fitur.
- Via branch/PR; tidak merge/deploy tanpa konfirmasi. **Konten mentor (BL‑24) = keputusan reviewer.**
- Catatan: perubahan asing di working tree (`apps/api` orders/webhook, `*/layout.tsx` logout revoke, `EVENT_REMEDIATION_PLAN.md`) dari sesi/device paralel **dikecualikan** dari commit ini.
