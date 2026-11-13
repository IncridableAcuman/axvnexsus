import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { AuthProvider, useAuth } from '../AuthContext';
import { useCurrentStudent } from '../useCurrentStudent';
import { AssessmentEngine } from '@/components/assessments/AssessmentEngine';
import { GamificationDashboard } from '@/components/grading/GamificationDashboard';
import { ToastProvider } from '@/shared/ui/toast/Toast';
import { queryClient } from '@/app/providers/QueryProvider';
import { studentApi, gradingApi, assessmentApi } from '@/api';
import type { AuthUser, Student, StudentGamificationProfileDto } from '@/types';

vi.mock('@/api', () => ({
  authApi: {
    login: vi.fn(),
    register: vi.fn(),
  },
  studentApi: {
    getMe: vi.fn(),
    getAll: vi.fn().mockResolvedValue({ data: [] }),
  },
  assessmentApi: {
    getAll: vi.fn().mockResolvedValue({
      data: [
        {
          id: 10,
          title: 'HTML & CSS Final Test',
          subject: 'Web Full-Stack',
          gradeLevel: '8-sinf',
          assessmentType: 'QUIZ',
          totalPoints: 100,
          durationMinutes: 30,
          passingScore: 60,
          isPublished: true,
        },
      ],
    }),
    getMyAttempts: vi.fn().mockResolvedValue({ data: [] }),
    getQuestionsForTaking: vi.fn().mockResolvedValue({ data: [] }),
    startAttempt: vi.fn().mockResolvedValue({ data: { id: 777, studentId: 101, status: 'IN_PROGRESS' } }),
    submitAttempt: vi.fn().mockResolvedValue({ data: { id: 777, totalScore: 90, maxPossibleScore: 100, percentage: 90 } }),
  },
  assignmentApi: {
    getAll: vi.fn().mockResolvedValue({ data: [] }),
    getMySubmissions: vi.fn().mockResolvedValue({ data: [] }),
    submit: vi.fn().mockResolvedValue({ data: { id: 99, status: 'PENDING' } }),
  },
  gradingApi: {
    getMyProfile: vi.fn(),
    getMyStreak: vi.fn(),
    getLeaderboard: vi.fn().mockResolvedValue({ data: [] }),
    getGroupLeaderboard: vi.fn().mockResolvedValue({ data: [] }),
    checkInStreak: vi.fn().mockResolvedValue({
      data: {
        studentId: 101,
        alreadyRecorded: false,
        currentStreak: 1,
        bonusXpEarned: 15,
        message: 'Streak tasdiqlandi',
      },
    }),
  },
}));

