# INTEGRATION VERIFICATION MATRIX (TASK-030)

> End-to-end verification of every external integration before Soft Launch (GAP-07/CRIT-04).
>
> **2 Jul 2026 update (TASK-030 non-payment pass):** Sections marked ✅ below were verified from the local sandbox — live public-endpoint curl checks and/or automated tests that exercise the real code path (not mocks) without needing production credentials. Everything else remains 🖐️ **human-gated**: it needs the deployed host, real vendor credentials, or (for DOKU) sandbox money. **Real-money DOKU transactions are DEFERRED per reviewer instruction (2 Jul 2026) — do not run 1.8 until explicitly authorized.**

## Pre-flight

`api.jagoakademi.com` does **not** resolve (confirmed via DNS lookup, 2 Jul 2026) — the API is proxied through the main domain at `/api/*`, not a separate subdomain. The commands below are corrected from an earlier draft that assumed a subdomain.

```bash
curl -fsS https://jagoakademi.com/api/health   # {"status":"healthy",...}
curl -fsS https://jagoakademi.com/api/ready | jq # deps: db/search/redis
docker compose -f docker-compose.prod.yml ps        # api, worker, web, nginx, postgres, redis, meilisearch = healthy
```

✅ Verified 2 Jul 2026: `health` → `healthy`. `ready` → `db: ok`, `search: ok`, **`redis: "skipped"`** (REDIS_URL not set in prod → BullMQ jobs run inline instead of queued; degrade-safe by design, but no true async queue yet).

## 1. DOKU Payment (start in SANDBOX)

`DOKU_BASE_URL=https://api-sandbox.doku.com`, sandbox credentials.

| Step | Action | Expected | Status |
|------|--------|----------|--------|
| 1.1 | Create order via `/api/checkout` (small nominal, e.g. Rp 10.000) | 200 + `paymentUrl` | 🖐️ needs live checkout flow + auth |
| 1.2 | Open paymentUrl, pay with DOKU sandbox VA/QRIS | DOKU success page | 🖐️ needs DOKU sandbox creds |
| 1.3 | DOKU fires webhook → `/api/webhooks/doku` | 200 `{received:true}` | ✅ route logic verified — see 1.5/1.6 |
| 1.4 | Verify fulfillment | order `status=paid`, `courseEnrollment` created | ✅ `apps/api/test/integration/webhooks/webhook.test.ts` (8 tests) |
| 1.5 | **Webhook signature** | Replay webhook with tampered body → 401 | ✅ **Verified two ways**: (a) live prod `POST /api/webhooks/doku` with no signature → **401** confirmed via curl 2 Jul 2026; (b) new `apps/api/test/unit/dokuService.test.ts` — real HMAC-SHA256 round-trip against DOKU's documented scheme: valid sig accepted, tampered body / wrong secret / different request-id / empty sig all rejected (5 tests) |
| 1.6 | **Idempotency** | Re-send the same success webhook → no duplicate enrollment/commission | ✅ `webhook.test.ts` "is idempotent: skips fulfillment when the order is already paid" — asserts no re-update/re-enrollment |
| 1.7 | Buyer receives payment-success email + invoice (§2) | inbox | 🖐️ needs RESEND_API_KEY + live order |
| 1.8 | Switch to **production** DOKU creds; repeat 1.1–1.4 with a **real minimal** transaction | live payment fulfilled | ⛔ **DEFERRED per reviewer instruction (2 Jul 2026) — do not run until explicitly authorized. No real-money transaction has been executed.** |

> 🔴 **KOREKSI 26 Agu 2026 (BL-137) — baris 1.5 di atas menyesatkan.** "Signature verification ✅ verified"
> hanya benar untuk **jalur negatif**. Jalur positif tak pernah diuji terhadap DOKU sungguhan, dan skema
> yang diimplementasikan **salah**: komponen `Request-Body:<sha256>` (seharusnya `Request-Target:<path>` +
> `Digest:<sha256>`), header tanpa awalan `HMACSHA256=`, dan respons dibaca di `data.payment.url`
> (seharusnya `data.response.payment.url`). Unit test lama menyalin skema dari implementasi sehingga tak
> mungkin menangkapnya. Sudah diperbaiki; lihat BL-137 di `docs/BACKLOG.md`.
>
> **Terverifikasi 26 Agu 2026 terhadap sandbox DOKU nyata** (kredensial `BRN-0280-…`, `api-sandbox.doku.com`):
> `POST /checkout/v1/payment` → **HTTP 200 `{"message":["SUCCESS"]}`** dengan `response.payment.url` menunjuk
> `staging.doku.com/checkout-link-v2/…` dan 23 metode pembayaran aktif. Diuji dua kali: (a) lewat
> `scripts/doku-smoke.mjs` (replika mandiri, tanpa app/DB), dan (b) lewat `createDokuOrder()` yang sebenarnya
> di `dokuService.ts` — keduanya 200, `isMock: false`. **Ulangi kapan saja:** `node scripts/doku-smoke.mjs`.
>
> ⚠️ **Yang MASIH belum terverifikasi:** notifikasi/webhook DOKU yang sungguhan. `Request-Target` untuk
> webhook diambil dari `req.originalUrl` (`/api/webhooks/doku`) berdasarkan spesifikasi, tetapi belum pernah
> dibuktikan dengan satu pun notifikasi asli — butuh Notification URL terdaftar di DOKU Back Office + host
> publik. Sampai itu terjadi, baris 1.2–1.4 tetap 🖐️.

