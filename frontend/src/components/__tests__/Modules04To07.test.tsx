import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { ToastProvider } from '@/shared/ui/toast/Toast';
import { AuthProvider } from '@/features/auth/AuthContext';
import { UsersDirectory } from '../users/UsersDirectory';
import { GroupsDirectory } from '../groups/GroupsDirectory';
import { AttendanceCalendar } from '../attendance/AttendanceCalendar';
import { MentorDirectory } from '../mentors/MentorDirectory';
import type { StudyGroup, Mentor, Student } from '@/types';

// Mock API modules
vi.mock('@/api', () => ({
  userApi: {
    getUsers: vi.fn().mockResolvedValue({
      data: {
        data: {
          content: [
            {
              id: 1,
              username: 'admin',
              email: 'admin@axm.uz',
              fullName: 'Super Administrator',
              primaryRole: 'SUPER_ADMIN',
              roles: ['SUPER_ADMIN', 'PROGRAM_ADMIN'],
              enabled: true,
              effectivePermissions: ['users.read', 'users.create', 'users.update'],
            },
            {
              id: 2,
              username: 'mentor1',
              email: 'mentor@axm.uz',
              fullName: 'Javlon IT Mentor',
              primaryRole: 'MENTOR',
              roles: ['MENTOR'],
              enabled: true,
              effectivePermissions: ['lessons.create', 'assessments.grade'],
            },
          ],
          page: 0,
          size: 10,
          totalElements: 2,
          totalPages: 1,
          last: true,
        },
      },
    }),
    updateUserStatus: vi.fn().mockResolvedValue({ data: { success: true } }),
    assignRoles: vi.fn().mockResolvedValue({ data: { success: true } }),
  },
  rbacApi: {
    getAllRoles: vi.fn().mockResolvedValue({
      data: [
        { id: 1, name: 'SUPER_ADMIN', description: 'Bosh boshqaruvchi', permissions: ['system.configure'] },
        { id: 2, name: 'MENTOR', description: 'Dars beruvchi mentor', permissions: ['lessons.create'] },
      ],
    }),
    getAllPermissions: vi.fn().mockResolvedValue({
      data: [
        { id: 1, name: 'users.read', description: 'Read users' },
        { id: 2, name: 'lessons.create', description: 'Create lessons' },
      ],
    }),
  },
  groupStructureApi: {
    getAll: vi.fn().mockResolvedValue({
      data: [
        {
          id: 1,
          groupCode: '8-IT-A',
          name: '8-IT-A',
          gradeLevel: '8-sinf',
          room: 'Xona 101',
          roomLocation: 'Xona 101',
          scheduleDays: 'Dush-Chor-Jum',
          lessonDays: 'Dush-Chor-Jum',
          scheduleTime: '14:00 - 16:00',
          lessonTime: '14:00 - 16:00',
          status: 'ACTIVE',
          maxCapacity: 16,
          studentCount: 14,
          mentor: { id: 1, fullName: 'Rustam Mentor', role: 'IT Mentor' },
        },
      ],
    }),
    getDetail: vi.fn().mockResolvedValue({
      data: {
        data: {
          id: 1,
          groupCode: '8-IT-A',
          gradeLevel: '8-sinf',
          subject: 'Frontend',
          room: 'Xona 101',
          maxCapacity: 16,
          studentCount: 14,
          activeMembers: [],
        },
      },
    }),
    getGroupHistory: vi.fn().mockResolvedValue({ data: { data: [] } }),
    updateStatus: vi.fn().mockResolvedValue({ data: { success: true } }),
  },
  mentorProfileApi: {
    getPublicProfiles: vi.fn().mockResolvedValue({
      data: {
        data: [
          {
            id: 1,
            displayName: 'Bobur Mirzayev',
            headline: 'Senior Full Stack & AI Mentor',
            bio: '5 yillik tajribaga ega murabbiy',
            yearsOfExperience: 5,
            publicPhone: '+998 90 123 45 67',
            publicEmail: 'bobur@axm.uz',
            skills: [{ skillName: 'React', proficiencyLevel: 'EXPERT' }],
          },
        ],
      },
    }),
    getAllProfilesForAdmin: vi.fn().mockResolvedValue({ data: { data: [] } }),
  },
  attendanceApi: {
    getSessions: vi.fn().mockResolvedValue({
      data: {
        data: [
          {
            id: 1,
            subject: 'Web dasturlash asoslari',
            topic: 'React komponentlari',
            groupId: 1,
            groupName: '8-IT-A',
            mentorId: 1,
            mentorName: 'Rustam Mentor',
            roomNumber: 'Xona 101',
            startTime: new Date().toISOString(),
            endTime: new Date(Date.now() + 7200000).toISOString(),
            status: 'SCHEDULED',
            attendanceRecords: [],
          },
        ],
      },
    }),
    getTodaySessions: vi.fn().mockResolvedValue({
      data: {
        data: [
          {
            id: 1,
            subject: 'Web dasturlash asoslari',
            topic: 'React komponentlari',
            groupId: 1,
            groupName: '8-IT-A',
            mentorId: 1,
            mentorName: 'Rustam Mentor',
            roomNumber: 'Xona 101',
            startTime: new Date().toISOString(),
            endTime: new Date(Date.now() + 7200000).toISOString(),
            status: 'SCHEDULED',
            attendanceRecords: [],
          },
        ],
      },
    }),
  },
  studentApi: {
    getAll: vi.fn().mockResolvedValue({ data: [] }),
  },
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    patch: vi.fn(),
  },
}));

