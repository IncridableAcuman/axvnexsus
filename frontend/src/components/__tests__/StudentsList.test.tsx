import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { StudentsList } from '../StudentsList';
import { CredentialSlipModal, type CredentialSlipData } from '../common/CredentialSlipModal';
import { I18nProvider } from '@/shared/i18n';
import type { Student, StudyGroup, Mentor } from '../../types';

// Mock clipboard
Object.assign(navigator, {
  clipboard: {
    writeText: vi.fn().mockImplementation(() => Promise.resolve()),
  },
});

// Mock window.print
window.print = vi.fn();

const mockGroups: StudyGroup[] = [
  {
    id: 1,
    groupCode: '8-FRONT-A',
    subject: 'Web Full-Stack',
    gradeLevel: '8-sinf',
    room: 'Lab 1',
    scheduleDays: 'Dush-Chor-Jum',
    startTime: '14:00',
    endTime: '15:30',
    studentCount: 15,
    maxCapacity: 20,
    status: 'ACTIVE',
  },
  {
    id: 2,
    groupCode: '11-ENG-B',
    subject: 'IELTS IT',
    gradeLevel: '11-sinf',
    room: 'Lab 2',
    scheduleDays: 'Sesh-Pay-Shan',
    startTime: '15:30',
    endTime: '17:00',
    studentCount: 18,
    maxCapacity: 20,
    status: 'ACTIVE',
  },
];

const mockMentors: Mentor[] = [
  {
    id: 1,
    fullName: 'Aziz Rahimov',
    email: 'aziz@example.uz',
    phone: '+998901234567',
    specialization: 'Full-Stack Developer',
    role: 'SENIOR_MENTOR',
    branchLocation: 'IT Park Yangiariq',
    rating: 4.9,
    assignedGroupsCount: 2,
  },
];

const mockStudents: Student[] = [
  {
    id: 101,
    fullName: 'Javohir Olimov',
    pinfl: '30101991234567',
    studentIdNumber: '42600001',
    gradeLevel: '8-sinf',
    phone: '+998 91 111 22 33',
    status: 'Faol',
    branchLocation: 'IT Park Yangiariq',
    studyGroup: mockGroups[0],
    mentor: mockMentors[0],
  },
  {
    id: 102,
    fullName: 'Madina Karimova',
    pinfl: '40202997654321',
    studentIdNumber: '42600002',
    gradeLevel: '11-sinf',
    phone: '+998 93 444 55 66',
    status: 'Faol',
    branchLocation: 'IT Park Yangiariq',
    studyGroup: mockGroups[1],
    mentor: mockMentors[0],
  },
  {
    id: 103,
    fullName: 'Bobur Rustamov',
    pinfl: '50303998889990',
    studentIdNumber: '42600003',
    gradeLevel: '8-sinf',
    status: 'Nofaol',
    branchLocation: 'IT Park Yangiariq',
    studyGroup: mockGroups[0],
    mentor: mockMentors[0],
  },
];

const renderStudentsList = (props = {}) => {
  const onRefresh = vi.fn();
  return render(
    <I18nProvider defaultLocale="uz">
      <StudentsList
        students={mockStudents}
        groups={mockGroups}
        mentors={mockMentors}
        onRefresh={onRefresh}
        {...props}
      />
    </I18nProvider>
  );
};

