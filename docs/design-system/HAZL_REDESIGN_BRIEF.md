# Hazl Academy — Redesign Brief & Stitch Prompt Pack

> **Status**: Fase riset & perencanaan selesai. Prompt di dokumen ini dijalankan MANUAL oleh
> owner di Antigravity IDE (MCP Stitch sudah terhubung). Hasil generate Stitch disimpan ke
> `docs/design-system/stitch-output/`, baru kemudian diterapkan ke kode oleh Claude.
>
> **Yang TIDAK berubah**: backend, API, database, business logic, route, auth, payment flow,
> semua fungsi yang sudah bekerja. Ini murni redesign visual/UX layer.

---

## 1. Kenapa desain sekarang terasa "AI slop"

Audit cepat terhadap kode saat ini (bukan opini, dihitung langsung dari codebase):

| Pola | Jumlah ditemukan | Kenapa ini masalah |
|---|---|---|
| `bg-gradient-to-*` / `linear-gradient(...)` inline | 82 pemakaian di 30+ file | Gradient biru→ungu→pink dipakai berulang di badge, avatar placeholder, progress bar, background section — pola paling dikenali sebagai "generic AI SaaS" |
| `shadow-e3` / `shadow-e4` / `shadow-glow-*` (shadow besar melayang) | 53 pemakaian | Efek "melayang" berlebihan pada card yang seharusnya flat |
| `StatCard` (kotak angka besar) | 13 halaman | Dashboard jadi "wall of numbers" tanpa hierarki — ciri khas template AI generator |
| Badge lingkaran ikon berwarna (`rounded-full` + `bg-*/10` + ikon di tengah) | Berulang di hampir semua fitur card | "Icon-in-colored-circle" adalah pola nomor satu yang disebut sebagai ciri AI slop oleh komunitas desain (Refactoring UI, dsb) |
| Warna brand: cyan `#36bdf2` + ungu `#946bee` + pink `#ff2f86` (3 warna gradient) | Token utama saat ini | Brief owner: Hazl cuma **biru + pink + putih** — ungu harus hilang dari palet |

**Prinsip anti-slop yang dipakai untuk brief ini** (dari praktik desain yang sudah mapan, bukan tren AI):

1. **Satu aksen warna per elemen, bukan gradient 3-warna.** Gradient hanya boleh dipakai maksimal di 1 tempat per halaman (hero besar), tidak di button/badge/avatar kecil.
2. **Flat + border tipis, bukan shadow melayang.** Shadow dipakai untuk elevasi fungsional (modal, dropdown), bukan dekorasi card biasa.
3. **Tidak semua card butuh ikon dalam lingkaran berwarna.** Ikon polos + warna teks sudah cukup untuk 80% kasus.
4. **Angka besar (StatCard) hanya untuk data yang benar-benar jadi headline halaman** — bukan default semua dashboard.
5. **Hierarki tipografi yang tegas** (ukuran, weight, spacing) menggantikan warna sebagai cara utama menonjolkan sesuatu.
6. **Real content, real states.** Tidak ada placeholder "Lorem ipsum" atau ikon generik untuk empty state — pakai copy yang spesifik ke konteks Hazl Academy.

Target owner: **maksimal ~5% halaman yang masih "terasa AI"** — sisanya harus terasa dirancang dengan sengaja untuk Hazl.

---

## 2. Sistem Desain Baru — Hazl Academy

### 2.1 Warna (2 warna brand + netral, TANPA ungu)

```
Brand:
  --hazl-blue:        #36BDF2   (primer — CTA utama, link aktif, ikon aktif)
  --hazl-blue-strong:  #0077A8   (teks/ikon di atas putih, kontras aman)
  --hazl-pink:         #FF2F86   (aksen sekunder — badge status, highlight, notifikasi)
  --hazl-pink-strong:  #CC0052   (teks/ikon aksen di atas putih)

Netral (dominan — 90% dari layar adalah ini, bukan warna brand):
  --surface-page:   #FAFAFA atau #F6F7F9  (bukan gradient, flat)
  --surface-card:   #FFFFFF
  --text-primary:   #16181D
  --text-secondary: #5B616E
  --border:         #E7E9EC

Gradient (HANYA dipakai maksimal 1x per halaman, di hero/CTA besar):
  --hazl-gradient: linear-gradient(120deg, #36BDF2 0%, #FF2F86 100%)
  (2 warna saja — ungu DIHAPUS dari gradient)
```

