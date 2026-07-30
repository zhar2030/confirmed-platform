#!/bin/bash
# ─────────────────────────────────────────────────────────────
# CONFIRMED — Production Deploy Script
# Usage: bash /root/deploy.sh
# ─────────────────────────────────────────────────────────────
set -e

REPLIT_BASE="https://52db7ff1-d097-4f20-a6ba-c820584e8aba-00-153emj9g4wq6h.sisko.replit.dev"
BACKEND_URL="$REPLIT_BASE/api-server/dl/backend.mjs"
BACKEND_DEST="/root/api-server/dist/index.mjs"
FRONTEND_URL="$REPLIT_BASE/salon-platform/dl/frontend.tar.gz"
FRONTEND_DEST="/var/www/html"
PM2_NAME="confirmed"

echo ""
echo "╔══════════════════════════════════════╗"
echo "║   CONFIRMED — Production Deployer   ║"
echo "╚══════════════════════════════════════╝"
echo ""

# ── 1. Download new backend ────────────────────────────────────
echo "▶ Downloading backend..."
wget -q -O "$BACKEND_DEST.tmp" "$BACKEND_URL"

# Validate it's JS not HTML
FIRST=$(head -c 30 "$BACKEND_DEST.tmp")
if echo "$FIRST" | grep -qi "<!doctype\|<html"; then
  echo "✗ Download failed — got HTML instead of JS"
  rm -f "$BACKEND_DEST.tmp"
  exit 1
fi

mv "$BACKEND_DEST.tmp" "$BACKEND_DEST"
echo "✓ Backend downloaded ($(du -sh $BACKEND_DEST | cut -f1))"

# ── 2. Restart backend ────────────────────────────────────────
echo "▶ Restarting backend..."
pm2 restart "$PM2_NAME"
sleep 3

STATUS=$(pm2 jlist | python3 -c "import sys,json; procs=json.load(sys.stdin); p=[x for x in procs if x['name']=='$PM2_NAME']; print(p[0]['pm2_env']['status'] if p else 'not_found')" 2>/dev/null || echo "unknown")
if [ "$STATUS" != "online" ]; then
  echo "✗ Backend failed to start (status: $STATUS)"
  pm2 logs "$PM2_NAME" --lines 10 --nostream
  exit 1
fi
echo "✓ Backend is online"

echo ""
echo "═══════════════════════════════════════"
echo " ✅ Deploy complete!"
echo "═══════════════════════════════════════"
