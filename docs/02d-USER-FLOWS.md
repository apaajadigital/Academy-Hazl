# User Flow Diagrams — Jago Akademi
**Fase 2: Product Validation & UX Research**
Versi: 1.0 | Tanggal: Juni 2026

---

## Konvensi Diagram

```
[Halaman/Screen]    — tampilan yang dilihat user
(Aksi)              — hal yang dilakukan user
{Keputusan}         — percabangan kondisi
→                   — alur maju (happy path)
↩                   — alur kembali / error
✅                  — end state sukses
❌                  — end state gagal / error
```

---

## Flow 1: Registrasi & Verifikasi Email

**Persona:** Semua user baru
**Trigger:** User klik "Daftar Gratis" di homepage

```
[Homepage]
    (Klik "Daftar Gratis")
        ↓
[Halaman Daftar]
    (Isi Nama, Email, Password)
    {Atau klik "Daftar dengan Google"}
    ↓                           ↓
[Submit form]            [Google OAuth popup]
    ↓                           ↓
{Email sudah terdaftar?}        ↓
    ↓ YA              {Auth berhasil?}
    ↩ Error "Email sudah          ↓ YA      ↓ TIDAK
       digunakan. Login?"    ✅ Langsung   ❌ Error
                               ke Dashboard
    ↓ TIDAK
[Server kirim email verifikasi]
    ↓
[Halaman "Cek Email Anda"]
    (Buka email, klik link verifikasi)
    ↓
{Link masih valid? (24 jam)}
    ↓ YA                   ↓ TIDAK
[Redirect ke Dashboard]    [Halaman "Link Kadaluarsa"]
✅ Akun terverifikasi       (Klik "Kirim Ulang")
                                ↓
                           [Kirim email baru]
                                ↓
                           [Ulangi dari "Cek Email"]
```

**Happy Path:** 4 langkah (isi form → submit → cek email → klik verifikasi)
**Catatan UX:** Jika user langsung buka kursus tanpa verifikasi, boleh browse tapi tidak bisa beli — tampilkan banner "Verifikasi email Anda untuk mulai belajar"

---

## Flow 2: Login

**Persona:** User yang sudah punya akun
**Trigger:** User klik "Masuk" atau redirect dari halaman yang membutuhkan auth

```
[Halaman Masuk]
    (Isi Email + Password)
    {Atau klik "Masuk dengan Google"}
    ↓                                   ↓
{Kredensial benar?}              [Google OAuth]
    ↓ YA             ↓ TIDAK           ↓
{Ada redirect?}   Error "Email    ✅/❌
    ↓ YA     ↓ TIDAK  atau password
[Kembali ke    [Dashboard]  salah"
 halaman tujuan]     ↓         (Klik "Lupa Password?")
    ↓               ✅              ↓
    ✅                      [Halaman Lupa Password]
                                (Isi email)
                                     ↓
                            [Kirim link reset]
                                     ↓
                            [Email diterima]
                            (Klik link reset password)
                                     ↓
                            [Form password baru]
                            (Isi + konfirmasi)
                                     ↓
                            ✅ Password berhasil diganti
                            [Redirect ke Login]
```

---

## Flow 3: Cari & Beli Kursus (Happy Path)

**Persona:** Profesional muda (Rara) — pertama kali beli
**Trigger:** User ingin beli kursus Digital Marketing

```
[Homepage]
    (Klik "E-Course" di nav atau klik kategori)
        ↓
[Halaman Catalog /e-course]
    (Filter: Kategori = "Marketing Digital", Level = "Pemula")
        ↓
[Hasil filter — grid kursus]
    (Klik card kursus yang menarik)
        ↓
[Halaman Detail Kursus /e-course/[kategori]/[topik]]
    (Scroll: lihat silabus, profil trainer, review)
    (Tonton preview lesson gratis)
        ↓
{User sudah yakin?}
    ↓ YA                    ↓ TIDAK — scroll lebih, lihat review
(Klik "Beli Sekarang Rp 299.000")
    ↓
{Sudah login?}
    ↓ YA                    ↓ TIDAK
[Halaman Checkout]    [Redirect ke /masuk dengan redirect_url]
    ↓                        ↓ (setelah login)
    (Lihat ringkasan pesanan) [Halaman Checkout]
    (Masukkan kode kupon jika ada)        ↓
    (Pilih metode pembayaran: QRIS/GoPay/OVO/VA)
        ↓
{Metode bayar}
    ↓ QRIS/GoPay/OVO        ↓ Transfer VA
[Popup DOKU Snap]      [Tampilkan nomor VA + deadline]
    (Scan QR / konfirmasi di app e-wallet)
    ↓                              ↓
{Pembayaran berhasil?}      (Transfer dari bank)
    ↓ YA          ↓ TIDAK           ↓
[Halaman /payment/success]  ❌ Expired/Gagal
    ↓
[Notifikasi email + WA: "Kursus berhasil dibeli"]
    ↓
(Klik "Mulai Belajar Sekarang")
    ↓
[Halaman Belajar /belajar/[slug]]
✅ User bisa akses konten kursus
```

