# RUNBOOK — Production Deployment (TASK-020)

> Eksekusi runbook ini adalah **aksi human-gated** (SSOT §9.6): butuh kredensial host, DNS, dan SSL milik Anda. Claude Code menyiapkan seluruh config; Anda (atau operator) menjalankan langkah bertanda 🖐️. Setelah first-deploy sukses, deploy rutin berjalan otomatis via `.github/workflows/deploy.yml` (dengan approval gate GitHub Environment).
>
> **⚠️ Sumber image yang benar (TD-35):** Build/deploy HARUS dari **`main` terkonsolidasi** (superset linear hasil ff dari integration branch `chore/deploy-hardening`). **JANGAN** deploy dari `task/*` atau `main` kuno — hanya `main` terkonsolidasi yang memuat fix BL-35 (CSS). Deploy dari branch lain = UI berantakan (regresi BL-35).

> **✅ Kondisi live aktual (terverifikasi 8 Jul 2026)** — realita di host berbeda dari desain awal di bawah:
> - **Path:** `/var/www/jago-akademi` (bukan direktori lain).
> - **Compose file live:** `docker-compose.vps.yml` (**bukan** `docker-compose.prod.yml`). Seluruh perintah operasional di runbook ini sudah memakai `vps.yml` (disapu 29 Jul 2026). `docker-compose.prod.yml` kini hanya disebut sebagai **peringatan** atau saat merujuk isi file itu sendiri — **jangan** menjalankan perintah `up`/`build` dengannya di host ini (BL-43).
> - **API URL:** `api.jagoakademi.com` **tidak resolve** dan tidak pernah dipakai (BL-33). API dijangkau lewat `https://jagoakademi.com/api/*`. `NEXT_PUBLIC_API_URL=https://jagoakademi.com` — sama dengan origin web, dan itu **benar** di sini karena nginx host yang memisahkan `/api/` (§3.1).
> - **Reverse proxy:** **nginx level-host** (systemd, di luar Docker) meng-handle TLS + proxy ke container. **Tidak ada Cloudflare / CDN** di depan domain → tidak ada cache CDN yang perlu di-purge; recreate container = langsung live.
> - **Stack berjalan:** `web` (`:3010→3000`), `api` (`:4010→4000`), `postgres`, `meilisearch`,
>   **`redis`**, **`worker`**. (CD GitHub Actions belum di-deploy; repo belum punya secret CD.)
>
>   🔴 **KOREKSI 31 Agu 2026 — baris ini dulu menyatakan "redis/BullMQ belum di-deploy". Itu sudah
>   tidak benar sejak entah kapan, dan kesalahannya mahal.** Terukur di host: `docker compose ps`
>   menampilkan `redis` dan `worker` **running**; `REDIS_URL=redis://redis:6379` terisi di container
>   `api` **dan** `worker`; `/api/ready` mengembalikan `redis: "ok"`.
>
>   Mengapa ini penting sampai perlu blok sendiri: rekonsiliasi pembayaran (BL-144) adalah
>   **repeatable job BullMQ** yang didaftarkan `scheduleReconciliation()` di `worker.ts` — bukan di
>   `api`. Jalur webhook lain punya jalur inline saat Redis absen (`dispatch()` di `queues.ts`),
>   **tetapi BL-144 tidak punya**. Jadi tanpa `redis` + `worker` yang benar-benar jalan, satu-satunya
>   mekanisme yang memulihkan order yang notifikasinya hilang tidak akan pernah berjalan — diam-diam,
>   tanpa gejala.
>
>   ⚠️ **`/api/ready` yang membalas 200 TIDAK membuktikan Redis hidup.** `routes/health.ts:44-53`
>   mengembalikan `redis: "skipped"` (bukan `"ok"`) bila queue dimatikan, dan `ready` dihitung
>   `redis !== "error"` — jadi `"skipped"` tetap menghasilkan 200 + `ready: true`. **Baca nilai
>   `deps.redis`, jangan status HTTP-nya.**
> - **Deploy rutin manual (proven):** `cd /var/www/jago-akademi && git pull --ff-only origin main && docker compose -f docker-compose.vps.yml build --no-cache web && docker compose -f docker-compose.vps.yml up -d --force-recreate web`.
> - **⛔ INSIDEN 17 Jul 2026 (BL-43) — jangan diulang:** menjalankan `docker compose -f docker-compose.prod.yml up` di host ini me-recreate `web`/`api` **tanpa published port** (file prod memakai topologi nginx-in-Docker) → host-nginx tak bisa mencapai `127.0.0.1:3010/4010` → **502 sitewide**, plus container nginx yatim crash-loop. **Pemulihan:** `docker compose -f docker-compose.vps.yml up -d --force-recreate api worker web`, lalu `docker rm -f jago-akademi-nginx-1` (container nginx Docker TIDAK dipakai di host ini). Selalu verifikasi pasca-up: `docker port jago-akademi-web-1` harus menampilkan `3010`.

