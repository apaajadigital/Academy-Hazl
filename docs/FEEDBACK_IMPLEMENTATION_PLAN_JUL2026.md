# Implementation Plan — Website Feedback (Beta), Jul 2026

> Sumber: `WEBSITE FEEDBACK .docx` (beta testing — fokus functionality/user flow/navigation, bukan visual).
> Disusun 21 Jul 2026 dari audit 3 arah: kode (`main`), dokumen perencanaan (SSOT/PHASE6), dan live jagoakademi.com.
> Aturan yang dihormati: feature-flag default OFF (BL-37 pattern), no fabricated social proof (BL-28), extend commerce core via itemType — jangan fork (ADR-0002 §2).

## Ringkasan feedback → kondisi saat ini

| # | Permintaan feedback | Kondisi saat ini | Gap |
|---|---|---|---|
| F1 | Private Class: tampilan paket profesional + checkout langsung | Tidak ada produk private class (hanya mockup statis `MentorConnect.tsx`); checkout mendukung course/ebook/event | Greenfield, tapi seluruh rel (checkout→DOKU→fulfillment→enrollment) sudah ada |
| F2 | Onboarding pasca-checkout (kontak admin, grup, mentor, jadwal) | Halaman `payment/success` 100% generik; email/WA service degrade-safe sudah ada | Butuh blok success per-tipe + template email/WA baru |
| F3 | Menu Alumni | Tidak ada (404). Reusable: Testimonial engine (moderated) + Blog | Butuh halaman + segmentasi testimonial "alumni"; aset menunggu BU |
| F4 | Menu Member Active Portfolio | Tidak ada (404). Tidak ada model portfolio | Paling greenfield; MVP = admin-managed |
| F5 | Menu Community (join CTA + form sukses) | Tidak ada halaman (404), TAPI flag `community` sudah ada (OFF) + LeadCaptureForm/CRM leads siap pakai | Termurah — landing + extend enum `source` |
| F6 | Checklist fungsional (no 404/500, CTA, form, responsive) | Semua link nav/footer existing = 200 ✅. Ditemukan 3 bug (lihat P0) | Perbaiki P0 + E2E |

## P0 — Bug live yang ditemukan audit (kerjakan duluan, ±½ hari)

1. **Form Contact rusak di produksi** — `ContactForm.tsx` mengirim `source:"contact"` (ditolak Zod enum `/api/leads`) dan field `notes` (schema minta `message`). Setiap submit user gagal 400. Fix: tambah `"contact"` ke enum `leads.ts` + ganti `notes`→`message` di client + regression test.
2. **Nomor WhatsApp placeholder** — `wa.me/6281234567890` hardcoded di `Footer.tsx:76` & `contact/page.tsx:29`. Ganti ke env `NEXT_PUBLIC_WA_NUMBER` (🖐️ butuh nomor asli dari owner).
3. **Soft-404 blog/event** — slug tak valid merender halaman kosong 200; harus `notFound()` (SEO + checklist beta).
4. (Verifikasi manual) handle sosmed footer belum dikonfirmasi milik BU.

## Phase A — Private Class MVP (F1+F2) — ±3–5 hari dev

**Keputusan arsitektur (per peta kode + ADR-0002): modelkan sebagai varian Course** — reuse `itemType:"course"`, `CourseEnrollment`, `liveZoomLink`/`liveSchedule`, checkout & webhook fulfillment TIDAK disentuh. (Alternatif itemType baru `private_class` ditolak: 5 titik edit + risiko "half-wired" seperti `subscription` sekarang.)

1. **Schema** (+migration): `Course.format String @default("regular")` (`regular|private_class`) + `Course.waGroupLink String?` + `Course.onboardingContact String?` (nomor admin). Index `[format, status]`.
2. **Halaman paket `/kelas-privat`**: clone layout tier dari `berlangganan/page.tsx` (sb-plan-card, badge "Paling Populer", checklist fitur, FAQ); data dari `GET /api/courses?format=private_class`; CTA → `/checkout/[slug]?type=course` yang sudah ada. Flag `NEXT_PUBLIC_FEATURE_PRIVATE_CLASS` (default OFF sampai konten siap).
3. **Onboarding pasca-bayar (F2)**:
   - `payment/success/page.tsx`: blok item-aware untuk private class — kontak admin (wa.me), langkah onboarding (konfirmasi data → join grup → kenalan mentor → jadwal).
   - Template email baru `private-class-welcome` (`emailService.ts` + router `jobs/processors/email.ts`) berisi kontak admin, link grup, mentor, jadwal.
   - WA notify (`whatsappService.ts`, degrade-safe): kirim link grup saat paid.
   - Hook di `webhook.ts` fulfillment: jika course.format=private_class → enqueue welcome email/WA.
