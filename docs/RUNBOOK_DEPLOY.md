# RUNBOOK — Production Deployment (TASK-020)

> Eksekusi runbook ini adalah **aksi human-gated** (SSOT §9.6): butuh kredensial host, DNS, dan SSL milik Anda. Claude Code menyiapkan seluruh config; Anda (atau operator) menjalankan langkah bertanda 🖐️. Setelah first-deploy sukses, deploy rutin berjalan otomatis via `.github/workflows/deploy.yml` (dengan approval gate GitHub Environment).
>
> **⚠️ Sumber image yang benar (TD-35):** Build/deploy HARUS dari **`main` terkonsolidasi** (superset linear hasil ff dari integration branch `chore/deploy-hardening`). **JANGAN** deploy dari `task/*` atau `main` kuno — hanya `main` terkonsolidasi yang memuat fix BL-35 (CSS). Deploy dari branch lain = UI berantakan (regresi BL-35).

> **✅ Kondisi live aktual (terverifikasi 8 Jul 2026)** — realita di host berbeda dari desain awal di bawah:
> - **Path:** `/var/www/jago-akademi` (bukan direktori lain).
> - **Compose file live:** `docker-compose.vps.yml` (**bukan** `docker-compose.prod.yml`). Section §5.1 sudah memakai file ini; section lain yang masih menulis `docker-compose.prod.yml` merujuk desain awal (nginx-in-Docker + GHCR/CD) yang belum dipakai.
> - **Reverse proxy:** **nginx level-host** (systemd, di luar Docker) meng-handle TLS + proxy ke container. **Tidak ada Cloudflare / CDN** di depan domain → tidak ada cache CDN yang perlu di-purge; recreate container = langsung live.
> - **Stack berjalan:** `web` (`:3010→3000`), `api` (`:4010→4000`), `postgres`, `meilisearch`. (redis/BullMQ & CD GitHub Actions belum di-deploy; repo belum punya secret CD.)
> - **Deploy rutin manual (proven):** `cd /var/www/jago-akademi && git pull --ff-only origin main && docker compose -f docker-compose.vps.yml build --no-cache web && docker compose -f docker-compose.vps.yml up -d --force-recreate web`.
> - **⛔ INSIDEN 17 Jul 2026 (BL-43) — jangan diulang:** menjalankan `docker compose -f docker-compose.prod.yml up` di host ini me-recreate `web`/`api` **tanpa published port** (file prod memakai topologi nginx-in-Docker) → host-nginx tak bisa mencapai `127.0.0.1:3010/4010` → **502 sitewide**, plus container nginx yatim crash-loop. **Pemulihan:** `docker compose -f docker-compose.vps.yml up -d --force-recreate api worker web`, lalu `docker rm -f jago-akademi-nginx-1` (container nginx Docker TIDAK dipakai di host ini). Selalu verifikasi pasca-up: `docker port jago-akademi-web-1` harus menampilkan `3010`.

## Arsitektur runtime

```
Internet → Nginx (80/443, TLS, rate-limit, gzip)
             ├── jagoakademi.com      → web (Next.js standalone :3000)
             └── api.jagoakademi.com  → api (Express :4000)
Backing: postgres:16 · meilisearch:v1.5 · redis:7 (BullMQ, TASK-022)
Volumes: postgres_data · meilisearch_data · redis_data · uploads · /etc/letsencrypt
```

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
| A | `api.jagoakademi.com` | IP VPS |

Verifikasi: `dig +short jagoakademi.com api.jagoakademi.com`

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
GOOGLE_CALLBACK_URL=https://api.jagoakademi.com/api/auth/google/callback
# URLs — lihat §3.1 sebelum mengubah; salah nilai = proxy /api/* loop
WEB_URL=https://jagoakademi.com
NEXT_PUBLIC_API_URL=https://api.jagoakademi.com   # origin API dipanggil BROWSER — wajib ≠ origin web
NEXT_PUBLIC_SITE_URL=https://jagoakademi.com
# API_PROXY_TARGET=http://api:4000                # opsional; hanya bila API tak terekspos publik (§3.1)
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
| `NEXT_PUBLIC_API_URL` | **Browser** (di-inline ke bundle klien) | Origin API yang bisa dijangkau publik, **≠ origin web** (`NEXT_PUBLIC_SITE_URL`). Untuk topologi ini: `https://api.jagoakademi.com`. |
| `API_PROXY_TARGET` (opsional) | **Server** Next, hanya untuk rewrite | Origin internal (mis. `http://api:4000` di jaringan compose). **Bukan** `NEXT_PUBLIC_*` → tidak bocor ke bundle klien. Pakai hanya bila API tidak terekspos publik. |

Urutan resolusi: `API_PROXY_TARGET` → `NEXT_PUBLIC_API_URL` → `http://localhost:4000`. Bila
`API_PROXY_TARGET` tidak di-set, perilakunya **persis sama seperti sebelumnya**.