## Arsitektur runtime

**Topologi live (satu domain, nginx level-host).** `api.jagoakademi.com` **TIDAK RESOLVE** dan tidak
pernah dipakai — lihat BL-33 + `docs/INTEGRATION_VERIFICATION.md`. API dijangkau lewat
`https://jagoakademi.com/api/*`.

```
Internet → nginx di HOST (systemd, 80/443, TLS, rate-limit, gzip)
             └── jagoakademi.com
                   ├── /api/auth/ → 127.0.0.1:4010 → container api  (Express :4000)
                   ├── /api/      → 127.0.0.1:4010 → container api
                   └── /          → 127.0.0.1:3010 → container web  (Next.js standalone :3000)
Backing: postgres:16 · meilisearch:v1.5 · redis:7 (BullMQ, TASK-022)
Volumes: postgres_data · meilisearch_data · redis_data · uploads · /etc/letsencrypt
```

> **nginx bukan container.** Ia berjalan sebagai service systemd di host — itulah sebabnya
> `docker-compose.vps.yml` tidak punya service `nginx`. Konsekuensinya: `nginx/nginx.conf` **di repo
> BUKAN konfigurasi produksi**; konfigurasi live ada di `/etc/nginx/` pada host dan hanya bisa dibaca
> dengan `sudo nginx -T`. Reload = `sudo systemctl reload nginx`, bukan `docker compose exec nginx`.

## 0. Prasyarat host

- VPS Linux (Ubuntu 22.04+ disarankan), min 2 vCPU / 4 GB RAM / 40 GB disk.
- Docker Engine + Compose plugin ≥ v2.24 (`!reset` di override butuh compose modern):
  `curl -fsSL https://get.docker.com | sh`
- Port 80 + 443 terbuka. SSH key-based login untuk user deploy (non-root + docker group).

## 1. 🖐️ DNS

Buat A record (TTL 300 selama setup):

| Record | Host | Value |
|--------|------|-------|
| A | `jagoakademi.com` | IP VPS |
| A | `www.jagoakademi.com` | IP VPS |

> ⛔ **JANGAN tambahkan `api.jagoakademi.com`.** Subdomain itu tidak pernah dibuat dan tidak resolve
> (BL-33). Seluruh trafik API lewat `jagoakademi.com/api/*`. Menambahkannya sekarang hanya akan
> menghidupkan kembali template env & certbot yang salah di bawah.

Verifikasi: `dig +short jagoakademi.com www.jagoakademi.com`

## 2. 🖐️ Bootstrap direktori & kode

```bash
sudo mkdir -p /var/www/jago-akademi /var/www/certbot && sudo chown -R $USER /var/www/jago-akademi
cd /var/www/jago-akademi
git clone <REPO_URL> . && git checkout <release-tag-atau-branch>
```

## 3. 🖐️ Environment produksi

Buat `/var/www/jago-akademi/.env` (dibaca docker compose; **jangan** commit):

