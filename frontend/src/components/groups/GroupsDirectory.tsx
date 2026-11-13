import React, { useState, useEffect } from 'react';
import {
  Users,
  Search,
  Plus,
  GraduationCap,
  Calendar,
  Clock,
  MapPin,
  Archive,
  RefreshCw,
  UserPlus,
  ArrowRight,
  LayoutGrid,
  List,
  BarChart3,
  Layers,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { groupStructureApi, branchApi } from '@/api';
import { GroupDetailsModal } from './GroupDetailsModal';
import { StudentEnrollmentModal } from './StudentEnrollmentModal';
import { CreateGroupModal } from './CreateGroupModal';
import { EditGroupModal } from './EditGroupModal';
import { Edit2 } from 'lucide-react';
import type { StudyGroup, Mentor, Student, BranchDto } from '@/types';

interface GroupsDirectoryProps {
  initialGroups?: StudyGroup[];
  mentors: Mentor[];
  students: Student[];
  branches?: BranchDto[];
  onRefreshParent?: () => void;
}

export const GroupsDirectory: React.FC<GroupsDirectoryProps> = ({
  initialGroups = [],
  mentors,
  students,
  branches: initialBranches = [],
  onRefreshParent,
}) => {
  const [branches, setBranches] = useState<BranchDto[]>(initialBranches);
  const [groups, setGroups] = useState<StudyGroup[]>(initialGroups);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedGrade, setSelectedGrade] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedBranch, setSelectedBranch] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');

  useEffect(() => {
    if (branchApi && typeof branchApi.getAll === 'function') {
      branchApi
        .getAll()
        .then((res) => {
          if (res?.data?.data) {
            setBranches(res.data.data);
          }
        })
        .catch(() => {});
    }
  }, []);

  // Modals
  const [selectedGroupId, setSelectedGroupId] = useState<number | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isEnrollOpen, setIsEnrollOpen] = useState(false);
  const [enrollGroup, setEnrollGroup] = useState<StudyGroup | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<StudyGroup | null>(null);

  const loadGroups = async () => {
    try {
      setLoading(true);
      const res = await groupStructureApi.getAll(
        selectedGrade === 'all' ? undefined : selectedGrade,
        undefined,
        selectedStatus === 'all' ? undefined : selectedStatus,
        search || undefined,
        selectedBranch === 'all' ? undefined : Number(selectedBranch)
      );
      setGroups(res.data);
    } catch (err) {
      console.error('Failed to load groups:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadGroups();
  }, [selectedGrade, selectedStatus, selectedBranch]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadGroups();
  };

  const handleToggleStatus = async (group: StudyGroup, e: React.MouseEvent) => {
    e.stopPropagation();
    const newStatus = group.status === 'ACTIVE' ? 'ARCHIVED' : 'ACTIVE';
    const actionText = newStatus === 'ARCHIVED' ? 'arxivlashni' : 'faollashtirishni';
    const displayName = group.name || group.groupCode;
    if (!window.confirm(`Haqiqatan ham "${displayName}" guruhini ${actionText} xohlaysizmi?`)) {
      return;
    }
    try {
      await groupStructureApi.updateStatus(group.id, newStatus);
      loadGroups();
      onRefreshParent?.();
    } catch {
      alert("Guruh holatini o'zgartirishda xatolik yuz berdi");
    }
  };

  const handleOpenDetail = (groupId: number) => {
    setSelectedGroupId(groupId);
    setIsDetailOpen(true);
  };

  const handleOpenEnroll = (group: StudyGroup, e: React.MouseEvent) => {
    e.stopPropagation();
    setEnrollGroup(group);
    setIsEnrollOpen(true);
  };

  const gradeFilterOptions = ['all', '8-sinf', '9-sinf', '10-sinf', '11-sinf'];
  const statusFilterOptions = [
    { value: 'all', label: 'Barcha holatlar' },
    { value: 'ACTIVE', label: 'Faol guruhlar' },
    { value: 'ARCHIVED', label: 'Arxivlangan' },
    { value: 'COMPLETED', label: 'Tamomlagan' },
  ];

  // Executive summary metrics
  const totalGroups = groups.length;
  const activeGroupsCount = groups.filter((g) => g.status === 'ACTIVE').length;
  const totalStudents = groups.reduce((acc, g) => acc + (g.studentCount || 0), 0);
  const avgCapacity = totalGroups > 0
    ? Math.round(
        (groups.reduce((acc, g) => acc + ((g.studentCount || 0) / (g.maxCapacity || 16)), 0) /
          totalGroups) *
          100
      )
    : 0;

  return (
    <div className="space-y-6 animate-fade-in-up">
      {/* 1. Header Banner */}
      <div className="bg-card text-card-foreground rounded-2xl p-6 shadow-[0_2px_14px_-2px_rgba(0,0,0,0.04)] dark:shadow-none flex flex-col md:flex-row md:items-center justify-between gap-4 border-0">
        <div>
          <div className="flex items-center space-x-3 mb-1">
            <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center font-bold">
              <GraduationCap className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-extrabold text-foreground tracking-tight">
                  O'quv Tuzilmasi & Guruhlar Boshqaruvi
                </h1>
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                8–11-sinflar bo‘yicha guruhlar, mentorlar taqsimoti, laboratoriya sig‘imi va a’zolik
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={loadGroups}
            disabled={loading}
            title="Yangilash"
            className="rounded-xl border-0 bg-muted/40 hover:bg-muted text-foreground"
          >
            <RefreshCw className={cn('w-4 h-4', loading && 'animate-spin')} />
          </Button>
          <Button
            variant="default"
            size="sm"
            onClick={() => setIsCreateOpen(true)}
            className="rounded-xl shadow-xs gap-1.5 font-semibold text-xs"
          >
            <Plus className="w-4 h-4" />
            <span>Yangi guruh ochish</span>
          </Button>
        </div>
      </div>

      {/* 2. Executive KPI Cards (Soft, Borderless Modern Design) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-card text-card-foreground rounded-2xl p-4 sm:p-5 shadow-[0_2px_14px_-2px_rgba(0,0,0,0.04)] dark:shadow-none border-0 flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-medium text-muted-foreground">Jami guruhlar</span>
            <div className="text-2xl font-extrabold text-foreground">{totalGroups} ta</div>
            <span className="text-[11px] text-muted-foreground">8–11-sinflar umumiy</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
            <Layers className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-card text-card-foreground rounded-2xl p-4 sm:p-5 shadow-[0_2px_14px_-2px_rgba(0,0,0,0.04)] dark:shadow-none border-0 flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-medium text-muted-foreground">Faol dars guruhlari</span>
            <div className="text-2xl font-extrabold text-foreground">{activeGroupsCount} ta</div>
            <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">Faoliyat davom etmoqda</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
            <GraduationCap className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-card text-card-foreground rounded-2xl p-4 sm:p-5 shadow-[0_2px_14px_-2px_rgba(0,0,0,0.04)] dark:shadow-none border-0 flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-medium text-muted-foreground">O‘quvchilar a’zoligi</span>
            <div className="text-2xl font-extrabold text-foreground">{totalStudents} nafar</div>
            <span className="text-[11px] text-muted-foreground">Guruhlarga biriktirilgan</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-sky-500/10 text-sky-600 dark:text-sky-400 flex items-center justify-center">
            <Users className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-card text-card-foreground rounded-2xl p-4 sm:p-5 shadow-[0_2px_14px_-2px_rgba(0,0,0,0.04)] dark:shadow-none border-0 flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-medium text-muted-foreground">O‘rtacha laboratoriya sig‘imi</span>
            <div className="text-2xl font-extrabold text-foreground">{avgCapacity}%</div>
            <span className="text-[11px] text-muted-foreground">16 o‘rinlik me’yor bo‘yicha</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
            <BarChart3 className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* 3. Filter and Search Bar */}
      <div className="bg-card text-card-foreground rounded-2xl p-3.5 shadow-xs border-0 flex flex-col md:flex-row gap-3 items-center justify-between">
        <form onSubmit={handleSearchSubmit} className="flex-1 w-full md:w-auto">
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Guruh nomi, mentor yoki o'quv xonasi bo'yicha qidirish..."
            leftIcon={<Search className="w-4 h-4 text-muted-foreground" />}
            className="bg-muted/40 border-0 text-xs h-10 rounded-xl focus-visible:ring-1 focus-visible:ring-primary w-full"
          />
        </form>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto justify-between md:justify-end">
          {/* Grade filter buttons */}
          <div className="flex bg-muted/50 p-1 rounded-xl text-xs font-semibold gap-1 overflow-x-auto">
            {gradeFilterOptions.map((grade) => {
              const isSelected = selectedGrade === grade;
              return (
                <button
                  key={grade}
                  type="button"
                  onClick={() => setSelectedGrade(grade)}
                  className={cn(
                    'px-3 py-1.5 rounded-lg transition-all cursor-pointer text-xs font-medium border-0',
                    isSelected
                      ? 'bg-card text-foreground shadow-xs font-bold'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'
                  )}
                >
                  {grade === 'all' ? 'Barcha sinflar' : grade}
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-2">
            {/* Branch filter */}
            <select
              value={selectedBranch}
              onChange={(e) => setSelectedBranch(e.target.value)}
              aria-label="Filial filtri"
              className="text-xs h-9 rounded-xl bg-muted/40 border-0 px-3 py-1.5 text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary cursor-pointer font-medium"
            >
              <option value="all">Barcha filiallar</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>

            {/* Status filter */}
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              aria-label="Holat filtri"
              className="text-xs h-9 rounded-xl bg-muted/40 border-0 px-3 py-1.5 text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary cursor-pointer font-medium"
            >
              {statusFilterOptions.map((opt) => (
                <option key={opt.value} value={opt.value} className="bg-popover text-popover-foreground">
                  {opt.label}
                </option>
              ))}
            </select>

            {/* View Mode Switcher */}
            <div className="flex items-center rounded-xl p-0.5 bg-muted/50">
              <Button
                type="button"
                variant={viewMode === 'grid' ? 'default' : 'ghost'}
                size="icon"
                onClick={() => setViewMode('grid')}
                className={cn(
                  'h-8 w-8 rounded-lg cursor-pointer border-0',
                  viewMode === 'grid'
                    ? 'bg-card text-foreground shadow-xs'
                    : 'text-muted-foreground hover:text-foreground'
                )}
                title="Karta ko‘rinishi"
              >
                <LayoutGrid className="w-4 h-4" />
              </Button>
              <Button
                type="button"
                variant={viewMode === 'table' ? 'default' : 'ghost'}
                size="icon"
                onClick={() => setViewMode('table')}
                className={cn(
                  'h-8 w-8 rounded-lg cursor-pointer border-0',
                  viewMode === 'table'
                    ? 'bg-card text-foreground shadow-xs'
                    : 'text-muted-foreground hover:text-foreground'
                )}
                title="Jadval ko‘rinishi"
              >
                <List className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* 4. Groups Content */}
      {loading && groups.length === 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="rounded-2xl p-5 border-0 shadow-[0_2px_14px_-2px_rgba(0,0,0,0.04)] dark:shadow-none space-y-4">
              <div className="flex justify-between items-center">
                <Skeleton className="h-5 w-20 rounded-full bg-muted/60" />
                <Skeleton className="h-5 w-16 rounded-full bg-muted/60" />
              </div>
              <Skeleton className="h-6 w-3/4 rounded-md bg-muted/60" />
              <Skeleton className="h-4 w-1/2 rounded-md bg-muted/60" />
              <Skeleton className="h-14 w-full rounded-xl bg-muted/40" />
              <div className="grid grid-cols-2 gap-2">
                <Skeleton className="h-4 w-full bg-muted/60" />
                <Skeleton className="h-4 w-full bg-muted/60" />
              </div>
              <Skeleton className="h-2 w-full rounded-full bg-muted/40" />
              <div className="flex justify-between pt-2">
                <Skeleton className="h-8 w-24 rounded-lg bg-muted/60" />
                <Skeleton className="h-8 w-24 rounded-lg bg-muted/60" />
              </div>
            </Card>
          ))}
        </div>
      ) : groups.length === 0 ? (
        <Card className="rounded-2xl p-12 text-center border-0 shadow-xs bg-card">
          <Users className="w-12 h-12 text-muted-foreground/40 mx-auto mb-3" />
          <h3 className="text-sm font-bold text-foreground">Hech qanday guruh topilmadi</h3>
          <p className="text-xs text-muted-foreground mt-1 mb-4">
            Qidiruv shartlarini o'zgartiring yoki yangi guruh yarating.
          </p>
          <Button
            variant="default"
            size="sm"
            onClick={() => setIsCreateOpen(true)}
            className="rounded-xl font-semibold text-xs"
          >
            Yangi guruh ochish
          </Button>
        </Card>
      ) : viewMode === 'grid' ? (
        /* Grid Cards View */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {groups.map((group) => {
            const studentCount = group.studentCount ?? 0;
            const maxCap = group.maxCapacity || 16;
            const capacityRatio = Math.min(100, Math.round((studentCount / maxCap) * 100));
            const isFull = studentCount >= maxCap;

            return (
              <Card
                key={group.id}
                onClick={() => handleOpenDetail(group.id)}
                className="group relative bg-card text-card-foreground rounded-2xl p-5 shadow-[0_2px_14px_-2px_rgba(0,0,0,0.04)] dark:shadow-none hover:shadow-lg hover:-translate-y-1 transition-all duration-300 cursor-pointer flex flex-col justify-between border-0"
              >
                <div>
                  {/* Top badges */}
                  <div className="flex items-center justify-between mb-3">
                    <Badge variant="secondary" className="font-semibold text-xs rounded-full px-2.5 py-0.5 border-0">
                      {group.gradeLevel}
                    </Badge>
                    <Badge
                      variant={
                        group.status === 'ACTIVE'
                          ? 'success'
                          : group.status === 'ARCHIVED'
                          ? 'neutral'
                          : 'warning'
                      }
                      className="text-[10px] rounded-full px-2.5 py-0.5 border-0"
                    >
                      {group.status === 'ACTIVE'
                        ? 'Faol'
                        : group.status === 'ARCHIVED'
                        ? 'Arxivlangan'
                        : group.status}
                    </Badge>
                  </div>

                  {/* Group Name & Room */}
                  <CardTitle className="text-base font-bold text-foreground group-hover:text-primary transition-colors mb-1 line-clamp-1">
                    {group.name || group.groupCode}
                  </CardTitle>
                  <div className="flex items-center text-xs text-muted-foreground mb-3 space-x-1.5 flex-wrap gap-y-1">
                    <div className="flex items-center space-x-1">
                      <MapPin className="w-3.5 h-3.5 text-muted-foreground" />
                      <span>{group.roomLocation || group.room || 'Xona belgilanmagan'}</span>
                    </div>
                    {(group.branch?.name || group.branchLocation) && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-muted text-muted-foreground font-medium">
                        {group.branch?.name || group.branchLocation}
                      </span>
                    )}
                  </div>

                  {/* Mentor Info (Soft background, no border) */}
                  <div className="bg-muted/40 rounded-xl p-3 mb-3 border-0">
                    <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                      Biriktirilgan Mentor
                    </div>
                    {group.mentor ? (
                      <div className="flex items-center space-x-2.5">
                        <Avatar className="w-7 h-7 rounded-lg ring-0 border-0">
                          <AvatarFallback className="text-xs font-bold bg-primary/10 text-primary rounded-lg border-0">
                            {group.mentor.fullName.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="truncate">
                          <div className="text-xs font-bold text-foreground truncate">
                            {group.mentor.fullName}
                          </div>
                          <div className="text-[10px] text-muted-foreground truncate">{group.mentor.role}</div>
                        </div>
                      </div>
                    ) : (
                      <div className="text-xs text-muted-foreground italic">Mentor belgilanmagan</div>
                    )}
                  </div>

                  {/* Schedule Details */}
                  <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground mb-4">
                    <div className="flex items-center space-x-1.5 truncate">
                      <Calendar className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                      <span className="truncate">{group.lessonDays || group.scheduleDays || 'Dush-Chor-Jum'}</span>
                    </div>
                    <div className="flex items-center space-x-1.5 truncate">
                      <Clock className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                      <span className="truncate">{group.lessonTime || group.scheduleTime || '14:00 - 16:00'}</span>
                    </div>
                  </div>

                  {/* Capacity Progress Bar */}
                  <div className="space-y-1.5 mb-2">
                    <div className="flex items-center justify-between text-xs font-semibold">
                      <span className="text-muted-foreground">Guruh sig'imi:</span>
                      <span className={isFull ? 'text-destructive font-bold' : 'text-foreground font-semibold'}>
                        {studentCount} / {maxCap} {isFull ? '(To‘lgan)' : ''}
                      </span>
                    </div>
                    <Progress
                      value={capacityRatio}
                      className="h-2 bg-muted/60 border-0"
                      indicatorClassName={
                        isFull
                          ? 'bg-destructive'
                          : capacityRatio > 75
                          ? 'bg-amber-500'
                          : 'bg-primary'
                      }
                    />
                  </div>
                </div>

                {/* Footer Buttons */}
                <div className="pt-3 flex items-center justify-between gap-2 mt-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={(e) => handleOpenEnroll(group, e)}
                    disabled={isFull}
                    className="h-8 text-xs font-semibold rounded-lg gap-1 border-0"
                    title={isFull ? "Guruh sig'imi to'lgan" : "O'quvchi biriktirish"}
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    <span>Biriktirish</span>
                  </Button>

                  <div className="flex items-center space-x-1.5">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingGroup(group);
                      }}
                      className="h-8 w-8 rounded-lg text-muted-foreground hover:text-foreground border-0"
                      title="Guruhni tahrirlash"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </Button>

                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(e) => handleToggleStatus(group, e)}
                      className="h-8 w-8 rounded-lg text-muted-foreground hover:text-foreground border-0"
                      title={group.status === 'ACTIVE' ? 'Guruhni arxivlash' : 'Qayta faollashtirish'}
                    >
                      <Archive className="w-3.5 h-3.5" />
                    </Button>

                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => handleOpenDetail(group.id)}
                      className="h-8 text-xs font-semibold rounded-lg border-0 bg-muted/60 hover:bg-muted gap-1"
                    >
                      <span>Tafsilot</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      ) : (
        /* Table View */
        <Card className="rounded-2xl overflow-hidden border-0 shadow-[0_2px_14px_-2px_rgba(0,0,0,0.04)] dark:shadow-none bg-card">
          <Table>
            <TableHeader className="bg-muted/40 border-0 [&_tr]:border-b-0">
              <TableRow className="border-0 border-b-0 hover:bg-transparent">
                <TableHead className="text-xs font-semibold text-muted-foreground border-0">Guruh nomi</TableHead>
                <TableHead className="text-xs font-semibold text-muted-foreground border-0">Sinf</TableHead>
                <TableHead className="text-xs font-semibold text-muted-foreground border-0">Biriktirilgan Mentor</TableHead>
                <TableHead className="text-xs font-semibold text-muted-foreground border-0">Xona</TableHead>
                <TableHead className="text-xs font-semibold text-muted-foreground border-0">Dars vaqti</TableHead>
                <TableHead className="text-xs font-semibold text-muted-foreground border-0">Sig'im</TableHead>
                <TableHead className="text-xs font-semibold text-muted-foreground border-0">Holat</TableHead>
                <TableHead className="text-right text-xs font-semibold text-muted-foreground border-0">Amallar</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {groups.map((group) => {
                const studentCount = group.studentCount ?? 0;
                const maxCap = group.maxCapacity || 16;
                const capacityRatio = Math.min(100, Math.round((studentCount / maxCap) * 100));
                const isFull = studentCount >= maxCap;

                return (
                  <TableRow
                    key={group.id}
                    onClick={() => handleOpenDetail(group.id)}
                    className="hover:bg-muted/30 border-0 border-b-0 transition-colors cursor-pointer"
                  >
                    <TableCell className="font-bold text-xs text-foreground py-3.5 border-0">
                      {group.name || group.groupCode}
                    </TableCell>
                    <TableCell className="py-3.5 border-0">
                      <Badge variant="secondary" className="text-xs font-semibold rounded-full border-0">
                        {group.gradeLevel}
                      </Badge>
                    </TableCell>
                    <TableCell className="py-3.5 border-0">
                      {group.mentor ? (
                        <div className="flex items-center gap-2">
                          <Avatar className="w-6 h-6 rounded-md ring-0 border-0">
                            <AvatarFallback className="text-[10px] font-bold bg-primary/10 text-primary rounded-md border-0">
                              {group.mentor.fullName.charAt(0)}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-xs font-medium text-foreground">{group.mentor.fullName}</span>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground italic">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground py-3.5 border-0">
                      {group.roomLocation || group.room || 'Xona yo‘q'}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground py-3.5 border-0">
                      {group.lessonDays || group.scheduleDays} ({group.lessonTime || group.scheduleTime})
                    </TableCell>
                    <TableCell className="py-3.5 border-0">
                      <div className="flex items-center gap-2 w-28">
                        <Progress
                          value={capacityRatio}
                          className="h-1.5 bg-muted/60 border-0"
                          indicatorClassName={
                            isFull
                              ? 'bg-destructive'
                              : capacityRatio > 75
                              ? 'bg-amber-500'
                              : 'bg-primary'
                          }
                        />
                        <span className="text-[11px] font-semibold text-muted-foreground shrink-0">
                          {studentCount}/{maxCap}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="py-3.5 border-0">
                      <Badge
                        variant={
                          group.status === 'ACTIVE'
                            ? 'success'
                            : group.status === 'ARCHIVED'
                            ? 'neutral'
                            : 'warning'
                        }
                        className="text-[10px] rounded-full border-0"
                      >
                        {group.status === 'ACTIVE'
                          ? 'Faol'
                          : group.status === 'ARCHIVED'
                          ? 'Arxivlangan'
                          : group.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right py-3.5 border-0" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={(e) => handleOpenEnroll(group, e)}
                          disabled={isFull}
                          className="h-7 text-xs rounded-lg px-2 border-0"
                          title="Biriktirish"
                        >
                          <UserPlus className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingGroup(group);
                          }}
                          className="h-7 w-7 rounded-lg text-muted-foreground hover:text-foreground border-0"
                          title="Tahrirlash"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => handleToggleStatus(group, e)}
                          className="h-7 w-7 rounded-lg text-muted-foreground hover:text-foreground border-0"
                          title={group.status === 'ACTIVE' ? 'Arxivlash' : 'Faollashtirish'}
                        >
                          <Archive className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => handleOpenDetail(group.id)}
                          className="h-7 text-xs rounded-lg border-0 bg-muted/60 hover:bg-muted px-2.5"
                        >
                          Tafsilot
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Card>
      )}

      {/* 5. Modals */}
      <GroupDetailsModal
        groupId={selectedGroupId}
        isOpen={isDetailOpen}
        onClose={() => {
          setIsDetailOpen(false);
          setSelectedGroupId(null);
        }}
        availableGroups={groups}
        allStudents={students}
        onRefreshParent={() => {
          loadGroups();
          onRefreshParent?.();
        }}
      />

      {enrollGroup && (
        <StudentEnrollmentModal
          groupId={enrollGroup.id}
          groupCode={enrollGroup.groupCode}
          isOpen={isEnrollOpen}
          onClose={() => {
            setIsEnrollOpen(false);
            setEnrollGroup(null);
          }}
          allStudents={students}
          onSuccess={() => {
            loadGroups();
            onRefreshParent?.();
          }}
        />
      )}

      <CreateGroupModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        mentors={mentors}
        branches={branches}
        onSuccess={() => {
          loadGroups();
          onRefreshParent?.();
        }}
      />

      {editingGroup && (
        <EditGroupModal
          isOpen={!!editingGroup}
          group={editingGroup}
          mentors={mentors}
          branches={branches}
          onClose={() => setEditingGroup(null)}
          onSuccess={() => {
            loadGroups();
            onRefreshParent?.();
          }}
        />
      )}
    </div>
  );
};