### 2.2 Tipografi

Tetap pakai font yang sudah ada (Plus Jakarta Sans untuk heading, Inter untuk body) — sudah bagus, tidak perlu ganti. Yang diperbaiki: **skala dan disiplin pemakaian**, bukan fontnya.

- H1: 40–56px / extrabold / letter-spacing -2%
- H2: 28–32px / bold
- Body: 16px / regular, line-height 1.6
- Label/eyebrow: 12px / semibold / uppercase / letter-spacing 8%

### 2.3 Komponen — aturan baru

| Komponen | Aturan lama (dihindari) | Aturan baru |
|---|---|---|
| Card | shadow-e2/e3 + radius 20px + kadang gradient border | Border 1px solid `--border` + radius 12px, shadow HANYA saat hover, flat by default |
| Badge status | Pill dengan gradient/warna solid mencolok | Pill kecil, warna soft-background + teks warna kuat (mis. bg pink 10% + teks pink strong) |
| Icon avatar/badge | Lingkaran gradient 3-warna | Lingkaran solid 1 warna brand ATAU inisial teks tanpa background berwarna |
| Button primary | Gradient fill | Solid `--hazl-blue-strong` fill, gradient HANYA untuk 1 CTA hero per halaman |
| Dashboard stat | Semua metrik jadi StatCard besar | Maks 3-4 StatCard untuk metrik utama saja, sisanya di tabel/list biasa |
| Empty state | Ikon generik + teks umum | Copy spesifik konteks (mis. "Belum ada kursus yang kamu buat" bukan "No data") |

---

## PROMPT RUNNER — paste ini ke chat Antigravity untuk mulai generate otomatis

Ini BUKAN prompt untuk Stitch — ini prompt untuk **Antigravity** (agent IDE-mu), menyuruhnya
membaca file ini sendiri lalu menjalankan seluruh isi (Prompt 0 + Ronde 1–5) ke MCP Stitch
secara berurutan, tanpa kamu perlu copy-paste satu per satu:

```
Baca file docs/design-system/HAZL_REDESIGN_BRIEF.md di project ini secara penuh.

File itu berisi 1 "Master Prompt (Prompt 0)" dan 5 "RONDE" (masing-masing berisi 4 prompt
halaman) untuk redesain UI Hazl Academy via MCP Stitch. Tolong jalankan urutan berikut lewat
tool Stitch yang sudah terhubung:

1. Jalankan PROMPT 0 (Master Prompt / Design System Fondasi) LEBIH DULU, sendirian. Tunggu
   hasilnya selesai sebelum lanjut ke langkah berikutnya.
2. Setelah Prompt 0 selesai, jalankan RONDE 1 sampai RONDE 5 secara berurutan. Di setiap ronde,
   jalankan ke-4 prompt-nya satu per satu (bukan digabung jadi satu pesan), sertakan blok
   "KONTEKS PROJECT" singkat yang ada di file sebelum prompt Ronde 1 pada SETIAP prompt halaman.
3. Setelah setiap prompt selesai digenerate Stitch, simpan/ekspor hasilnya (screenshot atau
   link Stitch) ke folder docs/design-system/stitch-output/, dengan nama file mengikuti nomor
   prompt-nya (contoh: 0-master.png, 1.1-homepage.png, 1.2-katalog.png, dst — 1 file per prompt).
   Jika Stitch punya cara ekspor sendiri (link project, JSON, atau folder hasil), gunakan itu
   dan taruh di subfolder yang sama.
4. Jangan mengubah kode aplikasi apapun (backend, frontend, database) — tugas ini murni
   menjalankan prompt desain ke Stitch dan menyimpan hasilnya. Penerapan hasil desain ke kode
   sungguhan dilakukan terpisah setelah semua aset ini siap.
5. Kalau salah satu prompt gagal/ditolak Stitch, catat di
   docs/design-system/stitch-output/RUNNER_LOG.md (buat kalau belum ada) — nomor prompt mana
   yang gagal dan pesan errornya — lalu lanjut ke prompt berikutnya, jangan berhenti total.
6. Setelah semua 21 prompt (1 master + 20 prompt ronde) selesai dijalankan, laporkan ringkasan:
   berapa yang berhasil, berapa yang gagal, dan di mana semua hasilnya tersimpan.
```

