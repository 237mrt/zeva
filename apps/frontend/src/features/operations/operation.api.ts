import { apiClient } from '../../lib/api-client';
import type { CreateDeliveryInput, Delivery, DeliveryListData, DeliveryListParams, PackageInput, PackageListData, WorkOrderPackage } from './operation.types';

export const operationApi = {
  packages: (workOrderId: string) => apiClient.request<PackageListData>(`/work-orders/${workOrderId}/packages`),
  createPackages: (workOrderId: string, packages: PackageInput[]) => apiClient.request<PackageListData>(`/work-orders/${workOrderId}/packages`, { method: 'POST', body: JSON.stringify({ packages }) }),
  updatePackage: (id: string, input: Partial<PackageInput>) => apiClient.request<{ package: WorkOrderPackage }>(`/work-order-packages/${id}`, { method: 'PATCH', body: JSON.stringify(input) }).then((data) => data.package),
  deletePackage: (id: string) => apiClient.request<Record<string, never>>(`/work-order-packages/${id}`, { method: 'DELETE' }),
  deliveries: (params: DeliveryListParams) => {
    const search = new URLSearchParams({ page: String(params.page), pageSize: String(params.pageSize) });
    if (params.q) search.set('q', params.q);
    if (params.customerId) search.set('customerId', params.customerId);
    if (params.workOrderId) search.set('workOrderId', params.workOrderId);
    return apiClient.request<DeliveryListData>(`/deliveries?${search.toString()}`);
  },
  delivery: (id: string) => apiClient.request<{ delivery: Delivery }>(`/deliveries/${id}`).then((data) => data.delivery),
  createDelivery: (input: CreateDeliveryInput) => apiClient.request<{ delivery: Delivery }>('/deliveries', { method: 'POST', body: JSON.stringify(input) }).then((data) => data.delivery),
  cancelDelivery: (id: string) => apiClient.request<{ delivery: Delivery }>(`/deliveries/${id}/cancel`, { method: 'POST' }).then((data) => data.delivery),
};