```bash
# Database
POSTGRES_USER=jagouser
POSTGRES_PASSWORD=<strong-random-32>
# Auth
JWT_SECRET=<random-64>
JWT_REFRESH_SECRET=<random-64>
GOOGLE_CLIENT_ID=<dari Google Cloud Console>
GOOGLE_CLIENT_SECRET=<...>
GOOGLE_CALLBACK_URL=https://jagoakademi.com/api/auth/google/callback
# URLs — lihat §3.1 sebelum mengubah; salah nilai = proxy /api/* loop
WEB_URL=https://jagoakademi.com
NEXT_PUBLIC_API_URL=https://jagoakademi.com       # origin API dipanggil BROWSER; SAMA dgn origin web — lihat §3.1
NEXT_PUBLIC_SITE_URL=https://jagoakademi.com
API_PROXY_TARGET=http://api:4000                  # wajib di topologi ini (§3.1)
# Payment (DOKU) — mulai SANDBOX, pindah production saat TASK-030 lolos
DOKU_CLIENT_ID=<...>
DOKU_SECRET_KEY=<...>
DOKU_BASE_URL=https://api-sandbox.doku.com
# Email / WA
RESEND_API_KEY=<...>
EMAIL_FROM=noreply@jagoakademi.com
EMAIL_FROM_NAME=Jago Akademi
# Search
MEILISEARCH_KEY=<random-32>
# Observability (TASK-023)
SENTRY_DSN=
# Analytics (TASK-041) — build-time inlined into the web image; leave blank to disable.
# After changing either, rebuild web: docker compose -f docker-compose.vps.yml build --no-cache web
NEXT_PUBLIC_GA_ID=
NEXT_PUBLIC_MIXPANEL_TOKEN=
```

`chmod 600 .env`. Generator rahasia: `openssl rand -base64 48`.

## 3.1 Proxy `/api/*` — dua variabel yang berbeda

`apps/web/next.config.js` mem-proxy `/api/*` ke backend lewat `rewrites()`:

| Variabel | Dipakai siapa | Aturan |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | **Browser** (di-inline ke bundle klien) | Origin API yang bisa dijangkau publik dari internet. **Nilai untuk VPS ini: `https://jagoakademi.com`** — sama dengan origin web, dan itu memang benar (lihat kotak di bawah). |
| `API_PROXY_TARGET` | **Server** Next, hanya untuk rewrite | Origin internal (`http://api:4000` di jaringan compose). **Bukan** `NEXT_PUBLIC_*` → tidak bocor ke bundle klien. **Wajib di-set di VPS ini**, karena tanpanya target rewrite jatuh ke `NEXT_PUBLIC_API_URL` yang = origin web. |

Urutan resolusi: `API_PROXY_TARGET` → `NEXT_PUBLIC_API_URL` → `http://localhost:4000`.

> ### 🔴 Aturan "`NEXT_PUBLIC_API_URL` harus ≠ origin web" **tidak berlaku universal**
>
> Aturan itu hanya berlaku bila `/api/*` dilayani oleh **rewrite Next** — di situ, menunjuk
> `NEXT_PUBLIC_API_URL` ke origin web membuat Next mem-proxy ke dirinya sendiri
> (`nginx → web → rewrite → nginx → …`).
>
> **Di VPS ini `/api/*` TIDAK dilayani rewrite Next.** nginx level-host mencegat `/api/` lebih dulu
> dan meneruskannya langsung ke container api (`127.0.0.1:4010`); request itu tidak pernah sampai ke
> container web. Karena nginx yang memisahkan `/api/` dari `/`, `NEXT_PUBLIC_API_URL` **boleh dan
> harus** sama dengan origin web. Loop dicegah oleh `API_PROXY_TARGET=http://api:4000` yang
> meng-override target rewrite ke jaringan internal.
>
> ⛔ **Jangan mengisinya dengan `https://api.jagoakademi.com`.** Host itu tidak resolve (BL-33).
> Nilai itu ter-**bake** ke bundle klien saat build, sehingga **setiap fetch dari browser gagal** —
> situs tampil normal tapi mati fungsi, dan **tidak bisa dipulihkan dengan `restart`**; wajib rebuild.

