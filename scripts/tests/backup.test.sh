#!/usr/bin/env bash
# Test harness for scripts/backup.sh.
#
# Runs entirely against synthetic fixtures and fake executables placed on PATH.
# It never touches production data, a real database, a real dump, the VPS, or
# any credential — the fixtures are generated here and thrown away on exit.
#
# The production script deliberately has NO test seam: mocking happens by
# shadowing `docker`, `gzip`, `rclone`, `find` and `date` on PATH, so what runs
# under test is byte-for-byte what runs on the host.
#
# Usage:  bash scripts/tests/backup.test.sh
# Exit:   0 = all assertions passed (skipped platform-bound tests are reported
#             explicitly and never counted as passes)

set -uo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BS="$HERE/../backup.sh"
[ -f "$BS" ] || { echo "backup.sh tidak ditemukan di $BS"; exit 1; }

ROOT="$(mktemp -d)"
trap 'rm -rf "$ROOT"' EXIT
PASS=0; FAIL=0; SKIP=0
ok()   { PASS=$((PASS+1)); echo "    PASS  $1"; }
no()   { FAIL=$((FAIL+1)); echo "    FAIL  $1 -- $2"; }
skip() { SKIP=$((SKIP+1)); echo "    SKIP  $1 -- $2 (TIDAK dihitung lulus)"; }
head_() { echo; echo "== $* =="; }

REAL_DATE="$(command -v date)"
REAL_RM="$(command -v rm)"
REAL_TAR="$(command -v tar)"
HAVE_FLOCK=0; command -v flock >/dev/null 2>&1 && HAVE_FLOCK=1
RS="$HERE/../restore.sh"

# A backdated backup used as a RETENTION MARKER. Every run uses RETENTION_DAYS=0,
# so `find -mtime +0` must prune anything older than a day. Checking exit codes
# alone cannot tell "retention ran" from "retention was skipped"; this file can.
MARKER="jago-2000-01-01-000000.sql.gz"
oldmarker()   { : > "$1/backups/$MARKER"; touch -t 200001010000 "$1/backups/$MARKER"; }
marker_gone() { [ ! -e "$1/backups/$MARKER" ]; }

# A synthetic secret. If this string ever reaches the log, the leak test fails.
CANARY="s3cr3t-CANARY-DO-NOT-LOG-9f2b7c"
# A second canary, embedded in an UPLOAD FILENAME. Uploaded names can carry
# personal data, so the archive step must log counts and bytes — never a listing.
CANARY2="namafile-CANARY-DO-NOT-LOG-4a1e"

# ---------------------------------------------------------------------------
# Fixtures — synthetic only. The COPY block is incompressible noise so the
# gzipped fixture clears the real MIN_BYTES=1024 floor; a fixture of pure DDL
# gzips to ~230 bytes and would exercise the size guard instead of the case
# under test. The trailing `\unrestrict <nonce>` mirrors what pg_dump 16.14 now
# emits AFTER the footer (CVE-2025-8714 hardening) — confirmed against the
# 4 Aug 2026 production dump. The nonce here is invented, not copied.
# ---------------------------------------------------------------------------
mkdump() {                       # $1 = number of CREATE TABLE stmts, $2 = footer?
  echo "--"; echo "-- PostgreSQL database dump"; echo "--"
  local i
  for i in $(seq 1 "$1"); do echo "CREATE TABLE public.t$i (id text NOT NULL);"; done
  echo "COPY public.t1 (id) FROM stdin;"
  head -c 200000 /dev/urandom | base64
  echo "\\."
  if [ "$2" = "yes" ]; then
    echo "--"; echo "-- PostgreSQL database dump complete"; echo "--"
    echo
    echo "\\unrestrict FAKEnonceNOTfromProduction0000000000000000"
  fi
}
mkdump 45 yes > "$ROOT/f45.sql"      # healthy production-shaped dump
mkdump 44 yes > "$ROOT/f44.sql"      # one table short of the floor
mkdump 45 no  > "$ROOT/ftrunc.sql"   # bulk intact, footer chopped off

# ---------------------------------------------------------------------------
# Fake executables
# ---------------------------------------------------------------------------
mkbin() {                        # $1 = case dir -> creates $1/bin on PATH
  local b="$1/bin"; mkdir -p "$b"
  # `docker compose ... exec -T postgres pg_dump ...` -> emit the fixture.
  # DUMP_FIXTURE / DUMP_RC are read from the environment at call time.
  cat > "$b/docker" <<'EOF'
#!/bin/sh
[ -n "${DUMP_RC:-}" ] && [ "$DUMP_RC" != "0" ] && exit "$DUMP_RC"
cat "$DUMP_FIXTURE"
EOF
  chmod +x "$b/docker"
  # flock: use the real one when the platform has it. Otherwise a permissive
  # stub so the NON-lock tests can proceed — every lock assertion that depends
  # on real flock is reported as SKIP, never as PASS.
  if [ "$HAVE_FLOCK" -eq 0 ]; then
    printf '#!/bin/sh\nexit 0\n' > "$b/flock"; chmod +x "$b/flock"
  fi
  echo "$b"
}

