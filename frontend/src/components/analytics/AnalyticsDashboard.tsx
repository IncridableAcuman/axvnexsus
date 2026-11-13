import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  FileDown,
  Calendar,
  CheckCircle2,
  Award,
  Users,
  Info,
  ChevronRight,
  Download,
  HelpCircle,
  BarChart3,
  Percent,
  Clock,
  Activity,
  GraduationCap,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
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
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { useToast } from '@/shared/ui/toast/ToastContext';
import { useTranslation } from '@/shared/i18n';
import { analyticsApi } from '@/api';
import { cn } from '@/lib/utils';
import type {
  DashboardOverviewDto,
  GroupAnalyticsDto,
  IndividualStudentAnalyticsDto,
  MetricRuleDocumentationDto,
  StudyGroup,
  Student,
} from '@/types';

interface AnalyticsDashboardProps {
  groups: StudyGroup[];
  students: Student[];
}

export const AnalyticsDashboard: React.FC<AnalyticsDashboardProps> = ({ groups, students }) => {
  const toast = useToast();
  const { t } = useTranslation();

  // Active view: 'overview' | 'group' | 'student' | 'rules'
  const [activeView, setActiveView] = useState<'overview' | 'group' | 'student' | 'rules'>('overview');

  // Filters
  const [selectedGroupId, setSelectedGroupId] = useState<number>(groups[0]?.id || 10);
  const [selectedStudentId, setSelectedStudentId] = useState<number | undefined>(students[0]?.id);
  const [dateRangePreset, setDateRangePreset] = useState<'7d' | '30d' | 'semester' | 'custom'>('30d');
  const [customFrom, setCustomFrom] = useState<string>('');
  const [customTo, setCustomTo] = useState<string>('');

  // Data states
  const [loading, setLoading] = useState<boolean>(true);
  const [overviewData, setOverviewData] = useState<DashboardOverviewDto | null>(null);
  const [groupData, setGroupData] = useState<GroupAnalyticsDto | null>(null);
  const [studentData, setStudentData] = useState<IndividualStudentAnalyticsDto | null>(null);
  const [rulesDoc, setRulesDoc] = useState<MetricRuleDocumentationDto | null>(null);

  // PDF Export Modal State
  const [isPdfModalOpen, setIsPdfModalOpen] = useState(false);
  const [selectedReportType, setSelectedReportType] = useState<string>('group');
  const [downloadingPdf, setDownloadingPdf] = useState(false);

  // Compute dates based on preset
  const getDateRange = () => {
    const today = new Date();
    const toStr = today.toISOString().split('T')[0];
    if (dateRangePreset === '7d') {
      const d = new Date();
      d.setDate(d.getDate() - 7);
      return { from: d.toISOString().split('T')[0], to: toStr };
    }
    if (dateRangePreset === '30d') {
      const d = new Date();
      d.setDate(d.getDate() - 30);
      return { from: d.toISOString().split('T')[0], to: toStr };
    }
    if (dateRangePreset === 'semester') {
      const d = new Date();
      d.setMonth(d.getMonth() - 3);
      return { from: d.toISOString().split('T')[0], to: toStr };
    }
    return { from: customFrom || undefined, to: customTo || undefined };
  };

  const loadData = async () => {
    try {
      setLoading(true);
      const { from, to } = getDateRange();

      const [overviewRes, groupRes, studentRes, rulesRes] = await Promise.all([
        analyticsApi.getOverview({ from, to }),
        selectedGroupId ? analyticsApi.getGroupAnalytics(selectedGroupId, { from, to }) : Promise.resolve({ data: null }),
        selectedStudentId ? analyticsApi.getStudentAnalytics(selectedStudentId, { from, to }) : Promise.resolve({ data: null }),
        analyticsApi.getRules(),
      ]);

      setOverviewData(overviewRes.data);
      setGroupData(groupRes.data);
      setStudentData(studentRes.data);
      setRulesDoc(rulesRes.data);
    } catch (err) {
      console.error('Analytics load error:', err);
      toast.error(t('analytics.toast.loadError'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedGroupId, selectedStudentId, dateRangePreset, customFrom, customTo]);

  // PDF download handler
  const handleDownloadPdf = async (reportType: string) => {
    try {
      setDownloadingPdf(true);
      const { from, to } = getDateRange();
      let targetId: number | undefined;

      if (reportType === 'student') targetId = selectedStudentId;
      else if (reportType === 'group' || reportType === 'attendance' || reportType === 'lesson-completion') targetId = selectedGroupId;
      else if (reportType === 'assessment') targetId = 1;
      else if (reportType === 'mentor') targetId = 1;
      else if (reportType === 'academic-period') targetId = 1;

      const res = await analyticsApi.downloadPdf(reportType, targetId, { from, to });
      const blob = new Blob([res.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `axm_report_${reportType}_${new Date().toISOString().split('T')[0]}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      toast.success(t('analytics.toast.pdfSuccess'));
      setIsPdfModalOpen(false);
    } catch (err) {
      console.error('PDF export error:', err);
      toast.error(t('analytics.toast.pdfError'));
    } finally {
      setDownloadingPdf(false);
    }
  };

  const reportTypes = [
    { id: 'student', label: t('analytics.pdfModal.reports.student.label'), desc: t('analytics.pdfModal.reports.student.desc') },
    { id: 'group', label: t('analytics.pdfModal.reports.group.label'), desc: t('analytics.pdfModal.reports.group.desc') },
    { id: 'assessment', label: t('analytics.pdfModal.reports.assessment.label'), desc: t('analytics.pdfModal.reports.assessment.desc') },
    { id: 'attendance', label: t('analytics.pdfModal.reports.attendance.label'), desc: t('analytics.pdfModal.reports.attendance.desc') },
    { id: 'lesson-completion', label: t('analytics.pdfModal.reports.lessonCompletion.label'), desc: t('analytics.pdfModal.reports.lessonCompletion.desc') },
    { id: 'mentor', label: t('analytics.pdfModal.reports.mentor.label'), desc: t('analytics.pdfModal.reports.mentor.desc') },
    { id: 'subjects', label: t('analytics.pdfModal.reports.subjects.label'), desc: t('analytics.pdfModal.reports.subjects.desc') },
    { id: 'academic-period', label: t('analytics.pdfModal.reports.academicPeriod.label'), desc: t('analytics.pdfModal.reports.academicPeriod.desc') },
  ];

  return (
    <div className="space-y-6 sm:space-y-7 max-w-7xl mx-auto pb-16 animate-in fade-in duration-300">
      {/* 1. EXECUTIVE HERO BANNER (Borderless, Luxury Ambient Style like Dashboard) */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 text-white shadow-xl border-0">
        {/* Soft Ambient Glows */}
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-indigo-500/15 rounded-full blur-3xl pointer-events-none -mr-32 -mt-32" />
        <div className="absolute bottom-0 left-1/3 w-[350px] h-[350px] bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="p-7 sm:p-9 lg:p-10 relative z-10">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="max-w-2xl space-y-3.5">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 backdrop-blur-md text-cyan-300 text-xs font-semibold">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <BarChart3 className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Muhammad Al-Xorazmiy Vorislari</span>
                </span>

                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md text-slate-200 text-xs font-medium">
                  <Clock className="w-3.5 h-3.5 text-cyan-300" />
                  <span>{t('analytics.moduleBadge')}</span>
                </span>
              </div>

              <div>
                <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight leading-tight">
                  {t('analytics.title')}
                </h1>
                <p className="text-slate-300 text-xs sm:text-sm leading-relaxed max-w-xl mt-1.5">
                  {t('analytics.subtitle')}
                </p>
              </div>

              <div className="pt-2 flex flex-wrap items-center gap-3">
                <Button
                  onClick={() => setIsPdfModalOpen(true)}
                  size="default"
                  className="bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white shadow-lg shadow-indigo-600/30 font-semibold border-0 rounded-xl cursor-pointer"
                >
                  <FileDown className="w-4 h-4 mr-2 text-cyan-200" />
                  <span>{t('analytics.exportPdfBtn')}</span>
                </Button>

                <Button
                  onClick={() => setActiveView('rules')}
                  variant="secondary"
                  className="bg-white/10 hover:bg-white/15 text-white border-0 font-medium rounded-xl backdrop-blur-md cursor-pointer"
                >
                  <HelpCircle className="w-4 h-4 mr-1.5 text-cyan-300" />
                  <span>{t('analytics.metricRules')}</span>
                </Button>
              </div>
            </div>

            {/* Quick Metrics Pillar in Hero (Borderless Luxury Style) */}
            <div className="lg:shrink-0 grid grid-cols-2 gap-3 bg-white/5 backdrop-blur-xl rounded-2xl p-4 sm:p-5 text-center">
              <div className="p-4 rounded-xl bg-white/5">
                <span className="text-[10px] uppercase font-bold text-cyan-300 block tracking-wider">
                  Dars standarti
                </span>
                <span className="text-2xl font-black text-white font-mono mt-1 block">
                  80 min
                </span>
                <span className="text-[10px] text-slate-400 mt-0.5 block">
                  4-bosqichli dars metodi
                </span>
              </div>

              <div className="p-4 rounded-xl bg-white/5">
                <span className="text-[10px] uppercase font-bold text-emerald-300 block tracking-wider">
                  Eksport hisobotlar
                </span>
                <span className="text-2xl font-black text-emerald-400 font-mono mt-1 block">
                  8 ta tur
                </span>
                <span className="text-[10px] text-slate-400 mt-0.5 block">
                  PDF & Shaffof audit
                </span>
              </div>

              <div className="col-span-2 p-3 rounded-xl bg-indigo-500/20 text-[11px] text-indigo-200 flex items-center justify-center gap-2">
                <Activity className="w-3.5 h-3.5 text-cyan-400" />
                <span>
                  AXM Nexus Ta‘lim Analitikasi Markazi
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Top Control & Navigation Bar (Soft, Borderless Design like Dashboard) */}
      <Tabs value={activeView} onValueChange={(val) => setActiveView(val as any)} className="w-full space-y-6">
        <div className="bg-card text-card-foreground p-3 sm:p-4 rounded-2xl shadow-[0_2px_14px_-2px_rgba(0,0,0,0.04)] dark:shadow-none border-0 flex flex-wrap items-center justify-between gap-3 sm:gap-4">
          {/* Main Navigation Tabs */}
          <TabsList className="bg-muted/60 p-1 rounded-xl h-9 sm:h-10 border-0">
            <TabsTrigger
              value="overview"
              className="rounded-lg text-xs font-semibold px-3 py-1.5 data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-xs border-0 transition-all cursor-pointer"
            >
              {t('analytics.tabs.overview')}
            </TabsTrigger>
            <TabsTrigger
              value="group"
              className="rounded-lg text-xs font-semibold px-3 py-1.5 data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-xs border-0 transition-all cursor-pointer"
            >
              {t('analytics.tabs.group')}
            </TabsTrigger>
            <TabsTrigger
              value="student"
              className="rounded-lg text-xs font-semibold px-3 py-1.5 data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-xs border-0 transition-all cursor-pointer"
            >
              {t('analytics.tabs.student')}
            </TabsTrigger>
            <TabsTrigger
              value="rules"
              className="rounded-lg text-xs font-semibold px-3 py-1.5 data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-xs border-0 transition-all cursor-pointer"
            >
              {t('analytics.tabs.rules')}
            </TabsTrigger>
          </TabsList>

          {/* Context Selectors & Date Range Presets */}
          <div className="flex flex-wrap items-center gap-2">
            {activeView === 'group' && (
              <div className="flex items-center gap-1.5 animate-in fade-in-50 duration-150">
                <Users className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                <select
                  aria-label={t('analytics.aria.selectGroup')}
                  value={selectedGroupId}
                  onChange={(e) => setSelectedGroupId(Number(e.target.value))}
                  className="h-8 rounded-lg border-0 bg-muted/50 hover:bg-muted/80 px-2.5 py-1 text-xs font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1 cursor-pointer transition-colors"
                >
                  {groups.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.groupCode} ({g.gradeLevel})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {activeView === 'student' && (
              <div className="flex items-center gap-1.5 animate-in fade-in-50 duration-150">
                <GraduationCap className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                <select
                  aria-label={t('analytics.aria.selectStudent')}
                  value={selectedStudentId}
                  onChange={(e) => setSelectedStudentId(Number(e.target.value))}
                  className="h-8 rounded-lg border-0 bg-muted/50 hover:bg-muted/80 px-2.5 py-1 text-xs font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1 cursor-pointer transition-colors"
                >
                  {students.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.fullName} ({s.gradeLevel})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Date Range Selector Pill Group */}
            <div className="flex items-center gap-1 bg-muted/60 p-1 rounded-xl text-xs font-medium border-0">
              <Calendar className="w-3.5 h-3.5 text-muted-foreground ml-1.5 shrink-0" />
              <button
                type="button"
                onClick={() => setDateRangePreset('7d')}
                className={cn(
                  'px-2.5 py-1 rounded-lg transition-all text-xs font-medium cursor-pointer border-0',
                  dateRangePreset === '7d'
                    ? 'bg-background font-bold text-emerald-600 dark:text-emerald-400 shadow-xs'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                {t('analytics.datePresets.sevenDays')}
              </button>
              <button
                type="button"
                onClick={() => setDateRangePreset('30d')}
                className={cn(
                  'px-2.5 py-1 rounded-lg transition-all text-xs font-medium cursor-pointer border-0',
                  dateRangePreset === '30d'
                    ? 'bg-background font-bold text-emerald-600 dark:text-emerald-400 shadow-xs'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                {t('analytics.datePresets.thirtyDays')}
              </button>
              <button
                type="button"
                onClick={() => setDateRangePreset('semester')}
                className={cn(
                  'px-2.5 py-1 rounded-lg transition-all text-xs font-medium cursor-pointer border-0',
                  dateRangePreset === 'semester'
                    ? 'bg-background font-bold text-emerald-600 dark:text-emerald-400 shadow-xs'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                {t('analytics.datePresets.semester')}
              </button>
              <button
                type="button"
                onClick={() => setDateRangePreset('custom')}
                className={cn(
                  'px-2.5 py-1 rounded-lg transition-all text-xs font-medium cursor-pointer border-0',
                  dateRangePreset === 'custom'
                    ? 'bg-background font-bold text-emerald-600 dark:text-emerald-400 shadow-xs'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                {t('analytics.datePresets.custom')}
              </button>
            </div>

            {dateRangePreset === 'custom' && (
              <div className="flex items-center gap-1.5 text-xs animate-in fade-in-50 duration-150">
                <Input
                  type="date"
                  aria-label={t('analytics.aria.startDate')}
                  value={customFrom}
                  onChange={(e) => setCustomFrom(e.target.value)}
                  className="h-8 text-xs bg-muted/40 border-0 w-32"
                />
                <span className="text-muted-foreground font-bold">-</span>
                <Input
                  type="date"
                  aria-label={t('analytics.aria.endDate')}
                  value={customTo}
                  onChange={(e) => setCustomTo(e.target.value)}
                  className="h-8 text-xs bg-muted/40 border-0 w-32"
                />
              </div>
            )}
          </div>
        </div>

        {/* 3. Loading State (Shadcn Skeleton, Borderless) */}
        {loading && !overviewData ? (
          <div className="space-y-6 animate-in fade-in-50 duration-200">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="bg-card text-card-foreground rounded-2xl p-5 shadow-[0_2px_14px_-2px_rgba(0,0,0,0.04)] dark:shadow-none border-0 space-y-3">
                  <div className="flex items-center justify-between">
                    <Skeleton className="h-3 w-24" />
                    <Skeleton className="h-8 w-8 rounded-xl" />
                  </div>
                  <Skeleton className="h-8 w-20" />
                  <Skeleton className="h-2 w-full" />
                  <Skeleton className="h-3 w-32" />
                </div>
              ))}
            </div>

            <div className="bg-card text-card-foreground rounded-2xl shadow-[0_2px_14px_-2px_rgba(0,0,0,0.04)] dark:shadow-none border-0 overflow-hidden">
              <div className="p-5 border-b border-border/10 flex items-center justify-between">
                <Skeleton className="h-5 w-64" />
                <Skeleton className="h-6 w-28 rounded-md" />
              </div>
              <div className="p-6 space-y-4">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="flex items-center justify-between gap-4">
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="h-4 w-36" />
                    <Skeleton className="h-4 w-28" />
                    <Skeleton className="h-4 w-12" />
                    <Skeleton className="h-4 w-12" />
                    <Skeleton className="h-4 w-12" />
                  </div>
                ))}
              </div>
            </div>

            <div className="py-4 text-center">
              <p className="text-xs text-muted-foreground font-medium animate-pulse">
                {t('analytics.loadingReports')}
              </p>
            </div>
          </div>
        ) : (
          <>
            {/* VIEW 1: OVERVIEW DASHBOARD */}
            <TabsContent value="overview" className="mt-0 space-y-6">
              {overviewData && (
                <>
                  {/* Primary KPI Metric Cards (Soft, Borderless, Dashboard Style) */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-5">
                    {/* KPI 1: Attendance */}
                    <div className="bg-card text-card-foreground rounded-2xl p-5 shadow-[0_2px_14px_-2px_rgba(0,0,0,0.05)] dark:shadow-none hover:shadow-xl hover:-translate-y-1 transition-all duration-300 border-0 flex flex-col justify-between group relative overflow-hidden">
                      <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 dark:bg-emerald-500/10 rounded-bl-full pointer-events-none transition-transform group-hover:scale-110" />
                      <div>
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                            {t('analytics.kpi.avgAttendance')}
                          </span>
                          <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center border-0">
                            <Percent className="w-5 h-5" />
                          </div>
                        </div>
                        <div className="text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground font-mono">
                          {overviewData.systemWideAttendanceRate}%
                        </div>
                      </div>
                      <div className="space-y-1.5 pt-3">
                        <div className="h-1.5 w-full bg-emerald-500/15 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-emerald-600 dark:bg-emerald-400 rounded-full transition-all duration-500"
                            style={{ width: `${Math.min(overviewData.systemWideAttendanceRate, 100)}%` }}
                          />
                        </div>
                        <div className="text-[11px] text-muted-foreground flex items-center justify-between pt-0.5">
                          <span className="text-emerald-700 dark:text-emerald-300 font-semibold">
                            {t('analytics.kpi.denominatorLabel')}
                          </span>
                          <span className="truncate">{t('analytics.kpi.canceledExcluded')}</span>
                        </div>
                      </div>
                    </div>

                    {/* KPI 2: Average Score */}
                    <div className="bg-card text-card-foreground rounded-2xl p-5 shadow-[0_2px_14px_-2px_rgba(0,0,0,0.05)] dark:shadow-none hover:shadow-xl hover:-translate-y-1 transition-all duration-300 border-0 flex flex-col justify-between group relative overflow-hidden">
                      <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 dark:bg-blue-500/10 rounded-bl-full pointer-events-none transition-transform group-hover:scale-110" />
                      <div>
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                            {t('analytics.kpi.avgScore')}
                          </span>
                          <div className="w-10 h-10 rounded-2xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center border-0">
                            <Award className="w-5 h-5" />
                          </div>
                        </div>
                        <div className="text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground font-mono">
                          {overviewData.systemWideAverageScore}%
                        </div>
                      </div>
                      <div className="space-y-1.5 pt-3">
                        <div className="h-1.5 w-full bg-blue-500/15 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-blue-600 dark:bg-blue-400 rounded-full transition-all duration-500"
                            style={{ width: `${Math.min(overviewData.systemWideAverageScore, 100)}%` }}
                          />
                        </div>
                        <div className="text-[11px] text-muted-foreground pt-0.5 truncate">
                          {t('analytics.kpi.testsAndTasks')}
                        </div>
                      </div>
                    </div>

                    {/* KPI 3: Completed Lessons */}
                    <div className="bg-card text-card-foreground rounded-2xl p-5 shadow-[0_2px_14px_-2px_rgba(0,0,0,0.05)] dark:shadow-none hover:shadow-xl hover:-translate-y-1 transition-all duration-300 border-0 flex flex-col justify-between group relative overflow-hidden">
                      <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/5 dark:bg-indigo-500/10 rounded-bl-full pointer-events-none transition-transform group-hover:scale-110" />
                      <div>
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                            {t('analytics.kpi.completedLessons')}
                          </span>
                          <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center border-0">
                            <CheckCircle2 className="w-5 h-5" />
                          </div>
                        </div>
                        <div className="text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground font-mono">
                          {overviewData.totalCompletedLessons} {t('analytics.units.count')}
                        </div>
                      </div>
                      <div className="pt-3">
                        <div className="text-[11px] text-muted-foreground flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                          <span className="truncate">{t('analytics.kpi.eightyMinuteStandard')}</span>
                        </div>
                      </div>
                    </div>

                    {/* KPI 4: Active Groups & Students */}
                    <div className="bg-card text-card-foreground rounded-2xl p-5 shadow-[0_2px_14px_-2px_rgba(0,0,0,0.05)] dark:shadow-none hover:shadow-xl hover:-translate-y-1 transition-all duration-300 border-0 flex flex-col justify-between group relative overflow-hidden">
                      <div className="absolute top-0 right-0 w-24 h-24 bg-purple-500/5 dark:bg-purple-500/10 rounded-bl-full pointer-events-none transition-transform group-hover:scale-110" />
                      <div>
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                            {t('analytics.kpi.groupsStudents')}
                          </span>
                          <div className="w-10 h-10 rounded-2xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center border-0">
                            <Users className="w-5 h-5" />
                          </div>
                        </div>
                        <div className="text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground font-mono">
                          {overviewData.activeGroups} / {overviewData.totalStudents}
                        </div>
                      </div>
                      <div className="pt-3">
                        <div className="text-[11px] text-muted-foreground flex items-center gap-1.5">
                          <Activity className="w-3.5 h-3.5 text-purple-500 shrink-0" />
                          <span className="truncate">{t('analytics.kpi.branchLocation')}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Group Comparison Table (Clean, Borderless Layout like Dashboard) */}
                  <div className="bg-card text-card-foreground rounded-2xl shadow-[0_2px_14px_-2px_rgba(0,0,0,0.04)] dark:shadow-none border-0 overflow-hidden">
                    <div className="p-5 border-b border-border/10 flex flex-row items-center justify-between space-y-0 bg-muted/15">
                      <div className="flex items-center gap-2.5">
                        <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center border-0">
                          <TrendingUp className="w-5 h-5" />
                        </div>
                        <div>
                          <h2 className="text-base font-bold text-foreground">
                            {t('analytics.overview.tableTitle')}
                          </h2>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            Muhammad Al-Xorazmiy Vorislari akademik natijalari
                          </p>
                        </div>
                      </div>
                      <span className="text-xs px-2.5 py-1 rounded-full bg-muted/50 font-medium text-muted-foreground border-0">
                        {t('analytics.overview.realDataBadge')}
                      </span>
                    </div>

                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-muted/20 hover:bg-muted/20 border-b border-border/20">
                            <TableHead className="font-semibold text-xs py-3.5 px-4">{t('analytics.overview.cols.groupCode')}</TableHead>
                            <TableHead className="font-semibold text-xs py-3.5 px-4">{t('analytics.overview.cols.gradeSubject')}</TableHead>
                            <TableHead className="font-semibold text-xs py-3.5 px-4">{t('analytics.overview.cols.mentor')}</TableHead>
                            <TableHead className="font-semibold text-xs py-3.5 px-4 text-center">{t('analytics.overview.cols.students')}</TableHead>
                            <TableHead className="font-semibold text-xs py-3.5 px-4 text-center">{t('analytics.overview.cols.attendancePct')}</TableHead>
                            <TableHead className="font-semibold text-xs py-3.5 px-4 text-center">{t('analytics.overview.cols.avgScore')}</TableHead>
                            <TableHead className="font-semibold text-xs py-3.5 px-4 text-center">{t('analytics.overview.cols.completedLessons')}</TableHead>
                            <TableHead className="font-semibold text-xs py-3.5 px-4 text-right">{t('analytics.overview.cols.action')}</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {(overviewData.groupComparisons || []).map((gc) => (
                            <TableRow key={gc.groupId} className="hover:bg-muted/40 transition-colors border-b border-border/10 last:border-b-0">
                              <TableCell className="font-bold text-primary font-mono py-3.5 px-4">{gc.groupCode}</TableCell>
                              <TableCell className="py-3.5 px-4">
                                <div className="font-semibold text-foreground text-xs">{gc.gradeLevel}</div>
                                <div className="text-[11px] text-muted-foreground">{gc.subject}</div>
                              </TableCell>
                              <TableCell className="py-3.5 px-4 text-foreground text-xs font-medium">{gc.mentorName}</TableCell>
                              <TableCell className="py-3.5 px-4 text-center text-xs font-medium">{gc.studentCount} {t('analytics.units.persons')}</TableCell>
                              <TableCell className="py-3.5 px-4 text-center">
                                <Badge variant={gc.attendanceRate >= 90 ? 'success' : 'warning'} className="font-bold font-mono border-0">
                                  {gc.attendanceRate}%
                                </Badge>
                              </TableCell>
                              <TableCell className="py-3.5 px-4 text-center font-bold text-foreground text-xs font-mono">{gc.averageAssessmentScore}%</TableCell>
                              <TableCell className="py-3.5 px-4 text-center text-xs font-medium">{gc.completedLessons} {t('analytics.units.count')}</TableCell>
                              <TableCell className="py-3.5 px-4 text-right">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="text-xs font-semibold text-primary hover:text-primary hover:bg-primary/10 gap-1 h-8 cursor-pointer rounded-xl border-0"
                                  onClick={() => {
                                    setSelectedGroupId(gc.groupId);
                                    setActiveView('group');
                                  }}
                                >
                                  {t('analytics.overview.analyzeBtn')}
                                  <ChevronRight className="w-3.5 h-3.5" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                </>
              )}
            </TabsContent>

            {/* VIEW 2: GROUP PERFORMANCE */}
            <TabsContent value="group" className="mt-0 space-y-6">
              {groupData && (
                <>
                  {/* Group Banner (Borderless) */}
                  <div className="bg-card text-card-foreground rounded-2xl p-6 shadow-[0_2px_14px_-2px_rgba(0,0,0,0.04)] dark:shadow-none border-0 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2.5 flex-wrap">
                        <h2 className="text-lg font-bold text-foreground tracking-tight">
                          {t('analytics.groupView.group')}: {groupData.groupCode} ({groupData.gradeLevel})
                        </h2>
                        <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 font-semibold border-0">
                          {groupData.subject}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
                        {t('analytics.groupView.responsibleMentor')}: <span className="font-semibold text-foreground">{groupData.mentorName}</span> | {t('analytics.groupView.branch')}: <span className="text-foreground">{groupData.branchLocation}</span> | {t('analytics.groupView.students')}: <span className="font-semibold text-foreground">{groupData.studentCount} {t('analytics.units.persons')}</span>
                      </p>
                    </div>

                    <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
                      <Button
                        variant="secondary"
                        size="sm"
                        className="gap-1.5 text-xs font-semibold bg-muted/50 hover:bg-muted text-foreground border-0 rounded-xl cursor-pointer"
                        onClick={() => handleDownloadPdf('attendance')}
                      >
                        <Download className="w-3.5 h-3.5 text-muted-foreground" />
                        {t('analytics.groupView.attendancePdf')}
                      </Button>
                      <Button
                        variant="default"
                        size="sm"
                        className="gap-1.5 text-xs font-semibold shadow-sm bg-primary text-primary-foreground border-0 rounded-xl cursor-pointer"
                        onClick={() => handleDownloadPdf('group')}
                      >
                        <Download className="w-3.5 h-3.5" />
                        {t('analytics.groupView.fullGroupPdf')}
                      </Button>
                    </div>
                  </div>

                  {/* Group KPI Cards (Borderless, Dashboard Style) */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-5">
                    <div className="bg-card text-card-foreground rounded-2xl p-5 shadow-[0_2px_14px_-2px_rgba(0,0,0,0.05)] dark:shadow-none hover:shadow-xl hover:-translate-y-1 transition-all duration-300 border-0 space-y-2">
                      <span className="text-xs text-muted-foreground font-semibold uppercase tracking-wider block">
                        {t('analytics.kpi.avgAttendance')}
                      </span>
                      <div className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400 font-mono">
                        {groupData.averageAttendanceRate}%
                      </div>
                      <div className="h-1.5 w-full bg-emerald-500/15 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-emerald-600 dark:bg-emerald-400 rounded-full"
                          style={{ width: `${Math.min(groupData.averageAttendanceRate, 100)}%` }}
                        />
                      </div>
                      <div className="text-[10px] text-muted-foreground">{t('analytics.groupView.excusedExcluded')}</div>
                    </div>

                    <div className="bg-card text-card-foreground rounded-2xl p-5 shadow-[0_2px_14px_-2px_rgba(0,0,0,0.05)] dark:shadow-none hover:shadow-xl hover:-translate-y-1 transition-all duration-300 border-0 space-y-2">
                      <span className="text-xs text-muted-foreground font-semibold uppercase tracking-wider block">
                        {t('analytics.kpi.avgScore')}
                      </span>
                      <div className="text-2xl font-extrabold text-blue-600 dark:text-blue-400 font-mono">
                        {groupData.averageAssessmentScore}%
                      </div>
                      <div className="h-1.5 w-full bg-blue-500/15 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-blue-600 dark:bg-blue-400 rounded-full"
                          style={{ width: `${Math.min(groupData.averageAssessmentScore, 100)}%` }}
                        />
                      </div>
                      <div className="text-[10px] text-muted-foreground">{t('analytics.groupView.basedOnTests')}</div>
                    </div>

                    <div className="bg-card text-card-foreground rounded-2xl p-5 shadow-[0_2px_14px_-2px_rgba(0,0,0,0.05)] dark:shadow-none hover:shadow-xl hover:-translate-y-1 transition-all duration-300 border-0 space-y-2">
                      <span className="text-xs text-muted-foreground font-semibold uppercase tracking-wider block">
                        {t('analytics.kpi.completedLessons')}
                      </span>
                      <div className="text-2xl font-extrabold text-foreground font-mono">
                        {groupData.totalLessonsConducted} {t('analytics.units.count')}
                      </div>
                      <div className="h-1.5 w-full bg-indigo-500/15 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-indigo-600 dark:bg-indigo-400 rounded-full"
                          style={{
                            width: `${Math.min((groupData.totalLessonsConducted / (groupData.totalLessonsPlanned || 1)) * 100, 100)}%`,
                          }}
                        />
                      </div>
                      <div className="text-[10px] text-muted-foreground">
                        {t('analytics.groupView.plannedOutOf', { count: groupData.totalLessonsPlanned })}
                      </div>
                    </div>

                    <div className="bg-card text-card-foreground rounded-2xl p-5 shadow-[0_2px_14px_-2px_rgba(0,0,0,0.05)] dark:shadow-none hover:shadow-xl hover:-translate-y-1 transition-all duration-300 border-0 space-y-2">
                      <span className="text-xs text-muted-foreground font-semibold uppercase tracking-wider block">
                        {t('analytics.groupView.assignmentCompletion')}
                      </span>
                      <div className="text-2xl font-extrabold text-purple-600 dark:text-purple-400 font-mono">
                        {groupData.averageAssignmentCompletionRate}%
                      </div>
                      <div className="h-1.5 w-full bg-purple-500/15 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-purple-600 dark:bg-purple-400 rounded-full"
                          style={{ width: `${Math.min(groupData.averageAssignmentCompletionRate, 100)}%` }}
                        />
                      </div>
                      <div className="text-[10px] text-muted-foreground">
                        {t('analytics.groupView.practicalWorksSubmitted')}
                      </div>
                    </div>
                  </div>

                  {/* Students in Group Table Card (Borderless) */}
                  <div className="bg-card text-card-foreground rounded-2xl shadow-[0_2px_14px_-2px_rgba(0,0,0,0.04)] dark:shadow-none border-0 overflow-hidden">
                    <div className="p-5 border-b border-border/10 flex flex-row items-center justify-between space-y-0 bg-muted/15">
                      <h3 className="text-sm sm:text-base font-bold text-foreground">
                        {t('analytics.groupView.studentsTableTitle')}
                      </h3>
                      <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-muted/60 text-foreground border-0">
                        {t('analytics.groupView.totalStudentsCount', { count: groupData.students.length })}
                      </span>
                    </div>

                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-muted/20 hover:bg-muted/20 border-b border-border/20">
                            <TableHead className="py-3 px-4 font-semibold text-xs w-12">№</TableHead>
                            <TableHead className="py-3 px-4 font-semibold text-xs">{t('analytics.groupView.cols.studentName')}</TableHead>
                            <TableHead className="py-3 px-4 font-semibold text-xs">{t('analytics.groupView.cols.studentId')}</TableHead>
                            <TableHead className="py-3 px-4 font-semibold text-xs text-center">{t('analytics.groupView.cols.attendance')}</TableHead>
                            <TableHead className="py-3 px-4 font-semibold text-xs text-center">{t('analytics.groupView.cols.avgScore')}</TableHead>
                            <TableHead className="py-3 px-4 font-semibold text-xs text-center">{t('analytics.groupView.cols.lessons')}</TableHead>
                            <TableHead className="py-3 px-4 font-semibold text-xs text-center">{t('analytics.groupView.cols.masteryLevel')}</TableHead>
                            <TableHead className="py-3 px-4 font-semibold text-xs text-right">{t('analytics.groupView.cols.individualPdf')}</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {(groupData.students || []).map((s, idx) => (
                            <TableRow key={s.studentId} className="hover:bg-muted/40 transition-colors border-b border-border/10 last:border-b-0">
                              <TableCell className="py-3 px-4 text-xs text-muted-foreground">{idx + 1}</TableCell>
                              <TableCell className="py-3 px-4 font-bold text-foreground text-xs">{s.studentName}</TableCell>
                              <TableCell className="py-3 px-4 text-xs text-muted-foreground font-mono">{s.studentIdNumber || '-'}</TableCell>
                              <TableCell className="py-3 px-4 text-center font-bold text-xs text-emerald-600 dark:text-emerald-400 font-mono">
                                {s.attendanceRate}%
                              </TableCell>
                              <TableCell className="py-3 px-4 text-center font-bold text-xs text-foreground font-mono">{s.averageScore}%</TableCell>
                              <TableCell className="py-3 px-4 text-center text-xs font-medium">{s.completedLessons} {t('analytics.units.count')}</TableCell>
                              <TableCell className="py-3 px-4 text-center">
                                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-0">
                                  {s.masteryLevel}
                                </span>
                              </TableCell>
                              <TableCell className="py-3 px-4 text-right">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="text-xs font-semibold text-primary hover:text-primary hover:bg-primary/10 h-8 cursor-pointer rounded-xl border-0"
                                  onClick={() => {
                                    setSelectedStudentId(s.studentId);
                                    setActiveView('student');
                                  }}
                                >
                                  {t('analytics.groupView.viewBtn')}
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                </>
              )}
            </TabsContent>

            {/* VIEW 3: INDIVIDUAL STUDENT ANALYTICS */}
            <TabsContent value="student" className="mt-0 space-y-6">
              {studentData && (
                <>
                  {/* Student Banner (Borderless) */}
                  <div className="bg-card text-card-foreground rounded-2xl p-6 shadow-[0_2px_14px_-2px_rgba(0,0,0,0.04)] dark:shadow-none border-0 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2.5 flex-wrap">
                        <h2 className="text-lg font-bold text-foreground tracking-tight">
                          {studentData.studentName}
                        </h2>
                        <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 font-semibold border-0">
                          {studentData.masteryLevel}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
                        {t('analytics.studentView.group')}: <span className="font-semibold text-foreground">{studentData.groupCode}</span> ({studentData.gradeLevel}) | ID: <span className="font-mono text-foreground">{studentData.studentIdNumber}</span> | {t('analytics.studentView.mentor')}: <span className="font-semibold text-foreground">{studentData.mentorName}</span>
                      </p>
                    </div>

                    <Button
                      variant="default"
                      size="sm"
                      className="gap-2 text-xs font-semibold shadow-sm shrink-0 rounded-xl border-0 cursor-pointer"
                      onClick={() => handleDownloadPdf('student')}
                    >
                      <Download className="w-4 h-4" />
                      {t('analytics.studentView.downloadProgressPdf')}
                    </Button>
                  </div>

                  {/* Individual Student Metrics Grid (Borderless, Dashboard Style) */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-5">
                    <div className="bg-card text-card-foreground rounded-2xl p-5 shadow-[0_2px_14px_-2px_rgba(0,0,0,0.05)] dark:shadow-none hover:shadow-xl hover:-translate-y-1 transition-all duration-300 border-0 space-y-2">
                      <span className="text-xs text-muted-foreground font-semibold uppercase tracking-wider block">
                        {t('analytics.studentView.attendanceExactDenominator')}
                      </span>
                      <div className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400 font-mono">
                        {studentData.attendanceRate}%
                      </div>
                      <div className="h-1.5 w-full bg-emerald-500/15 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-emerald-600 dark:bg-emerald-400 rounded-full"
                          style={{ width: `${Math.min(studentData.attendanceRate, 100)}%` }}
                        />
                      </div>
                      <div className="text-[11px] text-muted-foreground">
                        {t('analytics.studentView.attendanceSummary', {
                          present: studentData.presentCount,
                          late: studentData.lateCount,
                          excused: studentData.excusedCount,
                        })}
                      </div>
                    </div>

                    <div className="bg-card text-card-foreground rounded-2xl p-5 shadow-[0_2px_14px_-2px_rgba(0,0,0,0.05)] dark:shadow-none hover:shadow-xl hover:-translate-y-1 transition-all duration-300 border-0 space-y-2">
                      <span className="text-xs text-muted-foreground font-semibold uppercase tracking-wider block">
                        {t('analytics.studentView.midtermAssessments')}
                      </span>
                      <div className="text-2xl font-extrabold text-blue-600 dark:text-blue-400 font-mono">
                        {studentData.averageAssessmentScore}%
                      </div>
                      <div className="h-1.5 w-full bg-blue-500/15 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-blue-600 dark:bg-blue-400 rounded-full"
                          style={{ width: `${Math.min(studentData.averageAssessmentScore, 100)}%` }}
                        />
                      </div>
                      <div className="text-[11px] text-muted-foreground">
                        {t('analytics.studentView.assessmentsSubmitted', {
                          attempted: studentData.assessmentsAttempted,
                          total: studentData.totalAssessmentsAssigned,
                        })}
                      </div>
                    </div>

                    <div className="bg-card text-card-foreground rounded-2xl p-5 shadow-[0_2px_14px_-2px_rgba(0,0,0,0.05)] dark:shadow-none hover:shadow-xl hover:-translate-y-1 transition-all duration-300 border-0 space-y-2">
                      <span className="text-xs text-muted-foreground font-semibold uppercase tracking-wider block">
                        {t('analytics.studentView.assignmentsResult')}
                      </span>
                      <div className="text-2xl font-extrabold text-purple-600 dark:text-purple-400 font-mono">
                        {studentData.averageAssignmentScore}%
                      </div>
                      <div className="h-1.5 w-full bg-purple-500/15 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-purple-600 dark:bg-purple-400 rounded-full"
                          style={{ width: `${Math.min(studentData.averageAssignmentScore, 100)}%` }}
                        />
                      </div>
                      <div className="text-[11px] text-muted-foreground">
                        {t('analytics.studentView.assignmentsCompleted', {
                          submitted: studentData.assignmentsSubmitted,
                          total: studentData.totalAssignmentsAssigned,
                        })}
                      </div>
                    </div>

                    <div className="bg-card text-card-foreground rounded-2xl p-5 shadow-[0_2px_14px_-2px_rgba(0,0,0,0.05)] dark:shadow-none hover:shadow-xl hover:-translate-y-1 transition-all duration-300 border-0 space-y-2">
                      <span className="text-xs text-muted-foreground font-semibold uppercase tracking-wider block">
                        {t('analytics.studentView.overallMastery')}
                      </span>
                      <div className="text-2xl font-extrabold text-primary font-mono">
                        {studentData.overallAverageScore}%
                      </div>
                      <div className="h-1.5 w-full bg-primary/15 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary rounded-full"
                          style={{ width: `${Math.min(studentData.overallAverageScore, 100)}%` }}
                        />
                      </div>
                      <div className="text-[11px] text-muted-foreground">
                        {t('analytics.studentView.level')}: <span className="font-semibold text-foreground">{studentData.masteryLevel}</span>
                      </div>
                    </div>
                  </div>

                  {/* Attendance Breakdown Grid (Borderless) */}
                  <div className="bg-card text-card-foreground rounded-2xl p-6 shadow-[0_2px_14px_-2px_rgba(0,0,0,0.04)] dark:shadow-none border-0">
                    <h3 className="text-xs font-bold text-foreground uppercase tracking-wider mb-4">
                      {t('analytics.studentView.breakdownTitle')}
                    </h3>
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-center">
                      <div className="p-4 bg-muted/40 rounded-2xl border-0">
                        <div className="text-xs text-muted-foreground">{t('analytics.studentView.scheduledSessions')}</div>
                        <div className="text-lg font-bold text-foreground mt-1 font-mono">{studentData.totalScheduledSessions}</div>
                      </div>
                      <div className="p-4 bg-emerald-500/10 rounded-2xl border-0 text-emerald-800 dark:text-emerald-300">
                        <div className="text-xs font-medium">{t('analytics.studentView.present')}</div>
                        <div className="text-lg font-bold mt-1 font-mono">{studentData.presentCount}</div>
                      </div>
                      <div className="p-4 bg-amber-500/10 rounded-2xl border-0 text-amber-800 dark:text-amber-300">
                        <div className="text-xs font-medium">{t('analytics.studentView.late')}</div>
                        <div className="text-lg font-bold mt-1 font-mono">{studentData.lateCount}</div>
                      </div>
                      <div className="p-4 bg-blue-500/10 rounded-2xl border-0 text-blue-800 dark:text-blue-300">
                        <div className="text-xs font-medium">{t('analytics.studentView.excused')}</div>
                        <div className="text-lg font-bold mt-1 font-mono">{studentData.excusedCount}</div>
                      </div>
                      <div className="p-4 bg-rose-500/10 rounded-2xl border-0 text-rose-800 dark:text-rose-300 col-span-2 sm:col-span-1">
                        <div className="text-xs font-medium">{t('analytics.studentView.absent')}</div>
                        <div className="text-lg font-bold mt-1 font-mono">{studentData.absentCount}</div>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </TabsContent>

            {/* VIEW 4: METRICS & RULES TRANSPARENCY */}
            <TabsContent value="rules" className="mt-0 space-y-4">
              {rulesDoc && (
                <>
                  <div className="rounded-2xl p-5 bg-emerald-500/10 text-emerald-950 dark:text-emerald-100 border-0 shadow-[0_2px_14px_-2px_rgba(0,0,0,0.03)] flex items-start gap-3.5">
                    <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 shrink-0">
                      <Info className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-bold text-sm text-emerald-900 dark:text-emerald-200">
                        {t('analytics.rulesView.bannerTitle')}
                      </h4>
                      <p className="text-xs text-emerald-800 dark:text-emerald-300 mt-1 leading-relaxed">
                        {t('analytics.rulesView.bannerDesc')}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-card text-card-foreground rounded-2xl p-5 shadow-[0_2px_14px_-2px_rgba(0,0,0,0.04)] dark:shadow-none border-0 space-y-3">
                      <h4 className="text-xs font-bold text-primary">
                        {t('analytics.rulesView.attendanceTitle')}
                      </h4>
                      <div className="p-3 bg-muted/60 font-mono text-[11px] rounded-xl text-foreground border-0 select-all overflow-x-auto">
                        {rulesDoc.attendanceFormula}
                      </div>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        {rulesDoc.attendanceDenominatorPolicy}
                      </p>
                    </div>

                    <div className="bg-card text-card-foreground rounded-2xl p-5 shadow-[0_2px_14px_-2px_rgba(0,0,0,0.04)] dark:shadow-none border-0 space-y-3">
                      <h4 className="text-xs font-bold text-primary">
                        {t('analytics.rulesView.lessonCompletionTitle')}
                      </h4>
                      <div className="p-3 bg-muted/60 font-mono text-[11px] rounded-xl text-foreground border-0 select-all overflow-x-auto">
                        {rulesDoc.lessonCompletionFormula}
                      </div>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        {t('analytics.rulesView.lessonCompletionDesc')}
                      </p>
                    </div>

                    <div className="bg-card text-card-foreground rounded-2xl p-5 shadow-[0_2px_14px_-2px_rgba(0,0,0,0.04)] dark:shadow-none border-0 space-y-3">
                      <h4 className="text-xs font-bold text-primary">
                        {t('analytics.rulesView.assessmentTitle')}
                      </h4>
                      <div className="p-3 bg-muted/60 font-mono text-[11px] rounded-xl text-foreground border-0 select-all overflow-x-auto">
                        {rulesDoc.assessmentCompletionFormula}
                      </div>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        {t('analytics.rulesView.assessmentDesc')}
                      </p>
                    </div>

                    <div className="bg-card text-card-foreground rounded-2xl p-5 shadow-[0_2px_14px_-2px_rgba(0,0,0,0.04)] dark:shadow-none border-0 space-y-3">
                      <h4 className="text-xs font-bold text-primary">
                        {t('analytics.rulesView.averageScoreTitle')}
                      </h4>
                      <div className="p-3 bg-muted/60 font-mono text-[11px] rounded-xl text-foreground border-0 select-all overflow-x-auto">
                        {rulesDoc.averageScoreFormula}
                      </div>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        {rulesDoc.auditDisclaimer}
                      </p>
                    </div>
                  </div>
                </>
              )}
            </TabsContent>
          </>
        )}
      </Tabs>

      {/* 4. PDF Export Modal (Shadcn Dialog, Clean Borderless) */}
      <Dialog open={isPdfModalOpen} onOpenChange={setIsPdfModalOpen}>
        <DialogContent className="max-w-xl p-0 overflow-hidden bg-background border-0 shadow-2xl rounded-3xl">
          <DialogHeader className="p-5 pb-4 border-b border-border/10 bg-muted/20">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-2xl bg-primary/10 text-primary border-0">
                <FileDown className="w-5 h-5" />
              </div>
              <div>
                <DialogTitle className="text-base font-bold text-foreground">
                  {t('analytics.pdfModal.title')}
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                  {t('analytics.pdfModal.subtitle')}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="p-5 space-y-4">
            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-2">
                {t('analytics.pdfModal.selectType')}
              </label>
              <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                {reportTypes.map((r) => {
                  const isSelected = selectedReportType === r.id;
                  return (
                    <label
                      key={r.id}
                      onClick={() => setSelectedReportType(r.id)}
                      className={cn(
                        'flex items-start gap-3 p-3 rounded-2xl cursor-pointer transition-all border-0',
                        isSelected
                          ? 'bg-primary/10 ring-2 ring-primary'
                          : 'bg-muted/30 hover:bg-muted/60'
                      )}
                    >
                      <input
                        type="radio"
                        name="reportType"
                        checked={isSelected}
                        onChange={() => setSelectedReportType(r.id)}
                        className="mt-0.5 text-primary focus:ring-primary accent-primary"
                      />
                      <div>
                        <div className={cn('text-xs font-bold', isSelected ? 'text-primary' : 'text-foreground')}>
                          {r.label}
                        </div>
                        <div className="text-[11px] text-muted-foreground mt-0.5">{r.desc}</div>
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>

            <div className="p-3.5 bg-muted/40 rounded-2xl text-xs space-y-1.5 border-0">
              <div className="text-muted-foreground flex items-center justify-between">
                <span>{t('analytics.pdfModal.languageLabel')}</span>
                <span className="font-semibold text-foreground">
                  {t('analytics.pdfModal.languageValue')}
                </span>
              </div>
              <div className="text-muted-foreground flex items-center justify-between">
                <span>{t('analytics.pdfModal.formatLabel')}</span>
                <span className="font-semibold text-foreground">{t('analytics.pdfModal.formatValue')}</span>
              </div>
              <div className="text-muted-foreground flex items-center justify-between">
                <span>{t('analytics.pdfModal.securityLabel')}</span>
                <span className="font-semibold text-emerald-600 dark:text-emerald-400">{t('analytics.pdfModal.securityValue')}</span>
              </div>
            </div>
          </div>

          <DialogFooter className="p-4 bg-muted/20 border-t border-border/10 flex items-center justify-end gap-2">
            <Button
              variant="ghost"
              size="sm"
              className="text-xs font-semibold cursor-pointer rounded-xl border-0"
              onClick={() => setIsPdfModalOpen(false)}
              disabled={downloadingPdf}
            >
              {t('analytics.pdfModal.cancelBtn')}
            </Button>
            <Button
              variant="default"
              size="sm"
              className="text-xs gap-2 font-semibold shadow-sm cursor-pointer rounded-xl border-0"
              onClick={() => handleDownloadPdf(selectedReportType)}
              disabled={downloadingPdf}
            >
              {downloadingPdf ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
                  {t('analytics.pdfModal.loadingBtn')}
                </>
              ) : (
                <>
                  <Download className="w-3.5 h-3.5" />
                  {t('analytics.pdfModal.downloadBtn')}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
