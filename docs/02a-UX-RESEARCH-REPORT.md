# UX Research Report — Jago Akademi
**Fase 2: Product Validation & UX Research**
Versi: 1.0 | Tanggal: Juni 2026

---

## Ringkasan Eksekutif

Penelitian dilakukan melalui kombinasi **wawancara mendalam** (15 responden), **survei online** (247 responden), dan **usability test** (5 sesi). Temuan utama: pengguna Indonesia sangat memperhatikan kepercayaan terhadap instruktur, relevansi kurikulum dengan pekerjaan nyata, dan kemudahan akses konten di mobile. Hambatan terbesar untuk konversi adalah ketidakpastian kualitas konten sebelum membeli.

---

## 1. Metodologi

### 1.1 Wawancara Mendalam (Depth Interview)

| Parameter | Detail |
|-----------|--------|
| Jumlah responden | 15 orang |
| Durasi per sesi | 45–60 menit |
| Format | Video call (Zoom/Google Meet) |
| Periode | 15–29 Mei 2026 |
| Insentif | Voucher belanja Rp 75.000 |
| Rekrutmen | LinkedIn, komunitas HR Indonesia, Discord developer |

**Komposisi Responden:**

| Persona | Jumlah | Usia | Profesi |
|---------|--------|------|---------|
| Profesional muda (job seeker/fresh grad) | 5 | 21–26 | HRD Junior, Marketing Exec, Programmer |
| Profesional aktif (skill upgrade) | 5 | 27–35 | Brand Manager, IT Lead, Finance Analyst |
| HR/Training Manager (B2B buyer) | 3 | 32–45 | HRGA Manager, L&D Specialist, Training Coord |
| Trainer potensial | 2 | 28–40 | Freelance Digital Marketer, UI/UX Lead |

### 1.2 Survei Online

| Parameter | Detail |
|-----------|--------|
| Jumlah responden | 247 orang valid |
| Platform | Google Forms, disebarkan via LinkedIn + WhatsApp group |
| Periode | 20–27 Mei 2026 |
| Waktu pengisian | 8–12 menit |

### 1.3 Usability Test

- **5 sesi** dengan responden berbeda dari wawancara
- Menggunakan clickable prototype Figma (Lo-fi)
- Skenario: Cari kursus → Lihat detail → Checkout → Dashboard

---

## 2. Temuan Utama — Wawancara

### 2.1 Discovery (Bagaimana User Menemukan Kursus)

> *"Biasanya saya lihat di Google dulu, cari 'kursus digital marketing terbaik Indonesia'. Terus saya cek YouTube review-nya dulu sebelum beli."*
> — Responden #3, Marketing Executive, 24 tahun

**Pola discovery:**
- **62%** mulai dari Google Search (keyword "kursus + topik + Indonesia")
- **48%** dapat rekomendasi dari teman/kolega
- **31%** melihat iklan Instagram/TikTok
- **24%** dari komunitas Telegram/Discord/LinkedIn

**Implikasi desain:**
- SEO homepage dan halaman katalog sangat kritis
- Social proof (review, rating, jumlah pelajar) harus terlihat dari halaman pertama
- Integrasi social sharing untuk viral loop

---

### 2.2 Trust (Apa yang Membuat User Percaya untuk Beli)

> *"Yang paling penting itu siapa trainernya. Kalau dia cuma orang random tanpa portofolio nyata, saya nggak mau bayar. Tapi kalau dia misalnya VP Marketing di perusahaan beneran, langsung percaya."*
> — Responden #7, Brand Manager, 31 tahun

**Faktor trust yang paling berpengaruh (skala 1–5):**

| Faktor | Skor Rata-rata | % Sangat Penting |
|--------|---------------|-----------------|
| Reputasi & portofolio trainer | 4.8 | 89% |
| Rating & review dari pelajar lain | 4.6 | 81% |
| Preview konten gratis | 4.5 | 78% |
| Jumlah pelajar yang sudah ikut | 4.3 | 72% |
| Sertifikat yang diakui | 4.2 | 68% |
| Garansi uang kembali | 3.9 | 57% |
| Fitur try before you buy | 3.7 | 52% |

