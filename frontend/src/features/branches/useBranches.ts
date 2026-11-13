import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { branchApi } from '@/api';
import type { CreateBranchRequest, UpdateBranchRequest } from '@/types';

export const BRANCH_QUERY_KEYS = {
  all: ['branches'] as const,
  lists: () => [...BRANCH_QUERY_KEYS.all, 'list'] as const,
  list: (filters: { status?: string; region?: string; search?: string }) =>
    [...BRANCH_QUERY_KEYS.lists(), filters] as const,
  details: () => [...BRANCH_QUERY_KEYS.all, 'detail'] as const,
  detail: (id: number) => [...BRANCH_QUERY_KEYS.details(), id] as const,
  statistics: (id: number) => [...BRANCH_QUERY_KEYS.detail(id), 'statistics'] as const,
  groups: (id: number) => [...BRANCH_QUERY_KEYS.detail(id), 'groups'] as const,
  rooms: (id: number) => [...BRANCH_QUERY_KEYS.detail(id), 'rooms'] as const,
};

export function useBranches(filters?: { status?: string; region?: string; search?: string }) {
  const status = filters?.status;
  const region = filters?.region;
  const search = filters?.search;

  return useQuery({
    queryKey: BRANCH_QUERY_KEYS.list({ status, region, search }),
    queryFn: async () => {
      const res = await branchApi.getAll(status, region, search);
      return res.data?.data ?? [];
    },
    staleTime: 60_000,
  });
}

export function useBranch(id?: number) {
  return useQuery({
    queryKey: id ? BRANCH_QUERY_KEYS.detail(id) : ['branches', 'detail', 'none'],
    queryFn: async () => {
      if (!id) return null;
      const res = await branchApi.getById(id);
      return res.data?.data ?? null;
    },
    enabled: !!id,
    staleTime: 60_000,
  });
}

export function useBranchStatistics(id?: number) {
  return useQuery({
    queryKey: id ? BRANCH_QUERY_KEYS.statistics(id) : ['branches', 'statistics', 'none'],
    queryFn: async () => {
      if (!id) return null;
      const res = await branchApi.getStatistics(id);
      return res.data?.data ?? null;
    },
    enabled: !!id,
    staleTime: 30_000,
  });
}

export function useBranchGroups(branchId?: number) {
  return useQuery({
    queryKey: branchId ? BRANCH_QUERY_KEYS.groups(branchId) : ['branches', 'groups', 'none'],
    queryFn: async () => {
      if (!branchId) return [];
      const res = await branchApi.getGroups(branchId);
      return res.data?.data ?? [];
    },
    enabled: !!branchId,
  });
}

export function useBranchRooms(branchId?: number) {
  return useQuery({
    queryKey: branchId ? BRANCH_QUERY_KEYS.rooms(branchId) : ['branches', 'rooms', 'none'],
    queryFn: async () => {
      if (!branchId) return [];
      const res = await branchApi.getRooms(branchId);
      return res.data?.data ?? [];
    },
    enabled: !!branchId,
  });
}

export function useCreateBranch() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateBranchRequest) => {
      const res = await branchApi.create(data);
      return res.data?.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: BRANCH_QUERY_KEYS.all });
    },
  });
}

export function useUpdateBranch() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: number; data: UpdateBranchRequest }) => {
      const res = await branchApi.update(id, data);
      return res.data?.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: BRANCH_QUERY_KEYS.all });
      queryClient.invalidateQueries({ queryKey: BRANCH_QUERY_KEYS.detail(variables.id) });
    },
  });
}

export function useDeleteBranch() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: number) => {
      const res = await branchApi.delete(id);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: BRANCH_QUERY_KEYS.all });
    },
  });
}
