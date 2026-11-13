import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { groupStructureApi, branchApi } from '@/api';
import type { StudyGroup, Mentor, BranchDto } from '@/types';
import { Edit2, AlertCircle } from 'lucide-react';

interface EditGroupModalProps {
  isOpen: boolean;
  onClose: () => void;
  group: StudyGroup | null;
  mentors: Mentor[];
  branches?: BranchDto[];
  onSuccess: () => void;
}

export const EditGroupModal: React.FC<EditGroupModalProps> = ({
  isOpen,
  onClose,
  group,
  mentors,
  branches: propBranches,
  onSuccess,
}) => {
  const [branches, setBranches] = useState<BranchDto[]>(propBranches || []);

  useEffect(() => {
    if (propBranches && propBranches.length > 0) {
      setBranches(propBranches);
    } else if (branchApi && typeof branchApi.getAll === 'function') {
      branchApi.getAll().then((res) => {
        if (res?.data?.data) setBranches(res.data.data);
      }).catch(() => {});
    }
  }, [propBranches]);

  const [groupCode, setGroupCode] = useState('');
  const [gradeLevel, setGradeLevel] = useState('8-sinf');
  const [subject, setSubject] = useState('');
  const [room, setRoom] = useState('');
  const [scheduleDays, setScheduleDays] = useState('');
  const [scheduleTime, setScheduleTime] = useState('');
  const [mentorId, setMentorId] = useState<number | undefined>();
  const [branchId, setBranchId] = useState<number | undefined>();
  const [maxCapacity, setMaxCapacity] = useState<number>(16);
  const [status, setStatus] = useState<string>('ACTIVE');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (group) {
      setGroupCode(group.groupCode || '');
      setGradeLevel(group.gradeLevel || '8-sinf');
      setSubject(group.subject || '');
      setRoom(group.room || '');
      setScheduleDays(group.scheduleDays || '');
      setScheduleTime(group.scheduleTime || '');
      setMentorId(group.mentor?.id);
      setBranchId(group.branchId || group.branch?.id);
      setMaxCapacity(group.maxCapacity || 16);
      setStatus(group.status || 'ACTIVE');
    }
    setError(null);
  }, [group, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!group) return;
    if (!groupCode.trim()) {
      setError('Guruh kodi kiritilishi shart');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      await groupStructureApi.update(
        group.id,
        {
          groupCode: groupCode.trim(),
          gradeLevel,
          subject: subject.trim(),
          room: room.trim(),
          scheduleDays: scheduleDays.trim(),
          scheduleTime: scheduleTime.trim(),
          maxCapacity,
          status,
        },
        undefined,
        mentorId,
        branchId
      );
      onSuccess();
      onClose();
    } catch (err: unknown) {
      const errMessage =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Guruh ma‘lumotlarini yangilashda xatolik yuz berdi';
      setError(errMessage);
    } finally {
      setLoading(false);
    }
  };

  if (!group) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-primary/10 text-primary">
              <Edit2 className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold">Guruhni tahrirlash</DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                {group.groupCode} — parametrlarini, mentorini va filialini yangilash
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-1">
          {error && (
            <div className="flex items-center gap-2 p-3 text-xs rounded-lg bg-destructive/10 text-destructive border border-destructive/20">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="edit-group-code" className="text-xs font-semibold">
                Guruh kodi <span className="text-destructive">*</span>
              </Label>
              <Input
                id="edit-group-code"
                value={groupCode}
                onChange={(e) => setGroupCode(e.target.value)}
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="edit-grade-level" className="text-xs font-semibold">
                Sinf bosqichi
              </Label>
              <select
                id="edit-grade-level"
                className="w-full h-9 px-3 py-1 bg-background border rounded-md text-sm shadow-xs focus:ring-2 focus:ring-ring focus:outline-hidden"
                value={gradeLevel}
                onChange={(e) => setGradeLevel(e.target.value)}
              >
                <option value="8-sinf">8-sinf</option>
                <option value="9-sinf">9-sinf</option>
                <option value="10-sinf">10-sinf</option>
                <option value="11-sinf">11-sinf</option>
              </select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="edit-subject" className="text-xs font-semibold">
              Fan / Yo‘nalish
            </Label>
            <Input
              id="edit-subject"
              placeholder="Masalan: Web Full-Stack Development"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="edit-branch" className="text-xs font-semibold">
                Biriktirilgan filial
              </Label>
              <select
                id="edit-branch"
                className="w-full h-9 px-3 py-1 bg-background border rounded-md text-sm shadow-xs focus:ring-2 focus:ring-ring focus:outline-hidden"
                value={branchId ?? ''}
                onChange={(e) => setBranchId(e.target.value ? Number(e.target.value) : undefined)}
              >
                <option value="">Filialsiz / Asosiy</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name} ({b.code})
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="edit-mentor" className="text-xs font-semibold">
                Bosh mentor
              </Label>
              <select
                id="edit-mentor"
                className="w-full h-9 px-3 py-1 bg-background border rounded-md text-sm shadow-xs focus:ring-2 focus:ring-ring focus:outline-hidden"
                value={mentorId ?? ''}
                onChange={(e) => setMentorId(e.target.value ? Number(e.target.value) : undefined)}
              >
                <option value="">Mentorsiz</option>
                {mentors.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.fullName} ({m.role})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="edit-room" className="text-xs font-semibold">
                Xona / Lab
              </Label>
              <Input
                id="edit-room"
                placeholder="IT Lab 1"
                value={room}
                onChange={(e) => setRoom(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="edit-capacity" className="text-xs font-semibold">
                Maksimal sig‘im
              </Label>
              <Input
                id="edit-capacity"
                type="number"
                min={1}
                max={50}
                value={maxCapacity}
                onChange={(e) => setMaxCapacity(Number(e.target.value))}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="edit-status" className="text-xs font-semibold">
                Holati
              </Label>
              <select
                id="edit-status"
                className="w-full h-9 px-3 py-1 bg-background border rounded-md text-sm shadow-xs focus:ring-2 focus:ring-ring focus:outline-hidden"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
              >
                <option value="ACTIVE">ACTIVE</option>
                <option value="COMPLETED">COMPLETED</option>
                <option value="ARCHIVED">ARCHIVED</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="edit-days" className="text-xs font-semibold">
                Mashg‘ulot kunlari
              </Label>
              <Input
                id="edit-days"
                placeholder="Dush-Chor-Jum yoki Sesh-Pay-Shan"
                value={scheduleDays}
                onChange={(e) => setScheduleDays(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="edit-time" className="text-xs font-semibold">
                Mashg‘ulot vaqti
              </Label>
              <Input
                id="edit-time"
                placeholder="15:00 - 16:30"
                value={scheduleTime}
                onChange={(e) => setScheduleTime(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter className="pt-3">
            <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
              Bekor qilish
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Saqlanmoqda...' : 'Saqlash'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