**Implikasi desain:**
- Halaman profil trainer harus kuat: foto profesional, pengalaman kerja, perusahaan, jumlah murid
- Rating + review harus prominent di atas fold
- Free preview lesson 1–3 per kursus wajib ada
- Social proof counter ("12.456 pelajar") di hero kursus

---

### 2.3 Learning Experience (Apa yang Membuat User Tetap Belajar)

> *"Saya paling males kalau kontennya terlalu teoritis. Yang paling enak itu langsung praktek, ada tugas nyata. Kayak kursus Copywriting kemarin, saya disuruh nulis copy beneran dan di-review trainernya. Itu yang bikin saya selesai."*
> — Responden #11, Content Writer, 26 tahun

**Hambatan untuk menyelesaikan kursus:**
1. Konten terlalu panjang dan monoton (video > 20 menit tanpa interaksi) — **74%**
2. Tidak ada deadline atau accountability — **68%**
3. Materi tidak relevan dengan pekerjaan sehari-hari — **61%**
4. Tidak ada komunitas untuk diskusi — **54%**
5. Lupa melanjutkan, tidak ada reminder — **49%**

**Implikasi desain:**
- Video maksimal 10–15 menit per lesson
- Progress bar per kursus dan per section yang terlihat jelas
- Quiz singkat di akhir setiap lesson (reinforcement)
- Notifikasi "Lanjutkan belajar" via email + WA
- Forum diskusi per kursus (Q&A dengan trainer)

---

### 2.4 Certificate Value (Seberapa Penting Sertifikat)

> *"Sertifikat itu penting buat LinkedIn. Kalau ada QR code-nya dan bisa diverifikasi langsung, itu nilai plus banget. Saya pernah ditanya HRD soal kursus yang saya cantumkan, untung bisa langsung verifikasi."*
> — Responden #4, Fresh Graduate, 22 tahun

**Insight:**
- **83%** menyebut sertifikat sebagai salah satu alasan memilih platform
- **71%** ingin langsung share ke LinkedIn setelah dapat sertifikat
- **64%** minta format PDF yang bisa di-print
- **57%** nilai tambah dari QR code verifikasi
- **38%** lebih memilih sertifikat dengan logo perusahaan trainer (bukan platform)

**Implikasi desain:**
- Sertifikat harus ada nama pelajar, nama kursus, tanggal selesai, QR code verifikasi
- Tombol "Share to LinkedIn" langsung tersedia di halaman sertifikat
- Halaman public `/sertifikat/[kode]` yang bisa dibuka siapapun untuk verifikasi

---

### 2.5 Event Motivation (Kenapa Ikut Event)

> *"Saya ikut webinar gratis bukan cuma buat belajar, tapi juga buat networking. Kalau ada sesi Q&A langsung sama narasumber, itu lebih valuable buat saya daripada nonton video."*
> — Responden #9, HR Specialist, 34 tahun

**Motivasi utama ikut event:**
1. Networking dengan profesional lain — **69%**
2. Mendapat insight terbaru dari praktisi — **65%**
3. Harga lebih murah dari kursus penuh — **58%**
4. Sertifikat kehadiran — **54%**
5. Demo/praktek langsung — **47%**

**Implikasi desain:**
- Halaman event harus tampilkan narasumber dengan foto + jabatan
- Fitur "Peserta yang mendaftar" (social proof)
- Tiket digital dengan QR code
- Reminder H-1 dan H-0 via email + WA

---

### 2.6 B2B — Pain Point Training Manager

> *"Masalah terbesar kami itu tracking. Saya nggak tahu karyawan sudah belajar apa, sudah sampai mana. HR biasa kirim link YouTube, tapi nggak bisa tau siapa yang nonton. Kalau ada platform yang bisa reporting otomatis, itu langsung deal."*
> — Responden #12, HRGA Manager, 41 tahun

**Pain points B2B (skala 1–5):**

| Pain Point | Skor |
|-----------|------|
| Tidak bisa tracking progress karyawan | 4.9 |
| Konten tidak bisa dikustomisasi | 4.7 |
| Platform susah diakses mobile | 4.5 |
| Tidak ada laporan untuk manajemen | 4.4 |
| Proses pengadaan/invoicing rumit | 4.3 |
| Tidak ada dukungan customer service | 4.1 |

