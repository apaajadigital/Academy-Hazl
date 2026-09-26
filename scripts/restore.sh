#!/usr/bin/env bash
# Restore drill for Jago Akademi (TASK-021, hardened under BL-163).
#
# Restores the latest backup into a SCRATCH database and proves the result is
# actually usable, then drops the scratch DB.
#
# WHAT CHANGED, AND WHY IT MATTERED
# The previous version could not fail in the ways that matter. Three defects,
# each verified against the live host on 9 Sep 2026:
#
#   1. The restore ran `psql -q` with no ON_ERROR_STOP, so psql exited 0 even if
#      every single statement errored. `set -o pipefail` cannot help: the
#      failure never became an exit code.
#   2. Row counts were printed and never asserted — the comment said
#      "informational". A dump that recreated 45 empty tables printed
#      `users=0 courses=0 orders=0` and then "restore drill PASSED".
#   3. It never opened the production database, so it could answer "did a
#      command run" but never "could we actually recover".
#
# Together those meant a schema-only or half-copied dump would be certified as a
# good backup. That is worse than having no drill, because it manufactures
# confidence.
#
# HOW PRODUCTION IS PROTECTED
# The drill now DOES read production — that is the only way to answer the real
# question — but every such session is opened with
# `default_transaction_read_only=on`, which Postgres enforces server-side. An
# accidental write fails with "cannot execute ... in a read-only transaction"
# rather than succeeding. Production is never a restore, createdb, or drop
# target; see the guards at the top and the assertions in scripts/tests/.
#
# Usage:  ./scripts/restore.sh [path/to/backup.sql.gz]
#   (defaults to the newest backup in $BACKUP_DIR)
set -euo pipefail

COMPOSE_DIR="${COMPOSE_DIR:-/var/www/jago-akademi}"
COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.vps.yml}"
BACKUP_DIR="${BACKUP_DIR:-$COMPOSE_DIR/backups}"

# Deliberately NOT env-overridable. This is the database the drill must never
# write to, so letting the environment rename it would defeat every guard below.
readonly LIVE_DB="jago_akademi"

# This host runs several unrelated compose projects. Without an explicit project
# name, `docker compose exec` resolves it from the working directory or an
# inherited COMPOSE_PROJECT_NAME — which is how a drill ends up dropping a
# scratch DB inside someone else's postgres.
COMPOSE_PROJECT="${COMPOSE_PROJECT:-jago-akademi}"

SCRATCH="${SCRATCH_DB:-jago_restore_test}"
# Matches scripts/backup.sh. Measured, not guessed: production reports exactly
# 45 BASE TABLEs (verified 9 Sep 2026 — 44 models in schema.prisma plus
# _prisma_migrations, all 16 migrations applied). A restore that yields fewer
# tables than production is not a proven backup, so the two thresholds must not
# drift apart — a drill passing at 40 while backups demand 45 would certify a
# dump the backup step would have rejected.
MIN_TABLES="${MIN_TABLES:-45}"

# --- Uploads archive verification (BL-165) ------------------------------------
# BL-164 made the archive; BL-163 made this drill able to fail. Until now the two
# had not met: the drill proved only the DATABASE was recoverable. The archive was
# verified by hand once, on 10 Sep 2026 — and a manual check is the one that gets
# skipped exactly when it matters. Failure mode if left manual: an archive is
# published every night, looks healthy in `ls`, and nobody ever opens it.
#
# Path from the host .env, same single source of truth as backup.sh (BL-162).
UPLOADS_DIR="${UPLOADS_DIR:-}"
# Set to 1 to skip the uploads half (e.g. a host that genuinely has no uploads).
SKIP_UPLOADS="${SKIP_UPLOADS:-0}"

# Tables whose emptiness would make a "successful" restore worthless, paired
# with the timestamp column used to align drill against live. Column names
# verified against the live schema, not against memory: course_enrollments has
# enrolledAt and no createdAt.
CRITICAL_TABLES=(
  "users:createdAt"
  "orders:createdAt"
  "payment_transactions:createdAt"
  "course_enrollments:enrolledAt"
)

log() { echo "[$(date -Is)] $*"; }
die() { echo "ERROR: $*" >&2; exit 1; }

