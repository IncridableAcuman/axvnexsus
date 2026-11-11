import type { LessonPlanDto } from '@/types';

export const DEFAULT_LESSONS: LessonPlanDto[] = [
  // 1. 8-sinf: HTML5 Semantik UI & Formalar
  {
    id: 1,
    title: 'HTML5 Semantik Teglar, Web Accessibility va Formalar',
    subject: 'Web Full-Stack Development',
    gradeLevel: '8-sinf',
    topic: 'Semantik HTML5, ARIA va Zamonaviy Veb-Formalar',
    learningObjectives: 'Semantik elementlar (<header>, <nav>, <main>, <article>, <aside>, <footer>) va HTML5 formalarining barcha atributlarini mukammal qo‘llash',
    expectedOutcomes: 'O‘quvchilar screen-readerlar va SEO standartlariga 100% javob beruvchi, to‘liq validatsiyali kirish va ro‘yxatdan o‘tish interfeyslarini qura oladilar',
    requiredMaterials: 'VS Code, Google Chrome DevTools, Lighthouse Extension',
    theoryDurationMinutes: 20,
    theoryContent: `### 🎯 1. Nazariy Tushuncha: Nega Semantik HTML Muhim?

Semantik HTML — bu teglarning shunchaki vizual ko‘rinishi uchun emas, balki **mazmuni va arxitekturasini** ifodalash uchun qo‘llanilishi demakdir.

> [!NOTE]
> \`<div>\` va \`<span>\` teglarida hech qanday semantik ma’no yo‘q. Aksincha, \`<header>\`, \`<nav>\`, \`<main>\`, \`<article>\`, \`<section>\`, \`<aside>\` va \`<footer>\` kabi teglar brauzerga, qidiruv botlariga (SEO) va ko‘zi ojizlar uchun ekran o‘quvchilariga (Screen Readers) sahifa tuzilishini aniq ko‘rsatadi.

#### Asosiy Semantik Bloklar:
- **\`<header>\`**: Sahifa yoki maqola sarlavhasi, logo va navigatsiya qismi.
- **\`<nav>\`**: Asosiy sayt navigatsiya havolalari majmui.
- **\`<main>\`**: Sahifadagi yagona, takrorlanmas asosiy kontent o‘rni.
- **\`<article>\`**: Mustaqil ma’noga ega bo‘lgan kontent (blog posti, yangilik, sharh).
- **\`<aside>\`**: Asosiy mavzuga bilvosita bog‘liq yon panel (sidebar, banner).
- **\`<footer>\`**: Mualliflik huquqi, ijtimoiy tarmoq havolalari va aloqa bo‘limi.

#### HTML5 Formalari va Validatsiya Standartlari:
Zamonaviy formalar foydalanuvchi ma’lumotlarini serverga yuborishdan oldin mijoz tomonida (Client-side) tezkor tekshiradi:
- \`type="email"\`, \`type="tel"\`, \`type="password"\`, \`type="number"\`
- \`required\`, \`minlength\`, \`maxlength\`, \`pattern="[0-9]{9}"\`
- Accessibility: Har bir input tegi uchun \`<label for="inputId">\` bo‘lishi shart!`,
    practicalDurationMinutes: 25,
    practicalContent: `### 💻 2. Amaliyot & Live-Coding: IT Park Ro‘yxatdan O‘tish Formasi

Quyidagi semantik va to‘liq validatsiyali kodni birgalikda yozamiz:

\`\`\`html
<!DOCTYPE html>
<html lang="uz">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>IT Park Talabalar Ro'yxati</title>
</head>
<body>
  <header>
    <h1>Al-Xorazmiy Vorislari O'quv Markazi</h1>
    <nav aria-label="Asosiy menyu">
      <ul>
        <li><a href="#about">Biz haqimizda</a></li>
        <li><a href="#register">Ro'yxatdan o'tish</a></li>
      </ul>
    </nav>
  </header>

  <main>
    <section id="register">
      <h2>Yangi O'quvchi Anketa Formasi</h2>
      <form action="/api/students" method="POST">
        <div>
          <label for="fullname">To'liq ism-familiyangiz:</label>
          <input type="text" id="fullname" name="fullname" required minlength="5" placeholder="Alisher Navoiy">
        </div>

        <div>
          <label for="phone">Telefon raqamingiz (+998):</label>
          <input type="tel" id="phone" name="phone" pattern="\\+998[0-9]{9}" required placeholder="+998901234567">
        </div>

        <div>
          <label for="grade">Sinfingizni tanlang:</label>
          <select id="grade" name="grade" required>
            <option value="">-- Tanlang --</option>
            <option value="8">8-sinf</option>
            <option value="9">9-sinf</option>
            <option value="10">10-sinf</option>
            <option value="11">11-sinf</option>
          </select>
        </div>

        <button type="submit">Ariza Yuborish</button>
      </form>
    </section>
  </main>

  <footer>
    <p>&copy; 2026 Al-Xorazmiy Vorislari. Barcha huquqlar himoyalangan.</p>
  </footer>
</body>
</html>
\`\`\`

> [!TIP]
> Chrome DevTools -> Elements -> Accessibility panelini ochib, sahifaning Accessibility Tree daraxtini tekshirib ko‘ring.`,
    exercises: `### ✍️ 3. Mustaqil Mashqlar & Mini-Task (25 daqiqa)

1. **Blog kartochkasi yasash:**
   - \`<article>\` tegidan foydalanib IT yangiliklari kartochkasini quring. Unda rasm, sarlavha, muallif (\`<address>\`) va sana (\`<time>\`) bo‘lsin.
2. **Kengaytirilgan Parol Validatsiyasi:**
   - Ro‘yxatdan o‘tish formasiga parol maydoni qo‘shing. Parol kamida 8 ta belgidan iborat, katta harf va raqam saqlashi shartligini \`pattern\` atributi bilan tekshiring.
3. **Screen Reader Simulyatsiyasi:**
   - Sichqonchasiz, faqat \`Tab\` va \`Enter\` tugmalari yordamida formani to‘liq to‘ldirib jo‘natishni sinab ko‘ring.`,
    homework: `### 🏠 4. Uyga Vazifa & Portfolio Topshirig‘i

- **Vazifa:** O‘zingizning shaxsiy Portfolio veb-saytingiz uchun to‘liq semantik **"Aloqa & Fikr-mulohaza"** (Contact Us) sahifasini yarating.
- **Talablar:**
  1. Kamida 5 ta turli xil input turlari (\`text\`, \`email\`, \`tel\`, \`select\`, \`textarea\`).
  2. Barcha maydonlarda mos \`<label>\` va tushunarli xatolik matnlari bo‘lsin.
  3. Kodni GitHub profilingizdagi \`html5-semantic-form\` repozitoriyasiga push qilib, linkini tizimga yuboring.`,
    durationMinutes: 80,
    status: 'PUBLISHED',
    isTemplate: true,
    createdAt: new Date().toISOString(),
    presentationSlides: `# 🚀 1. HTML5 Semantik Teglar va Zamonaviy Formalar
**Muhammad Al-Xorazmiy Vorislari • 8-sinf Web Dasturlash**
- **Fan:** Web Full-Stack Development
- **Format:** 80 daqiqalik intensiv ma'ruza va live-coding (PQ-3274 standarti)
- **Kutilayotgan natija:** Semantik veb-arxitektura va foydalanuvchi ma'lumotlarini qabul qiluvchi formalar qurish.

> [!NOTE]
> Semantik HTML — bu toza dasturiy me'morchilik va professional qidiruv tizimlari (SEO) optimallashuvining asosi!

> 🎙️ **Spiker izohi:** Darsni o'quvchilardan "Google siz qidirgan saytni qanday tushunadi?" degan savol bilan boshlang.
---
# 🧠 2. Semantik Teglar Iyerarxiyasi
- **\`<header>\` va \`<nav>\`:** Foydalanuvchini kutib oluvchi navigatsiya bloki.
- **\`<main>\` va \`<article>\`:** Sahifadagi asosiy, takrorlanmas foydali kontent.
- **\`<aside>\` va \`<footer>\`:** Qo'shimcha ma'lumotlar, kontaktlar va mualliflik huquqi.

\`\`\`text
+-------------------------------------------------------+
|                       <header>                        |
|                     <nav> Menyu                       |
+-------------------------------------------------------+
|             <main> Asosiy Foydali Kontent             |
|   +----------------------------+   +--------------+   |
|   |         <article>          |   |   <aside>    |   |
|   |       Mustaqil blok        |   |   Sidebar    |   |
|   +----------------------------+   +--------------+   |
+-------------------------------------------------------+
|                       <footer>                        |
+-------------------------------------------------------+
\`\`\`

> 🎙️ **Spiker izohi:** "Div sho'rva" (div-soup) xatosini tushuntiring: 10 ta div o'rniga aniq nomlangan teglardan foydalanish shart.
---
# ⚡ 3. HTML5 Form Maydonlari va Validatsiya
- **Foydalanuvchi tajribasi (UX):** Har bir \`<input>\` tegi uchun mos \`<label>\` ulash.
- **Avtomatik tekshiruv:** Regex va HTML5 cheklovlari.

\`\`\`html
<form action="/api/register" method="POST">
  <label for="student-email">Elektron pochta:</label>
  <input type="email" id="student-email" required placeholder="nom@maktab.uz">

  <label for="student-tel">Telefon raqam:</label>
  <input type="tel" id="student-tel" pattern="\\+998[0-9]{9}" required>

  <button type="submit">Ro'yxatdan O'tish</button>
</form>
\`\`\`

> 🎙️ **Spiker izohi:** Brauzer validatsiyasini amalda ko'rsating: noto'g'ri email kiritilganda brauzer o'zi ogohlantiradi.
---
# 💡 4. Web Accessibility (A11y) Oltin Qoidalari
1. **Rasmlar uchun \`alt\` atributi:** Har bir informativ rasmda izoh bo'lishi shart.
2. **Klaviatura orqali boshqaruv:** Foydalanuvchi faqat Tab va Enter orqali saytni to'liq ishlata olishi lozim.
3. **Kontrast va shrift o'lchami:** Matn fon bilan aniq ajralib turishi zarur.

> [!TIP]
> Google Chrome DevTools ichidagi Lighthouse bo'limini ishga tushiring — u sahifangiz Accessibility reytingini 100 ballgacha baholaydi!

> 🎙️ **Spiker izohi:** Ko'rish imkoniyati cheklangan dasturchilar kompyuterdan qanday foydalanishini qisqa misol qilib bering.
---
# 💻 5. Amaliy Laboratoriya: Interaktiv Anketa (25 daqiqa)
**Vazifa:**
- IT Park Al-Xorazmiy o'quv markazi uchun anketa formasini kodlang.
- Ism, telefon (+998), tug'ilgan sana, dasturlash yo'nalishi va fayl yuklash maydonlarini kiriting.
- Juftlikda (Pair Programming) bir-biringizning formangizni tekshiring.

> 🎙️ **Spiker izohi:** O'quvchilar oldiga borib, \`<label for="...">\` bilan \`<input id="...">\` to'g'ri bog'langanligini tekshiring.
---
# 🎯 6. Dars Xulosasi, Test va Uyga Vazifa
- **O'rganildi:** Semantik HTML, Web Accessibility va Form maydonlari validatsiyasi.
- **Oraliq test:** Platformadagi 1-mavzu testini topshiring (XP va kunlik streak to'plash uchun!).
- **Uyga vazifa:** Shaxsiy portfolio sahifangiz uchun Contact Us sahifasini yaratib, GitHub repozitoriyasiga push qiling!

> 🎙️ **Spiker izohi:** Darsda eng faol kod yozgan o'quvchilarni e'tirof eting.`,
  },

  // 2. 8-sinf: CSS Grid & Flexbox
  {
    id: 2,
    title: 'CSS Grid & Flexbox orqali Responsiv Maketlar',
    subject: 'Web Full-Stack Development',
    gradeLevel: '8-sinf',
    topic: 'Zamonaviy CSS Layouts, Flexbox va CSS Grid',
    learningObjectives: 'Flexbox (1 o‘lchamli) va CSS Grid (2 o‘lchamli) maketlarini birgalikda qo‘llab, mobil va desktop ekranlarga moslashuvchi interfeys yaratish',
    expectedOutcomes: 'O‘quvchilar media-querysiz `repeat(auto-fit, minmax(...))` orqali zamonaviy mahsulotlar vitrinasi va dashboard panellarini tuza oladilar',
    requiredMaterials: 'VS Code, CSS Grid Playground, Chrome DevTools Layout Inspector',
    theoryDurationMinutes: 20,
    theoryContent: `### 🎯 1. Nazariy Tushuncha: Flexbox va Grid Farqi

Zamonaviy CSS-da sahifani joylashtirish (Layout) uchun ikkita asosiy vosita qo‘llaniladi:

| Xususiyat | Flexbox (Flexible Box) | CSS Grid |
| :--- | :--- | :--- |
| **O‘lchamlilik** | 1D (Faqat qator YOKI ustun) | 2D (Qator VA ustun bir vaqtda) |
| **Mos joyi** | Navbar, tugmalar guruhi, kartochka ichi | Katta sahifa skeleti, fotogalereya, dashboard |
| **Asosiy qoida** | Kontent o‘z hajmini o‘zi belgilaydi | Qat’iy to‘r (Grid tracks) ichiga joylashadi |

#### Flexbox Asosiy Xususiyatlari:
\`\`\`css
.flex-container {
  display: flex;
  flex-direction: row; /* yoki column */
  justify-content: space-between; /* Asosiy o'q bo'ylab */
  align-items: center; /* Ko'ndalang o'q bo'ylab */
  gap: 16px;
}
\`\`\`

#### CSS Grid va Sehrli Auto-Fit Formula:
Hech qanday \`@media\` yozmasdan responsiv bo‘ladigan eng kuchli CSS qoidasi:
\`\`\`css
.grid-container {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 24px;
}
\`\`\`
> [!NOTE]
> Bu qoida ekran kengligiga qarab ustunlar sonini avtomatik ravishda 1, 2, 3 yoki 4 taga moslashtiradi!`,
    practicalDurationMinutes: 25,
    practicalContent: `### 💻 2. Amaliyot: Zamonaviy O‘quvchi Dashboard Paneli

\`\`\`css
/* index.css */
.dashboard-layout {
  display: grid;
  grid-template-areas:
    "sidebar header"
    "sidebar main";
  grid-template-columns: 260px 1fr;
  grid-template-rows: 70px 1fr;
  min-height: 100vh;
}

.sidebar {
  grid-area: sidebar;
  background: #0f172a;
  color: #fff;
  padding: 24px;
}

.header {
  grid-area: header;
  background: #ffffff;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 32px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.05);
}

.main-content {
  grid-area: main;
  background: #f8fafc;
  padding: 32px;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 20px;
}

.card {
  background: #ffffff;
  border-radius: 16px;
  padding: 24px;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
}
\`\`\``,
    exercises: `### ✍️ 3. Mustaqil Mashqlar & Mini-Task (25 daqiqa)

1. **3 Ustunli Kurslar Kartochkasi:**
   - Auto-fit Grid yordamida 6 ta o‘quv kursi kartochkasini joylashtiring.
2. **Flexbox Modal Dialog:**
   - Ekranning qoq markazida turuvchi (\`justify-content: center; align-items: center;\`) dialog oynasi yarating.
3. **Sidebar Kollaps Rejimi:**
   - Kichik ekranlarda (\`@media (max-width: 768px)\`) sidebarni yashirib, to‘liq 1 ustunli mobil ko‘rinishga o‘tkazing.`,
    homework: `### 🏠 4. Uyga Vazifa & Portfolio Topshirig‘i

- **Vazifa:** Al-Xorazmiy Vorislari platformasi uchun **"O‘quvchilar Dars Jadvali va Reytingi"** sahifasini Flexbox va CSS Grid kombinatsiyasi bilan ishlab chiqing.
- **Talablar:**
  1. Header va foydalanuvchi avatari Flexbox bilan tekislansin.
  2. Haftalik dars jadvali Grid orqali 6 kunga bo‘lingan holda chiqsin.
  3. Barcha o‘lchamlarda (Smartfon, Planshet, Noutbuk) sahifa gorizontal siljishsiz (no horizontal scroll) moslashsin.`,
    durationMinutes: 80,
    status: 'PUBLISHED',
    isTemplate: true,
    createdAt: new Date().toISOString(),
    presentationSlides: `# 🚀 1. CSS Grid & Flexbox orqali Responsiv Dizayn
**Muhammad Al-Xorazmiy Vorislari • 8-sinf Web Dasturlash**
- **Fan:** Web Full-Stack Development
- **Format:** 80 daqiqalik intensiv ma'ruza va amaliyot
- **Kutilayotgan natija:** 1D va 2D zamonaviy maketlash orqali professional interfeyslar qurish.

> [!NOTE]
> Flexbox — komponentlar ichki tuzilishi uchun, CSS Grid esa sahifaning umumiy arxitekturasi uchun eng yaxshi vositadir!

> 🎙️ **Spiker izohi:** "Float va Table bilan dizayn qilish tarixi" haqida 1 daqiqa qiziqarli solishtirish keltiring.
---
# 🧠 2. Flexbox Tamoyillari va Asosiy O'qlar
- **Main Axis (Asosiy o'q):** \`justify-content\` (flex-start, center, space-between).
- **Cross Axis (Ko'ndalang o'q):** \`align-items\` (stretch, center, flex-end).
- **O'qni almashtirish:** \`flex-direction: column\` orqali mobil menyular yaratish.

\`\`\`css
.navbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 2rem;
}
\`\`\`

> 🎙️ **Spiker izohi:** DevTools-dagi kichik binafsha "flex" nishonini bosib, o'qlarni ekranda ko'rsating.
---
# ⚡ 3. CSS Grid: 2D To'rlar va Grid-Template
- **Ustunlar:** \`grid-template-columns: repeat(3, 1fr);\`
- **Responsive Auto-Fit:** Media-querysiz toza moslashuvchanlik:

\`\`\`css
.gallery {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: 1.5rem;
}
\`\`\`

> 🎙️ **Spiker izohi:** Brauzer oynasini kichraytirib-kattalashtirib, kartochkalar qanday avtomatik qayta joylashishini ko'rsating.
---
# 💡 4. Grid Areas orqali Katta Skeletlarni Qurlash
- Kod o'qilishini osonlashtiruvchi nomlangan sohalar:

\`\`\`css
.dashboard {
  display: grid;
  grid-template-areas:
    "sidebar header"
    "sidebar content";
  grid-template-columns: 250px 1fr;
}
\`\`\`

> [!TIP]
> \`gap\` xususiyati marginlarning bir-biriga yopishib qolish muammosini butunlay hal qiladi!

> 🎙️ **Spiker izohi:** Grid Areas sxemasini doskada chizib tushuntiring.
---
# 💻 5. Amaliy Laboratoriya: IT Hub Dashboard (25 daqiqa)
**Vazifa:**
- 3 ustunli axborot kartochkalari va o'ng tarafda doimiy yon panel (Sidebar) quring.
- Kartochkalar ichida rasm, sarlavha va baholar joylashsin.
- Telefon ekranida 1 ustunga aylanadigan qilib moslang.

> 🎙️ **Spiker izohi:** O'quvchilarda \`minmax()\` qiymati to'g'ri berilganligini tekshirib chiqing.
---
# 🎯 6. Dars Xulosasi, Test va Uyga Vazifa
- **O'rganildi:** Flexbox 1D va CSS Grid 2D maketlash tamoyillari.
- **Oraliq test:** Platformadagi 2-mavzu nazorat testini topshiring.
- **Uyga vazifa:** O'zingiz yoqtirgan saytning (masalan, YouTube yoki GitHub) bosh sahifasini CSS Grid bilan klonlash!

> 🎙️ **Spiker izohi:** Muvaffaqiyatli dars uchun barchaga minnatdorchilik bildiring.`,
  },

  // 3. 8-sinf: JavaScript ES6+ & DOM
  {
    id: 3,
    title: 'JavaScript ES6+, DOM Manipulyatsiyasi va Hodisalar',
    subject: 'Web Full-Stack Development',
    gradeLevel: '8-sinf',
    topic: 'DOM API, ES6 Arrow Functions, Event Listeners va Dynamic UI',
    learningObjectives: 'DOM elementlarini tanlash (`querySelector`), dinamik yaratish (`createElement`), hodisalarni tinglash (`addEventListener`) va ES6+ sintaksisidan foydalanish',
    expectedOutcomes: 'O‘quvchilar sahifani qayta yuklamasdan ma’lumotlarni qo‘shish, o‘chirish va tahrirlash imkoniyatiga ega Todo / Mini-Ilova tuza oladilar',
    requiredMaterials: 'VS Code, Browser Console, Node.js muhiti',
    theoryDurationMinutes: 20,
    theoryContent: `### 🎯 1. Nazariy Tushuncha: DOM nima?

DOM (Document Object Model) — bu HTML hujjatning JavaScript tomonidan o‘qilishi va boshqarilishi mumkin bo‘lgan **daraxtsimon ob’ektlar modelidir**.

#### ES6+ Zamonaviy Imkoniyatlari:
- **\`const\` va \`let\`:** Blokli ko‘rish sohasi (Block scope).
- **Arrow Functions:** Qisqa va toza funksiyalar: \`const add = (a, b) => a + b;\`
- **Template Literals:** O‘zgaruvchilarni matn ichida ifodalash: \`\`\` \`Salom, \${userName}!\` \`\`\`
- **Destructuring:** Ob’ekt va massivlarni oson ajratish: \`const { name, score } = student;\`

#### Asosiy DOM Metodlari:
\`\`\`javascript
// 1. Elementlarni qidirish
const submitBtn = document.querySelector('#submit-btn');
const allCards = document.querySelectorAll('.card');

// 2. Element yaratish va kiritish
const newBadge = document.createElement('span');
newBadge.className = 'badge badge-primary';
newBadge.textContent = 'Yangi Dars!';
document.querySelector('#container').appendChild(newBadge);

// 3. Hodisalar (Events)
submitBtn.addEventListener('click', (event) => {
  event.preventDefault(); // Sahifa qayta yuklanishini to'xtatish
  console.log('Tugma bosildi!');
});
\`\`\``,
    practicalDurationMinutes: 25,
    practicalContent: `### 💻 2. Amaliyot: Interaktiv Vazifalar Boshqaruvi (Todo App)

\`\`\`javascript
// app.js
const taskInput = document.querySelector('#task-input');
const addTaskBtn = document.querySelector('#add-task-btn');
const taskList = document.querySelector('#task-list');

// Vazifalar ro'yxati (State)
let tasks = [];

function renderTasks() {
  taskList.innerHTML = '';

  tasks.forEach((task, index) => {
    const li = document.createElement('li');
    li.className = 'flex items-center justify-between p-3 bg-white rounded-xl shadow-xs';
    li.innerHTML = \`
      <span class="\${task.completed ? 'line-through text-gray-400' : 'text-gray-900'} font-medium">
        \${task.text}
      </span>
      <div class="flex gap-2">
        <button onclick="toggleTask(\${index})" class="text-xs bg-emerald-500 text-white px-2 py-1 rounded-md">
          \${task.completed ? 'Qaytarish' : 'Bajarildi'}
        </button>
        <button onclick="deleteTask(\${index})" class="text-xs bg-rose-500 text-white px-2 py-1 rounded-md">
          O'chirish
        </button>
      </div>
    \`;
    taskList.appendChild(li);
  });
}

function addTask() {
  const text = taskInput.value.trim();
  if (!text) return;

  tasks.push({ text, completed: false });
  taskInput.value = '';
  renderTasks();
}

addTaskBtn.addEventListener('click', addTask);
taskInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') addTask();
});
\`\`\``,
    exercises: `### ✍️ 3. Mustaqil Mashqlar (25 daqiqa)

1. **LocalStorage integratsiyasi:**
   - Yozilgan vazifalarni brauzer xotirasiga (\`localStorage.setItem('tasks', JSON.stringify(tasks))\`) saqlab, sahifa yangilanganda qayta tiklang.
2. **Qidiruv filteri:**
   - Bajarilgan va bajarilmagan vazifalarni alohida ajratib ko‘rsatuvchi 3 ta tugma (Barchasi, Bajarilgan, Kutilmoqda) qo‘shing.
3. **Hisoblagich (Counter):**
   - Ekranning yuqorisida "Jami: X ta, Bajarildi: Y ta" statistikasini dinamik yangilang.`,
    homework: `### 🏠 4. Uyga Vazifa

- **Vazifa:** Al-Xorazmiy Vorislari uchun **"O‘quvchilar Baho Kalkulyatori va Reyting Ro‘yxati"** interaktiv mini-ilovasini to‘liq JavaScript-da yozing.
- **Talablar:**
  1. O‘quvchi ismi va ballini kiritganda, ro‘yxatga avtomatik qo‘shilsin.
  2. O‘rtacha ballni real vaqt rejimida hisoblab tursin.
  3. GitHub repozitoriyasiga joylab, havolasini platformaga yuklang.`,
    durationMinutes: 80,
    status: 'PUBLISHED',
    isTemplate: true,
    createdAt: new Date().toISOString(),
    presentationSlides: `# 🚀 1. JavaScript ES6+ va DOM Manipulyatsiyasi
**Muhammad Al-Xorazmiy Vorislari • 8-sinf Web Dasturlash**
- **Fan:** Web Full-Stack Development
- **Format:** 80 daqiqalik dars metodikasi
- **Kutilayotgan natija:** Interaktiv veb-sahifalar, hodisalar va dinamik interfeys yaratish.

> [!NOTE]
> HTML — bu suyak, CSS — bu libos, JavaScript esa veb-sahifaning jonli yuragi va harakatlantiruvchi kuchidir!

> 🎙️ **Spiker izohi:** Qaysi mashhur saytlar JavaScript-siz umuman ishlamasligini so'rang (Netflix, Telegram Web, Instagram).
---
# 🧠 2. DOM (Document Object Model) nima?
- Daraxtsimon tizim: Har bir teg — JavaScript ob'ekti.
- Xususiyatlarni o'zgartirish: \`element.style\`, \`element.textContent\`, \`element.classList\`.

\`\`\`javascript
const title = document.querySelector('h1');
title.textContent = 'Salom Al-Xorazmiy!';
title.classList.add('text-primary');
\`\`\`

> 🎙️ **Spiker izohi:** Konsolda \`console.dir(document.body)\` buyrug'ini terib, minglab ob'ekt xususiyatlarini namoyish qiling.
---
# ⚡ 3. Hodisalar (Events) va Tinglovchilar
- **\`addEventListener\`:** Foydalanuvchi harakatini doimo kutib turish.
- Hodisa turlari: \`click\`, \`input\`, \`submit\`, \`keydown\`, \`scroll\`.

\`\`\`javascript
const btn = document.querySelector('#myBtn');
btn.addEventListener('click', (e) => {
  console.log('Tugma bosilgan koordinatalar:', e.clientX, e.clientY);
});
\`\`\`

> 🎙️ **Spiker izohi:** Hodisalar mexanizmini qo'ng'iroq chalinishiga o'xshatib tushuntiring.
---
# 💡 4. ES6+ Qulayliklari: Toza va Qisqa Kod
- **Template Literals:** O'zgaruvchilarni matnga qo'shish: \`\`\` \`Ball: \${score}\` \`\`\`
- **Arrow Functions:** \`const multiply = (x, y) => x * y;\`
- **Array Metodlari:** \`map()\`, \`filter()\`, \`reduce()\`.

> [!TIP]
> Doimo \`const\` ishlating, faqat qiymati o'zgarishi kerak bo'lgan holatdagina \`let\` ga o'ting. \`var\` dan umuman voz keching!

> 🎙️ **Spiker izohi:** ES6 sintaksisi kod hajmini 2 barobargacha qisqartirishini ko'rsating.
---
# 💻 5. Amaliy Laboratoriya: Interaktiv Todo Ro'yxati (25 daqiqa)
**Vazifa:**
- Yangi vazifa qo'shish, o'chirish va bajarilganini belgilash imkoniyatini yarating.
- Elementlar dinamik ravishda \`document.createElement\` orqali qo'shilsin.
- Vazifalar sonini ko'rsatuvchi hisoblagich qo'ying.

> 🎙️ **Spiker izohi:** O'quvchilarga \`event.preventDefault()\` nima uchun kerakligini amalda ko'rsating.
---
# 🎯 6. Dars Xulosasi, Test va Uyga Vazifa
- **O'rganildi:** DOM daraxti, \`querySelector\`, hodisalar va ES6 funksiyalari.
- **Oraliq test:** Mavzu yuzasidan interaktiv testni topshiring.
- **Uyga vazifa:** Bajarilgan vazifalarni brauzerning \`localStorage\` xotirasiga saqlash funksiyasini yozish!

> 🎙️ **Spiker izohi:** Darsni qiziqarli savol-javob bilan yakunlang.`,
  },

  // 4. 8-sinf: Python Asoslari & Algoritmlar
  {
    id: 4,
    title: 'Python Dasturlash Asoslari, Algoritmlar va Big-O Tahlili',
    subject: 'Algorithms & Computer Science',
    gradeLevel: '8-sinf',
    topic: 'Python Sintaksisi, List, Dict, Algoritmik Murakkablik va Binary Search',
    learningObjectives: 'Pythonda ma’lumotlar tuzilmalaridan samarali foydalanish, algoritmlarning vaqt va xotira murakkabligini (Big-O) hisoblash va Ikkilik qidiruv (Binary Search) algoritmini mustaqil yozish',
    expectedOutcomes: 'O‘quvchilar $O(n)$ va $O(\\log n)$ orasidagi farqni tushunib, 1 millionta elementdan iborat massivdan bir necha millisoniyada qidiruv qila oladilar',
    requiredMaterials: 'Python 3.12+, VS Code, Python Interactive Terminal',
    theoryDurationMinutes: 20,
    theoryContent: `### 🎯 1. Nazariy Tushuncha: Algoritmik Fikrlash va Big-O

Algoritm — bu qo‘yilgan masalani yechish uchun bajarilishi zarur bo‘lgan qat’iy, chekli ketma-ketlikdagi ko‘rsatmalar to‘plamidir.

#### Big-O Asimptotik Murakkablik Darajalari:
- **$O(1)$ — O‘zgarmas (Constant):** Massiv indeksiga murojaat qilish, dictionary kalitini o‘qish.
- **$O(\\log n)$ — Logarifmik:** Ikkilik qidiruv (Binary Search). Har bir qadamda qidiruv sohasini 2 barobar qisqartiradi.
- **$O(n)$ — Chiziqli (Linear):** Oddiy qidiruv (Linear Search), for sikli.
- **$O(n^2)$ — Kvadratik:** Ichma-ich 2 ta for sikli (Bubble Sort).

> [!NOTE]
> Agar massivda 1 000 000 ta element bo‘lsa:
> - Oddiy chiziqli qidiruv eng yomon holatda **1 000 000 marta** taqqoslash bajaradi.
> - Ikkilik qidiruv (Binary Search) esa eng yomon holatda bor-yo‘g‘i **20 marta** taqqoslash bilan natijani topadi! ($(\\log_2(1\\,000\\,000) \\approx 20$).`,
    practicalDurationMinutes: 25,
    practicalContent: `### 💻 2. Amaliyot: Ikkilik Qidiruv (Binary Search) Algoritmi

\`\`\`python
# binary_search.py

def binary_search(arr: list[int], target: int) -> int:
    """
    Saralangan massivdan target qiymatining indeksini qaytaradi.
    Agar topilmasa, -1 qaytaradi.
    Vaqt murakkabligi: O(log n)
    """
    left = 0
    right = len(arr) - 1
    step_count = 0

    while left <= right:
        step_count += 1
        mid = (left + right) // 2
        guess = arr[mid]

        if guess == target:
            print(f"Topildi! Jami bajarilgan qadamlar soni: {step_count}")
            return mid
        elif guess < target:
            left = mid + 1  # O'ng tomondan qidiramiz
        else:
            right = mid - 1 # Chap tomondan qidiramiz

    print(f"Topilmadi. Jami qadamlar soni: {step_count}")
    return -1

# Sinov:
numbers = sorted([12, 45, 2, 89, 34, 67, 23, 90, 101, 5, 78])
print("Saralangan massiv:", numbers)

target_val = 67
result_index = binary_search(numbers, target_val)
print(f"Qiymat {target_val} indeksi: {result_index}")
\`\`\``,
    exercises: `### ✍️ 3. Mustaqil Mashqlar (25 daqiqa)

1. **Rekursiv Ikkilik Qidiruv:**
   - Yuqoridagi while siklini rekursiv funksiya ko‘rinishida qayta yozing.
2. **Talabalar Reyting Lug‘ati (Dictionary):**
   - 5 ta talabaning ismlari va baholarini saqlovchi dict tuzing. Eng yuqori ball to‘plagan talabani topuvchi $O(n)$ funksiya yozing.
3. **Kvadrat Ildizni Binary Search bilan topish:**
   - Berilgan musbat $X$ sonining butun kvadrat ildizini $O(\\log X)$ vaqt ichida hisoblang.`,
    homework: `### 🏠 4. Uyga Vazifa

- **Vazifa:** LeetCode platformasidan **704. Binary Search** va **35. Search Insert Position** masalalarini Pythonda yechib, kodini va qabul qilingan skrinshotini tizimga yuboring.`,
    durationMinutes: 80,
    status: 'PUBLISHED',
    isTemplate: true,
    createdAt: new Date().toISOString(),
    presentationSlides: `# 🚀 1. Python Dasturlash Asoslari & Algoritmlar
**Muhammad Al-Xorazmiy Vorislari • 8-sinf Algoritmlar**
- **Fan:** Computer Science & Algorithms
- **Format:** 80 daqiqalik dars metodikasi
- **Kutilayotgan natija:** Algoritmik murakkablik tushunchasi va samarali qidiruv algoritmlari.

> [!NOTE]
> Buyuk ajdodimiz Muhammad Al-Xorazmiy asos solgan "Algoritm" tushunchasi bugungi kunda jahon texnologiyalarining poydevoridir!

> 🎙️ **Spiker izohi:** Al-Xorazmiy haqida va uning hisoblash fani rivojiga qo'shgan hissasi haqida qisqa kirish qiling.
---
# 🧠 2. Big-O: Dastur Tezligini Qanday O'lchaymiz?
- Vaqt soniyalarda emas, balki kiritilgan ma'lumot hajmi ($N$) ortishi bilan **amallar soni** qanday o'sishi bilan o'lchanadi.
- $O(1) < O(\\log N) < O(N) < O(N \\log N) < O(N^2) < O(2^N)$

\`\`\`text
Amallar soni
 ^
 |             / O(N^2)
 |            /
 |           /   O(N)
 |          /_________ O(log N)
 |         /__________ O(1)
 +-------------------------> Ma'lumot hajmi (N)
\`\`\`

> 🎙️ **Spiker izohi:** Nima uchun bitta kod 1 sekundda, boshqasi esa 1 yilda ishlashi mumkinligini tushuntiring.
---
# ⚡ 3. Ikkilik Qidiruv (Binary Search) Mo'jizasi
- Shart: Massiv albatta **saralangan (sorted)** bo'lishi shart!
- Har bir taqqoslashda qidiruv hududining 50 foizi olib tashlanadi.

\`\`\`python
def binary_search(arr, target):
    l, r = 0, len(arr) - 1
    while l <= r:
        mid = (l + r) // 2
        if arr[mid] == target: return mid
        elif arr[mid] < target: l = mid + 1
        else: r = mid - 1
    return -1
\`\`\`

> 🎙️ **Spiker izohi:** Telefon kitobidan ism qidirishda kitobni o'rtasidan ochish misolini keltiring.
---
# 💡 4. Pythonda Ma'lumotlar Tuzilmalari: List vs Dict
- **List (Massiv):** Indeks orqali murojaat qilish — $O(1)$, elementni ichidan qidirish — $O(N)$.
- **Dictionary (Lug'at / Hash Map):** Kalit bo'yicha qidirish, qo'shish va o'chirish — o'rtacha $O(1)$!

> [!TIP]
> Tezkor qidiruv talab etiladigan joylarda doimo Dictionary yoki Set-dan foydalaning!

> 🎙️ **Spiker izohi:** Hash jadval qanday ishlashini javondagi raqamlangan qutilar orqali tushuntiring.
---
# 💻 5. Amaliy Laboratoriya: Katta Ma'lumotlarda Qidiruv (25 daqiqa)
**Vazifa:**
- 100 000 ta tasodifiy sonlardan iborat massiv yarating va saralang.
- Linear Search bilan Binary Search vaqtlarini \`time\` moduli yordamida o'lchab, taqqoslang.
- Natijani konsolga chiqaring.

> 🎙️ **Spiker izohi:** Ikkala algoritm natijasini ekranda yonma-yon solishtirib bering.
---
# 🎯 6. Dars Xulosasi, Test va Uyga Vazifa
- **O'rganildi:** Big-O notatsiyasi, Python massivlari va Binary Search.
- **Oraliq test:** Mavzu bo'yicha oraliq nazorat testini topshiring.
- **Uyga vazifa:** LeetCode platformasidan berilgan 2 ta algoritmik masalani yechish.

> 🎙️ **Spiker izohi:** Algoritmik fikrlash dasturchining eng asosiy quroli ekanligini ta'kidlang.`,
  },

  // 5. 9-sinf: React.js Komponentlar & Hooks
  {
    id: 5,
    title: 'React.js Komponent Arxitekturasi, Virtual DOM va Hooks',
    subject: 'Frontend Frameworks & UI',
    gradeLevel: '9-sinf',
    topic: 'React deklarativ UI, Virtual DOM, useState va useEffect Lifecycle',
    learningObjectives: 'React kutubxonasining ishlash mexanizmi, JSX sintaksisi, reaktiv holat boshqaruvi (`useState`) va yon ta’sirlarni (`useEffect`) boshqarish',
    expectedOutcomes: 'O‘quvchilar komponentlarga asoslangan, qayta ishlatiluvchi va tezkor yuklanuvchi bir sahifali ilovalar (SPA) qura oladilar',
    requiredMaterials: 'Node.js 20+, Vite, React 19, VS Code',
    theoryDurationMinutes: 20,
    theoryContent: `### 🎯 1. Nazariy Tushuncha: Nega React.js?

Oddiy Vanilla JS-da har bir DOM elementini o‘zimiz qo‘lda o‘zgartiramiz (Imperativ).
React-da esa interfeys **holatga (State)** bog‘liq holda avtomatik chiziladi (Deklarativ):
$$\\text{UI} = f(\\text{state})$$

#### Virtual DOM va Reconciliation:
React haqiqiy brauzer DOM-iga har bir harakatda murojaat qilmaydi (chunki Real DOM operatsiyalari og‘ir). Buning o‘rniga:
1. Xotirada yengil Virtual DOM nusxasini yaratadi.
2. State o‘zgarganda yangi Virtual DOM bilan eskisini solishtiradi (Diffing algoritmi).
3. Faqatgina o‘zgargan nuqtani (Patch) Real DOM-ga birdaniga o‘tkazadi.

#### Asosiy React Hooklari:
- **\`useState\`:** Komponent ichidagi reaktiv holatni saqlash.
- **\`useEffect\`:** API-dan ma’lumot olish, timerlar va tashqi hodisalarga ulanish.`,
    practicalDurationMinutes: 25,
    practicalContent: `### 💻 2. Amaliyot: O‘quvchi Baholari Analitik Komponenti

\`\`\`tsx
import React, { useState, useEffect } from 'react';

interface StudentScore {
  id: number;
  name: string;
  score: number;
}

export const ScoreTracker: React.FC = () => {
  const [students, setStudents] = useState<StudentScore[]>([
    { id: 1, name: 'Sardorbek', score: 92 },
    { id: 2, name: 'Madinabonu', score: 98 },
  ]);
  const [nameInput, setNameInput] = useState('');
  const [scoreInput, setScoreInput] = useState<number>(85);

  const averageScore = students.length > 0
    ? Math.round(students.reduce((acc, s) => acc + s.score, 0) / students.length)
    : 0;

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nameInput.trim()) return;

    setStudents((prev) => [
      ...prev,
      { id: Date.now(), name: nameInput.trim(), score: scoreInput },
    ]);
    setNameInput('');
  };

  return (
    <div className="p-6 bg-slate-900 text-white rounded-3xl max-w-md mx-auto space-y-4">
      <div className="flex justify-between items-center border-b border-slate-800 pb-3">
        <h2 className="text-lg font-bold">O'quvchilar Reytingi</h2>
        <span className="text-xs bg-emerald-500/20 text-emerald-400 px-3 py-1 rounded-full font-bold">
          O'rtacha: {averageScore}%
        </span>
      </div>

      <form onSubmit={handleAdd} className="space-y-2">
        <input
          value={nameInput}
          onChange={(e) => setNameInput(e.target.value)}
          placeholder="O'quvchi ismi..."
          className="w-full p-2.5 rounded-xl bg-slate-800 text-sm border-0"
        />
        <button type="submit" className="w-full p-2.5 rounded-xl bg-primary font-bold text-sm">
          Qo'shish
        </button>
      </form>

      <ul className="space-y-2">
        {students.map((s) => (
          <li key={s.id} className="flex justify-between p-2.5 bg-slate-800 rounded-xl text-xs">
            <span>{s.name}</span>
            <span className="font-bold text-emerald-400">{s.score} ball</span>
          </li>
        ))}
      </ul>
    </div>
  );
};
\`\`\``,
    exercises: `### ✍️ 3. Mustaqil Mashqlar (25 daqiqa)

1. **Delete & Edit funksiyalari:**
   - Ro‘yxatdagi har bir talabani o‘chirish (\`filter\`) tugmasini qo‘shing.
2. **Auto-Save to LocalStorage:**
   - \`useEffect\` yordamida o‘quvchilar ro‘yxati o‘zgarganda uni brauzer xotirasiga avtomatik yozib boring.
3. **Qidiruv filtri:**
   - Input orqali faqat ismi mos kelgan talabalarni ko‘rsatuvchi filter komponentini qo‘shing.`,
    homework: `### 🏠 4. Uyga Vazifa

- **Vazifa:** Vite + React yordamida Al-Xorazmiy Vorislari uchun **"Valyuta Konvertori va Jonli Kripto Kurslari"** ilovasini yarating.
- **Talablar:**
  1. API-dan haqiqiy kurslarni \`fetch\` orqali oling.
  2. Yuklanish holatini (Loading spinner) chiroyli ko‘rsating.
  3. Loyihani Vercel yoki Netlify-ga deploy qilib, live linkini yuboring.`,
    durationMinutes: 80,
    status: 'PUBLISHED',
    isTemplate: true,
    createdAt: new Date().toISOString(),
    presentationSlides: `# 🚀 1. React.js Komponent Arxitekturasi va Hooks
**Muhammad Al-Xorazmiy Vorislari • 9-sinf Frontend Dasturlash**
- **Fan:** Frontend Frameworks & Modern UI
- **Format:** 80 daqiqalik dars metodikasi
- **Kutilayotgan natija:** Deklarativ UI, Virtual DOM va zamonaviy React Hooks.

> [!NOTE]
> React dunyodagi eng ommabop UI kutubxonasi bo'lib, uning yordamida Meta, Netflix, Airbnb kabi gigantlar o'z interfeyslarini boshqaradi!

> 🎙️ **Spiker izohi:** Sahifa qayta yuklanmasdan o'zgarishi (SPA) foydalanuvchiga mobil ilovadek tezkor tuyulishini ayting.
---
# 🧠 2. Virtual DOM va Diffing Algoritmi
- Brauzerning Real DOM-i bilan to'g'ridan-to'g'ri ishlash sekin.
- React xotirada Virtual DOM daraxtini ushlab turadi.
- O'zgarish bo'lganda faqatgina farq qiluvchi (Diff) qism yangilanadi.

\`\`\`text
[ State o'zgardi ]
        |
        v
[ Yangi Virtual DOM ] <--- Solishtirish (Diff) ---> [ Eski Virtual DOM ]
        |
        v
[ Faqat farq qilgan 1 ta tugma Real DOM-ga o'tkaziladi ]
\`\`\`

> 🎙️ **Spiker izohi:** Butun devorni buzib qaytadan qurmasdan, faqat singan bitta g'ishtni almashtirishga o'xshatib tushuntiring.
---
# ⚡ 3. useState va useEffect: Reaktivlikning Yuragi
- **\`useState\`:** O'zgaruvchi va uni yangilovchi funksiya juftligi.
- **\`useEffect\`:** Komponent ochilganda yoki biror qiymat o'zgarganda ishga tushuvchi kod.

\`\`\`tsx
const [count, setCount] = useState<number>(0);

useEffect(() => {
  console.log(\`Hisoblagich o'zgardi: \${count}\`);
  document.title = \`Bosildi: \${count}\`;
}, [count]);
\`\`\`

> 🎙️ **Spiker izohi:** \`setCount(count + 1)\` chaqirilganda React qanday qilib komponentni qayta chizishini (re-render) ko'rsating.
---
# 💡 4. Toza Komponentlar (Clean Components) Standarti
1. **Yagona javobgarlik (Single Responsibility):** Bitta komponent faqat bitta vazifani bajarsin.
2. **Props orqali aloqa:** Ota komponentdan bolaga ma'lumot uzatish.
3. **Immutability:** Massiv va ob'ektlarni \`push\` qilmang, doimo yangi nusxa (\`[...prev, newItem]\`) qaytaring.

> [!TIP]
> Holatni o'zgartirganda asl massivni buzmaslik (immutability) React ilovalaringizni xatolardan himoya qiladi!

> 🎙️ **Spiker izohi:** Nega \`students.push()\` ishlashi mumkin emasligini amalda ko'rsating.
---
# 💻 5. Amaliy Laboratoriya: Interaktiv Dashboard (25 daqiqa)
**Vazifa:**
- Talabalar ro'yxati, yangi talaba kiritish formasi va o'rtacha ball kalkulyatorini React-da yozing.
- Holat o'zgarganda statistika avtomatik hisoblansin.
- Chiroyli Tailwind CSS uslublarini qo'llang.

> 🎙️ **Spiker izohi:** O'quvchilar ekranidagi kodlarni tekshirib, xatoliklarini to'g'rilang.
---
# 🎯 6. Dars Xulosasi, Test va Uyga Vazifa
- **O'rganildi:** React asoslari, JSX, useState va useEffect.
- **Oraliq test:** 5-mavzu bo'yicha platformadagi testni yeching.
- **Uyga vazifa:** Valyuta konvertori ilovasini yaratib, Vercel-ga deploy qilish!

> 🎙️ **Spiker izohi:** Darsni qizg'in savol-javob bilan yakunlang.`,
  },

  // 6. 10-sinf: REST API & PostgreSQL
  {
    id: 6,
    title: 'REST API Arxitekturasi, HTTP Metodlar va PostgreSQL',
    subject: 'Backend & Database Engineering',
    gradeLevel: '10-sinf',
    topic: 'REST Standartlari, HTTP Status Kodlari, SQL So‘rovlar va PostgreSQL',
    learningObjectives: 'RESTful API tamoyillari (Stateless, Resource-based URI), HTTP metodlari (GET, POST, PUT, DELETE), SQL relyatsion ma’lumotlar bazasi va CRUD operatsiyalari',
    expectedOutcomes: 'O‘quvchilar frontend va mobil ilovalar uchun xavfsiz, tezkor va standartlarga to‘liq mos keluvchi backend API-larini loyihalay oladilar',
    requiredMaterials: 'PostgreSQL 16, pgAdmin / DBeaver, Postman / Insomnia, Spring Boot / Node.js',
    theoryDurationMinutes: 20,
    theoryContent: `### 🎯 1. Nazariy Tushuncha: REST API Falsafasi

REST (Representational State Transfer) — mijoz (Client) va server o‘rtasida ma’lumot almashish uchun eng keng tarqalgan me’moriy uslubdir.

#### HTTP Metodlari va Ularning Vazifalari:
- **\`GET /api/v1/lessons\`**: Ma’lumotlarni o‘qish (Xavfsiz, ma’lumotni o‘zgartirmaydi).
- **\`POST /api/v1/lessons\`**: Yangi resurs yaratish.
- **\`PUT /api/v1/lessons/{id}\`**: Mavjud resursni to‘liq yangilash.
- **\`PATCH /api/v1/lessons/{id}\`**: Resursning faqat ma’lum maydonlarini qisman yangilash.
- **\`DELETE /api/v1/lessons/{id}\`**: Resursni o‘chirish.

#### Standart HTTP Status Kodlari:
- **200 OK**: Muvaffaqiyatli bajarildi.
- **201 Created**: Yangi resurs yaratildi.
- **400 Bad Request**: Yuborilgan ma’lumotda validatsiya xatosi bor.
- **401 Unauthorized**: Foydalanuvchi tizimga kirmagan (Token yo‘q).
- **403 Forbidden**: Huquq yetarli emas (Masalan: o‘quvchi mentor paneliga kirmoqchi).
- **404 Not Found**: Qidirilgan resurs topilmadi.
- **500 Internal Server Error**: Server ichidagi kutilmagan xatolik.`,
    practicalDurationMinutes: 25,
    practicalContent: `### 💻 2. Amaliyot: PostgreSQL Jadvali va SQL So‘rovlar

\`\`\`sql
-- 1. O'quvchilar va Baholashlar jadvallarini yaratish
CREATE TABLE IF NOT EXISTS students (
    id SERIAL PRIMARY KEY,
    full_name VARCHAR(150) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    grade_level VARCHAR(20) NOT NULL,
    xp_points INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS assessment_attempts (
    id SERIAL PRIMARY KEY,
    student_id INT REFERENCES students(id) ON DELETE CASCADE,
    assessment_title VARCHAR(200) NOT NULL,
    score INT NOT NULL CHECK (score >= 0 AND score <= 100),
    passed BOOLEAN NOT NULL,
    submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Ma'lumot qo'shish (INSERT)
INSERT INTO students (full_name, email, grade_level, xp_points)
VALUES ('Jahongir Olimov', 'jahongir@axvhub.uz', '10-sinf', 1250);

-- 3. JOIN orqali tahliliy so'rov (SELECT)
SELECT 
    s.id,
    s.full_name,
    s.grade_level,
    COUNT(a.id) AS total_quizzes,
    ROUND(AVG(a.score), 1) AS average_score
FROM students s
LEFT JOIN assessment_attempts a ON s.id = a.student_id
GROUP BY s.id, s.full_name, s.grade_level
ORDER BY average_score DESC;
\`\`\``,
    exercises: `### ✍️ 3. Mustaqil Mashqlar (25 daqiqa)

1. **Postman orqali API testlash:**
   - Postman vositasida backend API-ning barcha 5 ta metodiga (GET, POST, PUT, DELETE, PATCH) so‘rovlar yuborib, JSON javoblarini tekshiring.
2. **SQL Indekslar (Indexes):**
   - \`email\` va \`created_at\` ustunlariga B-Tree indekslar yaratib, millionlab qatorlarda qidiruv tezligini oshirishni sinang.
3. **Foreign Key Cheklovlari:**
   - Talaba o‘chirilganda uning barcha urinishlari avtomatik tozalanishi (\`ON DELETE CASCADE\`) xususiyatini tekshiring.`,
    homework: `### 🏠 4. Uyga Vazifa

- **Vazifa:** Al-Xorazmiy Vorislari platformasining **"Kitoblar va O‘quv Resurslari Kutubxonasi"** uchun PostgreSQL sxemasi va unga xizmat qiluvchi CRUD REST API kontrollerini ishlab chiqing.
- **Talablar:**
  1. Swagger / OpenAPI hujjatlashtirishini ulang.
  2. SQL so‘rovlar faylini (\`schema.sql\`) GitHub repozitoriyasiga joylang.`,
    durationMinutes: 80,
    status: 'PUBLISHED',
    isTemplate: true,
    createdAt: new Date().toISOString(),
    presentationSlides: `# 🚀 1. REST API Arxitekturasi va PostgreSQL
**Muhammad Al-Xorazmiy Vorislari • 10-sinf Backend Engineering**
- **Fan:** Backend & Database Systems
- **Format:** 80 daqiqalik dars metodikasi
- **Kutilayotgan natija:** REST standartlari, HTTP status kodlari va PostgreSQL ma'lumotlar bazasi.

> [!NOTE]
> Har bir zamonaviy mobil va veb-ilova ortida minglab so'rovlarni bir soniyada qayta ishlay oluvchi baquvvat backend va relyatsion baza turadi!

> 🎙️ **Spiker izohi:** Telegram yoki Instagram orqali rasm yuborganingizda backend nima ishlarni amalga oshirishini ayting.
---
# 🧠 2. REST API Tamoyillari va HTTP Metodlar
- **Statelessness:** Har bir so'rov o'zida barcha kerakli ma'lumotlarni saqlashi kerak (Server sessiyani eslab o'tirmaydi).
- **Resource-Oriented:** URL fe'llardan emas, otlardan iborat bo'lishi shart:
  - ✅ \`GET /api/v1/students\`
  - ❌ \`GET /api/v1/getStudents\`

\`\`\`text
+----------+   GET /api/v1/students   +----------+
|          | -----------------------> |          |
| Frontend |                          | Backend  |
| (Mijoz)  | <----------------------- | (Server) |
+----------+      200 OK [JSON]       +----------+
\`\`\`

> 🎙️ **Spiker izohi:** REST arxitekturasi butun dunyo dasturchilari o'rtasidagi umumiy til ekanligini ayting.
---
# ⚡ 3. HTTP Status Kodlari: Xatoliklarni Tushunish
- **2xx (Muvaffaqiyat):** \`200 OK\`, \`201 Created\`
- **4xx (Mijoz xatosi):** \`400 Bad Request\`, \`401 Unauthorized\`, \`404 Not Found\`
- **5xx (Server xatosi):** \`500 Internal Server Error\`

> [!TIP]
> Foydalanuvchiga hech qachon 500 xatosini ko'rsatmang! Xatolikni doimo ushlab olib, tushunarli 400 xabari bilan javob qaytaring.

> 🎙️ **Spiker izohi:** "404 Not Found" xatosini hamma ko'rgan, endi uning sababini texnik tushunish vaqti keldi.
---
# 💡 4. Relyatsion Baza (RDBMS) va SQL Mo'jizasi
- Jadvallar orasidagi munosabatlar: One-to-Many, Many-to-Many.
- Ma'lumotlar butunligi: Primary Key, Foreign Key va Unique cheklovlari.

\`\`\`sql
SELECT s.full_name, COUNT(a.id) as tests_passed
FROM students s
JOIN assessment_attempts a ON s.id = a.student_id
WHERE a.score >= 60
GROUP BY s.full_name;
\`\`\`

> 🎙️ **Spiker izohi:** JOIN operatsiyasini ikki to'plamning kesishmasi (Venn diagrammasi) orqali tushuntiring.
---
# 💻 5. Amaliy Laboratoriya: REST API & SQL (25 daqiqa)
**Vazifa:**
- PostgreSQL bazasida o'quvchilar va darslar jadvalini yarating.
- Postman orqali yangi o'quvchi qo'shish (POST) va ro'yxatni olish (GET) so'rovlarini bajaring.
- Natijalarni tahlil qiling.

> 🎙️ **Spiker izohi:** Postmanda JSON formati to'g'ri yozilganligini tekshirib bering.
---
# 🎯 6. Dars Xulosasi, Test va Uyga Vazifa
- **O'rganildi:** REST API tamoyillari, status kodlar va SQL so'rovlar.
- **Oraliq test:** Modul bo'yicha oraliq testni topshiring.
- **Uyga vazifa:** Kutubxona ma'lumotlar bazasi sxemasini ishlab chiqib, repozitoriyaga joylash.

> 🎙️ **Spiker izohi:** Darsni savol-javob bilan yakunlang.`,
  },

  // 7. 11-sinf: Sun'iy Intellekt & Prompt Engineering
  {
    id: 7,
    title: 'Sun’iy Intellekt, Prompt Engineering va LLM Integratsiyasi',
    subject: 'Artificial Intelligence & Data Science',
    gradeLevel: '11-sinf',
    topic: 'Katta Til Modellari (LLM), Prompt Engineering, API Integratsiyasi va AI Agentlar',
    learningObjectives: 'Generativ AI ishlash tamoyillari, prompt injiniringi qoidalari (Few-shot, Chain-of-Thought) va dasturiy ilovalarga sun’iy intellekt API-larini integratsiya qilish',
    expectedOutcomes: 'O‘quvchilar dars taqdimotlarini, kod tahlilini va o‘quvchilarga avtomatik mentorlik qiluvchi aqlli AI agentlarini ishlab chiqa oladilar',
    requiredMaterials: 'Python 3.12, OpenAI / Gemini API Key, VS Code, LangChain / SDK',
    theoryDurationMinutes: 20,
    theoryContent: `### 🎯 1. Nazariy Tushuncha: Generativ AI va LLM

Generativ Sun’iy Intellekt (Generative AI) — mavjud ulkan matnlar, kodlar va ma’lumotlar bazasida o‘qitilgan neyron to‘rlarga asoslanadi (Transformer arxitekturasi).

#### Prompt Engineering Asosiy Tamoyillari:
1. **Rol va Kontekst Berish (System Prompt):**
   - *"Siz Muhammad Al-Xorazmiy nomidagi maktabning oliy toifali Senior Python mentorsiz..."*
2. **Few-Shot Prompting (Misollar berish):**
   - Modelga kutilgan natija formatini bir-ikkita aniq namunalar orqali ko‘rsatish.
3. **Chain-of-Thought (Fikrlash zanjiri):**
   - Modelga to‘g‘ridan-to‘g‘ri javob berishni emas, balki *"Bosqichma-bosqich fikrlang va har bir qadamni tushuntiring"* deb buyruq berish.
4. **Qat’iy Format (Structured Output):**
   - Javobni JSON yoki Markdown ko‘rinishida talab qilish.`,
    practicalDurationMinutes: 25,
    practicalContent: `### 💻 2. Amaliyot: AI Dars Taqdimoti Generatori (Python & API)

\`\`\`python
# ai_presentation_generator.py
import os
import requests

def generate_lesson_presentation(topic: str, grade: str) -> str:
    """
    Sun'iy Intellekt yordamida 80 daqiqalik dars uchun
    pedagogik boyitilgan slaydlar to'plamini yaratadi.
    """
    prompt = f"""
    Siz O'zbekiston Respublikasi Prezident maktablari va Al-Xorazmiy Vorislari
    dasturining oliy toifali pedagogik metodistisiz.
    
    Quyidagi mavzu bo'yicha dars taqdimotini Markdown formatida, har bir slaydni '---' bilan ajratib yozing:
    - Sinf: {grade}
    - Mavzu: {topic}
    
    Har bir slaydda sarlavha (#), asosiy tezislar (-), kod namunasi (\`\`\`...\`\`\`)
    va o'qituvchi uchun metodik izoh (> 🎙️ **Spiker izohi:** ...) bo'lishi shart!
    """

    api_url = "https://api.openai.com/v1/chat/completions" # yoki Gemini endpoint
    headers = {
        "Authorization": f"Bearer {os.getenv('AI_API_KEY')}",
        "Content-Type": "application/json"
    }
    payload = {
        "model": "gpt-4o-mini",
        "messages": [
            {"role": "system", "content": "Siz ilg'or AI ta'lim yordamchisisiz."},
            {"role": "user", "content": prompt}
        ],
        "temperature": 0.7
    }

    response = requests.post(api_url, headers=headers, json=payload)
    result = response.json()
    return result["choices"][0]["message"]["content"]

# Namuna:
slides = generate_lesson_presentation("Kiberxavfsizlik va Kriptografiya", "11-sinf")
print(slides)
\`\`\``,
    exercises: `### ✍️ 3. Mustaqil Mashqlar (25 daqiqa)

1. **AI Kod Tahlilchisi (Code Reviewer):**
   - O‘quvchi yozgan koddagi xatolarni topib, uni tozalovchi va optimallashtiruvchi Prompt yarating.
2. **AI Quiz Generatori:**
   - Ixtiyoriy berilgan mavzudan 5 ta variantli test savollarini JSON formatida chiqaruvchi tizim promptini ishlab chiqing.
3. **Halusinatsiyani kamaytirish:**
   - Model bilmagan narsasini to‘qib chiqarmasligi uchun \`temperature=0.2\` va *"Faqat berilgan manbaga tayaning"* cheklovini qo‘llang.`,
    homework: `### 🏠 4. Uyga Vazifa

- **Vazifa:** Al-Xorazmiy Vorislari platformasi uchun **"O‘quvchilar Savollariga Javob Beruvchi AI Mentor"** Telegram botini yoki veb-vidjetini yarating.
- **Talablar:**
  1. O‘quvchining yoshi va sinfiga mos tilda tushuntirsin.
  2. Barcha kod misollarini sintaksis bilan formatlasin.
  3. Loyiha kodini GitHub repozitoriyasiga yuklang.`,
    durationMinutes: 80,
    status: 'PUBLISHED',
    isTemplate: true,
    createdAt: new Date().toISOString(),
    presentationSlides: `# 🚀 1. Sun'iy Intellekt va Prompt Engineering
**Muhammad Al-Xorazmiy Vorislari • 11-sinf AI Dasturlash**
- **Fan:** AI & Data Science
- **Format:** 80 daqiqalik dars metodikasi
- **Kutilayotgan natija:** Generativ AI, Prompt Engineering va amaliy AI integratsiyasi.

> [!NOTE]
> Sun'iy intellekt dasturchilarning o'rnini egallamaydi, lekin sun'iy intellektdan unumli foydalana oladigan dasturchilar boshqalarni ortda qoldiradi!

> 🎙️ **Spiker izohi:** Bugungi kunda AI vositalari (GitHub Copilot, ChatGPT) dasturchilar unumdorligini 55% ga oshirganini ayting.
---
# 🧠 2. Katta Til Modellari (LLM) Qanday Ishlaydi?
- Model "fikrlamaydi" — u ulkan ehtimollar nazariyasi orqali keyingi eng mos so'zni (Token) bashorat qiladi.
- Kontekst darchasi (Context Window): Model bir vaqtda xotirasida ushlab tura oladigan matn hajmi.

\`\`\`text
[ Kiritilgan savol ] ---> [ Tokenizatsiya ] ---> [ Neyron Qatlamlar ] ---> [ Eng ehtimolli javob ]
\`\`\`

> 🎙️ **Spiker izohi:** Smartfon klaviaturasidagi so'z taklif qiluvchi tizimning million marta murakkablashgan varianti ekanligini ayting.
---
# ⚡ 3. Prompt Engineering Oltin Qoidalari
1. **Aniq rol belgilang:** "Siz Senior dasturchisiz..."
2. **Qat'iy format talab qiling:** "Faqat JSON formatda chiqaring..."
3. **Misollar keltiring (Few-Shot):** Kutilgan kirish va chiqish namunalari.

\`\`\`markdown
> [!IMPORTANT]
> Noaniq savolga noaniq javob olinadi! Prompt qanchalik aniq va cheklovlar bilan boyitilgan bo'lsa, natija shunchalik mukammal bo'ladi.
\`\`\`

> 🎙️ **Spiker izohi:** Bir xil savolga oddiy va professional prompt bilan berilgan javoblarni solishtirib bering.
---
# 💡 4. Chain-of-Thought (Fikrlash Zanjiri)
- Murakkab masalalarda modelga to'g'ridan-to'g'ri yakuniy javobni emas, balki qadam-baqadam yechimni yozishni buyuring.
- Bu matematik va mantiqiy xatoliklarni 80% gacha kamaytiradi!

> 🎙️ **Spiker izohi:** Odam ham qiyin misolni birdan miyasida emas, qog'ozda bosqichma-bosqich yechishini misol qiling.
---
# 💻 5. Amaliy Laboratoriya: AI Dars Yordamchisi (25 daqiqa)
**Vazifa:**
- Dars mavzusini kiritganda, unga oid amaliy laboratoriya topshirig'ini tuzib beruvchi Prompt yarating.
- Kod xatolarini tekshiruvchi promptni sinab ko'ring.
- Natijalarni tahlil qiling.

> 🎙️ **Spiker izohi:** O'quvchilar yozgan promptlarni birgalikda takomillashtiring.
---
# 🎯 6. Dars Xulosasi, Test va Uyga Vazifa
- **O'rganildi:** LLM arxitekturasi, Prompt Engineering uslublari.
- **Oraliq test:** AI mavzusidagi nazorat testini topshiring.
- **Uyga vazifa:** O'quvchilar savollariga javob beruvchi AI Telegram botini kodlash!

> 🎙️ **Spiker izohi:** Darsni qiziqarli xulosa bilan yakunlang.`,
  },

  // 8. 11-sinf: Global Freelance & Upwork
  {
    id: 8,
    title: 'Global Freelance, Upwork Profil Standarti va G‘olib Proposal',
    subject: 'Career & Global Freelancing',
    gradeLevel: '11-sinf',
    topic: 'Upwork, Fiverr, Xalqaro IT Bozor, Mijozlar bilan Muzokara va Valyutada Daromad',
    learningObjectives: 'Xalqaro IT bozoriga chiqish, Upwork platformasida 100% to‘liq va tasdiqlangan profil yaratish, g‘olib taklifnomalar (Proposals) yozish va xavfsiz to‘lovlar',
    expectedOutcomes: 'O‘quvchilar O‘zbekistonda turib global bozorda mustaqil ravishda birinchi xalqaro IT buyurtmalarini olish va valyutada daromad topish ko‘nikmasiga ega bo‘ladilar',
    requiredMaterials: 'Upwork akkaunt, Ingliz tilidagi Rezyume / Portfolio, GitHub / Behance',
    theoryDurationMinutes: 20,
    theoryContent: `### 🎯 1. Nazariy Tushuncha: Nega Global Freelance?

O‘zbekiston Respublikasi Prezidentining PQ-3274 qaroriga asosan, yoshlarimiz xalqaro IT xizmatlar eksportini oshirishi va dunyo bozorida raqobatbardosh bo‘lishi ustuvor vazifadir.

#### Upwork 100% Profil Standarti:
1. **Professional Profil Sarlavhasi (Title):**
   - ❌ *"Web Developer"* (Juda umumiy)
   - ✅ *"Full-Stack React & Node.js Developer | REST APIs & High-Performance UIs"* (Aniq va nishaga yo‘naltirilgan)
2. **Overview (Tavsif) Strukturasi:**
   - Birinchi 2 qator: Mijozning asosiy og‘rig‘i va unga taklif qilinayotgan yechim.
   - Ko‘nikmalar ro‘yxati (Tech Stack) va erishilgan natijalar.
   - Call-to-Action (CTA): *"Keling, loyihangizni bepul 15 daqiqalik qo‘ng‘iroqda muhokama qilamiz!"*
3. **Portfolio:** Kamida 3 ta real, ishlayotgan jonli demo va video-sharhga ega loyihalar.

#### G‘olib Proposal (Taklifnoma) Strukturasi:
- Standart shablonlardan qat’iyan voz keching!
- Mijozning loyihasi haqidagi 1 ta aniq muammosiga darhol yechim bering.
- Oldin shunga o‘xshash loyihada bajargan ishingiz havolasini ilova qiling.`,
    practicalDurationMinutes: 25,
    practicalContent: `### 💻 2. Amaliyot: G‘olib Proposal Namunasini Yozish

\`\`\`markdown
Hi [Mijoz ismi yoki 'there'],

I reviewed your project about building a responsive dashboard for student analytics with React and Tailwind CSS, and I can deliver a clean, fast-loading solution for you within 4 days.

Here is how I will approach your project:
1. Setup a clean component architecture with Tailwind CSS (100% responsive across mobile & desktop).
2. Connect your REST API endpoints with robust error handling and loading skeletons.
3. Optimize Core Web Vitals to ensure 95+ score on Google Lighthouse.

Recently, I built a similar educational dashboard for Al-Xorazmiy Vorislari:
- Live Demo: https://axvhub-demo.vercel.app
- GitHub Repo: https://github.com/myusername/axvhub-dashboard

Are you available for a quick 10-minute chat today to discuss your preferred color palette and API specifications?

Best regards,
Alisher Navoiy
Full-Stack Web Developer
\`\`\``,
    exercises: `### ✍️ 3. Mustaqil Mashqlar (25 daqiqa)

1. **Profil Auditi:**
   - O‘zaro juftlikda bir-biringizning Upwork / LinkedIn profilingizni o‘rganib, kamchiliklarini qayd eting.
2. **Simulyatsion Mijoz bilan Suhbat:**
   - Mijoz sizga *"Nega sizni tanlashim kerak, narxingiz boshqalardan qimmatroq-ku?"* deganida beriladigan professional javobni yozing.
3. **Mijoz Talablarini Tahlil Qilish:**
   - Upwork-dagi real ish e’lonini o‘qib, uning yashirin ehtiyojlarini (Pain points) aniqlang.`,
    homework: `### 🏠 4. Uyga Vazifa

- **Vazifa:** Upwork va LinkedIn profillaringizni 100% to‘liq to‘ldiring, kamida 2 ta loyiha keysini qo‘shing va 1 ta real e’longa taklifnoma yozib, mentorga tekshirtiring.`,
    durationMinutes: 80,
    status: 'PUBLISHED',
    isTemplate: true,
    createdAt: new Date().toISOString(),
    presentationSlides: `# 🚀 1. Global Freelance va Upwork Standartlari
**Muhammad Al-Xorazmiy Vorislari • 11-sinf Karyera va Xalqaro Bozor**
- **Fan:** Career & Global Freelancing
- **Format:** 80 daqiqalik amaliy dars metodikasi
- **Kutilayotgan natija:** Upwork, xalqaro mijozlar bilan muloqot va valyutada daromad.

> [!NOTE]
> Global IT bozori chegaralarni bilmaydi. O'zbekistonda, Yangiariqda turib AQSH, Buyuk Britaniya va Yevropa kompaniyalariga xizmat ko'rsatish har bir bitiruvchimizning maqsadidir!

> 🎙️ **Spiker izohi:** O'zbekistonlik yoshlarning Upwork-da soatiga $30-50 topayotgan real misollarini keltiring.
---
# 🧠 2. 100% Mukammal Profil Formulasi
- **Profil sarlavhasi (Title):** Aniq va nishalangan.
- **Profil rasmi:** Professional, samimiy va yorug' fonda.
- **Overview matni:** O'zingiz haqingizda emas, mijozning muammosini qanday yechishingiz haqida!

\`\`\`text
Mijoz profilni ko'rganda 3 soniya ichida qaror qiladi:
[ Rasm + Sarlavha ] ---> [ Dastlabki 2 qator ] ---> [ Portfoliodagi 1 ta rasm ]
\`\`\`

> 🎙️ **Spiker izohi:** "Men dasturchiman, hamma narsani bilaman" degan yondashuv ish bermasligini tushuntiring.
---
# ⚡ 3. G'olib Proposal (Taklifnoma) Yozish San'ati
- Hech qachon umumiy shablon (Copy-Paste) yubormang!
- Mijoz nomini aniqlashga harakat qiling (Sharhlardan o'qib).
- Birinchi jumladanoq uning muammosiga aniq texnik yechim bering.

> [!TIP]
> Proposal oxirida mijozni javob berishga undovchi ochiq savol bering: "Qaysi to'lov tizimini integratsiya qilmoqchisiz?"

> 🎙️ **Spiker izohi:** Qanday qilib 50 ta taklif orasidan birinchi bo'lib e'tiborni tortish sirlarini ayting.
---
# 💡 4. Mijoz bilan Video-Muloqot va Xavfsiz To'lovlar
- **Escrow himoyasi:** Upwork mijoz mablag'ini muzlatib qo'yganiga ishonch hosil qilmasdan ishni boshlamang!
- **Professional ingliz tili:** Qisqa, aniq va xushmuomala suhbat.
- **Overdelivering:** Kutilgandan biroz ko'proq natija berish — 5 yulduzli sharh kafolati!

> 🎙️ **Spiker izohi:** Birinchi 5 yulduzli sharh keyingi barcha buyurtmalar eshigini ochishini ayting.
---
# 💻 5. Amaliy Laboratoriya: Proposal Simulyatsiyasi (25 daqiqa)
**Vazifa:**
- Haqiqiy Upwork e'lonini tanlang.
- Unga moslashtirilgan g'olib taklifnoma yozing.
- Mentor bilan birga tahlil qilib, tuzating.

> 🎙️ **Spiker izohi:** O'quvchilar yozgan taklifnomalarni ekranga chiqarib, kuchli va zaif tomonlarini ko'rsating.
---
# 🎯 6. Dars Xulosasi, Test va Uyga Vazifa
- **O'rganildi:** Upwork profili, taklifnoma yozish va xalqaro muloqot.
- **Oraliq test:** Mavzu yuzasidan testni topshiring.
- **Uyga vazifa:** Upwork profilingizni to'ldirib, birinchi loyiha keysini joylashtirish!

> 🎙️ **Spiker izohi:** Har bir o'quvchiga muvaffaqiyatli xalqaro karyera tilab darsni yakunlang.`,
  },
];
