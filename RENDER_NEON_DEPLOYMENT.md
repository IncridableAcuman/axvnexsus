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

---

## 2. Sozlamalar va Muhit O‘zgaruvchilari (Environment Variables)

### 2.1. Ma'lumotlar bazasi (Neon PostgreSQL)
Loyihada maxsus `NeonDatabaseEnvironmentPostProcessor` joriy qilingan. Render yoki `.env` da quyidagilardan birini ko‘rsatish kifoya:

* **Variant A (Tavsiya etiladi - yagona URL)**:
  ```env
  NEON_URL=postgresql://neondb_owner:npg_jsnEFky5RY2a@ep-hidden-pine-benajq9a-pooler.c-9.us-east-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require
  ```
  *(Tizim avtomatik ravishda parolni, foydalanuvchini ajratib oladi va `prepareThreshold=0` ni ulaydi).*

* **Variant B (Alohida o‘zgaruvchilar)**:
  ```env
  DB_HOST=ep-hidden-pine-benajq9a-pooler.c-9.us-east-2.aws.neon.tech
  DB_PORT=5432
  DB_NAME=neondb
  DB_USER=neondb_owner
  DB_PASSWORD=npg_jsnEFky5RY2a
  DB_SSL=?sslmode=require&prepareThreshold=0
  ```

### 2.2. Fayllar saqlash xotirasi (Neon S3 Storage)
Fayllar (darsliklar, PDF, slaydlar, taqdimotlar va h.k.) Neon S3 xotirasida saqlanadi:
```env
STORAGE_PROVIDER=neon
AWS_ENDPOINT_URL_S3=https://br-dark-math-beyvvxd8.storage.c-9.us-east-2.aws.neon.tech
AWS_ACCESS_KEY_ID=nak_live_a830d72ca13646aaae231f0a1c17d35e
AWS_SECRET_ACCESS_KEY=nsk_live_1f92bc1985936e64ba5131a79c12fa1e07ef821f54f8ab9f7d1c1cc1825e7bfc
AWS_REGION=us-east-2
S3_BUCKET_NAME=assets
```

---

## 3. Render da Blueprint orqali Bir Klikda O‘rnatish

Loyihaning ildiz qismida to‘liq sozlangan `render.yaml` mavjud.

1. **Render.com** platformasiga kiring ([dashboard.render.com](https://dashboard.render.com)).
2. **"New +"** tugmasini bosing va **"Blueprint"** menyusini tanlang.
3. GitHub reponi (`axvhub`) tanlang va **"Connect"** qiling.
4. Render avtomatik ravishda `render.yaml` ni o‘qiydi va 2 ta servisni aniqlaydi:
   - **`yangiariq-aqua-api`** (Docker Web Service)
   - **`yangiariq-aqua`** (Frontend Static Site)
5. **Sync qiluvchi o‘zgaruvchilar (Sync: false bo‘lgan qiymatlar)** uchun quyidagilarni kiriting:
   - `NEON_URL`: Neon konsolidan olingan PostgreSQL URL.
   - `AWS_ACCESS_KEY_ID`: `nak_live_a830d72ca13646aaae231f0a1c17d35e`
   - `AWS_SECRET_ACCESS_KEY`: `nsk_live_1f92bc1985936e64ba5131a79c12fa1e07ef821f54f8ab9f7d1c1cc1825e7bfc`
   - `GROQ_API_KEY`: Groq API kaliti (agar AI funksiyalari kerak bo‘lsa).
6. **"Apply"** tugmasini bosing.

Render bir vaqtning o‘zida:
- Backend Docker tasvirini quradi va ishga tushiradi (`/actuator/health` orqali tekshiradi).
- Frontend loyihasini quradi (`npm ci && npm run build`) va global CDN ga joylashtiradi.

---

## 4. Neon Storage Ishini Lokal Sinovdan O‘tkazish

Neon S3 Object Storage ulanishini terminal orqali tekshirish uchun maxsus skript yaratilgan:

```bash
# S3 tekshiruv skriptini ishga tushirish
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
