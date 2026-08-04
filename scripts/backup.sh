#!/usr/bin/env bash
# Automated Postgres backup for Jago Akademi production (TASK-021).
# Dumps via the compose postgres container, gzips, prunes old local copies,
# and (optionally) syncs to Cloudflare R2 via rclone remote "r2".
#
# Install (host):  crontab example (see deploy/jago-backup.cron)
#   15 2 * * * /var/www/jago-akademi/scripts/backup.sh >> /var/log/jago-backup.log 2>&1
set -euo pipefail

# Defaults match the actual VPS layout (/var/www + docker-compose.vps.yml).
# Override via env for other environments.
COMPOSE_DIR="${COMPOSE_DIR:-/var/www/jago-akademi}"
COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.vps.yml}"
BACKUP_DIR="${BACKUP_DIR:-$COMPOSE_DIR/backups}"
RETENTION_DAYS="${RETENTION_DAYS:-14}"
R2_REMOTE="${R2_REMOTE:-}"            # e.g. "r2:jago-backups" — empty = local only
DB_NAME="${DB_NAME:-jago_akademi}"

cd "$COMPOSE_DIR"
# Extract only POSTGRES_USER from .env (safe even if .env has unquoted values with spaces).
if [ -f "$COMPOSE_DIR/.env" ]; then
  _pg_user="$(grep -E '^POSTGRES_USER=' "$COMPOSE_DIR/.env" | head -1 | cut -d= -f2- | tr -d '"' || true)"
fi
PG_USER="${_pg_user:-${POSTGRES_USER:-jagouser}}"

STAMP="$(date +%F-%H%M)"
FILE="$BACKUP_DIR/jago-$STAMP.sql.gz"

mkdir -p "$BACKUP_DIR"

echo "[$(date -Is)] dumping $DB_NAME -> $FILE"
docker compose -f "$COMPOSE_FILE" exec -T postgres \
  pg_dump -U "$PG_USER" --no-owner --no-privileges "$DB_NAME" | gzip > "$FILE"

# Fail loudly on suspiciously small dumps (< 1 KB usually means an error).
SIZE=$(stat -c%s "$FILE" 2>/dev/null || stat -f%z "$FILE")
if [ "$SIZE" -lt 1024 ]; then
  echo "[$(date -Is)] ERROR: backup too small ($SIZE bytes) — investigate" >&2
  exit 1
fi
echo "[$(date -Is)] dump OK ($SIZE bytes)"

# Optional offsite copy to R2 (configure `rclone config` once, remote name "r2").
#
# Deliberately non-fatal: this script runs under `set -e`, so a failing rclone
# (remote not configured yet, R2 unreachable, credentials rotated) would abort
# the script BEFORE the retention prune below — old dumps would pile up forever
# and cron would report failure even though a good local backup was already
# written and size-checked. A broken offsite must not sabotage a working backup;
# it must be loud instead.
if [ -n "$R2_REMOTE" ]; then
  if command -v rclone >/dev/null 2>&1; then
    if rclone copy "$FILE" "$R2_REMOTE/postgres/" --s3-no-check-bucket; then
      echo "[$(date -Is)] synced to $R2_REMOTE/postgres/"
    else
      echo "[$(date -Is)] WARNING: offsite copy to $R2_REMOTE FAILED — backup is LOCAL-ONLY" >&2
    fi
  else
    echo "[$(date -Is)] WARNING: R2_REMOTE set but rclone not installed — skipping offsite copy" >&2
  fi
fi

# Local retention.
find "$BACKUP_DIR" -name "jago-*.sql.gz" -mtime "+$RETENTION_DAYS" -delete
echo "[$(date -Is)] retention pruned (> ${RETENTION_DAYS}d)"
