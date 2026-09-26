# RUNBOOK — Deploy Rilis QA Remediation (Jul 2026)

Deploy `main @ c106748` (batch 1–8) ke VPS. Ini melengkapi `RUNBOOK_DEPLOY.md` (setup dasar/DNS/SSL) — di sini **hanya langkah rilis + gotcha spesifik**.

> Semua langkah dijalankan **di host VPS**, dari root repo. Ganti nama compose bila perlu; contoh memakai `docker-compose.vps.yml`.

---

## ⚠️ Gotcha yang WAJIB dibaca dulu

1. **`DOKU_SECRET_KEY` sekarang WAJIB di production.** Fix H9 membuat `env.ts` **gagal boot** bila `NODE_ENV=production` tanpa `DOKU_SECRET_KEY`. Kalau belum pakai DOKU nyata, isi nilai sandbox — jangan kosong, atau API tidak mau start.
2. **`REDIS_URL` sekarang dipakai.** Compose vps kini punya service `redis` + `worker`. Tanpa `REDIS_URL`, queue mati & job (email/sertifikat) jalan inline. Compose sudah men-set `REDIS_URL=redis://redis:6379` — pastikan service `redis` ikut naik.
3. **Migrasi TIDAK auto-jalan** (CMD = `node dist/index.js`). Harus `prisma migrate deploy` manual (langkah 4).
4. **API produksi saat ini lebih lama dari repo** — beberapa endpoint (certificates, ebooks/my, event-detail) rusak di live; deploy ini yang memperbaikinya.
5. **Target proxy `/api/*` di-bake saat BUILD, bukan saat start.** Mengubah `NEXT_PUBLIC_API_URL`/`API_PROXY_TARGET` di `.env` lalu `restart` **tidak** berefek — wajib rebuild image web. Nilai yang salah (= origin web) memicu proxy loop; lihat **§0.1**.

---

## 0. Pra-flight — cek env produksi

Pastikan `.env` (yang dibaca compose) punya SEMUA ini terisi:

```bash
# Wajib atau API tidak boot
DATABASE_URL=postgresql://<user>:<pass>@postgres:5432/jago_akademi
JWT_SECRET=<min 32 char acak>
JWT_REFRESH_SECRET=<min 32 char acak, beda>
DOKU_SECRET_KEY=<isi — WAJIB di production (gotcha #1)>
DOKU_CLIENT_ID=<...>
DOKU_IS_PRODUCTION=false        # true saat sudah live-money (setelah TASK-030)
# Infra
POSTGRES_USER=jagouser
POSTGRES_PASSWORD=<...>
MEILISEARCH_KEY=<...>
WEB_URL=https://jagoakademi.com
NEXT_PUBLIC_API_URL=https://jagoakademi.com       # SAMA dgn origin web — benar di VPS ini (§0.1)
NEXT_PUBLIC_SITE_URL=https://jagoakademi.com
API_PROXY_TARGET=http://api:4000                  # WAJIB di VPS ini (§0.1)
# Email
RESEND_API_KEY=<...>
EMAIL_FROM=noreply@jagoakademi.com
# Opsional
SENTRY_DSN=<...>
# Flag: BIARKAN kosong/false dulu (butuh backfill verifikasi email — D5)
ENFORCE_EMAIL_VERIFICATION=false
```

`REDIS_URL` **tidak** perlu di `.env` — compose menyuntiknya (`redis://redis:6379`).

---

## 0.1 Proxy `/api/*` — env + WAJIB rebuild

`apps/web/next.config.js` mem-proxy `/api/*` ke backend lewat `rewrites()`. Dua variabel, dua
pertanyaan berbeda — **jangan disamakan**:

| Variabel | Dipakai siapa | Aturan |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | **Browser** (di-inline ke bundle klien) | Origin API yang bisa dijangkau publik dari internet. **Nilai untuk VPS ini: `https://jagoakademi.com`** — sama dengan origin web, dan itu benar (lihat kotak di bawah). |
| `API_PROXY_TARGET` | **Server** Next, hanya untuk rewrite | Origin internal (`http://api:4000` di jaringan compose). **Bukan** `NEXT_PUBLIC_*`, jadi tidak bocor ke bundle klien. **Wajib di VPS ini** — tanpanya target jatuh ke `NEXT_PUBLIC_API_URL` yang = origin web. |

