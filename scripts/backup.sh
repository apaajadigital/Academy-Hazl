#!/usr/bin/env bash
# Automated PostgreSQL backup for Jago Akademi production (TASK-021).
#
# WHY THIS WAS REWRITTEN — silent-backup incident, 4-6 Aug 2026
# -------------------------------------------------------------
# The scheduled backup produced NOTHING for three consecutive nights while
# looking healthy from the outside: cron fired on time every night and the cron
# file was present. /var/log/jago-backup.log repeated one line:
#
#     /bin/bash: line 1: /var/www/jago-akademi/scripts/backup.sh: Permission denied
#
# Root cause: cron executes the script BY PATH, but this file was tracked in git
# as mode 100644, so every checkout on the host landed as 644 — not executable.
# Bash refused it with exit 126. Execution never reached Docker, pg_dump, gzip,
# retention or rclone. Every backup that actually exists was taken by hand.
#
# Two independent fixes, deliberately both applied, because either one alone
# regresses the moment someone re-clones or re-copies:
#   1. the git index mode is now 100755, so every checkout is executable;
#   2. the cron line invokes `/bin/bash <script>`, which still works if the
#      executable bit is ever lost again.
#
# The old script also failed "quietly upward". It wrote straight to the final
# filename, so an aborted or truncated dump left a file that LOOKED like a
# backup — and retention would then prune older, genuinely good backups against
# it. Everything below writes to a .partial and is published only after it
# passes validation, via a link that CANNOT overwrite an existing file.
#
# EXIT CODES — documented contract; alerting depends on these
#    0  RESULT=OK        local backup valid; offsite verified, or not configured
#   10  RESULT=DEGRADED  local backup valid and KEPT, but something after it
#                        failed (offsite unverified, or retention failed)
#   75  RESULT=SKIPPED   another run holds the lock (EX_TEMPFAIL); nothing done
#    1  RESULT=FAIL      no usable backup was produced
#
# `FAIL` is reserved for "there is no usable backup". Once a valid final file
# exists, no later problem may downgrade the run to FAIL — it becomes DEGRADED,
# because a good backup on disk is materially different from no backup at all.
#
# Secrets are never printed: no .env contents, no rclone config, no credentials.
# Only variable NAMES, remote NAMES and object paths reach the log.

set -Eeuo pipefail
umask 077   # dumps are born 0600 — they contain every user record we hold

RUN_ID="$(date -u +%Y%m%dT%H%M%SZ)-$$"
log()  { echo "[$(date -Is)] [$RUN_ID] $*"; }
fail() { log "RESULT=FAIL reason=$*"; exit 1; }
trap 'fail "unexpected_error line=$LINENO"' ERR

COMPOSE_DIR="${COMPOSE_DIR:-/var/www/jago-akademi}"
COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.vps.yml}"
BACKUP_DIR="${BACKUP_DIR:-$COMPOSE_DIR/backups}"
RETENTION_DAYS="${RETENTION_DAYS:-14}"
R2_REMOTE="${R2_REMOTE:-}"          # e.g. "r2:jago-backups" — empty = local only
DB_NAME="${DB_NAME:-jago_akademi}"
MIN_BYTES="${MIN_BYTES:-1024}"

# Schema floor. Measured against the real thing, not guessed: the 4 Aug 2026
# production dump contains exactly 45 `CREATE TABLE` statements, matching the 44
# models in apps/api/prisma/schema.prisma plus _prisma_migrations, with all 14
# migrations applied. A dump carrying fewer tables than production is not a
# healthy backup, so the floor is the real number rather than a padded one.
# Override only for a deliberate schema change, and document it in the release
# or migration that causes it.
MIN_TABLES="${MIN_TABLES:-45}"

# --- Exactly one lock, held inside this script -------------------------------
# It lives here rather than in the cron line so that EVERY invocation is
# protected — cron, a manual run, or a future systemd unit. The cron entry must
# therefore NOT wrap this script in flock: two layers on the same lock file
# would make the inner acquisition fail against the outer one, every time.
#
# flock is a hard dependency, verified present on the production host
# (/usr/bin/flock, util-linux 2.39.3). There is deliberately NO fallback: a
# second lock implementation would be a second thing to get wrong, and a backup
# that silently runs unlocked is worse than one that refuses to start.
LOCK_FILE="${LOCK_FILE:-/var/lock/jago-backup.lock}"