---

## 3. Struktur Prompt untuk Stitch (MCP Antigravity)

**Cara pakai**: Jalankan **Master Prompt (Prompt 0)** di bawah **lebih dulu, sendirian, sebagai
pesan pertama** ke Stitch — ini membangun fondasi/style guide yang akan dipakai Stitch sebagai
acuan di semua prompt sesudahnya. Setelah itu baru jalankan Ronde 1–5, tiap ronde berisi **4
prompt** untuk 1 kelompok halaman (jangan digabung jadi 1 pesan — jalankan satu per satu supaya
Stitch fokus per kelompok).

Total: **1 master prompt (fondasi) + 80 halaman dikelompokkan jadi 20 kelompok template →
5 ronde × 4 prompt.**

---

### PROMPT 0 — Master Prompt (Design System Fondasi, jalankan PERTAMA)

```
Saya sedang membangun ulang tampilan (UI/UX redesign) untuk "Hazl Academy" — platform edukasi
online Indonesia yang mencakup kursus video (E-Course), e-book, event/webinar, kelas gratis,
marketplace trainer, program afiliasi, dan portal LMS multi-tenant untuk korporat/institusi.
Backend, fitur, dan alur kerja SUDAH ADA dan TIDAK BOLEH berubah — tugas Stitch murni membangun
BAHASA VISUAL baru: sebuah design system yang konsisten, lalu diterapkan ke puluhan halaman
melalui prompt-prompt susulan yang akan saya kirim per kelompok halaman.

TUJUAN UTAMA: desain harus terasa dirancang dengan sengaja untuk brand Hazl — bukan hasil
generate AI generik. Sebelum membuat apa pun, hindari secara sadar ciri-ciri "AI slop" berikut
(saya audit langsung dari desain lama yang ingin ditinggalkan):
- Gradient 3 warna (biru→ungu→pink) dipakai di mana-mana (button kecil, badge, avatar,
  progress bar) — HARUS DIHENTIKAN. Gradient maksimal dipakai di 1 elemen besar per halaman
  (hero atau 1 CTA utama), dan HANYA 2 warna (biru→pink, tanpa ungu).
- Shadow besar "melayang" di semua card (drop-shadow tebal blur besar) — ganti dengan card
  flat, border tipis 1px, shadow HANYA muncul saat hover/interaksi.
- Ikon dibungkus lingkaran gradient berwarna-warni di mana-mana — ini pola AI generator paling
  gampang dikenali. Ganti dengan ikon polos (outline, warna teks/brand tunggal) tanpa
  background lingkaran, kecuali memang perlu container untuk kontras (maka pakai warna solid
  tunggal atau soft-background 8-10% opacity, bukan gradient).
- Kotak angka besar (stat card) dipasang di semua tempat sebagai "dekorasi data" — hanya pakai
  untuk metrik yang benar-benar jadi headline halaman (maksimal 3-4 per dashboard).
- Ilustrasi generik/stock yang tidak spesifik ke konteks edukasi Indonesia.

BRAND & WARNA (wajib diikuti persis, ini identitas resmi Hazl — TIDAK BOLEH diganti/ditambah
warna brand lain seperti ungu/purple):
- Biru primer: #36BDF2 (aksi utama, link aktif, elemen interaktif)
- Biru kuat (untuk teks/ikon di atas putih agar kontras aman): #0077A8
- Pink aksen: #FF2F86 (highlight sekunder, notifikasi, elemen "hidup"/energik)
- Pink kuat (untuk teks/ikon aksen di atas putih): #CC0052
- Putih & netral (INI WARNA DOMINAN — sekitar 85-90% dari setiap layar adalah putih/abu-abu
  netral, bukan warna brand): putih murni untuk card, off-white sangat terang (#FAFAFA/#F6F7F9)
  untuk background halaman, abu gelap hampir hitam (#16181D) untuk teks utama, abu medium
  (#5B616E) untuk teks sekunder, abu sangat terang (#E7E9EC) untuk border/pemisah.
- Logo brand: karakter maskot rubah/musang biru dengan wordmark "hazl.id", titik pada huruf
  "i" berwarna pink — elemen ini adalah identitas visual inti, boleh dipakai sebagai motif
  halus (bukan dominan) di halaman kosong/onboarding jika relevan.

TIPOGRAFI:
- Font judul/heading: gaya geometric sans-serif tebal (seperti Plus Jakarta Sans), extrabold,
  letter-spacing sedikit rapat pada judul besar.
- Font body/teks: sans-serif netral mudah dibaca (seperti Inter), regular weight, line-height
  lega untuk teks panjang.
- Hierarki ketat: Judul halaman (H1) jauh lebih besar dari body — gunakan UKURAN dan BOBOT
  huruf sebagai alat utama menonjolkan sesuatu, bukan warna berlebihan.
- Label kecil (eyebrow/kategori) memakai huruf kapital semua, ukuran kecil, letter-spacing
  lebar, warna biru kuat — dipakai untuk menandai konteks section, bukan sebagai badge pill.

KOMPONEN & GAYA VISUAL:
- Card: latar putih, border tipis abu terang, sudut membulat sedang (bukan sangat bulat/pill),
  TANPA shadow default (shadow hanya muncul saat hover sebagai micro-interaction halus).
- Tombol: dua bahasa berbeda dengan sengaja — di halaman publik/marketing tombol boleh
  berbentuk pill penuh (rounded-full) dengan warna solid biru kuat sebagai primary, sedangkan
  DI DALAM produk (dashboard/admin/trainer) tombol memakai sudut membulat sedang (bukan pill)
  agar terasa presisi seperti alat kerja, bukan halaman promosi.
- Badge status (misalnya "Aktif", "Pending", "Gratis"): pill kecil dengan latar warna soft
  (10% opacity dari warna status) dan teks warna solid dari warna yang sama — TIDAK memakai
  warna solid penuh sebagai latar.
- Input form: border tipis, fokus dengan ring biru halus (bukan glow tebal), label di atas
  input (bukan placeholder-only).
- Navigasi (sidebar dashboard, navbar publik): flat, item aktif ditandai dengan warna teks/
  ikon biru dan garis aksen tipis di sisi kiri (bukan background gradient penuh pada item aktif).
- Data tabel (admin/dashboard): baris dengan whitespace cukup, header kolom huruf kecil
  kapital semua dan tipis, garis pemisah antar-baris sangat halus (bukan kotak/card per baris).
- Empty state: ilustrasi sederhana/ikon garis tunggal (bukan generic stock illustration),
  disertai copy spesifik ke konteks (misalnya untuk kursus kosong: "Belum ada kursus di sini"
  — bukan teks generik "No data found").

REFERENSI KUALITAS (bukan untuk ditiru identik, tapi acuan level kerapian & kedewasaan visual):
produk SaaS modern seperti Linear, Stripe Dashboard, dan Notion — bersih, flat, hierarki jelas,
whitespace disiplin, warna dipakai secara sengaja dan terbatas, bukan template landing-page
generator AI generik yang penuh gradient dan ikon-dalam-lingkaran-warna-warni.

TOLONG BUAT: satu set style guide/foundation screen (color palette, tipografi, komponen dasar
seperti button/card/badge/input/navigasi) yang mendemonstrasikan bahasa visual ini secara utuh,
sebagai acuan sebelum saya kirim prompt-prompt halaman spesifik berikutnya (halaman publik,
dashboard student, admin, trainer hub, dan portal LMS).
```

