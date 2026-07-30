#!/bin/bash
# ═══════════════════════════════════════════════════
#  CONFIRMED – سكريبت التهيئة التلقائية
#  شغّليه مرة واحدة على السيرفر: bash setup.sh
# ═══════════════════════════════════════════════════

set -e
GREEN='\033[0;32m'; RED='\033[0;31m'; YELLOW='\033[1;33m'; NC='\033[0m'
info()  { echo -e "${GREEN}✓${NC} $1"; }
warn()  { echo -e "${YELLOW}!${NC} $1"; }
error() { echo -e "${RED}✗${NC} $1"; exit 1; }

echo ""
echo "════════════════════════════════════════════"
echo "   CONFIRMED – إعداد المشروع على السيرفر"
echo "════════════════════════════════════════════"
echo ""

# التحقق من Node.js
if ! command -v node &>/dev/null; then
  error "Node.js غير مثبت. ثبّتيه من https://nodejs.org (الإصدار 20+)"
fi
NODE_VER=$(node -e "console.log(process.version)")
info "Node.js موجود: $NODE_VER"

# التحقق من PostgreSQL
if ! command -v psql &>/dev/null; then
  warn "psql غير موجود — تأكدي من تثبيت PostgreSQL أو استخدمي قاعدة بيانات بعيدة"
fi

# إنشاء ملف .env إذا لم يكن موجوداً
if [ ! -f .env ]; then
  cp .env.example .env
  warn "تم إنشاء ملف .env — افتحيه وعدّلي DATABASE_URL و SESSION_SECRET"
  echo ""
  echo "  nano .env"
  echo ""
  echo "  ثم شغّلي: bash setup.sh مرة أخرى"
  exit 0
fi

# قراءة المتغيرات
source .env

# التحقق من المتغيرات الضرورية
[ -z "$DATABASE_URL" ] && error "DATABASE_URL غير محدد في ملف .env"
[ -z "$SESSION_SECRET" ] && error "SESSION_SECRET غير محدد في ملف .env"
[ "$SESSION_SECRET" = "غيري_هذا_النص_إلى_شيء_سري_طويل_جداً_123456" ] && error "يجب تغيير SESSION_SECRET إلى قيمة سرية خاصة بك"

info "ملف .env موجود ومعبأ"

# التثبيت بـ PM2 إذا لم يكن موجوداً
if ! command -v pm2 &>/dev/null; then
  info "تثبيت PM2..."
  npm install -g pm2 --silent
fi
info "PM2 متاح"

# تشغيل السيرفر
info "تشغيل CONFIRMED..."
pm2 delete confirmed 2>/dev/null || true
pm2 start index.mjs --name confirmed --env production
pm2 save

echo ""
echo "════════════════════════════════════════════"
echo -e "   ${GREEN}✅ CONFIRMED يعمل الآن!${NC}"
echo "   افتحي: http://$(hostname -I | awk '{print $1}'):${PORT:-3000}"
echo "════════════════════════════════════════════"
echo ""
info "لمراقبة السجلات: pm2 logs confirmed"
info "لإيقاف السيرفر: pm2 stop confirmed"
