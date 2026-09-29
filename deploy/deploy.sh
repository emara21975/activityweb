#!/usr/bin/env bash
# ==============================================================================
# Automated Production Deployment Script for School Student Activities Web
# ==============================================================================

set -euo pipefail

APP_DIR="/var/www/activity_web"
SERVICE_NAME="activity_web"

echo "=========================================================="
echo "🚀 بدء نشر تحديثات نظام إدارة الأنشطة المدرسية..."
echo "=========================================================="

cd "${APP_DIR}"

# 1. Pull latest verified commits from git
echo "📥 1/6 جلب آخر التحديثات من مستودع Git..."
git fetch origin main
git reset --hard origin/main

# 2. Install production dependencies
echo "📦 2/6 تثبيت حزم الاعتماد النظيفة (clean install)..."
npm ci --prefer-offline --no-audit

# 3. Apply database migrations
echo "🗄️ 3/6 تطبيق ترقيات قاعدة البيانات (Prisma Migrate Deploy)..."
npx prisma migrate deploy

# 4. Generate optimized Prisma client
echo "⚙️ 4/6 توليد عميل Prisma المحدث..."
npx prisma generate

# 5. Build Next.js production bundle
echo "🏗️ 5/6 بناء حزمة الإنتاج Next.js..."
npm run build

# 6. Restart systemd service cleanly
echo "🔄 6/6 إعادة تشغيل الخدمة والتأكد من استقرارها..."
sudo systemctl restart "${SERVICE_NAME}"
sleep 3

# Check service status
if systemctl is-active --quiet "${SERVICE_NAME}"; then
    echo "=========================================================="
    echo "✅ تم نشر النظام بنجاح والخدمة تعمل بصورة طبيعية!"
    echo "🌐 يمكنك الوصول للنظام الآن عبر المتصفح."
    echo "=========================================================="
else
    echo "❌ تنبيه: فشل تشغيل الخدمة! يرجى مراجعة السجلات عبر:"
    echo "   sudo journalctl -u ${SERVICE_NAME} -n 50 --no-pager"
    exit 1
fi
