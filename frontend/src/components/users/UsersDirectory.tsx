import React, { useState, useEffect } from 'react';
import {
  Users,
  Search,
  ShieldCheck,
  UserCheck,
  UserX,
  Key,
  Eye,
  ChevronLeft,
  ChevronRight,
  UserPlus,
  RefreshCw,
  X,
  Shield,
  Activity,
  UserCheck2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
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
import { userApi } from '@/api';
import { RoleAssignmentModal } from './RoleAssignmentModal';
import { UserDetailsModal } from './UserDetailsModal';
import { PermissionOverviewModal } from './PermissionOverviewModal';
import { CreateUserModal } from './CreateUserModal';
import type { UserDto } from '@/types';
import { cn } from '@/lib/utils';

export const UsersDirectory: React.FC = () => {
  const toast = useToast();

  const [users, setUsers] = useState<UserDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRole, setSelectedRole] = useState('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [currentPage, setCurrentPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [totalElements, setTotalElements] = useState(0);
  const pageSize = 8;

  // Selected modals
  const [activeUserForRole, setActiveUserForRole] = useState<UserDto | null>(null);
  const [activeUserForDetail, setActiveUserForDetail] = useState<UserDto | null>(null);
  const [userToToggleStatus, setUserToToggleStatus] = useState<UserDto | null>(null);
  const [isStatusDialogOpen, setIsStatusDialogOpen] = useState(false);
  const [isPermOverviewOpen, setIsPermOverviewOpen] = useState(false);
  const [isCreateUserOpen, setIsCreateUserOpen] = useState(false);
  const [isTogglingStatus, setIsTogglingStatus] = useState(false);

  useEffect(() => {
    fetchUsers();
  }, [searchQuery, selectedRole, selectedStatus, currentPage]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const res = await userApi.getUsers({
        query: searchQuery || undefined,
        role: selectedRole !== 'ALL' ? selectedRole : undefined,
        enabled: selectedStatus === 'ALL' ? undefined : selectedStatus === 'ACTIVE',
        page: currentPage,
        size: pageSize,
      });

      const pageData = res.data.data;
      setUsers(pageData.content || []);
      setTotalPages(pageData.totalPages || 1);
      setTotalElements(pageData.totalElements || 0);
    } catch (err) {
      console.error(err);
      toast.error('Xatolik', 'Foydalanuvchilarni yuklashda xatolik yuz berdi');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleStatus = async () => {
    if (!userToToggleStatus) return;
    try {
      setIsTogglingStatus(true);
      const newEnabled = !userToToggleStatus.enabled;
      await userApi.updateStatus(
        userToToggleStatus.id,
        newEnabled,
        newEnabled ? 'Admin tomonidan faollashtirildi' : 'Admin tomonidan to‘xtatildi'
      );
      toast.success(
        'Muvaffaqiyatli',
        `${userToToggleStatus.fullName} hisobi ${newEnabled ? 'faollashtirildi' : 'to‘xtatildi'}`
      );
      setIsStatusDialogOpen(false);
      setUserToToggleStatus(null);
      fetchUsers();
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Hisob holatini yangilashda xatolik';
      toast.error('Xatolik', msg);
    } finally {
      setIsTogglingStatus(false);
    }
  };

  const getRoleBadgeClasses = (role: string) => {
    if (role.includes('SUPER_ADMIN')) {
      return 'bg-red-500/10 text-red-600 dark:text-red-400 font-semibold border-0';
    }
    if (role.includes('PROGRAM_ADMIN') || role.includes('ADMIN')) {
      return 'bg-amber-500/10 text-amber-700 dark:text-amber-400 font-semibold border-0';
    }
    if (role.includes('MENTOR')) {
      return 'bg-blue-500/10 text-blue-600 dark:text-blue-400 font-semibold border-0';
    }
    if (role.includes('COORDINATOR')) {
      return 'bg-purple-500/10 text-purple-600 dark:text-purple-400 font-semibold border-0';
    }
    return 'bg-muted/80 text-foreground font-semibold border-0';
  };

  const activeCount = users.filter((u) => u.enabled).length;

  return (
    <div className="space-y-6 sm:space-y-7 animate-in fade-in duration-300 pb-12">
      {/* 1. TOP EXECUTIVE BANNER (Borderless, Luxury Ambient Style, matches Dashboard) */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 text-white shadow-xl border-0">
        {/* Soft Ambient Glows */}
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-indigo-500/15 rounded-full blur-3xl pointer-events-none -mr-32 -mt-32" />
        <div className="absolute bottom-0 left-1/3 w-[350px] h-[350px] bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="p-6 sm:p-8 lg:p-9 relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="flex items-start sm:items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center font-bold shadow-lg shadow-indigo-500/25 shrink-0">
              <Users className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white">
                  Foydalanuvchilar va Ko‘p Rolli RBAC Boshqaruvi
                </h1>
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
              </div>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed max-w-2xl">
                Barcha foydalanuvchilar katalogi, ko‘p rollar (Multi-Role) tayinlash va tizim ruxsatlari
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsPermOverviewOpen(true)}
              className="bg-white/10 hover:bg-white/15 text-white border-0 font-semibold rounded-xl backdrop-blur-md transition-colors"
            >
              <ShieldCheck className="w-4 h-4 mr-1.5 text-emerald-400" />
              <span>Ruxsatlar Matritsasi</span>
            </Button>

            <Button
              size="sm"
              onClick={() => setIsCreateUserOpen(true)}
              className="bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white shadow-lg shadow-indigo-600/30 font-semibold border-0 rounded-xl cursor-pointer"
            >
              <UserPlus className="w-4 h-4 mr-1.5" />
              <span>Yangi xodim qo‘shish</span>
            </Button>
          </div>
        </div>
      </div>

      {/* 2. QUICK STATS SUMMARY PILLARS (Borderless, Modern Dashboard Style) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-card text-card-foreground rounded-2xl p-5 shadow-[0_2px_14px_-2px_rgba(0,0,0,0.04)] dark:shadow-none border-0 flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block">
              Jami Foydalanuvchilar
            </span>
            <span className="text-2xl font-black text-foreground font-mono mt-1 block">
              {totalElements}
            </span>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
            <Users className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-card text-card-foreground rounded-2xl p-5 shadow-[0_2px_14px_-2px_rgba(0,0,0,0.04)] dark:shadow-none border-0 flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block">
              Faol Akkauntlar
            </span>
            <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400 font-mono mt-1 block">
              {activeCount}
            </span>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
            <UserCheck2 className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-card text-card-foreground rounded-2xl p-5 shadow-[0_2px_14px_-2px_rgba(0,0,0,0.04)] dark:shadow-none border-0 flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block">
              Tizim Rollari (RBAC)
            </span>
            <span className="text-2xl font-black text-indigo-600 dark:text-indigo-400 font-mono mt-1 block">
              8 ta rol
            </span>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
            <Shield className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-card text-card-foreground rounded-2xl p-5 shadow-[0_2px_14px_-2px_rgba(0,0,0,0.04)] dark:shadow-none border-0 flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block">
              Xavfsizlik Nazorati
            </span>
            <span className="text-2xl font-black text-purple-600 dark:text-purple-400 font-mono mt-1 block">
              Faol
            </span>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
            <Activity className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* 3. FILTERS & SEARCH BAR (Soft, Modern, Borderless Card) */}
      <div className="bg-card text-card-foreground rounded-2xl p-4 sm:p-5 shadow-[0_2px_14px_-2px_rgba(0,0,0,0.04)] dark:shadow-none border-0">
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
          <div className="sm:col-span-6">
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
              <Input
                placeholder="Ism, email, login yoki telefon orqali qidirish..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(0);
                }}
                className="pl-10 pr-9 h-11 bg-muted/40 hover:bg-muted/60 focus:bg-background border-0 rounded-xl focus-visible:ring-2 focus-visible:ring-primary/40 text-sm shadow-none transition-colors"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    setCurrentPage(0);
                  }}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-0.5 rounded-full transition-colors cursor-pointer"
                  title="Tozalash"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          <div className="sm:col-span-3">
            <select
              value={selectedRole}
              onChange={(e) => {
                setSelectedRole(e.target.value);
                setCurrentPage(0);
              }}
              className="w-full h-11 rounded-xl bg-muted/40 hover:bg-muted/60 focus:bg-background border-0 text-foreground text-xs sm:text-sm px-3.5 focus-visible:ring-2 focus-visible:ring-primary/40 shadow-none transition-colors cursor-pointer font-medium"
            >
              <option value="ALL">Barcha rollar</option>
              <option value="SUPER_ADMIN">SUPER_ADMIN</option>
              <option value="PROGRAM_ADMIN">PROGRAM_ADMIN</option>
              <option value="REGIONAL_COORDINATOR">REGIONAL_COORDINATOR</option>
              <option value="MENTOR">MENTOR</option>
              <option value="STUDENT">STUDENT</option>
              <option value="CONTENT_MANAGER">CONTENT_MANAGER</option>
              <option value="OBSERVER">OBSERVER</option>
            </select>
          </div>

          <div className="sm:col-span-3">
            <select
              value={selectedStatus}
              onChange={(e) => {
                setSelectedStatus(e.target.value);
                setCurrentPage(0);
              }}
              className="w-full h-11 rounded-xl bg-muted/40 hover:bg-muted/60 focus:bg-background border-0 text-foreground text-xs sm:text-sm px-3.5 focus-visible:ring-2 focus-visible:ring-primary/40 shadow-none transition-colors cursor-pointer font-medium"
            >
              <option value="ALL">Barcha holatlar</option>
              <option value="ACTIVE">Faqat Faol</option>
              <option value="SUSPENDED">To‘xtatilgan (Nofaol)</option>
            </select>
          </div>
        </div>
      </div>

      {/* 4. USERS DIRECTORY TABLE (shadcn Table, Borderless, Luxury Panel) */}
      <div className="bg-card text-card-foreground rounded-2xl p-6 shadow-[0_2px_14px_-2px_rgba(0,0,0,0.04)] dark:shadow-none border-0 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2">
          <div>
            <h2 className="text-base font-bold text-foreground">Foydalanuvchilar Ro‘yxati</h2>
            <p className="text-xs text-muted-foreground">
              Tizimdagi barcha akkauntlar va ularning ko‘p rolli ruxsat mezonlari
            </p>
          </div>
          <span className="text-xs text-muted-foreground font-medium">
            Jami: <span className="font-bold text-foreground">{totalElements} ta</span> foydalanuvchi
          </span>
        </div>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-b border-border/20 hover:bg-transparent">
                <TableHead className="font-bold text-xs text-muted-foreground uppercase tracking-wider py-3.5">
                  Foydalanuvchi
                </TableHead>
                <TableHead className="font-bold text-xs text-muted-foreground uppercase tracking-wider py-3.5">
                  Aloqa
                </TableHead>
                <TableHead className="font-bold text-xs text-muted-foreground uppercase tracking-wider py-3.5">
                  Biriktirilgan Rollar
                </TableHead>
                <TableHead className="font-bold text-xs text-muted-foreground uppercase tracking-wider py-3.5">
                  Holat
                </TableHead>
                <TableHead className="font-bold text-xs text-muted-foreground uppercase tracking-wider py-3.5 text-right">
                  Amallar
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-12 text-center text-xs text-muted-foreground">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-primary" />
                    <span>Foydalanuvchilar ma’lumotlari yuklanmoqda...</span>
                  </TableCell>
                </TableRow>
              ) : users.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-12 text-center text-xs text-muted-foreground">
                    Qidiruv mezoniga mos foydalanuvchilar topilmadi.
                  </TableCell>
                </TableRow>
              ) : (
                users.map((u) => (
                  <TableRow
                    key={u.id}
                    className="border-b border-border/10 hover:bg-muted/40 transition-colors"
                  >
                    <TableCell className="py-3.5">
                      <div className="flex items-center gap-3">
                        <Avatar className="w-9 h-9 rounded-xl bg-primary/10 text-primary font-bold text-xs flex items-center justify-center shrink-0">
                          <AvatarFallback className="rounded-xl font-bold bg-primary/10 text-primary">
                            {u.fullName?.slice(0, 2).toUpperCase() || 'U'}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-bold text-sm text-foreground">{u.fullName}</div>
                          <div className="text-[11px] font-mono text-muted-foreground">
                            @{u.username}
                          </div>
                        </div>
                      </div>
                    </TableCell>

                    <TableCell className="py-3.5">
                      <div className="text-sm font-medium text-foreground">{u.email || '—'}</div>
                      <div className="text-[11px] text-muted-foreground">{u.phone || '—'}</div>
                    </TableCell>

                    <TableCell className="py-3.5">
                      <div className="flex flex-wrap gap-1 max-w-xs">
                        {u.roles && u.roles.length > 0 ? (
                          u.roles.map((r) => (
                            <Badge
                              key={r}
                              variant="secondary"
                              className={cn('text-[11px] px-2 py-0.5 rounded-md font-semibold', getRoleBadgeClasses(r))}
                            >
                              {r}
                            </Badge>
                          ))
                        ) : (
                          <Badge
                            variant="secondary"
                            className="bg-muted text-muted-foreground text-[11px] px-2 py-0.5 rounded-md font-semibold border-0"
                          >
                            {u.primaryRole}
                          </Badge>
                        )}
                      </div>
                    </TableCell>

                    <TableCell className="py-3.5">
                      {u.enabled ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                          Faol
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-red-500/10 text-red-600 dark:text-red-400">
                          <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                          To‘xtatilgan
                        </span>
                      )}
                    </TableCell>

                    <TableCell className="py-3.5 text-right">
                      <div className="inline-flex items-center gap-1.5">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setActiveUserForDetail(u)}
                          className="h-8 w-8 p-0 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted"
                          title="Tafsilotlar va ruxsatlar"
                        >
                          <Eye className="w-4 h-4" />
                        </Button>

                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => setActiveUserForRole(u)}
                          className="h-8 rounded-lg gap-1.5 text-xs font-semibold border-0 bg-muted/60 hover:bg-muted text-foreground"
                          title="Rollarni biriktirish"
                        >
                          <Key className="w-3.5 h-3.5 text-primary" />
                          <span>Rollar</span>
                        </Button>

                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setUserToToggleStatus(u);
                            setIsStatusDialogOpen(true);
                          }}
                          className={cn(
                            'h-8 w-8 p-0 rounded-lg transition-colors',
                            u.enabled
                              ? 'text-red-600 hover:text-red-700 hover:bg-red-500/10'
                              : 'text-emerald-600 hover:text-emerald-700 hover:bg-emerald-500/10'
                          )}
                          title={u.enabled ? 'Hisobni to‘xtatish' : 'Hisobni faollashtirish'}
                        >
                          {u.enabled ? <UserX className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination bar */}
        <div className="flex items-center justify-between pt-4 border-t border-border/15 text-xs text-muted-foreground">
          <span>
            Sahifa <strong className="text-foreground">{currentPage + 1}</strong> / {totalPages}
          </span>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage === 0}
              onClick={() => setCurrentPage((p) => Math.max(0, p - 1))}
              className="rounded-xl border-0 bg-muted/40 hover:bg-muted/70 text-foreground h-8 px-3"
            >
              <ChevronLeft className="w-4 h-4 mr-1" />
              <span>Oldingi</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage >= totalPages - 1}
              onClick={() => setCurrentPage((p) => p + 1)}
              className="rounded-xl border-0 bg-muted/40 hover:bg-muted/70 text-foreground h-8 px-3"
            >
              <span>Keyingi</span>
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        </div>
      </div>

      {/* Modals */}
      <RoleAssignmentModal
        user={activeUserForRole}
        isOpen={Boolean(activeUserForRole)}
        onClose={() => setActiveUserForRole(null)}
        onSuccess={fetchUsers}
      />

      <UserDetailsModal
        user={activeUserForDetail}
        isOpen={Boolean(activeUserForDetail)}
        onClose={() => setActiveUserForDetail(null)}
        onOpenRoleModal={() => {
          setActiveUserForRole(activeUserForDetail);
        }}
      />

      <PermissionOverviewModal
        isOpen={isPermOverviewOpen}
        onClose={() => setIsPermOverviewOpen(false)}
      />

      {/* Confirmation Dialog with shadcn Dialog */}
      {isStatusDialogOpen && userToToggleStatus && (
        <Dialog open={isStatusDialogOpen} onOpenChange={(open) => !open && setIsStatusDialogOpen(false)}>
          <DialogContent className="max-w-md p-6 sm:p-7 rounded-3xl border-0 shadow-2xl bg-card text-card-foreground">
            <DialogHeader className="space-y-2">
              <div
                className={cn(
                  'w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 mb-1',
                  userToToggleStatus.enabled
                    ? 'bg-red-500/10 text-red-600 dark:text-red-400'
                    : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                )}
              >
                {userToToggleStatus.enabled ? <UserX className="w-5 h-5" /> : <UserCheck className="w-5 h-5" />}
              </div>
              <DialogTitle className="text-lg font-bold text-foreground">
                {userToToggleStatus.enabled ? 'Hisobni to‘xtatish' : 'Hisobni faollashtirish'}
              </DialogTitle>
              <DialogDescription className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                {userToToggleStatus.enabled
                  ? `Haqiqatan ham ${userToToggleStatus.fullName} hisobini to‘xtatmoqchimisiz? Foydalanuvchi tizimga kira olmaydi.`
                  : `Haqiqatan ham ${userToToggleStatus.fullName} hisobini faollashtirmoqchimisiz?`}
              </DialogDescription>
            </DialogHeader>

            <DialogFooter className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-4">
              <Button
                variant="ghost"
                onClick={() => setIsStatusDialogOpen(false)}
                disabled={isTogglingStatus}
                className="rounded-xl border-0"
              >
                Bekor qilish
              </Button>
              <Button
                variant={userToToggleStatus.enabled ? 'destructive' : 'default'}
                onClick={handleToggleStatus}
                disabled={isTogglingStatus}
                className="rounded-xl border-0 font-semibold"
              >
                {isTogglingStatus && <RefreshCw className="w-4 h-4 animate-spin mr-1.5" />}
                <span>{userToToggleStatus.enabled ? 'To‘xtatish' : 'Faollashtirish'}</span>
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
      {/* Create User Modal */}
      <CreateUserModal
        isOpen={isCreateUserOpen}
        onClose={() => setIsCreateUserOpen(false)}
        onSuccess={fetchUsers}
      />
    </div>
  );
};
