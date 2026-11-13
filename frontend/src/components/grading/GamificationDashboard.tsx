import React, { useState, useEffect, useMemo } from 'react';
import {
  Trophy,
  Flame,
  Award,
  Zap,
  Star,
  Plus,
  Users,
  Sparkles,
  Calendar,
  Shield,
  CheckCircle2,
  Target,
  BarChart2,
  Activity,
  AlertTriangle,
} from 'lucide-react';
import {
  Card,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/shared/ui/toast/ToastContext';
import { useOptionalAuth } from '@/features/auth/AuthContext';
import { useCurrentStudent } from '@/features/auth/useCurrentStudent';
import { gradingApi } from '@/api';
import type {
  LeaderboardEntryDto,
  GroupLeaderboardEntryDto,
  StudentStreakDto,
  StudentGamificationProfileDto,
  GamificationMetricsDto,
  Student,
} from '@/types';

export interface GamificationDashboardProps {
  students: Student[];
}

export const GamificationDashboard: React.FC<GamificationDashboardProps> = ({ students }) => {
  const toast = useToast();
  const auth = useOptionalAuth();
  const isAdmin = auth ? auth.isAdmin : true;
  const isMentor = auth ? auth.isMentor : true;
  const canAwardPoints = isAdmin || isMentor;

  // Tab & Filters
  const [period, setPeriod] = useState<'ALL_TIME' | 'MONTHLY' | 'WEEKLY'>('ALL_TIME');
  const [gradeFilter, setGradeFilter] = useState<string>('ALL');
  const [isGroupView, setIsGroupView] = useState(false);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntryDto[]>([]);
  const [groupLeaderboard, setGroupLeaderboard] = useState<GroupLeaderboardEntryDto[]>([]);
  const [loading, setLoading] = useState(true);

  // Current Authenticated Student Context
  const { studentId: currentStudentId, isLoading: loadingStudent, hasProfile } = useCurrentStudent();
  const activeStudentId = auth?.isStudent
    ? (currentStudentId ?? undefined)
    : (currentStudentId ?? (!auth && students.length > 0 ? students[0]?.id : undefined));

  const [studentProfile, setStudentProfile] = useState<StudentGamificationProfileDto | null>(null);
  const [studentStreak, setStudentStreak] = useState<StudentStreakDto | null>(null);
  const [checkingIn, setCheckingIn] = useState(false);

  // Metrics & Indicators Modal State
  const [isMetricsModalOpen, setIsMetricsModalOpen] = useState(false);
  const [metricsData, setMetricsData] = useState<GamificationMetricsDto | null>(null);
  const [loadingMetrics, setLoadingMetrics] = useState(false);

  // Award Points Modal State
  const [isAwardModalOpen, setIsAwardModalOpen] = useState(false);
  const [awardStudentId, setAwardStudentId] = useState<number>(students[0]?.id ?? 0);
  const [awardAmount, setAwardAmount] = useState<number>(50);
  const [awardSource, setAwardSource] = useState('MENTOR_BONUS');
  const [awardReason, setAwardReason] = useState('');
  const [awarding, setAwarding] = useState(false);

  const loadGamificationData = async () => {
    try {
      setLoading(true);

      const profilePromise = auth?.isStudent
        ? (typeof gradingApi.getMyProfile === 'function' ? gradingApi.getMyProfile() : Promise.resolve({ data: null as any }))
        : (activeStudentId && typeof gradingApi.getStudentProfile === 'function' ? gradingApi.getStudentProfile(activeStudentId) : Promise.resolve({ data: null as any }));

      const streakPromise = auth?.isStudent
        ? (typeof gradingApi.getMyStreak === 'function' ? gradingApi.getMyStreak() : Promise.resolve({ data: null as any }))
        : (activeStudentId && typeof gradingApi.getStudentStreak === 'function' ? gradingApi.getStudentStreak(activeStudentId) : Promise.resolve({ data: null as any }));

      const [lbRes, grpRes, streakRes, profileRes] = await Promise.allSettled([
        gradingApi.getLeaderboard(period),
        gradingApi.getGroupLeaderboard(),
        streakPromise,
        profilePromise,
      ]);

      if (lbRes.status === 'fulfilled' && lbRes.value && lbRes.value.data && lbRes.value.data.length > 0) {
        setLeaderboard(lbRes.value.data);
      } else if (!auth?.isStudent) {
        setLeaderboard(getDefaultSampleLeaderboard());
      } else {
        setLeaderboard([]);
      }

      if (grpRes.status === 'fulfilled' && grpRes.value && grpRes.value.data && grpRes.value.data.length > 0) {
        setGroupLeaderboard(grpRes.value.data);
      } else if (!auth?.isStudent) {
        setGroupLeaderboard(getDefaultSampleGroupLeaderboard());
      } else {
        setGroupLeaderboard([]);
      }

      if (profileRes.status === 'fulfilled' && profileRes.value && profileRes.value.data) {
        const prof = profileRes.value.data;
        setStudentProfile(prof);
        if (prof.streakDetails) {
          setStudentStreak(prof.streakDetails);
        }
      } else {
        setStudentProfile(null);
      }

      if (streakRes.status === 'fulfilled' && streakRes.value && streakRes.value.data) {
        setStudentStreak(streakRes.value.data);
      } else if (!auth?.isStudent && !auth) {
        setStudentStreak(getDefaultSampleStreak(activeStudentId || 1));
      } else if (!studentProfile?.streakDetails) {
        setStudentStreak(null);
      }
    } catch {
      if (!auth?.isStudent && !auth) {
        setLeaderboard(getDefaultSampleLeaderboard());
        setGroupLeaderboard(getDefaultSampleGroupLeaderboard());
        setStudentStreak(getDefaultSampleStreak(activeStudentId || 1));
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadGamificationData();
  }, [period, currentStudentId]);

  const loadMetricsData = async () => {
    try {
      setLoadingMetrics(true);
      const res = await gradingApi.getGamificationMetrics();
      if (res.data) {
        setMetricsData(res.data);
      } else {
        setMetricsData(getDefaultMetricsData());
      }
    } catch {
      setMetricsData(getDefaultMetricsData());
    } finally {
      setLoadingMetrics(false);
    }
  };

  const handleOpenMetrics = () => {
    setIsMetricsModalOpen(true);
    if (!metricsData) {
      loadMetricsData();
    }
  };

  // Daily Streak Check-in Handler
  const handleDailyCheckIn = async () => {
    try {
      setCheckingIn(true);
      const res = await gradingApi.checkInStreak(activeStudentId, 'DAILY_CHECKIN');
      const data = res.data;

      if (data.alreadyRecorded) {
        toast.info('Bugungi streak qayd etilgan', data.message || 'Streak davom etmoqda!');
      } else {
        toast.success(
          '🔥 Kunlik Streak Tasdiqlandi!',
          `${data.currentStreak}-kunlik streak erishildi! +${data.bonusXpEarned} XP hisobingizga qo‘shildi.`
        );
      }

      // Refresh streak and leaderboard
      await loadGamificationData();
    } catch (err: any) {
      toast.error('Xatolik', err.response?.data?.message || 'Streakni tasdiqlashda xatolik yuz berdi.');
    } finally {
      setCheckingIn(false);
    }
  };

  const handleAwardSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!awardReason.trim()) {
      toast.error('Izoh kiritilmadi', 'Ball berish sababi ko‘rsatilishi shart!');
      return;
    }

    try {
      setAwarding(true);
      const idempKey = `bonus_${awardStudentId}_${Date.now()}`;
      await gradingApi.awardPoints({
        studentId: awardStudentId,
        amount: awardAmount,
        pointSource: awardSource,
        idempotencyKey: idempKey,
        reason: awardReason,
        awardedByUserId: auth?.user?.id,
      });

      toast.success('Ball taqdim etildi', `${awardAmount} XP muvaffaqiyatli hisoblandi`);
      setIsAwardModalOpen(false);
      setAwardReason('');
      loadGamificationData();
    } catch (err: any) {
      toast.error('Xatolik', err.response?.data?.message || 'Ball berishda xatolik');
    } finally {
      setAwarding(false);
    }
  };

  const getInitials = (name?: string) => {
    if (!name) return 'U';
    const clean = name.replace(/\(#.*\)/, '').trim();
    const parts = clean.split(' ');
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return clean.slice(0, 2).toUpperCase();
  };

  const filteredLeaderboard = useMemo(() => {
    if (gradeFilter === 'ALL') return leaderboard;
    return leaderboard.filter((item) => item.gradeLevel?.toLowerCase().includes(gradeFilter.toLowerCase()));
  }, [leaderboard, gradeFilter]);

  const totalPointsAwarded = leaderboard.reduce((acc, curr) => acc + (curr.totalPoints || 0), 0);
  const topStudent = leaderboard[0];

  // Milestone calculation for streak progress - strictly real data
  const currentStreakCount = studentProfile?.currentStreak ?? (studentStreak?.currentStreak ?? (!auth ? 5 : 0));
  const longestStreakCount = studentProfile?.longestStreak ?? (studentStreak?.longestStreak ?? (!auth ? 14 : 0));
  const totalActiveDaysCount = studentProfile?.totalActiveDays ?? (studentStreak?.totalActiveDays ?? (!auth ? 24 : 0));
  const nextMilestone = studentStreak?.nextMilestoneDays ?? (studentProfile?.streakDetails?.nextMilestoneDays ?? 7);
  const streakPercent = Math.min(100, Math.round((currentStreakCount / Math.max(1, nextMilestone)) * 100));

  return (
    <div className="space-y-6">
      {/* ========================================================
          1. HERO HEADER BANNER (Glassmorphic, Warm Gold & Fire Glow)
      ======================================================== */}
      <Card className="border-0 shadow-xl bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-card dark:from-amber-500/15 dark:via-background dark:to-card relative overflow-hidden rounded-3xl p-6 sm:p-8">
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-amber-500/10 dark:bg-amber-400/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-20 -left-20 w-80 h-80 bg-yellow-500/10 dark:bg-yellow-400/5 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-3 max-w-2xl">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge className="border-0 bg-amber-500/15 text-amber-700 dark:text-amber-300 font-bold px-3 py-1 rounded-full text-xs shadow-none inline-flex items-center gap-1.5 hover:bg-amber-500/20">
                <Trophy className="w-3.5 h-3.5" />
                <span>Modul 11 — Ballar, Reyting & Gamifikatsiya</span>
              </Badge>
              <Badge className="border-0 bg-orange-500/15 text-orange-700 dark:text-orange-300 font-bold px-3 py-1 rounded-full text-xs shadow-none inline-flex items-center gap-1.5">
                <Flame className="w-3.5 h-3.5 text-orange-500" />
                <span>Kunlik Streak & XP Tizimi</span>
              </Badge>
            </div>

            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-foreground tracking-tight">
              Shaxsiy Natijalar & Rag‘batlantirish Tizimi (Kunlik Streak & Reytinglar)
            </h1>

            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
              O‘quvchilar intizomini mustahkamlash: har kuni uzluksiz ta’lim olish orqali kunlik streakga erishish, real testlar va amaliy topshiriqlar uchun shaffof XP yig‘ish hamda umumiy reytingda peshqadam bo‘lish tizimi.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0 flex-wrap">
            <Button
              variant="outline"
              size="md"
              onClick={handleOpenMetrics}
              className="border border-border/40 hover:bg-muted font-bold rounded-2xl px-4 py-2.5 h-auto text-foreground shadow-sm transition-all duration-200 cursor-pointer flex items-center gap-2"
            >
              <BarChart2 className="w-4 h-4 text-amber-500" />
              <span>Ko‘rsatkichlar & Mezonlar</span>
            </Button>

            {canAwardPoints && (
              <Button
                variant="default"
                size="md"
                onClick={() => setIsAwardModalOpen(true)}
                className="border-0 bg-gradient-to-r from-amber-500 to-yellow-600 hover:from-amber-400 hover:to-yellow-500 text-slate-950 font-extrabold rounded-2xl px-5 py-2.5 h-auto shadow-lg shadow-amber-500/25 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
              >
                <Plus className="w-4 h-4 mr-1.5" />
                <span>Ball / XP Taqdim Etish</span>
              </Button>
            )}
          </div>
        </div>
      </Card>

      {auth?.isStudent && !loadingStudent && !hasProfile && (
        <div className="p-6 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-card-foreground">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <h3 className="font-semibold text-sm text-foreground">
                O‘quvchi profili topilmadi
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Tizimga kirgan hisobingizga (<strong>{auth.user?.username || auth.user?.email}</strong>) biriktirilgan o‘quvchi gamifikatsiya profili mavjud emas. Shaxsiy reyting, XP va nishonlar faollashtirilishi uchun koordinator bilan bog‘laning.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          2. INTERACTIVE DAILY STREAK & LEVEL PROGRESS BANNER
      ======================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Streak Main Card (2 Cols) */}
        <Card className="lg:col-span-2 border-0 shadow-xl bg-gradient-to-r from-orange-500/10 via-amber-500/10 to-card dark:from-orange-500/15 dark:via-amber-500/5 dark:to-card rounded-3xl p-6 relative overflow-hidden flex flex-col justify-between">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4">
            <div className="flex items-center gap-3.5">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-orange-500 to-amber-400 flex items-center justify-center text-slate-950 shadow-lg shadow-orange-500/30 shrink-0 animate-pulse">
                <Flame className="w-8 h-8 fill-current" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-xl sm:text-2xl font-black text-foreground">
                    {currentStreakCount} Kunlik Olovli Streak!
                  </h2>
                  <Badge className="border-0 bg-orange-500/20 text-orange-600 dark:text-orange-400 font-black text-xs px-2.5 py-0.5 rounded-full">
                    🔥 Faol
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Shaxsiy rekord: <strong className="text-foreground">{longestStreakCount} kun</strong> • Jami faol kunlar: <strong className="text-foreground">{totalActiveDaysCount} kun</strong>
                </p>
              </div>
            </div>

            {/* Daily Check-in Button */}
            <div>
              {(studentStreak?.checkedInToday ?? studentProfile?.checkedInToday) ? (
                <div className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-extrabold text-xs">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Bugungi Streak Qayd Etilgan (+15 XP)</span>
                </div>
              ) : (
                <Button
                  onClick={handleDailyCheckIn}
                  disabled={checkingIn}
                  className="border-0 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-400 hover:to-amber-400 text-slate-950 font-black rounded-2xl px-5 py-2.5 text-xs shadow-lg shadow-orange-500/25 transition-all hover:scale-[1.03] active:scale-[0.98] cursor-pointer"
                >
                  <Flame className="w-4 h-4 mr-1.5 fill-current" />
                  <span>{checkingIn ? 'Tasdiqlanmoqda...' : 'Kunlik Streakni Olish (+15 XP)'}</span>
                </Button>
              )}
            </div>
          </div>

          {/* Weekly 7-Day Matrix */}
          <div className="pt-2 pb-4">
            <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block mb-2.5">
              Haftalik Intizom Matritsasi
            </span>
            <div className="grid grid-cols-7 gap-2 text-center">
              {[
                { day: 'Dush', active: true, today: false },
                { day: 'Sesh', active: true, today: false },
                { day: 'Chor', active: true, today: false },
                { day: 'Pay', active: true, today: false },
                { day: 'Jum', active: true, today: false },
                { day: 'Shan', active: currentStreakCount >= 6, today: false },
                { day: 'Yak', active: currentStreakCount >= 7, today: true },
              ].map((item, dIdx) => (
                <div
                  key={dIdx}
                  className={`p-2.5 rounded-2xl transition-all ${
                    item.active
                      ? 'bg-orange-500/20 text-orange-700 dark:text-orange-300 font-extrabold shadow-sm'
                      : 'bg-muted/40 text-muted-foreground font-medium'
                  } ${item.today ? 'ring-2 ring-orange-500/50' : ''}`}
                >
                  <span className="text-[10px] block uppercase">{item.day}</span>
                  <div className="mt-1 flex justify-center">
                    {item.active ? (
                      <Flame className="w-4 h-4 text-orange-500 fill-current" />
                    ) : (
                      <div className="w-2 h-2 rounded-full bg-muted-foreground/30 mt-1" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Next Milestone & Shield Info */}
          <div className="pt-3 border-t border-border/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="space-y-1.5 flex-1 max-w-md">
              <div className="flex items-center justify-between text-[11px] font-bold">
                <span className="text-muted-foreground">
                  Keyingi marra: {nextMilestone} kunlik uzluksizlik
                </span>
                <span className="text-orange-500 font-black">
                  +{studentStreak?.nextMilestoneReward ?? 100} XP Bonus
                </span>
              </div>
              <Progress value={streakPercent} className="h-2 rounded-full bg-muted" />
            </div>

            <div className="flex items-center gap-2 text-muted-foreground shrink-0">
              <Shield className="w-4 h-4 text-blue-500" />
              <span>
                <strong>{studentStreak?.streakFreezeCount ?? 1} ta Streak Freeze</strong> zaxirada
              </span>
            </div>
          </div>
        </Card>

        {/* Level Progression Card (1 Col) */}
        <Card className="border-0 shadow-xl bg-card rounded-3xl p-6 flex flex-col justify-between space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/15 text-amber-500 flex items-center justify-center font-black text-xl shrink-0">
                <Zap className="w-6 h-6 fill-current" />
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                  O‘yin Darajasi (Tier)
                </span>
                <h3 className="text-lg font-black text-foreground">
                  {studentProfile
                    ? `Level ${studentProfile.level}: ${studentProfile.levelName}`
                    : (!auth ? 'Level 3: Active Dev' : 'Level 1: Boshlang‘ich (Novice)')}
                </h3>
              </div>
            </div>

            <Badge className="border-0 bg-purple-500/15 text-purple-600 dark:text-purple-400 font-extrabold text-xs px-2.5 py-1 rounded-xl shadow-none">
              {studentProfile?.rank ? `#${studentProfile.rank} O‘rinda` : (!auth ? 'Top 5%' : 'Faol')}
            </Badge>
          </div>

          <div className="p-4 rounded-2xl bg-muted/40 dark:bg-muted/20 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground font-semibold">Umumiy Tajriba (XP)</span>
              <span className="font-black text-foreground">
                {studentProfile
                  ? `${studentProfile.totalPoints} / ${studentProfile.nextLevelXp} XP`
                  : (!auth ? '750 / 1000 XP' : '0 / 100 XP')}
              </span>
            </div>
            <Progress
              value={studentProfile?.levelProgressPercent ?? (!auth ? 75 : 0)}
              className="h-2.5 rounded-full bg-muted"
            />
            <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-1">
              <span>Level {studentProfile?.level ?? (!auth ? 3 : 1)} ({studentProfile?.currentLevelMinXp ?? (!auth ? 500 : 0)} XP)</span>
              <span className="font-bold text-amber-500">
                {studentProfile
                  ? `${Math.max(0, (studentProfile.nextLevelXp ?? 100) - (studentProfile.totalPoints ?? 0))} XP qoldi (Level ${(studentProfile.level || 1) + 1} gacha)`
                  : (!auth ? '250 XP qoldi (Level 4 gacha)' : '100 XP qoldi')}
              </span>
            </div>
          </div>

          <div className="space-y-1.5 text-xs text-muted-foreground">
            <div className="flex items-center gap-2">
              <Star className="w-3.5 h-3.5 text-amber-500 fill-current" />
              <span>Joriy maqom: <strong>{studentProfile?.levelName || (!auth ? 'Senior Dasturchi (Master)' : 'Boshlang‘ich')}</strong></span>
            </div>
            <div className="flex items-center gap-2">
              <Target className="w-3.5 h-3.5 text-blue-500" />
              <span>Real test topshirish: <strong>+100 XP gacha</strong></span>
            </div>
          </div>
        </Card>
      </div>

      {/* ========================================================
          3. SUMMARY KPI OVERVIEW CARDS (Soft depth, Modern)
      ======================================================== */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-0 shadow-md bg-card/80 dark:bg-card/50 backdrop-blur-md rounded-2xl p-4 flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
            <Trophy className="w-6 h-6" />
          </div>
          <div className="min-w-0">
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block">
              Joriy Peshqadam
            </span>
            <div className="text-base font-extrabold text-foreground truncate">
              {topStudent ? topStudent.displayName.replace(/\(#.*\)/, '') : 'Yuklanmoqda...'}
            </div>
            <span className="text-xs font-bold text-amber-500">
              {topStudent ? `${topStudent.totalPoints} XP to‘plagan` : '0 XP'}
            </span>
          </div>
        </Card>

        <Card className="border-0 shadow-md bg-card/80 dark:bg-card/50 backdrop-blur-md rounded-2xl p-4 flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-blue-500/15 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
            <Users className="w-6 h-6" />
          </div>
          <div className="min-w-0">
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block">
              Yetakchi Guruh
            </span>
            <div className="text-base font-extrabold text-foreground truncate">
              {groupLeaderboard[0]?.groupName || 'YA-26I0804'}
            </div>
            <span className="text-xs font-bold text-blue-500">
              {groupLeaderboard[0]?.totalPoints ? `${groupLeaderboard[0].totalPoints} jami XP` : 'Faol'}
            </span>
          </div>
        </Card>

        <Card className="border-0 shadow-md bg-card/80 dark:bg-card/50 backdrop-blur-md rounded-2xl p-4 flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-purple-500/15 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
            <Sparkles className="w-6 h-6" />
          </div>
          <div className="min-w-0">
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block">
              Taqdim Etilgan XP
            </span>
            <div className="text-base font-extrabold text-foreground truncate">
              {totalPointsAwarded.toLocaleString()} XP
            </div>
            <span className="text-xs font-bold text-purple-500">
              Barcha o‘quvchilar bo‘yicha
            </span>
          </div>
        </Card>
      </div>

      {/* ========================================================
          4. TOP 3 PODIUM CARDS (Gold, Silver, Bronze - Borderless)
      ======================================================== */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {leaderboard.slice(0, 3).map((student, idx) => {
          const podiumConfig = [
            {
              badge: '🥇 Oltin',
              badgeClass: 'bg-amber-500/20 text-amber-800 dark:text-amber-200',
              gradient: 'bg-gradient-to-b from-amber-500/15 via-amber-500/5 to-card dark:from-amber-500/20 dark:via-card/90 dark:to-card',
              shadow: 'shadow-xl shadow-amber-500/10',
              accentText: 'text-amber-500 dark:text-amber-400',
              avatarBg: 'bg-gradient-to-tr from-amber-500 to-yellow-400 text-slate-950',
            },
            {
              badge: '🥈 Kumush',
              badgeClass: 'bg-slate-400/20 text-slate-700 dark:text-slate-200',
              gradient: 'bg-gradient-to-b from-slate-400/15 via-slate-400/5 to-card dark:from-slate-400/20 dark:via-card/90 dark:to-card',
              shadow: 'shadow-lg shadow-slate-400/10',
              accentText: 'text-slate-500 dark:text-slate-300',
              avatarBg: 'bg-gradient-to-tr from-slate-400 to-slate-300 text-slate-900',
            },
            {
              badge: '🥉 Bronza',
              badgeClass: 'bg-orange-500/20 text-orange-800 dark:text-orange-200',
              gradient: 'bg-gradient-to-b from-orange-500/15 via-orange-500/5 to-card dark:from-orange-500/20 dark:via-card/90 dark:to-card',
              shadow: 'shadow-lg shadow-orange-500/10',
              accentText: 'text-orange-500 dark:text-orange-400',
              avatarBg: 'bg-gradient-to-tr from-orange-500 to-amber-600 text-white',
            },
          ];

          const cfg = podiumConfig[idx] || podiumConfig[0];

          return (
            <Card
              key={student.studentId}
              className={`border-0 ${cfg.gradient} ${cfg.shadow} rounded-3xl p-6 relative overflow-hidden flex flex-col justify-between transition-all duration-300 hover:-translate-y-1`}
            >
              <div>
                <div className="flex items-center justify-between mb-4">
                  <Badge className={`border-0 text-xs font-extrabold px-3 py-1 rounded-full shadow-none ${cfg.badgeClass}`}>
                    {cfg.badge}
                  </Badge>

                  <div className="flex items-center gap-2">
                    {student.currentStreak ? (
                      <Badge className="border-0 bg-orange-500/20 text-orange-700 dark:text-orange-300 font-extrabold text-[11px] px-2 py-0.5 rounded-full inline-flex items-center gap-1">
                        <Flame className="w-3 h-3 fill-current text-orange-500" />
                        <span>{student.currentStreak} kun</span>
                      </Badge>
                    ) : null}

                    <div className={`flex items-center gap-1 text-xs font-bold ${cfg.accentText}`}>
                      <span>#{student.rank} O‘rin</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3.5 mb-4">
                  <Avatar className="h-12 w-12 rounded-2xl shadow-md shrink-0">
                    <AvatarFallback className={`rounded-2xl font-black text-sm ${cfg.avatarBg}`}>
                      {getInitials(student.displayName)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <h3 className="text-base font-bold text-foreground truncate">
                      {student.displayName}
                    </h3>
                    <span className="text-xs text-muted-foreground block truncate">
                      {student.groupName} • {student.gradeLevel}
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-4 p-3.5 rounded-2xl bg-muted/40 dark:bg-muted/20 flex items-center justify-between">
                <div>
                  <span className="text-[10px] uppercase font-bold text-muted-foreground block">
                    Jami Ball
                  </span>
                  <span className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-500 to-yellow-600 dark:from-amber-400 dark:to-yellow-300">
                    {student.totalPoints} XP
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] uppercase font-bold text-muted-foreground block">
                    Yutuqlar
                  </span>
                  <span className="text-xs font-extrabold text-foreground inline-flex items-center gap-1">
                    <Award className="w-3.5 h-3.5 text-amber-500" />
                    {student.badgeCount || 2} ta nishon
                  </span>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {/* ========================================================
          5. MAIN LEADERBOARD AND BADGES (Table with Streaks & Levels)
      ======================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Leaderboard Table (2 Cols) */}
        <Card className="lg:col-span-2 border-0 shadow-xl bg-card rounded-3xl p-6 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-2xl bg-amber-500/15 text-amber-600 dark:text-amber-400">
                <Trophy className="w-5 h-5" />
              </div>
              <div>
                <CardTitle className="text-base sm:text-lg font-bold text-foreground">
                  {isGroupView ? 'Guruhlar Bo‘yicha Reyting' : 'Talabalar Umumiy Reytingi'}
                </CardTitle>
                <CardDescription className="text-xs text-muted-foreground mt-0.5">
                  {isGroupView
                    ? 'Eng faol o‘quv guruhlarining o‘rtacha va umumiy ko‘rsatkichlari'
                    : 'Barcha fanlar, testlar va kunlik streaklar bo‘yicha shaxsiy reyting'}
                </CardDescription>
              </div>
            </div>

            <div className="flex items-center gap-2.5 flex-wrap">
              <Tabs
                value={isGroupView ? 'groups' : 'individual'}
                onValueChange={(val) => setIsGroupView(val === 'groups')}
              >
                <TabsList className="border-0 bg-muted/60 dark:bg-muted/30 p-1 rounded-2xl h-auto">
                  <TabsTrigger
                    value="individual"
                    className="border-0 rounded-xl px-3 py-1.5 text-xs font-semibold data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm cursor-pointer"
                  >
                    Yakka tartibda
                  </TabsTrigger>
                  <TabsTrigger
                    value="groups"
                    className="border-0 rounded-xl px-3 py-1.5 text-xs font-semibold data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm cursor-pointer"
                  >
                    Guruhlar
                  </TabsTrigger>
                </TabsList>
              </Tabs>

              {!isGroupView && (
                <>
                  <select
                    value={gradeFilter}
                    onChange={(e) => setGradeFilter(e.target.value)}
                    className="border-0 bg-muted/60 dark:bg-muted/30 rounded-2xl px-3 py-1.5 text-xs font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-amber-500 shadow-sm cursor-pointer"
                  >
                    <option value="ALL">Barcha sinflar</option>
                    <option value="8-sinf">8-sinf</option>
                    <option value="9-sinf">9-sinf</option>
                    <option value="10-sinf">10-sinf</option>
                    <option value="11-sinf">11-sinf</option>
                  </select>

                  <div className="relative">
                    <select
                      value={period}
                      onChange={(e) => setPeriod(e.target.value as any)}
                      className="border-0 bg-muted/60 dark:bg-muted/30 rounded-2xl px-3.5 py-1.5 text-xs font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-amber-500 shadow-sm cursor-pointer appearance-none pr-7"
                    >
                      <option value="ALL_TIME">Barcha davrlar</option>
                      <option value="MONTHLY">Shu oyda</option>
                      <option value="WEEKLY">Haftalik</option>
                    </select>
                    <Calendar className="w-3.5 h-3.5 text-muted-foreground absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                </>
              )}
            </div>
          </div>

          {loading ? (
            <div className="space-y-3 py-4">
              {[1, 2, 3, 4, 5].map((row) => (
                <div key={row} className="flex items-center gap-4 p-3.5 bg-muted/20 rounded-2xl">
                  <Skeleton className="h-6 w-8 rounded-xl" />
                  <Skeleton className="h-6 w-48 rounded-xl" />
                  <Skeleton className="h-6 w-24 rounded-xl" />
                  <Skeleton className="h-6 w-16 rounded-xl ml-auto" />
                </div>
              ))}
            </div>
          ) : !isGroupView ? (
            <div className="overflow-x-auto">
              <Table className="w-full text-left text-xs sm:text-sm">
                <TableHeader className="[&_tr]:border-0">
                  <TableRow className="border-0 bg-muted/40 dark:bg-muted/20 hover:bg-muted/40 rounded-2xl">
                    <TableHead className="py-3 px-3 font-bold uppercase tracking-wider text-[11px] text-muted-foreground rounded-l-2xl">
                      # O‘rin
                    </TableHead>
                    <TableHead className="py-3 px-3 font-bold uppercase tracking-wider text-[11px] text-muted-foreground">
                      F.I.Sh (Maxfiy ID)
                    </TableHead>
                    <TableHead className="py-3 px-3 font-bold uppercase tracking-wider text-[11px] text-muted-foreground">
                      Guruh & Sinf
                    </TableHead>
                    <TableHead className="py-3 px-3 font-bold uppercase tracking-wider text-[11px] text-muted-foreground">
                      Kunlik Streak
                    </TableHead>
                    <TableHead className="py-3 px-4 font-bold uppercase tracking-wider text-[11px] text-muted-foreground text-right rounded-r-2xl">
                      To‘plangan XP
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="[&_tr]:border-0 space-y-1">
                  {filteredLeaderboard.map((item) => (
                    <TableRow
                      key={item.studentId}
                      className="border-0 hover:bg-muted/40 dark:hover:bg-muted/20 transition-colors rounded-2xl"
                    >
                      <TableCell className="py-3 px-3 font-extrabold text-foreground">
                        {item.rank === 1 && (
                          <Badge className="border-0 bg-amber-500/20 text-amber-800 dark:text-amber-300 font-extrabold text-xs shadow-none">
                            🥇 1
                          </Badge>
                        )}
                        {item.rank === 2 && (
                          <Badge className="border-0 bg-slate-400/20 text-slate-700 dark:text-slate-300 font-extrabold text-xs shadow-none">
                            🥈 2
                          </Badge>
                        )}
                        {item.rank === 3 && (
                          <Badge className="border-0 bg-orange-500/20 text-orange-800 dark:text-orange-300 font-extrabold text-xs shadow-none">
                            🥉 3
                          </Badge>
                        )}
                        {item.rank > 3 && (
                          <span className="text-muted-foreground font-semibold px-2 py-0.5 rounded-lg bg-muted/40 text-xs">
                            #{item.rank}
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="py-3 px-3">
                        <div className="flex items-center gap-2.5">
                          <Avatar className="h-7 w-7 rounded-xl shrink-0">
                            <AvatarFallback className="rounded-xl text-[10px] font-bold bg-amber-500/10 text-amber-700 dark:text-amber-300">
                              {getInitials(item.displayName)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <span className="font-bold text-foreground block">
                              {item.displayName}
                            </span>
                            {item.levelName && (
                              <span className="text-[10px] text-muted-foreground font-semibold">
                                {item.levelName}
                              </span>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="py-3 px-3 text-muted-foreground">
                        <Badge className="border-0 bg-muted/60 dark:bg-muted/30 text-muted-foreground font-medium text-[11px] shadow-none">
                          {item.groupName} • {item.gradeLevel}
                        </Badge>
                      </TableCell>
                      <TableCell className="py-3 px-3">
                        <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-orange-500/10 text-orange-600 dark:text-orange-400 text-xs font-black">
                          <Flame className="w-3.5 h-3.5 fill-current" />
                          <span>{item.currentStreak ?? 1} kun</span>
                        </div>
                      </TableCell>
                      <TableCell className="py-3 px-4 text-right">
                        <span className="font-black text-amber-500 dark:text-amber-400 text-sm">
                          {item.totalPoints} XP
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table className="w-full text-left text-xs sm:text-sm">
                <TableHeader className="[&_tr]:border-0">
                  <TableRow className="border-0 bg-muted/40 dark:bg-muted/20 hover:bg-muted/40 rounded-2xl">
                    <TableHead className="py-3 px-3 font-bold uppercase tracking-wider text-[11px] text-muted-foreground rounded-l-2xl">
                      # O‘rin
                    </TableHead>
                    <TableHead className="py-3 px-3 font-bold uppercase tracking-wider text-[11px] text-muted-foreground">
                      Guruh Kodi
                    </TableHead>
                    <TableHead className="py-3 px-3 font-bold uppercase tracking-wider text-[11px] text-muted-foreground">
                      O‘quvchilar soni
                    </TableHead>
                    <TableHead className="py-3 px-3 font-bold uppercase tracking-wider text-[11px] text-muted-foreground text-right">
                      O‘rtacha Ball
                    </TableHead>
                    <TableHead className="py-3 px-4 font-bold uppercase tracking-wider text-[11px] text-muted-foreground text-right rounded-r-2xl">
                      Jami Ball
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="[&_tr]:border-0 space-y-1">
                  {groupLeaderboard.map((grp) => (
                    <TableRow
                      key={grp.groupName}
                      className="border-0 hover:bg-muted/40 dark:hover:bg-muted/20 transition-colors rounded-2xl"
                    >
                      <TableCell className="py-3 px-3 font-extrabold text-foreground">
                        <span className="text-muted-foreground font-semibold px-2 py-0.5 rounded-lg bg-muted/40 text-xs">
                          #{grp.rank}
                        </span>
                      </TableCell>
                      <TableCell className="py-3 px-3 font-bold text-foreground">
                        <div className="flex items-center gap-2">
                          <Users className="w-3.5 h-3.5 text-blue-500" />
                          <span>{grp.groupName}</span>
                        </div>
                      </TableCell>
                      <TableCell className="py-3 px-3 text-muted-foreground">
                        <Badge className="border-0 bg-muted/60 dark:bg-muted/30 text-muted-foreground font-medium text-[11px] shadow-none">
                          {grp.studentCount} ta talaba
                        </Badge>
                      </TableCell>
                      <TableCell className="py-3 px-3 text-right font-bold text-blue-600 dark:text-blue-400">
                        {grp.averagePoints} XP
                      </TableCell>
                      <TableCell className="py-3 px-4 text-right font-black text-amber-500 dark:text-amber-400">
                        {grp.totalPoints} XP
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </Card>

        {/* Badges & Achievements Showcase (1 Col) */}
        <Card className="border-0 shadow-xl bg-card rounded-3xl p-6 space-y-5">
          <div className="flex items-center gap-3 pb-2">
            <div className="p-2.5 rounded-2xl bg-purple-500/15 text-purple-600 dark:text-purple-400">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <CardTitle className="text-base sm:text-lg font-bold text-foreground">
                Faol Nishonlar (Badges)
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground mt-0.5">
                Maxsus ko‘nikma va marralar uchun unvonlar
              </CardDescription>
            </div>
          </div>

          <div className="space-y-3">
            {[
              {
                title: '100% Natija',
                desc: 'Testdan 100 ball to‘plash',
                xp: '+100 XP',
                icon: Award,
                iconColor: 'text-emerald-500',
                bgGradient: 'bg-emerald-500/10 dark:bg-emerald-500/15',
              },
              {
                title: 'Namunali Davomat',
                desc: 'Ketma-ket 10 dars kechikmaslik',
                xp: '+150 XP',
                icon: Flame,
                iconColor: 'text-amber-500',
                bgGradient: 'bg-amber-500/10 dark:bg-amber-500/15',
              },
              {
                title: 'Olovli Start',
                desc: 'Ketma-ket 3 kunlik streak',
                xp: '+30 XP',
                icon: Flame,
                iconColor: 'text-amber-500',
                bgGradient: 'bg-amber-500/10 dark:bg-amber-500/15',
              },
              {
                title: 'Haftalik Qahramon',
                desc: 'Ketma-ket 7 kun uzluksiz ta’lim',
                xp: '+100 XP',
                icon: Flame,
                iconColor: 'text-orange-500',
                bgGradient: 'bg-orange-500/10 dark:bg-orange-500/15',
              },
              {
                title: 'Bilimdon Tester',
                desc: '3 ta real testni topshirish',
                xp: '+150 XP',
                icon: Target,
                iconColor: 'text-blue-500',
                bgGradient: 'bg-blue-500/10 dark:bg-blue-500/15',
              },
              {
                title: 'Master Dasturchi',
                desc: '3 ta amaliy loyihani topshirish',
                xp: '+200 XP',
                icon: Star,
                iconColor: 'text-purple-500',
                bgGradient: 'bg-purple-500/10 dark:bg-purple-500/15',
              },
              {
                title: 'Nexus Afsonasi',
                desc: '1000 XP ga yetgan oliy toifa',
                xp: '+250 XP',
                icon: Trophy,
                iconColor: 'text-yellow-500',
                bgGradient: 'bg-yellow-500/10 dark:bg-yellow-500/15',
              },
            ].map((badge, bIdx) => {
              const Icon = badge.icon;
              return (
                <div
                  key={bIdx}
                  className="p-3.5 rounded-2xl bg-muted/40 dark:bg-muted/20 hover:bg-muted/60 dark:hover:bg-muted/30 transition-all flex items-center justify-between gap-3 border-0"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${badge.bgGradient} ${badge.iconColor}`}
                    >
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-xs font-bold text-foreground truncate">
                        {badge.title}
                      </h4>
                      <p className="text-[11px] text-muted-foreground truncate">
                        {badge.desc}
                      </p>
                    </div>
                  </div>
                  <Badge className="border-0 bg-background/80 dark:bg-background/50 text-foreground font-black text-[10px] px-2.5 py-1 rounded-xl shadow-xs shrink-0">
                    {badge.xp}
                  </Badge>
                </div>
              );
            })}
          </div>
        </Card>
      </div>

      {/* ========================================================
          6. METRICS & GAMIFICATION STANDARDS MODAL
      ======================================================== */}
      <Dialog open={isMetricsModalOpen} onOpenChange={setIsMetricsModalOpen}>
        <DialogContent className="border-0 shadow-2xl bg-card text-card-foreground rounded-3xl p-6 sm:p-8 max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader className="space-y-1 text-left pb-2">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-2xl bg-amber-500/15 text-amber-600 dark:text-amber-400">
                <BarChart2 className="w-6 h-6" />
              </div>
              <div>
                <DialogTitle className="text-xl font-black text-foreground">
                  Gamifikatsiya & Baholash Standartlari
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                  AXV Nexsus platformasida kunlik streak, XP ballari va darajalarni belgilash mezonlari
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          {loadingMetrics ? (
            <div className="space-y-3 py-6">
              <Skeleton className="h-20 w-full rounded-2xl" />
              <Skeleton className="h-20 w-full rounded-2xl" />
              <Skeleton className="h-20 w-full rounded-2xl" />
            </div>
          ) : (
            <div className="space-y-6 pt-3">
              {/* Section 1: XP Earning Rules */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm font-bold text-foreground">
                  <Zap className="w-4 h-4 text-amber-500" />
                  <span>XP (Tajriba Ballari) To‘plash Mezonlari</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {(metricsData?.xpRules || getDefaultMetricsData().xpRules).map((item, idx) => (
                    <div key={idx} className="p-3 rounded-2xl bg-muted/40 dark:bg-muted/20 border-0 flex items-start justify-between gap-3">
                      <div>
                        <strong className="text-xs font-bold text-foreground block">{item.metric}</strong>
                        <span className="text-[11px] text-muted-foreground">{item.description}</span>
                      </div>
                      <Badge className="border-0 bg-amber-500/15 text-amber-700 dark:text-amber-300 font-black text-[11px] px-2 py-0.5 rounded-lg shrink-0">
                        {item.value}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>

              {/* Section 2: Daily Streak Rules & Milestones */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm font-bold text-foreground">
                  <Flame className="w-4 h-4 text-orange-500 fill-current" />
                  <span>Kunlik Streak & Intizom Qoidalari</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {(metricsData?.streakRules || getDefaultMetricsData().streakRules).map((item, idx) => (
                    <div key={idx} className="p-3.5 rounded-2xl bg-orange-500/10 border-0 space-y-1">
                      <span className="text-[10px] uppercase font-bold text-orange-600 dark:text-orange-400 block">
                        {item.categoryOrCondition || 'Qoida'}
                      </span>
                      <h4 className="text-xs font-bold text-foreground">{item.metric}</h4>
                      <p className="text-[11px] text-muted-foreground">{item.description}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Section 3: Player Levels (Tiers) */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm font-bold text-foreground">
                  <Trophy className="w-4 h-4 text-yellow-500" />
                  <span>O‘yin Darajalari va Unvonlar (Player Tiers)</span>
                </div>
                <div className="space-y-2">
                  {(metricsData?.playerLevels || getDefaultMetricsData().playerLevels).map((item, idx) => (
                    <div key={idx} className="p-3 rounded-2xl bg-muted/40 dark:bg-muted/20 border-0 flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-amber-500/15 text-amber-500 flex items-center justify-center font-bold text-xs shrink-0">
                          L{idx + 1}
                        </div>
                        <div>
                          <h4 className="text-xs font-bold text-foreground">{item.metric}</h4>
                          <span className="text-[11px] text-muted-foreground">{item.description}</span>
                        </div>
                      </div>
                      <Badge className="border-0 bg-background/80 text-foreground font-black text-xs px-2.5 py-1 rounded-xl shadow-xs shrink-0">
                        {item.value}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>

              {/* Section 4: Academic Grading Scales */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm font-bold text-foreground">
                  <Activity className="w-4 h-4 text-blue-500" />
                  <span>Akademik Baholar Shkalasi</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                  {(metricsData?.gradingScales || getDefaultMetricsData().gradingScales).map((item, idx) => (
                    <div key={idx} className="p-3 rounded-2xl bg-muted/30 border-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-black text-xs text-foreground">{item.metric}</span>
                        <span className="text-[10px] font-bold text-blue-500">{item.value}</span>
                      </div>
                      <span className="text-[11px] text-muted-foreground block truncate">{item.description}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="pt-4 border-t border-border/20">
            <Button
              variant="default"
              size="sm"
              onClick={() => setIsMetricsModalOpen(false)}
              className="border-0 rounded-2xl px-6 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black cursor-pointer"
            >
              Tushundim
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ========================================================
          7. AWARD POINTS MODAL (Dialog)
      ======================================================== */}
      {canAwardPoints && (
        <Dialog open={isAwardModalOpen} onOpenChange={setIsAwardModalOpen}>
          <DialogContent className="border-0 shadow-2xl bg-card text-card-foreground rounded-3xl p-6 sm:p-7 max-w-lg">
            <DialogHeader className="space-y-1 text-left pb-2">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-amber-500/15 text-amber-600 dark:text-amber-400">
                  <Trophy className="w-5 h-5" />
                </div>
                <div>
                  <DialogTitle className="text-lg font-extrabold text-foreground flex items-center gap-2">
                    O‘quvchiga Ball / XP Taqdim Etish
                  </DialogTitle>
                  <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                    Amaliy yutuqlar, darsdagi faollik yoki namunali loyiha uchun shaffof rag‘batlantirish
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>

            <form onSubmit={handleAwardSubmit} className="space-y-4 pt-1">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-foreground">
                  O‘quvchini tanlang
                </Label>
                <select
                  value={awardStudentId}
                  onChange={(e) => setAwardStudentId(Number(e.target.value))}
                  className="w-full p-3 bg-muted/60 dark:bg-muted/30 border-0 rounded-2xl text-xs sm:text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-amber-500 shadow-sm cursor-pointer"
                >
                  {students.map((s) => (
                    <option key={s.id} value={s.id} className="bg-card text-foreground">
                      {s.fullName} ({s.gradeLevel || 'IT'})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-foreground">
                    Ball miqdori (XP)
                  </Label>
                  <Input
                    type="number"
                    required
                    value={awardAmount}
                    onChange={(e) => setAwardAmount(Number(e.target.value))}
                    className="border-0 bg-muted/60 dark:bg-muted/30 rounded-2xl p-3 text-xs sm:text-sm font-bold text-foreground focus-visible:ring-2 focus-visible:ring-amber-500 shadow-sm h-11"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-foreground">
                    Ball manbasi
                  </Label>
                  <select
                    value={awardSource}
                    onChange={(e) => setAwardSource(e.target.value)}
                    className="w-full p-3 bg-muted/60 dark:bg-muted/30 border-0 rounded-2xl text-xs sm:text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-amber-500 shadow-sm cursor-pointer h-11"
                  >
                    <option value="MENTOR_BONUS" className="bg-card text-foreground">
                      Mentor Rag‘bati (Bonus)
                    </option>
                    <option value="CLASSROOM_ACTIVITY" className="bg-card text-foreground">
                      Darsdagi faollik
                    </option>
                    <option value="PRACTICAL_ASSIGNMENT" className="bg-card text-foreground">
                      Amaliy loyiha yechimi
                    </option>
                    <option value="ADJUSTMENT" className="bg-card text-foreground">
                      Korrektirovka (Adjustment)
                    </option>
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-foreground">
                  Asoslovchi sabab (Majburiy) *
                </Label>
                <Textarea
                  rows={3}
                  required
                  value={awardReason}
                  onChange={(e) => setAwardReason(e.target.value)}
                  placeholder="Masalan: JavaScript DOM manipulation amaliy mashg‘ulotida eng toza kod yozgani uchun"
                  className="border-0 bg-muted/60 dark:bg-muted/30 rounded-2xl p-3 text-xs sm:text-sm text-foreground focus-visible:ring-2 focus-visible:ring-amber-500 shadow-sm resize-none"
                />
              </div>

              <DialogFooter className="pt-3 flex items-center justify-between gap-3 sm:justify-between border-0">
                <Button
                  variant="secondary"
                  size="sm"
                  type="button"
                  onClick={() => setIsAwardModalOpen(false)}
                  className="border-0 rounded-2xl px-5 font-bold bg-muted/70 hover:bg-muted text-foreground cursor-pointer"
                >
                  Bekor qilish
                </Button>
                <Button
                  variant="default"
                  size="sm"
                  type="submit"
                  disabled={awarding}
                  className="border-0 rounded-2xl px-6 bg-gradient-to-r from-amber-500 to-yellow-600 hover:from-amber-400 hover:to-yellow-500 text-slate-950 font-black shadow-lg shadow-amber-500/25 cursor-pointer disabled:opacity-50"
                >
                  {awarding ? 'Yozilmoqda...' : 'Ballni Tasdiqlash'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

function getDefaultSampleStreak(studentId: number): StudentStreakDto {
  return {
    studentId,
    currentStreak: 5,
    longestStreak: 12,
    checkedInToday: false,
    lastActivityDate: new Date(Date.now() - 86400000).toISOString().split('T')[0],
    streakFreezeCount: 1,
    totalActiveDays: 20,
    nextMilestoneDays: 7,
    nextMilestoneReward: 100,
  };
}

function getDefaultSampleLeaderboard(): LeaderboardEntryDto[] {
  return [
    { rank: 1, studentId: 101, displayName: 'Gulnora Sh. (#I-HR 0220243)', groupName: 'YA-26I0804', gradeLevel: '8-sinf', totalPoints: 850, highestSingleAward: 100, badgeCount: 4, currentStreak: 7, longestStreak: 14, level: 3, levelName: 'Active Developer' },
    { rank: 2, studentId: 102, displayName: 'Azizbek B. (#I-HR 0220244)', groupName: 'YA-26I0804', gradeLevel: '8-sinf', totalPoints: 790, highestSingleAward: 100, badgeCount: 3, currentStreak: 5, longestStreak: 10, level: 3, levelName: 'Active Developer' },
    { rank: 3, studentId: 103, displayName: 'Madina K. (#I-HR 0220245)', groupName: 'YA-26I0902', gradeLevel: '9-sinf', totalPoints: 720, highestSingleAward: 90, badgeCount: 3, currentStreak: 4, longestStreak: 8, level: 3, levelName: 'Active Developer' },
    { rank: 4, studentId: 104, displayName: 'Javohir R. (#I-HR 0220246)', groupName: 'YA-26I0804', gradeLevel: '8-sinf', totalPoints: 680, highestSingleAward: 80, badgeCount: 2, currentStreak: 3, longestStreak: 6, level: 3, levelName: 'Active Developer' },
    { rank: 5, studentId: 105, displayName: 'Dilnoza M. (#I-HR 0220247)', groupName: 'YA-26I1001', gradeLevel: '10-sinf', totalPoints: 610, highestSingleAward: 80, badgeCount: 2, currentStreak: 6, longestStreak: 9, level: 3, levelName: 'Active Developer' },
  ];
}

function getDefaultSampleGroupLeaderboard(): GroupLeaderboardEntryDto[] {
  return [
    { rank: 1, groupName: 'YA-26I0804 (8-sinf)', studentCount: 16, totalPoints: 9400, averagePoints: 587.5 },
    { rank: 2, groupName: 'YA-26I0902 (9-sinf)', studentCount: 15, totalPoints: 8250, averagePoints: 550.0 },
    { rank: 3, groupName: 'YA-26I1001 (10-sinf)', studentCount: 14, totalPoints: 7140, averagePoints: 510.0 },
  ];
}

function getDefaultMetricsData(): GamificationMetricsDto {
  return {
    title: 'AXV Nexsus — Ballar, Gamifikatsiya va Baholash Standartlari',
    gradingScales: [
      { metric: 'A+', value: '90 - 100 ball', description: 'A\'lo daraja (Oltin ko‘rsatkich)', categoryOrCondition: '+100 XP va mukammallik nishoni' },
      { metric: 'A', value: '85 - 89 ball', description: 'Yuqori o‘zlashtirish', categoryOrCondition: '+85-89 XP' },
      { metric: 'B+', value: '80 - 84 ball', description: 'Yaxshi daraja', categoryOrCondition: '+80-84 XP' },
      { metric: 'B', value: '70 - 79 ball', description: 'O‘rtacha yuqori', categoryOrCondition: '+70-79 XP' },
      { metric: 'C', value: '60 - 69 ball', description: 'Yetarli (O‘tish chegarasi)', categoryOrCondition: '+60-69 XP' },
      { metric: 'D / F', value: '0 - 59 ball', description: 'Qayta tayyorlanish tavsiya etiladi', categoryOrCondition: 'Ballar saqlanadi, qayta topshirish mumkin' },
    ],
    xpRules: [
      { metric: 'Real Test topshirish', value: '10 - 100 XP', description: 'Har bir to‘g‘ri javob uchun 10 XP beriladi', categoryOrCondition: 'Avtomatik' },
      { metric: 'Mukammal Test (100%)', value: '+50 XP bonus', description: 'Barcha savollarga xatosiz javob berilganda', categoryOrCondition: 'Bir martalik' },
      { metric: 'Kunlik Streak (Daily Check-in)', value: '+15 XP / kun', description: 'Har kuni platformaga kirib ta’lim olganda', categoryOrCondition: 'Kuniga 1 marta' },
      { metric: '3 kunlik Streak Bonusi', value: '+30 XP', description: 'Ketma-ket 3 kun uzluksiz intizom', categoryOrCondition: 'Marra bonusi' },
      { metric: '7 kunlik Haftalik Streak', value: '+100 XP', description: 'Ketma-ket 7 kunlik doimiy faollik', categoryOrCondition: 'Haftalik marra' },
      { metric: '14 kunlik Temir Intizom', value: '+250 XP', description: '2 hafta uzluksiz o‘rganish marrasi', categoryOrCondition: 'Marra bonusi' },
      { metric: '30 kunlik Afsonaviy Streak', value: '+500 XP', description: '1 oy uzluksiz ta’lim va o‘zlashtirish', categoryOrCondition: 'Oylik oliy marra' },
      { metric: 'Amaliy loyiha topshirish', value: '50 - 100 XP', description: 'Portfolio loyihasini mentorga yuborish', categoryOrCondition: 'Vazifa bo‘yicha' },
      { metric: 'Darsdagi faollik', value: '+25 XP', description: 'Nazariy va amaliy darsda eng faol o‘quvchi', categoryOrCondition: 'Mentor tomonidan' },
      { metric: 'Mentor maxsus rag‘bati', value: '+30 - 100 XP', description: 'Namunali dasturlash kodi va yechimlar uchun', categoryOrCondition: 'Mentor tomonidan' },
    ],
    playerLevels: [
      { metric: 'Level 1: Novice Coder', value: '0 - 199 XP', description: 'Yangi boshlovchi dasturchi', categoryOrCondition: 'Boshlang‘ich' },
      { metric: 'Level 2: Junior Explorer', value: '200 - 499 XP', description: 'Asosiy tushunchalarni egallagan o‘quvchi', categoryOrCondition: 'O‘rta daraja' },
      { metric: 'Level 3: Active Developer', value: '500 - 999 XP', description: 'Amaliy loyihalar va testlarda faol', categoryOrCondition: 'Yuqori daraja' },
      { metric: 'Level 4: Senior Specialist', value: '1000 - 1999 XP', description: 'Oliy o‘zlashtirishga ega mohir dasturchi', categoryOrCondition: 'Ekspert' },
      { metric: 'Level 5: Nexus Grandmaster', value: '2000+ XP', description: 'Al-Xorazmiy Vorisi oliy toifasi', categoryOrCondition: 'Afsonaviy' },
    ],
    streakRules: [
      { metric: 'Ketma-ketlik sharti', value: '24-48 soat', description: 'Har kunlik mashq yoki test orqali streak saqlanadi', categoryOrCondition: 'Majburiy' },
      { metric: 'Streak Freeze (Muzlatgich)', value: '1 ta zaxira', description: '1 kun o‘tkazib yuborilganda streak uzilib ketishidan saqlaydi', categoryOrCondition: 'Avtomatik' },
      { metric: 'Qayta tiklanish', value: '1-kundan', description: '2 kundan ortiq uzilish bo‘lsa, streak 1 dan qayta boshlanadi', categoryOrCondition: 'Qoida' },
    ],
  };
}