Urutan resolusi target proxy: `API_PROXY_TARGET` → `NEXT_PUBLIC_API_URL` → `http://localhost:4000`.

> ### 🔴 "`NEXT_PUBLIC_API_URL` harus ≠ origin web" **bukan hukum universal**
>
> Aturan itu hanya berlaku bila `/api/*` dilayani oleh **rewrite Next**. Di VPS ini tidak: nginx
> level-**host** mencegat `/api/` dan meneruskannya langsung ke container api (`127.0.0.1:4010`),
> jadi request browser tidak pernah menyentuh container web. Karena nginx yang memisahkan `/api/`
> dari `/`, `NEXT_PUBLIC_API_URL` **boleh dan harus** sama dengan origin web; loop dicegah oleh
> `API_PROXY_TARGET=http://api:4000`.
>
> ⛔ **`https://api.jagoakademi.com` TIDAK RESOLVE** (BL-33, `docs/INTEGRATION_VERIFICATION.md`).
> Nilai itu ter-**bake** ke bundle klien saat build → **setiap fetch browser gagal**; situs tampil
> tapi mati fungsi, dan `restart` tidak memperbaikinya (wajib rebuild). Jangan pakai.

**Nilai per topologi:**
- **VPS produksi ini** (`docker-compose.vps.yml`, satu domain, nginx host):
  `NEXT_PUBLIC_API_URL=https://jagoakademi.com` + `API_PROXY_TARGET=http://api:4000`
  (nama service compose; web & api satu network). **Ini satu-satunya kombinasi yang benar di sini.**
- **Topologi lain dengan subdomain API terpisah** (referensi historis `docker-compose.prod.yml` +
  `nginx/nginx.conf` — **tidak dipakai di host ini**): `NEXT_PUBLIC_API_URL` diisi origin subdomain
  yang benar-benar resolve, `API_PROXY_TARGET` tidak perlu.
  > `http://127.0.0.1:4010` (port host API) hanya benar bila proses Next berjalan **langsung di host**,
  > bukan di dalam container — di dalam container `127.0.0.1` adalah loopback container itu sendiri.
  > Guard membandingkan **origin**, jadi host sama dengan port berbeda memang diizinkan.

**Guard self-proxy.** Bila target sama dengan origin web, `next.config.js` **menolaknya**, jatuh ke
`http://localhost:4000`, dan mencetak `[next.config] /api/* proxy target rejected ...` di log build.
Ini mencegah loop `nginx → web → rewrite → nginx → …`. Kalau baris itu muncul saat build, env-nya salah —
perbaiki lalu build ulang.

> ### ⚠️ Jebakan ops paling penting
> `rewrites()` di-**bake saat BUILD** untuk output standalone Next.js. Target proxy menjadi literal di
> `.next/routes-manifest.json`. **Mengubah `environment:` di compose lalu `restart` TIDAK memindahkan
> target proxy.** Wajib rebuild image web dengan build-arg:
> ```bash
> docker compose -f docker-compose.vps.yml build --no-cache web
> docker compose -f docker-compose.vps.yml up -d --force-recreate web
> docker port jago-akademi-web-1     # WAJIB 3010 (guard BL-43)
> ```
> ⛔ **Jangan pakai `docker-compose.prod.yml`** untuk `build`/`up` di host ini: file itu memakai
> topologi nginx-in-Docker **tanpa published port**, sehingga recreate `web` dengannya memutus
> `127.0.0.1:3010` dan nginx host langsung **502 sitewide** (insiden BL-43, 28 menit).
>
> **Jangan** pakai `--remove-orphans` di VPS ini. Alasannya **bukan** karena nginx adalah orphan
> container — nginx berjalan di **host** (systemd) dan tak terlihat oleh Docker. Larangan ini
> kehati-hatian: host memuat container di luar file compose ini, dan `--remove-orphans` bisa
> menghapusnya. Reload proxy/TLS = `sudo systemctl reload nginx`; konfigurasi live ada di
> `/etc/nginx/`, **bukan** `nginx/nginx.conf` di repo.

