import React, { useState, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Building2,
  Users,
  GraduationCap,
  Award,
  Layers,
  MapPin,
  Phone,
  Mail,
  Calendar,
  Percent,
  AlertTriangle,
  Search,
  Plus,
  Edit2,
  Trash2,
  Clock,
  AlertCircle,
} from 'lucide-react';
import {
  useBranchStatistics,
  useBranchGroups,
  useBranchRooms,
  useBranchMentors,
  useBranchActivity,
  useCreateBranchRoom,
  useUpdateBranchRoom,
  useDeleteBranchRoom,
} from './useBranches';
import { useI18n } from '@/shared/i18n';
import type { BranchDto, BranchRoomDto, CreateRoomRequest, UpdateRoomRequest } from '@/types';

interface BranchDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  branch: BranchDto | null;
  onEdit?: (branch: BranchDto) => void;
}

export const BranchDetailsModal: React.FC<BranchDetailsModalProps> = ({
  isOpen,
  onClose,
  branch,
  onEdit,
}) => {
  const { t } = useI18n();
  const [activeTab, setActiveTab] = useState<string>('overview');

  // Groups tab filters
  const [groupSearch, setGroupSearch] = useState('');
  const [gradeFilter, setGradeFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Room modal state
  const [isRoomDialogOpen, setIsRoomDialogOpen] = useState(false);
  const [editingRoom, setEditingRoom] = useState<BranchRoomDto | null>(null);
  const [roomName, setRoomName] = useState('');
  const [roomType, setRoomType] = useState('IT_LAB');
  const [roomCapacity, setRoomCapacity] = useState(16);
  const [roomStatus, setRoomStatus] = useState('ACTIVE');
  const [roomError, setRoomError] = useState<string | null>(null);

  // Queries
  const { data: stats, isLoading: statsLoading } = useBranchStatistics(branch?.id);
  const { data: groups = [], isLoading: groupsLoading } = useBranchGroups(branch?.id);
  const { data: rooms = [], isLoading: roomsLoading } = useBranchRooms(branch?.id);
  const { data: mentors = [], isLoading: mentorsLoading } = useBranchMentors(branch?.id);
  const { data: activities = [], isLoading: activitiesLoading } = useBranchActivity(branch?.id);

  // Room mutations
  const createRoomMutation = useCreateBranchRoom();
  const updateRoomMutation = useUpdateBranchRoom();
  const deleteRoomMutation = useDeleteBranchRoom();

  // Filtered groups
  const filteredGroups = useMemo(() => {
    return groups.filter((g) => {
      const matchSearch =
        !groupSearch ||
        g.groupCode.toLowerCase().includes(groupSearch.toLowerCase()) ||
        (g.subject && g.subject.toLowerCase().includes(groupSearch.toLowerCase())) ||
        (g.mentorName && g.mentorName.toLowerCase().includes(groupSearch.toLowerCase()));

      const matchGrade = gradeFilter === 'ALL' || g.gradeLevel === gradeFilter;
      const matchStatus = statusFilter === 'ALL' || g.status === statusFilter;

      return matchSearch && matchGrade && matchStatus;
    });
  }, [groups, groupSearch, gradeFilter, statusFilter]);

  if (!branch) return null;

  const handleOpenAddRoom = () => {
    setEditingRoom(null);
    setRoomName('');
    setRoomType('IT_LAB');
    setRoomCapacity(16);
    setRoomStatus('ACTIVE');
    setRoomError(null);
    setIsRoomDialogOpen(true);
  };

  const handleOpenEditRoom = (room: BranchRoomDto) => {
    setEditingRoom(room);
    setRoomName(room.name);
    setRoomType(room.roomType || 'IT_LAB');
    setRoomCapacity(room.capacity || 16);
    setRoomStatus(room.status || 'ACTIVE');
    setRoomError(null);
    setIsRoomDialogOpen(true);
  };

  const handleSaveRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!roomName.trim()) {
      setRoomError('Xona nomi kiritilishi shart');
      return;
    }
    if (roomCapacity < 1) {
      setRoomError('Sig‘im kamida 1 o‘rin bo‘lishi kerak');
      return;
    }
    setRoomError(null);

    try {
      if (editingRoom) {
        const req: UpdateRoomRequest = {
          name: roomName.trim(),
          roomType,
          capacity: roomCapacity,
          status: roomStatus,
        };
        await updateRoomMutation.mutateAsync({
          branchId: branch.id,
          roomId: editingRoom.id,
          data: req,
        });
      } else {
        const req: CreateRoomRequest = {
          name: roomName.trim(),
          roomType,
          capacity: roomCapacity,
          status: roomStatus,
        };
        await createRoomMutation.mutateAsync({
          branchId: branch.id,
          data: req,
        });
      }
      setIsRoomDialogOpen(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Xatolik yuz berdi';
      setRoomError(msg);
    }
  };

  const handleDeleteRoom = async (room: BranchRoomDto) => {
    const confirmed = window.confirm(
      `"${room.name}" xonasini o‘chirish yoki nofaol qilishni tasdiqlaysizmi? Agar xonaga guruhlar biriktirilgan bo‘lsa, u xavfsiz holda "INACTIVE" holatiga o‘tkaziladi.`
    );
    if (!confirmed) return;

    try {
      await deleteRoomMutation.mutateAsync({
        branchId: branch.id,
        roomId: room.id,
      });
    } catch (err) {
      console.error('Failed to delete room:', err);
    }
  };

  const hasCapacityData = stats?.hasCapacityData ?? (stats?.totalRoomCapacity ? stats.totalRoomCapacity > 0 : false);
  const capacityRate = stats?.capacityUtilizationRate;

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto bg-card text-card-foreground border border-border shadow-2xl">
          <DialogHeader>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-primary/10 text-primary border border-primary/20">
                  <Building2 className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <DialogTitle className="text-xl font-bold tracking-tight text-foreground">
                      {branch.name}
                    </DialogTitle>
                    <Badge
                      variant={
                        branch.status === 'ACTIVE'
                          ? 'default'
                          : branch.status === 'ARCHIVED'
                          ? 'destructive'
                          : 'secondary'
                      }
                    >
                      {branch.status}
                    </Badge>
                  </div>
                  <DialogDescription className="font-mono text-xs text-muted-foreground mt-0.5">
                    Filial kodi: {branch.code}
                  </DialogDescription>
                </div>
              </div>

              {onEdit && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    onClose();
                    onEdit(branch);
                  }}
                  className="gap-1.5 border-border hover:bg-muted/50"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                  <span>{t('branches.editBranch', 'Tahrirlash')}</span>
                </Button>
              )}
            </div>
          </DialogHeader>

          {/* Radix Standard Navigation Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full mt-2">
            <TabsList className="grid grid-cols-2 sm:grid-cols-5 w-full bg-muted/60 p-1 border border-border">
              <TabsTrigger value="overview" className="text-xs sm:text-sm font-medium">
                {t('branches.tabs.overview', 'Umumiy ko‘rinish')}
              </TabsTrigger>
              <TabsTrigger value="groups" className="text-xs sm:text-sm font-medium">
                {`Guruhlar (${groups.length})`}
              </TabsTrigger>
              <TabsTrigger value="mentors" className="text-xs sm:text-sm font-medium">
                {`Mentorlar (${mentors.length})`}
              </TabsTrigger>
              <TabsTrigger value="rooms" className="text-xs sm:text-sm font-medium">
                {`Laboratoriyalar & Xonalar (${rooms.length})`}
              </TabsTrigger>
              <TabsTrigger value="activity" className="text-xs sm:text-sm font-medium">
                {`Audit tarixi (${activities.length})`}
              </TabsTrigger>
            </TabsList>

            {/* TAB 1: GENERAL OVERVIEW */}
            <TabsContent value="overview" className="space-y-6 pt-3">
              {/* Aggregated KPI Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <Card className="p-3 bg-card border border-border shadow-sm">
                  <div className="flex items-center gap-2 text-muted-foreground mb-1">
                    <Users className="w-4 h-4 text-primary" />
                    <span className="text-xs font-medium">{t('branches.totalStudents', 'O‘quvchilar')}</span>
                  </div>
                  <div className="text-xl font-bold text-foreground">
                    {statsLoading ? '...' : stats?.totalStudents ?? branch.studentCount ?? 0}
                  </div>
                  <div className="text-[11px] text-muted-foreground">
                    Faol: <span className="font-medium text-emerald-600 dark:text-emerald-400">{stats?.activeStudents ?? 0}</span> nafar
                  </div>
                </Card>

                <Card className="p-3 bg-card border border-border shadow-sm">
                  <div className="flex items-center gap-2 text-muted-foreground mb-1">
                    <GraduationCap className="w-4 h-4 text-blue-500" />
                    <span className="text-xs font-medium">{t('branches.totalGroups', 'Guruhlar')}</span>
                  </div>
                  <div className="text-xl font-bold text-foreground">
                    {statsLoading ? '...' : stats?.totalGroups ?? branch.groupCount ?? 0}
                  </div>
                  <div className="text-[11px] text-muted-foreground">
                    Faol: <span className="font-medium text-foreground">{stats?.activeGroups ?? 0}</span> ta guruh
                  </div>
                </Card>

                <Card className="p-3 bg-card border border-border shadow-sm">
                  <div className="flex items-center gap-2 text-muted-foreground mb-1">
                    <Award className="w-4 h-4 text-emerald-500" />
                    <span className="text-xs font-medium">{t('branches.totalMentors', 'Mentorlar')}</span>
                  </div>
                  <div className="text-xl font-bold text-foreground">
                    {statsLoading ? '...' : stats?.totalMentors ?? branch.mentorCount ?? 0}
                  </div>
                  <div className="text-[11px] text-muted-foreground">Biriktirilgan mutaxassislar</div>
                </Card>

                <Card className="p-3 bg-card border border-border shadow-sm">
                  <div className="flex items-center gap-2 text-muted-foreground mb-1">
                    <Percent className="w-4 h-4 text-amber-500" />
                    <span className="text-xs font-medium">{t('branches.capacityRate', 'Sig‘im darajasi')}</span>
                  </div>
                  <div className="text-xl font-bold text-foreground">
                    {statsLoading ? (
                      '...'
                    ) : hasCapacityData && typeof capacityRate === 'number' ? (
                      `${capacityRate}%`
                    ) : (
                      <span className="text-sm font-normal text-muted-foreground">N/A</span>
                    )}
                  </div>
                  <div className="text-[11px] text-muted-foreground">
                    {hasCapacityData ? (
                      `O‘rindiqlar: ${stats?.totalRoomCapacity ?? 0} ta`
                    ) : (
                      'Xonalar kiritilmagan'
                    )}
                  </div>
                </Card>
              </div>

              {/* Capacity Progress Bar or Unavailable State */}
              <div className="space-y-2 p-3.5 rounded-xl border border-border bg-muted/20">
                <div className="flex justify-between items-center text-xs font-medium">
                  <span className="flex items-center gap-1.5 text-foreground">
                    <Layers className="w-3.5 h-3.5 text-primary" />
                    {t('branches.capacityStatus.infrastructureUtilization', 'Infratuzilma bandligi')}
                  </span>
                  <span className="font-semibold text-foreground">
                    {hasCapacityData && typeof capacityRate === 'number' ? `${capacityRate}%` : 'Mavjud emas'}
                  </span>
                </div>
                {hasCapacityData && typeof capacityRate === 'number' ? (
                  <Progress value={Math.min(100, capacityRate)} className="h-2" />
                ) : (
                  <p className="text-xs text-muted-foreground">
                    {t('branches.capacityStatus.noCapacityData', 'Filialda faol laboratoriya yoki xonalar ro‘yxati to‘liq shakllanmaganligi sababli bandlik ko‘rsatkichi mavjud emas.')}
                  </p>
                )}
              </div>

              {/* Location & Contact Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-3 p-4 rounded-xl border border-border bg-card">
                  <h4 className="text-sm font-semibold flex items-center gap-2 text-foreground">
                    <MapPin className="w-4 h-4 text-primary" />
                    {t('branches.address', 'Joylashuv va manzil')}
                  </h4>
                  <div className="text-sm space-y-2 text-muted-foreground">
                    <div className="flex justify-between border-b border-border/50 pb-1.5">
                      <span className="font-medium text-foreground">{t('branches.region', 'Viloyat')}:</span>
                      <span>{branch.region}</span>
                    </div>
                    {branch.district && (
                      <div className="flex justify-between border-b border-border/50 pb-1.5">
                        <span className="font-medium text-foreground">{t('branches.district', 'Tuman / Shahar')}:</span>
                        <span>{branch.district}</span>
                      </div>
                    )}
                    {branch.address && (
                      <div className="flex justify-between pb-1">
                        <span className="font-medium text-foreground">{t('branches.address', 'To‘liq manzil')}:</span>
                        <span className="text-right text-foreground">{branch.address}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-3 p-4 rounded-xl border border-border bg-card">
                  <h4 className="text-sm font-semibold flex items-center gap-2 text-foreground">
                    <Phone className="w-4 h-4 text-primary" />
                    {t('branches.phone', 'Aloqa vositalari')}
                  </h4>
                  <div className="text-sm space-y-2 text-muted-foreground">
                    {branch.phone && (
                      <div className="flex items-center gap-2 border-b border-border/50 pb-1.5">
                        <Phone className="w-3.5 h-3.5 text-muted-foreground" />
                        <span className="text-foreground">{branch.phone}</span>
                      </div>
                    )}
                    {branch.email && (
                      <div className="flex items-center gap-2 border-b border-border/50 pb-1.5">
                        <Mail className="w-3.5 h-3.5 text-muted-foreground" />
                        <span className="text-foreground">{branch.email}</span>
                      </div>
                    )}
                    {branch.createdAt && (
                      <div className="flex items-center gap-2 pt-1 text-xs text-muted-foreground">
                        <Calendar className="w-3.5 h-3.5" />
                        <span>Ro‘yxatga olingan: {new Date(branch.createdAt).toLocaleDateString()}</span>
                      </div>
                    )}
                    {branch.updatedAt && (
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Clock className="w-3.5 h-3.5" />
                        <span>Oxirgi yangilanish: {new Date(branch.updatedAt).toLocaleDateString()}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Description */}
              {branch.description && (
                <div className="p-4 rounded-xl border border-border bg-card space-y-1.5">
                  <h4 className="text-sm font-semibold text-foreground">
                    {t('branches.description', 'Filial tavsifi')}
                  </h4>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">
                    {branch.description}
                  </p>
                </div>
              )}
            </TabsContent>

            {/* TAB 2: GROUPS */}
            <TabsContent value="groups" className="space-y-3 pt-3">
              {/* Search and Filters */}
              <div className="flex flex-col sm:flex-row gap-2 items-center justify-between">
                <div className="relative w-full sm:w-72">
                  <Search className="w-4 h-4 absolute left-3 top-2.5 text-muted-foreground" />
                  <Input
                    placeholder={t('branches.groupsTable.searchPlaceholder', 'Guruh kodi yoki fan bo‘yicha...')}
                    value={groupSearch}
                    onChange={(e) => setGroupSearch(e.target.value)}
                    className="pl-9 h-9 text-xs"
                  />
                </div>
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <select
                    value={gradeFilter}
                    onChange={(e) => setGradeFilter(e.target.value)}
                    className="h-9 px-2.5 text-xs rounded-md border border-border bg-card text-foreground"
                  >
                    <option value="ALL">Barcha sinflar</option>
                    <option value="8-sinf">8-sinf</option>
                    <option value="9-sinf">9-sinf</option>
                    <option value="10-sinf">10-sinf</option>
                    <option value="11-sinf">11-sinf</option>
                  </select>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="h-9 px-2.5 text-xs rounded-md border border-border bg-card text-foreground"
                  >
                    <option value="ALL">Barcha holatlar</option>
                    <option value="ACTIVE">Faol</option>
                    <option value="COMPLETED">Tugallangan</option>
                    <option value="ARCHIVED">Arxivlangan</option>
                  </select>
                </div>
              </div>

              {groupsLoading ? (
                <div className="text-center py-10 text-sm text-muted-foreground">
                  Guruhlar yuklanmoqda...
                </div>
              ) : filteredGroups.length === 0 ? (
                <div className="text-center py-10 text-sm text-muted-foreground border rounded-xl border-dashed">
                  Ushbu mezonlar bo‘yicha hech qanday ta‘lim guruhi topilmadi.
                </div>
              ) : (
                <div className="border border-border rounded-xl overflow-x-auto bg-card shadow-sm">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/70 text-muted-foreground font-semibold border-b border-border">
                      <tr>
                        <th className="px-3.5 py-2.5 text-left">{t('branches.groupsTable.code', 'Guruh kodi')}</th>
                        <th className="px-3.5 py-2.5 text-left">{t('branches.groupsTable.grade', 'Sinf')}</th>
                        <th className="px-3.5 py-2.5 text-left">{t('branches.groupsTable.subject', 'Yo‘nalish / Fan')}</th>
                        <th className="px-3.5 py-2.5 text-left">{t('branches.groupsTable.mentor', 'Mentor')}</th>
                        <th className="px-3.5 py-2.5 text-left">{t('branches.groupsTable.classroom', 'Xona')}</th>
                        <th className="px-3.5 py-2.5 text-center">{t('branches.groupsTable.enrollment', 'O‘quvchilar')}</th>
                        <th className="px-3.5 py-2.5 text-right">{t('branches.groupsTable.status', 'Holat')}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {filteredGroups.map((g) => (
                        <tr key={g.id} className="hover:bg-muted/30 transition-colors">
                          <td className="px-3.5 py-2.5 font-mono font-medium text-foreground">
                            {g.groupCode}
                          </td>
                          <td className="px-3.5 py-2.5 text-foreground">{g.gradeLevel}</td>
                          <td className="px-3.5 py-2.5 text-muted-foreground max-w-xs truncate">
                            {g.subject || '—'}
                          </td>
                          <td className="px-3.5 py-2.5 text-foreground font-medium">
                            {g.mentorName || '—'}
                          </td>
                          <td className="px-3.5 py-2.5">
                            <Badge variant="outline" className="font-mono text-xs">
                              {g.room || '—'}
                            </Badge>
                          </td>
                          <td className="px-3.5 py-2.5 text-center">
                            {g.overCapacity ? (
                              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-bold bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30">
                                <AlertTriangle className="w-3 h-3 text-amber-500" />
                                {g.studentCount} / {g.maxCapacity}
                                <span className="text-[10px] hidden sm:inline">(Sig‘imdan oshgan!)</span>
                              </span>
                            ) : (
                              <span className="font-medium text-foreground">
                                {g.studentCount} / {g.maxCapacity}
                              </span>
                            )}
                          </td>
                          <td className="px-3.5 py-2.5 text-right">
                            <Badge
                              variant={
                                g.status === 'ACTIVE'
                                  ? 'default'
                                  : g.status === 'COMPLETED'
                                  ? 'outline'
                                  : 'secondary'
                              }
                            >
                              {g.status}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </TabsContent>

            {/* TAB 3: MENTORS */}
            <TabsContent value="mentors" className="space-y-3 pt-3">
              {mentorsLoading ? (
                <div className="text-center py-10 text-sm text-muted-foreground">
                  Mentorlar yuklanmoqda...
                </div>
              ) : mentors.length === 0 ? (
                <div className="text-center py-10 text-sm text-muted-foreground border rounded-xl border-dashed">
                  Ushbu filialga hozircha biriktirilgan mentorlar mavjud emas.
                </div>
              ) : (
                <div className="border border-border rounded-xl overflow-x-auto bg-card shadow-sm">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/70 text-muted-foreground font-semibold border-b border-border">
                      <tr>
                        <th className="px-3.5 py-2.5 text-left">{t('branches.mentorsTable.fullName', 'To‘liq ismi (F.I.Sh)')}</th>
                        <th className="px-3.5 py-2.5 text-left">{t('branches.mentorsTable.role', 'Lavozimi')}</th>
                        <th className="px-3.5 py-2.5 text-left">{t('branches.mentorsTable.contacts', 'Aloqa vositalari')}</th>
                        <th className="px-3.5 py-2.5 text-left">{t('branches.mentorsTable.assignedGroups', 'Biriktirilgan guruhlar')}</th>
                        <th className="px-3.5 py-2.5 text-center">{t('branches.mentorsTable.weeklyWorkload', 'Haftalik yuklama')}</th>
                        <th className="px-3.5 py-2.5 text-right">{t('branches.mentorsTable.status', 'Holat')}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {mentors.map((m) => (
                        <tr key={m.id} className="hover:bg-muted/30 transition-colors">
                          <td className="px-3.5 py-2.5 font-medium text-foreground">
                            {m.fullName}
                          </td>
                          <td className="px-3.5 py-2.5 text-muted-foreground">{m.role}</td>
                          <td className="px-3.5 py-2.5 text-xs space-y-0.5">
                            {m.phone && <div className="text-foreground">{m.phone}</div>}
                            {m.email && <div className="text-muted-foreground">{m.email}</div>}
                          </td>
                          <td className="px-3.5 py-2.5">
                            <div className="flex gap-1 flex-wrap">
                              {m.assignedGroups && m.assignedGroups.length > 0 ? (
                                m.assignedGroups.map((code) => (
                                  <Badge key={code} variant="secondary" className="font-mono text-[11px]">
                                    {code}
                                  </Badge>
                                ))
                              ) : (
                                <span className="text-xs text-muted-foreground">—</span>
                              )}
                            </div>
                          </td>
                          <td className="px-3.5 py-2.5 text-center font-medium text-foreground">
                            {m.weeklyWorkloadHours} soat/hafta
                          </td>
                          <td className="px-3.5 py-2.5 text-right">
                            <Badge variant={m.status === 'ACTIVE' ? 'default' : 'secondary'}>
                              {m.status}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </TabsContent>

            {/* TAB 4: CLASSROOMS & LABORATORIES */}
            <TabsContent value="rooms" className="space-y-3 pt-3">
              <div className="flex justify-between items-center">
                <p className="text-xs text-muted-foreground">
                  Filialdagi zamonaviy IT laboratoriyalari va kompyuterli dars xonalari ro‘yxati
                </p>
                <Button size="sm" onClick={handleOpenAddRoom} className="gap-1.5 h-8 text-xs">
                  <Plus className="w-3.5 h-3.5" />
                  <span>{t('branches.roomsTable.addRoom', 'Yangi xona')}</span>
                </Button>
              </div>

              {roomsLoading ? (
                <div className="text-center py-10 text-sm text-muted-foreground">
                  Laboratoriyalar yuklanmoqda...
                </div>
              ) : rooms.length === 0 ? (
                <div className="text-center py-10 text-sm text-muted-foreground border rounded-xl border-dashed">
                  Ushbu filialda hozircha alohida IT laboratoriya xonalari kiritilmagan.
                </div>
              ) : (
                <div className="border border-border rounded-xl overflow-x-auto bg-card shadow-sm">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/70 text-muted-foreground font-semibold border-b border-border">
                      <tr>
                        <th className="px-3.5 py-2.5 text-left">{t('branches.roomsTable.name', 'Xona / Laboratoriya')}</th>
                        <th className="px-3.5 py-2.5 text-left">{t('branches.roomsTable.type', 'Turi')}</th>
                        <th className="px-3.5 py-2.5 text-center">{t('branches.roomsTable.capacity', 'Sig‘im (O‘rinlar)')}</th>
                        <th className="px-3.5 py-2.5 text-center">{t('branches.roomsTable.occupancy', 'Bandlik')}</th>
                        <th className="px-3.5 py-2.5 text-left">{t('branches.roomsTable.assignedGroups', 'Biriktirilgan guruhlar')}</th>
                        <th className="px-3.5 py-2.5 text-right">{t('branches.roomsTable.actions', 'Amallar')}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {rooms.map((r) => (
                        <tr key={r.id} className="hover:bg-muted/30 transition-colors">
                          <td className="px-3.5 py-2.5 font-medium text-foreground flex items-center gap-2">
                            <Layers className="w-4 h-4 text-primary" />
                            <span>{r.name}</span>
                          </td>
                          <td className="px-3.5 py-2.5">
                            <Badge variant="outline" className="text-xs">
                              {r.roomType || 'IT_LAB'}
                            </Badge>
                          </td>
                          <td className="px-3.5 py-2.5 text-center font-semibold text-foreground">
                            {r.capacity ?? 16} ta o‘rin
                          </td>
                          <td className="px-3.5 py-2.5 text-center">
                            <Badge
                              variant={
                                r.availabilityStatus === 'OVERLOADED'
                                  ? 'destructive'
                                  : r.availabilityStatus === 'OCCUPIED'
                                  ? 'default'
                                  : 'secondary'
                              }
                            >
                              {r.currentOccupancy ?? 0} o‘quvchi
                            </Badge>
                          </td>
                          <td className="px-3.5 py-2.5">
                            <div className="flex gap-1 flex-wrap">
                              {r.assignedGroups && r.assignedGroups.length > 0 ? (
                                r.assignedGroups.map((gCode) => (
                                  <Badge key={gCode} variant="secondary" className="font-mono text-[10px]">
                                    {gCode}
                                  </Badge>
                                ))
                              ) : (
                                <span className="text-xs text-muted-foreground">—</span>
                              )}
                            </div>
                          </td>
                          <td className="px-3.5 py-2.5 text-right">
                            <div className="flex justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleOpenEditRoom(r)}
                                className="h-7 w-7 p-0"
                              >
                                <Edit2 className="w-3.5 h-3.5 text-muted-foreground" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeleteRoom(r)}
                                className="h-7 w-7 p-0 text-destructive hover:bg-destructive/10"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </TabsContent>

            {/* TAB 5: ACTIVITY / AUDIT HISTORY */}
            <TabsContent value="activity" className="space-y-3 pt-3">
              {activitiesLoading ? (
                <div className="text-center py-10 text-sm text-muted-foreground">
                  Audit yozuvlari yuklanmoqda...
                </div>
              ) : activities.length === 0 ? (
                <div className="text-center py-10 text-sm text-muted-foreground border rounded-xl border-dashed">
                  Ushbu filial bo‘yicha hozircha audit jurnali yozuvlari mavjud emas.
                </div>
              ) : (
                <div className="border border-border rounded-xl overflow-x-auto bg-card shadow-sm">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/70 text-muted-foreground font-semibold border-b border-border">
                      <tr>
                        <th className="px-3.5 py-2.5 text-left">{t('branches.activityTable.event', 'Amal')}</th>
                        <th className="px-3.5 py-2.5 text-left">{t('branches.activityTable.actor', 'Bajaruvchi')}</th>
                        <th className="px-3.5 py-2.5 text-left">{t('branches.activityTable.details', 'Tafsilotlar')}</th>
                        <th className="px-3.5 py-2.5 text-right">{t('branches.activityTable.date', 'Sana va vaqt')}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {activities.map((a) => (
                        <tr key={a.id} className="hover:bg-muted/30 transition-colors">
                          <td className="px-3.5 py-2.5">
                            <Badge variant="outline" className="font-mono text-xs">
                              {a.action}
                            </Badge>
                          </td>
                          <td className="px-3.5 py-2.5 font-medium text-foreground">
                            {a.performedBy}
                          </td>
                          <td className="px-3.5 py-2.5 text-muted-foreground max-w-sm truncate">
                            {a.details}
                          </td>
                          <td className="px-3.5 py-2.5 text-right text-xs text-muted-foreground whitespace-nowrap">
                            {new Date(a.createdAt).toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      {/* Classroom Create/Edit Dialog */}
      <Dialog open={isRoomDialogOpen} onOpenChange={setIsRoomDialogOpen}>
        <DialogContent className="max-w-md bg-card text-card-foreground border-border">
          <DialogHeader>
            <DialogTitle>
              {editingRoom ? 'Xonani tahrirlash' : 'Yangi xona / laboratoriya qo‘shish'}
            </DialogTitle>
            <DialogDescription>
              Filialdagi kompyuterli o‘quv xonasi yoki laboratoriya parametrlarini kiriting
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveRoom} className="space-y-4">
            {roomError && (
              <div className="p-3 text-xs rounded-md bg-destructive/15 text-destructive border border-destructive/30 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{roomError}</span>
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="room-name">Xona / Laboratoriya nomi</Label>
              <Input
                id="room-name"
                placeholder="masalan: IT Lab 3 yoki IT-4"
                value={roomName}
                onChange={(e) => setRoomName(e.target.value)}
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="room-type">Xona turi</Label>
              <select
                id="room-type"
                value={roomType}
                onChange={(e) => setRoomType(e.target.value)}
                className="w-full h-10 px-3 text-sm rounded-md border border-border bg-card text-foreground"
              >
                <option value="IT_LAB">IT Laboratoriya</option>
                <option value="THEORY_ROOM">Nazariy xona</option>
                <option value="ROBOTICS_LAB">Robototexnika laboratoriyasi</option>
                <option value="CONFERENCE_HALL">Faollar zali</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="room-capacity">Kompyuterli o‘rinlar soni (Sig‘im)</Label>
              <Input
                id="room-capacity"
                type="number"
                min={1}
                max={100}
                value={roomCapacity}
                onChange={(e) => setRoomCapacity(Number(e.target.value))}
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="room-status">Holati</Label>
              <select
                id="room-status"
                value={roomStatus}
                onChange={(e) => setRoomStatus(e.target.value)}
                className="w-full h-10 px-3 text-sm rounded-md border border-border bg-card text-foreground"
              >
                <option value="ACTIVE">Faol</option>
                <option value="MAINTENANCE">Texnik ta’mirlashda</option>
                <option value="INACTIVE">Nofaol</option>
              </select>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsRoomDialogOpen(false)}
              >
                Bekor qilish
              </Button>
              <Button
                type="submit"
                disabled={createRoomMutation.isPending || updateRoomMutation.isPending}
              >
                Saqlash
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
};
