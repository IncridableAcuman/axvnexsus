# 🚀 AXV Nexsus — Al-Xorazmiy Vorislari Ta’lim Ekotizimi

> **Platformaning bosh g‘oyasi:**  
> *Har bir dars — reja asosida. Har bir natija — o‘lchov asosida. Har bir o‘quvchi — rivojlanish yo‘lida.*

---

## 📌 Loyiha haqida

**AXV Nexsus** (Al-Xorazmiy Vorislari Hub) — O‘zbekiston Respublikasi Raqamli Texnologiyalar Vazirligi va Raqamli Ta’limni Rivojlantirish Markazi doirasidagi **"Muhammad Al-Xorazmiy Vorislari"** loyihasi uchun maxsus ishlab chiqilgan zamonaviy EdTech platformasi.

Platforma 8-sinfdan 11-sinfgacha bo‘lgan iqtidorli o‘quvchilar, ularning IT va xorijiy til mentorlari, o‘quv guruhlari hamda haftalik dars jadvallarini yagona markazlashtirilgan tizimda boshqarish imkoniyatini taqdim etadi.

---

## 🌟 Asosiy Imkoniyatlar

### 1. 📅 Dars Jadvallari va Taqsimot (Timetable System)
- **Sinflar kesimida saralash:** 8-sinf, 9-sinf, 10-sinf, 11-sinf.
- **Mentorlar kesimida saralash:** Masalan, *Abdurasharipov Izzatbek (IT mentor)*, *Raximova Dilnoza (Ingliz tili mentor)* va boshqalar.
- **Ko‘rinishlar:**
  - **Haftalik kalendar to‘ri (Weekly Grid):** Dushanbadan Shanbagacha soatlar va xonalar kesimida barcha darslar.
  - **Ro‘yxat / Kartalar ko‘rinishi (Cards View):** Har bir guruh va dars tafsilotlari.
- **80 daqiqalik intensiv dars standarti:**
  - 15–20 daqiqa: **Tushunish** (Nazariya va sodda misollar)
  - 25–30 daqiqa: **Amaliyot** (Mentor bilan kod yozish)
  - 20–25 daqiqa: **Loyiha** (Kichik web-mahsulot yaratish)
  - 10–15 daqiqa: **Natija** (Tekshirish va xatolar tahlili)

---

### 2. ⚡ Dars Jadvali va O‘quvchilarni Qo‘shishning 2 Xil Usuli

#### A) ✍️ Qo‘lda qo‘shish (Manual Entry)
- Mentor tanlash / yangi kiritish
- Sinf (8, 9, 10, 11) va Guruh kodi (masalan, `YA-26I0804`)
- Fan/Yo‘nalish (Web Full-Stack, Computer Science, UX/UI, va hk.)
- Dars kunlari (Dushanba-Chorshanba-Juma, Seshanba-Payshanba-Shanba)
- Dars soatlari, xona va filial lokatsiyasi
- Guruhga o‘quvchilar ro‘yxatini birato‘la nusxalab (bulk text) qo‘shish imkoniyati.

#### B) 🤖 AI orqali Fayl yuklash (AI Timetable & Student Parser)
- Excel (`.xlsx`, `.xls`), CSV, PDF yoki Skrinshot/Jadval rasmlarini yuklash.
- **Kerakli mentorni aytish:** Masalan, `Abdurasharipov Izzatbek` deb yoziladi yoki tanlanadi.
- **AI Dvigatellari:**
  1. ⚡ **Aqlli Mahalliy Parser (Smart Local Parser):** 100% oflayn ishlaydi, jadvaldagi ustunlarni (`FISH`, `Guruh`, `IT mentor`, `O'qish joyi`, `PINFL`) to‘g‘ridan-to‘g‘ri tahlil qiladi.
  2. 🚀 **Groq AI (Llama 3.3 70B Versatile):** Bepul va ultra-tezkor LLM orqali jadvaldagi mentorni va barcha o‘quvchilar ro‘yxatini semantik ajratib oladi.
  3. 💎 **Google Gemini 2.5 Flash:** Multimodal tahlil orqali murakkab formatdagi hujjatlarni o‘qish.
- **Interaktiv ko‘rib chiqish (Live Preview):** Topilgan dars jadvali va o‘quvchilar ro‘yxati ekranda chiqadi, tahrirlash va bir tugma bilan bazaga saqlash mumkin.

---

### 3. 👥 O‘quvchilar Boshqaruvi
- F.I.Sh, Talaba ID raqami, PINFL (JSHSHIR) bo‘yicha tezkor qidiruv.
- Sinf va guruh bo‘yicha filtrlar.
- CSV formatida eksport qilish.

---

### 4. 📚 8-Sinfdan 11-Sinfgacha O‘quv Yo‘li (Curriculum)
- **8-sinf:** Computer Science Foundation (36 soat) + Web Full-Stack Development (66 soat)
- **9–10-sinf:** 9 ta zamonaviy IT yo‘nalishi (Game Dev, AI & ML, Data Analytics, Cyber Security, Frontend, Backend, Android, iOS, Cross-platform)
- **11-sinf:** Professional rivojlanish, Portfel, Freelance va xalqaro bozorga chiqish.

