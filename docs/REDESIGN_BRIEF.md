# REDESIGN BRIEF — Jago Akademi (jagoakademi.com)

> Acuan tunggal untuk redesign visual seluruh website via **Google Stitch**, lalu diimplementasikan ke kode.
> **Arah:** Evolusi brand — warna inti dipertahankan, tampilan dimodernkan (spasi, tipografi, kartu, shadow, komponen).
> **Aturan mutlak:** redesign ini **presentation-only** — TIDAK mengubah fitur, data, routing, auth, atau feature flag. Hanya markup + styling.
> Disusun 24 Jul 2026. Total 88 halaman unik → dikelompokkan jadi **6 kerangka (shell) + 22 template + 1 kit komponen**.

---

## 1. Prinsip Kerja

1. **Jangan desain 88 halaman satu per satu.** Stitch mendesain layar-per-layar; 88 desain independen akan melenceng antar halaman. Desain **template + komponen bersama**, lalu halaman lain adalah instance dari template yang sama.
2. **Design-system dulu, halaman kemudian.** Tetapkan tema (warna/font/spasi/komponen) sebagai 1 prompt acuan; setiap prompt halaman merujuk tema itu agar konsisten.
3. **Setiap template wajib punya state.** Karena fitur tidak berubah, tiap layar harus mendesain: `loading` (skeleton), `empty` (data kosong — sopan, ada CTA), `error` (gagal muat), dan `populated` (berisi data). Situs sekarang punya empty-state di banyak halaman — jangan hilangkan.
4. **Kode Stitch = spesifikasi visual, bukan tempel-langsung.** Stitch mengekspor HTML/Tailwind statis; situs ini Next.js 16 + React 19 dengan data live, guard, dan state. Porting = pekerjaan engineering, HTML jadi acuan.
5. **Responsif + dark mode + aksesibilitas disebut eksplisit** di setiap prompt (situs punya dark-mode via CSS variables — lihat §2).

---

## 2. Token Desain Saat Ini (baseline untuk "evolusi")

Diekstrak langsung dari kode (`apps/web/app/globals.css` + pemakaian di komponen). Pertahankan identitasnya; modernkan penerapannya.

### Warna
| Peran | Nilai | Catatan |
|---|---|---|
| **Brand utama (cyan)** | `#0077A8` | Warna paling dominan (405× dipakai). Tombol utama, link, aksen. |
| Brand cyan gelap | `#005F87` | Hover/gradient. |
| Aksen ungu | `#7C3AED` | Gradient hero, badge premium. |
| Aksen pink/magenta | `#CC0052` | Ujung gradient hero (cyan→ungu→pink). |
| Teks utama | `#1D1D1F` | Near-black (gaya Apple). |
| Teks sekunder | `#6E6E73` | Abu-abu. |
| Teks muted | `#9CA3AF` / `#636366` | Placeholder, caption. |
| Latar halaman | `#F5F5F7` | Abu sangat terang. |
| Kartu / permukaan | `#FFFFFF` | |
| Border | `#E5E5EA` / `#E5E5E5` | |
| Sukses | teks `#16A34A`, bg `#DCFCE7` | |
| Bahaya/error | teks `#DC2626`, bg `#FEE2E2` | |

**Gradien khas brand:** cyan `#0077A8` → ungu `#7C3AED` → pink `#CC0052` (dipakai di judul hero). Pertahankan sebagai signature.

### Tipografi
- **Judul/heading:** Plus Jakarta Sans (via `next/font/google`).
- **Body:** Inter.
- Evolusi: rapikan skala tipografi (mis. langkah 12/14/16/20/24/32/48), tingkatkan line-height body untuk keterbacaan.

### Radius & bentuk
- Kartu: `10px`–`12px` (paling umum). Kartu besar: `16px`–`20px`. Pill/tombol bulat: `999px`.
- Evolusi: konsistenkan (mis. token `--radius-sm 8`, `--radius 12`, `--radius-lg 20`, `--radius-pill 999`).

### ⚠️ Utang teknis token (penting untuk implementasi)
`globals.css` SUDAH punya variabel token (`--brand-cyan`, `--color-surface-card`, `--border-default`, dll. + dark-mode), TAPI banyak halaman masih menaruh **hex mentah** (`#0077A8` 405×). Saat implementasi redesign, **konsolidasikan ke token** — ini kesempatan emas merapikan sekalian. Target: 0 hex mentah, semua lewat variabel.

---

## 3. Peta 88 Halaman → 6 Shell + 22 Template