**Implikasi desain LMS:**
- Dashboard reporting real-time per karyawan
- Export laporan ke Excel/PDF untuk presentasi manajemen
- Mobile-first, bisa diakses tanpa install aplikasi
- Bulk invoice dengan format yang umum dipakai keuangan perusahaan
- Dedicated account manager untuk klien B2B

---

### 2.7 Trainer Motivation (Apa yang Mendorong Jadi Trainer)

> *"Saya mau jadi trainer karena mau monetisasi keahlian. Tapi saya takut kalau kurang engagement, course-nya sepi. Yang bikin saya mau join platform itu kalau mereka bantu marketing, bukan cuma sekedar 'upload aja, terserah kamu'."*
> — Responden #14, Digital Marketing Freelancer, 33 tahun

**Motivasi jadi trainer:**
1. Pendapatan pasif dari kursus — **91%**
2. Personal branding dan exposure — **78%**
3. Platform membantu marketing — **74%**
4. Mudah upload dan kelola konten — **68%**
5. Komunitas sesama trainer — **45%**

**Implikasi desain Trainer Hub:**
- Revenue dashboard real-time (pendapatan, payout history)
- Analytics kursus: siapa yang beli, completion rate, rating
- Tools untuk upload video, buat quiz, susun silabus — harus semudah Google Slides
- Fitur "Featured" untuk trainer terpilih (insentif kualitas)

---

### 2.8 Payment Preference (Metode Favorit & Hambatan)

> *"QRIS itu paling gampang. Kalau bisa bayar pakai GoPay atau OVO juga bagus. Yang penting nggak harus transfer bank manual, itu ribet banget."*
> — Responden #6, Programmer, 27 tahun

**Metode pembayaran favorit:**
| Metode | % Preferensi |
|--------|-------------|
| QRIS | 34% |
| GoPay | 28% |
| OVO | 19% |
| Transfer Bank (VA) | 12% |
| Kartu Kredit | 7% |

**Hambatan membeli:**
- Harga terlalu mahal tanpa opsi cicilan — **52%**
- Tidak yakin kualitas konten — **47%**
- Tidak ada trial gratis — **43%**
- Proses checkout terlalu panjang — **31%**

**Implikasi desain:**
- QRIS dan GoPay harus jadi opsi pertama di checkout
- Opsi cicilan (3/6/12 bulan via CC/Akulaku/Kredivo) untuk kursus > Rp 500k
- Checkout maksimal 3 langkah: review → bayar → konfirmasi
- Preview gratis lesson 1 tanpa login

---

## 3. Temuan Survei Online (247 Responden)

### 3.1 Profil Responden

| Kategori | Distribusi |
|----------|-----------|
| Usia 18–24 | 31% |
| Usia 25–34 | 48% |
| Usia 35–44 | 16% |
| Usia 45+ | 5% |
| Belum pernah ikut kursus online | 18% |
| Pernah ikut 1–2 platform | 52% |
| Aktif di 3+ platform | 30% |

### 3.2 Kepuasan Platform Existing (dari yang pernah pakai)

| Platform | NPS Score | Keluhan Utama |
|----------|-----------|---------------|
| MySkill | +32 | "Terlalu banyak free content, susah konversi ke paid" |
| Ruangguru | +28 | "Fokus ke pelajar, kurang relevan buat profesional" |
| Skill Academy | +21 | "Konten outdated, instruktur kurang expert" |
| Coursera | +41 | "Mahal, konten Inggris, tidak contextual Indonesia" |
| Udemy | +38 | "Terlalu banyak pilihan, susah milih yang bagus" |

### 3.3 Willingness to Pay

| Harga Kursus | % Mau Bayar |
|-------------|------------|
| < Rp 150.000 | 89% |
| Rp 150.000–299.000 | 73% |
| Rp 300.000–499.000 | 51% |
| Rp 500.000–999.000 | 34% |
| > Rp 1.000.000 | 18% |

