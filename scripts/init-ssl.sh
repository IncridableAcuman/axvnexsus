#!/usr/bin/env bash
# ==============================================================================
# AXM Nexus — Let's Encrypt SSL/TLS Sertifikatini O'rnatish Skripti
# Ishlatish: sudo bash scripts/init-ssl.sh [DOMAIN] [EMAIL]
# Misol: sudo bash scripts/init-ssl.sh axm-nexus.uz admin@axm-nexus.uz
# ==============================================================================

set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

if [[ $EUID -ne 0 ]]; then
   echo -e "${RED}[XATOLIK] Ushbu skriptni root huquqi bilan ishga tushiring: sudo bash $0${NC}"
   exit 1
fi

DOMAIN="${1:-}"
EMAIL="${2:-}"

# Agar argumentlar berilmagan bo'lsa, .env faylidan o'qish yoki so'rash
if [ -z "$DOMAIN" ]; then
    if [ -f ".env" ]; then
        DOMAIN=$(grep -E '^APP_BASE_URL=' .env | cut -d '=' -f2 | sed -e 's|https://||' -e 's|http://||' -e 's|/.*||' | tr -d ' "')
    fi
    if [ -z "$DOMAIN" ]; then
        read -p "Domen nomini kiriting (masalan: axm-nexus.uz): " DOMAIN
    fi
fi

if [ -z "$EMAIL" ]; then
    if [ -f ".env" ]; then
        EMAIL=$(grep -E '^MAIL_FROM=' .env | cut -d '=' -f2 | tr -d ' "')
    fi
    if [ -z "$EMAIL" ]; then
        read -p "Let's Encrypt ogohlantirishlari uchun admin emailingizni kiriting: " EMAIL
    fi
fi

echo -e "${BLUE}======================================================${NC}"
echo -e "${BLUE}  Let's Encrypt SSL O'rnatish: $DOMAIN                ${NC}"
echo -e "${BLUE}  Aloqa pochtasi: $EMAIL                              ${NC}"
echo -e "${BLUE}======================================================${NC}"

# Certbot o'rnatilganligini tekshirish
if ! command -v certbot &> /dev/null; then
    echo -e "${YELLOW}Certbot o'rnatilmoqda...${NC}"
    apt-get update && apt-get install -y certbot python3-certbot-nginx
fi

# ACME webroot papkasi
mkdir -p /var/www/certbot
chmod -R 755 /var/www/certbot

# Nginx vaqtincha to'xtatiladi yoki standalone rejimda olinadi
echo -e "${YELLOW}SSL sertifikati so'ralmoqda (Let's Encrypt)...${NC}"

if systemctl is-active --quiet nginx; then
    systemctl stop nginx
fi

certbot certonly --standalone \
    -d "$DOMAIN" \
    --email "$EMAIL" \
    --agree-tos \
    --no-eff-email \
    --non-interactive \
    --preferred-challenges http

echo -e "${GREEN}SSL sertifikati muvaffaqiyatli olindi!${NC}"
echo -e "Sertifikat yo'li: /etc/letsencrypt/live/$DOMAIN/fullchain.pem"
echo -e "Maxfiy kalit yo'li: /etc/letsencrypt/live/$DOMAIN/privkey.pem"

# Nginx konfiguratsiyasidagi domenni moslashtirish
if [ -f "nginx/axm-nexus.conf" ]; then
    cp nginx/axm-nexus.conf /etc/nginx/sites-available/axm-nexus.conf
    sed -i "s/axm-nexus.uz/$DOMAIN/g" /etc/nginx/sites-available/axm-nexus.conf
    
    # Symlink yaratish
    ln -sf /etc/nginx/sites-available/axm-nexus.conf /etc/nginx/sites-enabled/axm-nexus.conf
    rm -f /etc/nginx/sites-enabled/default
    
    # Nginx sintaksisini tekshirish
    if nginx -t; then
        systemctl restart nginx
        echo -e "${GREEN}Host Nginx muvaffaqiyatli qayta ishga tushirildi va SSL faollashdi.${NC}"
    else
        echo -e "${RED}[DIQQAT] Nginx konfiguratsiyasida xatolik aniqlandi. Sintaksisni tekshiring: sudo nginx -t${NC}"
    fi
fi

# Avtomatik yangilanish (Cron job) sozlash
CRON_JOB="0 3 * * * certbot renew --quiet && systemctl reload nginx"
(crontab -l 2>/dev/null | grep -Fv "certbot renew" ; echo "$CRON_JOB") | crontab -
echo -e "${GREEN}Avtomatik SSL yangilanish cron vazifasi o'rnatildi (har kuni 03:00 da).${NC}"

# Dry-run sinovi
echo -e "${YELLOW}Sertifikat yangilanishini tekshirish (Dry Run)...${NC}"
certbot renew --dry-run
echo -e "${GREEN}SSL o'rnatish to'liq va muvaffaqiyatli yakunlandi!${NC}"
