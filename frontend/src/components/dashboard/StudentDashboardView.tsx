import React from 'react'
import { useTranslation } from '@/shared/i18n'
import { useStudentDashboard } from '@/features/analytics'
import {
  GraduationCap,
  FileCheck,
  Sparkles,
  Flame,
  Lock,
  Star,
  Target,
  CheckCircle,
  Trophy,
  Calendar,
  AlertCircle,
  FileText,
  BookOpen,
  ArrowUpRight,
  MapPin,
} from 'lucide-react'

export interface StudentDashboardViewProps {
  currentDateFormatted: string
  userFullName?: string
  onNavigateTab: (tab: string) => void
}

export const StudentDashboardView: React.FC<StudentDashboardViewProps> = ({
  currentDateFormatted = '',
  userFullName = '',
  onNavigateTab = () => {},
}) => {
  const { t } = useTranslation()
  const { data: studentData, hasProfile } = useStudentDashboard()

  const displayName = studentData?.studentName || userFullName || 'Iqtidorli O‘quvchi'
  const trackLabel = studentData?.gradeLevel
    ? `${studentData.gradeLevel} • Guruh: ${studentData.groupCode || '-'}`
    : t('dashboard.student.trackName')

  const xpValue = studentData?.totalPoints ?? 0
  const levelValue = studentData?.level ?? 1
  const rankLabel = studentData?.rank
    ? `Guruhda ${studentData.rank}-o‘rin 🏆`
    : t('dashboard.student.rankInGroup')
  const nextLevelXPText = studentData?.nextLevelXp
    ? `Keyingi darajagacha ${Math.max(0, studentData.nextLevelXp - xpValue)} XP`
    : t('dashboard.student.nextLevelXP')

  const gpaValue = studentData?.gpa !== undefined ? studentData.gpa : 0
  const courseProgressValue = studentData?.courseProgress !== undefined ? studentData.courseProgress : 0
  const attendanceRateValue = studentData?.attendanceRate !== undefined ? studentData.attendanceRate : 0
  const badgesCountValue = studentData?.badgesCount ?? 0

  return (
    <div className="space-y-6 animate-fade-in">
      {!hasProfile && (
        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-800 dark:text-amber-300 flex items-center gap-3 text-xs">
          <AlertCircle className="w-5 h-5 shrink-0 text-amber-500" />
          <span>{t('dashboard.student.missingProfileNotice')}</span>
        </div>
      )}

      {/* Student Welcome Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-blue-950 via-slate-900 to-indigo-950 text-white p-6 sm:p-8 shadow-xl">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/20 text-cyan-300 text-xs font-bold">
                <GraduationCap className="w-3.5 h-3.5 text-cyan-300" />
                <span>{trackLabel}</span>
              </span>
              <span className="text-xs text-slate-300">{currentDateFormatted}</span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              {t('dashboard.student.welcome', { name: displayName })}
            </h1>

            <p className="text-slate-300 text-xs sm:text-sm leading-relaxed">
              {t('dashboard.student.desc')}
            </p>

            <div className="pt-2 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => onNavigateTab('assessments')}
                className="inline-flex items-center px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white shadow-lg shadow-blue-600/30 cursor-pointer"
              >
                <FileCheck className="w-4 h-4 mr-1.5" />
                <span>{t('dashboard.student.viewTasks')}</span>
              </button>

              <button
                type="button"
                onClick={() => onNavigateTab('ai-assistant')}
                className="inline-flex items-center px-4 py-2.5 rounded-xl font-semibold text-xs sm:text-sm bg-white/10 hover:bg-white/15 text-cyan-200 cursor-pointer"
              >
                <Sparkles className="w-4 h-4 mr-1.5 text-cyan-300" />
                <span>{t('dashboard.student.aiTutor')}</span>
              </button>
            </div>
          </div>

          {/* Student Level & XP Pill */}
          <div className="shrink-0 bg-white/5 backdrop-blur-md rounded-2xl p-4 sm:p-5 text-center min-w-[200px]">
            <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-[10px] font-bold uppercase tracking-wider mb-2">
              <Flame className="w-3 h-3 text-amber-400" />
              <span>{t('dashboard.student.levelBadge', { level: levelValue })}</span>
            </div>
            <div className="text-2xl sm:text-3xl font-black text-amber-300 font-mono">
              {xpValue.toLocaleString()} XP
            </div>
            <p className="text-[11px] text-slate-300 mt-1">{rankLabel}</p>
            <div className="mt-3 pt-2.5 text-[10px] text-cyan-300 font-semibold">
              {nextLevelXPText}
            </div>
          </div>
        </div>
      </div>

      {/* Student Privacy Banner */}
      <div className="p-3.5 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/40 border-0 flex items-center gap-3 text-xs text-indigo-900 dark:text-indigo-200">
        <Lock className="w-4 h-4 text-indigo-500 shrink-0" />
        <span>
          <strong>{t('dashboard.student.privacyTitle')}</strong> {t('dashboard.student.privacyNotice')}
        </span>
      </div>

      {/* Student 4 KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-card text-card-foreground p-5 rounded-2xl shadow-[0_2px_14px_-2px_rgba(0,0,0,0.05)] dark:shadow-none hover:shadow-xl hover:-translate-y-1 transition-all duration-300 border-0 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-[var(--text-muted)] font-medium">{t('dashboard.student.gpa')}</span>
              <div className="w-8 h-8 rounded-xl bg-blue-500/15 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                <Star className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-black text-blue-600 dark:text-blue-400 font-mono">
              {gpaValue} / 100
            </div>
          </div>
          <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold mt-2">
            {t('dashboard.student.gpaBadge')}
          </p>
        </div>

        <div className="bg-card text-card-foreground p-5 rounded-2xl shadow-[0_2px_14px_-2px_rgba(0,0,0,0.05)] dark:shadow-none hover:shadow-xl hover:-translate-y-1 transition-all duration-300 border-0 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-[var(--text-muted)] font-medium">{t('dashboard.student.courseProgress')}</span>
              <div className="w-8 h-8 rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                <Target className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 font-mono">
              {courseProgressValue}%
            </div>
          </div>
          <p className="text-[11px] text-[var(--text-muted)] mt-2">
            {t('dashboard.student.progressTopics')}
          </p>
        </div>

        <div className="bg-card text-card-foreground p-5 rounded-2xl shadow-[0_2px_14px_-2px_rgba(0,0,0,0.05)] dark:shadow-none hover:shadow-xl hover:-translate-y-1 transition-all duration-300 border-0 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-[var(--text-muted)] font-medium">{t('dashboard.student.attendance')}</span>
              <div className="w-8 h-8 rounded-xl bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                <CheckCircle className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-black text-indigo-600 dark:text-indigo-400 font-mono">
              {attendanceRateValue}%
            </div>
          </div>
          <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold mt-2">
            {studentData?.presentCount !== undefined ? `${studentData.presentCount} ta hozir, ${studentData.absentCount || 0} ta qoldirilgan` : t('dashboard.student.zeroAbsence')}
          </p>
        </div>

        <div className="bg-card text-card-foreground p-5 rounded-2xl shadow-[0_2px_14px_-2px_rgba(0,0,0,0.05)] dark:shadow-none hover:shadow-xl hover:-translate-y-1 transition-all duration-300 border-0 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-[var(--text-muted)] font-medium">{t('dashboard.student.badges')}</span>
              <div className="w-8 h-8 rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                <Trophy className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-black text-amber-600 dark:text-amber-400 font-mono">
              {badgesCountValue}
            </div>
          </div>
          <p className="text-[11px] text-amber-600 dark:text-amber-400 font-semibold mt-2">
            {t('dashboard.student.badgeNames')}
          </p>
        </div>
      </div>

      {/* Student Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Today Lessons & Approaching Deadlines */}
        <div className="lg:col-span-2 space-y-6">
          {/* Today's Lessons for Student */}
          <div className="bg-card text-card-foreground rounded-3xl p-6 shadow-[0_2px_14px_-2px_rgba(0,0,0,0.04)] dark:shadow-none border-0">
            <div className="flex items-center justify-between pb-3.5 border-b border-border/15 mb-4">
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-blue-500" />
                <h3 className="font-bold text-sm text-[var(--text-primary)]">
                  {t('dashboard.student.todayLessonTitle')}
                </h3>
              </div>
              <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-500 beacon-pulse" />
                {t('dashboard.student.plannedLesson')}
              </span>
            </div>

            {studentData?.todayLesson ? (
              <div className="p-4 rounded-2xl bg-gradient-to-r from-blue-500/10 via-indigo-500/5 to-cyan-500/10 border-0 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-xs">
                    <span className="font-mono font-bold px-2 py-0.5 rounded-md bg-blue-500/20 text-blue-700 dark:text-blue-300">
                      {studentData.todayLesson.startTime} – {studentData.todayLesson.endTime}
                    </span>
                    <span className="text-[var(--text-muted)] flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-indigo-500" />
                      {studentData.todayLesson.room || 'IT Lab'}
                    </span>
                  </div>
                  <h4 className="font-bold text-sm sm:text-base text-[var(--text-primary)]">
                    {studentData.todayLesson.subject}
                  </h4>
                  <p className="text-xs text-[var(--text-secondary)]">
                    Mentor: {studentData.todayLesson.mentorName}{studentData.todayLesson.topic ? ` • Mavzu: ${studentData.todayLesson.topic}` : ''}
                  </p>
                </div>

                <button
                  onClick={() => onNavigateTab('materials')}
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-sm transition cursor-pointer self-start sm:self-auto shrink-0"
                >
                  {t('dashboard.student.lessonMaterialsBtn')}
                </button>
              </div>
            ) : (
              <div className="py-6 text-center text-xs text-[var(--text-muted)]">
                {t('dashboard.student.noTodayLesson')}
              </div>
            )}
          </div>

          {/* Approaching Deadlines */}
          <div className="bg-card text-card-foreground rounded-3xl p-6 shadow-[0_2px_14px_-2px_rgba(0,0,0,0.04)] dark:shadow-none border-0">
            <div className="flex items-center justify-between pb-3.5 border-b border-border/15 mb-4">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-amber-500" />
                <h3 className="font-bold text-sm text-[var(--text-primary)]">
                  {t('dashboard.student.activeTasksTitle')}
                </h3>
              </div>
              <button
                onClick={() => onNavigateTab('assessments')}
                className="text-xs font-semibold text-[var(--brand-primary)] hover:underline cursor-pointer"
              >
                {t('dashboard.student.viewAll')}
              </button>
            </div>

            <div className="space-y-3">
              {studentData?.activeTasks && studentData.activeTasks.length > 0 ? (
                studentData.activeTasks.map((task) => (
                  <div
                    key={`${task.type}-${task.id}`}
                    className="p-3.5 rounded-2xl bg-muted/30 dark:bg-muted/15 border-0 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-background text-[var(--text-secondary)]">
                          {task.subject}
                        </span>
                        {task.urgent && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400">
                            {t('dashboard.student.urgentDeadline')}
                          </span>
                        )}
                        {task.isSubmitted && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400">
                            Topshirilgan
                          </span>
                        )}
                      </div>
                      <h4 className="font-bold text-xs sm:text-sm text-[var(--text-primary)]">
                        {task.title}
                      </h4>
                    </div>

                    <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
                      <span className="font-mono text-xs font-semibold text-[var(--text-muted)]">
                        {task.deadline}
                      </span>
                      <button
                        onClick={() => onNavigateTab('assessments')}
                        className="px-3 py-1.5 rounded-xl bg-[var(--brand-primary)] text-white font-bold text-xs hover:opacity-90 transition cursor-pointer"
                      >
                        {task.isSubmitted ? 'Ko‘rish' : t('dashboard.student.submitBtn')}
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-6 text-center text-xs text-[var(--text-muted)]">
                  {t('dashboard.student.noActiveTasks')}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right 1 Col: Latest Quiz Feedback & Recommended Resources */}
        <div className="space-y-6">
          {/* Latest Quiz Feedback */}
          <div className="bg-card text-card-foreground rounded-3xl p-5 shadow-[0_2px_14px_-2px_rgba(0,0,0,0.04)] dark:shadow-none border-0">
            <div className="flex items-center justify-between pb-3 border-b border-border/15 mb-3">
              <h3 className="font-bold text-xs text-[var(--text-primary)] flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-emerald-500" />
                <span>{t('dashboard.student.latestFeedbackTitle')}</span>
              </h3>
              {studentData?.latestFeedback?.score !== undefined && studentData?.latestFeedback?.score !== null && (
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                  {studentData.latestFeedback.score} / {studentData.latestFeedback.maxScore || 100}
                </span>
              )}
            </div>

            {studentData?.latestFeedback ? (
              <div className="p-3 rounded-2xl bg-muted/20 border-0 space-y-2 text-xs">
                <div className="font-bold text-[var(--text-primary)]">
                  Mavzu: {studentData.latestFeedback.topic}
                </div>
                <p className="text-[11px] text-[var(--text-secondary)] italic leading-relaxed">
                  «{studentData.latestFeedback.mentorFeedback}»
                </p>
                <div className="text-[10px] text-[var(--text-muted)] pt-1 border-t border-border/15 flex items-center justify-between">
                  <span>Ustoz: {studentData.latestFeedback.mentorName}</span>
                  <span>{studentData.latestFeedback.formattedDate}</span>
                </div>
              </div>
            ) : (
              <div className="py-4 text-center text-xs text-[var(--text-muted)]">
                {t('dashboard.student.noFeedback')}
              </div>
            )}
          </div>

          {/* Recommended Learning Resources */}
          <div className="bg-card text-card-foreground rounded-3xl p-5 shadow-[0_2px_14px_-2px_rgba(0,0,0,0.04)] dark:shadow-none border-0">
            <div className="flex items-center justify-between pb-3 border-b border-border/15 mb-3">
              <h3 className="font-bold text-xs text-[var(--text-primary)] flex items-center gap-1.5">
                <BookOpen className="w-4 h-4 text-indigo-500" />
                <span>{t('dashboard.student.recommendedMaterials')}</span>
              </h3>
              <button
                onClick={() => onNavigateTab('materials')}
                className="text-[11px] font-semibold text-[var(--brand-primary)] hover:underline cursor-pointer"
              >
                {t('dashboard.student.libraryBtn')}
              </button>
            </div>

            <div className="space-y-2 text-xs">
              {[
                { title: 'CSS Flexbox & Grid to‘liq amaliy qo‘llanma', type: 'PDF • 4.2 MB' },
                { title: 'TypeScript asoslari: Interface va Typelar', type: 'Video darslik' },
                { title: '80 daqiqalik dars standarti: Mini-loyiha shabloni', type: 'ZIP fayl' },
              ].map((res, idx) => (
                <div
                  key={idx}
                  onClick={() => onNavigateTab('materials')}
                  className="p-2.5 rounded-xl bg-muted/30 dark:bg-muted/15 hover:bg-muted/50 cursor-pointer transition flex items-center justify-between border-0"
                >
                  <div className="truncate pr-2">
                    <span className="font-semibold text-[var(--text-primary)] block truncate">
                      {res.title}
                    </span>
                    <span className="text-[10px] text-[var(--text-muted)] block">{res.type}</span>
                  </div>
                  <ArrowUpRight className="w-3.5 h-3.5 text-[var(--text-muted)] shrink-0" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
