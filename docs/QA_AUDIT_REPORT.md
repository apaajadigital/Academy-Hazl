# 🧪 JAGO AKADEMI — QA & WEBSITE AUDIT REPORT (jagoakademi.com)

> **Auditor:** QA Lead / Technical Reviewer (Claude) · **Metode:** Live testing via Claude-in-Chrome (render + interaksi nyata, viewport 1440) + inspeksi kode repo + web-fetch.
> **Tanggal:** 3 Juli 2026 · **Build live:** `main` (EPIC 8 + BL-35 CSS fix ter-deploy).
> **Cakupan uji langsung:** Homepage, /masuk, navigasi, gating fitur, console, jaringan. **Belum diuji dinamis:** Lighthouse terukur, cross-browser (hanya Chromium), pembayaran live, alur E2E ber-login.

---

## 1. Ringkasan Eksekutif

Secara fondasi teknis situs **sehat**: CSS/styling sudah pulih (regresi BL-35 teratasi & live), redesign light-theme diterapkan, gating fitur belum-jadi berfungsi ("SEGERA HADIR"), halaman login bersih & fungsional, dan **tidak ada error JavaScript di console**. Namun ditemukan **satu bug Critical yang menutup nilai first-impression**: **hero homepage tampil nyaris kosong saat load** akibat animasi reveal yang tak ter-trigger di area above-the-fold. Selama bug ini ada, situs **belum layak** untuk peluncuran publik meski infrastruktur & sebagian besar halaman sudah baik.

**Verdict Production Readiness: BELUM SIAP untuk Public Launch. Mendekati siap untuk Soft Launch NON-PAID** setelah 1 bug Critical + seed database beres.

---

## 2. Temuan (severity + root cause + dampak + rekomendasi)

### 🔴 CRITICAL

**C-1 · Hero homepage kosong/ghosted saat load**
- **Bukti:** Setelah load & tunggu 3s, hanya eyebrow "PLATFORM EDUKASI DIGITAL" tampil; judul "Belajar. Berlatih. Berkarier." tersangkut di opacity ±5%; subheadline, CTA, dan visual tidak muncul. Konsisten di beberapa reload. **Tidak ada error console** → bukan crash JS.
- **Root cause:** Elemen hero memakai animasi masuk berbasis viewport (framer-motion `whileInView` / `initial opacity:0`) yang hanya ter-trigger saat elemen *masuk* ke viewport lewat scroll. Karena hero sudah di atas layar sejak load, IntersectionObserver tak pernah fire → elemen macet di state awal (transparan). Bagian mid-page tampil normal karena ter-trigger saat scroll.
- **Dampak:** Setiap pengunjung mendarat di halaman yang terlihat **kosong** → bounce tinggi, kredibilitas & konversi hancur. Ini juga isu **accessibility** (konten tak terpersepsi).
- **Prioritas:** Critical · **Effort:** S (2–4 jam).
- **Rekomendasi:** Untuk konten above-the-fold gunakan animasi **immediate** (`animate` saat mount / `initial={false}`), bukan `whileInView`. Atau set `viewport={{ once: true, amount: 0 }}` + fallback CSS `opacity:1` bila JS/observer gagal. Tambah test regresi: pastikan teks hero `opacity=1` dalam <1s tanpa scroll.

### 🟠 HIGH

**H-1 · Sticky header overlap / legibility saat scroll**
- **Bukti:** Saat scroll, teks kartu produk (E-Course/Event/E-Book) tembus di belakang nav sticky yang semi-transparan → tumpang tindih & sulit dibaca.
- **Root cause:** Background/backdrop header kurang solid (atau `backdrop-blur` tanpa fill memadai) + spacing offset kurang.
- **Dampak:** Kesan "berantakan" & tidak profesional pada elemen yang paling sering dilihat.
- **Prioritas:** High · **Effort:** S.
- **Rekomendasi:** Beri header background solid/opaque (atau blur + fill ≥90%), z-index jelas, dan padding-top konten agar tak tertutup.

**H-2 · Database produksi kosong (seed belum jalan)**
- **Bukti (kode/deploy):** `/api/courses`=0, `/api/categories`=[]; katalog kosong → banyak section jatuh ke empty-state.
- **Dampak:** Situs terasa "belum hidup"; alur belajar/checkout tak bisa diuji end-to-end.
- **Prioritas:** High (blocker Soft Launch) · **Effort:** S.
- **Rekomendasi:** Set `SEED_ADMIN_PASSWORD` kuat (fail-closed, tanpa fallback hardcode) lalu jalankan seed produksi minimal (kategori + beberapa kursus contoh nyata).

### 🟡 MEDIUM