acquire_lock() {
  command -v flock >/dev/null 2>&1 \
    || fail "flock_tidak_tersedia dependency=util-linux — dump tidak dijalankan"
  mkdir -p "$(dirname "$LOCK_FILE")" 2>/dev/null || true
  exec 9>"$LOCK_FILE"
  if ! flock -n 9; then
    log "RESULT=SKIPPED reason=lock_held_by_another_run lock=$LOCK_FILE"
    exit 75
  fi
  log "lock_acquired lock=$LOCK_FILE"
}

TMP=""
PUBLISHED=0
DEGRADED_REASON=""
degrade() {
  DEGRADED_REASON="${DEGRADED_REASON:+$DEGRADED_REASON,}$1"
  log "DEGRADED_CAUSE $1"
}

# ERR handler installed the instant the final file is published. It must never
# remove $FINAL and never report FAIL — by the time it can fire, a valid backup
# already exists on disk, and "no usable backup" would be a lie.
post_publish_err() {
  log "unexpected_error_after_publish line=$1"
  degrade "error_setelah_publish"
  log "RESULT=DEGRADED reasons=$DEGRADED_REASON file=$FINAL"
  exit 10
}

cleanup() {
  local rc=$?
  # Drop the ERR trap first. Without this, `return $rc` below is itself a
  # "failing command" whenever rc != 0, which re-enters the ERR trap and prints
  # a second, bogus RESULT line after the real one — poisoning exactly the field
  # that alerting greps for. Caught by the test harness before this shipped.
  trap - ERR
  if [ -n "$TMP" ] && [ -f "$TMP" ]; then
    rm -f "$TMP"
    log "partial_removed file=$TMP"
  fi
  return $rc
}
trap cleanup EXIT

acquire_lock

cd "$COMPOSE_DIR" || fail "compose_dir_tidak_ada dir=$COMPOSE_DIR"

# Read ONLY the POSTGRES_USER name out of .env. The value is used, never logged;
# no other key is touched and the file is never echoed.
_pg_user=""
if [ -f "$COMPOSE_DIR/.env" ]; then
  _pg_user="$(grep -E '^POSTGRES_USER=' "$COMPOSE_DIR/.env" | head -1 | cut -d= -f2- | tr -d '"' || true)"
fi
PG_USER="${_pg_user:-${POSTGRES_USER:-jagouser}}"

mkdir -p "$BACKUP_DIR" || fail "backup_dir_tidak_bisa_dibuat dir=$BACKUP_DIR"

# Seconds resolution. The old %F-%H%M granularity meant two runs inside the same
# minute — a cron run and an operator taking a pre-deploy snapshot, say —
# resolved to the SAME filename.
STAMP="$(date +%F-%H%M%S)"
FINAL="$BACKUP_DIR/jago-$STAMP.sql.gz"
# The .partial sits in the SAME directory as the final file so publishing is a
# same-filesystem link, i.e. atomic. A temp file under /tmp would make it a
# copy, and a half-copied backup is exactly what this guards against.
TMP="$BACKUP_DIR/.jago-$STAMP.sql.gz.partial"

# Fail before spending a dump on a name that is already taken.
[ -e "$FINAL" ] && fail "collision_nama_file file=$FINAL"

log "START db=$DB_NAME target=$FINAL retention=${RETENTION_DAYS}d min_tables=$MIN_TABLES"

# --- Dump ---------------------------------------------------------------------
# `set +e` alone is NOT enough: the ERR trap fires on a failing pipeline
# regardless of errexit, so it would report "unexpected_error" and mask the
# specific stage that actually broke. Both come off, and both go back on
# immediately after PIPESTATUS is captured.
trap - ERR
set +e
docker compose -f "$COMPOSE_FILE" exec -T postgres \
  pg_dump -U "$PG_USER" --no-owner --no-privileges "$DB_NAME" | gzip > "$TMP"
PIPE=("${PIPESTATUS[@]}")
set -e
trap 'fail "unexpected_error line=$LINENO"' ERR

