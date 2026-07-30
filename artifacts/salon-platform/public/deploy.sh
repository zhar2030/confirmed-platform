#!/bin/bash
# ─────────────────────────────────────────────────────────────
# CONFIRMED — One-Command Deploy Script
# Usage: bash /root/deploy.sh
# ─────────────────────────────────────────────────────────────
set -e

REPO_DIR="/root/confirmed-platform"
API_DEST="/root/api-server/dist/index.mjs"
PM2_NAME="confirmed"

echo ""
echo "╔══════════════════════════════════════╗"
echo "║   CONFIRMED — Deploying...          ║"
echo "╚══════════════════════════════════════╝"

# Pull latest code
echo "▶ Pulling latest from GitHub..."
cd "$REPO_DIR"
git pull origin main

# Install & build
echo "▶ Building backend..."
pnpm install --frozen-lockfile --silent
pnpm --filter @workspace/api-server run build

# Validate output
FIRST=$(head -c 30 artifacts/api-server/dist/index.mjs)
if echo "$FIRST" | grep -qi "<!doctype\|<html"; then
  echo "✗ Build output looks like HTML — aborting"
  exit 1
fi

# Deploy
cp artifacts/api-server/dist/index.mjs "$API_DEST"
echo "✓ Backend deployed ($(du -sh $API_DEST | cut -f1))"

# Restart
pm2 restart "$PM2_NAME"
sleep 3

STATUS=$(pm2 jlist 2>/dev/null | python3 -c "
import sys,json
try:
  p=[x for x in json.load(sys.stdin) if x['name']=='$PM2_NAME']
  print(p[0]['pm2_env']['status'] if p else 'not_found')
except: print('unknown')
" 2>/dev/null || echo "unknown")

if [ "$STATUS" = "online" ]; then
  echo "✓ Server online"
  echo ""
  echo "✅ Deploy complete!"
else
  echo "✗ Server status: $STATUS"
  pm2 logs "$PM2_NAME" --lines 10 --nostream
  exit 1
fi