# ── Guard: the scratch DB must be unmistakably a scratch DB ──────────────────
# Previously SCRATCH was interpolated raw into `psql -c "DROP DATABASE ..."`.
# `SCRATCH_DB=jago_akademi` dropped production; `SCRATCH_DB='x; DROP DATABASE
# jago_akademi'` dropped it too, via a second statement. Both are now refused
# before any connection is opened.
[[ "$SCRATCH" =~ ^jago_restore_[a-z0-9_]+$ ]] \
  || die "refusing SCRATCH_DB='$SCRATCH' — must match ^jago_restore_[a-z0-9_]+$"
[ "$SCRATCH" != "$LIVE_DB" ] || die "refusing to use the live database as scratch"

cd "$COMPOSE_DIR" || die "COMPOSE_DIR not found: $COMPOSE_DIR"
[ -f "$COMPOSE_FILE" ] || die "compose file not found: $COMPOSE_DIR/$COMPOSE_FILE"

# Extract only POSTGRES_USER from .env (safe even if .env has unquoted values with spaces).
if [ -f "$COMPOSE_DIR/.env" ]; then
  _pg_user="$(grep -E '^POSTGRES_USER=' "$COMPOSE_DIR/.env" | head -1 | cut -d= -f2- | tr -d '"' || true)"
fi
PG_USER="${_pg_user:-${POSTGRES_USER:-jagouser}}"

# Same idiom, same discipline: only this key is read, the value is never logged.
if [ -z "$UPLOADS_DIR" ] && [ -f "$COMPOSE_DIR/.env" ]; then
  UPLOADS_DIR="$(grep -E '^UPLOADS_PATH=' "$COMPOSE_DIR/.env" | head -1 | cut -d= -f2- | tr -d '"' || true)"
fi

# Newest by FILENAME, not mtime. Backup names are `jago-YYYY-MM-DD-HHMMSS.sql.gz`
# so a lexical sort is chronological, and an rclone re-download or a `cp` without
# -p can no longer make the drill certify a file that is not the newest backup.
LATEST="${1:-$(ls -1 "$BACKUP_DIR"/jago-*.sql.gz 2>/dev/null | sort | tail -1 || true)}"
[ -n "$LATEST" ] || die "No backup found in $BACKUP_DIR"
log "restore drill from: $LATEST"

DC=(docker compose -p "$COMPOSE_PROJECT" -f "$COMPOSE_FILE" exec -T postgres)
# Read-only at the SERVER, not by convention. Used for every live query.
DC_RO=(docker compose -p "$COMPOSE_PROJECT" -f "$COMPOSE_FILE" exec -T \
       -e "PGOPTIONS=-c default_transaction_read_only=on" postgres)

scratch_q() { "${DC[@]}"    psql -U "$PG_USER" -d "$SCRATCH" -v ON_ERROR_STOP=1 -Atc "$1"; }
live_q()    { "${DC_RO[@]}" psql -U "$PG_USER" -d "$LIVE_DB" -v ON_ERROR_STOP=1 -Atc "$1"; }
admin_q()   { "${DC[@]}"    psql -U "$PG_USER" -d postgres   -v ON_ERROR_STOP=1 -Atc "$1"; }

# ── Cleanup: WITH (FORCE) so a leftover connection cannot leave the DB behind ─
# The old cleanup swallowed every error, so a failed DROP left the scratch DB
# alive AND still printed PASSED.
UDIR=""
cleanup() {
  local rc=$?
  if ! admin_q "DROP DATABASE IF EXISTS $SCRATCH WITH (FORCE);" >/dev/null 2>&1; then
    echo "WARNING: could not drop scratch database $SCRATCH — drop it by hand" >&2
  fi
  # `|| true`: the EXIT trap runs under errexit, so a failing rm would replace
  # $rc and change what the drill reports.
  if [ -n "$UDIR" ] && [ -d "$UDIR" ]; then rm -rf "$UDIR" || true; fi
  return $rc
}
trap cleanup EXIT

# ── 1. Validate the FILE before touching any database ────────────────────────
# backup.sh already does these three checks at write time; doing them here too
# is what catches corruption that happened afterwards, on disk or in transit.
gzip -t "$LATEST" || die "backup is not a valid gzip file: $LATEST"
zcat "$LATEST" | tail -20 | grep -q -- '-- PostgreSQL database dump complete' \
  || die "backup has no completion footer — it was truncated"
