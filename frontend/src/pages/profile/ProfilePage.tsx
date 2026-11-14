import React, { useState, useEffect } from 'react';
import {
  User,
  Mail,
  Shield,
  KeyRound,
  Lock,
  MapPin,
  CheckCircle2,
  AlertCircle,
  Laptop,
  Globe2,
  LogOut,
  RefreshCw,
  Copy,
  Check,
  Award,
  Save,
  ShieldCheck,
  Phone,
  Briefcase,
  GraduationCap,
  Code2,
  Share2,
  Globe,
  Edit3,
  ExternalLink,
  Plus,
  Eye,
  EyeOff,
} from 'lucide-react';
import { useAuth } from '@/features/auth/AuthContext';
import { useToast } from '@/shared/ui/toast/ToastContext';
import { ThemeToggle } from '@/shared/ui/theme-toggle/ThemeToggle';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { authApi, mentorProfileApi } from '@/api';
import { MentorEditProfileModal } from '@/components/mentors/MentorEditProfileModal';
import type { MentorProfileDto } from '@/types';
import { cn } from '@/lib/utils';

export const ProfilePage: React.FC = () => {
  const { user, logout, isAdmin, isMentor, isStudent } = useAuth();
  const toast = useToast();

  const isPureStudent = isStudent && !isAdmin && !isMentor;

  const [activeTab, setActiveTab] = useState<'overview' | 'mentor' | 'student' | 'security' | 'preferences' | 'sessions'>('overview');
  const [mentorProfile, setMentorProfile] = useState<MentorProfileDto | null>(null);
  const [isMentorModalOpen, setIsMentorModalOpen] = useState(false);

  const loadMentorProfile = async () => {
    if (isPureStudent) return;
    try {
      const res = await mentorProfileApi.getMyProfile();
      if (res.data?.data) {
        setMentorProfile(res.data.data);
      }
    } catch (err) {
      console.error('Failed to load mentor profile', err);
    }
  };

  useEffect(() => {
    if (!isPureStudent) {
      loadMentorProfile();
    }
  }, [isPureStudent]);

  // Edit profile form state
  const [fullName, setFullName] = useState(user?.fullName || 'Izzatbek Abdurasharipov');
  const [email, setEmail] = useState(user?.email || 'admin@axm-nexus.uz');
  const [phone, setPhone] = useState('+998 90 123 45 67');
  const [bio, setBio] = useState('Al-Xorazmiy Vorislari ta’lim loyihasi bosh koordinatori va IT mutaxassisi.');
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  // Change password form state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState('');

  // Token state
  const [isRefreshingToken, setIsRefreshingToken] = useState(false);
  const [copiedToken, setCopiedToken] = useState(false);

  // Preference switches
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [attendanceAlerts, setAttendanceAlerts] = useState(true);
  const [systemUpdates, setSystemUpdates] = useState(false);

  const getRoleLabel = (roles?: string[]) => {
    if (!roles || roles.length === 0) return 'Foydalanuvchi';
    if (roles.includes('ROLE_SUPER_ADMIN')) return 'Bosh Administrator';
    if (roles.includes('ROLE_ADMIN')) return 'Tizim Administratori';
    if (roles.includes('ROLE_MENTOR')) return 'IT Mentor & Murabbiy';
    if (roles.includes('ROLE_ENGLISH_MENTOR')) return 'Ingliz tili mentori';
    return 'O‘quvchi (Student)';
  };

  const getInitials = (name?: string) => {
    if (!name) return 'U';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingProfile(true);
    try {
      const res = await authApi.updateProfile({ fullName, phone, email });
      if (res.data?.data) {
        const stored = localStorage.getItem('axm_nexus_user');
        if (stored) {
          const parsed = JSON.parse(stored);
          parsed.fullName = res.data.data.fullName;
          parsed.email = res.data.data.email;
          localStorage.setItem('axm_nexus_user', JSON.stringify(parsed));
        }
      }
      toast.success('Muvaffaqiyatli saqlandi', 'Profilingiz ma’lumotlari yangilandi.');
    } catch (err: unknown) {
      const message = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Profilni saqlashda xatolik yuz berdi';
      toast.error('Xatolik', message);
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError('');

    if (!currentPassword) {
      setPasswordError('Joriy parolni kiriting');
      return;
    }
    if (newPassword.length < 6) {
      setPasswordError('Yangi parol kamida 6 ta belgidan iborat bo‘lishi kerak');
      return;
    }
    if (newPassword !== confirmNewPassword) {
      setPasswordError('Yangi parollar bir-biriga mos kelmadi');
      return;
    }

    setIsChangingPassword(true);
    try {
      await authApi.changePassword({ currentPassword, newPassword });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmNewPassword('');
      toast.success('Parol yangilandi', 'Yangi parolingiz muvaffaqiyatli o‘rnatildi.');
    } catch (err: unknown) {
      const message = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Parolni o‘zgartirishda xatolik yuz berdi';
      setPasswordError(message);
      toast.error('Xatolik', message);
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleRefreshToken = async () => {
    if (!user?.refreshToken) {
      toast.error('Xatolik', 'Refresh token topilmadi');
      return;
    }
    setIsRefreshingToken(true);
    try {
      const res = await authApi.refreshToken({ refreshToken: user.refreshToken });
      if (res.data?.data?.accessToken) {
        toast.success('Token yangilandi', 'Yangi Access Token muvaffaqiyatli generatsiya qilindi.');
      }
    } catch {
      toast.error('Token yangilash xatosi', 'Refresh token muddati tugagan bo‘lishi mumkin.');
    } finally {
      setIsRefreshingToken(false);
    }
  };

  const handleCopyAccessToken = () => {
    if (user?.accessToken) {
      navigator.clipboard.writeText(user.accessToken);
      setCopiedToken(true);
      setTimeout(() => setCopiedToken(false), 2000);
      toast.info('Nusxa olindi', 'Access Token buferga nusxalandi.');
    }
  };

  return (
    <div className="space-y-7 animate-in fade-in duration-300 max-w-7xl mx-auto pb-12">
      {/* ========================================================
          1. EXECUTIVE HERO BANNER & USER IDENTITY (Borderless Luxury)
          ======================================================== */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 text-white shadow-xl border-0 p-6 sm:p-8 lg:p-10">
        {/* Soft Ambient Glows */}
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-indigo-500/15 rounded-full blur-3xl pointer-events-none -mr-32 -mt-32" />
        <div className="absolute bottom-0 left-1/3 w-[350px] h-[350px] bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex flex-col sm:flex-row sm:items-center gap-5">
            {/* Avatar with Status Badge */}
            <div className="relative shrink-0">
              <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-3xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-cyan-400 text-white flex items-center justify-center font-black text-3xl sm:text-4xl shadow-xl shadow-indigo-600/30 border-0">
                {getInitials(user?.fullName)}
              </div>
              <span className="absolute -bottom-1 -right-1 w-5 h-5 bg-emerald-500 rounded-full ring-4 ring-slate-950" />
            </div>

            {/* Identity Info */}
            <div className="space-y-1.5">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/20 backdrop-blur-md text-cyan-300 text-xs font-bold border-0">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>{getRoleLabel(user?.roles)}</span>
                </span>
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-500/20 backdrop-blur-md text-emerald-300 text-xs font-semibold border-0">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span>Faol hisob</span>
                </span>
              </div>

              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-white">
                {user?.fullName || 'Foydalanuvchi'}
              </h1>

              <div className="flex flex-wrap items-center gap-4 text-xs text-slate-300 pt-1">
                <span className="flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-cyan-400" />
                  <span>{user?.email || 'email@axm-nexus.uz'}</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-indigo-400" />
                  <span>@{user?.username || 'user'}</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-emerald-400" />
                  <span>IT Park Yangiariq filiali</span>
                </span>
              </div>
            </div>
          </div>

          {/* Quick Action in Header */}
          <div className="flex items-center gap-3 shrink-0 self-start md:self-auto">
            <Button
              variant="destructive"
              size="sm"
              onClick={logout}
              className="bg-red-500/15 hover:bg-red-500/25 text-red-300 border-0 font-semibold text-xs rounded-xl shadow-none cursor-pointer"
            >
              <LogOut className="w-4 h-4 mr-1.5" />
              <span>Tizimdan chiqish</span>
            </Button>
          </div>
        </div>
      </div>

      {/* ========================================================
          2. PROFILE NAVIGATION TABS (shadcn UI Tabs, Borderless)
          ======================================================== */}
      <Tabs
        value={activeTab}
        onValueChange={(val) => setActiveTab(val as typeof activeTab)}
        className="w-full space-y-6"
      >
        <div className="bg-card text-card-foreground p-1.5 rounded-2xl shadow-[0_2px_14px_-2px_rgba(0,0,0,0.04)] dark:shadow-none border-0 overflow-x-auto scrollbar-none">
          <TabsList className="bg-transparent h-auto p-0 flex items-center gap-1.5 border-0 w-max">
            {[
              { id: 'overview', label: 'Shaxsiy ma’lumotlar', icon: User },
              ...(isPureStudent
                ? [{ id: 'student', label: 'O‘quvchi Profili & Yutuqlar', icon: GraduationCap }]
                : []),
              ...((isAdmin || isMentor)
                ? [{ id: 'mentor', label: 'IT Murabbiy Profili (Ommaviy)', icon: Award }]
                : []),
              {
                id: 'security',
                label: isAdmin ? 'Xavfsizlik & Tokenlar' : 'Xavfsizlik & Parol',
                icon: Shield,
              },
              { id: 'preferences', label: 'Tizim sozlamalari', icon: Globe2 },
              { id: 'sessions', label: 'Faol sessiyalar', icon: Laptop },
            ].map((tab) => {
              const Icon = tab.icon;
              return (
                <TabsTrigger
                  key={tab.id}
                  value={tab.id}
                  className="h-10 px-4 rounded-xl text-xs sm:text-sm font-semibold transition-all data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm data-[state=inactive]:text-muted-foreground data-[state=inactive]:hover:text-foreground data-[state=inactive]:hover:bg-muted/50 border-0 cursor-pointer flex items-center gap-2 shrink-0"
                >
                  <Icon className="w-4 h-4" />
                  <span>{tab.label}</span>
                </TabsTrigger>
              );
            })}
          </TabsList>
        </div>

        {/* ========================================================
            3. TAB CONTENT PANELS (Clean, Borderless, Soft Modern Style)
            ======================================================== */}

        {/* TAB 1: OVERVIEW & PERSONAL INFO */}
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in duration-200">
            {/* Main Edit Form (2 cols) */}
            <div className="lg:col-span-2 bg-card text-card-foreground p-6 sm:p-8 rounded-2xl sm:rounded-3xl shadow-[0_2px_14px_-2px_rgba(0,0,0,0.05)] dark:shadow-none border-0 space-y-6">
              <div className="border-b border-border/10 pb-4">
                <h2 className="text-base sm:text-lg font-bold text-foreground">
                  Shaxsiy Profil Ma’lumotlari
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  AXM Nexus tizimidagi shaxsiy profilingiz parametrlarini boshqaring
                </p>
              </div>

              <form onSubmit={handleSaveProfile} className="space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="fullname" className="text-xs font-semibold text-foreground">
                      F.I.Sh (To‘liq ism-familiya) *
                    </Label>
                    <Input
                      id="fullname"
                      leftIcon={<User className="w-4 h-4 text-muted-foreground" />}
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      required
                      className="h-10 rounded-xl bg-muted/40 border-0 text-xs sm:text-sm focus-visible:ring-1"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="email" className="text-xs font-semibold text-foreground">
                      Elektron pochta (Email) *
                    </Label>
                    <Input
                      id="email"
                      leftIcon={<Mail className="w-4 h-4 text-muted-foreground" />}
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="h-10 rounded-xl bg-muted/40 border-0 text-xs sm:text-sm focus-visible:ring-1"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="phone" className="text-xs font-semibold text-foreground">
                      Telefon raqam
                    </Label>
                    <Input
                      id="phone"
                      leftIcon={<Phone className="w-4 h-4 text-muted-foreground" />}
                      type="text"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="h-10 rounded-xl bg-muted/40 border-0 text-xs sm:text-sm focus-visible:ring-1"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="branch" className="text-xs font-semibold text-foreground">
                      Filial / Lokatsiya
                    </Label>
                    <Input
                      id="branch"
                      leftIcon={<MapPin className="w-4 h-4 text-muted-foreground" />}
                      type="text"
                      value="IT Park Yangiariq filiali"
                      disabled
                      className="h-10 rounded-xl bg-muted/40 border-0 text-xs sm:text-sm opacity-80"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="bio" className="text-xs font-semibold text-foreground">
                    Qisqacha ma’lumot (Bio)
                  </Label>
                  <Textarea
                    id="bio"
                    rows={3}
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    className="rounded-xl bg-muted/40 border-0 text-xs sm:text-sm focus-visible:ring-1"
                  />
                </div>

                <div className="pt-2 flex justify-end">
                  <Button
                    type="submit"
                    disabled={isSavingProfile}
                    className="bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white font-semibold text-xs rounded-xl shadow-lg shadow-indigo-600/25 border-0 h-10 px-6 cursor-pointer"
                  >
                    <Save className="w-4 h-4 mr-2" />
                    <span>{isSavingProfile ? 'Saqlanmoqda...' : 'O‘zgarishlarni saqlash'}</span>
                  </Button>
                </div>
              </form>
            </div>

            {/* Quick Account Summary Card (1 col) */}
            <div className="space-y-5">
              <div className="bg-card text-card-foreground p-6 rounded-2xl sm:rounded-3xl shadow-[0_2px_14px_-2px_rgba(0,0,0,0.05)] dark:shadow-none border-0 space-y-4">
                <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                  <Award className="w-4 h-4 text-indigo-500" />
                  <span>Hisob Maqomi va Vakolatlari</span>
                </h3>

                <div className="space-y-2.5 text-xs">
                  <div className="p-3.5 rounded-xl bg-muted/30 flex items-center justify-between border-0">
                    <span className="text-muted-foreground">Foydalanuvchi ID:</span>
                    <span className="font-mono font-bold text-foreground">#{user?.id || 1}</span>
                  </div>

                  <div className="p-3.5 rounded-xl bg-muted/30 flex items-center justify-between border-0">
                    <span className="text-muted-foreground">Autentifikatsiya:</span>
                    <span className="font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>JWT Token juftligi</span>
                    </span>
                  </div>

                  <div className="p-3.5 rounded-xl bg-muted/30 flex items-center justify-between border-0">
                    <span className="text-muted-foreground">Dastur versiyasi:</span>
                    <span className="font-mono text-cyan-600 dark:text-cyan-400 font-bold">AXM Nexus v2.6.4</span>
                  </div>
                </div>
              </div>

              {isPureStudent ? (
                <div className="bg-gradient-to-br from-blue-500/10 via-indigo-500/5 to-transparent rounded-2xl sm:rounded-3xl p-6 shadow-[0_2px_14px_-2px_rgba(0,0,0,0.04)] dark:shadow-none border-0 space-y-3 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-foreground block">Al-Xorazmiy O‘quvchisi</span>
                    <Badge variant="neutral" className="border-0 rounded-full bg-blue-500/20 text-blue-600 dark:text-blue-400 font-bold text-[10px]">
                      Faol O‘quvchi
                    </Badge>
                  </div>
                  <p className="text-muted-foreground leading-relaxed">
                    Web Development, Algoritmlar va sun’iy intellekt bo‘yicha shaxsiy ta’lim natijalari va yutuqlaringiz.
                  </p>
                  <Button
                    type="button"
                    onClick={() => setActiveTab('student')}
                    className="w-full rounded-xl bg-primary text-primary-foreground font-semibold text-xs border-0 shadow-sm cursor-pointer"
                  >
                    <GraduationCap className="w-4 h-4 mr-1.5" />
                    <span>O‘quvchi Yutuqlarini Ko‘rish</span>
                  </Button>
                </div>
              ) : (
                <div className="bg-gradient-to-br from-indigo-500/10 via-purple-500/5 to-transparent rounded-2xl sm:rounded-3xl p-6 shadow-[0_2px_14px_-2px_rgba(0,0,0,0.04)] dark:shadow-none border-0 space-y-3 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-foreground block">Al-Xorazmiy IT Murabbiyi</span>
                    <Badge variant="success" className="border-0 rounded-full font-bold text-[10px]">
                      Ommaviy Profil
                    </Badge>
                  </div>
                  <p className="text-muted-foreground leading-relaxed">
                    Texnik ko‘nikmalar, ish tajribasi va ta’lim ma’lumotlaringizni to‘ldiring yoki tahrirlang.
                  </p>
                  <Button
                    type="button"
                    onClick={() => setActiveTab('mentor')}
                    className="w-full rounded-xl bg-primary text-primary-foreground font-semibold text-xs border-0 shadow-sm cursor-pointer"
                  >
                    <Award className="w-4 h-4 mr-1.5" />
                    <span>Murabbiy Profilini To‘ldirish</span>
                  </Button>
                </div>
              )}

              <div className="bg-gradient-to-r from-emerald-500/10 via-teal-500/5 to-transparent rounded-2xl sm:rounded-3xl p-6 shadow-[0_2px_14px_-2px_rgba(0,0,0,0.03)] dark:shadow-none border-0 space-y-2 text-xs">
                <span className="font-bold text-foreground block">Prezident Dasturi Integratsiyasi</span>
                <p className="text-muted-foreground leading-relaxed">
                  Ushbu profil Muhammad Al-Xorazmiy Vorislari ta’lim tarmog‘ining yagona milliy ma’lumotlar bazasi bilan xavfsiz sinxronlashgan.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: STUDENT ACADEMIC PROFILE & ACHIEVEMENTS */}
        {isPureStudent && activeTab === 'student' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            {/* Top Academic Banner */}
            <div className="bg-card text-card-foreground p-6 sm:p-8 rounded-2xl sm:rounded-3xl shadow-[0_2px_14px_-2px_rgba(0,0,0,0.05)] dark:shadow-none border-0 relative overflow-hidden">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="flex flex-col sm:flex-row sm:items-center gap-5">
                  <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-3xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-cyan-500 text-white flex items-center justify-center font-black text-3xl sm:text-4xl shadow-xl shadow-blue-500/20 border-0">
                    {getInitials(user?.fullName)}
                  </div>
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xl sm:text-2xl font-black text-foreground">
                        {user?.fullName || 'Iqtidorli O‘quvchi'}
                      </span>
                      <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-blue-500/15 text-blue-600 dark:text-blue-400 border-0">
                        8–11-sinf Ixtisoslashtirilgan Dastur
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Muhammad Al-Xorazmiy Vorislari ta’lim tarmog‘ining faol o‘quvchi profili
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="p-4 rounded-2xl bg-muted/40 text-center border-0">
                    <span className="text-[11px] text-muted-foreground block">Joriy Gamifikatsiya Darajasi</span>
                    <span className="text-xl font-black text-amber-500 font-mono">Level 4 • 1,450 XP</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Student Academic Details Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-card text-card-foreground p-6 rounded-2xl sm:rounded-3xl shadow-[0_2px_14px_-2px_rgba(0,0,0,0.05)] dark:shadow-none border-0 space-y-4">
                <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                  <GraduationCap className="w-4 h-4 text-blue-500" />
                  <span>Akademik Yo‘nalish</span>
                </h3>
                <div className="space-y-2.5 text-xs">
                  <div className="p-3.5 rounded-xl bg-muted/30 flex items-center justify-between border-0">
                    <span className="text-muted-foreground">Asosiy fan:</span>
                    <span className="font-bold text-foreground">Web Full-Stack & Python</span>
                  </div>
                  <div className="p-3.5 rounded-xl bg-muted/30 flex items-center justify-between border-0">
                    <span className="text-muted-foreground">Guruh:</span>
                    <span className="font-bold text-indigo-600 dark:text-indigo-400">YA-26I0804 (8-sinf)</span>
                  </div>
                  <div className="p-3.5 rounded-xl bg-muted/30 flex items-center justify-between border-0">
                    <span className="text-muted-foreground">Akademik o‘zlashtirish:</span>
                    <span className="font-bold text-emerald-600 dark:text-emerald-400">94.8 / 100 (A+)</span>
                  </div>
                </div>
              </div>

              <div className="bg-card text-card-foreground p-6 rounded-2xl sm:rounded-3xl shadow-[0_2px_14px_-2px_rgba(0,0,0,0.05)] dark:shadow-none border-0 space-y-4">
                <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  <span>Davomat va Faollik</span>
                </h3>
                <div className="space-y-2.5 text-xs">
                  <div className="p-3.5 rounded-xl bg-muted/30 flex items-center justify-between border-0">
                    <span className="text-muted-foreground">Darslarda ishtirok:</span>
                    <span className="font-bold text-emerald-600 dark:text-emerald-400 font-mono">100%</span>
                  </div>
                  <div className="p-3.5 rounded-xl bg-muted/30 flex items-center justify-between border-0">
                    <span className="text-muted-foreground">Qoldirilgan darslar:</span>
                    <span className="font-bold text-muted-foreground">0 soat</span>
                  </div>
                  <div className="p-3.5 rounded-xl bg-muted/30 flex items-center justify-between border-0">
                    <span className="text-muted-foreground">Uyga vazifalar:</span>
                    <span className="font-bold text-blue-600 dark:text-blue-400">12 / 12 topshirilgan</span>
                  </div>
                </div>
              </div>

              <div className="bg-card text-card-foreground p-6 rounded-2xl sm:rounded-3xl shadow-[0_2px_14px_-2px_rgba(0,0,0,0.05)] dark:shadow-none border-0 space-y-4">
                <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                  <Award className="w-4 h-4 text-amber-500" />
                  <span>Qo‘lga kiritilgan Yutuqlar</span>
                </h3>
                <div className="space-y-2 text-xs">
                  <div className="flex items-center gap-2.5 p-3 rounded-xl bg-amber-500/10 text-amber-800 dark:text-amber-300 font-medium border-0">
                    <Award className="w-4 h-4 shrink-0 text-amber-500" />
                    <span>Frontend Master — Mukammal HTML & CSS loyiha</span>
                  </div>
                  <div className="flex items-center gap-2.5 p-3 rounded-xl bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 font-medium border-0">
                    <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-500" />
                    <span>Namunali Davomat — 100% ishtirok nishoni</span>
                  </div>
                  <div className="flex items-center gap-2.5 p-3 rounded-xl bg-indigo-500/10 text-indigo-800 dark:text-indigo-300 font-medium border-0">
                    <ShieldCheck className="w-4 h-4 shrink-0 text-indigo-500" />
                    <span>Tezkor Algoritmchi — 1-o‘rin test natijasi</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: MENTOR PROFILE (OMMAVIY & KASBIY MA'LUMOTLAR) */}
        {!isPureStudent && activeTab === 'mentor' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            {/* Top Mentor Banner with Live Status & Edit Action */}
            <div className="bg-card text-card-foreground p-6 sm:p-8 rounded-2xl sm:rounded-3xl shadow-[0_2px_14px_-2px_rgba(0,0,0,0.05)] dark:shadow-none border-0 relative overflow-hidden">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="flex flex-col sm:flex-row sm:items-center gap-5">
                  <div className="relative shrink-0">
                    {mentorProfile?.profilePhotoUrl ? (
                      <img
                        src={mentorProfile.profilePhotoUrl}
                        alt={mentorProfile.displayName}
                        className="w-20 h-20 sm:w-24 sm:h-24 rounded-3xl object-cover shadow-lg border-0"
                      />
                    ) : (
                      <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-3xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-cyan-500 text-white flex items-center justify-center font-black text-3xl sm:text-4xl shadow-xl shadow-blue-500/20 border-0">
                        {mentorProfile?.displayName?.charAt(0) || 'A'}
                      </div>
                    )}
                    <span className="absolute -bottom-1 -right-1 p-1 bg-card rounded-full shadow-sm">
                      <ShieldCheck className="w-4 h-4 text-emerald-500" />
                    </span>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xl sm:text-2xl font-black text-foreground">
                        {mentorProfile?.displayName || fullName}
                      </span>
                      <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-0">
                        Tasdiqlangan & Ommaviy
                      </span>
                      {mentorProfile?.yearsOfExperience ? (
                        <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-blue-500/15 text-blue-600 dark:text-blue-400 border-0">
                          {mentorProfile.yearsOfExperience} yil tajriba
                        </span>
                      ) : null}
                    </div>

                    <p className="text-xs sm:text-sm font-semibold text-blue-600 dark:text-cyan-400">
                      {mentorProfile?.headline || 'Al-Xorazmiy Vorislari IT Mentori (Web Full-stack & Frontend)'}
                    </p>

                    {/* Social / Portfolio Links */}
                    <div className="flex flex-wrap items-center gap-2 pt-2">
                      {mentorProfile?.githubUrl && (
                        <a
                          href={mentorProfile.githubUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-3 py-1.5 rounded-xl bg-muted/40 hover:bg-muted text-foreground transition flex items-center gap-1.5 text-xs font-semibold border-0"
                        >
                          <Code2 className="w-3.5 h-3.5 text-blue-500" />
                          <span>GitHub</span>
                          <ExternalLink className="w-3 h-3 text-muted-foreground" />
                        </a>
                      )}
                      {mentorProfile?.linkedinUrl && (
                        <a
                          href={mentorProfile.linkedinUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-3 py-1.5 rounded-xl bg-muted/40 hover:bg-muted text-foreground transition flex items-center gap-1.5 text-xs font-semibold border-0"
                        >
                          <Share2 className="w-3.5 h-3.5 text-indigo-500" />
                          <span>LinkedIn</span>
                          <ExternalLink className="w-3 h-3 text-muted-foreground" />
                        </a>
                      )}
                      {mentorProfile?.portfolioUrl && (
                        <a
                          href={mentorProfile.portfolioUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-3 py-1.5 rounded-xl bg-muted/40 hover:bg-muted text-foreground transition flex items-center gap-1.5 text-xs font-semibold border-0"
                        >
                          <Globe className="w-3.5 h-3.5 text-emerald-500" />
                          <span>Portfolio</span>
                          <ExternalLink className="w-3 h-3 text-muted-foreground" />
                        </a>
                      )}
                    </div>
                  </div>
                </div>

                {/* Edit CTA */}
                <Button
                  type="button"
                  onClick={() => setIsMentorModalOpen(true)}
                  className="bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white font-semibold text-xs rounded-xl shadow-lg shadow-indigo-600/25 border-0 h-10 px-5 cursor-pointer shrink-0 self-start sm:self-auto"
                >
                  <Edit3 className="w-4 h-4 mr-2" />
                  <span>Profilni to‘ldirish & Tahrirlash</span>
                </Button>
              </div>
            </div>

            {/* Detailed Mentor Sections Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left 2 cols: Bio, Skills, Experience, Education */}
              <div className="lg:col-span-2 space-y-6">
                {/* Bio */}
                <div className="bg-card text-card-foreground p-6 rounded-2xl sm:rounded-3xl shadow-[0_2px_14px_-2px_rgba(0,0,0,0.05)] dark:shadow-none border-0 space-y-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <User className="w-4 h-4 text-blue-500" />
                    <span>Murabbiy haqida (Biografiya)</span>
                  </h3>
                  <p className="text-xs sm:text-sm text-foreground leading-relaxed bg-muted/30 p-4 rounded-2xl border-0 whitespace-pre-line">
                    {mentorProfile?.bio || "Al-Xorazmiy Vorislari IT mentori, Web Full-Stack va Frontend dasturlash bo'yicha amaliyotchi mutaxassis."}
                  </p>
                </div>

                {/* Skills */}
                <div className="bg-card text-card-foreground p-6 rounded-2xl sm:rounded-3xl shadow-[0_2px_14px_-2px_rgba(0,0,0,0.05)] dark:shadow-none border-0 space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                      <Award className="w-4 h-4 text-cyan-500" />
                      <span>Texnik Ko‘nikmalar & Malaka ({mentorProfile?.skills?.length || 0})</span>
                    </h3>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setIsMentorModalOpen(true)}
                      className="text-xs font-semibold text-primary hover:underline flex items-center gap-1 cursor-pointer h-8 px-2 border-0"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Ko‘nikma qo‘shish</span>
                    </Button>
                  </div>

                  {mentorProfile?.skills && mentorProfile.skills.length > 0 ? (
                    <div className="flex flex-wrap gap-2.5">
                      {mentorProfile.skills.map((skill, idx) => (
                        <div
                          key={skill.id || idx}
                          className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-muted/30 text-xs font-semibold text-foreground border-0"
                        >
                          <span>{skill.skillName}</span>
                          {skill.proficiencyLevel && (
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-blue-500/15 text-blue-600 dark:text-blue-400">
                              {skill.proficiencyLevel}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground italic">Ko‘nikmalar hali kiritilmagan</p>
                  )}
                </div>

                {/* Work Experience */}
                <div className="bg-card text-card-foreground p-6 rounded-2xl sm:rounded-3xl shadow-[0_2px_14px_-2px_rgba(0,0,0,0.05)] dark:shadow-none border-0 space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                      <Briefcase className="w-4 h-4 text-indigo-500" />
                      <span>Ish Tajribasi & Loyihalar ({mentorProfile?.experiences?.length || 0})</span>
                    </h3>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setIsMentorModalOpen(true)}
                      className="text-xs font-semibold text-primary hover:underline flex items-center gap-1 cursor-pointer h-8 px-2 border-0"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Tajriba qo‘shish</span>
                    </Button>
                  </div>

                  {mentorProfile?.experiences && mentorProfile.experiences.length > 0 ? (
                    <div className="space-y-3">
                      {mentorProfile.experiences.map((exp, idx) => (
                        <div
                          key={exp.id || idx}
                          className="p-4 rounded-2xl bg-muted/30 text-xs space-y-2 border-0"
                        >
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                            <div>
                              <h4 className="font-bold text-sm text-foreground">{exp.roleTitle}</h4>
                              <p className="text-xs font-semibold text-blue-600 dark:text-cyan-400">{exp.companyName}</p>
                            </div>
                            <span className="text-[11px] font-medium text-muted-foreground px-2.5 py-0.5 rounded-md bg-muted/60 self-start sm:self-auto">
                              {exp.startDate} — {exp.isCurrent ? 'Hozirgi vaqtgacha' : exp.endDate || 'Noma’lum'}
                            </span>
                          </div>
                          {exp.description && (
                            <p className="text-xs text-muted-foreground leading-relaxed">
                              {exp.description}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground italic">Ish tajribasi ma’lumotlari kiritilmagan</p>
                  )}
                </div>

                {/* Education */}
                <div className="bg-card text-card-foreground p-6 rounded-2xl sm:rounded-3xl shadow-[0_2px_14px_-2px_rgba(0,0,0,0.05)] dark:shadow-none border-0 space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                      <GraduationCap className="w-4 h-4 text-emerald-500" />
                      <span>Ta’lim & Sertifikatlar ({mentorProfile?.educations?.length || 0})</span>
                    </h3>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setIsMentorModalOpen(true)}
                      className="text-xs font-semibold text-primary hover:underline flex items-center gap-1 cursor-pointer h-8 px-2 border-0"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Ta’lim qo‘shish</span>
                    </Button>
                  </div>

                  {mentorProfile?.educations && mentorProfile.educations.length > 0 ? (
                    <div className="space-y-3">
                      {mentorProfile.educations.map((edu, idx) => (
                        <div
                          key={edu.id || idx}
                          className="p-4 rounded-2xl bg-muted/30 text-xs flex items-center justify-between border-0"
                        >
                          <div>
                            <h4 className="font-bold text-sm text-foreground">{edu.institution}</h4>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {edu.degreeOrCertificate} {edu.fieldOfStudy ? `— ${edu.fieldOfStudy}` : ''}
                            </p>
                          </div>
                          {edu.issueYear && (
                            <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/15 px-2.5 py-1 rounded-xl border-0">
                              {edu.issueYear}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground italic">Ta’lim ma’lumotlari kiritilmagan</p>
                  )}
                </div>
              </div>

              {/* Right 1 col: Contact & Visibility Panel */}
              <div className="space-y-6">
                <div className="bg-card text-card-foreground p-6 rounded-2xl sm:rounded-3xl shadow-[0_2px_14px_-2px_rgba(0,0,0,0.05)] dark:shadow-none border-0 space-y-4">
                  <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                    <Phone className="w-4 h-4 text-blue-500" />
                    <span>Aloqa & Ommaviylik</span>
                  </h3>

                  <div className="space-y-2.5 text-xs">
                    <div className="p-3.5 rounded-xl bg-muted/30 flex items-center justify-between border-0">
                      <span className="text-muted-foreground">Aloqa holati:</span>
                      <span className="font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                        <ShieldCheck className="w-3.5 h-3.5" />
                        <span>{mentorProfile?.isContactPublic ? 'Ochiq (Public)' : 'Himoyalangan'}</span>
                      </span>
                    </div>

                    <div className="p-3.5 rounded-xl bg-muted/30 space-y-1 border-0">
                      <span className="text-muted-foreground text-[11px] block">Telefon raqam:</span>
                      <span className="font-semibold text-foreground">{mentorProfile?.phone || phone}</span>
                    </div>

                    <div className="p-3.5 rounded-xl bg-muted/30 space-y-1 border-0">
                      <span className="text-muted-foreground text-[11px] block">Elektron pochta:</span>
                      <span className="font-semibold text-foreground">{mentorProfile?.email || email}</span>
                    </div>

                    <div className="p-3.5 rounded-xl bg-muted/30 space-y-1 border-0">
                      <span className="text-muted-foreground text-[11px] block">Filial:</span>
                      <span className="font-semibold text-foreground">
                        {mentorProfile?.branchLocation || 'IT Park Yangiariq'}
                      </span>
                    </div>
                  </div>

                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => setIsMentorModalOpen(true)}
                    className="w-full rounded-xl bg-muted/60 hover:bg-muted text-foreground font-semibold text-xs border-0 cursor-pointer h-10"
                  >
                    <Edit3 className="w-4 h-4 text-blue-500 mr-2" />
                    <span>Ma’lumotlarni tahrirlash</span>
                  </Button>
                </div>

                {/* Timetable Quick Link Card */}
                <div className="bg-gradient-to-br from-blue-500/10 via-indigo-500/5 to-transparent rounded-2xl sm:rounded-3xl p-6 shadow-[0_2px_14px_-2px_rgba(0,0,0,0.04)] dark:shadow-none border-0 space-y-3 text-xs">
                  <span className="font-bold text-foreground block text-sm">
                    Dars Jadvali va Davomat
                  </span>
                  <p className="text-muted-foreground leading-relaxed">
                    8 va 11-sinf guruhlari dars jadvallari va o‘quvchilar davomati tizimda to‘liq bog‘langan.
                  </p>
                  <div className="pt-1 flex flex-col gap-2 font-semibold text-foreground">
                    <div className="flex items-center justify-between p-2.5 rounded-xl bg-muted/30 border-0">
                      <span>YA-24I1105 (11-sinf)</span>
                      <span className="text-cyan-600 dark:text-cyan-400 font-mono text-[11px]">Du-Ch-Ju 16:30</span>
                    </div>
                    <div className="flex items-center justify-between p-2.5 rounded-xl bg-muted/30 border-0">
                      <span>YA-26I0804 (8-sinf)</span>
                      <span className="text-indigo-600 dark:text-indigo-400 font-mono text-[11px]">Se-Pa-Sh 15:00</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: SECURITY & TOKENS */}
        {activeTab === 'security' && (
          <div className={cn('grid grid-cols-1 gap-6 animate-in fade-in duration-200', isAdmin ? 'lg:grid-cols-2' : 'max-w-2xl mx-auto')}>
            {/* JWT Token Pair Management (FAQAT ADMIN) */}
            {isAdmin && (
              <div className="bg-card text-card-foreground p-6 sm:p-8 rounded-2xl sm:rounded-3xl shadow-[0_2px_14px_-2px_rgba(0,0,0,0.05)] dark:shadow-none border-0 space-y-5">
                <div className="border-b border-border/10 pb-4">
                  <div className="flex items-center gap-2 text-cyan-600 dark:text-cyan-400 mb-1">
                    <KeyRound className="w-4 h-4" />
                    <span className="text-[10px] uppercase font-bold tracking-wider">Access / Refresh Token</span>
                  </div>
                  <h2 className="text-base sm:text-lg font-bold text-foreground">
                    Autentifikatsiya Tokenlari Boshqaruvi
                  </h2>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Tizim JWT Access Token (qisqa muddatli) va Refresh Token (uzoq muddatli) standartida ishlaydi
                  </p>
                </div>

                <div className="space-y-4 text-xs">
                  <div className="p-4 rounded-2xl bg-muted/30 space-y-2 border-0">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-foreground">Access Token (Bearer):</span>
                      <span className="text-[10px] px-2 py-0.5 rounded-md bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-mono font-bold">
                        Faol
                      </span>
                    </div>
                    <div className="p-2.5 rounded-xl bg-muted/60 font-mono text-[11px] text-muted-foreground truncate select-all border-0">
                      {user?.accessToken ? `${user.accessToken.slice(0, 36)}...` : 'Token generatsiya qilinmagan'}
                    </div>
                    <div className="flex items-center justify-between pt-1 text-[11px]">
                      <button
                        type="button"
                        onClick={handleCopyAccessToken}
                        className="text-primary hover:underline flex items-center gap-1 font-semibold cursor-pointer border-0 bg-transparent"
                      >
                        {copiedToken ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{copiedToken ? 'Nusxalandi!' : 'Tokendan nusxa olish'}</span>
                      </button>
                      <span className="text-muted-foreground">Amal qilish muddati: 24 soat</span>
                    </div>
                  </div>

                  <div className="p-4 rounded-2xl bg-muted/30 space-y-2 border-0">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-foreground">Refresh Token:</span>
                      <span className="text-[10px] px-2 py-0.5 rounded-md bg-blue-500/15 text-blue-600 dark:text-blue-400 font-mono font-bold">
                        Rotatsiya mavjud
                      </span>
                    </div>
                    <p className="text-muted-foreground text-[11px] leading-relaxed">
                      Har safar access token muddati tugaganda, tizim avtomatik tarzda yangi token oladi.
                    </p>
                    <div className="pt-2">
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={handleRefreshToken}
                        disabled={isRefreshingToken}
                        className="w-full rounded-xl bg-muted/60 hover:bg-muted text-foreground font-semibold text-xs border-0 cursor-pointer h-10"
                      >
                        <RefreshCw className={cn('w-3.5 h-3.5 text-blue-500 mr-2', isRefreshingToken && 'animate-spin')} />
                        <span>{isRefreshingToken ? 'Yangilanmoqda...' : 'Tokenni hozir majburiy yangilash'}</span>
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Change Password Form */}
            <div className="bg-card text-card-foreground p-6 sm:p-8 rounded-2xl sm:rounded-3xl shadow-[0_2px_14px_-2px_rgba(0,0,0,0.05)] dark:shadow-none border-0 space-y-5">
              <div className="border-b border-border/10 pb-4">
                <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 mb-1">
                  <Lock className="w-4 h-4" />
                  <span className="text-[10px] uppercase font-bold tracking-wider">Parol Xavfsizligi</span>
                </div>
                <h2 className="text-base sm:text-lg font-bold text-foreground">
                  Parolni Yangilash
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Hisobingiz xavfsizligini ta’minlash uchun murakkab paroldan foydalaning
                </p>
              </div>

              {passwordError && (
                <div className="p-3 rounded-xl bg-red-500/10 text-red-600 dark:text-red-400 text-xs flex items-center gap-2 border-0">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{passwordError}</span>
                </div>
              )}

              <form onSubmit={handleChangePassword} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="curr-pwd" className="text-xs font-semibold text-foreground">
                    Joriy parol *
                  </Label>
                  <Input
                    id="curr-pwd"
                    leftIcon={<KeyRound className="w-4 h-4 text-muted-foreground" />}
                    rightIcon={
                      <button
                        type="button"
                        onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                        className="text-muted-foreground hover:text-foreground cursor-pointer focus:outline-none"
                      >
                        {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    }
                    type={showCurrentPassword ? 'text' : 'password'}
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    className="h-10 rounded-xl bg-muted/40 border-0 text-xs sm:text-sm focus-visible:ring-1"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="new-pwd" className="text-xs font-semibold text-foreground">
                    Yangi parol *
                  </Label>
                  <Input
                    id="new-pwd"
                    leftIcon={<Lock className="w-4 h-4 text-muted-foreground" />}
                    rightIcon={
                      <button
                        type="button"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                        className="text-muted-foreground hover:text-foreground cursor-pointer focus:outline-none"
                      >
                        {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    }
                    type={showNewPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Kamida 6 ta belgi"
                    required
                    className="h-10 rounded-xl bg-muted/40 border-0 text-xs sm:text-sm focus-visible:ring-1"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="conf-pwd" className="text-xs font-semibold text-foreground">
                    Yangi parolni tasdiqlash *
                  </Label>
                  <Input
                    id="conf-pwd"
                    leftIcon={<ShieldCheck className="w-4 h-4 text-muted-foreground" />}
                    rightIcon={
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="text-muted-foreground hover:text-foreground cursor-pointer focus:outline-none"
                      >
                        {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    }
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={confirmNewPassword}
                    onChange={(e) => setConfirmNewPassword(e.target.value)}
                    placeholder="Yangi parolni qayta kiriting"
                    required
                    className="h-10 rounded-xl bg-muted/40 border-0 text-xs sm:text-sm focus-visible:ring-1"
                  />
                </div>

                <div className="pt-2 flex justify-end">
                  <Button
                    type="submit"
                    disabled={isChangingPassword}
                    className="bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white font-semibold text-xs rounded-xl shadow-lg shadow-indigo-600/25 border-0 h-10 px-6 cursor-pointer"
                  >
                    {isChangingPassword ? 'Yangilanmoqda...' : 'Yangi Parolni O‘rnatish'}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* TAB 5: PREFERENCES & NOTIFICATIONS */}
        {activeTab === 'preferences' && (
          <div className="bg-card text-card-foreground p-6 sm:p-8 rounded-2xl sm:rounded-3xl shadow-[0_2px_14px_-2px_rgba(0,0,0,0.05)] dark:shadow-none border-0 space-y-6 animate-in fade-in duration-200 max-w-3xl">
            <div className="border-b border-border/10 pb-4">
              <h2 className="text-base sm:text-lg font-bold text-foreground">
                Tizim va Xabarnomalar Sozlamalari
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Platforma ko‘rinishi va bildirishnomalar qabul qilish tartibini sozlang
              </p>
            </div>

            <div className="space-y-3">
              {/* Theme switcher row */}
              <div className="p-4 rounded-2xl bg-muted/30 flex items-center justify-between border-0">
                <div className="space-y-0.5">
                  <h4 className="text-xs font-bold text-foreground">Mavzu (Tungi / Kunduzgi rejim)</h4>
                  <p className="text-[11px] text-muted-foreground">Ko‘zni toliqtirmaydigan qorong‘i yoki yorug‘ rejimni tanlang</p>
                </div>
                <ThemeToggle />
              </div>

              {/* Email notifications switch */}
              <div className="p-4 rounded-2xl bg-muted/30 flex items-center justify-between border-0">
                <div className="space-y-0.5">
                  <h4 className="text-xs font-bold text-foreground">Email orqali dars xabarnomalari</h4>
                  <p className="text-[11px] text-muted-foreground">Dars jadvallari o‘zgarishi va yangi darslar pochtaga yuborilsin</p>
                </div>
                <input
                  type="checkbox"
                  checked={emailNotifications}
                  onChange={(e) => setEmailNotifications(e.target.checked)}
                  className="w-5 h-5 accent-primary rounded cursor-pointer"
                />
              </div>

              {/* Attendance alerts */}
              <div className="p-4 rounded-2xl bg-muted/30 flex items-center justify-between border-0">
                <div className="space-y-0.5">
                  <h4 className="text-xs font-bold text-foreground">Davomat hisoboti ogohlantirishlari</h4>
                  <p className="text-[11px] text-muted-foreground">O‘quvchilar sababsiz dars qoldirganda administratorga xabar berish</p>
                </div>
                <input
                  type="checkbox"
                  checked={attendanceAlerts}
                  onChange={(e) => setAttendanceAlerts(e.target.checked)}
                  className="w-5 h-5 accent-primary rounded cursor-pointer"
                />
              </div>

              {/* System updates */}
              <div className="p-4 rounded-2xl bg-muted/30 flex items-center justify-between border-0">
                <div className="space-y-0.5">
                  <h4 className="text-xs font-bold text-foreground">Tizim yangilanishlari xabarlari</h4>
                  <p className="text-[11px] text-muted-foreground">AXM Nexus platformasidagi yangi modullar haqida ma’lumot olish</p>
                </div>
                <input
                  type="checkbox"
                  checked={systemUpdates}
                  onChange={(e) => setSystemUpdates(e.target.checked)}
                  className="w-5 h-5 accent-primary rounded cursor-pointer"
                />
              </div>
            </div>
          </div>
        )}

        {/* TAB 6: SESSIONS & LOGINS */}
        {activeTab === 'sessions' && (
          <div className="bg-card text-card-foreground p-6 sm:p-8 rounded-2xl sm:rounded-3xl shadow-[0_2px_14px_-2px_rgba(0,0,0,0.05)] dark:shadow-none border-0 space-y-6 animate-in fade-in duration-200 max-w-4xl">
            <div className="border-b border-border/10 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h2 className="text-base sm:text-lg font-bold text-foreground">
                  Faol Sessiyalar va Kirishlar Tarixi
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Ushbu hisobga kirilgan qurilmalar va joriy brauzer sessiyasi
                </p>
              </div>
              <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-0 self-start sm:self-auto">
                1 ta faol qurilma
              </span>
            </div>

            <div className="space-y-3">
              <div className="p-4 rounded-2xl bg-muted/30 flex items-center justify-between border-0">
                <div className="flex items-center gap-3.5">
                  <div className="w-10 h-10 rounded-xl bg-blue-500/15 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                    <Laptop className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-xs font-bold text-foreground">Joriy Qurilma (Brauzer)</h4>
                      <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-emerald-500 text-white">
                        Hozir faol
                      </span>
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      Google Chrome / WebKit • Linux (Yangiariq, O‘zbekiston)
                    </p>
                  </div>
                </div>

                <div className="text-right text-[11px] font-mono text-muted-foreground">
                  <span>IP: 127.0.0.1 (Mahalliy)</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </Tabs>

      {/* Mentor Profile Edit Modal */}
      {isMentorModalOpen && (
        <MentorEditProfileModal
          profile={mentorProfile}
          isOpen={isMentorModalOpen}
          onClose={() => setIsMentorModalOpen(false)}
          onSuccess={() => {
            loadMentorProfile();
            toast.success('Muvaffaqiyatli saqlandi', 'Mentor profili muvaffaqiyatli yangilandi.');
          }}
        />
      )}
    </div>
  );
};
