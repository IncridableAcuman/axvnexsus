import React, { useState, useMemo, useEffect } from 'react';
import type { Student, StudyGroup, Mentor } from '../types';
import {
  Users,
  Search,
  Download,
  Plus,
  Trash2,
  X,
  ChevronLeft,
  ChevronRight,
  KeyRound,
  Copy,
  Check,
  Eye,
  Edit2,
  Archive,
} from 'lucide-react';
import { studentApi } from '../api';
import { useTranslation } from '@/shared/i18n';
import { cn } from '@/lib/utils';
import {
  Card,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { CredentialSlipModal, type CredentialSlipData } from './common/CredentialSlipModal';
import { StudentDetailsModal } from './students/StudentDetailsModal';
import { EditStudentModal } from './students/EditStudentModal';

interface StudentsListProps {
  students: Student[];
  groups: StudyGroup[];
  mentors: Mentor[];
  onRefresh: () => void;
}

export const StudentsList: React.FC<StudentsListProps> = ({
  students,
  groups,
  mentors: _mentors,
  onRefresh,
}) => {
  const { t } = useTranslation();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedGrade, setSelectedGrade] = useState('all');
  const [selectedGroup, setSelectedGroup] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // Student Details & Edit Modals State
  const [selectedStudentForDetails, setSelectedStudentForDetails] = useState<Student | null>(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [selectedStudentForEdit, setSelectedStudentForEdit] = useState<Student | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  // Archive Confirmation Dialog State
  const [selectedStudentForArchive, setSelectedStudentForArchive] = useState<Student | null>(null);
  const [isArchiveDialogOpen, setIsArchiveDialogOpen] = useState(false);
  const [archiveReason, setArchiveReason] = useState('');
  const [isArchiving, setIsArchiving] = useState(false);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Credential slip modal state
  const [credentialData, setCredentialData] = useState<CredentialSlipData | null>(null);
  const [isCredentialModalOpen, setIsCredentialModalOpen] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // New student form state
  const [fullName, setFullName] = useState('');
  const [pinfl, setPinfl] = useState('');
  const [phone, setPhone] = useState('');
  const [gradeLevel, setGradeLevel] = useState('8-sinf');
  const [district] = useState('Yangiariq tumani');
  const [selectedGroupId, setSelectedGroupId] = useState<number | undefined>(groups[0]?.id);
  const [saving, setSaving] = useState(false);

  const filteredStudents = useMemo(() => {
    return students.filter((s) => {
      const searchMatch =
        s.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (s.studentIdNumber && s.studentIdNumber.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (s.pinfl && s.pinfl.includes(searchTerm));

      const gradeMatch = selectedGrade === 'all' || s.gradeLevel === selectedGrade;
      const groupMatch =
        selectedGroup === 'all' || (s.studyGroup && s.studyGroup.groupCode === selectedGroup);

      const statusMatch =
        selectedStatus === 'all' ||
        s.status === selectedStatus ||
        (selectedStatus === 'ACTIVE' && s.status === 'Faol') ||
        (selectedStatus === 'ARCHIVED' && s.status === 'Arxivlangan') ||
        (selectedStatus === 'INACTIVE' && s.status === 'Nofaol');

      return searchMatch && gradeMatch && groupMatch && statusMatch;
    });
  }, [students, searchTerm, selectedGrade, selectedGroup, selectedStatus]);

  // Reset to first page when search or filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedGrade, selectedGroup, selectedStatus, pageSize]);

  const totalPages = Math.max(1, Math.ceil(filteredStudents.length / pageSize));
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, filteredStudents.length);
  const paginatedStudents = useMemo(() => {
    return filteredStudents.slice(startIndex, endIndex);
  }, [filteredStudents, startIndex, endIndex]);

  const handleDelete = async (id: number) => {
    if (window.confirm(t('students.confirmDelete'))) {
      try {
        await studentApi.delete(id);
        onRefresh();
      } catch {
        alert(t('students.deleteError'));
      }
    }
  };

  const handleArchive = async () => {
    if (!selectedStudentForArchive) return;
    try {
      setIsArchiving(true);
      await studentApi.archive(selectedStudentForArchive.id, archiveReason || undefined);
      setIsArchiveDialogOpen(false);
      setSelectedStudentForArchive(null);
      setArchiveReason('');
      onRefresh();
    } catch (err) {
      console.error(err);
      alert('O‘quvchini arxivlashda xatolik yuz berdi');
    } finally {
      setIsArchiving(false);
    }
  };

  const handleResetPassword = async (st: Student) => {
    if (!window.confirm(`${st.fullName} o‘quvchisi uchun yangi tasodifiy parol generatsiya qilinsinmi?`)) {
      return;
    }
    try {
      const res = await studentApi.resetPassword(st.id);
      const data = res.data.data;
      setCredentialData({
        fullName: data.fullName,
        role: 'STUDENT',
        hemisId: data.identifier,
        password: data.newPassword,
        groupCode: st.studyGroup?.groupCode,
        branchLocation: st.branchLocation,
        isReset: true,
      });
      setIsCredentialModalOpen(true);
    } catch (err: any) {
      const msg = err?.response?.data?.message || 'Parolni yangilashda xatolik yuz berdi';
      alert(msg);
    }
  };

  const handleCopyStudentId = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(id);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleExportCSV = () => {
    const headers = ['#', 'F.I.Sh', 'PINFL', 'ID Raqami', 'Sinf', 'Guruh', 'Filial', 'Mentor', 'Holat'];
    const rows = filteredStudents.map((s, idx) => [
      idx + 1,
      `"${s.fullName}"`,
      `"${s.pinfl || ''}"`,
      `"${s.studentIdNumber || ''}"`,
      `"${s.gradeLevel || ''}"`,
      `"${s.studyGroup?.groupCode || ''}"`,
      `"${s.branchLocation || ''}"`,
      `"${s.mentor?.fullName || ''}"`,
      `"${s.status}"`,
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,\uFEFF' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `axvhub_oquvchilar_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleCreateStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim()) return;

    setSaving(true);
    try {
      const targetGroup = groups.find((g) => g.id === Number(selectedGroupId));
      const res = await studentApi.provision({
        fullName: fullName.trim(),
        gradeLevel,
        studyGroupId: targetGroup?.id,
        direction: targetGroup?.subject || 'Web Full-Stack',
        pinfl: pinfl.trim() || undefined,
        phone: phone.trim() || undefined,
        district,
        branchLocation: 'IT Park Yangiariq',
      });

      const prov = res.data.data;
      setIsAddModalOpen(false);
      setFullName('');
      setPinfl('');
      setPhone('');
      onRefresh();

      // Show generated credentials slip modal
      setCredentialData({
        fullName: prov.fullName,
        role: 'STUDENT',
        hemisId: prov.studentIdNumber,
        password: prov.temporaryPassword,
        groupCode: prov.groupCode,
        branchLocation: prov.branchLocation,
      });
      setIsCredentialModalOpen(true);
    } catch (err: any) {
      const msg = err?.response?.data?.message || t('students.createError');
      alert(msg);
    } finally {
      setSaving(false);
    }
  };

  const isFiltered =
    searchTerm !== '' ||
    selectedGrade !== 'all' ||
    selectedGroup !== 'all' ||
    selectedStatus !== 'all';

  return (
    <div className="space-y-6 animate-fade-in-up">
      {/* 1. Top Mini Stats Bar - Clean Shadcn Card, borderless modern feel */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <Card className="border-0 shadow-sm bg-card hover:bg-card/90 transition-all rounded-2xl p-4 flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
            <Users className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider block truncate">
              {t('students.totalStudents')}
            </span>
            <span className="text-2xl font-black text-foreground font-mono block tracking-tight">
              {students.length}
            </span>
          </div>
        </Card>

        <Card className="border-0 shadow-sm bg-card hover:bg-card/90 transition-all rounded-2xl p-4 flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-indigo-500/10 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
            <span className="font-extrabold text-xs">8-S</span>
          </div>
          <div className="min-w-0">
            <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider block truncate">
              {t('students.grade8')}
            </span>
            <span className="text-2xl font-black text-foreground font-mono block tracking-tight">
              {students.filter((s) => s.gradeLevel === '8-sinf').length}
            </span>
          </div>
        </Card>

        <Card className="border-0 shadow-sm bg-card hover:bg-card/90 transition-all rounded-2xl p-4 flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-purple-500/10 dark:bg-purple-500/20 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
            <span className="font-extrabold text-xs">11-S</span>
          </div>
          <div className="min-w-0">
            <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider block truncate">
              {t('students.grade11')}
            </span>
            <span className="text-2xl font-black text-foreground font-mono block tracking-tight">
              {students.filter((s) => s.gradeLevel === '11-sinf').length}
            </span>
          </div>
        </Card>

        <Card className="border-0 shadow-sm bg-card hover:bg-card/90 transition-all rounded-2xl p-4 flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
          </div>
          <div className="min-w-0">
            <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider block truncate">
              {t('students.activeStatus')}
            </span>
            <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400 font-mono block tracking-tight">
              {students.filter((s) => s.status === 'Faol').length}
            </span>
          </div>
        </Card>
      </div>

      {/* 2. Unified Students Main Section - Header, Toolbar, Table & Pagination */}
      <Card className="border-0 shadow-sm bg-card rounded-2xl overflow-hidden">
        {/* Section Header */}
        <div className="p-5 sm:p-6 pb-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <Badge
                variant="secondary"
                className="border-0 bg-blue-500/10 text-blue-600 dark:text-blue-400 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500 mr-1.5 animate-pulse" />
                {t('dashboard.admin.programName')}
              </Badge>
            </div>
            <CardTitle className="text-xl sm:text-2xl font-black tracking-tight text-foreground flex items-center gap-2.5">
              <Users className="w-6 h-6 text-primary" />
              {t('students.centerTitle')}
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm text-muted-foreground mt-1">
              {t('students.centerDesc', { count: students.length })}
            </CardDescription>
          </div>

          <div className="flex items-center gap-2.5 self-start md:self-auto">
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportCSV}
              className="rounded-xl text-xs font-semibold border-0 bg-muted/40 hover:bg-muted text-foreground gap-1.5 cursor-pointer shadow-2xs"
            >
              <Download className="w-4 h-4" />
              <span>{t('students.csvExport')}</span>
            </Button>
            <Button
              size="sm"
              onClick={() => setIsAddModalOpen(true)}
              className="rounded-xl text-xs font-bold gap-1.5 cursor-pointer shadow-sm"
            >
              <Plus className="w-4 h-4" />
              <span>{t('students.addStudent')}</span>
            </Button>
          </div>
        </div>

        {/* Integrated Search & Filter Toolbar */}
        <div className="px-5 sm:px-6 py-3.5 bg-muted/20 border-t border-b border-border/10 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="relative w-full sm:w-80">
            <Input
              leftIcon={<Search className="w-4 h-4" />}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={t('students.searchPlaceholder')}
              className="h-9.5 text-xs bg-card border-0 shadow-2xs focus-visible:ring-1"
              rightIcon={
                searchTerm ? (
                  <button
                    type="button"
                    onClick={() => setSearchTerm('')}
                    className="text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                    aria-label="Qidiruvni tozalash"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                ) : undefined
              }
            />
          </div>

          <div className="flex items-center gap-2 overflow-x-auto">
            <Select value={selectedGrade} onValueChange={setSelectedGrade}>
              <SelectTrigger className="w-full sm:w-[140px] h-9.5 text-xs rounded-xl bg-card border-0 shadow-2xs focus:ring-1">
                <SelectValue placeholder={t('students.allGrades')} />
              </SelectTrigger>
              <SelectContent className="border-0 shadow-xl rounded-xl bg-card">
                <SelectItem value="all">{t('students.allGrades')}</SelectItem>
                <SelectItem value="8-sinf">{t('students.grade8')}</SelectItem>
                <SelectItem value="9-sinf">{t('students.grade9')}</SelectItem>
                <SelectItem value="10-sinf">{t('students.grade10')}</SelectItem>
                <SelectItem value="11-sinf">{t('students.grade11')}</SelectItem>
              </SelectContent>
            </Select>

            <Select value={selectedGroup} onValueChange={setSelectedGroup}>
              <SelectTrigger className="w-full sm:w-[160px] h-9.5 text-xs rounded-xl bg-card border-0 shadow-2xs focus:ring-1">
                <SelectValue placeholder={t('students.allGroups')} />
              </SelectTrigger>
              <SelectContent className="border-0 shadow-xl rounded-xl bg-card">
                <SelectItem value="all">{t('students.allGroups')}</SelectItem>
                {groups.map((g) => (
                  <SelectItem key={g.id} value={g.groupCode}>
                    {g.groupCode} ({g.gradeLevel})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={selectedStatus} onValueChange={setSelectedStatus}>
              <SelectTrigger className="w-full sm:w-[130px] h-9.5 text-xs rounded-xl bg-card border-0 shadow-2xs focus:ring-1">
                <SelectValue placeholder="Holat" />
              </SelectTrigger>
              <SelectContent className="border-0 shadow-xl rounded-xl bg-card">
                <SelectItem value="all">Barcha holatlar</SelectItem>
                <SelectItem value="ACTIVE">Faol</SelectItem>
                <SelectItem value="INACTIVE">Nofaol</SelectItem>
                <SelectItem value="ARCHIVED">Arxivlangan</SelectItem>
              </SelectContent>
            </Select>

            {isFiltered && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSearchTerm('');
                  setSelectedGrade('all');
                  setSelectedGroup('all');
                  setSelectedStatus('all');
                }}
                className="h-9.5 text-xs text-muted-foreground hover:text-foreground px-2.5 rounded-xl cursor-pointer shrink-0"
              >
                <X className="w-3.5 h-3.5 mr-1" />
                Tozalash
              </Button>
            )}
          </div>
        </div>

        {/* Table View */}
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-b border-border/10 hover:bg-transparent bg-muted/20">
                <TableHead className="w-12 text-center font-bold text-[10px] uppercase tracking-wider text-muted-foreground">#</TableHead>
                <TableHead className="font-bold text-[10px] uppercase tracking-wider text-muted-foreground">{t('students.studentName')}</TableHead>
                <TableHead className="font-bold text-[10px] uppercase tracking-wider text-muted-foreground">{t('students.pinflHeader')}</TableHead>
                <TableHead className="font-bold text-[10px] uppercase tracking-wider text-muted-foreground">{t('students.studentIdHeader')}</TableHead>
                <TableHead className="font-bold text-[10px] uppercase tracking-wider text-muted-foreground">{t('groups.grade')}</TableHead>
                <TableHead className="font-bold text-[10px] uppercase tracking-wider text-muted-foreground">{t('students.group')}</TableHead>
                <TableHead className="font-bold text-[10px] uppercase tracking-wider text-muted-foreground">{t('students.mentorHeader')}</TableHead>
                <TableHead className="font-bold text-[10px] uppercase tracking-wider text-muted-foreground">{t('students.branchHeader')}</TableHead>
                <TableHead className="text-center font-bold text-[10px] uppercase tracking-wider text-muted-foreground">{t('common.status')}</TableHead>
                <TableHead className="text-right font-bold text-[10px] uppercase tracking-wider text-muted-foreground">{t('students.actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredStudents.length === 0 ? (
                <TableRow className="hover:bg-transparent border-0">
                  <TableCell colSpan={10} className="py-16 text-center text-muted-foreground">
                    <div className="w-14 h-14 rounded-2xl bg-muted/40 text-muted-foreground flex items-center justify-center mx-auto mb-3">
                      <Users className="w-7 h-7 opacity-60" />
                    </div>
                    <p className="font-semibold text-sm text-foreground mb-1">
                      {t('students.noStudentsFound')}
                    </p>
                    <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                      Qidiruv parametrlarini o‘zgartiring yoki filtrlarni tozalang
                    </p>
                    {isFiltered && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSearchTerm('');
                          setSelectedGrade('all');
                          setSelectedGroup('all');
                        }}
                        className="mt-4 rounded-xl text-xs border-0 bg-muted/60 hover:bg-muted cursor-pointer"
                      >
                        Filtrlarni tozalash
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ) : (
                paginatedStudents.map((st, idx) => {
                  const itemIndex = startIndex + idx + 1;
                  return (
                    <TableRow
                      key={st.id}
                      className="border-b border-border/10 hover:bg-muted/40 transition-colors group"
                    >
                      <TableCell className="text-muted-foreground font-mono text-center text-xs">
                        {itemIndex}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="w-8 h-8 ring-0 border-0 bg-primary/10 text-primary font-bold text-xs">
                            <AvatarFallback className="bg-primary/10 text-primary font-bold text-xs">
                              {st.fullName ? st.fullName.charAt(0).toUpperCase() : 'U'}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex flex-col min-w-0">
                            <span className="font-semibold text-sm text-foreground truncate group-hover:text-primary transition-colors">
                              {st.fullName}
                            </span>
                            {st.phone && (
                              <span className="text-[11px] text-muted-foreground font-mono">
                                {st.phone}
                              </span>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground">
                        {st.pinfl || '—'}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5 font-mono text-xs text-foreground font-semibold">
                          <span>{st.studentIdNumber || '—'}</span>
                          {st.studentIdNumber && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={(e) => handleCopyStudentId(st.studentIdNumber!, e)}
                              className="h-6 w-6 text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors cursor-pointer"
                              title="ID dan nusxa olish"
                            >
                              {copiedId === st.studentIdNumber ? (
                                <Check className="w-3.5 h-3.5 text-emerald-500" />
                              ) : (
                                <Copy className="w-3.5 h-3.5" />
                              )}
                            </Button>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="secondary"
                          className="font-mono text-[11px] font-semibold px-2 py-0.5 rounded-md border-0 bg-muted/60 text-foreground"
                        >
                          {st.gradeLevel || '8-sinf'}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono font-bold text-xs text-foreground">
                        {st.studyGroup?.groupCode || '—'}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground truncate max-w-[120px]">
                        {st.mentor?.fullName.split(' ')[0] || '—'}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground truncate max-w-[130px]">
                        {st.branchLocation || 'IT Park Yangiariq'}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge
                          variant={st.status === 'Faol' ? 'success' : 'secondary'}
                          className="font-medium gap-1.5 px-2.5 py-0.5 rounded-full border-0 text-[11px]"
                        >
                          <span
                            className={cn(
                              'w-1.5 h-1.5 rounded-full',
                              st.status === 'Faol' ? 'bg-emerald-500 animate-pulse' : 'bg-muted-foreground'
                            )}
                          />
                          <span>{st.status}</span>
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setSelectedStudentForDetails(st);
                              setIsDetailsModalOpen(true);
                            }}
                            className="h-8 w-8 text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors cursor-pointer"
                            title="O‘quvchi profiling ko‘rish"
                            aria-label="O‘quvchi profiling ko‘rish"
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setSelectedStudentForEdit(st);
                              setIsEditModalOpen(true);
                            }}
                            className="h-8 w-8 text-muted-foreground hover:text-blue-500 hover:bg-blue-500/10 transition-colors cursor-pointer"
                            title="Tahrirlash"
                            aria-label="Tahrirlash"
                          >
                            <Edit2 className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleResetPassword(st)}
                            className="h-8 w-8 text-muted-foreground hover:text-amber-500 hover:bg-amber-500/10 transition-colors cursor-pointer"
                            title="Yangi parol yaratish (HEMIS)"
                            aria-label="Yangi parol yaratish"
                          >
                            <KeyRound className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setSelectedStudentForArchive(st);
                              setIsArchiveDialogOpen(true);
                            }}
                            className="h-8 w-8 text-muted-foreground hover:text-rose-500 hover:bg-rose-500/10 transition-colors cursor-pointer"
                            title="Xavfsiz arxivlash"
                            aria-label="Xavfsiz arxivlash"
                          >
                            <Archive className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(st.id)}
                            className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors cursor-pointer"
                            title={t('common.delete')}
                            aria-label={t('common.delete')}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>

        {/* 3. Pagination Controls Bar */}
        {filteredStudents.length > 0 && (
          <div className="p-4 sm:px-6 border-t border-border/10 bg-card/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-3 text-muted-foreground">
              <span>
                {t('common.total')} <strong className="text-foreground font-mono">{filteredStudents.length} ta</strong> —{' '}
                {t('common.showingRecords', {
                  total: filteredStudents.length,
                  start: startIndex + 1,
                  end: endIndex,
                })}
              </span>
              <div className="flex items-center gap-1.5 pl-3 border-l border-border/20">
                <span>{t('common.perPage')}</span>
                <Select value={String(pageSize)} onValueChange={(val) => setPageSize(Number(val))}>
                  <SelectTrigger className="w-[68px] h-7.5 text-xs rounded-lg bg-muted/40 border-0 focus:ring-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="border-0 shadow-xl rounded-xl bg-card min-w-[5rem]">
                    <SelectItem value="5">5</SelectItem>
                    <SelectItem value="10">10</SelectItem>
                    <SelectItem value="20">20</SelectItem>
                    <SelectItem value="50">50</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex items-center gap-1 self-center sm:self-auto">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="h-8 w-8 rounded-lg hover:bg-muted text-foreground disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
                aria-label={t('common.prevPage')}
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>

              {Array.from({ length: totalPages }).map((_, i) => {
                const pageNumber = i + 1;
                if (
                  totalPages > 5 &&
                  pageNumber !== 1 &&
                  pageNumber !== totalPages &&
                  Math.abs(pageNumber - currentPage) > 1
                ) {
                  if (pageNumber === 2 || pageNumber === totalPages - 1) {
                    return (
                      <span key={pageNumber} className="px-1 text-muted-foreground font-mono">
                        ...
                      </span>
                    );
                  }
                  return null;
                }

                return (
                  <Button
                    key={pageNumber}
                    variant={currentPage === pageNumber ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setCurrentPage(pageNumber)}
                    className={cn(
                      'min-w-8 h-8 px-2 rounded-lg font-mono text-xs font-semibold cursor-pointer',
                      currentPage === pageNumber
                        ? 'shadow-xs'
                        : 'hover:bg-muted text-muted-foreground hover:text-foreground'
                    )}
                  >
                    {pageNumber}
                  </Button>
                );
              })}

              <Button
                variant="ghost"
                size="icon"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages || totalPages === 0}
                className="h-8 w-8 rounded-lg hover:bg-muted text-foreground disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
                aria-label={t('common.nextPage')}
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* 4. Add Student Modal - Clean Shadcn Dialog */}
      <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
        <DialogContent className="sm:max-w-lg p-0 overflow-hidden bg-card text-card-foreground border-0 shadow-2xl rounded-3xl">
          <DialogHeader className="p-6 pb-4 bg-muted/20 border-b border-border/10">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <DialogTitle className="text-base font-bold text-foreground">
                  {t('students.addStudentTitle')}
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                  {t('students.addStudentSubtitle')}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <form onSubmit={handleCreateStudent} className="p-6 space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="student-full-name" className="text-xs font-semibold text-foreground">
                {t('students.fullNameLabel')} <span className="text-destructive">*</span>
              </Label>
              <Input
                id="student-full-name"
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder={t('students.fullNamePlaceholder')}
                required
                className="h-10 bg-muted/30 border-0 focus-visible:ring-1"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="student-pinfl" className="text-xs font-semibold text-foreground">
                  {t('students.pinflHeader')}
                </Label>
                <Input
                  id="student-pinfl"
                  type="text"
                  value={pinfl}
                  onChange={(e) => setPinfl(e.target.value)}
                  placeholder="30101991234567"
                  maxLength={14}
                  className="h-10 bg-muted/30 border-0 focus-visible:ring-1 font-mono"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="student-phone" className="text-xs font-semibold text-foreground">
                  {t('students.phoneLabel') || 'Telefon raqam'}
                </Label>
                <Input
                  id="student-phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+998 90 123 45 67"
                  className="h-10 bg-muted/30 border-0 focus-visible:ring-1 font-mono"
                />
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-primary/10 text-xs flex items-start gap-3">
              <KeyRound className="w-4 h-4 shrink-0 mt-0.5 text-primary" />
              <div className="space-y-0.5">
                <span className="font-semibold block text-xs text-foreground">
                  HEMIS ID va Parol avtomatik shakllantiriladi
                </span>
                <span className="text-[11px] text-muted-foreground block leading-relaxed">
                  O‘quvchiga HEMIS formatidagi unikal raqamli ID (42600001+) va 8 belgili tasodifiy parol tizim tomonidan generatsiya qilinadi.
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-foreground">
                  {t('students.gradeLevelLabel')} <span className="text-destructive">*</span>
                </Label>
                <Select value={gradeLevel} onValueChange={setGradeLevel}>
                  <SelectTrigger className="h-10 text-xs rounded-xl bg-muted/30 border-0 focus:ring-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="border-0 shadow-xl rounded-xl bg-card">
                    <SelectItem value="8-sinf">{t('students.grade8')}</SelectItem>
                    <SelectItem value="9-sinf">{t('students.grade9')}</SelectItem>
                    <SelectItem value="10-sinf">{t('students.grade10')}</SelectItem>
                    <SelectItem value="11-sinf">{t('students.grade11')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-foreground">
                  {t('students.studyGroupLabel')}
                </Label>
                <Select
                  value={selectedGroupId ? String(selectedGroupId) : 'none'}
                  onValueChange={(val) => setSelectedGroupId(val === 'none' ? undefined : Number(val))}
                >
                  <SelectTrigger className="h-10 text-xs rounded-xl bg-muted/30 border-0 focus:ring-1">
                    <SelectValue placeholder="Guruhni tanlang" />
                  </SelectTrigger>
                  <SelectContent className="border-0 shadow-xl rounded-xl bg-card">
                    {groups.map((g) => (
                      <SelectItem key={g.id} value={String(g.id)}>
                        {g.groupCode} ({g.gradeLevel})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <DialogFooter className="pt-3 border-t border-border/10 flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setIsAddModalOpen(false)}
                className="rounded-xl text-xs cursor-pointer"
              >
                {t('common.cancel')}
              </Button>
              <Button
                type="submit"
                disabled={saving}
                isLoading={saving}
                className="rounded-xl text-xs font-semibold cursor-pointer shadow-sm"
              >
                {saving ? t('common.saving') : t('students.saveStudentBtn')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* 5. HEMIS Credential Slip Modal */}
      <CredentialSlipModal
        isOpen={isCredentialModalOpen}
        onClose={() => setIsCredentialModalOpen(false)}
        data={credentialData}
      />

      {/* 6. Student Detailed Profile Modal */}
      {selectedStudentForDetails && (
        <StudentDetailsModal
          isOpen={isDetailsModalOpen}
          onClose={() => {
            setIsDetailsModalOpen(false);
            setSelectedStudentForDetails(null);
          }}
          student={selectedStudentForDetails}
          onEdit={(st) => {
            setIsDetailsModalOpen(false);
            setSelectedStudentForEdit(st);
            setIsEditModalOpen(true);
          }}
          onResetPassword={(st) => {
            setIsDetailsModalOpen(false);
            handleResetPassword(st);
          }}
        />
      )}

      {/* 7. Edit Student Modal */}
      {selectedStudentForEdit && (
        <EditStudentModal
          isOpen={isEditModalOpen}
          onClose={() => {
            setIsEditModalOpen(false);
            setSelectedStudentForEdit(null);
          }}
          student={selectedStudentForEdit}
          groups={groups}
          onSuccess={onRefresh}
        />
      )}

      {/* 8. Safe Archive Confirmation Dialog */}
      <Dialog
        open={isArchiveDialogOpen}
        onOpenChange={(open) => {
          if (!open) {
            setIsArchiveDialogOpen(false);
            setSelectedStudentForArchive(null);
            setArchiveReason('');
          }
        }}
      >
        <DialogContent className="sm:max-w-md border-0 rounded-3xl shadow-2xl bg-card text-card-foreground p-6 sm:p-7">
          <DialogHeader className="space-y-1 text-left">
            <DialogTitle className="text-base sm:text-lg font-bold text-foreground flex items-center gap-2">
              <Archive className="w-5 h-5 text-rose-500" />
              <span>O‘quvchini Arxivlash</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              O‘quvchi arxivlanganda uning tizimga kirish huquqi to‘xtatiladi, ammo barcha dars davomatlari, baholari va akademik tarixi to‘liq saqlanib qoladi.
            </DialogDescription>
          </DialogHeader>

          {selectedStudentForArchive && (
            <div className="space-y-3 pt-2">
              <div className="p-3.5 rounded-2xl bg-muted/40 border border-border/10 space-y-1">
                <span className="text-[11px] text-muted-foreground font-semibold">O‘quvchi:</span>
                <p className="text-sm font-bold text-foreground">{selectedStudentForArchive.fullName}</p>
                <p className="text-xs font-mono text-muted-foreground">ID: {selectedStudentForArchive.studentIdNumber || '—'}</p>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="archive-reason" className="text-xs font-semibold">
                  Arxivlash sababi (ixtiyoriy)
                </Label>
                <Textarea
                  id="archive-reason"
                  value={archiveReason}
                  onChange={(e) => setArchiveReason(e.target.value)}
                  placeholder="Masalan: Boshqa ta'lim muassasasiga ko'chib o'tdi..."
                  className="rounded-xl text-xs resize-none h-20"
                />
              </div>
            </div>
          )}

          <DialogFooter className="flex items-center justify-end gap-2 pt-4 border-t border-border/10">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setIsArchiveDialogOpen(false);
                setSelectedStudentForArchive(null);
                setArchiveReason('');
              }}
              disabled={isArchiving}
              className="rounded-xl text-xs cursor-pointer"
            >
              Bekor qilish
            </Button>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={handleArchive}
              disabled={isArchiving}
              className="rounded-xl text-xs font-bold gap-1.5 cursor-pointer shadow-sm"
            >
              <Archive className="w-3.5 h-3.5" />
              <span>{isArchiving ? 'Arxivlanmoqda...' : 'Arxivlashni tasdiqlash'}</span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};