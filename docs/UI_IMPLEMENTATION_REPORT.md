# UI Implementation Report — Admin Panel Enterprise Polish

> **Tanggal:** 28 Jul 2026 · **Branch:** `feat/admin-visual-polish` (dari `main`) · **Sifat:** visual‑only (tanpa perubahan struktur/posisi/flow/logic/API/routing/fitur). · **Validasi:** `tsc --noEmit` ✅ · ESLint `--max-warnings 0` ✅ · `next build` ✅. · **Belum di‑merge** — menunggu konfirmasi reviewer.

Pendamping: `docs/UI_VISUAL_AUDIT.md`.

## 1. Ringkasan
Pass **refinement** menaikkan Admin Panel dari "konsisten" (hasil PR #17) → "**premium enterprise**". Dikerjakan di **level UI kit + design token** sehingga satu perubahan merambat konsisten ke semua halaman admin (juga User/Trainer) — menegakkan "satu design language" dan menghindari tambalan per‑halaman. **Nol perubahan struktur/logic.** Semua item audit High & Medium tuntas.

## 2. File yang diubah (8)
| File | Perubahan |
|---|---|
| `components/ui/Card.tsx` | Radius 16→**20px** (`--radius-card`) agar seragam dengan StatCard/kartu lain; hover lift `duration-200 ease-out`. |
| `components/ui/Table.tsx` | `TableContainer` radius 16→**20px** (frame tabel = kartu). |
| `components/ui/Pagination.tsx` | Radius `lg`(16)→**12px** (`--radius-md`) sinkron kontrol lain; halaman aktif `shadow-e1`; digit `tabular-nums`; hover teks menguat; transition `200ms`. |
| `components/ui/StatCard.tsx` | Nilai KPI `tabular-nums` + `tracking-[-0.01em]` (angka rata & solid, gaya Stripe/Linear); label `font-medium` (secondary lebih tegas). |
| `components/ui/Button.tsx` | **Focus‑ring branded** (`focus-visible:ring-2 ring-accent-cyan-strong/45`, `outline-none`) menggantikan outline browser generik. |
| `components/ui/Input.tsx` | Ring fokus 20→**25%**; **hover‑border** `text-muted` (micro‑interaction). |
| `components/ui/Select.tsx` | idem Input. |
| `components/ui/Textarea.tsx` | idem Input. |
| `app/globals.css` | `:focus-visible` outline‑offset 3→**2px** (crisp di kontrol padat). |

*(9 file termasuk globals.css.)*

## 3. Alasan perubahan (audit → aksi)
- **D1 Radius kartu koheren** → Card & TableContainer ke 20px. Sebelumnya kartu KPI (20px) vs Card/tabel (16px) di halaman sama → sudut tak sama. Kini **semua permukaan kartu 20px**.
- **D2 Radius kontrol** → Pagination ke 12px, selaras input/select/tombol aksi tabel.
- **D3/D5 Angka KPI** → `tabular-nums` + tracking. Digit kini rata antar kartu & terbaca "solid" — detail khas dashboard metrik kelas dunia.
- **D4 Focus premium** → ring cyan halus yang memeluk tombol (branded), bukan outline default → kesan profesional saat navigasi keyboard.
- **D6 Micro‑interaction** → durasi transition diselaraskan (~200ms) di kartu/pagination; input mendapat **hover‑border** halus. 200ms = halus, tidak berlebihan.

## 4. Before → After
| Aspek | Before | After |
|---|---|---|
| Radius kartu (Card/tabel) | 16px | **20px** (seragam semua kartu) |
| Radius pagination | 16px | **12px** (seragam kontrol) |
| Angka KPI | proportional figures | **tabular‑nums + optical tracking** |
| Focus tombol | outline browser generik, offset 3px | **ring cyan branded**, offset 2px |
| Input hover | statis | **border menguat** (micro‑interaction) |
| Halaman pagination aktif | flat | **shadow tipis** (elevation) |

## 5. Kepatuhan ABSOLUTE RULES
- Tidak memindahkan/mengubah struktur sidebar, navbar, card, button, tabel, search, filter — **semua tetap di posisi & susunan yang sama**.
- Tidak menyentuh flow, business logic, API, backend, database, routing, atau fitur (diff hanya `components/ui/*` + `globals.css`).
- Hanya properti visual: radius, shadow, focus, transition, typographic figures, hover.

## 6. Technical notes
- Pendekatan **token‑first / kit‑first**: memoles komponen bersama = konsistensi otomatis lintas 12+ halaman admin, tanpa duplikasi (sesuai brief "reusable component + design token").
- Perubahan kit merambat ke User/Trainer dashboard juga — **disengaja** demi satu design system. Efek ke halaman publik minimal & aman: focus‑ring = perbaikan universal; radius kartu/pagination & tabular‑nums tak dipakai identitas marketing.
- Verifikasi: `tsc` 0 error, ESLint 0 warning, `next build` sukses (semua utility Tailwind baru — `ring-.../45`, `tracking-[-0.01em]`, `hover:border-text-muted`, `tabular-nums` — resolve).

## 7. Rekomendasi tahap selanjutnya
- **Radius tombol — DIPUTUSKAN & DITERAPKAN (hybrid kontekstual).** Reviewer memilih **hybrid**: **marketing/publik = pill** (hangat, brand edukasi), **dalam aplikasi = 12px** (enterprise, seirama input). Diimplementasikan bersih di komponen `<Button>` (radius 12px via `--radius-md`) sementara class legacy `.btn` (dipakai CTA hero marketing) tetap pill. Verifikasi: hero marketing tak memakai komponen `<Button>` (hanya contact form, quiz player, dashboard) → tak ada CTA marketing yang tak sengaja berubah. *(Perubahan terpisah, PR tersendiri.)*
- **Shadow ultra‑subtle (opsional):** eksplorasi `e1` lebih tipis lagi untuk look "flat‑premium" ala Linear; perlu review lintas halaman.
- **Screenshot before/after** untuk lampiran visual (butuh login admin — kredensial dari Anda).
- Jalankan **Lighthouse a11y** di server live untuk konfirmasi kontras/focus.

---
*Target: Admin Panel terasa premium, konsisten, dan enterprise‑grade — dicapai lewat refinement design‑system yang aman & terverifikasi.*
