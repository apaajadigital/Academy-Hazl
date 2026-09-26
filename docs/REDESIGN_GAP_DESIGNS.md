# Gap Designs — Halaman yang Masih Perlu Desain Stitch

> ## ✅ STATUS 24 Jul 2026 — SEMUA GAP G1–G6 TERISI
> Reviewer telah menyuplai **12 desain** di folder `stitch_task_execution_manager (1)/stitch_task_execution_manager/`. DESIGN.md **byte-identical** dengan yang asli (nol drift token), stack sama (Tailwind v3 CDN, Material Symbols, light-only), semua file target ada di `apps/web/app/`. Total kini **32 desain** menutup seluruh 22 template.
>
> **Pemetaan:** `auth_daftar_recovery`/`auth_lupa_password`/`auth_reset_password`/`auth_verifikasi_email`→(auth)/*; `dashboard_member_beranda`→dashboard/page; `member_kelas_saya`→dashboard/kursus; `member_riwayat_pesanan`→pesanan+dashboard/pesanan; `member_sertifikat_saya`→dashboard/sertifikat; `member_program_afiliasi`→dashboard/afiliasi; `admin_sistem_kesehatan`→admin/sistem-health; `admin_manajemen_lms_tenant`→admin/lms(+[tenantId]); `blog_daftar_artikel`→blog(+[slug]).
>
> **Drift yang WAJIB dirapikan saat port** (bukan diport apa adanya):
> 1. **Nav sidebar member beda di tiap halaman** (5 varian + `profil_member`) → satukan ke **satu shell member kanonik** (dibangun di W0.3), reskin 5 halaman ke shell itu.
> 2. **Label admin `admin_manajemen_lms_tenant` bahasa Inggris** (Overview/Tenant Management/...) → seragamkan ke Indonesia + rekonsiliasi dengan nav `admin_sistem_kesehatan`.
> 3. **`member_program_afiliasi` membungkus navbar publik DI LUAR sidebar** (hibrid) → buang navbar, pakai shell member saja.
> 4. **Buang toggle "Mode Tampilan"** (dark) di sidebar `profil_member` (light-only); footer sidebar seragam = user-card + Keluar.
> 5. **🐛 BUG render `auth_verifikasi_email`**: blok `<style>` TIDAK punya rule `.bg-brand-gradient` (beda dari daftar/lupa/reset) → tombol CTA sukses jadi putih-di-atas-putih (tak terlihat). **Fix saat port**: tambah rule `.bg-brand-gradient` / gradien inline pada tombol itu.
> 6. Tambah **state kosong/loading/error** saat port (banyak desain gap hanya menampilkan versi berisi data).
>
> **Sub-gap kecil (halaman ada di app, belum ada desain Stitch) — SAYA turunkan in-code dari template terdekat:** `dashboard/tiket` (tiket bantuan), `dashboard/berlangganan`+`berlangganan` (langganan), `dashboard/ebook` (pustaka e-book member), dan **detail** `admin/lms/[tenantId]` (dari pola tabel/detail admin). Order DETAIL sudah tercakup desain asli `detail_pesanan`.
>
> Detail wave: G1+G6→Wave 1 · G2+G3→Wave 2 · G4+G5→Wave 3.

---


> Daftar halaman/template yang **belum** punya desain Stitch, lengkap dengan prompt siap-tempel.
> Dibuat dari analisis coverage 20 desain Stitch vs 88 route (multi-agent, 24 Jul 2026).
> **Cara pakai:** di Stitch, tempel dulu **Prompt Tema** (`REDESIGN_TOKENS_AND_PROMPTS.md` §B.0) sebagai acuan, lalu tempel tiap prompt gap di bawah. Beri nama desain sesuai kode (mis. `daftar`, `dashboard_member`, `admin_sistem_health`) agar pemetaan ke kode 1:1.

---

## Status Coverage 22 Template

| Template | Desain Stitch | Status |
|---|---|---|
| T1 Homepage | (dipakai marketing template) | ⚠️ opsional (G7) |
| T2 Marketing landing | `marketing_landing_template` | ✅ |
| T3 Listing/katalog | `katalog_kursus` | ✅ |
| T4 Detail item | `detail_kursus` | ✅ |
| T5 Katalog berjenjang | `katalog_berjenjang` | ✅ (perlu perbaikan bug render) |
| T6 Artikel (FAQ/legal) | `faq_ketentuan` + `kebijakan_privasi` | ✅ |
| T7 Kontak | `hubungi_kami` | ✅ |
| T8 Checkout | `checkout` | ✅ |
| T9 Hasil pembayaran | `pembayaran_berhasil` + `status_pembayaran` | ✅ |
| T10 Verifikasi sertifikat | `verifikasi_sertifikat` | ✅ |
| **T11 Auth** | `masuk` (login saja) | 🔴 **GAP G1** (daftar/lupa/reset/verifikasi) |
| **T12 Dashboard member — beranda** | — | 🔴 **GAP G2** |
| **T13 Member — daftar (kelas/pesanan/sertifikat/...)** | — | 🔴 **GAP G3** |
| T14 Profil member | `profil_member` | ✅ |
| T15 Detail pesanan | `detail_pesanan` | ✅ |
| T16 Learning player + kuis | `learning_player` + `learning_player_kuis` | ✅ |
| T17 Admin dashboard | `admin_dashboard` | ✅ |
| T18 Admin CRUD (list+modal) | `manajemen_data_admin` | ✅ |
| **T19 Admin — Sistem Kesehatan (grafik)** | — | 🔴 **GAP G4** |
| **T20 Admin — LMS tenant** | — | 🔴 **GAP G5** |
| T21 Trainer hub | `trainer_hub` | ✅ |
| T22 LMS B2B portal | `portal_lms_perusahaan` | ✅ |
| **Blog — daftar + artikel** | — | 🔴 **GAP G6** |
| **Navigasi mobile** | — (tak ada di semua desain) | 🟡 **saya bangun in-code** (G8) |

**Ringkas: 6 gap perlu desain Stitch (G1–G6) + 1 opsional (G7) + 1 saya handle (G8).**

---

## PROMPT GAP (siap tempel — tempel Prompt Tema §B.0 dulu)

### G1 — Auth: Daftar, Lupa Password, Reset Password, Verifikasi Email

```
Pakai design system Jago Akademi + auth shell (kartu tengah max 420px, latar
bersih dengan sentuhan gradien brand di sudut, logo di atas kartu, tanpa
navbar/footer). Konsisten dengan desain "masuk" yang sudah ada. Buat 4 layar:
1. DAFTAR: field Nama Lengkap, Email, Password (dengan toggle lihat), tombol
   gradien "Buat Akun", pemisah "atau", tombol "Daftar dengan Google" (outline),
   link "Sudah punya akun? Masuk". State error di bawah field + tombol loading.
2. LUPA PASSWORD: field Email, tombol "Kirim Tautan Reset", link kembali ke
   Masuk, + state sukses ("Cek email Anda" dengan ikon amplop).
3. RESET PASSWORD: field Password Baru + Konfirmasi Password (dengan indikator
   kekuatan), tombol "Simpan Password Baru", + state sukses.
4. VERIFIKASI EMAIL: kartu status dengan 3 kondisi (loading spinner "Memverifikasi",
   sukses centang hijau "Email terverifikasi" + CTA ke Dashboard, gagal "Tautan
   tidak valid" + tombol kirim ulang).
Semua light-only, responsif, ikon gaya lucide.
```

### G2 — Dashboard Member: Beranda

```
Pakai design system Jago Akademi + app-shell sidebar TERANG (sidebar kiri:
logo + grup "Belajar" (Beranda, Kelas Saya, Sertifikat) dan "Akun" (Pesanan,
E-Book, Tiket, Langganan, Afiliasi, Profil); item aktif aksen cyan; tombol
Keluar di bawah). Desain BERANDA dashboard member:
- Sapaan personal "Selamat Pagi, [Nama]" + tanggal.
- Baris 4 kartu KPI: Kursus Diikuti, Sedang Berjalan, Selesai, Sertifikat
  (angka besar + ikon + warna aksen berbeda + soft shadow).
- Section "Lanjutkan Belajar": kartu kursus dengan thumbnail + progress bar +
  tombol "Lanjutkan".
- Section "Rekomendasi untuk Anda": grid kartu kursus.
- State KOSONG ramah untuk akun baru ("Belum ada kursus — Jelajahi Katalog"
  dengan ilustrasi + CTA).
Light-only, responsif (sidebar → drawer mobile), ikon gaya lucide.
```

### G3 — Member: Template Daftar (Kelas Saya, Pesanan, Sertifikat, dll)

```
Pakai design system Jago Akademi + app-shell sidebar terang member. Desain
TEMPLATE halaman daftar member — buat sebagai satu template dengan beberapa
varian isi:
- Header halaman (judul + jumlah item) + filter/tab bila perlu.
- VARIAN KARTU (untuk Kelas Saya, E-Book Saya, Sertifikat, Tiket Event): grid
  kartu 2–3 kolom (thumbnail/preview, judul, meta, progress bar untuk kursus /
  tombol Unduh untuk sertifikat & e-book / detail tiket dengan QR).
- VARIAN TABEL (untuk Pesanan, Langganan): tabel dengan badge status berwarna
  (Lunas hijau / Pending amber / Gagal merah), tanggal, total, tombol "Lihat
  Detail".
- VARIAN AFILIASI: kartu statistik (Klik, Konversi, Komisi, Saldo) + kode
  referral yang bisa disalin + tombol "Tarik Dana" + riwayat penarikan; ATAU
  layar "Daftar sebagai Affiliate" bila belum terdaftar.
Setiap varian punya empty-state ramah + skeleton loading. Light-only, responsif.
```

### G4 — Admin: Sistem Kesehatan (Dashboard Grafik)

```
Pakai design system Jago Akademi + app-shell admin sidebar TERANG. Desain
halaman SISTEM KESEHATAN (analitik):
- Baris kartu ringkasan kecil (total user, order, enrollment, pendapatan).
- Kartu grafik GARIS: Pendapatan 12 bulan, Pengguna Baru 12 bulan, Pendaftaran
  12 bulan (pakai warna cyan primary + aksen).
- Kartu grafik DONAT: distribusi status order (paid/pending/failed/expired/
  refunded/cancelled) dengan legenda berwarna semantik.
- Kartu "Kursus Teratas" (daftar dengan bar progress) + kartu ringkasan database.
Tata letak grid rapi, kartu putih soft-shadow. Light-only, responsif, ikon lucide.
```

### G5 — Admin: Manajemen LMS Tenant (B2B)

```
Pakai design system Jago Akademi + app-shell admin sidebar terang. Desain
manajemen LMS B2B untuk admin:
- Halaman DAFTAR tenant: tabel/grid perusahaan (logo, nama, jumlah member,
  paket, status aktif/nonaktif, tanggal bergabung) + tombol "Tambah Tenant" +
  search/filter.
- Halaman DETAIL tenant: header info perusahaan + kartu statistik pemakaian
  (member aktif, kursus, penyelesaian) + tab (Member, Kursus, Batch, Pengaturan)
  dengan tabel di masing-masing.
Konsisten dengan template tabel admin yang sudah ada (manajemen_data_admin).
Light-only, responsif.
```

### G6 — Blog: Daftar + Artikel

```
Pakai design system Jago Akademi + navbar & footer publik. Buat 2 layar:
1. BLOG (daftar): hero judul + kartu artikel unggulan besar di atas, lalu grid
   kartu artikel (cover, kategori chip, judul, ringkasan, penulis + tanggal +
   estimasi baca) + filter kategori + pagination.
2. ARTIKEL (detail): header (kategori, judul besar, penulis+avatar, tanggal,
   estimasi baca) + cover besar + isi artikel tipografi nyaman (heading, kutipan
   border kiri, gambar, list) + bagikan sosial + kartu "Artikel Terkait" di bawah.
Light-only, responsif, tipografi editorial yang bersih (Plus Jakarta heading,
Inter body).
```

### G7 — (Opsional) Homepage Khusus

```
Hanya jika ingin homepage BERBEDA dari marketing template. Pakai design system
Jago Akademi + navbar/footer publik. Desain HOMEPAGE:
Hero dengan countdown early-bird + form email, grid kategori, section pillars,
spotlight e-course, testimoni (+ versi kosong), band B2B, band early-access.
(Jika marketing_landing_template sudah cukup jadi homepage, lewati gap ini.)
```

### G8 — Navigasi Mobile (SAYA BANGUN in-code — opsional referensi)

Tidak wajib didesain di Stitch. Saya bangun hamburger + drawer mobile mengikuti
navbar desktop Stitch (grup menu Produk & Komunitas, tombol Masuk/Dashboard).
Jika Anda ingin arahan visual spesifik, sertakan 1 mockup Stitch "menu mobile
drawer" dan saya samakan.

---

## Setelah Desain Gap Jadi

Taruh tiap folder hasil Stitch (berisi `code.html` + `screen.png`) ke
`stitch_task_execution_manager/stitch_task_execution_manager/` dengan nama jelas
(mis. `daftar_jago_akademi`, `dashboard_member_jago_akademi`,
`admin_sistem_health_jago_akademi`, `admin_lms_tenant_jago_akademi`,
`blog_jago_akademi`). Kabari saya — akan langsung saya masukkan ke wave yang
sesuai:
- G1 (auth) → **Wave 1**
- G2, G3 (member) → **Wave 2**
- G4, G5 (admin) → **Wave 3**
- G6 (blog) → **Wave 1**
- G7 (homepage) → **Wave 1** (jika dipakai)

Referensi: `REDESIGN_IMPLEMENTATION_PLAN.md` (gelombang & kontrak), `REDESIGN_TOKENS_AND_PROMPTS.md` (§B.0 Prompt Tema + prompt template lain).
