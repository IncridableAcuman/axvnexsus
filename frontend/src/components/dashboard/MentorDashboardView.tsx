import React from 'react'
import type { StudyGroup, Student } from '../../types'
import { useTranslation } from '@/shared/i18n'
import { useMentorDashboard } from '@/features/analytics'
import {
  Calendar,
  Users,
  CheckCheck,
  FileCheck,
  Plus,
  Sparkles,
  Clock,
  CheckCircle2,
  MapPin,
  TrendingUp,
  ArrowRight,
  Zap,
} from 'lucide-react'

export interface MentorDashboardViewProps {
  currentDateFormatted: string
  userFullName?: string
  groups: StudyGroup[]
  students: Student[]
  onNavigateTab: (tab: string) => void
}

export const MentorDashboardView: React.FC<MentorDashboardViewProps> = ({
  currentDateFormatted = '',
  userFullName = '',
  groups = [],
  students = [],
  onNavigateTab = () => {},
}) => {
  const { t } = useTranslation()
  const { data: mentorData } = useMentorDashboard()

  const assignedGroupsCount = mentorData?.assignedGroupsCount ?? (groups?.length ?? 0)
  const assignedStudentsCount = mentorData?.assignedStudentsCount ?? (students?.length ?? 0)
  const todayLessonsCount = mentorData?.todayLessonsCount ?? (groups?.length ?? 0)
  const todayAttendanceRate = mentorData?.todayAttendanceRate ?? 0
  const pendingCount = mentorData?.pendingGradingCount ?? (mentorData?.pendingReviews?.length ?? 0)
  const nextLesson = mentorData?.nextLesson
  const todayLessons = mentorData?.todayLessons && mentorData.todayLessons.length > 0
    ? mentorData.todayLessons
    : []

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Mentor Header Hero Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-950 via-slate-900 to-indigo-900 text-white p-6 sm:p-8 shadow-xl">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2.5 max-w-2xl">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/20 text-cyan-300 text-xs font-bold">
                <span className="w-2 h-2 rounded-full bg-emerald-400 beacon-pulse" />
                <span>{t('dashboard.mentor.sessionActive')}</span>
              </span>
              <span className="text-xs text-slate-300">{currentDateFormatted}</span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              {t('dashboard.mentor.welcome', { name: userFullName || 'Mentor' })}
            </h1>

            <p className="text-slate-300 text-xs sm:text-sm leading-relaxed">
              {t('dashboard.mentor.desc')}
            </p>

            <div className="pt-2 flex flex-wrap items-center gap-2.5">
              <button
                type="button"
                onClick={() => onNavigateTab('lessons')}
                className="inline-flex items-center px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-lg shadow-indigo-600/30 cursor-pointer"
              >
                <Plus className="w-4 h-4 mr-1.5" />
                <span>{t('dashboard.mentor.createLessonPlan')}</span>
              </button>

              <button
                type="button"
                onClick={() => onNavigateTab('ai-assistant')}
                className="inline-flex items-center px-4 py-2.5 rounded-xl font-semibold text-xs sm:text-sm bg-white/10 hover:bg-white/15 text-cyan-200 cursor-pointer"
              >
                <Sparkles className="w-4 h-4 mr-1.5 text-cyan-300" />
                <span>{t('dashboard.mentor.aiAssistant')}</span>
              </button>

              <button
                type="button"
                onClick={() => onNavigateTab('grading')}
                className="inline-flex items-center px-3.5 py-2.5 rounded-xl font-medium text-xs text-slate-300 hover:text-white cursor-pointer"
              >
                <FileCheck className="w-4 h-4 mr-1.5 text-emerald-400" />
                <span>{t('dashboard.mentor.gradingJournal')}</span>
              </button>
            </div>
          </div>

          {/* Next Lesson Countdown Widget */}
          <div className="shrink-0 bg-white/5 backdrop-blur-md rounded-2xl p-4 sm:p-5 text-center min-w-[200px]">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 text-[10px] font-bold uppercase tracking-wider mb-2">
              <Clock className="w-3 h-3" />
              <span>{t('dashboard.mentor.nextLesson')}</span>
            </div>
            {nextLesson ? (
              <>
                <div className="text-xl sm:text-2xl font-black text-white font-mono">
                  {nextLesson.groupCode} · {nextLesson.subject}
                </div>
                <p className="text-[11px] text-slate-300 mt-1 font-semibold">
                  {nextLesson.gradeLevel} • {nextLesson.startTime} • Xona: {nextLesson.room || 'IT Lab'}
                </p>
                <div className="mt-3 pt-2.5 flex items-center justify-center gap-1.5 text-[10px] text-emerald-400 font-semibold">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>{t('dashboard.mentor.materialsReady')}</span>
                </div>
              </>
            ) : (
              <div className="py-2 text-xs text-slate-300">
                {t('dashboard.mentor.noTodayLessons')}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mentor 4 KPIs Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-card text-card-foreground p-5 rounded-2xl shadow-[0_2px_14px_-2px_rgba(0,0,0,0.05)] dark:shadow-none hover:shadow-xl hover:-translate-y-1 transition-all duration-300 border-0 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-[var(--text-muted)] font-medium">{t('dashboard.mentor.todayLessons')}</span>
              <div className="w-8 h-8 rounded-xl bg-blue-500/15 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                <Calendar className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-black text-[var(--text-primary)] font-mono">
              {todayLessonsCount}
            </div>
          </div>
          <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold mt-2">
            {todayLessonsCount > 0 ? `${todayLessonsCount * 80} daqiqa dars` : t('dashboard.mentor.noTodayLessons')}
          </p>
        </div>

        <div className="bg-card text-card-foreground p-5 rounded-2xl shadow-[0_2px_14px_-2px_rgba(0,0,0,0.05)] dark:shadow-none hover:shadow-xl hover:-translate-y-1 transition-all duration-300 border-0 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-[var(--text-muted)] font-medium">{t('dashboard.mentor.assignedGroups')}</span>
              <div className="w-8 h-8 rounded-xl bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                <Users className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-black text-[var(--text-primary)] font-mono">
              {assignedGroupsCount}
            </div>
          </div>
          <p className="text-[11px] text-[var(--text-muted)] mt-2">
            {assignedStudentsCount} ta o‘quvchi biriktirilgan
          </p>
        </div>

        <div className="bg-card text-card-foreground p-5 rounded-2xl shadow-[0_2px_14px_-2px_rgba(0,0,0,0.05)] dark:shadow-none hover:shadow-xl hover:-translate-y-1 transition-all duration-300 border-0 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-[var(--text-muted)] font-medium">{t('dashboard.mentor.todayAttendance')}</span>
              <div className="w-8 h-8 rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                <CheckCheck className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 font-mono">
              {todayAttendanceRate}%
            </div>
          </div>
          <p className="text-[11px] text-[var(--text-muted)] mt-2">{t('dashboard.mentor.todayAttendanceDesc')}</p>
        </div>

        <div
          onClick={() => onNavigateTab('assessments')}
          className="bg-card text-card-foreground p-5 rounded-2xl shadow-[0_2px_14px_-2px_rgba(0,0,0,0.05)] dark:shadow-none hover:shadow-xl hover:-translate-y-1 transition-all duration-300 border-0 cursor-pointer flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-[var(--text-muted)] font-medium">{t('dashboard.mentor.gradingQueue')}</span>
              <div className="w-8 h-8 rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                <FileCheck className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-black text-amber-600 dark:text-amber-400 font-mono">
              {pendingCount}
            </div>
          </div>
          <p className="text-[11px] text-[var(--brand-primary)] font-semibold mt-2 flex items-center gap-1">
            <span>{t('dashboard.mentor.gradingQueueDesc')}</span>
            <ArrowRight className="w-3 h-3" />
          </p>
        </div>
      </div>

      {/* Mentor Main Grid: Today's Schedule & Pending Submissions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Mentor Today Lessons */}
        <div className="lg:col-span-2 bg-card text-card-foreground rounded-3xl p-6 shadow-[0_2px_14px_-2px_rgba(0,0,0,0.04)] dark:shadow-none border-0">
          <div className="flex items-center justify-between pb-3.5 border-b border-border/15 mb-4">
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-indigo-500" />
              <h3 className="font-bold text-sm text-[var(--text-primary)]">
                {t('dashboard.mentor.todaySchedule')}
              </h3>
            </div>
            <button
              onClick={() => onNavigateTab('timetable')}
              className="text-xs font-semibold text-[var(--brand-primary)] hover:underline cursor-pointer"
            >
              {t('dashboard.mentor.fullSchedule')}
            </button>
          </div>

          <div className="space-y-3">
            {todayLessons.length > 0 ? (
              todayLessons.map((item, idx) => (
                <div
                  key={item.id || idx}
                  className="p-4 rounded-2xl bg-muted/30 dark:bg-muted/15 border-0 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="flex items-start gap-3.5">
                    <div className="w-10 h-10 rounded-xl bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0 font-mono font-bold text-xs">
                      {idx + 1}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="font-mono text-xs font-bold px-2 py-0.5 rounded-md bg-background text-[var(--text-primary)]">
                          {item.startTime} - {item.endTime}
                        </span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300">
                          {item.groupCode} • {item.gradeLevel}
                        </span>
                        <span className="text-[10px] text-[var(--text-muted)] flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-indigo-500" />
                          {item.room || 'IT Lab'} ({item.branchLocation || 'IT Park Yangiariq'})
                        </span>
                      </div>
                      <h4 className="font-bold text-xs sm:text-sm text-[var(--text-primary)]">
                        {item.subject}
                      </h4>
                      <p className="text-[11px] text-[var(--text-muted)] mt-0.5">
                        {item.topic ? `Mavzu: ${item.topic} • ` : ''}O‘quvchilar: {item.studentCount || 0} ta
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => onNavigateTab('timetable')}
                      className="px-3 py-1.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 text-xs font-bold hover:bg-indigo-100 transition cursor-pointer"
                    >
                      {t('nav.timetable')}
                    </button>
                    <button
                      onClick={() => onNavigateTab('lessons')}
                      className="px-3 py-1.5 rounded-xl bg-[var(--brand-primary)] text-white text-xs font-bold hover:opacity-90 transition cursor-pointer"
                    >
                      {t('nav.lessons')}
                    </button>
                  </div>
                </div>
              ))
            ) : groups.length > 0 ? (
              groups.map((item, idx) => (
                <div
                  key={item.id || idx}
                  className="p-4 rounded-2xl bg-muted/30 dark:bg-muted/15 border-0 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="flex items-start gap-3.5">
                    <div className="w-10 h-10 rounded-xl bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0 font-mono font-bold text-xs">
                      {idx + 1}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="font-mono text-xs font-bold px-2 py-0.5 rounded-md bg-background text-[var(--text-primary)]">
                          {item.scheduleTime || '15:00 - 16:30'}
                        </span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300">
                          {item.groupCode} • {item.gradeLevel}
                        </span>
                        <span className="text-[10px] text-[var(--text-muted)] flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-indigo-500" />
                          {item.room || 'IT Lab'} ({item.branchLocation || 'IT Park Yangiariq'})
                        </span>
                      </div>
                      <h4 className="font-bold text-xs sm:text-sm text-[var(--text-primary)]">
                        {item.subject}
                      </h4>
                      <p className="text-[11px] text-[var(--text-muted)] mt-0.5">
                        Kunlar: {item.scheduleDays || 'Haftalik'} • O‘quvchilar: {item.studentCount || 0} ta
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => onNavigateTab('timetable')}
                      className="px-3 py-1.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 text-xs font-bold hover:bg-indigo-100 transition cursor-pointer"
                    >
                      {t('nav.timetable')}
                    </button>
                    <button
                      onClick={() => onNavigateTab('lessons')}
                      className="px-3 py-1.5 rounded-xl bg-[var(--brand-primary)] text-white text-xs font-bold hover:opacity-90 transition cursor-pointer"
                    >
                      {t('nav.lessons')}
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="py-6 text-center text-xs text-[var(--text-muted)]">
                {t('dashboard.mentor.noTodayLessons')}
              </div>
            )}
          </div>

          {/* Student growth dynamics mini card */}
          <div className="mt-6 p-4 rounded-2xl bg-muted/20 border-0">
            <div className="flex items-center justify-between mb-2.5">
              <span className="text-xs font-bold text-[var(--text-primary)] flex items-center gap-1.5">
                <TrendingUp className="w-4 h-4 text-emerald-500" />
                <span>{t('dashboard.mentor.studentGrowth')}</span>
              </span>
              <span className="text-[11px] font-mono font-bold text-emerald-600 dark:text-emerald-400">
                {t('dashboard.mentor.growthPercent')}
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div className="p-2.5 rounded-xl bg-card border-0 shadow-2xs">
                <span className="text-[10px] text-[var(--text-muted)] block">{t('dashboard.mentor.theoryMastery')}</span>
                <span className="font-bold font-mono text-[var(--text-primary)]">
                  {mentorData?.theoryMasteryRate !== undefined ? `${mentorData.theoryMasteryRate}%` : '0%'}
                </span>
              </div>
              <div className="p-2.5 rounded-xl bg-card border-0 shadow-2xs">
                <span className="text-[10px] text-[var(--text-muted)] block">{t('dashboard.mentor.codingPractice')}</span>
                <span className="font-bold font-mono text-emerald-600 dark:text-emerald-400">
                  {mentorData?.codingPracticeRate !== undefined ? `${mentorData.codingPracticeRate}%` : '0%'}
                </span>
              </div>
              <div className="p-2.5 rounded-xl bg-card border-0 shadow-2xs">
                <span className="text-[10px] text-[var(--text-muted)] block">{t('dashboard.mentor.miniProject')}</span>
                <span className="font-bold font-mono text-indigo-600 dark:text-indigo-400">
                  {mentorData?.miniProjectRate !== undefined ? `${mentorData.miniProjectRate}%` : '0%'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Right 1 Col: Pending Submissions & Quick Actions */}
        <div className="space-y-4">
          <div className="bg-card text-card-foreground rounded-3xl p-5 shadow-[0_2px_14px_-2px_rgba(0,0,0,0.04)] dark:shadow-none border-0">
            <div className="flex items-center justify-between pb-3 border-b border-border/15 mb-3">
              <h3 className="font-bold text-xs text-[var(--text-primary)] flex items-center gap-1.5">
                <FileCheck className="w-4 h-4 text-amber-500" />
                <span>{t('dashboard.mentor.pendingReviews')}</span>
              </h3>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400">
                {t('dashboard.mentor.newTasksCount', { count: pendingCount })}
              </span>
            </div>

            <div className="space-y-2.5">
              {mentorData?.pendingReviews && mentorData.pendingReviews.length > 0 ? (
                mentorData.pendingReviews.map((sub) => (
                  <div
                    key={sub.submissionId}
                    className="p-2.5 rounded-xl bg-muted/30 dark:bg-muted/15 border-0 flex items-center justify-between text-xs"
                  >
                    <div className="truncate pr-2">
                      <strong className="text-[var(--text-primary)] block truncate">
                        {sub.studentName}
                      </strong>
                      <span className="text-[10px] text-[var(--text-muted)] block truncate">
                        {sub.title} • {sub.groupCode}
                      </span>
                    </div>
                    <button
                      onClick={() => onNavigateTab('assessments')}
                      className="px-2.5 py-1 rounded-lg bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 font-bold text-[11px] shrink-0 hover:bg-amber-100 transition cursor-pointer"
                    >
                      {t('dashboard.mentor.gradeBtn')}
                    </button>
                  </div>
                ))
              ) : (
                <div className="py-4 text-center text-xs text-[var(--text-muted)]">
                  {t('dashboard.mentor.noPendingReviews')}
                </div>
              )}
            </div>

            <div className="mt-3 pt-3 border-t border-border/15">
              <button
                onClick={() => onNavigateTab('assessments')}
                className="w-full py-2 rounded-xl bg-[var(--bg-subtle)] text-[var(--text-primary)] hover:bg-[var(--bg-muted)] font-bold text-xs transition cursor-pointer"
              >
                {t('dashboard.mentor.viewAllTasks')}
              </button>
            </div>
          </div>

          {/* 80-minute shortcut reminder */}
          <div className="p-4 rounded-3xl bg-gradient-to-br from-indigo-950 to-slate-900 text-white border-0 shadow-lg">
            <div className="flex items-center gap-2 mb-2">
              <Zap className="w-4 h-4 text-cyan-400" />
              <span className="text-xs font-bold">{t('dashboard.mentor.standard80minTitle')}</span>
            </div>
            <div className="space-y-1.5 text-[11px] text-slate-300">
              <div className="flex justify-between">
                <span>{t('dashboard.mentor.stage1')}</span>
                <span className="font-mono text-cyan-300">15–20 min</span>
              </div>
              <div className="flex justify-between">
                <span>{t('dashboard.mentor.stage2')}</span>
                <span className="font-mono text-blue-300">25–30 min</span>
              </div>
              <div className="flex justify-between">
                <span>{t('dashboard.mentor.stage3')}</span>
                <span className="font-mono text-purple-300">20–25 min</span>
              </div>
              <div className="flex justify-between">
                <span>{t('dashboard.mentor.stage4')}</span>
                <span className="font-mono text-emerald-300">10–15 min</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