_file_tables=$(zcat "$LATEST" | grep -c '^CREATE TABLE ' || true)
[ "${_file_tables:-0}" -ge "$MIN_TABLES" ] \
  || die "backup contains only $_file_tables CREATE TABLE statements (expected >= $MIN_TABLES)"

# The one way a psql restore can leave the database it was pointed at. Today's
# dumps are `pg_dump --no-owner --no-privileges`, which emit none of these; a
# future switch to pg_dumpall would, and the restore would then jump databases
# mid-stream — into production.
_escapes=$(zcat "$LATEST" | grep -cE '^\\connect|^\\c |^CREATE DATABASE|^DROP DATABASE' || true)
[ "${_escapes:-0}" -eq 0 ] \
  || die "backup contains $_escapes database-switching statements — refusing to restore"
log "file checks OK (gzip, footer, $_file_tables CREATE TABLE, no database switches)"

# ── 2. Live baseline (read-only) ─────────────────────────────────────────────
LIVE_TABLES=$(live_q "SELECT count(*) FROM information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE';")
LIVE_INDEXES=$(live_q "SELECT count(*) FROM pg_indexes WHERE schemaname='public';")
log "live baseline: $LIVE_TABLES tables, $LIVE_INDEXES indexes"

# ── 3. Fresh scratch DB ──────────────────────────────────────────────────────
admin_q "DROP DATABASE IF EXISTS $SCRATCH WITH (FORCE);" >/dev/null
"${DC[@]}" createdb -U "$PG_USER" "$SCRATCH"

# ── 4. Restore — ON_ERROR_STOP makes a failed statement a failed drill ───────
if ! gunzip -c "$LATEST" | "${DC[@]}" psql -U "$PG_USER" -d "$SCRATCH" -v ON_ERROR_STOP=1 -q; then
  die "restore failed — the backup does not replay cleanly"
fi

# ── 5. Schema assertions ─────────────────────────────────────────────────────
# `table_type='BASE TABLE'` matters: without it any future view counts toward
# the threshold, so a dump missing real tables could still clear 45.
TABLES=$(scratch_q "SELECT count(*) FROM information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE';")
log "public tables restored: $TABLES (expected >= $MIN_TABLES, live has $LIVE_TABLES)"
[ "${TABLES:-0}" -ge "$MIN_TABLES" ] || die "backup looks incomplete ($TABLES tables)"

INDEXES=$(scratch_q "SELECT count(*) FROM pg_indexes WHERE schemaname='public';")
log "indexes restored: $INDEXES (live has $LIVE_INDEXES)"
[ "${INDEXES:-0}" -ge "${LIVE_INDEXES:-0}" ] \
  || die "only $INDEXES of $LIVE_INDEXES indexes restored — a recovered DB would collapse under load"

# ── 6. Data assertions, against live ─────────────────────────────────────────
# This is the part that answers "could we actually recover?".
#
# The cutoff is derived from the RESTORED data, so it needs no assumption about
# host timezone or the filename stamp: every row that existed when the dump was
# taken must be present in the restore. A plain count comparison cannot see
# this — live legitimately grows after the backup, so `drill < live` is normal.
# Comparing both sides *at the same cutoff* is what separates normal drift from
# rows the backup silently dropped.
FAILURES=0
for pair in "${CRITICAL_TABLES[@]}"; do
  t="${pair%%:*}"; c="${pair##*:}"
  cutoff=$(scratch_q "SELECT coalesce(max(\"$c\")::text, '1970-01-01') FROM $t;")
  d_n=$(scratch_q "SELECT count(*) FROM $t WHERE \"$c\" <= '$cutoff';")
  l_n=$(live_q    "SELECT count(*) FROM $t WHERE \"$c\" <= '$cutoff';")
  l_total=$(live_q "SELECT count(*) FROM $t;")
  if [ "$d_n" = "$l_n" ]; then
    log "  $t: drill=$d_n live<=cutoff=$l_n live_total=$l_total  MATCH"
  else
    log "  $t: drill=$d_n live<=cutoff=$l_n live_total=$l_total  MISMATCH"
    FAILURES=$((FAILURES + 1))
  fi