**Prasyarat wiring build-arg — ✅ SUDAH ADA DI REPO, tidak perlu tindakan apa pun.**

`API_PROXY_TARGET` hanya sampai ke tahap build kalau terdaftar sebagai `ARG`/`build-arg`. Itu sudah
terpasang sejak remediasi trainer (BL-75), diverifikasi 29 Jul 2026:

| Tempat | Lokasi |
|---|---|
| `ARG` Dockerfile | `apps/web/Dockerfile:41` |
| `build.args` compose prod | `docker-compose.prod.yml:127` |
| `build.args` compose vps | `docker-compose.vps.yml:139` |
| `build-args` CI | `.github/workflows/deploy.yml:84` |
| `globalEnv` turbo | `turbo.json:8` |

> ⚠️ **JANGAN menerapkan diff penambahan `ARG API_PROXY_TARGET` secara manual.** Versi lama runbook
> ini memuat diff seperti itu dengan label "belum ada di repo" — informasi itu **salah** dan sudah
> dihapus. Menerapkannya di tengah jendela deploy akan menghasilkan `ARG` ganda, dan membatalkan
> deploy karena mengira repo belum siap sama-sama tidak perlu. Yang benar dinyatakan juga di
> `RUNBOOK_DEPLOY.md` §3.1 — kedua runbook kini sepakat.

Yang tersisa hanyalah **menetapkan nilainya**: `API_PROXY_TARGET=http://api:4000` di
`/var/www/jago-akademi/.env` (dan repository variable bernama sama bila deploy lewat CI).
Bila tidak di-set, nilainya kosong dan resolusi jatuh ke `NEXT_PUBLIC_API_URL` — perilaku identik
dengan sebelum variabel ini ada.

---

## 1. Backup DB (WAJIB sebelum migrasi)

```bash
docker compose -f docker-compose.vps.yml exec -T postgres \
  pg_dump -U "$POSTGRES_USER" jago_akademi | gzip > backup_pre_deploy_$(date +%F_%H%M).sql.gz
ls -lh backup_pre_deploy_*.sql.gz   # pastikan file terisi
```
(Detail restore-drill: `RUNBOOK_DB.md`.)

## 2. Ambil kode terbaru

```bash
git fetch origin && git checkout main && git pull --ff-only origin main
git log --oneline -1     # harus c106748 (atau lebih baru)
```

## 3. Build image (tanpa cache untuk web — hindari BL-35 Tailwind kosong)

```bash
docker compose -f docker-compose.vps.yml build api worker
docker compose -f docker-compose.vps.yml build --no-cache web
```

## 4. Jalankan migrasi DB (one-off, sebelum API baru naik)

Naikkan dependency dulu, lalu migrasi:

```bash
docker compose -f docker-compose.vps.yml up -d postgres redis meilisearch
# tunggu postgres healthy (~10 dtk), lalu:
docker compose -f docker-compose.vps.yml run --rm api npx prisma migrate deploy
```

> 🔴 **Daftar di bawah adalah snapshot rilis `c106748` (Jul 2026) — BUKAN daftar pending saat ini.**
> Repo kini punya **13** folder migration dan yang belum ter-apply mencakup **≥7**, termasuk yang
> lahir **setelah** dokumen ini ditulis. **Jangan pakai daftar ini sebagai checklist** — daftar
> pending yang dipelihara ada di **`RUNBOOK_DB.md` §1.1**. Verifikasi selalu dengan
> `docker compose -f docker-compose.vps.yml run --rm api npx prisma migrate status`.

Migrasi yang pending **pada rilis `c106748`** (historis, urut):
- `20260714000000_add_fk_hot_path_indexes` — index hot-path (H10)
- `20260715000000_lms_child_tenantid` — tenantId tabel anak LMS + backfill
- `20260715120000_batch8_findings` — `orders.subscriptionConsumedAt` + **dedup sertifikat (hapus duplikat, simpan terlama)** + unique `(userId,courseId,type)`

> Jika `migrate deploy` gagal di unique-index karena duplikat: dedup DELETE sudah ada **di dalam** migrasi sebelum CREATE UNIQUE, jadi seharusnya lolos. Kalau tetap gagal, restore backup (langkah 1) dan hubungi dev.

