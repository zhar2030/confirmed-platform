#!/bin/bash
# ─────────────────────────────────────────────────────────────
# CONFIRMED — Server Bootstrap & Deploy Script
# Run once on the production server to set up GitHub deployment
# Usage: bash server-setup.sh
# ─────────────────────────────────────────────────────────────
set -e

REPO="https://github.com/zhar2030/confirmed-platform.git"
SERVER_DIR="/root/confirmed-platform"
API_DIR="/root/api-server"
PM2_NAME="confirmed"

echo ""
echo "╔══════════════════════════════════════════╗"
echo "║  CONFIRMED — Server Setup & Deploy       ║"
echo "╚══════════════════════════════════════════╝"
echo ""

# ── Check Node.js ─────────────────────────────────────────────
if ! command -v node &>/dev/null; then
  echo "✗ Node.js not found. Install it first."
  exit 1
fi
echo "✓ Node.js $(node -v)"

# ── Check pnpm ────────────────────────────────────────────────
if ! command -v pnpm &>/dev/null; then
  echo "▶ Installing pnpm..."
  npm install -g pnpm
fi
echo "✓ pnpm $(pnpm -v)"

# ── Clone or pull repo ────────────────────────────────────────
if [ -d "$SERVER_DIR/.git" ]; then
  echo "▶ Pulling latest changes..."
  cd "$SERVER_DIR"
  git pull origin main
else
  echo "▶ Cloning repository..."
  git clone "$REPO" "$SERVER_DIR"
  cd "$SERVER_DIR"
fi

# ── Install dependencies ──────────────────────────────────────
echo "▶ Installing dependencies..."
pnpm install --frozen-lockfile

# ── Build backend ─────────────────────────────────────────────
echo "▶ Building backend..."
pnpm --filter @workspace/api-server run build

# ── Copy backend to PM2 directory ────────────────────────────
echo "▶ Deploying backend..."
mkdir -p "$API_DIR/dist"
cp "$SERVER_DIR/artifacts/api-server/dist/index.mjs" "$API_DIR/dist/index.mjs"
echo "✓ Backend copied ($(du -sh $API_DIR/dist/index.mjs | cut -f1))"

# ── Restart PM2 ───────────────────────────────────────────────
echo "▶ Restarting server..."
pm2 restart "$PM2_NAME"
sleep 3

STATUS=$(pm2 jlist 2>/dev/null | python3 -c "
import sys,json
try:
  procs=json.load(sys.stdin)
  p=[x for x in procs if x['name']=='$PM2_NAME']
  print(p[0]['pm2_env']['status'] if p else 'not_found')
except: print('unknown')
" 2>/dev/null || echo "unknown")

if [ "$STATUS" = "online" ]; then
  echo "✓ Server is online"
else
  echo "✗ Server status: $STATUS"
  pm2 logs "$PM2_NAME" --lines 10 --nostream
  exit 1
fi

echo ""
echo "═══════════════════════════════════════════"
echo " ✅ Deploy complete!"
echo "═══════════════════════════════════════════"
echo ""
echo "Next time: just run  bash /root/deploy.sh"
