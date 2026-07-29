# RUNBOOK — Incident Response & Observability (TASK-023)

> How production is observed and how to respond when it breaks. Code is in place (Sentry, pino, /health, /ready); external monitors + alert rules are 🖐️ human-gated setup.

## Observability stack

| Signal | Where | Notes |
|--------|-------|-------|
| Errors | **Sentry** (api) | Unexpected 5xx captured in `errorHandler` with `requestId` tag + release. No-op if `SENTRY_DSN` unset. |
| Logs | **pino** JSON → stdout | `X-Request-Id` correlates every line of a request. PII redacted. Collect via Docker log driver / Loki. |
| Liveness | `GET /api/health` | Process up. Used by container healthcheck. |
| Readiness | `GET /api/ready` | Checks DB + Meilisearch (+ Redis when queue enabled). 503 if a required dep is down. |
| Uptime | external monitor 🖐️ | e.g. UptimeRobot/BetterStack hitting `https://jagoakademi.com/api/health` + `https://jagoakademi.com`. Point monitors at the main domain — `api.jagoakademi.com` does **not** resolve (BL-33). |

## 🖐️ Alerts to configure (post-deploy)

Configure in Sentry + the uptime monitor:

| Alert | Condition | Severity |
|-------|-----------|----------|
| API down | `/api/health` fails 2× consecutively | P1 |
| Not ready | `/api/ready` returns 503 > 3 min | P1 |
| Error spike | Sentry error rate > 10/min OR new issue in `payment`/`auth` | P1/P2 |
| Latency | p95 > 2 s for 5 min | P2 |
| Payment failures | `webhook`/`checkout` 5xx > 3 in 10 min | P1 |
| Queue backlog | Redis `bull:*:wait` depth > 500 | P2 |
| Disk/DB | Postgres disk > 85% | P2 |

## Severity & SLA

| Sev | Definition | Response | Resolution target |
|-----|------------|----------|-------------------|
| **P1** | Outage / payments broken / data loss risk | 15 min | 2 h |
| **P2** | Degraded (slow, partial feature down) | 1 h | 1 business day |
| **P3** | Minor bug, workaround exists | 1 business day | next sprint |
| **P4** | Cosmetic / low impact | best effort | backlog |

## Response flow (P1/P2)

1. **Acknowledge** the alert; declare severity; open an incident channel.
2. **Assess:** `GET https://jagoakademi.com/api/ready` → which dep is down? `docker compose -f docker-compose.vps.yml ps` → unhealthy service? On any 5xx also check `docker port jago-akademi-web-1` (see BL-43). Sentry → error signature + `requestId`.
3. **Correlate logs:** `docker compose -f docker-compose.vps.yml logs api --since 15m | grep <requestId>`.
4. **Mitigate first, fix second:**
   - App bug in last deploy → **rollback** (RUNBOOK_DEPLOY §8).
   - DB down → check `postgres` health/disk; restore from backup only if corrupted (RUNBOOK_DB §3).
   - Redis down → queue degrades to inline automatically; restart `redis`.
   - Payment webhook failing → DOKU retries; verify signature/secret; replay from `bull:webhook:failed`.
5. **Verify** recovery: `/api/ready` 200 + smoke test + error rate normal.
6. **Post-incident:** write a short postmortem (timeline, root cause, action items); add a regression test; file BACKLOG items.

## Data breach response (UU PDP Art. 46 — 3×24 hours)

A breach = unauthorized access/disclosure/loss of personal data. Treat as **P1**.

1. **Contain** (0–1 h): revoke exposed credentials/tokens, rotate secrets, isolate the affected service, preserve logs/evidence (do not wipe).
2. **Assess** (1–6 h): what data, how many subjects, sensitivity, root cause. Use `AuditLog` + pino logs (`requestId`) to scope.
3. **Notify (≤ 72 h)**: report to the data-protection authority **and** affected data subjects — nature of breach, data involved, likely impact, mitigation, contact point. Owner: DPO/CTO.
4. **Remediate**: patch root cause, add regression test, force re-auth if sessions compromised.
5. **Document**: incident record + postmortem; update this runbook if the process gapped.

> Legal review pending (BL-21). Cross-border processors (Cloudflare/Resend/Sentry) are in scope — see `docs/PDP_COMPLIANCE_AUDIT.md` (BL-22).

## Common commands

> ⛔ **Compose produksi = `docker-compose.vps.yml`.** Jangan pernah menjalankan `up`/`build` dengan
> `docker-compose.prod.yml` di host ini — file itu tak mem-publish port dan akan memutus nginx host
> (502 sitewide, insiden BL-43). Ini justru paling berbahaya saat insiden, ketika orang mengetik
> cepat.

```bash
docker compose -f docker-compose.vps.yml ps
docker port jago-akademi-web-1        # 3010 · api → 4010; kosong = penyebab 502 (BL-43)
docker compose -f docker-compose.vps.yml logs -f api worker
curl -fsS https://jagoakademi.com/api/ready | jq
docker compose -f docker-compose.vps.yml exec redis redis-cli LLEN bull:webhook:failed
sudo systemctl status nginx           # nginx = service HOST, bukan container
```

> 🔴 **Jangan meng-`curl` `https://api.jagoakademi.com`.** Host itu **tidak resolve** (BL-33) — curl
> akan gagal resolve DNS dan operator menyimpulkan "API down" padahal API sehat. Health check yang
> benar: `https://jagoakademi.com/api/health` dan `/api/ready`.

## Validation Checklist (TASK-023)

- [x] Sentry init (dedicated `instrument.ts`, imported first) + unexpected-error capture in errorHandler
- [x] pino structured logging + `X-Request-Id` correlation (httpLogger) + PII redaction
- [x] `/api/health` (liveness) + `/api/ready` (readiness: DB/search/redis) with tests
- [x] Incident runbook + severity/SLA + alert-rule spec
- [ ] 🖐️ SENTRY_DSN set in prod; a test error appears in Sentry
- [ ] 🖐️ Uptime monitor + alert rules configured and firing
- [ ] Web Sentry (@sentry/nextjs) — tracked BL-17
