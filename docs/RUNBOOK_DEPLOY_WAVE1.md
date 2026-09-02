# RUNBOOK — Deploy Wave 1 (jalur uang DOKU) ke VPS

> **Status: ✅ TEREKSEKUSI & TERVERIFIKASI — 2 Sep 2026, 04:22–04:41 UTC.**
> Dijalankan operator di host (sesi Claude Code tidak punya izin SSH keluar; seluruh perintah
> ditempel manual, output diverifikasi bersama). Host berpindah `bd19788` → `a5bbb26`,
> DB `CURRENT 16/16`, tanpa jendela 502 dan tanpa rollback.
>
> **Hasil terukur:** backup pra-deploy `jago-2026-09-02-042225.sql.gz` (45 tabel, gzip+footer
> lolos independen) · 0 duplikat `gatewayTxId` · `payment_transactions` 9 baris ·
> `course_sections`/`course_lessons` 0 baris · kedua migration applied berurutan ·
> port 3010/4010 utuh · `/api/ready` `{"db":"ok","search":"ok","redis":"ok"}` ·
> worker `reconciliation sweep scheduled intervalMinutes=15` · image api == image worker
> (`sha256:cf14c278…`) · CSS live 116.576 B dengan `.flex{`/`.mx-auto`.
>
> **Dua gate yang salah saya tulis, dikoreksi saat eksekusi** — dicatat supaya tidak diulang:
> (1) `grep -c 'FATAL(BL-35)' build.log` **bukan** indikator kegagalan; BuildKit menggemakan isi
> `RUN`, dan skrip guard memuat string itu di dalam dirinya sendiri. Pembeda yang benar: build
> exit code, atau `OK(BL-35)` muncul sebagai output runtime (baris `#45 0.491 ...`), atau periksa
> CSS langsung di dalam image. (2) `grep -oE '.*\.css' | head -1` menyampel chunk pertama, bukan
> bundle Tailwind — homepage me-link beberapa chunk CSS, jadi **enumerasikan semuanya** dan cari
> yang memuat `.flex{`, jangan uji yang pertama saja.

| | |
|---|---|
| **Dari (host sekarang)** | `bd19788` — merge PR #54 (`fix/bl137-doku-signature`) |
| **Ke (target)** | `a5bbb26` — merge PR #62; **0 PR terbuka** |
| **Delta** | 26 commit, **2 migration tertunda**, 0 perubahan `.env` wajib |
| **Compose** | `docker-compose.vps.yml` — ⛔ **JANGAN `docker-compose.prod.yml`** (BL-43, 502 sitewide 28 menit) |
| **Path host** | `/var/www/jago-akademi` |

> **Revisi 31 Agu 2026** setelah pengukuran ulang di host oleh owner. Tiga koreksi terhadap
> versi pertama dokumen ini: (1) redis & worker **hidup** — §0.3 terjawab, BL-144 boleh diklaim
> mendarat; (2) migration tertunda ada **dua**, bukan satu — `20260821000000` (BL-123) luput dari
> hitungan versi pertama; (3) target naik dari `6091393` ke `a5bbb26`.
>
> `a5bbb26` vs `6091393` **nol perubahan kode** — PR #62 hanya menyentuh `docs/RUNBOOK_DEPLOY.md`
> (19 baris). Muatan deploy identik; yang berubah hanya commit yang tercatat sebagai versi.

## Apa yang diturunkan

Tujuh perbaikan jalur uang. Semuanya di jalur pembayaran nyata, jadi deploy ini bukan rilis
kosmetik:

| ID | Perbaikan | Bergantung pada |
|---|---|---|
| BL-138 | Webhook `FAILED`/`EXPIRED` tak lagi menimpa order `paid` (klaim atomik berpredikat) | api |
| BL-139 | Nominal settle diverifikasi sebelum fulfillment | api |
| BL-140 | `invoice_number` unik-by-construction + unique index DB | api + **migration** |
| BL-142 | Webhook tak tertangani tidak lagi di-ACK 2xx | api |
| BL-144 | Sapuan rekonsiliasi terjadwal ke DOKU status API | **worker + redis** |
| BL-145 | Jendela replay webhook (`Request-Timestamp` freshness) | api |
| BL-148 | `invoice_number` tanpa simbol (legal untuk KKI) | api |

### ✅ Prasyarat BL-144 — TERPENUHI (diukur di host 31 Agu 2026)

`RECONCILE` adalah **repeatable job BullMQ**, didaftarkan `scheduleReconciliation()` di
`worker.ts` — bukan di `api`. Ia hanya jalan bila service `redis` **dan** `worker` hidup.
Keduanya sudah terverifikasi hidup:

```
docker compose ps       -> redis running, worker running
REDIS_URL (api)         -> redis://redis:6379
REDIS_URL (worker)      -> redis://redis:6379
/api/ready              -> {"db":"ok","search":"ok","redis":"ok"}
```

`redis` bernilai **`ok`**, bukan `skipped` — antrean benar-benar aktif, jadi **BL-144 boleh
diklaim mendarat** setelah deploy (tetap buktikan lewat §8.4).

Catatan di `RUNBOOK_DEPLOY.md` yang menyatakan "redis/BullMQ belum di-deploy" adalah potret
8 Jul 2026 dan **sudah basi**; sudah dikoreksi di `main` lewat PR #62, berikut jebakan `skipped`
di bawah.

