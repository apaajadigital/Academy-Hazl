# Event Route — Implementation Plan (Penyelesaian Temuan)

> **Tanggal:** 29 Jul 2026 · **Basis:** analisis route Event (graphify + 2 Explore agent, pembacaan kode live di `7f8896b`). · **Governance:** CLAUDE.md — no‑new‑feature Phase 1–4; satu task = satu branch/PR; tunggu reviewer. · **Backlog terkait:** BL‑58 … BL‑65 (`docs/BACKLOG.md`).

## 0. Ringkasan temuan

| # | Temuan | Tipe | Live sekarang? | Severity | BL |
|---|---|---|---|---|---|
| **E1** | `Event.totalSold` **tidak pernah di‑decrement** saat refund/cancel — hanya increment di `checkout.ts:77`, `:167`, `webhook.ts:96`; `orders.ts:260-263` hapus registrasi tanpa kembalikan kursi. Guard kuota `totalSold < quota` → **kursi bocor permanen**, event tampak penuh padahal kosong. | Bug data/uang | ✅ **YA** (aktif saat event berbayar/gratis dipakai) | 🔴 High | BL‑58 |
| **E2** | **Pagination admin event tak pernah muncul** — `admin/event/page.tsx:73` baca `body.data?.total`, backend kirim di `meta.total` (`modules/admin/events.ts:38`) → `total` selalu `0` → `<Pagination>` (L191) tak render. Halaman >20 event tak terjangkau. | Bug (kontrak API) | ✅ **YA** | 🟠 Medium | BL‑60a |
| **E3** | **Field admin tidak ada di DB** — UI mengharap `maxAttendees`, `registeredCount`, relasi `organizer` (`admin/event/page.tsx:33-36`); Prisma `Event` (`schema.prisma:668-693`) hanya punya `quota`/`totalSold`, tanpa organizer; query admin tanpa `include` → badge peserta `undefined`, `ProgressBar` tak pernah render, nama organizer kosong. | Kolom kosong / drift | ✅ **YA** | 🟠 Medium | BL‑60b |
| **E4** | **Event unggulan hilang saat filter tipe aktif** — `(public)/event/page.tsx:294-295` selalu keluarkan `featuredEvent` dari grid, tapi hero hanya dirender bila `!activeType` (L327) → klik Online/Offline/Hybrid ⇒ event unggulan lenyap dari hero **dan** grid. | Bug UI | ✅ **YA** | 🟡 Low | BL‑62a |
| **E5** | **`DELETE /api/events/admin/:id` tak menangani FK** — menghapus event yang punya registrasi ⇒ Prisma **P2003 mentah** lewat `next(err)` (500, bukan 409). Test hanya mencakup kasus "no registrations". | Error handling | ✅ YA (endpoint live, UI‑nya belum ada) | 🟡 Low | BL‑62b |
| **E6** | **Label tipe event tak konsisten** untuk kolom DB yang sama: publik `online\|offline\|hybrid` (`event/page.tsx:79-83`) vs admin `seminar\|webinar\|workshop\|bootcamp` (`admin/event/page.tsx:47-49`). Admin menampilkan label yang tak pernah cocok dengan nilai DB. | Data salah (tampilan) | ✅ **YA** | 🟠 Medium | BL‑60c |
| **E7** | **Token tidak seragam** — `admin/event/page.tsx:62` & `dashboard/tiket/page.tsx:61` pakai `getToken()` (tidak refresh‑aware); detail & checkout pakai `getValidToken()`. Sesi panjang ⇒ 401 senyap → daftar tampak kosong. | Bug intermiten | ✅ YA | 🟡 Low | BL‑60d |
| **E8** | **CRUD & check‑in admin tanpa UI** — backend punya `POST /admin` (`events.ts:160`), `DELETE /admin/:id` (`:215`), `GET /admin/:id/registrations` (`:229`), `POST /admin/checkin` (`:245`); frontend admin hanya list + PATCH status. Operasional on‑site tak bisa dijalankan. | Fitur belum jadi | ⚠️ Kosong | 🟠 Medium | BL‑61 |
| **E9** | **Notifikasi event hanya jalur gagal** — satu‑satunya email adalah `event-full-refund` (`jobs/types.ts:19` → `email.ts:43` → `emailService.ts:63`). Tak ada konfirmasi registrasi, **tak ada e‑ticket/QR** meski `ticketCode` sudah di‑generate, tak ada reminder H‑1; `whatsappService.ts` tak menyentuh event. | Fitur belum jadi | ⚠️ Kosong | 🟠 Medium | BL‑63c |
| **E10** | **Event tak terindeks Meilisearch** (`services/search/meilisearch.ts` & `routes/search.ts` nol referensi Event) dan **tak terhubung sertifikat** (`certificateService.ts` hanya course/enrollment) → peserta `attended` tak dapat sertifikat. | Fitur belum jadi | ⚠️ Kosong | 🟡 Low | BL‑63a/b |
| **E11** | **Arsitektur:** `routes/events.ts` tanpa service layer (impor hanya `prisma`/`authenticate`/`types`); RBAC hardcode `roles.includes("super_admin" as never)` **6×** alih‑alih `middleware/authorize.ts:4`; Zod hanya di `POST/PATCH /admin`; `modules/admin/events.ts:45` tanpa Zod. | Utang teknis | ✅ YA | 🟠 Medium | BL‑59 |
| **E12** | **Tipe `Event` terduplikasi 5×**; `packages/types/src/index.ts:31-45` usang & tak diimport frontend (`startAt`/`maxParticipants` vs Prisma `startDate`/`quota`). Tak ada `lib/api/events.ts` — 10 titik `fetch()` mentah, base URL bercampur. | Utang teknis | ✅ YA | 🟡 Low | BL‑64 |
| **E13** | **Gap test:** `GET /:slug/registration`, `GET /admin/:id/registrations`, seluruh `modules/admin/events.ts`, RBAC negatif, dan `DELETE` dengan registrasi **tak tertest**. E2E hanya 2 smoke (`events-blog.spec.ts` + sweep). | Coverage | — | 🟠 Medium | BL‑65 |