# gzip is inspected FIRST, on purpose. If gzip dies, pg_dump is killed by SIGPIPE
# and exits 141 — so checking the producer first would blame the database for a
# compression failure and send the next responder down the wrong path entirely.
# A downstream failure explains an upstream SIGPIPE; the reverse is never true.
if [ "${PIPE[1]}" -ne 0 ]; then
  fail "gzip_gagal exit=${PIPE[1]} producer_exit=${PIPE[0]}"
fi
[ "${PIPE[0]}" -eq 0 ] || fail "pg_dump_gagal exit=${PIPE[0]}"

# --- Validation, all on the .partial, before it can be mistaken for a backup ---
[ -f "$TMP" ] || fail "partial_tidak_terbentuk file=$TMP"

SIZE="$(stat -c%s "$TMP" 2>/dev/null || stat -f%z "$TMP")"
[ "$SIZE" -ge "$MIN_BYTES" ] || fail "dump_terlalu_kecil bytes=$SIZE min=$MIN_BYTES"

gzip -t "$TMP" 2>/dev/null || fail "gzip_integrity_gagal file=$TMP"

# pg_dump writes this marker at the end of a complete dump. Its absence means
# the dump was cut off mid-stream — the failure mode a size check waves past.
#
# tail -20, not tail -5: since the Aug 2025 security release (CVE-2025-8714)
# pg_dump appends a `\unrestrict <nonce>` line AFTER the footer, and the 4 Aug
# 2026 production dump confirms it. A 5-line window sat one trailing line away
# from rejecting every healthy backup on this host.
if ! zcat "$TMP" | tail -20 | grep -q -- '-- PostgreSQL database dump complete'; then
  fail "dump_terpotong footer_tidak_ditemukan"
fi

TABLES="$(zgrep -c '^CREATE TABLE ' "$TMP" || true)"
[ "${TABLES:-0}" -ge "$MIN_TABLES" ] || fail "sanity_skema_gagal tables=$TABLES min=$MIN_TABLES"

log "VALIDATED bytes=$SIZE tables=$TABLES"

# --- Publish ------------------------------------------------------------------
# `ln` then unlink, NOT `mv -f`. A hard link fails atomically if the target
# already exists, so a name collision can never overwrite an existing backup —
# and `mv -n` is no substitute, because it skips silently and would report
# success while publishing nothing.
if ! ln "$TMP" "$FINAL" 2>/dev/null; then
  # Distinguish the two ways this fails. Calling every `ln` failure a collision
  # sends the next responder hunting for a duplicate filename when the real
  # problem may be a full disk, a read-only mount, or changed permissions.
  if [ -e "$FINAL" ]; then
    fail "collision_saat_publish file=$FINAL (backup lama TIDAK diubah)"
  fi
  fail "publish_gagal file=$FINAL (link gagal, bukan collision)"
fi

# ---- THE FAILURE CONTRACT FLIPS HERE -----------------------------------------
# A valid final file now exists on disk. Flip the contract BEFORE doing anything
# else — not after cleanup, not after chmod, not after logging. Everything below
# this line is housekeeping, and housekeeping must never be able to report "no
# usable backup" when a usable backup is already sitting there. The previous
# revision left `rm`, `chmod` and `log` inside the FAIL window; a failing `rm`
# would have thrown away a perfectly good backup's status.
PUBLISHED=1
trap 'post_publish_err $LINENO' ERR

# Each step is checked explicitly rather than leaning on the trap, so the log
# names which piece of housekeeping broke.
if ! rm -f "$TMP"; then
  # The stale .partial is harmless — retention prunes .partial files older than
  # a day — but it means the filesystem misbehaved, which is worth surfacing.
  degrade "cleanup_partial_gagal file=$TMP"
fi
TMP=""
if ! chmod 600 "$FINAL" 2>/dev/null; then
  degrade "chmod_final_gagal file=$FINAL"
fi
log "LOCAL_OK file=$FINAL bytes=$SIZE"