> **Jebakan yang tetap berlaku sebagai kriteria terima.** `/api/ready` mengembalikan
> `redis: "skipped"` — bukan `"ok"` — bila `REDIS_URL` kosong, **dan `ready` tetap `true`**
> (`routes/health.ts:53` hanya menolak `redis === "error"`). Jadi **HTTP 200 saja tidak
> membuktikan Redis hidup**; nilai dep-nya harus dibaca. Bila suatu saat `skipped` muncul lagi,
> artinya sapuan BL-144 mati diam-diam sementara endpoint tetap hijau.

Jalur webhook lain tidak bergantung pada ini: `dispatch()` di `jobs/queues.ts` **degrade ke
inline** bila Redis tak terjangkau, jadi BL-138/139/142/145 tetap bekerja lewat proses api.
Sapuan BL-144 **tidak punya jalur inline** — itulah kenapa status redis menjadi gerbang khusus
untuk fix yang satu itu.

## Variabel `.env` — tidak ada yang wajib ditambahkan

Empat env var baru, **semuanya punya default di `config/env.ts`**:

| Var | Default | Efek bila dibiarkan kosong |
|---|---|---|
| `DOKU_WEBHOOK_MAX_AGE_SECONDS` | `86400` | jendela replay 24 jam (sengaja lebar, BL-150) |
| `DOKU_WEBHOOK_MAX_FUTURE_SECONDS` | `900` | toleransi drift jam host |
| `RECONCILE_INTERVAL_MINUTES` | `15` | sapuan tiap 15 menit |
| `RECONCILE_BATCH_SIZE` | `100` | plafon panggilan inquiry per sapuan |

Deploy boleh berjalan **tanpa menyentuh `/var/www/jago-akademi/.env`.**

---

## 0. 🖐️ Pre-flight di host (baca-saja, tidak mengubah apa pun)

```bash
cd /var/www/jago-akademi
```

### 0.1 Catat titik balik — SIMPAN OUTPUT INI

```bash
git rev-parse HEAD | tee /tmp/jago-rollback-commit.txt   # harus bd19788...
git log --oneline -1
docker compose -f docker-compose.vps.yml ps
docker port jago-akademi-web-1     # baseline: harus sudah 3010
docker port jago-akademi-api-1     # baseline: harus sudah 4010
```

Bila `HEAD` **bukan** `bd19788`, berhenti — asumsi dokumen ini salah dan rencana rollback ikut
salah. Laporkan commit sebenarnya.

### 0.2 Pastikan working tree host bersih

```bash
git status --porcelain      # harus KOSONG
```

Ada isinya = seseorang mengedit langsung di host; `git pull --ff-only` akan gagal atau menimpa.
Selesaikan dulu, jangan `checkout -f` membabi buta.

> 🔴 **TEMUAN 2 Sep 2026 — `docker-compose.vps.yml` di host SENGAJA berbeda dari repo.
> JANGAN "dibersihkan".** Host memindahkan uploads dari named volume ke bind mount, pada
> service `api` **dan** `worker`:
>
> ```diff
> -      - uploads:/app/uploads
> +      - /var/www/jago-uploads:/app/uploads
> ```
>
> Menjalankan `git checkout -- docker-compose.vps.yml` (atau `git checkout .`, atau deploy dari
> clone bersih, atau CD `deploy.yml`) mengembalikan container ke named volume `uploads` — yang
> **bukan** direktori tempat file selama ini ditulis. Sertifikat, file e-book, dan gambar unggahan
> tetap utuh di `/var/www/jago-uploads`, tapi aplikasi akan melihat direktori lain dan menyajikan
> **404 tanpa satu pun error di log**. Kegagalan senyap, persis kelas yang paling mahal ditemukan.
>
> Modifikasi ini **tidak ter-track di git**, jadi tidak ada yang melindunginya. Sampai ia
> dipindahkan ke repo (atau ke `.env` lewat variabel path), setiap deploy wajib memverifikasi
> bind mount masih terpasang:
>
> ```bash
> docker inspect -f '{{range .Mounts}}{{.Source}} -> {{.Destination}}{{"
"}}{{end}}' >   jago-akademi-api-1 jago-akademi-worker-1 | grep uploads
> ```
>
> Sisa working tree host (`apps/admin/`, `apps/lms/`, `apps/trainer/`,
> `ECourseLearningPaths.tsx`, file sampah `0.0.0.0:3010`, `docker-compose.vps.yml.bak`) **tidak
> ada di repo** (`a5bbb26` hanya punya `apps/api` dan `apps/web`) dan tidak disentuh deploy ini —
> aman diabaikan, tidak akan membuat `pull --ff-only` bentrok.

### 0.3 Redis & worker — ✅ SUDAH DIJAWAB 31 Agu 2026

Terukur di host: `redis` running, `worker` running, `REDIS_URL=redis://redis:6379` di keduanya,
`/api/ready` → `{"db":"ok","search":"ok","redis":"ok"}`. Tidak ada gerbang yang tertahan di sini.

Perintah di bawah tetap dicatat untuk **mengulang pengukuran tepat sebelum deploy** — jarak
beberapa hari cukup untuk membuat potret jadi basi, dan itu persis kesalahan yang menghasilkan
catatan 8 Jul yang keliru:

