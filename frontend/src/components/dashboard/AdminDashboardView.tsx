import React, { useMemo, useState } from 'react'
import type { Schedule, Student, Mentor, StudyGroup } from '../../types'
import { useTranslation } from '@/shared/i18n'
import { useAdminDashboard } from '@/features/analytics'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Tabs,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs'
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from '@/components/ui/table'
import { Progress } from '@/components/ui/progress'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Input } from '@/components/ui/input'
import {
  Calendar,
  Users,
  Award,
  Layers,
  Clock,
  Sparkles,
  Plus,
  ArrowRight,
  MapPin,
  TrendingUp,
  Activity,
  CheckCircle2,
  GraduationCap,
  CalendarCheck2,
  ChevronRight,
  Zap,
  BarChart3,
  Monitor,
  CheckCheck,
  FileCheck,
  Server,
  ShieldCheck,
  Search,
  LayoutGrid,
  List,
} from 'lucide-react'

export interface AdminDashboardViewProps {
  currentDateFormatted: string
  schedules: Schedule[]
  students: Student[]
  mentors: Mentor[]
  groups: StudyGroup[]
  onOpenManualModal: () => void
  onOpenAiModal: () => void
  onNavigateTab: (tab: string) => void
}

export const AdminDashboardView: React.FC<AdminDashboardViewProps> = ({
  currentDateFormatted = '',
  schedules = [],
  students = [],
  mentors = [],
  groups = [],
  onOpenManualModal = () => {},
  onOpenAiModal = () => {},
  onNavigateTab = () => {},
}) => {
  const { t } = useTranslation()
  const { data: adminData } = useAdminDashboard()
  const [selectedGrade, setSelectedGrade] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState<string>('')
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table')

  const gradeCounts = useMemo(() => {
    return {
      all: schedules.length,
      '8-sinf': schedules.filter((s) => s.gradeLevel === '8-sinf').length,
      '9-sinf': schedules.filter((s) => s.gradeLevel === '9-sinf').length,
      '10-sinf': schedules.filter((s) => s.gradeLevel === '10-sinf').length,
      '11-sinf': schedules.filter((s) => s.gradeLevel === '11-sinf').length,
    }
  }, [schedules])

  const filteredSchedules = useMemo(() => {
    return schedules.filter((s) => {
      const matchesGrade = selectedGrade === 'all' || s.gradeLevel === selectedGrade
      if (!matchesGrade) return false

      if (!searchQuery.trim()) return true
      const q = searchQuery.toLowerCase()
      const subject = (s.subject || '').toLowerCase()
      const mentor = (s.mentor?.fullName || '').toLowerCase()
      const groupCode = (s.studyGroup?.groupCode || '').toLowerCase()
      const room = (s.room || '').toLowerCase()
      const days = (s.days || '').toLowerCase()

      return (
        subject.includes(q) ||
        mentor.includes(q) ||
        groupCode.includes(q) ||
        room.includes(q) ||
        days.includes(q)
      )
    })
  }, [schedules, selectedGrade, searchQuery])

  const kpis = useMemo(
    () => [
      {
        id: 'schedules',
        title: t('dashboard.admin.kpiWeeklyLessons'),
        value: adminData?.totalScheduledLessons ?? schedules.length,
        subtitle: t('dashboard.admin.kpiWeeklyLessonsSub'),
        trend: adminData?.totalCompletedLessons !== undefined ? `${adminData.totalCompletedLessons} yakunlangan` : '+100% reja',
        icon: Calendar,
        iconBg: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
        badge: t('dashboard.admin.activeScheduleBadge'),
        actionTab: 'timetable',
      },
      {
        id: 'students',
        title: t('dashboard.admin.kpiStudents'),
        value: adminData?.totalActiveStudents ?? students.length,
        subtitle: t('dashboard.admin.kpiStudentsSub'),
        trend: '100% qamrov',
        icon: Users,
        iconBg: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400',
        badge: t('dashboard.admin.branchBadge'),
        actionTab: 'students',
      },
      {
        id: 'mentors',
        title: t('dashboard.admin.kpiMentors'),
        value: adminData?.totalMentors ?? mentors.length,
        subtitle: t('dashboard.admin.kpiMentorsSub'),
        trend: t('dashboard.admin.highExperience'),
        icon: Award,
        iconBg: 'bg-purple-500/10 text-purple-600 dark:text-purple-400',
        badge: t('dashboard.admin.certifiedBadge'),
        actionTab: 'mentors',
      },
      {
        id: 'groups',
        title: t('dashboard.admin.kpiGroups'),
        value: adminData?.totalGroups ?? groups.length,
        subtitle: t('dashboard.admin.kpiGroupsSub'),
        trend: '2026/2027',
        icon: Layers,
        iconBg: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
        badge: t('dashboard.admin.fullCapacityBadge'),
        actionTab: 'groups',
      },
    ],
    [adminData, schedules.length, students.length, mentors.length, groups.length, t]
  )

  const attendanceDays = useMemo(() => {
    if (adminData?.weeklyAttendance && adminData.weeklyAttendance.length > 0) {
      return adminData.weeklyAttendance.map((item) => ({
        day: item.day,
        rate: item.rate ?? 0,
      }))
    }
    return [
      { day: t('schedule.days.monday'), rate: 0 },
      { day: t('schedule.days.tuesday'), rate: 0 },
      { day: t('schedule.days.wednesday'), rate: 0 },
      { day: t('schedule.days.thursday'), rate: 0 },
      { day: t('schedule.days.friday'), rate: 0 },
      { day: t('schedule.days.saturday'), rate: 0 },
    ]
  }, [adminData?.weeklyAttendance, t])

  const itLabs = useMemo(() => {
    if (adminData?.roomOccupancy && adminData.roomOccupancy.length > 0) {
      return adminData.roomOccupancy.map((room) => ({
        name: room.name,
        used: room.used,
        total: room.total,
        percent: room.percent,
        indicator: room.indicator || 'bg-blue-500',
      }))
    }
    return [
      {
        name: 'IT Lab 1 — Web Full-Stack',
        used: 0,
        total: 24,
        percent: 0,
        indicator: 'bg-blue-500',
      },
    ]
  }, [adminData?.roomOccupancy])

  const totalSeatsInfo = useMemo(() => {
    const totalUsed = itLabs.reduce((sum, lab) => sum + lab.used, 0)
    const totalCap = itLabs.reduce((sum, lab) => sum + lab.total, 0)
    const pct = totalCap > 0 ? Math.round((totalUsed / totalCap) * 1000) / 10 : 0
    return { totalUsed, totalCap, pct }
  }, [itLabs])

  return (
    <div className="space-y-7 animate-in fade-in duration-300">
      {/* 1. HERO EXECUTIVE BANNER (Borderless, Luxury Ambient Style) */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 text-white shadow-xl">
        {/* Soft Ambient Glows */}
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-indigo-500/15 rounded-full blur-3xl pointer-events-none -mr-32 -mt-32" />
        <div className="absolute bottom-0 left-1/3 w-[350px] h-[350px] bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="p-7 sm:p-9 lg:p-11 relative z-10">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8">
            <div className="max-w-2xl space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 backdrop-blur-md text-cyan-300 text-xs font-semibold">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <MapPin className="w-3.5 h-3.5 text-cyan-400" />
                  <span>{t('dashboard.admin.branchBadge')}</span>
                </span>

                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md text-slate-200 text-xs font-medium">
                  <Clock className="w-3.5 h-3.5 text-cyan-300" />
                  <span>{currentDateFormatted}</span>
                </span>

                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/20 text-blue-300 text-[11px] font-semibold">
                  <Sparkles className="w-3 h-3" />
                  <span>{t('dashboard.admin.programName')}</span>
                </span>
              </div>

              <div>
                <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight leading-tight">
                  {t('dashboard.admin.centerTitle')}
                </h1>
                <p className="text-slate-300 text-xs sm:text-sm leading-relaxed max-w-xl mt-2">
                  {t('dashboard.admin.centerSubtitle')}
                </p>
              </div>

              <div className="pt-2 flex flex-wrap items-center gap-3">
                <Button
                  onClick={onOpenAiModal}
                  size="default"
                  className="bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white shadow-lg shadow-indigo-600/30 font-semibold border-0 rounded-xl"
                >
                  <Sparkles className="w-4 h-4 mr-2 text-cyan-200" />
                  <span>{t('dashboard.admin.aiAllocationBtn')}</span>
                </Button>

                <Button
                  onClick={onOpenManualModal}
                  variant="secondary"
                  className="bg-white/10 hover:bg-white/15 text-white border-0 font-medium rounded-xl backdrop-blur-md"
                >
                  <Plus className="w-4 h-4 mr-1.5 text-blue-300" />
                  <span>{t('dashboard.admin.addScheduleBtn')}</span>
                </Button>

                <Button
                  onClick={() => onNavigateTab('curriculum')}
                  variant="ghost"
                  className="text-slate-300 hover:text-white hover:bg-white/10 group font-medium rounded-xl"
                >
                  <GraduationCap className="w-4 h-4 mr-1.5 text-cyan-400" />
                  <span>{t('dashboard.admin.curriculumBtn')}</span>
                  <ArrowRight className="w-3.5 h-3.5 ml-1 transition-transform group-hover:translate-x-1" />
                </Button>
              </div>
            </div>

            {/* Quick Metrics Pillar in Hero */}
            <div className="lg:shrink-0 grid grid-cols-2 gap-3 bg-white/5 backdrop-blur-xl rounded-2xl p-4 sm:p-5 text-center">
              <div className="p-4 rounded-xl bg-white/5">
                <span className="text-[10px] uppercase font-bold text-cyan-300 block tracking-wider">
                  {t('dashboard.admin.standardLessonTitle')}
                </span>
                <span className="text-2xl font-black text-white font-mono mt-1 block">
                  80 min
                </span>
                <span className="text-[10px] text-slate-400 mt-0.5 block">
                  {t('dashboard.admin.stage4Model')}
                </span>
              </div>

              <div className="p-4 rounded-xl bg-white/5">
                <span className="text-[10px] uppercase font-bold text-emerald-300 block tracking-wider">
                  {t('dashboard.admin.practicalTrainingTitle')}
                </span>
                <span className="text-2xl font-black text-emerald-400 font-mono mt-1 block">
                  102 {t('common.hours')}
                </span>
                <span className="text-[10px] text-slate-400 mt-0.5 block">
                  {t('dashboard.admin.annualProgram')}
                </span>
              </div>

              <div className="col-span-2 p-3 rounded-xl bg-indigo-500/20 text-[11px] text-indigo-200 flex items-center justify-center gap-2">
                <Activity className="w-3.5 h-3.5 text-cyan-400" />
                <span>{t('dashboard.admin.allGroupsOnTrack')}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 2. EXECUTIVE KPI CARDS (Soft, Modern, Borderless Design) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        {kpis.map((kpi) => {
          const Icon = kpi.icon
          return (
            <div
              key={kpi.id}
              onClick={() => onNavigateTab(kpi.actionTab)}
              className="bg-card text-card-foreground rounded-2xl p-5 shadow-[0_2px_14px_-2px_rgba(0,0,0,0.05)] dark:shadow-none hover:shadow-xl hover:-translate-y-1 transition-all duration-300 cursor-pointer group flex flex-col justify-between"
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  onNavigateTab(kpi.actionTab)
                }
              }}
              aria-label={`${kpi.title}: ${kpi.value}`}
            >
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div
                    className={`w-12 h-12 rounded-2xl ${kpi.iconBg} flex items-center justify-center group-hover:scale-110 transition-transform duration-300`}
                  >
                    <Icon className="w-6 h-6" />
                  </div>

                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                    <TrendingUp className="w-3 h-3" />
                    <span>{kpi.badge}</span>
                  </span>
                </div>

                <div className="space-y-1">
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl sm:text-4xl font-extrabold tracking-tight font-mono text-foreground">
                      {kpi.value}
                    </span>
                    <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                      {kpi.trend}
                    </span>
                  </div>

                  <h3 className="text-sm font-bold text-foreground">
                    {kpi.title}
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    {kpi.subtitle}
                  </p>
                </div>
              </div>

              <div className="pt-4 mt-3 flex items-center justify-between text-[11px] text-muted-foreground group-hover:text-primary transition-colors">
                <span className="font-medium">{t('dashboard.admin.viewAllSchedules')}</span>
                <div className="w-6 h-6 rounded-full bg-muted/60 group-hover:bg-primary/10 flex items-center justify-center transition-colors">
                  <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* 3. PRESIDENTIAL DECREE BANNER (Luxurious Gold/Amber Card, No Harsh Borders) */}
      <div className="relative overflow-hidden rounded-2xl p-6 bg-gradient-to-r from-amber-500/12 via-amber-500/5 to-indigo-500/5 shadow-[0_2px_14px_-2px_rgba(0,0,0,0.03)] dark:shadow-none">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-500 to-amber-600 text-white flex items-center justify-center shrink-0 shadow-lg shadow-amber-500/25">
              <Award className="w-6 h-6" />
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-800 dark:text-amber-300 text-[10px] font-bold uppercase tracking-wider">
                  {t('dashboard.admin.decreeBadge')}
                </span>
                <span className="text-xs font-semibold text-muted-foreground">
                  {t('dashboard.admin.decreeAgency')}
                </span>
              </div>
              <h2 className="text-base font-bold text-foreground">
                {t('dashboard.admin.decreeSystemTitle')}
              </h2>
              <p className="text-xs text-muted-foreground leading-relaxed max-w-4xl">
                {t('dashboard.admin.decreeDesc')}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Button
              onClick={() => onNavigateTab('curriculum')}
              variant="secondary"
              size="sm"
              className="bg-amber-500/15 hover:bg-amber-500/25 text-amber-800 dark:text-amber-300 font-bold border-0 rounded-xl"
            >
              <FileCheck className="w-4 h-4 mr-1.5" />
              <span>{t('dashboard.admin.decreeStandardBtn')}</span>
            </Button>
          </div>
        </div>
      </div>

      {/* 4. LIVE OPERATIONS & INFRASTRUCTURE MONITORING (Clean, Borderless Panels) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Weekly Attendance Dynamics */}
        <div className="bg-card text-card-foreground rounded-2xl p-6 shadow-[0_2px_14px_-2px_rgba(0,0,0,0.04)] dark:shadow-none flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                  <BarChart3 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-foreground">
                    {t('dashboard.admin.weeklyAttendanceTitle')}
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    {t('dashboard.admin.studentActivitySub')}
                  </p>
                </div>
              </div>
              <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                {adminData?.systemAttendanceRate !== undefined ? `${adminData.systemAttendanceRate}%` : '0%'} {t('dashboard.admin.average')}
              </span>
            </div>

            <div className="space-y-3 pt-2">
              {attendanceDays.map((item) => (
                <div key={item.day} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground font-medium">{item.day}</span>
                    <span className="font-mono font-bold text-foreground">{item.rate}%</span>
                  </div>
                  <Progress value={item.rate} className="h-2" />
                </div>
              ))}
            </div>
          </div>

          <div className="pt-4 mt-4 border-t border-border/20 flex items-center justify-between text-xs text-muted-foreground">
            <span>{t('dashboard.admin.targetIndicator')}: 95%+</span>
            <span className="text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
              <CheckCheck className="w-3.5 h-3.5" /> {t('dashboard.admin.targetAbovePlan')}
            </span>
          </div>
        </div>

        {/* IT Lab Occupancy */}
        <div className="bg-card text-card-foreground rounded-2xl p-6 shadow-[0_2px_14px_-2px_rgba(0,0,0,0.04)] dark:shadow-none flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center">
                  <Monitor className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-foreground">
                    {t('dashboard.admin.itLabOccupancyTitle')}
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    {t('dashboard.admin.itLabOccupancySub')}
                  </p>
                </div>
              </div>
              <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-purple-500/10 text-purple-600 dark:text-purple-400">
                {totalSeatsInfo.totalUsed}/{totalSeatsInfo.totalCap} {t('dashboard.admin.seatsCount')} ({totalSeatsInfo.pct}%)
              </span>
            </div>

            <div className="space-y-4 pt-2">
              {itLabs.map((lab) => (
                <div key={lab.name} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-foreground truncate max-w-[200px]">
                      {lab.name}
                    </span>
                    <span className="font-mono text-muted-foreground text-[11px]">
                      {lab.used}/{lab.total} ({lab.percent}%)
                    </span>
                  </div>
                  <Progress value={lab.percent} className="h-2" />
                </div>
              ))}
            </div>
          </div>

          <div className="pt-4 mt-4 border-t border-border/20 flex items-center justify-between text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>{t('dashboard.admin.labInternetNotice')}</span>
            </span>
          </div>
        </div>

        {/* AI Sync & Integration */}
        <div className="bg-card text-card-foreground rounded-2xl p-6 shadow-[0_2px_14px_-2px_rgba(0,0,0,0.04)] dark:shadow-none flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 flex items-center justify-center">
                  <Server className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-foreground">
                    {t('dashboard.admin.aiSyncTitle')}
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    {t('dashboard.admin.aiSyncSub')}
                  </p>
                </div>
              </div>
              <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full bg-cyan-500/10 text-cyan-600 dark:text-cyan-400">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-500 animate-pulse" />
                {t('dashboard.admin.syncActive')}
              </span>
            </div>

            <div className="space-y-2.5 pt-2">
              <div className="p-3 rounded-xl bg-muted/40 hover:bg-muted/60 transition-colors flex items-center justify-between">
                <div>
                  <span className="text-xs font-semibold text-foreground block">
                    {t('dashboard.admin.conflictCheckTitle')}
                  </span>
                  <span className="text-[10px] text-muted-foreground">
                    {t('dashboard.admin.conflictCheckDesc')}
                  </span>
                </div>
                <Badge variant="success" className="font-mono text-xs border-0">
                  {t('dashboard.admin.conflictZero')}
                </Badge>
              </div>

              <div className="p-3 rounded-xl bg-muted/40 hover:bg-muted/60 transition-colors flex items-center justify-between">
                <div>
                  <span className="text-xs font-semibold text-foreground block">
                    {t('dashboard.admin.compliance80minTitle')}
                  </span>
                  <span className="text-[10px] text-muted-foreground">
                    {t('dashboard.admin.compliance80minDesc')}
                  </span>
                </div>
                <span className="font-mono text-xs font-bold px-2 py-0.5 rounded-md bg-blue-500/10 text-blue-600 dark:text-blue-400">
                  {t('dashboard.admin.compliance100')}
                </span>
              </div>

              <div className="p-3 rounded-xl bg-muted/40 hover:bg-muted/60 transition-colors flex items-center justify-between">
                <div>
                  <span className="text-xs font-semibold text-foreground block">
                    {t('dashboard.admin.pinflSyncTitle')}
                  </span>
                  <span className="text-[10px] text-muted-foreground">
                    {t('dashboard.admin.pinflSyncDesc')}
                  </span>
                </div>
                <span className="font-mono text-xs font-bold px-2 py-0.5 rounded-md bg-purple-500/10 text-purple-600 dark:text-purple-400">
                  {t('status.active')}
                </span>
              </div>
            </div>
          </div>

          <div className="pt-4 mt-4">
            <Button
              onClick={onOpenAiModal}
              size="sm"
              className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold rounded-xl border-0 shadow-sm"
            >
              <Sparkles className="w-3.5 h-3.5 mr-1.5 text-cyan-200" />
              <span>{t('dashboard.admin.aiAllocationUpdateBtn')}</span>
            </Button>
          </div>
        </div>
      </div>

      {/* 5. TIMETABLE PREVIEW & 80-MIN METHODOLOGY (Clean, Borderless Layout) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-card text-card-foreground rounded-2xl p-6 shadow-[0_2px_14px_-2px_rgba(0,0,0,0.04)] dark:shadow-none flex flex-col justify-between">
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 mb-4 border-b border-border/20">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                  <Calendar className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-base font-bold text-foreground">
                      {t('dashboard.admin.timetableTitle')}
                    </h2>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-primary/10 text-primary">
                      {t('dashboard.admin.schedulesCount', { count: schedules.length })}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {t('dashboard.admin.timetableSubtitle')}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {/* Segmented Control View Mode */}
                <div className="flex items-center rounded-xl p-0.5 bg-muted/60">
                  <Button
                    type="button"
                    variant={viewMode === 'table' ? 'default' : 'ghost'}
                    size="icon"
                    className="h-7 w-7 rounded-lg"
                    onClick={() => setViewMode('table')}
                    aria-label="Table view"
                  >
                    <List className="w-3.5 h-3.5" />
                  </Button>
                  <Button
                    type="button"
                    variant={viewMode === 'grid' ? 'default' : 'ghost'}
                    size="icon"
                    className="h-7 w-7 rounded-lg"
                    onClick={() => setViewMode('grid')}
                    aria-label="Grid view"
                  >
                    <LayoutGrid className="w-3.5 h-3.5" />
                  </Button>
                </div>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onNavigateTab('timetable')}
                  className="text-xs font-semibold text-primary hover:underline group"
                >
                  <span>{t('dashboard.admin.viewAllSchedules')}</span>
                  <ChevronRight className="w-4 h-4 ml-0.5 transition-transform group-hover:translate-x-1" />
                </Button>
              </div>
            </div>

            {/* Filter Tabs & Search Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
              <Tabs
                value={selectedGrade}
                onValueChange={setSelectedGrade}
                className="w-full sm:w-auto"
              >
                <TabsList className="h-9 bg-muted/50 p-1 rounded-xl">
                  <TabsTrigger value="all" className="text-xs rounded-lg">
                    {t('dashboard.admin.allGradesFilter')} ({gradeCounts.all})
                  </TabsTrigger>
                  <TabsTrigger value="8-sinf" className="text-xs rounded-lg">
                    8-sinf ({gradeCounts['8-sinf']})
                  </TabsTrigger>
                  <TabsTrigger value="9-sinf" className="text-xs rounded-lg">
                    9-sinf ({gradeCounts['9-sinf']})
                  </TabsTrigger>
                  <TabsTrigger value="10-sinf" className="text-xs rounded-lg">
                    10-sinf ({gradeCounts['10-sinf']})
                  </TabsTrigger>
                  <TabsTrigger value="11-sinf" className="text-xs rounded-lg">
                    11-sinf ({gradeCounts['11-sinf']})
                  </TabsTrigger>
                </TabsList>
              </Tabs>

              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Dars, guruh yoki mentor..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 h-9 text-xs bg-muted/30 border-0 rounded-xl focus-visible:ring-1"
                />
              </div>
            </div>

            {/* Schedule Content */}
            {filteredSchedules.length === 0 ? (
              <div className="py-12 text-center space-y-3">
                <CalendarCheck2 className="w-12 h-12 text-muted-foreground mx-auto opacity-40" />
                <p className="text-sm font-semibold text-foreground">
                  {t('dashboard.admin.noSchedulesTitle')}
                </p>
                <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                  {t('dashboard.admin.noSchedulesDesc')}
                </p>
                <Button
                  onClick={onOpenAiModal}
                  size="sm"
                  variant="outline"
                  className="mt-2 rounded-xl"
                >
                  <Sparkles className="w-3.5 h-3.5 mr-1.5" />
                  <span>{t('dashboard.admin.aiAllocationBtn')}</span>
                </Button>
              </div>
            ) : viewMode === 'table' ? (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-b border-border/20 hover:bg-transparent">
                      <TableHead className="w-[80px] font-bold">Sinf</TableHead>
                      <TableHead className="font-bold">Fan & Guruh</TableHead>
                      <TableHead className="font-bold">Kun & Vaqt</TableHead>
                      <TableHead className="font-bold">Xona</TableHead>
                      <TableHead className="text-right font-bold">Mentor</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredSchedules.slice(0, 7).map((s) => (
                      <TableRow
                        key={s.id}
                        className="border-b border-border/10 hover:bg-muted/40 transition-colors"
                      >
                        <TableCell>
                          <span className="font-mono text-xs font-bold px-2 py-0.5 rounded-md bg-muted/60 text-foreground">
                            {s.gradeLevel}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="font-semibold text-sm text-foreground">
                            {s.subject}
                          </div>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="font-mono text-[11px] text-muted-foreground">
                              {s.studyGroup?.groupCode || 'GURUH'}
                            </span>
                            <span className="text-[10px] text-muted-foreground">•</span>
                            <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
                              {t('dashboard.admin.studentsCount', {
                                count: s.studyGroup?.studentCount || 0,
                              })}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="text-xs font-medium text-foreground">
                            {s.days}
                          </span>
                          <div className="text-[11px] text-muted-foreground mt-0.5 flex items-center gap-1">
                            <Clock className="w-3 h-3 text-blue-500" />
                            <span>
                              {s.startTime} – {s.endTime}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <MapPin className="w-3 h-3 text-indigo-500" />
                            <span>{s.room || t('dashboard.admin.defaultRoom')}</span>
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="font-medium text-xs text-foreground">
                            {s.mentor?.fullName || t('dashboard.admin.defaultMentor')}
                          </div>
                          <div className="text-[10px] text-muted-foreground">
                            {s.mentor?.role || 'IT Mentor'}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {filteredSchedules.slice(0, 6).map((s) => (
                  <div
                    key={s.id}
                    className="p-4 rounded-xl bg-muted/30 hover:bg-muted/60 transition-all flex flex-col justify-between space-y-3"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <Avatar className="h-9 w-9 rounded-xl bg-primary/10 text-primary">
                          <AvatarFallback className="font-bold text-xs bg-primary/10 text-primary">
                            {s.gradeLevel.replace('-sinf', '')}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <span className="font-mono text-xs font-bold text-foreground">
                            {s.studyGroup?.groupCode || 'GURUH'}
                          </span>
                          <span className="text-[10px] text-muted-foreground block">
                            {s.days}
                          </span>
                        </div>
                      </div>
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                        {t('dashboard.admin.plannedLessonBadge')}
                      </span>
                    </div>

                    <div>
                      <h4 className="font-bold text-sm text-foreground">
                        {s.subject}
                      </h4>
                      <div className="flex items-center gap-3 text-[11px] text-muted-foreground mt-1">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3 text-blue-500" />
                          <span>{s.startTime}–{s.endTime}</span>
                        </span>
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-indigo-500" />
                          <span>{s.room || t('dashboard.admin.defaultRoom')}</span>
                        </span>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-border/15 flex items-center justify-between text-xs text-muted-foreground">
                      <span className="font-medium text-foreground">
                        {s.mentor?.fullName || t('dashboard.admin.defaultMentor')}
                      </span>
                      <span>
                        {t('dashboard.admin.studentsCount', { count: s.studyGroup?.studentCount || 0 })}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="mt-5 pt-4 border-t border-border/20 flex items-center justify-between text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span>{t('dashboard.admin.venueNotice')}</span>
            </span>
            <Button
              variant="link"
              onClick={() => onNavigateTab('timetable')}
              className="text-xs font-semibold p-0 h-auto"
            >
              {t('dashboard.admin.fullTimetableLink')}
            </Button>
          </div>
        </div>

        {/* 80-Min Standard Methodology Panel (Dark Luxury Style) */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-950 via-slate-900 to-indigo-900 text-white p-6 shadow-md flex flex-col justify-between">
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-3">
              <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-cyan-400/20 text-cyan-300">
                <Zap className="w-3 h-3" />
                <span>{t('dashboard.admin.methodologyBadge')}</span>
              </span>
              <span className="text-xs font-mono font-bold text-slate-200 bg-white/10 px-2.5 py-0.5 rounded-full">
                {t('dashboard.admin.methodologyDuration')}
              </span>
            </div>

            <h3 className="text-lg font-extrabold text-white tracking-tight">
              {t('dashboard.admin.methodologyTitle')}
            </h3>
            <p className="text-xs text-slate-300 leading-relaxed mt-1 mb-5">
              {t('dashboard.admin.methodologyDesc')}
            </p>

            <div className="space-y-3">
              <div className="p-3.5 rounded-xl bg-white/5 hover:bg-white/10 transition-colors">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-lg bg-cyan-500/30 text-cyan-300 text-[10px] font-black flex items-center justify-center font-mono">
                      01
                    </span>
                    <span className="text-xs font-bold text-cyan-300 uppercase tracking-wide">
                      {t('dashboard.admin.stage1Title')}
                    </span>
                  </div>
                  <span className="text-[11px] font-mono font-bold text-cyan-300 bg-white/10 px-2 py-0.5 rounded-md">
                    {t('dashboard.admin.stage1Duration')}
                  </span>
                </div>
                <p className="text-xs text-slate-300 pl-7">
                  {t('dashboard.admin.stage1Desc')}
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-white/5 hover:bg-white/10 transition-colors">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-lg bg-blue-500/30 text-blue-300 text-[10px] font-black flex items-center justify-center font-mono">
                      02
                    </span>
                    <span className="text-xs font-bold text-blue-300 uppercase tracking-wide">
                      {t('dashboard.admin.stage2Title')}
                    </span>
                  </div>
                  <span className="text-[11px] font-mono font-bold text-blue-300 bg-white/10 px-2 py-0.5 rounded-md">
                    {t('dashboard.admin.stage2Duration')}
                  </span>
                </div>
                <p className="text-xs text-slate-300 pl-7">
                  {t('dashboard.admin.stage2Desc')}
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-white/5 hover:bg-white/10 transition-colors">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-lg bg-purple-500/30 text-purple-300 text-[10px] font-black flex items-center justify-center font-mono">
                      03
                    </span>
                    <span className="text-xs font-bold text-purple-300 uppercase tracking-wide">
                      {t('dashboard.admin.stage3Title')}
                    </span>
                  </div>
                  <span className="text-[11px] font-mono font-bold text-purple-300 bg-white/10 px-2 py-0.5 rounded-md">
                    {t('dashboard.admin.stage3Duration')}
                  </span>
                </div>
                <p className="text-xs text-slate-300 pl-7">
                  {t('dashboard.admin.stage3Desc')}
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-white/5 hover:bg-white/10 transition-colors">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-lg bg-emerald-500/30 text-emerald-300 text-[10px] font-black flex items-center justify-center font-mono">
                      04
                    </span>
                    <span className="text-xs font-bold text-emerald-300 uppercase tracking-wide">
                      {t('dashboard.admin.stage4Title')}
                    </span>
                  </div>
                  <span className="text-[11px] font-mono font-bold text-emerald-300 bg-white/10 px-2 py-0.5 rounded-md">
                    {t('dashboard.admin.stage4Duration')}
                  </span>
                </div>
                <p className="text-xs text-slate-300 pl-7">
                  {t('dashboard.admin.stage4Desc')}
                </p>
              </div>
            </div>
          </div>

          <div className="relative z-10 pt-4 mt-5 border-t border-white/10 text-[11px] text-slate-300 italic flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-cyan-300 shrink-0" />
            <span>{t('dashboard.admin.methodologyMotto')}</span>
          </div>
        </div>
      </div>

      {/* 6. ADMIN CONTROL CENTER QUICK SHORTCUTS (Modern Borderless Tiles) */}
      <div className="bg-card text-card-foreground rounded-2xl p-6 shadow-[0_2px_14px_-2px_rgba(0,0,0,0.04)] dark:shadow-none">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 mb-5 border-b border-border/20">
          <div>
            <h3 className="text-base font-bold text-foreground">
              {t('dashboard.admin.adminCenterTitle')}
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              {t('dashboard.admin.adminCenterSub')}
            </p>
          </div>

          <Button
            onClick={() => onNavigateTab('admin')}
            size="sm"
            className="bg-purple-600 hover:bg-purple-500 text-white font-semibold gap-1.5 self-start md:self-auto rounded-xl border-0"
          >
            <ShieldCheck className="w-4 h-4" />
            <span>{t('dashboard.admin.fullAdminPanel')}</span>
          </Button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div
            onClick={() => onNavigateTab('users')}
            className="p-4 rounded-xl bg-muted/30 hover:bg-muted/70 cursor-pointer transition-all duration-200 group flex items-center gap-3.5"
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                onNavigateTab('users')
              }
            }}
          >
            <div className="w-11 h-11 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs font-bold text-foreground block group-hover:text-primary transition-colors">
                {t('dashboard.admin.shortcutsUsers')}
              </span>
              <span className="text-[10px] text-muted-foreground block mt-0.5">
                {t('dashboard.admin.shortcutsUsersSub')}
              </span>
            </div>
          </div>

          <div
            onClick={() => onNavigateTab('admin')}
            className="p-4 rounded-xl bg-muted/30 hover:bg-muted/70 cursor-pointer transition-all duration-200 group flex items-center gap-3.5"
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                onNavigateTab('admin')
              }
            }}
          >
            <div className="w-11 h-11 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs font-bold text-foreground block group-hover:text-primary transition-colors">
                {t('dashboard.admin.shortcutsAudit')}
              </span>
              <span className="text-[10px] text-muted-foreground block mt-0.5">
                {t('dashboard.admin.shortcutsAuditSub')}
              </span>
            </div>
          </div>

          <div
            onClick={() => onNavigateTab('analytics')}
            className="p-4 rounded-xl bg-muted/30 hover:bg-muted/70 cursor-pointer transition-all duration-200 group flex items-center gap-3.5"
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                onNavigateTab('analytics')
              }
            }}
          >
            <div className="w-11 h-11 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
              <BarChart3 className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs font-bold text-foreground block group-hover:text-primary transition-colors">
                {t('dashboard.admin.shortcutsAnalytics')}
              </span>
              <span className="text-[10px] text-muted-foreground block mt-0.5">
                {t('dashboard.admin.shortcutsAnalyticsSub')}
              </span>
            </div>
          </div>

          <div
            onClick={() => onNavigateTab('timetable')}
            className="p-4 rounded-xl bg-muted/30 hover:bg-muted/70 cursor-pointer transition-all duration-200 group flex items-center gap-3.5"
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                onNavigateTab('timetable')
              }
            }}
          >
            <div className="w-11 h-11 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs font-bold text-foreground block group-hover:text-primary transition-colors">
                {t('dashboard.admin.shortcutsTimetable')}
              </span>
              <span className="text-[10px] text-muted-foreground block mt-0.5">
                {t('dashboard.admin.shortcutsTimetableSub')}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