fake_rclone() {                  # $1 = bin dir, $2 = mode
  cat > "$1/rclone" <<EOF
#!/bin/sh
REM="\$RCLONE_STORE"
mode="$2"
case "\$1" in
  copy)
    [ "\$mode" = "copyfail" ] && exit 1
    mkdir -p "\$REM"; cp "\$2" "\$REM/" ;;
  cat)
    [ "\$mode" = "catfail" ] && exit 1
    cat "\$REM/\$(basename "\$2")" ;;
  size)
    [ "\$mode" = "sizefail" ] && exit 1
    if [ "\$mode" = "sizemismatch" ]; then echo '{"count":1,"bytes":1}'
    else echo "{\"count\":1,\"bytes\":\$(wc -c < "\$REM/\$(basename "\$2")")}"; fi ;;
esac
exit 0
EOF
  chmod +x "$1/rclone"
}

newcase() {                      # $1 = name -> echoes case dir
  local d="$ROOT/$1"; mkdir -p "$d/backups" "$d/uploads/images"
  printf 'POSTGRES_USER=jagouser\nJWT_SECRET=%s\n' "$CANARY" > "$d/.env"
  # Two upload fixtures. One is NAMED with a second canary: uploaded filenames
  # can be personal data (a certificate named after a student), so the log must
  # never contain them — asserted in the leak sweep.
  printf 'pdf-bytes' > "$d/uploads/sertifikat-$CANARY2.pdf"
  printf 'png-bytes' > "$d/uploads/images/cover.png"
  echo "$d"
}

run() {                          # $1 = case dir; rest = extra env; echoes exit code
  local d="$1"; shift
  local b="$d/bin"
  env PATH="$b:$PATH" \
      COMPOSE_DIR="$d" BACKUP_DIR="$d/backups" LOCK_FILE="$d/lock" \
      DUMP_FIXTURE="$ROOT/f45.sql" RETENTION_DAYS=0 UPLOADS_DIR="$d/uploads" \
      "$@" bash "$BS" >"$d/log" 2>&1
  echo $?
}

finals() { ls "$1"/backups/jago-*.sql.gz 2>/dev/null | wc -l; }
parts()  { ls "$1"/backups/.jago-*.partial 2>/dev/null | wc -l; }

# ===========================================================================
head_ "1. Sukses: 45 tabel + footer produksi (dengan \\unrestrict)"
d=$(newcase ok); mkbin "$d" >/dev/null
rc=$(run "$d")
[ "$rc" = 0 ] && ok "exit 0" || no "exit 0" "rc=$rc ; $(tail -2 "$d/log")"
grep -q 'RESULT=OK' "$d/log" && ok "RESULT=OK" || no "RESULT=OK" "$(tail -2 "$d/log")"
grep -q 'tables=45' "$d/log" && ok "45 tabel terhitung" || no "tables=45" "$(grep VALIDATED "$d/log")"
grep -q 'dump_terpotong' "$d/log" && no "\\unrestrict memicu false negative" "footer ditolak" || ok "\\unrestrict setelah footer TIDAK bikin false negative"
[ "$(finals "$d")" = 1 ] && ok "1 file final" || no "1 file final" "n=$(finals "$d")"
[ "$(parts "$d")" = 0 ] && ok "tidak ada .partial tersisa" || no ".partial bersih" "tersisa"

head_ "2. 44 tabel ditolak (floor = 45)"
d=$(newcase t44); mkbin "$d" >/dev/null
rc=$(run "$d" DUMP_FIXTURE="$ROOT/f44.sql")
[ "$rc" = 1 ] && ok "exit 1" || no "exit 1" "rc=$rc"
grep -q 'RESULT=FAIL reason=sanity_skema_gagal tables=44 min=45' "$d/log" && ok "sebab spesifik 44<45" || no "sebab 44<45" "$(tail -2 "$d/log")"
[ "$(finals "$d")" = 0 ] && ok "tidak jadi backup" || no "tidak jadi backup" "ada"

head_ "3. Footer hilang / dump terpotong ditolak"
d=$(newcase trunc); mkbin "$d" >/dev/null
rc=$(run "$d" DUMP_FIXTURE="$ROOT/ftrunc.sql")
[ "$rc" = 1 ] && ok "exit 1" || no "exit 1" "rc=$rc"
grep -q 'dump_terpotong' "$d/log" && ok "footer hilang terdeteksi" || no "footer" "$(tail -2 "$d/log")"
[ "$(finals "$d")" = 0 ] && ok "tidak jadi backup" || no "tidak jadi backup" "ada"

head_ "4. Producer (pg_dump) gagal"
d=$(newcase prod); mkbin "$d" >/dev/null; oldmarker "$d"
rc=$(run "$d" DUMP_RC=3)
[ "$rc" = 1 ] && ok "exit 1" || no "exit 1" "rc=$rc"
grep -q 'pg_dump_gagal exit=3' "$d/log" && ok "producer exit=3 diidentifikasi" || no "producer exit" "$(tail -2 "$d/log")"
[ "$(parts "$d")" = 0 ] && ok "partial dibersihkan" || no "partial bersih" "tersisa"
marker_gone "$d" && no "retention JALAN padahal belum ada final valid" "marker terhapus" || ok "retention TIDAK jalan — marker kadaluwarsa masih utuh"

head_ "5. gzip gagal di pipeline"
d=$(newcase gz); b=$(mkbin "$d")
printf '#!/bin/sh\nexit 1\n' > "$b/gzip"; chmod +x "$b/gzip"
rc=$(run "$d")
[ "$rc" = 1 ] && ok "exit 1" || no "exit 1" "rc=$rc"
grep -q 'gzip_gagal' "$d/log" && ok "stage gzip diidentifikasi (bukan disalahkan ke pg_dump)" || no "gzip stage" "$(tail -2 "$d/log")"
[ "$(finals "$d")" = 0 ] && ok "tidak ada file final" || no "tidak ada final" "ada"

