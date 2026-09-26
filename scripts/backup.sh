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

# --- Uploads archive (BL-164) -------------------------------------------------
# Deliberately NOT hardcoded to /var/www/jago-uploads. BL-162 made the uploads
# mount a host .env value precisely because a hardcoded path drifts away from
# where the app actually writes — and a backup archiving a path nobody writes to
# any more is that same silent failure wearing a different filename. Resolved
# from UPLOADS_PATH below, with an env override for tests.
UPLOADS_DIR="${UPLOADS_DIR:-}"
# Floor for "the archive is not empty". Not a size floor: an empty tar.gz is
# ~120 bytes, so size alone can barely tell empty from full here. The count is
# what does the work.
UPLOADS_MIN_FILES="${UPLOADS_MIN_FILES:-1}"
# A source directory with zero files is, on this host, the BL-162 signature —
# the app writing somewhere else. So it degrades by default. Set to 1 on a
# genuinely fresh host that has not received an upload yet.
UPLOADS_ALLOW_EMPTY="${UPLOADS_ALLOW_EMPTY:-0}"

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
# Uploads state is kept in its OWN variables. Reusing TMP/FINAL/SIZE/TABLES would
# corrupt the retention guard (`[ -f "$FINAL" ]`) and turn the RESULT line —
# the one field alerting greps — into a lie about the database backup.
UTMP=""
UFINAL=""
UPLOADS_STATE="tidak_dikonfigurasi"
DEGRADED_REASON=""
degrade() {
  DEGRADED_REASON="${DEGRADED_REASON:+$DEGRADED_REASON,}$1"
  log "DEGRADED_CAUSE $1"
}

# --- Offsite upload + readback verification ----------------------------------
# offsite_put <local_file> <expected_bytes> <remote_prefix>  -> sets OFFSITE_STATE
#
# Extracted (BL-164) so the uploads archive gets the SAME verification the dump
# gets, rather than a second copy of it that quietly drifts. The logic below is
# unchanged from the version that shipped for the dump; only $FINAL/$SIZE and the
# literal "postgres" became parameters.
#
# Call it BARE, never as `if ! offsite_put ...`. Bash suppresses errexit inside a
# function used as a condition, which would silently change what the
# `trap - ERR; set +e … set -e; trap …` dance below means. Read OFFSITE_STATE
# afterwards instead.
offsite_put() {
  local file="$1" bytes="$2" prefix="$3"
  local remote_obj rpipe r_json r_size
  OFFSITE_STATE="not_configured"
  [ -n "$R2_REMOTE" ] || return 0
  OFFSITE_STATE="failed"
  if ! command -v rclone >/dev/null 2>&1; then
    log "OFFSITE_WARN rclone_tidak_terpasang"
    return 0
  fi
  remote_obj="$R2_REMOTE/$prefix/$(basename "$file")"
  if ! rclone copy "$file" "$R2_REMOTE/$prefix/" --s3-no-check-bucket; then
    log "OFFSITE_WARN upload_gagal remote=$R2_REMOTE prefix=$prefix"
    return 0
  fi
  # Verify the OBJECT WE JUST UPLOADED, not merely rclone's exit code. An upload
  # that "succeeded" into an unreadable or truncated object is a backup that only
  # exists on paper. Read it back and re-test the gzip.
  trap - ERR
  set +e
  rclone cat "$remote_obj" | gzip -t
  rpipe=("${PIPESTATUS[@]}")
  set -e
  trap 'post_publish_err $LINENO' ERR
  if [ "${rpipe[0]}" -ne 0 ] || [ "${rpipe[1]}" -ne 0 ]; then
    log "OFFSITE_WARN objek_remote_tidak_terbaca cat_exit=${rpipe[0]} gzip_exit=${rpipe[1]}"
    return 0
  fi
  # `rclone size` is guarded by `if`, not captured bare. Under `pipefail` a
  # failing rclone makes the assignment itself fail, which fires the ERR trap and
  # exits BEFORE retention ever runs — losing local housekeeping over a remote
  # metadata call. Only the byte count is parsed out; the JSON is never logged.
  if ! r_json="$(rclone size "$remote_obj" --json 2>/dev/null)"; then
    log "OFFSITE_WARN rclone_size_gagal remote_obj=$remote_obj"
    return 0
  fi
  r_size="$(printf '%s' "$r_json" | sed -n 's/.*"bytes":[[:space:]]*\([0-9]*\).*/\1/p')"
  if [ -n "$r_size" ] && [ "$r_size" = "$bytes" ]; then
    OFFSITE_STATE="verified"
    log "OFFSITE_OK remote_obj=$remote_obj bytes=$r_size"
  else
    log "OFFSITE_WARN ukuran_tidak_cocok local=$bytes remote=${r_size:-unknown}"
  fi
  return 0
}