**Hardening note found during this pass (not yet fixed, needs reviewer sign-off since it touches payment code):** `verifyDokuWebhook` in `apps/api/src/services/payment/dokuService.ts:103` compares signatures with `===` (not constant-time). Low practical risk for a base64 HMAC-SHA256 over the network, but flagged per the project's security-review rule for cryptographic code. Tracked as BL-34 — recommend `crypto.timingSafeEqual` in a dedicated small PR.

### 1.9 Prosedur aktivasi DOKU sandbox di host (26 Agu 2026, BL-137)

> 🖐️ **Human-gated (SSOT §9.6).** Seluruh langkah menyentuh host produksi atau DOKU Back Office.
> Prasyarat: PR #54 (`fix/bl137-doku-signature`) sudah ter-merge ke `main` — tanpa itu, deploy justru
> menayangkan skema signature yang salah.

**Jebakan yang wajib diketahui lebih dulu:** `docker-compose.vps.yml:77` dan `:131` menyetel
`DOKU_BASE_URL: ${DOKU_BASE_URL:-https://api.doku.com}` — defaultnya **PRODUKSI**. Bila `.env` host
tidak menyetelnya eksplisit, container menembak DOKU produksi memakai kredensial sandbox dan gagal
**401 tanpa gejala yang jelas**. `DOKU_IS_PRODUCTION` tidak diteruskan compose sama sekali, jadi
`DOKU_BASE_URL` adalah satu-satunya kendali sandbox-vs-produksi di host.

```bash
# 1. Env di host — tambahkan KETIGA baris; yang ketiga bukan opsional (lihat jebakan di atas).
cd /var/www/jago-akademi
# edit .env:
#   DOKU_CLIENT_ID=BRN-....
#   DOKU_SECRET_KEY=SK-....
#   DOKU_BASE_URL=https://api-sandbox.doku.com

# 2. Ambil kode terbaru + deploy api & worker (BUKAN docker-compose.prod.yml — lihat BL-43)
git pull --ff-only origin main
docker compose -f docker-compose.vps.yml build --no-cache api
docker compose -f docker-compose.vps.yml up -d --force-recreate api worker

# 3. Buktikan env benar-benar sampai ke container (jangan percaya .env saja)
docker compose -f docker-compose.vps.yml exec api sh -lc 'echo "$DOKU_BASE_URL"'
# HARUS mencetak https://api-sandbox.doku.com — bila mencetak api.doku.com, STOP.

# 4. Smoke test dari host, memakai kredensial yang sama dengan container
node scripts/doku-smoke.mjs /var/www/jago-akademi/.env
# HARUS: HTTP 200 + "message":["SUCCESS"] + url staging.doku.com/checkout-link-v2/...
```

**5. 🖐️ Daftarkan Notification URL di DOKU Back Office sandbox** (hanya bisa dilakukan pemilik akun):

| Field | Nilai |
|---|---|
| Notification URL | `https://jagoakademi.com/api/webhooks/doku` |

⚠️ Path ini **bukan** sekadar alamat tujuan — DOKU menandatanganinya sebagai komponen `Request-Target`,
dan `verifyDokuWebhook` menyusun ulang komponen itu dari `req.originalUrl`. Mendaftarkan path yang
berbeda (mis. lewat subdomain, atau dengan trailing slash) membuat **setiap** notifikasi ditolak 401.

**6. Uji end-to-end** — checkout Rp 10.000 lewat situs, bayar di simulator sandbox DOKU, lalu:

```bash
docker compose -f docker-compose.vps.yml logs --tail=100 api | grep -i doku
# order harus berpindah ke status paid + enrollment terbentuk
```

Sampai langkah 6 benar-benar lulus, **jalur pembayaran belum boleh dinyatakan selesai** — checkout yang
sudah terbukti 200 hanya membuktikan separuh alurnya (lihat peringatan di blok koreksi di atas).

