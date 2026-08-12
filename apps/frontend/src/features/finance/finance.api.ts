import { apiClient } from '../../lib/api-client';
import type { AccountDetail, AccountListData, AccountListParams, Adjustment, AdjustmentInput, Payment, PaymentInput, PaymentListParams, Pagination, StatementParams } from './finance.types';

function query<T extends object>(path: string, values: T) {
  const params = new URLSearchParams();
  Object.entries(values).forEach(([key, value]) => { if (value !== '' && value !== undefined) params.set(key, String(value as string | number | boolean)); });
  return `${path}?${params.toString()}`;
}

export const financeApi = {
  listAccounts: (params: AccountListParams) => apiClient.request<AccountListData>(query('/customer-accounts', params)),
  getAccount: (id: string, params: StatementParams) => apiClient.request<AccountDetail>(query(`/customer-accounts/${id}`, params)),
  listPayments: (params: PaymentListParams) => apiClient.request<{ items: Payment[]; pagination: Pagination }>(query('/payments', params)),
  getPayment: (id: string) => apiClient.request<{ payment: Payment }>(`/payments/${id}`).then((data) => data.payment),
  createPayment: (input: PaymentInput) => apiClient.request<{ payment: Payment }>('/payments', { method: 'POST', body: JSON.stringify(input) }).then((data) => data.payment),
  cancelPayment: (id: string) => apiClient.request<{ payment: Payment }>(`/payments/${id}/cancel`, { method: 'POST' }).then((data) => data.payment),
  createAdjustment: (input: AdjustmentInput) => apiClient.request<{ adjustment: Adjustment }>('/account-adjustments', { method: 'POST', body: JSON.stringify(input) }).then((data) => data.adjustment),
  cancelAdjustment: (id: string) => apiClient.request<Record<string, never>>(`/account-adjustments/${id}/cancel`, { method: 'POST' }),
};