4. **Tracking organik vs approach tim**: pakai rel yang sudah ada — kupon khusus per sales (kode unik) + `?ref=` affiliate capture; laporan dari `/admin/transaksi` filter kupon. Tanpa fitur baru.
5. **Admin**: kelola via `/admin/kursus` yang ada (+field format/grup di form edit); approval flow trainer tidak berlaku (admin-created).
6. **Test**: integration (courses?format filter, welcome-email enqueue), E2E checkout private class (sandbox), regression.

🖐️ Input dari BU: nama paket & harga tier, nomor admin onboarding, link grup WA, profil mentor, jadwal.

## Phase B — Alumni & Community (F3+F4+F5) — ±4–6 hari dev

Urutan dari termurah:

1. **Community (F5, ±1 hari)** — halaman `/komunitas` pakai `LandingTemplate` + `LeadCaptureForm`; extend `source` enum: `"community"` di 3 titik (`leads.ts` Zod, `LeadCaptureForm.tsx` union, `LandingTemplate.tsx` union — `Lead.source` DB sudah String bebas, tanpa migration). Success flow sudah ada (kartu "Terima kasih!"); opsional: tampilkan link grup WA setelah submit sukses. Nav item di-gate flag `community` yang SUDAH ada. CRM: masuk `/admin/leads` (filter source=community) — tracking rapi sesuai feedback.
2. **Alumni (F3, ±1,5–2 hari)** — extend `Testimonial`: `category String @default("general")` (`general|alumni`) + `outcome String?` (career outcome) — migration kecil; `GET /api/testimonials?category=alumni`; halaman `/alumni` (grid kartu: foto, nama, role/company, outcome, quote) + long-form success story via Blog category "alumni". Moderasi reuse admin testimonial. Flag `NEXT_PUBLIC_FEATURE_ALUMNI`. ⚠️ BL-28: tampilkan hanya data asli dari BU — section disembunyikan bila kosong (pola TestimonialsSection).
3. **Member Active Portfolio (F4, ±2 hari, MVP admin-managed)** — model baru `MemberPortfolio` (name, role, photoUrl, headline, portfolioItems Json [{title,url,imageUrl}], featured, status pending|approved, userId?) + CRUD admin (pola `modules/admin/ebooks.ts`) + halaman publik `/portofolio-member` + detail. Member-self-service ditunda ke Phase 6 (catat backlog). Flag `NEXT_PUBLIC_FEATURE_PORTFOLIO`.
4. **Navbar/Footer**: grup menu "Komunitas" (Alumni · Portofolio Member · Community) — tiap item muncul hanya bila flag ON, jadi tidak pernah ada link 404 di produksi.

🖐️ Input dari BU: aset alumni (foto/nama/outcome), data member portfolio, link/mekanisme join community (grup WA? Discord?).

## Phase C — QA checklist beta (F6) — ±1–2 hari

- Playwright E2E: alur join community (submit→sukses), alumni load, portfolio load, private class checkout (sandbox), contact form.
- Sweep responsive (viewport mobile) + console-error di halaman baru (checklist beta yang tak bisa diverifikasi curl).
- Re-run audit link nav/footer vs live pasca-deploy (skrip curl dari audit ini).
- Deploy per runbook (build web `--no-cache`, migrate deploy untuk 2 migration baru) + matriks verifikasi.

## Urutan eksekusi & estimasi total

```
P0 (½ hari) → A1..A6 (3–5 hari) ∥ B1 (1 hari) → B2 → B3 → B4 → C (1–2 hari)
```
Total ±7–10 hari kerja dev. P0 bisa langsung; A dan B1 bisa paralel (file tidak beririsan).

## Risiko & mitigasi

| Risiko | Mitigasi |
|---|---|
| Konten BU terlambat (aset alumni, harga, nomor WA) | Semua fitur di belakang flag OFF — kode bisa selesai & deploy tanpa tampil; nyalakan per-flag saat konten siap |
| Private class butuh refund/jadwal-ulang khusus | MVP pakai kebijakan refund existing; catat kebutuhan khusus ke backlog |
| Fake social proof (BL-28) | Section auto-hide bila data kosong; tidak ada angka member hardcoded |
| Regressi checkout | Tidak menyentuh checkout/webhook core kecuali 1 hook fulfillment ber-guard format; regression test wajib |

## Keputusan yang menunggu owner (🖐️)

1. Nomor WhatsApp resmi (P0 #2) + verifikasi handle sosmed.
2. Struktur paket & harga Private Class (berapa tier, benefit per tier).
3. Mekanisme join community: grup WA / Discord / lainnya + link.
4. Aset alumni & member portfolio dari BU.
5. Go untuk mulai eksekusi P0 + Phase A/B.
