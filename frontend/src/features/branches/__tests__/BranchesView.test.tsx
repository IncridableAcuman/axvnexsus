import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BranchesView } from '../BranchesView';
import { branchApi } from '@/api';
import type { BranchDto, BranchStatisticsDto } from '@/types';

vi.mock('@/api', () => ({
  branchApi: {
    getAll: vi.fn(),
    getById: vi.fn(),
    getStatistics: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    getGroups: vi.fn().mockResolvedValue({ data: { data: [] } }),
    getRooms: vi.fn().mockResolvedValue({ data: { data: [] } }),
  },
}));

describe('Milestone 11: Branches & Classes Management Frontend Tests', () => {
  let queryClient: QueryClient;

  const mockBranches: BranchDto[] = [
    {
      id: 1,
      name: 'IT Park Yangiariq filiali',
      code: 'ITP-YANGIARIQ',
      description: 'Asosiy tayanch IT markazi',
      region: 'Xorazm viloyati',
      district: 'Yangiariq tumani',
      address: 'Mustaqillik ko‘chasi, 24-uy',
      phone: '+998 62 227 12 34',
      email: 'yangiariq@axm.uz',
      status: 'ACTIVE',
      studentCount: 29,
      groupCount: 2,
      mentorCount: 2,
      roomCount: 4,
      createdAt: '2026-09-01T08:00:00',
      updatedAt: '2026-11-13T10:00:00',
    },
    {
      id: 2,
      name: 'Urganch IT Hub',
      code: 'URG-HUB',
      description: 'Urganch shahridagi yangi filial',
      region: 'Xorazm viloyati',
      district: 'Urganch shahri',
      address: 'Al-Xorazmiy ko‘chasi, 12',
      phone: '+998 62 224 00 00',
      email: 'urganch@axm.uz',
      status: 'ACTIVE',
      studentCount: 16,
      groupCount: 1,
      mentorCount: 1,
      roomCount: 2,
      createdAt: '2026-10-01T08:00:00',
      updatedAt: '2026-11-13T10:00:00',
    },
  ];

  const mockStats: BranchStatisticsDto = {
    branchId: 1,
    branchName: 'IT Park Yangiariq filiali',
    branchCode: 'ITP-YANGIARIQ',
    totalStudents: 29,
    activeStudents: 29,
    totalGroups: 2,
    activeGroups: 2,
    totalMentors: 2,
    totalRooms: 4,
    totalRoomCapacity: 64,
    averageGroupSize: 14.5,
    capacityUtilizationRate: 45.3,
  };

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false, gcTime: 0 },
      },
    });
    vi.clearAllMocks();
    (branchApi.getAll as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { success: true, data: mockBranches },
    });
    (branchApi.getStatistics as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { success: true, data: mockStats },
    });
  });

  const renderComponent = () =>
    render(
      <QueryClientProvider client={queryClient}>
        <BranchesView />
      </QueryClientProvider>
    );

  it('renders BranchesView with KPI summary cards and branch list', async () => {
    renderComponent();

    // Verify view header
    expect(screen.getByText('Filiallar & Markazlar')).toBeInTheDocument();
    expect(
      screen.getByText(/Al-Xorazmiy Vorislari tizimidagi hududiy ta‘lim filiallari/i)
    ).toBeInTheDocument();

    // Wait for branches data to load
    await waitFor(() => {
      expect(screen.getByText('IT Park Yangiariq filiali')).toBeInTheDocument();
      expect(screen.getByText('Urganch IT Hub')).toBeInTheDocument();
    });

    // Check branch codes
    expect(screen.getByText('ITP-YANGIARIQ')).toBeInTheDocument();
    expect(screen.getByText('URG-HUB')).toBeInTheDocument();
  });

  it('switches between Grid and Table views seamlessly', async () => {
    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('IT Park Yangiariq filiali')).toBeInTheDocument();
    });

    // Switch to table view
    const tableBtn = screen.getByTitle("Jadval ko'rinishi");
    fireEvent.click(tableBtn);

    // Verify table headers are visible
    expect(screen.getByText('Kodi')).toBeInTheDocument();
    expect(screen.getByText('Filial nomi')).toBeInTheDocument();
    expect(screen.getByText('Hudud / Tuman')).toBeInTheDocument();

    // Switch back to grid view
    const gridBtn = screen.getByTitle("Katak ko'rinishi");
    fireEvent.click(gridBtn);
  });

  it('filters branches by search query', async () => {
    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('IT Park Yangiariq filiali')).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText(/Filial nomi, kodi, hududi yoki tumani/i);
    fireEvent.change(searchInput, { target: { value: 'Urganch' } });

    expect(branchApi.getAll).toHaveBeenCalledWith(undefined, undefined, 'Urganch');
  });

  it('opens Create Branch modal when clicking "Yangi filial"', async () => {
    renderComponent();

    const addBtn = screen.getByRole('button', { name: /Yangi filial/i });
    fireEvent.click(addBtn);

    await waitFor(() => {
      expect(screen.getByText('Yangi filial yaratish')).toBeInTheDocument();
      expect(screen.getByLabelText(/Filial nomi/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Filial kodi/i)).toBeInTheDocument();
    });
  });

  it('opens Branch Details modal when clicking "Batafsil"', async () => {
    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('IT Park Yangiariq filiali')).toBeInTheDocument();
    });

    const detailButtons = screen.getAllByRole('button', { name: /Batafsil/i });
    fireEvent.click(detailButtons[0]);

    await waitFor(() => {
      expect(screen.getByText('Filial kodi: ITP-YANGIARIQ')).toBeInTheDocument();
      expect(screen.getByText('Laboratoriyalar & Xonalar (0)')).toBeInTheDocument();
    });
  });
});