---

Setiap prompt di Ronde 1–5 di bawah SELALU diawali dengan blok context singkat ini (pengingat
ringkas ke fondasi Prompt 0 di atas, supaya Stitch tetap konsisten tanpa mengulang seluruh detail):

```
KONTEKS PROJECT (sertakan di semua prompt susulan):
Lanjutan dari design system Hazl Academy yang sudah dibangun (biru #36BDF2 + pink #FF2F86 +
netral, TANPA ungu). Tetap gunakan bahasa visual yang sama: flat, border tipis, gradient
maksimal 1x per halaman, tanpa icon-dalam-lingkaran-gradient, tanpa stat card berlebihan.
```

---

### RONDE 1 — Halaman Publik (Marketing) bagian 1

**Prompt 1.1 — Homepage**
```
Desain ulang homepage Hazl Academy. Struktur: hero asimetris (headline + CTA + visual produk,
BUKAN gradient background penuh layar), grid kategori kursus, 3 pillars/value prop (ikon flat
tanpa lingkaran gradient), spotlight e-course unggulan, testimonial (jika ada data nyata),
closing CTA band gelap. Section harus terasa punya hierarki visual berbeda-beda, bukan
rangkaian card seragam berulang.
```

**Prompt 1.2 — Katalog & Detail Produk (E-Course, Ebook, Event, Kelas Gratis)**
```
Desain ulang halaman katalog (grid/list produk dengan filter kategori) dan halaman detail
produk (hero produk + deskripsi + CTA beli/daftar + kurikulum/agenda) untuk 4 tipe konten:
E-Course, E-Book, Event, Kelas Gratis. Satu sistem card produk yang dipakai konsisten di
semua katalog — bukan desain berbeda-beda per tipe. Badge harga/gratis pakai warna soft,
bukan pill mencolok.
```

