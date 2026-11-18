#!/usr/bin/env bash
# ==============================================================================
# AXM Nexus — Avtomatlashtirilgan PostgreSQL Zaxiralash Skripti (Daily Backup)
# Ishlatish: bash scripts/backup.sh
# Cron: 0 2 * * * cd /opt/axvhub && bash scripts/backup.sh >> /var/log/nexus-backup.log 2>&1
# ==============================================================================

set -euo pipefail

BACKUP_DIR="${BACKUP_DIR:-/var/backups/nexus/postgres}"
RETENTION_DAYS="${RETENTION_DAYS:-14}"
DATE=$(date +"%Y%m%d_%H%M%S")
FILENAME="$BACKUP_DIR/axvhub_backup_$DATE.sql.gz"

mkdir -p "$BACKUP_DIR"
chmod 700 "$BACKUP_DIR"

# .env mavjud bo'lsa parametrlarni olish
POSTGRES_USER="axm_admin"
POSTGRES_DB="axvhub"

if [ -f ".env" ]; then
    ENV_USER=$(grep -E "^POSTGRES_USER=" .env | cut -d '=' -f2 | tr -d ' "' || true)
    ENV_DB=$(grep -E "^POSTGRES_DB=" .env | cut -d '=' -f2 | tr -d ' "' || true)
    [ -n "$ENV_USER" ] && POSTGRES_USER="$ENV_USER"
    [ -n "$ENV_DB" ] && POSTGRES_DB="$ENV_DB"
fi

CONTAINER_NAME="nexus-prod-postgres"

echo "[$(date '+%Y-%m-%d %H:%M:%S')] Zaxiralash boshlandi: Baza: $POSTGRES_DB, Konteyner: $CONTAINER_NAME"

# Konteyner ishlayotganligini tekshirish
if ! docker ps --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
    echo "[XATOLIK] $CONTAINER_NAME konteyneri ishlamayapti!" >&2
    exit 1
fi

# pg_dump orqali zaxira olish va gzip bilan siqish
docker exec -t "$CONTAINER_NAME" pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" --clean --if-exists --no-owner --no-privileges | gzip -9 > "$FILENAME"

# Zaxira hajmini tekshirish
if [ -s "$FILENAME" ]; then
    SIZE=$(du -h "$FILENAME" | cut -f1)
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] Zaxira muvaffaqiyatli saqlandi: $FILENAME (Hajmi: $SIZE)"
else
    echo "[XATOLIK] Zaxira fayli bo'sh qoldi!" >&2
    rm -f "$FILENAME"
    exit 1
fi

# Belgilangan kundan eski zaxiralarni o'chirish
DELETED_COUNT=$(find "$BACKUP_DIR" -type f -name "axvhub_backup_*.sql.gz" -mtime +"$RETENTION_DAYS" -print -delete | wc -l)
if [ "$DELETED_COUNT" -gt 0 ]; then
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] ${RETENTION_DAYS} kundan eski bo'lgan $DELETED_COUNT ta eski zaxira tozalandi."
fi

echo "[$(date '+%Y-%m-%d %H:%M:%S')] Zaxiralash jarayoni yakunlandi."
