#!/usr/bin/env bash
# audit-links.sh — live-site link/status audit for Jago Akademi.
#
# Curls a fixed list of paths on a base URL and compares the HTTP status
# against the expected status per path. Exits non-zero on any mismatch.
# Portable: plain bash + curl (works on the VPS and Git Bash on Windows).
#
# Usage:
#   bash scripts/audit-links.sh                     # audit https://jagoakademi.com
#   bash scripts/audit-links.sh https://staging.example.com
#
# Flag-gated pages default to expected 404 (feature flag OFF). After go-live
# of a feature, override its expectation via env var:
#   EXPECT_PRIVATE_CLASS=200 EXPECT_COMMUNITY=200 EXPECT_ALUMNI=200 \
#   EXPECT_PORTFOLIO=200 bash scripts/audit-links.sh
#
# Env overrides:
#   EXPECT_PRIVATE_CLASS  expected status for /kelas-privat        (default 404)
#   EXPECT_COMMUNITY      expected status for /komunitas           (default 404)
#   EXPECT_ALUMNI         expected status for /alumni              (default 404)
#   EXPECT_PORTFOLIO      expected status for /portofolio-member   (default 404)

set -u

BASE_URL="${1:-https://jagoakademi.com}"
# strip trailing slash so BASE_URL + "/path" never doubles the slash
BASE_URL="${BASE_URL%/}"

EXPECT_PRIVATE_CLASS="${EXPECT_PRIVATE_CLASS:-404}"
EXPECT_COMMUNITY="${EXPECT_COMMUNITY:-404}"
EXPECT_ALUMNI="${EXPECT_ALUMNI:-404}"
EXPECT_PORTFOLIO="${EXPECT_PORTFOLIO:-404}"

# "path expected" pairs, one per line. Groups:
#   1) always-on public pages (expect 200)
#   2) flag-gated pages (expected from env; 404 pre-go-live, 200 post)
#   3) negative checks (must NOT resolve)
CHECKS="
/ 200
/e-course 200
/event 200
/ebook 200
/kelas-gratis 200
/trainer-program 200
/clients 200
/marketplace 200
/blog 200
/about 200
/kolaborasi 200
/masuk 200
/daftar 200
/afiliasi 200
/contact 200
/faq 200
/privacy 200
/terms 200
/early-access 200
/api/health 200
/api/ready 200
/logo.png 200
/og-image.png 200
/kelas-privat $EXPECT_PRIVATE_CLASS
/komunitas $EXPECT_COMMUNITY
/alumni $EXPECT_ALUMNI
/portofolio-member $EXPECT_PORTFOLIO
/blog/slug-tidak-ada-xyz 404
/event/slug-tidak-ada-xyz 404
/api/courses?format=xyz 400
"

pass=0
fail=0
fail_list=""

printf '%s\n' "Auditing: $BASE_URL"
printf '%-32s %-8s %-8s %s\n' "PATH" "EXPECT" "ACTUAL" "RESULT"
printf '%-32s %-8s %-8s %s\n' "--------------------------------" "------" "------" "------"

while read -r path expected; do
  [ -z "${path:-}" ] && continue
  actual="$(curl -s -o /dev/null -w '%{http_code}' --max-time 20 -A 'jago-audit-links/1.0' "$BASE_URL$path")" || actual="000"
  if [ "$actual" = "$expected" ]; then
    result="PASS"
    pass=$((pass + 1))
  else
    result="FAIL"
    fail=$((fail + 1))
    fail_list="$fail_list $path(expected=$expected,got=$actual)"
  fi
  printf '%-32s %-8s %-8s %s\n' "$path" "$expected" "$actual" "$result"
done <<EOF
$CHECKS
EOF

printf '\nSummary: %d passed, %d failed\n' "$pass" "$fail"
if [ "$fail" -gt 0 ]; then
  printf 'FAILED:%s\n' "$fail_list"
  exit 1
fi
printf 'All checks passed.\n'
exit 0