`http://127.0.0.1:4010` (port host API) hanya benar bila Next berjalan **langsung di host**, bukan
di dalam container. Guard membandingkan **origin**, jadi host sama dengan port berbeda diizinkan.

**Guard self-proxy.** Bila target sama dengan origin web, build menolaknya, jatuh ke
`http://localhost:4000`, dan mencetak `[next.config] /api/* proxy target rejected ...`. Ini mencegah
loop `nginx → web → rewrite → nginx → …`. Kalau baris itu muncul di log build, env salah.

### ⚠️ Topologi VPS produksi yang SEBENARNYA (diverifikasi 29 Jul 2026 lewat `nginx -T`)

`nginx/nginx.conf` di repo **tidak** mencerminkan nginx yang berjalan di VPS. Jangan menyimpulkan
routing dari file itu — nginx live adalah **nginx level host** (bukan container; itu sebabnya
`docker-compose.vps.yml` tak punya service nginx) yang melayani beberapa domain sekaligus:

```
server_name jagoakademi.com www.jagoakademi.com;
  location /api/auth/  → proxy_pass http://127.0.0.1:4010;   # container api (4010:4000)
  location /api/       → proxy_pass http://127.0.0.1:4010;   # container api
  location /           → proxy_pass http://127.0.0.1:3010;   # container web (3010:3000)
```

Implikasi yang penting dipahami sebelum menyalahkan konfigurasi proxy:

- `/api/*` dari browser **dicegat nginx** dan diteruskan langsung ke container api. Request itu
  **tidak pernah** sampai ke container web, jadi **rewrite Next tidak berada di jalur trafik browser**
  pada deployment ini. `API_PROXY_TARGET` bersifat defensif (benar untuk topologi lain, dan menahan
  salah-konfigurasi), bukan penentu routing di sini.
- Karena itu `NEXT_PUBLIC_API_URL=https://jagoakademi.com` **benar** untuk VPS ini meskipun sama
  dengan origin web — nginx yang memisahkan `/api/` dari `/`. Aturan "harus ≠ origin web" di tabel
  di atas berlaku untuk topologi yang mengandalkan rewrite Next, bukan yang ini.
- Verifikasi kesehatan jalur internal: `docker compose -f docker-compose.vps.yml exec -T web
  wget -qO- http://api:4000/api/health` → harus `{"status":"healthy",...}`.

> ### ⚠️ `rewrites()` di-bake saat BUILD
> Untuk output standalone Next.js, target proxy menjadi literal di `.next/routes-manifest.json`.
> **Mengubah `environment:` di compose lalu `restart` TIDAK memindahkan target proxy.** Wajib rebuild:
> ```bash
> docker compose -f docker-compose.vps.yml build --no-cache web
> docker compose -f docker-compose.vps.yml up -d --force-recreate web
> ```
>
> ⛔ **WAJIB `docker-compose.vps.yml` — JANGAN `docker-compose.prod.yml` (insiden BL-43).**
> `prod.yml` memakai topologi nginx-in-Docker dan karena itu **tidak mem-publish port**. Me-recreate
> `web` dengannya menghapus binding `3010:3000`, sehingga nginx host kehilangan `127.0.0.1:3010` dan
> membalas **502 sitewide** (28 menit outage, 17 Jul 2026). Verifikasi pasca-up:
> `docker port jago-akademi-web-1` harus menampilkan `3010`.
>
> **Jangan** pakai `--remove-orphans` di VPS ini. Alasannya **bukan** karena nginx adalah orphan
> container — nginx berjalan di **host** (systemd) dan tidak terlihat oleh Docker sama sekali.
> Larangan ini bersifat kehati-hatian: `docker-compose.vps.yml` bukan satu-satunya sumber container
> di host, sehingga `--remove-orphans` bisa menghapus container yang dikelola di luar file compose
> ini. (Container `jago-akademi-nginx-1` yang yatim sudah **dihapus** saat pemulihan BL-43 dan tidak
> boleh dihidupkan lagi.) Untuk me-reload TLS/proxy, target yang benar adalah nginx host:
> `sudo systemctl reload nginx` — dan konfigurasinya di `/etc/nginx/`, **bukan** `nginx/nginx.conf`
> di repo.

