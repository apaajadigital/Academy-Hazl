# OVERNIGHT GAP ANALYSIS — Phase 6 Planning
> Dibuat: 21 Agu 2026  
> Branch: `docs/overnight-gap-analysis`  
> Dibaca dari: `CLAUDE.md`, `docs/BACKLOG.md`, `docs/PHASE6_MASTER_PLAN.md`  
> Reviewer: Pandu (Jago Akademi AI Orchestrator)

---

## 1. STATUS RINGKAS

| Kategori | Jumlah | Keterangan |
|----------|--------|------------|
| Task Phase 6 (Group D) belum dimulai | **7** | TASK-090/091/092/042/043/097/094 |
| Task Phase 6 (Group E) ditangguhkan | **3** | TASK-060/070/080 (blueprint only) |
| Blocker eksternal (human-gated) | **2** | TASK-098 (R2/Stream), BL-119 (rclone) |
| CI merah saat ini | **1** | BL-122 — lint 3 unused-vars di `main` |
| Foundation wajib sebelum Wave 1 | **4** | F1–F4 (lihat §3) |

---

## 2. TASK BELUM DIMULAI (dari Work Order SSOT)

### Group D — Phase 6 Inti

| Task | Nama | Kondisi Awal | Effort | Risiko | Blocker |
|------|------|-------------|--------|--------|---------|
| TASK-090 | Learning Path | HAS-FOUNDATION (progress engine ada) | M | 🟢 Low | — |
| TASK-043 | CRM + Drip Automation | GREENFIELD (+Lead model ada) | M/L | 🟡 Med | — |
| TASK-092 | Community | PARTIAL-SHELL (flag only) | M–L | 🟡 Med | Perlu TASK-090 selesai |
| TASK-042 | Marketplace | PARTIAL-SHELL + commerce core | XL (split 042a–f) | 🔴 High | **TASK-098 R2/Stream belum ada** |
| TASK-091 | Bootcamp / Live Cohort | GREENFIELD (reuse Lms*) | L | 🟠 Med-High | **TASK-098 R2/Stream belum ada** |
| TASK-097 | Gamification | PARTIAL-SHELL (UI orphan, no data) | M | 🟠 Med-High | Perlu TASK-041 events (✅ sudah ada) |
| TASK-094 | Corporate HRIS (light) | GREENFIELD (extend LMS B2B) | L | 🔴 High | Perlu TASK-090 selesai + tenant isolation gate |

### Group E — Ditangguhkan (Blueprint Only, belum dijadwalkan)

| Task | Nama | Prasyarat |
|------|------|-----------|
| TASK-060 | Performance & CWV | Real traffic pasca-launch |
| TASK-070 | Scale & HA | TASK-060 selesai + load data nyata |
| TASK-080 | AI + Mobile | TASK-070 selesai + versioned API |

---

## 3. DEPENDENCY YANG TERBUKA SETELAH SOFT LAUNCH

Soft Launch (10B) telah selesai per 30 Jul 2026. Dependency yang kini **terbuka**:

```
Soft Launch ✅
  ├─► TASK-090  Learning Path      — bebas dimulai (progress engine live)
  ├─► TASK-043  CRM + Drip         — bebas dimulai (Lead model + queue live)
  └─► TASK-041  Analytics ✅       — sudah live → membuka TASK-097 Gamification

TASK-096  Free Class ✅            — sudah live → membuka pola Event di TASK-092

TASK-090 (jika selesai)
  ├─► TASK-092  Community          — butuh pola progress dari 090
  ├─► TASK-091  Bootcamp           — butuh LmsBatch pattern dari 090
  └─► TASK-094  Corporate HRIS     — butuh LMS B2B pattern dari 090

TASK-098  R2/Stream (❌ belum ada, human-gated Cloudflare creds)
  ├─► TASK-042  Marketplace        — upload R2 wajib untuk signed URL
  └─► TASK-091  Bootcamp           — Stream recording wajib
```

**Catatan kritis:** TASK-042 dan TASK-091 bisa mulai membangun DB + read path di balik flag, **tapi tidak bisa ship** fitur upload/recording sampai TASK-098 selesai.

---

## 4. PRE-PHASE 6 FOUNDATION (wajib sebelum Wave 1)

Berdasarkan ADR-0002 dan `PHASE6_MASTER_PLAN.md §2`, empat fondasi ini harus ada **sebelum** task Wave 1 bisa merge ke main:

| ID | Foundation | Alasan | Estimasi |
|----|------------|--------|----------|
| F1 | **API Feature Flag server-side** — `apps/api/src/config/features.ts` + middleware `requireFeature()` | TASK-043/091/092/094 mengekspos write endpoint uang/PII; harus bisa dimatikan tanpa rebuild web (BL-37) | S (~1 hari) |
| F2 | **Notification abstraction** — `services/notification/` channel-agnostic `notify()` over email/WA/push via queue | TASK-043 drip + TASK-091 reminders + TASK-092 alerts semuanya kirim notif; tanpa abstraksi → tiga implementasi menyimpang | S (~1 hari) |
| F3 | **Analytics event registry** — standarisasi event tracking untuk gamification | TASK-097 butuh feed events konsisten dari seluruh modul; TASK-041 sudah live tapi belum ada registry terdefinisi | S (~0.5 hari) |
| F4 | **Commerce extension hook** — `itemType` baru bisa didaftarkan tanpa edit `checkout.ts` | TASK-042 (`marketplace_product`) + TASK-091 (`bootcamp_seat`) akan menambah itemType; pola ada di checkout, perlu diformalkan | M (~2 hari) |

