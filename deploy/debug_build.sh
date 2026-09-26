#!/bin/sh
set -e

echo "=== DEBUG: Checking what npm ci installs ==="
cd /tmp/debug-build

# Copy project files
cp /var/www/jago-akademi/package.json .
cp /var/www/jago-akademi/package-lock.json .
mkdir -p apps/web apps/api packages
cp /var/www/jago-akademi/apps/web/package.json apps/web/
cp /var/www/jago-akademi/apps/api/package.json apps/api/
cp -r /var/www/jago-akademi/packages/* packages/ 2>/dev/null || true

echo "=== Running NODE_ENV=development npm ci ==="
NODE_ENV=development npm ci 2>&1 | tail -10

echo ""
echo "=== Checking root node_modules for tailwind packages ==="
ls node_modules | grep tailwind || echo "NONE FOUND in root node_modules"
ls node_modules | grep clsx || echo "clsx NOT in root"
ls node_modules | grep tailwind-merge || echo "tailwind-merge NOT in root"

echo ""
echo "=== Checking apps/web/node_modules for tailwind packages ==="
ls apps/web/node_modules 2>/dev/null | grep tailwind || echo "NONE in web node_modules"
ls apps/web/node_modules 2>/dev/null | grep clsx || echo "clsx NOT in web"

echo ""
echo "=== package-lock.json workspace entries ==="
cat package-lock.json | python3 -c "
import json, sys
data = json.load(sys.stdin)
packages = data.get('packages', {})
web_pkg = packages.get('apps/web', {})
print('apps/web devDependencies in lockfile:')
for k,v in web_pkg.get('devDependencies', {}).items():
    if any(x in k for x in ['tailwind', 'clsx', 'class-variance']):
        print(f'  {k}: {v}')
print('tailwind-merge in root node_modules/tailwind-merge:')
tm = packages.get('node_modules/tailwind-merge', {})
print(f'  version: {tm.get(\"version\", \"NOT FOUND\")}')
print('tailwindcss in root node_modules/tailwindcss:')
tc = packages.get('node_modules/tailwindcss', {})
print(f'  version: {tc.get(\"version\", \"NOT FOUND\")}')
" 2>/dev/null || echo "python3 not available, skipping lockfile parse"

echo "=== DEBUG DONE ==="
