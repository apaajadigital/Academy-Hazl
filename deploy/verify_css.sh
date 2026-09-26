#!/bin/sh
set -e

echo "=== BL-35 CSS Verification ==="
curl -fsS http://127.0.0.1:3010 -o /tmp/hp.html

CSS=$(grep -oE '/_next/static/css/[^"]+\.css' /tmp/hp.html | head -1)
echo "CSS file: $CSS"

if [ -z "$CSS" ]; then
  echo "FATAL: No CSS link found in homepage HTML"
  exit 1
fi

echo ""
echo "--- HTTP Headers ---"
curl -sSI "http://127.0.0.1:3010${CSS}" | grep -iE 'HTTP|content-type|content-length'

echo ""
echo "--- CSS size ---"
curl -fsS "http://127.0.0.1:3010${CSS}" | wc -c

echo ""
echo "--- Tailwind utilities (harus ada) ---"
curl -fsS "http://127.0.0.1:3010${CSS}" | grep -oE '\.flex\{|\.mx-auto\{|\.grid-cols' | head -5

echo ""
echo "--- Raw directives (harus 0) ---"
COUNT=$(curl -fsS "http://127.0.0.1:3010${CSS}" | grep -c '@config\|@plugin' || true)
echo "Directives count: $COUNT"

if [ "$COUNT" = "0" ]; then
  echo "OK(BL-35): CSS verified — no raw directives, utilities present"
else
  echo "FATAL(BL-35): Raw @config/@plugin still present in CSS!"
fi