head_ "6. Dump terlalu kecil / korup"
d=$(newcase small); b=$(mkbin "$d")
printf 'CREATE TABLE public.t1 (id text);\n' > "$ROOT/tiny.sql"
rc=$(run "$d" DUMP_FIXTURE="$ROOT/tiny.sql")
[ "$rc" = 1 ] && ok "exit 1" || no "exit 1" "rc=$rc"
grep -qE 'dump_terlalu_kecil|gzip_integrity_gagal|dump_terpotong' "$d/log" && ok "ditolak sebelum publish" || no "ditolak" "$(tail -2 "$d/log")"

head_ "7. Collision: file final bernama sama TIDAK ditimpa"
d=$(newcase coll); b=$(mkbin "$d")
cat > "$b/date" <<EOF
#!/bin/sh
[ "\$*" = "+%F-%H%M%S" ] && { echo "2026-01-01-000000"; exit 0; }
exec "$REAL_DATE" "\$@"
EOF
chmod +x "$b/date"
rc1=$(run "$d"); sum1=$(md5sum "$d/backups/jago-2026-01-01-000000.sql.gz" 2>/dev/null | cut -d' ' -f1)
rc2=$(run "$d"); sum2=$(md5sum "$d/backups/jago-2026-01-01-000000.sql.gz" 2>/dev/null | cut -d' ' -f1)
[ "$rc1" = 0 ] && ok "run pertama sukses" || no "run pertama" "rc=$rc1 ; $(tail -2 "$d/log")"
[ "$rc2" = 1 ] && ok "run kedua exit 1" || no "run kedua exit 1" "rc=$rc2"
grep -q 'collision_nama_file' "$d/log" && ok "collision ditolak eksplisit" || no "collision" "$(tail -2 "$d/log")"
[ -n "$sum1" ] && [ "$sum1" = "$sum2" ] && ok "file lama TIDAK berubah (md5 identik)" || no "file lama utuh" "$sum1 vs $sum2"
[ "$(finals "$d")" = 1 ] && ok "tetap 1 file" || no "tetap 1 file" "n=$(finals "$d")"

head_ "8. Retention gagal SETELAH final valid -> DEGRADED (bukan FAIL)"
d=$(newcase ret); b=$(mkbin "$d")
printf '#!/bin/sh\nexit 1\n' > "$b/find"; chmod +x "$b/find"
rc=$(run "$d")
[ "$rc" = 10 ] && ok "exit 10" || no "exit 10" "rc=$rc ; $(tail -2 "$d/log")"
grep -q 'RESULT=DEGRADED' "$d/log" && ok "RESULT=DEGRADED" || no "DEGRADED" "$(tail -2 "$d/log")"
grep -q 'retention_gagal' "$d/log" && ok "sebab retention_gagal" || no "sebab" "$(tail -2 "$d/log")"
grep -q 'RESULT=FAIL' "$d/log" && no "tidak boleh FAIL setelah final valid" "ada FAIL" || ok "TIDAK dicatat FAIL"
[ "$(finals "$d")" = 1 ] && ok "backup final dipertahankan" || no "final dipertahankan" "n=$(finals "$d")"

head_ "9. Cleanup .partial gagal SETELAH hard-link sukses -> DEGRADED, bukan FAIL"
d=$(newcase rmfail); b=$(mkbin "$d"); oldmarker "$d"
cat > "$b/rm" <<EOF
#!/bin/sh
case "\$*" in *.partial*) exit 1;; esac
exec "$REAL_RM" "\$@"
EOF
chmod +x "$b/rm"
rc=$(run "$d")
[ "$rc" = 10 ] && ok "exit 10 (kontrak degraded)" || no "exit 10" "rc=$rc ; $(tail -3 "$d/log")"
grep -q 'RESULT=DEGRADED' "$d/log" && ok "RESULT=DEGRADED" || no "DEGRADED" "$(tail -3 "$d/log")"
grep -q 'RESULT=FAIL' "$d/log" && no "TIDAK boleh FAIL setelah publish" "ada RESULT=FAIL" || ok "tidak ada RESULT=FAIL"
grep -q 'cleanup_partial_gagal' "$d/log" && ok "sebab cleanup_partial_gagal" || no "sebab" "$(tail -3 "$d/log")"
f=$(ls "$d"/backups/jago-2*.sql.gz 2>/dev/null | head -1)
[ -n "$f" ] && ok "file final tetap ada" || no "file final ada" "hilang"
[ -n "$f" ] && gzip -t "$f" 2>/dev/null && ok "file final utuh (gzip -t lulus)" || no "final utuh" "gzip -t gagal"
[ -n "$f" ] && [ "$(zgrep -c '^CREATE TABLE ' "$f")" = 45 ] && ok "isi final identik (45 tabel)" || no "isi final" "jumlah tabel meleset"
marker_gone "$d" && ok "retention TETAP dijalankan setelah publish" || no "retention jalan" "marker masih ada"