**Happy Path:** 6 langkah utama (catalog → detail → checkout → bayar → konfirmasi → belajar)
**Critical UX:** Jangan putus alur di payment — loading spinner yang jelas, polling status otomatis

---

## Flow 4: Pengalaman Belajar (Video Player)

**Persona:** Student yang sudah enroll
**Trigger:** User masuk ke kursus yang sudah dibeli

```
[Dashboard /dashboard/kursus]
    (Klik kursus yang sedang berjalan)
        ↓
[Halaman Kursus /belajar/[slug]]
    ↓
[Silabus sidebar terbuka]
    (Klik lesson yang ingin ditonton)
        ↓
[Video player — lesson terpilih]
    (Tonton video)
        ↓
{Video selesai? (>90% tonton)}
    ↓ YA                    ↓ TIDAK (user navigasi manual)
[Progress otomatis tersimpan]   [Progress tersimpan sebagian]
[Lesson ditandai ✅]
    ↓
{Ada quiz setelah lesson ini?}
    ↓ YA                    ↓ TIDAK
[Quiz muncul otomatis]     (Klik tombol "Pelajaran Berikutnya")
    (Jawab pertanyaan)           ↓
         ↓               [Lesson berikutnya mulai autoplay]
{Skor ≥ 70%?}
    ↓ YA          ↓ TIDAK
[Lanjut ke lesson] [Coba lagi — max 3x]
                        ↓ Gagal 3x
                   [Tampilkan penjelasan jawaban benar]
                   [Tetap bisa lanjut dengan notifikasi]
        ↓
{Semua lesson di section ini selesai?}
    ↓ YA
[Progress section = 100%]
    ↓
{Semua section selesai?}
    ↓ YA
[Completion page: "Selamat! Kamu telah menyelesaikan kursus ini 🎉"]
[Auto-generate sertifikat]
    ↓
[Tombol: "Download Sertifikat" | "Share ke LinkedIn" | "Kursus Terkait"]
✅ Flow selesai
```

---

## Flow 5: Daftar Event & Hadir

**Persona:** Profesional yang ingin networking
**Trigger:** User melihat event di homepage atau halaman event

```
[Halaman Event /event]
    (Browse event, klik event yang menarik)
        ↓
[Halaman Detail Event /event/[slug]]
    (Lihat informasi: tanggal, narasumber, topik, format)
        ↓
{Event berbayar atau gratis?}
    ↓ GRATIS                    ↓ BERBAYAR
(Klik "Daftar Gratis")      (Klik "Beli Tiket Rp 150.000")
    ↓                                ↓
{Sudah login?}                {Sudah login?}
    ↓ YA         ↓ TIDAK         ↓ YA         ↓ TIDAK
[Form daftar:   [Redirect     [Checkout]    [Redirect login]
 nama, email,    login]            ↓
 peran/jabatan]     ↓        [Proses bayar — sama seperti Flow 3]
    ↓           [Ulangi]          ↓
[Submit]                    {Bayar berhasil?}
    ↓                           ↓ YA
[Konfirmasi email            [Konfirmasi email tiket]
 + tiket digital QR]              ↓
    ↓
[Tiket tersimpan di /dashboard/tiket]
    ↓
[H-1 event: reminder email + WA otomatis]
    ↓
[Hari event: link Zoom / lokasi di email]
    ↓
[Hadir event]
    ↓
{Online event: join via link}   {Offline: tunjukkan QR tiket untuk check-in}
    ↓
{Event selesai}
    ↓
[Sertifikat kehadiran diterima via email]
✅ End state
```

---

## Flow 6: Menjadi Trainer

**Persona:** Dika (Digital Marketing Consultant)
**Trigger:** User klik "Jadi Trainer" di footer atau halaman /trainer-hub