---

## 🛠 Texnologiyalar Steki

- **Backend:**
  - Java 21 LTS + Spring Boot 4
  - DDD (Domain-Driven Design) + Modular Monolith
  - Spring Data JPA + Hibernate
  - Liquibase (Versiyalangan schema migratsiyasi)
  - Spring Security (Stateless JWT & Multi-role RBAC)
  - SpringDoc OpenAPI (Swagger UI)
  - Spring Boot Actuator (`/actuator/health`, `/api/v1/health`)
  - Apache POI & Apache PDFBox / OpenPDF
  - JUnit 5, Mockito, Testcontainers

- **Frontend:**
  - React 19 + TypeScript (Strict Mode)
  - Vite + Tailwind CSS v4
  - Feature-Sliced Design (FSD 2.1)
  - TanStack React Query v5 (Server kesh va holat)
  - React Hook Form + Zod (Validatsiya)
  - Lucide React (Ikonkalar)

- **Infratuzilma & DevOps:**
  - Docker & Docker Compose
  - PostgreSQL 16 Alpine
  - Redis 7 Alpine
  - GitHub Actions CI/CD

---

## 📚 Arxitektura Hujjatlari (Architecture Docs)

Loyiha arxitekturasi to‘liq hujjatlashtirilgan bo‘lib, quyidagi bo‘limlardan iborat:
1. [01. Repository Assessment (Holat tahlili)](./docs/architecture/01-repository-assessment.md)
2. [02. Architecture Decision Records (ADR)](./docs/architecture/02-architecture-decision-records.md)
3. [03. Initial Domain Model (Domen modeli)](./docs/architecture/03-domain-model.md)
4. [04. Module Dependency Map (Modullar bog‘liqlik xaritasi)](./docs/architecture/04-module-dependency-map.md)
5. [05. Database Design Proposal (Baza strukturasi)](./docs/architecture/05-database-design-proposal.md)
6. [06. API Conventions & Standards (API qoidalari)](./docs/architecture/06-api-conventions.md)
7. [07. Authentication & Authorization Strategy (Xavfsizlik)](./docs/architecture/07-auth-strategy.md)
8. [08. Frontend FSD Architecture (Frontend tuzilishi)](./docs/architecture/08-frontend-fsd-architecture.md)
9. [09. Testing Strategy (Testlash strategiyasi)](./docs/architecture/09-testing-strategy.md)
10. [10. Development Roadmap (5 bosqichli reja)](./docs/architecture/10-development-roadmap.md)

---

## 💻 Ishga tushirish (Local Development)

### 1. Muhit parametrlarini sozlash
```bash
cp .env.example .env
```

### 2. Docker Compose orqali to‘liq ishga tushirish (Tavsiya etiladi)
```bash
docker compose up -d
```
* Baza: `localhost:5432` (PostgreSQL)
* Kesh: `localhost:6379` (Redis)
* Backend API: `http://localhost:8080`
* Swagger UI: `http://localhost:8080/swagger-ui.html`
* Health Check: `http://localhost:8080/api/v1/health`
* Frontend UI: `http://localhost:5173`

### 3. Dasturchi rejimida alohida ishga tushirish

#### PostgreSQLni yoqish:
```bash
docker compose up -d postgres redis
```

#### Backendni ishga tushirish:
```bash
cd backend
./gradlew bootRun
```

#### Frontendni ishga tushirish:
```bash
cd frontend
npm run dev
```

---

## 🧪 Avtomatlashtirilgan Tekshiruvlar (Verification)

```bash
# Backend testlarini yurgizish
cd backend && ./gradlew test

# Frontend turlar va linter tekshiruvi
cd frontend && npm run lint && npm run build
```

---

## 🚀 Ishlab Chiqarishga O‘rnatish (Production Deployment)

Real Linux serverga (Ubuntu/Debian VPS) professional o'rnatish, SSL/TLS, zaxiralash, monitoring va xavfsizlik sozlamalari bo'yicha to'liq qo'llanma:
- [Real Linux Server Deployment Qo‘llanmasi (DEPLOYMENT_REAL_SERVER.md)](file:///home/izzatbek/Desktop/axvhub/DEPLOYMENT_REAL_SERVER.md)
- [Ishlab Chiqarishga Tayyorgarlik va Deployment Qo‘llanmasi (Module 17)](file:///home/izzatbek/Desktop/axvhub/docs/deployment/12-production-deployment-guide.md)
- [Production Docker Compose Konfiguratsiyasi (docker-compose.prod.yml)](file:///home/izzatbek/Desktop/axvhub/docker-compose.prod.yml)
- [Ishlab chiqarish uchun .env namunasi (.env.production.example)](file:///home/izzatbek/Desktop/axvhub/.env.production.example)

---

© 2026 **AXV Hub** — Muhammad Al-Xorazmiy Vorislari ta’lim ekotizimi.