**M-1 · Title tag ganda** — `/masuk` berjudul "Jago Akademi | Jago Akademi" (template metadata dobel). SEO/best-practice. Effort S. Fix: hilangkan title anak yang memicu duplikasi, biarkan template "%s | Jago Akademi" berjalan sekali.

**M-2 · CSP memakai `unsafe-inline`/`unsafe-eval`** (dari next.config) — turunkan risiko XSS dengan nonce-based CSP (BL-16). Effort M.

**M-3 · Konsistensi micro-motion** — beberapa section pakai reveal-on-scroll; setelah C-1 diperbaiki, audit ulang agar seluruh animasi seragam & tak ada elemen "muncul telat".

### 🟢 LOW

**L-1 · Kontras aksen** — tombol cyan terang (#00d4ff) + teks gelap, dan eyebrow abu muda: verifikasi rasio kontras WCAG AA. Effort S.
**L-2 · Dead code repo** — `apps/admin|lms|trainer` (stub) belum dihapus. Effort S.
**L-3 · Deps `apps/web`** masih caret (belum pin exact). Effort S.

---

## 3. Hasil QA per Kategori (Test Cases)

> Status: ✅ Pass · ❌ Fail · ⚠️ Partial/Perlu verifikasi. (Diuji di Chromium/desktop kecuali disebut.)

### 3.1 Functional Testing
| TC | Skenario | Hasil | Catatan |
|----|----------|-------|---------|
| F-01 | Homepage load & render | ❌ Fail | Hero kosong (C-1) |
| F-02 | Navbar links tampil | ✅ Pass | E-Course/Event/Produk/Blog/Tentang/Kolaborasi/Masuk/Mulai |
| F-03 | Redirect `/kursus`→`/e-course` | ✅ Pass | 308 permanen |
| F-04 | Gating fitur belum-jadi | ✅ Pass | ⚠️ **Usang (diperbarui 29 Jul 2026)**: saat audit tertulis "SEGERA HADIR" pada Trainer & Marketplace. Kini **tidak berlaku untuk keduanya** — badge "Segera hadir" di homepage `CategoryGrid` sudah dihapus karena kontradiktif: `/trainer-program` live & menerima lead, `/marketplace` live & menjual e-book nyata (`GET /api/ebooks`). Catatan: `/marketplace` masih facade di atas domain E-Book (backend marketplace = TASK-042, Phase 6). |
| F-05 | Halaman /masuk render | ✅ Pass | Form email+password+Google OAuth |
| F-06 | Link /daftar, /lupa password | ⚠️ Partial | Ada di UI; alur belum diuji ber-submit |
| F-07 | Data fiktif dihapus | ✅ Pass | Render nyata memakai konten jujur (fetch lama = cache basi) |

### 3.2 Integration Testing
| TC | Skenario | Hasil | Catatan |
|----|----------|-------|---------|
| I-01 | Email/WA/Search integrasi (non-payment) | ✅ Pass | Terverifikasi di TASK-030 (matrix) |
| I-02 | DOKU webhook signature+idempotency | ✅ Pass | 286/286 test |
| I-03 | Pembayaran uang nyata | ⚠️ Deferred | Sengaja ditunda |
| I-04 | Cloudflare Stream/R2 (video/storage) | ❌ Fail | Belum diimplementasi (disk lokal) — TASK-098 |

### 3.3 Regression / Code Quality
| TC | Skenario | Hasil |
|----|----------|-------|
| R-01 | Build web (guard BL-35) | ✅ Pass |
| R-02 | tsc/lint/test suite | ✅ Pass (286 tests) |
| R-03 | Console error di runtime | ✅ Pass (0 error) |
| R-04 | Regresi UI hero | ❌ Fail (C-1 lolos ke prod → gap QA visual) |

### 3.4 Performance (indikatif, belum Lighthouse terukur)
| TC | Skenario | Hasil |
|----|----------|-------|
| P-01 | SSR HTML terkirim cepat | ✅ Pass |
| P-02 | Aset `/_next/static` cache immutable | ✅ Pass |
| P-03 | Perceived load (hero) | ❌ Fail (kosong karena C-1) |
| P-04 | Lighthouse terukur (LCP/INP/CLS) | ⚠️ Belum dijalankan |

### 3.5 Responsive
| TC | Skenario | Hasil |
|----|----------|-------|
| RS-01 | Desktop 1440 | ⚠️ Partial (hero bug) |
| RS-02 | Mobile 390 | ⚠️ Perlu verifikasi (nav mobile/hamburger belum terkonfirmasi) |

### 3.6 Cross-Browser
| TC | Browser | Hasil |
|----|---------|-------|
| X-01 | Chromium | ⚠️ Partial (hero bug) |
| X-02 | Firefox/Safari/Edge | ⚠️ Belum diuji |

### 3.7 Security (dasar)
| TC | Skenario | Hasil |
|----|----------|-------|
| S-01 | HTTPS + HSTS | ✅ Pass |
| S-02 | Security headers (CSP/XFO/nosniff) | ✅ Pass (CSP baseline, `unsafe-inline` — M-2) |
| S-03 | Secrets tak ter-commit | ✅ Pass |
| S-04 | DOKU signature constant-time | ❌ Fail (BL-34 — wajib sebelum berbayar) |
| S-05 | Seed fail-closed (no hardcoded pw) | ❌ Fail (perlu perbaikan) |

### 3.8 SEO / Accessibility
| TC | Skenario | Hasil |
|----|----------|-------|
| SEO-01 | Meta description + OG + Twitter | ✅ Pass |
| SEO-02 | sitemap.ts + robots.ts | ✅ Pass |
| SEO-03 | JSON-LD Organization | ✅ Pass |
| SEO-04 | Title unik per halaman | ❌ Fail (title ganda /masuk — M-1) |
| A11Y-01 | Konten hero terpersepsi | ❌ Fail (C-1 → teks invisible) |
| A11Y-02 | Label form login | ✅ Pass |
| A11Y-03 | Kontras & keyboard nav | ⚠️ Perlu audit (L-1) |

---

## 4. Skor Website (0–100)

| Kategori | Skor | Alasan |
|----------|------|--------|
| **Performance** | **68** | SSR & caching baik; tapi perceived load hancur karena hero kosong; Lighthouse belum terukur. |
| **Accessibility** | **55** | Form login beraksesibilitas; namun konten hero tak terpersepsi (C-1) + kontras belum diaudit. |
| **Best Practices** | **72** | HTTPS, header aman, 0 console error; ternoda title ganda + bug animasi lolos ke prod. |
| **SEO** | **78** | Meta/OG/sitemap/robots/JSON-LD lengkap & redirect benar; minus title ganda + konten hero "kosong" bagi crawler render. |
| **Security** | **74** | HTTPS+HSTS+CSP+no-secrets+webhook verified; minus `unsafe-inline`, BL-34, seed fail-closed. |
| **UI/UX** | **52** | Redesign & gating membaik; tapi hero blank + header overlap menjatuhkan first impression. |
| **Code Quality** | **75** | TS strict, 286 tests, envelope, modular; minus dead apps, caret deps, gap QA visual. |
| **OVERALL** | **63** | Fondasi kuat, tetapi 1 Critical + DB kosong menahan kesiapan produksi. |

---

## 5. Kesimpulan — Production Readiness

**Status: NOT production-ready untuk Public Launch.** Penyebab utama tunggal & mudah diperbaiki: **C-1 (hero kosong)**. Setelah C-1 + H-1 diperbaiki dan **seed database** dijalankan, situs **layak Soft Launch NON-PAID**. Untuk **Public Launch berbayar** masih perlu: BL-34 (timing-safe DOKU), seed fail-closed, TASK-098 (R2+signed URL), dan Redis aktif.

---

## 6. Roadmap Prioritas (dampak × kompleksitas)

**Sprint kilat (hari ini) — buka gerbang Soft Launch:**
1. 🔴 **C-1** Fix animasi hero (immediate reveal + fallback opacity) · S · dampak tertinggi.
2. 🟠 **H-1** Header solid/opaque + z-index · S.
3. 🟠 **H-2** Seed produksi (fail-closed) · S.
4. 🟡 **M-1** Title unik per halaman · S.

**Sebelum Public Launch / berbayar:**
5. 🟡 **M-2** CSP nonce-based (BL-16) · M.
6. ❌ **S-04/S-05** BL-34 timing-safe DOKU + seed fail-closed · M.
7. ❌ **I-04** TASK-098 R2 + signed URL · L.
8. Redis aktif (queue async) · S (host).

**Polish (pasca-launch):**
9. Audit a11y (kontras/keyboard) · L-1 · M.
10. Cleanup dead apps + pin deps · L-2/L-3 · S.
11. Cross-browser + Lighthouse terukur + responsive audit menyeluruh.

---

## 7. Verifikasi lanjutan yang disarankan
Jalankan Lighthouse CI (Performance/A11y/SEO terukur), cross-browser (Firefox/Safari/Edge), responsive breakpoint (320–1920), dan E2E ber-login (register→login→enroll→checkout sandbox) setelah C-1 & seed beres.

---

*Laporan berbasis pengujian live (Claude-in-Chrome) + inspeksi kode. Skor bersifat penilaian ahli, bukan output Lighthouse otomatis (ditandai "belum terukur" di mana relevan). Confidential — internal only.*