```bash
docker compose -f docker-compose.vps.yml ps redis worker
docker compose -f docker-compose.vps.yml exec -T api sh -lc 'echo "$REDIS_URL"'
docker compose -f docker-compose.vps.yml exec -T worker sh -lc 'echo "$REDIS_URL"'
curl -fsS https://jagoakademi.com/api/ready | jq .
```

### 0.4 Ruang disk (build `--no-cache` dua image butuh lapang)

```bash
df -h /var/lib/docker /var/www
```

---

## 1. 🖐️ Backup DB — SEBELUM apa pun, dan buktikan valid

Backup diambil **sebelum `git pull`** supaya betul-betul memotret keadaan pra-deploy.

```bash
cd /var/www/jago-akademi
COMPOSE_DIR=/var/www/jago-akademi /bin/bash ./scripts/backup.sh; echo "EXIT=$?"
```

**Exit code adalah kontrak (RUNBOOK_DB.md §2.1):**

| Exit | Arti | Lanjut deploy? |
|---|---|---|
| `0` `OK` | backup lokal valid + offsite terverifikasi | ✅ ya |
| `10` `DEGRADED` | backup lokal **valid**, offsite gagal / `rclone` belum terpasang | ✅ ya — ini ekspektasi yang benar (§2.4) |
| `75` `SKIPPED` | run lain memegang lock | ⏸️ tunggu, ulangi |
| `1` `FAIL` | tidak ada backup yang bisa dipakai | ⛔ **BERHENTI** |

Panggil lewat `/bin/bash <path>`, bukan by path saja — insiden 4–6 Agu 2026: exec bit hilang
saat checkout, cron gagal `Permission denied` tiga malam berturut-turut tanpa ada yang sadar.

### 1.1 Bukti validitas — independen dari script

Jangan percaya exit code saja; script yang memvalidasi dirinya sendiri adalah satu titik
kegagalan. Empat pemeriksaan berikut mengulanginya dari luar:

```bash
BK=$(ls -t /var/www/jago-akademi/backups/*.sql.gz | head -1); echo "$BK"
ls -l "$BK"                                     # mode 0600, ukuran wajar (bukan ratusan byte)

gzip -t "$BK" && echo "GZIP_OK"                 # 1) integritas arsip

zcat "$BK" | tail -20 | grep -c 'PostgreSQL database dump complete'
# 2) footer -> harus 1. Jendela 20 baris, bukan 5: pg_dump menaruh
#    \unrestrict <nonce> SETELAH footer sejak CVE-2025-8714 (RUNBOOK_DB.md §2.2).

zcat "$BK" | grep -c '^CREATE TABLE '
# 3) jumlah tabel -> harus >= 45 (44 model schema.prisma + _prisma_migrations).
#    MIN_TABLES=45 adalah angka terukur, bukan berbantalan. Migration baru hanya
#    menambah INDEX, jadi angka ini TIDAK berubah setelah deploy.

zcat "$BK" | grep -c 'payment_transactions'     # 4) tabel jalur uang ikut terbawa -> > 0
```

### 1.2 Bukti terkuat (opsional, disarankan): restore ke DB sekali-pakai

Ini satu-satunya pembuktian bahwa dump benar-benar bisa dipulihkan, bukan sekadar lolos
pemeriksaan tekstual. **Tidak menyentuh `jago_akademi`** — membuat DB baru lalu menghapusnya.

```bash
docker compose -f docker-compose.vps.yml exec -T postgres \
  psql -U jagouser -d postgres -c 'CREATE DATABASE restore_drill;'

zcat "$BK" | docker compose -f docker-compose.vps.yml exec -T postgres \
  psql -U jagouser -d restore_drill -v ON_ERROR_STOP=1 >/dev/null && echo "RESTORE_OK"

docker compose -f docker-compose.vps.yml exec -T postgres psql -U jagouser -d restore_drill -tAc \
  "SELECT count(*) FROM information_schema.tables WHERE table_schema='public';"   # ~45

docker compose -f docker-compose.vps.yml exec -T postgres psql -U jagouser -d restore_drill -tAc \
  "SELECT count(*) FROM orders;"                    # bandingkan dengan jago_akademi

docker compose -f docker-compose.vps.yml exec -T postgres \
  psql -U jagouser -d postgres -c 'DROP DATABASE restore_drill;'
```

**Catat nama file backup.** Dipakai di rencana rollback §7.3.

---

## 2. 🖐️ Pre-flight migration — WAJIB, sebelum `migrate deploy`

> 🔴 **KOREKSI 31 Agu 2026 — ada DUA migration tertunda, bukan satu.** Versi pertama dokumen ini
> hanya menghitung migration Wave 1 dan melewatkan satu yang sudah tertunda sejak **sebelum**
> Wave 1. Host melaporkan **15 applied**; `main` punya **16**.
>
> | # | Migration | Isi | Risiko |
> |---|---|---|---|
> | 15 | `20260821000000_course_section_lesson_fk_index` | 2 × `CREATE INDEX` non-unique (BL-123) | 🟢 index-only, **tidak bisa gagal karena data** |
> | 16 | `20260827000000_payment_transaction_gateway_tx_id_unique` | `CREATE UNIQUE INDEX` (BL-140) | 🔴 **gagal bila ada duplikat** |
>
> Keduanya akan dijalankan `migrate deploy` dalam satu rangkaian, **#15 lebih dulu**. Karena #16
> yang berisiko berjalan belakangan, kegagalannya tidak membatalkan #15 yang sudah ter-commit —
> jadi kemungkinan hasil parsial (15 applied, 16 gagal) itu nyata dan harus diantisipasi, bukan
> dianggap mustahil.