**Prompt 1.3 — Checkout & Status Pembayaran**
```
Desain ulang alur checkout (ringkasan pesanan + form + tombol bayar) dan 3 halaman status
(payment success/pending/failed). Checkout harus terasa aman & tepercaya: minim distraksi,
CTA tunggal jelas. Halaman status pakai ilustrasi/icon sederhana sesuai konteks (bukan generic
checkmark clipart), dengan next-step yang jelas (mis. tombol "Lihat Pesanan Saya").
```

**Prompt 1.4 — About, Kontak, FAQ, Legal (Privacy/Terms), Kolaborasi/Afiliasi/Trainer Program**
```
Desain ulang halaman informasi statis: About, Contact, FAQ (accordion), Privacy/Terms (long-form
text), dan 3 halaman rekrutmen (Kolaborasi partner, Afiliasi, Trainer Program — masing-masing
punya value proposition + form CTA berbeda). Layout harus tetap on-brand tapi minimalis, teks
panjang (privacy/terms) fokus keterbacaan bukan dekorasi.
```

---

### RONDE 2 — Halaman Publik bagian 2 + Auth

**Prompt 2.1 — Komunitas, Alumni, Portofolio Member**
```
Desain ulang 3 fitur sosial-bukti Hazl Academy: Komunitas (info WhatsApp/Discord + benefit),
Alumni (showcase alumni + achievement), Portofolio Member (grid karya member + halaman detail
1 karya). Ketiganya harus terasa "hidup"/komunitas nyata, bukan halaman marketing kaku. Gunakan
foto/avatar real sebagai fokus utama, bukan ikon.
```

