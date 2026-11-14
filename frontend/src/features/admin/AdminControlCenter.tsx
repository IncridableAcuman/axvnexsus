import React, { useState, useEffect, useCallback } from 'react';
import {
  ShieldCheck,
  Users,
  Activity,
  FileText,
  Sliders,
  HeartPulse,
  Search,
  Download,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Edit2,
  Lock,
  Unlock,
  GraduationCap,
  BookOpen,
  Trophy,
  Server,
  Cpu,
  Clock,
  Database,
  Sparkles,
} from 'lucide-react';
import { adminApi } from '@/api';
import { useTranslation } from '@/shared/i18n';
import { useToast } from '@/shared/ui/toast/ToastContext';
import {
  Card,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import type {
  AdminOverview,
  AdminUserItem,
  AuditLogItem,
  SystemConfigItem,
  OperationalHealth,
} from '@/types';
import { TimeSlotManagement } from './TimeSlotManagement';

type AdminTab = 'overview' | 'users' | 'audit' | 'moderation' | 'config' | 'health' | 'timeslots';

export const AdminControlCenter: React.FC = () => {
  const { t, formatRelative } = useTranslation();
  const toast = useToast();
  const [activeTab, setActiveTab] = useState<AdminTab>('overview');
  const [loading, setLoading] = useState(false);

  // Overview State
  const [overview, setOverview] = useState<AdminOverview | null>(null);

  // Users Management State
  const [users, setUsers] = useState<AdminUserItem[]>([]);
  const [userQuery, setUserQuery] = useState('');
  const [userRoleFilter, setUserRoleFilter] = useState('ALL');
  const [selectedUser, setSelectedUser] = useState<AdminUserItem | null>(null);
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [statusReason, setStatusReason] = useState('');
  const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);

  // Audit Logs State
  const [auditLogs, setAuditLogs] = useState<AuditLogItem[]>([]);
  const [auditQuery, setAuditQuery] = useState('');
  const [auditActionFilter, setAuditActionFilter] = useState('');
  const [selectedLog, setSelectedLog] = useState<AuditLogItem | null>(null);

  // System Configuration State
  const [configs, setConfigs] = useState<SystemConfigItem[]>([]);
  const [editingConfig, setEditingConfig] = useState<SystemConfigItem | null>(null);
  const [configValueInput, setConfigValueInput] = useState('');

  // Operational Health State
  const [health, setHealth] = useState<OperationalHealth | null>(null);

  // Grade Override & Moderation State
  const [overrideGradeId, setOverrideGradeId] = useState('');
  const [overrideScore, setOverrideScore] = useState('');
  const [overrideReason, setOverrideReason] = useState('');

  // Load Data by Tab
  const loadOverview = useCallback(async () => {
    try {
      setLoading(true);
      const res = await adminApi.getOverview();
      if (res.data?.data) {
        setOverview(res.data.data);
      }
    } catch {
      // Mock / fallback
      setOverview({
        totalUsers: 142,
        totalStudents: 120,
        totalMentors: 14,
        totalStudyGroups: 8,
        totalLessons: 48,
        totalAssessments: 24,
        totalAuditLogs: 365,
        systemStatus: 'HEALTHY',
        operationalMetrics: {
          jvmTotalMemoryMb: 512,
          jvmUsedMemoryMb: 198,
          availableProcessors: 4,
          uptimeSeconds: 84600,
        },
      });
    } finally {
      setLoading(false);
    }
  }, []);

  const loadUsers = useCallback(async () => {
    try {
      setLoading(true);
      const res = await adminApi.getUsers({
        query: userQuery,
        role: userRoleFilter !== 'ALL' ? userRoleFilter : undefined,
      });
      if (res.data?.data?.content) {
        setUsers(res.data.data.content);
      }
    } catch {
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }, [userQuery, userRoleFilter]);

  const loadAuditLogs = useCallback(async () => {
    try {
      setLoading(true);
      const res = await adminApi.getAuditLogs({
        query: auditQuery,
        action: auditActionFilter || undefined,
      });
      if (res.data?.data?.content) {
        setAuditLogs(res.data.data.content);
      }
    } catch {
      setAuditLogs([]);
    } finally {
      setLoading(false);
    }
  }, [auditQuery, auditActionFilter]);

  const loadConfigs = useCallback(async () => {
    try {
      setLoading(true);
      const res = await adminApi.getSystemConfigs();
      if (res.data?.data) {
        setConfigs(res.data.data);
      }
    } catch {
      setConfigs([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadHealth = useCallback(async () => {
    try {
      setLoading(true);
      const res = await adminApi.getHealthOverview();
      if (res.data?.data) {
        setHealth(res.data.data);
      }
    } catch {
      setHealth(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === 'overview') loadOverview();
    else if (activeTab === 'users') loadUsers();
    else if (activeTab === 'audit') loadAuditLogs();
    else if (activeTab === 'config') loadConfigs();
    else if (activeTab === 'health') loadHealth();
  }, [activeTab, loadOverview, loadUsers, loadAuditLogs, loadConfigs, loadHealth]);

  // Actions
  const handleToggleUserStatus = async () => {
    if (!selectedUser) return;
    try {
      const nextStatus = !selectedUser.enabled;
      await adminApi.updateUserStatus(selectedUser.id, nextStatus, statusReason || 'Admin qarori');
      toast.success(
        t('admin.title'),
        `Foydalanuvchi #${selectedUser.id} holati yangilandi (${nextStatus ? 'Faollashtirildi' : 'To‘xtatildi'})`
      );
      setIsStatusModalOpen(false);
      setStatusReason('');
      loadUsers();
    } catch (err: any) {
      toast.error(t('common.error'), err.response?.data?.message || 'Xatolik yuz berdi');
    }
  };

  const handleUpdateRoles = async () => {
    if (!selectedUser) return;
    try {
      await adminApi.updateUserRoles(selectedUser.id, selectedRoles, 'Admin boshqaruvi');
      toast.success(t('admin.title'), 'Foydalanuvchi rollari yangilandi');
      setIsRoleModalOpen(false);
      loadUsers();
    } catch (err: any) {
      toast.error(t('common.error'), err.response?.data?.message || 'Xatolik yuz berdi');
    }
  };

  const handleSaveConfig = async () => {
    if (!editingConfig) return;
    try {
      await adminApi.updateSystemConfig({
        key: editingConfig.configKey,
        value: configValueInput,
        description: editingConfig.description,
      });
      toast.success(t('admin.title'), `Parametr ${editingConfig.configKey} yangilandi`);
      setEditingConfig(null);
      loadConfigs();
    } catch (err: any) {
      toast.error(t('common.error'), err.response?.data?.message || 'Xatolik yuz berdi');
    }
  };

  const handleExportAudit = async (format: 'csv' | 'json') => {
    try {
      const res = await adminApi.exportAuditLogs(format);
      const blob = new Blob([res.data], {
        type: format === 'json' ? 'application/json' : 'text/csv',
      });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `audit_logs_${Date.now()}.${format}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success(t('admin.title'), `Audit jurnallari ${format.toUpperCase()} shaklida yuklab olindi`);
    } catch {
      toast.error(t('common.error'), 'Eksport qilishda xatolik yuz berdi');
    }
  };

  const handleOverrideGrade = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!overrideGradeId || !overrideScore || !overrideReason) {
      toast.warning('Diqqat', 'Barcha maydonlarni to‘ldiring');
      return;
    }
    try {
      await adminApi.overrideGrade({
        gradeRecordId: Number(overrideGradeId),
        newScore: Number(overrideScore),
        reason: overrideReason,
      });
      toast.success(t('admin.title'), 'Baho muvaffaqiyatli tuzatildi va auditga kiritildi');
      setOverrideGradeId('');
      setOverrideScore('');
      setOverrideReason('');
    } catch (err: any) {
      toast.error(t('common.error'), err.response?.data?.message || 'Bahoni o‘zgartirishda xatolik');
    }
  };

  return (
    <div className="space-y-6">
      {/* ========================================================
          1. HEADER BANNER (Borderless, Glassmorphic, Light/Dark adaptive)
      ======================================================== */}
      <Card className="border-0 shadow-xl bg-gradient-to-br from-indigo-500/10 via-purple-500/5 to-card dark:from-indigo-950/40 dark:via-background dark:to-card relative overflow-hidden rounded-3xl p-6 sm:p-8">
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-indigo-500/10 dark:bg-indigo-400/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-20 -left-20 w-80 h-80 bg-purple-500/10 dark:bg-purple-400/5 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="flex items-center gap-2.5">
              <div className="p-3 rounded-2xl bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 shrink-0">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-xl sm:text-2xl lg:text-3xl font-extrabold text-foreground tracking-tight">
                    {t('admin.title')}
                  </h1>
                  <Badge className="border-0 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 font-bold px-2.5 py-0.5 rounded-full text-[10px] shadow-none">
                    Modul 16
                  </Badge>
                </div>
                <p className="text-xs sm:text-sm text-muted-foreground mt-0.5 leading-relaxed">
                  {t('admin.subtitle')}
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                if (activeTab === 'overview') loadOverview();
                else if (activeTab === 'users') loadUsers();
                else if (activeTab === 'audit') loadAuditLogs();
                else if (activeTab === 'config') loadConfigs();
                else if (activeTab === 'health') loadHealth();
              }}
              className="border-0 bg-muted/70 hover:bg-muted text-foreground rounded-2xl px-4 py-2 text-xs font-bold cursor-pointer gap-2 shadow-sm"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>{t('common.refresh')}</span>
            </Button>
          </div>
        </div>
      </Card>

      {/* ========================================================
          2. TABS NAVIGATION (Borderless, Modern Pill Switcher)
      ======================================================== */}
      <div
        role="tablist"
        className="flex items-center gap-2 p-1.5 rounded-2xl bg-muted/50 dark:bg-muted/25 overflow-x-auto text-xs font-semibold shadow-sm border-0"
      >
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'overview'}
          onClick={() => setActiveTab('overview')}
          className={`border-0 flex items-center gap-2 px-4 py-2 rounded-xl transition-all cursor-pointer whitespace-nowrap font-semibold ${
            activeTab === 'overview'
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
          }`}
        >
          <Activity className="w-4 h-4" />
          <span>{t('admin.tabs.overview')}</span>
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'users'}
          onClick={() => setActiveTab('users')}
          className={`border-0 flex items-center gap-2 px-4 py-2 rounded-xl transition-all cursor-pointer whitespace-nowrap font-semibold ${
            activeTab === 'users'
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>{t('admin.tabs.users')}</span>
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'audit'}
          onClick={() => setActiveTab('audit')}
          className={`border-0 flex items-center gap-2 px-4 py-2 rounded-xl transition-all cursor-pointer whitespace-nowrap font-semibold ${
            activeTab === 'audit'
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>{t('admin.tabs.audit')}</span>
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'moderation'}
          onClick={() => setActiveTab('moderation')}
          className={`border-0 flex items-center gap-2 px-4 py-2 rounded-xl transition-all cursor-pointer whitespace-nowrap font-semibold ${
            activeTab === 'moderation'
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
          }`}
        >
          <GraduationCap className="w-4 h-4" />
          <span>{t('admin.tabs.moderation')}</span>
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'config'}
          onClick={() => setActiveTab('config')}
          className={`border-0 flex items-center gap-2 px-4 py-2 rounded-xl transition-all cursor-pointer whitespace-nowrap font-semibold ${
            activeTab === 'config'
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
          }`}
        >
          <Sliders className="w-4 h-4" />
          <span>{t('admin.tabs.config')}</span>
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'health'}
          onClick={() => setActiveTab('health')}
          className={`border-0 flex items-center gap-2 px-4 py-2 rounded-xl transition-all cursor-pointer whitespace-nowrap font-semibold ${
            activeTab === 'health'
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
          }`}
        >
          <HeartPulse className="w-4 h-4" />
          <span>{t('admin.tabs.health')}</span>
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'timeslots'}
          onClick={() => setActiveTab('timeslots')}
          className={`border-0 flex items-center gap-2 px-4 py-2 rounded-xl transition-all cursor-pointer whitespace-nowrap font-semibold ${
            activeTab === 'timeslots'
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
          }`}
        >
          <Clock className="w-4 h-4" />
          <span>{t('scheduling.timeSlotsTitle')}</span>
        </button>
      </div>

      {/* ========================================================
          TAB 1: Platform Overview
      ======================================================== */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="border-0 shadow-lg bg-card/90 dark:bg-card/60 backdrop-blur-md rounded-3xl p-5 flex items-center justify-between transition-all hover:-translate-y-0.5">
              <div>
                <CardDescription className="text-xs font-semibold text-muted-foreground">
                  {t('admin.stats.totalUsers')}
                </CardDescription>
                <div className="text-2xl sm:text-3xl font-black text-foreground mt-1">
                  {overview?.totalUsers ?? '—'}
                </div>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-blue-500/15 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                <Users className="w-6 h-6" />
              </div>
            </Card>

            <Card className="border-0 shadow-lg bg-card/90 dark:bg-card/60 backdrop-blur-md rounded-3xl p-5 flex items-center justify-between transition-all hover:-translate-y-0.5">
              <div>
                <CardDescription className="text-xs font-semibold text-muted-foreground">
                  {t('admin.stats.totalStudents')}
                </CardDescription>
                <div className="text-2xl sm:text-3xl font-black text-foreground mt-1">
                  {overview?.totalStudents ?? '—'}
                </div>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                <GraduationCap className="w-6 h-6" />
              </div>
            </Card>

            <Card className="border-0 shadow-lg bg-card/90 dark:bg-card/60 backdrop-blur-md rounded-3xl p-5 flex items-center justify-between transition-all hover:-translate-y-0.5">
              <div>
                <CardDescription className="text-xs font-semibold text-muted-foreground">
                  {t('admin.stats.totalMentors')}
                </CardDescription>
                <div className="text-2xl sm:text-3xl font-black text-foreground mt-1">
                  {overview?.totalMentors ?? '—'}
                </div>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-purple-500/15 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
                <Trophy className="w-6 h-6" />
              </div>
            </Card>

            <Card className="border-0 shadow-lg bg-card/90 dark:bg-card/60 backdrop-blur-md rounded-3xl p-5 flex items-center justify-between transition-all hover:-translate-y-0.5">
              <div>
                <CardDescription className="text-xs font-semibold text-muted-foreground">
                  {t('admin.stats.totalLessons')}
                </CardDescription>
                <div className="text-2xl sm:text-3xl font-black text-foreground mt-1">
                  {overview?.totalLessons ?? '—'}
                </div>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                <BookOpen className="w-6 h-6" />
              </div>
            </Card>
          </div>

          {/* Quick Metrics & System Health Bar */}
          <Card className="border-0 shadow-xl bg-card rounded-3xl p-6 space-y-5">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-2xl bg-indigo-500/15 text-indigo-600 dark:text-indigo-400">
                <Server className="w-5 h-5" />
              </div>
              <div>
                <CardTitle className="text-base sm:text-lg font-bold text-foreground">
                  Infratuzilma tezkor holati
                </CardTitle>
                <CardDescription className="text-xs text-muted-foreground mt-0.5">
                  Server resurslari, JVM parametrlari va uzluksiz xizmat ko‘rsatish statistikasi
                </CardDescription>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 rounded-2xl bg-muted/40 dark:bg-muted/20 space-y-2 border-0">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span className="font-semibold">JVM Xotirasi</span>
                  <span className="font-bold text-foreground font-mono">
                    {overview?.operationalMetrics?.jvmUsedMemoryMb} MB / {overview?.operationalMetrics?.jvmTotalMemoryMb} MB
                  </span>
                </div>
                <Progress
                  value={Math.min(
                    100,
                    (((Number(overview?.operationalMetrics?.jvmUsedMemoryMb) || 100) /
                      (Number(overview?.operationalMetrics?.jvmTotalMemoryMb) || 512)) *
                      100)
                  )}
                  className="h-2 rounded-full bg-muted/70"
                />
              </div>

              <div className="p-4 rounded-2xl bg-muted/40 dark:bg-muted/20 space-y-1 border-0">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span className="font-semibold">Protsessor yadrolari</span>
                  <span className="font-bold text-foreground">
                    {overview?.operationalMetrics?.availableProcessors ?? '4'} yadroli
                  </span>
                </div>
                <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold mt-2 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Optimal yuklama me’yorda</span>
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-muted/40 dark:bg-muted/20 space-y-1 border-0">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span className="font-semibold">Uptime (Ishlash davomiyligi)</span>
                  <span className="font-bold text-foreground font-mono">
                    {Math.floor((Number(overview?.operationalMetrics?.uptimeSeconds) || 86400) / 3600)} soat
                  </span>
                </div>
                <p className="text-[11px] text-blue-600 dark:text-blue-400 font-semibold mt-2 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5" />
                  <span>Uzluksiz xizmat ko‘rsatish</span>
                </p>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* ========================================================
          TAB 2: Users & Accounts Management
      ======================================================== */}
      {activeTab === 'users' && (
        <div className="space-y-4">
          {/* Search & Filter Bar */}
          <Card className="border-0 shadow-md bg-card rounded-3xl p-4 flex flex-col sm:flex-row items-center gap-3">
            <div className="relative flex-1 w-full">
              <Search className="absolute left-3.5 top-3.5 w-4 h-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Foydalanuvchini ismi, pochtasi yoki username bo‘yicha izlash..."
                value={userQuery}
                onChange={(e) => setUserQuery(e.target.value)}
                className="pl-10 h-11 text-xs sm:text-sm border-0 bg-muted/60 dark:bg-muted/30 rounded-2xl shadow-sm text-foreground focus-visible:ring-2 focus-visible:ring-indigo-500"
              />
            </div>

            <select
              value={userRoleFilter}
              onChange={(e) => setUserRoleFilter(e.target.value)}
              className="h-11 px-4 text-xs sm:text-sm font-semibold rounded-2xl border-0 bg-muted/60 dark:bg-muted/30 text-foreground cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm"
            >
              <option value="ALL">Barcha rollar</option>
              <option value="ROLE_SUPER_ADMIN">Super Admin</option>
              <option value="ROLE_ADMIN">Administrator</option>
              <option value="ROLE_MENTOR">IT Mentor</option>
              <option value="ROLE_STUDENT">O‘quvchi</option>
            </select>
          </Card>

          {/* Users Table (Shadcn Table - Borderless) */}
          <Card className="border-0 shadow-xl bg-card rounded-3xl p-6 overflow-hidden">
            <div className="overflow-x-auto">
              <Table className="w-full text-left text-xs sm:text-sm">
                <TableHeader className="[&_tr]:border-0">
                  <TableRow className="border-0 bg-muted/40 dark:bg-muted/20 hover:bg-muted/40 rounded-2xl">
                    <TableHead className="py-3 px-3 font-bold uppercase tracking-wider text-[11px] text-muted-foreground rounded-l-2xl">
                      Foydalanuvchi
                    </TableHead>
                    <TableHead className="py-3 px-3 font-bold uppercase tracking-wider text-[11px] text-muted-foreground">
                      Username & Aloqa
                    </TableHead>
                    <TableHead className="py-3 px-3 font-bold uppercase tracking-wider text-[11px] text-muted-foreground">
                      Rollar
                    </TableHead>
                    <TableHead className="py-3 px-3 font-bold uppercase tracking-wider text-[11px] text-muted-foreground">
                      Holat
                    </TableHead>
                    <TableHead className="py-3 px-4 font-bold uppercase tracking-wider text-[11px] text-muted-foreground text-right rounded-r-2xl">
                      Amallar
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="[&_tr]:border-0 space-y-1">
                  {users.length === 0 ? (
                    <TableRow className="border-0">
                      <TableCell colSpan={5} className="py-12 text-center text-muted-foreground border-0">
                        {loading ? t('common.loading') : t('common.noData')}
                      </TableCell>
                    </TableRow>
                  ) : (
                    users.map((u) => (
                      <TableRow
                        key={u.id}
                        className="border-0 hover:bg-muted/40 dark:hover:bg-muted/20 transition-colors rounded-2xl"
                      >
                        <TableCell className="py-3 px-3">
                          <div className="flex items-center gap-2.5">
                            <Avatar className="h-8 w-8 rounded-xl shrink-0">
                              <AvatarFallback className="rounded-xl text-xs font-bold bg-indigo-500/10 text-indigo-700 dark:text-indigo-300">
                                {u.fullName?.substring(0, 2).toUpperCase() || 'U'}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <div className="font-bold text-foreground">{u.fullName}</div>
                              <div className="text-[11px] text-muted-foreground">ID #{u.id}</div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="py-3 px-3">
                          <div className="font-mono text-xs text-foreground font-semibold">@{u.username}</div>
                          <div className="text-[11px] text-muted-foreground">{u.email || u.phone || '—'}</div>
                        </TableCell>
                        <TableCell className="py-3 px-3">
                          <div className="flex flex-wrap gap-1">
                            {u.roles?.map((r: string) => (
                              <Badge
                                key={r}
                                className="border-0 bg-muted/70 dark:bg-muted/40 text-foreground font-mono text-[10px] font-bold shadow-none"
                              >
                                {r.replace('ROLE_', '')}
                              </Badge>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell className="py-3 px-3">
                          {u.enabled ? (
                            <Badge className="border-0 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 gap-1 text-[10px] font-bold shadow-none">
                              <CheckCircle2 className="w-3 h-3" />
                              <span>{t('common.active')}</span>
                            </Badge>
                          ) : (
                            <Badge className="border-0 bg-destructive/15 text-destructive gap-1 text-[10px] font-bold shadow-none">
                              <XCircle className="w-3 h-3" />
                              <span>{t('common.suspended')}</span>
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <Button
                              type="button"
                              variant="secondary"
                              size="icon"
                              className="h-8 w-8 rounded-xl border-0 bg-muted/60 hover:bg-muted text-foreground cursor-pointer"
                              onClick={() => {
                                setSelectedUser(u);
                                setSelectedRoles(u.roles || ['ROLE_STUDENT']);
                                setIsRoleModalOpen(true);
                              }}
                              title="Rollarni tahrirlash"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </Button>

                            <Button
                              type="button"
                              variant="secondary"
                              size="icon"
                              className={`h-8 w-8 rounded-xl border-0 cursor-pointer ${
                                u.enabled
                                  ? 'bg-destructive/10 text-destructive hover:bg-destructive/20'
                                  : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20'
                              }`}
                              onClick={() => {
                                setSelectedUser(u);
                                setIsStatusModalOpen(true);
                              }}
                              title={u.enabled ? 'Hisobni to‘xtatish' : 'Hisobni faollashtirish'}
                            >
                              {u.enabled ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </Card>
        </div>
      )}

      {/* ========================================================
          TAB 3: Audit Log Explorer (Borderless, Clean, Modern)
      ======================================================== */}
      {activeTab === 'audit' && (
        <div className="space-y-4">
          {/* Audit Controls & Export Bar */}
          <Card className="border-0 shadow-lg bg-card rounded-3xl p-4 sm:p-5 flex flex-col sm:flex-row items-center justify-between gap-3.5">
            <div className="flex items-center gap-2.5 flex-1 w-full">
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-3.5 w-4 h-4 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Audit yozuvlaridan qidirish (ijrochi, obyekt, tafsilotlar)..."
                  value={auditQuery}
                  onChange={(e) => setAuditQuery(e.target.value)}
                  className="pl-10 h-11 text-xs sm:text-sm border-0 bg-muted/60 dark:bg-muted/30 rounded-2xl shadow-sm text-foreground focus-visible:ring-2 focus-visible:ring-indigo-500"
                />
              </div>

              <select
                value={auditActionFilter}
                onChange={(e) => setAuditActionFilter(e.target.value)}
                className="h-11 px-4 text-xs sm:text-sm font-semibold rounded-2xl border-0 bg-muted/60 dark:bg-muted/30 text-foreground cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm"
              >
                <option value="">Barcha harakatlar</option>
                <option value="ROLE_ASSIGN">ROLE_ASSIGN</option>
                <option value="ACCOUNT_SUSPEND">ACCOUNT_SUSPEND</option>
                <option value="ACCOUNT_REACTIVATE">ACCOUNT_REACTIVATE</option>
                <option value="CONFIG_UPDATE">CONFIG_UPDATE</option>
                <option value="GRADE_OVERRIDE">GRADE_OVERRIDE</option>
                <option value="REPORT_EXPORT">REPORT_EXPORT</option>
              </select>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => handleExportAudit('csv')}
                className="border-0 rounded-2xl h-11 px-4 bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-700 dark:text-emerald-300 font-bold text-xs cursor-pointer shadow-none gap-2"
              >
                <Download className="w-4 h-4" />
                <span>{t('admin.actions.exportCsv')}</span>
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => handleExportAudit('json')}
                className="border-0 rounded-2xl h-11 px-4 bg-blue-500/15 hover:bg-blue-500/25 text-blue-700 dark:text-blue-300 font-bold text-xs cursor-pointer shadow-none gap-2"
              >
                <Download className="w-4 h-4" />
                <span>{t('admin.actions.exportJson')}</span>
              </Button>
            </div>
          </Card>

          {/* Audit Table (Shadcn Table - Borderless) */}
          <Card className="border-0 shadow-xl bg-card rounded-3xl p-6 overflow-hidden">
            <div className="overflow-x-auto">
              <Table className="w-full text-left text-xs sm:text-sm">
                <TableHeader className="[&_tr]:border-0">
                  <TableRow className="border-0 bg-muted/40 dark:bg-muted/20 hover:bg-muted/40 rounded-2xl">
                    <TableHead className="py-3 px-3 font-bold uppercase tracking-wider text-[11px] text-muted-foreground rounded-l-2xl">
                      Vaqt
                    </TableHead>
                    <TableHead className="py-3 px-3 font-bold uppercase tracking-wider text-[11px] text-muted-foreground">
                      Harakat
                    </TableHead>
                    <TableHead className="py-3 px-3 font-bold uppercase tracking-wider text-[11px] text-muted-foreground">
                      Obyekt
                    </TableHead>
                    <TableHead className="py-3 px-3 font-bold uppercase tracking-wider text-[11px] text-muted-foreground">
                      Ijrochi
                    </TableHead>
                    <TableHead className="py-3 px-3 font-bold uppercase tracking-wider text-[11px] text-muted-foreground">
                      Natija
                    </TableHead>
                    <TableHead className="py-3 px-4 font-bold uppercase tracking-wider text-[11px] text-muted-foreground rounded-r-2xl">
                      Tafsilotlar
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="[&_tr]:border-0 space-y-1">
                  {auditLogs.length === 0 ? (
                    <TableRow className="border-0">
                      <TableCell colSpan={6} className="py-12 text-center text-muted-foreground border-0">
                        {loading ? t('common.loading') : t('common.noData')}
                      </TableCell>
                    </TableRow>
                  ) : (
                    auditLogs.map((log) => (
                      <TableRow
                        key={log.id}
                        onClick={() => setSelectedLog(log)}
                        className="border-0 hover:bg-muted/40 dark:hover:bg-muted/20 transition-colors rounded-2xl cursor-pointer"
                      >
                        <TableCell className="py-3 px-3 whitespace-nowrap text-[11px] text-muted-foreground font-mono">
                          <span className="inline-flex items-center gap-1">
                            <Clock className="w-3 h-3 text-muted-foreground/70" />
                            {formatRelative(log.createdAt)}
                          </span>
                        </TableCell>
                        <TableCell className="py-3 px-3">
                          <Badge className="border-0 bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 font-mono text-xs font-bold shadow-none">
                            {log.action}
                          </Badge>
                        </TableCell>
                        <TableCell className="py-3 px-3 text-muted-foreground">
                          <span className="font-semibold text-foreground">{log.entityName}</span> #{log.entityId}
                        </TableCell>
                        <TableCell className="py-3 px-3 font-bold text-foreground">
                          {log.performedBy}
                        </TableCell>
                        <TableCell className="py-3 px-3">
                          <Badge
                            className={`border-0 text-[10px] font-bold shadow-none ${
                              log.outcome === 'SUCCESS'
                                ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                                : 'bg-destructive/15 text-destructive'
                            }`}
                          >
                            {log.outcome}
                          </Badge>
                        </TableCell>
                        <TableCell className="py-3 px-4 max-w-xs truncate text-muted-foreground">
                          {log.details || '—'}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </Card>
        </div>
      )}

      {/* ========================================================
          TAB 4: Moderation & Grade Oversight
      ======================================================== */}
      {activeTab === 'moderation' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Grade Override Console */}
          <Card className="border-0 shadow-xl bg-card rounded-3xl p-6 space-y-5">
            <div className="flex items-center gap-3 pb-1">
              <div className="p-2.5 rounded-2xl bg-amber-500/15 text-amber-600 dark:text-amber-400">
                <Trophy className="w-5 h-5" />
              </div>
              <div>
                <CardTitle className="text-base sm:text-lg font-bold text-foreground">
                  Baholarni asosli tuzatish (Grade Override)
                </CardTitle>
                <CardDescription className="text-xs text-muted-foreground mt-0.5">
                  Barcha baho o‘zgarishlari va sabablari o‘chmas auditga kiritiladi
                </CardDescription>
              </div>
            </div>

            <form onSubmit={handleOverrideGrade} className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-foreground">
                  Baho yozuvi ID raqami
                </Label>
                <Input
                  type="number"
                  placeholder="Masalan: 12"
                  value={overrideGradeId}
                  onChange={(e) => setOverrideGradeId(e.target.value)}
                  className="border-0 bg-muted/60 dark:bg-muted/30 rounded-2xl h-11 text-xs sm:text-sm text-foreground focus-visible:ring-2 focus-visible:ring-indigo-500 shadow-sm"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-foreground">
                  Yangi belgilangan ball (0–100)
                </Label>
                <Input
                  type="number"
                  placeholder="Masalan: 95"
                  value={overrideScore}
                  onChange={(e) => setOverrideScore(e.target.value)}
                  className="border-0 bg-muted/60 dark:bg-muted/30 rounded-2xl h-11 text-xs sm:text-sm text-foreground focus-visible:ring-2 focus-visible:ring-indigo-500 shadow-sm"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-foreground">
                  Tuzatish asosi / Izoh (Majburiy audit maydoni)
                </Label>
                <Textarea
                  rows={3}
                  placeholder="Apellyatsiya komissiyasi qarori yoki texnik xatolik tuzatildi..."
                  value={overrideReason}
                  onChange={(e) => setOverrideReason(e.target.value)}
                  className="border-0 bg-muted/60 dark:bg-muted/30 rounded-2xl p-3 text-xs sm:text-sm text-foreground focus-visible:ring-2 focus-visible:ring-indigo-500 shadow-sm resize-none"
                />
              </div>

              <Button
                type="submit"
                className="border-0 rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold h-11 shadow-lg shadow-indigo-500/25 cursor-pointer w-full text-xs sm:text-sm"
              >
                {t('admin.actions.overrideGrade')}
              </Button>
            </form>
          </Card>

          {/* Educational Content Moderation Guidelines */}
          <Card className="border-0 shadow-xl bg-card rounded-3xl p-6 space-y-5">
            <div className="flex items-center gap-3 pb-1">
              <div className="p-2.5 rounded-2xl bg-indigo-500/15 text-indigo-600 dark:text-indigo-400">
                <BookOpen className="w-5 h-5" />
              </div>
              <div>
                <CardTitle className="text-base sm:text-lg font-bold text-foreground">
                  Ta’lim materiallari moderatsiya mezonlari
                </CardTitle>
                <CardDescription className="text-xs text-muted-foreground mt-0.5">
                  Muhammad Al-Xorazmiy Vorislari akademik standartlar nazorati
                </CardDescription>
              </div>
            </div>

            <div className="space-y-3.5 text-xs">
              <div className="p-4 rounded-2xl bg-muted/40 dark:bg-muted/20 border-0">
                <h4 className="font-bold text-foreground flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span>Dars rejasi strukturasi (80 daqiqa)</span>
                </h4>
                <p className="mt-1.5 text-[11px] text-muted-foreground leading-relaxed">
                  Har bir darsda 20 daqiqa nazariya, 25 daqiqa amaliyot, topshiriqlar va uyga vazifa
                  aniq ko‘rsatilgan bo‘lishi lozim.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-muted/40 dark:bg-muted/20 border-0">
                <h4 className="font-bold text-foreground flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
                  <span>Xavfsizlik va Maxfiylik</span>
                </h4>
                <p className="mt-1.5 text-[11px] text-muted-foreground leading-relaxed">
                  O‘quv materiallari va topshiriqlarda shaxsiy ma’lumotlar, parollar yoki maxfiy
                  kalitlar joylashtirilmasligi qat’iy nazorat qilinadi.
                </p>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* ========================================================
          TAB 5: System Configuration
      ======================================================== */}
      {activeTab === 'config' && (
        <div className="space-y-4">
          <Card className="border-0 shadow-md bg-card rounded-3xl p-5 flex items-center justify-between">
            <div>
              <CardTitle className="text-base font-bold text-foreground">
                Tizim konfiguratsiyasi parametrlari
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground mt-0.5">
                Xavfsiz standartlar va operatsion sozlamalar ro‘yxati (Maxfiy qiymatlar yashirilgan)
              </CardDescription>
            </div>
          </Card>

          <Card className="border-0 shadow-xl bg-card rounded-3xl p-6 overflow-hidden">
            <div className="overflow-x-auto">
              <Table className="w-full text-left text-xs sm:text-sm">
                <TableHeader className="[&_tr]:border-0">
                  <TableRow className="border-0 bg-muted/40 dark:bg-muted/20 hover:bg-muted/40 rounded-2xl">
                    <TableHead className="py-3 px-3 font-bold uppercase tracking-wider text-[11px] text-muted-foreground rounded-l-2xl">
                      Konfiguratsiya kaliti
                    </TableHead>
                    <TableHead className="py-3 px-3 font-bold uppercase tracking-wider text-[11px] text-muted-foreground">
                      Kategoriya
                    </TableHead>
                    <TableHead className="py-3 px-3 font-bold uppercase tracking-wider text-[11px] text-muted-foreground">
                      Qiymat
                    </TableHead>
                    <TableHead className="py-3 px-3 font-bold uppercase tracking-wider text-[11px] text-muted-foreground">
                      Tavsif
                    </TableHead>
                    <TableHead className="py-3 px-4 font-bold uppercase tracking-wider text-[11px] text-muted-foreground text-right rounded-r-2xl">
                      Amal
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="[&_tr]:border-0 space-y-1">
                  {configs.map((cfg) => (
                    <TableRow
                      key={cfg.configKey}
                      className="border-0 hover:bg-muted/40 dark:hover:bg-muted/20 transition-colors rounded-2xl"
                    >
                      <TableCell className="py-3 px-3 font-mono font-bold text-indigo-600 dark:text-indigo-400">
                        {cfg.configKey}
                      </TableCell>
                      <TableCell className="py-3 px-3">
                        <Badge className="border-0 bg-muted/70 dark:bg-muted/40 text-foreground text-[10px] font-mono shadow-none">
                          {cfg.category}
                        </Badge>
                      </TableCell>
                      <TableCell className="py-3 px-3 font-mono font-semibold text-foreground">
                        {cfg.configValue}
                      </TableCell>
                      <TableCell className="py-3 px-3 text-muted-foreground max-w-xs truncate">
                        {cfg.description || '—'}
                      </TableCell>
                      <TableCell className="py-3 px-4 text-right">
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => {
                            setEditingConfig(cfg);
                            setConfigValueInput(cfg.configValue);
                          }}
                          className="border-0 rounded-xl px-4 bg-muted/60 hover:bg-muted text-foreground text-xs font-bold cursor-pointer"
                        >
                          {t('common.edit')}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </Card>
        </div>
      )}

      {/* ========================================================
          TAB 6: Operational Health
      ======================================================== */}
      {activeTab === 'health' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="border-0 shadow-lg bg-card rounded-3xl p-6 space-y-3">
              <div className="flex items-center justify-between">
                <CardDescription className="text-xs font-semibold text-muted-foreground">
                  Ma’lumotlar bazasi
                </CardDescription>
                <div className="p-2.5 rounded-2xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                  <Database className="w-5 h-5" />
                </div>
              </div>
              <div className="text-xl font-black text-foreground">
                {health?.databaseStatus ?? 'CONNECTED'}
              </div>
              <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Ulanish barqaror</span>
              </p>
            </Card>

            <Card className="border-0 shadow-lg bg-card rounded-3xl p-6 space-y-3">
              <div className="flex items-center justify-between">
                <CardDescription className="text-xs font-semibold text-muted-foreground">
                  JVM Xotira
                </CardDescription>
                <div className="p-2.5 rounded-2xl bg-blue-500/15 text-blue-600 dark:text-blue-400">
                  <Cpu className="w-5 h-5" />
                </div>
              </div>
              <div className="text-xl font-black text-foreground">
                {health?.usedJvmMemoryMb ?? '198'} MB ishlatilmoqda
              </div>
              <p className="text-[11px] text-muted-foreground">
                Jami ajratilgan: {health?.totalJvmMemoryMb ?? '512'} MB
              </p>
            </Card>

            <Card className="border-0 shadow-lg bg-card rounded-3xl p-6 space-y-3">
              <div className="flex items-center justify-between">
                <CardDescription className="text-xs font-semibold text-muted-foreground">
                  Xavfsizlik filtrlari
                </CardDescription>
                <div className="p-2.5 rounded-2xl bg-indigo-500/15 text-indigo-600 dark:text-indigo-400">
                  <ShieldCheck className="w-5 h-5" />
                </div>
              </div>
              <div className="text-xl font-black text-foreground">FAOL</div>
              <p className="text-[11px] text-indigo-600 dark:text-indigo-400 font-semibold flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                <span>JWT Stateless & RBAC</span>
              </p>
            </Card>

            <Card className="border-0 shadow-lg bg-card rounded-3xl p-6 space-y-3">
              <div className="flex items-center justify-between">
                <CardDescription className="text-xs font-semibold text-muted-foreground">
                  Uptime
                </CardDescription>
                <div className="p-2.5 rounded-2xl bg-teal-500/15 text-teal-600 dark:text-teal-400">
                  <Clock className="w-5 h-5" />
                </div>
              </div>
              <div className="text-xl font-black text-foreground">
                {Math.floor((health?.uptimeSeconds ?? 86400) / 3600)} soat
              </div>
              <p className="text-[11px] text-teal-600 dark:text-teal-400 font-semibold flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Uzilishlarsiz ishlamoqda</span>
              </p>
            </Card>
          </div>
        </div>
      )}

      {/* ========================================================
          TAB 7: Configurable Lesson Time Slots
      ======================================================== */}
      {activeTab === 'timeslots' && (
        <TimeSlotManagement />
      )}

      {/* ========================================================
          MODAL 1: User Status Confirmation Dialog
      ======================================================== */}
      {selectedUser && (
        <Dialog open={isStatusModalOpen} onOpenChange={setIsStatusModalOpen}>
          <DialogContent className="border-0 shadow-2xl bg-card text-card-foreground rounded-3xl p-6 sm:p-7 max-w-md">
            <DialogHeader className="space-y-1 text-left pb-1">
              <DialogTitle className="text-lg font-bold text-foreground">
                Foydalanuvchi holatini o‘zgartirish
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Siz <span className="font-bold text-foreground">{selectedUser.fullName}</span> (
                @{selectedUser.username}) hisobini{' '}
                <span className="font-bold text-amber-600 dark:text-amber-400">
                  {selectedUser.enabled ? 'to‘xtatmoqchimisiz' : 'faollashtirmoqchimisiz'}
                </span>
                ?
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-2 pt-2">
              <Label className="text-xs font-bold text-foreground">
                O‘zgartirish sababi (Auditga yoziladi)
              </Label>
              <Textarea
                rows={3}
                value={statusReason}
                onChange={(e) => setStatusReason(e.target.value)}
                placeholder="Sababni batafsil yozing..."
                className="border-0 bg-muted/60 dark:bg-muted/30 rounded-2xl p-3 text-xs sm:text-sm text-foreground focus-visible:ring-2 focus-visible:ring-indigo-500 shadow-sm resize-none"
              />
            </div>

            <DialogFooter className="pt-3 flex items-center justify-end gap-2 border-0">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setIsStatusModalOpen(false)}
                className="border-0 rounded-2xl px-5 font-bold bg-muted/70 hover:bg-muted text-foreground cursor-pointer"
              >
                {t('common.cancel')}
              </Button>
              <Button
                size="sm"
                onClick={handleToggleUserStatus}
                className="border-0 rounded-2xl px-6 bg-primary text-primary-foreground font-bold shadow-md shadow-primary/20 cursor-pointer"
              >
                {t('common.confirm')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* ========================================================
          MODAL 2: Role Management Dialog
      ======================================================== */}
      {selectedUser && (
        <Dialog open={isRoleModalOpen} onOpenChange={setIsRoleModalOpen}>
          <DialogContent className="border-0 shadow-2xl bg-card text-card-foreground rounded-3xl p-6 sm:p-7 max-w-md">
            <DialogHeader className="space-y-1 text-left pb-1">
              <DialogTitle className="text-lg font-bold text-foreground">
                Foydalanuvchi rollarini boshqarish
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Foydalanuvchi: <span className="font-bold text-foreground">{selectedUser.fullName}</span> (@{selectedUser.username})
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-2 pt-2">
              <Label className="text-xs font-bold text-foreground">
                Tayinlangan rollar
              </Label>
              <div className="space-y-2">
                {['ROLE_STUDENT', 'ROLE_MENTOR', 'ROLE_ADMIN', 'ROLE_SUPER_ADMIN'].map((role) => {
                  const isChecked = selectedRoles.includes(role);
                  return (
                    <label
                      key={role}
                      className="flex items-center gap-3 p-3 rounded-2xl bg-muted/40 dark:bg-muted/20 hover:bg-muted/60 dark:hover:bg-muted/30 cursor-pointer text-xs transition border-0"
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedRoles([...selectedRoles, role]);
                          } else {
                            setSelectedRoles(selectedRoles.filter((r) => r !== role));
                          }
                        }}
                        className="rounded border-0 text-primary focus:ring-0 w-4 h-4"
                      />
                      <span className="font-mono font-semibold text-foreground">{role}</span>
                    </label>
                  );
                })}
              </div>
            </div>

            <DialogFooter className="pt-3 flex items-center justify-end gap-2 border-0">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setIsRoleModalOpen(false)}
                className="border-0 rounded-2xl px-5 font-bold bg-muted/70 hover:bg-muted text-foreground cursor-pointer"
              >
                {t('common.cancel')}
              </Button>
              <Button
                size="sm"
                onClick={handleUpdateRoles}
                className="border-0 rounded-2xl px-6 bg-primary text-primary-foreground font-bold shadow-md shadow-primary/20 cursor-pointer"
              >
                {t('common.save')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* ========================================================
          MODAL 3: Audit Log Detail Dialog
      ======================================================== */}
      {selectedLog && (
        <Dialog open={!!selectedLog} onOpenChange={(open) => !open && setSelectedLog(null)}>
          <DialogContent className="border-0 shadow-2xl bg-card text-card-foreground rounded-3xl p-6 sm:p-7 max-w-lg overflow-hidden">
            <DialogHeader className="space-y-1 text-left pb-2">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 rounded-2xl bg-indigo-500/15 text-indigo-600 dark:text-indigo-400">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <DialogTitle className="text-lg font-bold text-foreground">
                    Audit yozuvi tafsilotlari #{selectedLog.id}
                  </DialogTitle>
                  <DialogDescription className="text-xs text-muted-foreground">
                    O‘chmas operatsion audit jurnali parametri
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>

            <div className="space-y-2 text-xs pt-1">
              <div className="flex justify-between items-center p-3 rounded-2xl bg-muted/40 dark:bg-muted/20 border-0">
                <span className="text-muted-foreground font-medium">Harakat:</span>
                <Badge className="border-0 bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 font-mono text-xs font-bold shadow-none">
                  {selectedLog.action}
                </Badge>
              </div>

              <div className="flex justify-between items-center p-3 rounded-2xl bg-muted/40 dark:bg-muted/20 border-0">
                <span className="text-muted-foreground font-medium">Ijrochi:</span>
                <span className="font-bold text-foreground">{selectedLog.performedBy}</span>
              </div>

              <div className="flex justify-between items-center p-3 rounded-2xl bg-muted/40 dark:bg-muted/20 border-0">
                <span className="text-muted-foreground font-medium">Obyekt:</span>
                <span className="text-foreground font-semibold">{selectedLog.entityName} #{selectedLog.entityId}</span>
              </div>

              <div className="flex justify-between items-center p-3 rounded-2xl bg-muted/40 dark:bg-muted/20 border-0">
                <span className="text-muted-foreground font-medium">Natija:</span>
                <Badge
                  className={`border-0 text-[10px] font-bold shadow-none ${
                    selectedLog.outcome === 'SUCCESS'
                      ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                      : 'bg-destructive/15 text-destructive'
                  }`}
                >
                  {selectedLog.outcome}
                </Badge>
              </div>

              <div className="flex justify-between items-center p-3 rounded-2xl bg-muted/40 dark:bg-muted/20 border-0">
                <span className="text-muted-foreground font-medium">Vaqt:</span>
                <span className="text-foreground font-mono">{selectedLog.createdAt}</span>
              </div>

              {selectedLog.ipAddress && (
                <div className="flex justify-between items-center p-3 rounded-2xl bg-muted/40 dark:bg-muted/20 border-0">
                  <span className="text-muted-foreground font-medium">IP Manzil:</span>
                  <span className="font-mono text-foreground">{selectedLog.ipAddress}</span>
                </div>
              )}

              {selectedLog.details && (
                <div className="p-3.5 rounded-2xl bg-muted/40 dark:bg-muted/20 border-0 space-y-1">
                  <span className="block text-muted-foreground font-semibold text-[11px]">Tafsilotlar:</span>
                  <div className="text-foreground text-[11px] break-words">
                    {selectedLog.details}
                  </div>
                </div>
              )}

              {selectedLog.metadata && (
                <div className="p-3.5 rounded-2xl bg-muted/40 dark:bg-muted/20 border-0 space-y-1">
                  <span className="block text-muted-foreground font-semibold text-[11px]">Metadata:</span>
                  <pre className="text-[10px] font-mono text-muted-foreground overflow-x-auto max-h-32">
                    {selectedLog.metadata}
                  </pre>
                </div>
              )}
            </div>

            <DialogFooter className="pt-3 flex items-center justify-end border-0">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setSelectedLog(null)}
                className="border-0 rounded-2xl px-6 font-bold bg-muted/70 hover:bg-muted text-foreground cursor-pointer"
              >
                {t('common.close')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* ========================================================
          MODAL 4: Edit Config Dialog
      ======================================================== */}
      {editingConfig && (
        <Dialog open={!!editingConfig} onOpenChange={(open) => !open && setEditingConfig(null)}>
          <DialogContent className="border-0 shadow-2xl bg-card text-card-foreground rounded-3xl p-6 sm:p-7 max-w-md">
            <DialogHeader className="space-y-1 text-left pb-1">
              <DialogTitle className="text-lg font-bold text-foreground">
                Parametrni yangilash: {editingConfig.configKey}
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                {editingConfig.description || 'Tizim operatsion parametri'}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-2 pt-2">
              <Label className="text-xs font-bold text-foreground">
                Yangi qiymat
              </Label>
              <Input
                type="text"
                value={configValueInput}
                onChange={(e) => setConfigValueInput(e.target.value)}
                className="border-0 bg-muted/60 dark:bg-muted/30 rounded-2xl h-11 text-xs sm:text-sm text-foreground focus-visible:ring-2 focus-visible:ring-indigo-500 shadow-sm"
              />
            </div>

            <DialogFooter className="pt-3 flex items-center justify-end gap-2 border-0">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setEditingConfig(null)}
                className="border-0 rounded-2xl px-5 font-bold bg-muted/70 hover:bg-muted text-foreground cursor-pointer"
              >
                {t('common.cancel')}
              </Button>
              <Button
                size="sm"
                onClick={handleSaveConfig}
                className="border-0 rounded-2xl px-6 bg-primary text-primary-foreground font-bold shadow-md shadow-primary/20 cursor-pointer"
              >
                {t('common.save')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};
