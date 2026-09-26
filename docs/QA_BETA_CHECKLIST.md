# QA Beta Checklist — Jago Akademi

> Checklist fungsional beta-test: apa yang dicek, bagaimana verifikasinya, dan status saat ini.
> Alat: `scripts/audit-links.sh` (audit status HTTP live) + Playwright E2E di `apps/web/e2e/` + cek manual.
> Status live terakhir: **21 Jul 2026** — audit-links 30/30 PASS terhadap `https://jagoakademi.com` (gated pages = 404 by design).

## 1. Checklist Umum

| # | Item | Metode verifikasi | Status |
|---|------|-------------------|--------|
| 1 | Semua menu navbar/footer klik-able & mengarah ke halaman benar | `apps/web/e2e/public-sweep.spec.ts` + `scripts/audit-links.sh` | ✅ audit-links 30/30 PASS (21 Jul) |
| 2 | Redirect benar (mis. halaman auth-only → `/masuk`) | `apps/web/e2e/auth-flow.spec.ts` | ✅ E2E hijau di CI |
| 3 | Tidak ada 404/500 di halaman publik | `scripts/audit-links.sh` (23 halaman publik expect 200) | ✅ 30/30 PASS live |
| 4 | Slug tidak valid → 404 (bukan 500/200 kosong) | `scripts/audit-links.sh` (negative checks blog/event) + `public-sweep.spec.ts` | ✅ PASS live |
| 5 | CTA utama berfungsi (Daftar, Beli, Lihat Kelas, dsb.) | `apps/web/e2e/homepage.spec.ts`, `e-course.spec.ts` | ✅ E2E hijau di CI |
| 6 | Data dimuat dari API (listing kursus, event, blog, ebook) | `apps/web/e2e/e-course.spec.ts`, `events-blog.spec.ts` + `/api/health`, `/api/ready` di audit-links | ✅ health/ready 200 live |
| 7 | Form submit (contact, daftar, masuk) — validasi + sukses | `auth-flow.spec.ts` (daftar/masuk); contact form → **manual** (lihat §3) | ⚠️ contact belum diverifikasi di produksi |
| 8 | Responsive (mobile/tablet/desktop) | `apps/web/e2e/responsive.spec.ts` + `visual-baseline.spec.ts` | ✅ E2E hijau di CI |
| 9 | Tanpa console error di halaman publik | `apps/web/e2e/public-sweep.spec.ts` (listener `console.error`) | ⏳ jalankan spec setelah tersedia |
| 10 | Smoke alur kritis (load home → navigasi → detail) | `apps/web/e2e/smoke.spec.ts` | ✅ E2E hijau di CI |

## 2. Matriks Fitur Baru (flag-gated)

Keempat fitur di bawah **404 by design** selama flag OFF — dikonfirmasi live 21 Jul 2026.

| Fitur | Path | Env var audit | Status pra-go-live | Verifikasi pasca-go-live |
|-------|------|---------------|--------------------|--------------------------|
| Private Class | `/kelas-privat` | `EXPECT_PRIVATE_CLASS` | ✅ 404 (flag OFF) | audit-links `=200` + smoke: buka halaman, cek listing paket, klik CTA beli → checkout muncul |
| Komunitas | `/komunitas` | `EXPECT_COMMUNITY` | ✅ 404 (flag OFF) | audit-links `=200` + smoke: halaman termuat, link join/CTA komunitas hidup |
| Alumni | `/alumni` | `EXPECT_ALUMNI` | ✅ 404 (flag OFF) | audit-links `=200` + smoke: daftar alumni/testimoni termuat, tanpa data placeholder |
| Portofolio Member | `/portofolio-member` | `EXPECT_PORTFOLIO` | ✅ 404 (flag OFF) | audit-links `=200` + smoke: grid portofolio termuat, detail item terbuka |

**Langkah go-live per fitur** (urutan wajib):
1. **Konten** — isi konten/data produksi fitur tsb (tanpa data fiktif — aturan EPIC 8).
2. **Flag** — aktifkan feature flag di env produksi.
3. **Rebuild** — rebuild + redeploy web (halaman flag-gated butuh build baru; ikuti `docs/RUNBOOK_DEPLOY.md`).
4. **Verifikasi** — jalankan:
   ```bash
   EXPECT_PRIVATE_CLASS=200 EXPECT_COMMUNITY=200 EXPECT_ALUMNI=200 \
   EXPECT_PORTFOLIO=200 bash scripts/audit-links.sh
   ```
   (set `=200` hanya untuk fitur yang sudah live; sisanya biarkan default 404), lalu E2E `apps/web/e2e/beta-features.spec.ts`, lalu smoke manual singkat sesuai kolom terakhir tabel di atas.

## 3. Item yang Butuh Verifikasi Manual

| # | Item | Cara | Status |
|---|------|------|--------|
| 1 | Submit form contact di produksi | Isi & kirim form `/contact` di jagoakademi.com; pastikan pesan sukses tampil dan notifikasi masuk (email/inbox admin) | ⬜ belum |
| 2 | Pembelian sandbox Private Class end-to-end | Setelah flag ON: pilih paket di `/kelas-privat` → checkout → bayar via DOKU **sandbox** → order settled → akses kelas terbuka (rujuk `docs/INTEGRATION_VERIFICATION.md`) | ⬜ menunggu go-live |
| 3 | Email/WA welcome | Daftar akun baru di produksi; cek email welcome terkirim dan pesan WA masuk (integrasi degrade-safe — kegagalan tidak boleh memblok pendaftaran) | ⬜ belum |

---
*Jalankan ulang `bash scripts/audit-links.sh` setiap selesai deploy; script exit non-zero jika ada mismatch sehingga bisa dipakai di CI/cron.*
