import React, { useState } from 'react';
import { AlertTriangle, Calendar, Clock, MapPin, BookOpen, User, Users } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { attendanceApi, timeSlotApi } from '@/api';
import { queryClient } from '@/app/providers/QueryProvider';
import type { StudyGroup, Mentor, TimeSlot } from '@/types';

interface CreateLessonModalProps {
  isOpen: boolean;
  onClose: () => void;
  groups: StudyGroup[];
  mentors: Mentor[];
  onSuccess: () => void;
}

export const CreateLessonModal: React.FC<CreateLessonModalProps> = ({
  isOpen,
  onClose,
  groups = [],
  mentors = [],
  onSuccess,
}) => {
  const [groupId, setGroupId] = useState<number>(() => groups[0]?.id || 0);
  const [mentorId, setMentorId] = useState<number>(() => mentors[0]?.id || 0);
  const [subject, setSubject] = useState(() => groups[0]?.subject || 'Web Full-Stack Development');
  const [topic, setTopic] = useState('');
  const [roomNumber, setRoomNumber] = useState(() => groups[0]?.room || 'Xona 101');
  const [lessonDate, setLessonDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [startTimeStr, setStartTimeStr] = useState('14:00');
  const [endTimeStr, setEndTimeStr] = useState('15:20');

  // Configurable Time Slots
  const [selectedSlotId, setSelectedSlotId] = useState<string>('custom');
  const [availableSlots, setAvailableSlots] = useState<TimeSlot[]>([
    { id: 1, name: 'Ertalabki smena (Morning)', startTime: '09:30', endTime: '11:00', durationMinutes: 90, active: true },
    { id: 2, name: 'Tushdan keyingi (Afternoon)', startTime: '15:00', endTime: '16:30', durationMinutes: 90, active: true },
    { id: 3, name: 'Kechki smena (Evening)', startTime: '16:30', endTime: '18:00', durationMinutes: 90, active: true },
  ]);

  React.useEffect(() => {
    let mounted = true;
    timeSlotApi.getActive().then((data) => {
      if (mounted && data && data.length > 0) {
        setAvailableSlots(data);
        const match = data.find((s) => s.startTime === startTimeStr && s.endTime === endTimeStr);
        if (match) setSelectedSlotId(String(match.id));
      }
    }).catch(() => {
      // keep fallback
    });
    return () => { mounted = false; };
  }, []);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sync state when groups or mentors become available
  React.useEffect(() => {
    if (groups.length > 0) {
      const match = groups.find((g) => g.id === groupId);
      if (!match) {
        const first = groups[0];
        setGroupId(first.id);
        if (first.subject) setSubject(first.subject);
        if (first.room) setRoomNumber(first.room);
        if (first.mentor?.id && mentors.some((m) => m.id === first.mentor?.id)) {
          setMentorId(first.mentor.id);
        }
      }
    }
  }, [groups, groupId, mentors]);

  React.useEffect(() => {
    if (mentors.length > 0 && (!mentorId || !mentors.some((m) => m.id === mentorId))) {
      setMentorId(mentors[0].id);
    }
  }, [mentors, mentorId]);

  const handleGroupSelect = (newGroupId: number) => {
    setGroupId(newGroupId);
    const grp = groups.find((g) => g.id === newGroupId);
    if (grp) {
      if (grp.subject) setSubject(grp.subject);
      if (grp.room) setRoomNumber(grp.room);
      if (grp.mentor?.id && mentors.some((m) => m.id === grp.mentor?.id)) {
        setMentorId(grp.mentor.id);
      }
      if (grp.scheduleTime && grp.scheduleTime.includes('-')) {
        const parts = grp.scheduleTime.split('-');
        const s = parts[0] ? parts[0].trim() : '15:00';
        const endT = parts[1] ? parts[1].trim() : '16:30';
        setStartTimeStr(s);
        setEndTimeStr(endT);
        const match = availableSlots.find((slot) => slot.startTime === s && slot.endTime === endT);
        if (match) setSelectedSlotId(String(match.id));
        else setSelectedSlotId('custom');
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!groupId || !mentorId || !subject.trim() || !lessonDate) {
      setError("Barcha majburiy maydonlarni to'ldiring");
      return;
    }

    const startIso = `${lessonDate}T${startTimeStr}:00`;
    const endIso = `${lessonDate}T${endTimeStr}:00`;

    if (new Date(startIso) >= new Date(endIso)) {
      setError("Dars boshlanish vaqti tugash vaqtidan oldin bo'lishi shart");
      return;
    }

    setError(null);
    setLoading(true);
    try {
      await attendanceApi.createSession({
        groupId,
        mentorId,
        subject: subject.trim(),
        topic: topic.trim() || undefined,
        roomNumber: roomNumber.trim() || undefined,
        startTime: startIso,
        endTime: endIso,
      });
      queryClient.invalidateQueries({ queryKey: ['lessons'] });
      queryClient.invalidateQueries({ queryKey: ['today-sessions'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-admin'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-mentor'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-student'] });
      onSuccess();
      onClose();
    } catch (err: unknown) {
      const respData = (err as { response?: { data?: { message?: string; conflicts?: Array<{ resourceName?: string; startTime?: string; endTime?: string; weekday?: string }> } } })?.response?.data;
      if (respData?.conflicts && respData.conflicts.length > 0) {
        const c = respData.conflicts[0];
        setError(`${respData.message || 'Jadval to\'qnashuvi'}: ${c.resourceName} (${c.startTime} - ${c.endTime})`);
      } else {
        const msg = respData?.message || 'Darsni rejalashtirishda xatolik yuz berdi';
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-xl p-0 overflow-hidden bg-card text-card-foreground border-0 rounded-3xl shadow-2xl">
        <DialogHeader className="p-6 pb-4 border-b border-border/15 bg-muted/20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="text-xl font-bold tracking-tight text-foreground">
                Yangi Dars Mashg‘ulotini Rejalashtirish
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                Dars jadvaliga yangi mashg‘ulot sessiyasini kiriting
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 text-xs rounded-xl bg-destructive/10 text-destructive flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold">Rejalashtirish xatosi: </span>
                {error}
              </div>
            </div>
          )}

          {/* Group and Mentor selection */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold flex items-center gap-1.5 text-foreground">
                <Users className="w-3.5 h-3.5 text-muted-foreground" />
                O‘quv Guruhi *
              </Label>
              <select
                value={groupId || ''}
                onChange={(e) => handleGroupSelect(Number(e.target.value))}
                aria-label="O'quv Guruhi"
                className="w-full text-xs h-9 rounded-xl border-0 bg-muted/30 px-3 py-1.5 text-foreground shadow-none focus:outline-none focus:ring-1 focus:ring-ring cursor-pointer"
              >
                {groups.length === 0 ? (
                  <option value="" disabled>Guruhlar mavjud emas (yuklanmoqda...)</option>
                ) : (
                  groups.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.groupCode || g.name} — {g.gradeLevel} — {g.subject || 'IT'}
                    </option>
                  ))
                )}
              </select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold flex items-center gap-1.5 text-foreground">
                <User className="w-3.5 h-3.5 text-muted-foreground" />
                Mas‘ul Mentor *
              </Label>
              <select
                value={mentorId || ''}
                onChange={(e) => setMentorId(Number(e.target.value))}
                aria-label="Mas'ul Mentor"
                className="w-full text-xs h-9 rounded-xl border-0 bg-muted/30 px-3 py-1.5 text-foreground shadow-none focus:outline-none focus:ring-1 focus:ring-ring cursor-pointer"
              >
                {mentors.length === 0 ? (
                  <option value="" disabled>Mentorlar mavjud emas (yuklanmoqda...)</option>
                ) : (
                  mentors.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.fullName} ({m.role || 'Mentor'})
                    </option>
                  ))
                )}
              </select>
            </div>
          </div>

          {/* Subject and Topic */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold flex items-center gap-1.5 text-foreground">
              <BookOpen className="w-3.5 h-3.5 text-muted-foreground" />
              Fan / Yo‘nalish nomi *
            </Label>
            <Input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Masalan: Web Full-Stack Development"
              className="h-9 text-xs bg-muted/30 border-0 rounded-xl focus-visible:ring-1"
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-foreground">
              Dars mavzusi (Ixtiyoriy)
            </Label>
            <Input
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="Masalan: React Hooks va State management"
              className="h-9 text-xs bg-muted/30 border-0 rounded-xl focus-visible:ring-1"
            />
          </div>

          {/* Time Slot Selector */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold flex items-center gap-1.5 text-foreground">
              <Clock className="w-3.5 h-3.5 text-primary" />
              Dars vaqti oralig‘i (Time Slot)
            </Label>
            <select
              aria-label="Dars vaqtini tanlang"
              value={selectedSlotId}
              onChange={(e) => {
                const val = e.target.value;
                setSelectedSlotId(val);
                if (val !== 'custom') {
                  const slot = availableSlots.find((s) => String(s.id) === val);
                  if (slot) {
                    setStartTimeStr(slot.startTime);
                    setEndTimeStr(slot.endTime);
                  }
                }
              }}
              className="w-full text-xs h-9 rounded-xl border-0 bg-muted/30 px-3 py-1.5 text-foreground shadow-none focus:outline-none focus:ring-1 focus:ring-ring cursor-pointer"
            >
              {availableSlots.map((slot) => (
                <option key={slot.id} value={String(slot.id)}>
                  {slot.name} ({slot.startTime} – {slot.endTime})
                </option>
              ))}
              <option value="custom">-- Maxsus vaqt oralig‘i (Custom Time Range) --</option>
            </select>
          </div>

          {/* Date, Time and Room */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold flex items-center gap-1.5 text-foreground">
                <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                Sana *
              </Label>
              <Input
                type="date"
                value={lessonDate}
                onChange={(e) => setLessonDate(e.target.value)}
                className="h-9 text-xs bg-muted/30 border-0 rounded-xl focus-visible:ring-1"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold flex items-center gap-1.5 text-foreground">
                <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                Boshlanish *
              </Label>
              <Input
                type="time"
                value={startTimeStr}
                onChange={(e) => {
                  setStartTimeStr(e.target.value);
                  setSelectedSlotId('custom');
                }}
                className="h-9 text-xs bg-muted/30 border-0 rounded-xl focus-visible:ring-1"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold flex items-center gap-1.5 text-foreground">
                <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                Tugash *
              </Label>
              <Input
                type="time"
                value={endTimeStr}
                onChange={(e) => {
                  setEndTimeStr(e.target.value);
                  setSelectedSlotId('custom');
                }}
                className="h-9 text-xs bg-muted/30 border-0 rounded-xl focus-visible:ring-1"
                required
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold flex items-center gap-1.5 text-foreground">
              <MapPin className="w-3.5 h-3.5 text-muted-foreground" />
              O‘quv xonasi
            </Label>
            <Input
              value={roomNumber}
              onChange={(e) => setRoomNumber(e.target.value)}
              placeholder="Masalan: Lab-101 yoki Auditorium A"
              className="h-9 text-xs bg-muted/30 border-0 rounded-xl focus-visible:ring-1"
            />
          </div>

          <DialogFooter className="pt-4 border-t border-border/15 flex items-center justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onClose}
              disabled={loading}
              className="rounded-xl border-0"
            >
              Bekor qilish
            </Button>
            <Button
              type="submit"
              variant="default"
              size="sm"
              disabled={loading}
              className="gap-1.5 rounded-xl border-0 font-semibold shadow-xs"
            >
              <span>{loading ? 'Rejalashtirilmoqda...' : 'Darsni saqlash'}</span>
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