### 2.1 Duplikat `gatewayTxId` (BL-140) — gerbang paling penting

`20260827000000_payment_transaction_gateway_tx_id_unique` membuat **unique index** pada
`payment_transactions."gatewayTxId"`. Satu nilai duplikat saja membuatnya gagal **di tengah**
`migrate deploy` (RUNBOOK_DB.md §1.3).

Kolom itu **selama ini tidak unik** — justru itulah isi BL-140 — jadi duplikat **mungkin sudah
ada** di data produksi. Ini bukan pemeriksaan formalitas. Jalankan **SEBELUM** `migrate deploy`;
menjalankannya sesudah tidak ada gunanya, karena saat itu kerusakannya sudah terjadi.

```bash
docker compose -f docker-compose.vps.yml exec -T postgres psql -U jagouser -d jago_akademi -c "
SELECT \"gatewayTxId\", COUNT(*) AS n
FROM payment_transactions
WHERE \"gatewayTxId\" IS NOT NULL
GROUP BY \"gatewayTxId\" HAVING COUNT(*) > 1
ORDER BY n DESC;"

docker compose -f docker-compose.vps.yml exec -T postgres psql -U jagouser -d jago_akademi -c "
SELECT COUNT(*) AS total FROM payment_transactions;"
```

**Interpretasi:**

- **0 baris duplikat** → aman, lanjut.
- **Ada baris** → ⛔ **BERHENTI, JANGAN hapus atau rename apa pun.** Setiap baris duplikat berarti
  dua order berbagi satu identitas pembayaran — itu persis kerusakan BL-140, dan memilih baris
  mana yang bertahan adalah **keputusan uang**. Eskalasi ke owner; prosedur investigasinya
  (tanya status ke DOKU, jangan menebak dari DB kita) ada di RUNBOOK_DB.md §1.3.
- **Row count di bawah puluhan ribu** → lock `ACCESS EXCLUSIVE` hitungan milidetik, aman.
  **Ratusan ribu baris** → hentikan, pindahkan ke jendela maintenance.

Pre-flight `user_roles` (RUNBOOK_DB.md §1.1 poin 2–3) **tidak perlu diulang** — migration #11
sudah applied 30 Jul 2026 dan tidak ikut dalam deploy ini.

### 2.2 Ukuran tabel untuk migration BL-123 (#15)

`20260821000000_course_section_lesson_fk_index` **tidak bisa gagal karena data** — dua
`CREATE INDEX` biasa, non-unique, tanpa membaca atau menulis baris. Satu-satunya risikonya
**durasi lock**: `CREATE INDEX` non-`CONCURRENTLY` memegang `ACCESS EXCLUSIVE` pada tabelnya
selama pembuatan, sama seperti #16.

```bash
docker compose -f docker-compose.vps.yml exec -T postgres psql -U jagouser -d jago_akademi -c "
SELECT 'course_sections' AS t, COUNT(*) FROM course_sections
UNION ALL SELECT 'course_lessons', COUNT(*) FROM course_lessons;"
```

Pada volume kurikulum saat ini keduanya kecil dan lock-nya hitungan milidetik. Kalau salah
satunya sudah ratusan ribu baris, hentikan dan pindahkan ke jendela maintenance — bukan karena
migration-nya berbahaya, tapi karena kurikulum tak bisa dibaca selama lock.

Migration ini memang sengaja mendarat sebelum Learning Path Wave 1 menyemai section/lesson
massal; menundanya lagi hanya membuat lock-nya makin lama di kemudian hari.

---

## 3. 🖐️ Ambil kode

```bash
cd /var/www/jago-akademi
git pull --ff-only origin main
git log --oneline -1        # harus a5bbb26
```

`--ff-only` disengaja: bila host ternyata punya commit lokal, perintah ini **gagal** alih-alih
membuat merge diam-diam di server produksi.

---

## 4. 🖐️ Build DULU, baru cek status migration

> 🔴 **Jebakan yang sudah pernah menipu (RUNBOOK_DB.md §1.1):** `docker compose run --rm api`
> memakai image yang **sudah ada**, bukan source di working tree. Image basi membuat
> `migrate status` melaporkan **"Database schema is up to date!"** padahal ada migration pending —
> jawaban yang benar untuk isi image itu, tapi menyesatkan total sebagai gerbang deploy.
> **Build dulu, selalu.**

```bash
docker compose -f docker-compose.vps.yml build --no-cache api web
```

`--no-cache` pada `web` juga guard BL-35 (Tailwind). Cari di log build:
`OK(BL-35): Tailwind utilities present` = sukses; `FATAL(BL-35)` = build gagal, jangan lanjut.

Service `worker` **tidak punya blok `build:`** — ia memakai `image: jago-api-vps:local` yang sama
dengan `api`. Build `api` sudah otomatis memperbarui image worker; worker cukup di-recreate di §6.

### 4.1 Gerbang: jumlah migration di image harus cocok dengan repo

```bash
ls apps/api/prisma/migrations/ | grep -v migration_lock | wc -l      # harus 16
docker compose -f docker-compose.vps.yml run --rm api npx prisma migrate status
```

**Yang diharapkan (dikoreksi 31 Agu 2026):** `16 migrations found`, **15 applied**, **2 pending**:

