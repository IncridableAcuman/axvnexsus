import React, { useState, useEffect } from 'react';
import {
  User,
  GraduationCap,
  Building2,
  Phone,
  Hash,
  History,
  KeyRound,
  Edit2,
  Copy,
  Check,
  BookOpen,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from '@/components/ui/table';
import { studentApi } from '@/api';
import { useToast } from '@/shared/ui/toast/ToastContext';
import type { Student, GroupMembershipDto } from '@/types';
import { cn } from '@/lib/utils';

interface StudentDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  student: Student | null;
  onEdit?: (student: Student) => void;
  onResetPassword?: (student: Student) => void;
}

export const StudentDetailsModal: React.FC<StudentDetailsModalProps> = ({
  isOpen,
  onClose,
  student,
  onEdit,
  onResetPassword,
}) => {
  const toast = useToast();
  const [activeTab, setActiveTab] = useState<'profile' | 'history'>('profile');
  const [history, setHistory] = useState<GroupMembershipDto[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [copiedId, setCopiedId] = useState(false);

  useEffect(() => {
    if (isOpen && student?.id) {
      loadHistory(student.id);
    } else {
      setHistory([]);
      setActiveTab('profile');
    }
  }, [isOpen, student?.id]);

  const loadHistory = async (studentId: number) => {
    try {
      setLoadingHistory(true);
      const res = await studentApi.getGroupHistory(studentId);
      setHistory(res.data?.data || []);
    } catch (err) {
      console.error('Failed to load student group history:', err);
    } finally {
      setLoadingHistory(false);
    }
  };

  if (!student) return null;

  const handleCopyId = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (student.studentIdNumber) {
      navigator.clipboard.writeText(student.studentIdNumber);
      setCopiedId(true);
      toast.success('Nusxalandi', 'HEMIS ID nusxalab olindi');
      setTimeout(() => setCopiedId(false), 2000);
    }
  };

  const getInitials = (name?: string) => {
    if (!name) return 'U';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  const isArchived = student.status === 'ARCHIVED' || student.status === 'Arxivlangan';
  const isActive = student.status === 'ACTIVE' || student.status === 'Faol';

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-2xl border-0 rounded-3xl shadow-2xl bg-card text-card-foreground p-6 sm:p-7 max-h-[90vh] overflow-y-auto">
        <DialogHeader className="space-y-1 text-left">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-lg font-bold text-foreground flex items-center gap-2">
              <GraduationCap className="w-5 h-5 text-primary" />
              <span>O‘quvchi Shaxsiy Profili</span>
            </DialogTitle>
          </div>
          <DialogDescription className="text-xs text-muted-foreground">
            HEMIS axborot tizimi va akademik guruh a’zoligi ma’lumotlari
          </DialogDescription>
        </DialogHeader>

        {/* Profile Header Banner */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-2xl bg-muted/30 border border-border/10 mt-3">
          <div className="flex items-center gap-3.5">
            <Avatar className="w-13 h-13 rounded-2xl bg-primary/10 text-primary font-black text-lg border-0 shadow-sm">
              <AvatarFallback className="bg-primary/10 text-primary font-bold">
                {getInitials(student.fullName)}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <h3 className="font-bold text-base text-foreground truncate">
                {student.fullName}
              </h3>
              <div className="flex items-center gap-2 mt-1">
                <span className="font-mono text-xs font-semibold text-muted-foreground">
                  ID: {student.studentIdNumber || '—'}
                </span>
                {student.studentIdNumber && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleCopyId}
                    className="h-5 w-5 text-muted-foreground hover:text-foreground cursor-pointer"
                    title="ID dan nusxa olish"
                  >
                    {copiedId ? (
                      <Check className="w-3 h-3 text-emerald-500" />
                    ) : (
                      <Copy className="w-3 h-3" />
                    )}
                  </Button>
                )}
              </div>
            </div>
          </div>

          <Badge
            variant={isActive ? 'success' : isArchived ? 'destructive' : 'secondary'}
            className="px-3 py-1 rounded-full text-xs font-semibold self-start sm:self-center"
          >
            <span
              className={cn(
                'w-1.5 h-1.5 rounded-full mr-1.5',
                isActive ? 'bg-emerald-500 animate-pulse' : isArchived ? 'bg-rose-500' : 'bg-muted-foreground'
              )}
            />
            {student.status}
          </Badge>
        </div>

        {/* Navigation Tabs */}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'profile' | 'history')} className="mt-4">
          <TabsList className="grid grid-cols-2 p-1 bg-muted/40 rounded-xl">
            <TabsTrigger value="profile" className="rounded-lg text-xs font-semibold gap-1.5">
              <User className="w-3.5 h-3.5" />
              <span>Ma'lumotlar</span>
            </TabsTrigger>
            <TabsTrigger value="history" className="rounded-lg text-xs font-semibold gap-1.5">
              <History className="w-3.5 h-3.5" />
              <span>Guruhlar tarixi ({history.length})</span>
            </TabsTrigger>
          </TabsList>

          {/* Profile Tab */}
          <TabsContent value="profile" className="mt-4 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="p-3.5 rounded-xl bg-muted/20 border border-border/10 space-y-1">
                <span className="text-[11px] text-muted-foreground flex items-center gap-1.5">
                  <Hash className="w-3.5 h-3.5 text-primary" />
                  JSHSHIR (PINFL)
                </span>
                <p className="font-mono font-semibold text-foreground text-sm">
                  {student.pinfl || '—'}
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-muted/20 border border-border/10 space-y-1">
                <span className="text-[11px] text-muted-foreground flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-primary" />
                  Telefon raqami
                </span>
                <p className="font-mono font-semibold text-foreground text-sm">
                  {student.phone || '—'}
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-muted/20 border border-border/10 space-y-1">
                <span className="text-[11px] text-muted-foreground flex items-center gap-1.5">
                  <GraduationCap className="w-3.5 h-3.5 text-primary" />
                  Sinf bosqichi
                </span>
                <p className="font-semibold text-foreground text-sm">
                  {student.gradeLevel || '8-sinf'}
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-muted/20 border border-border/10 space-y-1">
                <span className="text-[11px] text-muted-foreground flex items-center gap-1.5">
                  <BookOpen className="w-3.5 h-3.5 text-primary" />
                  Ta'lim yo'nalishi
                </span>
                <p className="font-semibold text-foreground text-sm truncate">
                  {student.direction || 'Web Full-Stack'}
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-muted/20 border border-border/10 space-y-1">
                <span className="text-[11px] text-muted-foreground flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5 text-primary" />
                  Filial va hudud
                </span>
                <p className="font-semibold text-foreground text-sm truncate">
                  {student.branchLocation || 'IT Park Yangiariq'} ({student.district || 'Yangiariq tumani'})
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-muted/20 border border-border/10 space-y-1">
                <span className="text-[11px] text-muted-foreground flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-primary" />
                  Biriktirilgan guruh va mentor
                </span>
                <p className="font-semibold text-foreground text-sm">
                  {student.studyGroup?.groupCode ? (
                    <span className="font-mono text-primary mr-1.5">{student.studyGroup.groupCode}</span>
                  ) : (
                    'Guruh biriktirilmagan'
                  )}
                  {student.mentor && (
                    <span className="text-muted-foreground text-xs">({student.mentor.fullName})</span>
                  )}
                </p>
              </div>
            </div>
          </TabsContent>

          {/* Group History Tab */}
          <TabsContent value="history" className="mt-4">
            {loadingHistory ? (
              <div className="py-12 text-center text-xs text-muted-foreground">
                Tarix yuklanmoqda...
              </div>
            ) : history.length === 0 ? (
              <div className="py-12 text-center text-xs text-muted-foreground">
                <History className="w-8 h-8 opacity-40 mx-auto mb-2" />
                <p>O‘quvchining guruhlararo ko‘chish tarixi mavjud emas</p>
              </div>
            ) : (
              <div className="rounded-xl border border-border/20 overflow-hidden">
                <Table>
                  <TableHeader className="bg-muted/30">
                    <TableRow>
                      <TableHead className="text-xs font-bold">Guruh</TableHead>
                      <TableHead className="text-xs font-bold">Holat</TableHead>
                      <TableHead className="text-xs font-bold">Qabul sanasi</TableHead>
                      <TableHead className="text-xs font-bold">Chiqish sanasi</TableHead>
                      <TableHead className="text-xs font-bold">Sabab / Izoh</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {history.map((h) => (
                      <TableRow key={h.id} className="text-xs">
                        <TableCell className="font-mono font-bold text-foreground">
                          {h.groupCode || `#${h.groupId}`}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={h.status === 'ACTIVE' ? 'success' : 'secondary'}
                            className="text-[10px] px-2 py-0.5"
                          >
                            {h.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-mono text-muted-foreground">
                          {h.enrolledAt ? new Date(h.enrolledAt).toLocaleDateString('uz-UZ') : '—'}
                        </TableCell>
                        <TableCell className="font-mono text-muted-foreground">
                          {h.leftAt ? new Date(h.leftAt).toLocaleDateString('uz-UZ') : 'Hozirgi'}
                        </TableCell>
                        <TableCell className="text-muted-foreground italic max-w-[180px] truncate">
                          {h.transferReason || '—'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Modal Actions */}
        <DialogFooter className="flex flex-col sm:flex-row items-center justify-between gap-2.5 pt-4 border-t border-border/10">
          <div className="flex items-center gap-2 w-full sm:w-auto">
            {onResetPassword && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onResetPassword(student)}
                className="rounded-xl text-xs font-semibold gap-1.5 cursor-pointer text-amber-600 dark:text-amber-400 hover:bg-amber-500/10 border-amber-500/20"
              >
                <KeyRound className="w-3.5 h-3.5" />
                <span>Parolni yangilash</span>
              </Button>
            )}
            {onEdit && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onEdit(student)}
                className="rounded-xl text-xs font-semibold gap-1.5 cursor-pointer"
              >
                <Edit2 className="w-3.5 h-3.5" />
                <span>Tahrirlash</span>
              </Button>
            )}
          </div>

          <Button
            size="sm"
            onClick={onClose}
            className="rounded-xl text-xs font-bold px-5 cursor-pointer w-full sm:w-auto"
          >
            Yopish
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
