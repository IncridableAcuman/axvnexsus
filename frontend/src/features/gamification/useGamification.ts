import { useQuery, useMutation } from '@tanstack/react-query';
import { queryClient } from '@/app/providers/QueryProvider';
import { gradingApi } from '@/api';
import type {
  LeaderboardEntryDto,
  GroupLeaderboardEntryDto,
  StudentStreakDto,
  StudentGamificationProfileDto,
  AchievementDto,
  StudentAchievementDto,
  StreakFreezeHistoryDto,
  StudentXpSummaryDto,
  GamificationConfigurationDto,
  GamificationMetricsDto,
  SpringPageDto,
  PointTransactionDto,
} from '@/types';

export const GAMIFICATION_KEYS = {
  all: ['gamification'] as const,
  profile: (studentId?: number) => ['gamification', 'profile', studentId] as const,
  streak: (studentId?: number) => ['gamification', 'streak', studentId] as const,
  leaderboard: (period: string, branchId?: number, groupId?: number) =>
    ['gamification', 'leaderboard', period, branchId, groupId] as const,
  groupLeaderboard: () => ['gamification', 'groupLeaderboard'] as const,
  achievements: () => ['gamification', 'achievements'] as const,
  myAchievements: (studentId?: number) => ['gamification', 'myAchievements', studentId] as const,
  transactions: (studentId?: number, page?: number, size?: number, source?: string) =>
    ['gamification', 'transactions', studentId, page, size, source] as const,
  xpSummary: (studentId?: number) => ['gamification', 'summary', studentId] as const,
  freezeHistory: (studentId?: number) => ['gamification', 'freezeHistory', studentId] as const,
  configs: (category?: string) => ['gamification', 'configs', category] as const,
  metrics: () => ['gamification', 'metrics'] as const,
};

export const invalidateGamificationQueries = () => {
  queryClient.invalidateQueries({ queryKey: GAMIFICATION_KEYS.all });
};

export const useGamificationProfile = (activeStudentId?: number, isStudent: boolean = false) => {
  return useQuery(
    {
      queryKey: GAMIFICATION_KEYS.profile(activeStudentId),
      queryFn: async (): Promise<StudentGamificationProfileDto | null> => {
        try {
          if (isStudent && typeof gradingApi.getMyProfile === 'function') {
            const res = await gradingApi.getMyProfile();
            return res?.data ?? null;
          }
          if (activeStudentId && typeof gradingApi.getStudentProfile === 'function') {
            const res = await gradingApi.getStudentProfile(activeStudentId);
            return res?.data ?? null;
          }
          return null;
        } catch {
          return null;
        }
      },
      staleTime: 1000 * 60 * 2,
    },
    queryClient
  );
};

export const useStudentStreak = (activeStudentId?: number, isStudent: boolean = false) => {
  return useQuery(
    {
      queryKey: GAMIFICATION_KEYS.streak(activeStudentId),
      queryFn: async (): Promise<StudentStreakDto | null> => {
        try {
          if (isStudent && typeof gradingApi.getMyStreak === 'function') {
            const res = await gradingApi.getMyStreak();
            return res?.data ?? null;
          }
          if (activeStudentId && typeof gradingApi.getStudentStreak === 'function') {
            const res = await gradingApi.getStudentStreak(activeStudentId);
            return res?.data ?? null;
          }
          return null;
        } catch {
          return null;
        }
      },
      staleTime: 1000 * 60 * 2,
    },
    queryClient
  );
};

export const useLeaderboard = (
  period: 'WEEKLY' | 'MONTHLY' | 'ALL_TIME' = 'ALL_TIME',
  branchId?: number,
  groupId?: number
) => {
  return useQuery(
    {
      queryKey: GAMIFICATION_KEYS.leaderboard(period, branchId, groupId),
      queryFn: async (): Promise<LeaderboardEntryDto[]> => {
        const res = await gradingApi.getLeaderboard(period, { branchId, groupId });
        return res?.data ?? [];
      },
      staleTime: 1000 * 60,
    },
    queryClient
  );
};

