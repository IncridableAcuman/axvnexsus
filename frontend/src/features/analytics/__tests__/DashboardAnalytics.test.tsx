import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { AuthProvider } from '@/features/auth/AuthContext';
import { I18nProvider } from '@/shared/i18n';
import { queryClient } from '@/app/providers/QueryProvider';
import { analyticsApi, studentApi } from '@/api';
import { AdminDashboardView } from '@/components/dashboard/AdminDashboardView';
import { MentorDashboardView } from '@/components/dashboard/MentorDashboardView';
import { StudentDashboardView } from '@/components/dashboard/StudentDashboardView';
import type {
  AuthUser,
  AdminDashboardDto,
  MentorDashboardDto,
  StudentDashboardDto,
} from '@/types';

vi.mock('@/api', () => ({
  authApi: {
    login: vi.fn(),
    register: vi.fn(),
  },
  studentApi: {
    getMe: vi.fn(),
    getAll: vi.fn().mockResolvedValue({ data: [] }),
  },
  analyticsApi: {
    getAdminDashboard: vi.fn(),
    getMentorDashboard: vi.fn(),
    getStudentDashboard: vi.fn(),
    getOverallKpis: vi.fn().mockResolvedValue({ data: {} }),
    getAttendanceSummary: vi.fn().mockResolvedValue({ data: {} }),
    getSystemWeeklyAttendanceTrend: vi.fn().mockResolvedValue({ data: [] }),
    getGradeDistribution: vi.fn().mockResolvedValue({ data: [] }),
    getGroupPerformance: vi.fn().mockResolvedValue({ data: [] }),
  },
}));

