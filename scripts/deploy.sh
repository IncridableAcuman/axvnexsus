#!/usr/bin/env bash
# ==============================================================================
# AXM Nexus — Real Production Deployment Skripti
# Ishlatish: bash scripts/deploy.sh
# ==============================================================================

set -euo pipefail

# Ranglar
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

COMPOSE_FILE="docker-compose.prod.yml"

echo -e "${BLUE}======================================================${NC}"
echo -e "${BLUE}   AXM Nexus — Ishlab Chiqarishga O'rnatish (Deploy)  ${NC}"
echo -e "${BLUE}======================================================${NC}"

# 1. .env fayli mavjudligini tekshirish
if [ ! -f ".env" ]; then
    echo -e "${RED}[XATOLIK] .env fayli topilmadi!${NC}"
    echo -e "${YELLOW}Iltimos, avval namuna asosida .env yarating: cp .env.production.example .env${NC}"
    exit 1
fi

# 2. Xavfsizlik Pre-flight tekshiruvlari
echo -e "\n${CYAN}[1/6] Xavfsizlik konfiguratsiyasi tekshirilmoqda...${NC}"

# .env dagi qiymatlarni o'qish (xavfsiz usulda)
get_env_val() {
    grep -E "^${1}=" .env | cut -d '=' -f2- | tr -d ' "' || true
}

APP_JWT_SECRET=$(get_env_val "APP_JWT_SECRET")
POSTGRES_PASSWORD=$(get_env_val "POSTGRES_PASSWORD")
RABBITMQ_PASSWORD=$(get_env_val "RABBITMQ_PASSWORD")
CORS_ALLOWED_ORIGINS=$(get_env_val "CORS_ALLOWED_ORIGINS")

