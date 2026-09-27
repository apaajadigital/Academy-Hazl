# Hazl Academy — UI Redesign berdasarkan Stitch Design System (Spec)

## 1. Latar belakang & sumber kebenaran

Redesign visual/UX menyeluruh untuk seluruh 94 halaman `apps/web`, TANPA mengubah
backend/API/database/business logic/route/auth/payment flow — kontrak
**presentation-only**, sama seperti yang tertulis di
`HaluanITCore/Jago-Akademi-Website1/docs/design-system/HAZL_REDESIGN_BRIEF.md` §5.

**Sumber desain final (baseline), sesuai keputusan pemilik produk:**
- **Struktur, layout, tipografi, dan token warna** → 68 file render Stitch
  (PNG+HTML) di `HaluanITCore/Jago-Akademi-Website1/docs/design-system/stitch-output/`,
  hasil generate MCP Stitch (Antigravity IDE) dari 21 prompt di
  `HAZL_REDESIGN_BRIEF.md` (1 master + 20 ronde), status SUCCESS 100%
  (`RUNNER_LOG.md`). Ini yang dipakai apa adanya untuk warna/tipografi/tata letak.
- **Nuansa "flat/minimal" diperkuat** dari audit
  `HAZL Academy/docs/design-system/design-system-hazl-creators-ui-v2.md`
  (scrape browser dari prototype live `hazl-creators-ui.vercel.app`): TIDAK
  ambil warna/font dari sini (token di sana sendiri catatannya tidak stabil
  antar-cascade), HANYA ambil 3 aturan yang justru menguatkan prinsip
  anti-slop yang sudah ada di brief Stitch: (a) card TANPA shadow default,
  shadow hanya saat hover, (b) TIDAK ada ikon-dalam-lingkaran-gradient, ikon
  polos + warna teks/brand tunggal, (c) foto/konten real jadi fokus visual
  card produk, bukan ikon dekoratif.

**Visual yang sudah diverifikasi langsung (bukan hanya baca teks prompt)**:
0-master (design system foundation), 1.1-homepage, 1.2-katalog, 1.2-detail,
1.3-checkout, 1.3-payment-pending, 2.3-auth, 3.1-dashboard, 4.1-admin-dashboard,
4.2-admin-kursus (list+modal CRUD), 4.4-sistem-health, 5.1-trainer-dashboard,
5.2-trainer-builder-kurikulum, 5.4-lms-tenant-dashboard.

## 2. Yang TIDAK berubah (hard constraint)

- Semua route/path URL tetap sama persis.
- Semua pemanggilan API, hook data-fetching, business logic tetap sama.
- Auth flow, payment flow (Duitku), role-gating tetap sama.
- `packages/brand` (`@repo/brand`, belum usable — cuma `dist/` tanpa source)
  TIDAK dijadikan fondasi. `@repo/ui` (terpasang tak dipakai) TIDAK dipakai
  sebagai sumber baru. Sumber primitive UI tetap `apps/web/components/ui`.
- Setiap kelompok halaman: **build + typecheck harus hijau** sebelum dianggap
  selesai (per `HAZL_REDESIGN_BRIEF.md` §4.4).

## 3. Keputusan yang sudah dikunci pemilik produk

1. **Baseline desain**: gabungan struktur/warna Stitch (68 render) + nuansa
   flat dari audit v2 (lihat §1).
2. **Cakupan**: SEMUA 94 halaman diredesign sekarang, TERMASUK 4 halaman yang
   saat ini 404 karena feature flag OFF (alumni, kelas-privat, komunitas,
   portofolio-member) — disiapkan visualnya untuk saat flag dinyalakan nanti.
3. **Bug LMS sidebar-dobel**: `/lms/[tenantSlug]/admin/**` mewarisi DUA layout
   (`lms/[tenantSlug]/layout.tsx` yang render `PortalSidebar` DAN
   `lms/[tenantSlug]/admin/layout.tsx` yang render sidebar admin sendiri) —
   diperbaiki SEBAGAI BAGIAN dari pekerjaan ini (bukan murni visual, tapi
   terkait langsung karena reskin LMS admin tidak boleh reskin dua shell
   yang tumpang-tindih).
4. **Gap metode pembayaran**: desain Stitch checkout/payment-pending
   menampilkan QRIS + VA + Kartu Kredit, backend Duitku baru implementasi
   VA BCA. Ditampilkan APA ADANYA sesuai desain, opsi selain VA di-disable
   (non-clickable) dengan badge "Segera Hadir" — tidak disembunyikan.
5. **Approach eksekusi**: token+primitive+bugfix dulu (blocking, sekuensial),
   lalu fan-out ke 6 worktree paralel per kelompok halaman.

## 4. Token desain final

Diambil APA ADANYA dari `HAZL_REDESIGN_BRIEF.md` §2.1–§2.3 (sudah dipakai di
semua 68 render Stitch, jadi ini bukan token baru, ini transkripsi dari yang
sudah divalidasi visual):

