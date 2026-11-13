import { useQuery } from '@tanstack/react-query';
import { useOptionalAuth } from '@/features/auth/AuthContext';
import { analyticsApi } from '@/api';
import { queryClient } from '@/app/providers/QueryProvider';
import type { AdminDashboardDto, MentorDashboardDto, StudentDashboardDto } from '@/types';

export interface DashboardDateFilters {
  from?: string;
  to?: string;
  groupId?: number;
}

export function useAdminDashboard(filters?: DashboardDateFilters) {
  const auth = useOptionalAuth();
  const isAuthenticated = auth?.isAuthenticated ?? false;
  const isAdmin = auth?.isAdmin ?? false;

  const query = useQuery(
    {
      queryKey: ['dashboard-admin', filters?.from, filters?.to, filters?.groupId],
      queryFn: async (): Promise<AdminDashboardDto | null> => {
        try {
          const res = await analyticsApi.getAdminDashboard(filters);
          return res.data;
        } catch (err: any) {
          if (err?.response?.status === 404 || err?.response?.status === 403) {
            return null;
          }
          throw err;
        }
      },
      enabled: Boolean(isAuthenticated && isAdmin),
      staleTime: 1000 * 60 * 2, // 2 minutes
      retry: (failureCount, error: any) => {
        if (error?.response?.status === 403 || error?.response?.status === 401) {
          return false;
        }
        return failureCount < 2;
      },
    },
    queryClient
  );

  return {
    data: query.data ?? null,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  };
}

export function useMentorDashboard(filters?: { from?: string; to?: string }) {
  const auth = useOptionalAuth();
  const userId = auth?.user?.id;
  const isAuthenticated = auth?.isAuthenticated ?? false;
  const isMentor = auth?.isMentor ?? false;

  const query = useQuery(
    {
      queryKey: ['dashboard-mentor', userId, filters?.from, filters?.to],
      queryFn: async (): Promise<MentorDashboardDto | null> => {
        try {
          const res = await analyticsApi.getMentorDashboard(filters);
          return res.data;
        } catch (err: any) {
          if (err?.response?.status === 404 || err?.response?.status === 403) {
            return null;
          }
          throw err;
        }
      },
      enabled: Boolean(isAuthenticated && isMentor && userId),
      staleTime: 1000 * 60 * 2,
      retry: (failureCount, error: any) => {
        if (error?.response?.status === 403 || error?.response?.status === 401) {
          return false;
        }
        return failureCount < 2;
      },
    },
    queryClient
  );

  return {
    data: query.data ?? null,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  };
}

export function useStudentDashboard(filters?: { from?: string; to?: string }) {
  const auth = useOptionalAuth();
  const userId = auth?.user?.id;
  const isAuthenticated = auth?.isAuthenticated ?? false;
  const isStudent = auth?.isStudent ?? false;

  const query = useQuery(
    {
      queryKey: ['dashboard-student', userId, filters?.from, filters?.to],
      queryFn: async (): Promise<StudentDashboardDto | null> => {
        try {
          const res = await analyticsApi.getStudentDashboard(filters);
          return res.data;
        } catch (err: any) {
          if (err?.response?.status === 404) {
            return null;
          }
          throw err;
        }
      },
      enabled: Boolean(isAuthenticated && isStudent && userId),
      staleTime: 1000 * 60 * 2,
      retry: (failureCount, error: any) => {
        if (error?.response?.status === 404 || error?.response?.status === 403) {
          return false;
        }
        return failureCount < 2;
      },
    },
    queryClient
  );

  return {
    data: query.data ?? null,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    hasProfile: Boolean(query.data && query.data.studentId),
    refetch: query.refetch,
  };
}