# --- Uploads archive (BL-164) -------------------------------------------------
# A perfect database restore still yields a site where every certificate PDF,
# e-book and uploaded image is gone while fileUrl/coverUrl rows point at nothing
# — damage that shows up as broken pages, not as errors. Meilisearch can be
# reindexed from the DB and Redis holds ephemeral jobs, but uploads cannot be
# reconstructed from anywhere.
#
# Runs AFTER the database dump is published, verified, sent offsite and pruned.
# That ordering is the whole safety argument: the DB backup is proven and this
# is not, so nothing here can execute while a FAIL is still reachable, and
# nothing here can pre-empt retention. The worst an unexpected error in this
# function can cost is the final RESULT line — and post_publish_err prints its
# own, so alerting still sees one.
#
# Always returns 0 and reports through UPLOADS_STATE, so a problem here degrades
# the run instead of failing it. A good DB backup with no uploads archive is
# categorically better than no backup at all.
uploads_backup() {
  local src_files ufiles usize upipe

  if [ -z "$UPLOADS_DIR" ] || [ "${UPLOADS_DIR#/}" = "$UPLOADS_DIR" ]; then
    # Unset, or the named-volume value ("uploads") rather than a host path. On
    # this host that means UPLOADS_PATH went missing from .env — the BL-162
    # landmine — so say so rather than archiving nothing and calling it success.
    log "UPLOADS_SKIP reason=path_tidak_diset_atau_relatif"
    UPLOADS_STATE="tidak_dikonfigurasi"; return 0
  fi
  if [ ! -d "$UPLOADS_DIR" ]; then
    log "UPLOADS_SKIP reason=dir_tidak_ada dir=$UPLOADS_DIR"
    UPLOADS_STATE="dir_tidak_ada"; return 0
  fi
  # Would archive its own output and grow every night.
  case "$BACKUP_DIR/" in
    "$UPLOADS_DIR"/*)
      log "UPLOADS_SKIP reason=backup_dir_di_dalam_uploads_dir"
      UPLOADS_STATE="rekursi"; return 0 ;;
  esac

  # `|| true` on every count: test 8 replaces `find` with a failing stub, and
  # under pipefail a failing producer would otherwise fire the ERR trap here.
  src_files="$(find "$UPLOADS_DIR" -type f 2>/dev/null | wc -l || true)"; src_files="${src_files:-0}"
  if [ "$src_files" -eq 0 ] && [ "$UPLOADS_ALLOW_EMPTY" != "1" ]; then
    log "UPLOADS_SKIP reason=sumber_kosong dir_terbaca_tapi_0_file dir=$UPLOADS_DIR"
    UPLOADS_STATE="sumber_kosong"; return 0
  fi

  UFINAL="$BACKUP_DIR/jago-uploads-$STAMP.tar.gz"
  UTMP="$BACKUP_DIR/.jago-uploads-$STAMP.tar.gz.partial"
  if [ -e "$UFINAL" ]; then
    log "UPLOADS_WARN collision_nama file=$UFINAL"
    UPLOADS_STATE="collision"; return 0
  fi

  # `-C "$UPLOADS_DIR" .` rather than `-C /var/www jago-uploads`: the archive must
  # not encode the host layout, because BL-162 made that layout configurable.
  # Restore is `tar -xzf <archive> -C "$UPLOADS_PATH"` — the -C is REQUIRED, or
  # the contents splatter into the current directory.
  # --numeric-owner so a restore does not depend on the target host's /etc/passwd.
  # tar and gzip are blamed separately, same as the dump pipeline: `tar | gzip`
  # has the same SIGPIPE inversion pg_dump has.
  trap - ERR
  set +e
  tar --numeric-owner -C "$UPLOADS_DIR" -cf - . | gzip > "$UTMP"
  upipe=("${PIPESTATUS[@]}")
  set -e
  trap 'post_publish_err $LINENO' ERR
  if [ "${upipe[1]}" -ne 0 ]; then
    log "UPLOADS_FAIL reason=gzip_gagal exit=${upipe[1]}"
    UPLOADS_STATE="gzip_gagal"; return 0
  fi
  # GNU tar (1.35 on this host): exit 1 is "file changed as we read it" — the
  # archive is still usable, so publish it and flag it. Exit >=2 is fatal.
  if [ "${upipe[0]}" -ge 2 ]; then
    log "UPLOADS_FAIL reason=tar_gagal exit=${upipe[0]}"
    UPLOADS_STATE="tar_gagal"; return 0
  fi

  if ! gzip -t "$UTMP" 2>/dev/null; then
    log "UPLOADS_FAIL reason=gzip_integrity_gagal file=$UTMP"
    UPLOADS_STATE="gzip_integrity_gagal"; return 0
  fi
  # Reads the whole archive and requires a parseable structure through the
  # end-of-archive blocks — the tar equivalent of the dump's completion footer.
  if ! tar -tzf "$UTMP" >/dev/null 2>&1; then
    log "UPLOADS_FAIL reason=tar_listing_gagal file=$UTMP"
    UPLOADS_STATE="tar_listing_gagal"; return 0
  fi

  # THE check that does the work. Size and gzip -t both pass for a structurally
  # valid EMPTY archive, so only the count can tell "we archived the files" from
  # "we archived nothing". GNU tar suffixes directory entries with `/`.
  # `grep -c` exits 1 when the count is zero, hence `|| true`.
  ufiles="$(tar -tzf "$UTMP" 2>/dev/null | grep -cv '/$' || true)"; ufiles="${ufiles:-0}"
  if [ "$ufiles" -lt "$UPLOADS_MIN_FILES" ]; then
    log "UPLOADS_FAIL reason=arsip_kosong sumber=$src_files arsip=$ufiles"
    UPLOADS_STATE="arsip_kosong"; return 0
  fi

  usize="$(wc -c < "$UTMP" | tr -d '[:space:]')"
  # Atomic publish: link then unlink, never `mv -f`. `ln` refuses to overwrite an
  # existing file, so a name collision can never destroy an older archive.
  if ! ln "$UTMP" "$UFINAL" 2>/dev/null; then
    log "UPLOADS_FAIL reason=publish_gagal file=$UFINAL"
    UPLOADS_STATE="publish_gagal"; return 0
  fi
  rm -f "$UTMP"; UTMP=""
  chmod 600 "$UFINAL" 2>/dev/null || true   # certificate PDFs and e-books live in here
  log "UPLOADS_OK file=$UFINAL bytes=$usize files=$ufiles sumber=$src_files"
  UPLOADS_STATE="ok"

  if [ "$ufiles" -lt "$src_files" ]; then
    # Publish anyway — refusing would also discard the files that WERE captured —
    # but never silently. Both counts are racy against an upload arriving mid-run.
    log "UPLOADS_WARN file_kurang sumber=$src_files arsip=$ufiles"
    UPLOADS_STATE="file_kurang"
  fi
  if [ "${upipe[0]}" -eq 1 ]; then
    log "UPLOADS_WARN file_berubah_saat_dibaca tar_exit=1"
    UPLOADS_STATE="file_berubah"
  fi

  offsite_put "$UFINAL" "$usize" uploads
  if [ -n "$R2_REMOTE" ] && [ "$OFFSITE_STATE" != "verified" ]; then
    log "UPLOADS_WARN offsite_tidak_terverifikasi"
    UPLOADS_STATE="offsite_tidak_terverifikasi"
  fi

  # Retention. BOTH ends of each glob are anchored on purpose: `jago-*`, `*.gz`
  # or an unanchored `jago-uploads*` would sweep up the DATABASE backups. The
  # existing DB prune patterns are deliberately left untouched — they cannot
  # match `jago-uploads-*.tar.gz`, so nothing above needed editing.
  # Guarded on the published file, mirroring the DB rule: a bad night must never
  # shrink the recovery window.
  if [ -f "$UFINAL" ]; then
    if find "$BACKUP_DIR" -name 'jago-uploads-*.tar.gz' -mtime "+$RETENTION_DAYS" -delete \
       && find "$BACKUP_DIR" -name '.jago-uploads-*.tar.gz.partial' -mtime +1 -delete; then
      log "UPLOADS_RETENTION_OK keep=${RETENTION_DAYS}d"
    else
      log "UPLOADS_WARN retention_gagal"
      UPLOADS_STATE="retention_gagal"
    fi
  fi
  return 0
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
  # `|| true` is not defensive noise. The EXIT trap still runs under errexit, so
  # a failing rm here would replace $rc — turning a clean RESULT=OK into a
  # nonzero exit, or masking a FAIL. Test 9 fakes an rm that fails on *.partial*
  # precisely to keep this honest.
  if [ -n "$UTMP" ] && [ -f "$UTMP" ]; then
    rm -f "$UTMP" || true
    log "partial_removed file=$UTMP"
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

# Same discipline as POSTGRES_USER above: only this one key is read, the value is
# used and never logged. UPLOADS_PATH is the single source of truth for where
# uploads live (BL-162); reading it here keeps the backup pointed wherever the
# app is actually pointed, including after someone changes it.
if [ -z "$UPLOADS_DIR" ] && [ -f "$COMPOSE_DIR/.env" ]; then
  UPLOADS_DIR="$(grep -E '^UPLOADS_PATH=' "$COMPOSE_DIR/.env" | head -1 | cut -d= -f2- | tr -d '"' || true)"
fi

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
offsite_put "$FINAL" "$SIZE" postgres
if [ -n "$R2_REMOTE" ] && [ "$OFFSITE_STATE" != "verified" ]; then
  degrade "offsite_tidak_terverifikasi"
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

# --- Uploads (BL-164) ---------------------------------------------------------
# Last, on purpose. Everything above concerns the database backup, which is
# proven; this is not, so it runs only once a good dump is safely on disk, sent
# offsite and pruned. Called bare rather than as `if ! uploads_backup`, because
# bash suppresses errexit inside a function used as a condition — which would
# silently change the meaning of the `trap - ERR; set +e … set -e` sequences the
# function inherits. Read UPLOADS_STATE instead.
uploads_backup
if [ "$UPLOADS_STATE" != "ok" ]; then
  # Note this degrades on a host where UPLOADS_PATH is simply not set. That is
  # intended here: on this host an unconfigured uploads path means the backup is
  # incomplete, and BL-162 is exactly the story of that going unnoticed.
  degrade "uploads_$UPLOADS_STATE"
fi

# --- Result -------------------------------------------------------------------
if [ -n "$DEGRADED_REASON" ]; then
  log "RESULT=DEGRADED reasons=$DEGRADED_REASON file=$FINAL bytes=$SIZE tables=$TABLES uploads=$UPLOADS_STATE"
  exit 10
fi
log "RESULT=OK file=$FINAL bytes=$SIZE tables=$TABLES offsite=$OFFSITE_STATE uploads=$UPLOADS_STATE"
exit 0