# JWT tekshiruvi (ProductionSecurityValidator talablariga mos)
if [ -z "$APP_JWT_SECRET" ] || [ ${#APP_JWT_SECRET} -lt 32 ]; then
    echo -e "${RED}[XATOLIK] APP_JWT_SECRET kamida 32 belgidan iborat bo'lishi shart! (Hozirgi uzunlik: ${#APP_JWT_SECRET})${NC}"
    echo -e "${YELLOW}Generatsiya uchun: openssl rand -hex 32${NC}"
    exit 1
fi

if [[ "$APP_JWT_SECRET" == *"super_secret_jwt_key"* ]] || [[ "$APP_JWT_SECRET" == *"generate_a_random"* ]]; then
    echo -e "${RED}[XATOLIK] Standart/namunaviy JWT maxfiy kalitini productionda ishlatish qat'iyan man etiladi!${NC}"
    echo -e "${YELLOW}Yangi kalit yarating: openssl rand -hex 32${NC}"
    exit 1
fi

# Database paroli
if [ -z "$POSTGRES_PASSWORD" ] || [ "$POSTGRES_PASSWORD" = "postgres" ] || [ "$POSTGRES_PASSWORD" = "your_secure_db_password_here" ]; then
    echo -e "${RED}[XATOLIK] POSTGRES_PASSWORD o'zgartirilmagan yoki standart 'postgres' qolgan!${NC}"
    exit 1
fi

# RabbitMQ paroli
if [ -z "$RABBITMQ_PASSWORD" ] || [ "$RABBITMQ_PASSWORD" = "guest" ] || [ "$RABBITMQ_PASSWORD" = "your_secure_rabbitmq_password_here" ]; then
    echo -e "${RED}[XATOLIK] RABBITMQ_PASSWORD o'zgartirilmagan yoki standart 'guest' qolgan!${NC}"
    exit 1
fi

# CORS tekshiruvi
if [ "$CORS_ALLOWED_ORIGINS" = "*" ]; then
    echo -e "${RED}[XATOLIK] Ishlab chiqarishda CORS_ALLOWED_ORIGINS '*' bo'lishi qat'iyan taqiqlanadi!${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Barcha xavfsizlik tekshiruvlari muvaffaqiyatli o'tdi.${NC}"

# 3. Docker tasvirlarini qurish (Build)
echo -e "\n${CYAN}[2/6] Docker tasvirlari qurilmoqda (Multi-stage build)...${NC}"
docker compose -f "$COMPOSE_FILE" build --pull

# 4. Asosiy ma'lumotlar bazasi va xabarlar navbatini ishga tushirish
echo -e "\n${CYAN}[3/6] PostgreSQL va RabbitMQ ishga tushirilmoqda...${NC}"
docker compose -f "$COMPOSE_FILE" up -d postgres rabbitmq

echo -e "${YELLOW}Baza va RabbitMQ salomatligi kutilmoqda (Healthcheck)...${NC}"
ATTEMPTS=0
MAX_ATTEMPTS=30
until [ "$(docker inspect --format='{{.State.Health.Status}}' nexus-prod-postgres 2>/dev/null || true)" == "healthy" ] && \
      [ "$(docker inspect --format='{{.State.Health.Status}}' nexus-prod-rabbitmq 2>/dev/null || true)" == "healthy" ]; do
    ATTEMPTS=$((ATTEMPTS+1))
    if [ $ATTEMPTS -ge $MAX_ATTEMPTS ]; then
        echo -e "${RED}[XATOLIK] Baza yoki RabbitMQ belgilangan vaqt ichida ishga tushmadi!${NC}"
        docker compose -f "$COMPOSE_FILE" logs postgres rabbitmq
        exit 1
    fi
    sleep 2
    echo -n "."
done
echo -e "\n${GREEN}✓ PostgreSQL va RabbitMQ salomat holatda (Healthy).${NC}"

# 5. Backend xizmatini ishga tushirish va migratsiyalarni kutish
echo -e "\n${CYAN}[4/6] Backend (Spring Boot 4) ishga tushirilmoqda...${NC}"
docker compose -f "$COMPOSE_FILE" up -d backend

echo -e "${YELLOW}Backend salomatligi kutilmoqda (/actuator/health)...${NC}"
BACKEND_ATTEMPTS=0
MAX_BACKEND_ATTEMPTS=45
until [ "$(docker inspect --format='{{.State.Health.Status}}' nexus-prod-backend 2>/dev/null || true)" == "healthy" ]; do
    BACKEND_ATTEMPTS=$((BACKEND_ATTEMPTS+1))
    if [ $BACKEND_ATTEMPTS -ge $MAX_BACKEND_ATTEMPTS ]; then
        echo -e "\n${RED}[XATOLIK] Backend 90 soniya ichida salomat holatga kelmadi!${NC}"
        echo -e "${YELLOW}Oxirgi loglar:${NC}"
        docker compose -f "$COMPOSE_FILE" logs --tail=50 backend
        exit 1
    fi
    sleep 2
    echo -n "."
done
echo -e "\n${GREEN}✓ Backend va Liquibase migratsiyalari muvaffaqiyatli ishga tushdi (Healthy).${NC}"

# 6. Frontend xizmatini ishga tushirish
echo -e "\n${CYAN}[5/6] Frontend (React + Nginx) ishga tushirilmoqda...${NC}"
docker compose -f "$COMPOSE_FILE" up -d frontend

sleep 3
FRONTEND_STATUS=$(docker inspect --format='{{.State.Health.Status}}' nexus-prod-frontend 2>/dev/null || echo "starting")
echo -e "${GREEN}✓ Frontend xizmati ishga tushirildi (Status: $FRONTEND_STATUS).${NC}"

# 7. Eski keraksiz konteyner tasvirlarini tozalash
echo -e "\n${CYAN}[6/6] Eski keraksiz Docker keshlarini tozalash...${NC}"
docker image prune -f

# Tizim statusi
echo -e "\n${GREEN}======================================================${NC}"
echo -e "${GREEN}   AXM Nexus Tizimi Muvaffaqiyatli Ishga Tushirildi!   ${NC}"
echo -e "${GREEN}======================================================${NC}"
docker compose -f "$COMPOSE_FILE" ps

echo -e "\n${CYAN}Tizim salomatligi tekshiruvi:${NC}"
HTTP_PORT_VAL=$(get_env_val "HTTP_PORT")
PORT_CHECK="${HTTP_PORT_VAL:-80}"
echo -e "Frontend: http://localhost:${PORT_CHECK}/healthz"
echo -e "Backend:  http://localhost:8080/actuator/health"