done
[ "$FAILURES" -eq 0 ] \
  || die "$FAILURES critical table(s) do not match live at the backup cutoff — this backup is NOT a proven recovery point"

# ── 7. Uploads archive (BL-165) ──────────────────────────────────────────────
# A recovered database whose files are gone is not a recovered site: every
# certificate PDF, e-book and image would 404 while fileUrl/coverUrl rows still
# point at them. So the archive is verified here, on the same run, rather than
# by hand — a manual step is the one skipped exactly when it matters.
if [ "$SKIP_UPLOADS" = "1" ]; then
  log "uploads verification SKIPPED (SKIP_UPLOADS=1)"
else
  [ -n "$UPLOADS_DIR" ] && [ "${UPLOADS_DIR#/}" != "$UPLOADS_DIR" ] \
    || die "UPLOADS_PATH not set to an absolute path — cannot verify the uploads archive. Set it, or pass SKIP_UPLOADS=1 to state deliberately that this host has none."
  [ -d "$UPLOADS_DIR" ] || die "uploads dir does not exist: $UPLOADS_DIR"

  # Newest by FILENAME, not mtime — same reasoning as the dump above: an rclone
  # re-download or a `cp` without -p would otherwise make the drill certify an
  # archive that is not the newest one.
  ULATEST="$(ls -1 "$BACKUP_DIR"/jago-uploads-*.tar.gz 2>/dev/null | sort | tail -1 || true)"
  [ -n "$ULATEST" ] \
    || die "no uploads archive in $BACKUP_DIR — backup.sh should be producing one nightly (BL-164)"
  log "uploads archive: $ULATEST"

  gzip -t "$ULATEST" || die "uploads archive is not valid gzip: $ULATEST"
  tar -tzf "$ULATEST" >/dev/null 2>&1 || die "uploads archive is not a readable tar: $ULATEST"

  UDIR="$(mktemp -d)"
  tar -xzf "$ULATEST" -C "$UDIR" || die "uploads archive failed to extract"

  U_FILES=$(find "$UDIR" -type f | wc -l | tr -d '[:space:]')
  LIVE_FILES=$(find "$UPLOADS_DIR" -type f | wc -l | tr -d '[:space:]')
  log "uploads restored: $U_FILES files (live has $LIVE_FILES)"

  # An archive that restores nothing while the live directory holds files is the
  # exact failure a size check or a `tar -tzf` cannot see — the same blind spot
  # BL-164 guards against on the writing side.
  if [ "${LIVE_FILES:-0}" -gt 0 ] && [ "${U_FILES:-0}" -eq 0 ]; then
    die "uploads archive restored 0 files while live holds $LIVE_FILES — this archive is NOT a recovery point"
  fi

  # Cardinality is not integrity. Comparing bytes for every archived file that
  # still exists live is what separates "we restored 5 files" from "we restored
  # 5 files that are actually the right ones". Files deleted from live since the
  # backup are skipped — they cannot be compared, and their absence is expected.
  UMISMATCH=0; UCOMPARED=0
  while IFS= read -r f; do
    rel="${f#"$UDIR"/}"
    [ -f "$UPLOADS_DIR/$rel" ] || continue
    UCOMPARED=$((UCOMPARED + 1))
    if [ "$(md5sum "$f" | cut -d' ' -f1)" != "$(md5sum "$UPLOADS_DIR/$rel" | cut -d' ' -f1)" ]; then
      UMISMATCH=$((UMISMATCH + 1))
      # Path only, never contents. Upload filenames can be personal data, so this
      # is the one place a name is printed — and only when something is wrong.
      log "  CONTENT MISMATCH $rel"
    fi
  done < <(find "$UDIR" -type f)
  log "uploads content compared: $UCOMPARED file(s), $UMISMATCH mismatch(es)"
  [ "$UMISMATCH" -eq 0 ] \
    || die "$UMISMATCH archived file(s) differ byte-for-byte from live — the archive is corrupt"
fi

log "restore drill PASSED — DB replays cleanly and matches live; uploads archive restores and its bytes match; scratch DB dropped"
