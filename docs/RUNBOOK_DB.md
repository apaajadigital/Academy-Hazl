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

Otomatis via `scripts/backup.sh` (pg_dump → gzip → retensi 14 hari → opsional R2 via rclone):

```bash
# host, sekali:
chmod +x /opt/jago-akademi/scripts/backup.sh
sudo tee /etc/cron.d/jago-backup <<'EOF'
15 2 * * * root COMPOSE_DIR=/opt/jago-akademi R2_REMOTE=r2:jago-backups /opt/jago-akademi/scripts/backup.sh >> /var/log/jago-backup.log 2>&1
EOF
# R2: rclone config → remote "r2" (S3-compatible, endpoint akun Cloudflare)
```

Manual sebelum migrate: `COMPOSE_DIR=/opt/jago-akademi ./scripts/backup.sh`

## 3. 🖐️ Restore drill (uji SEKALI saat gate TASK-021, lalu tiap kuartal)

Restore ke database **scratch** (bukan menimpa produksi) untuk membuktikan backup valid:

Automated via **`scripts/restore.sh`** — restores the latest backup into a scratch
DB, verifies schema (≥ 40 tables) + row counts, then drops it (never touches prod):

```bash
cd /opt/jago-akademi
COMPOSE_DIR=/opt/jago-akademi ./scripts/restore.sh
# → "restore drill PASSED — backup is valid; scratch DB dropped"
```

Run this **once now** to prove the backup (Validation Checklist), then quarterly.

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
- [ ] 🔴 🖐️ **`migrate deploy` prod BELUM current** — `migrate deploy` memang pernah sukses (rilis `c106748`; `/api/ready` → `db: ok`), tapi itu **hanya membuktikan DB tersambung, bukan bahwa skema mutakhir**. Per 29 Jul 2026 **≥7 dari 13 migration masih pending** (§1.1), termasuk skema private-class & alumni yang **kodenya sudah live**. Jalankan `migrate status` lalu `migrate deploy` sesuai pre-flight §1.1.
- [ ] 🖐️ Backup cron aktif (`scripts/backup.sh` + `/etc/cron.d/jago-backup`)
- [ ] 🖐️ Restore drill dijalankan sekali (`./scripts/restore.sh` → PASSED)
- [ ] 🖐️ Index audit dijalankan (`scripts/index-audit.sql` → indexes present)
- [ ] 🔴 🖐️ **Seed produksi** — DB verified EMPTY, wajib sebelum Soft Launch (§5)
- [ ] 🖐️ `EXPLAIN` menunjukkan index terpakai
