# Render Blueprint orqali AXM Nexus / YANGIARIQ AQUA AI Loyihasini Joylashtirish (Deployment) Qo‘llanmasi

Ushbu qo‘llanma **AXM Nexus** platformasini **Render Blueprint (`render.yaml`)**, **Neon Serverless PostgreSQL** va **Neon S3 Object Storage** vositasida to‘liq avtomatlashtirilgan tarzda bulutga (cloud) joylashtirish bo‘yicha to‘liq amaliy yo‘riqnomadir.

---

## 1. Arxitektura va Resurslar Taqsimoti

```mermaid
flowchart TD
    User["Foydalanuvchi (Brauzer)"] -->|HTTPS| RenderStatic["Render Static Site\n(yangiariq-aqua / React 19 + Vite)"]
    User -->|API /api/*| RenderWeb["Render Web Service\n(yangiariq-aqua-api / Spring Boot 4 Docker)"]
    
    subgraph NeonCloud ["Neon Cloud Platform"]
        NeonDB[("Neon PostgreSQL DB\n(Pooled: ep-hidden-pine-...-pooler)\nsslmode=require")]
        NeonS3[("Neon S3 Object Storage\n(Bucket: assets)\nAWS SigV4")]
    end
    
    RenderWeb -->|JDBC Pool 5432| NeonDB
    RenderWeb -->|S3 REST API / SigV4| NeonS3
```