**Insight kunci:** yang benar‑benar **rusak dan tayang** hanya **E1–E7** — dan semuanya **bug fix**, bukan fitur baru, jadi boleh dikerjakan sekarang tanpa melanggar no‑new‑feature Phase 1–4. **E8–E10 kosong karena memang belum dibangun** (bukan bug liar) → epic pasca Soft Launch. **E11–E13 utang teknis** yang dicicil.

Berbeda dengan e‑course, Event **tidak punya feature flag sama sekali** — `/event`, link Navbar (`Navbar.tsx:27`), Footer (`Footer.tsx:10`), dan `CategoryGrid.tsx:15` selalu tampil tanpa gating. Jadi tak ada opsi "matikan dulu"; perbaikan harus lewat fix, bukan gate.

---

## 1. Keputusan strategis

| Opsi | Isi | Kapan |
|---|---|---|
| **A — Fix bug live** *(Rekomendasi, mulai sekarang)* | Perbaiki E1–E7. Semua bug fix murni; tak menambah permukaan fitur. E1 menyentuh jalur uang ⇒ reviewer‑gated. | Sekarang |
| **B — Lengkapi operasional Event** | Bangun E8 (UI admin CRUD + check‑in) & E9 (konfirmasi + e‑ticket). Fitur baru. | Pasca Soft Launch |
| **C — Integrasi & utang teknis** | E10 (search/sertifikat), E11 (service layer + `authorize()` + Zod), E12 (tipe), E13 (test). | Phase 5+, incremental |

Kerjakan **A → C(E13 menyusul tiap fix) → B**. Urutan ini menjaga aturan dependency SSOT §4.1: tak ada langkah yang menuntut fitur baru sebelum Soft Launch.

---

## FASE 1 — Fix bug live (Opsi A)

Branch: `fix/event-remediation`. Semua bug fix; wajib regression test per §9.8.

**Step 1 — E1: kembalikan kursi saat refund/cancel.** 🔴 **Prioritas tertinggi.**
- `routes/orders.ts:260-263` — di dalam transaksi yang sama dengan `eventRegistration.deleteMany`, decrement `Event.totalSold` sebanyak jumlah registrasi yang benar‑benar terhapus (pakai return `count`, bukan asumsi 1), dengan guard `totalSold > 0` agar tak pernah negatif.
- `jobs/processors/webhook.ts:100-110` — jalur `event_full`: pastikan **tidak** ada increment yang tertinggal saat refund dibuat (reservasi atomik `updateMany` di `:95-97` hanya berhasil bila `count > 0`, jadi verifikasi tak ada double‑count sebelum menambah decrement di sini).
- Pertimbangkan sumber kebenaran tunggal: `totalSold` bisa diturunkan dari `count(EventRegistration where status != 'cancelled')`. Bila diambil, buat script backfill sekali jalan untuk merekonsiliasi data yang sudah bocor.
- Dep: — · **M** · **Reviewer‑gated** (jalur uang, §9.6). Regression test: refund event ⇒ `totalSold` turun; kursi bisa dibeli lagi; tak pernah negatif.