```
20260821000000_course_section_lesson_fk_index              <- BL-123, index-only
20260827000000_payment_transaction_gateway_tx_id_unique    <- BL-140, berisiko
```

- **Persis dua pending, persis dua nama itu** → benar, lanjut.
- **"migrations found" ≠ 16** → ⛔ **BERHENTI.** Image belum tergantikan, dan `migrate deploy`
  akan jadi no-op yang melaporkan sukses.
- **Pending 1** → berhenti. Berarti salah satu sudah applied di luar jalur ini, atau image tidak
  memuat yang lain — dua-duanya berarti asumsi dokumen ini salah.
- **Pending > 2, atau ada nama lain** → berhenti dan laporkan. `20260804000000_quiz_question_types`
  (#14) tercatat di RUNBOOK_DB.md §1.1 sebagai status **tak terverifikasi**; bila ia ikut muncul
  pending, ia **bukan** bagian Wave 1 dan butuh keputusan owner tersendiri sebelum ikut mendarat.

> Perhatikan bahwa `migrate status` di host — bukan tabel di RUNBOOK_DB.md — yang berwenang.
> Kolom Status tabel itu adalah asersi tak terverifikasi; pelajaran 30 Jul 2026 (klaim "≥7 pending"
> yang ternyata salah) datang dari mempercayainya tanpa mengukur.

---

## 5. 🖐️ Jalankan migration

```bash
docker compose -f docker-compose.vps.yml run --rm api npx prisma migrate deploy
docker compose -f docker-compose.vps.yml run --rm api npx prisma migrate status   # -> CURRENT 16/16
```

Dua migration diterapkan berurutan: #15 (BL-123) lebih dulu, lalu #16 (BL-140).

**Bila gagal di tengah — JANGAN retry buta.** Tentukan dulu berapa yang mendarat:

```bash
docker compose -f docker-compose.vps.yml exec -T postgres psql -U jagouser -d jago_akademi -tAc \
  "SELECT migration_name, finished_at, rolled_back_at FROM _prisma_migrations
   ORDER BY started_at DESC LIMIT 3;"
```

- **#15 applied, #16 gagal** → kemungkinan besar duplikat `gatewayTxId` lolos dari §2.1 (mis. baris
  baru masuk di antara pre-flight dan deploy). Ini **keputusan data, bukan keputusan deploy**:
  berhenti, laporkan ke owner. Jangan hapus baris duplikat untuk "melancarkan" migration.
- **#15 gagal** → tak terduga (index-only). Jangan lanjut; investigasi sebelum apa pun.

---

## 6. 🖐️ Recreate container

```bash
docker compose -f docker-compose.vps.yml up -d --wait api worker web
```

- ⛔ **`-f docker-compose.vps.yml` wajib.** `prod.yml` memakai topologi nginx-in-Docker tanpa
  published port → nginx host kehilangan `127.0.0.1:3010` → **502 sitewide** (BL-43).
- ⛔ **JANGAN `--remove-orphans`** — bisa menghapus container yang dikelola di luar file compose ini.
- `worker` disebut eksplisit; tanpanya BL-144 tetap berjalan di image lama.
- nginx **tidak** perlu disentuh: ia service systemd di host, dan recreate container tidak
  mengubah `127.0.0.1:3010`/`:4010`.

---

## 7. 🖐️ RENCANA ROLLBACK — putuskan sebelum mulai, bukan saat panik

Rollback punya **dua lapis terpisah**. Kode bisa dibalik cepat; migration tidak ikut terbalik
sendiri (aturan TASK-021).

### 7.1 Rollback kode → `bd19788`

```bash
cd /var/www/jago-akademi
git checkout bd19788                                    # = isi /tmp/jago-rollback-commit.txt (§0.1)
docker compose -f docker-compose.vps.yml build --no-cache api web
docker compose -f docker-compose.vps.yml up -d --wait api worker web
docker port jago-akademi-web-1                          # WAJIB 3010
docker port jago-akademi-api-1                          # WAJIB 4010
```

Host akan berada di detached HEAD. Biarkan begitu sampai owner memutuskan; jangan
`reset --hard` `main` di server tanpa keputusan itu.

### 7.2 Apakah unique index perlu dibalik? — Biasanya TIDAK

Kode `bd19788` tetap berjalan dengan index terpasang. Ia menulis `gatewayTxId` skema lama
(`JA-` + 8 hex); index hanya menolak **duplikat**, dan duplikat pada 8 hex acak sangat jarang.
Efeknya: kalau tabrakan itu benar-benar terjadi, checkout **gagal keras** alih-alih diam-diam
menyalahartikan pembayaran — kegagalan yang lebih baik daripada BL-140.

Baris invoice format lama tidak diubah migration ini dan tetap bisa ditemukan webhook maupun
rekonsiliasi.

**Balik index hanya bila** ia terbukti memblokir checkout produksi:

```sql
DROP INDEX IF EXISTS "payment_transactions_gatewayTxId_key";
DELETE FROM _prisma_migrations
 WHERE migration_name = '20260827000000_payment_transaction_gateway_tx_id_unique';
```

Migration #15 (BL-123) **tidak perlu dibalik dalam skenario apa pun.** Ia hanya menambah dua
index non-unique; kode `bd19788` tak terganggu olehnya, dan menghapusnya justru mengembalikan
sequential scan pada setiap pembacaan kurikulum. Biarkan terpasang. (Kalau toh harus:
`DROP INDEX` `course_sections_courseId_idx` dan `course_lessons_sectionId_idx`, plus baris
`_prisma_migrations`-nya — dengan alasan yang sama tentang keharusan menghapus baris itu.)