describe('Milestone 10: Dashboard & Analytics Integration', () => {
  const mockAdminUser: AuthUser = {
    id: 1,
    username: 'admin',
    email: 'admin@axm.uz',
    fullName: 'Bosh Administrator',
    roles: ['ADMIN'],
    permissions: ['analytics.read', 'dashboard.admin'],
    accessToken: 'admin-token',
    refreshToken: 'admin-refresh',
    tokenType: 'Bearer',
    emailVerified: true,
  };

  const mockMentorUser: AuthUser = {
    id: 10,
    username: 'mentor_aziz',
    email: 'aziz@axm.uz',
    fullName: 'Aziz Rahimov',
    roles: ['MENTOR'],
    permissions: ['analytics.read'],
    accessToken: 'mentor-token',
    refreshToken: 'mentor-refresh',
    tokenType: 'Bearer',
    emailVerified: true,
  };

  const mockStudentUser: AuthUser = {
    id: 55,
    username: 'I-HR 010001',
    email: 'anvar@student.axm.uz',
    fullName: 'Anvar Xorazmiy',
    roles: ['STUDENT'],
    permissions: [],
    accessToken: 'student-token',
    refreshToken: 'student-refresh',
    tokenType: 'Bearer',
    emailVerified: true,
  };

  const mockAdminDashboardData: AdminDashboardDto = {
    totalActiveStudents: 140,
    totalMentors: 12,
    totalGroups: 8,
    totalScheduledLessons: 24,
    systemAttendanceRate: 94.8,
    systemAverageScore: 88.5,
    totalCompletedLessons: 120,
    totalSubmittedAssignments: 340,
    totalEvaluatedAssessments: 320,
    presentCount: 520,
    lateCount: 18,
    absentCount: 10,
    excusedCount: 4,
    weeklyAttendance: [
      { day: 'Dush', fullDayName: 'Dushanba', date: '2026-11-09', rate: 96.5, present: 135, total: 140 },
      { day: 'Sesh', fullDayName: 'Seshanba', date: '2026-11-10', rate: 94.0, present: 132, total: 140 },
      { day: 'Chor', fullDayName: 'Chorshanba', date: '2026-11-11', rate: 95.0, present: 133, total: 140 },
      { day: 'Pay', fullDayName: 'Payshanba', date: '2026-11-12', rate: 93.5, present: 131, total: 140 },
      { day: 'Jum', fullDayName: 'Juma', date: '2026-11-13', rate: 95.2, present: 133, total: 140 },
      { day: 'Shan', fullDayName: 'Shanba', date: '2026-11-14', rate: 0.0, present: 0, total: 0 },
    ],
    roomOccupancy: [
      {
        roomId: 1,
        name: 'IT Lab 101',
        branchLocation: 'Urganch Filiali',
        used: 22,
        total: 25,
        percent: 88,
        indicator: 'bg-emerald-500',
      },
      {
        roomId: 2,
        name: 'IT Lab 102',
        branchLocation: 'Urganch Filiali',
        used: 0,
        total: 20,
        percent: 0,
        indicator: 'bg-blue-500',
      },
    ],
    groupPerformance: [
      {
        groupId: 1,
        groupName: '8-A',
        groupCode: '8-A',
        studentCount: 22,
        attendanceRate: 96.5,
        averageScore: 89.2,
        submissionRate: 95.0,
        performanceBand: 'A' as any,
      },
    ],
    enrollmentByGrade: {
      '8-sinf': 70,
      '9-sinf': 70,
    },
    systemTrend: [],
  };

  const mockMentorDashboardData: MentorDashboardDto = {
    mentorId: 10,
    mentorName: 'Aziz Rahimov',
    role: 'MENTOR',
    branchLocation: 'Urganch Filiali',
    assignedGroupsCount: 4,
    assignedStudentsCount: 68,
    todayLessonsCount: 2,
    todayAttendanceRate: 97.5,
    pendingGradingCount: 1,
    theoryMasteryRate: 88.5,
    codingPracticeRate: 92.0,
    miniProjectRate: 85.0,
    weeklyAttendanceTrend: [],
    nextLesson: {
      id: 101,
      groupId: 1,
      groupCode: '8-A',
      subject: 'React State Management',
      gradeLevel: '8-sinf',
      mentorName: 'Aziz Rahimov',
      room: 'IT Lab 101',
      branchLocation: 'Urganch Filiali',
      lessonDate: '2026-11-13',
      startTime: '14:00',
      endTime: '15:20',
      status: 'SCHEDULED',
      studentCount: 22,
    },
    todayLessons: [
      {
        id: 101,
        groupId: 1,
        groupCode: '8-A',
        subject: 'React State Management',
        gradeLevel: '8-sinf',
        mentorName: 'Aziz Rahimov',
        room: 'IT Lab 101',
        branchLocation: 'Urganch Filiali',
        lessonDate: '2026-11-13',
        startTime: '14:00',
        endTime: '15:20',
        status: 'SCHEDULED',
        studentCount: 22,
      },
    ],
    pendingReviews: [
      {
        submissionId: 501,
        assignmentId: 10,
        title: 'Todo App Redux bilan',
        studentId: 77,
        studentName: 'Ali Valiyev',
        groupCode: '8-A',
        submittedAt: 'Bugun, 10:15',
        dueStatus: 'ON_TIME',
      },
    ],
  };

  const mockStudentDashboardData: StudentDashboardDto = {
    studentId: 55,
    studentName: 'Anvar Xorazmiy',
    studentIdNumber: 'I-HR 010001',
    gradeLevel: '8-sinf',
    groupCode: '8-A',
    mentorName: 'Aziz Rahimov',
    branchLocation: 'IT Park Yangiariq',
    gpa: 4.85,
    courseProgress: 82,
    attendanceRate: 98.2,
    presentCount: 45,
    lateCount: 1,
    excusedCount: 0,
    absentCount: 0,
    totalPoints: 1450,
    level: 4,
    currentStreak: 16,
    longestStreak: 20,
    rank: 1,
    nextLevelXp: 2000,
    badgesCount: 7,
    todayLesson: {
      id: 201,
      groupId: 1,
      groupCode: '8-A',
      subject: 'Advanced React Hooks',
      gradeLevel: '8-sinf',
      mentorName: 'Aziz Rahimov',
      room: 'IT Lab 101',
      branchLocation: 'IT Park Yangiariq',
      lessonDate: '2026-11-13',
      startTime: '14:00',
      endTime: '15:20',
      status: 'SCHEDULED',
      studentCount: 22,
    },
    activeTasks: [
      {
        id: 301,
        title: 'State Architecture Project',
        subject: 'Frontend Dasturlash',
        type: 'ASSIGNMENT',
        deadline: '15-Noyabr, 23:59',
        isOverdue: false,
      },
    ],
    latestFeedback: {
      subject: 'Frontend Dasturlash',
      topic: 'TypeScript Generics Test',
      score: 98.0,
      maxScore: 100,
      mentorFeedback: 'Mukammal yechim! Type guardlar aniq belgilangan.',
      mentorName: 'Aziz Rahimov',
      gradedAt: '2026-11-12',
      formattedDate: '12-Noyabr, 2026',
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    queryClient.clear();
  });

  const renderWithProviders = (ui: React.ReactElement) => {
    return render(
      <AuthProvider>
        <I18nProvider>
          {ui}
        </I18nProvider>
      </AuthProvider>
    );
  };

  it('1. AdminDashboardView renders real backend attendance days and room occupancy', async () => {
    localStorage.setItem('axm_nexus_user', JSON.stringify(mockAdminUser));
    vi.mocked(analyticsApi.getAdminDashboard).mockResolvedValueOnce({
      data: mockAdminDashboardData,
      status: 200,
      statusText: 'OK',
      headers: {},
      config: {} as any,
    });

    renderWithProviders(<AdminDashboardView />);

    await waitFor(() => {
      // Check live weekly attendance rates from backend
      expect(screen.getByText('96.5%')).toBeInTheDocument();
      // Check live IT Lab occupancy data
      expect(screen.getByText('IT Lab 101')).toBeInTheDocument();
      expect(screen.getByText(/22\/25 \(88%\)/)).toBeInTheDocument();
      expect(screen.getByText(/22\/45/)).toBeInTheDocument();
    });

    expect(analyticsApi.getAdminDashboard).toHaveBeenCalledTimes(1);
  });

  it('2. MentorDashboardView renders authenticated mentor KPIs, lessons, and pending reviews', async () => {
    localStorage.setItem('axm_nexus_user', JSON.stringify(mockMentorUser));
    vi.mocked(analyticsApi.getMentorDashboard).mockResolvedValueOnce({
      data: mockMentorDashboardData,
      status: 200,
      statusText: 'OK',
      headers: {},
      config: {} as any,
    });

    renderWithProviders(<MentorDashboardView />);

    await waitFor(() => {
      // Check next lesson rendered from backend
      expect(screen.getByText(/8-A · React State Management/)).toBeInTheDocument();
      // Check pending review
      expect(screen.getByText('Ali Valiyev')).toBeInTheDocument();
      expect(screen.getByText(/Todo App Redux bilan/)).toBeInTheDocument();
      // Check mentor KPI numbers
      expect(screen.getByText('97.5%')).toBeInTheDocument();
      expect(screen.getByText(/68 ta o‘quvchi/i)).toBeInTheDocument();
    });

    expect(analyticsApi.getMentorDashboard).toHaveBeenCalledTimes(1);
  });

  it('3. StudentDashboardView renders authenticated student GPA, gamification stats, and active tasks', async () => {
    localStorage.setItem('axm_nexus_user', JSON.stringify(mockStudentUser));
    vi.mocked(analyticsApi.getStudentDashboard).mockResolvedValueOnce({
      data: mockStudentDashboardData,
      status: 200,
      statusText: 'OK',
      headers: {},
      config: {} as any,
    });

    renderWithProviders(<StudentDashboardView />);

    await waitFor(() => {
      // GPA & course progress
      expect(screen.getByText(/4\.85/)).toBeInTheDocument();
      expect(screen.getByText('82%')).toBeInTheDocument();
      expect(screen.getByText('98.2%')).toBeInTheDocument();
      // Gamification
      expect(screen.getByText(/1[\s,]?450\s*XP/)).toBeInTheDocument();
      // Today's lesson & active task
      expect(screen.getByText('Advanced React Hooks')).toBeInTheDocument();
      expect(screen.getByText('State Architecture Project')).toBeInTheDocument();
      // Feedback
      expect(screen.getByText(/Mukammal yechim!/)).toBeInTheDocument();
    });

    expect(analyticsApi.getStudentDashboard).toHaveBeenCalledTimes(1);
  });

  it('4. StudentDashboardView renders friendly notification banner when student profile is unlinked', async () => {
    localStorage.setItem('axm_nexus_user', JSON.stringify(mockStudentUser));
    // Simulate 404 unlinked student profile
    vi.mocked(analyticsApi.getStudentDashboard).mockRejectedValueOnce({
      response: { status: 404, data: { message: 'Student profile not found' } },
    });

    renderWithProviders(<StudentDashboardView />);

    await waitFor(() => {
      // Non-crashing notice banner should be displayed
      expect(
        screen.getByText(/O‘quvchi profili topilmadi\. Iltimos, administratorga murojaat qiling\./i)
      ).toBeInTheDocument();
    });
  });

  it('5. MentorDashboardView renders empty state gracefully when no lessons or reviews exist', async () => {
    localStorage.setItem('axm_nexus_user', JSON.stringify(mockMentorUser));
    const emptyMentorData: MentorDashboardDto = {
      ...mockMentorDashboardData,
      nextLesson: null,
      todayLessons: [],
      pendingReviews: [],
      pendingGradingCount: 0,
    };
    vi.mocked(analyticsApi.getMentorDashboard).mockResolvedValueOnce({
      data: emptyMentorData,
      status: 200,
      statusText: 'OK',
      headers: {},
      config: {} as any,
    });

    renderWithProviders(<MentorDashboardView />);

    await waitFor(() => {
      // Empty lesson & review messages
      expect(screen.getAllByText(/Bugun rejalashtirilgan darslar yo‘q/i)[0]).toBeInTheDocument();
      expect(screen.getByText(/Kutilayotgan topshiriqlar mavjud emas/i)).toBeInTheDocument();
    });
  });
});