```css
/* Warna brand (2 warna + netral, TANPA ungu) */
--hazl-blue: #36BDF2;
--hazl-blue-strong: #0077A8;
--hazl-pink: #FF2F86;
--hazl-pink-strong: #CC0052;
--surface-page: #F6F7F9;
--surface-card: #FFFFFF;
--text-primary: #16181D;
--text-secondary: #5B616E;
--border: #E7E9EC;
--border-strong: #D1D1D6; /* turunan, konsisten skala existing */
--hazl-gradient: linear-gradient(120deg, #36BDF2 0%, #FF2F86 100%); /* MAX 1x/halaman */

/* Tipografi — TIDAK ganti font (Plus Jakarta Sans heading, Inter body sudah ada) */
H1: 40–56px / extrabold / letter-spacing -2%
H2: 28–32px / bold
Body: 16px / regular / line-height 1.6
Eyebrow/label: 12px / semibold / uppercase / letter-spacing 8%

/* Shape & elevation — diperkuat nuansa flat dari audit v2 */
Card: border 1px solid var(--border), radius 12px, shadow: none by default,
      shadow HANYA muncul saat :hover (micro-interaction halus, bukan dekorasi).
Button pill (rounded-full): HANYA di halaman publik/marketing.
Button radius-sedang (bukan pill): DI DALAM produk (dashboard/admin/trainer/LMS).
Badge status: pill kecil, latar soft (10% opacity warna status) + teks solid
              warna sama — TIDAK pernah latar warna solid penuh.
Icon: polos (outline/Lucide, yang sudah dipakai), warna teks/brand tunggal,
      TANPA background lingkaran gradient. Kontainer ikon (kalau perlu untuk
      kontras) pakai solid 1 warna atau soft-background 8-10%, tidak gradient.
```

**Mapping ke file existing** (bukan token baru dari nol — reskin nilai di
tempat yang sudah ada):
- `apps/web/app/globals.css` — ganti nilai `--brand-cyan*`, `--brand-pink*`,
  HAPUS `--brand-purple` dan semua pemakaiannya; ganti `--shadow-e1..e4` jadi
  "shadow hanya saat hover", hapus alias `--shadow-glow-*` yang masih dipakai
  (6 file: `VideoPlayer.tsx`, `about/page.tsx`, `alumni/page.tsx`,
  `event/page.tsx`, `kelas-privat/page.tsx`, dashboard ebook/kursus/pesanan-detail/
  profil/sertifikat, `ECourseHero.tsx`, `CertificatePreview.tsx`,
  `SubscriptionLock.tsx`, `HeroSection.tsx`, `Navbar.tsx`, `Modal.tsx`).
- `apps/web/tailwind-legacy.config.ts` — sama, ganti nilai palette/gradient/
  shadow di config, JANGAN rename file (biar tidak ada broken `@config` import).
- `apps/web/components/ui/*` — reskin `Button`, `Card`, `Badge`, `StatCard`,
  `Input`, `Select`, `Textarea`, `Modal`, `Table`, `Tabs`, `Pagination`,
  `Avatar`, `PageHeader`, `FilterBar`, `EmptyState`, `QuickActionCard`,
  `ProgressBar`, `TableActionButton`, `Section`/`SectionHeader` — reskin
  DI DALAM komponennya, API/props TIDAK berubah (supaya 94 halaman consumer
  tidak perlu diedit satu-satu untuk primitive-level changes).
- `StatCard`: DEFAULT icon tile jadi solid 1 warna / soft-bg, bukan gradient
  circle (dipakai 13 halaman — 1 perbaikan di sini beresonansi ke semua).

## 5. Peta halaman → kelompok kerja (6 worktree paralel, Fase 3)

| Kelompok | Cakupan route | Referensi Stitch utama |
|---|---|---|
| **Publik** | 30 halaman `(public)/*` KECUALI checkout/payment (lihat kelompok Checkout) | 1.1, 1.2, 1.4, 2.1, 2.2, 2.4 |
| **Checkout & Auth** | checkout/[slug] + payment/{success,pending,failed}, 6 halaman `(auth)/*` + `/auth/callback` | 1.3, 2.3 |
| **Dashboard Student** | 10 halaman `/dashboard/*` | 3.1, 3.2, 3.3, 3.4 |
| **Admin** | 19 halaman `/admin/*` | 4.1, 4.2, 4.3, 4.4 |
| **Trainer Hub** | 12 halaman `/trainer-hub/*` (quiz builder & kurikulum builder = kerja terberat) | 5.1, 5.2, 5.3 |
| **LMS B2B Portal** | 10 halaman `/lms/*` + `/lms/invite/[token]` — DIKERJAKAN SETELAH bugfix sidebar-dobel (Fase 2) selesai | 5.4 |

Halaman flag-OFF (alumni, kelas-privat, komunitas, portofolio-member) masuk
ke kelompok **Publik** — direskin sama seperti halaman publik lain, tanpa
perlu menyalakan flag untuk mengerjakannya (kode + `layout.tsx` gate tetap
ada, hanya visual di dalamnya yang diganti).