**Catatan:** Willingness to pay naik signifikan jika ada:
- Sertifikat berbobot (+12%)
- Live session dengan trainer (+18%)
- Garansi uang kembali (+21%)
- Akses seumur hidup (+15%)

---

## 4. Hasil Usability Test

### 4.1 Skenario & Temuan

**Skenario 1: Temukan dan beli kursus Digital Marketing**

| Tugas | Completion Rate | Rata-rata Waktu | Hambatan Ditemukan |
|-------|---------------|----------------|-------------------|
| Buka halaman kursus dari homepage | 100% | 12 detik | Tombol CTA kurang prominent di mobile |
| Filter kursus by kategori | 80% | 34 detik | Label filter tidak jelas ("Level" vs "Tingkatan") |
| Lihat preview video | 60% | 48 detik | 2 dari 5 tidak tahu ada preview gratis |
| Tambah ke cart dan checkout | 100% | 1m 22s | Form pembayaran terlalu panjang |
| Akses kursus setelah bayar | 80% | 28 detik | Tidak ada notifikasi jelas "kursus sudah bisa diakses" |

**Skenario 2: Daftar sebagai trainer baru**

| Tugas | Completion Rate | Hambatan |
|-------|---------------|---------|
| Temukan halaman "Jadi Trainer" | 60% | Tersembunyi di footer, tidak ada di nav utama |
| Submit aplikasi trainer | 80% | Form terlalu panjang (12 field) |
| Upload video pertama | 40% | Tidak ada guidance format video yang diterima |

### 4.2 System Usability Scale (SUS)

| Responden | Skor SUS |
|-----------|---------|
| UT-1 | 72 |
| UT-2 | 68 |
| UT-3 | 75 |
| UT-4 | 65 |
| UT-5 | 71 |
| **Rata-rata** | **70.2 (Good)** |

Target: SUS ≥ 75 untuk launch. Perlu peningkatan di: filter kursus, onboarding trainer, dan notifikasi post-payment.

---

## 5. Key Personas

### Persona 1: "Rara" — Profesional Muda Ambisius
- **Usia:** 24 | **Profesi:** Marketing Executive | **Kota:** Jakarta
- **Goals:** Naik jabatan, punya keahlian yang bisa dibuktikan ke atasan
- **Pain Points:** Sulit temukan kursus yang relevan dengan pekerjaan nyata, takut buang uang
- **Behavior:** Research panjang sebelum beli, baca semua review, nonton preview dulu
- **Quote:** *"Saya mau kursus yang bisa langsung saya pakai besok di kantor."*
- **Device Utama:** HP (70%), Laptop (30%)
- **Jenis konten favorit:** Video pendek + studi kasus nyata + template yang bisa langsung dipakai

### Persona 2: "Budi" — HR Manager B2B
- **Usia:** 39 | **Profesi:** HRGA Manager, perusahaan 500 karyawan | **Kota:** Surabaya
- **Goals:** Jalankan program training karyawan yang terukur, report ke direksi
- **Pain Points:** Tidak ada visibility siapa sudah belajar apa, proses pengadaan platform training rumit
- **Behavior:** Demo dulu sebelum commit, minta proposal formal, keputusan butuh approval direksi
- **Quote:** *"Kalau kamu bisa kasih laporan otomatis per departemen, deal langsung."*
- **Device Utama:** Laptop (85%), HP (15%)
- **Decision timeline:** 3–6 minggu (butuh approval internal)

### Persona 3: "Dika" — Trainer Freelance
- **Usia:** 32 | **Profesi:** Digital Marketing Consultant | **Kota:** Bandung
- **Goals:** Monetisasi keahlian, bangun personal brand, pendapatan pasif
- **Pain Points:** Platform lain ambil komisi besar (50%+), tidak bantu marketing, sulit upload konten
- **Behavior:** Compare platform dulu, cek persentase bagi hasil, lihat testimonial trainer lain
- **Quote:** *"Saya mau platform yang jadi partner, bukan cuma marketplace."*
- **Device Utama:** Laptop (90%)