**Wiring build-arg — SUDAH ada di repo**, tidak perlu tindakan manual. `API_PROXY_TARGET` sudah
terpasang sebagai `ARG` di `apps/web/Dockerfile`, sebagai `build.args` di `docker-compose.prod.yml`
dan `docker-compose.vps.yml`, dan sebagai `build-args` di `.github/workflows/deploy.yml`. Ini perlu
karena entri `environment:` compose hanya berlaku saat **runtime**, sedangkan target rewrite
di-resolve saat **build** — tanpa build-arg, nilai di `.env` tidak akan pernah sampai ke sana.

Yang tersisa hanyalah menetapkan nilainya:
- **Compose**: set `API_PROXY_TARGET` di `/var/www/jago-akademi/.env` (dibaca `${API_PROXY_TARGET:-}`).
- **CI**: set repository variable `API_PROXY_TARGET` di GitHub → Settings → Variables.

Bila tidak di-set, nilainya kosong dan resolusi jatuh ke `NEXT_PUBLIC_API_URL` — perilaku identik
dengan sebelum variabel ini ada.

Terverifikasi lewat build sungguhan (nilai yang ter-bake di `.next/routes-manifest.json`):

| `API_PROXY_TARGET` | `NEXT_PUBLIC_API_URL` | `destination` hasil build |
|---|---|---|
| `http://api:4000` | `https://jagoakademi.com` (= origin web) | `http://api:4000/api/:path*` — override menang, loop dihindari. **← kombinasi yang dipakai VPS ini** |
| *(kosong)* | origin API terpisah (topologi lain, mis. `https://api.contoh.com`) | `https://api.contoh.com/api/:path*` |
| *(kosong)* | *(kosong / = origin web)* | `http://localhost:4000/api/:path*` + peringatan build |

Origin internal tidak bocor ke klien: build dengan `API_PROXY_TARGET=http://api:4000` menghasilkan
**0 file** di `.next/static` yang memuat `api:4000`, sementara origin publik muncul di 16 file.

## 4. 🖐️ SSL (Let's Encrypt)

First issuance (port 80 masih bebas — nginx belum jalan):

```bash
sudo apt install -y certbot
sudo certbot certonly --standalone \
  -d jagoakademi.com -d www.jagoakademi.com \
  --email admin@jagoakademi.com --agree-tos --no-eff-email
```

> ⛔ **JANGAN sertakan `-d api.jagoakademi.com`.** Host itu tidak resolve (BL-33), jadi challenge
> HTTP-01 untuknya **selalu gagal** — dan karena certbot memperlakukan issuance sebagai satu
> transaksi, satu domain gagal menggagalkan **seluruh** sertifikat. Efeknya tidak terasa saat itu
> juga melainkan ~90 hari kemudian, ketika renewal diam-diam gagal dan TLS kedaluwarsa → seluruh
> domain mati.

Sertifikat → `/etc/letsencrypt/live/jagoakademi.com/` (path yang dirujuk konfigurasi nginx host di
`/etc/nginx/`, **bukan** `nginx/nginx.conf` di repo).

**Renewal otomatis** (nginx host sudah serve `/.well-known/acme-challenge/` dari `/var/www/certbot`):

```bash
sudo tee /etc/cron.d/certbot-renew <<'EOF'
0 3 * * * root certbot renew --webroot -w /var/www/certbot --deploy-hook "systemctl reload nginx" >> /var/log/certbot-renew.log 2>&1
EOF
```

