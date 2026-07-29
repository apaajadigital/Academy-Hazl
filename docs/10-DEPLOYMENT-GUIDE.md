# Phase 10 — Deployment Guide

Step-by-step instructions for deploying Jago Akademi to production.

> ## 🔴 READ FIRST — this document describes the ORIGINAL DESIGN, not the live deployment
>
> **Authoritative runbook: [`RUNBOOK_DEPLOY.md`](./RUNBOOK_DEPLOY.md).** Where the two disagree,
> `RUNBOOK_DEPLOY.md` wins. This guide is kept as design reference; treat its commands as
> illustrative, not copy-pasteable.
>
> Verified on the VPS 29 Jul 2026 (`nginx -T`, `docker compose`) — the live system differs on four
> points that break production if you follow this file literally:
>
> | This guide says | Reality |
> |---|---|
> | `api.jagoakademi.com` serves the API | **That host does not resolve** (BL-33). API is at `https://jagoakademi.com/api/*`. |
> | nginx runs as a Docker service | nginx runs on the **host** (systemd). Reload = `sudo systemctl reload nginx`. `nginx/nginx.conf` in the repo is **not** the live config. |
> | `docker-compose.prod.yml` | Live compose is **`docker-compose.vps.yml`**. Running `up` with `prod.yml` recreates `web`/`api` **without published ports** → host nginx 502 sitewide (incident BL-43). |
> | Deploy path `/opt/jago-akademi` | Actual path `/var/www/jago-akademi`. |

---

## Prerequisites