### Kerangka global (shell) — desain 1× masing-masing, dipakai berulang
| Shell | Dipakai oleh | Isi |
|---|---|---|
| S1. Public shell | Semua halaman publik & marketing | Navbar (logo, menu, dropdown Produk & Komunitas, tombol Masuk/Dashboard) + Footer |
| S2. Auth shell | 6 halaman auth | Kartu tengah, logo, latar bersih, tanpa navbar |
| S3. Dashboard member shell | 14 halaman dashboard member | Sidebar navigasi + topbar |
| S4. Admin shell | 16 halaman admin | Sidebar admin (grup menu) + topbar |
| S5. Trainer shell | 6 halaman trainer-hub | Sidebar trainer + topbar |
| S6. LMS tenant shell | 10 halaman LMS B2B | Sidebar tenant + branding per perusahaan |

### 22 Template halaman
| # | Template | Jml hal. | Route contoh | Elemen kunci & state |
|---|---|:--:|---|---|
| T1 | **Homepage** | 1 | `/` | Hero + countdown, grid kategori, pillars, spotlight kursus, testimoni, B2B band, early-access band |
| T2 | **Marketing landing** | 8 | `/about` `/kolaborasi` `/afiliasi` `/trainer-program` `/clients` `/early-access` `/kelas-privat` `/komunitas` | Hero + benefit grid + form lead + CTA. State form: idle/submitting/success/error |
| T3 | **Listing / katalog grid** | 8 | `/e-course` `/ebook` `/event` `/blog` `/marketplace` `/kelas-gratis` `/alumni` `/portofolio-member` | Filter/search, grid kartu, pagination. State: loading/empty/populated |
| T4 | **Detail item** | 6 | `/ebook/[slug]` `/event/[slug]` `/blog/[slug]` `/mentor/[slug]` `/portofolio-member/[id]` `/e-course/.../[materi]` | Header, konten, CTA beli/daftar, related. State: loading/404 |
| T5 | **E-course navigasi berjenjang** | 2 | `/e-course/[kategori]` `/e-course/[kategori]/[topik]` | Breadcrumb + daftar sub-item |
| T6 | **Artikel statis** | 3 | `/privacy` `/terms` `/faq` | Tipografi panjang, TOC/accordion (FAQ) |
| T7 | **Kontak** | 1 | `/contact` | Form + info kontak + tombol WhatsApp |
| T8 | **Checkout** | 1 | `/checkout/[slug]` | Ringkasan item, kupon, tombol bayar. State: loading/kupon-invalid/redirect |
| T9 | **Hasil pembayaran** | 3 | `/payment/success` `/payment/pending` `/payment/failed` | 1 template, 3 varian status. Success punya kartu onboarding Private Class |
| T10 | **Verifikasi sertifikat** | 1 | `/verify/[certId]` | Kartu hasil valid/tidak valid |
| T11 | **Auth form** | 6 | `/masuk` `/daftar` `/lupa-password` `/reset-password` `/verifikasi-email` `/auth/callback` | 1 template kartu, 6 varian. State: idle/error/loading |
| T12 | **Dashboard member — home** | 1 | `/dashboard` | Kartu KPI + shortcut + aktivitas |
| T13 | **Dashboard member — daftar/list** | 8 | `/dashboard/kursus` `/pesanan` `/dashboard/ebook` `/dashboard/sertifikat` `/dashboard/tiket` `/dashboard/berlangganan` `/dashboard/afiliasi` (+`/dashboard/affiliate` duplikat) | Tabel/grid + empty-state |
| T14 | **Dashboard member — profil** | 1 | `/dashboard/profil` | Form profil + ganti password + avatar |
| T15 | **Detail pesanan** | 1 | `/pesanan/[orderId]` | Rincian order + status + invoice |
| T16 | **Learning player** | 2 | `/belajar/[slug]` `/belajar/[slug]/[lessonId]` | Layout fokus: video/materi + daftar lesson + kuis. Shell khusus (minim distraksi) |
| T17 | **Admin — dashboard home** | 1 | `/admin/dashboard` | Grid KPI + order terbaru + kursus populer |
| T18 | **Admin — list + modal CRUD** | 11 | `/admin/pengguna` `/admin/kursus` `/admin/transaksi` `/admin/leads` `/admin/ebook` `/admin/kupon` `/admin/blog` `/admin/event` `/admin/payout` `/admin/review` `/admin/portofolio` | Template terpenting: tabel + filter/tab + modal detail/edit. Banyak instance, 1 pola |
| T19 | **Admin — dashboard grafik** | 1 | `/admin/sistem-health` | Chart revenue/user/enrollment + distribusi status |
| T20 | **Admin — LMS tenant** | 2 | `/admin/lms` `/admin/lms/[tenantId]` | Daftar tenant + detail |
| T21 | **Trainer hub** | 6 | `/trainer-hub` `/trainer-hub/kursus` (+`/[courseId]`) `/trainer-hub/payout` `/trainer-hub/ulasan` `/trainer-hub/profil` | Home stats + list + detail + form |
| T22 | **LMS B2B portal** | 10 | `/lms/[tenantSlug]` + admin (batches/courses/reports/settings) + certificates + courses/[courseId] + `/lms/invite/[token]` | Portal per perusahaan, sidebar tenant, bisa reskin belakangan |