Baris `_prisma_migrations` **harus** ikut dihapus — kalau tidak, `migrate deploy` berikutnya
menganggapnya sudah applied dan index tidak pernah dibuat ulang.

### 7.3 Rollback total (migration rusak / data tak konsisten)

```bash
# HENTIKAN penulis dulu, jangan restore ke DB yang sedang ditulisi
docker compose -f docker-compose.vps.yml stop api worker web

zcat /var/www/jago-akademi/backups/<file-dari-§1>.sql.gz \
  | docker compose -f docker-compose.vps.yml exec -T postgres \
      psql -U jagouser -d jago_akademi -v ON_ERROR_STOP=1
```

⛔ Destruktif. Setiap pembayaran yang masuk **setelah** backup diambil akan hilang — karena itu §1
dijalankan tepat sebelum deploy, dan karena itu jendela deploy harus pendek. Butuh persetujuan
owner tersendiri, tidak tercakup persetujuan deploy ini.

---

## 8. 🖐️ Verifikasi pasca-deploy

### 8.1 Published port — guard BL-43, jalankan PALING DULU

```bash
docker port jago-akademi-web-1     # WAJIB memuat 3010
docker port jago-akademi-api-1     # WAJIB memuat 4010
```

Kosong = published port hilang → 502 sitewide sedang berlangsung. Perbaiki segera:
`docker compose -f docker-compose.vps.yml up -d --force-recreate api worker web`.

### 8.2 Kesiapan dependensi — ketiganya `ok`

```bash
curl -fsS https://jagoakademi.com/api/ready | jq .
```

Target:

```json
{ "status": "ready", "deps": { "db": "ok", "search": "ok", "redis": "ok" } }
```

- `redis: "skipped"` = `REDIS_URL` tidak terbaca → **BL-144 tidak berjalan.** Cek service `redis`
  naik dan container api memang membaca `REDIS_URL` (§0.3).
- `redis: "error"` → endpoint membalas **503** dan `status: "not-ready"`.
- HTTP 503 apa pun = jangan nyatakan deploy sukses.

### 8.3 Bukti versi — ⛔ JANGAN pakai `/api/health`

> **BL-152:** `/api/health` melaporkan `version` dari env `APP_VERSION` di host, yang **tidak ikut
> diperbarui saat deploy**. Nilainya membeku di versi kapan pun ia terakhir disetel manual
> (terverifikasi 27 Agu 2026: melaporkan `250b0fa`, 63 commit tertinggal). Endpoint itu **bukan
> bukti versi** dan tidak boleh dipakai sebagai gerbang di sini.

Dua bukti yang sah — git di host, dan grep ke **dalam** container:

```bash
# (a) source di host
cd /var/www/jago-akademi && git log --oneline -1     # harus a5bbb26
git rev-parse HEAD

# (b) yang benar-benar ter-bake di image api — inilah yang berjalan
docker compose -f docker-compose.vps.yml exec -T api sh -lc \
  'ls prisma/migrations | grep -c 20260827000000'                    # -> 1  (BL-140)
docker compose -f docker-compose.vps.yml exec -T api sh -lc \
  'grep -c refund_pending dist/jobs/processors/webhook.js'           # -> >0 (predikat BL-138)
docker compose -f docker-compose.vps.yml exec -T api sh -lc \
  'ls dist/services/payment/invoiceNumber.js'                        # ada  (BL-140/148)
docker compose -f docker-compose.vps.yml exec -T api sh -lc \
  'ls dist/services/payment/reconciliation.js dist/jobs/processors/reconcile.js'   # ada (BL-144)

# (c) worker memakai image yang SAMA — buktikan, jangan diasumsikan
docker compose -f docker-compose.vps.yml exec -T worker sh -lc \
  'ls dist/jobs/processors/reconcile.js'
docker inspect -f '{{.Image}}' jago-akademi-api-1 jago-akademi-worker-1   # dua ID harus IDENTIK
```

Butir (c) penting: kalau worker masih memakai image lama, BL-144 tidak turun meskipun api sudah
baru — dan tidak ada gejala yang terlihat dari luar.

### 8.4 BL-144 benar-benar terjadwal

```bash
docker compose -f docker-compose.vps.yml logs worker --tail 100 | grep -iE 'reconcil|repeat'
```

Harus muncul jejak penjadwalan sapuan. Sunyi total = sapuan tidak aktif.

### 8.5 Migration final

```bash
docker compose -f docker-compose.vps.yml run --rm api npx prisma migrate status   # CURRENT 16/16

docker compose -f docker-compose.vps.yml exec -T postgres psql -U jagouser -d jago_akademi -tAc \
  "SELECT indexname FROM pg_indexes WHERE tablename='payment_transactions'
   AND indexname='payment_transactions_gatewayTxId_key';"    # -> 1 baris
```

### 8.6 Smoke test situs (regresi BL-35 — CSS)

