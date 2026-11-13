import { useQuery } from '@tanstack/react-query';
import { useOptionalAuth } from './AuthContext';
import { studentApi } from '@/api';
import { queryClient } from '@/app/providers/QueryProvider';
import type { Student } from '@/types';

export interface UseCurrentStudentResult {
  student: Student | null;
  studentId: number | null;
  isLoading: boolean;
  isError: boolean;
  error: unknown;
  hasProfile: boolean;
  refetch: () => Promise<unknown>;
}

export const useCurrentStudent = (): UseCurrentStudentResult => {
  const auth = useOptionalAuth();
  const userId = auth?.user?.id;
  const isStudent = auth?.isStudent ?? false;
  const isAuthenticated = auth?.isAuthenticated ?? false;

  const query = useQuery(
    {
      queryKey: ['current-student', userId],
      queryFn: async (): Promise<Student | null> => {
        try {
          const res = await studentApi.getMe();
          return res.data;
        } catch (err: any) {
          if (err?.response?.status === 404) {
            return null;
          }
          throw err;
        }
      },
      enabled: Boolean(isAuthenticated && isStudent && userId),
      staleTime: 1000 * 60 * 5,
      retry: (failureCount, error: any) => {
        if (error?.response?.status === 404 || error?.response?.status === 403) {
          return false;
        }
        return failureCount < 2;
      },
    },
    queryClient
  );

  const student = query.data ?? null;

  return {
    student,
    studentId: student?.id ?? null,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    hasProfile: Boolean(student && student.id),
    refetch: query.refetch,
  };
};

export default useCurrentStudent;