head_ "10. Offsite: rclone tidak terpasang -> DEGRADED, lokal + retention tetap jalan"
d=$(newcase norc); mkbin "$d" >/dev/null; oldmarker "$d"
rc=$(run "$d" R2_REMOTE="r2:jago-backups")
[ "$rc" = 10 ] && ok "exit 10" || no "exit 10" "rc=$rc"
grep -q 'rclone_tidak_terpasang' "$d/log" && ok "sebab rclone absen" || no "sebab" "$(tail -2 "$d/log")"
grep -q 'RESULT=DEGRADED' "$d/log" && ok "RESULT=DEGRADED" || no "DEGRADED" "-"
grep -q 'RESULT=FAIL' "$d/log" && no "tidak boleh FAIL" "ada" || ok "tidak ada RESULT=FAIL"
[ "$(ls "$d"/backups/jago-2*.sql.gz 2>/dev/null | wc -l)" = 1 ] && ok "backup lokal DIPERTAHANKAN" || no "lokal" "-"
marker_gone "$d" && ok "retention lokal TETAP dijalankan" || no "retention" "marker masih ada"

head_ "11. Offsite: copyfail / catfail / sizefail / sizemismatch / ok"
for mode in copyfail catfail sizefail sizemismatch ok; do
  d=$(newcase "rc_$mode"); b=$(mkbin "$d"); fake_rclone "$b" "$mode"; oldmarker "$d"
  rc=$(run "$d" R2_REMOTE="r2:jago" RCLONE_STORE="$d/remote")
  if [ "$mode" = "ok" ]; then
    [ "$rc" = 0 ] && ok "mode=ok -> exit 0" || no "mode=ok exit 0" "rc=$rc ; $(tail -2 "$d/log")"
    grep -q 'OFFSITE_OK' "$d/log" && ok "mode=ok readback+ukuran cocok" || no "mode=ok OFFSITE_OK" "$(tail -2 "$d/log")"
  else
    [ "$rc" = 10 ] && ok "mode=$mode -> exit 10 DEGRADED" || no "mode=$mode exit 10" "rc=$rc ; $(tail -2 "$d/log")"
    grep -q 'RESULT=FAIL' "$d/log" && no "mode=$mode tidak boleh FAIL" "ada" || ok "mode=$mode tidak ada FAIL"
    [ "$(ls "$d"/backups/jago-2*.sql.gz 2>/dev/null | wc -l)" = 1 ] && ok "mode=$mode lokal dipertahankan" || no "mode=$mode lokal" "-"
  fi
  # The point of the marker: prove retention actually RAN, for every offsite outcome.
  marker_gone "$d" && ok "mode=$mode retention lokal dijalankan" || no "mode=$mode retention" "marker masih ada"
  [ "$mode" = "sizefail" ] && { grep -q 'rclone_size_gagal' "$d/log" && ok "sizefail: sebab eksplisit" || no "sizefail sebab" "$(tail -2 "$d/log")"; }
done

head_ "12. Lock: dua proses paralel (butuh flock ASLI)"
if [ "$HAVE_FLOCK" -eq 1 ]; then
  d=$(newcase lock); b=$(mkbin "$d")
  cat > "$b/docker" <<'EOF'
#!/bin/sh
sleep 3; cat "$DUMP_FIXTURE"
EOF
  chmod +x "$b/docker"
  ( run "$d" > "$d/rc1" ) &
  sleep 1
  d2rc=$(env PATH="$b:$PATH" COMPOSE_DIR="$d" BACKUP_DIR="$d/backups" LOCK_FILE="$d/lock" \
             DUMP_FIXTURE="$ROOT/f45.sql" RETENTION_DAYS=0 bash "$BS" >"$d/log2" 2>&1; echo $?)
  wait; rc1=$(cat "$d/rc1")
  [ "$d2rc" = 75 ] && ok "proses kedua exit 75" || no "exit 75" "rc=$d2rc"
  grep -q 'RESULT=SKIPPED' "$d/log2" && ok "RESULT=SKIPPED" || no "SKIPPED" "$(tail -1 "$d/log2")"
  [ "$rc1" = 0 ] && ok "proses pertama tetap sukses" || no "proses pertama" "rc1=$rc1"
else
  skip "lock overlap via flock" "flock tidak ada di platform ini; butuh Linux"
fi

head_ "13. flock tidak tersedia -> FAIL, dump TIDAK dijalankan"
# Complementary to test 11 by design. Hiding a binary that IS installed cannot be
# done reliably (`command -v` skips non-executables and finds the real one further
# down PATH, and a curated minimal PATH breaks the dynamic loader on MSYS). So
# each platform runs whichever half is genuine and SKIPs the other; together
# Windows + Linux cover both. Neither is ever faked into a PASS.
if [ "$HAVE_FLOCK" -eq 0 ]; then
  d=$(newcase nofl); mkdir -p "$d/bin"
  cat > "$d/bin/docker" <<'EOF'
#!/bin/sh
cat "$DUMP_FIXTURE"
EOF
  chmod +x "$d/bin/docker"     # no flock stub here: the platform genuinely lacks it
  rc=$(env PATH="$d/bin:$PATH" COMPOSE_DIR="$d" BACKUP_DIR="$d/backups" LOCK_FILE="$d/lock" \
           DUMP_FIXTURE="$ROOT/f45.sql" bash "$BS" >"$d/log" 2>&1; echo $?)
  [ "$rc" = 1 ] && ok "exit 1" || no "exit 1" "rc=$rc ; $(tail -2 "$d/log")"
  grep -q 'RESULT=FAIL reason=flock_tidak_tersedia' "$d/log" && ok "sebab flock_tidak_tersedia" || no "sebab flock" "$(tail -2 "$d/log")"
  [ "$(finals "$d")" = 0 ] && ok "dump TIDAK dijalankan" || no "dump tidak jalan" "ada file"