# --- Offsite ------------------------------------------------------------------
# Non-fatal to the LOCAL backup: a broken remote must never cost us a good local
# copy or block the retention prune. But it is not "fine" either — a backup on
# the same disk as the database it protects is one host loss away from
# worthless — so the run ends DEGRADED with a nonzero exit.
#
# rclone is NOT installed on the production host as of 7 Aug 2026, so the first
# deployment of this script is EXPECTED to end RESULT=DEGRADED exit 10 with a
# valid local backup. That is correct behaviour, not a regression.
OFFSITE_STATE="not_configured"
if [ -n "$R2_REMOTE" ]; then
  OFFSITE_STATE="failed"
  if command -v rclone >/dev/null 2>&1; then
    REMOTE_OBJ="$R2_REMOTE/postgres/$(basename "$FINAL")"
    if rclone copy "$FINAL" "$R2_REMOTE/postgres/" --s3-no-check-bucket; then
      # Verify the OBJECT WE JUST UPLOADED, not merely rclone's exit code. An
      # upload that "succeeded" into an unreadable or truncated object is a
      # backup that only exists on paper. Read it back and re-test the gzip.
      trap - ERR
      set +e
      rclone cat "$REMOTE_OBJ" | gzip -t
      RPIPE=("${PIPESTATUS[@]}")
      set -e
      trap 'post_publish_err $LINENO' ERR
      if [ "${RPIPE[0]}" -eq 0 ] && [ "${RPIPE[1]}" -eq 0 ]; then
        # `rclone size` is guarded by `if`, not captured bare. Under `pipefail` a
        # failing rclone makes the assignment itself fail, which fires the ERR
        # trap and exits BEFORE retention ever runs — losing local housekeeping
        # over a remote metadata call. Only the byte count is parsed out; the
        # JSON is never logged.
        if R_JSON="$(rclone size "$REMOTE_OBJ" --json 2>/dev/null)"; then
          R_SIZE="$(printf '%s' "$R_JSON" | sed -n 's/.*"bytes":[[:space:]]*\([0-9]*\).*/\1/p')"
          if [ -n "$R_SIZE" ] && [ "$R_SIZE" = "$SIZE" ]; then
            OFFSITE_STATE="verified"
            log "OFFSITE_OK remote_obj=$REMOTE_OBJ bytes=$R_SIZE"
          else
            log "OFFSITE_WARN ukuran_tidak_cocok local=$SIZE remote=${R_SIZE:-unknown}"
          fi
        else
          log "OFFSITE_WARN rclone_size_gagal remote_obj=$REMOTE_OBJ"
        fi
      else
        log "OFFSITE_WARN objek_remote_tidak_terbaca cat_exit=${RPIPE[0]} gzip_exit=${RPIPE[1]}"
      fi
    else
      log "OFFSITE_WARN upload_gagal remote=$R2_REMOTE"
    fi
  else
    log "OFFSITE_WARN rclone_tidak_terpasang"
  fi
  [ "$OFFSITE_STATE" = "verified" ] || degrade "offsite_tidak_terverifikasi"
fi

# --- Retention ----------------------------------------------------------------
# Reached only after a NEW local backup exists and passed every check above, so
# a bad night can never shrink the recovery window by pruning good backups.
# A retention failure is a housekeeping problem, not a backup problem: the new
# backup is already safe on disk, so this degrades the run rather than failing it.
if [ "$PUBLISHED" -eq 1 ] && [ -f "$FINAL" ]; then
  if find "$BACKUP_DIR" -name 'jago-*.sql.gz' -mtime "+$RETENTION_DAYS" -delete \
     && find "$BACKUP_DIR" -name '.jago-*.sql.gz.partial' -mtime +1 -delete; then
    log "RETENTION_OK keep=${RETENTION_DAYS}d"
  else
    degrade "retention_gagal"
  fi
else
  degrade "retention_dilewati_final_tidak_valid"
fi

# --- Result -------------------------------------------------------------------
if [ -n "$DEGRADED_REASON" ]; then
  log "RESULT=DEGRADED reasons=$DEGRADED_REASON file=$FINAL bytes=$SIZE tables=$TABLES"
  exit 10
fi
log "RESULT=OK file=$FINAL bytes=$SIZE tables=$TABLES offsite=$OFFSITE_STATE"
exit 0