export const useGroupLeaderboard = () => {
  return useQuery(
    {
      queryKey: GAMIFICATION_KEYS.groupLeaderboard(),
      queryFn: async (): Promise<GroupLeaderboardEntryDto[]> => {
        const res = await gradingApi.getGroupLeaderboard();
        return res?.data ?? [];
      },
      staleTime: 1000 * 60 * 2,
    },
    queryClient
  );
};

export const useAchievements = () => {
  return useQuery(
    {
      queryKey: GAMIFICATION_KEYS.achievements(),
      queryFn: async (): Promise<AchievementDto[]> => {
        if (typeof gradingApi.getAllAchievements !== 'function') return [];
        const res = await gradingApi.getAllAchievements();
        return res?.data ?? [];
      },
      staleTime: 1000 * 60 * 10,
    },
    queryClient
  );
};

export const useMyAchievements = (studentId?: number) => {
  return useQuery(
    {
      queryKey: GAMIFICATION_KEYS.myAchievements(studentId),
      queryFn: async (): Promise<StudentAchievementDto[]> => {
        if (typeof gradingApi.getMyAchievements !== 'function') return [];
        const res = await gradingApi.getMyAchievements();
        return res?.data ?? [];
      },
      staleTime: 1000 * 60 * 5,
    },
    queryClient
  );
};

export const useXpTransactions = (
  activeStudentId?: number,
  isStudent: boolean = false,
  page: number = 0,
  size: number = 15,
  source?: string
) => {
  return useQuery(
    {
      queryKey: GAMIFICATION_KEYS.transactions(activeStudentId, page, size, source),
      queryFn: async (): Promise<SpringPageDto<PointTransactionDto> | null> => {
        try {
          if (isStudent && typeof gradingApi.getMyTransactionsPaged === 'function') {
            const res = await gradingApi.getMyTransactionsPaged(page, size, source);
            return res?.data ?? null;
          }
          if (activeStudentId && typeof gradingApi.getStudentTransactionsPaged === 'function') {
            const res = await gradingApi.getStudentTransactionsPaged(activeStudentId, page, size, source);
            return res?.data ?? null;
          }
          return null;
        } catch {
          return null;
        }
      },
      staleTime: 1000 * 60,
    },
    queryClient
  );
};

export const useXpSummary = (activeStudentId?: number) => {
  return useQuery(
    {
      queryKey: GAMIFICATION_KEYS.xpSummary(activeStudentId),
      queryFn: async (): Promise<StudentXpSummaryDto | null> => {
        if (typeof gradingApi.getXpSummary !== 'function') return null;
        const res = await gradingApi.getXpSummary(activeStudentId);
        return res?.data ?? null;
      },
      staleTime: 1000 * 60 * 2,
    },
    queryClient
  );
};

export const useStreakFreezeHistory = (activeStudentId?: number) => {
  return useQuery(
    {
      queryKey: GAMIFICATION_KEYS.freezeHistory(activeStudentId),
      queryFn: async (): Promise<StreakFreezeHistoryDto[]> => {
        if (typeof gradingApi.getStreakFreezeHistory !== 'function') return [];
        const res = await gradingApi.getStreakFreezeHistory(activeStudentId);
        return res?.data ?? [];
      },
      staleTime: 1000 * 60 * 5,
    },
    queryClient
  );
};

export const useGamificationConfigs = (category?: string) => {
  return useQuery(
    {
      queryKey: GAMIFICATION_KEYS.configs(category),
      queryFn: async (): Promise<GamificationConfigurationDto[]> => {
        if (typeof gradingApi.getConfigurations !== 'function') return [];
        const res = await gradingApi.getConfigurations(category);
        return res?.data ?? [];
      },
      staleTime: 1000 * 60 * 5,
    },
    queryClient
  );
};