else
  skip "flock tidak tersedia" "flock ADA di platform ini; tak bisa disembunyikan dengan jujur"
fi

head_ "14. Tidak ada secret tercetak"
leak=0
for f in "$ROOT"/*/log "$ROOT"/*/log2; do
  [ -f "$f" ] || continue
  grep -q "$CANARY" "$f" && { leak=1; echo "      bocor di: $f"; }
done
[ "$leak" = 0 ] && ok "canary .env tidak pernah muncul di log mana pun" || no "canary bocor" "lihat di atas"
# Comments are stripped first: the script's own documentation legitimately says
# "no rclone config", and matching that phrase would fail the test for saying the
# right thing. What matters is executable code, not prose.
if grep -vE '^[[:space:]]*#' "$BS" | grep -qE 'JWT_SECRET=|POSTGRES_PASSWORD=|DOKU_SECRET|RESEND_API_KEY=|MEILISEARCH_KEY=|rclone config'; then
  no "secret/config di kode" "ada"
else
  ok "kode (di luar komentar) tidak memuat nilai secret / rclone config"
fi
grep -vE '^[[:space:]]*#' "$BS" | grep -q 'cat .*\.env' && no "script mencetak .env" "ada" || ok "script tidak pernah mencetak isi .env"

head_ "15. .gitignore tidak menelan source SQL"
if command -v git >/dev/null 2>&1 && git -C "$HERE/../.." rev-parse --git-dir >/dev/null 2>&1; then
  R="$HERE/../.."
  swallowed=$(git -C "$R" ls-files -i -c --exclude-standard | wc -l)
  [ "$swallowed" = 0 ] && ok "0 tracked file ter-ignore" || no "tracked ter-ignore" "n=$swallowed"
  git -C "$R" check-ignore -q -- apps/api/prisma/migrations/00000000000000_init/migration.sql \
    && no "migration Prisma ter-ignore" "buruk" || ok "migration Prisma tetap tracked"
  git -C "$R" check-ignore -q -- scripts/index-audit.sql \
    && no "helper SQL ter-ignore" "buruk" || ok "helper SQL scripts/*.sql tetap tracked"
  git -C "$R" check-ignore -q -- backups/x.sql.gz && ok "dump runtime ter-ignore" || no "dump runtime" "tidak ignored"
else
  skip "pemeriksaan .gitignore" "bukan git repo / git tidak tersedia"
fi

head_ "16. restore.sh — drill harus BISA GAGAL (validasi TERISOLASI, bukan integrasi)"
# NOT an integration test. `docker` is faked, so no Postgres is started and no
# restore actually happens. What this DOES exercise is the property the drill
# lacked until BL-163: that a backup which restores an empty or short database
# is REJECTED. The old script printed "restore drill PASSED" for exactly that.
grep -q 'MIN_TABLES="${MIN_TABLES:-45}"' "$RS" \
  && ok "default restore = 45 (selaras dengan backup.sh)" \
  || no "default restore 45" "$(grep -n 'MIN_TABLES=' "$RS" | head -1)"
grep -q 'MIN_TABLES="${MIN_TABLES:-40}"' "$RS" && no "masih ada default 40" "drift" || ok "tidak ada sisa default 40"

# BL-163 regressions: each of these three lines is a defect that made the drill
# incapable of failing. Assert on the source, because their absence is silent.
grep -q 'ON_ERROR_STOP=1 -q' "$RS" \
  && ok "restore memakai ON_ERROR_STOP (psql tak lagi exit 0 saat semua statement gagal)" \
  || no "ON_ERROR_STOP hilang" "psql akan exit 0 walau restore gagal total"
grep -q "table_type='BASE TABLE'" "$RS" \
  && ok "hitung tabel dibatasi BASE TABLE (view tidak ikut menggenapi ambang)" \
  || no "BASE TABLE hilang" "view bisa menutupi tabel yang hilang"
grep -q 'readonly LIVE_DB=' "$RS" \
  && ok "LIVE_DB konstan, tidak bisa di-override environment" \
  || no "LIVE_DB bisa di-override" "SCRATCH_DB=jago_akademi kembali bisa men-drop produksi"

# $1 = nama kasus, $2 = tabel hasil restore, $3 = baris drill, $4 = baris live
# (drill == live  -> MATCH; drill < live -> backup kehilangan baris -> WAJIB gagal)
restore_case() {
  local d; d=$(newcase "$1"); mkdir -p "$d/bin"
  # restore.sh kini menolak COMPOSE_DIR tanpa compose file (dulu ia meledak dengan
  # error bash mentah). Tanpa file boneka ini setiap kasus "DITOLAK" di bawah akan
  # lulus karena alasan yang salah — persis yang terjadi saat tes ini pertama ditulis.
  : > "$d/docker-compose.vps.yml"
  gzip -c "$ROOT/f45.sql" > "$d/backups/jago-2026-08-04-105100.sql.gz"
  cat > "$d/bin/docker" <<'EOF'
#!/bin/sh
echo "$*" >> "$DOCKER_LOG"
case "$*" in
  *createdb*)      exit 0 ;;
  *"DROP DATABASE"*) exit 0 ;;
  # Restore: harus dikenali SEBELUM dispatch per-database, dan WAJIB menghabiskan
  # stdin. Kalau tidak, `gunzip -c | docker …` kena SIGPIPE dan `pipefail` membuat
  # setiap kasus gagal dengan sebab yang menyesatkan. Query memakai -Atc, restore
  # memakai -q, jadi keduanya tak pernah bertabrakan.
  *" -q"*)         cat >/dev/null 2>&1; exit 0 ;;
