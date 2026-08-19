# RUNBOOK — Database Production (TASK-021)

> Migration, backup, restore drill, index, dan seed untuk Postgres produksi. Operasi bertanda 🖐️ = human-gated (migrate produksi & restore destruktif — **backup dulu, selalu**).

## 1. Migration workflow (dev → prod)

Migrations kini ter-commit di `apps/api/prisma/migrations/` (baseline `00000000000000_init` — 41 tabel + 44 index, dibuat via `prisma migrate diff`, tanpa DB).

| Situasi | Perintah |
|---------|----------|
| **Prod DB BARU (kosong)** | `docker compose -f docker-compose.vps.yml run --rm api npx prisma migrate deploy` 🖐️ |
| **Prod DB EXISTING dari `db push`** (sudah ada tabel) | Baseline dulu (sekali): `docker compose ... run --rm api npx prisma migrate resolve --applied 00000000000000_init` 🖐️ → selanjutnya `migrate deploy` normal |
| Dev lokal | `docker compose -f docker-compose.dev.yml up -d` → `npx prisma migrate dev` ⚠️ **baca peringatan drift §1.2 dulu** |
| Schema berubah (task berikutnya) | `npx prisma migrate dev --name <nama>` di dev ⚠️ (**§1.2**) → commit folder migration → CD menjalankan `migrate deploy` |

> Compose produksi = **`docker-compose.vps.yml`**. `docker-compose.prod.yml` memakai topologi
> nginx-in-Docker tanpa published port; memakainya di host = 502 sitewide (BL-43).

## 1.1 Inventaris migration — **13 folder** (per 29 Jul 2026)

Sumber kebenaran: `ls apps/api/prisma/migrations/`. **Verifikasi status sebenarnya di host** sebelum
mengandalkan tabel ini:

```bash
docker compose -f docker-compose.vps.yml run --rm api npx prisma migrate status
```

| # | Folder | Isi | Status |
|---|--------|-----|--------|
| 1 | `00000000000000_init` | Baseline 41 tabel + 44 index | ✅ applied (via `migrate resolve`) |
| 2 | `20260707120000_add_lead` | Tabel `leads` | ✅ applied |
| 3 | `20260707130000_add_testimonial` | Tabel `testimonials` | ✅ applied |
| 4 | `20260714000000_add_fk_hot_path_indexes` | Index hot-path FK (H10) | ✅ applied (rilis `c106748`) |
| 5 | `20260715000000_lms_child_tenantid` | `tenantId` tabel anak LMS + backfill | ✅ applied (rilis `c106748`) |
| 6 | `20260715120000_batch8_findings` | `orders.subscriptionConsumedAt` + dedup sertifikat + unique `(userId,courseId,type)` | ✅ applied (rilis `c106748`) |
| 7 | `20260717000000_course_approval_payout_fields` | Field approval + payout pada `courses` | ✅ applied |
| 8 | `20260721000000_course_private_class` | Skema private class | ✅ applied |
| 9 | `20260721100000_alumni_portfolio` | Skema alumni/portfolio | ✅ applied |
| 10 | `20260729000000_trainer_payout_indexes` | `trainer_payouts(trainerId)`, `(status)` | ✅ applied (30 Jul 2026) |
| 11 | `20260729000001_user_roles_global_unique` | Partial unique `user_roles(userId, role) WHERE tenantId IS NULL` | ✅ applied (30 Jul 2026) — ⚠️ drift disengaja, §1.2 |
| 12 | `20260729000002_refund_status_index` | `refunds(status)` | ✅ applied (30 Jul 2026) |
| 13 | `20260729000003_orderitem_item_lookup_index` | Index lookup `order_items` (BL-98) | ✅ applied (30 Jul 2026) |

> ✅ **30 Jul 2026 — DB produksi CURRENT: 13/13 applied.** `migrate deploy` menerapkan #10–13
> berurutan tanpa error; pre-flight duplikat `user_roles` dan audit role ber-tenant keduanya
> mengembalikan **0 baris**, sehingga #11 (yang bisa menggagalkan seluruh rangkaian) lolos dan #12–13
> ikut mendarat. Backup pra-deploy: `backups/jago-2026-07-30-0621.sql.gz`.

