import React, { useState, useEffect, useMemo } from 'react';
import {
  Calendar as CalendarIcon,
  Clock,
  MapPin,
  Users,
  Plus,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  CheckCheck,
  CalendarDays,
  Search,
  CheckCircle2,
  AlertCircle,
  GraduationCap,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { attendanceApi } from '@/api';
import { useTranslation } from '@/shared/i18n';
import { useOptionalAuth } from '@/features/auth/AuthContext';
import { AttendanceSheetModal } from './AttendanceSheetModal';
import { CreateLessonModal } from './CreateLessonModal';
import { RescheduleLessonModal } from './RescheduleLessonModal';
import type { LessonSessionDto, StudyGroup, Mentor } from '@/types';

interface AttendanceCalendarProps {
  groups: StudyGroup[];
  mentors: Mentor[];
}

export const AttendanceCalendar: React.FC<AttendanceCalendarProps> = ({
  groups,
  mentors,
}) => {
  const { t, locale } = useTranslation();
  const auth = useOptionalAuth();
  const isAdmin = auth ? auth.isAdmin : true;
  const isMentor = auth ? auth.isMentor : true;
  const canManageAttendance = isAdmin || isMentor;

  const [sessions, setSessions] = useState<LessonSessionDto[]>([]);
  const [todaySessions, setTodaySessions] = useState<LessonSessionDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [viewMode, setViewMode] = useState<'day' | 'week' | 'month'>('week');
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [searchQuery, setSearchQuery] = useState('');

  // Filters
  const [selectedMentor, setSelectedMentor] = useState<string>('all');
  const [selectedGroup, setSelectedGroup] = useState<string>('all');

  // Modals
  const [attendanceSession, setAttendanceSession] = useState<LessonSessionDto | null>(null);
  const [isAttendanceOpen, setIsAttendanceOpen] = useState(false);
  const [rescheduleSession, setRescheduleSession] = useState<LessonSessionDto | null>(null);
  const [isRescheduleOpen, setIsRescheduleOpen] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const loadData = async () => {
    try {
      setLoading(true);
      const mentorIdNum = selectedMentor !== 'all' ? Number(selectedMentor) : undefined;
      const groupIdNum = selectedGroup !== 'all' ? Number(selectedGroup) : undefined;

      const [sessRes, todayRes] = await Promise.all([
        attendanceApi.getSessions(undefined, undefined, mentorIdNum, groupIdNum),
        attendanceApi.getTodaySessions(mentorIdNum),
      ]);

      setSessions(sessRes.data.data);
      setTodaySessions(todayRes.data.data);
    } catch (err) {
      console.error('Failed to load sessions:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedMentor, selectedGroup]);

  const handleCancelSession = async (session: LessonSessionDto, e?: React.MouseEvent) => {
    e?.stopPropagation();
    const reason = window.prompt(
      t('schedule.cancelReasonPrompt', { subject: session.subject })
    );
    if (!reason || !reason.trim()) return;

    try {
      await attendanceApi.cancelSession(session.id, reason.trim());
      loadData();
    } catch {
      alert(t('schedule.cancelError'));
    }
  };

  const handleOpenAttendance = (session: LessonSessionDto, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setAttendanceSession(session);
    setIsAttendanceOpen(true);
  };

  const handleOpenReschedule = (session: LessonSessionDto, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setRescheduleSession(session);
    setIsRescheduleOpen(true);
  };

  const handlePrev = () => {
    const d = new Date(currentDate);
    if (viewMode === 'day') d.setDate(d.getDate() - 1);
    else if (viewMode === 'week') d.setDate(d.getDate() - 7);
    else d.setMonth(d.getMonth() - 1);
    setCurrentDate(d);
  };

  const handleNext = () => {
    const d = new Date(currentDate);
    if (viewMode === 'day') d.setDate(d.getDate() + 1);
    else if (viewMode === 'week') d.setDate(d.getDate() + 7);
    else d.setMonth(d.getMonth() + 1);
    setCurrentDate(d);
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  const getSessionDate = (s: LessonSessionDto): Date => {
    if (s.lessonDate) {
      const time = s.startTime && s.startTime.length === 5 ? s.startTime : '00:00';
      const d = new Date(`${s.lessonDate}T${time}:00`);
      if (!isNaN(d.getTime())) return d;
    }
    if (s.startTime && s.startTime.includes('T')) {
      const d = new Date(s.startTime);
      if (!isNaN(d.getTime())) return d;
    }
    return new Date();
  };

  // Filter sessions according to viewMode, currentDate & searchQuery
  const filteredSessions = useMemo(() => {
    return sessions.filter((s) => {
      const sessDate = getSessionDate(s);
      let dateMatch: boolean;

      if (viewMode === 'day') {
        dateMatch =
          sessDate.getFullYear() === currentDate.getFullYear() &&
          sessDate.getMonth() === currentDate.getMonth() &&
          sessDate.getDate() === currentDate.getDate();
      } else if (viewMode === 'week') {
        const d = new Date(currentDate);
        const day = d.getDay();
        const diff = d.getDate() - day + (day === 0 ? -6 : 1);
        const startOfWeek = new Date(d.setDate(diff));
        startOfWeek.setHours(0, 0, 0, 0);

        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(endOfWeek.getDate() + 6);
        endOfWeek.setHours(23, 59, 59, 999);

        dateMatch = sessDate >= startOfWeek && sessDate <= endOfWeek;
      } else {
        dateMatch =
          sessDate.getFullYear() === currentDate.getFullYear() &&
          sessDate.getMonth() === currentDate.getMonth();
      }

      if (!dateMatch) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const sub = (s.subject || '').toLowerCase();
        const top = (s.topic || '').toLowerCase();
        const grp = (s.groupCode || s.groupName || '').toLowerCase();
        const mnt = (s.mentorName || '').toLowerCase();
        const rm = (s.room || s.roomNumber || '').toLowerCase();
        return sub.includes(q) || top.includes(q) || grp.includes(q) || mnt.includes(q) || rm.includes(q);
      }

      return true;
    });
  }, [sessions, viewMode, currentDate, searchQuery]);

  // Today summary stats
  const todayTotal = todaySessions.length;
  const todayCompleted = todaySessions.filter((s) => s.status === 'COMPLETED').length;
  const todayScheduled = todaySessions.filter((s) => s.status === 'SCHEDULED').length;
  const todayCancelled = todaySessions.filter((s) => s.status === 'CANCELLED').length;

  const totalPresentToday = todaySessions.reduce((acc, sess) => {
    return acc + (sess.attendanceRecords?.filter((r) => r.status === 'PRESENT').length || 0);
  }, 0);
  const totalRosterToday = todaySessions.reduce((acc, sess) => {
    return acc + (sess.attendanceRecords?.length || 0);
  }, 0);
  const todayAttendanceRate = totalRosterToday > 0 ? Math.round((totalPresentToday / totalRosterToday) * 100) : 0;

  return (
    <div className="space-y-6 sm:space-y-7 animate-in fade-in duration-300">
      {/* 1. EXECUTIVE HERO BANNER (Borderless, Luxury Ambient Style like Dashboard) */}
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
                  <CalendarIcon className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Muhammad Al-Xorazmiy Vorislari</span>
                </span>

                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md text-slate-200 text-xs font-medium">
                  <Clock className="w-3.5 h-3.5 text-cyan-300" />
                  <span className="capitalize">
                    {currentDate.toLocaleDateString(locale === 'uz' ? 'uz-UZ' : locale === 'ru' ? 'ru-RU' : 'en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </span>
                </span>
              </div>

              <div>
                <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight leading-tight">
                  {t('schedule.title')}
                </h1>
                <p className="text-slate-300 text-xs sm:text-sm leading-relaxed max-w-xl mt-1.5">
                  {t('schedule.subtitle')}
                </p>
              </div>

              <div className="pt-2 flex flex-wrap items-center gap-3">
                {canManageAttendance && (
                  <Button
                    onClick={() => setIsCreateOpen(true)}
                    size="default"
                    className="bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white shadow-lg shadow-indigo-600/30 font-semibold border-0 rounded-xl"
                  >
                    <Plus className="w-4 h-4 mr-2 text-cyan-200" />
                    <span>{t('schedule.planNewLesson')}</span>
                  </Button>
                )}

                <Button
                  onClick={loadData}
                  disabled={loading}
                  variant="secondary"
                  className="bg-white/10 hover:bg-white/15 text-white border-0 font-medium rounded-xl backdrop-blur-md"
                >
                  <RefreshCw className={`w-3.5 h-3.5 mr-1.5 text-blue-300 ${loading ? 'animate-spin' : ''}`} />
                  <span>{t('common.refresh')}</span>
                </Button>
              </div>
            </div>

            {/* Quick Metrics Pillar in Hero */}
            <div className="lg:shrink-0 grid grid-cols-2 gap-3 bg-white/5 backdrop-blur-xl rounded-2xl p-4 sm:p-5 text-center">
              <div className="p-4 rounded-xl bg-white/5">
                <span className="text-[10px] uppercase font-bold text-cyan-300 block tracking-wider">
                  Bugungi darslar
                </span>
                <span className="text-2xl font-black text-white font-mono mt-1 block">
                  {todayTotal}
                </span>
                <span className="text-[10px] text-slate-400 mt-0.5 block">
                  Rejadagi mashg‘ulotlar
                </span>
              </div>

              <div className="p-4 rounded-xl bg-white/5">
                <span className="text-[10px] uppercase font-bold text-emerald-300 block tracking-wider">
                  Qatnashish ko‘rsatkichi
                </span>
                <span className="text-2xl font-black text-emerald-400 font-mono mt-1 block">
                  {totalRosterToday > 0 ? `${todayAttendanceRate}%` : '100%'}
                </span>
                <span className="text-[10px] text-slate-400 mt-0.5 block">
                  O‘quvchilar faolligi
                </span>
              </div>

              <div className="col-span-2 p-3 rounded-xl bg-indigo-500/20 text-[11px] text-indigo-200 flex items-center justify-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400" />
                <span>Barcha darslar belgilangan standart asosida nazoratda</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 2. EXECUTIVE KPI CARDS (Soft, Modern, Borderless Design like Dashboard) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        {/* KPI 1: Today total */}
        <div className="bg-card text-card-foreground rounded-2xl p-5 shadow-[0_2px_14px_-2px_rgba(0,0,0,0.05)] dark:shadow-none hover:shadow-xl hover:-translate-y-1 transition-all duration-300 border-0 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-2xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                <CalendarDays className="w-6 h-6" />
              </div>
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400">
                Bugun
              </span>
            </div>
            <div className="space-y-1">
              <div className="flex items-baseline gap-2">
                <span className="text-3xl sm:text-4xl font-extrabold tracking-tight font-mono text-foreground">
                  {todayTotal}
                </span>
                <span className="text-xs font-semibold text-muted-foreground">mashg‘ulot</span>
              </div>
              <h3 className="text-sm font-bold text-foreground">
                {t('schedule.todaySummary')}
              </h3>
              <p className="text-xs text-muted-foreground">
                Bugun rejalashtirilgan barcha guruh darslari
              </p>
            </div>
          </div>
        </div>

        {/* KPI 2: Scheduled */}
        <div className="bg-card text-card-foreground rounded-2xl p-5 shadow-[0_2px_14px_-2px_rgba(0,0,0,0.05)] dark:shadow-none hover:shadow-xl hover:-translate-y-1 transition-all duration-300 border-0 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                <Clock className="w-6 h-6" />
              </div>
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                Kutilmoqda
              </span>
            </div>
            <div className="space-y-1">
              <div className="flex items-baseline gap-2">
                <span className="text-3xl sm:text-4xl font-extrabold tracking-tight font-mono text-foreground">
                  {todayScheduled}
                </span>
                <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-400">navbatda</span>
              </div>
              <h3 className="text-sm font-bold text-foreground">
                {t('status.scheduled')}
              </h3>
              <p className="text-xs text-muted-foreground">
                Boshlanishi kutilayotgan dars mashg‘ulotlari
              </p>
            </div>
          </div>
        </div>

        {/* KPI 3: Completed */}
        <div className="bg-card text-card-foreground rounded-2xl p-5 shadow-[0_2px_14px_-2px_rgba(0,0,0,0.05)] dark:shadow-none hover:shadow-xl hover:-translate-y-1 transition-all duration-300 border-0 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                O‘tildi
              </span>
            </div>
            <div className="space-y-1">
              <div className="flex items-baseline gap-2">
                <span className="text-3xl sm:text-4xl font-extrabold tracking-tight font-mono text-emerald-600 dark:text-emerald-400">
                  {todayCompleted}
                </span>
                <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">yakunlandi</span>
              </div>
              <h3 className="text-sm font-bold text-foreground">
                {t('status.completed')}
              </h3>
              <p className="text-xs text-muted-foreground">
                Muvaffaqiyatli yakunlangan darslar
              </p>
            </div>
          </div>
        </div>

        {/* KPI 4: Attendance Rate */}
        <div className="bg-card text-card-foreground rounded-2xl p-5 shadow-[0_2px_14px_-2px_rgba(0,0,0,0.05)] dark:shadow-none hover:shadow-xl hover:-translate-y-1 transition-all duration-300 border-0 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-2xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center">
                <CheckCheck className="w-6 h-6" />
              </div>
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-full bg-purple-500/10 text-purple-600 dark:text-purple-400">
                {todayCancelled > 0 ? `${todayCancelled} bekor` : 'Davomat'}
              </span>
            </div>
            <div className="space-y-1">
              <div className="flex items-baseline gap-2">
                <span className="text-3xl sm:text-4xl font-extrabold tracking-tight font-mono text-foreground">
                  {totalRosterToday > 0 ? `${todayAttendanceRate}%` : '—'}
                </span>
                <span className="text-xs font-semibold text-purple-600 dark:text-purple-400">faollik</span>
              </div>
              <h3 className="text-sm font-bold text-foreground">
                Bugungi Davomat
              </h3>
              <p className="text-xs text-muted-foreground">
                Mashg‘ulotlarda ishtirok etgan o‘quvchilar
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 3. CONTROL BAR: Date Navigation, Search, View Mode, Filters */}
      <div className="bg-card text-card-foreground rounded-2xl p-5 shadow-[0_2px_14px_-2px_rgba(0,0,0,0.04)] dark:shadow-none border-0 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* Date Navigation */}
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={handlePrev}
              className="h-8 w-8 rounded-xl bg-muted/40 hover:bg-muted/70 text-foreground border-0"
              aria-label="Oldingi sana"
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleToday}
              className="h-8 text-xs font-semibold px-3 rounded-xl bg-muted/40 hover:bg-muted/70 text-foreground border-0"
            >
              {t('schedule.today')}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleNext}
              className="h-8 w-8 rounded-xl bg-muted/40 hover:bg-muted/70 text-foreground border-0"
              aria-label="Keyingi sana"
            >
              <ChevronRight className="w-4 h-4" />
            </Button>

            <div className="flex items-center gap-2 ml-2">
              <CalendarIcon className="w-4 h-4 text-primary" />
              <span className="text-sm font-bold text-foreground capitalize">
                {currentDate.toLocaleDateString(locale === 'uz' ? 'uz-UZ' : locale === 'ru' ? 'ru-RU' : 'en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: viewMode === 'day' ? 'numeric' : undefined,
                })}
              </span>
            </div>
          </div>

          {/* View Mode Toggle via Shadcn Tabs */}
          <div className="flex items-center gap-2">
            <Tabs value={viewMode} onValueChange={(val) => setViewMode(val as 'day' | 'week' | 'month')}>
              <TabsList className="h-9 bg-muted/50 p-1 rounded-xl border-0">
                <TabsTrigger
                  value="day"
                  className="h-7 text-xs px-3 font-semibold rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-xs border-0"
                >
                  {t('schedule.viewDay')}
                </TabsTrigger>
                <TabsTrigger
                  value="week"
                  className="h-7 text-xs px-3 font-semibold rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-xs border-0"
                >
                  {t('schedule.viewWeek')}
                </TabsTrigger>
                <TabsTrigger
                  value="month"
                  className="h-7 text-xs px-3 font-semibold rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-xs border-0"
                >
                  {t('schedule.viewMonth')}
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </div>

        {/* Search & Select Filters */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 border-t border-border/15">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Fan, mavzu, xona yoki mentor bo‘yicha qidiruv..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9 text-xs bg-muted/30 border-0 rounded-xl focus-visible:ring-1"
            />
          </div>

          <select
            value={selectedMentor}
            onChange={(e) => setSelectedMentor(e.target.value)}
            aria-label={t('schedule.mentorFilter')}
            className="w-full text-xs h-9 rounded-xl border-0 bg-muted/30 px-3 py-1.5 text-foreground shadow-none focus:outline-none focus:ring-1 focus:ring-ring cursor-pointer"
          >
            <option value="all">{t('schedule.allMentors')}</option>
            {mentors.map((m) => (
              <option key={m.id} value={m.id.toString()}>
                {m.fullName}
              </option>
            ))}
          </select>

          <select
            value={selectedGroup}
            onChange={(e) => setSelectedGroup(e.target.value)}
            aria-label={t('schedule.groupFilter')}
            className="w-full text-xs h-9 rounded-xl border-0 bg-muted/30 px-3 py-1.5 text-foreground shadow-none focus:outline-none focus:ring-1 focus:ring-ring cursor-pointer"
          >
            <option value="all">{t('schedule.allGroups')}</option>
            {groups.map((g) => (
              <option key={g.id} value={g.id.toString()}>
                {g.name || g.groupCode}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* 4. SESSIONS GRID */}
      {loading ? (
        <div className="py-20 text-center space-y-3">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs text-muted-foreground font-medium">{t('common.loading')}</p>
        </div>
      ) : filteredSessions.length === 0 ? (
        <div className="bg-card text-card-foreground rounded-3xl p-12 text-center shadow-[0_2px_14px_-2px_rgba(0,0,0,0.04)] dark:shadow-none border-0">
          <CalendarIcon className="w-12 h-12 text-muted-foreground/40 mx-auto mb-3" />
          <h3 className="text-base font-bold text-foreground">
            {t('schedule.noSessionsTitle')}
          </h3>
          <p className="text-xs text-muted-foreground mt-1 mb-4 max-w-sm mx-auto">
            {t('schedule.noSessionsDesc')}
          </p>
          {canManageAttendance && (
            <Button
              variant="default"
              size="sm"
              onClick={() => setIsCreateOpen(true)}
              className="gap-1.5 rounded-xl border-0 shadow-sm"
            >
              <Plus className="w-4 h-4" />
              <span>{t('schedule.addLessonBtn')}</span>
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredSessions.map((session) => {
            const startDate = getSessionDate(session);
            const dateStr = startDate.toLocaleDateString(locale === 'uz' ? 'uz-UZ' : locale === 'ru' ? 'ru-RU' : 'en-US', {
              weekday: 'short',
              day: 'numeric',
              month: 'short',
            });
            const timeStr = session.startTime && session.endTime
              ? `${session.startTime} - ${session.endTime}`
              : startDate.toTimeString().substring(0, 5);

            const presentRecs = session.attendanceRecords?.filter((r) => r.status === 'PRESENT').length || 0;
            const absentRecs = session.attendanceRecords?.filter((r) => r.status === 'ABSENT').length || 0;
            const hasAttendance = session.attendanceRecords && session.attendanceRecords.length > 0;
            const totalRoster = session.attendanceRecords?.length || 0;

            const isCancelled = session.status === 'CANCELLED';
            const isCompleted = session.status === 'COMPLETED';
            const isRescheduled = session.status === 'RESCHEDULED';

            return (
              <div
                key={session.id}
                onClick={() => {
                  if (canManageAttendance) {
                    handleOpenAttendance(session);
                  }
                }}
                className={`bg-card text-card-foreground rounded-2xl p-5 shadow-[0_2px_14px_-2px_rgba(0,0,0,0.04)] dark:shadow-none hover:shadow-xl hover:-translate-y-1 transition-all duration-300 border-0 flex flex-col justify-between group ${
                  canManageAttendance ? 'cursor-pointer' : ''
                } ${
                  isCancelled ? 'opacity-85 bg-destructive/5 dark:bg-destructive/10' : ''
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-foreground">
                      <Clock className="w-3.5 h-3.5 text-primary" />
                      <span>{dateStr}, {timeStr}</span>
                    </div>

                    <span
                      className={`text-[10px] uppercase font-bold px-2.5 py-0.5 rounded-full ${
                        isCompleted
                          ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                          : isCancelled
                          ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
                          : isRescheduled
                          ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                          : 'bg-blue-500/10 text-blue-600 dark:text-blue-400'
                      }`}
                    >
                      {isCompleted
                        ? t('status.completed')
                        : isCancelled
                        ? t('status.cancelled')
                        : isRescheduled
                        ? t('status.rescheduled')
                        : t('status.scheduled')}
                    </span>
                  </div>

                  <h3 className="text-base font-bold text-foreground group-hover:text-primary transition-colors line-clamp-1">
                    {session.subject}
                  </h3>
                  {session.topic && (
                    <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
                      {t('schedule.topic')}: <span className="text-foreground font-medium">{session.topic}</span>
                    </p>
                  )}

                  {/* Group & Room Details (Soft borderless card) */}
                  <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground bg-muted/40 rounded-xl p-3 mt-3">
                    <div className="flex items-center gap-1.5 truncate">
                      <Users className="w-3.5 h-3.5 text-primary shrink-0" />
                      <span className="font-semibold text-foreground truncate">
                        {session.groupCode || session.groupName || `Guruh #${session.groupId}`}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 truncate">
                      <MapPin className="w-3.5 h-3.5 text-primary shrink-0" />
                      <span className="truncate">
                        {session.room || session.roomNumber || t('schedule.noRoom')}
                      </span>
                    </div>
                  </div>

                  {/* Mentor Info */}
                  <div className="flex items-center justify-between text-xs mt-3">
                    <div className="flex items-center gap-1.5 text-muted-foreground truncate">
                      <GraduationCap className="w-3.5 h-3.5 text-muted-foreground" />
                      <span className="text-[11px]">{t('roles.ROLE_MENTOR')}:</span>
                      <span className="font-semibold text-foreground truncate">
                        {session.mentorName}
                      </span>
                    </div>
                  </div>

                  {/* Cancellation Reason alert if cancelled */}
                  {session.cancellationReason && (
                    <div className="p-2.5 rounded-xl bg-destructive/10 text-destructive text-[11px] mt-2.5">
                      <span className="font-bold">{t('schedule.cancelReason')}: </span>
                      {session.cancellationReason}
                    </div>
                  )}

                  {/* Attendance Summary Badge */}
                  <div className="mt-3">
                    {hasAttendance ? (
                      <div className="flex items-center gap-2 text-xs">
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[11px] font-bold">
                          ✓ {t('schedule.presentCount', { count: presentRecs })}
                        </span>
                        {absentRecs > 0 && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-rose-500/10 text-rose-600 dark:text-rose-400 text-[11px] font-bold">
                            ✕ {t('schedule.absentCount', { count: absentRecs })}
                          </span>
                        )}
                        <span className="text-[10px] text-muted-foreground ml-auto font-mono font-semibold">
                          {Math.round((presentRecs / totalRoster) * 100)}%
                        </span>
                      </div>
                    ) : !isCancelled ? (
                      <div className="text-[11px] text-amber-600 dark:text-amber-400 flex items-center gap-1.5 font-medium">
                        <AlertCircle className="w-3.5 h-3.5" />
                        <span>Davomat kutilmoqda</span>
                      </div>
                    ) : null}
                  </div>
                </div>

                {/* Footer Controls */}
                {canManageAttendance && (
                  <div className="pt-3 mt-4 border-t border-border/15 flex items-center justify-between gap-2">
                    <Button
                      variant={hasAttendance ? 'secondary' : 'default'}
                      size="sm"
                      onClick={(e) => handleOpenAttendance(session, e)}
                      className="text-xs h-8 gap-1 font-semibold rounded-xl border-0 shadow-xs"
                    >
                      <CheckCheck className="w-3.5 h-3.5" />
                      <span>{hasAttendance ? t('schedule.editAttendance') : t('schedule.takeAttendance')}</span>
                    </Button>

                    {!isCancelled && (
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => handleOpenReschedule(session, e)}
                          className="h-8 text-xs text-muted-foreground hover:text-foreground rounded-xl"
                          title={t('schedule.reschedule')}
                        >
                          {t('schedule.reschedule')}
                        </Button>

                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => handleCancelSession(session, e)}
                          className="h-8 text-xs text-destructive hover:bg-destructive/10 rounded-xl"
                          title={t('common.cancel')}
                        >
                          {t('common.cancel')}
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Modals */}
      {canManageAttendance && (
        <>
          <AttendanceSheetModal
            session={attendanceSession}
            isOpen={isAttendanceOpen}
            onClose={() => {
              setIsAttendanceOpen(false);
              setAttendanceSession(null);
            }}
            onSuccess={() => {
              loadData();
            }}
          />

          <RescheduleLessonModal
            session={rescheduleSession}
            isOpen={isRescheduleOpen}
            onClose={() => {
              setIsRescheduleOpen(false);
              setRescheduleSession(null);
            }}
            onSuccess={() => {
              loadData();
            }}
          />

          <CreateLessonModal
            isOpen={isCreateOpen}
            onClose={() => setIsCreateOpen(false)}
            groups={groups}
            mentors={mentors}
            onSuccess={() => {
              loadData();
            }}
          />
        </>
      )}
    </div>
  );
};