- **Frontend**: Render Static Site (bepul, global CDN, SPA rewrite bilan).
- **Backend**: Render Web Service (Docker multi-stage, non-root `spring` foydalanuvchisi, Actuator healthcheck).
- **Ma'lumotlar bazasi**: Neon Serverless PostgreSQL (`ep-...-pooler` orqali PgBouncer pooling).
- **Fayllar xotirasi (Storage)**: Neon S3-compatible Object Storage (serverless, konteyner qayta ishga tushganda ham ma'lumotlar o‘chib ketmaydi).
- **Kesh (Redis)**: Loyiha to‘liq holatsiz (stateless) va tranzaksion so‘rovlar PostgreSQL orqali samarali boshqariladi. Backend kodida Redis'ga ehtiyoj yo‘qligi sababli, Render bepul limitlarini tejash va ortiqcha xarajatlarning oldini olish uchun Redis olib tashlandi.

---

## 2. Sozlamalar va Muhit O‘zgaruvchilari (Environment Variables)

### 2.1. Ma'lumotlar bazasi (Neon PostgreSQL)
Loyihada maxsus `NeonDatabaseEnvironmentPostProcessor` joriy qilingan. Render yoki `.env` da quyidagilardan birini ko‘rsatish kifoya:

* **Variant A (Tavsiya etiladi - yagona URL)**:
  ```env
  NEON_URL=postgresql://neondb_owner:YOUR_NEON_PASSWORD@ep-your-branch-pooler.us-east-2.aws.neon.tech/neondb?sslmode=require
  ```
  *(Tizim avtomatik ravishda parolni, foydalanuvchini ajratib oladi va `prepareThreshold=0` ni ulaydi).*

* **Variant B (Alohida o‘zgaruvchilar)**:
  ```env
  DB_HOST=ep-your-branch-pooler.us-east-2.aws.neon.tech
  DB_PORT=5432
  DB_NAME=neondb
  DB_USER=neondb_owner
  DB_PASSWORD=YOUR_NEON_PASSWORD
  DB_SSL=?sslmode=require&prepareThreshold=0
  ```

### 2.2. Fayllar saqlash xotirasi (Neon S3 Storage)
Fayllar (darsliklar, PDF, slaydlar, taqdimotlar va h.k.) Neon S3 xotirasida saqlanadi:
```env
STORAGE_PROVIDER=neon
AWS_ENDPOINT_URL_S3=https://your-neon-storage-endpoint.aws.neon.tech
AWS_ACCESS_KEY_ID=YOUR_NEON_S3_ACCESS_KEY
AWS_SECRET_ACCESS_KEY=YOUR_NEON_S3_SECRET_KEY
AWS_REGION=us-east-2
S3_BUCKET_NAME=assets
```

### 2.3. Kesh (Redis) Masalasi Tahlili va Qaror
Foydalanuvchi talabi bo‘yicha Redis infratuzilmasi to‘liq tekshirildi:
1. **Kod bazasi auditi**: Backend (Spring Boot 4) kodlarida `org.springframework.data.redis`, `RedisTemplate` yoki Redis kesh annotatsiyalari umuman mavjud emas. Loyiha to‘liq stateless bo‘lib, ma'lumotlar tezkorligi HikariCP pool va PostgreSQL indekslari orqali ta'minlangan.
2. **Resurs va Xarajat**: Render platformasida bo‘sh turgan yoki ishlatilmaydigan Redis servisini ishga tushirish bepul xizmatlar limitini cheklaydi yoki ortiqcha to‘lov talab qiladi.
3. **Qilingan amallar**:
   - `docker-compose.yaml` dan keraksiz `redis` konteyneri va `redis_data` volume olib tashlandi.
   - `.env` va `.env.example` dan `REDIS_PORT` olib tashlandi.
   - `render.yaml` faylida Redis olib tashlandi, lekin agar kelajakda (masalan, sessiyalar yoki rate limit uchun) kerak bo‘lib qolsa, blueprintga qo‘shish uchun tayyor `type: keyvalue` shabloni izoh sifatida qoldirildi.

---

## 3. Render da Blueprint orqali Bir Klikda O‘rnatish

Loyihaning ildiz qismida to‘liq sozlangan `render.yaml` mavjud.

1. **Render.com** platformasiga kiring ([dashboard.render.com](https://dashboard.render.com)).
2. **"New +"** tugmasini bosing va **"Blueprint"** menyusini tanlang.
3. GitHub reponi (`axvhub`) tanlang va **"Connect"** qiling.
4. Render avtomatik ravishda `render.yaml` ni o‘qiydi va 2 ta servisni aniqlaydi:
   - **`yangiariq-aqua-api`** (Docker Web Service)
   - **`yangiariq-aqua`** (Frontend Static Site)
5. **Sync qiluvchi o‘zgaruvchilar (Sync: false bo‘lgan 3 ta maxfiy qiymat)** uchun quyidagilarni kiriting:
   - `NEON_URL`: Neon konsolidan olingan PostgreSQL URL (`.env` dagi `NEON_URL`)
   - `AWS_SECRET_ACCESS_KEY`: Neon S3 maxfiy kaliti (`.env` dagi `AWS_SECRET_ACCESS_KEY`)
   - `GROQ_API_KEY`: Groq AI kaliti (`.env` dagi `GROQ_API_KEY`)
   *(Izoh: Barcha ortiqcha `DB_HOST`, `DB_USER`, `DB_PASSWORD` va `SUPER_ADMIN_BOOTSTRAP_PASSWORD` olib tashlangan, tizim yagona `NEON_URL` orqali to'liq ishlaydi).*
6. **"Apply"** tugmasini bosing.

Render bir vaqtning o‘zida:
- Backend Docker tasvirini quradi va ishga tushiradi (`/actuator/health` orqali tekshiradi).
- Frontend loyihasini quradi (`npm ci && npm run build`) va global CDN ga joylashtiradi.

---

## 4. Neon Storage Ishini Lokal Sinovdan O‘tkazish (`npmpackages.txt` integratsiyasi)

`frontend/npmpackages.txt` faylida keltirilgan rasmiy Neon S3 sozlamalari, paketlar va kod namunalari asosida loyihada testlash va integratsiya imkoniyati yaratilgan.

### 4.1. Foydalanish mumkin bo'lgan SDK to'plamlari:
* **Node.js (@aws-sdk)**:
  ```bash
  npm i @aws-sdk/client-s3 @aws-sdk/s3-request-presigner dotenv
  ```
* **Node.js (Files SDK / Neon adapter)**:
  ```bash
  npm i files-sdk @aws-sdk/client-s3 @aws-sdk/lib-storage @aws-sdk/s3-presigned-post @aws-sdk/s3-request-presigner dotenv
  ```
* **Python (Boto3)**:
  ```bash
  pip install boto3
  ```

### 4.2. Sinov skriptini ishga tushirish
Neon S3 Object Storage ulanishini terminal orqali tekshirish uchun `scripts/test-neon-storage.mjs` skripti yaratilgan. U `@aws-sdk` o‘rnatilgan bo‘lsa undan foydalanadi, o‘rnatilmagan bo‘lsa Node.js 18+ ning ichki `crypto` va `fetch` moduli orqali to‘g‘ridan-to‘g‘ri SigV4 imzosi bilan ishlaydi:

```bash
# S3 tekshiruv skriptini ishga tushirish (0-dependency yoki @aws-sdk bilan)
node scripts/test-neon-storage.mjs
```

Skript quyidagilarni amalga oshiradi:
1. Neon S3 bucket (`assets`) ga test faylini yuklaydi.
2. Yuklangan fayl uchun 1 soatlik xavfsiz **Presigned URL** generatsiya qiladi.
3. Test faylini o‘chirib tozalaydi.

---

## 5. Xavfsizlik va Ishonchlilik Mexanizmlari

1. **Non-Root Konteyner**: Backend Docker tasviri faqat `spring:spring` xavfsiz foydalanuvchisi huquqida ishlaydi.
2. **Fail-Safe Fallback**: Agar Neon S3 tarmog‘ida uzilish bo‘lsa, backend avtomatik ravishda lokal xotiraga yozadi va xatolik bo‘yicha ogohlantirish beradi.
3. **Fayl Kengaytmalari Nazorati**: `.exe`, `.bat`, `.sh`, `.php`, `.jsp` kabi xavfli ijro etiluvchi fayllarni yuklash dastur darajasida taqiqlangan.
4. **Neon Connection Pooling**: PgBouncer orqali ishlovchi pooler uchun JDBC `prepareThreshold=0` parametri kafolatlangan, bu tranzaksiyaviy xatoliklarning oldini oladi.
