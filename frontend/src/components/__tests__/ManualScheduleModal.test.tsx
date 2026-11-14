import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ManualScheduleModal } from '../ManualScheduleModal';
import { I18nProvider } from '@/shared/i18n';
import { scheduleApi } from '../../api';
import type { Mentor, StudyGroup } from '../../types';

vi.mock('../../api', () => ({
  scheduleApi: {
    createManual: vi.fn(),
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
    groupCode: 'YA-AUTO-99',
    gradeLevel: '10-sinf',
    subject: 'Artificial Intelligence & Python',
    room: 'Lab AI 3',
    branchLocation: 'IT Park Urganch',
    mentor: {
      id: 1,
      fullName: 'Abdurasharipov Izzatbek',
      role: 'Bosh mentor',
    },
  },
];

describe('ManualScheduleModal: Six-Day Academic Week Scheduling Enhancement', () => {
  const onClose = vi.fn();
  const onSuccess = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderModal = (locale: 'uz' | 'ru' | 'en' = 'uz') => {
    return render(
      <I18nProvider initialLocale={locale}>
        <ManualScheduleModal
          isOpen={true}
          onClose={onClose}
          mentors={mockMentors}
          onSuccess={onSuccess}
        />
      </I18nProvider>
    );
  };

  it('1. Odd-day selection works (default mode sets Monday, Wednesday, Friday)', () => {
    renderModal();

    // Default mode is Toq kunlar (ODD_DAYS)
    const oddButton = screen.getByTestId('mode-btn-odd');
    expect(oddButton).toBeInTheDocument();

    // Preview badge shows Toq kunlar: Dushanba • Chorshanba • Juma
    expect(screen.getByText(/Toq kunlar: Dushanba • Chorshanba • Juma/i)).toBeInTheDocument();
  });

  it('2. Even-day selection works (automatically selects Tuesday, Thursday, Saturday)', () => {
    renderModal();

    const evenButton = screen.getByTestId('mode-btn-even');
    fireEvent.click(evenButton);

    // Preview badge updates to Juft kunlar: Seshanba • Payshanba • Shanba
    expect(screen.getByText(/Juft kunlar: Seshanba • Payshanba • Shanba/i)).toBeInTheDocument();
  });

  it('3. All-six-day selection works (automatically selects all 6 weekdays)', () => {
    renderModal();

    const allSixButton = screen.getByTestId('mode-btn-all-six');
    fireEvent.click(allSixButton);

    // Preview badge shows all 6 days
    expect(screen.getByText(/Barcha 6 kun: Dushanba • Seshanba • Chorshanba • Payshanba • Juma • Shanba/i)).toBeInTheDocument();
  });

  it('4. Custom weekday selection works (user clicks days to toggle)', () => {
    renderModal();

    const customButton = screen.getByTestId('mode-btn-custom');
    fireEvent.click(customButton);

    // Toggle Friday off
    const jumaBtn = screen.getByTestId('weekday-btn-FRIDAY');
    fireEvent.click(jumaBtn);

    // Now only Dushanba and Chorshanba remain
    expect(screen.getByText(/Maxsus kunlar: Dushanba • Chorshanba/i)).toBeInTheDocument();
  });

  it('5. Switching between modes updates the selected weekdays and preview consistently', () => {
    renderModal();

    // Switch to Juft kunlar
    fireEvent.click(screen.getByTestId('mode-btn-even'));
    expect(screen.getByText(/Juft kunlar: Seshanba • Payshanba • Shanba/i)).toBeInTheDocument();

    // Switch to Barcha 6 kun
    fireEvent.click(screen.getByTestId('mode-btn-all-six'));
    expect(screen.getByText(/Barcha 6 kun: Dushanba • Seshanba • Chorshanba • Payshanba • Juma • Shanba/i)).toBeInTheDocument();

    // Switch back to Toq kunlar
    fireEvent.click(screen.getByTestId('mode-btn-odd'));
    expect(screen.getByText(/Toq kunlar: Dushanba • Chorshanba • Juma/i)).toBeInTheDocument();
  });

  it('6. Selected days preview badge displays clearly', () => {
    renderModal();

    const preview = screen.getByText(/Toq kunlar: Dushanba • Chorshanba • Juma/i);
    expect(preview).toBeVisible();
  });

  it('7. Validation error appears if all days are removed in CUSTOM mode', () => {
    renderModal();

    // Switch to custom mode
    fireEvent.click(screen.getByTestId('mode-btn-custom'));

    // Toggle off the default selected days (Dushanba, Chorshanba, Juma)
    fireEvent.click(screen.getByTestId('weekday-btn-MONDAY'));
    fireEvent.click(screen.getByTestId('weekday-btn-WEDNESDAY'));
    fireEvent.click(screen.getByTestId('weekday-btn-FRIDAY'));

    // Shows validation error
    expect(screen.getByText(/Kamida bitta dars kuni tanlanishi shart/i)).toBeInTheDocument();

    // Submit button should be disabled
    const submitBtn = screen.getByRole('button', { name: /dars jadvalini saqlash/i });
    expect(submitBtn).toBeDisabled();
  });

  it('8. Submission sends the correct data (dayPattern, selectedDays, days, etc.)', async () => {
    (scheduleApi.createManual as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      data: { id: 101 },
    });

    renderModal();

    // Switch to EVEN_DAYS
    fireEvent.click(screen.getByTestId('mode-btn-even'));

    const submitBtn = screen.getByRole('button', { name: /dars jadvalini saqlash/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(scheduleApi.createManual).toHaveBeenCalledTimes(1);
    });

    const callArg = (scheduleApi.createManual as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(callArg.dayPattern).toBe('EVEN_DAYS');
    expect(callArg.selectedDays).toEqual(['Seshanba', 'Payshanba', 'Shanba']);
    expect(callArg.days).toBe('Seshanba, Payshanba, Shanba');
    expect(callArg.startTime).toBe('15:00');
    expect(callArg.endTime).toBe('16:30');
    expect(callArg.room).toBe('IT Lab 1');
    expect(onSuccess).toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
  });

  it('9. Existing schedule form fields remain intact (gradeLevel, groupCode, subject, mentor, room)', () => {
    renderModal();

    expect(screen.getByDisplayValue('YA-26I0805')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Web Full-Stack Development')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Abdurasharipov Izzatbek')).toBeInTheDocument();
    expect(screen.getByDisplayValue('15:00')).toBeInTheDocument();
    expect(screen.getByDisplayValue('16:30')).toBeInTheDocument();
    expect(screen.getByDisplayValue('IT Lab 1')).toBeInTheDocument();
  });

  it('10. Renders in all three locales (Uzbek, Russian, English)', () => {
    // Russian
    const { unmount: unmountRu } = renderModal('ru');
    expect(screen.getByText('Нечетные дни')).toBeInTheDocument();
    expect(screen.getByText('Четные дни')).toBeInTheDocument();
    expect(screen.getByText('Все 6 дней')).toBeInTheDocument();
    expect(screen.getByText('Специальные дни')).toBeInTheDocument();
    unmountRu();

    // English
    const { unmount: unmountEn } = renderModal('en');
    expect(screen.getByText('Odd Days')).toBeInTheDocument();
    expect(screen.getByText('Even Days')).toBeInTheDocument();
    expect(screen.getByText('All 6 Days')).toBeInTheDocument();
    expect(screen.getByText('Custom Days')).toBeInTheDocument();
    unmountEn();
  });

  it('11. Displays structured conflict details and highlights conflicting weekday badge', async () => {
    vi.mocked(scheduleApi.createManual).mockRejectedValueOnce({
      response: {
        data: {
          code: 'SCHEDULE_CONFLICT',
          message: 'Xona (IT Lab 1) Seshanba kuni band! Unda YA-26I0804 darsi mavjud (15:00 - 16:30)',
          conflicts: [
            {
              type: 'CLASSROOM',
              weekday: 'TUESDAY',
              resourceName: 'IT Lab 1',
              existingGroupCode: 'YA-26I0804',
              startTime: '15:00',
              endTime: '16:30',
            },
          ],
        },
      },
    });

    renderModal();

    const submitBtn = screen.getByRole('button', { name: /dars jadvalini saqlash/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText(/Aniqlangan to'qnashuv detallari:/i)).toBeInTheDocument();
    });

    expect(screen.getAllByText(/YA-26I0804/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/TUESDAY/i)).toBeInTheDocument();

    // Verify Tuesday weekday button has error border
    const tuesdayBtn = screen.getByTestId('weekday-btn-TUESDAY');
    expect(tuesdayBtn.className).toContain('border-rose-500');
  });

  it('12. Group selector auto-fills gradeLevel, subject, mentor and room', () => {
    render(
      <I18nProvider initialLocale="uz">
        <ManualScheduleModal
          isOpen={true}
          onClose={onClose}
          mentors={mockMentors}
          groups={mockGroups}
          onSuccess={onSuccess}
        />
      </I18nProvider>
    );

    const groupSelect = screen.getByRole('combobox', { name: /Mavjud Guruhni Tanlash/i });
    fireEvent.change(groupSelect, { target: { value: 'YA-AUTO-99' } });

    expect(screen.getByDisplayValue('YA-AUTO-99')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Artificial Intelligence & Python')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Lab AI 3')).toBeInTheDocument();
  });

  it('13. Loads available time slots and auto-populates start/end times upon selection', async () => {
    renderModal();

    const slotSelect = screen.getByRole('combobox', { name: /Dars vaqtini tanlang/i });
    expect(slotSelect).toBeInTheDocument();

    // Select Morning slot (09:30 – 11:00)
    fireEvent.change(slotSelect, { target: { value: '1' } });

    expect(screen.getByDisplayValue('09:30')).toBeInTheDocument();
    expect(screen.getByDisplayValue('11:00')).toBeInTheDocument();
  });

  it('14. Allows custom time range selection and manual edits', async () => {
    renderModal();

    const slotSelect = screen.getByRole('combobox', { name: /Dars vaqtini tanlang/i });
    fireEvent.change(slotSelect, { target: { value: 'custom' } });

    const startInput = screen.getByDisplayValue('15:00');
    const endInput = screen.getByDisplayValue('16:30');

    fireEvent.change(startInput, { target: { value: '10:00' } });
    fireEvent.change(endInput, { target: { value: '11:45' } });

    expect(screen.getByDisplayValue('10:00')).toBeInTheDocument();
    expect(screen.getByDisplayValue('11:45')).toBeInTheDocument();
  });

  it('15. Validates and rejects reversed time range (15:00 >= 14:30)', async () => {
    renderModal();

    const startInput = screen.getByDisplayValue('15:00');
    const endInput = screen.getByDisplayValue('16:30');

    fireEvent.change(startInput, { target: { value: '15:00' } });
    fireEvent.change(endInput, { target: { value: '14:30' } });

    const submitBtn = screen.getByRole('button', { name: /dars jadvalini saqlash/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText(/Dars tugash vaqti boshlanish vaqtidan kechroq bo‘lishi kerak/i)).toBeInTheDocument();
    });
    expect(scheduleApi.createManual).not.toHaveBeenCalled();
  });
});