```bash
curl -fsSI https://jagoakademi.com | head -5                 # 200 + security headers
CSS=$(curl -fsS https://jagoakademi.com | grep -oE '/_next/static/[^"]*\.css' | head -1)
curl -sSI "https://jagoakademi.com${CSS}" | grep -iE 'HTTP|content-type|content-length'   # ~100KB+
curl -fsS "https://jagoakademi.com${CSS}" | grep -oE '\.flex\{|\.mx-auto|\.grid-cols-1' | sort -u
curl -fsS "https://jagoakademi.com${CSS}" | grep -c '@config\|@plugin'                    # -> 0
```

### 8.7 Jalur internal web → api

```bash
docker compose -f docker-compose.vps.yml exec -T web wget -qO- http://api:4000/api/health
```

---

## 9. Yang TIDAK tercakup deploy ini

Jangan diklaim selesai setelah deploy berhasil:

- **Webhook DOKU belum terdaftar** ke `https://jagoakademi.com/api/webhooks/doku`. Seluruh Wave 1
  memperbaiki *penanganan* notifikasi; kalau DOKU tidak pernah mengirim notifikasi ke URL yang
  benar, pembayaran tetap tak terkonfirmasi. Item human-gated tersendiri.
- **BL-152** (`APP_VERSION` dari build-arg, bukan env host) tidak diperbaiki di sini —
  `/api/health` akan **tetap** melaporkan versi salah setelah deploy. Itu ekspektasi, bukan gejala.
- **BL-114** (`/mentor` fiktif) tidak termasuk — branch mitigasinya tidak ada di `main`.
- Backup cron, restore drill terjadwal, `SENTRY_DSN`, cron certbot — masih terbuka.
- Kalibrasi BL-150/BL-151 baru mungkin setelah webhook produksi berjalan.

## Ringkasan gerbang berhenti

| Gerbang | Kondisi BERHENTI |
|---|---|
| §0.1 | `HEAD` bukan `bd19788` |
| §0.2 | working tree host tidak bersih |
| §0.3 | `/api/ready` melaporkan `redis: "skipped"` → BL-144 tidak akan berjalan |
| §1 | `backup.sh` exit `1`, atau salah satu bukti §1.1 gagal |
| §2.1 | ada duplikat `gatewayTxId` → **keputusan data, eskalasi owner** |
| §2.2 | `payment_transactions` / `course_sections` / `course_lessons` ratusan ribu baris |
| §4.1 | "migrations found" ≠ 16, atau pending ≠ 2, atau muncul nama di luar #15/#16 |
| §5 | `migrate deploy` error → jangan retry buta |
| §8.1 | `docker port` tidak menampilkan 3010 / 4010 |
| §8.2 | `/api/ready` bukan 200, atau ada dep `error` |

---

## Lampiran A — blok siap tempel (operator)

Dijalankan **dari dalam host** (`ssh` dulu, lalu tempel per blok). Perintah saja; alasan tiap
langkah ada di bagian bernomor di atas. **Jangan gabungkan blok** — jeda di antaranya adalah
gerbang keputusan, bukan basa-basi.

### Blok 1 — §0 pre-flight (baca-saja)

```bash
cd /var/www/jago-akademi
echo "--- HEAD ---"; git rev-parse HEAD | tee /tmp/jago-rollback-commit.txt; git log --oneline -1
[ "$(git rev-parse --short HEAD)" = "bd19788" ] && echo "OK: host di bd19788" || echo "!! BERHENTI: HEAD bukan bd19788"
echo "--- working tree (harus kosong) ---"; git status --porcelain
echo "--- containers ---"; docker compose -f docker-compose.vps.yml ps
echo "--- ports ---"; docker port jago-akademi-web-1; docker port jago-akademi-api-1
echo "--- ready (redis harus ok, bukan skipped) ---"; curl -fsS https://jagoakademi.com/api/ready; echo
echo "--- disk ---"; df -h /var/lib/docker /var/www
```

### Blok 2 — §1 backup + bukti

```bash
cd /var/www/jago-akademi
COMPOSE_DIR=/var/www/jago-akademi /bin/bash ./scripts/backup.sh; echo "BACKUP_EXIT=$?"
```

`BACKUP_EXIT` 0 atau 10 = lanjut (10 = offsite belum ada, backup lokal tetap valid). 1 = BERHENTI.

```bash
BK=$(ls -t /var/www/jago-akademi/backups/*.sql.gz | head -1); echo "FILE=$BK"; ls -l "$BK"
gzip -t "$BK" && echo "1) gzip OK" || echo "1) !! gzip RUSAK - BERHENTI"
echo "2) footer=$(zcat "$BK" | tail -20 | grep -c 'PostgreSQL database dump complete')  (harus 1)"
echo "3) tabel=$(zcat "$BK" | grep -c '^CREATE TABLE ')  (harus >= 45)"
echo "4) payment_transactions=$(zcat "$BK" | grep -c 'payment_transactions')  (harus > 0)"
echo "SIMPAN NAMA FILE INI untuk rollback: $BK"
```

### Blok 3 — §2 pre-flight migration ⚠️ GERBANG PALING PENTING

```bash
cd /var/www/jago-akademi
echo "=== duplikat gatewayTxId (HARUS KOSONG) ==="
docker compose -f docker-compose.vps.yml exec -T postgres psql -U jagouser -d jago_akademi -tAc "SELECT \"gatewayTxId\"||' -> '||COUNT(*)||' baris' FROM payment_transactions
 WHERE \"gatewayTxId\" IS NOT NULL GROUP BY \"gatewayTxId\" HAVING COUNT(*)>1;"
echo "=== (kosong di atas = aman) ==="

docker compose -f docker-compose.vps.yml exec -T postgres psql -U jagouser -d jago_akademi -c "SELECT 'payment_transactions' AS t, COUNT(*) FROM payment_transactions
 UNION ALL SELECT 'course_sections', COUNT(*) FROM course_sections
 UNION ALL SELECT 'course_lessons', COUNT(*) FROM course_lessons;"
```