> ⛔ **Deploy-hook harus me-reload nginx HOST.** Versi lama memakai
> `docker compose -f .../docker-compose.prod.yml exec nginx nginx -s reload` — **tidak ada container
> nginx** di host ini, jadi hook itu selalu error. Akibatnya sertifikat bisa saja diperpanjang, tapi
> nginx tidak pernah memuat ulang dan terus menyajikan sertifikat lama sampai kedaluwarsa.
>
> Uji hook tanpa menunggu 90 hari: `sudo certbot renew --dry-run` lalu `sudo systemctl reload nginx`
> harus keluar tanpa error. Cek masa berlaku aktual: `sudo certbot certificates`.

## 5. 🖐️ First deploy (build di host)

```bash
cd /var/www/jago-akademi
docker compose -f docker-compose.vps.yml build        # ± beberapa menit
docker compose -f docker-compose.vps.yml run --rm api npx prisma migrate deploy   # migrations ter-commit (TASK-021); DB lama hasil `db push` → baseline dulu, lihat RUNBOOK_DB.md §1
docker compose -f docker-compose.vps.yml up -d --wait
docker compose -f docker-compose.vps.yml ps           # semua "healthy"
docker port jago-akademi-web-1                        # WAJIB menampilkan 3010 (guard BL-43)
```

### Smoke test
```bash
curl -fsS https://jagoakademi.com/api/health            # {"status":"healthy",...}
curl -fsSI https://jagoakademi.com | head -5            # 200 + security headers
```
SSL rating: https://www.ssllabs.com/ssltest/ → target A.

## 5.1 🖐️ Hotfix rebuild — CSS/Tailwind kosong (BL-35)

Gejala: situs tampil berantakan / tanpa styling. Akar penyebab: image web lama
dibangun tanpa devDependencies (Tailwind), sehingga `@tailwindcss/postcss` tidak
jalan dan CSS hasil build tidak punya utility class. Fix ada di `apps/web/Dockerfile`
(`npm ci --include=dev` + guard build-time). **Rebuild image web dari nol** (bukan
cache lama):

```bash
cd /var/www/jago-akademi
git pull --ff-only origin main                            # ambil kode terbaru dari main
docker compose -f docker-compose.vps.yml build --no-cache web
# ↑ Guard build-time akan MENGGAGALKAN build bila utility Tailwind tetap hilang
#   (cari baris "OK(BL-35): Tailwind utilities present" = sukses; "FATAL(BL-35)" = masih rusak).
docker compose -f docker-compose.vps.yml up -d --force-recreate web
```

### Verifikasi pasca-deploy (bukti sukses — host-independent, bisa dari mana saja)
```bash
# 1. Ambil URL file CSS yang di-link homepage
CSS=$(curl -fsS https://jagoakademi.com | grep -oE '/_next/static/[^"]*\.css' | head -1)
# 2. Header + ukuran: harus 200, text/css, dan JAUH lebih besar dari 18KB (build benar ≈ 100KB+)
curl -sSI "https://jagoakademi.com${CSS}" | grep -iE 'HTTP|content-type|content-length'
# 3. Utility HARUS ada sekarang (sebelumnya MISSING):
curl -fsS "https://jagoakademi.com${CSS}" | grep -oE '\.flex\{|\.mx-auto|\.grid-cols-1' | sort -u
# 4. Direktif Tailwind mentah TIDAK boleh muncul lagi (dulu bocor = plugin tak jalan):
curl -fsS "https://jagoakademi.com${CSS}" | grep -c '@config\|@plugin'   # harus 0
```
Sukses = CSS 200 `text/css`, ukuran ~100KB+, `.flex{`/`.mx-auto`/`.grid-cols-1` muncul, `@config`/`@plugin` = 0, dan homepage tampil ber-styling di browser.

> Catatan: rebuild ini adalah jalur deploy rutin manual yang dipakai saat ini (terverifikasi 8 Jul 2026, deploy fix QA C-1/H-1/M-1 dari `main @ 581fb5f`).

## 6. 🖐️ GitHub — aktifkan CD

