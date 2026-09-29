#!/usr/bin/env bash
# ==============================================================================
# Nightly Automated Backup & Retention Cron Script
# Path: /var/www/activity_web/deploy/backup-cron.sh
# Suggested crontab: 0 2 * * * /var/www/activity_web/deploy/backup-cron.sh
# ==============================================================================

set -euo pipefail

APP_DIR="/var/www/activity_web"
BACKUP_DIR="${APP_DIR}/storage/backups"
LOG_FILE="/var/log/activity_web_backups.log"
RETENTION_DAYS=30

echo "[$(date -u +"%Y-%m-%dT%H:%M:%SZ")] بدء النسخ الاحتياطي التلقائي الليلي..." >> "${LOG_FILE}"

cd "${APP_DIR}"

# Run CLI backup script using TypeScript runner
if npx tsx scripts/run-backup-cli.ts >> "${LOG_FILE}" 2>&1; then
    echo "[$(date -u +"%Y-%m-%dT%H:%M:%SZ")] ✅ اكتمل النسخ الاحتياطي بنجاح." >> "${LOG_FILE}"
else
    echo "[$(date -u +"%Y-%m-%dT%H:%M:%SZ")] ❌ فشل النسخ الاحتياطي!" >> "${LOG_FILE}"
fi

# Rotate backups older than 30 days
echo "[$(date -u +"%Y-%m-%dT%H:%M:%SZ")] تنظيف النسخ القديمة الأقدم من ${RETENTION_DAYS} يوماً..." >> "${LOG_FILE}"
find "${BACKUP_DIR}" -type f -name "backup-*.json" -mtime "+${RETENTION_DAYS}" -delete >> "${LOG_FILE}" 2>&1

echo "[$(date -u +"%Y-%m-%dT%H:%M:%SZ")] اكتمل فحص وتدوير النسخ الاحتياطية." >> "${LOG_FILE}"