export const useGamificationMetrics = () => {
  return useQuery(
    {
      queryKey: GAMIFICATION_KEYS.metrics(),
      queryFn: async (): Promise<GamificationMetricsDto | null> => {
        const res = await gradingApi.getGamificationMetrics();
        return res?.data ?? null;
      },
      staleTime: 1000 * 60 * 10,
    },
    queryClient
  );
};

export const useCheckInStreakMutation = () => {
  return useMutation(
    {
      mutationFn: async ({ studentId, activityType }: { studentId?: number; activityType?: string }) => {
        const res = await gradingApi.checkInStreak(studentId, activityType || 'DAILY_CHECKIN');
        return res.data;
      },
      onSuccess: () => {
        invalidateGamificationQueries();
      },
    },
    queryClient
  );
};

export const useUseStreakFreezeMutation = () => {
  return useMutation(
    {
      mutationFn: async (missedDate?: string) => {
        const res = await gradingApi.useStreakFreeze(missedDate);
        return res.data;
      },
      onSuccess: () => {
        invalidateGamificationQueries();
      },
    },
    queryClient
  );
};

export const useAdjustStreakFreezeMutation = () => {
  return useMutation(
    {
      mutationFn: async (data: { studentId: number; delta: number; reason: string }) => {
        const res = await gradingApi.adjustStreakFreeze(data);
        return res.data;
      },
      onSuccess: () => {
        invalidateGamificationQueries();
      },
    },
    queryClient
  );
};

export const useAwardPointsMutation = () => {
  return useMutation(
    {
      mutationFn: async (payload: {
        studentId: number;
        amount: number;
        pointSource: string;
        referenceId?: string;
        referenceType?: string;
        idempotencyKey?: string;
        reason: string;
        awardedByUserId?: number;
      }) => {
        const res = await gradingApi.awardPoints(payload);
        return res.data;
      },
      onSuccess: () => {
        invalidateGamificationQueries();
      },
    },
    queryClient
  );
};

export const useAdjustPointsMutation = () => {
  return useMutation(
    {
      mutationFn: async (data: { studentId: number; deltaAmount: number; reason: string; authorizedUserId?: number }) => {
        const res = await gradingApi.adjustPoints(data);
        return res.data;
      },
      onSuccess: () => {
        invalidateGamificationQueries();
      },
    },
    queryClient
  );
};

export const useUpdateConfigMutation = () => {
  return useMutation(
    {
      mutationFn: async (data: { configKey: string; configValue: string; description?: string }) => {
        const res = await gradingApi.updateConfiguration(data);
        return res.data;
      },
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['gamification', 'configs'] });
      },
    },
    queryClient
  );
};

export const useMyTotalPoints = () => {
  return useQuery(
    {
      queryKey: ['gamification', 'totalPoints'],
      queryFn: async () => {
        const res = await gradingApi.getMyTotalPoints();
        return res?.data?.totalXp ?? 0;
      },
      staleTime: 1000 * 60,
    },
    queryClient
  );
};

export const useCreateAchievementMutation = () => {
  return useMutation(
    {
      mutationFn: async (data: Partial<AchievementDto>) => {
        const res = await gradingApi.createAchievement(data);
        return res.data;
      },
      onSuccess: () => {
        invalidateGamificationQueries();
      },
    },
    queryClient
  );
};

export const useUpdateAchievementMutation = () => {
  return useMutation(
    {
      mutationFn: async ({ id, data }: { id: number; data: Partial<AchievementDto> }) => {
        const res = await gradingApi.updateAchievement(id, data);
        return res.data;
      },
      onSuccess: () => {
        invalidateGamificationQueries();
      },
    },
    queryClient
  );
};

export const useToggleAchievementMutation = () => {
  return useMutation(
    {
      mutationFn: async (id: number) => {
        const res = await gradingApi.toggleAchievement(id);
        return res.data;
      },
      onSuccess: () => {
        invalidateGamificationQueries();
      },
    },
    queryClient
  );
};
