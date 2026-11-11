import React, { useState, useMemo } from 'react';
import {
  BookOpen,
  Code,
  Terminal,
  Globe,
  Shield,
  Database,
  Smartphone,
  Cpu,
  CheckCircle2,
  Play,
  Clock,
  Layers,
  ArrowRight,
  Zap,
  Briefcase,
  Search,
  Sparkles,
  Award,
  GraduationCap,
  Laptop,
  X,
  Info,
  Calendar,
  Rocket,
  Building2,
  FolderGit2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { useTranslation } from '@/shared/i18n';
import { AiPresentationModal } from './lessons/AiPresentationModal';

export interface CurriculumTopic {
  title: string;
  desc: string;
}

export interface CurriculumItem {
  id: string;
  grade: '8' | '9-10' | '11';
  gradeLabel: string;
  trackNumber: string;
  title: string;
  category: string;
  hours: number | string;
  level: string;
  description: string;
  prerequisites: string;
  techStack: { name: string; color?: string }[];
  topics: CurriculumTopic[];
  projects: string[];
  outcomes: string[];
  weeklyPlan: { phase: string; title: string; focus: string }[];
  careerRoles: string[];
  gradient: string;
  icon: React.ComponentType<{ className?: string }>;
}

export const CURRICULUM_DATA: CurriculumItem[] = [
  // ----------------------------------------------------
  // GRADE 8: FOUNDATION
  // ----------------------------------------------------
  {
    id: 'cs-foundation',
    grade: '8',
    gradeLabel: '8-sinf',
    trackNumber: '01',
    title: 'Computer Science Foundation',
    category: 'IT Poydevori',
    hours: '36 soat',
    level: 'Boshlang‘ich',
    description:
      'Kompyuter texnologiyalari arxitekturasi, operatsion tizimlar, Linux terminali, kiberxavfsizlik va algoritmik mantiq.',
    prerequisites: 'Boshlang‘ich kompyuter savodxonligi va mantiqiy fikrlash',
    techStack: [
      { name: 'Hardware & OS' },
      { name: 'Linux CLI' },
      { name: 'Git & GitHub' },
      { name: 'Flowgorithm' },
      { name: 'Markdown' },
      { name: 'Kiber-gigiyena' },
    ],
    topics: [
      {
        title: 'Kompyuter & Operatsion Tizimlar',
        desc: 'Kompyuter tuzilishi, apparat ta’minoti, xotira turlari, fayllar tizimi va Windows/Linux muhitlari.',
      },
      {
        title: 'CLI Terminal & Fayllar Boshqaruvi',
        desc: 'Linux buyruqlar satri, fayl va kataloglar ustida amallar, ruxsatlar (permissions) va avtomatlashtirish.',
      },
      {
        title: 'Internet & Bulut Arxitekturasi',
        desc: 'TCP/IP protokollari, HTTP/HTTPS, DNS xizmati, serverlar va zamonaviy bulut xizmatlari asoslari.',
      },
      {
        title: 'Git & GitHub Versiyalar Nazorati',
        desc: 'Repozitoriyalar, commits, branchlar, push/pull operatsiyalari va jamoaviy kod bilan ishlash madaniyati.',
      },
      {
        title: 'Raqamli Xavfsizlik & Kiber-gigiyena',
        desc: 'Parollar xavfsizligi, ikki bosqichli autentifikatsiya (2FA), fishingdan himoyalanish va shaxsiy ma’lumotlar muhofazasi.',
      },
      {
        title: 'Algoritmik Mantiq & Flowgorithm',
        desc: 'Chiziqli, tarmoqlanuvchi va takrorlanuvchi algoritmlar, blok-sxemalar va vizual modellashtirish.',
      },
    ],
    projects: [
      'Konsol kalkulyatori va valyuta konvertori',
      'O‘quvchilar reytingini hisoblovchi algoritmik tizim',
      'Mini-bankomat (ATM) mantiqiy simulyatori',
      'Interaktiv bilimni sinovchi viktorina dasturi',
    ],
    outcomes: [
      'Algoritmik fikrlash va masalalarni bosqichma-bosqich yechish ko‘nikmasi',
      'Linux terminali va Git versiyalar nazorati bilan mustaqil ishlash',
      'Dasturlash tillarini chuqur o‘rganish uchun zarur bo‘lgan mustahkam poydevor',
    ],
    weeklyPlan: [
      { phase: '1–3-hafta', title: 'Kompyuter arxitekturasi & Linux', focus: 'Terminal buyruqlari, fayl tizimlari va apparat qismlari' },
      { phase: '4–6-hafta', title: 'Internet protokollari & Git', focus: 'Web arxitekturasi, Git buyruqlari va GitHub repozitoriyalari' },
      { phase: '7–9-hafta', title: 'Kiber-gigiyena & Xavfsizlik', focus: 'Shifrlash asoslari, parollar siyosati va tizim auditi' },
      { phase: '10–12-hafta', title: 'Algoritmlar & Flowgorithm', focus: 'Blok-sxemalar, sikllar va mini-loyihalar taqdimoti' },
    ],
    careerRoles: ['Junior IT Specialist', 'Systems Assistant', 'Junior QA Intern'],
    gradient: 'from-blue-600 to-indigo-600',
    icon: Terminal,
  },
  {
    id: 'web-fullstack',
    grade: '8',
    gradeLabel: '8-sinf',
    trackNumber: '02',
    title: 'Web Full-Stack Development',
    category: 'Veb Dasturlash',
    hours: '66 soat',
    level: 'Boshlang‘ich–O‘rta',
    description:
      'Zamonaviy web-texnologiyalar orqali real mahsulot, interaktiv UI va Django backend tizimlarini yaratish.',
    prerequisites: 'Computer Science Foundation moduli',
    techStack: [
      { name: 'HTML5' },
      { name: 'CSS3 / Flexbox' },
      { name: 'JavaScript ES6+' },
      { name: 'Python 3' },
      { name: 'Django' },
      { name: 'PostgreSQL' },
      { name: 'REST API' },
      { name: 'Vercel / Render' },
    ],
    topics: [
      {
        title: 'Interaktiv UI: Semantik HTML5 & CSS3',
        desc: 'Semantik teglar, responsiv dizayn (Flexbox, CSS Grid), mobil moslashuv va zamonaviy CSS effektlari.',
      },
      {
        title: 'JavaScript ES6+ & DOM Boshqaruvi',
        desc: 'Hodisalar (Events), DOM elementlarini dinamik boshqarish, asinxronlik (Async/Await) va Fetch API.',
      },
      {
        title: 'Python Dasturlash & OOP Printsiplari',
        desc: 'Sintaksis, funksiyalar, obyektga yo‘naltirilgan dasturlash (OOP), modullar va ma’lumotlar tuzilmalari.',
      },
      {
        title: 'Django Freymvorki & Backend Mantiq',
        desc: 'MVT (Model-View-Template) arxitekturasi, marshrutlash (routing), admin-panel va formalar bilan ishlash.',
      },
      {
        title: 'PostgreSQL & SQL Ma’lumotlar Bazasi',
        desc: 'Jadvallar yaratish, relyatsiyalar (One-to-Many, Many-to-Many), SQL so‘rovlar va Django ORM.',
      },
      {
        title: 'REST API & Production Deployment',
        desc: 'RESTful arxitektura, JSON ma’lumot almashinuvi, Vercel va Render platformalariga deploy qilish.',
      },
    ],
    projects: [
      'Shaxsiy portfolio va rezyume veb-sayti',
      'Maktab elektron kutubxonasi va baholash portali',
      'TechShop — to‘liq funksional internet-do‘kon prototipi',
      'Interaktiv ob-havo va valyuta kurslari veb-ilovasi',
    ],
    outcomes: [
      'Frontend va Backend qismlarini to‘liq bog‘lagan holda ishlaydigan veb-sayt yaratish',
      'PostgreSQL ma’lumotlar bazasi bilan xavfsiz va tezkor ishlash',
      'O‘z loyihalarini internetga (production) muvaffaqiyatli joylashtirish',
    ],
    weeklyPlan: [
      { phase: '1–4-hafta', title: 'HTML5 & Zamonaviy CSS3', focus: 'Semantika, responsiv layout, Flexbox & Grid' },
      { phase: '5–8-hafta', title: 'JavaScript & Interaktivlik', focus: 'DOM manipulyatsiyasi, hodisalar va Fetch API' },
      { phase: '9–14-hafta', title: 'Python & Django Backend', focus: 'OOP, MVT arxitektura, PostgreSQL va REST API' },
      { phase: '15–18-hafta', title: 'Capstone Loyiha & Deploy', focus: 'TechShop veb-ilovasini yaratish va internetga deploy qilish' },
    ],
    careerRoles: ['Junior Web Developer', 'Frontend Trainee', 'Full-Stack Intern'],
    gradient: 'from-indigo-600 to-cyan-600',
    icon: Code,
  },

  // ----------------------------------------------------
  // GRADE 9–10: 9 TA ZAMONAVIY IT YO‘NALISHI
  // ----------------------------------------------------
  {
    id: 'game-dev',
    grade: '9-10',
    gradeLabel: '9–10-sinf',
    trackNumber: '01',
    title: 'Game Development',
    category: 'O‘yin Dasturlash',
    hours: '102 soat',
    level: 'O‘rta–Kengaytirilgan',
    description:
      'Unity va Unreal Engine, C# tili, 2D platformerlar va 3D o‘yin fizikasi mexanikalarini noldan yaratish.',
    prerequisites: '8-sinf Web va Algoritmlar bazasi',
    techStack: [
      { name: 'Unity 3D' },
      { name: 'Unreal Engine' },
      { name: 'C#' },
      { name: '2D/3D Physics' },
      { name: 'Blender asoslari' },
    ],
    topics: [
      { title: 'C# O‘yin Dasturlash Asoslari', desc: 'OOP, o‘yin obyektlari mantiqi, hodisalar va komponentlar tuzilishi.' },
      { title: 'Unity Muhiti & Game Engine', desc: 'Scenes, Prefabs, Transforms, Assets ombori va kamerani boshqarish.' },
      { title: 'Fizika Mexanikasi & To‘qnashuvlar', desc: 'Rigidbody, Colliders, Raycasting, tortishish kuchi va harakat mantiqi.' },
      { title: 'Dushmanlar Sun’iy Intellekti (AI)', desc: 'NavMesh yo‘l topish algoritmlari, patrullash va holatlar mashinasi (FSM).' },
      { title: 'O‘yin UI, Ovoz & Particle Effects', desc: 'Salomatlik paneli, inventar, ovoz effektlari va vizual portlashlar.' },
      { title: 'Build & Optimallashtirish', desc: 'WebGL va PC uchun eksport, freymlar sonini (FPS) optimallashtirish.' },
    ],
    projects: [
      '2D Pixel Adventure platformer o‘yini',
      '3D Survival / Maze Runner o‘yini',
      'Tarixiy Al-Xorazmiy mavzusidagi edukativ qiziqarli o‘yin',
    ],
    outcomes: [
      'To‘liq o‘ynaladigan 2D va 3D o‘yin loyihalarini yaratish va nashr qilish',
      'C# tilida murakkab o‘yin logikasi va fizikasini dasturlash',
    ],
    weeklyPlan: [
      { phase: '1–6-hafta', title: 'C# va Unity asoslari', focus: 'Sintaksis, scene boshqaruvi va 2D harakatlar' },
      { phase: '7–14-hafta', title: '2D Platformer ishlab chiqish', focus: 'Fizika, animatsiyalar, UI va dushmanlar' },
      { phase: '15–22-hafta', title: '3D O‘yinlar & Fizika', focus: '3D koordinatalar, yoritish va NavMesh AI' },
      { phase: '23–26-hafta', title: 'Bitiruv Loyihasi & Eksport', focus: 'WebGL eksporti va itch.io platformasida taqdimot' },
    ],
    careerRoles: ['Junior Game Developer', 'Unity C# Programmer', 'Gameplay Scripter'],
    gradient: 'from-orange-500 to-amber-600',
    icon: Play,
  },
  {
    id: 'ai-ml',
    grade: '9-10',
    gradeLabel: '9–10-sinf',
    trackNumber: '02',
    title: 'AI & Machine Learning',
    category: 'Sun’iy Intellekt',
    hours: '102 soat',
    level: 'O‘rta–Kengaytirilgan',
    description:
      'Python, mashinali o‘rganish algoritmlari, kompyuter nigohi (CV), katta til modellari (LLM) va amaliy AI.',
    prerequisites: 'Python dasturlash va chiziqli algebra asoslari',
    techStack: [
      { name: 'Python 3' },
      { name: 'NumPy' },
      { name: 'Pandas' },
      { name: 'Scikit-Learn' },
      { name: 'OpenCV' },
      { name: 'HuggingFace & LLMs' },
    ],
    topics: [
      { title: 'Python for Data & AI', desc: 'NumPy massivlari, Pandas ma’lumotlar freymlari va ma’lumotlarni tozalash.' },
      { title: 'Supervised Learning', desc: 'Chiziqli va logistik regressiya, qarorlar daraxti (Decision Trees), tasniflash.' },
      { title: 'Unsupervised Learning', desc: 'K-Means klasterlash, PCA o‘lchovlarni qisqartirish va anomaliyalarni aniqlash.' },
      { title: 'Kompyuter Nigohi (Computer Vision)', desc: 'OpenCV kutubxonasi, yuz va obyektlarni aniqlash, tasvirlarni qayta ishlash.' },
      { title: 'Katta Til Modellari & Prompt Engineering', desc: 'OpenAI, HuggingFace, RAG texnologiyasi va maxsus botlar qurish.' },
      { title: 'AI Model Deployment', desc: 'FastAPI yordamida ML modellarini web-servis sifatida ishga tushirish.' },
    ],
    projects: [
      'O‘quvchilar akademik o‘zlashtirishini bashorat qiluvchi ML modeli',
      'Kamera orqali yuz va imo-ishoralarni taniydigan ilova',
      'Muhammad Al-Xorazmiy AI repetitor-yordamchi boti',
    ],
    outcomes: [
      'Real ma’lumotlar asosida ML modellarini o‘qitish va baholash',
      'Zamonaviy AI APIlarini amaliy veb-ilovalarga integratsiya qilish',
    ],
    weeklyPlan: [
      { phase: '1–6-hafta', title: 'Ma’lumotlar bilan ishlash', focus: 'NumPy, Pandas va statistik tahlil' },
      { phase: '7–13-hafta', title: 'Klassik Machine Learning', focus: 'Regressiya, tasniflash va model metrikalari' },
      { phase: '14–19-hafta', title: 'Computer Vision & Tasvirlar', focus: 'OpenCV yordamida yuz va harakat aniqlash' },
      { phase: '20–26-hafta', title: 'Generative AI & LLM integratsiyasi', focus: 'RAG arxitekturasi va AI assistent' },
    ],
    careerRoles: ['Junior ML Engineer', 'AI Solutions Assistant', 'Data Science Intern'],
    gradient: 'from-cyan-500 to-blue-600',
    icon: Cpu,
  },
  {
    id: 'data-analytics',
    grade: '9-10',
    gradeLabel: '9–10-sinf',
    trackNumber: '03',
    title: 'Data Analytics & BI',
    category: 'Ma’lumotlar Tahlili',
    hours: '102 soat',
    level: 'O‘rta',
    description:
      'SQL, Python Pandas, PowerBI va Tableau orqali katta ma’lumotlar bazalarini tahlil qilish va vizualizatsiya.',
    prerequisites: '8-sinf SQL va Python asoslari',
    techStack: [
      { name: 'SQL (PostgreSQL)' },
      { name: 'Python (Pandas)' },
      { name: 'PowerBI' },
      { name: 'Tableau' },
      { name: 'Advanced Excel' },
    ],
    topics: [
      { title: 'Chuqur SQL & Murakkab So‘rovlar', desc: 'JOINlar, agregat funksiyalar, oynali funksiyalar (Window functions) va subqueries.' },
      { title: 'Ma’lumotlarni Tozalash (Data Wrangling)', desc: 'Yetishmayotgan ma’lumotlarni tiklash, anomaliyalarni filtrlash va formatlash.' },
      { title: 'Statistik Tahlil & Gipotezalar', desc: 'Korrelyatsiya, taqsimotlar, trendlar va biznes KPIlarini hisoblash.' },
      { title: 'Interaktiv PowerBI Boshqaruv Panellari', desc: 'DAX formulalari, munosabatlar va real vaqtda yangilanuvchi dashboardlar.' },
      { title: 'Ma’lumotlar Storytelling madaniyati', desc: 'Tahliliy xulosalarni rahbariyat va mijozlarga vizual taqdim etish san’ati.' },
    ],
    projects: [
      'Maktablar tarmog‘i davomati va o‘zlashtirish tahliliy dashboardi',
      'Elektron tijorat do‘koni uchun savdo va daromad hisoboti',
      'IT mehnat bozori va maoshlar dinamikasi bo‘yicha tahliliy tadqiqot',
    ],
    outcomes: [
      'Murakkab SQL so‘rovlari orqali har qanday biznes ma’lumotini tahlil qilish',
      'PowerBI orqali interaktiv va professional analitik panellar qurish',
    ],
    weeklyPlan: [
      { phase: '1–6-hafta', title: 'Advanced SQL & Bazalar', focus: 'PostgreSQL, jadvallar va JOIN so‘rovlar' },
      { phase: '7–13-hafta', title: 'Python bilan Ma’lumotlar tahlili', focus: 'Pandas, Seaborn va vizualizatsiya' },
      { phase: '14–20-hafta', title: 'PowerBI va DAX', focus: 'Interaktiv dashboardlar va KPI ko‘rsatkichlari' },
      { phase: '21–26-hafta', title: 'Biznes Analitika Loyihasi', focus: 'Real korxona ma’lumotlari asosida tahlil' },
    ],
    careerRoles: ['Junior Data Analyst', 'BI Developer Trainee', 'Operations Analyst'],
    gradient: 'from-emerald-500 to-teal-600',
    icon: Database,
  },
  {
    id: 'cyber-security',
    grade: '9-10',
    gradeLabel: '9–10-sinf',
    trackNumber: '04',
    title: 'Cyber Security & Defense',
    category: 'Kiberxavfsizlik',
    hours: '102 soat',
    level: 'O‘rta–Kengaytirilgan',
    description:
      'Tarmoq xavfsizligi, Ethical Hacking, OWASP Top 10 zaifliklari va himoya protokollarini o‘rganish.',
    prerequisites: 'Linux terminali va tarmoq protokollari asoslari',
    techStack: [
      { name: 'Kali Linux' },
      { name: 'Wireshark' },
      { name: 'Burp Suite' },
      { name: 'Nmap' },
      { name: 'OWASP Top 10' },
      { name: 'Cryptography' },
    ],
    topics: [
      { title: 'Tarmoq Protokollari & Analiz', desc: 'TCP/IP, OSI modeli, DNS, paketlarni Wireshark orqali tahlil qilish.' },
      { title: 'Zaifliklarni Skanerlash & Audit', desc: 'Nmap, portlarni skanerlash, tizim konfiguratsiyasi zaifliklarini aniqlash.' },
      { title: 'Web Xavfsizlik: OWASP Top 10', desc: 'SQL Injection, XSS (Cross-Site Scripting), CSRF va autentifikatsiya xatolarini tuzatish.' },
      { title: 'Kriptografiya & Shifrlash', desc: 'Simmetrik/Assimmetrik shifrlash, hashing algoritmlari, SSL/TLS sertifikatlari.' },
      { title: 'Server Himoyasi & Xavfsizlik Siyosati', desc: 'Firewall (UFW, iptables), IDS/IPS tizimlari va xavfsizlik auditi protokoli.' },
    ],
    projects: [
      'Web-ilovalardagi zaifliklarni avtomatlashtirilgan audit qiluvchi skaner',
      'Lokal tarmoqdagi shubhali paketlarni aniqlovchi xavfsizlik monitori',
      'Shaxsiy shifrlangan parollar ombori (Password Vault)',
    ],
    outcomes: [
      'Tizim va veb-ilovalardagi xavfsizlik tirqishlarini professional aniqlash',
      'Himoyalangan infratuzilma va axborot xavfsizligi madaniyatini shakllantirish',
    ],
    weeklyPlan: [
      { phase: '1–6-hafta', title: 'Tarmoqlar & Wireshark', focus: 'Paketlar tahlili va tarmoq protokollari' },
      { phase: '7–13-hafta', title: 'Ethical Hacking & Skanerlash', focus: 'Nmap, Burp Suite va tizim zaifliklari' },
      { phase: '14–20-hafta', title: 'OWASP Top 10 Web Himoyasi', focus: 'SQLi, XSS va veb-ilova xavfsizligi' },
      { phase: '21–26-hafta', title: 'Kiber Audit & Sertifikat tayyorgarligi', focus: 'Amaliy himoya laboratoriyasi' },
    ],
    careerRoles: ['Junior Security Analyst', 'SOC Trainee', 'Junior Penetration Tester'],
    gradient: 'from-red-500 to-rose-600',
    icon: Shield,
  },
  {
    id: 'frontend-dev',
    grade: '9-10',
    gradeLabel: '9–10-sinf',
    trackNumber: '05',
    title: 'Modern Frontend Development',
    category: 'Frontend',
    hours: '102 soat',
    level: 'O‘rta–Kengaytirilgan',
    description:
      'React 19, TypeScript, Tailwind CSS va Next.js yordamida yuqori tezlikka ega zamonaviy interfeyslar.',
    prerequisites: '8-sinf HTML/CSS/JS poydevori',
    techStack: [
      { name: 'React 19' },
      { name: 'TypeScript' },
      { name: 'Tailwind CSS' },
      { name: 'Next.js' },
      { name: 'Shadcn UI' },
      { name: 'Zustand' },
    ],
    topics: [
      { title: 'Kengaytirilgan TypeScript', desc: 'Interfeyslar, turlar, Generics, qat’iy tiplash va xatoliklarsiz kod yozish.' },
      { title: 'React 19 & Zamonaviy Hooks', desc: 'Komponentlar, maxsus (custom) hooklar, useMemo, useCallback va holat boshqaruvi.' },
      { title: 'Shadcn UI & Design System', desc: 'Radix UI primitive’lari, Tailwind CSS, reusability va qulay UI komponentlar.' },
      { title: 'Global State: Zustand & React Query', desc: 'Server keshlashtirish, optimistik yangilanishlar va global holat boshqaruvi.' },
      { title: 'Next.js & Server Components', desc: 'App Router, Server-Side Rendering (SSR), SEO va yuqori unumdorlik.' },
    ],
    projects: [
      'Al-Xorazmiy Vorislari ta’lim va baholash interaktiv portali',
      'Real-time xabarlar va hamkorlikda ishlash veb-ilovasi',
      'SaaS Analitika boshqaruv paneli (Shadcn UI asosida)',
    ],
    outcomes: [
      'Xalqaro IT standartlariga mos React va TypeScript ilovalarini ishlab chiqish',
      'Zamonaviy dizayn tizimlari va foydalanuvchi tajribasini (UX) mukammal qurish',
    ],
    weeklyPlan: [
      { phase: '1–6-hafta', title: 'TypeScript & React Asoslari', focus: 'Komponentlar, props, state va tiplash' },
      { phase: '7–13-hafta', title: 'Shadcn UI & Advanced Hooks', focus: 'Dizayn tizimi, modallar va formalar' },
      { phase: '14–20-hafta', title: 'State Management & API', focus: 'Zustand, React Query va REST API integratsiyasi' },
      { phase: '21–26-hafta', title: 'Next.js & Production Deploy', focus: 'SSR, SEO va to‘liq SaaS ilovasi taqdimoti' },
    ],
    careerRoles: ['Junior React Developer', 'Frontend Engineer Intern', 'UI/UX Developer'],
    gradient: 'from-blue-500 to-indigo-600',
    icon: Globe,
  },
  {
    id: 'backend-dev',
    grade: '9-10',
    gradeLabel: '9–10-sinf',
    trackNumber: '06',
    title: 'Backend & Cloud Systems',
    category: 'Backend',
    hours: '102 soat',
    level: 'O‘rta–Kengaytirilgan',
    description:
      'Python (Django/FastAPI), Node.js, PostgreSQL, Docker, keshlashtirish va mikroxizmatlar arxitekturasi.',
    prerequisites: 'Python dasturlash va ma’lumotlar bazasi asoslari',
    techStack: [
      { name: 'Python (FastAPI & Django)' },
      { name: 'Node.js' },
      { name: 'PostgreSQL' },
      { name: 'Redis' },
      { name: 'Docker' },
      { name: 'JWT & OAuth2' },
    ],
    topics: [
      { title: 'FastAPI & Asinxron Backend', desc: 'Async Python, yuqori tezlikdagi REST APIlar va avtomatik Swagger hujjatlashtirish.' },
      { title: 'Ma’lumotlar Bazasi Arxitekturasi', desc: 'Indekslar, tranzaksiyalar, optimizatsiya, query profiling va relyatsiyalar.' },
      { title: 'Keshlashtirish & Asinxron Navbatlar', desc: 'Redis bilan keshlashtirish, Celery bilan og‘ir fon vazifalarini bajarish.' },
      { title: 'Konteynerlashtirish: Docker', desc: 'Docker va Docker Compose orqali server muhitini izolyatsiyalash va boshqarish.' },
      { title: 'Autentifikatsiya & RBAC Tizimi', desc: 'JWT tokenlar, Role-Based Access Control, xavfsiz parol boshqaruvi.' },
    ],
    projects: [
      'Mikroxizmatli maktab ERP boshqaruv backend tizimi',
      'Real-time bildirishnomalar va WebSocket serveri',
      'To‘lov tizimlari va xavfsiz webhooklar integratsiyasi',
    ],
    outcomes: [
      'Yuqori yuklamalarga bardosh beruvchi xavfsiz backend tizimlarini loyihalash',
      'Docker va Linux serverlarida backendni mustaqil boshqarish',
    ],
    weeklyPlan: [
      { phase: '1–6-hafta', title: 'FastAPI & REST API', focus: 'Marshrutlar, Pydantic modellar va Swagger' },
      { phase: '7–13-hafta', title: 'PostgreSQL Optimizatsiya & Redis', focus: 'Keshlashtirish, indekslar va tranzaksiyalar' },
      { phase: '14–20-hafta', title: 'Docker & Xavfsizlik (JWT/RBAC)', focus: 'Konteynerlar va avtorizatsiya' },
      { phase: '21–26-hafta', title: 'Mikroxizmatlar & Capstone', focus: 'To‘liq backend arxitekturasi taqdimoti' },
    ],
    careerRoles: ['Junior Backend Developer', 'API Engineer Trainee', 'DevOps Assistant'],
    gradient: 'from-purple-500 to-violet-600',
    icon: Terminal,
  },
  {
    id: 'android-dev',
    grade: '9-10',
    gradeLabel: '9–10-sinf',
    trackNumber: '07',
    title: 'Native Android Development',
    category: 'Mobil Dasturlash',
    hours: '102 soat',
    level: 'O‘rta–Kengaytirilgan',
    description:
      'Kotlin tili, Android Studio, zamonaviy Jetpack Compose va Room DB bilan qulay mobil ilovalar yaratish.',
    prerequisites: 'OOP printsiplari va mantiqiy dasturlash',
    techStack: [
      { name: 'Kotlin' },
      { name: 'Android Studio' },
      { name: 'Jetpack Compose' },
      { name: 'Coroutines & Flow' },
      { name: 'Room DB' },
      { name: 'Retrofit' },
    ],
    topics: [
      { title: 'Kotlin Dasturlash Tili', desc: 'Null-safety, lambdalar, Coroutines asinxronligi va Clean Code madaniyati.' },
      { title: 'Jetpack Compose Deklarativ UI', desc: 'Material Design 3, animatsiyalar, mavzular va moslashuvchan ekranlar.' },
      { title: 'MVVM Arxitekturasi & State', desc: 'ViewModel, StateFlow, LiveData va toza arxitektura qatlamlari.' },
      { title: 'Lokal Baza: Room DB', desc: 'Oflayn ishlash, lokal jadvallar, keshlashtirish va DataStore afzalliklari.' },
      { title: 'Tarmoq So‘rovlari & Google Play', desc: 'Retrofit yordamida APIlar bilan bog‘lanish va ilovani Play Storega tayyorlash.' },
    ],
    projects: [
      'O‘quvchilar uchun shaxsiy dars jadvali va eslatmalar ilovasi',
      'Fitness va sog‘lom turmush tarzi treker mobil ilovasi',
      'Audio-kitoblar va qiziqarli darslar pleyeri',
    ],
    outcomes: [
      'Google standartlariga to‘liq mos keluvchi Android ilovalarni yaratish',
      'Lokal ma’lumotlar bazasi va tarmoq integratsiyasini mukammal o‘zlashtirish',
    ],
    weeklyPlan: [
      { phase: '1–6-hafta', title: 'Kotlin Asoslari & Android Studio', focus: 'Sintaksis, layout va dastlabki ekranlar' },
      { phase: '7–13-hafta', title: 'Jetpack Compose UI', focus: 'Material 3 komponentlar va animatsiyalar' },
      { phase: '14–20-hafta', title: 'MVVM, Room DB & Retrofit', focus: 'Arxitektura, lokal baza va API ulanish' },
      { phase: '21–26-hafta', title: 'Capstone Ilova & Release', focus: 'Google Playga tayyorgarlik va test' },
    ],
    careerRoles: ['Junior Android Developer', 'Kotlin App Developer', 'Mobile QA Engineer'],
    gradient: 'from-green-500 to-emerald-600',
    icon: Smartphone,
  },
  {
    id: 'ios-dev',
    grade: '9-10',
    gradeLabel: '9–10-sinf',
    trackNumber: '08',
    title: 'Native iOS Development',
    category: 'Mobil Dasturlash',
    hours: '102 soat',
    level: 'O‘rta–Kengaytirilgan',
    description:
      'Swift tili, Xcode va SwiftUI yordamida iPhone va iPad qurilmalari uchun yuqori darajadagi mobil ilovalar.',
    prerequisites: 'OOP printsiplari va mantiqiy fikrlash',
    techStack: [
      { name: 'Swift 5.9+' },
      { name: 'Xcode' },
      { name: 'SwiftUI' },
      { name: 'Combine & Async' },
      { name: 'CoreData' },
      { name: 'TestFlight' },
    ],
    topics: [
      { title: 'Swift Dasturlash Asoslari', desc: 'Protocols, Optionals, Closures, Generics va xotira nazorati (ARC).' },
      { title: 'SwiftUI Deklarativ Dizayni', desc: 'Views, Modifiers, animatsiyalar va Apple Human Interface Guidelines.' },
      { title: 'State & Ma’lumotlar Oqimi', desc: '@State, @Binding, @Observable, Environment va ilova holati.' },
      { title: 'Tarmoq & JSON: URLSession', desc: 'Asinxron URLSession, Codable protokoli va REST API integratsiyasi.' },
      { title: 'TestFlight & App Store Nashr', desc: 'Ilovalarni imzolash, Apple Developer hisobi va beta-sinovdan o‘tkazish.' },
    ],
    projects: [
      'Habit Tracker — foydali kunlik odatlar shakllantirish ilovasi',
      'Smart Expense — shaxsiy moliyaviy hisobot va monitoring ilovasi',
      'Maktab interaktiv xaritasi va xona topuvchi navigator',
    ],
    outcomes: [
      'Apple ekotizimida sifatli, barqaror va chiroyli iOS ilovalarini ishlab chiqish',
      'SwiftUI va Clean Architecture printsiplarini amaliyotda qo‘llash',
    ],
    weeklyPlan: [
      { phase: '1–6-hafta', title: 'Swift Dasturlash Tili', focus: 'Sintaksis, tiplar, protokollar va Xcode' },
      { phase: '7–13-hafta', title: 'SwiftUI & Interfeyslar', focus: 'Layoutlar, animatsiyalar va dizayn qoidalari' },
      { phase: '14–20-hafta', title: 'Ma’lumotlar Oqimi & API', focus: 'URLSession, Codable va lokal saqlash' },
      { phase: '21–26-hafta', title: 'App Store Nashr Tayyorgarligi', focus: 'TestFlight va sertifikatlash' },
    ],
    careerRoles: ['Junior iOS Developer', 'Swift Programmer Intern', 'Apple Platform Specialist'],
    gradient: 'from-sky-500 to-cyan-600',
    icon: Smartphone,
  },
  {
    id: 'cross-platform',
    grade: '9-10',
    gradeLabel: '9–10-sinf',
    trackNumber: '09',
    title: 'Cross-Platform Mobile (Flutter)',
    category: 'Mobil Dasturlash',
    hours: '102 soat',
    level: 'O‘rta–Kengaytirilgan',
    description:
      'Flutter va Dart orqali bitta kod bazasi bilan iOS va Android uchun yuqori unumdorlikka ega mobil ilovalar.',
    prerequisites: '8-sinf dasturlash asoslari',
    techStack: [
      { name: 'Flutter 3' },
      { name: 'Dart' },
      { name: 'Bloc / Riverpod' },
      { name: 'Firebase' },
      { name: 'REST API' },
      { name: 'Hive / SQLite' },
    ],
    topics: [
      { title: 'Dart Dasturlash Tili', desc: 'Klasslar, asinxronlik (Futures, Streams), null safety va toza sintaksis.' },
      { title: 'Flutter Widgetlar Arxitekturasi', desc: 'Stateless vs Stateful widgetlar, custom UI, adaptiv dizayn.' },
      { title: 'Holat Boshqaruvi: Bloc & Riverpod', desc: 'Hodisalarga asoslangan holat boshqaruvi va arxitektura qoliplari.' },
      { title: 'Firebase & Bulutli Xizmatlar', desc: 'FCM push-bildirishnomalar, Firestore bazasi va autentifikatsiya.' },
      { title: 'Ko‘p Platformali Eksport', desc: 'Android APK/AAB va iOS paketlarini yig‘ish hamda optimallashtirish.' },
    ],
    projects: [
      'AXM Nexus talabalar uchun yagona mobil ilovasi',
      'Kuryerlik va buyurtmalarni kuzatish xizmati prototipi',
      'Xizmatlar va frilans buyurtmalari mini-marketpleysi',
    ],
    outcomes: [
      'Bitta kod bazasi yordamida ikkala yetakchi mobil platformada ishlaydigan ilovalar yaratish',
      'Flutter orqali qisqa muddatda startap va tijoriy loyihalarni ishga tushirish',
    ],
    weeklyPlan: [
      { phase: '1–6-hafta', title: 'Dart & Flutter Asoslari', focus: 'Sintaksis, widgetlar daraxti va navigatsiya' },
      { phase: '7–13-hafta', title: 'Holat Boshqaruvi (Bloc)', focus: 'State management, formalar va validatsiya' },
      { phase: '14–20-hafta', title: 'Firebase & REST API', focus: 'Bulutli xizmatlar, avtorizatsiya va oflayn rejim' },
      { phase: '21–26-hafta', title: 'Bitiruv Loyihasi & Deploy', focus: 'Ikkala platforma uchun eksport va taqdimot' },
    ],
    careerRoles: ['Junior Flutter Developer', 'Cross-Platform Engineer Intern', 'Mobile App Maker'],
    gradient: 'from-teal-500 to-emerald-600',
    icon: Code,
  },

  // ----------------------------------------------------
  // GRADE 11: PROFESSIONAL BOZOR VA KARYERA
  // ----------------------------------------------------
  {
    id: 'portfolio-dev',
    grade: '11',
    gradeLabel: '11-sinf',
    trackNumber: '01',
    title: 'Portfolio Development',
    category: 'Bitiruv & Karyera',
    hours: '25 soat',
    level: 'Professional',
    description:
      'Shaxsiy brend, professional GitHub profili, jonli ishlayotgan loyihalar va case-study taqdimotlari.',
    prerequisites: 'Kamida 2 ta to‘liq ishlangan capstone loyihasi',
    techStack: [
      { name: 'GitHub Pro' },
      { name: 'Personal Domain' },
      { name: 'Vercel / Netlify' },
      { name: 'README & Docs' },
      { name: 'Case Studies' },
    ],
    topics: [
      { title: 'Professional GitHub Arxitekturasi', desc: 'Pinned repozitoriyalar, mukammal README.md, commit tarixi va open-source hissalar.' },
      { title: 'Shaxsiy Veb-sayt va Domen', desc: 'O‘z ismi bilan ro‘yxatdan o‘tkazilgan shaxsiy domen va tezkor portfolio sahifasi.' },
      { title: 'Loyiha Case-Study Tayyorlash', desc: 'Muammo, texnologik yechim, arxitektura sxemalari va erishilgan natijalarni hujjatlashtirish.' },
    ],
    projects: [
      'Xalqaro standartdagi shaxsiy portfolio veb-sayti',
      'Barcha sinflarda yaratilgan eng sara 3 ta loyihaning jonli production versiyalari',
    ],
    outcomes: [
      'Har qanday ish beruvchi yoki mijozga taqdim etishga tayyor professional portfolio',
    ],
    weeklyPlan: [
      { phase: '1–3-hafta', title: 'Repozitoriyalar auditi', focus: 'Kodlarni tozalash, refaktoring va hujjatlashtirish' },
      { phase: '4–6-hafta', title: 'Portfolio saytini ishga tushirish', focus: 'Shaxsiy domen, SEO va loyihalarni ko‘rsatish' },
    ],
    careerRoles: ['Junior Portfolio Ready Developer', 'Open Source Contributor'],
    gradient: 'from-purple-600 to-pink-600',
    icon: FolderGit2,
  },
  {
    id: 'freelance-market',
    grade: '11',
    gradeLabel: '11-sinf',
    trackNumber: '02',
    title: 'Freelance & Global Bozor',
    category: 'Bitiruv & Karyera',
    hours: '25 soat',
    level: 'Professional',
    description:
      'Upwork va Fiverr platformalarida muvaffaqiyatli profil, taklif yozish (proposals) va mijozlar bilan muloqot madaniyati.',
    prerequisites: 'Tayyor portfolio va ingliz tilida erkin yozish ko‘nikmasi',
    techStack: [
      { name: 'Upwork' },
      { name: 'Fiverr' },
      { name: 'Payoneer' },
      { name: 'Client Negotiation' },
      { name: 'Contract Writing' },
    ],
    topics: [
      { title: 'Upwork & Fiverr Profil Standarti', desc: 'Yuqori konversiyali profil sarlavhasi, ko‘nikmalar testi va ixtisoslashuv nishasi.' },
      { title: 'G‘olib Proposal Yozish San’ati', desc: 'Mijoz muammosini tushunish, yechim taklif qilish va qisqa muddatda javob olish.' },
      { title: 'Mijoz bilan Muloqot & To‘lovlar', desc: 'Video-qo‘ng‘iroqlar madaniyati, narxlash (Fixed vs Hourly), xavfsiz to‘lovlar.' },
    ],
    projects: [
      'Upwork 100% to‘liq to‘ldirilgan profil va tasdiqlangan ko‘nikmalar',
      'Birinchi real buyurtmani olish va muvaffaqiyatli topshirish simulyatsiyasi',
    ],
    outcomes: [
      'O‘zbekistonda turib global bozorda mustaqil ravishda valyutada daromad topish imkoniyati',
    ],
    weeklyPlan: [
      { phase: '1–3-hafta', title: 'Profil & Nishi tanlash', focus: 'Upwork va Fiverr profillarini yaratish va optimallashtirish' },
      { phase: '4–6-hafta', title: 'Proposals & Haqiqiy takliflar', focus: 'Takliflar yuborish, muzokaralar va birinchi mijoz' },
    ],
    careerRoles: ['Global Freelancer', 'Independent Contractor', 'Remote Developer'],
    gradient: 'from-amber-600 to-orange-600',
    icon: Globe,
  },
  {
    id: 'it-internship',
    grade: '11',
    gradeLabel: '11-sinf',
    trackNumber: '03',
    title: 'IT Park Stajirovka',
    category: 'Bitiruv & Karyera',
    hours: '26 soat',
    level: 'Professional',
    description:
      'Yangiariq IT Park va respublika rezident kompaniyalarida haqiqiy jamoaviy stajirovka va amaliyot.',
    prerequisites: 'Barcha yo‘nalish modullarini muvaffaqiyatli tamomlash',
    techStack: [
      { name: 'Agile / Scrum' },
      { name: 'Jira / Trello' },
      { name: 'Code Review' },
      { name: 'CI/CD Pipelines' },
      { name: 'Team Collaboration' },
    ],
    topics: [
      { title: 'Agile & Scrum Jamoaviy Muhiti', desc: 'Kundalik sprintlar, vazifalarni baholash, retrospektiva va jamoaviy javobgarlik.' },
      { title: 'Katta Kod Bazasi bilan Ishlash', desc: 'Legacy kod bilan tanishish, pull requestlar yaratish va code review madaniyati.' },
      { title: 'Mentorlik va Real Mijoz Topshiriqlari', desc: 'Kompaniya loyihasida tajribali Senior dasturchi rahbarligida amaliyot o‘tash.' },
    ],
    projects: [
      'Rezident kompaniyaning ishlab chiqarishdagi real loyihasiga kiritilgan foydali o‘zgarishlar',
      'Jamoaviy bitiruv amaliyot loyihasi',
    ],
    outcomes: [
      'Haqiqiy IT kompaniya ish jarayoniga to‘liq moslashish va tavsiyanoma (Recommendation Letter) olish',
    ],
    weeklyPlan: [
      { phase: '1–3-hafta', title: 'Onboarding & Jamoa integratsiyasi', focus: 'Kompaniya vositalari, Jira, sprint rejalari' },
      { phase: '4–6-hafta', title: 'Sprint Vazifalari & Taqdimot', focus: 'Real loyiha kodi va stajirovka hisoboti' },
    ],
    careerRoles: ['Company Resident Intern', 'Associate Developer', 'Junior Teammate'],
    gradient: 'from-emerald-600 to-teal-600',
    icon: Building2,
  },
  {
    id: 'interview-prep',
    grade: '11',
    gradeLabel: '11-sinf',
    trackNumber: '04',
    title: 'Texnik Suhbatlar & Karyera',
    category: 'Bitiruv & Karyera',
    hours: '26 soat',
    level: 'Professional',
    description:
      'Texnik suhbatlar (Mock Interviews), LeetCode algoritmlari, xalqaro IT English va rezyume auditi.',
    prerequisites: 'Tayyor portfolio va ingliz tili bazasi',
    techStack: [
      { name: 'LeetCode' },
      { name: 'Technical Interview' },
      { name: 'IT English' },
      { name: 'LinkedIn Pro' },
      { name: 'System Design Intro' },
    ],
    topics: [
      { title: 'Algoritmik Masalalar & LeetCode', desc: 'Massivlar, qidiruv algoritmlari, murakkablik darajasi (Big-O) va muammoni tushuntirish.' },
      { title: 'Mock Technical Interviews', desc: 'Jonli kod yozish jarayonida suhbatdosh bilan muloqot va arxitektura muhokamasi.' },
      { title: 'LinkedIn & Rezyume (CV) Auditi', desc: 'ATS tizimlariga mos rezyume, xalqaro rekruterlar e’tiborini tortuvchi LinkedIn sahifasi.' },
    ],
    projects: [
      'Mukammal ATS-mos IT rezyume (CV) va faol LinkedIn profili',
      'Kamida 50 ta LeetCode algoritmik masalasining tasdiqlangan yechimlari',
    ],
    outcomes: [
      'Mahalliy va xalqaro IT kompaniyalardagi saralash bosqichlaridan muvaffaqiyatli o‘tish',
    ],
    weeklyPlan: [
      { phase: '1–3-hafta', title: 'Algoritmlar & Big-O', focus: 'LeetCode saralangan masalalari va yechim tahlili' },
      { phase: '4–6-hafta', title: 'Mock Interviews & CV', focus: 'Jonli suhbat simulyatsiyalari va ishga ariza topshirish' },
    ],
    careerRoles: ['Junior Software Engineer', 'Full-Time IT Specialist'],
    gradient: 'from-indigo-600 to-blue-700',
    icon: Award,
  },
];

export interface CurriculumViewProps {
  onNavigateTab?: (tab: string) => void;
}

export const CurriculumView: React.FC<CurriculumViewProps> = ({ onNavigateTab }) => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<'all' | '8' | '9-10' | '11'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedItem, setSelectedItem] = useState<CurriculumItem | null>(null);

  // AI Rich-Text Presentation Modal State
  const [isAiPresentationOpen, setIsAiPresentationOpen] = useState(false);
  const [presentationTopic, setPresentationTopic] = useState('');
  const [presentationGrade, setPresentationGrade] = useState('8-sinf');
  const [presentationSubject, setPresentationSubject] = useState('Web Full-Stack Development');

  // Filter items based on active tab and search query
  const filteredItems = useMemo(() => {
    return CURRICULUM_DATA.filter((item) => {
      // Tab matching
      const matchesTab = activeTab === 'all' || item.grade === activeTab;
      if (!matchesTab) return false;

      // Search matching
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase().trim();
      const inTitle = item.title.toLowerCase().includes(q);
      const inDesc = item.description.toLowerCase().includes(q);
      const inCategory = item.category.toLowerCase().includes(q);
      const inTech = item.techStack.some((tech) => tech.name.toLowerCase().includes(q));
      const inTopics = item.topics.some(
        (top) => top.title.toLowerCase().includes(q) || top.desc.toLowerCase().includes(q)
      );
      const inProjects = item.projects.some((proj) => proj.toLowerCase().includes(q));

      return inTitle || inDesc || inCategory || inTech || inTopics || inProjects;
    });
  }, [activeTab, searchQuery]);

  return (
    <div className="space-y-7 animate-in fade-in duration-300 pb-12">
      {/* 1. PRESIDENTIAL DECREE BANNER (Luxurious Gold/Amber Card, Borderless, matches Dashboard) */}
      <div className="relative overflow-hidden rounded-2xl p-5 sm:p-6 bg-gradient-to-r from-amber-500/12 via-amber-500/5 to-indigo-500/5 shadow-[0_2px_14px_-2px_rgba(0,0,0,0.03)] dark:shadow-none border-0">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start sm:items-center gap-4">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-amber-500 to-amber-600 text-white flex items-center justify-center shrink-0 shadow-lg shadow-amber-500/25">
              <Sparkles className="w-5 h-5" />
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-800 dark:text-amber-300 text-[10px] font-bold uppercase tracking-wider">
                  PQ-3274 Davlat Dasturi
                </span>
                <span className="text-xs font-semibold text-muted-foreground">
                  Muhammad Al-Xorazmiy Vorislari
                </span>
              </div>
              <h2 className="text-sm sm:text-base font-bold text-foreground">
                {t('curriculum.title')}
              </h2>
              <p className="text-xs text-muted-foreground leading-relaxed max-w-4xl">
                {t('curriculum.subtitle')} — Davlat ta’lim standarti (PQ-3274) doirasida 80 daqiqalik intensiv dars metodikasi asosida tasdiqlangan.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================
          2. HERO EXECUTIVE BANNER (Borderless, Luxury Ambient Style, matches Dashboard)
      ======================================================== */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 text-white shadow-xl border-0">
        {/* Soft Ambient Glows */}
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-indigo-500/15 rounded-full blur-3xl pointer-events-none -mr-32 -mt-32" />
        <div className="absolute bottom-0 left-1/3 w-[350px] h-[350px] bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="p-7 sm:p-9 lg:p-10 relative z-10 space-y-6">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/20 backdrop-blur-md text-cyan-300 text-xs font-semibold">
              <BookOpen className="w-3.5 h-3.5 text-cyan-400" />
              <span>Muhammad Al-Xorazmiy Vorislari Ta’lim Standarti</span>
            </span>

            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md text-slate-200 text-xs font-medium">
              <Sparkles className="w-3 h-3 text-amber-400" />
              <span>PQ-3274 Davlat Dasturi</span>
            </span>

            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/20 text-blue-300 text-[11px] font-semibold">
              <span>2026–2027 O‘quv Rejasi</span>
            </span>
          </div>

          <div className="space-y-2 max-w-4xl">
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight leading-tight">
              8-Sinfdan 11-Sinfgacha O‘quv Yo‘li —{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 via-blue-300 to-indigo-200">
                Professional IT Roadmap
              </span>
            </h1>
            <p className="text-slate-300 text-xs sm:text-sm leading-relaxed max-w-3xl">
              Nazariya emas — haqiqiy mahsulotlar! Mashq emas — real loyiha. 8–11-sinf o‘quvchilari uchun IT
              poydevoridan tortib xalqaro darajadagi loyihalar portfeligacha bo‘lgan 4 yillik uzluksiz ta’lim xaritasi.
            </p>
          </div>

          {/* Quick Stat Pills Grid (Borderless, Luxury Ambient Style) */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
            <div className="flex items-center gap-3 p-3.5 rounded-2xl bg-white/5 backdrop-blur-md">
              <div className="p-2.5 rounded-xl bg-blue-500/20 text-cyan-300 shrink-0">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-bold text-white">102 soat / yil</p>
                <p className="text-[11px] text-slate-300">Amaliy ta’lim</p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3.5 rounded-2xl bg-white/5 backdrop-blur-md">
              <div className="p-2.5 rounded-xl bg-amber-500/20 text-amber-300 shrink-0">
                <Zap className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-bold text-white">80 daqiqa</p>
                <p className="text-[11px] text-slate-300">4 bosqichli dars</p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3.5 rounded-2xl bg-white/5 backdrop-blur-md">
              <div className="p-2.5 rounded-xl bg-indigo-500/20 text-indigo-300 shrink-0">
                <Layers className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-bold text-white">9 ta Yo‘nalish</p>
                <p className="text-[11px] text-slate-300">Kasbiy ixtisoslashuv</p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3.5 rounded-2xl bg-white/5 backdrop-blur-md">
              <div className="p-2.5 rounded-xl bg-emerald-500/20 text-emerald-300 shrink-0">
                <Briefcase className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-bold text-white">100% Portfolio</p>
                <p className="text-[11px] text-slate-300">Stajirovka va bozor</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================
          3. SEARCH & METHODOLOGY SECTION (Borderless, Soft Panels)
      ======================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-stretch">
        {/* Search & Filter Card */}
        <div className="lg:col-span-2 bg-card text-card-foreground rounded-2xl p-6 shadow-[0_2px_14px_-2px_rgba(0,0,0,0.04)] dark:shadow-none border-0 flex flex-col justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Search className="w-3.5 h-3.5 text-primary" />
                <span>O‘quv Dasturidan Qidirish</span>
              </span>
              {searchQuery && (
                <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-primary/10 text-primary">
                  {filteredItems.length} ta natija topildi
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Qiziqtirgan texnologiya, dasturlash tili yoki ko‘nikmani kiriting:
            </p>
          </div>

          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
            <Input
              type="text"
              placeholder="Masalan: Python, React, Kiberxavfsizlik, Django, Unity, SQL..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-10 h-11 bg-muted/40 hover:bg-muted/60 focus:bg-background border-0 rounded-xl focus-visible:ring-2 focus-visible:ring-primary/40 text-sm shadow-none transition-colors"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-0.5 rounded-full transition-colors cursor-pointer"
                title="Tozalash"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-1.5 pt-1">
            <span className="text-[11px] font-semibold text-muted-foreground mr-1">Ommabop teglari:</span>
            {['Python', 'React', 'Django', 'Unity', 'Kiberxavfsizlik', 'Flutter', 'PostgreSQL'].map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={() => setSearchQuery(tag)}
                className={`text-[11px] font-semibold px-3 py-1 rounded-xl transition-all cursor-pointer ${
                  searchQuery.toLowerCase() === tag.toLowerCase()
                    ? 'bg-primary text-primary-foreground shadow-sm shadow-primary/25'
                    : 'bg-muted/50 hover:bg-muted/80 text-muted-foreground hover:text-foreground'
                }`}
              >
                {tag}
              </button>
            ))}
          </div>
        </div>

        {/* 80-minute Lesson Standard Compact Card */}
        <div className="bg-card text-card-foreground rounded-2xl p-6 shadow-[0_2px_14px_-2px_rgba(0,0,0,0.04)] dark:shadow-none border-0 flex flex-col justify-between">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-300">
                Metodika Standarti
              </span>
              <span className="text-xs font-mono font-bold text-muted-foreground">80 daqiqa</span>
            </div>
            <h4 className="font-bold text-sm text-foreground flex items-center gap-2 pt-1">
              <Clock className="w-4 h-4 text-amber-500 shrink-0" />
              <span>4 Bosqichli Dars Modeli</span>
            </h4>
            <p className="text-xs text-muted-foreground leading-relaxed">
              O‘quvchilar vaqtining 60% dan ortig‘i bevosita kompyuterda amaliy kod yozishga ajratiladi.
            </p>
          </div>

          {/* Visual Progress Breakdown */}
          <div className="space-y-2 pt-3 mt-3">
            <div className="grid grid-cols-4 gap-1 text-[10px] font-mono font-bold text-center">
              <span className="text-indigo-600 dark:text-indigo-400">10m</span>
              <span className="text-blue-600 dark:text-blue-400">20m</span>
              <span className="text-emerald-600 dark:text-emerald-400">40m</span>
              <span className="text-purple-600 dark:text-purple-400">10m</span>
            </div>
            <div className="flex h-2.5 w-full rounded-full overflow-hidden bg-muted/60">
              <div className="w-[12.5%] bg-indigo-500" title="10m: Nazariya & Muammo" />
              <div className="w-[25%] bg-blue-500" title="20m: Live Coding namoyishi" />
              <div className="w-[50%] bg-emerald-500" title="40m: Mustaqil amaliyot" />
              <div className="w-[12.5%] bg-purple-500" title="10m: Kod tekshiruvi" />
            </div>
            <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-1">
              <span>Nazariya (10m)</span>
              <span className="font-semibold text-emerald-600 dark:text-emerald-400">Amaliyot (40m)</span>
              <span>Audit (10m)</span>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================
          4. GRADE TABS NAVIGATION (Borderless, Luxury Minimalist Style)
      ======================================================== */}
      <Tabs
        value={activeTab}
        onValueChange={(val) => setActiveTab(val as 'all' | '8' | '9-10' | '11')}
        className="w-full space-y-6"
      >
        <div className="flex items-center justify-between flex-wrap gap-3">
          <TabsList className="bg-muted/50 p-1.5 rounded-2xl border-0 shadow-none h-auto flex-wrap gap-1">
            <TabsTrigger
              value="all"
              className="rounded-xl px-4 py-2 text-xs font-bold data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-sm text-muted-foreground hover:text-foreground transition-all cursor-pointer border-0"
            >
              Barcha Sinflar (8–11)
            </TabsTrigger>
            <TabsTrigger
              value="8"
              className="rounded-xl px-4 py-2 text-xs font-bold data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-sm text-muted-foreground hover:text-foreground transition-all cursor-pointer border-0"
            >
              8-Sinf (Poydevor • 102 soat)
            </TabsTrigger>
            <TabsTrigger
              value="9-10"
              className="rounded-xl px-4 py-2 text-xs font-bold data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-sm text-muted-foreground hover:text-foreground transition-all cursor-pointer border-0"
            >
              9–10-Sinf (9 ta IT Yo‘nalish)
            </TabsTrigger>
            <TabsTrigger
              value="11"
              className="rounded-xl px-4 py-2 text-xs font-bold data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-sm text-muted-foreground hover:text-foreground transition-all cursor-pointer border-0"
            >
              11-Sinf (Professional Bozor)
            </TabsTrigger>
          </TabsList>

          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">
              Ko‘rsatilmoqda:{' '}
              <span className="font-bold text-foreground">{filteredItems.length} ta modul</span>
            </span>
          </div>
        </div>

        {/* ----------------------------------------------------
            TAB CONTENT: ALL GRADES
        ---------------------------------------------------- */}
        <TabsContent value="all" className="space-y-8 mt-6 focus-visible:outline-none">
          {/* Grade 8 Section */}
          <Grade8Block
            items={filteredItems.filter((i) => i.grade === '8')}
            onSelectItem={setSelectedItem}
          />

          {/* Grade 9-10 Section */}
          <Grade910Block
            items={filteredItems.filter((i) => i.grade === '9-10')}
            onSelectItem={setSelectedItem}
          />

          {/* Grade 11 Section */}
          <Grade11Block
            items={filteredItems.filter((i) => i.grade === '11')}
            onSelectItem={setSelectedItem}
          />
        </TabsContent>

        {/* ----------------------------------------------------
            TAB CONTENT: GRADE 8 ONLY
        ---------------------------------------------------- */}
        <TabsContent value="8" className="space-y-6 mt-6 focus-visible:outline-none">
          <Grade8Block
            items={filteredItems.filter((i) => i.grade === '8')}
            onSelectItem={setSelectedItem}
          />
        </TabsContent>

        {/* ----------------------------------------------------
            TAB CONTENT: GRADE 9-10 ONLY
        ---------------------------------------------------- */}
        <TabsContent value="9-10" className="space-y-6 mt-6 focus-visible:outline-none">
          <Grade910Block
            items={filteredItems.filter((i) => i.grade === '9-10')}
            onSelectItem={setSelectedItem}
          />
        </TabsContent>

        {/* ----------------------------------------------------
            TAB CONTENT: GRADE 11 ONLY
        ---------------------------------------------------- */}
        <TabsContent value="11" className="space-y-6 mt-6 focus-visible:outline-none">
          <Grade11Block
            items={filteredItems.filter((i) => i.grade === '11')}
            onSelectItem={setSelectedItem}
          />
        </TabsContent>
      </Tabs>

      {/* ========================================================
          5. INTERACTIVE DETAIL DIALOG MODAL (Borderless, Modern Dialog)
      ======================================================== */}
      {selectedItem && (
        <Dialog open={!!selectedItem} onOpenChange={(open) => !open && setSelectedItem(null)}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto p-6 sm:p-8 rounded-3xl border-0 shadow-2xl bg-card text-card-foreground">
            <DialogHeader className="space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="px-2.5 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold">
                  {selectedItem.gradeLabel}
                </span>
                <span className="px-2.5 py-1 rounded-full bg-muted text-muted-foreground text-xs font-semibold">
                  {selectedItem.category}
                </span>
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-muted/60 text-foreground font-mono text-xs font-medium">
                  <Clock className="w-3 h-3 text-primary" />
                  <span>{selectedItem.hours}</span>
                </span>
                <span className="px-2.5 py-1 rounded-full bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 text-xs font-semibold">
                  Daraja: {selectedItem.level}
                </span>
              </div>

              <div className="flex items-center gap-3.5 pt-1">
                <div
                  className={`w-12 h-12 rounded-2xl bg-gradient-to-tr ${selectedItem.gradient} text-white flex items-center justify-center shrink-0 shadow-lg`}
                >
                  <selectedItem.icon className="w-6 h-6" />
                </div>
                <div>
                  <DialogTitle className="text-2xl font-black text-foreground">
                    {selectedItem.title}
                  </DialogTitle>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Muhammad Al-Xorazmiy Vorislari Davlat Ta’lim Standarti
                  </p>
                </div>
              </div>

              <DialogDescription className="text-sm text-foreground/85 leading-relaxed pt-1">
                {selectedItem.description}
              </DialogDescription>
            </DialogHeader>

            <div className="my-4 border-t border-border/15" />

            <div className="space-y-6 text-sm">
              {/* Prerequisites Card */}
              <div className="p-3.5 rounded-xl bg-muted/40 border-0 flex items-start gap-3">
                <Info className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                <div className="text-xs">
                  <span className="font-bold text-foreground">Boshlang‘ich talab:</span>{' '}
                  <span className="text-muted-foreground">{selectedItem.prerequisites}</span>
                </div>
              </div>

              {/* Technologies Used */}
              <div>
                <h4 className="font-bold text-xs uppercase tracking-wider text-muted-foreground mb-2.5 flex items-center gap-1.5">
                  <Code className="w-3.5 h-3.5 text-primary" />
                  <span>O‘rganiladigan Texnologiyalar & Vositalar</span>
                </h4>
                <div className="flex flex-wrap gap-2">
                  {selectedItem.techStack.map((tech) => (
                    <span
                      key={tech.name}
                      className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-muted/70 text-foreground border-0"
                    >
                      {tech.name}
                    </span>
                  ))}
                </div>
              </div>

              {/* Core Topics Breakdown */}
              <div>
                <h4 className="font-bold text-xs uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-1.5">
                  <BookOpen className="w-3.5 h-3.5 text-primary" />
                  <span>Asosiy O‘quv Modullari & Mavzular</span>
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {selectedItem.topics.map((topic, idx) => (
                    <div
                      key={idx}
                      className="p-3.5 rounded-xl bg-muted/30 dark:bg-muted/15 border-0 space-y-1"
                    >
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-primary/10 text-primary text-[10px] font-bold flex items-center justify-center shrink-0">
                          {idx + 1}
                        </span>
                        <h5 className="font-bold text-xs text-foreground line-clamp-1">{topic.title}</h5>
                      </div>
                      <p className="text-[11px] text-muted-foreground leading-relaxed pl-7">
                        {topic.desc}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Real Projects */}
              <div>
                <h4 className="font-bold text-xs uppercase tracking-wider text-muted-foreground mb-2.5 flex items-center gap-1.5">
                  <Rocket className="w-3.5 h-3.5 text-emerald-500" />
                  <span>Yaratiladigan Haqiqiy Mahsulotlar & Loyihalar</span>
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {selectedItem.projects.map((proj, idx) => (
                    <div
                      key={idx}
                      className="flex items-center gap-2.5 p-3 rounded-xl bg-emerald-500/10 text-xs font-medium text-foreground border-0"
                    >
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                      <span>{proj}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Weekly/Phase Plan */}
              {selectedItem.weeklyPlan && selectedItem.weeklyPlan.length > 0 && (
                <div>
                  <h4 className="font-bold text-xs uppercase tracking-wider text-muted-foreground mb-2.5 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-primary" />
                    <span>Bosqichma-bosqich Reja</span>
                  </h4>
                  <div className="space-y-2">
                    {selectedItem.weeklyPlan.map((plan, idx) => (
                      <div
                        key={idx}
                        className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 p-3 rounded-xl bg-muted/30 dark:bg-muted/15 border-0 text-xs"
                      >
                        <div className="flex items-center gap-2 font-bold text-foreground">
                          <span className="text-[11px] font-mono text-primary px-2 py-0.5 rounded-md bg-primary/10">
                            {plan.phase}
                          </span>
                          <span>{plan.title}</span>
                        </div>
                        <span className="text-[11px] text-muted-foreground sm:text-right">
                          {plan.focus}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Career Roles */}
              {selectedItem.careerRoles && selectedItem.careerRoles.length > 0 && (
                <div>
                  <h4 className="font-bold text-xs uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
                    <Briefcase className="w-3.5 h-3.5 text-indigo-500" />
                    <span>Bitiruvchilar Egallashi Mumkin Bo‘lgan Lavozimlar</span>
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedItem.careerRoles.map((role) => (
                      <span
                        key={role}
                        className="text-xs font-semibold px-3 py-1 rounded-lg bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border-0"
                      >
                        {role}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {/* Al-Xorazmiy Vorislari Interactive Action Center */}
              <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-primary/10 via-indigo-500/10 to-amber-500/10 border border-primary/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <h5 className="font-extrabold text-xs sm:text-sm text-foreground flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-amber-500" />
                      Al-Xorazmiy Vorislari: Darslar, Testlar & AI Slaydlar
                    </h5>
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    Ushbu o‘quv moduli bo‘yicha AI yordamida maruza taqdimotini generatsiya qiling, dars rejalarini boshqaring yoki nazorat testlarini topshiring.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  <Button
                    variant="default"
                    size="sm"
                    onClick={() => {
                      setPresentationTopic(selectedItem.title);
                      setPresentationGrade(selectedItem.gradeLabel);
                      setPresentationSubject(selectedItem.category);
                      setIsAiPresentationOpen(true);
                    }}
                    className="text-xs font-bold rounded-xl border-0 bg-gradient-to-r from-indigo-600 via-blue-600 to-cyan-600 text-white shadow-md shadow-indigo-600/20 hover:opacity-90"
                  >
                    <Sparkles className="w-3.5 h-3.5 mr-1.5 text-amber-300" />
                    AI Maruza Taqdimoti
                  </Button>

                  {onNavigateTab && (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedItem(null);
                          onNavigateTab('lessons');
                        }}
                        className="text-xs font-semibold rounded-xl bg-card border-border/30 hover:bg-muted"
                      >
                        <BookOpen className="w-3.5 h-3.5 mr-1 text-primary" />
                        Darslar
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedItem(null);
                          onNavigateTab('assessments');
                        }}
                        className="text-xs font-semibold rounded-xl bg-card border-border/30 hover:bg-muted"
                      >
                        <Award className="w-3.5 h-3.5 mr-1 text-emerald-500" />
                        Oraliq Testlar
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </div>

            <div className="my-4 border-t border-border/15" />

            <DialogFooter className="flex flex-col-reverse sm:flex-row sm:justify-between sm:items-center gap-2">
              <span className="text-xs text-muted-foreground">
                Tasdiqlangan amaliy ta’lim xaritasi • 2026–2027
              </span>
              <Button
                variant="default"
                onClick={() => setSelectedItem(null)}
                className="w-full sm:w-auto rounded-xl border-0 shadow-sm font-semibold"
              >
                Tushunarli & Yopish
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* AI Presentation Modal for Curriculum Tracks */}
      {isAiPresentationOpen && (
        <AiPresentationModal
          isOpen={isAiPresentationOpen}
          onClose={() => setIsAiPresentationOpen(false)}
          initialTopic={presentationTopic}
          initialGrade={presentationGrade}
          initialSubject={presentationSubject}
        />
      )}
    </div>
  );
};

// ============================================================
// SUB-COMPONENT: GRADE 8 BLOCK (Borderless, Luxury Ambient Style)
// ============================================================
interface GradeBlockProps {
  items: CurriculumItem[];
  onSelectItem: (item: CurriculumItem) => void;
}

const Grade8Block: React.FC<GradeBlockProps> = ({ items, onSelectItem }) => {
  if (items.length === 0) return null;

  return (
    <div className="bg-card text-card-foreground rounded-3xl p-6 sm:p-8 shadow-[0_2px_14px_-2px_rgba(0,0,0,0.04)] dark:shadow-none border-0 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start sm:items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 to-cyan-500 text-white flex items-center justify-center shrink-0 shadow-lg shadow-blue-500/25">
            <Layers className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-black px-2.5 py-0.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400">
                8-sinf
              </span>
              <h3 className="text-xl sm:text-2xl font-bold text-foreground">
                Asosiy IT Poydevori (Foundation)
              </h3>
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground mt-1">
              IT olamiga kirish, algoritmik mantiq va real web-ilovalarni noldan yaratish
            </p>
          </div>
        </div>

        <span className="px-3.5 py-1.5 font-bold text-xs gap-1.5 w-fit rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center">
          <Clock className="w-3.5 h-3.5" />
          <span>Jami 102 soat amaliy ta’lim</span>
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {items.map((item) => (
          <div
            key={item.id}
            className="flex flex-col justify-between rounded-2xl p-6 bg-muted/30 dark:bg-muted/15 hover:bg-muted/50 dark:hover:bg-muted/25 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 border-0 group"
          >
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-1.5 font-mono text-xs font-bold px-2.5 py-1 rounded-lg bg-primary/10 text-primary">
                  <item.icon className="w-3.5 h-3.5" />
                  <span>{item.trackNumber}-Modul</span>
                </span>
                <span className="font-mono text-xs font-bold px-2.5 py-1 rounded-lg bg-muted text-muted-foreground">
                  {item.hours}
                </span>
              </div>

              <div>
                <h4 className="text-lg font-bold text-foreground group-hover:text-primary transition-colors">
                  {item.title}
                </h4>
                <p className="text-xs mt-1 leading-relaxed text-muted-foreground line-clamp-2">
                  {item.description}
                </p>
              </div>

              {/* Tech Badges */}
              <div className="flex flex-wrap gap-1.5">
                {item.techStack.slice(0, 5).map((tech) => (
                  <span
                    key={tech.name}
                    className="text-[11px] font-semibold px-2.5 py-0.5 rounded-lg bg-muted/70 text-foreground"
                  >
                    {tech.name}
                  </span>
                ))}
                {item.techStack.length > 5 && (
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-lg bg-muted text-muted-foreground">
                    +{item.techStack.length - 5}
                  </span>
                )}
              </div>

              {/* Topics */}
              <div className="space-y-2 text-xs pt-1">
                {item.topics.slice(0, 3).map((topic, idx) => (
                  <div
                    key={idx}
                    className="flex items-start gap-2.5 p-3 rounded-xl bg-background/80 dark:bg-card/70 border-0"
                  >
                    <CheckCircle2 className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold text-foreground">{topic.title}:</span>{' '}
                      <span className="text-muted-foreground">{topic.desc}</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Mini projects pill row */}
              <div className="pt-1">
                <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground block mb-2">
                  Yaratiladigan Mahsulotlar:
                </span>
                <div className="flex flex-wrap gap-1.5 text-xs">
                  {item.projects.map((proj) => (
                    <span
                      key={proj}
                      className="px-2.5 py-1 rounded-lg bg-background/80 dark:bg-card/70 text-foreground text-[11px] font-medium border-0"
                    >
                      {proj}
                    </span>
                  ))}
                </div>
              </div>

              {/* Hours Allocation Progress */}
              <div className="pt-2 space-y-1.5">
                <div className="flex justify-between items-center text-[11px] font-medium text-muted-foreground">
                  <span>Ajratilgan o‘quv yuklamasi:</span>
                  <span className="font-mono font-bold text-foreground">
                    {item.hours} ({item.id === 'cs-foundation' ? '35%' : '65%'})
                  </span>
                </div>
                <Progress
                  value={item.id === 'cs-foundation' ? 35 : 65}
                  className="h-1.5 bg-muted/60"
                />
              </div>
            </div>

            <div className="mt-5 pt-4 border-t border-border/15 flex items-center justify-between">
              <span className="text-[11px] text-muted-foreground flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                <span>Amaliy loyiha asosida</span>
              </span>
              <Button
                variant="default"
                size="sm"
                onClick={() => onSelectItem(item)}
                className="gap-1.5 text-xs font-bold rounded-xl border-0 shadow-sm"
              >
                <span>Batafsil Sillabus</span>
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// ============================================================
// SUB-COMPONENT: GRADE 9–10 BLOCK (9 TA IT YO‘NALISHI)
// ============================================================
const Grade910Block: React.FC<GradeBlockProps> = ({ items, onSelectItem }) => {
  if (items.length === 0) return null;

  return (
    <div className="bg-card text-card-foreground rounded-3xl p-6 sm:p-8 shadow-[0_2px_14px_-2px_rgba(0,0,0,0.04)] dark:shadow-none border-0 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start sm:items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-600 to-purple-600 text-white flex items-center justify-center shrink-0 shadow-lg shadow-indigo-600/25">
            <Laptop className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-black px-2.5 py-0.5 rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                9–10-sinf
              </span>
              <h3 className="text-xl sm:text-2xl font-bold text-foreground">
                9 ta Zamonaviy IT Yo‘nalishi
              </h3>
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground mt-1">
              O‘quvchilar o‘z qiziqishiga mos yo‘nalish tanlab, chuqurlashtirilgan bilim oladilar
            </p>
          </div>
        </div>

        <span className="px-3.5 py-1.5 font-bold text-xs gap-1.5 w-fit rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Kasbiy Ixtisoslashuv</span>
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {items.map((item) => (
          <div
            key={item.id}
            className="flex flex-col justify-between rounded-2xl p-5 bg-muted/30 dark:bg-muted/15 hover:bg-muted/50 dark:hover:bg-muted/25 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 border-0 group"
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div
                  className={`w-10 h-10 rounded-xl bg-gradient-to-tr ${item.gradient} text-white flex items-center justify-center shadow-md group-hover:scale-110 transition-transform`}
                >
                  <item.icon className="w-5 h-5" />
                </div>
                <span className="font-mono text-xs font-black text-muted-foreground group-hover:text-primary transition-colors">
                  #{item.trackNumber}
                </span>
              </div>

              <div>
                <h4 className="text-base font-bold text-foreground group-hover:text-primary transition-colors">
                  {item.title}
                </h4>
                <p className="text-xs mt-1 leading-relaxed text-muted-foreground line-clamp-2">
                  {item.description}
                </p>
              </div>

              {/* Tech tags preview */}
              <div className="flex flex-wrap gap-1 pt-1">
                {item.techStack.slice(0, 3).map((tech) => (
                  <span
                    key={tech.name}
                    className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-muted/70 text-foreground"
                  >
                    {tech.name}
                  </span>
                ))}
                {item.techStack.length > 3 && (
                  <span className="text-[10px] text-muted-foreground self-center px-1">
                    +{item.techStack.length - 3}
                  </span>
                )}
              </div>

              <div className="p-3 rounded-xl bg-background/80 dark:bg-card/70 text-[11px] text-muted-foreground space-y-1 border-0">
                <span className="font-bold text-foreground block">Asosiy Natija:</span>
                <p className="line-clamp-2">{item.outcomes[0]}</p>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-border/15 flex items-center justify-between">
              <span className="text-[11px] font-mono text-muted-foreground">{item.hours}</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onSelectItem(item)}
                className="gap-1 text-xs font-bold text-primary hover:text-primary hover:bg-primary/10 px-2 py-1 h-auto rounded-lg border-0"
              >
                <span>Rejani ko‘rish</span>
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// ============================================================
// SUB-COMPONENT: GRADE 11 BLOCK (PROFESSIONAL BOZOR)
// ============================================================
const Grade11Block: React.FC<GradeBlockProps> = ({ items, onSelectItem }) => {
  if (items.length === 0) return null;

  return (
    <div className="bg-card text-card-foreground rounded-3xl p-6 sm:p-8 shadow-[0_2px_14px_-2px_rgba(0,0,0,0.04)] dark:shadow-none border-0 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start sm:items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-purple-600 to-pink-600 text-white flex items-center justify-center shrink-0 shadow-lg shadow-purple-600/25">
            <GraduationCap className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-black px-2.5 py-0.5 rounded-full bg-purple-500/10 text-purple-600 dark:text-purple-400">
                11-sinf
              </span>
              <h3 className="text-xl sm:text-2xl font-bold text-foreground">
                Professional Rivojlanish & Xalqaro Bozor
              </h3>
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground mt-1">
              Bilimni real daromad va imkoniyatga aylantirish, karyera va stajirovka tayyorgarligi
            </p>
          </div>
        </div>

        <span className="px-3.5 py-1.5 font-bold text-xs gap-1.5 w-fit rounded-full bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center">
          <Award className="w-3.5 h-3.5" />
          <span>Bitiruvchi Bosqichi</span>
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {items.map((item) => (
          <div
            key={item.id}
            className="flex flex-col justify-between rounded-2xl p-5 bg-muted/30 dark:bg-muted/15 hover:bg-muted/50 dark:hover:bg-muted/25 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 border-0 group"
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="w-9 h-9 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center font-bold text-xs">
                  #{item.trackNumber}
                </div>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md bg-muted text-muted-foreground">
                  {item.hours}
                </span>
              </div>

              <div>
                <h4 className="text-base font-bold text-foreground group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
                  {item.title}
                </h4>
                <p className="text-xs mt-1 leading-relaxed text-muted-foreground line-clamp-3">
                  {item.description}
                </p>
              </div>

              <div className="flex flex-wrap gap-1">
                {item.techStack.slice(0, 3).map((st) => (
                  <span
                    key={st.name}
                    className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-muted/70 text-foreground"
                  >
                    {st.name}
                  </span>
                ))}
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-border/15 flex items-center justify-between">
              <span className="text-[11px] font-semibold text-purple-600 dark:text-purple-400">
                {item.category}
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onSelectItem(item)}
                className="gap-1 text-xs font-bold text-primary hover:text-primary hover:bg-primary/10 px-2 py-1 h-auto rounded-lg border-0"
              >
                <span>Batafsil</span>
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