const mockMentors: Mentor[] = [
  { id: 1, fullName: 'Rustam Mentor', role: 'IT Mentor' },
];

const mockStudents: Student[] = [
  { id: 101, fullName: 'Ali Valiyev' },
];

const mockGroups: StudyGroup[] = [
  {
    id: 1,
    groupCode: '8-IT-A',
    name: '8-IT-A',
    gradeLevel: '8-sinf',
    room: 'Xona 101',
    scheduleDays: 'Dush-Chor-Jum',
    scheduleTime: '14:00 - 16:00',
    maxCapacity: 16,
    status: 'ACTIVE',
    studentCount: 14,
  },
];

describe('Modules 04 - 07 Frontend Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  describe('Module 04: UsersDirectory', () => {
    it('renders user directory with multi-role information', async () => {
      render(
        <ToastProvider>
          <AuthProvider>
            <UsersDirectory />
          </AuthProvider>
        </ToastProvider>
      );

      expect(screen.getByText(/Foydalanuvchilar va Ko‘p Rolli RBAC Boshqaruvi/i)).toBeInTheDocument();
      await waitFor(() => {
        expect(screen.getByText('Super Administrator')).toBeInTheDocument();
        expect(screen.getByText('Javlon IT Mentor')).toBeInTheDocument();
      });
      // Verifies multi-role display
      expect(screen.getAllByText('SUPER_ADMIN').length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText('PROGRAM_ADMIN').length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Module 05: GroupsDirectory', () => {
    it('renders groups list and capacity information', async () => {
      render(
        <ToastProvider>
          <AuthProvider>
            <GroupsDirectory
              initialGroups={mockGroups}
              mentors={mockMentors}
              students={mockStudents}
            />
          </AuthProvider>
        </ToastProvider>
      );

      expect(screen.getByText(/O'quv Tuzilmasi & Guruhlar Boshqaruvi/i)).toBeInTheDocument();
      await waitFor(() => {
        expect(screen.getByText('8-IT-A')).toBeInTheDocument();
      });
      // Verifies grade filter buttons
      expect(screen.getByRole('button', { name: /8-sinf/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /9-sinf/i })).toBeInTheDocument();
    });
  });

  describe('Module 06: MentorDirectory', () => {
    it('renders public mentor directory and headline', async () => {
      render(
        <ToastProvider>
          <AuthProvider>
            <MentorDirectory />
          </AuthProvider>
        </ToastProvider>
      );

      expect(screen.getByText(/Mentorlar Profillari & Professional Malaka/i)).toBeInTheDocument();
      await waitFor(() => {
        expect(screen.getByText('Bobur Mirzayev')).toBeInTheDocument();
        expect(screen.getByText(/Senior Full Stack & AI Mentor/i)).toBeInTheDocument();
      });
    });
  });

  describe('Module 07: AttendanceCalendar', () => {
    it('renders attendance calendar and today schedule summary banner', async () => {
      render(
        <ToastProvider>
          <AuthProvider>
            <AttendanceCalendar
              groups={mockGroups}
              mentors={mockMentors}
            />
          </AuthProvider>
        </ToastProvider>
      );

      expect(screen.getByText(/Darslar Jadvali & Davomat Tizimi/i)).toBeInTheDocument();
      expect(screen.getByText(/Bugungi Darslar Xulosasi/i)).toBeInTheDocument();

      await waitFor(() => {
        expect(screen.getByText('Web dasturlash asoslari')).toBeInTheDocument();
      });
    });
  });
});