- Ubuntu 22.04 LTS server (min 4 vCPU, 8 GB RAM, 100 GB SSD)
- Docker Engine 25+ and Docker Compose v2
- Domain `jagoakademi.com` with DNS pointing to server IP
- SSL certificates obtained (Let's Encrypt via Certbot recommended)
- Accounts ready: DOKU merchant, Resend, Google OAuth, Cloudflare R2, Sentry

---

## 1. Server Setup

```bash
# Install Docker
curl -fsSL https://get.docker.com | sh
usermod -aG docker $USER

# Install Docker Compose v2
apt-get install docker-compose-plugin

# Create deployment directory
mkdir -p /opt/jago-akademi
cd /opt/jago-akademi
```

---

## 2. SSL Certificates

```bash
# Install Certbot
apt-get install certbot

# Obtain certificates (standalone, port 80 must be free)
certbot certonly --standalone \
  -d jagoakademi.com \
  -d www.jagoakademi.com \
  --email admin@jagoakademi.com \
  --agree-tos

# Auto-renewal — reload the HOST nginx (there is no nginx container)
echo "0 3 * * * root certbot renew --quiet --deploy-hook 'systemctl reload nginx'" >> /etc/crontab
```

> 🔴 **Two corrections applied here (both were silent 90-day time bombs):**
>
> 1. **`-d api.jagoakademi.com` removed.** The host does not resolve, so its HTTP-01 challenge always
>    fails — and certbot issues a certificate as one transaction, so that single domain fails the
>    **entire** issuance and every later renewal.
> 2. **The deploy-hook now reloads host nginx.** The old cron ran
>    `docker compose ... restart nginx`, but **there is no nginx container**. That command always
>    errored, so nginx would keep serving the expired certificate even after a successful renewal.
>
> The `cp ... nginx/ssl/` steps were also dropped: the live host nginx reads
> `/etc/letsencrypt/live/jagoakademi.com/` directly. Verify with `sudo certbot certificates` and
> `sudo certbot renew --dry-run`.

---

## 3. Environment Configuration

```bash
# Copy the production env template
cp apps/api/.env.example .env.api
cp apps/web/.env.example .env.web

# Edit .env.api — fill in ALL values
nano .env.api

# Edit .env.web — fill in ALL values  
nano .env.web

# Create root .env for docker-compose interpolation
cat > .env << 'EOF'
POSTGRES_USER=jagouser
POSTGRES_PASSWORD=<strong-random-password>

JWT_SECRET=<openssl rand -base64 48>
JWT_REFRESH_SECRET=<openssl rand -base64 48>

WEB_URL=https://jagoakademi.com
# Baked into the client bundle at BUILD time. Same origin as the web app is CORRECT here:
# the host nginx splits /api/ off to the api container. See RUNBOOK_DEPLOY.md §3.1.
NEXT_PUBLIC_API_URL=https://jagoakademi.com
NEXT_PUBLIC_SITE_URL=https://jagoakademi.com
API_PROXY_TARGET=http://api:4000

GOOGLE_CLIENT_ID=<from Google Console>
GOOGLE_CLIENT_SECRET=<from Google Console>
# Must match the redirect URI registered in Google Console — and must resolve.
GOOGLE_CALLBACK_URL=https://jagoakademi.com/api/auth/google/callback

RESEND_API_KEY=re_live_<key>
EMAIL_FROM=noreply@jagoakademi.com
EMAIL_FROM_NAME=Jago Akademi

DOKU_CLIENT_ID=<from DOKU merchant>
DOKU_SECRET_KEY=<from DOKU merchant>
DOKU_BASE_URL=https://api.doku.com

MEILISEARCH_KEY=<strong-random-key>

SENTRY_DSN=<from Sentry project>
NEXT_PUBLIC_GA_ID=G-XXXXXXXXXX
EOF

chmod 600 .env .env.api .env.web
```

---

## 4. Clone Repository

```bash
cd /opt/jago-akademi
git clone https://github.com/your-org/jago-akademi-website.git .
git checkout main
```

---

## 5. Build and Deploy

```bash
# Pull base images
docker compose -f docker-compose.prod.yml pull

# Build application images
docker compose -f docker-compose.prod.yml build

# Start postgres and meilisearch first
docker compose -f docker-compose.prod.yml up -d postgres meilisearch

# Wait for postgres to be ready (~10 seconds)
sleep 10

# Run database migrations
docker compose -f docker-compose.prod.yml run --rm api npx prisma migrate deploy

# Run production seed (first deploy only)
docker compose -f docker-compose.prod.yml run --rm \
  -e SEED_ADMIN_EMAIL=admin@jagoakademi.com \
  -e SEED_ADMIN_PASSWORD=<secure-password> \
  api npx tsx prisma/seed.ts

# Start all services
docker compose -f docker-compose.prod.yml up -d

# Verify all containers are running
docker compose -f docker-compose.prod.yml ps
```

---

## 6. Verify Deployment

```bash
# API health check — via the main domain; api.jagoakademi.com does not resolve (BL-33)
curl -s https://jagoakademi.com/api/health | jq

# Expected: { "status": "ok", "timestamp": "..." }

# Web app
curl -sI https://jagoakademi.com | head -20

# Check security headers
curl -sI https://jagoakademi.com | grep -E "X-Content|X-Frame|Strict-Transport|Referrer"

# Verify sitemap
curl -s https://jagoakademi.com/sitemap.xml | head -30

# Check robots.txt
curl -s https://jagoakademi.com/robots.txt
```

---

## 7. DNS Configuration

Add these records in your DNS provider:

| Type | Name | Value | TTL |
|------|------|-------|-----|
| A | @ | `<server-ip>` | 300 |
| A | www | `<server-ip>` | 300 |
| A | api | `<server-ip>` | 300 |
| CNAME | media | `<r2-bucket>.r2.cloudflarestorage.com` | 300 |
| MX | @ | Resend MX records | 300 |
| TXT | @ | Resend SPF/DKIM records | 300 |

---

## 8. Ongoing Operations

### Deploy a new release

```bash
cd /opt/jago-akademi

# Pull latest code
git pull origin main

# Rebuild changed images only
docker compose -f docker-compose.prod.yml build api web

# Rolling restart (zero downtime)
docker compose -f docker-compose.prod.yml up -d --no-deps api web

# Run any new migrations
docker compose -f docker-compose.prod.yml exec api npx prisma migrate deploy
```

### View logs

```bash
# All services
docker compose -f docker-compose.prod.yml logs -f

# API only
docker compose -f docker-compose.prod.yml logs -f api

# Last 100 lines
docker compose -f docker-compose.prod.yml logs --tail 100 api
```

### Database backup

```bash
# Manual backup
docker compose -f docker-compose.prod.yml exec postgres \
  pg_dump -U jagouser jago_akademi \
  > backup-$(date +%Y%m%d-%H%M%S).sql

# Automate (add to crontab)
# 0 3 * * * /opt/jago-akademi/scripts/backup.sh >> /var/log/backup.log 2>&1
```

### Restore database

```bash
# Stop api to prevent writes during restore
docker compose -f docker-compose.prod.yml stop api

docker compose -f docker-compose.prod.yml exec -T postgres \
  psql -U jagouser jago_akademi < backup-YYYYMMDD.sql

docker compose -f docker-compose.prod.yml start api
```

### Certificate renewal

```bash
# Certbot auto-renewal is handled by crontab (set in step 2)
# Manual renewal:
certbot renew
cp /etc/letsencrypt/live/jagoakademi.com/fullchain.pem nginx/ssl/jagoakademi.com.crt
cp /etc/letsencrypt/live/jagoakademi.com/privkey.pem nginx/ssl/jagoakademi.com.key
docker compose -f docker-compose.prod.yml restart nginx
```

---

## 9. Rollback Procedure

```bash
# Identify the previous working image tag or commit
git log --oneline -5

# Revert to a previous commit
git checkout <commit-hash>

# Rebuild and redeploy
docker compose -f docker-compose.prod.yml build api web
docker compose -f docker-compose.prod.yml up -d --no-deps api web

# If the new migration broke the DB, restore from backup before this step
```

---

## 10. Troubleshooting

| Symptom | Check |
|---------|-------|
| API returns 502 | `docker compose logs api` — likely startup crash. Check env vars |
| Web shows blank page | `docker compose logs web` — missing `NEXT_PUBLIC_API_URL`? |
| Postgres connection refused | `docker compose ps postgres` — is it healthy? Check `DATABASE_URL` |
| Login fails | Check `JWT_SECRET` is set and consistent across restarts |
| Emails not sending | Verify `RESEND_API_KEY` and domain DNS records in Resend dashboard |
| Payment callback fails | Verify DOKU webhook URL and `DOKU_SECRET_KEY` |
| Search not working | `docker compose logs meilisearch` — check `MEILISEARCH_KEY` |
| SSL certificate error | Certificate expired? Re-run certbot renew and copy new certs |
