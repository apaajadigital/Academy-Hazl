# Academy Hazl — Business Flows

> Status: local validation in progress  
> Scope: clone Jago Akademi dengan brand Hazl Academy  
> Updated: 24 September 2026

Dokumen ini memetakan alur bisnis berdasarkan route dan modul yang ada di kode. Status `LIVE` berarti route dan modul tersedia di source/build; status tersebut belum menggantikan uji browser end-to-end.

## Ringkasan Alur

| Alur | Halaman utama | Route | Status | Ringkasan | Catatan |
|---|---|---|---|---|---|
| Kelas gratis → belajar → sertifikat | Kelas gratis, dashboard, LMS, sertifikat | `/kelas-gratis` → `/checkout/[slug]` → `/dashboard/kursus` → `/belajar/[slug]` → `/dashboard/sertifikat` | LIVE | Pengunjung menemukan kelas, mendaftar atau checkout, lalu belajar dan menerima sertifikat setelah memenuhi syarat. | Payment gateway masih perlu diuji di sandbox; jangan gunakan pembayaran nyata. |
| E-Course video | Katalog dan detail E-Course | `/e-course` → `/e-course/[kategori]/[topik]/[materi]` | LIVE | Materi video dan lesson tersedia melalui katalog E-Course. | Learning-path detail mengikuti flag `learningPath`; flag ini tidak termasuk tiga flag Hazl yang diaktifkan. |
| Event / seminar | Daftar dan detail event | `/event` → `/event/[slug]` | LIVE | Event mendukung format online, offline, atau hybrid; pendaftaran dan pembayaran mengikuti konfigurasi event. | Uji kuota, tiket, payment sandbox, dan link akses perlu dilakukan di browser. |
| Trainer Hub | Program trainer dan portal trainer | `/trainer-program` → `/trainer-hub` | LIVE | Trainer mengelola kursus, ulasan, dan payout melalui portal. | Approval dan payout belum tervalidasi tanpa uji akun lokal. |
| Afiliasi | Landing dan dashboard afiliasi | `/afiliasi` → `/dashboard/afiliasi` | LIVE | User memperoleh referral, lalu melihat order dan komisi. | Tracking referral dan settlement perlu diuji dengan data lokal. |
| Komunitas | Landing dan form pendaftaran | `/komunitas` → `POST /api/leads` | ON | User mengisi form; lead disimpan dan ditindaklanjuti admin melalui CRM. | Flag `NEXT_PUBLIC_FEATURE_COMMUNITY=true`. WhatsApp group hanya aktif jika URL HTTPS tersedia. |
| Alumni | Cerita alumni dan moderasi testimoni | `/alumni` → `POST /api/testimonials` → `/admin/review` | ON | User mengirim testimoni pending; admin memoderasi kategori alumni; approved tampil publik. | Data harus nyata dan consented. Empty state berarti belum ada testimoni approved. |
| Portofolio Member | Daftar, detail, dan admin CRUD | `/portofolio-member` → `/portofolio-member/[id]` → `/admin/portofolio` | ON | Admin menerbitkan portfolio; publik hanya melihat status published. | URL API sudah diperbaiki agar relatif melalui proxy Next.js. List/detail E2E lulus. |
| Kelas Privat | Halaman private class | `/kelas-privat` | OFF | Implementasi lama ditujukan untuk mentoring privat dan grup WhatsApp. | Tetap OFF; bukan jalur jualan video atau seminar. Route 404 sudah diverifikasi E2E. |

## Journey Detail

### Komunitas

1. User membuka `/komunitas`.
2. User mengisi form.
3. Web mengirim `POST /api/leads` dengan `source=community`.
4. API memvalidasi dan menyimpan lead.
5. Admin melakukan follow-up manual.

**Batasan:** belum ada membership otomatis atau dashboard anggota.

### Alumni

1. User terautentikasi mengirim testimoni melalui `POST /api/testimonials`.
2. Testimoni berstatus `pending`.
3. Admin membuka tab Testimoni di `/admin/review`.
4. Admin mengatur status, kategori `alumni`, outcome, dan featured.
5. Hanya testimoni approved kategori alumni yang tampil di `/alumni`.

**Batasan:** tidak boleh menggunakan data fiktif atau klaim tanpa persetujuan.

### Portofolio Member

1. Admin membuka `/admin/portofolio`.
2. Admin membuat atau mengubah portfolio.
3. Admin menerbitkan status `published`.
4. Publik mengambil data dari `GET /api/portfolios`.
5. User membuka detail `/portofolio-member/[id]`.
6. Draft atau data yang tidak ditemukan menghasilkan 404.