> **Otoritatif sekarang: [`RUNBOOK_ACCESS.md`](./RUNBOOK_ACCESS.md)** — inventaris kunci, apa yang
> sudah terpasang, dan tiga langkah operator yang tersisa. Ringkasan status per **9 Sep 2026**:

| Butuh | Status |
|-------|--------|
| **Variables** (`NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_API_URL`, `API_PROXY_TARGET`, 8× `NEXT_PUBLIC_FEATURE_*`) | ✅ **sudah diisi** (11 variable) |
| **Secrets** `DEPLOY_HOST` / `DEPLOY_USER` / `DEPLOY_PATH` / `DEPLOY_SSH_KEY` | 🖐️ belum — `RUNBOOK_ACCESS.md` §4.2 |
| **Kunci CI di `authorized_keys` host** | 🖐️ belum — `RUNBOOK_ACCESS.md` §4.1 |
| **Environment `production`** | 🖐️ belum — `RUNBOOK_ACCESS.md` §4.3 |

⚠️ Dua koreksi terhadap versi lama bagian ini:

1. ***Required reviewers* tidak tersedia** di repo privat pada plan Free (API menjawab
   `403 Upgrade to GitHub Pro`). Environment tetap wajib dibuat — job `deploy` merujuknya — tetapi
   gate manusianya berasal dari pemicu workflow (tag `v*` / `workflow_dispatch`), bukan dari
   reviewer. Jangan menuliskannya seolah approval berlapis sudah aktif.
2. **Daftar variable lama kurang sembilan yang menentukan tampilan situs**: `API_PROXY_TARGET` dan
   delapan `NEXT_PUBLIC_FEATURE_*`. Keduanya di-inline saat build image, jadi CD yang berjalan tanpa
   itu menghasilkan image dengan rewrite `/api/*` runtuh ke dirinya sendiri dan semua fitur mati —
   bukan kegagalan yang berisik, melainkan situs yang salah dan tampak normal.

Cek kesiapan kapan saja: `bash scripts/ops/jago.sh doctor`.

## 7. Deploy rutin (otomatis, human-approved)

```bash
git tag v1.0.0 && git push origin v1.0.0
```
Pipeline: build+push GHCR → **tunggu approval** environment `production` → SSH: pull → `prisma migrate deploy` → `up -d --wait` (healthcheck-gated ≈ zero-downtime) → smoke test.

## 7.1 🖐️ Verifikasi daftar metode pembayaran (BL-147) — WAJIB sebelum produksi

`payment.payment_method_types` membatasi metode yang **ditampilkan** DOKU. Menghilangkannya
berarti "tampilkan semua" — pada akun ini **31 metode**, termasuk empat paylater
(`PEER_TO_PEER_KREDIVO`, `_AKULAKU`, `_INDODANA`, `_BRI_CERIA`) yang field
conditional-mandatory-nya tidak pernah kita kirim. Pembeli yang memilihnya kena **case code 02
"Invalid Mandatory Field"** — setelah baris `orders` dan `payment_transactions` terlanjur dibuat.

> 🔴 **Daftar default di `config/env.ts` BELUM dikonfirmasi ke akun merchant ini.** Hanya
> `VIRTUAL_ACCOUNT_BCA` yang punya bukti langsung (muncul sebagai `channel.id` pada notifikasi
> nyata). Sisanya ditranskripsikan dari daftar non-SNAP DOKU. Metode yang **tidak diaktifkan**
> di akun ini adalah satu-satunya mode gagal yang bisa diperkenalkan daftar ini — dan jauh lebih
> murah ditemukan di sandbox daripada di produksi.

**Langkah (sandbox, sebelum menyalakan di produksi):**

1. Pastikan host memakai sandbox: `DOKU_BASE_URL=https://api-sandbox.doku.com`.
2. Buat satu checkout dari situs, lalu buka `payment.url` yang dikembalikan.
3. Catat metode yang **benar-benar tampil** di halaman DOKU. Bandingkan dengan daftar di
   `.env` / default `config/env.ts`.