**Step 2 — E2: baca `meta.total`.** `apps/web/app/admin/event/page.tsx:73`.
- Ganti `body.data?.total` → `body.meta?.total ?? 0` (bentuk envelope `{success,data,error,meta}` per `apps/api/src/types/index.ts:34-40`).
- Dep: — · **S**. Checklist: daftar >20 event menampilkan pagination dan halaman 2 memuat data.

**Step 3 — E3: petakan field ke kolom yang benar‑benar ada.** `admin/event/page.tsx:33-36`, `:131-187`.
- Ganti `maxAttendees` → `quota`, `registeredCount` → `totalSold`; hitung `regRate = quota ? totalSold / quota : null`. Hapus `organizer` dari tipe & tampilan (tak ada relasinya di schema) — **jangan** menambah kolom DB baru di fase ini.
- Dep: — · **S**. Checklist: badge peserta & `ProgressBar` tampil untuk event ber‑`quota`; event tanpa quota tampil "tanpa batas", bukan `NaN`/`undefined`.

**Step 4 — E6: satukan sumber label tipe.**
- Buat satu konstanta bersama (mis. `apps/web/lib/event-labels.ts`) berisi `online|offline|hybrid` sesuai `schema.prisma:668-693` + `eventSchema` (`routes/events.ts:117-134`); konsumsi di publik **dan** admin. Hapus enum `seminar|webinar|workshop|bootcamp` dari admin.
- Dep: — · **S**. Checklist: label admin cocok dengan nilai DB untuk seluruh seed (`prisma/seed.ts:216-264`).

**Step 5 — E4: jangan buang event unggulan saat filter aktif.** `(public)/event/page.tsx:294-295`.
- Keluarkan `featuredEvent` dari `regularEvents` **hanya** bila hero benar‑benar dirender (`!activeType`); selain itu tampilkan apa adanya di grid.
- Dep: — · **S**. Checklist: `/event?type=online` menampilkan event unggulan bertipe online di grid.

**Step 6 — E7: seragamkan token.** `admin/event/page.tsx:62`, `dashboard/tiket/page.tsx:61`.
- Ganti `getToken()` → `getValidToken()` (refresh‑aware, `apps/web/lib/auth/token.ts`), samakan dengan detail/checkout. Tambah penanganan 401 → arahkan ke `/masuk` alih‑alih daftar kosong senyap.
- Dep: — · **S**.

**Step 7 — E5: `DELETE` yang punya registrasi → 409, bukan 500.** `routes/events.ts:215`.
- Cek `eventRegistration.count({ where: { eventId } })` lebih dulu; bila > 0 kembalikan `409` + `errorResponse` yang menjelaskan (arahkan admin membatalkan event, bukan menghapus). Jangan cascade‑delete registrasi berbayar.
- Dep: — · **S**. Regression test: DELETE dengan registrasi ⇒ 409, event tetap ada.

**Step 8 — Validasi Fase 1.** Per §9.11: `npx tsc --noEmit` + ESLint `--max-warnings 0` + `npm run test` (API) + `npm run build` (web). Tambah regression test Step 1 & 7 ke suite. Commit atomik per step dengan referensi BL, satu PR, **tunggu reviewer** (Step 1 menyentuh jalur uang).

---

## FASE 2 — Tutup gap coverage (bagian dari Opsi C, jalan bareng Fase 1)

**Step 9 — Test endpoint yang belum tertutup.** `apps/api/test/integration/events/`.
- `GET /api/events/:slug/registration` (`events.ts:70`), `GET /api/events/admin/:id/registrations` (`:229`), seluruh `modules/admin/events.ts` (list + PATCH), dan **RBAC negatif**: non‑super‑admin ke tiap endpoint `/admin/*` ⇒ 403.
- Dep: — · **M**. Naikkan ratchet threshold vitest setelah coverage naik (jangan pernah turunkan) — selaras BL‑11.

**Step 10 — E2E happy‑path.** `apps/web/e2e/`.
- Registrasi event **gratis**: `/event` → detail → daftar → muncul di `/dashboard/tiket`. Tambah mock event ke `e2e/mock-utils.ts` (saat ini tak ada).
- Dep: 9 · **M** · jalankan dengan server bersih (catatan: hindari stale server/:3004 seperti insiden E2E sebelumnya).

---

## FASE 3 — Utang teknis (Opsi C lanjutan, Phase 5+)

**Step 11 — E11: service layer + RBAC + Zod.**
- Ekstrak logika Prisma dari `routes/events.ts` ke `services/event/eventService.ts` (pola `services/course/courseService.ts`); route jadi tipis, service tanpa `req/res` (§9.6).
- Ganti 6× cek role inline dengan `authorize()` (`middleware/authorize.ts:4`). Pertimbangkan role `event_participant` yang sudah terdaftar di `types/index.ts:5` tapi tak dipakai.
- Tambah Zod untuk `req.query` (`GET /`), `req.params`, dan `POST /admin/checkin`; tambahkan schema untuk `PATCH` di `modules/admin/events.ts:45`. Selaras BL‑12.
- **M–L** · dilakukan setelah Fase 1 agar diff bug fix tetap kecil dan mudah direview.

