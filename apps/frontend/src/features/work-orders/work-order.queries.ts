import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { financeKeys } from '../finance/finance.queries';
import { workOrderApi } from './work-order.api';
import type {
  WorkOrderListParams,
  WorkOrderMutationInput,
  WorkOrderStatus,
} from './work-order.types';

export const workOrderKeys = {
  all: ['work-orders'] as const,
  lists: () => [...workOrderKeys.all, 'list'] as const,
  list: (params: WorkOrderListParams) => [...workOrderKeys.lists(), params] as const,
  details: () => [...workOrderKeys.all, 'detail'] as const,
  detail: (id: string) => [...workOrderKeys.details(), id] as const,
};

async function invalidateWorkOrderListsAndFinance(queryClient: ReturnType<typeof useQueryClient>) {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: workOrderKeys.lists() }),
    queryClient.invalidateQueries({ queryKey: financeKeys.all }),
  ]);
}

export function useWorkOrderList(params: WorkOrderListParams) {
  return useQuery({
    queryKey: workOrderKeys.list(params),
    queryFn: () => workOrderApi.list(params),
    placeholderData: (previousData) => previousData,
  });
}

export function useWorkOrderDetail(id: string | null) {
  return useQuery({
    queryKey: workOrderKeys.detail(id ?? ''),
    queryFn: () => workOrderApi.get(id ?? ''),
    enabled: Boolean(id),
  });
}

export function useCreateWorkOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: workOrderApi.create,
    onSuccess: async (workOrder) => {
      queryClient.setQueryData(workOrderKeys.detail(workOrder.id), workOrder);
      await invalidateWorkOrderListsAndFinance(queryClient);
    },
  });
}

export function useUpdateWorkOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: WorkOrderMutationInput }) =>
      workOrderApi.update(id, input),
    onSuccess: async (workOrder) => {
      queryClient.setQueryData(workOrderKeys.detail(workOrder.id), workOrder);
      await invalidateWorkOrderListsAndFinance(queryClient);
    },
  });
}

export function useUpdateWorkOrderStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: WorkOrderStatus }) =>
      workOrderApi.updateStatus(id, status),
    onSuccess: async (workOrder) => {
      queryClient.setQueryData(workOrderKeys.detail(workOrder.id), workOrder);
      await invalidateWorkOrderListsAndFinance(queryClient);
    },
  });
}

export function useDeleteWorkOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: workOrderApi.remove,
    onSuccess: async (_data, id) => {
      queryClient.removeQueries({ queryKey: workOrderKeys.detail(id) });
      await invalidateWorkOrderListsAndFinance(queryClient);
    },
  });
}

export function useRestoreWorkOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: workOrderApi.restore,
    onSuccess: async (workOrder) => {
      queryClient.setQueryData(workOrderKeys.detail(workOrder.id), workOrder);
      await invalidateWorkOrderListsAndFinance(queryClient);
    },
  });
}
