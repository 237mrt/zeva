import { apiClient } from '../../lib/api-client';
import type {
  Customer,
  CustomerListData,
  CustomerListParams,
  CustomerMutationInput,
  CustomerPrice,
} from './customer.types';

function listPath(params: CustomerListParams): string {
  const searchParams = new URLSearchParams({
    page: String(params.page),
    pageSize: String(params.pageSize),
  });

  if (params.q) searchParams.set('q', params.q);
  return `/customers${params.deleted ? '/trash' : ''}?${searchParams.toString()}`;
}

export const customerApi = {
  list: (params: CustomerListParams) => apiClient.request<CustomerListData>(listPath(params)),
  get: (id: string) =>
    apiClient.request<{ customer: Customer }>(`/customers/${id}`).then(({ customer }) => customer),
  create: (input: CustomerMutationInput) =>
    apiClient
      .request<{ customer: Customer }>('/customers', {
        method: 'POST',
        body: JSON.stringify(input),
      })
      .then(({ customer }) => customer),
  update: (id: string, input: CustomerMutationInput) =>
    apiClient
      .request<{ customer: Customer }>(`/customers/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(input),
      })
      .then(({ customer }) => customer),
  remove: (id: string) =>
    apiClient.request<Record<string, never>>(`/customers/${id}`, { method: 'DELETE' }),
  restore: (id: string) =>
    apiClient
      .request<{ customer: Customer }>(`/customers/${id}/restore`, { method: 'POST' })
      .then(({ customer }) => customer),
  getPrices: (id: string) =>
    apiClient
      .request<{ prices: CustomerPrice[] }>(`/customers/${id}/prices`)
      .then(({ prices }) => prices),
  replacePrices: (id: string, prices: CustomerPrice[]) =>
    apiClient
      .request<{ prices: CustomerPrice[] }>(`/customers/${id}/prices`, {
        method: 'PUT',
        body: JSON.stringify({ prices }),
      })
      .then((data) => data.prices),
};
