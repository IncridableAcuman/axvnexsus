#!/usr/bin/env bash
# ==============================================================================
# AXM Nexus — Xavfsiz Qayta Tiklash Skripti (Database Restore Procedure)
# Ishlatish: bash scripts/restore.sh [ZAXIRA_FAYLI_YO'LI]
# ==============================================================================

set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

BACKUP_DIR="${BACKUP_DIR:-/var/backups/nexus/postgres}"
CONTAINER_NAME="nexus-prod-postgres"

POSTGRES_USER="axm_admin"
POSTGRES_DB="axvhub"

if [ -f ".env" ]; then
    ENV_USER=$(grep -E "^POSTGRES_USER=" .env | cut -d '=' -f2 | tr -d ' "' || true)
    ENV_DB=$(grep -E "^POSTGRES_DB=" .env | cut -d '=' -f2 | tr -d ' "' || true)
    [ -n "$ENV_USER" ] && POSTGRES_USER="$ENV_USER"
    [ -n "$ENV_DB" ] && POSTGRES_DB="$ENV_DB"
fi

BACKUP_FILE="${1:-}"

# Fayl ko'rsatilmagan bo'lsa ro'yxatdan tanlash
if [ -z "$BACKUP_FILE" ]; then
    echo -e "${BLUE}Mavjud zaxiralar ro'yxati ($BACKUP_DIR):${NC}"
    if [ ! -d "$BACKUP_DIR" ] || [ -z "$(ls -A "$BACKUP_DIR"/*.sql.gz 2>/dev/null || true)" ]; then
        echo -e "${RED}[XATOLIK] Zaxira katalogida hech qanday .sql.gz fayl topilmadi!${NC}"
        exit 1
    fi
    
    ls -lht "$BACKUP_DIR"/*.sql.gz | head -n 10
    echo ""
    read -p "Qayta tiklamoqchi bo'lgan zaxira faylining to'liq yo'lini kiriting: " BACKUP_FILE
fi

if [ ! -f "$BACKUP_FILE" ]; then
    echo -e "${RED}[XATOLIK] Belgilangan fayl mavjud emas: $BACKUP_FILE${NC}"
    exit 1
fi

echo -e "\n${RED}================================================================${NC}"
echo -e "${RED}  OGOHLANTIRISH: Qayta tiklash amali joriy ma'lumotlarni o'chiradi! ${NC}"
echo -e "${RED}  Tanlangan fayl: $BACKUP_FILE                                     ${NC}"
echo -e "${RED}================================================================${NC}"
read -p "Rostdan ham davom ettirmoqchimisiz? (tasdiqlash uchun 'YES' deb yozing): " CONFIRM

if [ "$CONFIRM" != "YES" ]; then
    echo -e "${YELLOW}Amal foydalanuvchi tomonidan bekor qilindi.${NC}"
    exit 0
fi

# 1. Joriy holatdan favqulodda zaxira (Safety Snapshot) olish
SAFE_BACKUP="/tmp/axvhub_pre_restore_$(date +%Y%m%d_%H%M%S).sql.gz"
echo -e "\n${YELLOW}[1/4] Joriy bazadan xavfsizlik zaxirasi olinmoqda: $SAFE_BACKUP...${NC}"
docker exec -t "$CONTAINER_NAME" pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" | gzip -9 > "$SAFE_BACKUP"
echo -e "${GREEN}✓ Xavfsizlik zaxirasi olindi.${NC}"

# 2. Backend xizmatini to'xtatish (baza sessiyalari bloklanmasligi uchun)
echo -e "\n${YELLOW}[2/4] Backend xizmati vaqtincha to'xtatilmoqda...${NC}"
docker compose -f docker-compose.prod.yml stop backend

# 3. Bazani tiklash
echo -e "\n${YELLOW}[3/4] Ma'lumotlar bazasi qayta tiklanmoqda...${NC}"
gunzip -c "$BACKUP_FILE" | docker exec -i "$CONTAINER_NAME" psql -U "$POSTGRES_USER" -d "$POSTGRES_DB"
echo -e "${GREEN}✓ Ma'lumotlar bazasi muvaffaqiyatli tiklandi.${NC}"

# 4. Backendni qayta ishga tushirish
echo -e "\n${YELLOW}[4/4] Backend qayta ishga tushirilmoqda...${NC}"
docker compose -f docker-compose.prod.yml start backend

echo -e "${YELLOW}Backend salomatligi kutilmoqda...${NC}"
sleep 10
docker compose -f docker-compose.prod.yml ps

echo -e "\n${GREEN}================================================================${NC}"
echo -e "${GREEN}  Qayta tiklash amali muvaffaqiyatli yakunlandi!                ${NC}"
echo -e "${GREEN}================================================================${NC}"