Route pendukung (`/belajar/[slug]/[lessonId]` video player, `/pesanan/[orderId]`
redirect) masuk kelompok **Dashboard Student** (player) dan tidak perlu
disentuh (redirect murni) secara berurutan.

## 6. Urutan eksekusi

**Fase 1 (blocking, sekuensial, 1 agent)** — Token + Primitive:
1. `globals.css` + `tailwind-legacy.config.ts`: reskin token warna/shadow,
   hapus ungu.
2. Reskin primitive di `components/ui/*` satu per satu (Button dulu — paling
   banyak dipakai — lalu Card, Badge, StatCard, sisanya).
3. Build + typecheck web harus hijau.
4. Screenshot 2-3 halaman acak (homepage, dashboard, admin) untuk verifikasi
   visual token sudah merambat dengan benar sebelum lanjut.

**Fase 2 (blocking, sekuensial, 1 agent)** — Bugfix struktural LMS:
1. Screenshot `/lms/[demo-tenant]/admin` di localhost untuk KONFIRMASI bug
   sidebar-dobel benar terjadi (bukan asumsi dari baca kode saja).
2. Kalau terkonfirmasi: putuskan SATU shell yang dipakai untuk
   `/lms/[tenantSlug]/admin/**` (kandidat: admin layout jadi satu-satunya
   pemilik sidebar untuk sub-route itu; portal layout parent tetap render
   branding/trial-banner tapi TIDAK render `PortalSidebar` ganda saat child
   route adalah admin — detail teknis diputuskan agent saat implementasi,
   dengan tes visual before/after).
3. Build + typecheck hijau sebelum lanjut Fase 3.

**Fase 3 (paralel, 6 worktree, via git worktree + subagent per kelompok)**:
Setiap agent bekerja HANYA di file-file kelompoknya sendiri (non-overlapping,
kecuali shared primitive yang sudah selesai di Fase 1 — TIDAK diedit lagi di
Fase 3, hanya dikonsumsi). Setiap agent:
1. Baca ulang render Stitch relevan untuk kelompoknya (PNG, dilihat langsung).
2. Reskin halaman per halaman di kelompoknya mengikuti render tsb + token
   Fase 1 (sudah otomatis ter-apply lewat primitive, tinggal sesuaikan layout
   lokal & hapus gradient/shadow/icon-circle sisa yang page-local).
3. Build + typecheck kelompoknya sendiri hijau.
4. Screenshot sampel 2-3 halaman kelompoknya untuk laporan akhir.
5. Lapor ke lead (SendMessage) saat selesai — TIDAK auto-merge, lead yang
   merge worktree setelah semua 6 agent selesai + smoke-check gabungan.

**Fase 4 (blocking, sekuensial, lead)** — Integrasi akhir:
1. Merge 6 worktree ke satu branch kerja.
2. Build + typecheck penuh (seluruh app, bukan per-kelompok).
3. Smoke-check manual: checkout end-to-end (mock payment), login, 1 halaman
   tiap kelompok di browser sungguhan.
4. Verifikasi ulang: tidak ada file backend/API yang ikut berubah
   (`git diff --stat` harus hanya menyentuh `apps/web/app/**`,
   `apps/web/components/**`, `apps/web/*.css`, `apps/web/*.config.ts`).

## 7. Risiko & mitigasi

- **Risiko file-conflict antar-agent paralel**: dimitigasi dengan pembagian
  kelompok non-overlapping di §5 (tidak ada 2 kelompok yang menyentuh file
  yang sama) + primitive shared sudah "dibekukan" sebelum Fase 3 dimulai.
- **Risiko regresi fungsional** (tombol/link putus, form tidak submit):
  dimitigasi dengan aturan "props/API primitive tidak berubah" (§4) dan
  smoke-check manual di Fase 4.
- **Risiko LMS bugfix melebar ke backend**: dibatasi HANYA pada pemilihan
  layout mana yang render sidebar — tidak menyentuh data-fetching/auth guard
  di layout tersebut.
- **Risiko halaman flag-OFF sulit dites visual** (404 di prod): agent
  kelompok Publik menguji via localhost dengan flag di-force ON sementara
  di env lokal (`.env.local`, tidak disentuh `.env` produksi), TIDAK
  mengubah nilai flag produksi.

## 8. Definisi selesai

- 94 halaman menampilkan bahasa visual baru sesuai render Stitch + token §4.
- 0 pemakaian warna ungu tersisa (`grep -ri purple\|violet apps/web` bersih
  dari token/kelas warna, sisa hanya kalau ada di teks/copy tidak relevan).
- Build + typecheck seluruh `apps/web` hijau.
- Tidak ada file di `apps/api` yang berubah sama sekali.
- Bug sidebar-dobel LMS admin terkonfirmasi hilang (screenshot before/after).
- Checkout tetap bisa menyelesaikan transaksi mock end-to-end tanpa error.
