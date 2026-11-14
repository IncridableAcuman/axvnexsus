import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { StudentDetailsModal } from '../students/StudentDetailsModal';
import { EditStudentModal } from '../students/EditStudentModal';
import { studentApi } from '@/api';
import type { Student, StudyGroup } from '@/types';

// Mock clipboard
Object.assign(navigator, {
  clipboard: {
    writeText: vi.fn().mockImplementation(() => Promise.resolve()),
  },
});

vi.mock('@/api', () => ({
  studentApi: {
    getGroupHistory: vi.fn().mockResolvedValue({ data: { data: [] } }),
    update: vi.fn().mockResolvedValue({ data: { success: true } }),
    updateStatus: vi.fn().mockResolvedValue({ data: { success: true } }),
    archive: vi.fn().mockResolvedValue({ data: { success: true } }),
  },
}));

const mockStudent: Student = {
  id: 101,
  fullName: 'Javohir Olimov',
  pinfl: '30101991234567',
  studentIdNumber: '42600001',
  gradeLevel: '8-sinf',
  phone: '+998 91 111 22 33',
  status: 'ACTIVE',
  branchLocation: 'IT Park Yangiariq',
  studyGroup: {
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
  mentor: {
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
};

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
];

describe('Module 01: Student Modals Component Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(studentApi.getGroupHistory).mockResolvedValue({ data: { data: [] } } as any);
    vi.mocked(studentApi.update).mockResolvedValue({ data: { success: true } } as any);
  });

  describe('StudentDetailsModal', () => {
    it('renders student details, HEMIS ID, credentials and loads group transfer history', async () => {
      vi.mocked(studentApi.getGroupHistory).mockResolvedValueOnce({
        data: {
          data: [
            {
              id: 1,
              groupId: 1,
              groupCode: '8-FRONT-A',
              subject: 'Web Full-Stack',
              branchLocation: 'IT Park Yangiariq',
              joinedAt: '2026-09-01T08:00:00Z',
              leftAt: null,
              active: true,
              transferReason: null,
            },
          ],
        },
      } as any);

      const onEdit = vi.fn();
      const onClose = vi.fn();

      render(
        <StudentDetailsModal
          isOpen={true}
          onClose={onClose}
          student={mockStudent}
          onEdit={onEdit}
        />
      );

      // Verify student details are displayed
      expect(screen.getByText('Javohir Olimov')).toBeDefined();
      expect(screen.getByText(/42600001/)).toBeDefined();
      expect(screen.getByText('30101991234567')).toBeDefined();
      expect(screen.getByText('+998 91 111 22 33')).toBeDefined();
      expect(screen.getByText(/IT Park Yangiariq/)).toBeDefined();

      // Verify group history call
      expect(studentApi.getGroupHistory).toHaveBeenCalledWith(101);

      // Click Edit button
      const editButton = screen.getByRole('button', { name: /Tahrirlash/i });
      fireEvent.click(editButton);
      expect(onEdit).toHaveBeenCalledWith(mockStudent);
    });

    it('copies HEMIS ID to clipboard when copy button is clicked', async () => {
      render(
        <StudentDetailsModal
          isOpen={true}
          onClose={vi.fn()}
          student={mockStudent}
        />
      );

      const copyBtn = screen.getByTitle('ID dan nusxa olish');
      fireEvent.click(copyBtn);
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith('42600001');
    });

    it('returns null and does not render when closed or student is null', () => {
      const { container } = render(
        <StudentDetailsModal
          isOpen={false}
          onClose={vi.fn()}
          student={null}
        />
      );
      expect(container.firstChild).toBeNull();
    });
  });

  describe('EditStudentModal', () => {
    it('pre-populates student data and submits updates via studentApi', async () => {
      const onClose = vi.fn();
      const onSuccess = vi.fn();

      render(
        <EditStudentModal
          isOpen={true}
          onClose={onClose}
          student={mockStudent}
          groups={mockGroups}
          onSuccess={onSuccess}
        />
      );

      // Verify prefilled values
      const nameInput = screen.getByDisplayValue('Javohir Olimov') as HTMLInputElement;
      expect(nameInput).toBeDefined();

      // Change name
      fireEvent.change(nameInput, { target: { value: 'Javohir Olimov Yangilangan' } });

      // Submit form
      const form = nameInput.closest('form')!;
      fireEvent.submit(form);

      await waitFor(() => {
        expect(studentApi.update).toHaveBeenCalledWith(
          101,
          expect.objectContaining({
            fullName: 'Javohir Olimov Yangilangan',
            phone: '+998 91 111 22 33',
            pinfl: '30101991234567',
          })
        );
        expect(onSuccess).toHaveBeenCalled();
        expect(onClose).toHaveBeenCalled();
      });
    });

    it('validates required fields before submitting', async () => {
      render(
        <EditStudentModal
          isOpen={true}
          onClose={vi.fn()}
          student={mockStudent}
          groups={mockGroups}
          onSuccess={vi.fn()}
        />
      );

      const nameInput = screen.getByDisplayValue('Javohir Olimov');
      fireEvent.change(nameInput, { target: { value: '' } });

      const form = nameInput.closest('form')!;
      fireEvent.submit(form);

      expect(studentApi.update).not.toHaveBeenCalled();
      expect(screen.getByText(/O‘quvchining to‘liq F.I.O sini kiriting/i)).toBeDefined();
    });
  });
});