**Prompt 2.2 — Blog & Marketplace/Clients**
```
Desain ulang blog (listing artikel + halaman detail artikel dengan format long-form yang nyaman
dibaca) dan halaman marketplace/clients (showcase partner/klien B2B). Blog detail perlu
typography yang serius untuk membaca panjang (max-width teks ~680px, line-height lega).
```

**Prompt 2.3 — Auth: Masuk, Daftar, Lupa/Reset Password, Verifikasi Email**
```
Desain ulang 5 halaman auth dalam SATU shell konsisten: card terpusat, logo di atas, form
minimal-distraksi. Reset/lupa password 2-step (input email → instruksi terkirim). Verifikasi
email dengan status jelas (menunggu / berhasil / gagal) dan CTA kirim ulang. Hindari ilustrasi
besar yang tidak perlu — fokus ke kecepatan mengisi form.
```

**Prompt 2.4 — Early Access, Berlangganan (Pricing Publik)**
```
Desain ulang landing early-access (waitlist form) dan halaman pricing/berlangganan publik
(perbandingan paket). Tabel pricing: 1 paket ditonjolkan (bukan dengan gradient card, cukup
border lebih tebal + label "Populer" kecil), sisanya flat & setara.
```

---

### RONDE 3 — Dashboard Student

**Prompt 3.1 — Dashboard Home & Kursus Saya**
```
Desain ulang dashboard utama student (ringkasan progress, kursus aktif, quick actions) dan
halaman "Kursus Saya" (grid/list kursus dengan progress bar). Ringkasan dashboard maksimal
3 angka besar (StatCard) — sisanya list, bukan kotak angka semua. Sidebar navigasi tetap
struktur yang sama (tidak diubah urutannya), hanya visual di-refresh.
```

**Prompt 3.2 — Sertifikat, E-Book Saya, Tiket Event**
```
Desain ulang 3 halaman koleksi milik student: Sertifikat (grid sertifikat + tombol download/
verify), E-Book Saya (grid e-book dibeli + baca/download), Tiket Event (list tiket dengan
QR/kode check-in). Konsisten satu pola "koleksi item milik user", beda hanya action button
per tipe.
```

**Prompt 3.3 — Pesanan (List & Detail), Profil**
```
Desain ulang halaman riwayat Pesanan (tabel/list transaksi + filter status) dan detail 1
pesanan (item dibeli + status pembayaran + invoice). Juga halaman Profil (edit data diri,
ganti password, avatar). Tabel harus scannable — status pakai badge soft-color, bukan warna
solid mencolok.
```

**Prompt 3.4 — Afiliasi & Berlangganan (dashboard, bukan publik)**
```
Desain ulang dashboard Afiliasi student (link referral, komisi, riwayat) dan halaman
Berlangganan aktif (status paket, tanggal perpanjangan, upgrade/cancel). Data komisi/uang
ditampilkan jelas tapi tidak berlebihan — angka penting besar, detail pendukung kecil.
```

---

### RONDE 4 — Admin & Trainer Hub bagian 1

**Prompt 4.1 — Admin Dashboard & Manajemen Pengguna**
```
Desain ulang Admin Dashboard (overview metrik platform — pendapatan, user baru, kursus aktif)
dan halaman Manajemen Pengguna (tabel user + filter role + modal tambah/edit user dengan
dropdown role). Dashboard admin: metrik utama di atas (maks 4 StatCard), grafik/tren di
bawahnya flat tanpa gradient background chart.
```

**Prompt 4.2 — Admin: Kursus, Blog, E-Book, Event (CRUD listing + form)**
```
Desain ulang 4 halaman manajemen konten admin (tabel list + modal/form create-edit) untuk:
Kursus, Blog, E-Book, Event (termasuk sub-halaman Event: buat baru, detail, peserta, check-in).
Satu pola tabel-admin yang konsisten dipakai di semua — kolom, aksi (edit/hapus/lihat), dan
pagination sama gayanya di seluruh admin.
```