---

## 5. ESTIMASI EFFORT PER TASK

| Task | Effort (T-shirt) | Hari Kerja (rough) | Catatan |
|------|-----------------|-------------------|---------|
| F1–F4 Foundation | S–M | 4–5 hari | Paralel |
| TASK-090 Learning Path | M | 5–8 hari | Reuse progress engine; paling aman dimulai pertama |
| TASK-043 CRM + Drip | M/L | 8–12 hari | Paralel dengan 090; greenfield tapi Lead model sudah ada |
| TASK-092 Community | M–L | 8–12 hari | Setelah 090; reuse Event + queue |
| TASK-042 Marketplace | XL | 15–25 hari | Dipecah 042a–f; **tunggu TASK-098** untuk upload/signing |
| TASK-091 Bootcamp | L | 10–15 hari | **Tunggu TASK-098** untuk Stream recording |
| TASK-097 Gamification | M | 6–10 hari | Setelah 090 (events) + anti-abuse design |
| TASK-094 Corporate HRIS | L | 12–18 hari | Paling akhir; tenant isolation = invarian keamanan |

**Total estimasi rough Group D (paralel maksimal):** 8–10 minggu kerja aktif  
**Bottleneck utama:** TASK-098 (human-gated → unblock TASK-042 + TASK-091)

---

## 6. REKOMENDASI URUTAN PHASE 6

```
[Segera] Perbaiki CI merah (BL-122) → 3 baris hapus unused vars di berlangganan/page.tsx

[Minggu 1–2]  Foundation F1+F2+F3+F4  (paralel, prerequisite semua wave)

Wave 1 [Minggu 2–4]  ← bisa dimulai setelah Foundation F1+F2
  ├── TASK-090 Learning Path    (risiko paling rendah, buka banyak dependency)
  └── TASK-043 CRM + Drip       (paralel; tidak melibatkan uang)

Wave 2 [Minggu 4–7]  ← setelah TASK-090 selesai
  ├── TASK-042 Marketplace       (DB + read path dulu; signed upload tunggu TASK-098)
  └── TASK-092 Community         (paralel; reuse Event + queue + free-class 096)

Wave 3 [Minggu 6–9]  ← setelah Wave 2
  ├── TASK-091 Bootcamp          (reuse LmsBatch + Event; recording tunggu TASK-098)
  └── TASK-097 Gamification      (paralel; flag OFF sampai anti-abuse selesai)

Wave 4 [Minggu 9–11]
  └── TASK-094 Corporate HRIS    (paling terakhir; tenant isolation strictest)

[Ditangguhkan — setelah real traffic]
  TASK-060 → TASK-070 → TASK-080
```

---

## 7. BLOCKER YANG PERLU KEPUTUSAN OWNER

| ID | Blocker | Status | Aksi yang dibutuhkan |
|----|---------|--------|----------------------|
| TASK-098 | Cloudflare R2 + Stream credentials | ❌ Tidak ada | Owner daftarkan akun Cloudflare + beri kredensial → unlock TASK-042 upload & TASK-091 recording |
| BL-119 | `rclone` belum terpasang di VPS | ❌ Tidak ada | Owner install rclone + `rclone config` dengan R2 credentials di VPS |
| BL-117 | Backup script permission denied (silent failure 3 malam) | Fix siap di `fix/p0-ops-backup` | Owner approve deploy branch + verifikasi 2 malam berturut |
| BL-122 | CI lint merah di `main` — 3 unused-vars di `berlangganan/page.tsx` | ❌ Memblokir semua PR baru | Dev putuskan: async fetch (opsi a) atau hapus helper mati (opsi b) |
| BL-112 | Rumus bagi hasil trainer (70/30) belum dikonfirmasi ke pihak terkait | Kode dipertahankan | Owner konfirmasi ke pihak bisnis sebelum trainer pertama cairkan uang nyata |

---

## 8. HUTANG TEKNIS PHASE 5 PRIORITAS TINGGI (sebelum Phase 6 Wave 1)

Item-item ini tidak harus **selesai** sebelum Phase 6, tapi bila dibiarkan akan memperumit Wave 1:

| ID | Item | Severity | Estimasi |
|----|------|----------|----------|
| BL-82 | Sidebar LMS hanya di home portal, bukan di layout | 🟡 Med | S |
| BL-84 | Detail pesanan di luar shell dashboard | 🟡 Med | S |
| BL-85/BL-122 | Harga langganan hardcoded + CI merah | 🔴 High | S |
| BL-80 | Test suite non-deterministik di bawah CPU load | 🟡 Med | M |
| BL-92 | Pagination pencarian kursus berhenti di 1 halaman | 🟡 Med | XS |
| BL-91 | HTML injection di template email (nama user) | 🟡 Med | XS |
| BL-121 | `packages/types`/`utils` tidak pernah di-build di Dockerfile | 🟡 Med | S |

---

*Dokumen ini adalah snapshot analisis otomatis. Semua keputusan bisnis (R2 creds, bagi hasil, konten mentor) tetap di tangan owner. Seluruh angka estimasi adalah perkiraan kasar berbasis kode yang ada — bisa berubah signifikan tergantung scope detail dan isu yang ditemukan saat eksekusi.*