⛔ **Ada baris duplikat = BERHENTI TOTAL.** Jangan hapus, jangan rename. Dua order berbagi satu
identitas pembayaran — keputusan data, eskalasi ke owner (§2.1).

### Blok 4 — §3 + §4 ambil kode, build, cek status

```bash
cd /var/www/jago-akademi
git pull --ff-only origin main && git log --oneline -1
[ "$(git rev-parse --short HEAD)" = "a5bbb26" ] && echo "OK: di a5bbb26" || echo "!! BERHENTI: bukan a5bbb26"

docker compose -f docker-compose.vps.yml build --no-cache api web 2>&1 | tee /tmp/jago-build.log | tail -20
grep -c 'OK(BL-35)' /tmp/jago-build.log      # harus >= 1
grep -c 'FATAL(BL-35)' /tmp/jago-build.log   # harus 0

echo "migration di repo: $(ls apps/api/prisma/migrations/ | grep -v migration_lock | wc -l)  (harus 16)"
docker compose -f docker-compose.vps.yml run --rm api npx prisma migrate status
```

⛔ **BERHENTI dan periksa:** `16 migrations found`, **tepat 2 pending**
(`20260821000000_course_section_lesson_fk_index`, `20260827000000_payment_transaction_gateway_tx_id_unique`).
Angka lain = jangan lanjut (§4.1).

### Blok 5 — §5 migration

```bash
cd /var/www/jago-akademi
docker compose -f docker-compose.vps.yml run --rm api npx prisma migrate deploy
docker compose -f docker-compose.vps.yml run --rm api npx prisma migrate status   # CURRENT 16/16
```

Gagal di tengah? Jangan retry. Cek apa yang mendarat:

```bash
docker compose -f docker-compose.vps.yml exec -T postgres psql -U jagouser -d jago_akademi -tAc "SELECT migration_name, finished_at, rolled_back_at FROM _prisma_migrations ORDER BY started_at DESC LIMIT 3;"
```

### Blok 6 — §6 recreate

```bash
cd /var/www/jago-akademi
docker compose -f docker-compose.vps.yml up -d --wait api worker web
docker port jago-akademi-web-1     # WAJIB 3010
docker port jago-akademi-api-1     # WAJIB 4010
```

### Blok 7 — §8 verifikasi

```bash
cd /var/www/jago-akademi
echo "=== 1. ready (ketiganya ok) ==="; curl -fsS https://jagoakademi.com/api/ready; echo

echo "=== 2. versi: git host (BUKAN /api/health, BL-152) ==="; git log --oneline -1

echo "=== 3. versi: isi container ==="
docker compose -f docker-compose.vps.yml exec -T api sh -lc 'ls prisma/migrations | grep -c 20260827000000'
docker compose -f docker-compose.vps.yml exec -T api sh -lc 'grep -c refund_pending dist/jobs/processors/webhook.js'
docker compose -f docker-compose.vps.yml exec -T api sh -lc 'ls dist/services/payment/invoiceNumber.js dist/services/payment/reconciliation.js dist/jobs/processors/reconcile.js'
docker compose -f docker-compose.vps.yml exec -T worker sh -lc 'ls dist/jobs/processors/reconcile.js'
docker inspect -f '{{.Image}}' jago-akademi-api-1 jago-akademi-worker-1   # HARUS IDENTIK

echo "=== 4. BL-144 terjadwal ==="
docker compose -f docker-compose.vps.yml logs worker --tail 100 | grep -iE 'reconcil|repeat'

echo "=== 5. index BL-140 + BL-123 ==="
docker compose -f docker-compose.vps.yml exec -T postgres psql -U jagouser -d jago_akademi -tAc "SELECT indexname FROM pg_indexes WHERE indexname IN
 ('payment_transactions_gatewayTxId_key','course_sections_courseId_idx','course_lessons_sectionId_idx');"

echo "=== 6. CSS / BL-35 ==="
CSS=$(curl -fsS https://jagoakademi.com | grep -oE '/_next/static/[^"]*\.css' | head -1)
curl -sSI "https://jagoakademi.com${CSS}" | grep -iE 'HTTP|content-type|content-length'
curl -fsS "https://jagoakademi.com${CSS}" | grep -oE '\.flex\{|\.mx-auto|\.grid-cols-1' | sort -u
echo "direktif mentah (harus 0): $(curl -fsS "https://jagoakademi.com${CSS}" | grep -c '@config\|@plugin')"

echo "=== 7. jalur internal ==="
docker compose -f docker-compose.vps.yml exec -T web wget -qO- http://api:4000/api/health; echo
```

### Blok R — rollback kode (kalau perlu)

```bash
cd /var/www/jago-akademi
git checkout $(cat /tmp/jago-rollback-commit.txt)
docker compose -f docker-compose.vps.yml build --no-cache api web
docker compose -f docker-compose.vps.yml up -d --wait api worker web
docker port jago-akademi-web-1; docker port jago-akademi-api-1
```

Index **tidak** ikut dibalik — lihat §7.2 sebelum menyentuhnya.