**Prompt 4.3 — Admin: Transaksi, Kupon, Payout, Leads, Review**
```
Desain ulang 5 halaman admin operasional: Transaksi (tabel + detail + filter), Kupon (CRUD),
Payout ke trainer (approve/reject queue), Leads (daftar prospek), Review (moderasi ulasan).
Semua tabel data-berat ini harus scannable dengan whitespace baris cukup, bukan dijejalkan padat.
```

**Prompt 4.4 — Admin: Portofolio, LMS Portal Admin, Sistem Health**
```
Desain ulang admin Portofolio Member (CRUD entri portofolio), LMS Portal Admin (kelola tenant
LMS dan daftar tenant), dan Sistem Health (status server/DB/queue — dashboard monitoring
teknis). Sistem Health harus punya bahasa visual "status" yang jelas: hijau/kuning/merah
minimal, tanpa dekorasi berlebihan — ini halaman teknis, prioritaskan kejelasan.
```

---

### RONDE 5 — Trainer Hub & LMS Portal

**Prompt 5.1 — Trainer Hub: Dashboard, Kursus Saya, Profil, Ulasan**
```
Desain ulang Trainer Hub utama (ringkasan performa trainer), list Kursus Saya milik trainer,
halaman Profil trainer, dan halaman Ulasan (feedback dari student). Nuansa harus terasa beda
dari admin (lebih personal/creator-dashboard) meski pakai token warna & komponen yang sama.
```

**Prompt 5.2 — Trainer: Buat/Edit Kursus, Kurikulum**
```
Desain ulang alur pembuatan kursus oleh trainer: form buat kursus baru, halaman edit kursus,
dan builder kurikulum (susun modul & lesson). Builder kurikulum butuh interaksi drag-drop yang
jelas secara visual (drop zone, urutan, expand/collapse modul) — ini halaman kerja, bukan
showcase, jadi densitas informasi boleh lebih tinggi dari halaman publik.
```

**Prompt 5.3 — Trainer: Quiz Builder, Sertifikat Kursus, Siswa, Payout**
```
Desain ulang 4 sub-halaman kursus trainer: Quiz builder (tambah soal & pilihan jawaban),
Sertifikat kursus (template & pengaturan penerbitan otomatis), daftar Siswa terdaftar per
kursus, dan Payout trainer (riwayat pencairan dana). Quiz builder butuh pola form berulang
(soal 1, 2, 3...) yang rapi — gunakan card per soal, bukan form panjang tanpa pemisah.
```

**Prompt 5.4 — LMS Portal (Multi-tenant): Admin Tenant, Batch, Reports, Courses, Invite**
```
Desain ulang LMS Portal multi-tenant: dashboard admin tenant, manajemen batch peserta,
laporan (reports), manajemen kursus dalam tenant, pengaturan tenant, halaman sertifikat
tenant, dan halaman terima undangan (invite token). Ini produk B2B terpisah dari brand
konsumen Hazl — boleh terasa lebih "enterprise/serius" tapi tetap 1 sistem warna yang sama.
```

---

## 4. Setelah Stitch Selesai Generate

1. Owner konfirmasi hasil aset Stitch sudah masuk ke folder (`docs/design-system/stitch-output/`
   atau path lain yang owner tentukan saat itu).
2. Claude membaca aset per ronde, memetakan ke halaman kode yang sesuai (lihat mapping di §3),
   lalu menerapkan token warna baru (§2.1) ke `globals.css` lebih dulu — supaya semua halaman
   yang belum sempat disentuh manual pun otomatis ikut berubah warnanya.
3. Terapkan per kelompok halaman, urutan disarankan: Publik → Auth → Dashboard Student →
   Admin → Trainer Hub → LMS Portal (urutan risiko terendah ke tertinggi terhadap flow uang).
4. Setiap kelompok: build + typecheck setelah selesai, sebelum lanjut ke kelompok berikutnya.
5. Audit dead-end UI (tombol/link yang tidak terhubung ke apapun) dilakukan bersamaan saat
   menyentuh tiap halaman — dihapus dari tampilan, BUKAN dari backend/route.