describe('Milestone 09: Student Context & Data Ownership Integration', () => {
  const mockStudentUser: AuthUser = {
    id: 55,
    username: 'I-HR 010001',
    email: 'anvar@student.axm.uz',
    fullName: 'Anvar Xorazmiy',
    roles: ['STUDENT'],
    permissions: [],
    accessToken: 'mock-jwt-token-student',
    refreshToken: 'mock-refresh-token',
    tokenType: 'Bearer',
    emailVerified: true,
  };

  const mockStudentProfile: Student = {
    id: 101,
    fullName: 'Anvar Xorazmiy',
    studentIdNumber: 'I-HR 010001',
    pinfl: '12345678901234',
    gradeLevel: '8-sinf',
    branchLocation: 'IT Park Yangiariq',
    status: 'Faol',
  };

  const mockGamificationProfile: StudentGamificationProfileDto = {
    studentId: 101,
    displayName: 'Anvar X. (I-HR 010001)',
    totalPoints: 350,
    rank: 3,
    currentStreak: 4,
    longestStreak: 12,
    checkedInToday: true,
    totalActiveDays: 18,
    level: 2,
    levelName: 'Junior Dasturchi',
    currentLevelMinXp: 200,
    nextLevelXp: 500,
    levelProgressPercent: 50,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    queryClient.clear();
  });

  const TestStudentConsumer: React.FC = () => {
    const { student, studentId, hasProfile, isLoading } = useCurrentStudent();
    if (isLoading) return <div>Yuklanmoqda...</div>;
    return (
      <div>
        <div data-testid="has-profile">{String(hasProfile)}</div>
        <div data-testid="student-id">{studentId ?? 'NONE'}</div>
        <div data-testid="student-name">{student?.fullName ?? 'NONE'}</div>
      </div>
    );
  };

  it('1. useCurrentStudent resolves the authenticated student profile via studentApi.getMe()', async () => {
    localStorage.setItem('axm_nexus_user', JSON.stringify(mockStudentUser));
    vi.mocked(studentApi.getMe).mockResolvedValueOnce({
      data: mockStudentProfile,
      status: 200,
      statusText: 'OK',
      headers: {},
      config: {} as any,
    });

    render(
      <AuthProvider>
        <TestStudentConsumer />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('has-profile')).toHaveTextContent('true');
      expect(screen.getByTestId('student-id')).toHaveTextContent('101');
      expect(screen.getByTestId('student-name')).toHaveTextContent('Anvar Xorazmiy');
    });
    expect(studentApi.getMe).toHaveBeenCalledTimes(1);
  });

  it('2. useCurrentStudent gracefully handles missing student profile (404) without throwing', async () => {
    localStorage.setItem('axm_nexus_user', JSON.stringify(mockStudentUser));
    vi.mocked(studentApi.getMe).mockRejectedValueOnce({
      response: { status: 404, data: { message: 'Profile not found' } },
    });

    render(
      <AuthProvider>
        <TestStudentConsumer />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('has-profile')).toHaveTextContent('false');
      expect(screen.getByTestId('student-id')).toHaveTextContent('NONE');
    });
  });

  it('3. AssessmentEngine warns authenticated student when student profile is missing', async () => {
    localStorage.setItem('axm_nexus_user', JSON.stringify(mockStudentUser));
    vi.mocked(studentApi.getMe).mockRejectedValueOnce({
      response: { status: 404, data: { message: 'Profile not found' } },
    });

    render(
      <ToastProvider>
        <AuthProvider>
          <AssessmentEngine students={[]} />
        </AuthProvider>
      </ToastProvider>
    );

    await waitFor(() => {
      expect(screen.getByText(/O‘quvchi profili topilmadi/i)).toBeInTheDocument();
    });
  });

  it('4. GamificationDashboard displays authentic student XP, level, rank and streak without fallback IDs', async () => {
    localStorage.setItem('axm_nexus_user', JSON.stringify(mockStudentUser));
    vi.mocked(studentApi.getMe).mockResolvedValueOnce({
      data: mockStudentProfile,
      status: 200,
      statusText: 'OK',
      headers: {},
      config: {} as any,
    });
    vi.mocked(gradingApi.getMyProfile).mockResolvedValueOnce({
      data: mockGamificationProfile,
      status: 200,
      statusText: 'OK',
      headers: {},
      config: {} as any,
    });
    vi.mocked(gradingApi.getMyStreak).mockResolvedValueOnce({
      data: {
        id: 1,
        studentId: 101,
        currentStreak: 4,
        longestStreak: 12,
        totalActiveDays: 18,
        checkedInToday: true,
        lastActivityDate: '2026-11-13',
        streakFreezeCount: 2,
        nextMilestoneDays: 7,
        nextMilestoneReward: 50,
        historyJson: '[]',
      },
      status: 200,
      statusText: 'OK',
      headers: {},
      config: {} as any,
    });

    render(
      <ToastProvider>
        <AuthProvider>
          <GamificationDashboard students={[]} />
        </AuthProvider>
      </ToastProvider>
    );

    await waitFor(() => {
      expect(screen.getByText(/4 Kunlik Olovli Streak!/i)).toBeInTheDocument();
      expect(screen.getByText(/Level 2: Junior Dasturchi/i)).toBeInTheDocument();
      expect(screen.getByText(/#3 O‘rinda/i)).toBeInTheDocument();
      expect(screen.getByText(/350 \/ 500 XP/i)).toBeInTheDocument();
    });
  });

  it('5. Logout and account switching clear student query caches and sensitive attempts data', async () => {
    localStorage.setItem('axm_nexus_user', JSON.stringify(mockStudentUser));
    localStorage.setItem('axvhub_test_attempts', JSON.stringify({ 1: { score: 100 } }));

    let authContextRef: ReturnType<typeof useAuth> | null = null;
    const TestLogoutConsumer: React.FC = () => {
      authContextRef = useAuth();
      return <button onClick={() => authContextRef?.confirmLogout()}>Logout</button>;
    };

    render(
      <AuthProvider>
        <TestLogoutConsumer />
      </AuthProvider>
    );

    expect(localStorage.getItem('axm_nexus_user')).not.toBeNull();
    expect(localStorage.getItem('axvhub_test_attempts')).not.toBeNull();

    // Trigger logout
    authContextRef!.confirmLogout();

    expect(localStorage.getItem('axm_nexus_user')).toBeNull();
    expect(localStorage.getItem('axvhub_test_attempts')).toBeNull();
  });
});