```
[Halaman "Jadi Trainer" (landing page)]
    (Lihat benefit, komisi, testimoni trainer lain)
    (Klik "Mulai Jadi Trainer")
        ↓
{Sudah punya akun?}
    ↓ YA                    ↓ TIDAK
[Form Aplikasi Trainer]     [Daftar akun dulu → Flow 1 → kembali]
    ↓
[Isi form aplikasi:]
    - Nama lengkap
    - Bidang keahlian
    - Pengalaman kerja (tahun + perusahaan terakhir)
    - LinkedIn URL
    - Portofolio / website (opsional)
    - Topik kursus yang ingin dibuat
    - Unggah contoh materi (PDF/video singkat)
    ↓
[Submit aplikasi]
    ↓
[Email konfirmasi "Aplikasi diterima, review 3–5 hari kerja"]
    ↓
[Admin review aplikasi]
    ↓
{Disetujui?}
    ↓ YA                              ↓ TIDAK
[Email: "Selamat! Akun trainer aktif"]  [Email: feedback + ajak apply lagi]
[Role diupgrade ke 'trainer']
    ↓
[Welcome email dengan panduan upload kursus pertama]
    ↓
[Trainer Hub aktif /trainer-hub]
    (Klik "Buat Kursus Baru")
        ↓
[Course Builder]
    Step 1: Info dasar (judul, kategori, level, harga, thumbnail)
    Step 2: Kurikulum (tambah section, tambah lesson)
    Step 3: Upload video per lesson
    Step 4: Tambah quiz (opsional per lesson)
    Step 5: Setting (bahasa, syarat, sertifikat)
    Step 6: Preview & Submit untuk review
        ↓
[Admin review kursus]
    ↓
{Approved?}
    ↓ YA                    ↓ TIDAK (revisi)
[Kursus live di catalog]   [Email feedback + list revisi]
✅ Kursus bisa dibeli pelajar
```

---

## Flow 7: HR Manager Setup LMS B2B

**Persona:** Budi (HRGA Manager)
**Trigger:** Kontak sales Jago Akademi, atau langsung sign up dari landing page LMS

```
[Landing Page LMS /klien atau /lms-b2b]
    (Klik "Coba Gratis 14 Hari" atau "Hubungi Sales")
        ↓
{Langsung sign up atau via sales?}
    ↓ LANGSUNG                      ↓ VIA SALES
[Form Sign Up LMS:]              [Isi form kontak]
  - Nama perusahaan                     ↓
  - Email perusahaan              [Sales follow up call]
  - Nama PIC                           ↓
  - Jumlah karyawan               [Demo meeting]
  - Kebutuhan training                  ↓
    ↓                            [Setup tenant oleh tim Jago]
[Submit]                               ↓
    ↓                            [Email akses ke Admin LMS]
[Tenant workspace dibuat otomatis]
    ↓
[Email: "Workspace [Nama Perusahaan] siap!"]
[Berisi: URL portal (nama-perusahaan.lms.jagoakademi.com), username, password sementara]
    ↓
[Login ke Admin LMS /lms/[tenant]/admin]
    ↓
[Onboarding wizard (5 langkah):]
  1. Upload logo & atur warna branding
  2. Tambah karyawan (manual / import CSV)
  3. Buat batch/kelompok
  4. Pilih & assign kursus ke batch
  5. Kirim undangan ke karyawan
    ↓
[Karyawan terima email undangan]
    (Klik link → atur password → login ke portal)
        ↓
[Portal karyawan aktif]
    ↓
[Karyawan mulai belajar — Flow 4]
    ↓
[Admin LMS pantau progress di dashboard:]
  - Completion rate per batch
  - Progress per individu
  - Download laporan Excel
    ↓
[Laporan dikirim otomatis tiap Jumat ke email admin]
✅ LMS B2B berjalan penuh
```

---

## Flow 8: Mendapatkan & Berbagi Sertifikat

**Persona:** Rara (student yang menyelesaikan kursus)
**Trigger:** Completion rate kursus mencapai ≥ 80%

