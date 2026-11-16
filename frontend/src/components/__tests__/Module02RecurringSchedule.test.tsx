import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ManualScheduleModal } from '../ManualScheduleModal';
import { AttendanceCalendar } from '../attendance/AttendanceCalendar';
import { I18nProvider } from '@/shared/i18n';
import { ToastProvider } from '@/shared/ui/toast/Toast';
import { AuthProvider } from '@/features/auth/AuthContext';
import { scheduleApi, attendanceApi, timeSlotApi } from '@/api';
import type { Mentor, StudyGroup, Schedule, LessonSessionDto } from '@/types';

vi.mock('@/api', () => ({
  scheduleApi: {
    createManual: vi.fn(),
    createRecurring: vi.fn(),
    update: vi.fn(),
    updateRecurring: vi.fn(),
    getRecurring: vi.fn(),
    getAll: vi.fn(),
    regenerate: vi.fn(),
    archive: vi.fn(),
    delete: vi.fn(),
    preview: vi.fn(),
  },
  attendanceApi: {
    getSessions: vi.fn(),
    getTodaySessions: vi.fn(),
    cancelSession: vi.fn(),
    restoreSession: vi.fn(),
    rescheduleSession: vi.fn(),
    submitAttendance: vi.fn(),
  },
  timeSlotApi: {
    getActive: vi.fn().mockResolvedValue([
      { id: 1, name: 'Ertalabki smena (Morning)', startTime: '09:30', endTime: '11:00', durationMinutes: 90, active: true },
      { id: 2, name: 'Tushdan keyingi (Afternoon)', startTime: '15:00', endTime: '16:30', durationMinutes: 90, active: true },
      { id: 3, name: 'Kechki smena (Evening)', startTime: '16:30', endTime: '18:00', durationMinutes: 90, active: true },
    ]),
  },
}));

const mockMentors: Mentor[] = [
  {
    id: 1,
    fullName: 'Abdurasharipov Izzatbek',
    role: 'IT mentor',
    branchLocation: 'IT Park Yangiariq',
  },
];

const mockGroups: StudyGroup[] = [
  {
    id: 5,
    groupCode: 'YA-26I0805',
    gradeLevel: '8-sinf',
    subject: 'Web Full-Stack Development',
    room: 'IT Lab 1',
    branchLocation: 'IT Park Yangiariq',
    mentor: mockMentors[0],
  },
];

const mockRecurringSchedule: Schedule = {
  id: 10,
  gradeLevel: '8-sinf',
  subject: 'Computer Science Foundation',
  days: 'Dushanba, Chorshanba, Juma',
  dayPattern: 'ODD_DAYS',
  startTime: '09:30',
  endTime: '11:00',
  room: 'IT Lab 1',
  branchLocation: 'IT Park Yangiariq',
  startDate: '2026-11-01',
  endDate: '2027-05-31',
  status: 'ACTIVE',
  mentor: mockMentors[0],
  studyGroup: mockGroups[0],
  timeSlot: {
    id: 1,
    name: 'Ertalabki smena (Morning)',
    startTime: '09:30',
    endTime: '11:00',
    active: true,
  },
};

const mockCancelledSession: LessonSessionDto = {
  id: 99,
  scheduleId: 10,
  groupId: 5,
  groupCode: 'YA-26I0805',
  mentorId: 1,
  mentorName: 'Abdurasharipov Izzatbek',
  subject: 'Computer Science Foundation',
  lessonDate: '2026-11-20',
  startTime: '09:30',
  endTime: '11:00',
  status: 'CANCELLED',
  cancellationReason: 'Filialda texnik profilaktika',
  isManuallyModified: true,
  shiftName: 'Ertalabki smena (Morning)',
};