> 🔴 **KOREKSI 30 Jul 2026 — klaim "pending ≥ 7" itu SALAH.** Versi sebelumnya menandai #7, #8, dan
> #9 sebagai PENDING dan menyimpulkan "skema private-class/alumni tidak ada padahal kodenya live".
> `migrate status` di host membuktikan ketiganya **sudah applied sejak sebelum 30 Jul** — yang benar-benar
> pending hanya **4** (#10–13). Kekhawatiran "kode live tanpa tabel" tidak pernah terjadi.
> Pelajarannya: kolom Status di tabel ini adalah **asersi tak terverifikasi**; hanya
> `_prisma_migrations` di host yang berwenang. Jangan menyalakan alarm dari tabel ini tanpa
> menjalankan `migrate status` lebih dulu.

> ⚠️ **JEBAKAN — `migrate status` bisa berbohong bila image `api` basi. Build DULU, baru migrate.**
> `docker compose run --rm api` memakai image `api` yang **sudah ada**, bukan source di working tree.
> Bila image dibangun sebelum migration baru ditambahkan, Prisma hanya melihat folder yang ter-bake di
> dalamnya. Pada 30 Jul 2026 ia melaporkan `9 migrations found` + **"Database schema is up to date!"**
> padahal repo punya 13 dan 4 belum applied — jawaban yang benar untuk 9 itu, tapi menyesatkan total
> sebagai gerbang deploy. Urutan yang benar:
>
> ```bash
> git pull --ff-only origin main
> docker compose -f docker-compose.vps.yml build --no-cache api web   # ← DULU
> docker compose -f docker-compose.vps.yml run --rm api npx prisma migrate status
> ```
>
> Bila jumlah "migrations found" tidak sama dengan `ls apps/api/prisma/migrations/ | wc -l`,
> **berhenti** — image belum tergantikan, dan `migrate deploy` akan jadi no-op yang melaporkan sukses.

**🖐️ Pre-flight wajib sebelum `migrate deploy`:**

1. **Backup** (`scripts/backup.sh`) — selalu, tanpa kecuali.
2. **Deteksi duplikat `user_roles`** (untuk #11; query lengkap ada di header file migration-nya).
   Jika ada duplikat, pembuatan index **gagal** dan seluruh `migrate deploy` berhenti. Penghapusan
   baris sengaja tidak disertakan — manusia yang harus memutuskan baris mana yang bertahan:
   ```sql
   SELECT "userId", role, COUNT(*) FROM user_roles
   WHERE "tenantId" IS NULL GROUP BY 1,2 HAVING COUNT(*) > 1;
   ```
3. **Audit role ber-tenant** (BL-111, konsumen #11):
   ```sql
   SELECT "userId", role, "tenantId" FROM user_roles
   WHERE "tenantId" IS NOT NULL AND role NOT IN ('lms_admin','lms_employee');
   ```
   Hasil non-kosong = orang yang akan kehilangan akses setelah deploy. Kosong = aman.

## 1.2 ⚠️ Drift schema yang DISENGAJA — jangan "diperbaiki"

`20260729000001_user_roles_global_unique` membuat **partial unique index**
(`WHERE "tenantId" IS NULL`). Konstruksi itu **tidak bisa diekspresikan di Prisma DSL**, jadi ia
tidak ada di `schema.prisma`.

Konsekuensinya: **`prisma migrate dev` dan `prisma migrate diff` akan mengusulkan**

```
DROP INDEX "user_roles_userId_role_global_key";
```

🔴 **ABAIKAN usulan itu.** Menerimanya menghapus satu-satunya penjaga keunikan role global —
duplikat `user_roles` bisa masuk lagi tanpa terdeteksi. Bila `migrate dev` sudah terlanjur
menghasilkan migration berisi `DROP INDEX` tersebut, **hapus folder migration itu**, jangan
di-commit.

`migrate deploy` (jalur produksi) **tidak terpengaruh** — ia hanya menjalankan file yang ada, tidak
pernah membandingkan dengan `schema.prisma`. Alasan lengkap ditulis di header file migration.

**Aturan migration (wajib):**
- 🖐️ **Backup sebelum setiap `migrate deploy`** (§2) — CD melakukannya juga via cron harian, tapi pre-migrate manual snapshot untuk perubahan besar.
- Migration harus **backward-compatible** dengan image versi sebelumnya (rollback image tidak membatalkan migration): tambah kolom nullable → backfill → baru NOT NULL di migration berikutnya; jangan DROP kolom yang masih dibaca versi lama.
- Migration destruktif (DROP/ALTER TYPE) → review manusia + restore drill terbaru.

## 2. Backup

> 🔴 **INSIDEN 4–6 Agu 2026 — backup terjadwal DIAM-DIAM nol keluaran selama 3 malam.**
> Cron menyala tepat waktu setiap malam dan file cron ada, tapi `/var/log/jago-backup.log`
> hanya mengulang satu baris:
> `/bin/bash: line 1: /var/www/jago-akademi/scripts/backup.sh: Permission denied`
> Sebabnya: cron mengeksekusi script **berdasarkan path**, sementara file itu ter-track di
> Git sebagai mode `100644`, jadi checkout di host jadi `644` — tidak executable. Bash
> menolak dengan exit 126. Eksekusi **tidak pernah** sampai ke Docker, `pg_dump`, gzip,
> retensi, atau rclone. **Seluruh backup yang ada dibuat manual.** Ini lebih berbahaya
> daripada cron yang belum dipasang, karena dari luar tampak terpasang.
>
> Dua perbaikan independen, sengaja dua-duanya: (1) mode index Git kini `100755`;
> (2) baris cron memanggil `/bin/bash <script>` sehingga kebal bila exec bit hilang lagi.

**Path deploy sebenarnya `/var/www/jago-akademi`** — bukan `/opt/jago-akademi`. Runbook ini
sempat mendokumentasikan path yang salah; disamakan dengan kenyataan host per audit 6 Agu 2026.

Otomatis via `scripts/backup.sh`: lock anti-overlap → pg_dump → gzip → **validasi berlapis**
→ **atomic hard-link publish** → offsite terverifikasi → retensi (sementara **30 hari**, §2.6).

Jadwal: **02:15 waktu server, setiap hari.** Script **wajib** dipanggil lewat `/bin/bash <path>`
— bukan by path saja — supaya baris cron kebal bila exec bit hilang lagi (§2).

**Cron dan logrotate adalah dua artefak independen.** Pasang masing-masing dengan gate-nya
sendiri; jangan disatukan dalam satu skrip instalasi. Pelajaran 10 Agu 2026: validasi logrotate
yang gagal ikut memblokir instalasi cron yang sama sekali tidak bergantung padanya.

```bash
# host — artefak repo, jangan ketik ulang. Dua langkah TERPISAH:
sudo cp deploy/jago-backup.cron      /etc/cron.d/jago-backup       # langkah 1
sudo cp deploy/jago-backup.logrotate /etc/logrotate.d/jago-backup  # langkah 2, §2.6
# R2: rclone config → remote "r2" (S3-compatible, endpoint akun Cloudflare)
```

Manual sebelum migrate: `COMPOSE_DIR=/var/www/jago-akademi /bin/bash ./scripts/backup.sh`

> 🖐️ **Fase kerja lokal tidak pernah menjalankan backup atau restore produksi.** Perubahan
> konfigurasi disiapkan dan diuji di repo canonical, lalu dipindahkan lewat bundle. Menjalankan
> `backup.sh`/`restore.sh` terhadap produksi selalu tindakan host tersendiri yang butuh
> persetujuan owner.

### 2.1 Exit code — kontrak, dipakai alerting

| Exit | RESULT | Arti |
|---|---|---|
| `0` | `OK` | backup lokal valid; offsite terverifikasi atau memang tidak dikonfigurasi |
| `10` | `DEGRADED` | backup lokal valid dan **dipertahankan**, tapi offsite gagal/tak terverifikasi |
| `75` | `SKIPPED` | run lain memegang lock (EX_TEMPFAIL); tidak ada yang dikerjakan |
| `1` | `FAIL` | tidak ada backup yang bisa dipakai |

### 2.2 Kenapa validasinya berlapis

Script lama menulis langsung ke nama file final, sehingga dump yang terpotong meninggalkan
file yang **tampak** seperti backup — lalu retensi memangkas backup lama yang justru masih
bagus. Sekarang semua ditulis ke `.partial` di direktori yang sama (agar rename-nya atomic),
dan baru menjadi backup setelah lolos: ukuran minimum, `gzip -t`, footer
`-- PostgreSQL database dump complete`, dan jumlah tabel ≥ `MIN_TABLES`.

Ambang `MIN_TABLES` **diukur, bukan ditebak**. Dump produksi 4 Agu 2026 diperiksa read-only:

```
zcat backups/jago-2026-08-04-1051.sql.gz | grep -c '^CREATE TABLE '   →  45
```

Cocok dengan 44 model di `apps/api/prisma/schema.prisma` + `_prisma_migrations`, dengan
14/14 migration ter-apply. Karena itu **default `MIN_TABLES=45`** — angka produksi yang
sebenarnya, bukan angka berbantalan. Dump dengan 44 tabel **tidak** dinyatakan sehat.
Naikkan/turunkan hanya untuk perubahan skema yang disengaja, dan catat di release atau
migration yang menyebabkannya.

**Footer validator memakai jendela `tail -20`, bukan `tail -5`.** Sejak security release
Agu 2025 (CVE-2025-8714) `pg_dump` menambahkan baris `\unrestrict <nonce>` **setelah**
footer, dan dump produksi 4 Agu 2026 mengonfirmasinya:

```
-- PostgreSQL database dump complete
--

\unrestrict XdBL...
```

Jendela 5 baris tinggal satu baris lagi dari menolak setiap backup sehat di host ini.

**`flock` adalah dependency keras**, terverifikasi ada di host (`/usr/bin/flock`,
util-linux 2.39.3). Tidak ada mekanisme lock cadangan — sengaja. Bila `flock` hilang,
script berhenti dengan `RESULT=FAIL reason=flock_tidak_tersedia` dan **tidak menjalankan
dump**; backup yang diam-diam berjalan tanpa lock lebih berbahaya daripada yang menolak start.

**Publish memakai atomic hard-link publish** (`ln` lalu unlink), **bukan `mv -f`**. Hard link
gagal secara atomic bila nama tujuan sudah ada, jadi tabrakan nama tidak akan pernah menimpa
backup lama. `mv -n` bukan pengganti: ia melewati diam-diam dan akan melapor sukses padahal
tidak menerbitkan apa pun. Kegagalan `ln` dibedakan: bila `$FINAL` memang sudah ada →
`collision_saat_publish`; selain itu (disk penuh, mount read-only, permission) →
`publish_gagal`. Menyebut semuanya "collision" akan mengarahkan responder mencari duplikat
nama padahal masalahnya di filesystem. Timestamp juga naik ke resolusi **detik**
(`%F-%H%M%S`) — granularitas menit lama membuat run cron dan snapshot pra-deploy dalam menit
yang sama beradu nama.

**Kontrak kegagalan berbalik tepat setelah hard-link berhasil.** Begitu `$FINAL` ada,
`PUBLISHED=1` disetel dan ERR handler diganti ke jalur `DEGRADED` — **sebelum** cleanup
`.partial`, `chmod`, dan logging dijalankan. Urutan itu penting: revisi sebelumnya
meninggalkan ketiganya di dalam jendela `FAIL`, sehingga `rm` yang gagal bisa melaporkan
"tidak ada backup" padahal backup valid sudah ada di disk. Sesudah publish, kegagalan
cleanup/permission/logging/offsite/retensi semuanya `DEGRADED`; **error handler tidak pernah
menghapus `$FINAL`**.

Retensi **hanya** berjalan setelah file final baru terbukti valid — malam yang gagal tidak
akan pernah mempersempit jendela pemulihan. Kegagalan retensi **setelah** file final valid
adalah masalah kerapian, bukan masalah backup: hasilnya `DEGRADED`, bukan `FAIL`.

### 2.3 Verifikasi setelah memasang

```bash
grep -E 'RESULT=|OFFSITE_' /var/log/jago-backup.log | tail
ls -la /var/www/jago-akademi/backups/          # file baru, mode 0600
```

Backup **belum** dianggap pulih sampai muncul file baru pada **dua malam berturut-turut**.

### 2.4 ⚠️ Ekspektasi saat deployment pertama: `DEGRADED`, dan itu BENAR

`rclone` **belum terpasang** di host (diverifikasi 7 Agu 2026: `command -v rclone` kosong).
Karena cron menyetel `R2_REMOTE=r2:jago-backups`, run pertama diperkirakan menghasilkan:

- backup lokal **valid** dan tersimpan;
- `OFFSITE_WARN rclone_tidak_terpasang`;
- **`RESULT=DEGRADED`, exit 10**.

**Ketiadaan `rclone` BUKAN kegagalan backup lokal.** Backup lokal tetap dibuat, divalidasi,
di-publish, dan retensi tetap berjalan; yang tidak terjadi hanyalah salinan luar-host. Karena
itu hasilnya `DEGRADED` (backup ada, perlindungan belum lengkap) dan **tidak pernah** `FAIL`
(tidak ada backup). Membedakan keduanya adalah inti kontrak exit code di §2.1.

Itu perilaku yang benar, bukan regresi — dan sengaja tidak disembunyikan. Selama masih
`DEGRADED`, **seluruh backup berada di disk yang sama dengan database yang dilindunginya**;
kehilangan host berarti kehilangan database dan semua backup sekaligus. Memasang serta
mengonfigurasi rclone (termasuk credential R2) adalah **tindakan produksi terpisah yang
butuh persetujuan owner** — jangan digabung dengan perbaikan backup ini.

### 2.5 Test harness

`scripts/tests/backup.test.sh` menjalankan seluruh matriks kegagalan terhadap fixture
sintetis dan executable palsu di `PATH` (`docker`, `gzip`, `rclone`, `find`, `date`, `rm`).
**Tidak pernah menyentuh data produksi, database nyata, dump nyata, atau credential.**

```bash
bash scripts/tests/backup.test.sh
```

Script produksi sengaja **tanpa test seam** — mocking dilakukan lewat `PATH`, sehingga yang
diuji identik byte-per-byte dengan yang berjalan di host. Tes lock saling melengkapi antar
platform: overlap `flock` hanya jalan di Linux, ketiadaan `flock` hanya jalan di Windows;
masing-masing di-SKIP (bukan PASS) di platform yang tak bisa mengujinya dengan jujur.

Setiap kasus kegagalan offsite memakai **retention marker** — sebuah backup bertanggal
tahun 2000 yang wajib dipangkas. Memeriksa exit code saja tak bisa membedakan "retensi
berjalan" dari "retensi dilewati"; marker itu bisa. `restore.sh` juga divalidasi di sini,
tetapi **secara terisolasi dengan `docker` palsu** — itu menguji ambang dan pemilihan
database sasaran, **bukan** restore sungguhan.

### 2.6 Retensi sementara 30 hari, dan gate logrotate

**Retensi host di-override menjadi 30 hari.** Default script tetap 14; baris cron menyetel
`RETENTION_DAYS=30`. Alasannya tunggal: `rclone` belum terpasang, sehingga **seluruh backup
masih berada di disk yang sama dengan database yang dilindunginya**. Selama itu benar,
kedalaman riwayat lokal adalah satu-satunya jaring pemulihan yang ada, dan memangkasnya di
hari ke-14 justru mempersempit satu-satunya hal yang tersisa.

**Jangan menurunkan kembali ke 14 hari sebelum ketiganya benar:**

1. upload offsite berhasil;
2. objek yang diunggah **terbaca ulang** dan **ukurannya cocok** (`OFFSITE_OK`);
3. restore drill ke database disposable **disetujui dan lulus**.

Sampai itu tercapai, run berakhir `RESULT=DEGRADED` **exit 10**. Itu hasil yang benar, bukan
kegagalan: backup lokal valid, tertulis, dan dipertahankan — hanya salinan luar-host yang
belum ada. **Ketiadaan `rclone` bukan kegagalan backup lokal; yang belum lengkap adalah
disaster recovery.** `RESULT=FAIL` exit 1 tetap disediakan khusus untuk "tidak ada backup yang
bisa dipakai sama sekali" (kontrak lengkap di §2.1).

**Validasi kandidat logrotate secara standalone, sebelum dipasang:**

```bash
logrotate -d /path/ke/kandidat        # -d = debug, TIDAK merotasi apa pun
# harus: exit 0, tanpa baris `error:`, tanpa `skipping`,
#        memuat "rotating pattern: /var/log/jago-backup.log weekly (12 rotations)"
```

Karena itulah stanza memuat **`su root adm` eksplisit**. `/var/log` di host ini `root:syslog`
mode `0775` — group-writable oleh grup selain root — sehingga logrotate menolak merotasi
apa pun di bawahnya kecuali ada directive `su`. Nilainya **sengaja sama persis** dengan yang
sudah diwarisi dari `/etc/logrotate.conf` (`su root adm`, dipasang sebelum
`include /etc/logrotate.d`), jadi tidak ada perubahan perilaku saat runtime — yang berubah
hanya: file kini dapat divalidasi sendirian, dan tidak lagi bergantung pada setelan global
yang tak terlihat dari isinya. Empat config `logrotate.d` milik host ini melakukan hal yang
sama. `create 0640 root adm` dipertahankan dan konsisten dengan grup tersebut.

## 3. 🖐️ Restore drill — manual & terkontrol

`scripts/restore.sh` memulihkan backup terbaru ke database **scratch** (`jago_restore_test`),
memverifikasi skema (**≥ 45 tabel**, disamakan dengan `backup.sh` — ambang yang berbeda akan
mengesahkan dump yang justru ditolak tahap backup) + row count, lalu men-drop-nya. **Tidak pernah menyentuh
database produksi.**

> 🖐️ **Restore pertama harus dijalankan manual dengan pengawasan, dan butuh persetujuan
> terpisah owner.** Tidak ada cron restore drill yang dipasang — sengaja. Menjadwalkan drill
> sebelum satu kali dijalankan dengan mata sendiri hanya memindahkan risiko ke tengah malam.

```bash
cd /var/www/jago-akademi
COMPOSE_DIR=/var/www/jago-akademi /bin/bash ./scripts/restore.sh
# → "restore drill PASSED — backup is valid; scratch DB dropped"
```

Setelah drill: pastikan scratch DB benar-benar hilang —
`psql -Atc "SELECT datname FROM pg_database WHERE datname='jago_restore_test';"` harus kosong.

**Restore produksi sungguhan (bencana)** 🖐️: stop api+worker → `dropdb`/`createdb` → restore dump → `migrate resolve` bila perlu → start. Jangan improvisasi — ikuti urutan ini.

## 4. Index verification (setelah deploy)

Index hot-path (TASK-021): `orders(userId,status,createdAt)`, `orders(status,createdAt)`, `payment_transactions(orderId,status)`, `course_enrollments(userId)`, `lms_enrollments(tenantId)`, `lms_enrollments(userId)`.

Run **`scripts/index-audit.sql`** — lists the indexes (reliable even on empty DB)
and EXPLAINs the hot queries:

```bash
docker compose -f docker-compose.vps.yml exec -T postgres \
  psql -U jagouser -d jago_akademi -f - < scripts/index-audit.sql
```

> On an empty/small DB Postgres may still choose `Seq Scan` (cheaper) — the
> **index-present list (A)** is the reliable check now; re-check `EXPLAIN` (B)
> once real data volume exists.

## 5. Seed produksi (minimal)

> 🔴 **VERIFIED live (2 Jul 2026):** production DB migrated but **EMPTY** — `/api/categories` = `[]`, `/api/courses` total 0. **Seeding (or admin content creation) is REQUIRED before Soft Launch** so the catalog isn't blank.

`prisma/seed.ts` = admin + kategori + konten demo. Jalankan **sekali** dari mesin dev dengan tunnel SSH ke prod:

```bash
ssh -N -L 5433:localhost:5432 user@VPS &   # tunnel
cd apps/api
DATABASE_URL="postgresql://jagouser:<pw>@localhost:5433/jago_akademi" \
SEED_ADMIN_EMAIL="admin@jagoakademi.com" \
SEED_ADMIN_PASSWORD="<STRONG — min 12 char, WAJIB set>" \
npx tsx prisma/seed.ts
```

✅ **Fail-closed (TD-33 / QA H-2):** `seed.ts` **tidak** punya default password. Jika `SEED_ADMIN_PASSWORD` kosong atau < 12 karakter, seed **berhenti** (`process.exit(1)`) tanpa membuat admin — jadi mustahil men-deploy admin ber-password lemah/hardcode. Akun trainer demo memakai password acak (`randomBytes(24)`) yang tak bisa di-login sampai admin me-reset. Set `SEED_ADMIN_PASSWORD` yang kuat sebelum menjalankan.

> Verifikasi cepat fail-closed sebelum jalan: menjalankan seed **tanpa** `SEED_ADMIN_PASSWORD` harus keluar dengan pesan `FATAL: SEED_ADMIN_PASSWORD env var is required`. Baru kemudian ulangi dengan password kuat.

## Validation Checklist (TASK-021)

- [x] Folder `prisma/migrations/` + baseline init ter-commit (41 tabel, 44 index)
- [x] Index hot-path §3.4 ada di schema + SQL + `scripts/index-audit.sql`
- [x] `scripts/backup.sh` (cron + retensi + R2) + **`scripts/restore.sh`** (drill otomatis)
- [x] ✅ **`migrate deploy` prod CURRENT 13/13 (30 Jul 2026)** — pre-flight §1.1 dua-duanya 0 baris,
  backup `jago-2026-07-30-0621.sql.gz`, keempat migration 29 Jul ter-apply berurutan, `migrate status`
  ulang = "up to date" pada image baru. (Klaim lama "≥7 pending" salah — #7–9 sudah applied; lihat
  koreksi §1.1.)
> **Backup BELUM boleh dinyatakan pulih** sampai keempat butir di bawah tercentang semua.
> Satu backup manual yang berhasil membuktikan script-nya jalan — bukan membuktikan
> backup produksi sudah sehat.

- [ ] 🖐️ **(a)** Backup manual dengan script baru berhasil (file final ada, mode 0600,
  `tables=45`, `gzip -t` lulus)
- [ ] 🖐️ **(b)** Restore drill manual ke DB disposable berhasil + scratch DB terverifikasi
  hilang — **butuh persetujuan owner terpisah** (§3)
- [ ] 🖐️ **(c)** Salinan offsite terbukti **terbaca** → `RESULT=OK`, bukan `DEGRADED`.
  Terblokir sampai `rclone` terpasang & terkonfigurasi (§2.4) — tindakan produksi terpisah
- [ ] 🖐️ **(d)** Backup terjadwal menghasilkan file pada **dua malam berturut-turut** (§2.3).
  Cron sendiri sudah terpasang sejak 4 Agu 2026 tapi **nol keluaran 3 malam** karena exec bit
  (§2) — jadi centang berdasarkan file yang benar-benar ada, bukan berdasarkan cron ter-copy.
- [ ] 🖐️ Index audit dijalankan (`scripts/index-audit.sql` → indexes present)
- [x] ✅ **Seed produksi sudah jalan** — klaim lama "DB verified EMPTY" kedaluwarsa: live
  `GET /api/courses` mengembalikan persis kursus `seed.ts` (`brand-design-canva`, `seo-mastery`, dst),
  begitu pula events & ebooks (diverifikasi 30 Jul 2026). ⚠️ Konten seed = **demo fiktif yang bisa
  dibeli** (3 trainer fiktif, kursus/event/e-book berbayar tanpa isi) — keputusan konten pra-launch
  tetap di tangan owner (terkait BL-114); **jangan re-run seed** tanpa membaca §5 (re-run
  mem-publish-ulang kursus yang di-unpublish admin).
- [ ] 🖐️ **Backfill `publishedAt` (BL-116)** — `scripts/backfill-published-at.sql`: STEP 1 read-only
  menampilkan kursus `published` ber-`publishedAt` NULL (warisan seed lama), STEP 2 (UPDATE
  `publishedAt = createdAt`) sengaja dikomentari — review STEP 1 + backup dulu, lalu uncomment.
  Hanya tabel `courses` (satu-satunya model lain ber-`publishedAt` adalah `BlogPost`, dan seed blog
  sudah benar). `seed.ts` sudah diperbaiki agar lubangnya tak lahir lagi.
- [ ] 🖐️ `EXPLAIN` menunjukkan index terpakai