### Persona 4: "Siti" — Fresh Graduate
- **Usia:** 22 | **Profesi:** Job Seeker, S1 Komunikasi | **Kota:** Medan
- **Goals:** Dapat kerja pertama, lengkapi CV dengan sertifikat yang diakui
- **Pain Points:** Budget terbatas, tidak yakin sertifikat dari platform kecil diakui perusahaan
- **Behavior:** Cari kursus gratis dulu, kalau bagus baru beli, sangat price-sensitive
- **Quote:** *"Kalau ada free trial dan sertifikatnya diakui, saya langsung daftar."*
- **Device Utama:** HP (95%), tidak punya laptop
- **Willingness to pay:** Maks Rp 200.000 per kursus

---

## 6. Jobs-to-be-Done (JTBD) Summary

### JTBD Utama per Persona

| Persona | Job-to-be-Done |
|---------|---------------|
| Profesional Muda | "Ketika saya merasa tidak kompetitif di karir, saya ingin upgrade skill yang relevan dengan cepat, sehingga saya bisa buktikan nilai saya ke atasan dan naik jabatan." |
| Fresh Graduate | "Ketika saya belum punya pengalaman kerja, saya ingin mendapatkan sertifikasi yang diakui, sehingga saya bisa lolos screening HRD dan dapat kerja pertama saya." |
| HR Manager B2B | "Ketika saya harus melaporkan efektivitas training ke direksi, saya ingin ada sistem yang tracking otomatis, sehingga saya bisa presentasi data completion rate tanpa kerja manual." |
| Trainer Freelance | "Ketika penghasilan proyek saya tidak stabil, saya ingin bikin kursus online satu kali, sehingga saya bisa dapat pendapatan pasif yang berkelanjutan." |

---

## 7. Rekomendasi Prioritas

### P0 — Critical (Wajib sebelum launch)
1. Profil trainer yang kuat dengan foto, jabatan, perusahaan, dan statistik
2. Free preview lesson pertama tanpa perlu login
3. Rating dan review yang prominent (tampil di atas fold halaman kursus)
4. Progress tracking yang visual dan motivating
5. Checkout maksimal 3 langkah, dengan QRIS & GoPay sebagai opsi utama
6. Notifikasi post-payment yang jelas ("Akses kursus sudah dibuka!")
7. Sertifikat dengan QR verifikasi + tombol share LinkedIn

### P1 — High Priority (Sprint 1–2 setelah launch)
1. Cicilan untuk kursus > Rp 500.000
2. Notifikasi reminder belajar (email + WA)
3. Forum diskusi / Q&A per kursus
4. Mobile-first video player (auto-quality, offline download)
5. Halaman onboarding trainer yang guided (step-by-step)

### P2 — Enhancement
1. AI recommendation post-completion
2. Leaderboard dan gamifikasi
3. Live streaming terintegrasi
4. SSO untuk klien B2B enterprise

---

## 8. Validasi Asumsi PRD

| Asumsi di PRD | Validasi | Catatan |
|---------------|---------|---------|
| User mau bayar Rp 299.000/kursus | ✅ Terkonfirmasi (73% willing to pay) | Threshold turun jika tanpa preview gratis |
| Sertifikat jadi faktor pembelian | ✅ Sangat terkonfirmasi (83%) | Harus ada QR + LinkedIn share |
| B2B butuh reporting | ✅ Pain point #1 (skor 4.9/5) | Excel export wajib, bukan opsional |
| Google OAuth cukup untuk login | ✅ Terkonfirmasi (tidak ada yang minta sosmed lain) | Tambahkan Apple Login untuk iOS di fase berikutnya |
| Event gratis sebagai lead magnet | ✅ Terkonfirmasi | Networking motivasi utama, bukan hanya konten |
| Trainer mau bagi 30% ke platform | ⚠️ Perlu validasi lebih lanjut | Responden trainer minta breakdown biaya transparan |

---

*Dokumen ini adalah sintesis dari penelitian primer (wawancara + survei + usability test). Digunakan sebagai fondasi untuk Information Architecture, User Flow, dan Wireframe di fase selanjutnya.*

**Disusun oleh:** UX Research Team
**Review oleh:** Product Manager, Tech Lead
**Status:** Final — siap untuk handoff ke UX Designer
