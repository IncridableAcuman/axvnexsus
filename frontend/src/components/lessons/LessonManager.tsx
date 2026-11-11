import React, { useState, useEffect, useMemo } from 'react';
import {
  BookOpen,
  Plus,
  Search,
  Filter,
  Clock,
  CheckCircle2,
  Sparkles,
  Edit3,
  Copy,
  Eye,
  Send,
  Play,
  Award,
  LayoutGrid,
  List,
  FileText,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { useToast } from '@/shared/ui/toast/ToastContext';
import { lessonPlanApi } from '@/api';
import type { LessonPlanDto, StudyGroup, Mentor } from '@/types';
import { LessonQualityModal } from './LessonQualityModal';
import { AiPresentationModal } from './AiPresentationModal';
import { DEFAULT_LESSONS } from './defaultLessonsData';
import { RichTextRenderer } from './RichTextRenderer';

export interface LessonManagerProps {
  groups: StudyGroup[];
  mentors: Mentor[];
}

export const LessonManager: React.FC<LessonManagerProps> = ({ groups, mentors }) => {
  const toast = useToast();
  const [lessons, setLessons] = useState<LessonPlanDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGrade, setSelectedGrade] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');

  // Selected lesson for editor / delivery / preview / quality / presentation
  const [selectedLesson, setSelectedLesson] = useState<LessonPlanDto | null>(null);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isQualityModalOpen, setIsQualityModalOpen] = useState(false);
  const [isDeliveryMode, setIsDeliveryMode] = useState(false);
  const [activeDeliveryPhase, setActiveDeliveryPhase] = useState<number>(0);
  const [isPresentationModalOpen, setIsPresentationModalOpen] = useState(false);
  const [presentationLesson, setPresentationLesson] = useState<LessonPlanDto | null>(null);

  // Form State for create/edit
  const [formData, setFormData] = useState<Partial<LessonPlanDto>>({
    title: '',
    subject: 'Web Full-Stack Development',
    gradeLevel: '8-sinf',
    topic: '',
    learningObjectives: '',
    expectedOutcomes: '',
    requiredMaterials: '',
    theoryContent: '',
    theoryDurationMinutes: 20,
    practicalContent: '',
    practicalDurationMinutes: 25,
    exercises: '',
    homework: '',
    durationMinutes: 80,
    groupId: undefined,
    mentorId: undefined,
    status: 'DRAFT',
    isTemplate: false,
  });

  const loadLessons = async () => {
    try {
      setLoading(true);
      const res = await lessonPlanApi.getAll();
      if (res.data && res.data.length > 0) {
        setLessons(res.data);
      } else {
        setLessons(getDefaultSampleLessons());
      }
    } catch {
      setLessons(getDefaultSampleLessons());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLessons();
  }, []);

  const handleOpenCreate = () => {
    setFormData({
      title: '',
      subject: 'Web Full-Stack Development',
      gradeLevel: '8-sinf',
      topic: '',
      learningObjectives: 'Mavzuning asosiy tushunchalarini o‘zlashtirish va amaliyotda qo‘llash',
      expectedOutcomes: 'O‘quvchilar mustaqil ravishda berilgan vazifani kod yozib bajara oladilar',
      requiredMaterials: 'VS Code, Node.js, Google Chrome DevTools',
      theoryContent: 'Yangi mavzu bo‘yicha nazariy tushunchalar va arxitektura tahlili',
      theoryDurationMinutes: 20,
      practicalContent: 'Mentor bilan birgalikda kod yozish va funksional modulni yaratish',
      practicalDurationMinutes: 25,
      exercises: '1. Sintaksis mashqlari\n2. Xatolarni tuzatish (Debugging)',
      homework: 'Portfolio sahifasiga yangi komponent qo‘shish va GitHubga yuklash',
      durationMinutes: 80,
      groupId: groups[0]?.id,
      mentorId: mentors[0]?.id,
      status: 'DRAFT',
      isTemplate: false,
    });
    setSelectedLesson(null);
    setIsEditorOpen(true);
  };

  const handleOpenEdit = (lesson: LessonPlanDto) => {
    setSelectedLesson(lesson);
    setFormData({ ...lesson });
    setIsEditorOpen(true);
  };

  const handleSaveLesson = async () => {
    if (!formData.title?.trim()) {
      toast.error('Xatolik', 'Dars sarlavhasi kiritilishi shart!');
      return;
    }

    try {
      if (selectedLesson) {
        await lessonPlanApi.update(selectedLesson.id, formData, 'Dars tahrirlandi');
        toast.success('Muvaffaqiyatli', 'Dars rejasi yangilandi');
      } else {
        await lessonPlanApi.create(formData);
        toast.success('Muvaffaqiyatli', 'Yangi dars rejasi yaratildi');
      }
      setIsEditorOpen(false);
      loadLessons();
    } catch (err: any) {
      toast.error('Xatolik', err.response?.data?.message || 'Darsni saqlashda xatolik yuz berdi');
    }
  };

  const handleStatusTransition = async (lesson: LessonPlanDto, targetStatus: string) => {
    try {
      await lessonPlanApi.transitionStatus(lesson.id, targetStatus, `Holat o‘zgardi: ${targetStatus}`);
      toast.success('Status o‘zgardi', `Dars ${targetStatus} holatiga o‘tkazildi`);
      loadLessons();
    } catch (err: any) {
      toast.error('Xatolik', err.response?.data?.message || 'Statusni o‘zgartirib bo‘lmadi');
    }
  };

  const handleCloneLesson = async (lesson: LessonPlanDto) => {
    try {
      await lessonPlanApi.clone(lesson.id, { title: `${lesson.title} (Nusxa)` });
      toast.success('Nusxa olindi', 'Dars rejasi yangi qoralama sifatida nusxalandi');
      loadLessons();
    } catch {
      toast.error('Xatolik', 'Nusxalashda xatolik');
    }
  };

  const filteredLessons = useMemo(() => {
    return lessons.filter((l) => {
      const title = l.title || '';
      const subject = l.subject || '';
      const topic = l.topic || '';
      const matchesSearch =
        title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
        topic.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesGrade = selectedGrade === 'ALL' || (l.gradeLevel && l.gradeLevel.includes(selectedGrade));
      const matchesStatus = selectedStatus === 'ALL' || l.status === selectedStatus;
      return matchesSearch && matchesGrade && matchesStatus;
    });
  }, [lessons, searchQuery, selectedGrade, selectedStatus]);

  // KPI calculations
  const stats = useMemo(() => {
    const total = lessons.length;
    const published = lessons.filter((l) => l.status === 'PUBLISHED').length;
    const completed = lessons.filter((l) => l.status === 'COMPLETED').length;
    const draft = lessons.filter((l) => l.status === 'DRAFT' || !l.status).length;
    return { total, published, completed, draft };
  }, [lessons]);

  const getStatusBadge = (status?: string) => {
    switch (status) {
      case 'PUBLISHED':
        return <Badge variant="success" className="border-0">Chop etilgan</Badge>;
      case 'COMPLETED':
        return <Badge variant="primary" className="border-0">Yakunlangan</Badge>;
      case 'REVIEW':
        return <Badge variant="warning" className="border-0">Tekshiruvda</Badge>;
      case 'CANCELLED':
        return <Badge variant="destructive" className="border-0">Bekor qilingan</Badge>;
      case 'ARCHIVED':
        return <Badge variant="neutral" className="border-0">Arxivlangan</Badge>;
      default:
        return <Badge variant="neutral" className="border-0">Qoralama (Draft)</Badge>;
    }
  };

  return (
    <div className="space-y-6 sm:space-y-7 animate-in fade-in duration-300">
      {/* 1. EXECUTIVE HERO BANNER (Borderless Luxury Ambient Style like Dashboard) */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 text-white shadow-xl">
        {/* Soft Ambient Glows */}
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-indigo-500/15 rounded-full blur-3xl pointer-events-none -mr-32 -mt-32" />
        <div className="absolute bottom-0 left-1/3 w-[350px] h-[350px] bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="p-7 sm:p-9 lg:p-10 relative z-10">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="max-w-2xl space-y-3.5">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 backdrop-blur-md text-cyan-300 text-xs font-semibold">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Modul 08 — Darslarni Rejalashtirish & O‘tkazish</span>
                </span>

                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md text-slate-200 text-xs font-medium">
                  <Clock className="w-3.5 h-3.5 text-cyan-300" />
                  <span>80 daqiqalik dars standarti</span>
                </span>
              </div>

              <div>
                <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight leading-tight">
                  Dars Rejalari & Jonli O‘tkazish Boshqaruvi
                </h1>
                <p className="text-slate-300 text-xs sm:text-sm leading-relaxed max-w-xl mt-1.5">
                  Muhammad Al-Xorazmiy Vorislari ta’lim standartiga mos 80 daqiqalik intensiv dars tuzilmasi: Nazariya (20 daq), Amaliyot (25 daq), Loyiha (25 daq) va Natija/Uy vazifasi (10 daq).
                </p>
              </div>

              <div className="pt-2 flex flex-wrap items-center gap-3">
                <Button
                  variant="default"
                  size="md"
                  onClick={handleOpenCreate}
                  leftIcon={<Plus className="w-4 h-4 text-cyan-200" />}
                  className="bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white shadow-lg shadow-indigo-600/30 font-semibold border-0 rounded-xl"
                >
                  <span>Yangi Dars Rejasi</span>
                </Button>
                <Button
                  variant="outline"
                  size="md"
                  onClick={() => {
                    setPresentationLesson(lessons[0] || null);
                    setIsPresentationModalOpen(true);
                  }}
                  leftIcon={<Sparkles className="w-4 h-4 text-amber-300" />}
                  className="bg-white/10 hover:bg-white/20 text-white font-semibold border border-white/20 rounded-xl"
                >
                  <span>AI Maruza Taqdimotlari</span>
                </Button>
              </div>
            </div>

            {/* Quick Metrics Pillar in Hero */}
            <div className="lg:shrink-0 grid grid-cols-2 gap-3 bg-white/5 backdrop-blur-xl rounded-2xl p-4 sm:p-5 text-center">
              <div className="p-4 rounded-xl bg-white/5">
                <span className="text-[10px] uppercase font-bold text-cyan-300 block tracking-wider">
                  Dars Modeli
                </span>
                <span className="text-2xl font-black text-white font-mono mt-1 block">
                  80 min
                </span>
                <span className="text-[10px] text-slate-400 mt-0.5 block">
                  Standart 4 bosqich
                </span>
              </div>

              <div className="p-4 rounded-xl bg-white/5">
                <span className="text-[10px] uppercase font-bold text-emerald-300 block tracking-wider">
                  Metodik Sifat
                </span>
                <span className="text-2xl font-black text-emerald-400 font-mono mt-1 block">
                  100%
                </span>
                <span className="text-[10px] text-slate-400 mt-0.5 block">
                  Al-Xorazmiy standarti
                </span>
              </div>

              <div className="col-span-2 p-3 rounded-xl bg-indigo-500/20 text-[11px] text-indigo-200 flex items-center justify-center gap-2">
                <Clock className="w-3.5 h-3.5 text-cyan-400" />
                <span>Nazariya • Amaliyot • Loyiha • Natija</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 2. EXECUTIVE KPI CARDS (Soft, Modern, Borderless Design like Dashboard) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        <div className="bg-card text-card-foreground rounded-2xl p-5 shadow-[0_2px_14px_-2px_rgba(0,0,0,0.05)] dark:shadow-none hover:shadow-xl hover:-translate-y-1 transition-all duration-300 border-0 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-2xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                <BookOpen className="w-6 h-6" />
              </div>
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400">
                Jami
              </span>
            </div>
            <div className="space-y-1">
              <div className="flex items-baseline gap-2">
                <span className="text-3xl sm:text-4xl font-extrabold tracking-tight font-mono text-foreground">
                  {stats.total}
                </span>
                <span className="text-xs font-semibold text-muted-foreground">reja</span>
              </div>
              <h3 className="text-sm font-bold text-foreground">
                Jami Dars Rejalari
              </h3>
              <p className="text-xs text-muted-foreground">
                Barcha sinflar bo‘yicha metodik rejalar
              </p>
            </div>
          </div>
        </div>

        <div className="bg-card text-card-foreground rounded-2xl p-5 shadow-[0_2px_14px_-2px_rgba(0,0,0,0.05)] dark:shadow-none hover:shadow-xl hover:-translate-y-1 transition-all duration-300 border-0 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                Faol
              </span>
            </div>
            <div className="space-y-1">
              <div className="flex items-baseline gap-2">
                <span className="text-3xl sm:text-4xl font-extrabold tracking-tight font-mono text-emerald-600 dark:text-emerald-400">
                  {stats.published}
                </span>
                <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">chop etildi</span>
              </div>
              <h3 className="text-sm font-bold text-foreground">
                Chop Etilgan Darslar
              </h3>
              <p className="text-xs text-muted-foreground">
                Guruhlarga faol taqdim etilmoqda
              </p>
            </div>
          </div>
        </div>

        <div className="bg-card text-card-foreground rounded-2xl p-5 shadow-[0_2px_14px_-2px_rgba(0,0,0,0.05)] dark:shadow-none hover:shadow-xl hover:-translate-y-1 transition-all duration-300 border-0 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                <FileText className="w-6 h-6" />
              </div>
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400">
                Jarayonda
              </span>
            </div>
            <div className="space-y-1">
              <div className="flex items-baseline gap-2">
                <span className="text-3xl sm:text-4xl font-extrabold tracking-tight font-mono text-amber-600 dark:text-amber-400">
                  {stats.draft}
                </span>
                <span className="text-xs font-semibold text-amber-600 dark:text-amber-400">qoralama</span>
              </div>
              <h3 className="text-sm font-bold text-foreground">
                Qoralama & Tayyorlanmoqda
              </h3>
              <p className="text-xs text-muted-foreground">
                Mentorlar tomonidan to‘ldirilmoqda
              </p>
            </div>
          </div>
        </div>

        <div className="bg-card text-card-foreground rounded-2xl p-5 shadow-[0_2px_14px_-2px_rgba(0,0,0,0.05)] dark:shadow-none hover:shadow-xl hover:-translate-y-1 transition-all duration-300 border-0 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                <Clock className="w-6 h-6" />
              </div>
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                Standart
              </span>
            </div>
            <div className="space-y-1">
              <div className="flex items-baseline gap-2">
                <span className="text-3xl sm:text-4xl font-extrabold tracking-tight font-mono text-indigo-600 dark:text-indigo-400">
                  100%
                </span>
                <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-400">moslik</span>
              </div>
              <h3 className="text-sm font-bold text-foreground">
                80 Daqiqalik Format
              </h3>
              <p className="text-xs text-muted-foreground">
                4 bosqichli amaliy-nazariy taqsimot
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 3. FILTER, SEARCH AND VIEW TOGGLE BAR */}
      <div className="bg-card text-card-foreground rounded-2xl p-5 shadow-[0_2px_14px_-2px_rgba(0,0,0,0.04)] dark:shadow-none border-0 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative w-full sm:w-80">
          <Input
            type="text"
            placeholder="Dars yoki mavzu bo‘yicha qidiruv..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            leftIcon={<Search className="w-4 h-4 text-muted-foreground" />}
            className="pl-9 h-9 text-xs bg-muted/30 border-0 rounded-xl focus-visible:ring-1"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
          <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1 shrink-0">
            <Filter className="w-3.5 h-3.5" /> Filtr:
          </span>
          <select
            value={selectedGrade}
            onChange={(e) => setSelectedGrade(e.target.value)}
            aria-label="Sinf filtri"
            className="h-9 px-3 py-1.5 bg-muted/30 border-0 rounded-xl text-xs font-medium text-foreground focus:outline-none focus:ring-1 focus:ring-ring cursor-pointer shadow-none"
          >
            <option value="ALL">Barcha sinflar (8–11)</option>
            <option value="8">8-sinf</option>
            <option value="9">9-sinf</option>
            <option value="10">10-sinf</option>
            <option value="11">11-sinf</option>
          </select>

          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            aria-label="Holat filtri"
            className="h-9 px-3 py-1.5 bg-muted/30 border-0 rounded-xl text-xs font-medium text-foreground focus:outline-none focus:ring-1 focus:ring-ring cursor-pointer shadow-none"
          >
            <option value="ALL">Barcha holatlar</option>
            <option value="DRAFT">Qoralama (Draft)</option>
            <option value="PUBLISHED">Chop etilgan (Published)</option>
            <option value="COMPLETED">Yakunlangan (Completed)</option>
            <option value="ARCHIVED">Arxivlangan</option>
          </select>

          <div className="inline-flex rounded-xl bg-muted/50 p-1 border-0 ml-1">
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-lg text-xs font-medium transition cursor-pointer border-0 ${
                viewMode === 'grid'
                  ? 'bg-background text-foreground shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
              title="Karta ko‘rinishi (Grid)"
              aria-label="Grid view"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setViewMode('table')}
              className={`p-1.5 rounded-lg text-xs font-medium transition cursor-pointer border-0 ${
                viewMode === 'table'
                  ? 'bg-background text-foreground shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
              title="Jadval ko‘rinishi (Table)"
              aria-label="Table view"
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* 4. LESSON CONTENT (GRID / TABLE) */}
      {loading ? (
        <div className="py-20 text-center">
          <div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-xs text-muted-foreground">Dars rejalari yuklanmoqda...</p>
        </div>
      ) : filteredLessons.length === 0 ? (
        <div className="p-12 text-center rounded-3xl bg-card shadow-[0_2px_14px_-2px_rgba(0,0,0,0.04)] dark:shadow-none border-0">
          <BookOpen className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-40" />
          <h3 className="text-base font-bold text-foreground">Dars rejalari topilmadi</h3>
          <p className="text-xs text-muted-foreground mt-1 max-w-md mx-auto">
            Hozircha tanlangan parametrlar bo‘yicha darslar mavjud emas. Yangi dars rejasini yaratishingiz mumkin.
          </p>
          <Button variant="outline" size="sm" onClick={handleOpenCreate} className="mt-4 rounded-xl border-0 bg-muted/40 hover:bg-muted/70">
            <Plus className="w-3.5 h-3.5 mr-1" /> Yangi dars yaratish
          </Button>
        </div>
      ) : viewMode === 'table' ? (
        /* TABLE VIEW */
        <div className="rounded-2xl shadow-[0_2px_14px_-2px_rgba(0,0,0,0.04)] dark:shadow-none bg-card border-0 overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40 border-b border-border/15 hover:bg-transparent">
                <TableHead className="font-bold text-xs">Sinf & Fan</TableHead>
                <TableHead className="font-bold text-xs">Dars nomi</TableHead>
                <TableHead className="font-bold text-xs">80 Daqiqalik Taqsimot</TableHead>
                <TableHead className="font-bold text-xs">Holat</TableHead>
                <TableHead className="text-right font-bold text-xs">Amallar</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredLessons.map((lesson) => {
                const duration = lesson.durationMinutes || (lesson as any).estimatedDurationMinutes || 80;
                return (
                  <TableRow key={lesson.id} className="border-b border-border/10 hover:bg-muted/30 transition-colors">
                    <TableCell className="align-top py-3.5">
                      <div className="space-y-1">
                        <Badge variant="outline" className="bg-primary/10 text-primary border-0 text-[10px]">
                          {lesson.gradeLevel}
                        </Badge>
                        <div className="text-[11px] text-muted-foreground font-medium truncate max-w-[150px]">
                          {lesson.subject}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="align-top py-3.5">
                      <div className="space-y-1">
                        <div className="font-bold text-sm text-foreground hover:text-primary transition-colors">
                          {lesson.title}
                        </div>
                        {lesson.topic && (
                          <div className="text-xs text-muted-foreground line-clamp-1">
                            Mavzu: <span className="font-medium text-foreground">{lesson.topic}</span>
                          </div>
                        )}
                        {lesson.homework && (
                          <div className="text-[11px] text-muted-foreground line-clamp-1">
                            <span className="font-semibold text-secondary-foreground">Uyga vazifa:</span> {lesson.homework}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="align-top py-3.5">
                      <div className="space-y-1.5 min-w-[200px]">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="text-muted-foreground font-semibold flex items-center gap-1">
                            <Clock className="w-3 h-3 text-primary" /> Standart 80 daqiqalik taqsimot
                          </span>
                          <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                            {duration} daqiqa
                          </span>
                        </div>
                        <div className="grid grid-cols-4 gap-1 text-center text-[10px]">
                          <div className="bg-blue-500/10 text-blue-700 dark:text-blue-300 py-1 px-1 rounded-lg border-0 font-medium">
                            <div>Nazariya</div>
                            <div className="text-[9px] opacity-80">{lesson.theoryDurationMinutes || 20} daq</div>
                          </div>
                          <div className="bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 py-1 px-1 rounded-lg border-0 font-medium">
                            <div>Amaliyot</div>
                            <div className="text-[9px] opacity-80">{lesson.practicalDurationMinutes || 25} daq</div>
                          </div>
                          <div className="bg-purple-500/10 text-purple-700 dark:text-purple-300 py-1 px-1 rounded-lg border-0 font-medium">
                            <div>Loyiha</div>
                            <div className="text-[9px] opacity-80">25 daq</div>
                          </div>
                          <div className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 py-1 px-1 rounded-lg border-0 font-medium">
                            <div>Natija</div>
                            <div className="text-[9px] opacity-80">10 daq</div>
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="align-top py-3.5">
                      {getStatusBadge(lesson.status)}
                    </TableCell>
                    <TableCell className="align-top py-3.5 text-right">
                      <div className="flex items-center justify-end gap-1.5 flex-wrap">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedLesson(lesson);
                            setIsPreviewOpen(true);
                          }}
                          leftIcon={<Eye className="w-3.5 h-3.5" />}
                          className="rounded-xl text-xs bg-muted/30 hover:bg-muted/60 border-0"
                          title="Ko‘rish"
                        >
                          <span>Ko‘rish</span>
                        </Button>
                        <Button
                          variant="default"
                          size="sm"
                          onClick={() => {
                            setSelectedLesson(lesson);
                            setActiveDeliveryPhase(0);
                            setIsDeliveryMode(true);
                          }}
                          leftIcon={<Play className="w-3.5 h-3.5" />}
                          className="rounded-xl text-xs font-semibold border-0 shadow-xs"
                          title="Jonli dars o‘tkazish"
                        >
                          <span>Darsni Boshlash</span>
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setPresentationLesson(lesson);
                            setIsPresentationModalOpen(true);
                          }}
                          leftIcon={<Sparkles className="w-3.5 h-3.5 text-cyan-500" />}
                          className="rounded-xl text-xs bg-cyan-500/10 text-cyan-700 dark:text-cyan-300 hover:bg-cyan-500/20 border-0 font-semibold"
                          title="AI Maruza Taqdimoti"
                        >
                          <span>Taqdimot</span>
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedLesson(lesson);
                            setIsQualityModalOpen(true);
                          }}
                          leftIcon={<Award className="w-3.5 h-3.5 text-amber-500" />}
                          className="rounded-xl text-xs bg-muted/30 hover:bg-muted/60 border-0"
                          title="Sifat & Natijalar"
                        >
                          <span className="hidden xl:inline">Sifat</span>
                        </Button>
                        {lesson.status === 'DRAFT' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleStatusTransition(lesson, 'PUBLISHED')}
                            className="rounded-xl text-xs bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 border-0"
                            title="Chop etish"
                          >
                            <Send className="w-3.5 h-3.5 mr-1" />
                            <span>Chop etish</span>
                          </Button>
                        )}
                        {lesson.status === 'PUBLISHED' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleStatusTransition(lesson, 'COMPLETED')}
                            className="rounded-xl text-xs bg-blue-500/10 text-blue-600 dark:text-blue-400 hover:bg-blue-500/20 border-0"
                            title="Yakunlash"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                            <span>Yakunlash</span>
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleCloneLesson(lesson)}
                          className="h-8 w-8 rounded-xl text-muted-foreground hover:text-foreground border-0"
                          title="Nusxalash (Clone)"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleOpenEdit(lesson)}
                          className="h-8 w-8 rounded-xl text-muted-foreground hover:text-foreground border-0"
                          title="Tahrirlash"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      ) : (
        /* GRID VIEW (Modern Card Grid without harsh borders) */
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {filteredLessons.map((lesson) => {
            const duration = lesson.durationMinutes || (lesson as any).estimatedDurationMinutes || 80;
            return (
              <div
                key={lesson.id}
                className="bg-card text-card-foreground rounded-2xl p-5 shadow-[0_2px_14px_-2px_rgba(0,0,0,0.04)] dark:shadow-none hover:shadow-xl hover:-translate-y-1 transition-all duration-300 border-0 flex flex-col justify-between group"
              >
                <div>
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-primary/10 text-primary">
                          {lesson.gradeLevel}
                        </span>
                        <span className="text-[11px] font-semibold text-muted-foreground truncate max-w-[180px]">
                          {lesson.subject}
                        </span>
                      </div>
                      <h3 className="text-base font-bold text-foreground group-hover:text-primary transition-colors leading-snug">
                        {lesson.title}
                      </h3>
                    </div>
                    <div>{getStatusBadge(lesson.status)}</div>
                  </div>

                  {lesson.topic && (
                    <p className="text-xs text-muted-foreground font-medium line-clamp-1 mt-1">
                      Mavzu: <span className="text-foreground font-semibold">{lesson.topic}</span>
                    </p>
                  )}

                  {/* 80-Minute Phase Indicator Bar (Borderless) */}
                  <div className="p-3.5 rounded-2xl bg-muted/40 mt-3.5">
                    <div className="flex items-center justify-between text-[11px] font-bold text-muted-foreground mb-2">
                      <span className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-primary" />
                        <span>Standart 80 daqiqalik taqsimot</span>
                      </span>
                      <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold">
                        {duration} daqiqa
                      </span>
                    </div>

                    <div className="grid grid-cols-4 gap-1.5 text-center text-[10px]">
                      <div className="bg-blue-500/10 text-blue-700 dark:text-blue-300 py-1.5 rounded-xl">
                        <div className="font-bold">Nazariya</div>
                        <div className="text-[9px] opacity-80">{lesson.theoryDurationMinutes || 20} daq</div>
                      </div>
                      <div className="bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 py-1.5 rounded-xl">
                        <div className="font-bold">Amaliyot</div>
                        <div className="text-[9px] opacity-80">{lesson.practicalDurationMinutes || 25} daq</div>
                      </div>
                      <div className="bg-purple-500/10 text-purple-700 dark:text-purple-300 py-1.5 rounded-xl">
                        <div className="font-bold">Loyiha</div>
                        <div className="text-[9px] opacity-80">25 daq</div>
                      </div>
                      <div className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 py-1.5 rounded-xl">
                        <div className="font-bold">Natija</div>
                        <div className="text-[9px] opacity-80">10 daq</div>
                      </div>
                    </div>
                  </div>

                  {/* Homework snippet */}
                  {lesson.homework && (
                    <div className="text-xs text-muted-foreground line-clamp-1 mt-3">
                      <span className="font-semibold text-foreground">Uy vazifasi:</span> {lesson.homework}
                    </div>
                  )}
                </div>

                <div className="pt-3 mt-4 border-t border-border/15 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setSelectedLesson(lesson);
                        setIsPreviewOpen(true);
                      }}
                      leftIcon={<Eye className="w-3.5 h-3.5" />}
                      className="rounded-xl text-xs bg-muted/40 hover:bg-muted/70 text-foreground border-0"
                      title="Dars rejasini ko‘rish"
                    >
                      <span>Ko‘rish</span>
                    </Button>

                    <Button
                      variant="default"
                      size="sm"
                      onClick={() => {
                        setSelectedLesson(lesson);
                        setActiveDeliveryPhase(0);
                        setIsDeliveryMode(true);
                      }}
                      leftIcon={<Play className="w-3.5 h-3.5" />}
                      className="rounded-xl text-xs font-semibold border-0 shadow-xs"
                      title="Jonli dars o‘tkazish rejimi"
                    >
                      <span>Darsni Boshlash</span>
                    </Button>

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setPresentationLesson(lesson);
                        setIsPresentationModalOpen(true);
                      }}
                      leftIcon={<Sparkles className="w-3.5 h-3.5 text-cyan-500" />}
                      className="rounded-xl text-xs bg-cyan-500/10 text-cyan-700 dark:text-cyan-300 hover:bg-cyan-500/20 border-0 font-semibold"
                      title="AI Maruza Taqdimoti"
                    >
                      <span>Taqdimot</span>
                    </Button>

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setSelectedLesson(lesson);
                        setIsQualityModalOpen(true);
                      }}
                      leftIcon={<Award className="w-3.5 h-3.5 text-amber-500" />}
                      className="rounded-xl text-xs bg-muted/40 hover:bg-muted/70 text-foreground border-0"
                      title="Dars sifati, ta'lim natijalari va AI tavsiyalari"
                    >
                      <span className="hidden sm:inline">Sifat & Natijalar</span>
                    </Button>
                  </div>

                  <div className="flex items-center gap-1">
                    {lesson.status === 'DRAFT' && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleStatusTransition(lesson, 'PUBLISHED')}
                        className="rounded-xl text-xs bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 border-0"
                        title="Guruhga e’lon qilish (Publish)"
                      >
                        <Send className="w-3.5 h-3.5 mr-1" />
                        <span className="hidden sm:inline">Chop etish</span>
                      </Button>
                    )}

                    {lesson.status === 'PUBLISHED' && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleStatusTransition(lesson, 'COMPLETED')}
                        className="rounded-xl text-xs bg-blue-500/10 text-blue-600 dark:text-blue-400 hover:bg-blue-500/20 border-0"
                        title="Darsni yakunlash"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                        <span className="hidden sm:inline">Yakunlash</span>
                      </Button>
                    )}

                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleCloneLesson(lesson)}
                      className="h-8 w-8 rounded-xl text-muted-foreground hover:text-foreground border-0"
                      title="Nusxalash (Clone)"
                    >
                      <Copy className="w-4 h-4" />
                    </Button>

                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleOpenEdit(lesson)}
                      className="h-8 w-8 rounded-xl text-muted-foreground hover:text-foreground border-0"
                      title="Tahrirlash"
                    >
                      <Edit3 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ========================================================
          MODAL 1: Lesson Editor (Create / Edit via shadcn Dialog)
      ======================================================== */}
      <Dialog open={isEditorOpen} onOpenChange={setIsEditorOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto bg-card text-card-foreground border-0 rounded-3xl p-6 shadow-2xl">
          <DialogHeader className="border-b border-border/15 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
                <BookOpen className="w-5 h-5" />
              </div>
              <div>
                <DialogTitle className="text-base font-bold text-foreground">
                  {selectedLesson ? 'Dars Rejasini Tahrirlash' : 'Yangi 80 Daqiqalik Dars Rejasi'}
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground">
                  Al-Xorazmiy Vorislari ta’lim standartiga mos dars tuzilmasini shakllantiring
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="py-4 space-y-4 text-xs sm:text-sm">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2 space-y-1.5">
                <Label htmlFor="lesson-title" className="text-xs font-semibold text-foreground">
                  Dars nomi *
                </Label>
                <Input
                  id="lesson-title"
                  type="text"
                  value={formData.title || ''}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Masalan: JavaScript da Funksiyalar va Scope"
                  className="rounded-xl h-9 text-xs bg-muted/30 border-0 focus-visible:ring-1"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="lesson-grade" className="text-xs font-semibold text-foreground">
                  Sinf bosqichi
                </Label>
                <select
                  id="lesson-grade"
                  value={formData.gradeLevel || '8-sinf'}
                  onChange={(e) => setFormData({ ...formData, gradeLevel: e.target.value })}
                  className="h-9 w-full rounded-xl border-0 bg-muted/30 px-3 py-1.5 text-xs font-medium text-foreground focus:outline-none focus:ring-1 focus:ring-ring cursor-pointer shadow-none"
                >
                  <option value="8-sinf">8-sinf</option>
                  <option value="9-sinf">9-sinf</option>
                  <option value="10-sinf">10-sinf</option>
                  <option value="11-sinf">11-sinf</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="lesson-subject" className="text-xs font-semibold text-foreground">
                  O‘quv fani
                </Label>
                <Input
                  id="lesson-subject"
                  type="text"
                  value={formData.subject || ''}
                  onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                  placeholder="Web Full-Stack Development"
                  className="rounded-xl h-9 text-xs bg-muted/30 border-0 focus-visible:ring-1"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="lesson-group" className="text-xs font-semibold text-foreground">
                  Biriktirilgan guruh
                </Label>
                <select
                  id="lesson-group"
                  value={formData.groupId || ''}
                  onChange={(e) => setFormData({ ...formData, groupId: Number(e.target.value) })}
                  className="h-9 w-full rounded-xl border-0 bg-muted/30 px-3 py-1.5 text-xs font-medium text-foreground focus:outline-none focus:ring-1 focus:ring-ring cursor-pointer shadow-none"
                >
                  <option value="">Guruhni tanlang</option>
                  {groups.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.groupCode} — {g.gradeLevel} ({g.subject || 'IT'})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Theory and Practical Split */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 rounded-2xl bg-muted/30">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-blue-600 dark:text-blue-400 flex items-center gap-1.5">
                    <span>1. Nazariy qism</span>
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 text-[10px] font-bold">
                    20 daqiqa
                  </span>
                </div>
                <Textarea
                  rows={4}
                  value={formData.theoryContent || ''}
                  onChange={(e) => setFormData({ ...formData, theoryContent: e.target.value })}
                  placeholder="Nazariy mavzu tushunchasi, konsepsiyalar, slaydlardan asosiy nuqtalar..."
                  className="rounded-xl bg-background/80 border-0 text-xs focus-visible:ring-1"
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-indigo-600 dark:text-indigo-400 flex items-center gap-1.5">
                    <span>2. Amaliy qism (Live-Coding)</span>
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 text-[10px] font-bold">
                    25 daqiqa
                  </span>
                </div>
                <Textarea
                  rows={4}
                  value={formData.practicalContent || ''}
                  onChange={(e) => setFormData({ ...formData, practicalContent: e.target.value })}
                  placeholder="Amaliy kod namunalari, mentor bilan birgalikda yoziladigan loyiha qismi..."
                  className="rounded-xl font-mono text-xs bg-background/80 border-0 focus-visible:ring-1"
                />
              </div>
            </div>

            {/* Exercises and Homework */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="lesson-exercises" className="text-xs font-semibold text-foreground">
                  Sinfdagi mustaqil mashqlar (Loyiha - 25 daq)
                </Label>
                <Textarea
                  id="lesson-exercises"
                  rows={3}
                  value={formData.exercises || ''}
                  onChange={(e) => setFormData({ ...formData, exercises: e.target.value })}
                  placeholder="1. Masala: massiv elementlarini saralash..."
                  className="rounded-xl bg-muted/30 border-0 text-xs focus-visible:ring-1"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="lesson-homework" className="text-xs font-semibold text-foreground">
                  Uyga vazifa (Homework - 10 daq)
                </Label>
                <Textarea
                  id="lesson-homework"
                  rows={3}
                  value={formData.homework || ''}
                  onChange={(e) => setFormData({ ...formData, homework: e.target.value })}
                  placeholder="Keyingi darsgacha topshirilishi kerak bo‘lgan vazifa..."
                  className="rounded-xl bg-muted/30 border-0 text-xs focus-visible:ring-1"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="lesson-outcomes" className="text-xs font-semibold text-foreground">
                Kutilayotgan natijalar & Maqsad
              </Label>
              <Input
                id="lesson-outcomes"
                type="text"
                value={formData.expectedOutcomes || ''}
                onChange={(e) => setFormData({ ...formData, expectedOutcomes: e.target.value })}
                placeholder="Dars yakunida o‘quvchilar nimalarni mustaqil yarata oladilar..."
                className="rounded-xl h-9 text-xs bg-muted/30 border-0 focus-visible:ring-1"
              />
            </div>
          </div>

          <DialogFooter className="border-t border-border/15 pt-4 gap-2">
            <Button variant="ghost" size="sm" onClick={() => setIsEditorOpen(false)} className="rounded-xl border-0">
              Bekor qilish
            </Button>
            <Button variant="default" size="sm" onClick={handleSaveLesson} className="rounded-xl font-semibold border-0 shadow-xs">
              Dars rejasini saqlash
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ========================================================
          MODAL 2: Lesson Delivery Mode (Live Class Presentation)
      ======================================================== */}
      {isDeliveryMode && selectedLesson && (
        <div className="fixed inset-0 z-50 bg-background flex flex-col animate-in zoom-in-95">
          {/* Top Bar */}
          <div className="h-16 px-6 border-b border-border/15 bg-card/90 backdrop-blur-md flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-primary text-primary-foreground flex items-center justify-center font-bold text-xs shadow-md">
                80m
              </div>
              <div>
                <h2 className="text-sm sm:text-base font-extrabold text-foreground tracking-tight">
                  {selectedLesson.title}
                </h2>
                <span className="text-[11px] text-muted-foreground">
                  Jonli Dars Taqdimot Rejimi • {selectedLesson.gradeLevel} • {selectedLesson.subject}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2.5">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setPresentationLesson(selectedLesson);
                  setIsPresentationModalOpen(true);
                }}
                className="bg-primary/10 text-primary hover:bg-primary/20 rounded-xl border-0 font-semibold text-xs"
              >
                <Sparkles className="w-3.5 h-3.5 mr-1 text-amber-500" /> Slaydlar Taqdimoti (AI)
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleStatusTransition(selectedLesson, 'COMPLETED')}
                className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 rounded-xl border-0"
              >
                <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Darsni Yakunlash
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setIsDeliveryMode(false)} className="rounded-xl border-0 bg-muted/40 hover:bg-muted/70">
                Chiqish (Esc)
              </Button>
            </div>
          </div>

          {/* Delivery Phase Tabs */}
          <div className="px-6 py-3 bg-muted/30 border-b border-border/15 flex items-center gap-3 overflow-x-auto text-xs font-semibold">
            {[
              { id: 0, title: '1. Tushunish (Nazariya)', duration: '20 daqiqa' },
              { id: 1, title: '2. Amaliyot (Live Coding)', duration: '25 daqiqa' },
              { id: 2, title: '3. Loyiha (Mustaqil ish)', duration: '25 daqiqa' },
              { id: 3, title: '4. Natija & Uy vazifasi', duration: '10 daqiqa' },
            ].map((phase) => (
              <button
                key={phase.id}
                type="button"
                onClick={() => setActiveDeliveryPhase(phase.id)}
                className={`px-4 py-2 rounded-xl transition cursor-pointer flex items-center gap-2 border-0 ${
                  activeDeliveryPhase === phase.id
                    ? 'bg-primary text-primary-foreground shadow-sm font-bold'
                    : 'bg-card text-muted-foreground hover:text-foreground'
                }`}
              >
                <span>{phase.title}</span>
                <span className="text-[10px] opacity-80">({phase.duration})</span>
              </button>
            ))}
          </div>

          {/* Delivery Content Area */}
          <div className="flex-1 p-6 sm:p-10 overflow-y-auto max-w-5xl mx-auto w-full">
            {activeDeliveryPhase === 0 && (
              <div className="space-y-6 animate-in fade-in">
                <div className="rounded-2xl bg-blue-500/10 text-blue-800 dark:text-blue-300 p-4 border-0">
                  <h3 className="font-bold text-sm">Nazariy tushuncha va metodologiya (20 daqiqa)</h3>
                  <p className="text-xs mt-1 opacity-90">O‘quvchilar e’tiborini yangi tushunchaga jalb qiling va real misollarni ko‘rsating.</p>
                </div>
                <div className="rounded-3xl bg-card text-card-foreground shadow-[0_2px_14px_-2px_rgba(0,0,0,0.05)] dark:shadow-none p-6 space-y-4 border-0">
                  <h4 className="text-lg font-bold text-foreground">Nazariy Reja:</h4>
                  <RichTextRenderer
                    content={selectedLesson.theoryContent || (selectedLesson as any).theoreticalSection || 'Ushbu dars uchun maxsus nazariy ma’lumot kiritilmagan.'}
                  />
                </div>
              </div>
            )}

            {activeDeliveryPhase === 1 && (
              <div className="space-y-6 animate-in fade-in">
                <div className="rounded-2xl bg-indigo-500/10 text-indigo-800 dark:text-indigo-300 p-4 border-0">
                  <h3 className="font-bold text-sm">Amaliyot & Birgalikda kod yozish (25 daqiqa)</h3>
                  <p className="text-xs mt-1 opacity-90">Mentor ekranda kod yozadi, o‘quvchilar bir vaqtning o‘zida o‘z kompyuterlarida takrorlaydilar.</p>
                </div>
                <div className="rounded-3xl bg-card text-card-foreground shadow-[0_2px_14px_-2px_rgba(0,0,0,0.05)] dark:shadow-none p-6 space-y-4 border-0">
                  <h4 className="text-lg font-bold text-foreground">Amaliy Ko‘rsatmalar:</h4>
                  <RichTextRenderer
                    content={selectedLesson.practicalContent || (selectedLesson as any).practicalSection || '// Amaliyot kodi yoki mashqlar'}
                  />
                </div>
              </div>
            )}

            {activeDeliveryPhase === 2 && (
              <div className="space-y-6 animate-in fade-in">
                <div className="rounded-2xl bg-purple-500/10 text-purple-800 dark:text-purple-300 p-4 border-0">
                  <h3 className="font-bold text-sm">Loyiha & Mustaqil mini-task (25 daqiqa)</h3>
                  <p className="text-xs mt-1 opacity-90">O‘quvchilar o‘rganilgan bilimlar asosida mustaqil modul yaratadilar. Mentor yordam beradi.</p>
                </div>
                <div className="rounded-3xl bg-card text-card-foreground shadow-[0_2px_14px_-2px_rgba(0,0,0,0.05)] dark:shadow-none p-6 space-y-4 border-0">
                  <h4 className="text-lg font-bold text-foreground">Mustaqil Mashqlar:</h4>
                  <RichTextRenderer
                    content={selectedLesson.exercises || 'Mashqlar ko‘rsatilmagan.'}
                  />
                </div>
              </div>
            )}

            {activeDeliveryPhase === 3 && (
              <div className="space-y-6 animate-in fade-in">
                <div className="rounded-2xl bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 p-4 border-0">
                  <h3 className="font-bold text-sm">Natija, Qayta aloqa & Uyga vazifa (10 daqiqa)</h3>
                  <p className="text-xs mt-1 opacity-90">Har bir o‘quvchi natijasi tekshiriladi, xatolar tahlil qilinadi va uy vazifasi beriladi.</p>
                </div>
                <div className="rounded-3xl bg-card text-card-foreground shadow-[0_2px_14px_-2px_rgba(0,0,0,0.05)] dark:shadow-none p-6 space-y-4 border-0">
                  <h4 className="text-lg font-bold text-foreground">Uyga vazifa:</h4>
                  <div className="p-4 bg-emerald-500/10 rounded-2xl">
                    <RichTextRenderer
                      content={selectedLesson.homework || 'Uy vazifasi kiritilmagan.'}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================
          MODAL 3: Lesson Preview (shadcn Dialog)
      ======================================================== */}
      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        {selectedLesson && (
          <DialogContent className="max-w-3xl max-h-[88vh] overflow-y-auto bg-card text-card-foreground border-0 rounded-3xl p-6 sm:p-8 shadow-2xl">
            <DialogHeader className="border-b border-border/15 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
                  <BookOpen className="w-5 h-5" />
                </div>
                <div>
                  <DialogTitle className="text-base sm:text-lg font-bold text-foreground">
                    {selectedLesson.title}
                  </DialogTitle>
                  <DialogDescription className="text-xs text-muted-foreground">
                    {selectedLesson.gradeLevel} • {selectedLesson.subject}
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>

            <div className="space-y-4 text-xs sm:text-sm py-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3.5 rounded-2xl bg-muted/40">
                  <span className="font-bold text-foreground block mb-1">Maqsad:</span>
                  <span className="text-muted-foreground leading-relaxed">{selectedLesson.learningObjectives || 'N/A'}</span>
                </div>
                <div className="p-3.5 rounded-2xl bg-muted/40">
                  <span className="font-bold text-foreground block mb-1">Kutilayotgan natija:</span>
                  <span className="text-muted-foreground leading-relaxed">{selectedLesson.expectedOutcomes || 'N/A'}</span>
                </div>
              </div>

              <div className="p-5 rounded-2xl bg-blue-500/5 dark:bg-blue-950/20 border border-blue-500/15">
                <div className="font-bold text-sm text-blue-600 dark:text-blue-400 mb-2">
                  1. Nazariya va Metodik Tushuncha (20 daq):
                </div>
                <RichTextRenderer
                  content={selectedLesson.theoryContent || (selectedLesson as any).theoreticalSection || 'N/A'}
                />
              </div>

              <div className="p-5 rounded-2xl bg-indigo-500/5 dark:bg-indigo-950/20 border border-indigo-500/15">
                <div className="font-bold text-sm text-indigo-600 dark:text-indigo-400 mb-2">
                  2. Amaliyot & Live-Coding (25 daq):
                </div>
                <RichTextRenderer
                  content={selectedLesson.practicalContent || (selectedLesson as any).practicalSection || 'N/A'}
                />
              </div>

              <div className="p-5 rounded-2xl bg-purple-500/5 dark:bg-purple-950/20 border border-purple-500/15">
                <div className="font-bold text-sm text-purple-600 dark:text-purple-400 mb-2">
                  3. Mustaqil Mashqlar & Laboratoriya (25 daq):
                </div>
                <RichTextRenderer
                  content={selectedLesson.exercises || 'N/A'}
                />
              </div>

              <div className="p-5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-950 dark:text-emerald-200">
                <div className="font-bold text-sm text-emerald-700 dark:text-emerald-400 mb-2">
                  4. Uyga Vazifa & Portfolio (10 daq):
                </div>
                <RichTextRenderer
                  content={selectedLesson.homework || 'N/A'}
                />
              </div>
            </div>

            <DialogFooter className="border-t border-border/15 pt-4">
              <Button variant="ghost" size="sm" onClick={() => setIsPreviewOpen(false)} className="rounded-xl border-0">
                Yopish
              </Button>
            </DialogFooter>
          </DialogContent>
        )}
      </Dialog>

      {/* Lesson Quality & Learning Outcomes Modal */}
      <LessonQualityModal
        isOpen={isQualityModalOpen}
        onClose={() => setIsQualityModalOpen(false)}
        lesson={selectedLesson as any}
      />

      {/* AI Rich-Text Presentation Modal */}
      <AiPresentationModal
        isOpen={isPresentationModalOpen}
        onClose={() => {
          setIsPresentationModalOpen(false);
          setPresentationLesson(null);
        }}
        lesson={presentationLesson}
        onSaveSuccess={(updated) => {
          setLessons((prev) => prev.map((l) => (l.id === updated.id ? updated : l)));
          if (selectedLesson?.id === updated.id) {
            setSelectedLesson(updated);
          }
        }}
      />
    </div>
  );
};

// Default initial lessons if no database records are present yet
function getDefaultSampleLessons(): LessonPlanDto[] {
  return DEFAULT_LESSONS;
}
