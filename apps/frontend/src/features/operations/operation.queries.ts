import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { workOrderKeys } from '../work-orders/work-order.queries';
import { operationApi } from './operation.api';
import type { CreateDeliveryInput, DeliveryListParams, PackageInput } from './operation.types';

export const operationKeys = {
  all: ['operations'] as const,
  packages: (id: string) => [...operationKeys.all, 'packages', id] as const,
  deliverablePackages: (customerId: string) => [...operationKeys.all, 'deliverable-packages', customerId] as const,
  deliveryLists: () => [...operationKeys.all, 'deliveries', 'list'] as const,
  deliveryList: (params: DeliveryListParams) => [...operationKeys.deliveryLists(), params] as const,
  delivery: (id: string) => [...operationKeys.all, 'deliveries', 'detail', id] as const,
};
export function usePackageList(id: string | null) { return useQuery({ queryKey: operationKeys.packages(id ?? ''), queryFn: () => operationApi.packages(id ?? ''), enabled: Boolean(id) }); }
export function useDeliverablePackages(customerId: string | null) { return useQuery({ queryKey: operationKeys.deliverablePackages(customerId ?? ''), queryFn: () => operationApi.deliverablePackages(customerId ?? ''), enabled: Boolean(customerId) }); }
export function useCreatePackages() { const client = useQueryClient(); return useMutation({ mutationFn: ({ workOrderId, packages }: { workOrderId: string; packages: PackageInput[] }) => operationApi.createPackages(workOrderId, packages), onSuccess: (data) => { client.setQueryData(operationKeys.packages(data.workOrder.id), data); } }); }
export function useUpdatePackage() { const client = useQueryClient(); return useMutation({ mutationFn: ({ id, input }: { id: string; input: Partial<PackageInput>; workOrderId: string }) => operationApi.updatePackage(id, input), onSuccess: async (_data, variables) => client.invalidateQueries({ queryKey: operationKeys.packages(variables.workOrderId) }) }); }
export function useDeletePackage() { const client = useQueryClient(); return useMutation({ mutationFn: ({ id }: { id: string; workOrderId: string }) => operationApi.deletePackage(id), onSuccess: async (_data, variables) => client.invalidateQueries({ queryKey: operationKeys.packages(variables.workOrderId) }) }); }
export function useDeliveryList(params: DeliveryListParams) { return useQuery({ queryKey: operationKeys.deliveryList(params), queryFn: () => operationApi.deliveries(params), placeholderData: (previous) => previous }); }
export function useDeliveryDetail(id: string | null) { return useQuery({ queryKey: operationKeys.delivery(id ?? ''), queryFn: () => operationApi.delivery(id ?? ''), enabled: Boolean(id) }); }
export function useCreateDelivery() { const client = useQueryClient(); return useMutation({ mutationFn: (input: CreateDeliveryInput) => operationApi.createDelivery(input), onSuccess: async (delivery) => { client.setQueryData(operationKeys.delivery(delivery.id), delivery); await Promise.all([client.invalidateQueries({ queryKey: operationKeys.all }), client.invalidateQueries({ queryKey: workOrderKeys.all })]); } }); }
export function useCancelDelivery() { const client = useQueryClient(); return useMutation({ mutationFn: operationApi.cancelDelivery, onSuccess: async (delivery) => { client.setQueryData(operationKeys.delivery(delivery.id), delivery); await Promise.all([client.invalidateQueries({ queryKey: operationKeys.all }), client.invalidateQueries({ queryKey: workOrderKeys.all })]); } }); }