describe('Students Section - Shadcn UI & Clean Borderless Design', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders top stats overview with correct counts', () => {
    renderStudentsList();

    // Total students count = 3
    expect(screen.getAllByText('3').length).toBeGreaterThanOrEqual(1);
    // 8-sinf count = 2
    expect(screen.getAllByText('2').length).toBeGreaterThanOrEqual(1);
    // 11-sinf count = 1
    expect(screen.getAllByText('1').length).toBeGreaterThanOrEqual(1);
    // Active status count (Faol) = 2
    expect(screen.getAllByText('Faol').length).toBe(2);
  });

  it('renders table headers and student rows with avatars and badges', () => {
    renderStudentsList();

    // Check student names
    expect(screen.getByText('Javohir Olimov')).toBeInTheDocument();
    expect(screen.getByText('Madina Karimova')).toBeInTheDocument();
    expect(screen.getByText('Bobur Rustamov')).toBeInTheDocument();

    // Check student IDs
    expect(screen.getByText('42600001')).toBeInTheDocument();
    expect(screen.getByText('42600002')).toBeInTheDocument();

    // Check status badges
    expect(screen.getAllByText('Faol').length).toBe(2);
    expect(screen.getByText('Nofaol')).toBeInTheDocument();
  });

  it('filters students by search input', async () => {
    renderStudentsList();

    const searchInput = screen.getByPlaceholderText(/qidiruv/i);
    fireEvent.change(searchInput, { target: { value: 'Madina' } });

    // Should only show Madina
    expect(screen.getByText('Madina Karimova')).toBeInTheDocument();
    expect(screen.queryByText('Javohir Olimov')).not.toBeInTheDocument();
    expect(screen.queryByText('Bobur Rustamov')).not.toBeInTheDocument();
  });

  it('shows empty state when no students match search query and can clear filters', async () => {
    renderStudentsList();

    const searchInput = screen.getByPlaceholderText(/qidiruv/i);
    fireEvent.change(searchInput, { target: { value: 'Noma\'lum Talaba 999' } });

    expect(screen.getByText('O‘quvchilar topilmadi')).toBeInTheDocument();

    // Clear filters button should be present
    const clearBtn = screen.getByText('Filtrlarni tozalash');
    fireEvent.click(clearBtn);

    // Students should be restored
    expect(screen.getByText('Javohir Olimov')).toBeInTheDocument();
  });

  it('copies student ID when clicking copy icon button', async () => {
    renderStudentsList();

    const copyButtons = screen.getAllByTitle('ID dan nusxa olish');
    expect(copyButtons.length).toBeGreaterThan(0);

    fireEvent.click(copyButtons[0]);
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith('42600001');
  });

  it('opens Add Student modal with clean shadcn Dialog', async () => {
    renderStudentsList();

    const addBtn = screen.getByText(/Yangi O‘quvchi/i);
    fireEvent.click(addBtn);

    // Modal title should appear
    expect(screen.getByRole('heading', { name: /Yangi O‘quvchi Qo‘shish/i })).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Abdurasharipov Izzatbek/i)).toBeInTheDocument();
  });

  it('renders CredentialSlipModal with shadcn Dialog, badges, and copy functionality', async () => {
    const mockCredentialData: CredentialSlipData = {
      fullName: 'Sanjarbek Normatov',
      role: 'STUDENT',
      hemisId: '42600099',
      password: 'Pass#2026',
      groupCode: '8-FRONT-A',
      branchLocation: 'IT Park Yangiariq',
      isReset: false,
    };

    const onClose = vi.fn();

    render(
      <CredentialSlipModal
        isOpen={true}
        onClose={onClose}
        data={mockCredentialData}
      />
    );

    // Modal header and info
    expect(screen.getByText('HEMIS Hisobi Yaratildi')).toBeInTheDocument();
    expect(screen.getByText('Sanjarbek Normatov')).toBeInTheDocument();
    expect(screen.getByText('42600099')).toBeInTheDocument();
    expect(screen.getByText('Pass#2026')).toBeInTheDocument();

    // Copy ID button
    const copyIdBtn = screen.getByTitle('ID raqamidan nusxa olish');
    fireEvent.click(copyIdBtn);
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith('42600099');

    // Copy All button
    const copyAllBtn = screen.getByText("Ma'lumotnomani nusxalash");
    fireEvent.click(copyAllBtn);
    expect(navigator.clipboard.writeText).toHaveBeenCalled();

    // Print button
    const printBtn = screen.getByText('Chop etish');
    fireEvent.click(printBtn);
    expect(window.print).toHaveBeenCalled();
  });
});
