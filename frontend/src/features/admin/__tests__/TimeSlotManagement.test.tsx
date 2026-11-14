import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { TimeSlotManagement } from '../TimeSlotManagement';
import { I18nProvider } from '@/shared/i18n';
import { ToastProvider } from '@/shared/ui/toast/Toast';
import { timeSlotApi } from '@/api';

vi.mock('@/api', () => ({
  timeSlotApi: {
    getAllAdmin: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    toggleActive: vi.fn(),
    delete: vi.fn(),
  },
}));

const mockTimeSlots = [
  {
    id: 1,
    name: 'Ertalabki smena (Morning)',
    startTime: '09:30',
    endTime: '11:00',
    durationMinutes: 90,
    displayOrder: 1,
    active: true,
    usageCount: 0,
    description: 'Ertalabki dars vaqti',
  },
  {
    id: 2,
    name: 'Tushdan keyingi (Afternoon)',
    startTime: '15:00',
    endTime: '16:30',
    durationMinutes: 90,
    displayOrder: 2,
    active: true,
    usageCount: 2,
    description: 'YA-26I0804 standarti',
  },
];

const renderComponent = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <I18nProvider initialLocale="uz">
        <ToastProvider>
          <TimeSlotManagement />
        </ToastProvider>
      </I18nProvider>
    </QueryClientProvider>
  );
};

describe('TimeSlotManagement: Admin Time Slot Management UI', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(timeSlotApi.getAllAdmin).mockResolvedValue(mockTimeSlots);
  });

  it('1. Renders time slot management heading and add button', async () => {
    renderComponent();

    await waitFor(() => {
      expect(screen.getByText(/Dars Vaqtlari Boshqaruvi/i)).toBeInTheDocument();
    });
    expect(screen.getByTestId('add-time-slot-btn')).toBeInTheDocument();
  });

  it('2. Displays loaded time slots with names, times, usage badge and status', async () => {
    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Ertalabki smena (Morning)')).toBeInTheDocument();
      expect(screen.getByText('Tushdan keyingi (Afternoon)')).toBeInTheDocument();
    });

    expect(screen.getByText('09:30 – 11:00')).toBeInTheDocument();
    expect(screen.getByText('15:00 – 16:30')).toBeInTheDocument();
    expect(screen.getByText(/2 ta dars jadvalida/i)).toBeInTheDocument();
    expect(screen.getByText('Ishlatilmagan')).toBeInTheDocument();
  });

  it('3. Opens create modal on click', async () => {
    renderComponent();

    const addBtn = await screen.findByTestId('add-time-slot-btn');
    fireEvent.click(addBtn);

    expect(screen.getByRole('heading', { name: /Yangi dars vaqti qo‘shish/i })).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Masalan: Ertalabki smena/i)).toBeInTheDocument();
  });

  it('4. Validates and rejects reversed time range (15:00 >= 14:30) in create modal', async () => {
    renderComponent();

    const addBtn = await screen.findByTestId('add-time-slot-btn');
    fireEvent.click(addBtn);

    const nameInput = screen.getByPlaceholderText(/Masalan: Ertalabki smena/i);
    fireEvent.change(nameInput, { target: { value: 'Reversed Slot' } });

    const startTimeInput = screen.getByDisplayValue('09:30');
    const endTimeInput = screen.getByDisplayValue('11:00');

    fireEvent.change(startTimeInput, { target: { value: '15:00' } });
    fireEvent.change(endTimeInput, { target: { value: '14:30' } });

    const saveBtn = screen.getByRole('button', { name: /^Saqlash$/i });
    fireEvent.click(saveBtn);

    expect(screen.getByText(/Dars tugash vaqti boshlanish vaqtidan kechroq bo‘lishi kerak/i)).toBeInTheDocument();
    expect(timeSlotApi.create).not.toHaveBeenCalled();
  });

  it('5. Toggles active status on button click', async () => {
    vi.mocked(timeSlotApi.toggleActive).mockResolvedValueOnce({
      ...mockTimeSlots[0],
      active: false,
    });

    renderComponent();

    await waitFor(() => {
      expect(screen.getAllByText('Faol').length).toBeGreaterThan(0);
    });

    const activeButtons = screen.getAllByRole('button', { name: /Faol/i });
    fireEvent.click(activeButtons[0]);

    await waitFor(() => {
      expect(timeSlotApi.toggleActive).toHaveBeenCalledWith(1);
    });
  });

  it('6. Disables delete button for slots that are used in schedules (usageCount > 0)', async () => {
    renderComponent();

    await waitFor(() => {
      expect(screen.getByTestId('delete-slot-2')).toBeDisabled();
    });

    // Unused slot (id: 1) should not be disabled
    expect(screen.getByTestId('delete-slot-1')).not.toBeDisabled();
  });
});