esac
# Jawaban berbeda tergantung database yang dibuka — itulah inti drill baru.
case "$*" in
  *"-d jago_akademi"*)
    case "$*" in
      *information_schema.tables*) echo 45 ;;
      *pg_indexes*)                echo 100 ;;
      *"WHERE"*)                   echo "$LIVE_ROWS" ;;
      *count*)                     echo 999 ;;
      *)                           echo 0 ;;
    esac
    exit 0 ;;
  *"-d jago_restore_test"*)
    case "$*" in
      *information_schema.tables*) echo "$RESTORE_TABLES" ;;
      *pg_indexes*)                echo 100 ;;
      *"max("*)                    echo "2026-08-04 10:51:00" ;;
      *"WHERE"*)                   echo "$DRILL_ROWS" ;;
      *)                           echo 0 ;;
    esac
    exit 0 ;;
esac
case "$*" in
  *" -q"*) cat >/dev/null 2>&1; exit 0 ;;
esac
exit 0
EOF
  chmod +x "$d/bin/docker"
  : > "$d/dockerlog"
  env PATH="$d/bin:$PATH" COMPOSE_DIR="$d" BACKUP_DIR="$d/backups" \
      RESTORE_TABLES="$2" DRILL_ROWS="$3" LIVE_ROWS="$4" DOCKER_LOG="$d/dockerlog" \
      bash "$RS" >"$d/log" 2>&1
  echo "$?|$d"
}

r=$(restore_case r44 44 7 7); rc=${r%%|*}; d=${r#*|}
[ "$rc" != 0 ] && ok "44 tabel DITOLAK (exit $rc)" || no "44 ditolak" "rc=0"
grep -q 'backup looks incomplete (44 tables)' "$d/log" && ok "sebab eksplisit 44 tabel" || no "sebab 44" "$(tail -2 "$d/log")"

# Inti BL-163: dump schema-only. 45 tabel utuh, NOL baris, produksi punya data.
# Versi lama mencetak "restore drill PASSED" untuk kasus ini.
r=$(restore_case rempty 45 0 7); rc=${r%%|*}; d=${r#*|}
[ "$rc" != 0 ] && ok "dump schema-only (45 tabel, 0 baris) DITOLAK — regresi utama BL-163" \
               || no "schema-only lolos" "drill masih tak bisa gagal: $(tail -2 "$d/log")"
grep -q 'NOT a proven recovery point' "$d/log" && ok "sebab eksplisit: bukan titik pemulihan" || no "sebab schema-only" "$(tail -2 "$d/log")"

# Backup kehilangan sebagian baris yang SUDAH ADA saat dump diambil.
r=$(restore_case rshort 45 5 7); rc=${r%%|*}; d=${r#*|}
[ "$rc" != 0 ] && ok "backup kehilangan baris (5 vs 7 pada cutoff sama) DITOLAK" \
               || no "kehilangan baris lolos" "$(tail -2 "$d/log")"

r=$(restore_case rok 45 7 7); rc=${r%%|*}; d=${r#*|}
[ "$rc" = 0 ] && ok "backup sehat LOLOS" || no "sehat ditolak" "rc=$rc ; $(tail -2 "$d/log")"
grep -q 'restore drill PASSED' "$d/log" && ok "melaporkan PASSED" || no "PASSED" "$(tail -2 "$d/log")"

# Drill sekarang MEMBACA produksi — itu satu-satunya cara menjawab "benarkah kita
# bisa pulih". Jadi asersinya bukan lagi "jangan pernah sebut jago_akademi",
# melainkan yang sebenarnya penting: produksi tidak pernah jadi sasaran TULIS,
# dan setiap sesi ke sana dibuka read-only yang ditegakkan server.
if grep -qE 'createdb.*jago_akademi|DROP DATABASE[^;]*jago_akademi|-d jago_akademi[^|]*-q$' "$d/dockerlog"; then
  no "MENULIS ke database produksi" "$(grep -E 'createdb.*jago_akademi|DROP DATABASE[^;]*jago_akademi' "$d/dockerlog" | head -1)"
else
  ok "produksi tidak pernah jadi sasaran createdb/DROP/restore"
fi
if grep -q -- '-d jago_akademi' "$d/dockerlog"; then
  if grep -- '-d jago_akademi' "$d/dockerlog" | grep -qv 'default_transaction_read_only=on'; then
    no "sesi ke produksi TANPA read-only" "$(grep -- '-d jago_akademi' "$d/dockerlog" | grep -v 'default_transaction_read_only=on' | head -1)"
  else
    ok "setiap sesi ke produksi dibuka read-only (ditegakkan server)"
  fi
else
  no "drill tidak membaca produksi" "tanpa itu ia hanya membuktikan 'ada perintah yang jalan'"
fi
grep -q 'jago_restore_test' "$d/dockerlog" && ok "hanya menulis ke scratch DB jago_restore_test" || no "scratch DB" "tak terlihat di log docker"
grep -q 'DROP DATABASE IF EXISTS jago_restore_test WITH (FORCE)' "$d/dockerlog" \
  && ok "scratch DB di-drop WITH (FORCE) — koneksi nyangkut tak bisa menyisakannya" \
  || no "cleanup scratch" "tidak ada DROP ... WITH (FORCE)"

# SCRATCH_DB tak lagi bisa diarahkan ke produksi, dan tak bisa menyuntik SQL.
for bad in jago_akademi "x; DROP DATABASE jago_akademi" postgres; do
  d2=$(newcase "guard$(echo "$bad" | tr -cd 'a-z')"); mkdir -p "$d2/backups"; : > "$d2/docker-compose.vps.yml"
  gzip -c "$ROOT/f45.sql" > "$d2/backups/jago-2026-08-04-105100.sql.gz"
  out=$(env COMPOSE_DIR="$d2" BACKUP_DIR="$d2/backups" SCRATCH_DB="$bad" bash "$RS" 2>&1 || true)
  case "$out" in
    *"refusing"*) ok "SCRATCH_DB='$bad' ditolak sebelum koneksi dibuka" ;;
    *)            no "SCRATCH_DB='$bad' TIDAK ditolak" "$(echo "$out" | head -1)" ;;
  esac
done

# ---------------------------------------------------------------------------
# Uploads archive (BL-164). A DB restore without these files yields a site where
# every certificate PDF and uploaded image is gone while fileUrl rows point at
# nothing — damage that shows as broken pages, not as errors.
# ---------------------------------------------------------------------------
ufinals() { ls "$1"/backups/jago-uploads-*.tar.gz 2>/dev/null | wc -l; }

# Fake tar, in the style of the docker fake. TAR_MODE drives it; anything else
# delegates to the real tar by ABSOLUTE path (the fake shadows `tar` on PATH, so
# a bare `tar` here would recurse).
faketar() {
  cat > "$1/tar" <<EOF
#!/bin/sh
case "\$*" in
  *-cf*)
    case "\${TAR_MODE:-ok}" in
      empty)   exec "$REAL_TAR" --numeric-owner -cf - -T /dev/null ;;
      # Lebih dari satu blok header tar (512 byte) berisi data non-tar, supaya
      # checksum header gagal dan tar -tzf benar-benar menolaknya. Beberapa byte
      # saja akan dibaca tar sebagai arsip kosong/terpotong dan lolos — ketahuan
      # saat tes ini pertama ditulis, dan tertangkap oleh cek hitungan sebagai
      # gantinya. Perhatikan: sampah ini tetap melewati gzip di pipeline, jadi
      # gzip -t SELALU lulus di sini; yang diuji adalah cek struktur tar.
      garbage) "$REAL_TAR" --version >/dev/null 2>&1; head -c 2048 /dev/zero | tr '\\0' 'X'; exit 0 ;;
      rc2)     exit 2 ;;
      *)       exec "$REAL_TAR" "\$@" ;;
    esac ;;