**Step 12 — E12: satukan tipe & API client.**
- Perbaiki `packages/types/src/index.ts:31-45` agar cocok dengan `schema.prisma` (`startDate`/`endDate`/`quota`/`coverUrl`, `type: online|offline|hybrid`), tambah `EventRegistration`, lalu konsumsi dari 5 titik yang kini punya tipe lokal. Buat `apps/web/lib/api/events.ts` sebagai satu‑satunya pemanggil endpoint event.
- Bergantung pada BL‑13 (wiring `@repo/types`) · **M**.

---

## FASE 4 — Fitur baru (Opsi B) — pasca Soft Launch

> Fitur baru → **hanya setelah Soft Launch** (CLAUDE.md §d.3). Masuk backlog sebagai epik.

**Step A — E9: notifikasi sukses + e‑ticket.** Prioritas tertinggi di fase ini — konfirmasi registrasi adalah ekspektasi dasar peserta. Tambah `sendEventRegistrationConfirmed` ke `emailService.ts` + job type baru di `jobs/types.ts`, sertakan `ticketCode` (QR) yang sudah tersedia di `EventRegistration`. Reminder H‑1 lewat BullMQ scheduled job. Pola degrade‑safe sama seperti email lain (BL‑31): aktif otomatis begitu `RESEND_API_KEY` terpasang.

**Step B — E8: UI admin event.** Form create/edit (endpoint `POST /admin` + `PATCH /admin/:id` sudah ada), tabel registrasi (`GET /admin/:id/registrations`), layar check‑in scan `ticketCode` (`POST /admin/checkin`). Tak butuh perubahan backend — murni frontend.

**Step C — E10: indeks Meilisearch.** Ikuti pola `enqueueSearchIndex` (`jobs/queues.ts:109`) agar Event ikut terindeks & muncul di pencarian global.

**Step D — E10b: sertifikat peserta.** Butuh **keputusan produk** dulu (apakah event bersertifikat). Bila ya, perluas `certificateService.ts` untuk sumber `EventRegistration.status = "attended"`.

**Step E — Pertimbangkan feature flag Event.** Saat ini Event tak punya flag di kedua sisi. Bila fitur di atas dirilis bertahap, tambahkan key `event` ke `apps/web/lib/features.ts` + `requireFeature()` sisi API (BL‑37) agar bisa dimatikan server‑side tanpa rebuild.

---

## 2. Definisi Done

- **Fase 1:** `totalSold` konsisten setelah refund (dengan regression test + backfill bila perlu); pagination admin berfungsi; nol field fiktif di UI admin; label tipe seragam dengan DB; event unggulan tak hilang saat filter; DELETE bermuatan registrasi ⇒ 409; token seragam. `tsc`/ESLint/test/build hijau; PR menunggu reviewer.
- **Fase 2:** endpoint & RBAC negatif tertutup test; E2E registrasi gratis hijau; threshold vitest dinaikkan.
- **Fase 3:** `routes/events.ts` tipis (business logic di service), nol `roles.includes(... as never)`, Zod di semua boundary Event, satu definisi tipe.
- **Fase 4 (epic):** konfirmasi + e‑ticket terkirim, UI admin operasional, Event terindeks pencarian.

## 3. Batasan & governance

- Fase 1–3 = **bug fix + refactor + test**, bukan fitur baru → boleh dikerjakan selama Phase 1–4.
- Fase 4 = fitur baru → **pasca Soft Launch** (CLAUDE.md §d.3).
- **Step 1 (E1) menyentuh jalur uang/refund** → siapkan diff + runbook, **minta konfirmasi reviewer** sebelum merge (§9.6). Backfill data produksi = aksi sensitif, jangan dieksekusi sendiri.
- Satu task = satu branch/PR, commit atomik referensi BL‑ID; dokumentasi diperbarui dalam PR yang sama (§9.10).

## 4. Catatan cakupan

Plan ini menyelesaikan temuan **route Event** saja. Temuan sudah dicatat sebagai BL‑58…BL‑65 di `docs/BACKLOG.md`. Analisis memakai pembacaan kode live di `7f8896b`; knowledge graph (`graphify-out/`) dibangun di `c838557` sehingga topologinya sedikit tertinggal — jalankan `/graphify . --update` bila ingin graph selaras sebelum audit berikutnya.
