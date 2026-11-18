#!/usr/bin/env bash
# ==============================================================================
# AXM Nexus — Real Linux Server (Ubuntu/Debian) Boshlang'ich Sozlash Skripti
# Ishlatish: sudo bash scripts/setup-server.sh
# ==============================================================================

set -euo pipefail

# Ranglar
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}======================================================${NC}"
echo -e "${BLUE}   AXM Nexus — Real Server Muhitini Tayyorlash        ${NC}"
echo -e "${BLUE}======================================================${NC}"

# 1. Root huquqini tekshirish
if [[ $EUID -ne 0 ]]; then
   echo -e "${RED}[XATOLIK] Ushbu skriptni root foydalanuvchi sifatida ishga tushiring: sudo bash $0${NC}"
   exit 1
fi

# 2. Tizim paketlarini yangilash
echo -e "\n${YELLOW}[1/6] Tizim paketlari yangilanmoqda...${NC}"
apt-get update && apt-get upgrade -y
apt-get install -y \
    ca-certificates \
    curl \
    gnupg \
    lsb-release \
    git \
    ufw \
    fail2ban \
    htop \
    tar \
    gzip \
    certbot \
    nginx

# 3. Swap xotirasini tekshirish va sozlash (RAM < 4GB bo'lsa 2GB swap qo'shish)
echo -e "\n${YELLOW}[2/6] Xotira va Swap tekshirilmoqda...${NC}"
TOTAL_RAM_MB=$(free -m | awk '/^Mem:/{print $2}')
CURRENT_SWAP_MB=$(free -m | awk '/^Swap:/{print $2}')

if [ "$CURRENT_SWAP_MB" -lt 1024 ] && [ "$TOTAL_RAM_MB" -lt 4096 ]; then
    echo -e "${YELLOW}Jami RAM: ${TOTAL_RAM_MB}MB. Swap yetarli emas. 2GB Swap yaratilmoqda...${NC}"
    fallocate -l 2G /swapfile || dd if=/dev/zero of=/swapfile bs=1M count=2048
    chmod 600 /swapfile
    mkswap /swapfile
    swapon /swapfile
    if ! grep -q '/swapfile' /etc/fstab; then
        echo '/swapfile none swap sw 0 0' >> /etc/fstab
    fi
    sysctl vm.swappiness=20
    echo 'vm.swappiness=20' >> /etc/sysctl.d/99-nexus.conf
    echo -e "${GREEN}2GB Swap muvaffaqiyatli faollashtirildi.${NC}"
else
    echo -e "${GREEN}Swap va Xotira holati qoniqarli (RAM: ${TOTAL_RAM_MB}MB, Swap: ${CURRENT_SWAP_MB}MB).${NC}"
fi

# 4. Docker va Docker Compose o'rnatish (mavjud bo'lmasa)
echo -e "\n${YELLOW}[3/6] Docker & Docker Compose tekshirilmoqda...${NC}"
if ! command -v docker &> /dev/null; then
    echo -e "${YELLOW}Docker o'rnatilmoqda...${NC}"
    install -m 0755 -d /etc/apt/keyrings
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
    chmod a+r /etc/apt/keyrings/docker.gpg
    echo \
      "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
      $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
      tee /etc/apt/sources.list.d/docker.list > /dev/null
    apt-get update
    apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
    systemctl enable docker
    systemctl start docker
    echo -e "${GREEN}Docker muvaffaqiyatli o'rnatildi.${NC}"
else
    echo -e "${GREEN}Docker allaqachon o'rnatilgan: $(docker --version)${NC}"
fi

# 5. UFW Firewall sozlash
echo -e "\n${YELLOW}[4/6] UFW Firewall xavfsizligi sozlanmoqda...${NC}"
ufw default deny incoming
ufw default allow outgoing
ufw allow 22/tcp comment 'SSH'
ufw allow 80/tcp comment 'HTTP Nginx'
ufw allow 443/tcp comment 'HTTPS Nginx'
echo "y" | ufw enable
echo -e "${GREEN}UFW xavfsizlik devori yoqildi (22, 80, 443 ochiq).${NC}"

# 6. Fail2ban faollashtirish (SSH brute-force himoyasi)
echo -e "\n${YELLOW}[5/6] Fail2ban xizmati tekshirilmoqda...${NC}"
systemctl enable fail2ban
systemctl start fail2ban
echo -e "${GREEN}Fail2ban xizmati faol.${NC}"

# 7. Zaxira va log kataloglarini tayyorlash
echo -e "\n${YELLOW}[6/6] Tizim kataloglari tayyorlanmoqda...${NC}"
mkdir -p /var/backups/nexus/postgres
mkdir -p /var/log/nexus
chmod 700 /var/backups/nexus

echo -e "\n${GREEN}======================================================${NC}"
echo -e "${GREEN}  Server tayyorlash muvaffaqiyatli yakunlandi!        ${NC}"
echo -e "${GREEN}  Keyingi qadamlar:                                   ${NC}"
echo -e "${GREEN}  1. .env faylini to'ldiring: cp .env.production.example .env${NC}"
echo -e "${GREEN}  2. SSL sertifikat oling: sudo bash scripts/init-ssl.sh${NC}"
echo -e "${GREEN}  3. Loyihani deploy qiling: bash scripts/deploy.sh   ${NC}"
echo -e "${GREEN}======================================================${NC}"