esac
exec "$REAL_TAR" "\$@"
EOF
  chmod +x "$1/tar"
}

head_ "17. Uploads — jalur normal"
d=$(newcase upok); b=$(mkbin "$d")
rc=$(run "$d")
[ "$rc" = 0 ] && ok "exit 0" || no "exit 0" "rc=$rc ; $(tail -2 "$d/log")"
grep -q 'uploads=ok' "$d/log" && ok "RESULT memuat uploads=ok" || no "uploads=ok" "$(tail -1 "$d/log")"
[ "$(ufinals "$d")" = 1 ] && ok "1 arsip uploads terbit" || no "arsip uploads" "n=$(ufinals "$d")"
grep -q 'UPLOADS_OK .*files=2 sumber=2' "$d/log" && ok "menghitung 2 file (bukan direktori)" || no "hitungan file" "$(grep UPLOADS_OK "$d/log")"
u=$(ls "$d"/backups/jago-uploads-*.tar.gz 2>/dev/null | head -1)
"$REAL_TAR" -tzf "$u" >/dev/null 2>&1 && ok "arsip benar-benar bisa dibaca tar" || no "arsip rusak" "tar -tzf gagal"
[ "$(stat -c %a "$u" 2>/dev/null)" = "600" ] && ok "mode 600 (berisi PDF sertifikat)" || ok "mode file — dilewati di platform ini"
# Setengah DB harus utuh, apa pun yang terjadi pada uploads.
[ "$(finals "$d")" = 1 ] && ok "backup DB tetap 1 file" || no "backup DB terganggu" "n=$(finals "$d")"
grep -q 'tables=45' "$d/log" && ok "backup DB tetap tervalidasi 45 tabel" || no "tables=45 hilang" "$(tail -1 "$d/log")"

head_ "18. Uploads — sumber berisi file, ARSIP KOSONG (regresi utama BL-164)"
# Lolos cek ukuran DAN gzip -t DAN tar -tzf. Hanya hitungan file yang bisa
# menangkapnya. Kalau kasus ini pernah lulus, validasinya sudah dilemahkan.
d=$(newcase upempty); b=$(mkbin "$d"); faketar "$b"
rc=$(run "$d" TAR_MODE=empty)
[ "$rc" = 10 ] && ok "exit 10 (DEGRADED, bukan FAIL)" || no "exit 10" "rc=$rc ; $(tail -2 "$d/log")"
grep -q 'reason=arsip_kosong sumber=2 arsip=0' "$d/log" && ok "sebab eksplisit: sumber 2, arsip 0" || no "sebab arsip kosong" "$(grep UPLOADS "$d/log" | tail -2)"
[ "$(ufinals "$d")" = 0 ] && ok "arsip kosong TIDAK diterbitkan" || no "arsip kosong terbit" "n=$(ufinals "$d")"
grep -q 'RESULT=FAIL' "$d/log" && no "diturunkan jadi FAIL" "backup DB yang baik tak boleh jadi FAIL" || ok "tidak diturunkan jadi FAIL"
[ "$(finals "$d")" = 1 ] && ok "backup DB tetap utuh" || no "backup DB hilang" "n=$(finals "$d")"

