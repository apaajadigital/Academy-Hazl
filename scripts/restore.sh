#!/usr/bin/env bash
# Restore drill for Jago Akademi (TASK-021). Proves the latest backup is
# restorable by restoring it into a SCRATCH database (never touches production),
# verifying schema + row counts, then dropping the scratch DB.
#
# Usage:  ./scripts/restore.sh [path/to/backup.sql.gz]
#   (defaults to the newest backup in $BACKUP_DIR)
set -euo pipefail

COMPOSE_DIR="${COMPOSE_DIR:-/var/www/jago-akademi}"
COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.vps.yml}"
BACKUP_DIR="${BACKUP_DIR:-$COMPOSE_DIR/backups}"
SCRATCH="${SCRATCH_DB:-jago_restore_test}"
# Matches scripts/backup.sh. Measured, not guessed: the 4 Aug 2026 production
# dump carries exactly 45 CREATE TABLE statements (44 models in schema.prisma
# plus _prisma_migrations, all 14 migrations applied). A restore that yields
# fewer tables than production is not a proven backup, so the two thresholds
# must not drift apart — a drill passing at 40 while backups demand 45 would
# certify a dump the backup step would have rejected.
MIN_TABLES="${MIN_TABLES:-45}"

cd "$COMPOSE_DIR"
# Extract only POSTGRES_USER from .env (safe even if .env has unquoted values with spaces).
if [ -f "$COMPOSE_DIR/.env" ]; then
  _pg_user="$(grep -E '^POSTGRES_USER=' "$COMPOSE_DIR/.env" | head -1 | cut -d= -f2- | tr -d '"' || true)"
fi
PG_USER="${_pg_user:-${POSTGRES_USER:-jagouser}}"

LATEST="${1:-$(ls -t "$BACKUP_DIR"/jago-*.sql.gz 2>/dev/null | head -1 || true)}"
[ -n "$LATEST" ] || { echo "No backup found in $BACKUP_DIR" >&2; exit 1; }
echo "[$(date -Is)] restore drill from: $LATEST"

DC=(docker compose -f "$COMPOSE_FILE" exec -T postgres)

cleanup() { "${DC[@]}" psql -U "$PG_USER" -d postgres -c "DROP DATABASE IF EXISTS $SCRATCH;" >/dev/null 2>&1 || true; }
trap cleanup EXIT

# Fresh scratch DB.
"${DC[@]}" psql -U "$PG_USER" -d postgres -c "DROP DATABASE IF EXISTS $SCRATCH;"
"${DC[@]}" createdb -U "$PG_USER" "$SCRATCH"

# Restore into scratch.
gunzip -c "$LATEST" | "${DC[@]}" psql -U "$PG_USER" -d "$SCRATCH" -q

# Verify schema restored.
TABLES=$("${DC[@]}" psql -U "$PG_USER" -d "$SCRATCH" -t -c \
  "SELECT count(*) FROM information_schema.tables WHERE table_schema='public';" | tr -d '[:space:]')
echo "[$(date -Is)] public tables restored: $TABLES (expected >= $MIN_TABLES)"
[ "${TABLES:-0}" -ge "$MIN_TABLES" ] || { echo "ERROR: backup looks incomplete ($TABLES tables)" >&2; exit 1; }

# Verify data (row counts — informational).
echo "[$(date -Is)] row counts:"
"${DC[@]}" psql -U "$PG_USER" -d "$SCRATCH" -t -c \
  "SELECT 'users='||count(*) FROM users
   UNION ALL SELECT 'courses='||count(*) FROM courses
   UNION ALL SELECT 'orders='||count(*) FROM orders;"

echo "[$(date -Is)] restore drill PASSED — backup is valid; scratch DB dropped"