## 2. Resend (transactional email)

| Step | Action | Expected | Status |
|------|--------|----------|--------|
| — | Code wiring: degrades to a structured log (`logger.info`) when `RESEND_API_KEY` is unset — never throws, never blocks the caller | ✅ Verified by reading `emailService.ts` + `register.test.ts` (register succeeds without a key configured) |
| — | **New (BL-31, host-independent):** `sendVerificationEmail()` added and wired into `POST /api/auth/register` (best-effort, does not fail registration). `/verifikasi-email` page built and verified against a local build. | ✅ Done this pass |
| 2.1 | Trigger payment-pending (checkout) | email delivered; Resend dashboard shows "delivered" | 🖐️ needs `RESEND_API_KEY` on host |
| 2.2 | Trigger payment-success + invoice (webhook 1.4) | 2 emails delivered | 🖐️ needs `RESEND_API_KEY` on host |
| 2.3 | Domain auth (SPF/DKIM) | not in spam; DKIM pass | 🖐️ needs DNS access (host) |

**Once you set `RESEND_API_KEY` on the host, real sending starts automatically — no further code change needed** (register, checkout, and webhook flows already call the email service).

## 3. Fonnte (WhatsApp)

| Step | Action | Expected | Status |
|------|--------|----------|--------|
| — | Code wiring: degrades to a structured log when `FONNTE_TOKEN` is unset; a failed send is caught and logged, never crashes fulfillment (`safeNotify` wrapper in `webhook.ts`) | ✅ Verified by reading `whatsappService.ts` + `webhook.ts` `safeNotify` |
| 3.1 | Order with a user that has `profile.phone`, complete payment | WA payment-success received | 🖐️ needs `FONNTE_TOKEN` + live order |
| 3.2 | Fonnte token invalid → best-effort | fulfillment still succeeds; warn logged (no crash) | ✅ Confirmed by code path (`safeNotify` catches; `webhook.test.ts` shows fulfillment unaffected by notification mocks) |

## 4. Cloudflare Stream + R2

🔴 **New finding (2 Jul 2026): this integration is NOT implemented.** SSOT (`PROJECT_PROGRESS_REPORT_V2.md:427`) already flagged R2 wiring as "[C] belum pasti" (unverified AI claim) — this pass confirms the claim was **false**:

- `apps/api/src/routes/videos.ts:43` — comment literally says *"In production: generate a signed Cloudflare Stream URL here"* and instead returns `lesson.contentUrl` directly with a client-side `expiresAt` timestamp that nothing enforces. Enrollment/preview **access control is real and correct**; the **signed URL / Stream layer is a stub**.
- `apps/api/src/routes/upload.ts` — uploads go to **local disk** via `multer.diskStorage` (`env.UPLOAD_DIR`, default `uploads/`), not R2. No AWS/R2 SDK, no `CLOUDFLARE_*`/`R2_*` env vars exist anywhere in `config/env.ts`.

| Step | Action | Expected | Status |
|------|--------|----------|--------|
| 4.1 | Course lesson video playback (enrolled user) | HLS plays via signed URL | ❌ Not built — serves raw `contentUrl`, no HLS/signing |
| 4.2 | Signed URL expiry | expired URL → denied | ❌ Not built — `expiresAt` is not enforced anywhere |
| 4.3 | R2 upload (course thumbnail / e-book) | object stored + served | ❌ Not built — local disk only, not persisted across redeploys unless `UPLOAD_DIR` is a mounted volume |
| 4.4 | E-book PDF signed download | authorized download works | ❌ Not built (same gap as 4.1) |

Tracked as **BL-32 (High)**. This does not block a **NON-PAID** Soft Launch demo of the platform shape, but it means: (a) uploaded assets are not durable unless the host mounts a persistent volume for `UPLOAD_DIR`, (b) there is no real anti-piracy signed-URL protection on video content yet, contrary to SSOT TD-15's "keep Cloudflare Stream" decision. **Reviewer decision needed**: accept local-disk storage for Soft Launch NON-PAID (with a persistent volume) and build R2/Stream before Public Launch, or block until built.

## 5. Meilisearch

| Step | Action | Expected | Status |
|------|--------|----------|--------|
| 5.1 | Publish a course (admin) | worker "search-index" job completes | 🖐️ needs admin auth + live DB |
| 5.2 | Search `/api/search?q=...` | new course appears in hits | ✅ **Verified live** 2 Jul 2026 — `GET https://jagoakademi.com/api/search?q=digital` returns a valid envelope `{"success":true,"data":{"courses":[],"total":0,...}}`. Meilisearch is reachable and the API integration works end-to-end; `0` results is expected since the production catalog is still empty (known, see RUNBOOK_DB). |
| 5.3 | Delete course | removed from index | 🖐️ needs admin auth + live DB |

