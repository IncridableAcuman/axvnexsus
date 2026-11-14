import React, { useState, useEffect } from 'react';
import {
  GraduationCap,
  AlertCircle,
  Save,
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { studentApi } from '@/api';
import { useToast } from '@/shared/ui/toast/ToastContext';
import type { Student, StudyGroup, Branch } from '@/types';

interface EditStudentModalProps {
  isOpen: boolean;
  onClose: () => void;
  student: Student | null;
  groups: StudyGroup[];
  branches?: Branch[];
  onSuccess: () => void;
}

export const EditStudentModal: React.FC<EditStudentModalProps> = ({
  isOpen,
  onClose,
  student,
  groups,
  branches: _branches = [],
  onSuccess,
}) => {
  const toast = useToast();

  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [pinfl, setPinfl] = useState('');
  const [gradeLevel, setGradeLevel] = useState('8-sinf');
  const [direction, setDirection] = useState('Web Full-Stack');
  const [district, setDistrict] = useState('Yangiariq tumani');
  const [branchLocation, setBranchLocation] = useState('IT Park Yangiariq');
  const [studyGroupId, setStudyGroupId] = useState<string>('none');
  const [status, setStatus] = useState('ACTIVE');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (student) {
      setFullName(student.fullName || '');
      setPhone(student.phone || '');
      setPinfl(student.pinfl || '');
      setGradeLevel(student.gradeLevel || '8-sinf');
      setDirection(student.direction || 'Web Full-Stack');
      setDistrict(student.district || 'Yangiariq tumani');
      setBranchLocation(student.branchLocation || 'IT Park Yangiariq');
      setStudyGroupId(student.studyGroup?.id ? String(student.studyGroup.id) : 'none');
      setStatus(
        student.status === 'Faol'
          ? 'ACTIVE'
          : student.status === 'Arxivlangan'
          ? 'ARCHIVED'
          : student.status || 'ACTIVE'
      );
      setError('');
    }
  }, [student, isOpen]);

  if (!student) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim()) {
      setError('O‘quvchining to‘liq F.I.O sini kiriting');
      return;
    }

    try {
      setSaving(true);
      setError('');

      const resolvedGroupId = studyGroupId === 'none' ? undefined : Number(studyGroupId);
      const selectedGroup = groups.find((g) => g.id === resolvedGroupId);

      await studentApi.update(student.id, {
        fullName: fullName.trim(),
        phone: phone.trim() || undefined,
        pinfl: pinfl.trim() || undefined,
        gradeLevel,
        direction,
        district,
        branchLocation: selectedGroup?.branchLocation || branchLocation,
        studyGroupId: resolvedGroupId,
        status,
      });

      toast.success('Muvaffaqiyatli yangilandi', `${fullName} ma’lumotlari saqlandi`);
      onSuccess();
      onClose();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'O‘quvchi ma’lumotlarini yangilashda xatolik yuz berdi';
      setError(msg);
      toast.error('Xatolik', msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg border-0 rounded-3xl shadow-2xl bg-card text-card-foreground p-6 sm:p-7">
        <DialogHeader className="space-y-1 text-left">
          <DialogTitle className="text-lg font-bold text-foreground flex items-center gap-2">
            <GraduationCap className="w-5 h-5 text-primary" />
            <span>O‘quvchi Ma’lumotlarini Tahrirlash</span>
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            HEMIS ID: <span className="font-mono font-semibold text-foreground">{student.studentIdNumber || '—'}</span>
          </DialogDescription>
        </DialogHeader>

        {error && (
          <div className="flex items-center gap-2 p-3 rounded-xl bg-destructive/10 text-destructive text-xs mt-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          {/* Full Name */}
          <div className="space-y-1.5">
            <Label htmlFor="edit-fullName" className="text-xs font-semibold">
              F.I.O (To‘liq ism-familiya) *
            </Label>
            <Input
              id="edit-fullName"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Masalan: Xurshid Alimov"
              className="rounded-xl text-xs"
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Phone */}
            <div className="space-y-1.5">
              <Label htmlFor="edit-phone" className="text-xs font-semibold">
                Telefon raqami
              </Label>
              <Input
                id="edit-phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+998 90 123 45 67"
                className="rounded-xl text-xs font-mono"
              />
            </div>

            {/* PINFL */}
            <div className="space-y-1.5">
              <Label htmlFor="edit-pinfl" className="text-xs font-semibold">
                JSHSHIR (PINFL)
              </Label>
              <Input
                id="edit-pinfl"
                value={pinfl}
                onChange={(e) => setPinfl(e.target.value)}
                placeholder="14 xonali raqam"
                maxLength={14}
                className="rounded-xl text-xs font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Grade Level */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Sinf bosqichi</Label>
              <Select value={gradeLevel} onValueChange={setGradeLevel}>
                <SelectTrigger className="rounded-xl text-xs">
                  <SelectValue placeholder="Sinfni tanlang" />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="8-sinf">8-sinf</SelectItem>
                  <SelectItem value="9-sinf">9-sinf</SelectItem>
                  <SelectItem value="10-sinf">10-sinf</SelectItem>
                  <SelectItem value="11-sinf">11-sinf</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Direction */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Ta'lim yo'nalishi</Label>
              <Select value={direction} onValueChange={setDirection}>
                <SelectTrigger className="rounded-xl text-xs">
                  <SelectValue placeholder="Yo'nalishni tanlang" />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="Web Full-Stack">Web Full-Stack</SelectItem>
                  <SelectItem value="Advanced UX/UI va Front-end">Advanced UX/UI</SelectItem>
                  <SelectItem value="Foundation & Python">Foundation & Python</SelectItem>
                  <SelectItem value="Mobile Development">Mobile Development</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Study Group */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">O‘quv guruhi (Cohort)</Label>
              <Select value={studyGroupId} onValueChange={setStudyGroupId}>
                <SelectTrigger className="rounded-xl text-xs font-mono">
                  <SelectValue placeholder="Guruhni tanlang" />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="none">Guruhsiz (Biriktirilmagan)</SelectItem>
                  {groups.map((g) => (
                    <SelectItem key={g.id} value={String(g.id)}>
                      {g.groupCode} ({g.subject || g.gradeLevel})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Status */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Hisob holati (Status)</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger className="rounded-xl text-xs">
                  <SelectValue placeholder="Holatni tanlang" />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="ACTIVE">Faol (Active)</SelectItem>
                  <SelectItem value="INACTIVE">Nofaol (Inactive)</SelectItem>
                  <SelectItem value="ARCHIVED">Arxivlangan (Archived)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter className="flex items-center justify-end gap-2 pt-4 border-t border-border/10">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              disabled={saving}
              className="rounded-xl text-xs cursor-pointer"
            >
              Bekor qilish
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={saving}
              className="rounded-xl text-xs font-bold gap-1.5 cursor-pointer shadow-sm"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{saving ? 'Saqlanmoqda...' : 'Saqlash'}</span>
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