**Catatan teknis:** halaman list dan detail memakai `getApiBase()` agar request browser relatif dan melewati rewrite Next.js. Kasus list, detail, dan 404 sudah lulus E2E.

### E-Course Video

1. User membuka `/e-course`.
2. User memilih kategori, topik, dan materi.
3. User checkout bila course berbayar.
4. Setelah pembayaran berhasil, course muncul di dashboard.
5. User belajar melalui player; progress disimpan.
6. Sertifikat diterbitkan setelah syarat selesai.

### Event / Seminar

1. User membuka `/event` dan memilih event.
2. User membuka detail `/event/[slug]`.
3. User melihat jadwal, format, harga, dan kuota.
4. Event berbayar dilanjutkan ke checkout dan payment sandbox.
5. Sistem membuat registrasi/tiket.
6. Admin mengelola event dan peserta.

## Keputusan Produk Hazl Academy

- Komunitas, Alumni, dan Portofolio Member ON secara lokal.
- Kelas Privat tetap OFF.
- Materi video dijual melalui E-Course.
- Seminar/webinar dijual melalui Event.
- Tidak ada modul Jago yang dihapus.

## Status Validasi

- Web typecheck: PASS.
- Web production build: PASS.
- Web Vitest: PASS, 9 file / 142 test.
- Beta feature E2E: PASS, 7/7 (Kelas Privat kini diverifikasi 404 saat flag OFF; kontrak lama untuk 3 tier + WA konsul dihapus karena fitur itu tidak lagi aktif).
- Production public-fetch E2E: PASS, 22/22 (kasus katalog Kelas Privat dihapus dari matriks untuk alasan yang sama).
- API Vitest: 1.257/1.257 lulus setelah dua perbaikan bug lingkungan (lihat "Bug ditemukan dan diperbaiki saat audit browser" di bawah). Kegagalan paralel yang sempat muncul di file-file lain (`trainer-curriculum.test.ts`, `orders/cancel.test.ts`, `trainer-roster.test.ts`, `affiliate-subscription.test.ts`, `search.test.ts`) terbukti flaky akibat kontensi worker paralel — semuanya lulus 100% saat dijalankan terisolasi.
- Browser audit manual admin-input → publik: dilakukan langsung oleh pemilik project di browser sungguhan (bukan mock). Ditemukan dan diperbaiki dua bug pra-existing yang menghalangi login/audit (lihat bagian di bawah); setelah diperbaiki, server API+Web berjalan normal dan login admin berhasil.

## Bug Ditemukan dan Diperbaiki Saat Audit Browser

Ditemukan lewat pemakaian nyata (bukan mock), di luar cakupan perubahan branding Hazl, tapi diperbaiki karena menghalangi audit dan berdampak nyata ke pengguna:

1. **`z.coerce.boolean()` salah mengubah string `"false"` menjadi `true`** — di `apps/api/src/config/env.ts`, memengaruhi `COOKIE_SECURE`, `DOKU_IS_PRODUCTION`, `ENFORCE_EMAIL_VERIFICATION`. Root cause: `Boolean("false")` bernilai `true` di JavaScript, jadi env var yang secara eksplisit ditulis `"false"` malah dibaca sebagai `true`. Dampak nyata: akun baru yang mendaftar langsung diblokir login dengan pesan "Email belum diverifikasi" meskipun `ENFORCE_EMAIL_VERIFICATION="false"`. Diperbaiki dengan helper `zBooleanString()` yang mem-parsing literal string, bukan coercion JS. Berasal dari commit `bd838f7` (15 Juli 2026), sebelum sesi Hazl ini.
2. **`env.APP_VERSION ?? "1.0.0"` tidak fallback saat `.env` berisi string kosong** — di `apps/api/src/routes/health.ts`. `.env.example` sengaja mendokumentasikan `APP_VERSION=""` sebagai default, tapi `??` hanya fallback untuk `null`/`undefined`, bukan `""`. Diperbaiki dengan `||`.
3. **`key={val}` duplikat di grafik System Health** — di `apps/web/app/admin/sistem-health/Charts.tsx`. Saat semua nilai grid line bernilai `0` (kondisi wajar untuk instalasi baru tanpa data revenue historis), React menemukan banyak `<g key={0}>` bertabrakan. Diperbaiki dengan `key={i}` (index array, selalu unik).