## 5. Naikkan semua service

```bash
docker compose -f docker-compose.vps.yml up -d
docker compose -f docker-compose.vps.yml ps    # api, worker, web, redis, postgres, meilisearch = Up/healthy
docker port jago-akademi-web-1                 # WAJIB 3010 · docker port jago-akademi-api-1 → 4010
```

> **Tidak ada service `nginx` dalam daftar itu** dan itu memang benar: nginx berjalan di **host**
> (systemd), di luar Docker. Kalau `docker compose ps` menampilkan container nginx, itu container
> yatim sisa insiden BL-43 — hapus (`docker rm -f jago-akademi-nginx-1`), jangan dibiarkan.

---

## 6. Verifikasi pasca-deploy (yang tadinya RUSAK harus benar)

```bash
# health/ready
curl -s https://jagoakademi.com/api/health   # {"status":"healthy",...}
curl -s https://jagoakademi.com/api/ready     # deps.redis harus "ok" sekarang (bukan "skipped")

# login test-account → token
TOKEN=$(curl -s -X POST https://jagoakademi.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"haluanitcore@gmail.com","password":"12345678"}' \
  | grep -oE '"accessToken":"[^"]+"' | sed 's/.*:"//;s/"//')

# HARUS 200 sekarang (sebelumnya 404):
curl -s -o /dev/null -w "certificates: %{http_code}\n" https://jagoakademi.com/api/certificates -H "Authorization: Bearer $TOKEN"
curl -s -o /dev/null -w "ebooks/my:    %{http_code}\n" https://jagoakademi.com/api/ebooks/my   -H "Authorization: Bearer $TOKEN"

# event detail HARUS render event (bukan homepage):
curl -s https://jagoakademi.com/event/<slug-event-nyata> | grep -qi "homepage-hero-marker" && echo "MASIH homepage (GAGAL)" || echo "event detail OK"
```

Cek UI singkat: buka `/dashboard/sertifikat`, `/dashboard/ebook`, klik satu kartu `/event/...` — harus tampil benar.

## 7. Bersih-bersih data pasca-deploy (human decision)

**(a) Langganan C1 (bypass lama).** Fix C1 mencegah bypass BARU; langganan gratis lama tetap ada. Temukan & putuskan:
```sql
-- langganan aktif TANPA order (indikasi bypass paywall)
SELECT id, "userId", "planType", status, "expiresAt"
FROM subscriptions WHERE "orderId" IS NULL AND status = 'active';
-- revoke (setelah review): UPDATE subscriptions SET status='cancelled' WHERE "orderId" IS NULL AND status='active';
```
> Catatan: akun test `haluanitcore@gmail.com` punya satu langganan `annual/active/orderId:null` — ini contoh bypass tersebut.

**(b) Sertifikat curang (D3).** Jalankan `scripts/audit-fraudulent-certificates.sql` STEP 1 (read-only), review, lalu uncomment STEP 2.

## 8. Rollback (bila gagal)

```bash
git checkout <commit-lama> && docker compose -f docker-compose.vps.yml build && docker compose -f docker-compose.vps.yml up -d
# migrasi tidak auto-rollback — restore backup langkah 1 bila skema perlu dikembalikan:
gunzip -c backup_pre_deploy_<ts>.sql.gz | docker compose -f docker-compose.vps.yml exec -T postgres psql -U "$POSTGRES_USER" jago_akademi
```

---

## Ceklis Go/No-Go
- [ ] Backup DB dibuat & terverifikasi
- [ ] `.env` lengkap (DOKU_SECRET_KEY terisi, JWT ≥32)
- [ ] `migrate deploy` sukses — **verifikasi dengan `migrate status`, bukan hitungan hafalan**; daftar pending yang dipelihara ada di `RUNBOOK_DB.md` §1.1 (≥7 pending per 29 Jul 2026, bukan 3)
- [ ] Semua service Up/healthy; `/api/ready` deps.redis = ok
- [ ] certificates & ebooks/my = 200; event detail render event
- [ ] Langganan bypass & sertifikat curang di-review (7a/7b)
