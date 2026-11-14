import React, { useState, useMemo, useEffect } from 'react';
import type { Mentor, StudyGroup, ManualScheduleRequest, SchedulingMode, TimeSlot } from '../types';
import { X, Calendar, Clock, Check, AlertCircle, CalendarDays, Sparkles } from 'lucide-react';
import { scheduleApi, timeSlotApi } from '../api';
import { queryClient } from '@/app/providers/QueryProvider';
import { Input, FormField, Textarea } from '@/shared/ui';
import { useTranslation } from '@/shared/i18n';

export interface ConflictDetail {
  type: string;
  weekday: string;
  resourceName: string;
  existingGroupCode: string;
  startTime: string;
  endTime: string;
}

interface ManualScheduleModalProps {
  isOpen: boolean;
  onClose: () => void;
  mentors?: Mentor[];
  groups?: StudyGroup[];
  onSuccess: () => void;
}

interface WeekdayItem {
  id: string;
  name: string;
  short: string;
  parity: 'odd' | 'even';
  translationKey: 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday';
}

const ACADEMIC_WEEKDAYS: WeekdayItem[] = [
  { id: 'MONDAY', name: 'Dushanba', short: 'Dush', parity: 'odd', translationKey: 'monday' },
  { id: 'TUESDAY', name: 'Seshanba', short: 'Sesh', parity: 'even', translationKey: 'tuesday' },
  { id: 'WEDNESDAY', name: 'Chorshanba', short: 'Chor', parity: 'odd', translationKey: 'wednesday' },
  { id: 'THURSDAY', name: 'Payshanba', short: 'Pay', parity: 'even', translationKey: 'thursday' },
  { id: 'FRIDAY', name: 'Juma', short: 'Jum', parity: 'odd', translationKey: 'friday' },
  { id: 'SATURDAY', name: 'Shanba', short: 'Shan', parity: 'even', translationKey: 'saturday' },
];