4. Yang harus benar:
   - **tidak ada** metode paylater di halaman itu;
   - setiap metode yang kita daftarkan tampil, atau — bila tidak tampil — memang belum
     diaktifkan DOKU untuk akun ini;
   - checkout **tidak** ditolak dengan error hanya karena satu kode tak dikenal.
5. Bila ada kode yang ditolak atau tak dikenal, **hapus kode itu dari daftar**, jangan
   mengosongkan seluruh daftar:

   ```bash
   cd /var/www/jago-akademi
   # sunting DOKU_PAYMENT_METHOD_TYPES di .env, lalu:
   docker compose -f docker-compose.vps.yml up -d --force-recreate api
   ```

   Tidak perlu rebuild — nilainya dibaca saat runtime, bukan di-bake saat build.

6. Bila perlu mengembalikan perilaku lama untuk sementara, set nilainya ke literal **`ALL`**.
   Mengosongkannya **tidak** membuka semua metode: kosong berarti daftar default yang aman.
   Ini disengaja — `docker-compose.vps.yml` menulis `${DOKU_PAYMENT_METHOD_TYPES:-}`, jadi
   container menerima string kosong, dan "kosong = buka semua" akan diam-diam menghidupkan
   kembali seluruh 31 metode di setiap host yang belum menyetel variabel ini.

**Kode paylater ditolak saat startup.** Menambahkan `PEER_TO_PEER_*` ke daftar membuat API
gagal boot dengan pesan yang menyebut field apa saja yang harus dikirim lebih dulu — bukan
gagal diam-diam di checkout pembeli.

## 8. Rollback drill (wajib diuji sekali saat gate)

Versi sebelumnya tercatat di `.last-deploy-api|web`:

```bash
cd /var/www/jago-akademi
export API_IMAGE=ghcr.io/<org>/<repo>/api:<versi-sebelumnya>
export WEB_IMAGE=ghcr.io/<org>/<repo>/web:<versi-sebelumnya>
docker compose -f docker-compose.vps.yml -f docker-compose.registry.yml up -d --wait
docker port jago-akademi-web-1     # WAJIB 3010 — bila kosong, published port hilang (BL-43)
```
⚠️ Rollback image **tidak** membatalkan migration — migration harus backward-compatible (aturan TASK-021), atau restore backup DB.

## 9. Backup sebelum tiap migrate (manual sampai TASK-021 mengotomasi)

```bash
docker compose -f docker-compose.vps.yml exec -T postgres pg_dump -U jagouser jago_akademi | gzip > backup-$(date +%F-%H%M).sql.gz
```

## Validation Checklist (TASK-020)

- [ ] `docker compose ps` → semua service **healthy** 🖐️
- [ ] DNS resolve ke VPS 🖐️
- [ ] HTTPS valid, SSL Labs ≥ A 🖐️
- [ ] Rollback drill sukses 🖐️
- [x] Runbook ini ada + CD pipeline ter-author
- [x] compose dev/prod/registry + nginx (ACME renewal, rate-limit BL-15) siap

## Troubleshooting cepat

| Gejala | Aksi |
|--------|------|
| Service unhealthy | `docker compose -f docker-compose.vps.yml logs <svc> --tail 100` |
| **502 dari nginx** | **Cek dulu `docker port jago-akademi-web-1` / `...-api-1`** — harus `3010`/`4010`. Kosong = container di-recreate dengan compose file salah (BL-43); perbaiki: `docker compose -f docker-compose.vps.yml up -d --force-recreate api worker web`. Kalau port ada, baru cek health service + `sudo systemctl reload nginx`. |
| Cert renewal gagal | cek `/var/log/certbot-renew.log` + `sudo certbot certificates`; pastikan `/var/www/certbot` di-serve nginx host dan daftar `-d` tidak memuat domain yang tak resolve |
| Migrate gagal | JANGAN retry buta — restore backup §9, investigasi, baru ulang |
