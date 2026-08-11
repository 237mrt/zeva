import { apiClient } from '../../lib/api-client';
import type {
  WorkOrder,
  WorkOrderListData,
  WorkOrderListParams,
  WorkOrderMutationInput,
  WorkOrderStatus,
} from './work-order.types';

function listPath(params: WorkOrderListParams): string {
  const searchParams = new URLSearchParams({
    page: String(params.page),
    pageSize: String(params.pageSize),
  });
  if (params.q) searchParams.set('q', params.q);
  if (params.customerId) searchParams.set('customerId', params.customerId);
  if (params.type) searchParams.set('type', params.type);
  if (params.status) searchParams.set('status', params.status);
  return `/work-orders${params.deleted ? '/trash' : ''}?${searchParams.toString()}`;
}

export const workOrderApi = {
  list: (params: WorkOrderListParams) => apiClient.request<WorkOrderListData>(listPath(params)),
  get: (id: string) =>
    apiClient
      .request<{ workOrder: WorkOrder }>(`/work-orders/${id}`)
      .then(({ workOrder }) => workOrder),
  create: (input: WorkOrderMutationInput) =>
    apiClient
      .request<{ workOrder: WorkOrder }>('/work-orders', {
        method: 'POST',
        body: JSON.stringify(input),
      })
      .then(({ workOrder }) => workOrder),
  update: (id: string, input: WorkOrderMutationInput) =>
    apiClient
      .request<{ workOrder: WorkOrder }>(`/work-orders/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(input),
      })
      .then(({ workOrder }) => workOrder),
  updateStatus: (id: string, status: WorkOrderStatus) =>
    apiClient
      .request<{ workOrder: WorkOrder }>(`/work-orders/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      })
      .then(({ workOrder }) => workOrder),
  remove: (id: string) =>
    apiClient.request<Record<string, never>>(`/work-orders/${id}`, { method: 'DELETE' }),
  restore: (id: string) =>
    apiClient
      .request<{ workOrder: WorkOrder }>(`/work-orders/${id}/restore`, { method: 'POST' })
      .then(({ workOrder }) => workOrder),
};
