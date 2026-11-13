import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
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
} from 'lucide-react';
import { useBranchStatistics, useBranchGroups, useBranchRooms } from './useBranches';
import type { BranchDto } from '@/types';

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
  const [activeTab, setActiveTab] = useState<'overview' | 'groups' | 'rooms'>('overview');

  const { data: stats, isLoading: statsLoading } = useBranchStatistics(branch?.id);
  const { data: groups = [], isLoading: groupsLoading } = useBranchGroups(branch?.id);
  const { data: rooms = [], isLoading: roomsLoading } = useBranchRooms(branch?.id);

  if (!branch) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-primary/10 text-primary">
                <Building2 className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <DialogTitle className="text-xl font-bold">{branch.name}</DialogTitle>
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
                <DialogDescription className="font-mono text-xs mt-0.5">
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
              >
                Tahrirlash
              </Button>
            )}
          </div>
        </DialogHeader>

        {/* Navigation Tabs */}
        <div className="flex border-b space-x-4 mt-2">
          <button
            onClick={() => setActiveTab('overview')}
            className={`pb-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'overview'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            Umumiy ko‘rinish
          </button>
          <button
            onClick={() => setActiveTab('groups')}
            className={`pb-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'groups'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            Guruhlar ({groups.length})
          </button>
          <button
            onClick={() => setActiveTab('rooms')}
            className={`pb-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'rooms'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            Laboratoriyalar & Xonalar ({rooms.length})
          </button>
        </div>

        {activeTab === 'overview' && (
          <div className="space-y-6 pt-2">
            {/* KPI Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <Card className="p-3 bg-muted/40 border">
                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                  <Users className="w-4 h-4 text-primary" />
                  <span className="text-xs font-medium">O‘quvchilar</span>
                </div>
                <div className="text-xl font-bold">
                  {statsLoading ? '...' : stats?.totalStudents ?? branch.studentCount ?? 0}
                </div>
                <div className="text-[11px] text-muted-foreground">
                  Faol: {statsLoading ? '...' : stats?.activeStudents ?? 0} nafar
                </div>
              </Card>

              <Card className="p-3 bg-muted/40 border">
                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                  <GraduationCap className="w-4 h-4 text-blue-500" />
                  <span className="text-xs font-medium">Guruhlar</span>
                </div>
                <div className="text-xl font-bold">
                  {statsLoading ? '...' : stats?.totalGroups ?? branch.groupCount ?? 0}
                </div>
                <div className="text-[11px] text-muted-foreground">
                  Faol: {statsLoading ? '...' : stats?.activeGroups ?? 0} ta
                </div>
              </Card>

              <Card className="p-3 bg-muted/40 border">
                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                  <Award className="w-4 h-4 text-emerald-500" />
                  <span className="text-xs font-medium">Mentorlar</span>
                </div>
                <div className="text-xl font-bold">
                  {statsLoading ? '...' : stats?.totalMentors ?? branch.mentorCount ?? 0}
                </div>
                <div className="text-[11px] text-muted-foreground">Biriktirilgan mutaxassislar</div>
              </Card>

              <Card className="p-3 bg-muted/40 border">
                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                  <Percent className="w-4 h-4 text-amber-500" />
                  <span className="text-xs font-medium">Sig‘im darajasi</span>
                </div>
                <div className="text-xl font-bold">
                  {statsLoading ? '...' : `${stats?.capacityUtilizationRate ?? 0}%`}
                </div>
                <div className="text-[11px] text-muted-foreground">
                  O‘rindiqlar: {statsLoading ? '...' : stats?.totalRoomCapacity ?? 0} ta
                </div>
              </Card>
            </div>

            {/* Capacity Progress Bar */}
            {stats && stats.totalRoomCapacity > 0 && (
              <div className="space-y-1.5 p-3 rounded-lg border bg-muted/20">
                <div className="flex justify-between text-xs font-medium">
                  <span>Infratuzilma bandligi</span>
                  <span>{stats.capacityUtilizationRate}%</span>
                </div>
                <Progress value={Math.min(100, stats.capacityUtilizationRate)} />
              </div>
            )}

            {/* Details & Contacts */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-3 p-4 rounded-lg border bg-card">
                <h4 className="text-sm font-semibold flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-primary" /> Joylashuv va manzil
                </h4>
                <div className="text-sm space-y-1.5 text-muted-foreground">
                  <div>
                    <span className="font-medium text-foreground">Hudud:</span> {branch.region}
                  </div>
                  {branch.district && (
                    <div>
                      <span className="font-medium text-foreground">Tuman / Shahar:</span>{' '}
                      {branch.district}
                    </div>
                  )}
                  {branch.address && (
                    <div>
                      <span className="font-medium text-foreground">Manzil:</span> {branch.address}
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-3 p-4 rounded-lg border bg-card">
                <h4 className="text-sm font-semibold flex items-center gap-2">
                  <Phone className="w-4 h-4 text-primary" /> Aloqa vositalari
                </h4>
                <div className="text-sm space-y-1.5 text-muted-foreground">
                  {branch.phone && (
                    <div className="flex items-center gap-1.5">
                      <Phone className="w-3.5 h-3.5" />
                      <span>{branch.phone}</span>
                    </div>
                  )}
                  {branch.email && (
                    <div className="flex items-center gap-1.5">
                      <Mail className="w-3.5 h-3.5" />
                      <span>{branch.email}</span>
                    </div>
                  )}
                  {branch.createdAt && (
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground pt-1">
                      <Calendar className="w-3.5 h-3.5" />
                      <span>Tizimga qo‘shilgan: {new Date(branch.createdAt).toLocaleDateString()}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Description */}
            {branch.description && (
              <div className="p-4 rounded-lg border bg-card space-y-1.5">
                <h4 className="text-sm font-semibold">Tavsif</h4>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {branch.description}
                </p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'groups' && (
          <div className="space-y-3 pt-2">
            {groupsLoading ? (
              <div className="text-center py-8 text-sm text-muted-foreground">
                Guruhlar yuklanmoqda...
              </div>
            ) : groups.length === 0 ? (
              <div className="text-center py-8 text-sm text-muted-foreground">
                Ushbu filialda hozircha hech qanday ta‘lim guruhi ochilmagan.
              </div>
            ) : (
              <div className="border rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-muted text-muted-foreground font-medium border-b">
                    <tr>
                      <th className="px-3 py-2 text-left">Guruh kodi</th>
                      <th className="px-3 py-2 text-left">Sinf</th>
                      <th className="px-3 py-2 text-left">Yo‘nalish / Fan</th>
                      <th className="px-3 py-2 text-left">Mentor</th>
                      <th className="px-3 py-2 text-left">Xona</th>
                      <th className="px-3 py-2 text-center">O‘quvchilar</th>
                      <th className="px-3 py-2 text-right">Holat</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {groups.map((g) => (
                      <tr key={g.id} className="hover:bg-muted/30">
                        <td className="px-3 py-2 font-mono font-medium">{g.groupCode}</td>
                        <td className="px-3 py-2">{g.gradeLevel}</td>
                        <td className="px-3 py-2">{g.subject || '—'}</td>
                        <td className="px-3 py-2">{g.mentor?.fullName || '—'}</td>
                        <td className="px-3 py-2">{g.room || '—'}</td>
                        <td className="px-3 py-2 text-center">
                          {g.studentCount ?? 0} / {g.maxCapacity ?? 16}
                        </td>
                        <td className="px-3 py-2 text-right">
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
          </div>
        )}

        {activeTab === 'rooms' && (
          <div className="space-y-3 pt-2">
            {roomsLoading ? (
              <div className="text-center py-8 text-sm text-muted-foreground">
                Laboratoriyalar yuklanmoqda...
              </div>
            ) : rooms.length === 0 ? (
              <div className="text-center py-8 text-sm text-muted-foreground">
                Ushbu filialda hozircha alohida IT laboratoriya xonalari ro‘yxatga olinmagan.
              </div>
            ) : (
              <div className="border rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-muted text-muted-foreground font-medium border-b">
                    <tr>
                      <th className="px-4 py-2.5 text-left">Xona / Laboratoriya nomi</th>
                      <th className="px-4 py-2.5 text-center">Kompyuterli o‘rinlar (Sig‘im)</th>
                      <th className="px-4 py-2.5 text-right">Turi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {rooms.map((r) => (
                      <tr key={r.id} className="hover:bg-muted/30">
                        <td className="px-4 py-2.5 font-medium flex items-center gap-2">
                          <Layers className="w-4 h-4 text-primary" />
                          <span>{r.name}</span>
                        </td>
                        <td className="px-4 py-2.5 text-center font-semibold">
                          {r.capacity ?? 16} ta o‘rin
                        </td>
                        <td className="px-4 py-2.5 text-right">
                          <Badge variant="outline">IT Lab</Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
