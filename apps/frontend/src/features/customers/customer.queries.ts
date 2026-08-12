import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { financeKeys } from '../finance/finance.queries';
import { customerApi } from './customer.api';
import type { CustomerListParams, CustomerMutationInput, CustomerPrice } from './customer.types';

export const customerKeys = {
  all: ['customers'] as const,
  lists: () => [...customerKeys.all, 'list'] as const,
  list: (params: CustomerListParams) => [...customerKeys.lists(), params] as const,
  details: () => [...customerKeys.all, 'detail'] as const,
  detail: (id: string) => [...customerKeys.details(), id] as const,
  prices: (id: string) => [...customerKeys.detail(id), 'prices'] as const,
};

async function invalidateCustomerListsAndFinance(queryClient: ReturnType<typeof useQueryClient>) {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: customerKeys.lists() }),
    queryClient.invalidateQueries({ queryKey: financeKeys.all }),
  ]);
}

export function useCustomerList(params: CustomerListParams) {
  return useQuery({
    queryKey: customerKeys.list(params),
    queryFn: () => customerApi.list(params),
    placeholderData: (previousData) => previousData,
  });
}

export function useCustomerDetail(id: string | null) {
  return useQuery({
    queryKey: customerKeys.detail(id ?? ''),
    queryFn: () => customerApi.get(id ?? ''),
    enabled: Boolean(id),
  });
}

export function useCustomerPrices(id: string | null) {
  return useQuery({
    queryKey: customerKeys.prices(id ?? ''),
    queryFn: () => customerApi.getPrices(id ?? ''),
    enabled: Boolean(id),
  });
}

export function useCreateCustomer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: customerApi.create,
    onSuccess: async () => invalidateCustomerListsAndFinance(queryClient),
  });
}

export function useUpdateCustomer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: CustomerMutationInput }) =>
      customerApi.update(id, input),
    onSuccess: async (customer) => {
      queryClient.setQueryData(customerKeys.detail(customer.id), customer);
      await invalidateCustomerListsAndFinance(queryClient);
    },
  });
}

export function useDeleteCustomer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: customerApi.remove,
    onSuccess: async (_data, id) => {
      queryClient.removeQueries({ queryKey: customerKeys.detail(id) });
      await invalidateCustomerListsAndFinance(queryClient);
    },
  });
}

export function useRestoreCustomer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: customerApi.restore,
    onSuccess: async (customer) => {
      queryClient.setQueryData(customerKeys.detail(customer.id), customer);
      await invalidateCustomerListsAndFinance(queryClient);
    },
  });
}

export function useReplaceCustomerPrices() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, prices }: { id: string; prices: CustomerPrice[] }) =>
      customerApi.replacePrices(id, prices),
    onSuccess: (prices, { id }) => {
      queryClient.setQueryData(customerKeys.prices(id), prices);
    },
  });
}