export const ManualScheduleModal: React.FC<ManualScheduleModalProps> = ({
  isOpen,
  onClose,
  mentors = [],
  groups = [],
  onSuccess,
}) => {
  const { t } = useTranslation();

  const [mentorName, setMentorName] = useState('Abdurasharipov Izzatbek');
  const [mentorRole, setMentorRole] = useState('IT mentor');
  const [groupCode, setGroupCode] = useState('YA-26I0805');
  const [gradeLevel, setGradeLevel] = useState('8-sinf');
  const [subject, setSubject] = useState('Web Full-Stack Development');

  // Scheduling Mode: ODD_DAYS, EVEN_DAYS, ALL_SIX_DAYS, CUSTOM
  const [schedulingMode, setSchedulingMode] = useState<SchedulingMode>('ODD_DAYS');
  const [selectedDays, setSelectedDays] = useState<string[]>(['Dushanba', 'Chorshanba', 'Juma']);

  const [startTime, setStartTime] = useState('15:00');
  const [endTime, setEndTime] = useState('16:30');
  const [room, setRoom] = useState('IT Lab 1');
  const [branchLocation, setBranchLocation] = useState('IT Park Yangiariq');
  const [topic] = useState('');

  // Configurable Time Slots
  const [selectedSlotId, setSelectedSlotId] = useState<string>('2');
  const [availableSlots, setAvailableSlots] = useState<TimeSlot[]>([
    { id: 1, name: 'Ertalabki smena (Morning)', startTime: '09:30', endTime: '11:00', durationMinutes: 90, active: true },
    { id: 2, name: 'Tushdan keyingi (Afternoon)', startTime: '15:00', endTime: '16:30', durationMinutes: 90, active: true },
    { id: 3, name: 'Kechki smena (Evening)', startTime: '16:30', endTime: '18:00', durationMinutes: 90, active: true },
  ]);

  useEffect(() => {
    let mounted = true;
    timeSlotApi.getActive().then((data) => {
      if (mounted && data && data.length > 0) {
        setAvailableSlots(data);
        const match = data.find((s) => s.startTime === startTime && s.endTime === endTime);
        if (match) setSelectedSlotId(String(match.id));
      }
    }).catch(() => {
      // Keep initial defaults
    });
    return () => { mounted = false; };
  }, []);

  // Fast bulk student names input
  const [studentsBulkText, setStudentsBulkText] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [conflicts, setConflicts] = useState<ConflictDetail[]>([]);

  // Switch scheduling mode
  const handleModeChange = (mode: SchedulingMode) => {
    setSchedulingMode(mode);
    setErrorMessage(null);

    switch (mode) {
      case 'ODD_DAYS':
        setSelectedDays(['Dushanba', 'Chorshanba', 'Juma']);
        break;
      case 'EVEN_DAYS':
        setSelectedDays(['Seshanba', 'Payshanba', 'Shanba']);
        break;
      case 'ALL_SIX_DAYS':
        setSelectedDays(['Dushanba', 'Seshanba', 'Chorshanba', 'Payshanba', 'Juma', 'Shanba']);
        break;
      case 'CUSTOM':
        // If empty, keep current or default to Monday
        if (selectedDays.length === 0) {
          setSelectedDays(['Dushanba']);
        }
        break;
    }
  };

  // Toggle individual day in CUSTOM mode
  const handleToggleDay = (dayName: string) => {
    setErrorMessage(null);
    let updated: string[];

    if (schedulingMode !== 'CUSTOM') {
      setSchedulingMode('CUSTOM');
      if (selectedDays.includes(dayName)) {
        updated = selectedDays.filter((d) => d !== dayName);
      } else {
        updated = [...selectedDays, dayName];
      }
    } else {
      if (selectedDays.includes(dayName)) {
        updated = selectedDays.filter((d) => d !== dayName);
      } else {
        updated = [...selectedDays, dayName];
      }
    }

    // Sort according to 6-day academic week
    const orderMap: Record<string, number> = {
      Dushanba: 1,
      Seshanba: 2,
      Chorshanba: 3,
      Payshanba: 4,
      Juma: 5,
      Shanba: 6,
    };
    updated.sort((a, b) => (orderMap[a] || 99) - (orderMap[b] || 99));
    setSelectedDays(updated);
  };

  // Formatted display text
  const previewText = useMemo(() => {
    if (selectedDays.length === 0) {
      return null;
    }

    let modeLabel = t('scheduling.customDays');
    if (schedulingMode === 'ODD_DAYS') modeLabel = t('scheduling.oddDays');
    else if (schedulingMode === 'EVEN_DAYS') modeLabel = t('scheduling.evenDays');
    else if (schedulingMode === 'ALL_SIX_DAYS') modeLabel = t('scheduling.allSixDays');

    return `${modeLabel}: ${selectedDays.join(' • ')}`;
  }, [schedulingMode, selectedDays, t]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (selectedDays.length === 0) {
      setErrorMessage(t('scheduling.noDaysSelected'));
      return;
    }

    if (!startTime.trim() || !endTime.trim() || startTime.trim() >= endTime.trim()) {
      setErrorMessage(t('scheduling.invalidTimeRange'));
      return;
    }

    setLoading(true);

    try {
      // Parse bulk student names if provided
      const studentLines = studentsBulkText
        .split('\n')
        .map((l) => l.trim())
        .filter((l) => l.length > 0);

      const students = studentLines.map((name) => ({
        fullName: name,
        gradeLevel: gradeLevel,
        district: branchLocation,
      }));

      const req: ManualScheduleRequest = {
        mentorName,
        mentorRole,
        groupCode,
        gradeLevel,
        subject,
        dayPattern: schedulingMode,
        selectedDays,
        days: selectedDays.join(', '),
        startTime,
        endTime,
        room,
        branchLocation,
        topic,
        students,
      };

      await scheduleApi.createManual(req);
      queryClient.invalidateQueries({ queryKey: ['schedules'] });
      queryClient.invalidateQueries({ queryKey: ['lessons'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-admin'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-mentor'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-student'] });
      onSuccess();
      onClose();
    } catch (err: unknown) {
      const respData = (err as { response?: { data?: { message?: string; conflicts?: ConflictDetail[] } } })?.response?.data;
      if (respData?.conflicts && respData.conflicts.length > 0) {
        setConflicts(respData.conflicts);
      } else {
        setConflicts([]);
      }
      const respMsg = respData?.message;
      const msg = respMsg || (err instanceof Error ? err.message : 'Noma\'lum xatolik');
      setErrorMessage(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="glass-panel bg-[var(--bg-surface)] text-[var(--text-primary)] rounded-3xl max-w-2xl w-full p-6 sm:p-7 shadow-2xl border-0 my-8 animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-border/15">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-500/15 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-[var(--text-primary)]">
                Yangi Dars Jadvalini Qo‘shish
              </h2>
              <p className="text-xs text-[var(--text-muted)] mt-0.5">
                6 kunlik akademik hafta: Toq va Juft kunlar taqsimoti
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Yopish"
            className="w-8 h-8 rounded-xl bg-[var(--bg-subtle)] hover:bg-[var(--bg-muted)] text-[var(--text-muted)] hover:text-[var(--text-primary)] flex items-center justify-center transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Conflict / Validation Alert */}
        {errorMessage && (
          <div className="mt-4 p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs flex flex-col gap-2 animate-shake">
            <div className="flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <div className="flex-1">
                <span className="font-bold block">{t('scheduling.scheduleConflict')}</span>
                <p className="mt-0.5 leading-relaxed">{errorMessage}</p>
              </div>
            </div>

            {conflicts.length > 0 && (
              <div className="mt-1 pt-2 border-t border-rose-500/20 space-y-1.5">
                <div className="font-semibold text-[11px] text-rose-700 dark:text-rose-300">
                  Aniqlangan to'qnashuv detallari:
                </div>
                {conflicts.map((c, idx) => (
                  <div key={idx} className="bg-rose-500/15 p-2 rounded-lg text-[11px] flex flex-wrap items-center justify-between gap-1">
                    <span>
                      <strong className="uppercase">{c.weekday}</strong> • {c.type === 'CLASSROOM' ? 'Xona' : c.type === 'MENTOR' ? 'Mentor' : 'Guruh'}: <strong>{c.resourceName}</strong>
                    </span>
                    <span className="font-mono bg-rose-500/20 px-1.5 py-0.5 rounded text-[10px]">
                      {c.existingGroupCode} ({c.startTime} - {c.endTime})
                    </span>
                  </div>
                ))}

                <div className="pt-1.5 flex flex-wrap gap-1.5 items-center">
                  <span className="text-[10px] text-rose-600 dark:text-rose-400 font-medium">Tavsiya:</span>
                  <button
                    type="button"
                    onClick={() => handleModeChange(schedulingMode === 'ODD_DAYS' ? 'EVEN_DAYS' : 'ODD_DAYS')}
                    className="text-[10px] px-2 py-0.5 bg-rose-500/20 hover:bg-rose-500/30 rounded font-semibold text-rose-700 dark:text-rose-300 transition"
                  >
                    Kun tartibini almashtirish
                  </button>
                  <button
                    type="button"
                    onClick={() => setRoom(room === 'IT Lab 1' ? 'IT Lab 2' : 'IT Lab 1')}
                    className="text-[10px] px-2 py-0.5 bg-rose-500/20 hover:bg-rose-500/30 rounded font-semibold text-rose-700 dark:text-rose-300 transition"
                  >
                    Boshqa xona tanlash
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 pt-4">
          {/* Optional Group Selector from existing groups */}
          {groups.length > 0 && (
            <div>
              <label className="block text-xs font-bold text-[var(--text-secondary)] mb-1.5">
                Mavjud Guruhni Tanlash (ixtiyoriy)
              </label>
              <select
                aria-label="Mavjud Guruhni Tanlash"
                value={groups.some(g => g.groupCode === groupCode) ? groupCode : ''}
                onChange={(e) => {
                  const selectedCode = e.target.value;
                  const found = groups.find(g => g.groupCode === selectedCode);
                  if (found) {
                    setGroupCode(found.groupCode);
                    if (found.gradeLevel) setGradeLevel(found.gradeLevel);
                    if (found.subject) setSubject(found.subject);
                    if (found.room) setRoom(found.room);
                    if (found.branchLocation) setBranchLocation(found.branchLocation);
                    if (found.mentor?.fullName) {
                      setMentorName(found.mentor.fullName);
                      if (found.mentor.role) setMentorRole(found.mentor.role);
                    }
                    if (found.dayPattern) {
                      handleModeChange(found.dayPattern as SchedulingMode);
                    }
                    if (found.scheduleTime && found.scheduleTime.includes('-')) {
                      const [s, endT] = found.scheduleTime.split('-');
                      const cleanS = s ? s.trim() : '15:00';
                      const cleanE = endT ? endT.trim() : '16:30';
                      setStartTime(cleanS);
                      setEndTime(cleanE);
                      const matchingSlot = availableSlots.find(
                        (slot) => slot.startTime === cleanS && slot.endTime === cleanE
                      );
                      if (matchingSlot) {
                        setSelectedSlotId(String(matchingSlot.id));
                      } else {
                        setSelectedSlotId('custom');
                      }
                    }
                  }
                }}
                className="w-full bg-[var(--bg-canvas)] border border-border/30 rounded-xl px-3.5 py-2.5 text-xs text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)]/40 focus:border-[var(--brand-primary)] transition"
              >
                <option value="">-- Yangi guruh kiritish yoki mavjudidan tanlang --</option>
                {groups.map((g) => (
                  <option key={g.id} value={g.groupCode}>
                    {g.groupCode} — {g.gradeLevel} — {g.subject || 'IT'}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Grade & Group Code */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-[var(--text-secondary)] mb-1.5">
                Sinf va Ta‘lim Bosqichi *
              </label>
              <select
                value={gradeLevel}
                onChange={(e) => setGradeLevel(e.target.value)}
                className="w-full bg-[var(--bg-canvas)] border border-border/30 rounded-xl px-3.5 py-2.5 text-xs text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)]/40 focus:border-[var(--brand-primary)] transition"
              >
                <option value="8-sinf">8-sinf (Computer Science & Full-stack)</option>
                <option value="9-sinf">9-sinf (9 ta IT yo'nalishi)</option>
                <option value="10-sinf">10-sinf (Amaliy IT loyihalar)</option>
                <option value="11-sinf">11-sinf (Professional rivojlanish)</option>
              </select>
            </div>

            <FormField label="Guruh Kodi (Identifikator)" required>
              <Input
                type="text"
                value={groupCode}
                onChange={(e) => setGroupCode(e.target.value)}
                placeholder="masalan: YA-26I0805"
                required
              />
            </FormField>
          </div>

          {/* Subject / Course */}
          <FormField label="O‘quv Fani / Yo‘nalish" required>
            <Input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Web Full-Stack Development, Computer Science Foundation, etc."
              required
            />
          </FormField>

          {/* Mentor selection from registered mentors + name & role */}
          {mentors.length > 0 && (
            <div>
              <label className="block text-xs font-bold text-[var(--text-secondary)] mb-1.5">
                Mavjud Mentorlar Ro'yxatidan Tanlash
              </label>
              <select
                value={mentors.some(m => m.fullName.toLowerCase() === mentorName.toLowerCase()) ? mentorName : ''}
                onChange={(e) => {
                  const sel = mentors.find(m => m.fullName === e.target.value);
                  if (sel) {
                    setMentorName(sel.fullName);
                    if (sel.role) setMentorRole(sel.role);
                  }
                }}
                className="w-full bg-[var(--bg-canvas)] border border-border/30 rounded-xl px-3.5 py-2.5 text-xs text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)]/40 focus:border-[var(--brand-primary)] transition"
              >
                <option value="">-- Mentorni tanlang yoki pastda kiriting --</option>
                {mentors.map((m) => (
                  <option key={m.id} value={m.fullName}>
                    {m.fullName} ({m.role || 'Mentor'})
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <FormField label="Mentor F.I.Sh" required>
                <Input
                  type="text"
                  value={mentorName}
                  onChange={(e) => setMentorName(e.target.value)}
                  placeholder="Abdurasharipov Izzatbek"
                  required
                />
              </FormField>
            </div>

            <div>
              <label className="block text-xs font-bold text-[var(--text-secondary)] mb-1.5">
                Mentor Roli
              </label>
              <select
                value={mentorRole}
                onChange={(e) => setMentorRole(e.target.value)}
                className="w-full bg-[var(--bg-canvas)] border border-border/30 rounded-xl px-3 py-2.5 text-xs text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)]/40 focus:border-[var(--brand-primary)] transition"
              >
                <option value="IT mentor">IT mentor</option>
                <option value="Ingliz tili mentor">Ingliz tili mentor</option>
                <option value="Bosh mentor">Bosh mentor</option>
                <option value="Sun'iy intellekt mentori">Sun'iy intellekt mentori</option>
              </select>
            </div>
          </div>

          {/* SECTION: Dars kunlari turi (Six-Day Academic Scheduling Mode) */}
          <div className="p-4 rounded-2xl bg-[var(--bg-canvas)] border border-border/25 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CalendarDays className="w-4 h-4 text-blue-500" />
                <h3 className="text-xs font-bold text-[var(--text-primary)] uppercase tracking-wider">
                  {t('scheduling.dayPattern')}
                </h3>
              </div>
              <span className="text-[11px] text-[var(--text-muted)] font-medium">
                6 kunlik akademik hafta
              </span>
            </div>

            {/* 4 Mode Selection Buttons / Segmented Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <button
                type="button"
                data-testid="mode-btn-odd"
                onClick={() => handleModeChange('ODD_DAYS')}
                className={`px-3 py-2.5 rounded-xl text-xs font-semibold flex flex-col items-center justify-center gap-1 transition cursor-pointer border ${
                  schedulingMode === 'ODD_DAYS'
                    ? 'bg-blue-600 text-white border-blue-600 shadow-sm shadow-blue-500/30'
                    : 'bg-[var(--bg-surface)] text-[var(--text-secondary)] border-border/20 hover:border-blue-500/40 hover:bg-[var(--bg-subtle)]'
                }`}
              >
                <span className="font-bold">{t('scheduling.oddDays')}</span>
                <span className={`text-[10px] ${schedulingMode === 'ODD_DAYS' ? 'text-blue-100' : 'text-[var(--text-muted)]'}`}>
                  Dush • Chor • Jum
                </span>
              </button>

              <button
                type="button"
                data-testid="mode-btn-even"
                onClick={() => handleModeChange('EVEN_DAYS')}
                className={`px-3 py-2.5 rounded-xl text-xs font-semibold flex flex-col items-center justify-center gap-1 transition cursor-pointer border ${
                  schedulingMode === 'EVEN_DAYS'
                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm shadow-indigo-500/30'
                    : 'bg-[var(--bg-surface)] text-[var(--text-secondary)] border-border/20 hover:border-indigo-500/40 hover:bg-[var(--bg-subtle)]'
                }`}
              >
                <span className="font-bold">{t('scheduling.evenDays')}</span>
                <span className={`text-[10px] ${schedulingMode === 'EVEN_DAYS' ? 'text-indigo-100' : 'text-[var(--text-muted)]'}`}>
                  Sesh • Pay • Shan
                </span>
              </button>

              <button
                type="button"
                data-testid="mode-btn-all-six"
                onClick={() => handleModeChange('ALL_SIX_DAYS')}
                className={`px-3 py-2.5 rounded-xl text-xs font-semibold flex flex-col items-center justify-center gap-1 transition cursor-pointer border ${
                  schedulingMode === 'ALL_SIX_DAYS'
                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm shadow-emerald-500/30'
                    : 'bg-[var(--bg-surface)] text-[var(--text-secondary)] border-border/20 hover:border-emerald-500/40 hover:bg-[var(--bg-subtle)]'
                }`}
              >
                <span className="font-bold">{t('scheduling.allSixDays')}</span>
                <span className={`text-[10px] ${schedulingMode === 'ALL_SIX_DAYS' ? 'text-emerald-100' : 'text-[var(--text-muted)]'}`}>
                  Dushanba – Shanba
                </span>
              </button>

              <button
                type="button"
                data-testid="mode-btn-custom"
                onClick={() => handleModeChange('CUSTOM')}
                className={`px-3 py-2.5 rounded-xl text-xs font-semibold flex flex-col items-center justify-center gap-1 transition cursor-pointer border ${
                  schedulingMode === 'CUSTOM'
                    ? 'bg-amber-600 text-white border-amber-600 shadow-sm shadow-amber-500/30'
                    : 'bg-[var(--bg-surface)] text-[var(--text-secondary)] border-border/20 hover:border-amber-500/40 hover:bg-[var(--bg-subtle)]'
                }`}
              >
                <span className="font-bold">{t('scheduling.customDays')}</span>
                <span className={`text-[10px] ${schedulingMode === 'CUSTOM' ? 'text-amber-100' : 'text-[var(--text-muted)]'}`}>
                  Maxsus tanlov
                </span>
              </button>
            </div>

            {/* Individual Weekday Pills (Mon to Sat) */}
            <div className="pt-1">
              <span className="text-[11px] font-semibold text-[var(--text-muted)] block mb-1.5">
                Hafta kunlari (Dushanba - Shanba):
              </span>
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5">
                {ACADEMIC_WEEKDAYS.map((day) => {
                  const isSelected = selectedDays.includes(day.name);
                  const isOdd = day.parity === 'odd';
                  const isConflicting = conflicts.some(
                    (c) => c.weekday?.toUpperCase() === day.id || c.weekday === day.name
                  );
                  return (
                    <button
                      key={day.id}
                      type="button"
                      data-testid={`weekday-btn-${day.id}`}
                      onClick={() => handleToggleDay(day.name)}
                      className={`px-2.5 py-2 rounded-xl text-xs font-medium transition cursor-pointer flex items-center justify-center gap-1.5 border ${
                        isConflicting
                          ? 'border-rose-500 bg-rose-500/25 text-rose-600 dark:text-rose-400 font-extrabold ring-2 ring-rose-500'
                          : isSelected
                          ? isOdd
                            ? 'bg-blue-500/20 border-blue-500/50 text-blue-600 dark:text-blue-300 font-bold'
                            : 'bg-indigo-500/20 border-indigo-500/50 text-indigo-600 dark:text-indigo-300 font-bold'
                          : 'bg-[var(--bg-surface)] border-border/20 text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:border-border/40'
                      }`}
                    >
                      {isSelected && <Check className="w-3 h-3 shrink-0" />}
                      <span>{t(`scheduling.${day.translationKey}`)}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Visual Preview Badge */}
            {previewText ? (
              <div className="pt-1 flex items-center gap-2 text-xs font-semibold text-[var(--brand-primary)] bg-blue-500/10 px-3 py-2 rounded-xl border border-blue-500/20">
                <Sparkles className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">{previewText}</span>
              </div>
            ) : (
              <div className="pt-1 text-xs text-rose-500 font-semibold">
                {t('scheduling.noDaysSelected')}
              </div>
            )}
          </div>

          {/* Time Slot Selection & Room */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-[var(--text-secondary)] mb-1.5 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-[var(--brand-primary)]" />
                <span>{t('scheduling.timeSlot')} *</span>
              </label>
              <select
                aria-label="Dars vaqtini tanlang"
                value={selectedSlotId}
                onChange={(e) => {
                  const val = e.target.value;
                  setSelectedSlotId(val);
                  if (val !== 'custom') {
                    const slot = availableSlots.find((s) => String(s.id) === val);
                    if (slot) {
                      setStartTime(slot.startTime);
                      setEndTime(slot.endTime);
                    }
                  }
                }}
                className="w-full bg-[var(--bg-canvas)] border border-border/30 rounded-xl px-3.5 py-2.5 text-xs text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)]/40 focus:border-[var(--brand-primary)] transition"
              >
                {availableSlots.map((slot) => (
                  <option key={slot.id} value={String(slot.id)}>
                    {slot.name} ({slot.startTime} – {slot.endTime})
                  </option>
                ))}
                <option value="custom">-- {t('scheduling.customTime')} --</option>
              </select>
            </div>

            <FormField label="IT Lab / Xona" required>
              <Input
                type="text"
                value={room}
                onChange={(e) => setRoom(e.target.value)}
                placeholder="IT Lab 1"
                required
              />
            </FormField>
          </div>

          {/* Time Range Details (Editable for custom or fine-tuning) */}
          <div className="p-3 rounded-2xl bg-[var(--bg-canvas)] border border-border/25 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-[var(--text-secondary)]">
                {selectedSlotId === 'custom' ? t('scheduling.customTime') + ':' : 'Tanlangan dars vaqti:'}
              </span>
              {selectedSlotId !== 'custom' && (
                <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded-full">
                  Standart slot
                </span>
              )}
            </div>

            <div className="flex items-center space-x-1.5">
              <Input
                type="text"
                value={startTime}
                onChange={(e) => {
                  setStartTime(e.target.value);
                  setSelectedSlotId('custom');
                }}
                placeholder="15:00"
                className="w-20 text-center font-mono text-xs"
                required
              />
              <span className="text-[var(--text-muted)] text-xs font-bold">–</span>
              <Input
                type="text"
                value={endTime}
                onChange={(e) => {
                  setEndTime(e.target.value);
                  setSelectedSlotId('custom');
                }}
                placeholder="16:30"
                className="w-20 text-center font-mono text-xs"
                required
              />
            </div>
          </div>

          {/* Bulk Student Names Input */}
          <div className="pt-2">
            <FormField
              label="Guruh o‘quvchilari ro‘yxati (har bir qatorda bitta ism):"
              description="* O‘quvchilar ismlarini to‘g‘ridan-to‘g‘ri nusxalab qo‘yishingiz mumkin, ular avtomatik ushbu guruhga biriktiriladi."
            >
              <Textarea
                rows={3}
                value={studentsBulkText}
                onChange={(e) => setStudentsBulkText(e.target.value)}
                placeholder="Gulnora Shamuratova&#10;Sobirov Akbarbek&#10;Rajabov Diyorbek&#10;Olimov Sharifboy"
                className="font-mono text-xs"
              />
            </FormField>
          </div>

          {/* Buttons */}
          <div className="pt-4 border-t border-border/15 flex items-center justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 text-xs font-semibold rounded-xl bg-[var(--bg-subtle)] hover:bg-[var(--bg-muted)] text-[var(--text-secondary)] border-0 transition cursor-pointer"
            >
              Bekor qilish
            </button>
            <button
              type="submit"
              disabled={loading || selectedDays.length === 0}
              className="px-5 py-2.5 text-xs font-bold rounded-xl bg-[var(--brand-primary)] hover:bg-blue-600 text-white shadow-md shadow-blue-500/20 transition disabled:opacity-50 cursor-pointer flex items-center gap-2"
            >
              {loading && <Clock className="w-3.5 h-3.5 animate-spin" />}
              <span>{loading ? "Saqlanmoqda..." : "Dars Jadvalini Saqlash"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
