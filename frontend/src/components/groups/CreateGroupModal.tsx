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
import type { Mentor, BranchDto } from '@/types';
import { PlusCircle } from 'lucide-react';

interface CreateGroupModalProps {
  isOpen: boolean;
  onClose: () => void;
  mentors: Mentor[];
  branches?: BranchDto[];
  onSuccess: () => void;
}

export const CreateGroupModal: React.FC<CreateGroupModalProps> = ({
  isOpen,
  onClose,
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
  const [name, setName] = useState('');
  const [gradeLevel, setGradeLevel] = useState('8-sinf');
  const [roomLocation, setRoomLocation] = useState('Xona 101');
  const [lessonDays, setLessonDays] = useState('Dush-Chor-Jum');
  const [lessonTime, setLessonTime] = useState('14:00 - 16:00');
  const [mentorId, setMentorId] = useState<number | undefined>(mentors[0]?.id);
  const [branchId, setBranchId] = useState<number | undefined>();
  const [maxCapacity, setMaxCapacity] = useState<number>(16);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Guruh nomi kiritilishi shart');
      return;
    }
    setError(null);
    setLoading(true);
    try {
      await groupStructureApi.create(
        {
          groupCode: name.trim(),
          gradeLevel,
          room: roomLocation,
          scheduleDays: lessonDays,
          scheduleTime: lessonTime,
          maxCapacity,
          status: 'ACTIVE',
        },
        1, // Default academic period
        mentorId,
        branchId
      );
      setName('');
      onSuccess();
      onClose();
    } catch (err: unknown) {
      const errMessage =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Guruh yaratishda xatolik yuz berdi';
      setError(errMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg border-0 shadow-2xl rounded-2xl bg-card text-card-foreground">
        <DialogHeader>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <PlusCircle className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold">Yangi o'quv guruhi yaratish</DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                8–11-sinf o‘quvchilari uchun yangi dars guruhini ochish, filial va mentor biriktirish
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-1">
          {error && (
            <div className="p-3 text-xs rounded-xl bg-destructive/10 text-destructive font-medium border-0">
              {error}
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="group-name" className="text-xs font-semibold text-foreground">
              Guruh nomi (Kodi) <span className="text-destructive">*</span>
            </Label>
            <Input
              id="group-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Masalan: 8-IT-A (Frontend asoslari)"
              required
              className="text-xs h-9 rounded-xl bg-muted/40 border-0 focus-visible:ring-1 focus-visible:ring-primary shadow-none"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="assigned-branch" className="text-xs font-semibold text-foreground">
              Biriktirilgan Filial
            </Label>
            <select
              id="assigned-branch"
              value={branchId ?? ''}
              onChange={(e) => setBranchId(e.target.value ? Number(e.target.value) : undefined)}
              aria-label="Biriktirilgan Filial"
              className="flex h-9 w-full rounded-xl border-0 bg-muted/40 px-3 py-1 text-xs text-foreground shadow-none transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer font-medium"
            >
              <option value="">Filialsiz / Asosiy filial</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name} ({b.code})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="grade-level" className="text-xs font-semibold text-foreground">
                Sinf bosqichi (8–11) <span className="text-destructive">*</span>
              </Label>
              <select
                id="grade-level"
                value={gradeLevel}
                onChange={(e) => setGradeLevel(e.target.value)}
                aria-label="Sinf bosqichi"
                className="flex h-9 w-full rounded-xl border-0 bg-muted/40 px-3 py-1 text-xs text-foreground shadow-none transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer font-medium"
              >
                <option value="8-sinf">8-sinf</option>
                <option value="9-sinf">9-sinf</option>
                <option value="10-sinf">10-sinf</option>
                <option value="11-sinf">11-sinf</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="max-capacity" className="text-xs font-semibold text-foreground">
                Maksimal sig'im (Cheklov: 16)
              </Label>
              <Input
                id="max-capacity"
                type="number"
                min={1}
                max={30}
                value={maxCapacity}
                onChange={(e) => setMaxCapacity(parseInt(e.target.value, 10) || 16)}
                className="text-xs h-9 rounded-xl bg-muted/40 border-0 focus-visible:ring-1 focus-visible:ring-primary shadow-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="lesson-days" className="text-xs font-semibold text-foreground">
                Dars kunlari
              </Label>
              <select
                id="lesson-days"
                value={lessonDays}
                onChange={(e) => setLessonDays(e.target.value)}
                aria-label="Dars kunlari"
                className="flex h-9 w-full rounded-xl border-0 bg-muted/40 px-3 py-1 text-xs text-foreground shadow-none transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer font-medium"
              >
                <option value="Dush-Chor-Jum">Dush-Chor-Jum (Toq kunlar)</option>
                <option value="Sesh-Pay-Shan">Sesh-Pay-Shan (Juft kunlar)</option>
                <option value="Har kuni">Har kuni</option>
                <option value="Shanba-Yakshanba">Hafta oxiri (Weekend)</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="lesson-time" className="text-xs font-semibold text-foreground">
                Dars vaqti
              </Label>
              <Input
                id="lesson-time"
                value={lessonTime}
                onChange={(e) => setLessonTime(e.target.value)}
                placeholder="Masalan: 14:00 - 16:00"
                className="text-xs h-9 rounded-xl bg-muted/40 border-0 focus-visible:ring-1 focus-visible:ring-primary shadow-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="assigned-mentor" className="text-xs font-semibold text-foreground">
                Biriktirilgan Mentor
              </Label>
              <select
                id="assigned-mentor"
                value={mentorId ?? ''}
                onChange={(e) => setMentorId(e.target.value ? Number(e.target.value) : undefined)}
                aria-label="Biriktirilgan Mentor"
                className="flex h-9 w-full rounded-xl border-0 bg-muted/40 px-3 py-1 text-xs text-foreground shadow-none transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer font-medium"
              >
                <option value="">Mentorsiz</option>
                {mentors.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.fullName} ({m.role})
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="room-location" className="text-xs font-semibold text-foreground">
                O'quv xonasi
              </Label>
              <Input
                id="room-location"
                value={roomLocation}
                onChange={(e) => setRoomLocation(e.target.value)}
                placeholder="Masalan: IT Xona 204"
                className="text-xs h-9 rounded-xl bg-muted/40 border-0 focus-visible:ring-1 focus-visible:ring-primary shadow-none"
              />
            </div>
          </div>

          <DialogFooter className="pt-3 gap-2 sm:gap-0 border-0">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={onClose}
              disabled={loading}
              className="text-xs rounded-xl"
            >
              Bekor qilish
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={loading}
              className="text-xs rounded-xl font-medium"
            >
              {loading ? "Guruh ochilmoqda..." : "Guruhni ochish"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