Topologi runbook ini punya subdomain `api.jagoakademi.com` (server block di `nginx/nginx.conf`),
jadi `NEXT_PUBLIC_API_URL` sudah cukup dan `API_PROXY_TARGET` **tidak perlu**. Untuk topologi
`docker-compose.vps.yml` yang **tanpa** subdomain api (`/api/*` dilayani lewat origin web), set
`API_PROXY_TARGET=http://api:4000` — lihat `RUNBOOK_DEPLOY_RELEASE_JUL2026.md` §0.1.
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
> docker compose -f docker-compose.prod.yml build --no-cache web
> docker compose -f docker-compose.prod.yml up -d --force-recreate web
> ```
> **Jangan** pakai `--remove-orphans` di VPS ini — nginx berjalan sebagai orphan container dan akan ikut terhapus.

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
| `http://api:4000` | `https://jagoakademi.com` (= origin web) | `http://api:4000/api/:path*` — override menang, loop dihindari |
| *(kosong)* | `https://api.jagoakademi.com` | `https://api.jagoakademi.com/api/:path*` |
| *(kosong)* | *(kosong / = origin web)* | `http://localhost:4000/api/:path*` + peringatan build |

Origin internal tidak bocor ke klien: build dengan `API_PROXY_TARGET=http://api:4000` menghasilkan
**0 file** di `.next/static` yang memuat `api:4000`, sementara origin publik muncul di 16 file.

## 4. 🖐️ SSL (Let's Encrypt)

First issuance (port 80 masih bebas — nginx belum jalan):

```bash
sudo apt install -y certbot
sudo certbot certonly --standalone \
  -d jagoakademi.com -d www.jagoakademi.com -d api.jagoakademi.com \
  --email admin@jagoakademi.com --agree-tos --no-eff-email
```

Sertifikat → `/etc/letsencrypt/live/jagoakademi.com/` (path yang dipakai `nginx/nginx.conf`).

**Renewal otomatis** (nginx sudah serve `/.well-known/acme-challenge/` dari `/var/www/certbot`):

```bash
sudo tee /etc/cron.d/certbot-renew <<'EOF'
0 3 * * * root certbot renew --webroot -w /var/www/certbot --deploy-hook "docker compose -f /var/www/jago-akademi/docker-compose.prod.yml exec nginx nginx -s reload" >> /var/log/certbot-renew.log 2>&1
EOF
```

## 5. 🖐️ First deploy (build di host)

```bash
cd /var/www/jago-akademi
docker compose -f docker-compose.prod.yml build        # ± beberapa menit
docker compose -f docker-compose.prod.yml run --rm api npx prisma migrate deploy   # migrations ter-commit (TASK-021); DB lama hasil `db push` → baseline dulu, lihat RUNBOOK_DB.md §1
docker compose -f docker-compose.prod.yml up -d --wait
docker compose -f docker-compose.prod.yml ps           # semua "healthy"
```

### Smoke test
```bash
curl -fsS https://api.jagoakademi.com/api/health        # {"success":true,...}
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

Repo → Settings:
1. **Environments → New: `production`** → centang *Required reviewers* (Anda) → ini gate approval tiap deploy.
2. **Secrets and variables → Actions → Secrets**: `DEPLOY_HOST` (IP), `DEPLOY_USER`, `DEPLOY_SSH_KEY` (private key), `DEPLOY_PATH` (`/var/www/jago-akademi`).
3. **Variables**: `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_GA_ID`, `NEXT_PUBLIC_MIXPANEL_TOKEN`.

## 7. Deploy rutin (otomatis, human-approved)

```bash
git tag v1.0.0 && git push origin v1.0.0
```
Pipeline: build+push GHCR → **tunggu approval** environment `production` → SSH: pull → `prisma migrate deploy` → `up -d --wait` (healthcheck-gated ≈ zero-downtime) → smoke test.

## 8. Rollback drill (wajib diuji sekali saat gate)

Versi sebelumnya tercatat di `.last-deploy-api|web`:

```bash
cd /var/www/jago-akademi
export API_IMAGE=ghcr.io/<org>/<repo>/api:<versi-sebelumnya>
export WEB_IMAGE=ghcr.io/<org>/<repo>/web:<versi-sebelumnya>
docker compose -f docker-compose.prod.yml -f docker-compose.registry.yml up -d --wait
```
⚠️ Rollback image **tidak** membatalkan migration — migration harus backward-compatible (aturan TASK-021), atau restore backup DB.

## 9. Backup sebelum tiap migrate (manual sampai TASK-021 mengotomasi)

```bash
docker compose -f docker-compose.prod.yml exec postgres pg_dump -U jagouser jago_akademi | gzip > backup-$(date +%F-%H%M).sql.gz
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
| Service unhealthy | `docker compose logs <svc> --tail 100` |
| 502 dari nginx | cek `docker compose ps` api/web healthy; nginx resolve nama service saat start — restart nginx setelah api/web up |
| Cert renewal gagal | cek `/var/log/certbot-renew.log`; pastikan `/var/www/certbot` ter-mount di nginx |
| Migrate gagal | JANGAN retry buta — restore backup §9, investigasi, baru ulang |