## 6. Sentry + logging

| Step | Action | Expected | Status |
|------|--------|----------|--------|
| — | API-side wiring | Sentry init + capture present | ✅ Verified in code: `apps/api/src/instrument.ts` + `middleware/errorHandler.ts` (TASK-023, already shipped) |
| — | Web-side wiring | `@sentry/nextjs` init | ❌ **Still not implemented** (BL-17, open since TASK-023). No `Sentry.init`/`@sentry/nextjs` anywhere in `apps/web`. SSOT slots this before **Public** Launch, not Soft Launch — flagging for an explicit reviewer accept/defer decision on the Soft Launch NON-PAID checklist. |
| 6.1 | Trigger a deliberate 500 (temporary test route or force error) | Sentry issue created with `requestId` tag + release | 🖐️ needs `SENTRY_DSN` on host + a live trigger |
| 6.2 | Correlate | `docker compose logs api \| grep <requestId>` shows the JSON error line | 🖐️ needs host shell access |
| 6.3 | Remove the test route | | 🖐️ n/a until 6.1 is run |

## 7. Analytics (GA / Mixpanel)

🔵 **Scope correction (2 Jul 2026):** this section was prematurely listed under TASK-030. Analytics/event-tracking is its own task — **TASK-041** (SSOT GAP-12, Phase 5) — and has genuinely not been started: a search across `apps/web` for `gtag`/`GA_ID`/`mixpanel`/`googletagmanager` returns zero matches, and the live homepage HTML has no tracking script tags. This is expected at this stage, not a regression. Not a blocker for **Soft Launch NON-PAID**; must land before Public Launch (and is a dependency of TASK-097 gamification, which needs real event data).

| Step | Action | Expected | Status |
|------|--------|----------|--------|
| 7.1 | Load site with `NEXT_PUBLIC_GA_ID` set | GA realtime shows the pageview | ⏭️ Out of TASK-030 scope — see TASK-041 |
| 7.2 | (If Mixpanel wired) key events fire | events land in Mixpanel | ⏭️ Out of TASK-030 scope — see TASK-041 |

## 8. Queue / worker under load

| Step | Action | Expected | Status |
|------|--------|----------|--------|
| — | Redis status | queue backed by Redis in prod | ⚠️ `/api/ready` reports `redis: "skipped"` — `REDIS_URL` not set on host. Jobs (webhook fulfillment, email, cert, search-index) run **inline** instead of queued. Degrade-safe by design (no crash, no lost jobs), but no true async processing yet. Host action: set `REDIS_URL` if async queueing is wanted before launch, or accept inline processing for Soft Launch NON-PAID's expected low volume. |
| 8.1 | Complete a course to 100% | auto-certificate job runs; cert issued | 🖐️ needs live enrollment + progress data |
| 8.2 | Inspect failed jobs | `redis-cli LLEN bull:*:failed` = 0 (or investigated) | 🖐️ n/a while Redis is skipped (no queue to inspect) |

## Go/No-Go for Soft Launch (10B) — NON-PAID scope

- [x] DOKU webhook signature verification — ✅ verified (live negative-path 401 + automated HMAC round-trip test)
- [x] DOKU webhook idempotency — ✅ verified (automated test)
- [ ] ⛔ DOKU production minimal txn — **DEFERRED**, not part of NON-PAID launch scope
- [ ] 🖐️ Email + WA delivered — code ready, needs `RESEND_API_KEY` / `FONNTE_TOKEN` on host
- [ ] 🔴 Video HLS + signed URL + R2 — **not built** (BL-32) — reviewer decision needed: accept local disk for NON-PAID launch, or block
- [x] Search index sync working — ✅ verified live (Meilisearch reachable, valid empty-catalog response)
- [ ] 🖐️ Sentry receives errors + logs correlate by requestId — API-side ready, needs `SENTRY_DSN`; web-side not built (BL-17, deferrable to Public Launch)
- [ ] ⏭️ Analytics receiving events — out of scope for this launch (TASK-041, Phase 5)
- [x] Worker processes jobs inline (degrade-safe); no queue to inspect while Redis is skipped — accept or provision `REDIS_URL`
- [ ] 🖐️ `/api/ready` 200 ✅ (verified) — all containers healthy (needs host confirmation); backups + restore drill done (RUNBOOK_DB, TASK-021 ✅ code-complete, host cron still pending)

> When the boxes above are resolved or explicitly accepted by the reviewer, proceed to the **Soft Launch checkpoint** (Playbook 10B) — a separate human Go/No-Go decision.