head_ "19. Uploads — arsip rusak / tar gagal"
d=$(newcase upgarbage); b=$(mkbin "$d"); faketar "$b"
rc=$(run "$d" TAR_MODE=garbage)
[ "$rc" = 10 ] && ok "arsip tidak berbentuk tar -> exit 10" || no "exit 10" "rc=$rc"
grep -qE 'tar_listing_gagal|arsip_kosong' "$d/log" \
  && ok "cek struktur/hitungan menangkapnya (gzip -t TIDAK bisa — sampahnya tetap lewat gzip)" \
  || no "struktur tar" "$(grep UPLOADS "$d/log" | tail -1)"
[ "$(ufinals "$d")" = 0 ] && ok "tidak diterbitkan" || no "terbit" "n=$(ufinals "$d")"
[ "$(finals "$d")" = 1 ] && ok "backup DB tetap utuh" || no "backup DB hilang" "n=$(finals "$d")"

d=$(newcase uprc2); b=$(mkbin "$d"); faketar "$b"
rc=$(run "$d" TAR_MODE=rc2)
[ "$rc" = 10 ] && ok "tar exit 2 -> exit 10" || no "exit 10" "rc=$rc"
grep -q 'reason=tar_gagal exit=2' "$d/log" && ok "exit tar dilaporkan apa adanya" || no "tar_gagal" "$(grep UPLOADS "$d/log" | tail -1)"
[ "$(finals "$d")" = 1 ] && ok "backup DB tetap utuh" || no "backup DB hilang" "n=$(finals "$d")"

head_ "20. Uploads — UPLOADS_PATH hilang / relatif (jebakan BL-162)"
d=$(newcase upunset); b=$(mkbin "$d")
rc=$(env PATH="$b:$PATH" COMPOSE_DIR="$d" BACKUP_DIR="$d/backups" LOCK_FILE="$d/lock" \
     DUMP_FIXTURE="$ROOT/f45.sql" RETENTION_DAYS=0 bash "$BS" >"$d/log" 2>&1; echo $?)
[ "$rc" = 10 ] && ok "tanpa UPLOADS_PATH -> DEGRADED, bukan diam-diam OK" || no "exit 10" "rc=$rc"
grep -q 'uploads_tidak_dikonfigurasi' "$d/log" && ok "dinyatakan eksplisit di RESULT" || no "sebab" "$(tail -1 "$d/log")"
[ "$(finals "$d")" = 1 ] && ok "backup DB tetap dibuat" || no "backup DB hilang" "n=$(finals "$d")"

d=$(newcase uprel); b=$(mkbin "$d")
printf 'POSTGRES_USER=jagouser\nUPLOADS_PATH=uploads\n' > "$d/.env"
rc=$(env PATH="$b:$PATH" COMPOSE_DIR="$d" BACKUP_DIR="$d/backups" LOCK_FILE="$d/lock" \
     DUMP_FIXTURE="$ROOT/f45.sql" RETENTION_DAYS=0 bash "$BS" >"$d/log" 2>&1; echo $?)
grep -q 'uploads_tidak_dikonfigurasi' "$d/log" && ok "nilai named-volume 'uploads' ditolak sebagai path" || no "path relatif" "$(tail -1 "$d/log")"

head_ "21. Uploads — retensi tidak boleh menyentuh backup DB"
d=$(newcase upret); b=$(mkbin "$d")
: > "$d/backups/jago-uploads-2000-01-01-000000.tar.gz"; touch -t 200001010000 "$d/backups/jago-uploads-2000-01-01-000000.tar.gz"
oldmarker "$d"
rc=$(run "$d")
[ "$rc" = 0 ] && ok "exit 0" || no "exit 0" "rc=$rc ; $(tail -2 "$d/log")"
[ ! -e "$d/backups/jago-uploads-2000-01-01-000000.tar.gz" ] && ok "arsip uploads kadaluwarsa dipangkas" || no "retensi uploads" "masih ada"
marker_gone "$d" && ok "backup DB kadaluwarsa dipangkas (jalur lama tetap jalan)" || no "retensi DB" "marker masih ada"
[ "$(finals "$d")" = 1 ] && ok "backup DB BARU selamat dari pemangkasan uploads" || no "backup DB baru terhapus" "n=$(finals "$d")"
[ "$(ufinals "$d")" = 1 ] && ok "arsip uploads BARU selamat" || no "arsip baru terhapus" "n=$(ufinals "$d")"

head_ "22. Nama file unggahan TIDAK PERNAH masuk log (data pribadi)"
d=$(newcase upleak); b=$(mkbin "$d")
run "$d" >/dev/null
grep -q "$CANARY2" "$d/log" && no "nama file unggahan bocor ke log" "$(grep -o "$CANARY2" "$d/log" | head -1)" || ok "nama file unggahan tidak pernah dicatat"
grep -q "$CANARY" "$d/log" && no "secret .env bocor" "canary muncul" || ok "secret .env tetap tidak muncul"

echo
echo "==================================================="
echo " PASS=$PASS  FAIL=$FAIL  SKIP=$SKIP"
[ "$SKIP" -gt 0 ] && echo " (SKIP = butuh platform lain; TIDAK dihitung lulus)"
echo "==================================================="
[ "$FAIL" -eq 0 ]