describe('Module 02: Recurring Schedule & Calendar Session Management', () => {
  const onClose = vi.fn();
  const onSuccess = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderModal = (props: Partial<React.ComponentProps<typeof ManualScheduleModal>> = {}) => {
    return render(
      <I18nProvider initialLocale="uz">
        <ManualScheduleModal
          isOpen={true}
          onClose={onClose}
          mentors={mockMentors}
          groups={mockGroups}
          onSuccess={onSuccess}
          {...props}
        />
      </I18nProvider>
    );
  };

  it('1. Recurring Schedule creation supports date range selection and sends start/end dates', async () => {
    vi.mocked(scheduleApi.createManual).mockResolvedValueOnce({
      data: mockRecurringSchedule,
    } as any);

    renderModal();

    const startInput = screen.getByLabelText(/Boshlanish sanasi/i);
    const endInput = screen.getByLabelText(/Tugash sanasi/i);

    expect(startInput).toBeInTheDocument();
    expect(endInput).toBeInTheDocument();

    fireEvent.change(startInput, { target: { value: '2026-11-01' } });
    fireEvent.change(endInput, { target: { value: '2027-05-31' } });

    const submitBtn = screen.getByRole('button', { name: /dars jadvalini saqlash/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(scheduleApi.createManual).toHaveBeenCalledTimes(1);
    });

    const callArg = vi.mocked(scheduleApi.createManual).mock.calls[0][0];
    expect(callArg.startDate).toBe('2026-11-01');
    expect(callArg.endDate).toBe('2027-05-31');
    expect(callArg.generateSessions).toBe(true);
    expect(callArg.dayPattern).toBe('ODD_DAYS');
    expect(onSuccess).toHaveBeenCalled();
  });

  it('2. Rejects invalid date range when start date is after end date', async () => {
    renderModal();

    const startInput = screen.getByLabelText(/Boshlanish sanasi/i);
    const endInput = screen.getByLabelText(/Tugash sanasi/i);

    fireEvent.change(startInput, { target: { value: '2027-06-01' } });
    fireEvent.change(endInput, { target: { value: '2026-11-01' } });

    const submitBtn = screen.getByRole('button', { name: /dars jadvalini saqlash/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText(/Boshlanish sanasi tugash sanasidan oldin bo'lishi kerak/i)).toBeInTheDocument();
    });
    expect(scheduleApi.createManual).not.toHaveBeenCalled();
  });

  it('3. Real-time calendar preview displays expected sessions and skipped holidays', async () => {
    vi.mocked(scheduleApi.preview).mockResolvedValueOnce({
      data: {
        pattern: 'ODD_DAYS',
        startDate: '2026-11-01',
        endDate: '2026-11-30',
        totalDaysInRange: 30,
        totalSessions: 13,
        holidaysSkipped: 1,
        sundaysSkipped: 5,
        sessionDates: ['2026-11-02', '2026-11-04'],
        hasConflicts: false,
        conflicts: [],
      },
    } as any);

    renderModal();

    await waitFor(() => {
      expect(screen.getByText(/13 ta kutilayotgan mashg‘ulot/i)).toBeInTheDocument();
    });

    expect(screen.getByText(/Bayramlar chetlatildi/i)).toBeInTheDocument();
    expect(screen.getByText(/Yakshanbalar/i)).toBeInTheDocument();
  });

  it('4. Editing recurring schedule displays update scope selector and calls update API', async () => {
    vi.mocked(scheduleApi.updateRecurring).mockResolvedValueOnce({
      data: { ...mockRecurringSchedule, subject: 'Updated Subject' },
    } as any);

    renderModal({
      editMode: true,
      initialSchedule: mockRecurringSchedule,
    });

    expect(screen.getByText('Dars Jadvalini Tahrirlash')).toBeInTheDocument();
    expect(screen.getByText(/Tahrirlash qamrovi/i)).toBeInTheDocument();
    expect(screen.getByText(/Faqat kelgusi darslarni yangilash/i)).toBeInTheDocument();

    const submitBtn = screen.getByRole('button', { name: /dars jadvalini saqlash/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(scheduleApi.updateRecurring).toHaveBeenCalledTimes(1);
    });

    const [id, req] = vi.mocked(scheduleApi.updateRecurring).mock.calls[0];
    expect(id).toBe(10);
    expect(req.updateScope).toBe('FUTURE_ONLY');
  });

  it('5. Attendance calendar displays recurring rules tab with management actions', async () => {
    localStorage.setItem('axm_nexus_user', JSON.stringify({
      id: 1,
      username: 'admin',
      fullName: 'Administrator',
      primaryRole: 'ADMIN',
      roles: ['ROLE_ADMIN'],
    }));

    vi.mocked(attendanceApi.getSessions).mockResolvedValueOnce({
      data: { data: [mockCancelledSession] },
    } as any);
    vi.mocked(attendanceApi.getTodaySessions).mockResolvedValueOnce({
      data: { data: [mockCancelledSession] },
    } as any);
    vi.mocked(scheduleApi.getRecurring).mockResolvedValueOnce({
      data: [mockRecurringSchedule],
    } as any);

    render(
      <I18nProvider initialLocale="uz">
        <ToastProvider>
          <AuthProvider>
            <AttendanceCalendar groups={mockGroups} mentors={mockMentors} />
          </AuthProvider>
        </ToastProvider>
      </I18nProvider>
    );

    // Shows segment buttons
    const recurringTabBtn = await screen.findByText(/Doimiy dars qoidalari/i);
    expect(recurringTabBtn).toBeInTheDocument();

    // Shows session with cancelled status and Restore button
    expect(screen.getByText(/Filialda texnik profilaktika/i)).toBeInTheDocument();
    expect(screen.getByText(/Qayta tiklash/i)).toBeInTheDocument();

    // Click to switch to recurring rules
    fireEvent.click(recurringTabBtn);

    await waitFor(() => {
      expect(screen.getByText('Computer Science Foundation')).toBeInTheDocument();
    });

    expect(screen.getByText(/Toq kunlar/i)).toBeInTheDocument();
    expect(screen.getByText(/09:30 – 11:00/i)).toBeInTheDocument();
    expect(screen.getByText(/Qayta hisoblash/i)).toBeInTheDocument();
  });
});