```
[Lesson terakhir selesai → completion rate 100%]
    ↓
[Halaman Completion "Selamat! 🎉"]
    ↓
[Sertifikat auto-generate:]
  - Nama pelajar
  - Judul kursus
  - Tanggal selesai
  - Nama trainer
  - Logo Jago Akademi
  - Kode unik + QR verifikasi
    ↓
[Tombol tersedia:]
  ├─ "Download PDF" → unduh file PDF
  ├─ "Share ke LinkedIn" → pre-filled post LinkedIn
  ├─ "Copy Link Sertifikat" → link verifikasi publik
  └─ "Bagikan ke WhatsApp" → deeplink WA dengan preview
    ↓
(User klik "Share ke LinkedIn")
    ↓
[Redirect ke LinkedIn dengan prefilled text:]
  "Saya baru saja menyelesaikan [Judul Kursus] di Jago Akademi!
   Verifikasi sertifikat: https://jagoakademi.com/sertifikat/[kode]"
    ↓
[LinkedIn post diterbitkan]
✅ End state — loop viral / social proof
```

---

## Flow 9: Refund Request

**Persona:** User tidak puas dengan kursus
**Trigger:** User klik "Minta Refund" di halaman pesanan

```
[Dashboard → Pesanan → Detail Pesanan]
    (Klik "Ajukan Pengembalian Dana")
        ↓
{Dalam periode garansi? (≤ 7 hari setelah beli)}
    ↓ YA                           ↓ TIDAK
[Form refund request:]         [Notifikasi "Periode refund
  - Alasan (dropdown)            sudah berakhir"
  - Penjelasan (textarea)        [Tawarkan: pindah ke kursus lain
  - Metode refund (saldo/rekening)]  atau hubungi CS]
    ↓
[Submit]
    ↓
[Email konfirmasi "Permintaan refund diterima, diproses 3–5 hari kerja"]
    ↓
[Admin review]
    ↓
{Approved?}
    ↓ YA                              ↓ TIDAK (fraud/tidak memenuhi syarat)
[Dana dikembalikan ke metode asal]    [Email: alasan penolakan + pilihan resolusi]
[Email konfirmasi refund berhasil]
[Akses kursus dicabut]
✅ End state
```

---

## Flow 10: Affiliate (Referral Program)

**Persona:** Student yang ingin dapat komisi
**Trigger:** User temukan program affiliate di dashboard

```
[Dashboard → Affiliate]
    ↓
{Sudah terdaftar affiliate?}
    ↓ TIDAK                    ↓ YA
[Halaman info affiliate:]  [Dashboard Affiliate:]
  - Komisi: 10% per sale      - Total komisi
  - Level 2: 5% dari referral - Link referral unik
  - Syarat: akun terverifikasi - Klik & konversi stats
    ↓                          - Riwayat komisi
(Klik "Daftar Affiliate")      - Tombol "Tarik Dana"
    ↓
[Isi data rekening bank / e-wallet]
    ↓
[Submit → Affiliate aktif]
    ↓
[Dapat link referral unik: jagoakademi.com?ref=USERNAME]
    (Bagikan ke teman, media sosial, dll)
        ↓
[Teman klik link → cookie tersimpan 30 hari]
    ↓
{Teman beli kursus dalam 30 hari?}
    ↓ YA                        ↓ TIDAK
[Komisi 10% masuk ke saldo affiliate]  [Cookie expired, tidak ada komisi]
    ↓
[Notifikasi: "Kamu dapat komisi Rp 29.900!"]
    ↓
[Saldo minimum Rp 100.000 untuk tarik]
    ↓
(Klik "Tarik Dana")
    ↓
[Pilih metode: transfer bank / e-wallet]
    ↓
[Proses 1–3 hari kerja]
✅ Dana diterima
```

---

## Flow Summary — Critical Path Matrix

| Flow | Langkah (happy path) | Kompleksitas | Priority |
|------|---------------------|-------------|---------|
| Registrasi email | 4 | Rendah | P0 |
| Login | 2 | Rendah | P0 |
| Cari & beli kursus | 6 | Sedang | P0 |
| Belajar & quiz | 5 | Sedang | P0 |
| Daftar event gratis | 3 | Rendah | P0 |
| Daftar event berbayar | 7 | Sedang | P0 |
| Menjadi trainer | 8 | Tinggi | P1 |
| Setup LMS B2B | 10 | Tinggi | P1 |
| Download sertifikat | 2 | Rendah | P0 |
| Share sertifikat | 3 | Rendah | P0 |
| Refund request | 5 | Sedang | P1 |
| Daftar affiliate | 4 | Rendah | P1 |

---

*User flows ini divalidasi dalam sesi usability test dan menjadi blueprint untuk wireframe + implementasi teknis.*

**Disusun oleh:** UX Designer + Product Manager
**Status:** Final
