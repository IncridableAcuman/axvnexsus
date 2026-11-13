import React, { useState, useEffect } from 'react';
import {
  Users,
  ArrowRightLeft,
  UserPlus,
  History,
  GraduationCap,
  MapPin,
  Calendar,
  Layers,
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
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from '@/components/ui/tabs';
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from '@/components/ui/table';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { groupStructureApi } from '@/api';
import { StudentTransferModal } from './StudentTransferModal';
import { StudentEnrollmentModal } from './StudentEnrollmentModal';
import type { GroupDetailDto, GroupMembershipDto, StudyGroup, Student } from '@/types';

interface GroupDetailsModalProps {
  groupId: number | null;
  isOpen: boolean;
  onClose: () => void;
  availableGroups: StudyGroup[];
  allStudents: Student[];
  onRefreshParent: () => void;
}

export const GroupDetailsModal: React.FC<GroupDetailsModalProps> = ({
  groupId,
  isOpen,
  onClose,
  availableGroups,
  allStudents,
  onRefreshParent,
}) => {
  const [detail, setDetail] = useState<GroupDetailDto | null>(null);
  const [history, setHistory] = useState<GroupMembershipDto[]>([]);
  const [activeTab, setActiveTab] = useState<'members' | 'history'>('members');
  const [loading, setLoading] = useState(false);

  // Sub modals
  const [transferTarget, setTransferTarget] = useState<GroupMembershipDto | null>(null);
  const [isEnrollModalOpen, setIsEnrollModalOpen] = useState(false);

  useEffect(() => {
    if (isOpen && groupId) {
      loadDetail(groupId);
    }
  }, [isOpen, groupId]);

  const loadDetail = async (id: number) => {
    try {
      setLoading(true);
      const [detailRes, historyRes] = await Promise.all([
        groupStructureApi.getDetail(id),
        groupStructureApi.getGroupHistory(id),
      ]);
      setDetail(detailRes.data.data);
      setHistory(historyRes.data.data);
    } catch (err) {
      console.error('Failed to load group details:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleUnenrollStudent = async (studentId: number, studentName?: string) => {
    if (!groupId) return;
    const reason = window.prompt(
      `${studentName || "O'quvchi"}ni guruh a'zoligidan chiqarish sababini kiriting (ixtiyoriy):`,
      "O'z xohishiga binoan"
    );
    if (reason === null) return;

    try {
      setLoading(true);
      await groupStructureApi.unenrollStudent(groupId, studentId, reason);
      await loadDetail(groupId);
      onRefreshParent();
    } catch (err) {
      console.error('Failed to unenroll student:', err);
    } finally {
      setLoading(false);
    }
  };

  if (!groupId) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto border-0 shadow-2xl rounded-2xl bg-card text-card-foreground">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <GraduationCap className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="text-lg sm:text-xl font-bold flex items-center gap-2">
                <span>Guruh Tafsilotlari: {detail?.groupCode || 'Yuklanmoqda...'}</span>
                {detail && (
                  <Badge variant={detail.status === 'ACTIVE' ? 'success' : 'neutral'} className="text-[10px] rounded-full border-0">
                    {detail.status === 'ACTIVE' ? 'Faol' : detail.status}
                  </Badge>
                )}
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                {detail?.subject || 'Muhammad Al-Xorazmiy Vorislari Ixtisoslashtirilgan Dasturi'}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {loading ? (
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[...Array(4)].map((_, i) => (
                <Skeleton key={i} className="h-16 rounded-xl bg-muted/60" />
              ))}
            </div>
            <Skeleton className="h-48 rounded-xl bg-muted/40" />
          </div>
        ) : (
          <div className="space-y-5 pt-2">
            {/* Executive KPI Header Cards (Borderless, Soft Design) */}
            {detail && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3.5 rounded-xl bg-muted/40 flex flex-col justify-between">
                  <div className="flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground mb-1">
                    <Layers className="w-3.5 h-3.5 text-primary" />
                    <span>Sinf bosqichi</span>
                  </div>
                  <div className="text-sm font-bold text-foreground">
                    <Badge variant="secondary" className="font-semibold text-xs border-0">
                      {detail.gradeLevel}
                    </Badge>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-muted/40 flex flex-col justify-between">
                  <div className="flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground mb-1">
                    <Users className="w-3.5 h-3.5 text-primary" />
                    <span>Mentor</span>
                  </div>
                  <div className="text-sm font-bold text-foreground truncate">
                    {detail.mentor?.fullName || <span className="text-muted-foreground font-normal italic text-xs">Biriktirilmagan</span>}
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-muted/40 flex flex-col justify-between">
                  <div className="flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground mb-1">
                    <MapPin className="w-3.5 h-3.5 text-primary" />
                    <span>Xona / Filial</span>
                  </div>
                  <div className="text-xs font-bold text-foreground truncate">
                    {detail.room} <span className="text-[11px] font-normal text-muted-foreground">({detail.branchName || detail.branchLocation || 'Bosh filial'})</span>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-muted/40 flex flex-col justify-between">
                  <div className="flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground mb-1">
                    <Calendar className="w-3.5 h-3.5 text-primary" />
                    <span>Sig‘im holati</span>
                  </div>
                  <div className="text-xs font-bold text-foreground flex items-center gap-1.5">
                    <span>{detail.studentCount} / {detail.maxCapacity}</span>
                    <Badge
                      variant={detail.studentCount >= detail.maxCapacity ? 'destructive' : 'primary'}
                      className="text-[10px] rounded-full px-1.5 py-0 border-0"
                    >
                      {Math.round(((detail.studentCount || 0) / (detail.maxCapacity || 16)) * 100)}%
                    </Badge>
                  </div>
                </div>
              </div>
            )}

            {/* Tabs for Active Members & History */}
            <Tabs
              value={activeTab}
              onValueChange={(val) => setActiveTab(val as 'members' | 'history')}
              className="w-full"
            >
              <TabsList className="grid w-full grid-cols-2 rounded-xl bg-muted/50 p-1 border-0">
                <TabsTrigger
                  value="members"
                  className="rounded-lg text-xs font-semibold data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-xs flex items-center justify-center gap-2 border-0"
                >
                  <Users className="w-3.5 h-3.5" />
                  <span>Faol O‘quvchilar ({detail?.activeMembers?.length || 0})</span>
                </TabsTrigger>
                <TabsTrigger
                  value="history"
                  className="rounded-lg text-xs font-semibold data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-xs flex items-center justify-center gap-2 border-0"
                >
                  <History className="w-3.5 h-3.5" />
                  <span>A’zolik & Tarix ({history.length})</span>
                </TabsTrigger>
              </TabsList>

              {/* Members Content */}
              <TabsContent value="members" className="pt-2">
                <div className="rounded-xl overflow-hidden bg-muted/20 border-0">
                  <Table>
                    <TableHeader className="bg-muted/40 border-0 [&_tr]:border-b-0">
                      <TableRow className="hover:bg-transparent border-0 border-b-0">
                        <TableHead className="w-12 text-xs font-semibold text-muted-foreground border-0">#</TableHead>
                        <TableHead className="text-xs font-semibold text-muted-foreground border-0">O‘quvchi</TableHead>
                        <TableHead className="text-xs font-semibold text-muted-foreground border-0">A’zo bo‘lgan sana</TableHead>
                        <TableHead className="text-right text-xs font-semibold text-muted-foreground border-0">Amal</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {detail?.activeMembers && detail.activeMembers.length > 0 ? (
                        detail.activeMembers.map((m, idx) => (
                          <TableRow key={m.id} className="hover:bg-muted/30 border-0 border-b-0 transition-colors">
                            <TableCell className="text-xs font-mono text-muted-foreground py-3 border-0">
                              {idx + 1}
                            </TableCell>
                            <TableCell className="py-3 border-0">
                              <div className="flex items-center gap-2.5">
                                <Avatar className="w-7 h-7 rounded-lg ring-0 border-0">
                                  <AvatarFallback className="text-[10px] font-bold bg-primary/10 text-primary rounded-lg border-0">
                                    {m.studentName ? m.studentName.charAt(0) : 'O'}
                                  </AvatarFallback>
                                </Avatar>
                                <span className="font-semibold text-xs text-foreground">{m.studentName}</span>
                              </div>
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground py-3 border-0">
                              {new Date(m.enrolledAt).toLocaleDateString()}
                            </TableCell>
                            <TableCell className="text-right py-3 border-0">
                              <div className="flex items-center justify-end gap-1.5">
                                <Button
                                  variant="secondary"
                                  size="sm"
                                  onClick={() => setTransferTarget(m)}
                                  className="h-7 text-xs rounded-lg border-0 bg-muted/60 hover:bg-muted"
                                  leftIcon={<ArrowRightLeft className="w-3 h-3" />}
                                >
                                  Ko‘chirish
                                </Button>
                                <Button
                                  variant="secondary"
                                  size="sm"
                                  onClick={() => m.studentId && handleUnenrollStudent(m.studentId, m.studentName || undefined)}
                                  className="h-7 text-xs rounded-lg border-0 text-destructive bg-destructive/10 hover:bg-destructive/20"
                                >
                                  Chiqarish
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow className="border-0">
                          <TableCell colSpan={4} className="py-10 text-center text-xs text-muted-foreground border-0">
                            Guruhda hozircha o‘quvchilar mavjud emas.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </TabsContent>

              {/* History Content */}
              <TabsContent value="history" className="pt-2">
                <div className="rounded-xl overflow-hidden bg-muted/20 border-0">
                  <Table>
                    <TableHeader className="bg-muted/40 border-0 [&_tr]:border-b-0">
                      <TableRow className="hover:bg-transparent border-0 border-b-0">
                        <TableHead className="text-xs font-semibold text-muted-foreground border-0">O‘quvchi</TableHead>
                        <TableHead className="text-xs font-semibold text-muted-foreground border-0">Holat</TableHead>
                        <TableHead className="text-xs font-semibold text-muted-foreground border-0">Sana</TableHead>
                        <TableHead className="text-xs font-semibold text-muted-foreground border-0">Izoh / Sabab</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {history.length > 0 ? (
                        history.map((h) => (
                          <TableRow key={h.id} className="hover:bg-muted/30 border-0 border-b-0 transition-colors">
                            <TableCell className="font-semibold text-xs text-foreground py-3 border-0">
                              {h.studentName}
                            </TableCell>
                            <TableCell className="py-3 border-0">
                              <Badge
                                variant={h.status === 'ACTIVE' ? 'success' : 'neutral'}
                                className="text-[10px] rounded-full border-0"
                              >
                                {h.status === 'ACTIVE' ? 'Faol a’zo' : 'Ko‘chirilgan'}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground py-3 border-0">
                              {new Date(h.enrolledAt).toLocaleDateString()}
                              {h.leftAt && ` → ${new Date(h.leftAt).toLocaleDateString()}`}
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground py-3 border-0">
                              {h.transferReason || '—'}
                            </TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow className="border-0">
                          <TableCell colSpan={4} className="py-10 text-center text-xs text-muted-foreground border-0">
                            Hozircha o‘quvchilar ko‘chirish tarixi mavjud emas.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        )}

        <DialogFooter className="pt-4 flex flex-row items-center justify-between sm:justify-between w-full border-0">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setIsEnrollModalOpen(true)}
            className="rounded-lg text-xs border-0 bg-muted/60 hover:bg-muted text-foreground"
            leftIcon={<UserPlus className="w-3.5 h-3.5" />}
          >
            O‘quvchi biriktirish
          </Button>
          <Button
            variant="default"
            size="sm"
            onClick={onClose}
            className="rounded-lg text-xs border-0 font-semibold"
          >
            Yopish
          </Button>
        </DialogFooter>
      </DialogContent>

      {/* Sub modals */}
      <StudentTransferModal
        membership={transferTarget}
        currentGroupId={groupId}
        availableGroups={availableGroups}
        isOpen={Boolean(transferTarget)}
        onClose={() => setTransferTarget(null)}
        onSuccess={() => {
          loadDetail(groupId);
          onRefreshParent();
        }}
      />

      <StudentEnrollmentModal
        groupId={groupId}
        groupCode={detail?.groupCode || ''}
        allStudents={allStudents}
        isOpen={isEnrollModalOpen}
        onClose={() => setIsEnrollModalOpen(false)}
        onSuccess={() => {
          loadDetail(groupId);
          onRefreshParent();
        }}
      />
    </Dialog>
  );
};