**Verifikasi jumlah:** 1+8+8+6+2+3+1+1+3+1+6+1+8+1+1+2+1+11+1+2+6+10 = **88** ✅

**Prioritas desain (dampak vs jumlah pengunjung):**
- **Gelombang 1 (paling terlihat):** S1, T1, T2, T3, T4, T11, T8, T9 — seluruh muka publik + auth + checkout.
- **Gelombang 2:** S3, T12–T16 — pengalaman member/belajar.
- **Gelombang 3:** S4/S5, T17–T21 — admin & trainer (internal, boleh menyusul).
- **Gelombang 4:** S6, T22 — LMS B2B (paling terisolasi).

---

## 4. Strategi Prompt di Google Stitch

1. **Prompt tema (1×, disimpan):** definisikan palet §2 (evolusi), font, radius, mood ("modern, bersih, edukasi premium, aksen gradien cyan→ungu→pink"), aturan responsif & dark mode. Jadikan referensi di tiap prompt berikutnya.
2. **Prompt shell (6×):** desain navbar + footer + sidebar sekali; kunci sebagai komponen.
3. **Prompt per template (22×):** minta 1 template + varian state-nya dalam satu sesi. Sebut ulang tema.
4. **Penamaan:** beri nama desain persis route/template (`T18-admin-list`, `T2-marketing-landing`) agar pemetaan ke kode 1:1.
5. **Batch sesuai limit Stitch:** 22 template jauh lebih hemat kuota daripada 88 halaman — kerjakan per gelombang.
6. **Ekspor:** simpan HTML/CSS tiap template sebagai referensi (bukan untuk ditempel mentah).

---

## 5. Kontrak Implementasi "Presentation-Only"

Saat porting desain Stitch ke kode, yang **BOLEH** berubah hanya: struktur JSX (markup), className/CSS, komponen presentational.

**TIDAK BOLEH berubah:** pemanggilan `fetch`/endpoint, handler event, `useState`/`useEffect` logic, feature flag, auth guard, routing, bentuk envelope data, teks yang diuji E2E (kecuali diselaraskan bersama test-nya).

### Pengaman (kenapa ini aman dilakukan)
- **458 test API + 120 test E2E Playwright** mengunci perilaku & teks. Reskin yang merusak fitur → test merah.
- **Visual baseline** (24 screenshot) tinggal di-regenerate per halaman yang diubah.
- Kerjakan **per template di branch terpisah**, bukan sekaligus. Tiap PR: 1 template, jalankan E2E terkait, regenerate baseline, review.

### Langkah rapi implementasi (disarankan)
1. **Buat layer token dulu**: konsolidasikan warna/spasi/radius ke CSS variables (§2), hapus hex mentah. Ini fondasi semua reskin.
2. **Bangun kit komponen bersama** (Button, Card, Input, Table, Modal, Badge, EmptyState, Skeleton) sesuai desain Stitch — sekali, dipakai semua halaman.
3. **Reskin per gelombang** (shell dulu, lalu template). Shell diubah → semua halaman langsung terasa baru.
4. **Jaga hijau**: tiap halaman selesai → `npx playwright test` + regenerate baseline + `npm run build`.

---

## 6. Checklist per Halaman (saat implementasi)

- [ ] Semua data & fungsi persis seperti sebelumnya (tidak ada endpoint/handler berubah)
- [ ] State loading/empty/error/populated ada dan sesuai desain
- [ ] Responsif desktop + mobile (tanpa overflow horizontal)
- [ ] Dark mode konsisten (pakai token)
- [ ] Tanpa console error
- [ ] Feature flag & auth guard utuh
- [ ] E2E terkait hijau + visual baseline diperbarui
- [ ] Tanpa hex mentah (semua lewat token)

---

## 7. Yang Perlu Diputuskan Sebelum Mulai Desain

1. Skala tipografi & radius final (untuk token) — bisa saya usulkan.
2. Perlukah komponen dark-mode dipertahankan di redesign? (situs sekarang punya) — disarankan ya.
3. Duplikat `/dashboard/affiliate` vs `/dashboard/afiliasi` — pilih satu, hapus yang lain (rapikan saat redesign).
4. Halaman LMS B2B (T22): ikut diredesign atau ditunda? (paling terisolasi, dampak eksternal kecil).
